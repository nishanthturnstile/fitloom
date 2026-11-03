CREATE TABLE app.operator_operations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),principal_id uuid NOT NULL REFERENCES app.principals(id),
 action text NOT NULL,operation_key text NOT NULL CHECK(length(operation_key) BETWEEN 1 AND 200),request_hash text NOT NULL CHECK(request_hash ~ '^v1:[a-f0-9]{64}$'),
 reason text NOT NULL CHECK(length(trim(reason)) BETWEEN 1 AND 500),correlation_id uuid NOT NULL,
 tenant_id uuid REFERENCES app.tenants(id),subject_id uuid REFERENCES app.principals(id),job_id uuid REFERENCES app.foundation_jobs(id),
 result jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(principal_id,action,operation_key)
);
CREATE INDEX operator_operations_tenant ON app.operator_operations(tenant_id,created_at);
CREATE INDEX operator_operations_subject ON app.operator_operations(subject_id);
CREATE INDEX operator_operations_job ON app.operator_operations(job_id);
CREATE TABLE app.operator_admin_audit (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),principal_id uuid NOT NULL REFERENCES app.principals(id),action text NOT NULL,
 reason text NOT NULL,evidence_ref text NOT NULL,executed_by text NOT NULL DEFAULT session_user,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX operator_admin_subject ON app.operator_admin_audit(principal_id,created_at);
DO $$ DECLARE t text;BEGIN
 FOREACH t IN ARRAY ARRAY['operator_operations','operator_admin_audit'] LOOP
 EXECUTE format('ALTER TABLE app.%I ENABLE ROW LEVEL SECURITY',t);
 EXECUTE format('ALTER TABLE app.%I FORCE ROW LEVEL SECURITY',t);
 EXECUTE format('CREATE POLICY migration_access ON app.%I TO fitloom_migrator USING(true) WITH CHECK(true)',t);
 END LOOP;
