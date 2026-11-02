CREATE FUNCTION app.master_read_admit(priced boolean) RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE tenant uuid:=nullif(current_setting('app.tenant_id',true),'')::uuid;
BEGIN
 IF priced IS NULL OR NOT coalesce(app.has_permission('masters.read'),false) OR (priced AND NOT coalesce(app.has_permission('masters.rates.read'),false)) THEN
 RAISE EXCEPTION 'Master access denied' USING ERRCODE='42501'; END IF;
 RETURN tenant;
END $$;
CREATE FUNCTION app.master_begin(command_name text) RETURNS app.command_operations LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE op app.command_operations:=app.active_operation();
BEGIN
 PERFORM app.master_read_admit(true);
 IF op.owner_kind IS DISTINCT FROM 'tenant' OR op.command_kind IS DISTINCT FROM command_name OR op.tenant_id IS DISTINCT FROM nullif(current_setting('app.tenant_id',true),'')::uuid OR op.location_id IS DISTINCT FROM nullif(current_setting('app.location_id',true),'')::uuid OR NOT coalesce(app.has_permission('masters.manage'),false) THEN
 RAISE EXCEPTION 'Master management denied' USING ERRCODE='42501'; END IF;
 INSERT INTO app.master_catalog_state(tenant_id) VALUES(op.tenant_id) ON CONFLICT DO NOTHING;
 PERFORM 1 FROM app.master_catalog_state WHERE tenant_id=op.tenant_id FOR UPDATE;
 RETURN op;
END $$;
CREATE FUNCTION app.master_version_validate() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM app.master_validate_definition(NEW.definition);
 PERFORM app.master_require((SELECT count(*)=count(DISTINCT n.node_id) FROM app.master_definition_nodes(NEW.definition) n),ARRAY['definition']);
 IF EXISTS(SELECT FROM app.master_definition_nodes(NEW.definition) n JOIN app.garment_schema_identities r ON (r.tenant_id,r.garment_id,r.node_id)=(NEW.tenant_id,NEW.garment_id,n.node_id) WHERE r.signature IS DISTINCT FROM n.signature OR r.node_kind<>n.node_kind OR r.retired_revision IS NOT NULL) THEN
 RAISE EXCEPTION 'Schema identity conflict' USING ERRCODE='22023'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER definition_valid BEFORE INSERT ON app.garment_versions FOR EACH ROW EXECUTE FUNCTION app.master_version_validate();
