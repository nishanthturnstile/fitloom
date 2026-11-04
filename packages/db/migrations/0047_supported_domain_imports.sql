CREATE TABLE "app"."domain_import_attempts" (
	"operation_key" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"batch_id" uuid NOT NULL,
	"record_id" uuid NOT NULL,
	"revision" integer NOT NULL,
	"request_hash" text NOT NULL,
	"intent_hash" text NOT NULL,
	"state" text DEFAULT 'pending' NOT NULL,
	"lease_token" uuid,
	"started_at" timestamp with time zone,
	"outcome_operation_id" uuid,
	CONSTRAINT "domain_import_attempt_revision" UNIQUE("record_id","revision"),
	CONSTRAINT "domain_import_attempt_shape" CHECK ("app"."domain_import_attempts"."revision">0 AND "app"."domain_import_attempts"."state" IN ('pending','in-progress','rolled-back','committed') AND "app"."domain_import_attempts"."request_hash" ~ '^v1:[0-9a-f]{64}$' AND "app"."domain_import_attempts"."intent_hash" ~ '^v1:[0-9a-f]{64}$' AND "app"."domain_import_attempts"."operation_key"::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$')
);
--> statement-breakpoint
ALTER TABLE "app"."domain_import_attempts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."domain_import_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"family" text NOT NULL,
	"namespace" text,
	"digest" text NOT NULL,
	"state" text DEFAULT 'preview' NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"row_count" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"purged_at" timestamp with time zone,
	"lease_token" uuid,
	"lease_until" timestamp with time zone,
	"creation_operation_id" uuid NOT NULL,
	CONSTRAINT "domain_import_batch_owner" UNIQUE("tenant_id","location_id","actor_id","id"),
	CONSTRAINT "domain_import_batch_shape" CHECK ("app"."domain_import_batches"."family" IN ('customers','measurements') AND "app"."domain_import_batches"."state" IN ('preview','running','complete','cancelled') AND "app"."domain_import_batches"."revision">0 AND "app"."domain_import_batches"."row_count" BETWEEN 1 AND 200 AND ("app"."domain_import_batches"."namespace" IS NULL OR app.customer_text_valid("app"."domain_import_batches"."namespace",100,false)) AND ("app"."domain_import_batches"."namespace" IS NULL)=("app"."domain_import_batches"."purged_at" IS NOT NULL) AND ("app"."domain_import_batches"."lease_token" IS NULL)=("app"."domain_import_batches"."lease_until" IS NULL))
);
--> statement-breakpoint
ALTER TABLE "app"."domain_import_batches" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."domain_import_budgets" (
	"tenant_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"window_started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"previews" integer DEFAULT 0 NOT NULL,
	"chunks" integer DEFAULT 0 NOT NULL,
	"leases" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "domain_import_budgets_tenant_id_location_id_actor_id_pk" PRIMARY KEY("tenant_id","location_id","actor_id"),
	CONSTRAINT "domain_import_budget_shape" CHECK ("app"."domain_import_budgets"."previews" BETWEEN 0 AND 5 AND "app"."domain_import_budgets"."chunks" BETWEEN 0 AND 10 AND jsonb_typeof("app"."domain_import_budgets"."leases")='object')
);
--> statement-breakpoint
ALTER TABLE "app"."domain_import_budgets" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."domain_import_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"batch_id" uuid NOT NULL,
	"ordinal" integer NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"state" text DEFAULT 'pending' NOT NULL,
	"source_id" text,
	"rows" jsonb NOT NULL,
	"redundant_rows" jsonb NOT NULL,
	"payload" jsonb,
	"issues" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"decision" jsonb,
	"candidates" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"candidate_count" integer DEFAULT 0 NOT NULL,
	"candidate_fingerprint" text,
	"bindings" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"prepared" jsonb,
	"canonical_hash" text,
	"intent_hash" text,
	"operation_key" uuid NOT NULL,
	"request_hash" text,
	"outcome_operation_id" uuid,
	"counts" jsonb DEFAULT '{"customers":0,"wearers":0,"profiles":0,"versions":0}'::jsonb NOT NULL,
	CONSTRAINT "domain_import_record_owner" UNIQUE("tenant_id","location_id","actor_id","batch_id","id"),
	CONSTRAINT "domain_import_record_order" UNIQUE("batch_id","ordinal"),
	CONSTRAINT "domain_import_record_shape" CHECK ("app"."domain_import_records"."ordinal" BETWEEN 1 AND 200 AND "app"."domain_import_records"."revision">0 AND "app"."domain_import_records"."state" IN ('pending','in-progress','created','reused','already-imported','skipped','needs-review','failed','cancelled') AND jsonb_array_length("app"."domain_import_records"."rows") BETWEEN 1 AND 200 AND jsonb_array_length("app"."domain_import_records"."redundant_rows")<=200 AND ("app"."domain_import_records"."payload" IS NULL OR octet_length("app"."domain_import_records"."payload"::text)<=655360) AND ("app"."domain_import_records"."prepared" IS NULL OR octet_length("app"."domain_import_records"."prepared"::text)<=1048576) AND "app"."domain_import_records"."candidate_count">=0)
);
--> statement-breakpoint
ALTER TABLE "app"."domain_import_records" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."domain_import_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"family" text NOT NULL,
	"namespace" text NOT NULL,
	"kind" text NOT NULL,
	"source_id" text NOT NULL,
	"parent_source_id" text,
	"source_customer_id" text,
	"source_wearer_id" text,
	"source_sequence" integer,
	"accepted_hash" text NOT NULL,
	"customer_id" uuid NOT NULL,
	"wearer_id" uuid,
	"profile_id" uuid,
	"version_id" uuid,
	"operation_id" uuid NOT NULL,
	CONSTRAINT "domain_import_source_identity" UNIQUE("tenant_id","location_id","family","namespace","kind","source_id"),
	CONSTRAINT "domain_import_source_shape" CHECK ("app"."domain_import_sources"."family" IN ('customers','measurements') AND "app"."domain_import_sources"."kind" IN ('customer','wearer','profile','version') AND app.customer_text_valid("app"."domain_import_sources"."namespace",100,false) AND app.customer_text_valid("app"."domain_import_sources"."source_id",100,false) AND "app"."domain_import_sources"."accepted_hash" ~ '^v1:[0-9a-f]{64}$' AND (("app"."domain_import_sources"."kind"='customer' AND "app"."domain_import_sources"."family"='customers' AND "app"."domain_import_sources"."wearer_id" IS NULL AND "app"."domain_import_sources"."profile_id" IS NULL AND "app"."domain_import_sources"."version_id" IS NULL) OR ("app"."domain_import_sources"."kind"='wearer' AND "app"."domain_import_sources"."family"='customers' AND "app"."domain_import_sources"."wearer_id" IS NOT NULL AND "app"."domain_import_sources"."profile_id" IS NULL AND "app"."domain_import_sources"."version_id" IS NULL AND "app"."domain_import_sources"."parent_source_id" IS NOT NULL) OR ("app"."domain_import_sources"."kind"='profile' AND "app"."domain_import_sources"."family"='measurements' AND "app"."domain_import_sources"."wearer_id" IS NOT NULL AND "app"."domain_import_sources"."profile_id" IS NOT NULL AND "app"."domain_import_sources"."version_id" IS NULL) OR ("app"."domain_import_sources"."kind"='version' AND "app"."domain_import_sources"."family"='measurements' AND "app"."domain_import_sources"."wearer_id" IS NOT NULL AND "app"."domain_import_sources"."profile_id" IS NOT NULL AND "app"."domain_import_sources"."version_id" IS NOT NULL AND "app"."domain_import_sources"."source_sequence">0 AND "app"."domain_import_sources"."parent_source_id" IS NOT NULL)))
);
--> statement-breakpoint
ALTER TABLE "app"."domain_import_sources" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app"."customer_activity" DROP CONSTRAINT "customer_activity_kind";--> statement-breakpoint
ALTER TABLE "app"."domain_import_attempts" ADD CONSTRAINT "domain_import_attempts_actor_id_principals_id_fk" FOREIGN KEY ("actor_id") REFERENCES "app"."principals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."domain_import_attempts" ADD CONSTRAINT "domain_import_attempt_record_fk" FOREIGN KEY ("tenant_id","location_id","actor_id","batch_id","record_id") REFERENCES "app"."domain_import_records"("tenant_id","location_id","actor_id","batch_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."domain_import_batches" ADD CONSTRAINT "domain_import_batches_actor_id_principals_id_fk" FOREIGN KEY ("actor_id") REFERENCES "app"."principals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."domain_import_batches" ADD CONSTRAINT "domain_import_batches_tenant_id_location_id_locations_tenant_id_id_fk" FOREIGN KEY ("tenant_id","location_id") REFERENCES "app"."locations"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."domain_import_budgets" ADD CONSTRAINT "domain_import_budgets_actor_id_principals_id_fk" FOREIGN KEY ("actor_id") REFERENCES "app"."principals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."domain_import_budgets" ADD CONSTRAINT "domain_import_budgets_tenant_id_location_id_locations_tenant_id_id_fk" FOREIGN KEY ("tenant_id","location_id") REFERENCES "app"."locations"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."domain_import_records" ADD CONSTRAINT "domain_import_records_actor_id_principals_id_fk" FOREIGN KEY ("actor_id") REFERENCES "app"."principals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."domain_import_records" ADD CONSTRAINT "domain_import_record_batch_fk" FOREIGN KEY ("tenant_id","location_id","actor_id","batch_id") REFERENCES "app"."domain_import_batches"("tenant_id","location_id","actor_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."domain_import_sources" ADD CONSTRAINT "domain_import_source_customer_fk" FOREIGN KEY ("tenant_id","location_id","customer_id") REFERENCES "app"."customers"("tenant_id","location_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."domain_import_sources" ADD CONSTRAINT "domain_import_source_wearer_fk" FOREIGN KEY ("tenant_id","location_id","customer_id","wearer_id") REFERENCES "app"."customer_wearers"("tenant_id","location_id","customer_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."domain_import_sources" ADD CONSTRAINT "domain_import_source_profile_fk" FOREIGN KEY ("tenant_id","location_id","customer_id","wearer_id","profile_id") REFERENCES "app"."measurement_profiles"("tenant_id","location_id","customer_id","wearer_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."domain_import_sources" ADD CONSTRAINT "domain_import_source_version_fk" FOREIGN KEY ("tenant_id","location_id","customer_id","wearer_id","profile_id","version_id") REFERENCES "app"."measurement_versions"("tenant_id","location_id","customer_id","wearer_id","profile_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "domain_import_attempt_record" ON "app"."domain_import_attempts" USING btree ("tenant_id","location_id","actor_id","batch_id","record_id");--> statement-breakpoint
CREATE INDEX "domain_import_attempt_actor" ON "app"."domain_import_attempts" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "domain_import_attempt_outcome" ON "app"."domain_import_attempts" USING btree ("outcome_operation_id");--> statement-breakpoint
CREATE INDEX "domain_import_batch_actor" ON "app"."domain_import_batches" USING btree ("actor_id","tenant_id","location_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "domain_import_batch_expiry" ON "app"."domain_import_batches" USING btree ("created_at","id");--> statement-breakpoint
CREATE INDEX "domain_import_batch_location" ON "app"."domain_import_batches" USING btree ("tenant_id","location_id");--> statement-breakpoint
CREATE UNIQUE INDEX "domain_import_batch_operation" ON "app"."domain_import_batches" USING btree ("creation_operation_id");--> statement-breakpoint
CREATE INDEX "domain_import_budget_actor" ON "app"."domain_import_budgets" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "domain_import_records_actor" ON "app"."domain_import_records" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "domain_import_records_outcome" ON "app"."domain_import_records" USING btree ("outcome_operation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "domain_import_record_attempt" ON "app"."domain_import_records" USING btree ("operation_key");--> statement-breakpoint
CREATE INDEX "domain_import_source_customer" ON "app"."domain_import_sources" USING btree ("tenant_id","location_id","customer_id");--> statement-breakpoint
CREATE INDEX "domain_import_source_wearer" ON "app"."domain_import_sources" USING btree ("tenant_id","location_id","customer_id","wearer_id");--> statement-breakpoint
CREATE INDEX "domain_import_source_profile" ON "app"."domain_import_sources" USING btree ("tenant_id","location_id","customer_id","wearer_id","profile_id");--> statement-breakpoint
CREATE INDEX "domain_import_source_version" ON "app"."domain_import_sources" USING btree ("version_id");--> statement-breakpoint
CREATE INDEX "domain_import_source_operation" ON "app"."domain_import_sources" USING btree ("operation_id");--> statement-breakpoint
ALTER TABLE "app"."customer_activity" ADD CONSTRAINT "customer_activity_kind" CHECK ("app"."customer_activity"."kind" IN ('customer.create','customer.update','customer.archive','customer.restore','wearer.create','wearer.update','wearer.archive','wearer.restore','customer-photo.bind','customer-photo.remove','customer.import','wearer.import'));--> statement-breakpoint
CREATE POLICY "migration_access" ON "app"."domain_import_attempts" AS PERMISSIVE FOR ALL TO "fitloom_migrator" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "migration_access" ON "app"."domain_import_batches" AS PERMISSIVE FOR ALL TO "fitloom_migrator" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "migration_access" ON "app"."domain_import_budgets" AS PERMISSIVE FOR ALL TO "fitloom_migrator" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "migration_access" ON "app"."domain_import_records" AS PERMISSIVE FOR ALL TO "fitloom_migrator" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "migration_access" ON "app"."domain_import_sources" AS PERMISSIVE FOR ALL TO "fitloom_migrator" USING (true) WITH CHECK (true);
--> statement-breakpoint
ALTER TABLE app.domain_import_batches FORCE ROW LEVEL SECURITY;
ALTER TABLE app.domain_import_records FORCE ROW LEVEL SECURITY;
ALTER TABLE app.domain_import_attempts FORCE ROW LEVEL SECURITY;
ALTER TABLE app.domain_import_sources FORCE ROW LEVEL SECURITY;
ALTER TABLE app.domain_import_budgets FORCE ROW LEVEL SECURITY;
REVOKE ALL ON app.domain_import_batches,app.domain_import_records,app.domain_import_attempts,app.domain_import_sources,app.domain_import_budgets FROM PUBLIC,fitloom_web,fitloom_worker,fitloom_auth,fitloom_operator;
ALTER TABLE app.domain_import_batches ADD CONSTRAINT domain_import_batch_operation_fk FOREIGN KEY(creation_operation_id) REFERENCES app.command_operations(id);
ALTER TABLE app.domain_import_records ADD CONSTRAINT domain_import_record_outcome_fk FOREIGN KEY(outcome_operation_id) REFERENCES app.command_operations(id);
ALTER TABLE app.domain_import_attempts ADD CONSTRAINT domain_import_attempt_outcome_fk FOREIGN KEY(outcome_operation_id) REFERENCES app.command_operations(id);
ALTER TABLE app.domain_import_sources ADD CONSTRAINT domain_import_source_operation_fk FOREIGN KEY(operation_id) REFERENCES app.command_operations(id);
CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON app.domain_import_sources FOR EACH ROW EXECUTE FUNCTION app.master_immutable();
CREATE FUNCTION app.domain_import_admit(family text) RETURNS void LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF family IS NULL OR family NOT IN ('customers','measurements') OR NOT coalesce(app.has_permission(CASE family WHEN 'customers' THEN 'customers.import' ELSE 'measurements.import' END),false) THEN RAISE EXCEPTION 'Import access denied' USING ERRCODE='42501'; END IF;
 IF family='customers' THEN PERFORM app.customer_admit(true); ELSE PERFORM app.measurement_admit(true); END IF;
END $$;
CREATE FUNCTION app.domain_import_lock(identity uuid,waiting boolean DEFAULT false) RETURNS void LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF waiting THEN PERFORM pg_advisory_xact_lock(hashtextextended('domain-import-batch:'||identity,0));
 ELSIF NOT pg_try_advisory_xact_lock(hashtextextended('domain-import-batch:'||identity,0)) THEN RAISE EXCEPTION 'Import transaction busy' USING ERRCODE='FI003'; END IF;
END $$;
CREATE FUNCTION app.domain_import_batch(family text,identity uuid) RETURNS app.domain_import_batches LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE s record;b app.domain_import_batches;
BEGIN
 PERFORM app.domain_import_admit(family);SELECT * INTO s FROM app.customer_scope();
 SELECT * INTO b FROM app.domain_import_batches WHERE (tenant_id,location_id,actor_id,id)=(s.tenant,s.location,s.actor,identity);
 IF b.id IS NULL OR b.family<>family THEN RAISE EXCEPTION 'Import unavailable' USING ERRCODE='FI001'; END IF;RETURN b;
END $$;
CREATE FUNCTION app.domain_import_budget(family text,preview boolean) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE s record;b app.domain_import_budgets;token uuid:=gen_random_uuid();live_leases jsonb;
BEGIN
 PERFORM app.domain_import_admit(family);SELECT * INTO s FROM app.customer_scope();
 INSERT INTO app.domain_import_budgets(tenant_id,location_id,actor_id) VALUES(s.tenant,s.location,s.actor) ON CONFLICT DO NOTHING;
 SELECT * INTO b FROM app.domain_import_budgets WHERE (tenant_id,location_id,actor_id)=(s.tenant,s.location,s.actor) FOR UPDATE;
 SELECT coalesce(jsonb_object_agg(key,value),'{}') INTO live_leases FROM jsonb_each(b.leases) WHERE (value#>>'{}')::timestamptz>clock_timestamp();
 IF b.window_started_at<=clock_timestamp()-interval '60 seconds' THEN b.previews:=0;b.chunks:=0;b.window_started_at:=clock_timestamp();END IF;
 IF (preview AND (b.previews>=5 OR (SELECT count(*) FROM jsonb_object_keys(live_leases))>=2)) OR (NOT preview AND b.chunks>=10) THEN RAISE EXCEPTION 'Import admission limit' USING ERRCODE='FI004';END IF;
 UPDATE app.domain_import_budgets SET window_started_at=b.window_started_at,previews=b.previews+CASE WHEN preview THEN 1 ELSE 0 END,chunks=b.chunks+CASE WHEN preview THEN 0 ELSE 1 END,leases=live_leases||CASE WHEN preview THEN jsonb_build_object(token,clock_timestamp()+interval '30 seconds') ELSE '{}'::jsonb END WHERE (tenant_id,location_id,actor_id)=(s.tenant,s.location,s.actor);
 RETURN token;
END $$;
CREATE FUNCTION app.domain_import_preview_end(family text,token uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE s record;BEGIN PERFORM app.domain_import_admit(family);SELECT * INTO s FROM app.customer_scope();UPDATE app.domain_import_budgets SET leases=leases-token::text WHERE (tenant_id,location_id,actor_id)=(s.tenant,s.location,s.actor);END $$;
CREATE FUNCTION app.domain_import_schema(ref jsonb,current_required boolean DEFAULT false) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE s record;d jsonb;BEGIN
 PERFORM app.domain_import_admit('measurements');SELECT * INTO s FROM app.customer_scope();
 IF current_required THEN RETURN app.measurement_intake(ref); END IF;
 IF ref->>'kind'='body' THEN SELECT definition INTO d FROM app.measurement_body_schemas WHERE version=ref->>'bundleVersion';
 ELSIF ref->>'kind'='garment' THEN SELECT jsonb_build_object('formatVersion',definition->'formatVersion','label',definition->'label','guidance',definition->'help','sections',definition->'sections','fields',definition->'fields') INTO d FROM app.garment_versions WHERE (tenant_id,garment_id,id)=(s.tenant,app.master_uuid(ref->'garmentId'),app.master_uuid(ref->'versionId')); END IF;
 IF d IS NULL THEN RAISE EXCEPTION 'Import schema unavailable' USING ERRCODE='FI001'; END IF;RETURN d;
END $$;
CREATE FUNCTION app.domain_import_schema_choices(q jsonb) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE s record;BEGIN
 PERFORM app.domain_import_admit('measurements');SELECT * INTO s FROM app.customer_scope();
 RETURN jsonb_build_object('body',app.measurement_body_current(),'garments',(
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',g.id,'versionId',g.current_version_id,'label',g.label) ORDER BY g.label,g.id),'[]') FROM (
   SELECT h.id,h.current_version_id,v.definition->>'label' AS label FROM app.garments h JOIN app.garment_versions v ON (v.tenant_id,v.garment_id,v.id)=(h.tenant_id,h.id,h.current_version_id)
   WHERE h.tenant_id=s.tenant AND h.active AND v.definition->>'label' ILIKE '%'||replace(replace(replace(coalesce(q->>'search',''),'\','\\'),'%','\%'),'_','\_')||'%'
   ORDER BY v.definition->>'label',h.id LIMIT 25 OFFSET least(100000,greatest(0,coalesce((q->>'offset')::int,0)))
  )g));
END $$;
CREATE FUNCTION app.domain_import_candidates(phone text) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE s record;result jsonb;BEGIN
 SELECT * INTO s FROM app.customer_scope();
 SELECT jsonb_build_object('fingerprint',md5(app.customer_candidates(phone,NULL)::text),'count',count(*),'items',(SELECT coalesce(jsonb_agg(jsonb_build_object('customerId',id,'name',name,'version',version,'archivedAt',archived_at) ORDER BY normalized_name,id),'[]') FROM(SELECT * FROM app.customers WHERE (tenant_id,location_id)=(s.tenant,s.location) AND phone_e164=phone ORDER BY normalized_name,id LIMIT 200)c)) INTO result FROM app.customers WHERE (tenant_id,location_id)=(s.tenant,s.location) AND phone_e164=phone;
 RETURN result;
END $$;
CREATE FUNCTION app.domain_import_authorize(command_name text,p jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE family text; b app.domain_import_batches;r app.domain_import_records;k text;
BEGIN
 IF command_name NOT IN ('customer-import.preview','customer-import.decide','customer-import.commit-row','customer-import.attempt-outcome','customer-import.cancel','measurement-import.preview','measurement-import.decide','measurement-import.commit-row','measurement-import.attempt-outcome','measurement-import.cancel') THEN RAISE EXCEPTION 'Import command denied' USING ERRCODE='42501';END IF;
 family:=CASE WHEN command_name LIKE 'customer-import.%' THEN 'customers' ELSE 'measurements' END;PERFORM app.domain_import_admit(family);
 IF command_name LIKE '%.preview' THEN RETURN; END IF;
 b:=app.domain_import_batch(family,app.master_uuid(p->'batchId'));
 IF command_name LIKE '%.cancel' THEN PERFORM app.domain_import_lock(b.id,true); ELSE PERFORM app.domain_import_lock(b.id); END IF;
 IF command_name NOT LIKE '%.cancel' THEN
 SELECT * INTO r FROM app.domain_import_records WHERE batch_id=b.id AND id=app.master_uuid(p->'recordId');
 IF r.id IS NULL THEN RAISE EXCEPTION 'Import group unavailable' USING ERRCODE='FI001'; END IF;
 IF command_name LIKE '%.commit-row' AND b.namespace IS NOT NULL AND r.payload IS NOT NULL THEN
 FOR k IN SELECT key FROM(SELECT b.family||':'||b.namespace||':'||r.source_id AS key UNION SELECT b.family||':'||b.namespace||':'||(value->>'sourceId') FROM jsonb_array_elements(CASE WHEN b.family='customers' THEN r.payload->'wearers' ELSE r.payload->'versions' END))keys ORDER BY key LOOP
  IF NOT pg_try_advisory_xact_lock(hashtextextended('domain-import-source:'||b.tenant_id||':'||b.location_id||':'||k,0)) THEN RAISE EXCEPTION 'Import source busy' USING ERRCODE='FI003'; END IF;
 END LOOP;END IF;END IF;
END $$;
CREATE FUNCTION app.domain_import_result(b app.domain_import_batches,r app.domain_import_records,state text) RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT jsonb_build_object('kind','import-saved','batchId',b.id,'recordId',r.id,'state',state,'revision',coalesce(r.revision,b.revision),'counts',coalesce(r.counts,'{"customers":0,"wearers":0,"profiles":0,"versions":0}'::jsonb))
$$;
CREATE FUNCTION app.domain_import_status(family text,identity uuid,off integer DEFAULT 0) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE b app.domain_import_batches; counts jsonb;items jsonb;total integer;BEGIN
 b:=app.domain_import_batch(family,identity);
 SELECT count(*),jsonb_build_object('pending',count(*) FILTER(WHERE state='pending'),'in-progress',count(*) FILTER(WHERE state='in-progress'),'created',count(*) FILTER(WHERE state='created'),'reused',count(*) FILTER(WHERE state='reused'),'already-imported',count(*) FILTER(WHERE state='already-imported'),'skipped',count(*) FILTER(WHERE state='skipped'),'needs-review',count(*) FILTER(WHERE state='needs-review'),'failed',count(*) FILTER(WHERE state='failed'),'cancelled',count(*) FILTER(WHERE state='cancelled')) INTO total,counts FROM app.domain_import_records WHERE batch_id=b.id;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',r.id,'revision',r.revision,'state',r.state,'rows',r.rows,'redundantRows',r.redundant_rows,'sourceId',r.source_id,'payload',r.payload,'issues',r.issues,'decision',r.decision,'candidates',r.candidates,'candidateCount',r.candidate_count,'operationKey',r.operation_key,'requestHash',r.request_hash,'counts',r.counts) ORDER BY r.ordinal),'[]') INTO items FROM(SELECT * FROM app.domain_import_records WHERE batch_id=b.id ORDER BY ordinal LIMIT 25 OFFSET greatest(0,least(off,100000)))r;
 RETURN jsonb_build_object('id',b.id,'family',b.family,'state',b.state,'revision',b.revision,'expiresAt',b.expires_at,'purged',b.purged_at IS NOT NULL,'namespace',b.namespace,'rowCount',b.row_count,'total',total,'counts',counts,'csvRows',jsonb_build_object('total',b.row_count,'redundant',(SELECT coalesce(sum(jsonb_array_length(redundant_rows)),0) FROM app.domain_import_records WHERE batch_id=b.id),'invalid',(SELECT coalesce(sum(jsonb_array_length(rows)),0) FROM app.domain_import_records WHERE batch_id=b.id AND jsonb_array_length(issues)>0)),'items',items,'nextOffset',CASE WHEN off+25<total THEN off+25 END);
END $$;
CREATE FUNCTION app.domain_import_record_read(family text,batch uuid,identity uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE b app.domain_import_batches;r app.domain_import_records;BEGIN b:=app.domain_import_batch(family,batch);SELECT * INTO r FROM app.domain_import_records WHERE batch_id=b.id AND id=identity;IF r.id IS NULL THEN RAISE EXCEPTION 'Import group unavailable' USING ERRCODE='FI001';END IF;RETURN to_jsonb(r);END $$;
CREATE FUNCTION app.domain_import_operation_result(command_name text,key uuid,hash text) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE s record;op app.command_operations;family text;BEGIN
 family:=CASE WHEN command_name LIKE 'customer-import.%' THEN 'customers' WHEN command_name LIKE 'measurement-import.%' THEN 'measurements' END;PERFORM app.domain_import_admit(family);SELECT * INTO s FROM app.customer_scope();
 SELECT * INTO op FROM app.command_operations WHERE owner_kind='tenant' AND owner_id=s.tenant AND command_kind=command_name AND operation_key=key::text;
 IF op.id IS NULL THEN RETURN NULL; END IF;
 IF (op.actor_id,op.location_id,op.request_hash) IS DISTINCT FROM (s.actor,s.location,hash) THEN RAISE EXCEPTION 'Import replay denied' USING ERRCODE='42501'; END IF;
 RETURN CASE WHEN op.result IS NOT NULL THEN jsonb_build_object('operationId',op.id,'replayed',true,'result',op.result) END;
END $$;

CREATE FUNCTION app.customer_import_commit_group(b app.domain_import_batches,r app.domain_import_records) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE op app.command_operations:=app.active_operation();p jsonb:=r.payload->'profile';w jsonb;decision jsonb:=r.decision;existing app.domain_import_sources;identity uuid;child uuid;profile jsonb;fingerprint jsonb;created integer:=0;reused boolean:=false;
BEGIN
 PERFORM app.domain_import_admit('customers');
 IF op.command_kind<>'customer-import.commit-row' OR (op.tenant_id,op.location_id,op.actor_id) IS DISTINCT FROM (b.tenant_id,b.location_id,b.actor_id) OR r.batch_id<>b.id OR r.payload->>'family'<>'customers' THEN RAISE EXCEPTION 'Customer import denied' USING ERRCODE='42501'; END IF;
 SELECT * INTO existing FROM app.domain_import_sources WHERE (tenant_id,location_id,family,namespace,kind,source_id)=(b.tenant_id,b.location_id,'customers',b.namespace,'customer',r.source_id);
 IF existing.id IS NOT NULL THEN
  IF existing.accepted_hash<>r.canonical_hash OR (decision->>'kind'='reuse' AND existing.customer_id<>app.master_uuid(decision->'customerId')) OR (SELECT count(*) FROM app.domain_import_sources WHERE (tenant_id,location_id,family,namespace,kind,parent_source_id)=(b.tenant_id,b.location_id,'customers',b.namespace,'wearer',r.source_id))<>jsonb_array_length(r.payload->'wearers') OR EXISTS(SELECT FROM jsonb_array_elements(r.payload->'wearers') source_wearer WHERE NOT EXISTS(SELECT FROM app.domain_import_sources s WHERE (s.tenant_id,s.location_id,s.family,s.namespace,s.kind,s.source_id,s.parent_source_id,s.customer_id)=(b.tenant_id,b.location_id,'customers',b.namespace,'wearer',source_wearer.value->>'sourceId',r.source_id,existing.customer_id))) THEN RAISE EXCEPTION 'Imported source changed' USING ERRCODE='FI002'; END IF;
  IF decision->>'kind'='reuse' AND (
   jsonb_array_length(decision->'wearers')<>jsonb_array_length(r.payload->'wearers') OR
   (SELECT count(*) FROM jsonb_array_elements(decision->'wearers'))<>(SELECT count(DISTINCT value->>'sourceId') FROM jsonb_array_elements(decision->'wearers')) OR
   EXISTS(SELECT FROM jsonb_array_elements(decision->'wearers') d WHERE NOT EXISTS(
    SELECT FROM app.domain_import_sources s WHERE (s.tenant_id,s.location_id,s.family,s.namespace,s.kind,s.source_id,s.parent_source_id,s.customer_id)=(b.tenant_id,b.location_id,'customers',b.namespace,'wearer',d.value->>'sourceId',r.source_id,existing.customer_id)
    AND (d.value->'action'->>'kind'<>'reuse' OR s.wearer_id=app.master_uuid(d.value->'action'->'wearerId'))
   ))
  ) THEN RAISE EXCEPTION 'Imported wearer owner changed' USING ERRCODE='FI002'; END IF;
  RETURN jsonb_build_object('state','already-imported','counts','{"customers":0,"wearers":0,"profiles":0,"versions":0}'::jsonb);
 END IF;
 PERFORM app.customer_validate_profile(p,false);
 IF p->'phone'<>'null'::jsonb THEN
  IF NOT pg_try_advisory_xact_lock(hashtextextended('customer-phone:'||b.tenant_id||':'||b.location_id||':'||(p->'phone'->>'e164'),0)) THEN RAISE EXCEPTION 'Customer phone busy' USING ERRCODE='FI003'; END IF;
  PERFORM 1 FROM app.customers WHERE (tenant_id,location_id)=(b.tenant_id,b.location_id) AND phone_e164=p->'phone'->>'e164' ORDER BY id FOR SHARE NOWAIT;
 END IF;
 fingerprint:=app.domain_import_candidates(p->'phone'->>'e164');
 IF fingerprint->>'fingerprint' IS DISTINCT FROM r.candidate_fingerprint THEN RAISE EXCEPTION 'Duplicate candidates changed' USING ERRCODE='FI002'; END IF;
 IF decision->>'kind' NOT IN ('create','separate','reuse') OR (decision->>'kind'='create' AND (fingerprint->>'count')::int>0) THEN RAISE EXCEPTION 'Explicit duplicate decision required' USING ERRCODE='FI002'; END IF;
 IF decision->>'kind'='separate' THEN PERFORM app.measurement_require(app.customer_text_valid(decision->>'reason',500,false),ARRAY['decision','reason']); END IF;
 IF decision->>'kind'='reuse' THEN
  identity:=app.master_uuid(decision->'customerId');PERFORM app.customer_get(identity,true);IF EXISTS(SELECT FROM app.customers WHERE id=identity AND archived_at IS NOT NULL) THEN RAISE EXCEPTION 'Restore customer before reuse' USING ERRCODE='FI002'; END IF;
  reused:=true;
  IF jsonb_array_length(decision->'wearers')<>jsonb_array_length(r.payload->'wearers') OR (SELECT count(*) FROM jsonb_array_elements(decision->'wearers'))<>(SELECT count(DISTINCT value->>'sourceId') FROM jsonb_array_elements(decision->'wearers')) THEN RAISE EXCEPTION 'Map each wearer explicitly' USING ERRCODE='FI002'; END IF;
 ELSE
  identity:=gen_random_uuid();INSERT INTO app.customers(id,tenant_id,location_id,name,created_by,updated_by,creation_operation_id) VALUES(identity,b.tenant_id,b.location_id,p->>'name',op.actor_id,op.actor_id,op.id);
  PERFORM app.customer_apply_profile(identity,p);PERFORM app.customer_record_activity(op,identity,NULL,'customer.import',ARRAY['profile'],0,1);
 END IF;
 FOR w IN SELECT value FROM jsonb_array_elements(r.payload->'wearers') ORDER BY value->>'sourceId' LOOP
  IF EXISTS(SELECT FROM app.domain_import_sources WHERE (tenant_id,location_id,family,namespace,kind,source_id)=(b.tenant_id,b.location_id,'customers',b.namespace,'wearer',w->>'sourceId')) THEN RAISE EXCEPTION 'Source wearer already bound' USING ERRCODE='FI002'; END IF;
  IF reused THEN SELECT value->'action' INTO decision FROM jsonb_array_elements(r.decision->'wearers') WHERE value->>'sourceId'=w->>'sourceId'; ELSE decision:='{"kind":"create"}';END IF;
  IF decision IS NULL OR decision->>'kind' NOT IN ('create','reuse') THEN RAISE EXCEPTION 'Map each wearer explicitly' USING ERRCODE='FI002'; END IF;
  IF decision->>'kind'='reuse' THEN
   child:=app.master_uuid(decision->'wearerId');PERFORM 1 FROM app.customer_wearers WHERE (tenant_id,location_id,customer_id,id)=(b.tenant_id,b.location_id,identity,child) AND archived_at IS NULL FOR UPDATE NOWAIT;
   IF NOT FOUND THEN RAISE EXCEPTION 'Mapped wearer unavailable' USING ERRCODE='FI002'; END IF;
  ELSE
   child:=gen_random_uuid();profile:=jsonb_build_object('name',w->'name','relationship',w->'relationship','birthday',NULL,'gender',jsonb_build_object('kind','unspecified'),'height',NULL,'weight',NULL,'notes',NULL,'preferences',jsonb_build_object('fit',NULL,'fabric',NULL,'design',NULL));
   PERFORM app.customer_validate_profile(profile,true);INSERT INTO app.customer_wearers(id,tenant_id,location_id,customer_id,name,created_by,updated_by,creation_operation_id) VALUES(child,b.tenant_id,b.location_id,identity,w->>'name',op.actor_id,op.actor_id,op.id);
   PERFORM app.customer_apply_wearer(child,profile);PERFORM app.customer_record_activity(op,identity,child,'wearer.import',ARRAY['profile'],0,1);created:=created+1;
  END IF;
  INSERT INTO app.domain_import_sources(tenant_id,location_id,family,namespace,kind,source_id,parent_source_id,accepted_hash,customer_id,wearer_id,operation_id) VALUES(b.tenant_id,b.location_id,'customers',b.namespace,'wearer',w->>'sourceId',r.source_id,'v1:'||encode(sha256(convert_to(w::text,'UTF8')),'hex'),identity,child,op.id);
 END LOOP;
 INSERT INTO app.domain_import_sources(tenant_id,location_id,family,namespace,kind,source_id,accepted_hash,customer_id,operation_id) VALUES(b.tenant_id,b.location_id,'customers',b.namespace,'customer',r.source_id,r.canonical_hash,identity,op.id);
 RETURN jsonb_build_object('state',CASE WHEN reused THEN 'reused' ELSE 'created' END,'counts',jsonb_build_object('customers',CASE WHEN reused THEN 0 ELSE 1 END,'wearers',created,'profiles',0,'versions',0));
END $$;

CREATE OR REPLACE FUNCTION app.measurement_verified_origin(t uuid,l uuid,c uuid,w uuid,destination uuid,target_ref jsonb,schema jsonb,custom jsonb,vals jsonb,label text,measured date,notes jsonb,source_note jsonb,origin jsonb) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE source app.measurement_versions; header app.measurement_profiles; d jsonb; sf jsonb; tf jsonb; sv jsonb; actual jsonb; mapped jsonb; all_fields jsonb:=(schema->'fields')||custom; changes jsonb:='[]'; metadata jsonb:='[]'; f jsonb; expected_field jsonb; custom_changed boolean:=false; op app.command_operations;
BEGIN
 IF origin->>'kind'='imported' THEN
  op:=app.active_operation();PERFORM app.master_keys(origin,ARRAY['kind','batchId','recordId'],ARRAY['origin']);
  IF op.command_kind<>'measurement-import.commit-row' OR (op.tenant_id,op.location_id) IS DISTINCT FROM (t,l) OR NOT EXISTS(SELECT FROM app.domain_import_records r JOIN app.domain_import_batches b ON b.id=r.batch_id WHERE r.id=app.master_uuid(origin->'recordId') AND b.id=app.master_uuid(origin->'batchId') AND (b.tenant_id,b.location_id,b.actor_id)=(op.tenant_id,op.location_id,op.actor_id) AND r.operation_key::text=op.operation_key AND r.state='in-progress') THEN RAISE EXCEPTION 'Imported provenance denied' USING ERRCODE='42501'; END IF;
  RETURN origin;
 END IF;
 IF origin->>'kind'='manual' THEN PERFORM app.master_keys(origin,ARRAY['kind'],ARRAY['origin']); RETURN origin; END IF;
 PERFORM app.master_keys(origin,ARRAY['kind','sourceProfileId','sourceVersionId','decisions'],ARRAY['origin']);
 PERFORM app.measurement_require(origin->>'kind' IN ('copy','mapped') AND jsonb_typeof(origin->'decisions')='array' AND jsonb_array_length(origin->'decisions')<=80,ARRAY['origin']);
 SELECT * INTO source FROM app.measurement_versions WHERE (tenant_id,location_id,customer_id,wearer_id,profile_id,id)=(t,l,c,w,app.master_uuid(origin->'sourceProfileId'),app.master_uuid(origin->'sourceVersionId'));
 IF source.id IS NULL THEN RAISE EXCEPTION 'Measurement source unavailable' USING ERRCODE='FM001'; END IF;
 SELECT * INTO header FROM app.measurement_profiles WHERE (tenant_id,location_id,customer_id,wearer_id,id)=(t,l,c,w,source.profile_id);
 PERFORM app.measurement_require(origin->>'kind'<>'copy' OR (destination<>source.profile_id AND header.kind=target_ref->>'kind' AND header.garment_id IS NOT DISTINCT FROM CASE WHEN target_ref->>'kind'='garment' THEN app.master_uuid(target_ref->'garmentId') END),ARRAY['origin']);
 PERFORM app.measurement_require((SELECT count(*)=count(DISTINCT value->>'targetFieldId') FROM jsonb_array_elements(origin->'decisions')),ARRAY['origin','decisions']);
 IF destination<>source.profile_id THEN
  PERFORM app.measurement_require(NOT EXISTS(SELECT FROM app.master_definition_nodes(app.measurement_definition(schema,custom)) fresh JOIN app.master_definition_nodes(app.measurement_definition(source.document->'schema',source.document->'customFields')) old ON fresh.node_id=old.node_id WHERE fresh.node_kind<>'section'),ARRAY['customFields']);
 END IF;
 FOR d IN SELECT value FROM jsonb_array_elements(origin->'decisions') LOOP
  SELECT value INTO sf FROM jsonb_array_elements((source.document->'schema'->'fields')||(source.document->'customFields')) WHERE value->>'id'=d->>'sourceFieldId';
  SELECT value INTO tf FROM jsonb_array_elements(all_fields) WHERE value->>'id'=d->>'targetFieldId';
  SELECT value INTO sv FROM jsonb_array_elements(source.document->'values') WHERE value->>'fieldId'=d->>'sourceFieldId';
  PERFORM app.measurement_mapping_value(sf,tf,sv,d);
 END LOOP;
 FOR f IN SELECT value FROM jsonb_array_elements(all_fields) LOOP
  SELECT value INTO d FROM jsonb_array_elements(origin->'decisions') WHERE value->>'targetFieldId'=f->>'id';
  SELECT value INTO actual FROM jsonb_array_elements(vals) WHERE value->>'fieldId'=f->>'id';
  mapped:=NULL;
  IF d IS NOT NULL THEN
   SELECT value INTO sf FROM jsonb_array_elements((source.document->'schema'->'fields')||(source.document->'customFields')) WHERE value->>'id'=d->>'sourceFieldId';
   SELECT value INTO sv FROM jsonb_array_elements(source.document->'values') WHERE value->>'fieldId'=d->>'sourceFieldId';
   mapped:=app.measurement_mapping_value(sf,f,sv,d);
  END IF;
  IF EXISTS(SELECT FROM jsonb_array_elements(custom) cf WHERE cf->>'id'=f->>'id') THEN
   expected_field:=sf-'id'-'sectionId';
   IF sf->>'kind'='select' AND d->>'rule'='identity' THEN expected_field:=jsonb_set(expected_field,'{choices}',coalesce((SELECT jsonb_agg((ch-'id')||jsonb_build_object('id',coalesce((SELECT pair->'targetChoiceId' FROM jsonb_array_elements(d->'choices') pair WHERE pair->>'sourceChoiceId'=ch->>'id'),ch->'id'))) FROM jsonb_array_elements(sf->'choices') ch),'[]'::jsonb)); END IF;
   IF d IS NULL OR (f-'id'-'sectionId') IS DISTINCT FROM expected_field THEN custom_changed:=true; END IF;
  END IF;
  IF actual IS DISTINCT FROM mapped OR (custom_changed AND EXISTS(SELECT FROM jsonb_array_elements(custom) cf WHERE cf->>'id'=f->>'id') AND (d IS NULL OR (f-'id'-'sectionId') IS DISTINCT FROM expected_field)) THEN changes:=changes||jsonb_build_array(f->'id'); END IF;
 END LOOP;
 SELECT coalesce(jsonb_agg(value ORDER BY value#>>'{}'),'[]') INTO changes FROM jsonb_array_elements(changes);
 IF label IS DISTINCT FROM source.document->>'label' THEN metadata:=metadata||'"label"'::jsonb; END IF;
 IF measured IS DISTINCT FROM source.measured_on THEN metadata:=metadata||'"measuredOn"'::jsonb; END IF;
 IF notes IS DISTINCT FROM source.document->'notes' THEN metadata:=metadata||'"notes"'::jsonb; END IF;
 IF source_note IS DISTINCT FROM source.document->'sourceNote' THEN metadata:=metadata||'"sourceNote"'::jsonb; END IF;
 IF custom_changed OR jsonb_array_length(custom)<>jsonb_array_length(source.document->'customFields') THEN metadata:=metadata||'"customFields"'::jsonb; END IF;
 RETURN origin||jsonb_build_object('manualFieldIds',changes,'editedMetadata',metadata);
END $$;

CREATE FUNCTION app.measurement_import_commit_group(b app.domain_import_batches,r app.domain_import_records) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE op app.command_operations:=app.active_operation();prepared jsonb:=r.prepared;ref jsonb:=prepared->'schemaRef';schema jsonb;customer uuid;wearer uuid;profile uuid;version uuid;prior uuid;v jsonb;nodes jsonb;doc jsonb;seq integer:=0;date_value date;today date;tz text;existing app.domain_import_sources;
BEGIN
 PERFORM app.domain_import_admit('measurements');
 IF op.command_kind<>'measurement-import.commit-row' OR (op.tenant_id,op.location_id,op.actor_id) IS DISTINCT FROM (b.tenant_id,b.location_id,b.actor_id) OR r.batch_id<>b.id OR r.payload->>'family'<>'measurements' OR r.decision->>'kind'<>'owner' THEN RAISE EXCEPTION 'Measurement import denied' USING ERRCODE='42501'; END IF;
 customer:=app.master_uuid(r.decision->'customerId');wearer:=app.master_uuid(r.decision->'wearerId');
 SELECT * INTO existing FROM app.domain_import_sources WHERE (tenant_id,location_id,family,namespace,kind,source_id)=(b.tenant_id,b.location_id,'measurements',b.namespace,'profile',r.source_id);
 IF existing.id IS NOT NULL THEN
  IF existing.accepted_hash<>r.intent_hash OR (existing.customer_id,existing.wearer_id) IS DISTINCT FROM (customer,wearer) OR (SELECT count(*) FROM app.domain_import_sources WHERE (tenant_id,location_id,family,namespace,kind,parent_source_id)=(b.tenant_id,b.location_id,'measurements',b.namespace,'version',r.source_id))<>jsonb_array_length(r.payload->'versions') OR EXISTS(SELECT FROM jsonb_array_elements(r.payload->'versions') source_version WHERE NOT EXISTS(SELECT FROM app.domain_import_sources s WHERE (s.tenant_id,s.location_id,s.family,s.namespace,s.kind,s.source_id,s.parent_source_id,s.customer_id,s.wearer_id,s.profile_id,s.source_sequence)=(b.tenant_id,b.location_id,'measurements',b.namespace,'version',source_version.value->>'sourceId',r.source_id,customer,wearer,existing.profile_id,(source_version.value->>'sequence')::int))) THEN RAISE EXCEPTION 'Imported history set changed' USING ERRCODE='FI002'; END IF;
  RETURN jsonb_build_object('state','already-imported','counts','{"customers":0,"wearers":0,"profiles":0,"versions":0}'::jsonb);
 END IF;
 PERFORM app.measurement_owner(customer,wearer,true);schema:=app.measurement_intake(ref,true);
 IF schema IS DISTINCT FROM prepared->'schema' THEN RAISE EXCEPTION 'Reviewed schema changed' USING ERRCODE='FI002'; END IF;
 PERFORM app.measurement_require(jsonb_array_length(prepared->'versions') BETWEEN 1 AND 20,ARRAY['versions']);
 SELECT timezone INTO tz FROM app.shop_settings WHERE tenant_id=b.tenant_id;
 IF tz IS NULL OR NOT EXISTS(SELECT FROM pg_catalog.pg_timezone_names WHERE name=tz) THEN RAISE EXCEPTION 'Shop timezone unavailable' USING ERRCODE='FI002';END IF;today:=(clock_timestamp() AT TIME ZONE tz)::date;
 profile:=app.master_uuid(prepared->'profileId');
 INSERT INTO app.measurement_profiles(id,tenant_id,location_id,customer_id,wearer_id,kind,garment_id,revision,created_by,updated_by,creation_operation_id) VALUES(profile,b.tenant_id,b.location_id,customer,wearer,ref->>'kind',CASE WHEN ref->>'kind'='garment' THEN app.master_uuid(ref->'garmentId') END,1,op.actor_id,op.actor_id,op.id);
 FOR v IN SELECT value FROM jsonb_array_elements(prepared->'versions') ORDER BY (value->>'sourceSequence')::int LOOP
  seq:=seq+1;version:=app.master_uuid(v->'versionId');date_value:=(v->>'measuredOn')::date;
  PERFORM app.measurement_require(date_value BETWEEN '0001-01-01'::date AND today,ARRAY['measuredOn']);
  -- Each source version is a fresh import, including choices that earlier imported versions selected.
  PERFORM app.measurement_validate(schema,v->'customFields',v->'values','[]'::jsonb,ref->>'kind'='body');
  nodes:=app.measurement_definition(schema,v->'customFields');
  IF EXISTS(SELECT FROM app.master_definition_nodes(nodes)n JOIN app.measurement_custom_identities old ON old.profile_id=profile AND old.node_id=n.node_id WHERE n.node_kind<>'section' AND (old.retired_sequence IS NOT NULL OR old.signature IS DISTINCT FROM n.signature)) THEN RAISE EXCEPTION 'Custom source key changed meaning' USING ERRCODE='FI002'; END IF;
  INSERT INTO app.measurement_custom_identities(tenant_id,location_id,customer_id,wearer_id,profile_id,node_id,signature,introduced_sequence) SELECT b.tenant_id,b.location_id,customer,wearer,profile,node_id,signature,seq FROM app.master_definition_nodes(nodes) WHERE node_kind<>'section' ON CONFLICT DO NOTHING;
  PERFORM set_config('app.measurement_retiring',profile::text,true);UPDATE app.measurement_custom_identities old SET retired_sequence=seq WHERE old.profile_id=profile AND old.retired_sequence IS NULL AND NOT EXISTS(SELECT FROM app.master_definition_nodes(nodes)n WHERE n.node_kind<>'section' AND n.node_id=old.node_id);PERFORM set_config('app.measurement_retiring','',true);
  doc:=jsonb_build_object('schema',schema,'label',v->'label','values',v->'values','customFields',v->'customFields','notes',v->'notes','sourceNote',v->'sourceNote','origin',jsonb_build_object('kind','imported','batchId',b.id,'recordId',r.id));
  PERFORM app.measurement_require(octet_length(doc::text)<=131072,ARRAY['document']);
  INSERT INTO app.measurement_versions(id,tenant_id,location_id,customer_id,wearer_id,profile_id,sequence,garment_id,garment_version_id,body_schema_version,measured_on,recorded_by,operation_id,prior_version_id,document) VALUES(version,b.tenant_id,b.location_id,customer,wearer,profile,seq,CASE WHEN ref->>'kind'='garment' THEN app.master_uuid(ref->'garmentId') END,CASE WHEN ref->>'kind'='garment' THEN app.master_uuid(ref->'versionId') END,CASE WHEN ref->>'kind'='body' THEN ref->>'bundleVersion' END,date_value,op.actor_id,op.id,prior,doc);
  INSERT INTO app.domain_import_sources(tenant_id,location_id,family,namespace,kind,source_id,parent_source_id,source_customer_id,source_wearer_id,source_sequence,accepted_hash,customer_id,wearer_id,profile_id,version_id,operation_id) VALUES(b.tenant_id,b.location_id,'measurements',b.namespace,'version',v->>'sourceId',r.source_id,r.payload->'versions'->0->>'sourceCustomerId',r.payload->'versions'->0->>'sourceWearerId',(v->>'sourceSequence')::int,v->>'sourceHash',customer,wearer,profile,version,op.id);
  prior:=version;
 END LOOP;
 UPDATE app.measurement_profiles SET current_version_id=version,revision=seq,updated_at=clock_timestamp() WHERE id=profile;
 INSERT INTO app.domain_import_sources(tenant_id,location_id,family,namespace,kind,source_id,source_customer_id,source_wearer_id,accepted_hash,customer_id,wearer_id,profile_id,operation_id) VALUES(b.tenant_id,b.location_id,'measurements',b.namespace,'profile',r.source_id,r.payload->'versions'->0->>'sourceCustomerId',r.payload->'versions'->0->>'sourceWearerId',r.intent_hash,customer,wearer,profile,op.id);
 RETURN jsonb_build_object('state','created','counts',jsonb_build_object('customers',0,'wearers',0,'profiles',1,'versions',seq));
END $$;

CREATE FUNCTION app.domain_import_mutate(command_name text,p jsonb,extra jsonb DEFAULT '{}'::jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE op app.command_operations:=app.active_operation();family text;b app.domain_import_batches;r app.domain_import_records;record jsonb;matches jsonb;phones jsonb;ordinal integer:=0;result jsonb;attempt app.domain_import_attempts;identity uuid;new_revision integer;
BEGIN
 PERFORM app.domain_import_authorize(command_name,p);family:=CASE WHEN command_name LIKE 'customer-import.%' THEN 'customers' ELSE 'measurements' END;
 IF op.command_kind<>command_name OR (op.tenant_id,op.location_id,op.actor_id) IS DISTINCT FROM (nullif(current_setting('app.tenant_id',true),'')::uuid,nullif(current_setting('app.location_id',true),'')::uuid,nullif(current_setting('app.principal_id',true),'')::uuid) THEN RAISE EXCEPTION 'Import operation denied' USING ERRCODE='42501'; END IF;
 IF command_name LIKE '%.preview' THEN
  PERFORM app.measurement_require(app.customer_text_valid(p->>'namespace',100,false) AND jsonb_array_length(extra->'parsed'->'groups') BETWEEN 1 AND 200 AND (extra->'parsed'->>'rowCount')::int BETWEEN 1 AND 200 AND extra->'parsed'->>'family'=family,ARRAY['file']);
  IF NOT EXISTS(SELECT FROM app.domain_import_budgets WHERE (tenant_id,location_id,actor_id)=(op.tenant_id,op.location_id,op.actor_id) AND leases ? (extra->>'token') AND (leases->>(extra->>'token'))::timestamptz>clock_timestamp()) THEN RAISE EXCEPTION 'Preview reservation expired' USING ERRCODE='FI004'; END IF;
  INSERT INTO app.domain_import_batches(tenant_id,location_id,actor_id,family,namespace,digest,row_count,expires_at,creation_operation_id) VALUES(op.tenant_id,op.location_id,op.actor_id,family,p->>'namespace',extra->>'digest',(extra->'parsed'->>'rowCount')::int,clock_timestamp()+interval '30 minutes',op.id) RETURNING * INTO b;
  IF family='customers' THEN
   SELECT coalesce(jsonb_object_agg(phone,app.domain_import_candidates(phone)),'{}') INTO phones FROM(SELECT DISTINCT value->'payload'->'profile'->'phone'->>'e164' phone FROM jsonb_array_elements(extra->'parsed'->'groups') WHERE value->'payload'->'profile'->'phone'->>'e164' IS NOT NULL)p;
  END IF;
  FOR record IN SELECT value FROM jsonb_array_elements(extra->'parsed'->'groups') LOOP
   ordinal:=ordinal+1;matches:=coalesce(phones->(record->'payload'->'profile'->'phone'->>'e164'),app.domain_import_candidates(NULL));
   INSERT INTO app.domain_import_records(tenant_id,location_id,actor_id,batch_id,ordinal,state,source_id,rows,redundant_rows,payload,issues,candidates,candidate_count,candidate_fingerprint,bindings,canonical_hash,operation_key)
   VALUES(b.tenant_id,b.location_id,b.actor_id,b.id,ordinal,CASE WHEN jsonb_array_length(record->'issues')>0 THEN 'needs-review' ELSE 'pending' END,record->>'sourceId',record->'rows',record->'redundantRows',nullif(record->'payload','null'::jsonb),record->'issues',matches->'items',(matches->>'count')::int,matches->>'fingerprint',coalesce(p->'bindings','[]'::jsonb),extra->'hashes'->>(ordinal-1),gen_random_uuid());
  END LOOP;
  RETURN app.domain_import_result(b,NULL,'preview');
 END IF;
 b:=app.domain_import_batch(family,app.master_uuid(p->'batchId'));
 IF command_name LIKE '%.cancel' THEN
  IF b.state='complete' THEN RAISE EXCEPTION 'Completed import cannot cancel' USING ERRCODE='FI002'; END IF;
  IF b.state<>'cancelled' THEN
   UPDATE app.domain_import_attempts a SET state='rolled-back',lease_token=NULL WHERE a.batch_id=b.id AND a.state IN ('pending','in-progress') AND NOT EXISTS(SELECT FROM app.command_operations o WHERE o.owner_kind='tenant' AND o.owner_id=b.tenant_id AND o.command_kind=CASE family WHEN 'customers' THEN 'customer-import.commit-row' ELSE 'measurement-import.commit-row' END AND o.operation_key=a.operation_key::text AND o.result IS NOT NULL);
   UPDATE app.domain_import_records SET state='cancelled' WHERE batch_id=b.id AND state IN ('pending','in-progress','failed','needs-review');
   UPDATE app.domain_import_batches SET state='cancelled',lease_token=NULL,lease_until=NULL,revision=revision+1 WHERE id=b.id RETURNING * INTO b;
  END IF;
  RETURN app.domain_import_result(b,NULL,'cancelled');
 END IF;
 SELECT * INTO r FROM app.domain_import_records WHERE batch_id=b.id AND id=app.master_uuid(p->'recordId') FOR UPDATE;
 IF r.id IS NULL THEN RAISE EXCEPTION 'Import group unavailable' USING ERRCODE='FI001'; END IF;
 IF command_name LIKE '%.attempt-outcome' THEN
  SELECT * INTO attempt FROM app.domain_import_attempts WHERE operation_key=app.master_uuid(p->'operationKey') AND (batch_id,record_id,request_hash)=(b.id,r.id,p->>'requestHash') FOR UPDATE;
  IF attempt.operation_key IS NULL OR attempt.operation_key<>r.operation_key OR attempt.revision<>r.revision THEN RAISE EXCEPTION 'Import attempt changed' USING ERRCODE='FI002'; END IF;
  IF NOT pg_try_advisory_xact_lock(hashtextextended('customer-operation:'||b.tenant_id||':'||CASE family WHEN 'customers' THEN 'customer-import.commit-row' ELSE 'measurement-import.commit-row' END||':'||attempt.operation_key,0)) THEN RAISE EXCEPTION 'Import attempt still active' USING ERRCODE='FI003';END IF;
  IF EXISTS(SELECT FROM app.command_operations WHERE owner_kind='tenant' AND owner_id=b.tenant_id AND command_kind=CASE family WHEN 'customers' THEN 'customer-import.commit-row' ELSE 'measurement-import.commit-row' END AND operation_key=attempt.operation_key::text) OR r.state<>'in-progress' THEN RETURN app.domain_import_result(b,r,CASE WHEN r.state IN ('created','reused','already-imported','skipped','cancelled') THEN r.state ELSE 'in-progress' END);END IF;
  IF p->>'outcome' NOT IN ('failed','needs-review') THEN RAISE EXCEPTION 'Invalid attempt outcome' USING ERRCODE='42501';END IF;
  UPDATE app.domain_import_attempts SET state='rolled-back',lease_token=NULL WHERE operation_key=attempt.operation_key;
  UPDATE app.domain_import_records SET state=p->>'outcome' WHERE id=r.id RETURNING * INTO r;
  RETURN app.domain_import_result(b,r,r.state);
 END IF;
 IF b.state IN ('complete','cancelled') OR b.expires_at<=clock_timestamp() OR b.purged_at IS NOT NULL THEN RAISE EXCEPTION 'Import preview expired or closed' USING ERRCODE='FI005'; END IF;
 IF r.revision<>(p->>'expectedRevision')::int THEN RAISE EXCEPTION 'Import revision changed' USING ERRCODE='FI002'; END IF;
 IF command_name LIKE '%.decide' THEN
  IF r.state IN ('created','reused','already-imported','skipped','cancelled','in-progress') THEN RAISE EXCEPTION 'Import group cannot be revised' USING ERRCODE='FI002'; END IF;
  IF p->'decision'->>'kind'='skip' THEN
   UPDATE app.domain_import_records SET decision=p->'decision',state='skipped',revision=revision+1,outcome_operation_id=op.id WHERE id=r.id RETURNING * INTO r;
  ELSE
   IF r.payload IS NULL OR jsonb_array_length(r.issues)>0 THEN RAISE EXCEPTION 'Correct the CSV group before importing' USING ERRCODE='FI002'; END IF;
   IF (family='customers' AND p->'decision'->>'kind' NOT IN ('create','reuse','separate')) OR (family='measurements' AND p->'decision'->>'kind'<>'owner') THEN RAISE EXCEPTION 'Decision does not match format' USING ERRCODE='42501'; END IF;
   IF family='customers' THEN
    matches:=app.domain_import_candidates(r.payload->'profile'->'phone'->>'e164');
    IF matches->>'fingerprint' IS DISTINCT FROM r.candidate_fingerprint THEN
     UPDATE app.domain_import_records SET candidates=matches->'items',candidate_count=(matches->>'count')::int,candidate_fingerprint=matches->>'fingerprint',decision=NULL,prepared=NULL,request_hash=NULL,state='needs-review',revision=revision+1 WHERE id=r.id RETURNING * INTO r;
     RETURN app.domain_import_result(b,r,'needs-review');
    END IF;
    IF p->'decision'->>'kind'='create' AND r.candidate_count>0 THEN RAISE EXCEPTION 'Review phone matches explicitly' USING ERRCODE='FI002'; END IF;
   END IF;
   UPDATE app.domain_import_attempts SET state='rolled-back' WHERE operation_key=r.operation_key AND state='pending';
   new_revision:=r.revision+1;identity:=app.master_uuid(extra->'operationKey');
   PERFORM app.measurement_require(identity::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' AND extra->>'requestHash' ~ '^v1:[0-9a-f]{64}$' AND extra->>'intentHash' ~ '^v1:[0-9a-f]{64}$',ARRAY['attempt']);
   UPDATE app.domain_import_records SET decision=p->'decision',bindings=coalesce(p->'bindings','[]'),prepared=nullif(extra->'prepared','null'::jsonb),intent_hash=extra->>'intentHash',operation_key=identity,request_hash=extra->>'requestHash',revision=new_revision,state='pending' WHERE id=r.id RETURNING * INTO r;
   INSERT INTO app.domain_import_attempts(operation_key,tenant_id,location_id,actor_id,batch_id,record_id,revision,request_hash,intent_hash) VALUES(identity,b.tenant_id,b.location_id,b.actor_id,b.id,r.id,r.revision,r.request_hash,r.intent_hash);
  END IF;
  IF NOT EXISTS(SELECT FROM app.domain_import_records WHERE batch_id=b.id AND state NOT IN ('created','reused','already-imported','skipped')) THEN UPDATE app.domain_import_batches SET state='complete',revision=revision+1 WHERE id=b.id;END IF;
  RETURN app.domain_import_result(b,r,CASE WHEN r.state='skipped' THEN 'skipped' ELSE 'reviewed' END);
 END IF;
 IF command_name NOT LIKE '%.commit-row' OR r.state<>'in-progress' OR r.operation_key::text<>op.operation_key OR r.request_hash<>op.request_hash THEN RAISE EXCEPTION 'Import attempt is not scheduled' USING ERRCODE='FI002'; END IF;
 SELECT * INTO attempt FROM app.domain_import_attempts WHERE operation_key=r.operation_key FOR UPDATE;
 IF attempt.state<>'in-progress' OR b.lease_token IS DISTINCT FROM attempt.lease_token OR b.lease_until<=clock_timestamp() THEN RAISE EXCEPTION 'Import scheduling lease changed' USING ERRCODE='FI003'; END IF;
 IF family='customers' THEN result:=app.customer_import_commit_group(b,r); ELSE result:=app.measurement_import_commit_group(b,r);END IF;
 UPDATE app.domain_import_records SET state=result->>'state',counts=result->'counts',outcome_operation_id=op.id WHERE id=r.id RETURNING * INTO r;
 UPDATE app.domain_import_attempts SET state='committed',outcome_operation_id=op.id WHERE operation_key=attempt.operation_key;
 UPDATE app.domain_import_batches SET state=CASE WHEN NOT EXISTS(SELECT FROM app.domain_import_records WHERE batch_id=b.id AND state NOT IN ('created','reused','already-imported','skipped')) THEN 'complete' ELSE 'running' END,revision=revision+1 WHERE id=b.id;
 RETURN app.domain_import_result(b,r,r.state);
END $$;

CREATE FUNCTION app.domain_import_chunk_begin(family text,identity uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE b app.domain_import_batches;token uuid;BEGIN
 b:=app.domain_import_batch(family,identity);PERFORM app.domain_import_lock(b.id);
 SELECT * INTO b FROM app.domain_import_batches WHERE id=b.id FOR UPDATE;
 IF b.state IN ('complete','cancelled') OR b.expires_at<=clock_timestamp() OR b.purged_at IS NOT NULL THEN RAISE EXCEPTION 'Import preview expired or closed' USING ERRCODE='FI005';END IF;
 IF b.lease_until>clock_timestamp() THEN RAISE EXCEPTION 'Another import chunk is scheduling' USING ERRCODE='FI003';END IF;
 token:=app.domain_import_budget(family,false);
 UPDATE app.domain_import_batches SET lease_token=token,lease_until=clock_timestamp()+interval '30 seconds',state='running' WHERE id=b.id;RETURN token;
END $$;
CREATE FUNCTION app.domain_import_schedule(family text,identity uuid,token uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE b app.domain_import_batches;r app.domain_import_records;BEGIN
 b:=app.domain_import_batch(family,identity);PERFORM app.domain_import_lock(b.id);
 IF b.state IN ('complete','cancelled') THEN RETURN NULL;END IF;
 IF b.lease_token IS DISTINCT FROM token OR b.lease_until<=clock_timestamp() OR b.expires_at<=clock_timestamp() OR b.state<>'running' THEN RAISE EXCEPTION 'Import schedule ended' USING ERRCODE='FI003'; END IF;
 SELECT * INTO r FROM app.domain_import_records WHERE batch_id=b.id AND state='pending' AND request_hash IS NOT NULL ORDER BY ordinal LIMIT 1 FOR UPDATE;
 IF r.id IS NULL THEN RETURN NULL; END IF;
 UPDATE app.domain_import_records SET state='in-progress' WHERE id=r.id;
 UPDATE app.domain_import_attempts SET state='in-progress',started_at=clock_timestamp(),lease_token=token WHERE operation_key=r.operation_key AND state='pending';
 IF NOT FOUND THEN RAISE EXCEPTION 'Import attempt cannot schedule' USING ERRCODE='FI002'; END IF;
 RETURN jsonb_build_object('batchId',b.id,'recordId',r.id,'expectedRevision',r.revision,'operationKey',r.operation_key,'requestHash',r.request_hash);
END $$;
CREATE FUNCTION app.domain_import_chunk_end(family text,identity uuid,token uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE b app.domain_import_batches;BEGIN b:=app.domain_import_batch(family,identity);PERFORM app.domain_import_lock(b.id);UPDATE app.domain_import_batches SET lease_token=NULL,lease_until=NULL WHERE id=b.id AND lease_token=token;END $$;
CREATE FUNCTION app.domain_import_recover(family text,batch uuid,record uuid,key uuid,hash text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE b app.domain_import_batches;a app.domain_import_attempts;op app.command_operations;command_name text;
BEGIN
 b:=app.domain_import_batch(family,batch);command_name:=CASE family WHEN 'customers' THEN 'customer-import.commit-row' ELSE 'measurement-import.commit-row' END;
 SELECT * INTO a FROM app.domain_import_attempts WHERE (batch_id,record_id,operation_key,request_hash,actor_id,tenant_id,location_id)=(b.id,record,key,hash,b.actor_id,b.tenant_id,b.location_id);
 IF a.operation_key IS NULL THEN RAISE EXCEPTION 'Recovery envelope denied' USING ERRCODE='42501'; END IF;
 SELECT * INTO op FROM app.command_operations WHERE owner_kind='tenant' AND owner_id=b.tenant_id AND command_kind=command_name AND operation_key=key::text;
 IF op.id IS NOT NULL THEN
  IF (op.actor_id,op.location_id,op.request_hash) IS DISTINCT FROM (b.actor_id,b.location_id,hash) THEN RAISE EXCEPTION 'Recovery envelope denied' USING ERRCODE='42501'; END IF;
  IF op.result IS NOT NULL THEN RETURN jsonb_build_object('kind','committed','operationId',op.id,'result',op.result); END IF;
 END IF;
 IF NOT pg_try_advisory_xact_lock(hashtextextended('customer-operation:'||b.tenant_id||':'||command_name||':'||key,0)) OR (a.state='in-progress' AND b.lease_until>clock_timestamp()) THEN RETURN jsonb_build_object('kind','in-progress');END IF;
 RETURN jsonb_build_object('kind','unknown');
END $$;
CREATE FUNCTION app.domain_import_owner_mapping(ns text,customer_source text,wearer_source text) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE s record;result jsonb;BEGIN
 PERFORM app.domain_import_admit('measurements');SELECT * INTO s FROM app.customer_scope();
 SELECT jsonb_build_object('customerId',c.customer_id,'wearerId',w.wearer_id) INTO result FROM app.domain_import_sources c JOIN app.domain_import_sources w ON (w.tenant_id,w.location_id,w.family,w.namespace,w.kind,w.parent_source_id,w.customer_id)=(c.tenant_id,c.location_id,c.family,c.namespace,'wearer',c.source_id,c.customer_id) WHERE (c.tenant_id,c.location_id,c.family,c.namespace,c.kind,c.source_id,w.source_id)=(s.tenant,s.location,'customers',ns,'customer',customer_source,wearer_source);
 RETURN result;
END $$;
CREATE FUNCTION app.domain_import_maintenance() RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE b app.domain_import_batches;a app.domain_import_attempts;op app.command_operations;n integer:=0;command_name text;BEGIN
 FOR b IN SELECT * FROM app.domain_import_batches WHERE (created_at<=clock_timestamp()-interval '24 hours' AND purged_at IS NULL) OR (lease_until<=clock_timestamp()) ORDER BY created_at LIMIT 100 LOOP
  IF NOT pg_try_advisory_xact_lock(hashtextextended('domain-import-batch:'||b.id,0)) THEN CONTINUE;END IF;
  command_name:=CASE b.family WHEN 'customers' THEN 'customer-import.commit-row' ELSE 'measurement-import.commit-row' END;
  FOR a IN SELECT * FROM app.domain_import_attempts WHERE batch_id=b.id AND state='in-progress' LOOP
   IF NOT pg_try_advisory_xact_lock(hashtextextended('customer-operation:'||b.tenant_id||':'||command_name||':'||a.operation_key,0)) THEN CONTINUE;END IF;
   SELECT * INTO op FROM app.command_operations WHERE owner_kind='tenant' AND owner_id=b.tenant_id AND command_kind=command_name AND operation_key=a.operation_key::text;
   IF op.result IS NULL THEN UPDATE app.domain_import_attempts SET state='rolled-back',lease_token=NULL WHERE operation_key=a.operation_key;UPDATE app.domain_import_records SET state='failed' WHERE id=a.record_id AND state='in-progress';END IF;
  END LOOP;
  IF EXISTS(SELECT FROM app.domain_import_attempts WHERE batch_id=b.id AND state='in-progress') THEN CONTINUE;END IF;
  UPDATE app.domain_import_batches SET lease_token=NULL,lease_until=NULL WHERE id=b.id;
  IF b.created_at<=clock_timestamp()-interval '24 hours' AND b.purged_at IS NULL THEN
   UPDATE app.domain_import_records SET payload=NULL,source_id=NULL,decision=NULL,candidates='[]',bindings='[]',prepared=NULL,candidate_fingerprint=NULL WHERE batch_id=b.id;
   UPDATE app.domain_import_batches SET namespace=NULL,purged_at=clock_timestamp() WHERE id=b.id;n:=n+1;
  END IF;
 END LOOP;RETURN n;
END $$;

DO $$ DECLARE f record;BEGIN FOR f IN SELECT p.oid::regprocedure signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='app' AND (p.proname LIKE 'domain_import_%' OR p.proname IN ('customer_import_commit_group','measurement_import_commit_group','measurement_verified_origin_before_imports','measurement_verified_origin')) LOOP EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,fitloom_web,fitloom_worker,fitloom_auth,fitloom_operator',f.signature);END LOOP;END $$;
GRANT EXECUTE ON FUNCTION app.domain_import_authorize(text,jsonb),app.domain_import_mutate(text,jsonb,jsonb),app.domain_import_status(text,uuid,integer),app.domain_import_record_read(text,uuid,uuid),app.domain_import_schema(jsonb,boolean),app.domain_import_schema_choices(jsonb),app.domain_import_budget(text,boolean),app.domain_import_preview_end(text,uuid),app.domain_import_chunk_begin(text,uuid),app.domain_import_schedule(text,uuid,uuid),app.domain_import_chunk_end(text,uuid,uuid),app.domain_import_recover(text,uuid,uuid,uuid,text),app.domain_import_owner_mapping(text,text,text),app.domain_import_operation_result(text,uuid,text) TO fitloom_web;
GRANT EXECUTE ON FUNCTION app.domain_import_maintenance() TO fitloom_worker;

CREATE FUNCTION app.domain_import_batches_page(family text,off integer DEFAULT 0) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE s record;result jsonb;BEGIN
 PERFORM app.domain_import_admit(family);SELECT * INTO s FROM app.customer_scope();
 SELECT jsonb_build_object('items',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',b.id,'state',b.state,'createdAt',b.created_at,'expiresAt',b.expires_at,'rowCount',b.row_count) ORDER BY b.created_at DESC,b.id DESC),'[]') FROM(SELECT * FROM app.domain_import_batches WHERE (tenant_id,location_id,actor_id)=(s.tenant,s.location,s.actor) AND domain_import_batches.family=domain_import_batches_page.family ORDER BY created_at DESC,id DESC LIMIT 25 OFFSET greatest(0,least(off,100000)))b),'nextOffset',CASE WHEN count(*)>off+25 THEN off+25 END) INTO result FROM app.domain_import_batches WHERE (tenant_id,location_id,actor_id)=(s.tenant,s.location,s.actor) AND domain_import_batches.family=domain_import_batches_page.family;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION app.domain_import_batches_page(text,integer) FROM PUBLIC,fitloom_worker,fitloom_auth,fitloom_operator;
GRANT EXECUTE ON FUNCTION app.domain_import_batches_page(text,integer) TO fitloom_web;
