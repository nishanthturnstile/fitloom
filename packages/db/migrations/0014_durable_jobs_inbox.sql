-- SQL-owned outbox relay and fenced application outcomes. Queue DDL is migration-only.
INSERT INTO pgboss.queue(name,policy,retry_limit,retry_delay,retry_backoff,expire_seconds,retention_seconds,deletion_seconds,partition,table_name)
VALUES('fitloom-foundation','standard',0,0,false,60,86400,604800,false,'job_common');
CREATE TABLE app.foundation_jobs (
 id uuid PRIMARY KEY, outbox_id uuid UNIQUE REFERENCES app.command_outbox(id),
 kind text NOT NULL, authority text NOT NULL CHECK(authority IN ('actor','service')),
 actor_id uuid REFERENCES app.principals(id), tenant_id uuid, location_id uuid,
 source_id uuid NOT NULL, source_key text NOT NULL UNIQUE, input_version integer NOT NULL,
 payload jsonb NOT NULL, status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','running','succeeded','failed','cancelled')),
 attempts integer NOT NULL DEFAULT 0, cycle_attempts integer NOT NULL DEFAULT 0, max_attempts integer NOT NULL DEFAULT 3,
 token uuid, lease_until timestamptz, next_attempt_at timestamptz NOT NULL DEFAULT now(),
 created_at timestamptz NOT NULL DEFAULT now(), started_at timestamptz, finished_at timestamptz, last_error text,
 FOREIGN KEY(tenant_id,location_id) REFERENCES app.locations(tenant_id,id),
 CHECK((authority='actor' AND actor_id IS NOT NULL) OR (authority='service' AND actor_id IS NULL))
);
CREATE INDEX foundation_jobs_due ON app.foundation_jobs(next_attempt_at,created_at) WHERE status='pending';
CREATE INDEX foundation_jobs_lease ON app.foundation_jobs(lease_until) WHERE status='running';
CREATE INDEX foundation_jobs_scope ON app.foundation_jobs(tenant_id,location_id,created_at);
CREATE TABLE app.foundation_attempts (
 job_id uuid NOT NULL REFERENCES app.foundation_jobs(id), attempt integer NOT NULL, token uuid NOT NULL UNIQUE,
 started_at timestamptz NOT NULL DEFAULT now(), finished_at timestamptz, outcome text, error_code text,
 PRIMARY KEY(job_id,attempt)
);
CREATE TABLE app.provider_inbox (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), provider text NOT NULL, account text NOT NULL, environment text NOT NULL,
 event_id uuid NOT NULL, source_id uuid NOT NULL, input_version integer NOT NULL, event_state text NOT NULL CHECK(event_state IN ('pending','confirmed','cancelled')),
 body_hash text NOT NULL, received_at timestamptz NOT NULL DEFAULT now(), outcome text,
 UNIQUE(provider,account,environment,event_id)
);
CREATE TABLE app.provider_fixture_state (
 provider text NOT NULL, account text NOT NULL, environment text NOT NULL, source_id uuid NOT NULL,
 version integer NOT NULL, state text NOT NULL, PRIMARY KEY(provider,account,environment,source_id)
);
CREATE TABLE app.provider_fixture_effects (
 provider text NOT NULL, account text NOT NULL, environment text NOT NULL, source_id uuid NOT NULL, version integer NOT NULL,
 event_id uuid NOT NULL, PRIMARY KEY(provider,account,environment,source_id,version)
);
-- Day 6 attachment/finalization must lock the same row. No public upload or staging endpoint yet.
CREATE TABLE app.staged_file_cleanup (
 id uuid PRIMARY KEY, staged_at timestamptz NOT NULL DEFAULT now(), state text NOT NULL CHECK(state IN ('staged','attached','deleted')),
 deleted_at timestamptz
);
DO $$ DECLARE t text;BEGIN
 FOREACH t IN ARRAY ARRAY['foundation_jobs','foundation_attempts','provider_inbox','provider_fixture_state','provider_fixture_effects','staged_file_cleanup'] LOOP
 EXECUTE format('ALTER TABLE app.%I ENABLE ROW LEVEL SECURITY',t);
 EXECUTE format('ALTER TABLE app.%I FORCE ROW LEVEL SECURITY',t);
 EXECUTE format('CREATE POLICY migration_access ON app.%I TO fitloom_migrator USING(true) WITH CHECK(true)',t);
 END LOOP;
