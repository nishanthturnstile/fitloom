-- Preserve legacy objects; new writes use digest-addressed keys and a durable input binding.
ALTER TABLE app.private_files ADD COLUMN storage_version integer NOT NULL DEFAULT 1 CHECK(storage_version IN (1,2));
ALTER TABLE app.private_files ALTER COLUMN storage_version SET DEFAULT 2;
ALTER TABLE app.file_events DROP CONSTRAINT file_events_action_check;
ALTER TABLE app.file_events ADD CHECK(action IN ('prepare','finalize','delete'));
CREATE OR REPLACE FUNCTION app.file_upload_target(identity uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE f app.private_files;
BEGIN
 IF NOT app.has_permission('files.manage') THEN RAISE EXCEPTION 'File access denied' USING ERRCODE='42501';END IF;
 SELECT * INTO f FROM app.private_files WHERE id=identity AND tenant_id=nullif(current_setting('app.tenant_id',true),'')::uuid AND location_id=nullif(current_setting('app.location_id',true),'')::uuid AND owner_id=nullif(current_setting('app.principal_id',true),'')::uuid FOR UPDATE;
 IF f.id IS NULL OR f.state NOT IN ('staged','finalized') OR f.created_at<now()-interval '1 hour' THEN RAISE EXCEPTION 'Upload state conflict' USING ERRCODE='P0003';END IF;
 RETURN jsonb_build_object('id',f.id,'state',f.state,'sha256',f.sha256,'size',f.byte_size,'mediaType',f.media_type,'storageVersion',f.storage_version,'version',f.version);
END $$;
CREATE FUNCTION app.file_prepare(identity uuid,byte_count integer,mime text,digest text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE target jsonb;
BEGIN
 target:=app.file_upload_target(identity);
 IF byte_count IS NULL OR byte_count NOT BETWEEN 1 AND 5242880 OR mime IS NULL OR mime NOT IN ('image/png','image/jpeg') OR digest IS NULL OR digest !~ '^[0-9a-f]{64}$' THEN RAISE EXCEPTION 'Invalid file metadata' USING ERRCODE='22023';END IF;
 IF target->>'sha256' IS NOT NULL THEN
 IF target->>'sha256'<>digest OR (target->>'size')::int<>byte_count OR target->>'mediaType'<>mime THEN RAISE EXCEPTION 'Upload content conflict' USING ERRCODE='P0003';END IF;
 RETURN;END IF;
 UPDATE app.private_files SET storage_version=2,byte_size=byte_count,media_type=mime,sha256=digest,updated_at=now() WHERE id=identity;
 INSERT INTO app.file_events(file_id,actor_id,action) VALUES(identity,nullif(current_setting('app.principal_id',true),'')::uuid,'prepare');
END $$;
CREATE OR REPLACE FUNCTION app.file_finalize(identity uuid,byte_count integer,mime text,digest text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE target jsonb;
BEGIN
 target:=app.file_upload_target(identity);
 IF digest IS NULL OR target->>'sha256' IS DISTINCT FROM digest OR (target->>'size')::int IS DISTINCT FROM byte_count OR target->>'mediaType' IS DISTINCT FROM mime THEN RAISE EXCEPTION 'Prepared input required' USING ERRCODE='P0003';END IF;
 IF target->>'state'='finalized' THEN RETURN jsonb_build_object('id',identity,'version',(target->>'version')::int);END IF;
 UPDATE app.private_files SET state='finalized',version=version+1,updated_at=now() WHERE id=identity;
 INSERT INTO app.file_events(file_id,actor_id,action) VALUES(identity,nullif(current_setting('app.principal_id',true),'')::uuid,'finalize');
 RETURN jsonb_build_object('id',identity,'version',(target->>'version')::int+1);
END $$;
CREATE OR REPLACE FUNCTION app.file_read(identity uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE f app.private_files;
BEGIN
 IF NOT app.has_permission('files.read') THEN RAISE EXCEPTION 'File access denied' USING ERRCODE='42501';END IF;
 SELECT p.* INTO f FROM app.private_files p JOIN app.file_attachments a ON (a.tenant_id,a.location_id,a.file_id)=(p.tenant_id,p.location_id,p.id) WHERE p.id=identity AND p.tenant_id=nullif(current_setting('app.tenant_id',true),'')::uuid AND p.location_id=nullif(current_setting('app.location_id',true),'')::uuid AND p.state='attached' AND a.retired_at IS NULL;
 IF f.id IS NULL THEN RAISE EXCEPTION 'File access denied' USING ERRCODE='42501';END IF;
 RETURN jsonb_build_object('id',f.id,'size',f.byte_size,'mediaType',f.media_type,'sha256',f.sha256,'version',f.version,'storageVersion',f.storage_version);
END $$;
CREATE FUNCTION app.file_cleanup_objects(identity uuid,fence uuid) RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',f.id,'storageVersion',f.storage_version,'sha256',f.sha256)),'[]') FROM app.file_cleanup_candidates(identity,fence) c JOIN app.private_files f ON f.id=c
$$;
-- Stable tie-breaking for the public projection.
CREATE OR REPLACE FUNCTION app.file_list() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT app.has_permission('files.read') THEN RAISE EXCEPTION 'File access denied' USING ERRCODE='42501';END IF;
 RETURN (SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'size',byte_size,'mediaType',media_type,'version',version,'createdAt',created_at) ORDER BY created_at DESC,id),'[]') FROM (SELECT * FROM app.private_files WHERE tenant_id=nullif(current_setting('app.tenant_id',true),'')::uuid AND location_id=nullif(current_setting('app.location_id',true),'')::uuid AND state='attached' ORDER BY created_at DESC,id LIMIT 50) f);
END $$;
REVOKE ALL ON FUNCTION app.file_prepare(uuid,integer,text,text),app.file_cleanup_objects(uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.file_prepare(uuid,integer,text,text) TO fitloom_web;
GRANT EXECUTE ON FUNCTION app.file_cleanup_objects(uuid,uuid) TO fitloom_worker;
