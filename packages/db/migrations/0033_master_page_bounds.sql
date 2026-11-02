-- Continuation tokens never exceed the admitted offset range.
CREATE OR REPLACE FUNCTION app.master_register(kind text, filters jsonb, priced boolean) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE tenant uuid:=app.master_read_admit(priced); c app.master_catalog_state; result jsonb;
BEGIN
 PERFORM app.master_require(kind IN ('garment','service','addon'),ARRAY['kind']);
 PERFORM app.master_keys(filters,ARRAY['search','active','origin','applicability','visibility','offset','limit'],ARRAY['filters']);
 PERFORM app.master_require(app.master_text(filters->'search',100,false) AND filters->>'active' IN ('active','inactive','all') AND filters->>'origin' IN ('standard','custom','all') AND filters->>'visibility' IN ('available','all') AND app.master_integer(filters->'offset',0,100000) AND app.master_integer(filters->'limit',1,50) AND (filters->'applicability'='null' OR filters->>'applicability' IN ('masculine','feminine','unisex','unspecified')),ARRAY['filters']);
 SELECT * INTO c FROM app.master_catalog_state WHERE tenant_id=tenant;
 WITH entries AS (
 SELECT g.id,g.active,g.origin,g.normalized_name,g.sort_position,g.applicability,
 jsonb_build_object('id',g.id,'label',v.definition->>'label','active',g.active,'origin',g.origin,'templateKey',g.template_key,'version',g.version,'revision',v.revision,'currentVersionId',v.id,'applicability',g.applicability)||CASE WHEN priced THEN jsonb_build_object('baseRate',v.base_rate::text,'currency',v.currency) ELSE '{}'::jsonb END AS item
 FROM app.garments g JOIN app.garment_versions v ON (v.tenant_id,v.garment_id,v.id)=(g.tenant_id,g.id,g.current_version_id) WHERE kind='garment' AND g.tenant_id=tenant
 UNION ALL
 SELECT s.id,s.active,s.origin,s.normalized_name,s.sort_position,NULL,
 jsonb_build_object('id',s.id,'label',v.label,'active',s.active,'origin',s.origin,'templateKey',s.template_key,'version',s.version,'revision',v.revision,'currentVersionId',v.id)
 FROM app.master_services s JOIN app.master_service_versions v ON (v.tenant_id,v.service_id,v.id)=(s.tenant_id,s.id,s.current_version_id) WHERE kind='service' AND s.tenant_id=tenant
 UNION ALL
 SELECT a.id,a.active,'custom',a.normalized_name,a.sort_position,NULL,
 jsonb_build_object('id',a.id,'label',v.label,'active',a.active,'version',a.version,'revision',v.revision,'currentVersionId',v.id)||CASE WHEN priced THEN jsonb_build_object('amount',v.amount::text,'currency',v.currency) ELSE '{}'::jsonb END
 FROM app.master_addons a JOIN app.master_addon_versions v ON (v.tenant_id,v.addon_id,v.id)=(a.tenant_id,a.id,a.current_version_id) WHERE kind='addon' AND a.tenant_id=tenant
 ), matched AS (SELECT * FROM entries e WHERE
 (filters->>'active'='all' OR e.active=(filters->>'active'='active')) AND (filters->>'origin'='all' OR e.origin=filters->>'origin')
 AND (filters->'applicability'='null' OR e.applicability=filters->>'applicability')
 AND starts_with(e.normalized_name,app.normalize_master_name(filters->>'search'))
 AND (filters->>'visibility'='all' OR e.origin<>'standard' OR NOT coalesce(CASE kind WHEN 'garment' THEN c.hide_standard_garments ELSE c.hide_standard_services END,false)))
 SELECT jsonb_build_object('items',(SELECT coalesce(jsonb_agg(p.item ORDER BY p.sort_position,p.id),'[]') FROM (SELECT * FROM matched ORDER BY sort_position,id LIMIT (filters->>'limit')::integer OFFSET (filters->>'offset')::integer)p),'total',(SELECT count(*) FROM matched),'nextOffset',CASE WHEN (filters->>'offset')::integer+(filters->>'limit')::integer<=100000 AND (SELECT count(*) FROM matched)>(filters->>'offset')::integer+(filters->>'limit')::integer THEN (filters->>'offset')::integer+(filters->>'limit')::integer END,'catalogVersion',coalesce(c.version,0)) INTO result;
 RETURN result;
END $$;
CREATE OR REPLACE FUNCTION app.master_history(kind text, identity uuid, page_offset integer DEFAULT 0) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE tenant uuid:=app.master_read_admit(false); table_name text; parent_name text; result jsonb;
BEGIN
 PERFORM app.page_offset_valid(page_offset);
 IF kind IS NULL OR kind NOT IN ('garment','service','addon') THEN RAISE EXCEPTION 'Invalid master kind' USING ERRCODE='22023'; END IF;
 table_name:=CASE kind WHEN 'garment' THEN 'garment_versions' WHEN 'service' THEN 'master_service_versions' ELSE 'master_addon_versions' END; parent_name:=kind||'_id';
 EXECUTE format('WITH versions AS (SELECT id,revision,author_id AS "authorId",created_location_id AS "createdLocationId",operation_id AS "operationId",created_at AS "createdAt" FROM app.%I WHERE tenant_id=$1 AND %I=$2) SELECT jsonb_build_object(''items'',(SELECT coalesce(jsonb_agg(to_jsonb(p) ORDER BY p.revision DESC),''[]''::jsonb) FROM (SELECT * FROM versions ORDER BY revision DESC LIMIT 50 OFFSET $3)p),''total'',(SELECT count(*) FROM versions),''nextOffset'',CASE WHEN $3+50<=100000 AND (SELECT count(*) FROM versions)>$3+50 THEN $3+50 END,''catalogVersion'',coalesce((SELECT version FROM app.master_catalog_state WHERE tenant_id=$1),0))',table_name,parent_name) INTO result USING tenant,identity,page_offset;
 RETURN result;
END $$;