END $$;
CREATE FUNCTION app.foundation_enqueue(j app.foundation_jobs) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 INSERT INTO pgboss.job(id,name,data,retry_limit,expire_seconds,policy) VALUES(j.id,'fitloom-foundation',jsonb_build_object('jobId',j.id),0,60,'standard') ON CONFLICT(name,id) DO NOTHING;
END $$;
CREATE FUNCTION app.foundation_dispatch() RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r record;j app.foundation_jobs;n integer:=0;identity uuid;
BEGIN
 FOR r IN SELECT o.*,c.actor_id,c.tenant_id,c.location_id FROM app.command_outbox o JOIN app.command_operations c ON c.id=o.operation_id
 WHERE c.completed_at IS NOT NULL AND NOT EXISTS(SELECT FROM app.foundation_jobs f WHERE f.outbox_id=o.id) ORDER BY o.created_at,o.id LIMIT 50 FOR UPDATE OF o SKIP LOCKED LOOP
 INSERT INTO app.foundation_jobs(id,outbox_id,kind,authority,actor_id,tenant_id,location_id,source_id,source_key,input_version,payload)
 VALUES(r.id,r.id,r.job_kind,'actor',r.actor_id,r.tenant_id,r.location_id,r.operation_id,'outbox:'||r.id,r.input_version,r.payload)
 ON CONFLICT DO NOTHING RETURNING * INTO j;
 IF FOUND THEN PERFORM app.foundation_enqueue(j);n:=n+1;END IF;
 END LOOP;
 -- A durable daily service obligation, independent of a former staff session.
 identity:=gen_random_uuid();
 INSERT INTO app.foundation_jobs(id,kind,authority,source_id,source_key,input_version,payload)
 VALUES(identity,'files.cleanup','service',identity,'cleanup:'||to_char(now() AT TIME ZONE 'UTC','YYYY-MM-DD'),1,'{}') ON CONFLICT DO NOTHING RETURNING * INTO j;
 IF FOUND THEN PERFORM app.foundation_enqueue(j);n:=n+1;END IF;
 -- Reconcile crashed claims. Fencing tokens keep old completions from settling a new attempt.
 FOR j IN SELECT * FROM app.foundation_jobs WHERE status='running' AND lease_until<now() FOR UPDATE SKIP LOCKED LOOP
 UPDATE app.foundation_attempts SET finished_at=now(),outcome='interrupted',error_code='lease_expired' WHERE token=j.token AND finished_at IS NULL;
 UPDATE app.foundation_jobs SET status=CASE WHEN cycle_attempts>=max_attempts THEN 'failed' ELSE 'pending' END,token=NULL,lease_until=NULL,last_error='lease_expired',next_attempt_at=now(),finished_at=CASE WHEN cycle_attempts>=max_attempts THEN now() END WHERE id=j.id;
 UPDATE pgboss.job SET state=CASE WHEN j.cycle_attempts>=j.max_attempts THEN 'failed'::pgboss.job_state ELSE 'retry'::pgboss.job_state END WHERE name='fitloom-foundation' AND id=j.id;
 END LOOP;
 RETURN n;
END $$;
CREATE FUNCTION app.foundation_take() RETURNS SETOF app.foundation_jobs LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE j app.foundation_jobs;
BEGIN
 SELECT f.* INTO j FROM app.foundation_jobs f JOIN pgboss.job q ON q.id=f.id AND q.name='fitloom-foundation'
 WHERE f.status='pending' AND f.next_attempt_at<=now() AND q.state IN ('created','retry') ORDER BY f.created_at,f.id LIMIT 1 FOR UPDATE OF f SKIP LOCKED;
 IF j.id IS NULL THEN RETURN; END IF;
 UPDATE app.foundation_jobs SET status='running',attempts=attempts+1,cycle_attempts=cycle_attempts+1,token=gen_random_uuid(),lease_until=now()+interval '60 seconds',started_at=now(),finished_at=NULL WHERE id=j.id RETURNING * INTO j;
 INSERT INTO app.foundation_attempts(job_id,attempt,token) VALUES(j.id,j.attempts,j.token);
 UPDATE pgboss.job SET state='active',started_on=now(),retry_count=j.attempts-1 WHERE name='fitloom-foundation' AND id=j.id;
 RETURN NEXT j;
