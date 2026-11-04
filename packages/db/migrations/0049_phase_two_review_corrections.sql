-- Forward corrections for phase2 review. Existing immutable versions are not rewritten.

--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.measurement_validate(schema jsonb,custom jsonb,vals jsonb,current_vals jsonb,body boolean) RETURNS void LANGUAGE plpgsql SET search_path='' AS $$
DECLARE d jsonb; f jsonb; v jsonb; ch jsonb; all_fields jsonb; n numeric; factor numeric; bound text; path text[]; k text;
BEGIN
 PERFORM app.master_keys(schema,ARRAY['formatVersion','label','guidance','sections','fields'],ARRAY['schema']);
 PERFORM app.master_validate_definition(app.measurement_definition(schema,schema->'fields'));
 PERFORM app.measurement_require(jsonb_typeof(custom)='array' AND jsonb_array_length(custom)<=20,ARRAY['customFields']);
 PERFORM app.master_validate_definition(app.measurement_definition(schema,custom));
 all_fields:=(schema->'fields')||custom;
 d:=app.measurement_definition(schema,all_fields);
 PERFORM app.measurement_require((SELECT count(*)=count(DISTINCT node_id) FROM app.master_definition_nodes(d)),ARRAY['customFields']);
 PERFORM app.measurement_require(NOT body OR NOT EXISTS(SELECT FROM jsonb_array_elements(all_fields) checked_field WHERE checked_field->>'kind'<>'length' OR checked_field->>'basis'<>'body'),ARRAY['customFields']);
 PERFORM app.measurement_require(NOT EXISTS(SELECT FROM jsonb_array_elements(custom) c CROSS JOIN jsonb_array_elements(all_fields) other_field WHERE c->>'id'<>other_field->>'id' AND app.normalize_customer_name(c->>'label')=app.normalize_customer_name(other_field->>'label')),ARRAY['customFields']);
 PERFORM app.measurement_require(jsonb_typeof(vals)='array' AND jsonb_array_length(vals) BETWEEN 1 AND 80,ARRAY['values']);
 PERFORM app.measurement_require((SELECT count(*)=count(DISTINCT app.master_uuid(entered_value->'fieldId')) FROM jsonb_array_elements(vals) entered_value),ARRAY['values']);
 FOR v IN SELECT value FROM jsonb_array_elements(vals) LOOP
  path:=ARRAY['values',v->>'fieldId'];
  SELECT value INTO f FROM jsonb_array_elements(all_fields) WHERE value->>'id'=v->>'fieldId';
  PERFORM app.measurement_require(f IS NOT NULL AND f->>'kind'=v->>'kind',path);
  k:=v->>'kind';
  PERFORM app.master_keys(v,CASE k WHEN 'length' THEN ARRAY['kind','fieldId','decimal','unit'] WHEN 'number' THEN ARRAY['kind','fieldId','decimal'] WHEN 'text' THEN ARRAY['kind','fieldId','text'] WHEN 'boolean' THEN ARRAY['kind','fieldId','value'] WHEN 'select' THEN ARRAY['kind','fieldId','choiceId'] END,path);
  CASE k
   WHEN 'length' THEN
    n:=app.measurement_decimal(v->'decimal',true,path||ARRAY['decimal']);
    PERFORM app.measurement_require(v->>'unit' IN ('in','cm'),path||ARRAY['unit']);
    -- Cross multiplication avoids recurring cm/in division even at 18+6 magnitude.
    factor:=CASE v->>'unit' WHEN 'in' THEN 254 ELSE 100 END;
    FOREACH bound IN ARRAY ARRAY['min','max'] LOOP
     IF f->bound<>'null'::jsonb THEN
      PERFORM app.measurement_require(CASE bound WHEN 'min' THEN n*factor>=(f->>bound)::numeric*CASE WHEN NOT body AND EXISTS(SELECT FROM jsonb_array_elements(schema->'fields') standard_field WHERE standard_field->>'id'=f->>'id') THEN 100 WHEN f->>'displayUnit'='in' THEN 254 ELSE 100 END ELSE n*factor<=(f->>bound)::numeric*CASE WHEN NOT body AND EXISTS(SELECT FROM jsonb_array_elements(schema->'fields') standard_field WHERE standard_field->>'id'=f->>'id') THEN 100 WHEN f->>'displayUnit'='in' THEN 254 ELSE 100 END END,path||ARRAY['decimal']);
     END IF;
    END LOOP;
   WHEN 'number' THEN
    n:=app.measurement_decimal(v->'decimal',f->>'unit'='count',path||ARRAY['decimal']);
    PERFORM app.measurement_require(n=round(n,(f->>'decimalPlaces')::integer) AND (f->>'unit'<>'count' OR n=trunc(n)) AND ((f->>'min') IS NULL OR n>=(f->>'min')::numeric) AND ((f->>'max') IS NULL OR n<=(f->>'max')::numeric),path||ARRAY['decimal']);
   WHEN 'text' THEN
    PERFORM app.measurement_require(jsonb_typeof(v->'text')='string' AND char_length(v->>'text')<=(f->>'maxLength')::integer AND (v->>'text') !~ '[[:cntrl:]]' AND (NOT (f->>'required')::boolean OR length(btrim(v->>'text'))>0),path||ARRAY['text']);
   WHEN 'boolean' THEN PERFORM app.measurement_require(jsonb_typeof(v->'value')='boolean',path||ARRAY['value']);
   WHEN 'select' THEN
    PERFORM app.master_uuid(v->'choiceId');
    SELECT value INTO ch FROM jsonb_array_elements(f->'choices') WHERE value->>'id'=v->>'choiceId';
    PERFORM app.measurement_require(ch IS NOT NULL AND ((ch->>'active')::boolean OR EXISTS(SELECT FROM jsonb_array_elements(current_vals) c WHERE c->>'kind'='select' AND c->>'fieldId'=v->>'fieldId' AND c->>'choiceId'=v->>'choiceId')),path||ARRAY['choiceId']);
   ELSE PERFORM app.measurement_require(false,path||ARRAY['kind']);
  END CASE;
 END LOOP;
 PERFORM app.measurement_require(NOT EXISTS(SELECT FROM jsonb_array_elements(all_fields) required_field WHERE (required_field->>'required')::boolean AND NOT EXISTS(SELECT FROM jsonb_array_elements(vals) entered_value WHERE entered_value->>'fieldId'=required_field->>'id')),ARRAY['values']);
