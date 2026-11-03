CREATE TABLE "app"."customer_activity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"wearer_id" uuid,
	"actor_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"changed_fields" text[] NOT NULL,
	"previous_version" integer NOT NULL,
	"next_version" integer NOT NULL,
	"operation_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customer_activity_kind" CHECK ("app"."customer_activity"."kind" IN ('customer.create','customer.update','customer.archive','customer.restore','wearer.create','wearer.update','wearer.archive','wearer.restore')),
	CONSTRAINT "customer_activity_versions" CHECK ("app"."customer_activity"."previous_version">=0 AND "app"."customer_activity"."next_version">"app"."customer_activity"."previous_version"),
	CONSTRAINT "customer_activity_fields" CHECK (cardinality("app"."customer_activity"."changed_fields")<=30)
);
--> statement-breakpoint
ALTER TABLE "app"."customer_activity" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."customer_duplicate_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"command_kind" text NOT NULL,
	"phone" text NOT NULL,
	"draft_hash" text NOT NULL,
	"candidate_fingerprint" text NOT NULL,
	"candidate_ids" uuid[] NOT NULL,
	"excluded_customer_id" uuid,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_operation_id" uuid,
	CONSTRAINT "customer_review_kind" CHECK ("app"."customer_duplicate_reviews"."command_kind" IN ('customer.create','customer.update')),
	CONSTRAINT "customer_review_phone" CHECK ("app"."customer_duplicate_reviews"."phone" ~ '^[+][1-9][0-9]{6,14}$'),
	CONSTRAINT "customer_review_hash" CHECK ("app"."customer_duplicate_reviews"."draft_hash" ~ '^v1:[a-f0-9]{64}$')
);
--> statement-breakpoint
ALTER TABLE "app"."customer_duplicate_reviews" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."customer_request_budgets" (
	"tenant_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"principal_id" uuid NOT NULL,
	"minute" timestamp with time zone NOT NULL,
	"checks" integer DEFAULT 0 NOT NULL,
	"leases" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "customer_request_budgets_tenant_id_location_id_principal_id_minute_pk" PRIMARY KEY("tenant_id","location_id","principal_id","minute"),
	CONSTRAINT "customer_budget_checks" CHECK ("app"."customer_request_budgets"."checks" BETWEEN 0 AND 30),
	CONSTRAINT "customer_budget_leases" CHECK (jsonb_typeof("app"."customer_request_budgets"."leases")='object')
);
--> statement-breakpoint
ALTER TABLE "app"."customer_request_budgets" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app"."customer_activity" ADD CONSTRAINT "customer_activity_actor_id_principals_id_fk" FOREIGN KEY ("actor_id") REFERENCES "app"."principals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."customer_activity" ADD CONSTRAINT "customer_activity_tenant_id_location_id_customer_id_customers_tenant_id_location_id_id_fk" FOREIGN KEY ("tenant_id","location_id","customer_id") REFERENCES "app"."customers"("tenant_id","location_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."customer_activity" ADD CONSTRAINT "customer_activity_tenant_id_location_id_customer_id_wearer_id_customer_wearers_tenant_id_location_id_customer_id_id_fk" FOREIGN KEY ("tenant_id","location_id","customer_id","wearer_id") REFERENCES "app"."customer_wearers"("tenant_id","location_id","customer_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."customer_duplicate_reviews" ADD CONSTRAINT "customer_duplicate_reviews_actor_id_principals_id_fk" FOREIGN KEY ("actor_id") REFERENCES "app"."principals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."customer_duplicate_reviews" ADD CONSTRAINT "customer_duplicate_reviews_tenant_id_location_id_locations_tenant_id_id_fk" FOREIGN KEY ("tenant_id","location_id") REFERENCES "app"."locations"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."customer_duplicate_reviews" ADD CONSTRAINT "customer_duplicate_reviews_tenant_id_location_id_excluded_customer_id_customers_tenant_id_location_id_id_fk" FOREIGN KEY ("tenant_id","location_id","excluded_customer_id") REFERENCES "app"."customers"("tenant_id","location_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."customer_request_budgets" ADD CONSTRAINT "customer_request_budgets_principal_id_principals_id_fk" FOREIGN KEY ("principal_id") REFERENCES "app"."principals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."customer_request_budgets" ADD CONSTRAINT "customer_request_budgets_tenant_id_location_id_locations_tenant_id_id_fk" FOREIGN KEY ("tenant_id","location_id") REFERENCES "app"."locations"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "customer_activity_page" ON "app"."customer_activity" USING btree ("tenant_id","location_id","customer_id","created_at","id");--> statement-breakpoint
CREATE INDEX "customer_activity_wearer" ON "app"."customer_activity" USING btree ("tenant_id","location_id","customer_id","wearer_id");--> statement-breakpoint
CREATE INDEX "customer_activity_actor" ON "app"."customer_activity" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "customer_activity_operation" ON "app"."customer_activity" USING btree ("operation_id");--> statement-breakpoint
CREATE INDEX "customer_review_expiry" ON "app"."customer_duplicate_reviews" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "customer_review_actor" ON "app"."customer_duplicate_reviews" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "customer_review_scope" ON "app"."customer_duplicate_reviews" USING btree ("tenant_id","location_id","excluded_customer_id");--> statement-breakpoint
CREATE INDEX "customer_review_operation" ON "app"."customer_duplicate_reviews" USING btree ("consumed_operation_id");--> statement-breakpoint
CREATE INDEX "customer_budget_expiry" ON "app"."customer_request_budgets" USING btree ("minute");--> statement-breakpoint
CREATE INDEX "customer_budget_actor" ON "app"."customer_request_budgets" USING btree ("principal_id");--> statement-breakpoint
CREATE POLICY "migration_access" ON "app"."customer_activity" AS PERMISSIVE FOR ALL TO "fitloom_migrator" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "migration_access" ON "app"."customer_duplicate_reviews" AS PERMISSIVE FOR ALL TO "fitloom_migrator" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "migration_access" ON "app"."customer_request_budgets" AS PERMISSIVE FOR ALL TO "fitloom_migrator" USING (true) WITH CHECK (true);--> statement-breakpoint
ALTER TABLE app.customer_activity FORCE ROW LEVEL SECURITY;
ALTER TABLE app.customer_duplicate_reviews FORCE ROW LEVEL SECURITY;
ALTER TABLE app.customer_request_budgets FORCE ROW LEVEL SECURITY;
REVOKE ALL ON app.customer_activity,app.customer_duplicate_reviews,app.customer_request_budgets FROM PUBLIC,fitloom_web,fitloom_worker,fitloom_auth,fitloom_operator;
ALTER TABLE app.customer_activity ADD CONSTRAINT customer_activity_operation_fk FOREIGN KEY(operation_id) REFERENCES app.command_operations(id);
ALTER TABLE app.customer_duplicate_reviews ADD CONSTRAINT customer_review_operation_fk FOREIGN KEY(consumed_operation_id) REFERENCES app.command_operations(id);
--> statement-breakpoint
CREATE FUNCTION app.customer_admit(manage boolean DEFAULT false, lifecycle boolean DEFAULT false) RETURNS void LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT coalesce(app.has_permission('customers.read'),false) OR (manage AND NOT coalesce(app.has_permission('customers.manage'),false)) OR (lifecycle AND NOT coalesce(app.has_permission('customers.archive'),false)) THEN RAISE EXCEPTION 'Customer access denied' USING ERRCODE='42501'; END IF;
END $$;
CREATE FUNCTION app.customer_scope() RETURNS TABLE(tenant uuid,location uuid,actor uuid) LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT nullif(current_setting('app.tenant_id',true),'')::uuid,nullif(current_setting('app.location_id',true),'')::uuid,nullif(current_setting('app.principal_id',true),'')::uuid
$$;
CREATE FUNCTION app.customer_phone_json(c app.customers) RETURNS jsonb LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT CASE WHEN c.phone_e164 IS NULL THEN 'null'::jsonb ELSE jsonb_build_object('display',c.phone_display,'countryCode',c.phone_country_code,'e164',c.phone_e164,'digits',c.phone_digits) END
$$;
CREATE FUNCTION app.customer_profile_json(c app.customers) RETURNS jsonb LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT jsonb_build_object('name',c.name,'phone',app.customer_phone_json(c),'email',c.email,'address',CASE WHEN c.address_country_code IS NULL THEN 'null'::jsonb ELSE jsonb_build_object('line1',c.address_line1,'line2',c.address_line2,'city',c.city,'region',c.region,'postalCode',c.postal_code,'countryCode',c.address_country_code) END,'taxCountryCode',c.tax_country_code,'gstin',c.gstin,'segment',c.segment,'notes',c.notes,'preferences',jsonb_build_object('fit',c.fit_notes,'fabric',c.fabric_notes,'design',c.design_notes),'tags',(SELECT coalesce(jsonb_agg(label ORDER BY normalized_tag),'[]'::jsonb) FROM app.customer_tags WHERE (tenant_id,location_id,customer_id)=(c.tenant_id,c.location_id,c.id)))
$$;
CREATE FUNCTION app.customer_wearer_profile(w app.customer_wearers) RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT jsonb_build_object('name',w.name,'relationship',w.relationship,'birthday',w.birthday,'gender',CASE w.gender_kind WHEN 'unspecified' THEN jsonb_build_object('kind','unspecified') ELSE jsonb_build_object('kind','self-described','description',w.gender_description) END,'height',CASE WHEN w.height_value IS NULL THEN 'null'::jsonb ELSE jsonb_build_object('value',w.height_value,'unit',w.height_unit) END,'weight',CASE WHEN w.weight_value IS NULL THEN 'null'::jsonb ELSE jsonb_build_object('value',w.weight_value,'unit',w.weight_unit) END,'notes',w.notes,'preferences',jsonb_build_object('fit',w.fit_notes,'fabric',w.fabric_notes,'design',w.design_notes))
$$;
CREATE FUNCTION app.customer_summary(c app.customers) RETURNS jsonb LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT jsonb_build_object('id',c.id,'name',c.name,'phone',app.customer_phone_json(c),'segment',c.segment,'archivedAt',c.archived_at,'version',c.version,'activeWearerCount',CASE WHEN c.archived_at IS NULL THEN (SELECT count(*) FROM app.customer_wearers w WHERE (w.tenant_id,w.location_id,w.customer_id)=(c.tenant_id,c.location_id,c.id) AND w.archived_at IS NULL) ELSE 0 END,'savedWearerCount',(SELECT count(*) FROM app.customer_wearers w WHERE (w.tenant_id,w.location_id,w.customer_id)=(c.tenant_id,c.location_id,c.id)))
$$;
CREATE FUNCTION app.customer_get(identity uuid, locked boolean DEFAULT false) RETURNS app.customers LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c app.customers; s record;
BEGIN
 SELECT * INTO s FROM app.customer_scope();
 IF locked THEN SELECT * INTO c FROM app.customers WHERE (tenant_id,location_id,id)=(s.tenant,s.location,identity) FOR UPDATE NOWAIT;
 ELSE SELECT * INTO c FROM app.customers WHERE (tenant_id,location_id,id)=(s.tenant,s.location,identity); END IF;
 IF c.id IS NULL THEN RAISE EXCEPTION 'Customer unavailable' USING ERRCODE='FC002'; END IF;
 RETURN c;
END $$;
CREATE FUNCTION app.customer_page(q jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb; s record; needle text:=app.normalize_customer_name(q->>'search'); digits text; off integer:=(q->>'offset')::integer; lim integer:=(q->>'limit')::integer;
BEGIN
 PERFORM app.customer_admit(); SELECT * INTO s FROM app.customer_scope();
 PERFORM app.master_keys(q,ARRAY['status','segment','offset','limit','search','tags'],ARRAY['query']);
 PERFORM app.master_require(q->>'status' IN ('active','archived','all') AND off BETWEEN 0 AND 100000 AND lim BETWEEN 1 AND 50 AND char_length(needle)<=120 AND jsonb_typeof(q->'tags')='array' AND jsonb_array_length(q->'tags')<=5,ARRAY['query']);
 needle:=replace(replace(replace(needle,'\','\\'),'%','\%'),'_','\_'); digits:=regexp_replace(q->>'search','[^0-9]','','g');
 WITH filtered AS MATERIALIZED (
 SELECT c.* FROM app.customers c WHERE (c.tenant_id,c.location_id)=(s.tenant,s.location)
 AND (q->>'status'='all' OR (q->>'status'='active')=(c.archived_at IS NULL))
 AND (q->>'segment' IS NULL OR c.segment=q->>'segment')
 AND (needle='' OR c.normalized_name LIKE '%'||needle||'%' ESCAPE '\' OR (digits<>'' AND c.phone_digits LIKE '%'||digits||'%'))
 AND NOT EXISTS(SELECT FROM jsonb_array_elements_text(q->'tags') tag WHERE NOT EXISTS(SELECT FROM app.customer_tags t WHERE (t.tenant_id,t.location_id,t.customer_id)=(c.tenant_id,c.location_id,c.id) AND t.normalized_tag=app.normalize_customer_name(tag)))
 ), page AS (SELECT * FROM filtered ORDER BY normalized_name,id OFFSET off LIMIT lim)
 SELECT jsonb_build_object('items',(SELECT coalesce(jsonb_agg(app.customer_summary(p::app.customers) ORDER BY p.normalized_name,p.id),'[]'::jsonb) FROM page p),'total',count(*),'nextOffset',CASE WHEN off+lim<count(*) AND off+lim<=100000 THEN off+lim END) INTO result FROM filtered;
 RETURN result;
END $$;
CREATE FUNCTION app.customer_wearers_page(identity uuid,off integer,lim integer) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c app.customers; result jsonb;
BEGIN
 PERFORM app.customer_admit(); c:=app.customer_get(identity);
 PERFORM app.master_require(off BETWEEN 0 AND 100000 AND lim BETWEEN 1 AND 50,ARRAY['offset']);
 WITH all_rows AS MATERIALIZED(SELECT * FROM app.customer_wearers WHERE (tenant_id,location_id,customer_id)=(c.tenant_id,c.location_id,c.id)), page AS(SELECT * FROM all_rows ORDER BY normalized_name,id OFFSET off LIMIT lim)
 SELECT jsonb_build_object('items',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',w.id,'profile',app.customer_wearer_profile(w),'version',w.version,'archivedAt',w.archived_at,'effectiveActive',c.archived_at IS NULL AND w.archived_at IS NULL) ORDER BY w.normalized_name,w.id),'[]'::jsonb) FROM page w),'total',count(*),'nextOffset',CASE WHEN off+lim<count(*) AND off+lim<=100000 THEN off+lim END) INTO result FROM all_rows;
 RETURN result;
END $$;
CREATE FUNCTION app.customer_detail(identity uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c app.customers;
BEGIN
 PERFORM app.customer_admit(); c:=app.customer_get(identity);
 RETURN jsonb_build_object('id',c.id,'profile',app.customer_profile_json(c),'version',c.version,'archivedAt',c.archived_at,'wearers',app.customer_wearers_page(identity,0,25),'capabilities',jsonb_build_object('manage',c.archived_at IS NULL AND app.has_permission('customers.manage'),'archive',app.has_permission('customers.archive'),'photosRead',app.has_permission('customers.photos.read'),'photosManage',c.archived_at IS NULL AND app.has_permission('customers.manage') AND app.has_permission('customers.photos.read') AND app.has_permission('customers.photos.manage')));
END $$;
CREATE FUNCTION app.customer_activity_page(identity uuid,off integer,lim integer) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c app.customers; result jsonb; actor uuid:=nullif(current_setting('app.principal_id',true),'')::uuid;
BEGIN
 PERFORM app.customer_admit(); c:=app.customer_get(identity);
 PERFORM app.master_require(off BETWEEN 0 AND 100000 AND lim BETWEEN 1 AND 50,ARRAY['offset']);
 WITH all_rows AS MATERIALIZED(SELECT * FROM app.customer_activity WHERE (tenant_id,location_id,customer_id)=(c.tenant_id,c.location_id,c.id)), page AS(SELECT * FROM all_rows ORDER BY created_at DESC,id DESC OFFSET off LIMIT lim)
 SELECT jsonb_build_object('items',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',a.id,'wearerId',a.wearer_id,'kind',a.kind,'actor',CASE WHEN a.actor_id=actor THEN 'You' ELSE 'Shop staff' END,'changedFields',a.changed_fields,'previousVersion',a.previous_version,'nextVersion',a.next_version,'createdAt',a.created_at) ORDER BY a.created_at DESC,a.id DESC),'[]'::jsonb) FROM page a),'total',count(*),'nextOffset',CASE WHEN off+lim<count(*) AND off+lim<=100000 THEN off+lim END) INTO result FROM all_rows;
 RETURN result;
END $$;
--> statement-breakpoint
CREATE FUNCTION app.customer_maintenance() RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE removed integer;
BEGIN
 WITH gone AS(DELETE FROM app.customer_duplicate_reviews WHERE id IN(SELECT id FROM app.customer_duplicate_reviews WHERE expires_at<=clock_timestamp() ORDER BY expires_at,id LIMIT 100 FOR UPDATE SKIP LOCKED) RETURNING 1) SELECT count(*) INTO removed FROM gone;
 DELETE FROM app.customer_request_budgets WHERE (tenant_id,location_id,principal_id,minute) IN(SELECT tenant_id,location_id,principal_id,minute FROM app.customer_request_budgets WHERE minute<clock_timestamp()-interval '2 minutes' ORDER BY minute LIMIT 100 FOR UPDATE SKIP LOCKED);
 RETURN removed;
END $$;
CREATE FUNCTION app.customer_check_begin(lease boolean DEFAULT true) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE s record; bucket timestamptz:=date_trunc('minute',clock_timestamp()); b app.customer_request_budgets; token uuid:=gen_random_uuid(); active integer;
BEGIN
 PERFORM app.customer_admit(true); SELECT * INTO s FROM app.customer_scope(); PERFORM app.customer_maintenance();
 INSERT INTO app.customer_request_budgets(tenant_id,location_id,principal_id,minute) VALUES(s.tenant,s.location,s.actor,bucket) ON CONFLICT DO NOTHING;
 SELECT * INTO b FROM app.customer_request_budgets WHERE (tenant_id,location_id,principal_id,minute)=(s.tenant,s.location,s.actor,bucket) FOR UPDATE;
 SELECT count(*) INTO active FROM app.customer_request_budgets r CROSS JOIN LATERAL jsonb_each_text(r.leases) l WHERE (r.tenant_id,r.location_id,r.principal_id)=(s.tenant,s.location,s.actor) AND r.minute>=bucket-interval '1 minute' AND l.value::timestamptz>clock_timestamp();
 IF b.checks>=30 OR active>=2 THEN RAISE EXCEPTION 'Customer check limit reached' USING ERRCODE='FC006'; END IF;
 SELECT coalesce(jsonb_object_agg(key,value),'{}'::jsonb) INTO b.leases FROM jsonb_each_text(b.leases) WHERE value::timestamptz>clock_timestamp();
 UPDATE app.customer_request_budgets SET checks=checks+1,leases=b.leases||CASE WHEN lease THEN jsonb_build_object(token,clock_timestamp()+interval '15 seconds') ELSE '{}'::jsonb END WHERE (tenant_id,location_id,principal_id,minute)=(s.tenant,s.location,s.actor,bucket);
 RETURN token;
END $$;
CREATE FUNCTION app.customer_check_end(token uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE s record;
BEGIN
 SELECT * INTO s FROM app.customer_scope();
 UPDATE app.customer_request_budgets SET leases=leases-token::text WHERE (tenant_id,location_id,principal_id)=(s.tenant,s.location,s.actor) AND minute>=clock_timestamp()-interval '2 minutes' AND leases ? token::text;
END $$;
CREATE FUNCTION app.customer_check_use(token uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE s record; changed integer;
BEGIN
 PERFORM app.customer_admit(true); SELECT * INTO s FROM app.customer_scope();
 UPDATE app.customer_request_budgets SET leases=leases-token::text WHERE (tenant_id,location_id,principal_id)=(s.tenant,s.location,s.actor) AND minute>=clock_timestamp()-interval '2 minutes' AND leases ? token::text AND (leases->>token::text)::timestamptz>clock_timestamp();
 GET DIAGNOSTICS changed=ROW_COUNT;
 IF changed<>1 THEN RAISE EXCEPTION 'Customer check lease expired' USING ERRCODE='FC006'; END IF;
END $$;
CREATE FUNCTION app.customer_candidates(phone text,excluded uuid) RETURNS jsonb LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',c.id,'version',c.version) ORDER BY c.id),'[]'::jsonb) FROM app.customers c,app.customer_scope() s WHERE (c.tenant_id,c.location_id)=(s.tenant,s.location) AND c.phone_e164=phone AND (excluded IS NULL OR c.id<>excluded)
$$;
CREATE FUNCTION app.customer_duplicate_check(phone jsonb,excluded uuid,lease uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb; s record;
BEGIN
 PERFORM app.customer_check_use(lease); SELECT * INTO s FROM app.customer_scope();
 PERFORM app.master_keys(phone,ARRAY['display','countryCode','e164','digits'],ARRAY['phone']);
 PERFORM app.master_require(phone->>'e164' ~ '^[+][1-9][0-9]{6,14}$' AND phone->>'digits'=substring(phone->>'e164' FROM 2) AND phone->>'countryCode' ~ '^[A-Z]{2}$' AND app.customer_text_valid(phone->>'display',64,false),ARRAY['phone']);
 IF excluded IS NOT NULL THEN PERFORM app.customer_get(excluded); END IF;
 SELECT jsonb_build_object('candidateCount',count(*),'candidates',(SELECT coalesce(jsonb_agg(jsonb_build_object('customerId',c.id,'name',c.name,'phone',app.customer_phone_json(c),'archivedAt',c.archived_at,'version',c.version) ORDER BY c.normalized_name,c.id),'[]'::jsonb) FROM (SELECT * FROM app.customers WHERE (tenant_id,location_id)=(s.tenant,s.location) AND phone_e164=phone->>'e164' AND (excluded IS NULL OR id<>excluded) ORDER BY normalized_name,id LIMIT 5)c)) INTO result FROM app.customers WHERE (tenant_id,location_id)=(s.tenant,s.location) AND phone_e164=phone->>'e164' AND (excluded IS NULL OR id<>excluded);
 RETURN result;
END $$;
CREATE FUNCTION app.customer_review_read(identity uuid,lease uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r app.customer_duplicate_reviews; s record; candidates jsonb; summaries jsonb;
BEGIN
 PERFORM app.customer_check_use(lease); SELECT * INTO s FROM app.customer_scope(); PERFORM app.customer_maintenance();
 SELECT * INTO r FROM app.customer_duplicate_reviews WHERE id=identity AND (tenant_id,location_id,actor_id)=(s.tenant,s.location,s.actor);
 IF r.id IS NULL OR r.expires_at<=clock_timestamp() OR r.consumed_operation_id IS NOT NULL THEN RETURN jsonb_build_object('outcome','review-expired','reviewId',identity); END IF;
 candidates:=app.customer_candidates(r.phone,r.excluded_customer_id);
 IF md5(candidates::text)<>r.candidate_fingerprint THEN RETURN jsonb_build_object('outcome','review-stale','reviewId',identity); END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('customerId',c.id,'name',c.name,'phone',app.customer_phone_json(c),'archivedAt',c.archived_at,'version',c.version) ORDER BY c.normalized_name,c.id),'[]'::jsonb) INTO summaries FROM(SELECT * FROM app.customers WHERE (tenant_id,location_id)=(s.tenant,s.location) AND id=ANY(r.candidate_ids) ORDER BY normalized_name,id LIMIT 5)c;
 RETURN jsonb_build_object('outcome','review-required','review',jsonb_build_object('reviewId',r.id,'expiresAt',r.expires_at,'candidateCount',jsonb_array_length(candidates),'candidates',summaries));
END $$;
CREATE FUNCTION app.customer_review_decision(op app.command_operations,payload jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE phone text:=payload->'profile'->'phone'->>'e164'; excluded uuid:=nullif(payload->>'customerId','')::uuid; candidates jsonb; r app.customer_duplicate_reviews; draft text:='v1:'||encode(sha256(convert_to((payload-'intent')::text,'UTF8')),'hex');
BEGIN
 PERFORM app.customer_maintenance(); candidates:=app.customer_candidates(phone,excluded);
 IF payload->'intent'->>'kind'='check-first' THEN
 IF jsonb_array_length(candidates)=0 THEN RETURN NULL; END IF;
 PERFORM app.customer_check_begin(false);
 INSERT INTO app.customer_duplicate_reviews(tenant_id,location_id,actor_id,command_kind,phone,draft_hash,candidate_fingerprint,candidate_ids,excluded_customer_id,expires_at)
 VALUES(op.tenant_id,op.location_id,op.actor_id,op.command_kind,phone,draft,md5(candidates::text),ARRAY(SELECT (value->>'id')::uuid FROM jsonb_array_elements(candidates)),excluded,clock_timestamp()+interval '10 minutes') RETURNING * INTO r;
 RETURN jsonb_build_object('kind','review-required','reviewId',r.id,'expiresAt',r.expires_at,'candidateCount',jsonb_array_length(candidates));
 END IF;
 SELECT * INTO r FROM app.customer_duplicate_reviews WHERE id=(payload->'intent'->>'reviewId')::uuid AND (tenant_id,location_id,actor_id)=(op.tenant_id,op.location_id,op.actor_id) FOR UPDATE NOWAIT;
 IF r.id IS NULL OR r.expires_at<=clock_timestamp() OR r.consumed_operation_id IS NOT NULL THEN RAISE EXCEPTION 'Duplicate review expired' USING ERRCODE='FC004'; END IF;
 IF r.command_kind<>op.command_kind OR r.phone IS DISTINCT FROM phone OR r.draft_hash<>draft OR r.candidate_fingerprint<>md5(candidates::text) THEN RAISE EXCEPTION 'Duplicate review changed' USING ERRCODE='FC005'; END IF;
 UPDATE app.customer_duplicate_reviews SET consumed_operation_id=op.id WHERE id=r.id;
 RETURN NULL;
END $$;
--> statement-breakpoint
CREATE FUNCTION app.customer_validate_profile(p jsonb,wearer boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE k text; v jsonb; today date;
BEGIN
 IF wearer THEN
 PERFORM app.master_keys(p,ARRAY['name','relationship','birthday','gender','height','weight','notes','preferences'],ARRAY['profile']);
 FOREACH k IN ARRAY ARRAY['name','relationship','birthday','notes'] LOOP PERFORM app.master_require(jsonb_typeof(p->k) IN ('string','null'),ARRAY['profile',k]); END LOOP;
 PERFORM app.master_keys(p->'gender',CASE WHEN p->'gender'->>'kind'='unspecified' THEN ARRAY['kind'] ELSE ARRAY['kind','description'] END,ARRAY['profile','gender']);
 PERFORM app.master_require(p->'gender'->>'kind' IN ('unspecified','self-described'),ARRAY['profile','gender']);
 FOREACH k IN ARRAY ARRAY['height','weight'] LOOP
 IF p->k<>'null'::jsonb THEN PERFORM app.master_keys(p->k,ARRAY['value','unit'],ARRAY['profile',k]); PERFORM app.master_require(jsonb_typeof(p->k->'value')='string' AND jsonb_typeof(p->k->'unit')='string',ARRAY['profile',k]); END IF;
 END LOOP;
 SELECT (clock_timestamp() AT TIME ZONE timezone)::date INTO today FROM app.shop_settings WHERE tenant_id=nullif(current_setting('app.tenant_id',true),'')::uuid;
 PERFORM app.master_require(p->>'birthday' IS NULL OR (p->>'birthday')::date<=today,ARRAY['profile','birthday']);
 ELSE
 PERFORM app.master_keys(p,ARRAY['name','phone','email','address','taxCountryCode','gstin','segment','notes','preferences','tags'],ARRAY['profile']);
 FOREACH k IN ARRAY ARRAY['name','email','taxCountryCode','gstin','segment','notes'] LOOP PERFORM app.master_require(jsonb_typeof(p->k) IN ('string','null'),ARRAY['profile',k]); END LOOP;
 IF p->'phone'<>'null'::jsonb THEN
 PERFORM app.master_keys(p->'phone',ARRAY['display','countryCode','e164','digits'],ARRAY['profile','phone']);
 PERFORM app.master_require(jsonb_typeof(p->'phone'->'display')='string' AND jsonb_typeof(p->'phone'->'countryCode')='string' AND jsonb_typeof(p->'phone'->'e164')='string' AND p->'phone'->>'digits'=substring(p->'phone'->>'e164' FROM 2),ARRAY['profile','phone']); END IF;
 IF p->'address'<>'null'::jsonb THEN
 PERFORM app.master_keys(p->'address',ARRAY['line1','line2','city','region','postalCode','countryCode'],ARRAY['profile','address']);
 FOR k,v IN SELECT * FROM jsonb_each(p->'address') LOOP PERFORM app.master_require(jsonb_typeof(v) IN ('string','null'),ARRAY['profile','address',k]); END LOOP;
 PERFORM app.master_require(jsonb_typeof(p->'address'->'countryCode')='string',ARRAY['profile','address','countryCode']); END IF;
 PERFORM app.master_require(jsonb_typeof(p->'tags')='array',ARRAY['profile','tags']);
 PERFORM app.master_require(jsonb_array_length(p->'tags')<=20 AND (SELECT count(*)=count(DISTINCT app.normalize_customer_name(value#>>'{}')) AND coalesce(bool_and(jsonb_typeof(value)='string' AND app.customer_text_valid(value#>>'{}',40,false)),true) FROM jsonb_array_elements(p->'tags')),ARRAY['profile','tags']);
 END IF;
 PERFORM app.master_require(jsonb_typeof(p->'name')='string',ARRAY['profile','name']);
 PERFORM app.master_keys(p->'preferences',ARRAY['fit','fabric','design'],ARRAY['profile','preferences']);
 FOR k,v IN SELECT * FROM jsonb_each(p->'preferences') LOOP PERFORM app.master_require(jsonb_typeof(v) IN ('string','null'),ARRAY['profile','preferences',k]); END LOOP;
END $$;
CREATE FUNCTION app.customer_apply_profile(identity uuid,p jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE s record;
BEGIN
 SELECT * INTO s FROM app.customer_scope();
 UPDATE app.customers SET name=p->>'name',phone_display=p->'phone'->>'display',phone_country_code=p->'phone'->>'countryCode',phone_e164=p->'phone'->>'e164',email=p->>'email',address_line1=p->'address'->>'line1',address_line2=p->'address'->>'line2',city=p->'address'->>'city',region=p->'address'->>'region',postal_code=p->'address'->>'postalCode',address_country_code=p->'address'->>'countryCode',tax_country_code=p->>'taxCountryCode',gstin=p->>'gstin',segment=p->>'segment',notes=p->>'notes',fit_notes=p->'preferences'->>'fit',fabric_notes=p->'preferences'->>'fabric',design_notes=p->'preferences'->>'design' WHERE (tenant_id,location_id,id)=(s.tenant,s.location,identity);
 DELETE FROM app.customer_tags WHERE (tenant_id,location_id,customer_id)=(s.tenant,s.location,identity);
 INSERT INTO app.customer_tags(tenant_id,location_id,customer_id,label) SELECT s.tenant,s.location,identity,value FROM jsonb_array_elements_text(p->'tags');
END $$;
CREATE FUNCTION app.customer_apply_wearer(identity uuid,p jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE s record;
BEGIN
 SELECT * INTO s FROM app.customer_scope();
 UPDATE app.customer_wearers SET name=p->>'name',relationship=p->>'relationship',birthday=(p->>'birthday')::date,gender_kind=p->'gender'->>'kind',gender_description=p->'gender'->>'description',height_value=p->'height'->>'value',height_unit=p->'height'->>'unit',weight_value=p->'weight'->>'value',weight_unit=p->'weight'->>'unit',notes=p->>'notes',fit_notes=p->'preferences'->>'fit',fabric_notes=p->'preferences'->>'fabric',design_notes=p->'preferences'->>'design' WHERE (tenant_id,location_id,id)=(s.tenant,s.location,identity);
END $$;
CREATE FUNCTION app.customer_record_activity(op app.command_operations,customer uuid,wearer uuid,kind text,fields text[],previous integer,next integer) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
 INSERT INTO app.customer_activity(tenant_id,location_id,customer_id,wearer_id,actor_id,kind,changed_fields,previous_version,next_version,operation_id) VALUES(op.tenant_id,op.location_id,customer,wearer,op.actor_id,kind,fields,previous,next,op.id)
$$;
CREATE FUNCTION app.customer_mutate(command_name text,payload jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE op app.command_operations:=app.active_operation(); c app.customers; w app.customer_wearers; identity uuid; child uuid; phone text:=payload->'profile'->'phone'->>'e164'; old_phone text; lock_phone text; p jsonb:=payload->'profile'; previous jsonb; result jsonb; fields text[]; changed boolean:=true; next integer; prior integer:=0; lifecycle boolean:=command_name IN ('customer.archive','customer.restore','wearer.archive','wearer.restore');
BEGIN
 PERFORM app.customer_admit(NOT lifecycle,lifecycle);
 IF command_name<>op.command_kind OR op.owner_kind<>'tenant' OR op.tenant_id IS DISTINCT FROM nullif(current_setting('app.tenant_id',true),'')::uuid OR op.location_id IS DISTINCT FROM nullif(current_setting('app.location_id',true),'')::uuid OR command_name NOT IN ('customer.create','customer.update','customer.archive','customer.restore','wearer.create','wearer.update','wearer.archive','wearer.restore') THEN RAISE EXCEPTION 'Customer command denied' USING ERRCODE='42501'; END IF;
 PERFORM app.master_keys(payload,CASE command_name WHEN 'customer.create' THEN ARRAY['profile','selfWearer','intent'] WHEN 'customer.update' THEN ARRAY['customerId','expectedVersion','profile','intent'] WHEN 'customer.archive' THEN ARRAY['customerId','expectedVersion'] WHEN 'customer.restore' THEN ARRAY['customerId','expectedVersion'] WHEN 'wearer.create' THEN ARRAY['customerId','profile'] WHEN 'wearer.update' THEN ARRAY['customerId','wearerId','expectedVersion','profile'] ELSE ARRAY['customerId','wearerId','expectedVersion'] END,ARRAY['payload']);
 IF NOT lifecycle THEN PERFORM app.customer_validate_profile(p,command_name LIKE 'wearer.%'); END IF;
 IF command_name IN ('customer.create','customer.update') THEN
 PERFORM app.master_keys(payload->'intent',CASE WHEN payload->'intent'->>'kind'='check-first' THEN ARRAY['kind'] ELSE ARRAY['kind','reviewId'] END,ARRAY['intent']);
 PERFORM app.master_require(payload->'intent'->>'kind' IN ('check-first',CASE WHEN command_name='customer.create' THEN 'keep-separate' ELSE 'keep-duplicate-phone' END),ARRAY['intent']); END IF;
 IF command_name='customer.create' THEN
 PERFORM app.master_keys(payload->'selfWearer',CASE WHEN payload->'selfWearer'->>'kind'='none' THEN ARRAY['kind'] ELSE ARRAY['kind','attributes'] END,ARRAY['selfWearer']);
 PERFORM app.master_require(payload->'selfWearer'->>'kind' IN ('self','none'),ARRAY['selfWearer']);
 IF payload->'selfWearer'->>'kind'='self' THEN PERFORM app.customer_validate_profile((payload->'selfWearer'->'attributes')||jsonb_build_object('name',p->>'name'),true); END IF;
 ELSE
 identity:=app.master_uuid(payload->'customerId');
 IF command_name='customer.update' THEN c:=app.customer_get(identity); old_phone:=c.phone_e164; END IF;
 END IF;
 IF command_name='customer.create' OR (command_name='customer.update' AND old_phone IS DISTINCT FROM phone) THEN
 FOR lock_phone IN SELECT DISTINCT value FROM unnest(ARRAY[old_phone,phone]) value WHERE value IS NOT NULL ORDER BY value LOOP
 IF NOT pg_try_advisory_xact_lock(hashtextextended('customer-phone:'||op.tenant_id||':'||op.location_id||':'||lock_phone,0)) THEN RAISE EXCEPTION 'Customer busy' USING ERRCODE='FC001'; END IF;
 END LOOP;
 END IF;
 IF command_name<>'customer.create' THEN
 c:=app.customer_get(identity,true);
 IF command_name LIKE 'customer.%' THEN
 PERFORM app.master_require(app.master_integer(payload->'expectedVersion',1,2147483647),ARRAY['expectedVersion']);
 IF c.version<>(payload->>'expectedVersion')::integer THEN RAISE EXCEPTION 'Customer version conflict' USING ERRCODE='FC003'; END IF;
 prior:=c.version;
 END IF;
 IF command_name NOT IN ('customer.archive','customer.restore') AND c.archived_at IS NOT NULL THEN RAISE EXCEPTION 'Customer is archived' USING ERRCODE='FC003'; END IF;
 END IF;
 IF command_name='customer.create' OR (command_name='customer.update' AND old_phone IS DISTINCT FROM phone AND phone IS NOT NULL) THEN
 IF phone IS NOT NULL THEN
 -- Keep candidate versions stable until the review decision transaction commits.
 PERFORM 1 FROM app.customers WHERE (tenant_id,location_id)=(op.tenant_id,op.location_id) AND phone_e164=phone AND (identity IS NULL OR id<>identity) ORDER BY id FOR SHARE NOWAIT;
 result:=app.customer_review_decision(op,payload); IF result IS NOT NULL THEN RETURN result; END IF;
 ELSIF payload->'intent'->>'kind'<>'check-first' THEN RAISE EXCEPTION 'Duplicate review changed' USING ERRCODE='FC005'; END IF;
 ELSIF command_name='customer.update' AND payload->'intent'->>'kind'<>'check-first' THEN RAISE EXCEPTION 'Duplicate review changed' USING ERRCODE='FC005';
 END IF;
 IF command_name='customer.create' THEN
 identity:=gen_random_uuid(); next:=1; fields:=ARRAY['profile'];
 INSERT INTO app.customers(id,tenant_id,location_id,name,created_by,updated_by,creation_operation_id) VALUES(identity,op.tenant_id,op.location_id,p->>'name',op.actor_id,op.actor_id,op.id);
 PERFORM app.customer_apply_profile(identity,p);
 IF payload->'selfWearer'->>'kind'='self' THEN
 child:=gen_random_uuid(); INSERT INTO app.customer_wearers(id,tenant_id,location_id,customer_id,name,created_by,updated_by,creation_operation_id) VALUES(child,op.tenant_id,op.location_id,identity,p->>'name',op.actor_id,op.actor_id,op.id);
 PERFORM app.customer_apply_wearer(child,(payload->'selfWearer'->'attributes')||jsonb_build_object('name',p->>'name'));
 PERFORM app.customer_record_activity(op,identity,child,'wearer.create',ARRAY['profile'],0,1);
 END IF;
 ELSIF command_name='customer.update' THEN
 previous:=app.customer_profile_json(c);
 p:=jsonb_set(p,'{tags}',(SELECT coalesce(jsonb_agg(value ORDER BY app.normalize_customer_name(value)),'[]'::jsonb) FROM jsonb_array_elements_text(p->'tags')));
 SELECT coalesce(array_agg('profile.'||key ORDER BY key),'{}'::text[]) INTO fields FROM jsonb_each(p) WHERE value IS DISTINCT FROM previous->key;
 changed:=cardinality(fields)>0; next:=c.version;
 IF changed THEN next:=c.version+1; PERFORM app.customer_apply_profile(identity,p); UPDATE app.customers SET version=next,updated_at=clock_timestamp(),updated_by=op.actor_id WHERE id=identity; END IF;
 ELSIF command_name IN ('customer.archive','customer.restore') THEN
 changed:=(c.archived_at IS NULL)=(command_name='customer.archive'); next:=c.version; fields:=ARRAY['archivedAt'];
 IF changed THEN next:=c.version+1; UPDATE app.customers SET archived_at=CASE WHEN command_name='customer.archive' THEN clock_timestamp() END,archived_by=CASE WHEN command_name='customer.archive' THEN op.actor_id END,version=next,updated_at=clock_timestamp(),updated_by=op.actor_id WHERE id=identity; END IF;
 ELSE
 IF command_name='wearer.create' THEN
 child:=gen_random_uuid(); prior:=0; next:=1; fields:=ARRAY['profile'];
 INSERT INTO app.customer_wearers(id,tenant_id,location_id,customer_id,name,created_by,updated_by,creation_operation_id) VALUES(child,op.tenant_id,op.location_id,identity,p->>'name',op.actor_id,op.actor_id,op.id);
 PERFORM app.customer_apply_wearer(child,p);
 ELSE
 child:=app.master_uuid(payload->'wearerId');
 SELECT * INTO w FROM app.customer_wearers WHERE (tenant_id,location_id,customer_id,id)=(op.tenant_id,op.location_id,identity,child) FOR UPDATE NOWAIT;
 IF w.id IS NULL THEN RAISE EXCEPTION 'Wearer unavailable' USING ERRCODE='FC002'; END IF;
 PERFORM app.master_require(app.master_integer(payload->'expectedVersion',1,2147483647),ARRAY['expectedVersion']);
 IF w.version<>(payload->>'expectedVersion')::integer THEN RAISE EXCEPTION 'Wearer version conflict' USING ERRCODE='FC003'; END IF;
 prior:=w.version; next:=w.version;
 IF command_name='wearer.update' THEN
 IF w.archived_at IS NOT NULL THEN RAISE EXCEPTION 'Wearer is archived' USING ERRCODE='FC003'; END IF;
 previous:=app.customer_wearer_profile(w);
 SELECT coalesce(array_agg('profile.'||key ORDER BY key),'{}'::text[]) INTO fields FROM jsonb_each(p) WHERE value IS DISTINCT FROM previous->key;
 changed:=cardinality(fields)>0;
 IF changed THEN PERFORM app.customer_apply_wearer(child,p); END IF;
 ELSE
 changed:=(w.archived_at IS NULL)=(command_name='wearer.archive'); fields:=ARRAY['archivedAt'];
 IF changed THEN UPDATE app.customer_wearers SET archived_at=CASE WHEN command_name='wearer.archive' THEN clock_timestamp() END,archived_by=CASE WHEN command_name='wearer.archive' THEN op.actor_id END WHERE id=child; END IF;
 END IF;
 IF changed THEN next:=w.version+1; UPDATE app.customer_wearers SET version=next,updated_at=clock_timestamp(),updated_by=op.actor_id WHERE id=child; END IF;
 END IF;
 END IF;
 IF changed THEN PERFORM app.customer_record_activity(op,identity,CASE WHEN command_name LIKE 'wearer.%' THEN child END,command_name,fields,prior,next); END IF;
 RETURN CASE WHEN command_name LIKE 'wearer.%' THEN jsonb_build_object('kind','wearer-saved','customerId',identity,'wearerId',child,'version',next,'changed',changed) ELSE jsonb_build_object('kind','saved','customerId',identity,'version',next,'createdWearerId',CASE WHEN command_name='customer.create' THEN child END,'changed',changed) END;
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
  IF command_kind = ANY(ARRAY['customer.create','customer.update','customer.archive','customer.restore','wearer.create','wearer.update','wearer.archive','wearer.restore']) THEN
    IF owner_kind<>'tenant' OR operation_key !~* '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN RAISE EXCEPTION 'Invalid customer operation' USING ERRCODE='22023'; END IF;
    IF NOT pg_try_advisory_xact_lock(hashtextextended('customer-operation:'||owner||':'||command_kind||':'||operation_key,0)) THEN RAISE EXCEPTION 'Customer operation busy' USING ERRCODE='FC001'; END IF;
  END IF;
  INSERT INTO app.command_operations(owner_kind,owner_id,tenant_id,location_id,actor_id,command_kind,operation_key,request_hash,correlation_id)
    VALUES (owner_kind,owner,CASE WHEN owner_kind='tenant' THEN owner END,CASE WHEN owner_kind='tenant' THEN nullif(current_setting('app.location_id',true),'')::uuid END,actor,command_kind,operation_key,request_hash,correlation_id)
    ON CONFLICT ON CONSTRAINT command_operation_identity DO NOTHING;
  SELECT o.* INTO op FROM app.command_operations o WHERE o.owner_kind=claim_operation.owner_kind AND o.owner_id=owner
    AND o.command_kind=claim_operation.command_kind AND o.operation_key=claim_operation.operation_key FOR UPDATE;
  IF command_kind = ANY(ARRAY['customer.create','customer.update','customer.archive','customer.restore','wearer.create','wearer.update','wearer.archive','wearer.restore']) AND (op.actor_id IS DISTINCT FROM actor OR op.location_id IS DISTINCT FROM nullif(current_setting('app.location_id',true),'')::uuid) THEN RAISE EXCEPTION 'Customer operation conflict' USING ERRCODE='FC007'; END IF;
  IF op.request_hash <> request_hash THEN RAISE EXCEPTION 'Operation input conflict' USING ERRCODE='P0002'; END IF;
  IF op.result IS NULL AND op.transaction_id <> txid_current() THEN RAISE EXCEPTION 'Incomplete operation' USING ERRCODE='40001'; END IF;
  PERFORM set_config('app.operation_id',op.id::text,true);
  RETURN QUERY SELECT op.id, op.result;
END $$;
--> statement-breakpoint
DO $$ DECLARE f record; BEGIN
 FOR f IN SELECT p.oid::regprocedure signature FROM pg_proc p JOIN pg_namespace n ON p.pronamespace=n.oid WHERE n.nspname='app' AND p.proname LIKE 'customer\_%' ESCAPE '\' LOOP
 EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,fitloom_web,fitloom_worker,fitloom_auth,fitloom_operator',f.signature);
 END LOOP;
END $$;
GRANT EXECUTE ON FUNCTION app.customer_page(jsonb),app.customer_detail(uuid),app.customer_wearers_page(uuid,integer,integer),app.customer_activity_page(uuid,integer,integer),app.customer_check_begin(boolean),app.customer_check_end(uuid),app.customer_duplicate_check(jsonb,uuid,uuid),app.customer_review_read(uuid,uuid),app.customer_mutate(text,jsonb) TO fitloom_web;
GRANT EXECUTE ON FUNCTION app.customer_maintenance() TO fitloom_worker;
GRANT EXECUTE ON FUNCTION app.customer_admit(boolean,boolean) TO fitloom_web;