END $$;
CREATE FUNCTION app.foundation_allowed(j app.foundation_jobs) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT CASE WHEN j.authority='service' THEN
  (j.kind='files.cleanup' OR (j.kind='provider.fixture.v1' AND EXISTS(SELECT FROM app.provider_inbox i WHERE i.id=j.source_id)))
 ELSE j.kind='fixture.sensitive.v1' AND EXISTS(SELECT FROM app.principals p JOIN public."user" u ON u.id=p.auth_user_id WHERE p.id=j.actor_id AND p.active AND u.email_verified)
 AND app.member_permission(j.actor_id,j.tenant_id,j.location_id,'workspace.read') AND EXISTS(SELECT FROM app.shop_settings WHERE tenant_id=j.tenant_id AND consent_version='workspace-authority-v1') END
$$;
CREATE FUNCTION app.foundation_finish(identity uuid,fence uuid,outcome text,error_code text DEFAULT NULL) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE j app.foundation_jobs;target text;
BEGIN
 SELECT * INTO j FROM app.foundation_jobs WHERE id=identity FOR UPDATE;
 IF j.status<>'running' OR j.token IS DISTINCT FROM fence OR j.lease_until<=now() THEN RETURN false;END IF;
 IF outcome NOT IN ('succeeded','cancelled','failed') OR (error_code IS NOT NULL AND error_code NOT IN ('handler_failed','unsupported_kind','invalid_input','lease_expired','file_unsafe')) THEN RAISE EXCEPTION 'Invalid outcome' USING ERRCODE='22023'; END IF;
 target:=CASE WHEN outcome='failed' AND j.cycle_attempts<j.max_attempts AND error_code='handler_failed' THEN 'pending' ELSE outcome END;
 UPDATE app.foundation_jobs SET status=target,last_error=error_code,token=NULL,lease_until=NULL,next_attempt_at=now()+make_interval(secs=>least(60,5*power(2,j.cycle_attempts-1)::integer)),finished_at=CASE WHEN target<>'pending' THEN now() END WHERE id=identity;
 UPDATE app.foundation_attempts SET finished_at=now(),outcome=target,error_code=foundation_finish.error_code WHERE token=fence;
 UPDATE pgboss.job SET state=CASE target WHEN 'succeeded' THEN 'completed'::pgboss.job_state WHEN 'pending' THEN 'retry'::pgboss.job_state WHEN 'cancelled' THEN 'cancelled'::pgboss.job_state ELSE 'failed'::pgboss.job_state END,completed_on=CASE WHEN target<>'pending' THEN now() END WHERE name='fitloom-foundation' AND id=identity;
 RETURN true;
END $$;
CREATE FUNCTION app.foundation_apply(identity uuid,fence uuid) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE j app.foundation_jobs;i app.provider_inbox;current app.provider_fixture_state;result text;
BEGIN
 SELECT * INTO j FROM app.foundation_jobs WHERE id=identity FOR UPDATE;
 IF j.status<>'running' OR j.token IS DISTINCT FROM fence OR j.lease_until<=now() THEN RETURN 'stale';END IF;
 IF NOT app.foundation_allowed(j) THEN PERFORM app.foundation_finish(identity,fence,'cancelled');RETURN 'cancelled'; END IF;
 IF j.kind='fixture.sensitive.v1' THEN PERFORM app.foundation_finish(identity,fence,'succeeded');RETURN 'succeeded';END IF;
 IF j.kind<>'provider.fixture.v1' OR j.input_version<>1 THEN PERFORM app.foundation_finish(identity,fence,'failed','unsupported_kind');RETURN 'failed';END IF;
 SELECT * INTO i FROM app.provider_inbox WHERE id=j.source_id FOR UPDATE;
 -- Serializes distinct events for the same provider/account/environment/source.
 PERFORM pg_advisory_xact_lock(hashtextextended(i.provider||':'||i.account||':'||i.environment||':'||i.source_id,0));
 SELECT * INTO current FROM app.provider_fixture_state WHERE (provider,account,environment,source_id)=(i.provider,i.account,i.environment,i.source_id);
 IF current.version IS NOT NULL AND (current.version>=i.input_version OR current.state='cancelled') THEN result:='ignored';
 ELSE
 INSERT INTO app.provider_fixture_effects VALUES(i.provider,i.account,i.environment,i.source_id,i.input_version,i.event_id) ON CONFLICT DO NOTHING;
 INSERT INTO app.provider_fixture_state VALUES(i.provider,i.account,i.environment,i.source_id,i.input_version,i.event_state)
 ON CONFLICT(provider,account,environment,source_id) DO UPDATE SET version=excluded.version,state=excluded.state;
 result:='applied';END IF;
 UPDATE app.provider_inbox SET outcome=result WHERE id=i.id;
 PERFORM app.foundation_finish(identity,fence,'succeeded');RETURN result;
