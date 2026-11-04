-- Narrow measurement boundary; runtime roles have no table or internal-helper grants.
CREATE FUNCTION app.measurement_admit(manage boolean DEFAULT false,lifecycle boolean DEFAULT false) RETURNS void LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT coalesce(app.has_permission('workspace.read'),false) OR NOT coalesce(app.has_permission('customers.read'),false) OR NOT coalesce(app.has_permission('measurements.read'),false) OR (manage AND NOT coalesce(app.has_permission('measurements.manage'),false)) OR (lifecycle AND NOT coalesce(app.has_permission('measurements.archive'),false)) THEN RAISE EXCEPTION 'Measurement access denied' USING ERRCODE='42501'; END IF;
END $$;
CREATE FUNCTION app.measurement_require(ok boolean,path text[]) RETURNS void LANGUAGE plpgsql SET search_path='' AS $$
BEGIN IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'Invalid measurement' USING ERRCODE='FM004',DETAIL=jsonb_build_object('issues',jsonb_build_array(jsonb_build_object('path',path,'message','Check this field')))::text; END IF; END $$;
CREATE FUNCTION app.measurement_owner(customer uuid,wearer uuid,locked boolean DEFAULT false) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c app.customers; w app.customer_wearers; s record;
BEGIN
 PERFORM app.measurement_admit(); SELECT * INTO s FROM app.customer_scope();
 c:=app.customer_get(customer,locked);
 IF locked THEN SELECT * INTO w FROM app.customer_wearers WHERE (tenant_id,location_id,customer_id,id)=(s.tenant,s.location,customer,wearer) FOR UPDATE NOWAIT;
 ELSE SELECT * INTO w FROM app.customer_wearers WHERE (tenant_id,location_id,customer_id,id)=(s.tenant,s.location,customer,wearer); END IF;
 IF w.id IS NULL THEN RAISE EXCEPTION 'Measurement owner unavailable' USING ERRCODE='FM001'; END IF;
 IF locked AND (c.archived_at IS NOT NULL OR w.archived_at IS NOT NULL) THEN RAISE EXCEPTION 'Restore owner before changing measurements' USING ERRCODE='FM002'; END IF;
 RETURN c.archived_at IS NULL AND w.archived_at IS NULL;
END $$;
CREATE FUNCTION app.measurement_intake(ref jsonb,locked boolean DEFAULT false) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE g app.garments; current_body text; d jsonb; s record;
BEGIN
 PERFORM app.measurement_admit(); SELECT * INTO s FROM app.customer_scope();
 IF ref->>'kind'='body' THEN
  PERFORM app.master_keys(ref,ARRAY['kind','bundleVersion'],ARRAY['schemaRef']);
  IF locked THEN SELECT current_version INTO current_body FROM app.measurement_body_schema_state WHERE singleton FOR SHARE;
  ELSE SELECT current_version INTO current_body FROM app.measurement_body_schema_state WHERE singleton; END IF;
  IF ref->>'bundleVersion' IS DISTINCT FROM current_body THEN RAISE EXCEPTION 'Measurement schema changed' USING ERRCODE='FM003'; END IF;
  SELECT definition INTO d FROM app.measurement_body_schemas WHERE version=current_body;
 ELSE
  PERFORM app.master_keys(ref,ARRAY['kind','garmentId','versionId'],ARRAY['schemaRef']);
  PERFORM app.measurement_require(ref->>'kind'='garment',ARRAY['schemaRef','kind']);
  IF locked THEN SELECT * INTO g FROM app.garments WHERE tenant_id=s.tenant AND id=app.master_uuid(ref->'garmentId') FOR SHARE NOWAIT;
  ELSE SELECT * INTO g FROM app.garments WHERE tenant_id=s.tenant AND id=app.master_uuid(ref->'garmentId'); END IF;
  IF g.id IS NULL OR NOT g.active THEN RAISE EXCEPTION 'Garment unavailable' USING ERRCODE='FM001'; END IF;
  IF g.current_version_id IS DISTINCT FROM app.master_uuid(ref->'versionId') THEN RAISE EXCEPTION 'Measurement schema changed' USING ERRCODE='FM003'; END IF;
  SELECT jsonb_build_object('formatVersion',v.definition->'formatVersion','label',v.definition->'label','guidance',v.definition->'help','sections',v.definition->'sections','fields',v.definition->'fields') INTO d FROM app.garment_versions v WHERE (v.tenant_id,v.garment_id,v.id)=(s.tenant,g.id,g.current_version_id);
 END IF;
 IF d IS NULL THEN RAISE EXCEPTION 'Measurement schema unavailable' USING ERRCODE='FM001'; END IF;
 RETURN d;