END $$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.measurement_mapping_value(source_field jsonb,target_field jsonb,source_value jsonb,decision jsonb) RETURNS jsonb
LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $$
DECLARE sk text:=source_field->>'kind'; tk text:=target_field->>'kind'; rule text:=decision->>'rule'; src_sem text:=source_field->>'semanticId'; dst_sem text:=target_field->>'semanticId'; n numeric; denominator numeric; rounded numeric; mapped uuid; pair jsonb;
BEGIN
 PERFORM app.measurement_require(source_field IS NOT NULL AND target_field IS NOT NULL AND sk=tk AND decision->>'sourceFieldId'=source_field->>'id' AND decision->>'targetFieldId'=target_field->>'id',ARRAY['origin','decisions']);
 IF rule='identity' THEN
  PERFORM app.master_keys(decision,ARRAY['rule','sourceFieldId','targetFieldId','choices'],ARRAY['origin','decisions']);
  PERFORM app.measurement_require(jsonb_typeof(decision->'choices')='array' AND jsonb_array_length(decision->'choices')<=30 AND (src_sem IS NULL OR dst_sem IS NULL OR src_sem=dst_sem) AND (sk<>'length' OR source_field->>'basis'=target_field->>'basis') AND (sk<>'number' OR source_field->>'unit'=target_field->>'unit'),ARRAY['origin','decisions']);
  FOR pair IN SELECT value FROM jsonb_array_elements(decision->'choices') LOOP
   PERFORM app.master_keys(pair,ARRAY['sourceChoiceId','targetChoiceId'],ARRAY['origin','decisions','choices']);
   PERFORM app.measurement_require(sk='select' AND EXISTS(SELECT FROM jsonb_array_elements(source_field->'choices') s WHERE s->>'id'=pair->>'sourceChoiceId') AND (pair->'targetChoiceId'='null'::jsonb OR EXISTS(SELECT FROM jsonb_array_elements(target_field->'choices') t WHERE t->>'id'=pair->>'targetChoiceId')),ARRAY['origin','decisions','choices']);
  END LOOP;
  PERFORM app.measurement_require((SELECT count(*)=count(DISTINCT value->>'sourceChoiceId') FROM jsonb_array_elements(decision->'choices')),ARRAY['origin','decisions','choices']);
  IF source_value IS NULL THEN RETURN NULL; END IF;
  IF sk='select' THEN
   IF EXISTS(SELECT FROM jsonb_array_elements(decision->'choices') p WHERE p->>'sourceChoiceId'=source_value->>'choiceId' AND p->'targetChoiceId'='null'::jsonb) THEN RETURN NULL; END IF;
   SELECT app.master_uuid(value->'targetChoiceId') INTO mapped FROM jsonb_array_elements(decision->'choices') WHERE value->>'sourceChoiceId'=source_value->>'choiceId';
   mapped:=coalesce(mapped,app.master_uuid(source_value->'choiceId'));
   IF NOT EXISTS(SELECT FROM jsonb_array_elements(target_field->'choices') t WHERE t->>'id'=mapped::text AND (t->>'active')::boolean) THEN RETURN NULL; END IF;
   RETURN (source_value-'fieldId'-'choiceId')||jsonb_build_object('fieldId',target_field->'id','choiceId',mapped);
  END IF;
  RETURN (source_value-'fieldId')||jsonb_build_object('fieldId',target_field->'id');
 END IF;
 PERFORM app.master_keys(decision,ARRAY['rule','sourceFieldId','targetFieldId','decimal','unit','resultUnit','acceptRounding'],ARRAY['origin','decisions']);
 PERFORM app.measurement_require(rule='ease' AND sk='length' AND (source_field->>'basis'=target_field->>'basis' OR (source_field->>'basis'='body' AND target_field->>'basis'='garment')) AND (src_sem IS NULL OR dst_sem IS NULL OR regexp_replace(src_sem,'^(body|garment)\.','')=regexp_replace(dst_sem,'^(body|garment)\.','')) AND decision->>'unit' IN ('in','cm') AND decision->>'resultUnit' IN ('in','cm') AND jsonb_typeof(decision->'acceptRounding')='boolean',ARRAY['origin','decisions']);
 n:=app.measurement_decimal(decision->'decimal',false,ARRAY['origin','decisions','decimal']);
 IF source_value IS NULL THEN RETURN NULL; END IF;
 n:=app.measurement_decimal(source_value->'decimal',true)*CASE source_value->>'unit' WHEN 'in' THEN 254 ELSE 100 END+n*CASE decision->>'unit' WHEN 'in' THEN 254 ELSE 100 END;
 denominator:=CASE decision->>'resultUnit' WHEN 'in' THEN 254 ELSE 100 END;
 PERFORM app.measurement_require(n>=0,ARRAY['origin','decisions']);
 rounded:=round(n/denominator,6);
 PERFORM app.measurement_require((decision->>'acceptRounding')::boolean OR rounded*denominator=n,ARRAY['origin','decisions','acceptRounding']);
 PERFORM app.measurement_decimal(to_jsonb(rounded::text),true,ARRAY['origin','decisions']);
 RETURN jsonb_build_object('kind','length','fieldId',target_field->'id','decimal',rounded::text,'unit',decision->'resultUnit');