END $$;
-- Preserve the private implementation; runtime mutations must pass through durable operation identity.
ALTER FUNCTION app.foundation_operator(text,text,uuid,boolean,text) RENAME TO foundation_operator_internal;
REVOKE ALL ON FUNCTION app.foundation_operator_internal(text,text,uuid,boolean,text) FROM fitloom_auth;
CREATE FUNCTION app.foundation_operator(user_identity text,session_identity text,target uuid DEFAULT NULL,retry boolean DEFAULT NULL,reason text DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF target IS NOT NULL THEN RAISE EXCEPTION 'Use durable operator command' USING ERRCODE='42501';END IF;
 RETURN app.foundation_operator_internal(user_identity,session_identity);
END $$;
CREATE FUNCTION app.operator_tenants(user_identity text,session_identity text,query text) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT app.operator_admitted(user_identity,session_identity,'tenants.read') THEN RAISE EXCEPTION 'Recent operator MFA required' USING ERRCODE='42501';END IF;
 IF query IS NULL OR length(query)>200 THEN RAISE EXCEPTION 'Invalid lookup' USING ERRCODE='22023';END IF;
 RETURN (SELECT coalesce(jsonb_agg(to_jsonb(v)),'[]') FROM (SELECT t.id AS "tenantId",t.name AS "shopName",t.active,(SELECT count(*) FROM app.locations l WHERE l.tenant_id=t.id AND l.archived_at IS NULL) AS "locationCount",(SELECT coalesce(jsonb_agg(jsonb_build_object('principalId',m.principal_id)),'[]') FROM app.memberships m WHERE m.tenant_id=t.id AND m.active AND m.is_owner) AS owners FROM app.tenants t WHERE query='' OR t.id::text=query OR starts_with(lower(t.name),lower(query)) ORDER BY t.created_at DESC,t.id LIMIT 25) v);
END $$;
CREATE FUNCTION app.operator_recovery_email(user_identity text,session_identity text,tenant_identity uuid,principal_identity uuid) RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE email text;
BEGIN
 IF NOT app.operator_admitted(user_identity,session_identity,'owners.recover') THEN RAISE EXCEPTION 'Recent operator MFA required' USING ERRCODE='42501';END IF;
 SELECT u.email INTO email FROM app.memberships m JOIN app.principals p ON p.id=m.principal_id JOIN public."user" u ON u.id=p.auth_user_id WHERE m.tenant_id=tenant_identity AND p.id=principal_identity AND m.active AND m.is_owner AND p.active AND u.email_verified;
 IF email IS NULL THEN RAISE EXCEPTION 'Verified owner required' USING ERRCODE='42501';END IF;
 RETURN email;
END $$;
CREATE FUNCTION app.operator_execute(user_identity text,session_identity text,command_action text,command_key text,digest text,command_reason text,correlation uuid,tenant_identity uuid DEFAULT NULL,principal_identity uuid DEFAULT NULL,job_identity uuid DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid;permission text;operation app.operator_operations;outcome jsonb;subject_user text;inserted boolean;
BEGIN
 permission:=CASE command_action WHEN 'tenant.suspend' THEN 'tenants.manage' WHEN 'tenant.restore' THEN 'tenants.manage' WHEN 'sessions.revoke' THEN 'sessions.revoke' WHEN 'owner.recover' THEN 'owners.recover' WHEN 'job.retry' THEN 'jobs.manage' WHEN 'job.cancel' THEN 'jobs.manage' END;
 IF permission IS NULL OR NOT app.operator_admitted(user_identity,session_identity,permission) THEN RAISE EXCEPTION 'Recent operator MFA and grant required' USING ERRCODE='42501';END IF;
 IF command_key IS NULL OR length(command_key) NOT BETWEEN 1 AND 200 OR digest IS NULL OR digest !~ '^v1:[a-f0-9]{64}$' OR command_reason IS NULL OR length(trim(command_reason)) NOT BETWEEN 1 AND 500 OR correlation IS NULL THEN RAISE EXCEPTION 'Invalid operator command' USING ERRCODE='22023';END IF;
 SELECT id INTO actor FROM app.principals WHERE auth_user_id=user_identity;
 IF command_action IN ('tenant.suspend','tenant.restore','sessions.revoke','owner.recover') AND NOT EXISTS(SELECT FROM app.tenants WHERE id=tenant_identity) THEN RAISE EXCEPTION 'Unknown tenant' USING ERRCODE='42501';END IF;
 IF command_action='owner.recover' THEN PERFORM app.operator_recovery_email(user_identity,session_identity,tenant_identity,principal_identity);END IF;
 IF command_action='sessions.revoke' AND NOT EXISTS(SELECT FROM app.memberships WHERE tenant_id=tenant_identity AND principal_id=principal_identity) THEN RAISE EXCEPTION 'Unknown tenant member' USING ERRCODE='42501';END IF;
 IF command_action IN ('job.retry','job.cancel') AND NOT EXISTS(SELECT FROM app.foundation_jobs WHERE id=job_identity AND authority='service') THEN RAISE EXCEPTION 'Unknown service job' USING ERRCODE='42501';END IF;
 INSERT INTO app.operator_operations(principal_id,action,operation_key,request_hash,reason,correlation_id,tenant_id,subject_id,job_id,result) VALUES(actor,command_action,command_key,digest,trim(command_reason),correlation,tenant_identity,principal_identity,job_identity,'{}') ON CONFLICT DO NOTHING RETURNING * INTO operation;
 inserted:=FOUND;
 IF NOT inserted THEN
 SELECT * INTO operation FROM app.operator_operations WHERE principal_id=actor AND action=command_action AND operation_key=command_key FOR UPDATE;
 IF operation.request_hash IS DISTINCT FROM digest THEN RAISE EXCEPTION 'Operation input changed' USING ERRCODE='P0003';END IF;
 RETURN jsonb_build_object('operationId',operation.id,'replayed',true,'result',operation.result);
 END IF;
 CASE command_action
 WHEN 'tenant.suspend','tenant.restore' THEN
 IF tenant_identity IS NULL OR principal_identity IS NOT NULL OR job_identity IS NOT NULL THEN RAISE EXCEPTION 'Invalid tenant target' USING ERRCODE='22023';END IF;
 UPDATE app.tenants SET active=(command_action='tenant.restore') WHERE id=tenant_identity;
 IF NOT FOUND THEN RAISE EXCEPTION 'Unknown tenant' USING ERRCODE='42501';END IF;
 outcome:=jsonb_build_object('accepted',true);
 WHEN 'sessions.revoke' THEN
 IF tenant_identity IS NULL OR principal_identity IS NULL OR job_identity IS NOT NULL THEN RAISE EXCEPTION 'Invalid session subject' USING ERRCODE='22023';END IF;
 SELECT p.auth_user_id INTO subject_user FROM app.principals p JOIN app.memberships m ON m.principal_id=p.id WHERE p.id=principal_identity AND m.tenant_id=tenant_identity;
 IF subject_user IS NULL THEN RAISE EXCEPTION 'Unknown tenant member' USING ERRCODE='42501';END IF;
 DELETE FROM public.session WHERE user_id=subject_user;
 outcome:=jsonb_build_object('accepted',true);
 WHEN 'owner.recover' THEN
 IF tenant_identity IS NULL OR principal_identity IS NULL OR job_identity IS NOT NULL THEN RAISE EXCEPTION 'Invalid owner subject' USING ERRCODE='22023';END IF;
 PERFORM app.operator_recovery_email(user_identity,session_identity,tenant_identity,principal_identity);
 outcome:=jsonb_build_object('accepted',true);
 WHEN 'job.retry','job.cancel' THEN
 IF job_identity IS NULL OR tenant_identity IS NOT NULL OR principal_identity IS NOT NULL THEN RAISE EXCEPTION 'Invalid job target' USING ERRCODE='22023';END IF;
 PERFORM app.foundation_operator_internal(user_identity,session_identity,job_identity,command_action='job.retry',command_reason);
 outcome:=jsonb_build_object('accepted',true);
 ELSE RAISE EXCEPTION 'Unknown operator action' USING ERRCODE='22023';
 END CASE;
 UPDATE app.operator_operations SET result=outcome WHERE id=operation.id;
 RETURN jsonb_build_object('operationId',operation.id,'replayed',false,'result',outcome);
END $$;
CREATE FUNCTION app.bootstrap_operator(verified_email text,reason text,evidence text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid;changes integer;
BEGIN
 IF reason IS NULL OR length(trim(reason)) NOT BETWEEN 1 AND 500 OR evidence IS NULL OR evidence !~ '^[A-Za-z0-9][A-Za-z0-9./:_-]{2,199}$' THEN RAISE EXCEPTION 'Reason and identity evidence reference required' USING ERRCODE='22023';END IF;
 SELECT p.id INTO STRICT actor FROM app.principals p JOIN public."user" u ON u.id=p.auth_user_id WHERE lower(u.email)=lower(trim(verified_email)) AND u.email_verified AND p.active;
 INSERT INTO app.operator_grants(principal_id,permission) SELECT actor,p FROM unnest(ARRAY['operator.access','tenants.read','tenants.manage','sessions.revoke','owners.recover','jobs.manage']) p ON CONFLICT DO NOTHING;
 GET DIAGNOSTICS changes=ROW_COUNT;
 IF changes>0 THEN INSERT INTO app.operator_admin_audit(principal_id,action,reason,evidence_ref) VALUES(actor,'bootstrap',trim(reason),evidence);END IF;
 RETURN actor;
END $$;
CREATE FUNCTION app.recover_operator_mfa(verified_email text,reason text,evidence text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid;auth_user text;
BEGIN
 IF reason IS NULL OR length(trim(reason)) NOT BETWEEN 1 AND 500 OR evidence IS NULL OR evidence !~ '^[A-Za-z0-9][A-Za-z0-9./:_-]{2,199}$' THEN RAISE EXCEPTION 'Reason and verified identity evidence required' USING ERRCODE='22023';END IF;
 SELECT p.id,u.id INTO STRICT actor,auth_user FROM app.principals p JOIN public."user" u ON u.id=p.auth_user_id WHERE lower(u.email)=lower(trim(verified_email)) AND u.email_verified AND p.active AND EXISTS(SELECT FROM app.operator_grants g WHERE g.principal_id=p.id);
 DELETE FROM public.session WHERE user_id=auth_user;
 DELETE FROM public.two_factor WHERE user_id=auth_user;
 UPDATE public."user" SET two_factor_enabled=false WHERE id=auth_user;
 INSERT INTO app.operator_admin_audit(principal_id,action,reason,evidence_ref) VALUES(actor,'mfa.recover',trim(reason),evidence);
 RETURN actor;
END $$;
REVOKE ALL ON FUNCTION app.foundation_operator(text,text,uuid,boolean,text),app.operator_tenants(text,text,text),app.operator_recovery_email(text,text,uuid,uuid),app.operator_execute(text,text,text,text,text,text,uuid,uuid,uuid,uuid),app.bootstrap_operator(text,text,text),app.recover_operator_mfa(text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.foundation_operator(text,text,uuid,boolean,text),app.operator_tenants(text,text,text),app.operator_recovery_email(text,text,uuid,uuid),app.operator_execute(text,text,text,text,text,text,uuid,uuid,uuid,uuid) TO fitloom_auth;