END $$;
CREATE FUNCTION app.measurement_body_current() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb; BEGIN PERFORM app.measurement_admit(); SELECT jsonb_build_object('kind','body','bundleVersion',current_version) INTO result FROM app.measurement_body_schema_state WHERE singleton; RETURN result; END $$;
-- Reuse the closed master field grammar without reading a management projection.
CREATE FUNCTION app.measurement_definition(schema jsonb,fields jsonb) RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT jsonb_build_object('formatVersion',1,'label',schema->'label','category','Measurements','applicability','unspecified','iconId',NULL,'help',schema->'guidance','illustrationId',NULL,'sections',schema->'sections','fields',fields,'constructionGroups','[]'::jsonb,'services','[]'::jsonb,'addons','[]'::jsonb,'sourceVersionId',NULL)
$$;
CREATE FUNCTION app.measurement_decimal(v jsonb,nonnegative boolean DEFAULT false,path text[] DEFAULT ARRAY['decimal']) RETURNS numeric LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $$
DECLARE spelling text:=v#>>'{}';
BEGIN
 PERFORM app.measurement_require(jsonb_typeof(v)='string' AND length(spelling)<=26 AND spelling ~ '^-?(0|[1-9][0-9]{0,17})(\.[0-9]{1,6})?$' AND spelling !~ '^-0(\.0+)?$' AND (NOT nonnegative OR left(spelling,1)<>'-'),path);
 RETURN spelling::numeric;
END $$;
CREATE FUNCTION app.measurement_validate(schema jsonb,custom jsonb,vals jsonb,current_vals jsonb,body boolean) RETURNS void LANGUAGE plpgsql SET search_path='' AS $$
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
      PERFORM app.measurement_require(CASE bound WHEN 'min' THEN n*factor>=(f->>bound)::numeric*CASE f->>'displayUnit' WHEN 'in' THEN 254 ELSE 100 END ELSE n*factor<=(f->>bound)::numeric*CASE f->>'displayUnit' WHEN 'in' THEN 254 ELSE 100 END END,path||ARRAY['decimal']);
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
CREATE FUNCTION app.measurement_current_required() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF EXISTS(SELECT FROM app.measurement_profiles WHERE id=NEW.id AND current_version_id IS NULL) THEN RAISE EXCEPTION 'Current measurement version required' USING ERRCODE='23514'; END IF; RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER current_required AFTER INSERT OR UPDATE ON app.measurement_profiles DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION app.measurement_current_required();
CREATE TRIGGER retained BEFORE DELETE ON app.measurement_profiles FOR EACH ROW EXECUTE FUNCTION app.master_immutable();
CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON app.measurement_versions FOR EACH ROW EXECUTE FUNCTION app.master_immutable();
CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON app.measurement_body_schemas FOR EACH ROW EXECUTE FUNCTION app.master_immutable();
CREATE FUNCTION app.measurement_profile_fixed() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF (NEW.id,NEW.tenant_id,NEW.location_id,NEW.customer_id,NEW.wearer_id,NEW.kind,NEW.garment_id,NEW.creation_operation_id,NEW.created_at,NEW.created_by) IS DISTINCT FROM (OLD.id,OLD.tenant_id,OLD.location_id,OLD.customer_id,OLD.wearer_id,OLD.kind,OLD.garment_id,OLD.creation_operation_id,OLD.created_at,OLD.created_by) THEN RAISE EXCEPTION 'Immutable measurement ownership' USING ERRCODE='23514'; END IF; RETURN NEW;
END $$;
CREATE TRIGGER fixed_owner BEFORE UPDATE ON app.measurement_profiles FOR EACH ROW EXECUTE FUNCTION app.measurement_profile_fixed();
CREATE FUNCTION app.measurement_custom_fixed() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Retained custom identity' USING ERRCODE='23514'; END IF;
 IF (NEW.tenant_id,NEW.location_id,NEW.customer_id,NEW.wearer_id,NEW.profile_id,NEW.node_id,NEW.signature,NEW.introduced_sequence) IS DISTINCT FROM (OLD.tenant_id,OLD.location_id,OLD.customer_id,OLD.wearer_id,OLD.profile_id,OLD.node_id,OLD.signature,OLD.introduced_sequence) OR OLD.retired_sequence IS NOT NULL OR NEW.retired_sequence IS NULL OR current_setting('app.measurement_retiring',true) IS DISTINCT FROM NEW.profile_id::text THEN RAISE EXCEPTION 'Immutable custom identity' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER fixed_identity BEFORE UPDATE OR DELETE ON app.measurement_custom_identities FOR EACH ROW EXECUTE FUNCTION app.measurement_custom_fixed();
