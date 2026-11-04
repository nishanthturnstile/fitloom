CREATE TABLE "app"."measurement_photo_memberships" (
	"tenant_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"wearer_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"version_id" uuid NOT NULL,
	"file_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"note" text,
	CONSTRAINT "measurement_photo_memberships_version_id_file_id_pk" PRIMARY KEY("version_id","file_id"),
	CONSTRAINT "measurement_photo_position" UNIQUE("version_id","position"),
	CONSTRAINT "measurement_photo_membership_bounds" CHECK ("app"."measurement_photo_memberships"."position" BETWEEN 1 AND 5 AND app.customer_text_valid("app"."measurement_photo_memberships"."note",1000,true))
);
--> statement-breakpoint
ALTER TABLE "app"."measurement_photo_memberships" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."measurement_photo_reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"wearer_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"version_id" uuid NOT NULL,
	"expected_revision" integer NOT NULL,
	"schema_ref" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone DEFAULT now() + interval '1 hour' NOT NULL,
	"creation_operation_id" uuid NOT NULL,
	"consumed_version_id" uuid,
	"consumption_operation_id" uuid,
	CONSTRAINT "measurement_photo_reservation_owner" UNIQUE("tenant_id","location_id","customer_id","wearer_id","actor_id","profile_id","id"),
	CONSTRAINT "measurement_photo_reserved_version" UNIQUE("tenant_id","location_id","customer_id","wearer_id","profile_id","version_id"),
	CONSTRAINT "measurement_photo_reservation_state" CHECK (("app"."measurement_photo_reservations"."consumed_version_id" IS NULL)=("app"."measurement_photo_reservations"."consumption_operation_id" IS NULL) AND ("app"."measurement_photo_reservations"."consumed_version_id" IS NULL OR "app"."measurement_photo_reservations"."consumed_version_id"="app"."measurement_photo_reservations"."version_id") AND "app"."measurement_photo_reservations"."expected_revision">=0 AND "app"."measurement_photo_reservations"."expires_at">"app"."measurement_photo_reservations"."created_at" AND "app"."measurement_photo_reservations"."expires_at"<="app"."measurement_photo_reservations"."created_at"+interval '1 hour' AND jsonb_typeof("app"."measurement_photo_reservations"."schema_ref")='object')
);
--> statement-breakpoint
ALTER TABLE "app"."measurement_photo_reservations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app"."measurement_photo_memberships" ADD CONSTRAINT "measurement_photo_membership_version_fk" FOREIGN KEY ("tenant_id","location_id","customer_id","wearer_id","profile_id","version_id") REFERENCES "app"."measurement_versions"("tenant_id","location_id","customer_id","wearer_id","profile_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."measurement_photo_reservations" ADD CONSTRAINT "measurement_photo_reservations_actor_id_principals_id_fk" FOREIGN KEY ("actor_id") REFERENCES "app"."principals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."measurement_photo_reservations" ADD CONSTRAINT "measurement_photo_reservation_wearer_fk" FOREIGN KEY ("tenant_id","location_id","customer_id","wearer_id") REFERENCES "app"."customer_wearers"("tenant_id","location_id","customer_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."measurement_photo_reservations" ADD CONSTRAINT "measurement_photo_consumed_version_fk" FOREIGN KEY ("tenant_id","location_id","customer_id","wearer_id","profile_id","consumed_version_id") REFERENCES "app"."measurement_versions"("tenant_id","location_id","customer_id","wearer_id","profile_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "measurement_photo_membership_file" ON "app"."measurement_photo_memberships" USING btree ("file_id");--> statement-breakpoint
CREATE INDEX "measurement_photo_reservation_actor" ON "app"."measurement_photo_reservations" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "measurement_photo_reservation_creation" ON "app"."measurement_photo_reservations" USING btree ("creation_operation_id");--> statement-breakpoint
CREATE INDEX "measurement_photo_reservation_consumption" ON "app"."measurement_photo_reservations" USING btree ("consumption_operation_id");--> statement-breakpoint
CREATE INDEX "measurement_photo_reservation_expiry" ON "app"."measurement_photo_reservations" USING btree ("expires_at") WHERE "app"."measurement_photo_reservations"."consumed_version_id" IS NULL;--> statement-breakpoint
CREATE POLICY "migration_access" ON "app"."measurement_photo_memberships" AS PERMISSIVE FOR ALL TO "fitloom_migrator" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "migration_access" ON "app"."measurement_photo_reservations" AS PERMISSIVE FOR ALL TO "fitloom_migrator" USING (true) WITH CHECK (true);
--> statement-breakpoint
-- Private files remain SQL-owned. Measurement metadata references a real reservation before content exists.
ALTER TABLE app.private_files DROP CONSTRAINT private_files_purpose_check, DROP CONSTRAINT private_file_photo_shape;
ALTER TABLE app.private_files ADD COLUMN measurement_profile_id uuid, ADD COLUMN measurement_reservation_id uuid,
 ADD COLUMN revoked_at timestamptz, ADD COLUMN revoked_by uuid REFERENCES app.principals(id), ADD COLUMN revocation_reason text, ADD COLUMN revocation_operation_id uuid,
 ADD CONSTRAINT private_file_purpose CHECK(purpose IN ('workspace','customer-photo','measurement-photo')),
 ADD CONSTRAINT private_file_photo_shape CHECK(
 (purpose='workspace' AND customer_id IS NULL AND wearer_id IS NULL AND photo_role IS NULL AND measurement_profile_id IS NULL AND measurement_reservation_id IS NULL) OR
 (purpose='customer-photo' AND customer_id IS NOT NULL AND photo_role IS NOT NULL AND measurement_profile_id IS NULL AND measurement_reservation_id IS NULL AND ((photo_role='avatar' AND wearer_id IS NULL) OR (photo_role IN ('face','body') AND wearer_id IS NOT NULL))) OR
 (purpose='measurement-photo' AND customer_id IS NOT NULL AND wearer_id IS NOT NULL AND photo_role IS NULL AND measurement_profile_id IS NOT NULL AND measurement_reservation_id IS NOT NULL)),
 ADD CONSTRAINT private_file_measurement_reservation_fk FOREIGN KEY(tenant_id,location_id,customer_id,wearer_id,owner_id,measurement_profile_id,measurement_reservation_id) REFERENCES app.measurement_photo_reservations(tenant_id,location_id,customer_id,wearer_id,actor_id,profile_id,id),
 ADD CONSTRAINT private_file_measurement_owner UNIQUE(tenant_id,location_id,customer_id,wearer_id,measurement_profile_id,id),
 ADD CONSTRAINT private_file_revocation CHECK((revoked_at IS NULL AND revoked_by IS NULL AND revocation_reason IS NULL AND revocation_operation_id IS NULL) OR (purpose='measurement-photo' AND revoked_at IS NOT NULL AND revoked_by IS NOT NULL AND revocation_reason IS NOT NULL AND revocation_operation_id IS NOT NULL AND app.customer_text_valid(revocation_reason,1000,false)));
CREATE INDEX private_file_measurement_reservation ON app.private_files(measurement_reservation_id) WHERE purpose='measurement-photo';
CREATE INDEX private_file_revoker ON app.private_files(revoked_by) WHERE revoked_by IS NOT NULL;
ALTER TABLE app.measurement_photo_memberships ADD CONSTRAINT measurement_photo_file_owner_fk FOREIGN KEY(tenant_id,location_id,customer_id,wearer_id,profile_id,file_id) REFERENCES app.private_files(tenant_id,location_id,customer_id,wearer_id,measurement_profile_id,id);
ALTER TABLE app.measurement_photo_reservations ADD CONSTRAINT measurement_photo_reservation_operation_fk FOREIGN KEY(creation_operation_id) REFERENCES app.command_operations(id), ADD CONSTRAINT measurement_photo_consumption_operation_fk FOREIGN KEY(consumption_operation_id) REFERENCES app.command_operations(id);
ALTER TABLE app.private_files ADD CONSTRAINT measurement_photo_revocation_operation_fk FOREIGN KEY(revocation_operation_id) REFERENCES app.command_operations(id);
ALTER TABLE app.measurement_photo_memberships FORCE ROW LEVEL SECURITY;
ALTER TABLE app.measurement_photo_reservations FORCE ROW LEVEL SECURITY;
REVOKE ALL ON app.measurement_photo_memberships,app.measurement_photo_reservations FROM PUBLIC,fitloom_web,fitloom_worker,fitloom_auth,fitloom_operator;
CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON app.measurement_photo_memberships FOR EACH ROW EXECUTE FUNCTION app.master_immutable();
CREATE TRIGGER retained BEFORE DELETE ON app.measurement_photo_reservations FOR EACH ROW EXECUTE FUNCTION app.master_immutable();

CREATE FUNCTION app.measurement_photo_admit(manage boolean DEFAULT false) RETURNS void LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$ BEGIN
 PERFORM app.measurement_admit(manage);
 IF NOT coalesce(app.has_permission('measurements.photos.read'),false) OR (manage AND NOT coalesce(app.has_permission('measurements.photos.manage'),false)) THEN RAISE EXCEPTION 'Measurement photo access denied' USING ERRCODE='42501'; END IF;
END $$;
CREATE OR REPLACE FUNCTION app.file_identity_immutable() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$ BEGIN
 IF (NEW.id,NEW.purpose,NEW.customer_id,NEW.wearer_id,NEW.photo_role,NEW.owner_id,NEW.tenant_id,NEW.location_id,NEW.measurement_profile_id,NEW.measurement_reservation_id) IS DISTINCT FROM (OLD.id,OLD.purpose,OLD.customer_id,OLD.wearer_id,OLD.photo_role,OLD.owner_id,OLD.tenant_id,OLD.location_id,OLD.measurement_profile_id,OLD.measurement_reservation_id) THEN RAISE EXCEPTION 'Immutable file owner' USING ERRCODE='22023'; END IF;
 IF (NEW.revoked_at,NEW.revoked_by,NEW.revocation_reason,NEW.revocation_operation_id) IS DISTINCT FROM (OLD.revoked_at,OLD.revoked_by,OLD.revocation_reason,OLD.revocation_operation_id) AND (OLD.revoked_at IS NOT NULL OR NEW.revoked_at IS NULL OR NEW.purpose<>'measurement-photo' OR (app.active_operation()).command_kind<>'measurement-photo.revoke' OR NEW.revoked_by IS DISTINCT FROM (app.active_operation()).actor_id OR NEW.revocation_operation_id IS DISTINCT FROM (app.active_operation()).id) THEN RAISE EXCEPTION 'Invalid photo revocation' USING ERRCODE='42501'; END IF;
 RETURN NEW;
END $$;
CREATE FUNCTION app.measurement_photo_reservation_fixed() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE op app.command_operations:=app.active_operation(); BEGIN
 IF (NEW.id,NEW.tenant_id,NEW.location_id,NEW.customer_id,NEW.wearer_id,NEW.actor_id,NEW.profile_id,NEW.version_id,NEW.expected_revision,NEW.schema_ref,NEW.created_at,NEW.expires_at,NEW.creation_operation_id) IS DISTINCT FROM (OLD.id,OLD.tenant_id,OLD.location_id,OLD.customer_id,OLD.wearer_id,OLD.actor_id,OLD.profile_id,OLD.version_id,OLD.expected_revision,OLD.schema_ref,OLD.created_at,OLD.expires_at,OLD.creation_operation_id) OR OLD.consumed_version_id IS NOT NULL OR NEW.consumed_version_id IS DISTINCT FROM OLD.version_id OR NEW.consumption_operation_id IS DISTINCT FROM op.id OR op.command_kind NOT IN ('measurement.create','measurement.revise') OR (op.tenant_id,op.location_id,op.actor_id) IS DISTINCT FROM (OLD.tenant_id,OLD.location_id,OLD.actor_id) OR OLD.expires_at<=now() OR NOT EXISTS(SELECT FROM app.measurement_versions v WHERE (v.tenant_id,v.location_id,v.customer_id,v.wearer_id,v.profile_id,v.id,v.operation_id)=(NEW.tenant_id,NEW.location_id,NEW.customer_id,NEW.wearer_id,NEW.profile_id,NEW.consumed_version_id,op.id)) THEN RAISE EXCEPTION 'Invalid photo reservation consumption' USING ERRCODE='42501'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER immutable_owner BEFORE UPDATE ON app.measurement_photo_reservations FOR EACH ROW EXECUTE FUNCTION app.measurement_photo_reservation_fixed();

CREATE FUNCTION app.measurement_photo_begin(p jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE op app.command_operations:=app.active_operation(); r app.measurement_photo_reservations; h app.measurement_profiles; rid uuid:=app.master_uuid(p->'reservationId'); identity uuid; BEGIN
 PERFORM app.measurement_photo_admit(true);
 IF op.command_kind<>'measurement-photo.begin' THEN RAISE EXCEPTION 'Invalid photo operation' USING ERRCODE='42501'; END IF;
 PERFORM app.master_keys(p,ARRAY['customerId','wearerId','profileId','versionId','reservationId','expectedRevision','schemaRef'],ARRAY['payload']);
 PERFORM app.measurement_require(app.master_integer(p->'expectedRevision',0,2147483647),ARRAY['expectedRevision']);
 PERFORM app.measurement_owner(app.master_uuid(p->'customerId'),app.master_uuid(p->'wearerId'),true);
 PERFORM app.measurement_intake(p->'schemaRef',true);
 SELECT * INTO h FROM app.measurement_profiles WHERE id=app.master_uuid(p->'profileId') FOR UPDATE NOWAIT;
 IF (p->>'expectedRevision')::int=0 THEN
  IF h.id IS NOT NULL THEN RAISE EXCEPTION 'Photo profile identity conflict' USING ERRCODE='FM005'; END IF;
 ELSIF h.id IS NULL OR (h.tenant_id,h.location_id,h.customer_id,h.wearer_id,h.revision) IS DISTINCT FROM (op.tenant_id,op.location_id,app.master_uuid(p->'customerId'),app.master_uuid(p->'wearerId'),(p->>'expectedRevision')::int) OR h.archived_at IS NOT NULL OR h.kind IS DISTINCT FROM p->'schemaRef'->>'kind' OR h.garment_id IS DISTINCT FROM (CASE WHEN p->'schemaRef'->>'kind'='garment' THEN app.master_uuid(p->'schemaRef'->'garmentId') END) THEN RAISE EXCEPTION 'Photo profile changed' USING ERRCODE='FM002'; END IF;
 IF EXISTS(SELECT FROM app.measurement_versions WHERE id=app.master_uuid(p->'versionId')) THEN RAISE EXCEPTION 'Photo version identity conflict' USING ERRCODE='FM005'; END IF;
 INSERT INTO app.measurement_photo_reservations(id,tenant_id,location_id,customer_id,wearer_id,actor_id,profile_id,version_id,expected_revision,schema_ref,creation_operation_id) VALUES(rid,op.tenant_id,op.location_id,app.master_uuid(p->'customerId'),app.master_uuid(p->'wearerId'),op.actor_id,app.master_uuid(p->'profileId'),app.master_uuid(p->'versionId'),(p->>'expectedRevision')::int,p->'schemaRef',op.id) ON CONFLICT(id) DO NOTHING;
 SELECT * INTO r FROM app.measurement_photo_reservations WHERE id=rid FOR UPDATE NOWAIT;
 IF (r.tenant_id,r.location_id,r.customer_id,r.wearer_id,r.actor_id,r.profile_id,r.version_id,r.expected_revision,r.schema_ref) IS DISTINCT FROM (op.tenant_id,op.location_id,app.master_uuid(p->'customerId'),app.master_uuid(p->'wearerId'),op.actor_id,app.master_uuid(p->'profileId'),app.master_uuid(p->'versionId'),(p->>'expectedRevision')::int,p->'schemaRef') OR r.consumed_version_id IS NOT NULL OR r.expires_at<=now() THEN RAISE EXCEPTION 'Photo reservation changed or expired' USING ERRCODE='FM002'; END IF;
 PERFORM app.measurement_require((SELECT count(*)<5 FROM app.private_files WHERE measurement_reservation_id=rid),ARRAY['photos']);
 INSERT INTO app.private_files(owner_id,tenant_id,location_id,purpose,customer_id,wearer_id,measurement_profile_id,measurement_reservation_id) VALUES(op.actor_id,op.tenant_id,op.location_id,'measurement-photo',r.customer_id,r.wearer_id,r.profile_id,r.id) RETURNING id INTO identity;
 RETURN jsonb_build_object('kind','photo-staged','fileId',identity,'reservationId',rid,'version',0);
END $$;
CREATE FUNCTION app.measurement_photo_upload_target(identity uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE s record; f app.private_files; r app.measurement_photo_reservations; h app.measurement_profiles; BEGIN
 PERFORM app.measurement_photo_admit(true); SELECT * INTO s FROM app.customer_scope();
 SELECT * INTO f FROM app.private_files WHERE (tenant_id,location_id,id,owner_id)=(s.tenant,s.location,identity,s.actor) AND purpose='measurement-photo';
 IF f.id IS NULL THEN RAISE EXCEPTION 'Photo unavailable' USING ERRCODE='FM001'; END IF;
 PERFORM app.measurement_owner(f.customer_id,f.wearer_id,true);
 SELECT * INTO r FROM app.measurement_photo_reservations WHERE id=f.measurement_reservation_id;
 PERFORM app.measurement_intake(r.schema_ref,true);
 SELECT * INTO h FROM app.measurement_profiles WHERE id=r.profile_id FOR UPDATE NOWAIT;
 IF (r.expected_revision=0 AND h.id IS NOT NULL) OR (r.expected_revision>0 AND (h.id IS NULL OR h.revision<>r.expected_revision OR h.archived_at IS NOT NULL)) THEN RAISE EXCEPTION 'Photo profile changed' USING ERRCODE='FM002'; END IF;
 SELECT * INTO r FROM app.measurement_photo_reservations WHERE id=r.id FOR UPDATE NOWAIT;
 SELECT * INTO f FROM app.private_files WHERE id=identity FOR UPDATE NOWAIT;
 IF r.consumed_version_id IS NOT NULL OR r.expires_at<=now() OR f.state NOT IN ('staged','finalized') OR f.revoked_at IS NOT NULL OR f.created_at<=now()-interval '1 hour' THEN RAISE EXCEPTION 'Photo upload expired or changed' USING ERRCODE='FM002'; END IF;
 RETURN jsonb_build_object('id',f.id,'state',f.state,'sha256',f.sha256,'size',f.byte_size,'mediaType',f.media_type,'storageVersion',f.storage_version,'version',f.version);
END $$;
CREATE FUNCTION app.measurement_photo_prepare(identity uuid,byte_count integer,mime text,digest text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE target jsonb; BEGIN
 target:=app.measurement_photo_upload_target(identity);
 IF byte_count IS NULL OR byte_count NOT BETWEEN 1 AND 5242880 OR mime IS NULL OR mime NOT IN ('image/png','image/jpeg') OR digest IS NULL OR digest !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'Invalid image metadata' USING ERRCODE='22023'; END IF;
 IF target->>'sha256' IS NOT NULL THEN
  IF target->>'sha256'<>digest OR (target->>'size')::int<>byte_count OR target->>'mediaType'<>mime THEN RAISE EXCEPTION 'Photo content conflict' USING ERRCODE='P0003'; END IF; RETURN;
 END IF;
 UPDATE app.private_files SET storage_version=2,byte_size=byte_count,media_type=mime,sha256=digest,updated_at=now() WHERE id=identity;
 INSERT INTO app.file_events(file_id,actor_id,action) VALUES(identity,nullif(current_setting('app.principal_id',true),'')::uuid,'prepare');
END $$;
CREATE FUNCTION app.measurement_photo_finalize(identity uuid,byte_count integer,mime text,digest text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE target jsonb; BEGIN
 target:=app.measurement_photo_upload_target(identity);
 IF digest IS NULL OR target->>'sha256' IS DISTINCT FROM digest OR (target->>'size')::int IS DISTINCT FROM byte_count OR target->>'mediaType' IS DISTINCT FROM mime THEN RAISE EXCEPTION 'Prepared photo required' USING ERRCODE='P0003'; END IF;
 IF target->>'state'='finalized' THEN RETURN jsonb_build_object('id',identity,'version',(target->>'version')::int); END IF;
 UPDATE app.private_files SET state='finalized',version=version+1,updated_at=now() WHERE id=identity;
 INSERT INTO app.file_events(file_id,actor_id,action) VALUES(identity,nullif(current_setting('app.principal_id',true),'')::uuid,'finalize');
 RETURN jsonb_build_object('id',identity,'version',(target->>'version')::int+1);
END $$;
CREATE FUNCTION app.measurement_photo_members(target_version uuid,live_only boolean DEFAULT false) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT coalesce(jsonb_agg(jsonb_build_object('fileId',m.file_id,'note',m.note) ORDER BY m.position),'[]'::jsonb) FROM app.measurement_photo_memberships m JOIN app.private_files f ON f.id=m.file_id WHERE m.version_id=target_version AND (NOT live_only OR f.revoked_at IS NULL)
$$;
CREATE FUNCTION app.measurement_photo_plan(change jsonb,customer uuid,wearer uuid,profile uuid,target_version uuid,expected integer,ref jsonb,prior uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE op app.command_operations:=app.active_operation(); r app.measurement_photo_reservations; f app.private_files; item jsonb; result jsonb; rid uuid; BEGIN
 IF change IS NULL OR change->>'kind'='retain' THEN
  IF change IS NOT NULL THEN PERFORM app.master_keys(change,ARRAY['kind'],ARRAY['photos']); END IF;
  RETURN app.measurement_photo_members(prior,true);
 END IF;
 PERFORM app.measurement_photo_admit(true);
 PERFORM app.master_keys(change,ARRAY['kind','reservationId','items'],ARRAY['photos']);
 PERFORM app.measurement_require(change->>'kind'='replace' AND jsonb_typeof(change->'items')='array' AND jsonb_array_length(change->'items')<=5,ARRAY['photos']);
 result:=change->'items'; rid:=CASE WHEN change->'reservationId'<>'null'::jsonb THEN app.master_uuid(change->'reservationId') END;
 IF rid IS NOT NULL THEN
  SELECT * INTO r FROM app.measurement_photo_reservations WHERE id=rid FOR UPDATE NOWAIT;
  IF r.id IS NULL OR (r.tenant_id,r.location_id,r.customer_id,r.wearer_id,r.actor_id,r.profile_id,r.version_id,r.expected_revision,r.schema_ref) IS DISTINCT FROM (op.tenant_id,op.location_id,customer,wearer,op.actor_id,profile,target_version,expected,ref) OR r.expires_at<=now() OR r.consumed_version_id IS NOT NULL THEN RAISE EXCEPTION 'Photo reservation expired or changed' USING ERRCODE='FM002'; END IF;
 END IF;
 PERFORM app.measurement_require((SELECT count(*)=count(DISTINCT value->>'fileId') FROM jsonb_array_elements(result)),ARRAY['photos']);
 FOR item IN SELECT value FROM jsonb_array_elements(result) LOOP
  PERFORM app.master_keys(item,ARRAY['fileId','note'],ARRAY['photos']);
  PERFORM app.measurement_require((item->'note'='null'::jsonb OR jsonb_typeof(item->'note')='string') AND app.customer_text_valid(item->>'note',1000,true),ARRAY['photos']);
  PERFORM app.master_uuid(item->'fileId');
 END LOOP;
 PERFORM 1 FROM app.private_files WHERE id IN (SELECT (value->>'fileId')::uuid FROM jsonb_array_elements(result)) ORDER BY id FOR UPDATE NOWAIT;
 FOR item IN SELECT value FROM jsonb_array_elements(result) LOOP
  SELECT * INTO f FROM app.private_files WHERE (tenant_id,location_id,customer_id,wearer_id,measurement_profile_id,id)=(op.tenant_id,op.location_id,customer,wearer,profile,(item->>'fileId')::uuid) AND purpose='measurement-photo';
  IF f.id IS NULL OR f.revoked_at IS NOT NULL THEN RAISE EXCEPTION 'Photo unavailable' USING ERRCODE='FM001'; END IF;
  IF EXISTS(SELECT FROM app.measurement_photo_memberships WHERE version_id=prior AND file_id=f.id) THEN
   IF f.state<>'attached' THEN RAISE EXCEPTION 'Saved photo unavailable' USING ERRCODE='FM002'; END IF;
  ELSIF rid IS NULL OR f.measurement_reservation_id<>rid OR f.owner_id<>op.actor_id OR f.state<>'finalized' OR f.created_at<=now()-interval '1 hour' THEN RAISE EXCEPTION 'Fresh photo upload unavailable' USING ERRCODE='FM002'; END IF;
 END LOOP;
 RETURN result;
END $$;
CREATE FUNCTION app.measurement_photo_bind(customer uuid,wearer uuid,profile uuid,target_version uuid,items jsonb,reservation uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE op app.command_operations:=app.active_operation(); BEGIN
 INSERT INTO app.measurement_photo_memberships(tenant_id,location_id,customer_id,wearer_id,profile_id,version_id,file_id,position,note) SELECT op.tenant_id,op.location_id,customer,wearer,profile,target_version,(value->>'fileId')::uuid,ordinality::int,value->>'note' FROM jsonb_array_elements(items) WITH ORDINALITY;
 UPDATE app.private_files f SET state='attached',version=f.version+1,updated_at=now() WHERE id IN (SELECT (value->>'fileId')::uuid FROM jsonb_array_elements(items)) AND state='finalized';
 IF reservation IS NOT NULL THEN UPDATE app.measurement_photo_reservations SET consumed_version_id=target_version,consumption_operation_id=op.id WHERE id=reservation; END IF;
END $$;
CREATE FUNCTION app.measurement_photo_projection(target_version uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$ BEGIN
 IF NOT coalesce(app.has_permission('measurements.photos.read'),false) THEN RETURN jsonb_build_object('kind','restricted'); END IF;
 RETURN jsonb_build_object('kind','available','items',(SELECT coalesce(jsonb_agg(jsonb_build_object('fileId',m.file_id,'note',m.note,'revoked',f.revoked_at IS NOT NULL) ORDER BY m.position),'[]'::jsonb) FROM app.measurement_photo_memberships m JOIN app.private_files f ON f.id=m.file_id WHERE m.version_id=target_version));
END $$;
CREATE FUNCTION app.measurement_photo_read(customer uuid,wearer uuid,profile uuid,target_version uuid,identity uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE f app.private_files; s record; BEGIN
 PERFORM app.measurement_photo_admit(); PERFORM app.measurement_owner(customer,wearer); SELECT * INTO s FROM app.customer_scope();
 SELECT p.* INTO f FROM app.private_files p JOIN app.measurement_photo_memberships m ON m.file_id=p.id WHERE (m.tenant_id,m.location_id,m.customer_id,m.wearer_id,m.profile_id,m.version_id,m.file_id)=(s.tenant,s.location,customer,wearer,profile,target_version,identity) AND p.purpose='measurement-photo' AND p.state='attached' AND p.revoked_at IS NULL;
 IF f.id IS NULL THEN RAISE EXCEPTION 'Photo unavailable' USING ERRCODE='FM001'; END IF;
 RETURN jsonb_build_object('id',f.id,'size',f.byte_size,'mediaType',f.media_type,'sha256',f.sha256,'version',f.version,'storageVersion',f.storage_version);
END $$;
CREATE FUNCTION app.measurement_photo_revoke(p jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE op app.command_operations:=app.active_operation(); f app.private_files; BEGIN
 PERFORM app.measurement_photo_admit(true); PERFORM app.master_keys(p,ARRAY['customerId','wearerId','profileId','fileId','reason'],ARRAY['payload']);
 IF op.command_kind<>'measurement-photo.revoke' THEN RAISE EXCEPTION 'Invalid photo operation' USING ERRCODE='42501'; END IF;
 PERFORM app.measurement_owner(app.master_uuid(p->'customerId'),app.master_uuid(p->'wearerId'));
 PERFORM app.measurement_require(jsonb_typeof(p->'reason')='string' AND app.customer_text_valid(p->>'reason',1000,false),ARRAY['reason']);
 SELECT * INTO f FROM app.private_files WHERE (tenant_id,location_id,customer_id,wearer_id,measurement_profile_id,id)=(op.tenant_id,op.location_id,app.master_uuid(p->'customerId'),app.master_uuid(p->'wearerId'),app.master_uuid(p->'profileId'),app.master_uuid(p->'fileId')) AND purpose='measurement-photo' FOR UPDATE NOWAIT;
 IF f.id IS NULL OR NOT EXISTS(SELECT FROM app.measurement_photo_memberships WHERE file_id=f.id) THEN RAISE EXCEPTION 'Saved photo unavailable' USING ERRCODE='FM001'; END IF;
 IF f.revoked_at IS NOT NULL THEN RETURN jsonb_build_object('kind','photo-revoked','fileId',f.id,'changed',false); END IF;
 UPDATE app.private_files SET revoked_at=clock_timestamp(),revoked_by=op.actor_id,revocation_reason=p->>'reason',revocation_operation_id=op.id,state='retired',version=version+1,updated_at=clock_timestamp() WHERE id=f.id;
 RETURN jsonb_build_object('kind','photo-revoked','fileId',f.id,'changed',true);
END $$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.measurement_mutate(command_name text,payload jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE op app.command_operations:=app.active_operation(); h app.measurement_profiles; old app.measurement_versions; schema jsonb; doc jsonb; ref jsonb:=payload->'schemaRef'; custom jsonb:=payload->'customFields'; vals jsonb; identity uuid; customer uuid; wearer uuid; vid uuid; lifecycle boolean:=command_name IN ('measurement.archive','measurement.restore'); changed boolean:=true; seq integer:=1; rev integer:=1; today date; tz text; measured date; nodes jsonb; photos jsonb; photo_reservation uuid;
BEGIN
 PERFORM app.measurement_admit(NOT lifecycle,lifecycle);
 IF op.owner_kind<>'tenant' OR op.command_kind<>command_name OR command_name NOT IN ('measurement.create','measurement.revise','measurement.archive','measurement.restore') OR op.actor_id IS DISTINCT FROM nullif(current_setting('app.principal_id',true),'')::uuid OR op.tenant_id IS DISTINCT FROM nullif(current_setting('app.tenant_id',true),'')::uuid OR op.location_id IS DISTINCT FROM nullif(current_setting('app.location_id',true),'')::uuid THEN RAISE EXCEPTION 'Measurement command denied' USING ERRCODE='42501'; END IF;
 PERFORM app.master_keys(CASE WHEN lifecycle THEN payload ELSE payload-'photos' END,CASE WHEN lifecycle THEN ARRAY['customerId','wearerId','profileId','expectedRevision'] WHEN command_name='measurement.create' THEN ARRAY['customerId','wearerId','profileId','versionId','schemaRef','label','measuredOn','values','customFields','notes','sourceNote','origin'] ELSE ARRAY['customerId','wearerId','profileId','expectedRevision','versionId','schemaRef','label','measuredOn','values','customFields','notes','sourceNote','origin'] END,ARRAY['payload']);
 PERFORM app.measurement_require(octet_length(payload::text)<=131072,ARRAY['payload']);
 customer:=app.master_uuid(payload->'customerId'); wearer:=app.master_uuid(payload->'wearerId'); identity:=app.master_uuid(payload->'profileId');
 PERFORM app.measurement_owner(customer,wearer,true);
 IF NOT lifecycle THEN schema:=app.measurement_intake(ref,true); END IF;
 SELECT * INTO h FROM app.measurement_profiles WHERE (tenant_id,location_id,customer_id,wearer_id,id)=(op.tenant_id,op.location_id,customer,wearer,identity) FOR UPDATE NOWAIT;
 IF command_name='measurement.create' THEN
  IF EXISTS(SELECT FROM app.measurement_profiles WHERE id=identity) THEN RAISE EXCEPTION 'Measurement identity conflict' USING ERRCODE='FM005'; END IF;
 ELSE
  IF h.id IS NULL THEN RAISE EXCEPTION 'Measurement unavailable' USING ERRCODE='FM001'; END IF;
  PERFORM app.measurement_require(app.master_integer(payload->'expectedRevision',1,2147483647),ARRAY['expectedRevision']);
  IF h.revision<>(payload->>'expectedRevision')::integer THEN RAISE EXCEPTION 'Measurement revision changed' USING ERRCODE='FM002'; END IF;
  SELECT * INTO old FROM app.measurement_versions WHERE id=h.current_version_id;
  seq:=old.sequence; rev:=h.revision;
 END IF;
 IF lifecycle THEN
  changed:=(h.archived_at IS NOT NULL)<>(command_name='measurement.archive');
  IF changed THEN
   rev:=rev+1;
   UPDATE app.measurement_profiles SET archived_at=CASE WHEN command_name='measurement.archive' THEN clock_timestamp() END,archived_by=CASE WHEN command_name='measurement.archive' THEN op.actor_id END,revision=rev,updated_at=clock_timestamp(),updated_by=op.actor_id WHERE id=identity;
  END IF;
  RETURN jsonb_build_object('kind','measurement-saved','correlationId',op.correlation_id,'profileId',identity,'versionId',h.current_version_id,'revision',rev,'sequence',seq,'changed',changed);
 END IF;
 IF command_name='measurement.revise' AND (h.archived_at IS NOT NULL OR h.kind<>ref->>'kind' OR h.garment_id IS DISTINCT FROM CASE WHEN ref->>'kind'='garment' THEN app.master_uuid(ref->'garmentId') END) THEN RAISE EXCEPTION 'Measurement profile unavailable for revision' USING ERRCODE='FM002'; END IF;
 vid:=app.master_uuid(payload->'versionId');
 IF EXISTS(SELECT FROM app.measurement_versions WHERE id=vid) THEN RAISE EXCEPTION 'Measurement version identity conflict' USING ERRCODE='FM005'; END IF;
 PERFORM app.measurement_require(jsonb_typeof(payload->'measuredOn')='string' AND payload->>'measuredOn' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$',ARRAY['measuredOn']);
 measured:=(payload->>'measuredOn')::date;
 SELECT timezone INTO tz FROM app.shop_settings WHERE tenant_id=op.tenant_id;
 IF tz IS NULL OR NOT EXISTS(SELECT FROM pg_catalog.pg_timezone_names WHERE name=tz) THEN RAISE EXCEPTION 'Shop timezone unavailable' USING ERRCODE='FM006'; END IF;
 today:=(clock_timestamp() AT TIME ZONE tz)::date;
 PERFORM app.measurement_require(measured BETWEEN '0001-01-01'::date AND today,ARRAY['measuredOn']);
 PERFORM app.measurement_validate(schema,custom,payload->'values',coalesce(old.document->'values','[]'::jsonb),ref->>'kind'='body');
 SELECT jsonb_agg(value ORDER BY value->>'fieldId') INTO vals FROM jsonb_array_elements(payload->'values');
 photos:=app.measurement_photo_plan(payload->'photos',customer,wearer,identity,vid,CASE WHEN command_name='measurement.create' THEN 0 ELSE h.revision END,ref,old.id);
 photo_reservation:=CASE WHEN payload->'photos'->>'kind'='replace' AND payload->'photos'->'reservationId'<>'null'::jsonb THEN app.master_uuid(payload->'photos'->'reservationId') END;
 doc:=jsonb_build_object('schema',schema,'label',payload->'label','values',vals,'customFields',custom,'notes',payload->'notes','sourceNote',payload->'sourceNote','origin',app.measurement_verified_origin(op.tenant_id,op.location_id,customer,wearer,identity,ref,schema,custom,vals,payload->>'label',measured,payload->'notes',payload->'sourceNote',payload->'origin'));
 PERFORM app.measurement_require(octet_length(doc::text)<=131072,ARRAY['document']);
 IF command_name='measurement.revise' THEN
  IF old.document=doc AND old.measured_on=measured AND photos=app.measurement_photo_members(old.id) THEN RETURN jsonb_build_object('kind','measurement-saved','correlationId',op.correlation_id,'profileId',identity,'versionId',old.id,'revision',rev,'sequence',seq,'changed',false); END IF;
  seq:=seq+1; rev:=rev+1;
 ELSE
  INSERT INTO app.measurement_profiles(id,tenant_id,location_id,customer_id,wearer_id,kind,garment_id,revision,created_by,updated_by,creation_operation_id) VALUES(identity,op.tenant_id,op.location_id,customer,wearer,ref->>'kind',CASE WHEN ref->>'kind'='garment' THEN app.master_uuid(ref->'garmentId') END,1,op.actor_id,op.actor_id,op.id);
 END IF;
 nodes:=app.measurement_definition(schema,custom);
 IF EXISTS(SELECT FROM app.master_definition_nodes(nodes) n JOIN app.measurement_custom_identities r ON r.profile_id=identity AND r.node_id=n.node_id WHERE n.node_kind<>'section' AND (r.retired_sequence IS NOT NULL OR r.signature IS DISTINCT FROM n.signature)) THEN RAISE EXCEPTION 'Custom measurement identity changed' USING ERRCODE='FM004'; END IF;
 INSERT INTO app.measurement_custom_identities(tenant_id,location_id,customer_id,wearer_id,profile_id,node_id,signature,introduced_sequence) SELECT op.tenant_id,op.location_id,customer,wearer,identity,node_id,signature,seq FROM app.master_definition_nodes(nodes) WHERE node_kind<>'section' ON CONFLICT DO NOTHING;
 PERFORM set_config('app.measurement_retiring',identity::text,true);
 UPDATE app.measurement_custom_identities r SET retired_sequence=seq WHERE profile_id=identity AND retired_sequence IS NULL AND NOT EXISTS(SELECT FROM app.master_definition_nodes(nodes) n WHERE n.node_kind<>'section' AND n.node_id=r.node_id);
 PERFORM set_config('app.measurement_retiring','',true);
 INSERT INTO app.measurement_versions(id,tenant_id,location_id,customer_id,wearer_id,profile_id,sequence,garment_id,garment_version_id,body_schema_version,measured_on,recorded_by,operation_id,prior_version_id,document)
 VALUES(vid,op.tenant_id,op.location_id,customer,wearer,identity,seq,CASE WHEN ref->>'kind'='garment' THEN app.master_uuid(ref->'garmentId') END,CASE WHEN ref->>'kind'='garment' THEN app.master_uuid(ref->'versionId') END,CASE WHEN ref->>'kind'='body' THEN ref->>'bundleVersion' END,measured,op.actor_id,op.id,old.id,doc);
 PERFORM app.measurement_photo_bind(customer,wearer,identity,vid,photos,photo_reservation);
 UPDATE app.measurement_profiles SET current_version_id=vid,revision=rev,updated_at=clock_timestamp(),updated_by=op.actor_id WHERE id=identity;
 RETURN jsonb_build_object('kind','measurement-saved','correlationId',op.correlation_id,'profileId',identity,'versionId',vid,'revision',rev,'sequence',seq,'changed',true);
END $$;


--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.measurement_detail(customer uuid,wearer uuid,profile uuid,version uuid DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE h app.measurement_profiles; v app.measurement_versions; s record; effective boolean;
BEGIN
 effective:=app.measurement_owner(customer,wearer); SELECT * INTO s FROM app.customer_scope();
 SELECT * INTO h FROM app.measurement_profiles WHERE (tenant_id,location_id,customer_id,wearer_id,id)=(s.tenant,s.location,customer,wearer,profile);
 IF h.id IS NULL THEN RAISE EXCEPTION 'Measurement unavailable' USING ERRCODE='FM001'; END IF;
 SELECT * INTO v FROM app.measurement_versions WHERE (tenant_id,location_id,customer_id,wearer_id,profile_id,id)=(s.tenant,s.location,customer,wearer,profile,coalesce(version,h.current_version_id));
 IF v.id IS NULL THEN RAISE EXCEPTION 'Measurement unavailable' USING ERRCODE='FM001'; END IF;
 RETURN jsonb_build_object('profileId',h.id,'customerId',customer,'wearerId',wearer,'revision',h.revision,'archivedAt',h.archived_at,'currentVersionId',h.current_version_id,'versionId',v.id,'sequence',v.sequence,'schemaRef',CASE WHEN h.kind='body' THEN jsonb_build_object('kind','body','bundleVersion',v.body_schema_version) ELSE jsonb_build_object('kind','garment','garmentId',h.garment_id,'versionId',v.garment_version_id) END,'measuredOn',v.measured_on,'recordedAt',v.recorded_at,'recordedBy',v.recorded_by,'recordedByLabel',coalesce((SELECT nullif(left(btrim(u.name),120),'') FROM app.principals actor JOIN public."user" u ON u.id=actor.auth_user_id WHERE actor.id=v.recorded_by),'Staff member'),'priorVersionId',v.prior_version_id,'document',v.document,'photos',app.measurement_photo_projection(v.id),'effectiveActive',effective AND h.archived_at IS NULL);
END $$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.measurement_capture(customer uuid,wearer uuid,profile uuid,version uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE d jsonb; active boolean; schema_current boolean; s record;
BEGIN
 d:=app.measurement_detail(customer,wearer,profile,version);
 SELECT * INTO s FROM app.customer_scope();
 IF d->'schemaRef'->>'kind'='body' THEN
  active:=true; SELECT current_version=d->'schemaRef'->>'bundleVersion' INTO schema_current FROM app.measurement_body_schema_state WHERE singleton;
 ELSE
  SELECT g.active,g.current_version_id=(d->'schemaRef'->>'versionId')::uuid INTO active,schema_current FROM app.garments g WHERE g.tenant_id=s.tenant AND g.id=(d->'schemaRef'->>'garmentId')::uuid;
 END IF;
 RETURN jsonb_build_object('immutable',d-'photos'-'revision'-'archivedAt'-'currentVersionId'-'recordedByLabel'-'effectiveActive','eligibility',jsonb_build_object('effectiveActive',d->'effectiveActive','currentVersion',d->'versionId'=d->'currentVersionId','schemaActive',coalesce(active,false),'currentSchema',coalesce(schema_current,false)));
END $$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.measurement_compare_sources(customer uuid,wearer uuid,refs jsonb) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE r jsonb; result jsonb:='[]';
BEGIN
 PERFORM app.measurement_owner(customer,wearer);
 PERFORM app.measurement_require(jsonb_typeof(refs)='array' AND jsonb_array_length(refs) BETWEEN 2 AND 4 AND (SELECT count(*)=count(DISTINCT value->>'versionId') FROM jsonb_array_elements(refs)),ARRAY['versions']);
 FOR r IN SELECT value FROM jsonb_array_elements(refs) LOOP
  PERFORM app.master_keys(r,ARRAY['profileId','versionId'],ARRAY['versions']);
  result:=result||jsonb_build_array(app.measurement_detail(customer,wearer,app.master_uuid(r->'profileId'),app.master_uuid(r->'versionId'))-'photos');
 END LOOP; RETURN result;
END $$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.measurement_context(customer uuid,wearer uuid,entry boolean DEFAULT false) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE s record; effective boolean; customer_name text; wearer_name text; tz text; today date;
BEGIN
 PERFORM app.measurement_admit(entry); effective:=app.measurement_owner(customer,wearer); SELECT * INTO s FROM app.customer_scope();
 IF entry AND NOT effective THEN RAISE EXCEPTION 'Restore owner before adding measurements' USING ERRCODE='FM002'; END IF;
 SELECT name INTO customer_name FROM app.customers WHERE (tenant_id,location_id,id)=(s.tenant,s.location,customer);
 SELECT name INTO wearer_name FROM app.customer_wearers WHERE (tenant_id,location_id,customer_id,id)=(s.tenant,s.location,customer,wearer);
 SELECT timezone INTO tz FROM app.shop_settings WHERE tenant_id=s.tenant;
 IF tz IS NOT NULL AND EXISTS(SELECT FROM pg_catalog.pg_timezone_names WHERE name=tz) THEN today:=(statement_timestamp() AT TIME ZONE tz)::date; END IF;
 IF entry AND today IS NULL THEN RAISE EXCEPTION 'Shop timezone unavailable' USING ERRCODE='FM006'; END IF;
 RETURN jsonb_build_object('customerId',customer,'wearerId',wearer,'customerName',customer_name,'wearerName',wearer_name,'active',effective,'today',today,'bodySchemaRef',app.measurement_body_current(),'capabilities',jsonb_build_object('photoRead',app.has_permission('measurements.photos.read'),'photoManage',app.has_permission('measurements.photos.manage'),'manage',effective AND app.has_permission('measurements.manage'),'archive',effective AND app.has_permission('measurements.archive')));
END $$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.file_cleanup_candidates(identity uuid,fence uuid) RETURNS SETOF uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE j app.foundation_jobs;
BEGIN
 SELECT * INTO j FROM app.foundation_jobs WHERE id=identity FOR UPDATE;
 IF j.kind IS DISTINCT FROM 'files.cleanup' OR j.authority IS DISTINCT FROM 'service' OR j.status IS DISTINCT FROM 'running' OR j.token IS DISTINCT FROM fence OR j.lease_until<=now() THEN RAISE EXCEPTION 'Cleanup claim lost' USING ERRCODE='42501';END IF;
 RETURN QUERY SELECT f.id FROM app.private_files f WHERE f.state IN ('staged','finalized','retired') AND f.updated_at<now()-interval '24 hours' AND NOT EXISTS(SELECT FROM app.file_attachments a WHERE a.file_id=f.id AND a.retired_at IS NULL) AND NOT EXISTS(SELECT FROM app.customer_photos p WHERE p.file_id=f.id AND p.retired_at IS NULL) AND NOT EXISTS(SELECT FROM app.measurement_photo_memberships m WHERE m.file_id=f.id AND f.revoked_at IS NULL) ORDER BY f.updated_at,f.id LIMIT 50 FOR UPDATE OF f SKIP LOCKED;
END $$;

--> statement-breakpoint

--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.foundation_finish(identity uuid,fence uuid,outcome text,error_code text DEFAULT NULL) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE j app.foundation_jobs;target text;
BEGIN
 SELECT * INTO j FROM app.foundation_jobs WHERE id=identity FOR UPDATE;
 IF j.status<>'running' OR j.token IS DISTINCT FROM fence OR j.lease_until<=now() THEN RETURN false;END IF;
 IF outcome NOT IN ('succeeded','cancelled','failed') OR (error_code IS NOT NULL AND error_code NOT IN ('handler_failed','unsupported_kind','invalid_input','lease_expired','file_unsafe')) THEN RAISE EXCEPTION 'Invalid outcome' USING ERRCODE='22023'; END IF;
 target:=CASE WHEN outcome='failed' AND j.cycle_attempts<j.max_attempts AND error_code='handler_failed' THEN 'pending' ELSE outcome END;
 IF outcome='succeeded' AND j.kind='files.cleanup' AND (EXISTS(SELECT FROM app.staged_file_cleanup WHERE state='staged' AND staged_at<now()-interval '24 hours') OR EXISTS(SELECT FROM app.private_files f WHERE f.state IN ('staged','finalized','retired') AND f.updated_at<now()-interval '24 hours' AND NOT EXISTS(SELECT FROM app.file_attachments a WHERE a.file_id=f.id AND a.retired_at IS NULL) AND NOT EXISTS(SELECT FROM app.customer_photos p WHERE p.file_id=f.id AND p.retired_at IS NULL) AND NOT EXISTS(SELECT FROM app.measurement_photo_memberships m WHERE m.file_id=f.id AND f.revoked_at IS NULL))) THEN target:='pending';END IF;
 UPDATE app.foundation_jobs SET status=target,cycle_attempts=CASE WHEN outcome='succeeded' THEN 0 ELSE cycle_attempts END,last_error=error_code,token=NULL,lease_until=NULL,next_attempt_at=CASE WHEN outcome='succeeded' THEN now() ELSE now()+make_interval(secs=>least(60,5*power(2,j.cycle_attempts-1)::integer)) END,finished_at=CASE WHEN target<>'pending' THEN now() END WHERE id=identity;
 UPDATE app.foundation_attempts SET finished_at=now(),outcome=target,error_code=foundation_finish.error_code WHERE token=fence;
 UPDATE pgboss.job SET state=CASE target WHEN 'succeeded' THEN 'completed'::pgboss.job_state WHEN 'pending' THEN 'retry'::pgboss.job_state WHEN 'cancelled' THEN 'cancelled'::pgboss.job_state ELSE 'failed'::pgboss.job_state END,completed_on=CASE WHEN target<>'pending' THEN now() END WHERE name='fitloom-foundation' AND id=identity;
 RETURN true;
END $$;

--> statement-breakpoint

--> statement-breakpoint
DO $$ DECLARE f record; BEGIN
 FOR f IN SELECT p.oid::regprocedure signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='app' AND p.proname LIKE 'measurement_photo_%' LOOP EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,fitloom_web,fitloom_worker,fitloom_auth,fitloom_operator',f.signature); END LOOP;
END $$;
GRANT EXECUTE ON FUNCTION app.measurement_photo_admit(boolean),app.measurement_photo_begin(jsonb),app.measurement_photo_upload_target(uuid),app.measurement_photo_prepare(uuid,integer,text,text),app.measurement_photo_finalize(uuid,integer,text,text),app.measurement_photo_read(uuid,uuid,uuid,uuid,uuid),app.measurement_photo_revoke(jsonb) TO fitloom_web;