END $$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.measurement_verified_origin(t uuid,l uuid,c uuid,w uuid,destination uuid,target_ref jsonb,schema jsonb,custom jsonb,vals jsonb,label text,measured date,notes jsonb,source_note jsonb,origin jsonb) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE source app.measurement_versions; header app.measurement_profiles; d jsonb; sf jsonb; tf jsonb; sv jsonb; actual jsonb; mapped jsonb; all_fields jsonb:=(schema->'fields')||custom; changes jsonb:='[]'; metadata jsonb:='[]'; f jsonb; expected_field jsonb; custom_changed boolean:=false; op app.command_operations; prior_origin jsonb;
BEGIN
 IF origin->>'kind' IN ('retain','imported') THEN
  op:=app.active_operation();
  IF op.command_kind='measurement.revise' THEN
   SELECT v.document->'origin' INTO prior_origin FROM app.measurement_profiles h JOIN app.measurement_versions v ON (v.tenant_id,v.location_id,v.customer_id,v.wearer_id,v.profile_id,v.id)=(h.tenant_id,h.location_id,h.customer_id,h.wearer_id,h.id,h.current_version_id) WHERE (h.tenant_id,h.location_id,h.customer_id,h.wearer_id,h.id)=(t,l,c,w,destination);
  END IF;
  IF origin->>'kind'='retain' THEN
   PERFORM app.master_keys(origin,ARRAY['kind'],ARRAY['origin']);
   PERFORM app.measurement_require(op.command_kind='measurement.revise' AND prior_origin IS NOT NULL,ARRAY['origin']);
   origin:=prior_origin-'manualFieldIds'-'editedMetadata';
   IF origin->>'kind' IN ('copy','mapped') THEN
    origin:=jsonb_set(origin,'{decisions}',coalesce((SELECT jsonb_agg(mapped_decision.value) FROM jsonb_array_elements(origin->'decisions') mapped_decision(value) WHERE EXISTS(SELECT FROM jsonb_array_elements(all_fields) available_field(value) WHERE available_field.value->>'id'=mapped_decision.value->>'targetFieldId')),'[]'::jsonb));
   END IF;
  END IF;
  IF origin->>'kind'='imported' AND op.command_kind='measurement.revise' AND origin=prior_origin THEN RETURN origin; END IF;
 END IF;
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