--> statement-breakpoint
CREATE FUNCTION app.measurement_version_valid() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE h app.measurement_profiles; prior app.measurement_versions; expected jsonb; d jsonb:=NEW.document;
BEGIN
 SELECT * INTO h FROM app.measurement_profiles WHERE (tenant_id,location_id,customer_id,wearer_id,id)=(NEW.tenant_id,NEW.location_id,NEW.customer_id,NEW.wearer_id,NEW.profile_id);
 PERFORM app.measurement_require(h.id IS NOT NULL AND h.garment_id IS NOT DISTINCT FROM NEW.garment_id,ARRAY['profileId']);
 IF h.kind='body' THEN SELECT definition INTO expected FROM app.measurement_body_schemas WHERE version=NEW.body_schema_version;
 ELSE SELECT jsonb_build_object('formatVersion',definition->'formatVersion','label',definition->'label','guidance',definition->'help','sections',definition->'sections','fields',definition->'fields') INTO expected FROM app.garment_versions WHERE (tenant_id,garment_id,id)=(NEW.tenant_id,NEW.garment_id,NEW.garment_version_id); END IF;
 PERFORM app.master_keys(d,ARRAY['schema','label','values','customFields','notes','sourceNote','origin'],ARRAY['document']);
 PERFORM app.measurement_require(jsonb_typeof(d->'label')='string' AND jsonb_typeof(d->'notes') IN ('string','null') AND jsonb_typeof(d->'sourceNote') IN ('string','null') AND expected IS NOT NULL AND d->'schema'=expected AND app.customer_text_valid(d->>'label',120,false) AND d->>'label' IS NOT NULL AND d->>'label'=normalize(btrim(d->>'label'),NFC) AND app.customer_text_valid(d->>'notes',2000,true) AND app.customer_text_valid(d->>'sourceNote',500,false),ARRAY['document']);
 PERFORM app.master_keys(d->'origin',ARRAY['kind'],ARRAY['origin']);
 PERFORM app.measurement_require(d->'origin'='{"kind":"manual"}'::jsonb,ARRAY['origin']);
 IF NEW.prior_version_id IS NOT NULL THEN SELECT * INTO prior FROM app.measurement_versions WHERE (tenant_id,location_id,customer_id,wearer_id,profile_id,id)=(NEW.tenant_id,NEW.location_id,NEW.customer_id,NEW.wearer_id,NEW.profile_id,NEW.prior_version_id); END IF;
 PERFORM app.measurement_require((NEW.sequence=1 AND NEW.prior_version_id IS NULL) OR (prior.id IS NOT NULL AND NEW.sequence=prior.sequence+1),ARRAY['sequence']);
 PERFORM app.measurement_validate(d->'schema',d->'customFields',d->'values',coalesce(prior.document->'values','[]'::jsonb),h.kind='body');
 PERFORM app.measurement_require(NOT EXISTS(SELECT FROM app.master_definition_nodes(app.measurement_definition(d->'schema',d->'customFields')) n LEFT JOIN app.measurement_custom_identities r ON r.profile_id=NEW.profile_id AND r.node_id=n.node_id WHERE n.node_kind<>'section' AND (r.node_id IS NULL OR r.signature IS DISTINCT FROM n.signature OR r.introduced_sequence>NEW.sequence OR r.retired_sequence<=NEW.sequence)),ARRAY['customFields']);
 RETURN NEW;
