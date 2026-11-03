-- Internal assembly functions are not executable by runtime roles. Public wrappers fix projection.
CREATE FUNCTION app.master_garment_document(identity uuid, requested_version uuid, priced boolean) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE tenant uuid:=app.master_read_admit(priced); h app.garments; v app.garment_versions; result jsonb;
BEGIN
 SELECT * INTO h FROM app.garments WHERE tenant_id=tenant AND id=identity;
 SELECT * INTO v FROM app.garment_versions WHERE tenant_id=tenant AND garment_id=h.id AND id=coalesce(requested_version,h.current_version_id);
 IF v.id IS NULL THEN RAISE EXCEPTION 'Master unavailable' USING ERRCODE='42501'; END IF;
 result:=jsonb_build_object('garmentId',h.id,'garmentVersionId',v.id,'revision',v.revision,'version',h.version,'definition',v.definition,
 'services',(SELECT coalesce(jsonb_agg(jsonb_build_object('serviceId',b.service_id,'bindingState',CASE WHEN s.active THEN 'active' ELSE 'retired' END) ORDER BY b.position),'[]'::jsonb) FROM app.garment_version_services b JOIN app.master_services s ON (s.tenant_id,s.id)=(b.tenant_id,b.service_id) WHERE b.tenant_id=tenant AND b.garment_version_id=v.id),
 'addons',(SELECT coalesce(jsonb_agg(jsonb_build_object('addonId',b.addon_id,'bindingState',CASE WHEN a.active THEN 'active' ELSE 'retired' END) ORDER BY b.position),'[]'::jsonb) FROM app.garment_version_addons b JOIN app.master_addons a ON (a.tenant_id,a.id)=(b.tenant_id,b.addon_id) WHERE b.tenant_id=tenant AND b.garment_version_id=v.id));
 IF priced THEN result:=result||jsonb_build_object('baseRate',v.base_rate::text,'currency',v.currency,
 'serviceOverrides',(SELECT coalesce(jsonb_agg(jsonb_build_object('serviceId',service_id,'rateOverride',rate_override::text) ORDER BY position),'[]'::jsonb) FROM app.garment_version_services WHERE tenant_id=tenant AND garment_version_id=v.id)); END IF;
 RETURN result;