--> statement-breakpoint
CREATE FUNCTION app.measurement_selection(ref jsonb) RETURNS void LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE s record;
BEGIN
 IF ref->>'kind'<>'garment' THEN RETURN; END IF;
 SELECT * INTO s FROM app.customer_scope();
 IF EXISTS(SELECT FROM app.garments g JOIN app.master_catalog_state c ON c.tenant_id=g.tenant_id WHERE (g.tenant_id,g.id)=(s.tenant,app.master_uuid(ref->'garmentId')) AND g.origin='standard' AND c.hide_standard_garments) THEN RAISE EXCEPTION 'Garment unavailable for new selection' USING ERRCODE='FM001'; END IF;
END $$;
REVOKE ALL ON FUNCTION app.measurement_selection(jsonb) FROM PUBLIC,fitloom_web,fitloom_worker,fitloom_auth,fitloom_operator;

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
 IF command_name='measurement.create' THEN PERFORM app.measurement_selection(ref); END IF;
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
CREATE OR REPLACE FUNCTION app.measurement_import_commit_group(b app.domain_import_batches,r app.domain_import_records) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
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
 PERFORM app.measurement_owner(customer,wearer,true);schema:=app.measurement_intake(ref,true);PERFORM app.measurement_selection(ref);
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

--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.measurement_garments(customer uuid,wearer uuid,q jsonb) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE s record; needle text; off integer; lim integer; result jsonb;
BEGIN
 PERFORM app.measurement_owner(customer,wearer); SELECT * INTO s FROM app.customer_scope();
 PERFORM app.master_keys(q,ARRAY['search','offset','limit'],ARRAY['query']);
 PERFORM app.measurement_require(app.master_integer(q->'offset',0,100000) AND app.master_integer(q->'limit',1,50) AND jsonb_typeof(q->'search')='string' AND app.customer_text_valid(nullif(q->>'search',''),120,false),ARRAY['query']);
 off:=(q->>'offset')::integer; lim:=(q->>'limit')::integer; needle:=app.normalize_customer_name(q->>'search');
 WITH filtered AS MATERIALIZED (SELECT g.id,g.current_version_id,v.definition->>'label' label,jsonb_array_length(v.definition->'fields') field_count FROM app.garments g JOIN app.garment_versions v ON (v.tenant_id,v.garment_id,v.id)=(g.tenant_id,g.id,g.current_version_id) WHERE g.tenant_id=s.tenant AND g.active AND (g.origin<>'standard' OR NOT coalesce((SELECT c.hide_standard_garments FROM app.master_catalog_state c WHERE c.tenant_id=s.tenant),false)) AND (needle='' OR position(needle IN app.normalize_customer_name(v.definition->>'label'))>0)),
 page AS (SELECT * FROM filtered ORDER BY label,id OFFSET off LIMIT lim)
 SELECT jsonb_build_object('items',(SELECT coalesce(jsonb_agg(jsonb_build_object('garmentId',id,'versionId',current_version_id,'label',label,'fieldCount',field_count) ORDER BY label,id),'[]'::jsonb) FROM page),'total',count(*),'nextOffset',CASE WHEN off+lim<count(*) AND off+lim<=100000 THEN off+lim END) INTO result FROM filtered;
 RETURN result;
