-- Price-free entry context and discovery belong to measurement authority, not master management.
CREATE FUNCTION app.measurement_context(customer uuid,wearer uuid,entry boolean DEFAULT false) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE s record; effective boolean; customer_name text; wearer_name text; tz text; today date;
BEGIN
 PERFORM app.measurement_admit(entry); effective:=app.measurement_owner(customer,wearer); SELECT * INTO s FROM app.customer_scope();
 IF entry AND NOT effective THEN RAISE EXCEPTION 'Restore owner before adding measurements' USING ERRCODE='FM002'; END IF;
 SELECT name INTO customer_name FROM app.customers WHERE (tenant_id,location_id,id)=(s.tenant,s.location,customer);
 SELECT name INTO wearer_name FROM app.customer_wearers WHERE (tenant_id,location_id,customer_id,id)=(s.tenant,s.location,customer,wearer);
 SELECT timezone INTO tz FROM app.shop_settings WHERE tenant_id=s.tenant;
 IF tz IS NOT NULL AND EXISTS(SELECT FROM pg_catalog.pg_timezone_names WHERE name=tz) THEN today:=(statement_timestamp() AT TIME ZONE tz)::date; END IF;
 IF entry AND today IS NULL THEN RAISE EXCEPTION 'Shop timezone unavailable' USING ERRCODE='FM006'; END IF;
 RETURN jsonb_build_object('customerId',customer,'wearerId',wearer,'customerName',customer_name,'wearerName',wearer_name,'active',effective,'today',today,'bodySchemaRef',app.measurement_body_current(),'capabilities',jsonb_build_object('manage',effective AND app.has_permission('measurements.manage'),'archive',effective AND app.has_permission('measurements.archive')));
END $$;
CREATE FUNCTION app.measurement_garments(customer uuid,wearer uuid,q jsonb) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE s record; needle text; off integer; lim integer; result jsonb;
BEGIN
 PERFORM app.measurement_owner(customer,wearer); SELECT * INTO s FROM app.customer_scope();
 PERFORM app.master_keys(q,ARRAY['search','offset','limit'],ARRAY['query']);
 PERFORM app.measurement_require(app.master_integer(q->'offset',0,100000) AND app.master_integer(q->'limit',1,50) AND jsonb_typeof(q->'search')='string' AND app.customer_text_valid(nullif(q->>'search',''),120,false),ARRAY['query']);
 off:=(q->>'offset')::integer; lim:=(q->>'limit')::integer; needle:=app.normalize_customer_name(q->>'search');
 WITH filtered AS MATERIALIZED (SELECT g.id,g.current_version_id,v.definition->>'label' label,jsonb_array_length(v.definition->'fields') field_count FROM app.garments g JOIN app.garment_versions v ON (v.tenant_id,v.garment_id,v.id)=(g.tenant_id,g.id,g.current_version_id) WHERE g.tenant_id=s.tenant AND g.active AND (needle='' OR position(needle IN app.normalize_customer_name(v.definition->>'label'))>0)),
 page AS (SELECT * FROM filtered ORDER BY label,id OFFSET off LIMIT lim)
 SELECT jsonb_build_object('items',(SELECT coalesce(jsonb_agg(jsonb_build_object('garmentId',id,'versionId',current_version_id,'label',label,'fieldCount',field_count) ORDER BY label,id),'[]'::jsonb) FROM page),'total',count(*),'nextOffset',CASE WHEN off+lim<count(*) AND off+lim<=100000 THEN off+lim END) INTO result FROM filtered;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION app.measurement_context(uuid,uuid,boolean),app.measurement_garments(uuid,uuid,jsonb) FROM PUBLIC,fitloom_web,fitloom_worker,fitloom_auth,fitloom_operator;
GRANT EXECUTE ON FUNCTION app.measurement_context(uuid,uuid,boolean),app.measurement_garments(uuid,uuid,jsonb) TO fitloom_web;
--> statement-breakpoint
-- An empty garment may have no sections. Custom dimensions get a fixed local section
-- for validation only; the exact saved standard schema remains unchanged.
CREATE OR REPLACE FUNCTION app.measurement_definition(schema jsonb,fields jsonb) RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT jsonb_build_object('formatVersion',1,'label',schema->'label','category','Measurements','applicability','unspecified','iconId',NULL,'help',schema->'guidance','illustrationId',NULL,'sections',CASE WHEN schema->'sections'='[]'::jsonb THEN '[{"id":"0745d19c-3171-44ae-bac3-000000000000","label":"Custom dimensions"}]'::jsonb ELSE schema->'sections' END,'fields',fields,'constructionGroups','[]'::jsonb,'services','[]'::jsonb,'addons','[]'::jsonb,'sourceVersionId',NULL)
$$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.measurement_detail(customer uuid,wearer uuid,profile uuid,version uuid DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE h app.measurement_profiles; v app.measurement_versions; s record; effective boolean;
BEGIN
 effective:=app.measurement_owner(customer,wearer); SELECT * INTO s FROM app.customer_scope();
 SELECT * INTO h FROM app.measurement_profiles WHERE (tenant_id,location_id,customer_id,wearer_id,id)=(s.tenant,s.location,customer,wearer,profile);
 IF h.id IS NULL THEN RAISE EXCEPTION 'Measurement unavailable' USING ERRCODE='FM001'; END IF;
 SELECT * INTO v FROM app.measurement_versions WHERE (tenant_id,location_id,customer_id,wearer_id,profile_id,id)=(s.tenant,s.location,customer,wearer,profile,coalesce(version,h.current_version_id));
 IF v.id IS NULL THEN RAISE EXCEPTION 'Measurement unavailable' USING ERRCODE='FM001'; END IF;
 RETURN jsonb_build_object('profileId',h.id,'customerId',customer,'wearerId',wearer,'revision',h.revision,'archivedAt',h.archived_at,'currentVersionId',h.current_version_id,'versionId',v.id,'sequence',v.sequence,'schemaRef',CASE WHEN h.kind='body' THEN jsonb_build_object('kind','body','bundleVersion',v.body_schema_version) ELSE jsonb_build_object('kind','garment','garmentId',h.garment_id,'versionId',v.garment_version_id) END,'measuredOn',v.measured_on,'recordedAt',v.recorded_at,'recordedBy',v.recorded_by,'recordedByLabel',coalesce((SELECT nullif(left(btrim(u.name),120),'') FROM app.principals actor JOIN public."user" u ON u.id=actor.auth_user_id WHERE actor.id=v.recorded_by),'Staff member'),'priorVersionId',v.prior_version_id,'document',v.document,'effectiveActive',effective AND h.archived_at IS NULL);
END $$;
