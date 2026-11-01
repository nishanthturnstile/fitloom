-- Global authentication records. No tenant-data privileges are granted to auth or mail workers.
CREATE TABLE app.auth_mail (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id text NOT NULL REFERENCES public."user"(id),
  kind text NOT NULL CHECK(kind IN ('verification','recovery')),
  token_hash text NOT NULL, encrypted_payload text,
  expires_at timestamptz NOT NULL, consumed_at timestamptz,
  state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','running','sent','failed','expired')),
  attempts integer NOT NULL DEFAULT 0 CHECK(attempts>=0),
  next_attempt_at timestamptz NOT NULL DEFAULT now(), locked_at timestamptz,
  last_error text, created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(kind,token_hash)
);
CREATE INDEX auth_mail_pending ON app.auth_mail(next_attempt_at) WHERE state IN ('pending','running');
CREATE INDEX auth_mail_user ON app.auth_mail(user_id,created_at);
CREATE TABLE app.auth_mail_attempts (
  mail_id uuid NOT NULL REFERENCES app.auth_mail(id), attempt integer NOT NULL,
  outcome text NOT NULL CHECK(outcome IN ('accepted','smtp_unavailable')), occurred_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(mail_id,attempt)
);
CREATE TABLE app.operator_challenges (
  session_id text PRIMARY KEY REFERENCES public.session(id) ON DELETE CASCADE,
  verified_at timestamptz NOT NULL DEFAULT now(), method text NOT NULL CHECK(method IN ('totp','backup-code'))
);
CREATE TABLE app.auth_admission (
  bucket text PRIMARY KEY, requests integer NOT NULL, window_started_at timestamptz NOT NULL DEFAULT now()
);
GRANT USAGE ON SCHEMA app TO fitloom_auth;
DO $$ DECLARE name text; BEGIN
  FOREACH name IN ARRAY ARRAY['auth_mail','auth_mail_attempts','operator_challenges','auth_admission'] LOOP
    EXECUTE format('ALTER TABLE app.%I ENABLE ROW LEVEL SECURITY',name);
    EXECUTE format('ALTER TABLE app.%I FORCE ROW LEVEL SECURITY',name);
    EXECUTE format('CREATE POLICY migration_access ON app.%I TO fitloom_migrator USING(true) WITH CHECK(true)',name);
    EXECUTE format('CREATE POLICY auth_system ON app.%I TO fitloom_auth USING(true) WITH CHECK(true)',name);
  END LOOP;
END $$;
GRANT SELECT,INSERT ON app.auth_mail TO fitloom_auth;
GRANT UPDATE(consumed_at,encrypted_payload) ON app.auth_mail TO fitloom_auth;
GRANT SELECT,INSERT,UPDATE ON app.operator_challenges TO fitloom_auth;