END $$;
CREATE FUNCTION app.master_garment_schema(identity uuid, requested_version uuid DEFAULT NULL) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$ SELECT app.master_garment_document(identity,requested_version,false) $$;
CREATE FUNCTION app.master_garment_priced(identity uuid, requested_version uuid DEFAULT NULL) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$ SELECT app.master_garment_document(identity,requested_version,true) $$;
CREATE FUNCTION app.master_service_version(identity uuid, requested_version uuid DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE tenant uuid:=app.master_read_admit(false); result jsonb;
BEGIN
 SELECT jsonb_build_object('id',v.id,'serviceId',v.service_id,'label',v.label,'revision',v.revision,'authorId',v.author_id,'createdLocationId',v.created_location_id,'operationId',v.operation_id,'createdAt',v.created_at) INTO result
 FROM app.master_services s JOIN app.master_service_versions v ON (v.tenant_id,v.service_id)=(s.tenant_id,s.id) WHERE s.tenant_id=tenant AND s.id=identity AND v.id=coalesce(requested_version,s.current_version_id);
 IF result IS NULL THEN RAISE EXCEPTION 'Master unavailable' USING ERRCODE='42501'; END IF; RETURN result;
END $$;
CREATE FUNCTION app.master_addon_document(identity uuid, requested_version uuid, priced boolean) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE tenant uuid:=app.master_read_admit(priced); result jsonb; v app.master_addon_versions;
BEGIN
 SELECT av.* INTO v FROM app.master_addons a JOIN app.master_addon_versions av ON (av.tenant_id,av.addon_id)=(a.tenant_id,a.id) WHERE a.tenant_id=tenant AND a.id=identity AND av.id=coalesce(requested_version,a.current_version_id);
 IF v.id IS NULL THEN RAISE EXCEPTION 'Master unavailable' USING ERRCODE='42501'; END IF;
 result:=jsonb_build_object('id',v.id,'addonId',v.addon_id,'label',v.label,'revision',v.revision,'authorId',v.author_id,'createdLocationId',v.created_location_id,'operationId',v.operation_id,'createdAt',v.created_at);
 IF priced THEN result:=result||jsonb_build_object('amount',v.amount::text,'currency',v.currency); END IF; RETURN result;
END $$;
CREATE FUNCTION app.master_addon_schema(identity uuid, requested_version uuid DEFAULT NULL) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$ SELECT app.master_addon_document(identity,requested_version,false) $$;
CREATE FUNCTION app.master_addon_priced(identity uuid, requested_version uuid DEFAULT NULL) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$ SELECT app.master_addon_document(identity,requested_version,true) $$;
CREATE FUNCTION app.master_history(kind text, identity uuid, page_offset integer DEFAULT 0) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE tenant uuid:=app.master_read_admit(false); table_name text; parent_name text; result jsonb;
BEGIN
 PERFORM app.page_offset_valid(page_offset);
 IF kind IS NULL OR kind NOT IN ('garment','service','addon') THEN RAISE EXCEPTION 'Invalid master kind' USING ERRCODE='22023'; END IF;
 table_name:=CASE kind WHEN 'garment' THEN 'garment_versions' WHEN 'service' THEN 'master_service_versions' ELSE 'master_addon_versions' END; parent_name:=kind||'_id';
 EXECUTE format('WITH versions AS (SELECT id,revision,author_id AS "authorId",created_location_id AS "createdLocationId",operation_id AS "operationId",created_at AS "createdAt" FROM app.%I WHERE tenant_id=$1 AND %I=$2) SELECT jsonb_build_object(''items'',(SELECT coalesce(jsonb_agg(to_jsonb(p) ORDER BY p.revision DESC),''[]''::jsonb) FROM (SELECT * FROM versions ORDER BY revision DESC LIMIT 50 OFFSET $3)p),''total'',(SELECT count(*) FROM versions),''nextOffset'',CASE WHEN (SELECT count(*) FROM versions)>$3+50 THEN $3+50 END,''catalogVersion'',coalesce((SELECT version FROM app.master_catalog_state WHERE tenant_id=$1),0))',table_name,parent_name) INTO result USING tenant,identity,page_offset;
 RETURN result;
END $$;
CREATE FUNCTION app.master_catalog() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE tenant uuid:=app.master_read_admit(false); c app.master_catalog_state;
BEGIN
 SELECT * INTO c FROM app.master_catalog_state WHERE tenant_id=tenant;
 RETURN jsonb_build_object('catalogVersion',coalesce(c.version,0),'hideStandardGarments',coalesce(c.hide_standard_garments,false),'hideStandardServices',coalesce(c.hide_standard_services,false),'starterBundleVersion',c.starter_bundle_version,'supportedBundleVersion','tailoring-core-v1','installedTemplateKeys',(SELECT coalesce(jsonb_agg(template_key ORDER BY template_key),'[]'::jsonb) FROM (SELECT template_key FROM app.garments WHERE tenant_id=tenant AND template_key IS NOT NULL UNION ALL SELECT template_key FROM app.master_services WHERE tenant_id=tenant AND template_key IS NOT NULL)k));
END $$;
REVOKE ALL ON FUNCTION app.master_garment_document(uuid,uuid,boolean),app.master_garment_schema(uuid,uuid),app.master_garment_priced(uuid,uuid),app.master_service_version(uuid,uuid),app.master_addon_document(uuid,uuid,boolean),app.master_addon_schema(uuid,uuid),app.master_addon_priced(uuid,uuid),app.master_history(text,uuid,integer),app.master_catalog() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.master_garment_schema(uuid,uuid),app.master_garment_priced(uuid,uuid),app.master_service_version(uuid,uuid),app.master_addon_schema(uuid,uuid),app.master_addon_priced(uuid,uuid),app.master_history(text,uuid,integer),app.master_catalog() TO fitloom_web;