END $$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.domain_import_schema(ref jsonb,current_required boolean DEFAULT false) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE s record;d jsonb;BEGIN
 PERFORM app.domain_import_admit('measurements');SELECT * INTO s FROM app.customer_scope();
 IF current_required THEN PERFORM app.measurement_selection(ref); RETURN app.measurement_intake(ref); END IF;
 IF ref->>'kind'='body' THEN SELECT definition INTO d FROM app.measurement_body_schemas WHERE version=ref->>'bundleVersion';
 ELSIF ref->>'kind'='garment' THEN SELECT jsonb_build_object('formatVersion',definition->'formatVersion','label',definition->'label','guidance',definition->'help','sections',definition->'sections','fields',definition->'fields') INTO d FROM app.garment_versions WHERE (tenant_id,garment_id,id)=(s.tenant,app.master_uuid(ref->'garmentId'),app.master_uuid(ref->'versionId')); END IF;
 IF d IS NULL THEN RAISE EXCEPTION 'Import schema unavailable' USING ERRCODE='FI001'; END IF;RETURN d;
END $$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.domain_import_schema_choices(q jsonb) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE s record;BEGIN
 PERFORM app.domain_import_admit('measurements');SELECT * INTO s FROM app.customer_scope();
 RETURN jsonb_build_object('body',app.measurement_body_current(),'garments',(
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',g.id,'versionId',g.current_version_id,'label',g.label) ORDER BY g.label,g.id),'[]') FROM (
   SELECT h.id,h.current_version_id,v.definition->>'label' AS label FROM app.garments h JOIN app.garment_versions v ON (v.tenant_id,v.garment_id,v.id)=(h.tenant_id,h.id,h.current_version_id)
   WHERE h.tenant_id=s.tenant AND h.active AND (h.origin<>'standard' OR NOT coalesce((SELECT c.hide_standard_garments FROM app.master_catalog_state c WHERE c.tenant_id=s.tenant),false)) AND v.definition->>'label' ILIKE '%'||replace(replace(replace(coalesce(q->>'search',''),'\','\\'),'%','\%'),'_','\_')||'%'
   ORDER BY v.definition->>'label',h.id LIMIT 25 OFFSET least(100000,greatest(0,coalesce((q->>'offset')::int,0)))
  )g));
END $$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.domain_import_budget(family text,preview boolean) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE s record;b app.domain_import_budgets;token uuid:=gen_random_uuid();live_leases jsonb;
BEGIN
 PERFORM app.domain_import_admit(family);SELECT * INTO s FROM app.customer_scope();
 INSERT INTO app.domain_import_budgets(tenant_id,location_id,actor_id) VALUES(s.tenant,s.location,s.actor) ON CONFLICT DO NOTHING;
 SELECT * INTO b FROM app.domain_import_budgets WHERE (tenant_id,location_id,actor_id)=(s.tenant,s.location,s.actor) FOR UPDATE;
 SELECT coalesce(jsonb_object_agg(key,value),'{}') INTO live_leases FROM jsonb_each(b.leases) WHERE (CASE WHEN jsonb_typeof(value)='object' THEN value->>'expiresAt' ELSE value#>>'{}' END)::timestamptz>clock_timestamp();
 IF b.window_started_at<=clock_timestamp()-interval '60 seconds' THEN b.previews:=0;b.chunks:=0;b.window_started_at:=clock_timestamp();END IF;
 IF (preview AND (b.previews>=5 OR (SELECT count(*) FROM jsonb_object_keys(live_leases))>=2)) OR (NOT preview AND b.chunks>=10) THEN RAISE EXCEPTION 'Import admission limit' USING ERRCODE='FI004';END IF;
 UPDATE app.domain_import_budgets SET window_started_at=b.window_started_at,previews=b.previews+CASE WHEN preview THEN 1 ELSE 0 END,chunks=b.chunks+CASE WHEN preview THEN 0 ELSE 1 END,leases=live_leases||CASE WHEN preview THEN jsonb_build_object(token,clock_timestamp()+interval '30 seconds') ELSE '{}'::jsonb END WHERE (tenant_id,location_id,actor_id)=(s.tenant,s.location,s.actor);
 RETURN token;
END $$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.domain_import_mutate(command_name text,p jsonb,extra jsonb DEFAULT '{}'::jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE op app.command_operations:=app.active_operation();family text;b app.domain_import_batches;r app.domain_import_records;record jsonb;matches jsonb;phones jsonb;ordinal integer:=0;result jsonb;attempt app.domain_import_attempts;identity uuid;new_revision integer;
BEGIN
 PERFORM app.domain_import_authorize(command_name,p);family:=CASE WHEN command_name LIKE 'customer-import.%' THEN 'customers' ELSE 'measurements' END;
 IF op.command_kind<>command_name OR (op.tenant_id,op.location_id,op.actor_id) IS DISTINCT FROM (nullif(current_setting('app.tenant_id',true),'')::uuid,nullif(current_setting('app.location_id',true),'')::uuid,nullif(current_setting('app.principal_id',true),'')::uuid) THEN RAISE EXCEPTION 'Import operation denied' USING ERRCODE='42501'; END IF;
 IF command_name LIKE '%.preview' THEN
  PERFORM app.measurement_require(app.customer_text_valid(p->>'namespace',100,false) AND jsonb_array_length(extra->'parsed'->'groups') BETWEEN 1 AND 200 AND (extra->'parsed'->>'rowCount')::int BETWEEN 1 AND 200 AND extra->'parsed'->>'family'=family,ARRAY['file']);
  IF NOT EXISTS(SELECT FROM app.domain_import_budgets WHERE (tenant_id,location_id,actor_id)=(op.tenant_id,op.location_id,op.actor_id) AND leases ? (extra->>'token') AND (CASE WHEN jsonb_typeof(leases->(extra->>'token'))='object' THEN leases->(extra->>'token')->>'expiresAt' ELSE leases->>(extra->>'token') END)::timestamptz>clock_timestamp()) THEN RAISE EXCEPTION 'Preview reservation expired' USING ERRCODE='FI004'; END IF;
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

--> statement-breakpoint
-- Admission commits before the command transaction acquires a connection.
CREATE FUNCTION app.domain_import_preview_admit(family text,command_name text,operation_key uuid,hash text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE s record;b app.domain_import_budgets;token uuid;lease jsonb;found jsonb;
BEGIN
 PERFORM app.domain_import_admit(family);SELECT * INTO s FROM app.customer_scope();
 IF command_name<>(CASE family WHEN 'customers' THEN 'customer-import.preview' ELSE 'measurement-import.preview' END) OR hash !~ '^v1:[0-9a-f]{64}$' THEN RAISE EXCEPTION 'Preview admission denied' USING ERRCODE='42501'; END IF;
 IF NOT pg_try_advisory_xact_lock(hashtextextended('customer-operation:'||s.tenant||':'||command_name||':'||operation_key,0)) THEN RAISE EXCEPTION 'Preview still active' USING ERRCODE='FI003'; END IF;
 found:=app.domain_import_operation_result(command_name,operation_key,hash);
 IF found IS NOT NULL THEN RETURN jsonb_build_object('kind','replayed'); END IF;
 INSERT INTO app.domain_import_budgets(tenant_id,location_id,actor_id) VALUES(s.tenant,s.location,s.actor) ON CONFLICT DO NOTHING;
 SELECT * INTO b FROM app.domain_import_budgets WHERE (tenant_id,location_id,actor_id)=(s.tenant,s.location,s.actor) FOR UPDATE;
 FOR lease IN SELECT value FROM jsonb_each(b.leases) WHERE jsonb_typeof(value)='object' AND value->>'operationKey'=operation_key::text AND value->>'command'=command_name AND (value->>'expiresAt')::timestamptz>clock_timestamp() LOOP
  IF (lease->>'command',lease->>'hash') IS DISTINCT FROM (command_name,hash) THEN RAISE EXCEPTION 'Preview retry changed' USING ERRCODE='42501'; END IF;
  RAISE EXCEPTION 'Preview still active' USING ERRCODE='FI003';
 END LOOP;
 token:=app.domain_import_budget(family,true);
 UPDATE app.domain_import_budgets SET leases=jsonb_set(leases,ARRAY[token::text],jsonb_build_object('expiresAt',clock_timestamp()+interval '90 seconds','operationKey',operation_key,'command',command_name,'hash',hash)) WHERE (tenant_id,location_id,actor_id)=(s.tenant,s.location,s.actor);
 RETURN jsonb_build_object('kind','admitted','token',token);
END $$;
CREATE FUNCTION app.domain_import_outcomes(family text,identity uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE first jsonb;page jsonb;items jsonb;off integer;
BEGIN
 first:=app.domain_import_status(family,identity,0);items:=first->'items';off:=(first->>'nextOffset')::integer;
 WHILE off IS NOT NULL LOOP
  page:=app.domain_import_status(family,identity,off);items:=items||(page->'items');off:=(page->>'nextOffset')::integer;
 END LOOP;
 RETURN first||jsonb_build_object('items',items,'nextOffset',NULL);
END $$;
CREATE FUNCTION app.measurement_book_garments(customer uuid,wearer uuid,q jsonb) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE s record;off integer;lim integer;needle text;result jsonb;
BEGIN
 PERFORM app.measurement_owner(customer,wearer);SELECT * INTO s FROM app.customer_scope();
 PERFORM app.master_keys(q,ARRAY['search','offset','limit'],ARRAY['query']);
 PERFORM app.measurement_require(app.master_integer(q->'offset',0,100000) AND app.master_integer(q->'limit',1,50) AND jsonb_typeof(q->'search')='string' AND app.customer_text_valid(nullif(q->>'search',''),120,false),ARRAY['query']);
 off:=(q->>'offset')::integer;lim:=(q->>'limit')::integer;needle:=app.normalize_customer_name(q->>'search');
 WITH filtered AS MATERIALIZED(SELECT g.id,g.current_version_id,v.definition->>'label' label,jsonb_array_length(v.definition->'fields') field_count FROM app.garments g JOIN app.garment_versions v ON (v.tenant_id,v.garment_id,v.id)=(g.tenant_id,g.id,g.current_version_id) WHERE g.tenant_id=s.tenant AND EXISTS(SELECT FROM app.measurement_profiles p WHERE (p.tenant_id,p.location_id,p.customer_id,p.wearer_id,p.garment_id)=(s.tenant,s.location,customer,wearer,g.id)) AND (needle='' OR position(needle IN app.normalize_customer_name(v.definition->>'label'))>0)),page AS(SELECT * FROM filtered ORDER BY label,id OFFSET off LIMIT lim)
 SELECT jsonb_build_object('items',(SELECT coalesce(jsonb_agg(jsonb_build_object('garmentId',id,'versionId',current_version_id,'label',label,'fieldCount',field_count) ORDER BY label,id),'[]'::jsonb) FROM page),'total',count(*),'nextOffset',CASE WHEN off+lim<count(*) AND off+lim<=100000 THEN off+lim END) INTO result FROM filtered;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION app.domain_import_preview_admit(text,text,uuid,text),app.domain_import_outcomes(text,uuid),app.measurement_book_garments(uuid,uuid,jsonb) FROM PUBLIC,fitloom_web,fitloom_worker,fitloom_auth,fitloom_operator;
GRANT EXECUTE ON FUNCTION app.domain_import_preview_admit(text,text,uuid,text),app.domain_import_outcomes(text,uuid),app.measurement_book_garments(uuid,uuid,jsonb) TO fitloom_web;