CREATE FUNCTION app.ensure_principal(auth_user text) RETURNS TABLE(id uuid,active boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF NOT EXISTS(SELECT FROM public."user" WHERE public."user".id=auth_user) THEN RAISE EXCEPTION 'Unknown identity' USING ERRCODE='42501'; END IF;
  INSERT INTO app.principals(auth_user_id) VALUES(auth_user) ON CONFLICT(auth_user_id) DO NOTHING;
  RETURN QUERY SELECT p.id,p.active FROM app.principals p WHERE p.auth_user_id=auth_user;
END $$;
CREATE FUNCTION app.auth_admit(key text,budget integer,seconds integer) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE count integer;
BEGIN
  IF budget NOT BETWEEN 1 AND 1000 OR seconds NOT BETWEEN 1 AND 3600 OR length(key)>200 THEN RAISE EXCEPTION 'Invalid admission policy' USING ERRCODE='22023'; END IF;
  INSERT INTO app.auth_admission(bucket,requests) VALUES(key,1) ON CONFLICT(bucket) DO UPDATE
    SET requests=CASE WHEN auth_admission.window_started_at<now()-make_interval(secs=>seconds) THEN 1 ELSE least(auth_admission.requests+1,1001) END,
        window_started_at=CASE WHEN auth_admission.window_started_at<now()-make_interval(secs=>seconds) THEN now() ELSE auth_admission.window_started_at END
    RETURNING requests INTO count;
  RETURN count<=budget;
END $$;
CREATE FUNCTION app.operator_has_grant(auth_user text,permission_name text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT EXISTS(SELECT FROM app.principals p JOIN app.operator_grants g ON g.principal_id=p.id
    WHERE p.auth_user_id=auth_user AND p.active AND g.permission=permission_name)
$$;
CREATE FUNCTION app.operator_admitted(auth_user text,session_identity text,permission_name text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT app.operator_has_grant(auth_user,permission_name) AND EXISTS(
    SELECT FROM public.session s JOIN public."user" u ON u.id=s.user_id
    JOIN app.operator_challenges c ON c.session_id=s.id
    JOIN public.two_factor f ON f.user_id=u.id
    WHERE s.id=session_identity AND s.user_id=auth_user AND s.expires_at>now()
      AND s.created_at>now()-interval '15 minutes' AND c.verified_at>now()-interval '5 minutes'
      AND u.email_verified AND u.two_factor_enabled AND f.verified)
$$;
CREATE FUNCTION app.mail_claim() RETURNS TABLE(id uuid,kind text,encrypted_payload text,attempt integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  UPDATE app.auth_mail SET state='expired',encrypted_payload=NULL WHERE state IN ('pending','running') AND (expires_at<=now() OR consumed_at IS NOT NULL);
  RETURN QUERY UPDATE app.auth_mail m SET state='running',attempts=m.attempts+1,locked_at=now()
    WHERE m.id=(SELECT q.id FROM app.auth_mail q WHERE q.expires_at>now() AND q.consumed_at IS NULL AND q.attempts<5
      AND ((q.state='pending' AND q.next_attempt_at<=now()) OR (q.state='running' AND q.locked_at<now()-interval '2 minutes'))
      ORDER BY q.next_attempt_at,q.id LIMIT 1 FOR UPDATE SKIP LOCKED)
    RETURNING m.id,m.kind,m.encrypted_payload,m.attempts;
  UPDATE app.auth_mail SET state='failed',last_error='worker_interrupted',encrypted_payload=NULL WHERE state='running' AND attempts>=5 AND locked_at<now()-interval '2 minutes';
END $$;
CREATE FUNCTION app.mail_finished(mail uuid,attempt integer,accepted boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  UPDATE app.auth_mail SET state=CASE WHEN accepted THEN 'sent' WHEN attempts>=5 THEN 'failed' ELSE 'pending' END,
    last_error=CASE WHEN accepted THEN NULL ELSE 'smtp_unavailable' END,
    encrypted_payload=CASE WHEN accepted OR attempts>=5 THEN NULL ELSE encrypted_payload END,
    next_attempt_at=now()+make_interval(secs=>5*power(2,attempts-1)::integer),locked_at=NULL
    WHERE id=mail AND attempts=attempt AND state='running';
  IF FOUND THEN INSERT INTO app.auth_mail_attempts(mail_id,attempt,outcome) VALUES(mail,attempt,CASE WHEN accepted THEN 'accepted' ELSE 'smtp_unavailable' END); END IF;
END $$;
REVOKE ALL ON FUNCTION app.ensure_principal(text),app.auth_admit(text,integer,integer),app.operator_has_grant(text,text),app.operator_admitted(text,text,text),app.mail_claim(),app.mail_finished(uuid,integer,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.ensure_principal(text),app.auth_admit(text,integer,integer),app.operator_has_grant(text,text),app.operator_admitted(text,text,text) TO fitloom_auth;
GRANT EXECUTE ON FUNCTION app.mail_claim(),app.mail_finished(uuid,integer,boolean) TO fitloom_worker;