END $$;
CREATE TRIGGER validate_content BEFORE INSERT ON app.measurement_versions FOR EACH ROW EXECUTE FUNCTION app.measurement_version_valid();
CREATE FUNCTION app.measurement_mutate(command_name text,payload jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
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
 doc:=jsonb_build_object('schema',schema,'label',payload->'label','values',vals,'customFields',custom,'notes',payload->'notes','sourceNote',payload->'sourceNote','origin',payload->'origin');
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
--> statement-breakpoint
CREATE FUNCTION app.measurement_detail(customer uuid,wearer uuid,profile uuid,version uuid DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE h app.measurement_profiles; v app.measurement_versions; s record; effective boolean;
BEGIN
 effective:=app.measurement_owner(customer,wearer); SELECT * INTO s FROM app.customer_scope();
 SELECT * INTO h FROM app.measurement_profiles WHERE (tenant_id,location_id,customer_id,wearer_id,id)=(s.tenant,s.location,customer,wearer,profile);
 IF h.id IS NULL THEN RAISE EXCEPTION 'Measurement unavailable' USING ERRCODE='FM001'; END IF;
 SELECT * INTO v FROM app.measurement_versions WHERE (tenant_id,location_id,customer_id,wearer_id,profile_id,id)=(s.tenant,s.location,customer,wearer,profile,coalesce(version,h.current_version_id));
 IF v.id IS NULL THEN RAISE EXCEPTION 'Measurement unavailable' USING ERRCODE='FM001'; END IF;
 RETURN jsonb_build_object('profileId',h.id,'customerId',customer,'wearerId',wearer,'revision',h.revision,'archivedAt',h.archived_at,'currentVersionId',h.current_version_id,'versionId',v.id,'sequence',v.sequence,'schemaRef',CASE WHEN h.kind='body' THEN jsonb_build_object('kind','body','bundleVersion',v.body_schema_version) ELSE jsonb_build_object('kind','garment','garmentId',h.garment_id,'versionId',v.garment_version_id) END,'measuredOn',v.measured_on,'recordedAt',v.recorded_at,'recordedBy',v.recorded_by,'priorVersionId',v.prior_version_id,'document',v.document,'effectiveActive',effective AND h.archived_at IS NULL);
END $$;
CREATE FUNCTION app.measurement_history(customer uuid,wearer uuid,profile uuid,before_sequence integer DEFAULT NULL,lim integer DEFAULT 25) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE s record; result jsonb;
BEGIN
 PERFORM app.measurement_detail(customer,wearer,profile); SELECT * INTO s FROM app.customer_scope();
 PERFORM app.measurement_require(lim BETWEEN 1 AND 50 AND (before_sequence IS NULL OR before_sequence>0),ARRAY['query']);
 WITH page AS (SELECT v.id,v.sequence,v.measured_on,v.recorded_at,v.document->>'label' label FROM app.measurement_versions v WHERE (v.tenant_id,v.location_id,v.customer_id,v.wearer_id,v.profile_id)=(s.tenant,s.location,customer,wearer,profile) AND (before_sequence IS NULL OR v.sequence<before_sequence) ORDER BY v.sequence DESC,v.id LIMIT lim)
 SELECT jsonb_build_object('items',coalesce(jsonb_agg(jsonb_build_object('versionId',id,'sequence',sequence,'measuredOn',measured_on,'recordedAt',recorded_at,'label',label) ORDER BY sequence DESC,id),'[]'::jsonb),'nextBeforeSequence',CASE WHEN count(*)=lim THEN min(sequence) END) INTO result FROM page;
 RETURN result;
END $$;
CREATE FUNCTION app.measurement_book(customer uuid,wearer uuid,q jsonb) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE s record; result jsonb; off integer; lim integer; needle text;
BEGIN
 PERFORM app.measurement_owner(customer,wearer); SELECT * INTO s FROM app.customer_scope();
 PERFORM app.master_keys(q,ARRAY['kind','garmentId','status','search','offset','limit'],ARRAY['query']);
 PERFORM app.measurement_require(app.master_integer(q->'offset',0,100000) AND app.master_integer(q->'limit',1,50) AND q->>'kind' IN ('all','body','garment') AND q->>'status' IN ('active','archived','all') AND jsonb_typeof(q->'search')='string' AND app.customer_text_valid(nullif(q->>'search',''),120,false),ARRAY['query']);
 IF q->'garmentId'<>'null'::jsonb THEN PERFORM app.master_uuid(q->'garmentId'); END IF;
 off:=(q->>'offset')::integer; lim:=(q->>'limit')::integer; needle:=app.normalize_customer_name(q->>'search');
 WITH filtered AS MATERIALIZED (SELECT p.id,p.current_version_id,p.revision,p.kind,p.garment_id,p.archived_at,v.document->>'label' label,v.sequence,v.measured_on FROM app.measurement_profiles p JOIN app.measurement_versions v ON v.id=p.current_version_id WHERE (p.tenant_id,p.location_id,p.customer_id,p.wearer_id)=(s.tenant,s.location,customer,wearer) AND (q->>'kind'='all' OR p.kind=q->>'kind') AND (q->'garmentId'='null'::jsonb OR p.garment_id=(q->>'garmentId')::uuid) AND (q->>'status'='all' OR (p.archived_at IS NOT NULL)=(q->>'status'='archived')) AND (needle='' OR position(needle IN app.normalize_customer_name(v.document->>'label'))>0)),
 page AS (SELECT * FROM filtered ORDER BY measured_on DESC,id OFFSET off LIMIT lim)
 SELECT jsonb_build_object('items',(SELECT coalesce(jsonb_agg(jsonb_build_object('profileId',id,'versionId',current_version_id,'revision',revision,'sequence',sequence,'kind',kind,'garmentId',garment_id,'archivedAt',archived_at,'label',label,'measuredOn',measured_on) ORDER BY measured_on DESC,id),'[]'::jsonb) FROM page),'total',count(*),'nextOffset',CASE WHEN off+lim<count(*) AND off+lim<=100000 THEN off+lim END) INTO result FROM filtered;
 RETURN result;
END $$;
DO $$ DECLARE f record; BEGIN
 FOR f IN SELECT p.oid::regprocedure signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='app' AND p.proname LIKE 'measurement_%' LOOP EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,fitloom_web,fitloom_worker,fitloom_auth,fitloom_operator',f.signature); END LOOP;
END $$;
GRANT EXECUTE ON FUNCTION app.measurement_admit(boolean,boolean),app.measurement_intake(jsonb,boolean),app.measurement_body_current(),app.measurement_mutate(text,jsonb),app.measurement_detail(uuid,uuid,uuid,uuid),app.measurement_history(uuid,uuid,uuid,integer,integer),app.measurement_book(uuid,uuid,jsonb) TO fitloom_web;
