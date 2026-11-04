CREATE TABLE "app"."measurement_body_schema_state" (
	"singleton" boolean PRIMARY KEY DEFAULT true NOT NULL,
	"current_version" text NOT NULL,
	"revision" integer NOT NULL,
	CONSTRAINT "measurement_body_singleton" CHECK ("app"."measurement_body_schema_state"."singleton" AND "app"."measurement_body_schema_state"."revision">0)
);
--> statement-breakpoint
ALTER TABLE "app"."measurement_body_schema_state" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."measurement_body_schemas" (
	"version" text PRIMARY KEY NOT NULL,
	"canonical_hash" text NOT NULL,
	"definition" jsonb NOT NULL,
	CONSTRAINT "measurement_body_hash" CHECK ("app"."measurement_body_schemas"."canonical_hash" ~ '^[a-f0-9]{64}$')
);
--> statement-breakpoint
ALTER TABLE "app"."measurement_body_schemas" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."measurement_custom_identities" (
	"tenant_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"wearer_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"node_id" uuid NOT NULL,
	"signature" jsonb NOT NULL,
	"introduced_sequence" integer NOT NULL,
	"retired_sequence" integer,
	CONSTRAINT "measurement_custom_identities_profile_id_node_id_pk" PRIMARY KEY("profile_id","node_id"),
	CONSTRAINT "measurement_custom_sequence" CHECK ("app"."measurement_custom_identities"."introduced_sequence">0 AND ("app"."measurement_custom_identities"."retired_sequence" IS NULL OR "app"."measurement_custom_identities"."retired_sequence">"app"."measurement_custom_identities"."introduced_sequence"))
);
--> statement-breakpoint
ALTER TABLE "app"."measurement_custom_identities" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."measurement_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"wearer_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"garment_id" uuid,
	"current_version_id" uuid,
	"revision" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_by" uuid NOT NULL,
	"archived_at" timestamp with time zone,
	"archived_by" uuid,
	"creation_operation_id" uuid NOT NULL,
	CONSTRAINT "measurement_profile_owner" UNIQUE("tenant_id","location_id","customer_id","wearer_id","id"),
	CONSTRAINT "measurement_profile_kind" CHECK (("app"."measurement_profiles"."kind"='body' AND "app"."measurement_profiles"."garment_id" IS NULL) OR ("app"."measurement_profiles"."kind"='garment' AND "app"."measurement_profiles"."garment_id" IS NOT NULL)),
	CONSTRAINT "measurement_profile_revision" CHECK ("app"."measurement_profiles"."revision">0),
	CONSTRAINT "measurement_profile_archive" CHECK (("app"."measurement_profiles"."archived_at" IS NULL)=("app"."measurement_profiles"."archived_by" IS NULL))
);
--> statement-breakpoint
ALTER TABLE "app"."measurement_profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."measurement_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"wearer_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"sequence" integer NOT NULL,
	"garment_id" uuid,
	"garment_version_id" uuid,
	"body_schema_version" text,
	"measured_on" date NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"recorded_by" uuid NOT NULL,
	"operation_id" uuid NOT NULL,
	"prior_version_id" uuid,
	"document" jsonb NOT NULL,
	CONSTRAINT "measurement_version_owner" UNIQUE("tenant_id","location_id","customer_id","wearer_id","profile_id","id"),
	CONSTRAINT "measurement_version_sequence" UNIQUE("profile_id","sequence"),
	CONSTRAINT "measurement_version_schema" CHECK (("app"."measurement_versions"."body_schema_version" IS NOT NULL AND "app"."measurement_versions"."garment_id" IS NULL AND "app"."measurement_versions"."garment_version_id" IS NULL) OR ("app"."measurement_versions"."body_schema_version" IS NULL AND "app"."measurement_versions"."garment_id" IS NOT NULL AND "app"."measurement_versions"."garment_version_id" IS NOT NULL)),
	CONSTRAINT "measurement_version_sequence_positive" CHECK ("app"."measurement_versions"."sequence">0),
	CONSTRAINT "measurement_version_date" CHECK ("app"."measurement_versions"."measured_on" BETWEEN '0001-01-01'::date AND '9999-12-31'::date AND isfinite("app"."measurement_versions"."measured_on")),
	CONSTRAINT "measurement_version_document" CHECK (jsonb_typeof("app"."measurement_versions"."document")='object' AND octet_length("app"."measurement_versions"."document"::text)<=131072)
);
--> statement-breakpoint
ALTER TABLE "app"."measurement_versions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app"."measurement_body_schema_state" ADD CONSTRAINT "measurement_body_schema_state_current_version_measurement_body_schemas_version_fk" FOREIGN KEY ("current_version") REFERENCES "app"."measurement_body_schemas"("version") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."measurement_custom_identities" ADD CONSTRAINT "measurement_custom_profile_fk" FOREIGN KEY ("tenant_id","location_id","customer_id","wearer_id","profile_id") REFERENCES "app"."measurement_profiles"("tenant_id","location_id","customer_id","wearer_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."measurement_profiles" ADD CONSTRAINT "measurement_profiles_created_by_principals_id_fk" FOREIGN KEY ("created_by") REFERENCES "app"."principals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."measurement_profiles" ADD CONSTRAINT "measurement_profiles_updated_by_principals_id_fk" FOREIGN KEY ("updated_by") REFERENCES "app"."principals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."measurement_profiles" ADD CONSTRAINT "measurement_profiles_archived_by_principals_id_fk" FOREIGN KEY ("archived_by") REFERENCES "app"."principals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."measurement_profiles" ADD CONSTRAINT "measurement_profile_wearer_fk" FOREIGN KEY ("tenant_id","location_id","customer_id","wearer_id") REFERENCES "app"."customer_wearers"("tenant_id","location_id","customer_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."measurement_profiles" ADD CONSTRAINT "measurement_profile_garment_fk" FOREIGN KEY ("tenant_id","garment_id") REFERENCES "app"."garments"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."measurement_profiles" ADD CONSTRAINT "measurement_profile_current_fk" FOREIGN KEY ("tenant_id","location_id","customer_id","wearer_id","id","current_version_id") REFERENCES "app"."measurement_versions"("tenant_id","location_id","customer_id","wearer_id","profile_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."measurement_versions" ADD CONSTRAINT "measurement_versions_body_schema_version_measurement_body_schemas_version_fk" FOREIGN KEY ("body_schema_version") REFERENCES "app"."measurement_body_schemas"("version") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."measurement_versions" ADD CONSTRAINT "measurement_versions_recorded_by_principals_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "app"."principals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."measurement_versions" ADD CONSTRAINT "measurement_version_profile_fk" FOREIGN KEY ("tenant_id","location_id","customer_id","wearer_id","profile_id") REFERENCES "app"."measurement_profiles"("tenant_id","location_id","customer_id","wearer_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."measurement_versions" ADD CONSTRAINT "measurement_version_garment_fk" FOREIGN KEY ("tenant_id","garment_id","garment_version_id") REFERENCES "app"."garment_versions"("tenant_id","garment_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."measurement_versions" ADD CONSTRAINT "measurement_version_prior_fk" FOREIGN KEY ("tenant_id","location_id","customer_id","wearer_id","profile_id","prior_version_id") REFERENCES "app"."measurement_versions"("tenant_id","location_id","customer_id","wearer_id","profile_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "measurement_custom_owner" ON "app"."measurement_custom_identities" USING btree ("tenant_id","location_id","customer_id","wearer_id","profile_id");--> statement-breakpoint
CREATE INDEX "measurement_book" ON "app"."measurement_profiles" USING btree ("tenant_id","location_id","customer_id","wearer_id","kind","garment_id","archived_at","id");--> statement-breakpoint
CREATE INDEX "measurement_garment" ON "app"."measurement_profiles" USING btree ("tenant_id","garment_id");--> statement-breakpoint
CREATE INDEX "measurement_profile_created_by" ON "app"."measurement_profiles" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "measurement_profile_updated_by" ON "app"."measurement_profiles" USING btree ("updated_by");--> statement-breakpoint
CREATE INDEX "measurement_profile_archived_by" ON "app"."measurement_profiles" USING btree ("archived_by");--> statement-breakpoint
CREATE INDEX "measurement_profile_operation" ON "app"."measurement_profiles" USING btree ("creation_operation_id");--> statement-breakpoint
CREATE INDEX "measurement_history" ON "app"."measurement_versions" USING btree ("profile_id","sequence" DESC NULLS LAST,"id");--> statement-breakpoint
CREATE INDEX "measurement_trend" ON "app"."measurement_versions" USING btree ("profile_id","measured_on","recorded_at","id");--> statement-breakpoint
CREATE INDEX "measurement_version_garment" ON "app"."measurement_versions" USING btree ("tenant_id","garment_id","garment_version_id");--> statement-breakpoint
CREATE INDEX "measurement_version_body" ON "app"."measurement_versions" USING btree ("body_schema_version");--> statement-breakpoint
CREATE INDEX "measurement_version_actor" ON "app"."measurement_versions" USING btree ("recorded_by");--> statement-breakpoint
CREATE INDEX "measurement_version_operation" ON "app"."measurement_versions" USING btree ("operation_id");--> statement-breakpoint
CREATE POLICY "migration_access" ON "app"."measurement_body_schema_state" AS PERMISSIVE FOR ALL TO "fitloom_migrator" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "migration_access" ON "app"."measurement_body_schemas" AS PERMISSIVE FOR ALL TO "fitloom_migrator" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "migration_access" ON "app"."measurement_custom_identities" AS PERMISSIVE FOR ALL TO "fitloom_migrator" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "migration_access" ON "app"."measurement_profiles" AS PERMISSIVE FOR ALL TO "fitloom_migrator" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "migration_access" ON "app"."measurement_versions" AS PERMISSIVE FOR ALL TO "fitloom_migrator" USING (true) WITH CHECK (true);
--> statement-breakpoint
ALTER TABLE app.measurement_profiles ALTER CONSTRAINT measurement_profile_current_fk DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE app.measurement_profiles ADD CONSTRAINT measurement_profile_operation_fk FOREIGN KEY(creation_operation_id) REFERENCES app.command_operations(id);
ALTER TABLE app.measurement_versions ADD CONSTRAINT measurement_version_operation_fk FOREIGN KEY(operation_id) REFERENCES app.command_operations(id);
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['measurement_body_schemas','measurement_body_schema_state','measurement_profiles','measurement_versions','measurement_custom_identities'] LOOP
  EXECUTE format('ALTER TABLE app.%I FORCE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON app.%I FROM PUBLIC,fitloom_web,fitloom_worker,fitloom_auth,fitloom_operator',t);
 END LOOP;
END $$;
--> statement-breakpoint
CREATE FUNCTION app.workspace_permissions() RETURNS text[] LANGUAGE sql IMMUTABLE SET search_path='' AS $$ SELECT ARRAY['workspace.read','workspace.manage','workspace.private.read','access.manage','locations.all','audit.read','journal.read','journal.post','files.read','files.manage','masters.read','masters.manage','masters.rates.read','customers.read','customers.manage','customers.archive','customers.photos.read','customers.photos.manage','measurements.read','measurements.manage','measurements.archive','measurements.photos.read','measurements.photos.manage','measurements.cards.manage','customers.import','measurements.import']::text[] $$;
REVOKE ALL ON FUNCTION app.workspace_permissions() FROM PUBLIC;
CREATE OR REPLACE FUNCTION app.create_custom_role(role_name text,permissions text[]) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE op app.command_operations:=app.active_operation(); role_identity uuid; p text;
BEGIN
 PERFORM 1 FROM app.tenants WHERE id=op.owner_id FOR UPDATE;
 IF op.owner_kind<>'tenant' OR op.command_kind<>'role.create' OR NOT app.has_permission('access.manage') THEN RAISE EXCEPTION 'Role administration denied' USING ERRCODE='42501'; END IF;
 IF role_name IS NULL OR permissions IS NULL OR length(trim(role_name)) NOT BETWEEN 1 AND 80 OR cardinality(permissions) NOT BETWEEN 1 AND cardinality(app.workspace_permissions()) OR NOT 'workspace.read'=ANY(permissions) THEN RAISE EXCEPTION 'Invalid role' USING ERRCODE='22023'; END IF;
 IF 'masters.manage'=ANY(permissions) AND NOT (ARRAY['masters.read','masters.rates.read'] <@ permissions) THEN RAISE EXCEPTION 'Master management requires schema and rate read permissions' USING ERRCODE='22023'; END IF;
 IF 'customers.manage'=ANY(permissions) AND NOT 'customers.read'=ANY(permissions) THEN RAISE EXCEPTION 'Customer management requires read access' USING ERRCODE='22023'; END IF;
 IF 'customers.archive'=ANY(permissions) AND NOT 'customers.read'=ANY(permissions) THEN RAISE EXCEPTION 'Customer archive requires read access' USING ERRCODE='22023'; END IF;
 IF 'customers.photos.read'=ANY(permissions) AND NOT 'customers.read'=ANY(permissions) THEN RAISE EXCEPTION 'Customer photos require read access' USING ERRCODE='22023'; END IF;
 IF 'customers.photos.manage'=ANY(permissions) AND NOT ARRAY['customers.manage','customers.photos.read'] <@ permissions THEN RAISE EXCEPTION 'Photo management requires customer management and photo read access' USING ERRCODE='22023'; END IF;
 IF 'measurements.read'=ANY(permissions) AND NOT ARRAY['customers.read'] <@ permissions THEN RAISE EXCEPTION 'Missing permission dependency' USING ERRCODE='22023'; END IF;
 IF 'measurements.manage'=ANY(permissions) AND NOT ARRAY['measurements.read'] <@ permissions THEN RAISE EXCEPTION 'Missing permission dependency' USING ERRCODE='22023'; END IF;
 IF 'measurements.archive'=ANY(permissions) AND NOT ARRAY['measurements.read'] <@ permissions THEN RAISE EXCEPTION 'Missing permission dependency' USING ERRCODE='22023'; END IF;
 IF 'measurements.photos.read'=ANY(permissions) AND NOT ARRAY['measurements.read'] <@ permissions THEN RAISE EXCEPTION 'Missing permission dependency' USING ERRCODE='22023'; END IF;
 IF 'measurements.photos.manage'=ANY(permissions) AND NOT ARRAY['measurements.manage','measurements.photos.read'] <@ permissions THEN RAISE EXCEPTION 'Missing permission dependency' USING ERRCODE='22023'; END IF;
 IF 'measurements.cards.manage'=ANY(permissions) AND NOT ARRAY['measurements.read'] <@ permissions THEN RAISE EXCEPTION 'Missing permission dependency' USING ERRCODE='22023'; END IF;
 IF 'customers.import'=ANY(permissions) AND NOT ARRAY['customers.read','customers.manage'] <@ permissions THEN RAISE EXCEPTION 'Missing permission dependency' USING ERRCODE='22023'; END IF;
 IF 'measurements.import'=ANY(permissions) AND NOT ARRAY['measurements.manage'] <@ permissions THEN RAISE EXCEPTION 'Missing permission dependency' USING ERRCODE='22023'; END IF;
 FOREACH p IN ARRAY permissions LOOP
 IF p IS NULL OR NOT p=ANY(app.workspace_permissions()) OR NOT app.has_permission(p) THEN RAISE EXCEPTION 'Permission exceeds delegation' USING ERRCODE='42501'; END IF;
 END LOOP;
 INSERT INTO app.roles(tenant_id,name) VALUES(op.owner_id,trim(role_name)) RETURNING id INTO role_identity;
 INSERT INTO app.permission_grants SELECT DISTINCT op.owner_id,role_identity,x.permission FROM unnest(permissions) AS x(permission);
 RETURN role_identity;
END $$;
CREATE OR REPLACE FUNCTION app.install_role_presets(tenant uuid,owner_role uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE manager uuid; staff uuid;
BEGIN
 UPDATE app.roles SET preset='owner' WHERE id=owner_role AND tenant_id=tenant;
 INSERT INTO app.roles(tenant_id,name,preset) VALUES(tenant,'Manager','manager') RETURNING id INTO manager;
 INSERT INTO app.roles(tenant_id,name,preset) VALUES(tenant,'Staff','staff') RETURNING id INTO staff;
 INSERT INTO app.permission_grants SELECT tenant,owner_role,permission FROM unnest(ARRAY['workspace.read','workspace.private.read','access.manage','locations.all','audit.read','files.read','files.manage','masters.read','masters.manage','masters.rates.read','customers.read','customers.manage','customers.archive','customers.photos.read','customers.photos.manage','measurements.read','measurements.manage','measurements.archive','measurements.photos.read','measurements.photos.manage','measurements.cards.manage','customers.import','measurements.import']) permission ON CONFLICT DO NOTHING;
 INSERT INTO app.permission_grants VALUES(tenant,manager,'workspace.read'),(tenant,manager,'workspace.manage'),(tenant,staff,'workspace.read');
 UPDATE app.memberships m SET is_owner=true WHERE m.tenant_id=tenant AND EXISTS(SELECT FROM app.location_grants g WHERE (g.tenant_id,g.membership_id)=(m.tenant_id,m.id) AND g.role_id=owner_role);
END $$;
INSERT INTO app.permission_grants(tenant_id,role_id,permission) SELECT tenant_id,id,p FROM app.roles CROSS JOIN unnest(ARRAY['workspace.read','measurements.read','measurements.manage','measurements.archive','measurements.photos.read','measurements.photos.manage','measurements.cards.manage','customers.import','measurements.import']) p WHERE preset='owner' ON CONFLICT DO NOTHING;
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
  IF command_kind = ANY(ARRAY['customer.create','customer.update','customer.archive','customer.restore','wearer.create','wearer.update','wearer.archive','wearer.restore','customer-photo.begin','customer-photo.bind','customer-photo.remove','measurement.create','measurement.revise','measurement.archive','measurement.restore','measurement-photo.begin','measurement-photo.revoke','measurement-card.create','measurement-card.revoke','customer-import.preview','customer-import.decide','customer-import.commit-row','customer-import.attempt-outcome','customer-import.cancel','measurement-import.preview','measurement-import.decide','measurement-import.commit-row','measurement-import.attempt-outcome','measurement-import.cancel']) THEN
    IF owner_kind<>'tenant' OR operation_key !~* '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN RAISE EXCEPTION 'Invalid customer operation' USING ERRCODE='22023'; END IF;
    IF NOT pg_try_advisory_xact_lock(hashtextextended('customer-operation:'||owner||':'||command_kind||':'||operation_key,0)) THEN RAISE EXCEPTION 'Customer operation busy' USING ERRCODE='FC001'; END IF;
  END IF;
  INSERT INTO app.command_operations(owner_kind,owner_id,tenant_id,location_id,actor_id,command_kind,operation_key,request_hash,correlation_id)
    VALUES (owner_kind,owner,CASE WHEN owner_kind='tenant' THEN owner END,CASE WHEN owner_kind='tenant' THEN nullif(current_setting('app.location_id',true),'')::uuid END,actor,command_kind,operation_key,request_hash,correlation_id)
    ON CONFLICT ON CONSTRAINT command_operation_identity DO NOTHING;
  SELECT o.* INTO op FROM app.command_operations o WHERE o.owner_kind=claim_operation.owner_kind AND o.owner_id=owner
    AND o.command_kind=claim_operation.command_kind AND o.operation_key=claim_operation.operation_key FOR UPDATE;
  IF command_kind = ANY(ARRAY['customer.create','customer.update','customer.archive','customer.restore','wearer.create','wearer.update','wearer.archive','wearer.restore','customer-photo.begin','customer-photo.bind','customer-photo.remove','measurement.create','measurement.revise','measurement.archive','measurement.restore','measurement-photo.begin','measurement-photo.revoke','measurement-card.create','measurement-card.revoke','customer-import.preview','customer-import.decide','customer-import.commit-row','customer-import.attempt-outcome','customer-import.cancel','measurement-import.preview','measurement-import.decide','measurement-import.commit-row','measurement-import.attempt-outcome','measurement-import.cancel']) AND (op.actor_id IS DISTINCT FROM actor OR op.location_id IS DISTINCT FROM nullif(current_setting('app.location_id',true),'')::uuid) THEN RAISE EXCEPTION 'Customer operation conflict' USING ERRCODE='FC007'; END IF;
  IF op.request_hash <> request_hash THEN RAISE EXCEPTION 'Operation input conflict' USING ERRCODE='P0002'; END IF;
  IF op.result IS NULL AND op.transaction_id <> txid_current() THEN RAISE EXCEPTION 'Incomplete operation' USING ERRCODE='40001'; END IF;
  PERFORM set_config('app.operation_id',op.id::text,true);
  RETURN QUERY SELECT op.id, op.result;
END $$;

--> statement-breakpoint
INSERT INTO app.measurement_body_schemas(version,canonical_hash,definition) VALUES('body-core-v1','d0e56403a7473f16d5f86c83910017a99329d8b8fe5029f407404a448cf05353',$manifest${"formatVersion":1,"label":"Body measurements","guidance":"Record body dimensions. Garment ease is entered separately.","sections":[{"id":"51c4b79e-9be7-4dd9-9c91-000000000000","label":"Body"}],"fields":[{"id":"51c4b79e-9be7-4dd9-9c91-000000000001","label":"Chest circumference","sectionId":"51c4b79e-9be7-4dd9-9c91-000000000000","required":false,"semanticId":"body.chest.circumference","help":"Record the chest measurement using the shop's measuring practice.","illustrationId":"dimension","kind":"length","basis":"body","displayUnit":"in","displayPrecision":2,"min":"0","max":null},{"id":"51c4b79e-9be7-4dd9-9c91-000000000002","label":"Bust circumference","sectionId":"51c4b79e-9be7-4dd9-9c91-000000000000","required":false,"semanticId":"body.bust.circumference","help":"Record the bust measurement separately from chest.","illustrationId":"dimension","kind":"length","basis":"body","displayUnit":"in","displayPrecision":2,"min":"0","max":null},{"id":"51c4b79e-9be7-4dd9-9c91-000000000003","label":"Waist circumference","sectionId":"51c4b79e-9be7-4dd9-9c91-000000000000","required":false,"semanticId":"body.waist.circumference","help":"Record the waist position used by the shop.","illustrationId":"dimension","kind":"length","basis":"body","displayUnit":"in","displayPrecision":2,"min":"0","max":null},{"id":"51c4b79e-9be7-4dd9-9c91-000000000004","label":"Hip circumference","sectionId":"51c4b79e-9be7-4dd9-9c91-000000000000","required":false,"semanticId":"body.hip.circumference","help":"Record the hip measurement using the shop's measuring practice.","illustrationId":"dimension","kind":"length","basis":"body","displayUnit":"in","displayPrecision":2,"min":"0","max":null},{"id":"51c4b79e-9be7-4dd9-9c91-000000000005","label":"Shoulder width","sectionId":"51c4b79e-9be7-4dd9-9c91-000000000000","required":false,"semanticId":"body.shoulder.width","help":"Confirm the shoulder endpoints before recording width.","illustrationId":"dimension","kind":"length","basis":"body","displayUnit":"in","displayPrecision":2,"min":"0","max":null}]}$manifest$::jsonb);
INSERT INTO app.measurement_body_schema_state(singleton,current_version,revision) VALUES(true,'body-core-v1',1);
