ALTER TABLE app.foundation_jobs ADD CHECK ((tenant_id IS NULL)=(location_id IS NULL));
ALTER TABLE app.foundation_jobs ADD CHECK (input_version>0 AND attempts>=0 AND cycle_attempts>=0 AND max_attempts BETWEEN 1 AND 10 AND octet_length(payload::text)<=65536);
ALTER TABLE app.foundation_jobs ADD CHECK ((status='running')=(token IS NOT NULL AND lease_until IS NOT NULL));
CREATE OR REPLACE FUNCTION app.foundation_finish(identity uuid,fence uuid,outcome text,error_code text DEFAULT NULL) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE j app.foundation_jobs;target text;
BEGIN
 SELECT * INTO j FROM app.foundation_jobs WHERE id=identity FOR UPDATE;
 IF j.status<>'running' OR j.token IS DISTINCT FROM fence OR j.lease_until<=now() THEN RETURN false;END IF;
 IF outcome NOT IN ('succeeded','cancelled','failed') OR (error_code IS NOT NULL AND error_code NOT IN ('handler_failed','unsupported_kind','invalid_input','lease_expired','file_unsafe')) THEN RAISE EXCEPTION 'Invalid outcome' USING ERRCODE='22023'; END IF;
 target:=CASE WHEN outcome='failed' AND j.cycle_attempts<j.max_attempts AND error_code='handler_failed' THEN 'pending' ELSE outcome END;
 IF outcome='succeeded' AND j.kind='files.cleanup' AND EXISTS(SELECT FROM app.staged_file_cleanup WHERE state='staged' AND staged_at<now()-interval '24 hours') THEN target:='pending';END IF;
 UPDATE app.foundation_jobs SET status=target,cycle_attempts=CASE WHEN outcome='succeeded' THEN 0 ELSE cycle_attempts END,last_error=error_code,token=NULL,lease_until=NULL,next_attempt_at=CASE WHEN outcome='succeeded' THEN now() ELSE now()+make_interval(secs=>least(60,5*power(2,j.cycle_attempts-1)::integer)) END,finished_at=CASE WHEN target<>'pending' THEN now() END WHERE id=identity;
 UPDATE app.foundation_attempts SET finished_at=now(),outcome=target,error_code=foundation_finish.error_code WHERE token=fence;
 UPDATE pgboss.job SET state=CASE target WHEN 'succeeded' THEN 'completed'::pgboss.job_state WHEN 'pending' THEN 'retry'::pgboss.job_state WHEN 'cancelled' THEN 'cancelled'::pgboss.job_state ELSE 'failed'::pgboss.job_state END,completed_on=CASE WHEN target<>'pending' THEN now() END WHERE name='fitloom-foundation' AND id=identity;
 RETURN true;
END $$;

DROP FUNCTION app.foundation_cleanup_done(uuid);
CREATE FUNCTION app.foundation_cleanup_done(identity uuid,fence uuid,file_identity uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE j app.foundation_jobs;
BEGIN
 SELECT * INTO j FROM app.foundation_jobs WHERE id=identity FOR UPDATE;
 IF j.kind IS DISTINCT FROM 'files.cleanup' OR j.authority IS DISTINCT FROM 'service' OR j.status IS DISTINCT FROM 'running' OR j.token IS DISTINCT FROM fence OR j.lease_until<=now() THEN RAISE EXCEPTION 'Cleanup claim lost' USING ERRCODE='42501';END IF;
 UPDATE app.staged_file_cleanup SET state='deleted',deleted_at=now() WHERE id=file_identity AND state='staged' AND staged_at<now()-interval '24 hours';
END $$;
REVOKE ALL ON FUNCTION app.foundation_cleanup_done(uuid,uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.foundation_cleanup_done(uuid,uuid,uuid) TO fitloom_worker;
