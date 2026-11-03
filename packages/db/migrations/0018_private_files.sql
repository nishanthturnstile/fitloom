-- Application metadata is authoritative; SeaweedFS objects are private opaque UUID keys.
CREATE TABLE app.private_files (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),owner_id uuid NOT NULL REFERENCES app.principals(id),
 tenant_id uuid NOT NULL,location_id uuid NOT NULL,
 state text NOT NULL DEFAULT 'staged' CHECK(state IN ('staged','finalized','attached','retired','deleted')),
 byte_size integer,media_type text,sha256 text,version integer NOT NULL DEFAULT 0 CHECK(version>=0),
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(tenant_id,location_id,id),FOREIGN KEY(tenant_id,location_id) REFERENCES app.locations(tenant_id,id),
 CHECK(state IN ('staged','deleted') OR (byte_size BETWEEN 1 AND 5242880 AND media_type IN ('image/png','image/jpeg') AND sha256 ~ '^[0-9a-f]{64}$' AND byte_size IS NOT NULL AND media_type IS NOT NULL AND sha256 IS NOT NULL))
);
CREATE INDEX private_files_owner ON app.private_files(owner_id);
CREATE INDEX private_files_scope ON app.private_files(tenant_id,location_id,created_at);
CREATE INDEX private_files_cleanup ON app.private_files(updated_at,id) WHERE state IN ('staged','finalized','retired');
CREATE TABLE app.file_attachments (
 file_id uuid PRIMARY KEY,tenant_id uuid NOT NULL,location_id uuid NOT NULL,
 attached_by uuid NOT NULL REFERENCES app.principals(id),attached_at timestamptz NOT NULL DEFAULT now(),retired_at timestamptz,
 FOREIGN KEY(tenant_id,location_id,file_id) REFERENCES app.private_files(tenant_id,location_id,id)
);
CREATE INDEX file_attachments_actor ON app.file_attachments(attached_by);
CREATE INDEX file_attachments_scope ON app.file_attachments(tenant_id,location_id,attached_at);
CREATE TABLE app.file_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),file_id uuid NOT NULL REFERENCES app.private_files(id),
 actor_id uuid REFERENCES app.principals(id),action text NOT NULL CHECK(action IN ('finalize','delete')),
 occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX file_events_file ON app.file_events(file_id,occurred_at);
CREATE INDEX file_events_actor ON app.file_events(actor_id);
DO $$ DECLARE t text;BEGIN
 FOREACH t IN ARRAY ARRAY['private_files','file_attachments','file_events'] LOOP
 EXECUTE format('ALTER TABLE app.%I ENABLE ROW LEVEL SECURITY',t);
 EXECUTE format('ALTER TABLE app.%I FORCE ROW LEVEL SECURITY',t);
 EXECUTE format('CREATE POLICY migration_access ON app.%I TO fitloom_migrator USING(true) WITH CHECK(true)',t);
 END LOOP;
