CREATE TABLE "app"."customer_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"wearer_id" uuid,
	"role" text NOT NULL,
	"file_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"note" text NOT NULL,
	"actor_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"retired_at" timestamp with time zone,
	CONSTRAINT "customer_photo_shape" CHECK (("app"."customer_photos"."role"='avatar' AND "app"."customer_photos"."wearer_id" IS NULL) OR ("app"."customer_photos"."role" IN ('face','body') AND "app"."customer_photos"."wearer_id" IS NOT NULL)),
	CONSTRAINT "customer_photo_version" CHECK ("app"."customer_photos"."version">0),
	CONSTRAINT "customer_photo_note" CHECK (char_length("app"."customer_photos"."note") BETWEEN 1 AND 1000)
);
--> statement-breakpoint
ALTER TABLE "app"."customer_photos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app"."customer_activity" DROP CONSTRAINT "customer_activity_kind";--> statement-breakpoint
ALTER TABLE "app"."customer_photos" ADD CONSTRAINT "customer_photos_actor_id_principals_id_fk" FOREIGN KEY ("actor_id") REFERENCES "app"."principals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."customer_photos" ADD CONSTRAINT "customer_photos_tenant_id_location_id_customer_id_customers_tenant_id_location_id_id_fk" FOREIGN KEY ("tenant_id","location_id","customer_id") REFERENCES "app"."customers"("tenant_id","location_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."customer_photos" ADD CONSTRAINT "customer_photos_tenant_id_location_id_customer_id_wearer_id_customer_wearers_tenant_id_location_id_customer_id_id_fk" FOREIGN KEY ("tenant_id","location_id","customer_id","wearer_id") REFERENCES "app"."customer_wearers"("tenant_id","location_id","customer_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "customer_photo_file" ON "app"."customer_photos" USING btree ("file_id");--> statement-breakpoint
CREATE UNIQUE INDEX "customer_photo_avatar_current" ON "app"."customer_photos" USING btree ("tenant_id","location_id","customer_id") WHERE "app"."customer_photos"."retired_at" IS NULL AND "app"."customer_photos"."wearer_id" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "customer_photo_wearer_current" ON "app"."customer_photos" USING btree ("tenant_id","location_id","customer_id","wearer_id","role") WHERE "app"."customer_photos"."retired_at" IS NULL AND "app"."customer_photos"."wearer_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "customer_photo_history" ON "app"."customer_photos" USING btree ("tenant_id","location_id","customer_id","wearer_id","role","version");--> statement-breakpoint
CREATE INDEX "customer_photo_actor" ON "app"."customer_photos" USING btree ("actor_id");--> statement-breakpoint
ALTER TABLE "app"."customer_activity" ADD CONSTRAINT "customer_activity_kind" CHECK ("app"."customer_activity"."kind" IN ('customer.create','customer.update','customer.archive','customer.restore','wearer.create','wearer.update','wearer.archive','wearer.restore','customer-photo.bind','customer-photo.remove'));--> statement-breakpoint
CREATE POLICY "migration_access" ON "app"."customer_photos" AS PERMISSIVE FOR ALL TO "fitloom_migrator" USING (true) WITH CHECK (true);
--> statement-breakpoint
-- private_files is the retained SQL-owned storage table, deliberately outside Drizzle's table model.
ALTER TABLE app.private_files ADD COLUMN purpose text NOT NULL DEFAULT 'workspace' CHECK(purpose IN ('workspace','customer-photo')),
 ADD COLUMN customer_id uuid, ADD COLUMN wearer_id uuid, ADD COLUMN photo_role text,
 ADD CONSTRAINT private_file_photo_shape CHECK((purpose='workspace' AND customer_id IS NULL AND wearer_id IS NULL AND photo_role IS NULL) OR (purpose='customer-photo' AND customer_id IS NOT NULL AND photo_role IS NOT NULL AND ((photo_role='avatar' AND wearer_id IS NULL) OR (photo_role IN ('face','body') AND wearer_id IS NOT NULL)))),
 ADD CONSTRAINT private_file_customer_fk FOREIGN KEY(tenant_id,location_id,customer_id) REFERENCES app.customers(tenant_id,location_id,id),
 ADD CONSTRAINT private_file_wearer_fk FOREIGN KEY(tenant_id,location_id,customer_id,wearer_id) REFERENCES app.customer_wearers(tenant_id,location_id,customer_id,id);
CREATE INDEX private_file_photo_owner ON app.private_files(tenant_id,location_id,customer_id,wearer_id,photo_role) WHERE purpose='customer-photo';
ALTER TABLE app.customer_photos FORCE ROW LEVEL SECURITY;
ALTER TABLE app.customer_photos ADD CONSTRAINT customer_photo_file_fk FOREIGN KEY(tenant_id,location_id,file_id) REFERENCES app.private_files(tenant_id,location_id,id);
REVOKE ALL ON app.customer_photos FROM PUBLIC,fitloom_web,fitloom_worker,fitloom_auth,fitloom_operator;
CREATE FUNCTION app.file_identity_immutable() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$ BEGIN
 IF (NEW.purpose,NEW.customer_id,NEW.wearer_id,NEW.photo_role,NEW.owner_id,NEW.tenant_id,NEW.location_id) IS DISTINCT FROM (OLD.purpose,OLD.customer_id,OLD.wearer_id,OLD.photo_role,OLD.owner_id,OLD.tenant_id,OLD.location_id) THEN RAISE EXCEPTION 'Immutable file owner' USING ERRCODE='22023'; END IF; RETURN NEW; END $$;
CREATE TRIGGER file_identity_immutable BEFORE UPDATE ON app.private_files FOR EACH ROW EXECUTE FUNCTION app.file_identity_immutable();
REVOKE ALL ON FUNCTION app.file_identity_immutable() FROM PUBLIC;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.file_begin() RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE op app.command_operations:=app.active_operation();identity uuid;
BEGIN
 IF op.command_kind IS DISTINCT FROM 'file.begin' OR NOT app.has_permission('files.manage') THEN RAISE EXCEPTION 'File access denied' USING ERRCODE='42501';END IF;
 INSERT INTO app.private_files(owner_id,tenant_id,location_id) VALUES(op.actor_id,op.tenant_id,op.location_id) RETURNING id INTO identity;
 RETURN identity;
END $$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.file_upload_target(identity uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE f app.private_files;
BEGIN
 IF NOT app.has_permission('files.manage') THEN RAISE EXCEPTION 'File access denied' USING ERRCODE='42501';END IF;
 SELECT * INTO f FROM app.private_files WHERE purpose='workspace' AND id=identity AND tenant_id=nullif(current_setting('app.tenant_id',true),'')::uuid AND location_id=nullif(current_setting('app.location_id',true),'')::uuid AND owner_id=nullif(current_setting('app.principal_id',true),'')::uuid FOR UPDATE;
 IF f.id IS NULL OR f.state NOT IN ('staged','finalized') OR f.created_at<now()-interval '1 hour' THEN RAISE EXCEPTION 'Upload state conflict' USING ERRCODE='P0003';END IF;
 RETURN jsonb_build_object('id',f.id,'state',f.state,'sha256',f.sha256,'size',f.byte_size,'mediaType',f.media_type,'storageVersion',f.storage_version,'version',f.version);
END $$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.file_prepare(identity uuid,byte_count integer,mime text,digest text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
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

--> statement-breakpoint
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

--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.file_change(identity uuid,expected_version integer,retire boolean) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE op app.command_operations:=app.active_operation();f app.private_files;
BEGIN
 IF op.command_kind IS DISTINCT FROM (CASE WHEN retire THEN 'file.retire' ELSE 'file.attach' END) OR NOT app.has_permission('files.manage') THEN RAISE EXCEPTION 'File access denied' USING ERRCODE='42501';END IF;
 SELECT * INTO f FROM app.private_files WHERE purpose='workspace' AND id=identity AND tenant_id=op.tenant_id AND location_id=op.location_id FOR UPDATE;
 IF f.id IS NULL OR f.version IS DISTINCT FROM expected_version OR (retire AND f.state NOT IN ('finalized','attached')) OR (NOT retire AND f.state<>'finalized') THEN RAISE EXCEPTION 'File state conflict' USING ERRCODE='P0003';END IF;
 IF retire THEN UPDATE app.file_attachments SET retired_at=now() WHERE file_id=identity AND retired_at IS NULL;
 ELSE INSERT INTO app.file_attachments(file_id,tenant_id,location_id,attached_by) VALUES(identity,f.tenant_id,f.location_id,op.actor_id);END IF;
 UPDATE app.private_files SET state=CASE WHEN retire THEN 'retired' ELSE 'attached' END,version=version+1,updated_at=now() WHERE id=identity;
 RETURN jsonb_build_object('id',identity,'version',f.version+1);
END $$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.file_read(identity uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE f app.private_files;
BEGIN
 IF NOT app.has_permission('files.read') THEN RAISE EXCEPTION 'File access denied' USING ERRCODE='42501';END IF;
 SELECT p.* INTO f FROM app.private_files p JOIN app.file_attachments a ON (a.tenant_id,a.location_id,a.file_id)=(p.tenant_id,p.location_id,p.id) WHERE p.purpose='workspace' AND p.id=identity AND p.tenant_id=nullif(current_setting('app.tenant_id',true),'')::uuid AND p.location_id=nullif(current_setting('app.location_id',true),'')::uuid AND p.state='attached' AND a.retired_at IS NULL;
 IF f.id IS NULL THEN RAISE EXCEPTION 'File access denied' USING ERRCODE='42501';END IF;
 RETURN jsonb_build_object('id',f.id,'size',f.byte_size,'mediaType',f.media_type,'sha256',f.sha256,'version',f.version,'storageVersion',f.storage_version);
END $$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.file_list_page(page_offset integer) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM app.page_offset_valid(page_offset);
 IF NOT app.has_permission('files.read') THEN RAISE EXCEPTION 'File access denied' USING ERRCODE='42501';END IF;
 RETURN (WITH files AS (SELECT id,byte_size AS size,media_type AS "mediaType",version,created_at AS "createdAt" FROM app.private_files WHERE purpose='workspace' AND tenant_id=nullif(current_setting('app.tenant_id',true),'')::uuid AND location_id=nullif(current_setting('app.location_id',true),'')::uuid AND state='attached') SELECT jsonb_build_object('items',(SELECT coalesce(jsonb_agg(to_jsonb(p) ORDER BY p."createdAt" DESC,p.id),'[]') FROM (SELECT * FROM files ORDER BY "createdAt" DESC,id LIMIT 50 OFFSET page_offset)p),'total',(SELECT count(*) FROM files),'nextOffset',CASE WHEN (SELECT count(*) FROM files)>page_offset+50 THEN page_offset+50 END));
END $$;

CREATE OR REPLACE FUNCTION app.file_list() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$ SELECT app.file_list_page(0)->'items' $$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.file_cleanup_candidates(identity uuid,fence uuid) RETURNS SETOF uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE j app.foundation_jobs;
BEGIN
 SELECT * INTO j FROM app.foundation_jobs WHERE id=identity FOR UPDATE;
 IF j.kind IS DISTINCT FROM 'files.cleanup' OR j.authority IS DISTINCT FROM 'service' OR j.status IS DISTINCT FROM 'running' OR j.token IS DISTINCT FROM fence OR j.lease_until<=now() THEN RAISE EXCEPTION 'Cleanup claim lost' USING ERRCODE='42501';END IF;
 RETURN QUERY SELECT f.id FROM app.private_files f WHERE f.state IN ('staged','finalized','retired') AND f.updated_at<now()-interval '24 hours' AND NOT EXISTS(SELECT FROM app.file_attachments a WHERE a.file_id=f.id AND a.retired_at IS NULL) AND NOT EXISTS(SELECT FROM app.customer_photos p WHERE p.file_id=f.id AND p.retired_at IS NULL) ORDER BY f.updated_at,f.id LIMIT 50 FOR UPDATE OF f SKIP LOCKED;
END $$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.file_cleanup_done(identity uuid,fence uuid,files uuid[]) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE allowed uuid[];
BEGIN
 SELECT coalesce(array_agg(id),'{}'::uuid[]) INTO allowed FROM app.file_cleanup_candidates(identity,fence) id;
 IF cardinality(files)>50 OR NOT files<@allowed THEN RAISE EXCEPTION 'Invalid cleanup records' USING ERRCODE='42501';END IF;
 WITH deleted AS (UPDATE app.private_files SET state='deleted',updated_at=now() WHERE id=ANY(files) RETURNING id) INSERT INTO app.file_events(file_id,action) SELECT id,'delete' FROM deleted;
END $$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.foundation_finish(identity uuid,fence uuid,outcome text,error_code text DEFAULT NULL) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE j app.foundation_jobs;target text;
BEGIN
 SELECT * INTO j FROM app.foundation_jobs WHERE id=identity FOR UPDATE;
 IF j.status<>'running' OR j.token IS DISTINCT FROM fence OR j.lease_until<=now() THEN RETURN false;END IF;
 IF outcome NOT IN ('succeeded','cancelled','failed') OR (error_code IS NOT NULL AND error_code NOT IN ('handler_failed','unsupported_kind','invalid_input','lease_expired','file_unsafe')) THEN RAISE EXCEPTION 'Invalid outcome' USING ERRCODE='22023'; END IF;
 target:=CASE WHEN outcome='failed' AND j.cycle_attempts<j.max_attempts AND error_code='handler_failed' THEN 'pending' ELSE outcome END;
 IF outcome='succeeded' AND j.kind='files.cleanup' AND (EXISTS(SELECT FROM app.staged_file_cleanup WHERE state='staged' AND staged_at<now()-interval '24 hours') OR EXISTS(SELECT FROM app.private_files f WHERE f.state IN ('staged','finalized','retired') AND f.updated_at<now()-interval '24 hours' AND NOT EXISTS(SELECT FROM app.file_attachments a WHERE a.file_id=f.id AND a.retired_at IS NULL) AND NOT EXISTS(SELECT FROM app.customer_photos p WHERE p.file_id=f.id AND p.retired_at IS NULL))) THEN target:='pending';END IF;
 UPDATE app.foundation_jobs SET status=target,cycle_attempts=CASE WHEN outcome='succeeded' THEN 0 ELSE cycle_attempts END,last_error=error_code,token=NULL,lease_until=NULL,next_attempt_at=CASE WHEN outcome='succeeded' THEN now() ELSE now()+make_interval(secs=>least(60,5*power(2,j.cycle_attempts-1)::integer)) END,finished_at=CASE WHEN target<>'pending' THEN now() END WHERE id=identity;
 UPDATE app.foundation_attempts SET finished_at=now(),outcome=target,error_code=foundation_finish.error_code WHERE token=fence;
 UPDATE pgboss.job SET state=CASE target WHEN 'succeeded' THEN 'completed'::pgboss.job_state WHEN 'pending' THEN 'retry'::pgboss.job_state WHEN 'cancelled' THEN 'cancelled'::pgboss.job_state ELSE 'failed'::pgboss.job_state END,completed_on=CASE WHEN target<>'pending' THEN now() END WHERE name='fitloom-foundation' AND id=identity;
 RETURN true;
END $$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.file_cleanup_objects(identity uuid,fence uuid) RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',f.id,'storageVersion',f.storage_version,'sha256',f.sha256)),'[]') FROM app.file_cleanup_candidates(identity,fence) c JOIN app.private_files f ON f.id=c
$$;

--> statement-breakpoint
CREATE FUNCTION app.customer_photo_owner(o jsonb,writing boolean DEFAULT false) RETURNS TABLE(customer_id uuid,wearer_id uuid,role text) LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c app.customers; w app.customer_wearers; v_wearer uuid; v_role text; s record;
BEGIN
 PERFORM app.customer_admit(writing);
 IF NOT coalesce(app.has_permission('customers.photos.read'),false) OR (writing AND NOT coalesce(app.has_permission('customers.photos.manage'),false)) THEN RAISE EXCEPTION 'Photo access denied' USING ERRCODE='42501';END IF;
 IF o->>'kind'='customer-avatar' THEN PERFORM app.master_keys(o,ARRAY['kind','customerId'],ARRAY['owner']);v_role:='avatar';
 ELSIF o->>'kind'='wearer-photo' THEN PERFORM app.master_keys(o,ARRAY['kind','customerId','wearerId','role'],ARRAY['owner']);v_wearer:=(o->>'wearerId')::uuid;v_role:=o->>'role';
 IF v_wearer IS NULL OR v_role NOT IN ('face','body') OR v_role IS NULL THEN RAISE EXCEPTION 'Invalid photo owner' USING ERRCODE='22023';END IF;
 ELSE RAISE EXCEPTION 'Invalid photo owner' USING ERRCODE='22023';END IF;
 c:=app.customer_get((o->>'customerId')::uuid,writing);SELECT * INTO s FROM app.customer_scope();
 IF writing AND c.archived_at IS NOT NULL THEN RAISE EXCEPTION 'Restore customer before changing photos' USING ERRCODE='FC003';END IF;
 IF v_wearer IS NOT NULL THEN
 IF writing THEN SELECT * INTO w FROM app.customer_wearers pw WHERE (pw.tenant_id,pw.location_id,pw.customer_id,pw.id)=(s.tenant,s.location,c.id,v_wearer) FOR UPDATE NOWAIT;
 ELSE SELECT * INTO w FROM app.customer_wearers pw WHERE (pw.tenant_id,pw.location_id,pw.customer_id,pw.id)=(s.tenant,s.location,c.id,v_wearer);END IF;
 IF w.id IS NULL THEN RAISE EXCEPTION 'Wearer unavailable' USING ERRCODE='FC002';END IF;
 IF writing AND w.archived_at IS NOT NULL THEN RAISE EXCEPTION 'Restore wearer before changing photos' USING ERRCODE='FC003';END IF;
 END IF;
 RETURN QUERY SELECT c.id,v_wearer,v_role;
END $$;
CREATE FUNCTION app.customer_photo_authorize(o jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN
 PERFORM app.customer_admit(true);IF NOT coalesce(app.has_permission('customers.photos.manage'),false) THEN RAISE EXCEPTION 'Photo access denied' USING ERRCODE='42501';END IF;
 PERFORM app.customer_photo_owner(o,false);
END $$;
CREATE FUNCTION app.customer_photo_file_owner(f app.private_files) RETURNS jsonb LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT CASE WHEN f.wearer_id IS NULL THEN jsonb_build_object('kind','customer-avatar','customerId',f.customer_id) ELSE jsonb_build_object('kind','wearer-photo','customerId',f.customer_id,'wearerId',f.wearer_id,'role',f.photo_role) END
$$;
CREATE FUNCTION app.customer_photo_begin(o jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE op app.command_operations:=app.active_operation();owner record; identity uuid;
BEGIN
 IF op.command_kind<>'customer-photo.begin' THEN RAISE EXCEPTION 'Invalid photo operation' USING ERRCODE='42501';END IF;
 SELECT * INTO owner FROM app.customer_photo_owner(o,true);
 INSERT INTO app.private_files(owner_id,tenant_id,location_id,purpose,customer_id,wearer_id,photo_role) VALUES(op.actor_id,op.tenant_id,op.location_id,'customer-photo',owner.customer_id,owner.wearer_id,owner.role) RETURNING id INTO identity;
 RETURN jsonb_build_object('kind','staged','fileId',identity,'version',0);
END $$;
CREATE FUNCTION app.customer_photo_upload_target(identity uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE f app.private_files;s record;
BEGIN
 SELECT * INTO s FROM app.customer_scope();
 SELECT * INTO f FROM app.private_files WHERE (tenant_id,location_id,id,owner_id)=(s.tenant,s.location,identity,s.actor) AND purpose='customer-photo';
 IF f.id IS NULL THEN RAISE EXCEPTION 'Photo unavailable' USING ERRCODE='FC002';END IF;
 PERFORM app.customer_photo_owner(app.customer_photo_file_owner(f),true);
 SELECT * INTO f FROM app.private_files WHERE id=identity FOR UPDATE NOWAIT;
 IF f.state NOT IN ('staged','finalized') OR f.created_at<now()-interval '1 hour' THEN RAISE EXCEPTION 'Upload state changed' USING ERRCODE='FC003';END IF;
 RETURN jsonb_build_object('id',f.id,'state',f.state,'sha256',f.sha256,'size',f.byte_size,'mediaType',f.media_type,'storageVersion',f.storage_version,'version',f.version);
END $$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.customer_photo_prepare(identity uuid,byte_count integer,mime text,digest text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE target jsonb;
BEGIN
 target:=app.customer_photo_upload_target(identity);
 IF byte_count IS NULL OR byte_count NOT BETWEEN 1 AND 5242880 OR mime IS NULL OR mime NOT IN ('image/png','image/jpeg') OR digest IS NULL OR digest !~ '^[0-9a-f]{64}$' THEN RAISE EXCEPTION 'Invalid file metadata' USING ERRCODE='22023';END IF;
 IF target->>'sha256' IS NOT NULL THEN
 IF target->>'sha256'<>digest OR (target->>'size')::int<>byte_count OR target->>'mediaType'<>mime THEN RAISE EXCEPTION 'Upload content conflict' USING ERRCODE='P0003';END IF;
 RETURN;END IF;
 UPDATE app.private_files SET storage_version=2,byte_size=byte_count,media_type=mime,sha256=digest,updated_at=now() WHERE id=identity;
 INSERT INTO app.file_events(file_id,actor_id,action) VALUES(identity,nullif(current_setting('app.principal_id',true),'')::uuid,'prepare');
END $$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.customer_photo_finalize(identity uuid,byte_count integer,mime text,digest text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE target jsonb;
BEGIN
 target:=app.customer_photo_upload_target(identity);
 IF digest IS NULL OR target->>'sha256' IS DISTINCT FROM digest OR (target->>'size')::int IS DISTINCT FROM byte_count OR target->>'mediaType' IS DISTINCT FROM mime THEN RAISE EXCEPTION 'Prepared input required' USING ERRCODE='P0003';END IF;
 IF target->>'state'='finalized' THEN RETURN jsonb_build_object('id',identity,'version',(target->>'version')::int);END IF;
 UPDATE app.private_files SET state='finalized',version=version+1,updated_at=now() WHERE id=identity;
 INSERT INTO app.file_events(file_id,actor_id,action) VALUES(identity,nullif(current_setting('app.principal_id',true),'')::uuid,'finalize');
 RETURN jsonb_build_object('id',identity,'version',(target->>'version')::int+1);
END $$;

--> statement-breakpoint
CREATE FUNCTION app.customer_photo_slot(o jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE owner record;s record;v integer;photo jsonb;
BEGIN
 SELECT * INTO owner FROM app.customer_photo_owner(o,false);SELECT * INTO s FROM app.customer_scope();
 SELECT coalesce(max(p.version),0) INTO v FROM app.customer_photos p WHERE (p.tenant_id,p.location_id,p.customer_id,p.role)=(s.tenant,s.location,owner.customer_id,owner.role) AND p.wearer_id IS NOT DISTINCT FROM owner.wearer_id;
 SELECT jsonb_build_object('fileId',p.file_id,'note',p.note,'createdAt',p.created_at) INTO photo FROM app.customer_photos p WHERE (p.tenant_id,p.location_id,p.customer_id,p.role)=(s.tenant,s.location,owner.customer_id,owner.role) AND p.wearer_id IS NOT DISTINCT FROM owner.wearer_id AND p.retired_at IS NULL;
 RETURN jsonb_build_object('version',v,'photo',photo);
END $$;
CREATE FUNCTION app.customer_photo_bind(o jsonb,identity uuid,expected integer,file_version integer,provenance text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE op app.command_operations:=app.active_operation(); owner record;slot jsonb;current_file uuid;f app.private_files;v integer;
BEGIN
 IF op.command_kind<>'customer-photo.bind' THEN RAISE EXCEPTION 'Invalid photo operation' USING ERRCODE='42501';END IF;
 SELECT * INTO owner FROM app.customer_photo_owner(o,true);slot:=app.customer_photo_slot(o);v:=(slot->>'version')::integer;current_file:=(slot->'photo'->>'fileId')::uuid;
 IF expected IS NULL OR expected<>v THEN RAISE EXCEPTION 'Photo changed' USING ERRCODE='FC003';END IF;
 IF current_file=identity THEN RETURN jsonb_build_object('kind','photo-saved','customerId',owner.customer_id,'version',v,'changed',false);END IF;
 PERFORM 1 FROM app.private_files WHERE id=ANY(ARRAY[identity,current_file]) ORDER BY id FOR UPDATE NOWAIT;
 SELECT * INTO f FROM app.private_files WHERE (tenant_id,location_id,id,owner_id)=(op.tenant_id,op.location_id,identity,op.actor_id) AND purpose='customer-photo' AND (customer_id,photo_role)=(owner.customer_id,owner.role) AND wearer_id IS NOT DISTINCT FROM owner.wearer_id;
 IF f.id IS NULL OR f.state<>'finalized' OR f.version IS DISTINCT FROM file_version THEN RAISE EXCEPTION 'Photo upload unavailable' USING ERRCODE='FC003';END IF;
 PERFORM app.master_require(app.customer_text_valid(provenance,1000,true),ARRAY['note']);
 UPDATE app.customer_photos SET retired_at=now() WHERE file_id=current_file AND retired_at IS NULL;
 UPDATE app.private_files SET state='retired',version=version+1,updated_at=now() WHERE id=current_file;
 INSERT INTO app.customer_photos(tenant_id,location_id,customer_id,wearer_id,role,file_id,version,note,actor_id) VALUES(op.tenant_id,op.location_id,owner.customer_id,owner.wearer_id,owner.role,identity,v+1,provenance,op.actor_id);
 UPDATE app.private_files SET state='attached',version=version+1,updated_at=now() WHERE id=identity;
 INSERT INTO app.customer_activity(tenant_id,location_id,customer_id,wearer_id,actor_id,kind,changed_fields,previous_version,next_version,operation_id) VALUES(op.tenant_id,op.location_id,owner.customer_id,owner.wearer_id,op.actor_id,'customer-photo.bind',ARRAY['photo.'||owner.role],v,v+1,op.id);
 RETURN jsonb_build_object('kind','photo-saved','customerId',owner.customer_id,'version',v+1,'changed',true);
END $$;
CREATE FUNCTION app.customer_photo_remove(o jsonb,expected integer) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE op app.command_operations:=app.active_operation();owner record;slot jsonb;identity uuid;v integer;
BEGIN
 IF op.command_kind<>'customer-photo.remove' THEN RAISE EXCEPTION 'Invalid photo operation' USING ERRCODE='42501';END IF;
 SELECT * INTO owner FROM app.customer_photo_owner(o,true);slot:=app.customer_photo_slot(o);v:=(slot->>'version')::integer;identity:=(slot->'photo'->>'fileId')::uuid;
 IF expected IS NULL OR expected<>v THEN RAISE EXCEPTION 'Photo changed' USING ERRCODE='FC003';END IF;
 IF identity IS NULL THEN RETURN jsonb_build_object('kind','photo-saved','customerId',owner.customer_id,'version',v,'changed',false);END IF;
 PERFORM 1 FROM app.private_files WHERE id=identity FOR UPDATE NOWAIT;
 UPDATE app.customer_photos SET retired_at=now(),version=v+1 WHERE file_id=identity AND retired_at IS NULL;
 UPDATE app.private_files SET state='retired',version=version+1,updated_at=now() WHERE id=identity;
 INSERT INTO app.customer_activity(tenant_id,location_id,customer_id,wearer_id,actor_id,kind,changed_fields,previous_version,next_version,operation_id) VALUES(op.tenant_id,op.location_id,owner.customer_id,owner.wearer_id,op.actor_id,'customer-photo.remove',ARRAY['photo.'||owner.role],v,v+1,op.id);
 RETURN jsonb_build_object('kind','photo-saved','customerId',owner.customer_id,'version',v+1,'changed',true);
END $$;
CREATE FUNCTION app.customer_photo_read(identity uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE f app.private_files;s record;
BEGIN
 SELECT * INTO s FROM app.customer_scope();
 SELECT p.* INTO f FROM app.private_files p JOIN app.customer_photos b ON b.file_id=p.id AND b.retired_at IS NULL WHERE (p.tenant_id,p.location_id,p.id)=(s.tenant,s.location,identity) AND p.purpose='customer-photo' AND p.state='attached';
 IF f.id IS NULL THEN RAISE EXCEPTION 'Photo unavailable' USING ERRCODE='FC002';END IF;
 PERFORM app.customer_photo_owner(app.customer_photo_file_owner(f),false);
 RETURN jsonb_build_object('id',f.id,'size',f.byte_size,'mediaType',f.media_type,'sha256',f.sha256,'version',f.version,'storageVersion',f.storage_version);
END $$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.claim_operation(owner_kind text, command_kind text, operation_key text, request_hash text, correlation_id uuid)
RETURNS TABLE(id uuid, result jsonb)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE owner uuid; actor uuid := nullif(current_setting('app.principal_id',true),'')::uuid; op app.command_operations;
BEGIN
  IF NOT app.principal_active() THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
  IF owner_kind = 'principal' THEN
    owner := actor;
    INSERT INTO app.command_owners(kind,id,principal_id) VALUES ('principal',owner,owner) ON CONFLICT DO NOTHING;
  ELSIF owner_kind = 'tenant' AND app.can_access_location(nullif(current_setting('app.tenant_id',true),'')::uuid,nullif(current_setting('app.location_id',true),'')::uuid) THEN
    owner := nullif(current_setting('app.tenant_id',true),'')::uuid;
    INSERT INTO app.command_owners(kind,id,tenant_id) VALUES ('tenant',owner,owner) ON CONFLICT DO NOTHING;
  ELSE RAISE EXCEPTION 'Owner access denied' USING ERRCODE='42501'; END IF;
  IF command_kind = ANY(ARRAY['customer.create','customer.update','customer.archive','customer.restore','wearer.create','wearer.update','wearer.archive','wearer.restore','customer-photo.begin','customer-photo.bind','customer-photo.remove']) THEN
    IF owner_kind<>'tenant' OR operation_key !~* '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN RAISE EXCEPTION 'Invalid customer operation' USING ERRCODE='22023'; END IF;
    IF NOT pg_try_advisory_xact_lock(hashtextextended('customer-operation:'||owner||':'||command_kind||':'||operation_key,0)) THEN RAISE EXCEPTION 'Customer operation busy' USING ERRCODE='FC001'; END IF;
  END IF;
  INSERT INTO app.command_operations(owner_kind,owner_id,tenant_id,location_id,actor_id,command_kind,operation_key,request_hash,correlation_id)
    VALUES (owner_kind,owner,CASE WHEN owner_kind='tenant' THEN owner END,CASE WHEN owner_kind='tenant' THEN nullif(current_setting('app.location_id',true),'')::uuid END,actor,command_kind,operation_key,request_hash,correlation_id)
    ON CONFLICT ON CONSTRAINT command_operation_identity DO NOTHING;
  SELECT o.* INTO op FROM app.command_operations o WHERE o.owner_kind=claim_operation.owner_kind AND o.owner_id=owner
    AND o.command_kind=claim_operation.command_kind AND o.operation_key=claim_operation.operation_key FOR UPDATE;
  IF command_kind = ANY(ARRAY['customer.create','customer.update','customer.archive','customer.restore','wearer.create','wearer.update','wearer.archive','wearer.restore','customer-photo.begin','customer-photo.bind','customer-photo.remove']) AND (op.actor_id IS DISTINCT FROM actor OR op.location_id IS DISTINCT FROM nullif(current_setting('app.location_id',true),'')::uuid) THEN RAISE EXCEPTION 'Customer operation conflict' USING ERRCODE='FC007'; END IF;
  IF op.request_hash <> request_hash THEN RAISE EXCEPTION 'Operation input conflict' USING ERRCODE='P0002'; END IF;
  IF op.result IS NULL AND op.transaction_id <> txid_current() THEN RAISE EXCEPTION 'Incomplete operation' USING ERRCODE='40001'; END IF;
  PERFORM set_config('app.operation_id',op.id::text,true);
  RETURN QUERY SELECT op.id, op.result;
END $$;

--> statement-breakpoint
DO $$ DECLARE f record; BEGIN
 FOR f IN SELECT p.oid::regprocedure signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='app' AND p.proname LIKE 'customer_photo_%' LOOP EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,fitloom_web,fitloom_worker,fitloom_auth,fitloom_operator',f.signature); END LOOP;
END $$;
GRANT EXECUTE ON FUNCTION app.customer_photo_authorize(jsonb),app.customer_photo_begin(jsonb),app.customer_photo_upload_target(uuid),app.customer_photo_prepare(uuid,integer,text,text),app.customer_photo_finalize(uuid,integer,text,text),app.customer_photo_slot(jsonb),app.customer_photo_bind(jsonb,uuid,integer,integer,text),app.customer_photo_remove(jsonb,integer),app.customer_photo_read(uuid) TO fitloom_web;