END $$;
CREATE FUNCTION app.fixture_receipt(provider_account text,provider_environment text,event_identity uuid,source_identity uuid,event_version integer,event_state text,digest text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE i app.provider_inbox;j app.foundation_jobs;identity uuid:=gen_random_uuid();
BEGIN
 IF provider_environment NOT IN ('development','test') OR provider_account<>'local-fixture' OR event_version<1 OR event_state NOT IN ('pending','confirmed','cancelled') OR digest !~ '^[0-9a-f]{64}$' THEN RAISE EXCEPTION 'Invalid fixture' USING ERRCODE='22023';END IF;
 INSERT INTO app.provider_inbox(provider,account,environment,event_id,source_id,input_version,event_state,body_hash)
 VALUES('fixture-v1',provider_account,provider_environment,event_identity,source_identity,event_version,event_state,digest)
 ON CONFLICT DO NOTHING RETURNING * INTO i;
 IF NOT FOUND THEN
 SELECT * INTO i FROM app.provider_inbox WHERE (provider,account,environment,event_id)=('fixture-v1',provider_account,provider_environment,event_identity);
 IF i.body_hash<>digest THEN RAISE EXCEPTION 'Event identity conflict' USING ERRCODE='23505';END IF;
 RETURN i.id;END IF;
 INSERT INTO app.foundation_jobs(id,kind,authority,source_id,source_key,input_version,payload)
 VALUES(identity,'provider.fixture.v1','service',i.id,'inbox:'||i.id,1,'{}') RETURNING * INTO j;
 PERFORM app.foundation_enqueue(j);RETURN i.id;
END $$;
CREATE FUNCTION app.foundation_cleanup_candidates(identity uuid,fence uuid) RETURNS SETOF uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE j app.foundation_jobs;
BEGIN
 SELECT * INTO j FROM app.foundation_jobs WHERE id=identity FOR UPDATE;
 IF j.kind<>'files.cleanup' OR j.authority<>'service' OR j.status<>'running' OR j.token IS DISTINCT FROM fence OR j.lease_until<=now() THEN RETURN;END IF;
 RETURN QUERY SELECT id FROM app.staged_file_cleanup WHERE state='staged' AND staged_at<now()-interval '24 hours' ORDER BY staged_at LIMIT 50 FOR UPDATE SKIP LOCKED;
END $$;
CREATE FUNCTION app.foundation_cleanup_done(identity uuid) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
 UPDATE app.staged_file_cleanup SET state='deleted',deleted_at=now() WHERE id=identity AND state='staged' AND staged_at<now()-interval '24 hours'
$$;
-- Narrow tenant query and commands. No payloads, raw receipts, signatures, or provider secrets in projections.
CREATE FUNCTION app.foundation_job_list() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT app.has_permission('access.manage') THEN RAISE EXCEPTION 'Job access denied' USING ERRCODE='42501';END IF;
 RETURN (SELECT coalesce(jsonb_agg(to_jsonb(v)),'[]') FROM (SELECT id,kind,status,attempts,last_error,created_at,finished_at FROM app.foundation_jobs WHERE tenant_id=nullif(current_setting('app.tenant_id',true),'')::uuid AND location_id=nullif(current_setting('app.location_id',true),'')::uuid ORDER BY created_at DESC LIMIT 50)v);
END $$;
CREATE FUNCTION app.foundation_job_change(identity uuid,retry boolean) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE op app.command_operations:=app.active_operation();j app.foundation_jobs;
BEGIN
 IF op.command_kind IS DISTINCT FROM (CASE WHEN retry THEN 'job.retry' ELSE 'job.cancel' END) OR NOT app.has_permission('access.manage') THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501';END IF;
 SELECT * INTO j FROM app.foundation_jobs WHERE id=identity AND tenant_id=op.owner_id AND location_id=nullif(current_setting('app.location_id',true),'')::uuid FOR UPDATE;
 IF j.id IS NULL OR (retry AND j.status<>'failed') OR (NOT retry AND j.status NOT IN ('pending','running')) THEN RAISE EXCEPTION 'Job state conflict' USING ERRCODE='P0003';END IF;
 UPDATE app.foundation_attempts SET finished_at=now(),outcome='cancelled' WHERE token=j.token AND finished_at IS NULL;
 UPDATE app.foundation_jobs SET status=CASE WHEN retry THEN 'pending' ELSE 'cancelled' END,cycle_attempts=CASE WHEN retry THEN 0 ELSE cycle_attempts END,token=NULL,lease_until=NULL,next_attempt_at=now(),finished_at=CASE WHEN NOT retry THEN now() END WHERE id=identity;
 PERFORM app.foundation_enqueue(j);
 UPDATE pgboss.job SET state=CASE WHEN retry THEN 'retry'::pgboss.job_state ELSE 'cancelled'::pgboss.job_state END WHERE name='fitloom-foundation' AND id=identity;
 RETURN identity;
END $$;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA app FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.foundation_dispatch(),app.foundation_take(),app.foundation_apply(uuid,uuid),app.foundation_finish(uuid,uuid,text,text),app.foundation_cleanup_candidates(uuid,uuid),app.foundation_cleanup_done(uuid) TO fitloom_worker;
GRANT EXECUTE ON FUNCTION app.fixture_receipt(text,text,uuid,uuid,integer,text,text),app.foundation_job_list(),app.foundation_job_change(uuid,boolean) TO fitloom_web;
CREATE TABLE app.foundation_operator_audit (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), principal_id uuid NOT NULL REFERENCES app.principals(id),job_id uuid NOT NULL REFERENCES app.foundation_jobs(id),action text NOT NULL,reason text NOT NULL,created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE app.foundation_operator_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.foundation_operator_audit FORCE ROW LEVEL SECURITY;
CREATE POLICY migration_access ON app.foundation_operator_audit TO fitloom_migrator USING(true) WITH CHECK(true);
CREATE FUNCTION app.foundation_operator(user_identity text,session_identity text,target uuid DEFAULT NULL,retry boolean DEFAULT NULL,reason text DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE j app.foundation_jobs;actor uuid;
BEGIN
 IF NOT app.operator_admitted(user_identity,session_identity,'jobs.manage') THEN RAISE EXCEPTION 'Recent operator MFA required' USING ERRCODE='42501';END IF;
 IF target IS NOT NULL THEN
 IF retry IS NULL OR length(trim(reason)) NOT BETWEEN 1 AND 500 THEN RAISE EXCEPTION 'Retry reason required' USING ERRCODE='22023';END IF;
 SELECT * INTO j FROM app.foundation_jobs WHERE id=target AND authority='service' FOR UPDATE;
 IF j.id IS NULL OR (retry AND j.status<>'failed') OR (NOT retry AND j.status NOT IN ('pending','running')) THEN RAISE EXCEPTION 'Job state conflict' USING ERRCODE='P0003';END IF;
 SELECT id INTO actor FROM app.principals WHERE auth_user_id=user_identity;
 UPDATE app.foundation_attempts SET finished_at=now(),outcome='cancelled' WHERE token=j.token AND finished_at IS NULL;
 UPDATE app.foundation_jobs SET status=CASE WHEN retry THEN 'pending' ELSE 'cancelled' END,cycle_attempts=CASE WHEN retry THEN 0 ELSE cycle_attempts END,token=NULL,lease_until=NULL,next_attempt_at=now(),finished_at=CASE WHEN NOT retry THEN now() END WHERE id=target;
 PERFORM app.foundation_enqueue(j);
 UPDATE pgboss.job SET state=CASE WHEN retry THEN 'retry'::pgboss.job_state ELSE 'cancelled'::pgboss.job_state END WHERE name='fitloom-foundation' AND id=target;
 INSERT INTO app.foundation_operator_audit(principal_id,job_id,action,reason) VALUES(actor,target,CASE WHEN retry THEN 'retry' ELSE 'cancel' END,reason);
 END IF;
 RETURN (SELECT coalesce(jsonb_agg(to_jsonb(v)),'[]') FROM (SELECT f.id,f.kind,f.status,f.attempts,f.last_error,f.created_at,f.finished_at,i.provider,i.account,i.environment,i.outcome AS inbox_outcome FROM app.foundation_jobs f LEFT JOIN app.provider_inbox i ON i.id=f.source_id WHERE f.authority='service' ORDER BY f.created_at DESC LIMIT 100)v);
END $$;
REVOKE ALL ON FUNCTION app.foundation_operator(text,text,uuid,boolean,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.foundation_operator(text,text,uuid,boolean,text) TO fitloom_auth;
