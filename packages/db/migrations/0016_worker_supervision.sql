-- This fixed-queue adapter owns supervision; no pg-boss SDK supervisor runs in the worker.
CREATE FUNCTION app.foundation_maintenance() RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
 DELETE FROM pgboss.job WHERE name='fitloom-foundation' AND id IN (
  SELECT q.id FROM pgboss.job q JOIN app.foundation_jobs f ON f.id=q.id
  WHERE q.name='fitloom-foundation' AND f.status IN ('succeeded','failed','cancelled')
   AND f.finished_at<now()-interval '7 days' ORDER BY f.finished_at LIMIT 100
 )
$$;
REVOKE ALL ON FUNCTION app.foundation_maintenance() FROM PUBLIC;
-- Internal only: called by the bounded, worker-executable dispatcher.
CREATE INDEX staged_file_cleanup_due ON app.staged_file_cleanup(staged_at,id) WHERE state='staged';
CREATE INDEX foundation_jobs_finished ON app.foundation_jobs(finished_at) WHERE status IN ('succeeded','failed','cancelled');
CREATE OR REPLACE FUNCTION app.foundation_dispatch() RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
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
 FOR j IN SELECT * FROM app.foundation_jobs WHERE status='running' AND lease_until<now() ORDER BY lease_until LIMIT 50 FOR UPDATE SKIP LOCKED LOOP
 UPDATE app.foundation_attempts SET finished_at=now(),outcome='interrupted',error_code='lease_expired' WHERE token=j.token AND finished_at IS NULL;
 UPDATE app.foundation_jobs SET status=CASE WHEN cycle_attempts>=max_attempts THEN 'failed' ELSE 'pending' END,token=NULL,lease_until=NULL,last_error='lease_expired',next_attempt_at=now(),finished_at=CASE WHEN cycle_attempts>=max_attempts THEN now() END WHERE id=j.id;
 UPDATE pgboss.job SET state=CASE WHEN j.cycle_attempts>=j.max_attempts THEN 'failed'::pgboss.job_state ELSE 'retry'::pgboss.job_state END WHERE name='fitloom-foundation' AND id=j.id;
 END LOOP;
 PERFORM app.foundation_maintenance();
 RETURN n;
END $$;
CREATE OR REPLACE FUNCTION app.foundation_apply(identity uuid,fence uuid) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
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
 IF current.version IS NOT NULL AND (current.version>=i.input_version OR current.state='cancelled' OR (current.state='confirmed' AND i.event_state='pending')) THEN result:='ignored';
 ELSE
 INSERT INTO app.provider_fixture_effects VALUES(i.provider,i.account,i.environment,i.source_id,i.input_version,i.event_id) ON CONFLICT DO NOTHING;
 INSERT INTO app.provider_fixture_state VALUES(i.provider,i.account,i.environment,i.source_id,i.input_version,i.event_state)
 ON CONFLICT(provider,account,environment,source_id) DO UPDATE SET version=excluded.version,state=excluded.state;
 result:='applied';END IF;
 UPDATE app.provider_inbox SET outcome=result WHERE id=i.id;
 PERFORM app.foundation_finish(identity,fence,'succeeded');RETURN result;
END $$;
CREATE OR REPLACE FUNCTION app.foundation_operator(user_identity text,session_identity text,target uuid DEFAULT NULL,retry boolean DEFAULT NULL,reason text DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE j app.foundation_jobs;actor uuid;
BEGIN
 IF NOT app.operator_admitted(user_identity,session_identity,'jobs.manage') THEN RAISE EXCEPTION 'Recent operator MFA required' USING ERRCODE='42501';END IF;
 IF target IS NOT NULL THEN
 IF retry IS NULL OR reason IS NULL OR length(trim(reason)) NOT BETWEEN 1 AND 500 THEN RAISE EXCEPTION 'Retry reason required' USING ERRCODE='22023';END IF;
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