CREATE FUNCTION app.master_service_save(payload jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE op app.command_operations:=app.master_begin('service.save'); h app.master_services; identity uuid:=gen_random_uuid(); v uuid:=gen_random_uuid(); rev integer:=1; token integer;
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
CREATE FUNCTION app.master_addon_save(payload jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE op app.command_operations:=app.master_begin('addon.save'); h app.master_addons; identity uuid:=gen_random_uuid(); v uuid:=gen_random_uuid(); rev integer:=1; token integer; amount numeric;
BEGIN
 PERFORM app.master_require(payload->>'mode' IN ('create','update'),ARRAY['mode']);
 PERFORM app.master_keys(payload,CASE payload->>'mode' WHEN 'create' THEN ARRAY['mode','label','amount','currency'] ELSE ARRAY['mode','addonId','expectedVersion','label','amount','currency'] END,ARRAY['payload']);
 PERFORM app.master_require(app.master_text(payload->'label',100) AND payload->'currency'='"INR"'::jsonb,ARRAY['label']); amount:=app.master_rate(payload->'amount',false);
 IF payload->>'mode'='update' THEN
 identity:=app.master_uuid(payload->'addonId');
 PERFORM app.master_require(app.master_integer(payload->'expectedVersion',1,2147483647),ARRAY['expectedVersion']);
 SELECT * INTO h FROM app.master_addons WHERE tenant_id=op.tenant_id AND id=identity FOR UPDATE;
 IF h.id IS NULL OR h.version<>(payload->>'expectedVersion')::integer THEN RAISE EXCEPTION 'Master version conflict' USING ERRCODE='P0003'; END IF;
 SELECT revision+1 INTO rev FROM app.master_addon_versions WHERE id=h.current_version_id;
 ELSE
 INSERT INTO app.master_addons(id,tenant_id,normalized_name,sort_position,version) VALUES(identity,op.tenant_id,app.normalize_master_name(payload->>'label'),(SELECT coalesce(max(sort_position)+1,0) FROM app.master_addons WHERE tenant_id=op.tenant_id),1);
 UPDATE app.master_catalog_state SET version=version+1,updated_at=now() WHERE tenant_id=op.tenant_id;
 END IF;
 INSERT INTO app.master_addon_versions(id,tenant_id,addon_id,revision,label,amount,currency,author_id,created_location_id,operation_id) VALUES(v,op.tenant_id,identity,rev,payload->>'label',amount,'INR',op.actor_id,op.location_id,op.id);
 UPDATE app.master_addons SET normalized_name=app.normalize_master_name(payload->>'label'),current_version_id=v,version=coalesce(h.version+1,1) WHERE tenant_id=op.tenant_id AND id=identity;
 SELECT version INTO token FROM app.master_catalog_state WHERE tenant_id=op.tenant_id;
 RETURN jsonb_build_object('addonId',identity,'addonVersionId',v,'revision',rev,'version',coalesce(h.version+1,1),'catalogVersion',token);
EXCEPTION WHEN unique_violation THEN RAISE EXCEPTION 'Master name already reserved' USING ERRCODE='23505'; END $$;
CREATE FUNCTION app.master_garment_save(payload jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE op app.command_operations:=app.master_begin('garment.save'); h app.garments; identity uuid:=gen_random_uuid(); v uuid:=gen_random_uuid(); rev integer:=1; token integer; d jsonb:=payload->'definition'; item jsonb; ref uuid; rate numeric; label text; live boolean; old_rate numeric; old_label text; position integer; base numeric;
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
-- Fixed wrappers bind the operation kind; callers cannot choose a SQL function/table.
CREATE FUNCTION app.master_lifecycle(kind text, identity uuid, expected_version integer, desired boolean) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE op app.command_operations; table_name text; version_now integer; active_now boolean; token integer; key text;
BEGIN
 IF kind NOT IN ('garment','service','addon') OR kind IS NULL THEN RAISE EXCEPTION 'Invalid master kind' USING ERRCODE='22023'; END IF;
 op:=app.master_begin(kind||'.lifecycle');
 PERFORM app.master_require(identity IS NOT NULL AND expected_version>0 AND desired IS NOT NULL,ARRAY['lifecycle']);
 table_name:=CASE kind WHEN 'garment' THEN 'garments' WHEN 'service' THEN 'master_services' ELSE 'master_addons' END; key:=kind||'Id';
 EXECUTE format('SELECT version,active FROM app.%I WHERE tenant_id=$1 AND id=$2 FOR UPDATE',table_name) INTO version_now,active_now USING op.tenant_id,identity;
 IF version_now IS NULL OR version_now IS DISTINCT FROM expected_version THEN RAISE EXCEPTION 'Master version conflict' USING ERRCODE='P0003'; END IF;
 IF active_now<>desired THEN
 EXECUTE format('UPDATE app.%I SET version=version+1,active=$3 WHERE tenant_id=$1 AND id=$2',table_name) USING op.tenant_id,identity,desired;
 version_now:=version_now+1;
 UPDATE app.master_catalog_state SET version=version+1,updated_at=now() WHERE tenant_id=op.tenant_id;
 END IF;
 SELECT version INTO token FROM app.master_catalog_state WHERE tenant_id=op.tenant_id;
 RETURN jsonb_build_object(key,identity,'active',desired,'version',version_now,'catalogVersion',token);
END $$;
REVOKE ALL ON FUNCTION app.master_read_admit(boolean),app.master_begin(text),app.master_version_validate(),app.master_service_save(jsonb),app.master_addon_save(jsonb),app.master_garment_save(jsonb),app.master_lifecycle(text,uuid,integer,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.master_service_save(jsonb),app.master_addon_save(jsonb),app.master_garment_save(jsonb),app.master_lifecycle(text,uuid,integer,boolean) TO fitloom_web;