END $$;
-- Existing and future owners receive file permissions. Other presets require explicit delegation.
INSERT INTO app.permission_grants(tenant_id,role_id,permission) SELECT tenant_id,id,p FROM app.roles CROSS JOIN unnest(ARRAY['files.read','files.manage']) p WHERE preset='owner' ON CONFLICT DO NOTHING;
CREATE OR REPLACE FUNCTION app.install_role_presets(tenant uuid,owner_role uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE manager uuid;staff uuid;
BEGIN
 UPDATE app.roles SET preset='owner' WHERE id=owner_role AND tenant_id=tenant;
 INSERT INTO app.roles(tenant_id,name,preset) VALUES(tenant,'Manager','manager') RETURNING id INTO manager;
 INSERT INTO app.roles(tenant_id,name,preset) VALUES(tenant,'Staff','staff') RETURNING id INTO staff;
 INSERT INTO app.permission_grants SELECT tenant,owner_role,permission FROM unnest(ARRAY['workspace.read','workspace.private.read','access.manage','locations.all','audit.read','files.read','files.manage']) permission ON CONFLICT DO NOTHING;
 INSERT INTO app.permission_grants VALUES(tenant,manager,'workspace.read'),(tenant,manager,'workspace.manage'),(tenant,staff,'workspace.read');
 UPDATE app.memberships m SET is_owner=true WHERE m.tenant_id=tenant AND EXISTS(SELECT FROM app.location_grants g WHERE (g.tenant_id,g.membership_id)=(m.tenant_id,m.id) AND g.role_id=owner_role);
END $$;
CREATE OR REPLACE FUNCTION app.create_custom_role(role_name text,permissions text[]) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE op app.command_operations:=app.active_operation();role_identity uuid;p text;
BEGIN
 PERFORM 1 FROM app.tenants WHERE id=op.owner_id FOR UPDATE;
 IF op.owner_kind<>'tenant' OR op.command_kind<>'role.create' OR NOT app.has_permission('access.manage') THEN RAISE EXCEPTION 'Role administration denied' USING ERRCODE='42501'; END IF;
 IF length(trim(role_name)) NOT BETWEEN 1 AND 80 OR cardinality(permissions) NOT BETWEEN 1 AND 20 OR NOT 'workspace.read'=ANY(permissions) THEN RAISE EXCEPTION 'Invalid role' USING ERRCODE='22023'; END IF;
 FOREACH p IN ARRAY permissions LOOP IF p NOT IN ('workspace.read','workspace.manage','workspace.private.read','access.manage','locations.all','audit.read','journal.read','journal.post','files.read','files.manage') OR NOT app.has_permission(p) THEN RAISE EXCEPTION 'Permission exceeds delegation' USING ERRCODE='42501'; END IF; END LOOP;
 INSERT INTO app.roles(tenant_id,name) VALUES(op.owner_id,trim(role_name)) RETURNING id INTO role_identity;
 INSERT INTO app.permission_grants SELECT DISTINCT op.owner_id,role_identity,permission_row.permission FROM unnest(permissions) AS permission_row(permission);RETURN role_identity;
END $$;

CREATE FUNCTION app.file_begin() RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE op app.command_operations:=app.active_operation();identity uuid;
BEGIN
 IF op.command_kind IS DISTINCT FROM 'file.begin' OR NOT app.has_permission('files.manage') THEN RAISE EXCEPTION 'File access denied' USING ERRCODE='42501';END IF;
 INSERT INTO app.private_files(owner_id,tenant_id,location_id) VALUES(op.actor_id,op.tenant_id,op.location_id) RETURNING id INTO identity;
 RETURN identity;
END $$;
CREATE FUNCTION app.file_upload_target(identity uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE f app.private_files;
BEGIN
 IF NOT app.has_permission('files.manage') THEN RAISE EXCEPTION 'File access denied' USING ERRCODE='42501';END IF;
 SELECT * INTO f FROM app.private_files WHERE id=identity AND tenant_id=nullif(current_setting('app.tenant_id',true),'')::uuid AND location_id=nullif(current_setting('app.location_id',true),'')::uuid AND owner_id=nullif(current_setting('app.principal_id',true),'')::uuid FOR UPDATE;
 IF f.id IS NULL OR f.state NOT IN ('staged','finalized') OR f.created_at<now()-interval '1 hour' THEN RAISE EXCEPTION 'Upload state conflict' USING ERRCODE='P0003';END IF;
 RETURN jsonb_build_object('id',f.id,'state',f.state,'sha256',f.sha256,'version',f.version);
END $$;
CREATE FUNCTION app.file_finalize(identity uuid,byte_count integer,mime text,digest text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE target jsonb;
BEGIN
 target:=app.file_upload_target(identity);
 IF byte_count IS NULL OR byte_count NOT BETWEEN 1 AND 5242880 OR mime IS NULL OR mime NOT IN ('image/png','image/jpeg') OR digest IS NULL OR digest !~ '^[0-9a-f]{64}$' THEN RAISE EXCEPTION 'Invalid file metadata' USING ERRCODE='22023';END IF;
 IF target->>'state'='finalized' THEN
 IF target->>'sha256'<>digest THEN RAISE EXCEPTION 'Upload content conflict' USING ERRCODE='P0003';END IF;
 RETURN jsonb_build_object('id',identity,'version',(target->>'version')::int);END IF;
 UPDATE app.private_files SET state='finalized',byte_size=byte_count,media_type=mime,sha256=digest,version=version+1,updated_at=now() WHERE id=identity;
 INSERT INTO app.file_events(file_id,actor_id,action) VALUES(identity,nullif(current_setting('app.principal_id',true),'')::uuid,'finalize');
 RETURN jsonb_build_object('id',identity,'version',1);
END $$;
CREATE FUNCTION app.file_change(identity uuid,expected_version integer,retire boolean) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE op app.command_operations:=app.active_operation();f app.private_files;
BEGIN
 IF op.command_kind IS DISTINCT FROM (CASE WHEN retire THEN 'file.retire' ELSE 'file.attach' END) OR NOT app.has_permission('files.manage') THEN RAISE EXCEPTION 'File access denied' USING ERRCODE='42501';END IF;
 SELECT * INTO f FROM app.private_files WHERE id=identity AND tenant_id=op.tenant_id AND location_id=op.location_id FOR UPDATE;
 IF f.id IS NULL OR f.version IS DISTINCT FROM expected_version OR (retire AND f.state NOT IN ('finalized','attached')) OR (NOT retire AND f.state<>'finalized') THEN RAISE EXCEPTION 'File state conflict' USING ERRCODE='P0003';END IF;
 IF retire THEN UPDATE app.file_attachments SET retired_at=now() WHERE file_id=identity AND retired_at IS NULL;
 ELSE INSERT INTO app.file_attachments(file_id,tenant_id,location_id,attached_by) VALUES(identity,f.tenant_id,f.location_id,op.actor_id);END IF;
 UPDATE app.private_files SET state=CASE WHEN retire THEN 'retired' ELSE 'attached' END,version=version+1,updated_at=now() WHERE id=identity;
 RETURN jsonb_build_object('id',identity,'version',f.version+1);
END $$;
CREATE FUNCTION app.file_read(identity uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE f app.private_files;
BEGIN
 IF NOT app.has_permission('files.read') THEN RAISE EXCEPTION 'File access denied' USING ERRCODE='42501';END IF;
 SELECT p.* INTO f FROM app.private_files p JOIN app.file_attachments a ON (a.tenant_id,a.location_id,a.file_id)=(p.tenant_id,p.location_id,p.id) WHERE p.id=identity AND p.tenant_id=nullif(current_setting('app.tenant_id',true),'')::uuid AND p.location_id=nullif(current_setting('app.location_id',true),'')::uuid AND p.state='attached' AND a.retired_at IS NULL;
 IF f.id IS NULL THEN RAISE EXCEPTION 'File access denied' USING ERRCODE='42501';END IF;
 RETURN jsonb_build_object('id',f.id,'size',f.byte_size,'mediaType',f.media_type,'sha256',f.sha256,'version',f.version);
END $$;
CREATE FUNCTION app.file_list() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT app.has_permission('files.read') THEN RAISE EXCEPTION 'File access denied' USING ERRCODE='42501';END IF;
 RETURN (SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'size',byte_size,'mediaType',media_type,'version',version,'createdAt',created_at) ORDER BY created_at DESC),'[]') FROM (SELECT * FROM app.private_files WHERE tenant_id=nullif(current_setting('app.tenant_id',true),'')::uuid AND location_id=nullif(current_setting('app.location_id',true),'')::uuid AND state='attached' ORDER BY created_at DESC,id LIMIT 50) f);
END $$;
CREATE FUNCTION app.file_cleanup_candidates(identity uuid,fence uuid) RETURNS SETOF uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE j app.foundation_jobs;
BEGIN
 SELECT * INTO j FROM app.foundation_jobs WHERE id=identity FOR UPDATE;
 IF j.kind IS DISTINCT FROM 'files.cleanup' OR j.authority IS DISTINCT FROM 'service' OR j.status IS DISTINCT FROM 'running' OR j.token IS DISTINCT FROM fence OR j.lease_until<=now() THEN RAISE EXCEPTION 'Cleanup claim lost' USING ERRCODE='42501';END IF;
 RETURN QUERY SELECT f.id FROM app.private_files f WHERE f.state IN ('staged','finalized','retired') AND f.updated_at<now()-interval '24 hours' AND NOT EXISTS(SELECT FROM app.file_attachments a WHERE a.file_id=f.id AND a.retired_at IS NULL) ORDER BY f.updated_at,f.id LIMIT 50 FOR UPDATE OF f SKIP LOCKED;
END $$;
CREATE FUNCTION app.file_cleanup_done(identity uuid,fence uuid,files uuid[]) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE allowed uuid[];
BEGIN
 SELECT coalesce(array_agg(id),'{}'::uuid[]) INTO allowed FROM app.file_cleanup_candidates(identity,fence) id;
 IF cardinality(files)>50 OR NOT files<@allowed THEN RAISE EXCEPTION 'Invalid cleanup records' USING ERRCODE='42501';END IF;
 WITH deleted AS (UPDATE app.private_files SET state='deleted',updated_at=now() WHERE id=ANY(files) RETURNING id) INSERT INTO app.file_events(file_id,action) SELECT id,'delete' FROM deleted;
END $$;
REVOKE ALL ON FUNCTION app.file_begin(),app.file_upload_target(uuid),app.file_finalize(uuid,integer,text,text),app.file_change(uuid,integer,boolean),app.file_read(uuid),app.file_list(),app.file_cleanup_candidates(uuid,uuid),app.file_cleanup_done(uuid,uuid,uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.file_begin(),app.file_upload_target(uuid),app.file_finalize(uuid,integer,text,text),app.file_change(uuid,integer,boolean),app.file_read(uuid),app.file_list() TO fitloom_web;
GRANT EXECUTE ON FUNCTION app.file_cleanup_candidates(uuid,uuid),app.file_cleanup_done(uuid,uuid,uuid[]) TO fitloom_worker;

CREATE OR REPLACE FUNCTION app.foundation_finish(identity uuid,fence uuid,outcome text,error_code text DEFAULT NULL) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE j app.foundation_jobs;target text;
BEGIN
 SELECT * INTO j FROM app.foundation_jobs WHERE id=identity FOR UPDATE;
 IF j.status<>'running' OR j.token IS DISTINCT FROM fence OR j.lease_until<=now() THEN RETURN false;END IF;
 IF outcome NOT IN ('succeeded','cancelled','failed') OR (error_code IS NOT NULL AND error_code NOT IN ('handler_failed','unsupported_kind','invalid_input','lease_expired','file_unsafe')) THEN RAISE EXCEPTION 'Invalid outcome' USING ERRCODE='22023'; END IF;
 target:=CASE WHEN outcome='failed' AND j.cycle_attempts<j.max_attempts AND error_code='handler_failed' THEN 'pending' ELSE outcome END;
 IF outcome='succeeded' AND j.kind='files.cleanup' AND (EXISTS(SELECT FROM app.staged_file_cleanup WHERE state='staged' AND staged_at<now()-interval '24 hours') OR EXISTS(SELECT FROM app.private_files f WHERE f.state IN ('staged','finalized','retired') AND f.updated_at<now()-interval '24 hours' AND NOT EXISTS(SELECT FROM app.file_attachments a WHERE a.file_id=f.id AND a.retired_at IS NULL))) THEN target:='pending';END IF;
 UPDATE app.foundation_jobs SET status=target,cycle_attempts=CASE WHEN outcome='succeeded' THEN 0 ELSE cycle_attempts END,last_error=error_code,token=NULL,lease_until=NULL,next_attempt_at=CASE WHEN outcome='succeeded' THEN now() ELSE now()+make_interval(secs=>least(60,5*power(2,j.cycle_attempts-1)::integer)) END,finished_at=CASE WHEN target<>'pending' THEN now() END WHERE id=identity;
 UPDATE app.foundation_attempts SET finished_at=now(),outcome=target,error_code=foundation_finish.error_code WHERE token=fence;
 UPDATE pgboss.job SET state=CASE target WHEN 'succeeded' THEN 'completed'::pgboss.job_state WHEN 'pending' THEN 'retry'::pgboss.job_state WHEN 'cancelled' THEN 'cancelled'::pgboss.job_state ELSE 'failed'::pgboss.job_state END,completed_on=CASE WHEN target<>'pending' THEN now() END WHERE name='fitloom-foundation' AND id=identity;
 RETURN true;
END $$;
