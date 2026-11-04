-- Source references are verified against immutable content under the full owner tuple.
CREATE FUNCTION app.measurement_mapping_value(source_field jsonb,target_field jsonb,source_value jsonb,decision jsonb) RETURNS jsonb
LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $$
DECLARE sk text:=source_field->>'kind'; tk text:=target_field->>'kind'; rule text:=decision->>'rule'; src_sem text:=source_field->>'semanticId'; dst_sem text:=target_field->>'semanticId'; n numeric; denominator numeric; rounded numeric; mapped uuid; pair jsonb;
BEGIN
 PERFORM app.measurement_require(source_field IS NOT NULL AND target_field IS NOT NULL AND sk=tk AND decision->>'sourceFieldId'=source_field->>'id' AND decision->>'targetFieldId'=target_field->>'id',ARRAY['origin','decisions']);
 IF rule='identity' THEN
  PERFORM app.master_keys(decision,ARRAY['rule','sourceFieldId','targetFieldId','choices'],ARRAY['origin','decisions']);
  PERFORM app.measurement_require(jsonb_typeof(decision->'choices')='array' AND jsonb_array_length(decision->'choices')<=30 AND (src_sem IS NULL OR dst_sem IS NULL OR src_sem=dst_sem) AND (sk<>'length' OR source_field->>'basis'=target_field->>'basis') AND (sk<>'number' OR source_field->>'unit'=target_field->>'unit'),ARRAY['origin','decisions']);
  FOR pair IN SELECT value FROM jsonb_array_elements(decision->'choices') LOOP
   PERFORM app.master_keys(pair,ARRAY['sourceChoiceId','targetChoiceId'],ARRAY['origin','decisions','choices']);
   PERFORM app.measurement_require(sk='select' AND EXISTS(SELECT FROM jsonb_array_elements(source_field->'choices') s WHERE s->>'id'=pair->>'sourceChoiceId') AND EXISTS(SELECT FROM jsonb_array_elements(target_field->'choices') t WHERE t->>'id'=pair->>'targetChoiceId'),ARRAY['origin','decisions','choices']);
  END LOOP;
  PERFORM app.measurement_require((SELECT count(*)=count(DISTINCT value->>'sourceChoiceId') FROM jsonb_array_elements(decision->'choices')),ARRAY['origin','decisions','choices']);
  IF source_value IS NULL THEN RETURN NULL; END IF;
  IF sk='select' THEN
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
CREATE FUNCTION app.measurement_verified_origin(t uuid,l uuid,c uuid,w uuid,destination uuid,target_ref jsonb,schema jsonb,custom jsonb,vals jsonb,label text,measured date,notes jsonb,source_note jsonb,origin jsonb) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE source app.measurement_versions; header app.measurement_profiles; d jsonb; sf jsonb; tf jsonb; sv jsonb; actual jsonb; mapped jsonb; all_fields jsonb:=(schema->'fields')||custom; changes jsonb:='[]'; metadata jsonb:='[]'; f jsonb; expected_field jsonb; custom_changed boolean:=false;
BEGIN
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

