-- Private publication helpers share validation with installation; external wrappers bind commands.
CREATE FUNCTION app.master_service_publish(payload jsonb, command_name text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE op app.command_operations:=app.master_begin(command_name); h app.master_services; identity uuid:=gen_random_uuid(); v uuid:=gen_random_uuid(); rev integer:=1; token integer;
BEGIN
 PERFORM app.master_require(payload->>'mode' IN ('create','update'),ARRAY['mode']);
 PERFORM app.master_keys(payload,CASE payload->>'mode' WHEN 'create' THEN ARRAY['mode','label'] ELSE ARRAY['mode','serviceId','expectedVersion','label'] END,ARRAY['payload']);
 PERFORM app.master_require(app.master_text(payload->'label',100),ARRAY['label']);
 IF payload->>'mode'='update' THEN
 identity:=app.master_uuid(payload->'serviceId');
 PERFORM app.master_require(app.master_integer(payload->'expectedVersion',1,2147483647),ARRAY['expectedVersion']);
 SELECT * INTO h FROM app.master_services WHERE tenant_id=op.tenant_id AND id=identity FOR UPDATE;
 IF h.id IS NULL OR h.version<>(payload->>'expectedVersion')::integer THEN RAISE EXCEPTION 'Master version conflict' USING ERRCODE='P0003'; END IF;
 SELECT revision+1 INTO rev FROM app.master_service_versions WHERE id=h.current_version_id;
 ELSE
 INSERT INTO app.master_services(id,tenant_id,origin,normalized_name,sort_position,version) VALUES(identity,op.tenant_id,'custom',app.normalize_master_name(payload->>'label'),(SELECT coalesce(max(sort_position)+1,0) FROM app.master_services WHERE tenant_id=op.tenant_id),1);
 UPDATE app.master_catalog_state SET version=version+1,updated_at=now() WHERE tenant_id=op.tenant_id;
 END IF;
 INSERT INTO app.master_service_versions(id,tenant_id,service_id,revision,label,author_id,created_location_id,operation_id) VALUES(v,op.tenant_id,identity,rev,payload->>'label',op.actor_id,op.location_id,op.id);
 UPDATE app.master_services SET normalized_name=app.normalize_master_name(payload->>'label'),current_version_id=v,version=coalesce(h.version+1,1) WHERE tenant_id=op.tenant_id AND id=identity;
 SELECT version INTO token FROM app.master_catalog_state WHERE tenant_id=op.tenant_id;
 RETURN jsonb_build_object('serviceId',identity,'serviceVersionId',v,'revision',rev,'version',coalesce(h.version+1,1),'catalogVersion',token);
EXCEPTION WHEN unique_violation THEN RAISE EXCEPTION 'Master name already reserved' USING ERRCODE='23505'; END $$;
CREATE OR REPLACE FUNCTION app.master_service_save(payload jsonb) RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$ SELECT app.master_service_publish(payload,'service.save') $$;
CREATE FUNCTION app.master_garment_publish(payload jsonb, command_name text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE op app.command_operations:=app.master_begin(command_name); h app.garments; identity uuid:=gen_random_uuid(); v uuid:=gen_random_uuid(); rev integer:=1; token integer; d jsonb:=payload->'definition'; item jsonb; ref uuid; rate numeric; label text; live boolean; old_rate numeric; old_label text; position integer; base numeric;
BEGIN
 PERFORM app.master_require(payload->>'mode' IN ('create','update'),ARRAY['mode']);
 PERFORM app.master_keys(payload,CASE payload->>'mode' WHEN 'create' THEN ARRAY['mode','definition','baseRate','currency','serviceOverrides'] ELSE ARRAY['mode','garmentId','expectedVersion','definition','baseRate','currency','serviceOverrides'] END,ARRAY['payload']);
 PERFORM app.master_validate_definition(d);
 PERFORM app.master_require(payload->'currency'='"INR"'::jsonb,ARRAY['currency']); base:=app.master_rate(payload->'baseRate',true);
 PERFORM app.master_require(jsonb_typeof(payload->'serviceOverrides')='array',ARRAY['serviceOverrides']);
 PERFORM app.master_require(jsonb_array_length(payload->'serviceOverrides')=jsonb_array_length(d->'services'),ARRAY['serviceOverrides']);
 FOR item IN SELECT value FROM jsonb_array_elements(payload->'serviceOverrides') LOOP
 PERFORM app.master_keys(item,ARRAY['serviceId','rateOverride'],ARRAY['serviceOverrides']); PERFORM app.master_uuid(item->'serviceId'); PERFORM app.master_rate(item->'rateOverride',true);
 END LOOP;
 PERFORM app.master_require((SELECT count(*)=count(DISTINCT app.master_uuid(value->'serviceId')) FROM jsonb_array_elements(payload->'serviceOverrides')),ARRAY['serviceOverrides']);
 PERFORM app.master_require(NOT EXISTS(SELECT FROM jsonb_array_elements(payload->'serviceOverrides') o WHERE NOT EXISTS(SELECT FROM jsonb_array_elements(d->'services') s WHERE app.master_uuid(s->'serviceId')=app.master_uuid(o->'serviceId'))),ARRAY['serviceOverrides']);
 IF payload->>'mode'='update' THEN
 identity:=app.master_uuid(payload->'garmentId');
 PERFORM app.master_require(app.master_integer(payload->'expectedVersion',1,2147483647),ARRAY['expectedVersion']);
 SELECT * INTO h FROM app.garments WHERE tenant_id=op.tenant_id AND id=identity FOR UPDATE;
 IF h.id IS NULL OR h.version<>(payload->>'expectedVersion')::integer THEN RAISE EXCEPTION 'Master version conflict' USING ERRCODE='P0003'; END IF;
 SELECT revision+1 INTO rev FROM app.garment_versions WHERE id=h.current_version_id;
 ELSE
 INSERT INTO app.garments(id,tenant_id,origin,normalized_name,applicability,sort_position,version) VALUES(identity,op.tenant_id,'custom',app.normalize_master_name(d->>'label'),d->>'applicability',(SELECT coalesce(max(sort_position)+1,0) FROM app.garments WHERE tenant_id=op.tenant_id),1);
 UPDATE app.master_catalog_state SET version=version+1,updated_at=now() WHERE tenant_id=op.tenant_id;
 END IF;
 IF d->'sourceVersionId'<>'null'::jsonb THEN PERFORM app.master_require(EXISTS(SELECT FROM app.garment_versions WHERE tenant_id=op.tenant_id AND garment_id=identity AND id=app.master_uuid(d->'sourceVersionId')),ARRAY['sourceVersionId']); END IF;
 -- Validate all nodes before writing registry state. Section/group owners insert before options.
 PERFORM app.master_require((SELECT count(*)=count(DISTINCT node_id) FROM app.master_definition_nodes(d)),ARRAY['definition']);
 IF EXISTS(SELECT FROM app.master_definition_nodes(d) n JOIN app.garment_schema_identities r ON (r.tenant_id,r.garment_id,r.node_id)=(op.tenant_id,identity,n.node_id) WHERE r.signature IS DISTINCT FROM n.signature OR r.node_kind<>n.node_kind OR r.retired_revision IS NOT NULL) THEN RAISE EXCEPTION 'Schema identity conflict' USING ERRCODE='22023'; END IF;
 INSERT INTO app.garment_schema_identities(tenant_id,garment_id,node_id,node_kind,signature,owner_node_id,created_revision)
 SELECT op.tenant_id,identity,node_id,node_kind,signature,owner_node_id,rev FROM app.master_definition_nodes(d) ORDER BY owner_node_id NULLS FIRST ON CONFLICT DO NOTHING;
 UPDATE app.garment_schema_identities r SET retired_revision=rev WHERE tenant_id=op.tenant_id AND garment_id=identity AND retired_revision IS NULL AND NOT EXISTS(SELECT FROM app.master_definition_nodes(d) n WHERE n.node_id=r.node_id);
 -- Active references use current labels. Retired references must be exact locked-current carry-forward.
 position:=0;
 FOR item IN SELECT value FROM jsonb_array_elements(d->'services') LOOP
 ref:=app.master_uuid(item->'serviceId');
 SELECT s.active,sv.label INTO live,label FROM app.master_services s JOIN app.master_service_versions sv ON sv.id=s.current_version_id WHERE s.tenant_id=op.tenant_id AND s.id=ref;
 PERFORM app.master_require(live IS NOT NULL,ARRAY['services',position::text]);
 SELECT app.master_rate(o->'rateOverride',true) INTO rate FROM jsonb_array_elements(payload->'serviceOverrides') o WHERE app.master_uuid(o->'serviceId')=ref;
 IF NOT live THEN
 SELECT saved_label,rate_override INTO old_label,old_rate FROM app.garment_version_services WHERE tenant_id=op.tenant_id AND garment_version_id=h.current_version_id AND service_id=ref;
 PERFORM app.master_require(old_label IS NOT NULL AND old_label=item->>'savedLabel' AND old_rate IS NOT DISTINCT FROM rate,ARRAY['services',position::text]); label:=old_label;
 END IF;
 d:=jsonb_set(d,ARRAY['services',position::text,'savedLabel'],to_jsonb(label)); position:=position+1;
 END LOOP;
 position:=0;
 FOR item IN SELECT value FROM jsonb_array_elements(d->'addons') LOOP
 ref:=app.master_uuid(item->'addonId');
 SELECT a.active,av.label INTO live,label FROM app.master_addons a JOIN app.master_addon_versions av ON av.id=a.current_version_id WHERE a.tenant_id=op.tenant_id AND a.id=ref;
 PERFORM app.master_require(live IS NOT NULL,ARRAY['addons',position::text]);
 IF NOT live THEN
 SELECT saved_label INTO old_label FROM app.garment_version_addons WHERE tenant_id=op.tenant_id AND garment_version_id=h.current_version_id AND addon_id=ref;
 PERFORM app.master_require(old_label IS NOT NULL AND old_label=item->>'savedLabel',ARRAY['addons',position::text]); label:=old_label;
 END IF;
 d:=jsonb_set(d,ARRAY['addons',position::text,'savedLabel'],to_jsonb(label)); position:=position+1;
 END LOOP;
 -- Check the canonical stored representation after server-owned label extraction too.
 PERFORM app.master_require(octet_length(d::text)<=65536,ARRAY['definition']);
 INSERT INTO app.garment_versions(id,tenant_id,garment_id,revision,format_version,definition,base_rate,currency,author_id,created_location_id,operation_id) VALUES(v,op.tenant_id,identity,rev,1,d,base,'INR',op.actor_id,op.location_id,op.id);
 INSERT INTO app.garment_version_services(tenant_id,garment_id,garment_version_id,service_id,position,saved_label,rate_override)
 SELECT op.tenant_id,identity,v,app.master_uuid(s->'serviceId'),n-1,s->>'savedLabel',app.master_rate(o->'rateOverride',true) FROM jsonb_array_elements(d->'services') WITH ORDINALITY AS a(s,n) JOIN jsonb_array_elements(payload->'serviceOverrides') o ON app.master_uuid(s->'serviceId')=app.master_uuid(o->'serviceId');
 INSERT INTO app.garment_version_addons(tenant_id,garment_id,garment_version_id,addon_id,position,saved_label)
 SELECT op.tenant_id,identity,v,app.master_uuid(a->'addonId'),n-1,a->>'savedLabel' FROM jsonb_array_elements(d->'addons') WITH ORDINALITY AS b(a,n);
 UPDATE app.garments SET normalized_name=app.normalize_master_name(d->>'label'),applicability=d->>'applicability',current_version_id=v,version=coalesce(h.version+1,1) WHERE tenant_id=op.tenant_id AND id=identity;
 SELECT version INTO token FROM app.master_catalog_state WHERE tenant_id=op.tenant_id;
 RETURN jsonb_build_object('garmentId',identity,'garmentVersionId',v,'revision',rev,'version',coalesce(h.version+1,1),'catalogVersion',token);
EXCEPTION WHEN unique_violation THEN RAISE EXCEPTION 'Master name or identity conflict' USING ERRCODE='23505'; END $$;
CREATE OR REPLACE FUNCTION app.master_garment_save(payload jsonb) RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$ SELECT app.master_garment_publish(payload,'garment.save') $$;
REVOKE ALL ON FUNCTION app.master_service_publish(jsonb,text),app.master_garment_publish(jsonb,text) FROM PUBLIC;
CREATE FUNCTION app.master_visibility(expected integer, garments_hidden boolean, services_hidden boolean) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE op app.command_operations:=app.master_begin('masters.visibility'); c app.master_catalog_state;
BEGIN
 SELECT * INTO c FROM app.master_catalog_state WHERE tenant_id=op.tenant_id;
 IF c.version IS DISTINCT FROM expected THEN RAISE EXCEPTION 'Catalog version conflict' USING ERRCODE='P0003'; END IF;
 PERFORM app.master_require(garments_hidden IS NOT NULL AND services_hidden IS NOT NULL,ARRAY['visibility']);
 IF (c.hide_standard_garments,c.hide_standard_services) IS DISTINCT FROM (garments_hidden,services_hidden) THEN
 UPDATE app.master_catalog_state SET hide_standard_garments=garments_hidden,hide_standard_services=services_hidden,version=version+1,updated_at=now() WHERE tenant_id=op.tenant_id RETURNING * INTO c;
 END IF;
 RETURN jsonb_build_object('catalogVersion',c.version);
END $$;
CREATE FUNCTION app.master_reorder(kind text, moved uuid, anchor uuid, expected integer) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE op app.command_operations:=app.master_begin('masters.reorder'); token integer; table_name text; original uuid[]; remaining uuid[]; reordered uuid[]; place integer;
BEGIN
 SELECT version INTO token FROM app.master_catalog_state WHERE tenant_id=op.tenant_id;
 IF token IS DISTINCT FROM expected THEN RAISE EXCEPTION 'Catalog version conflict' USING ERRCODE='P0003'; END IF;
 PERFORM app.master_require(kind IN ('garment','service','addon') AND moved IS NOT NULL AND moved IS DISTINCT FROM anchor,ARRAY['reorder']);
 table_name:=CASE kind WHEN 'garment' THEN 'garments' WHEN 'service' THEN 'master_services' ELSE 'master_addons' END;
 EXECUTE format('SELECT array_agg(id ORDER BY sort_position,id) FROM app.%I WHERE tenant_id=$1',table_name) INTO original USING op.tenant_id;
 IF array_position(original,moved) IS NULL OR (anchor IS NOT NULL AND array_position(original,anchor) IS NULL) THEN RAISE EXCEPTION 'Catalog membership conflict' USING ERRCODE='P0003'; END IF;
 remaining:=array_remove(original,moved);
 IF anchor IS NULL THEN reordered:=remaining||moved;
 ELSE place:=array_position(remaining,anchor); reordered:=remaining[1:place-1]||moved||remaining[place:cardinality(remaining)]; END IF;
 IF reordered IS DISTINCT FROM original THEN
 EXECUTE format('UPDATE app.%I h SET sort_position=o.n-1 FROM unnest($2::uuid[]) WITH ORDINALITY o(id,n) WHERE h.tenant_id=$1 AND h.id=o.id',table_name) USING op.tenant_id,reordered;
 UPDATE app.master_catalog_state SET version=version+1,updated_at=now() WHERE tenant_id=op.tenant_id RETURNING version INTO token;
 END IF;
 RETURN jsonb_build_object('catalogVersion',token);
END $$;
CREATE FUNCTION app.master_starters_install(expected integer, bundle jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE op app.command_operations:=app.master_begin('masters.starters.install'); c app.master_catalog_state; item jsonb; result jsonb; identity uuid; key text; changed boolean:=false; services jsonb:='[]'; garments jsonb:='[]'; bindings jsonb; overrides jsonb;
BEGIN
 SELECT * INTO c FROM app.master_catalog_state WHERE tenant_id=op.tenant_id;
 IF c.version IS DISTINCT FROM expected THEN RAISE EXCEPTION 'Catalog version conflict' USING ERRCODE='P0003'; END IF;
 PERFORM app.master_keys(bundle,ARRAY['bundleVersion','services','garments'],ARRAY['bundle']);
 PERFORM app.master_require(bundle->>'bundleVersion'='tailoring-core-v1' AND jsonb_typeof(bundle->'services')='array' AND jsonb_typeof(bundle->'garments')='array',ARRAY['bundle']);
 PERFORM app.master_require(jsonb_array_length(bundle->'services')=2 AND jsonb_array_length(bundle->'garments')=3,ARRAY['bundle']);
 PERFORM app.master_require((SELECT count(DISTINCT value->>'templateKey')=2 AND bool_and(value->>'templateKey' IN ('new-stitching','alteration')) FROM jsonb_array_elements(bundle->'services')),ARRAY['services']);
 PERFORM app.master_require((SELECT count(DISTINCT value->>'templateKey')=3 AND bool_and(value->>'templateKey' IN ('shirt','blouse','trouser')) FROM jsonb_array_elements(bundle->'garments')),ARRAY['garments']);
 FOR item IN SELECT value FROM jsonb_array_elements(bundle->'services') LOOP
 key:=item->>'templateKey';
 SELECT id INTO identity FROM app.master_services WHERE tenant_id=op.tenant_id AND template_key=key;
 IF identity IS NULL THEN
 result:=app.master_service_publish(jsonb_build_object('mode','create','label',item->>'label'),'masters.starters.install'); identity:=(result->>'serviceId')::uuid;
 UPDATE app.master_services SET origin='standard',template_key=key WHERE tenant_id=op.tenant_id AND id=identity; changed:=true;
 END IF;
 services:=services||to_jsonb(identity);
 END LOOP;
 -- A partially installed library can contain retired services. Missing garment copies bind
 -- only active services; existing copies and their inactive bindings are never rewritten.
 SELECT coalesce(jsonb_agg(jsonb_build_object('serviceId',s.id,'savedLabel',v.label) ORDER BY s.sort_position,s.id),'[]'),coalesce(jsonb_agg(jsonb_build_object('serviceId',s.id,'rateOverride',NULL) ORDER BY s.sort_position,s.id),'[]') INTO bindings,overrides
 FROM app.master_services s JOIN app.master_service_versions v ON v.id=s.current_version_id WHERE s.tenant_id=op.tenant_id AND s.template_key IN ('new-stitching','alteration') AND s.active;
 FOR item IN SELECT value FROM jsonb_array_elements(bundle->'garments') LOOP
 key:=item->>'templateKey';
 SELECT id INTO identity FROM app.garments WHERE tenant_id=op.tenant_id AND template_key=key;
 IF identity IS NULL THEN
 result:=app.master_garment_publish(jsonb_build_object('mode','create','definition',jsonb_set(jsonb_set(item->'definition','{services}',bindings),'{addons}','[]'),'baseRate',NULL,'currency','INR','serviceOverrides',overrides),'masters.starters.install'); identity:=(result->>'garmentId')::uuid;
 UPDATE app.garments SET origin='standard',template_key=key WHERE tenant_id=op.tenant_id AND id=identity; changed:=true;
 END IF;
 garments:=garments||to_jsonb(identity);
 END LOOP;
 changed:=changed OR c.starter_bundle_version IS DISTINCT FROM 'tailoring-core-v1';
 UPDATE app.master_catalog_state SET version=c.version+CASE WHEN changed THEN 1 ELSE 0 END,starter_bundle_version='tailoring-core-v1',updated_at=CASE WHEN changed THEN now() ELSE updated_at END WHERE tenant_id=op.tenant_id;
 RETURN jsonb_build_object('catalogVersion',c.version+CASE WHEN changed THEN 1 ELSE 0 END,'garmentIds',garments,'serviceIds',services);
EXCEPTION WHEN unique_violation THEN RAISE EXCEPTION 'Starter name collision' USING ERRCODE='23505',DETAIL=jsonb_build_object('issues',jsonb_build_array(jsonb_build_object('path',ARRAY['starters',key],'message','Starter name is already reserved')))::text;
END $$;
REVOKE ALL ON FUNCTION app.master_visibility(integer,boolean,boolean),app.master_reorder(text,uuid,uuid,integer),app.master_starters_install(integer,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.master_visibility(integer,boolean,boolean),app.master_reorder(text,uuid,uuid,integer),app.master_starters_install(integer,jsonb) TO fitloom_web;
