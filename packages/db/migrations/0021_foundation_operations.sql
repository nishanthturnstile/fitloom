CREATE TABLE app.worker_observations (
 name text PRIMARY KEY CHECK(name='foundation'),instance_id uuid NOT NULL,observed_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
ALTER TABLE app.worker_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.worker_observations FORCE ROW LEVEL SECURITY;
CREATE POLICY migration_access ON app.worker_observations TO fitloom_migrator USING(true) WITH CHECK(true);
CREATE FUNCTION app.worker_observed(instance uuid) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
 INSERT INTO app.worker_observations(name,instance_id) VALUES('foundation',instance)
 ON CONFLICT(name) DO UPDATE SET instance_id=excluded.instance_id,observed_at=clock_timestamp()
 WHERE worker_observations.instance_id<>excluded.instance_id OR worker_observations.observed_at<clock_timestamp()-interval '5 seconds'
$$;
CREATE INDEX foundation_jobs_live_status ON app.foundation_jobs(status,next_attempt_at) WHERE status IN ('pending','running','failed');
CREATE INDEX auth_mail_live_status ON app.auth_mail(state,next_attempt_at) WHERE state IN ('pending','running','failed');
CREATE FUNCTION app.foundation_status(user_identity text,session_identity text) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE worker app.worker_observations;foundation jsonb;mail jsonb;outbox jsonb;
BEGIN
 IF NOT app.operator_admitted(user_identity,session_identity,'jobs.manage') THEN RAISE EXCEPTION 'Recent operator MFA required' USING ERRCODE='42501';END IF;
 SELECT * INTO worker FROM app.worker_observations WHERE name='foundation';
 SELECT jsonb_build_object('pending',count(*) FILTER(WHERE status='pending'),'running',count(*) FILTER(WHERE status='running'),'failed',count(*) FILTER(WHERE status='failed'),'ready',count(*) FILTER(WHERE status='pending' AND next_attempt_at<=now()),'expiredClaims',count(*) FILTER(WHERE status='running' AND lease_until<=now()),'oldestReadySeconds',max(greatest(0,extract(epoch FROM now()-next_attempt_at))) FILTER(WHERE status='pending' AND next_attempt_at<=now())) INTO foundation FROM app.foundation_jobs WHERE status IN ('pending','running','failed');
 SELECT jsonb_build_object('pending',count(*) FILTER(WHERE state='pending'),'running',count(*) FILTER(WHERE state='running'),'failed',count(*) FILTER(WHERE state='failed'),'ready',count(*) FILTER(WHERE state='pending' AND next_attempt_at<=now()),'expiredClaims',count(*) FILTER(WHERE state='running' AND locked_at<now()-interval '2 minutes'),'oldestReadySeconds',max(greatest(0,extract(epoch FROM now()-next_attempt_at))) FILTER(WHERE state='pending' AND next_attempt_at<=now())) INTO mail FROM app.auth_mail WHERE state IN ('pending','running','failed');
 SELECT jsonb_build_object('pending',count(*),'oldestSeconds',max(greatest(0,extract(epoch FROM now()-o.created_at)))) INTO outbox FROM app.command_outbox o JOIN app.command_operations c ON c.id=o.operation_id WHERE c.completed_at IS NOT NULL AND NOT EXISTS(SELECT FROM app.foundation_jobs f WHERE f.outbox_id=o.id);
 RETURN jsonb_build_object('observedAt',clock_timestamp(),'database',jsonb_build_object('state','available'),'worker',jsonb_build_object('state',CASE WHEN worker.observed_at IS NULL THEN 'unknown' WHEN worker.observed_at<clock_timestamp()-interval '30 seconds' THEN 'stale' ELSE 'observed' END,'lastSeenAt',worker.observed_at,'ageSeconds',CASE WHEN worker.observed_at IS NOT NULL THEN greatest(0,extract(epoch FROM clock_timestamp()-worker.observed_at)) END),'queues',jsonb_build_object('foundation',foundation,'mail',mail,'outbox',outbox),'backups',jsonb_build_object('state','unknown','owner','external'));
END $$;
REVOKE ALL ON FUNCTION app.worker_observed(uuid),app.foundation_status(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.worker_observed(uuid) TO fitloom_worker;
GRANT EXECUTE ON FUNCTION app.foundation_status(text,text) TO fitloom_auth;
-- Keep structured job diagnostics tied to the originating command's actual correlation ID.
ALTER TABLE app.foundation_jobs ADD COLUMN correlation_id uuid;
UPDATE app.foundation_jobs f SET correlation_id=c.correlation_id FROM app.command_outbox o JOIN app.command_operations c ON c.id=o.operation_id WHERE f.outbox_id=o.id;
UPDATE app.foundation_jobs SET correlation_id=id WHERE correlation_id IS NULL;
ALTER TABLE app.foundation_jobs ALTER COLUMN correlation_id SET DEFAULT gen_random_uuid();
ALTER TABLE app.foundation_jobs ALTER COLUMN correlation_id SET NOT NULL;
CREATE FUNCTION app.foundation_job_correlation() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NEW.outbox_id IS NOT NULL THEN SELECT c.correlation_id INTO NEW.correlation_id FROM app.command_outbox o JOIN app.command_operations c ON c.id=o.operation_id WHERE o.id=NEW.outbox_id;END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION app.foundation_job_correlation() FROM PUBLIC;
CREATE TRIGGER foundation_job_correlation BEFORE INSERT ON app.foundation_jobs FOR EACH ROW EXECUTE FUNCTION app.foundation_job_correlation();