CREATE OR REPLACE FUNCTION app.measurement_version_valid() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE h app.measurement_profiles; prior app.measurement_versions; expected jsonb; d jsonb:=NEW.document;
BEGIN
 SELECT * INTO h FROM app.measurement_profiles WHERE (tenant_id,location_id,customer_id,wearer_id,id)=(NEW.tenant_id,NEW.location_id,NEW.customer_id,NEW.wearer_id,NEW.profile_id);
 PERFORM app.measurement_require(h.id IS NOT NULL AND h.garment_id IS NOT DISTINCT FROM NEW.garment_id,ARRAY['profileId']);
 IF h.kind='body' THEN SELECT definition INTO expected FROM app.measurement_body_schemas WHERE version=NEW.body_schema_version;
 ELSE SELECT jsonb_build_object('formatVersion',definition->'formatVersion','label',definition->'label','guidance',definition->'help','sections',definition->'sections','fields',definition->'fields') INTO expected FROM app.garment_versions WHERE (tenant_id,garment_id,id)=(NEW.tenant_id,NEW.garment_id,NEW.garment_version_id); END IF;
 PERFORM app.master_keys(d,ARRAY['schema','label','values','customFields','notes','sourceNote','origin'],ARRAY['document']);
 PERFORM app.measurement_require(jsonb_typeof(d->'label')='string' AND jsonb_typeof(d->'notes') IN ('string','null') AND jsonb_typeof(d->'sourceNote') IN ('string','null') AND expected IS NOT NULL AND d->'schema'=expected AND app.customer_text_valid(d->>'label',120,false) AND d->>'label' IS NOT NULL AND d->>'label'=normalize(btrim(d->>'label'),NFC) AND app.customer_text_valid(d->>'notes',2000,true) AND app.customer_text_valid(d->>'sourceNote',500,false),ARRAY['document']);
 PERFORM app.measurement_require(d->'origin'=app.measurement_verified_origin(NEW.tenant_id,NEW.location_id,NEW.customer_id,NEW.wearer_id,NEW.profile_id,CASE WHEN h.kind='body' THEN jsonb_build_object('kind','body','bundleVersion',NEW.body_schema_version) ELSE jsonb_build_object('kind','garment','garmentId',h.garment_id,'versionId',NEW.garment_version_id) END,d->'schema',d->'customFields',d->'values',d->>'label',NEW.measured_on,d->'notes',d->'sourceNote',(d->'origin')-'manualFieldIds'-'editedMetadata'),ARRAY['origin']);
 IF NEW.prior_version_id IS NOT NULL THEN SELECT * INTO prior FROM app.measurement_versions WHERE (tenant_id,location_id,customer_id,wearer_id,profile_id,id)=(NEW.tenant_id,NEW.location_id,NEW.customer_id,NEW.wearer_id,NEW.profile_id,NEW.prior_version_id); END IF;
 PERFORM app.measurement_require((NEW.sequence=1 AND NEW.prior_version_id IS NULL) OR (prior.id IS NOT NULL AND NEW.sequence=prior.sequence+1),ARRAY['sequence']);
 PERFORM app.measurement_validate(d->'schema',d->'customFields',d->'values',coalesce(prior.document->'values','[]'::jsonb),h.kind='body');
 PERFORM app.measurement_require(NOT EXISTS(SELECT FROM app.master_definition_nodes(app.measurement_definition(d->'schema',d->'customFields')) n LEFT JOIN app.measurement_custom_identities r ON r.profile_id=NEW.profile_id AND r.node_id=n.node_id WHERE n.node_kind<>'section' AND (r.node_id IS NULL OR r.signature IS DISTINCT FROM n.signature OR r.introduced_sequence>NEW.sequence OR r.retired_sequence<=NEW.sequence)),ARRAY['customFields']);
 RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION app.measurement_mutate(command_name text,payload jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE op app.command_operations:=app.active_operation(); h app.measurement_profiles; old app.measurement_versions; schema jsonb; doc jsonb; ref jsonb:=payload->'schemaRef'; custom jsonb:=payload->'customFields'; vals jsonb; identity uuid; customer uuid; wearer uuid; vid uuid; lifecycle boolean:=command_name IN ('measurement.archive','measurement.restore'); changed boolean:=true; seq integer:=1; rev integer:=1; today date; tz text; measured date; nodes jsonb;
BEGIN
 PERFORM app.measurement_admit(NOT lifecycle,lifecycle);
 IF op.owner_kind<>'tenant' OR op.command_kind<>command_name OR command_name NOT IN ('measurement.create','measurement.revise','measurement.archive','measurement.restore') OR op.actor_id IS DISTINCT FROM nullif(current_setting('app.principal_id',true),'')::uuid OR op.tenant_id IS DISTINCT FROM nullif(current_setting('app.tenant_id',true),'')::uuid OR op.location_id IS DISTINCT FROM nullif(current_setting('app.location_id',true),'')::uuid THEN RAISE EXCEPTION 'Measurement command denied' USING ERRCODE='42501'; END IF;
 PERFORM app.master_keys(payload,CASE WHEN lifecycle THEN ARRAY['customerId','wearerId','profileId','expectedRevision'] WHEN command_name='measurement.create' THEN ARRAY['customerId','wearerId','profileId','versionId','schemaRef','label','measuredOn','values','customFields','notes','sourceNote','origin'] ELSE ARRAY['customerId','wearerId','profileId','expectedRevision','versionId','schemaRef','label','measuredOn','values','customFields','notes','sourceNote','origin'] END,ARRAY['payload']);
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
 doc:=jsonb_build_object('schema',schema,'label',payload->'label','values',vals,'customFields',custom,'notes',payload->'notes','sourceNote',payload->'sourceNote','origin',app.measurement_verified_origin(op.tenant_id,op.location_id,customer,wearer,identity,ref,schema,custom,vals,payload->>'label',measured,payload->'notes',payload->'sourceNote',payload->'origin'));
 PERFORM app.measurement_require(octet_length(doc::text)<=131072,ARRAY['document']);
 IF command_name='measurement.revise' THEN
  IF old.document=doc AND old.measured_on=measured THEN RETURN jsonb_build_object('kind','measurement-saved','correlationId',op.correlation_id,'profileId',identity,'versionId',old.id,'revision',rev,'sequence',seq,'changed',false); END IF;
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
 UPDATE app.measurement_profiles SET current_version_id=vid,revision=rev,updated_at=clock_timestamp(),updated_by=op.actor_id WHERE id=identity;
 RETURN jsonb_build_object('kind','measurement-saved','correlationId',op.correlation_id,'profileId',identity,'versionId',vid,'revision',rev,'sequence',seq,'changed',true);
END $$;

CREATE FUNCTION app.measurement_compare_sources(customer uuid,wearer uuid,refs jsonb) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE r jsonb; result jsonb:='[]';
BEGIN
 PERFORM app.measurement_owner(customer,wearer);
 PERFORM app.measurement_require(jsonb_typeof(refs)='array' AND jsonb_array_length(refs) BETWEEN 2 AND 4 AND (SELECT count(*)=count(DISTINCT value->>'versionId') FROM jsonb_array_elements(refs)),ARRAY['versions']);
 FOR r IN SELECT value FROM jsonb_array_elements(refs) LOOP
  PERFORM app.master_keys(r,ARRAY['profileId','versionId'],ARRAY['versions']);
  result:=result||jsonb_build_array(app.measurement_detail(customer,wearer,app.master_uuid(r->'profileId'),app.master_uuid(r->'versionId')));
 END LOOP; RETURN result;
END $$;
CREATE FUNCTION app.measurement_capture(customer uuid,wearer uuid,profile uuid,version uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE d jsonb; active boolean; schema_current boolean; s record;
BEGIN
 d:=app.measurement_detail(customer,wearer,profile,version);
 SELECT * INTO s FROM app.customer_scope();
 IF d->'schemaRef'->>'kind'='body' THEN
  active:=true; SELECT current_version=d->'schemaRef'->>'bundleVersion' INTO schema_current FROM app.measurement_body_schema_state WHERE singleton;
 ELSE
  SELECT g.active,g.current_version_id=(d->'schemaRef'->>'versionId')::uuid INTO active,schema_current FROM app.garments g WHERE g.tenant_id=s.tenant AND g.id=(d->'schemaRef'->>'garmentId')::uuid;
 END IF;
 RETURN jsonb_build_object('immutable',d-'revision'-'archivedAt'-'currentVersionId'-'recordedByLabel'-'effectiveActive','eligibility',jsonb_build_object('effectiveActive',d->'effectiveActive','currentVersion',d->'versionId'=d->'currentVersionId','schemaActive',coalesce(active,false),'currentSchema',coalesce(schema_current,false)));
END $$;
CREATE FUNCTION app.measurement_trend(customer uuid,wearer uuid,profile uuid,q jsonb) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE anchor jsonb; field jsonb; scope record; lim integer; first_date date; last_date date; result jsonb;
BEGIN
 PERFORM app.master_keys(q,ARRAY['anchorVersionId','fieldId','from','to','unit','after','limit'],ARRAY['query']);
 anchor:=app.measurement_detail(customer,wearer,profile,app.master_uuid(q->'anchorVersionId'));
 SELECT value INTO field FROM jsonb_array_elements((anchor->'document'->'schema'->'fields')||(anchor->'document'->'customFields')) WHERE value->>'id'=q->>'fieldId';
 PERFORM app.measurement_require(field->>'kind' IN ('length','number') AND app.master_integer(q->'limit',1,50) AND q->>'unit' IN ('in','cm') AND q->>'from' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' AND q->>'to' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$',ARRAY['query']);
 first_date:=(q->>'from')::date;last_date:=(q->>'to')::date;lim:=(q->>'limit')::int;
 PERFORM app.measurement_require(first_date>='0001-01-01'::date AND last_date<='9999-12-31'::date AND last_date-first_date BETWEEN 0 AND 3660,ARRAY['query']);
 IF q->'after'<>'null'::jsonb THEN PERFORM app.master_keys(q->'after',ARRAY['measuredOn','recordedAt','versionId'],ARRAY['after']); PERFORM app.master_uuid(q->'after'->'versionId'); END IF;
 SELECT * INTO scope FROM app.customer_scope();
 WITH candidates AS MATERIALIZED (
  SELECT * FROM app.measurement_versions v WHERE (v.tenant_id,v.location_id,v.customer_id,v.wearer_id,v.profile_id)=(scope.tenant,scope.location,customer,wearer,profile)
   AND v.measured_on BETWEEN first_date AND last_date
   AND (q->'after'='null'::jsonb OR (v.measured_on,v.recorded_at,v.id)>((q->'after'->>'measuredOn')::date,(q->'after'->>'recordedAt')::timestamptz,(q->'after'->>'versionId')::uuid))
  ORDER BY v.measured_on,v.recorded_at,v.id LIMIT lim+1
 ),page AS (SELECT * FROM candidates ORDER BY measured_on,recorded_at,id LIMIT lim),
 projected AS (SELECT p.*,coalesce((SELECT jsonb_agg(f) FROM jsonb_array_elements((p.document->'schema'->'fields')||(p.document->'customFields')) f WHERE f->>'id'=field->>'id' OR (field->>'semanticId' IS NOT NULL AND regexp_replace(f->>'semanticId','^(body|garment)\.','')=regexp_replace(field->>'semanticId','^(body|garment)\.',''))),'[]'::jsonb) matching FROM page p)
 SELECT jsonb_build_object('anchorField',field,'items',coalesce((SELECT jsonb_agg(jsonb_build_object('versionId',id,'measuredOn',measured_on,'recordedAt',recorded_at,'transformed',EXISTS(SELECT FROM jsonb_array_elements(coalesce(document->'origin'->'decisions','[]'::jsonb)) d WHERE d->>'rule'='ease' AND EXISTS(SELECT FROM jsonb_array_elements(matching) f WHERE f->>'id'=d->>'targetFieldId')),'fields',matching,'values',coalesce((SELECT jsonb_agg(v) FROM jsonb_array_elements(document->'values') v WHERE EXISTS(SELECT FROM jsonb_array_elements(matching) f WHERE f->>'id'=v->>'fieldId')),'[]'::jsonb)) ORDER BY measured_on,recorded_at,id) FROM projected),'[]'::jsonb),'next',CASE WHEN (SELECT count(*) FROM candidates)>lim THEN (SELECT jsonb_build_object('measuredOn',measured_on,'recordedAt',recorded_at,'versionId',id) FROM page ORDER BY measured_on DESC,recorded_at DESC,id DESC LIMIT 1) ELSE NULL END) INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION app.measurement_mapping_value(jsonb,jsonb,jsonb,jsonb),app.measurement_verified_origin(uuid,uuid,uuid,uuid,uuid,jsonb,jsonb,jsonb,jsonb,text,date,jsonb,jsonb,jsonb),app.measurement_compare_sources(uuid,uuid,jsonb),app.measurement_capture(uuid,uuid,uuid,uuid),app.measurement_trend(uuid,uuid,uuid,jsonb) FROM PUBLIC,fitloom_web,fitloom_worker,fitloom_auth,fitloom_operator;
GRANT EXECUTE ON FUNCTION app.measurement_compare_sources(uuid,uuid,jsonb),app.measurement_capture(uuid,uuid,uuid,uuid),app.measurement_trend(uuid,uuid,uuid,jsonb) TO fitloom_web;
