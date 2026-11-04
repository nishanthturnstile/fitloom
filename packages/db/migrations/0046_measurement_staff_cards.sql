CREATE TABLE "app"."measurement_card_admissions" (
	"principal_id" uuid PRIMARY KEY NOT NULL,
	"window_started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"requests" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "measurement_card_admission_requests" CHECK ("app"."measurement_card_admissions"."requests" BETWEEN 0 AND 31)
);
--> statement-breakpoint
ALTER TABLE "app"."measurement_card_admissions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."measurement_card_selections" (
	"tenant_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"wearer_id" uuid NOT NULL,
	"card_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"profile_id" uuid NOT NULL,
	"version_id" uuid NOT NULL,
	"field_ids" jsonb NOT NULL,
	"projection" jsonb NOT NULL,
	CONSTRAINT "measurement_card_selections_card_id_position_pk" PRIMARY KEY("card_id","position"),
	CONSTRAINT "measurement_card_exact_version" UNIQUE("card_id","version_id"),
	CONSTRAINT "measurement_card_selection_shape" CHECK ("app"."measurement_card_selections"."position" BETWEEN 1 AND 10 AND jsonb_typeof("app"."measurement_card_selections"."field_ids")='array' AND jsonb_array_length("app"."measurement_card_selections"."field_ids") BETWEEN 1 AND 30 AND jsonb_typeof("app"."measurement_card_selections"."projection")='object' AND octet_length("app"."measurement_card_selections"."projection"::text)<=262144)
);
--> statement-breakpoint
ALTER TABLE "app"."measurement_card_selections" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."measurement_cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"wearer_id" uuid NOT NULL,
	"issuer_id" uuid NOT NULL,
	"wearer_label" text NOT NULL,
	"projection_version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"creation_operation_id" uuid NOT NULL,
	"revoked_at" timestamp with time zone,
	"revoked_by" uuid,
	"revocation_reason" text,
	"revocation_operation_id" uuid,
	CONSTRAINT "measurement_card_owner" UNIQUE("tenant_id","location_id","customer_id","wearer_id","id"),
	CONSTRAINT "measurement_card_shape" CHECK ("app"."measurement_cards"."projection_version"=1 AND app.customer_text_valid("app"."measurement_cards"."wearer_label",120,false) AND "app"."measurement_cards"."revision">0 AND "app"."measurement_cards"."expires_at">"app"."measurement_cards"."created_at" AND "app"."measurement_cards"."expires_at"<="app"."measurement_cards"."created_at"+interval '30 days' AND (("app"."measurement_cards"."revoked_at" IS NULL AND "app"."measurement_cards"."revoked_by" IS NULL AND "app"."measurement_cards"."revocation_reason" IS NULL AND "app"."measurement_cards"."revocation_operation_id" IS NULL) OR ("app"."measurement_cards"."revoked_at" IS NOT NULL AND "app"."measurement_cards"."revoked_by" IS NOT NULL AND "app"."measurement_cards"."revocation_reason" IS NOT NULL AND "app"."measurement_cards"."revocation_operation_id" IS NOT NULL AND app.customer_text_valid("app"."measurement_cards"."revocation_reason",1000,false))))
);
--> statement-breakpoint
ALTER TABLE "app"."measurement_cards" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app"."measurement_card_admissions" ADD CONSTRAINT "measurement_card_admissions_principal_id_principals_id_fk" FOREIGN KEY ("principal_id") REFERENCES "app"."principals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."measurement_card_selections" ADD CONSTRAINT "measurement_card_selection_card_fk" FOREIGN KEY ("tenant_id","location_id","customer_id","wearer_id","card_id") REFERENCES "app"."measurement_cards"("tenant_id","location_id","customer_id","wearer_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."measurement_card_selections" ADD CONSTRAINT "measurement_card_selection_version_fk" FOREIGN KEY ("tenant_id","location_id","customer_id","wearer_id","profile_id","version_id") REFERENCES "app"."measurement_versions"("tenant_id","location_id","customer_id","wearer_id","profile_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."measurement_cards" ADD CONSTRAINT "measurement_cards_issuer_id_principals_id_fk" FOREIGN KEY ("issuer_id") REFERENCES "app"."principals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."measurement_cards" ADD CONSTRAINT "measurement_cards_revoked_by_principals_id_fk" FOREIGN KEY ("revoked_by") REFERENCES "app"."principals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."measurement_cards" ADD CONSTRAINT "measurement_card_wearer_fk" FOREIGN KEY ("tenant_id","location_id","customer_id","wearer_id") REFERENCES "app"."customer_wearers"("tenant_id","location_id","customer_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "measurement_card_selection_profile" ON "app"."measurement_card_selections" USING btree ("profile_id","card_id");--> statement-breakpoint
CREATE INDEX "measurement_card_selection_version" ON "app"."measurement_card_selections" USING btree ("version_id");--> statement-breakpoint
CREATE INDEX "measurement_card_book" ON "app"."measurement_cards" USING btree ("tenant_id","location_id","customer_id","wearer_id","created_at" DESC NULLS LAST,"id");--> statement-breakpoint
CREATE INDEX "measurement_card_issuer" ON "app"."measurement_cards" USING btree ("issuer_id");--> statement-breakpoint
CREATE INDEX "measurement_card_revoker" ON "app"."measurement_cards" USING btree ("revoked_by");--> statement-breakpoint
CREATE UNIQUE INDEX "measurement_card_creation" ON "app"."measurement_cards" USING btree ("creation_operation_id");--> statement-breakpoint
CREATE INDEX "measurement_card_revocation" ON "app"."measurement_cards" USING btree ("revocation_operation_id");--> statement-breakpoint
CREATE POLICY "migration_access" ON "app"."measurement_card_admissions" AS PERMISSIVE FOR ALL TO "fitloom_migrator" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "migration_access" ON "app"."measurement_card_selections" AS PERMISSIVE FOR ALL TO "fitloom_migrator" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "migration_access" ON "app"."measurement_cards" AS PERMISSIVE FOR ALL TO "fitloom_migrator" USING (true) WITH CHECK (true);
--> statement-breakpoint
ALTER TABLE app.measurement_cards ADD CONSTRAINT measurement_card_creation_operation_fk FOREIGN KEY(creation_operation_id) REFERENCES app.command_operations(id), ADD CONSTRAINT measurement_card_revocation_operation_fk FOREIGN KEY(revocation_operation_id) REFERENCES app.command_operations(id);
ALTER TABLE app.measurement_cards FORCE ROW LEVEL SECURITY;
ALTER TABLE app.measurement_card_selections FORCE ROW LEVEL SECURITY;
ALTER TABLE app.measurement_card_admissions FORCE ROW LEVEL SECURITY;
REVOKE ALL ON app.measurement_cards,app.measurement_card_selections,app.measurement_card_admissions FROM PUBLIC,fitloom_web,fitloom_worker,fitloom_auth,fitloom_operator;
CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON app.measurement_card_selections FOR EACH ROW EXECUTE FUNCTION app.master_immutable();
CREATE TRIGGER retained BEFORE DELETE ON app.measurement_cards FOR EACH ROW EXECUTE FUNCTION app.master_immutable();
CREATE FUNCTION app.measurement_card_fixed() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE op app.command_operations:=app.active_operation(); BEGIN
 IF (NEW.id,NEW.tenant_id,NEW.location_id,NEW.customer_id,NEW.wearer_id,NEW.issuer_id,NEW.wearer_label,NEW.projection_version,NEW.created_at,NEW.expires_at,NEW.creation_operation_id) IS DISTINCT FROM (OLD.id,OLD.tenant_id,OLD.location_id,OLD.customer_id,OLD.wearer_id,OLD.issuer_id,OLD.wearer_label,OLD.projection_version,OLD.created_at,OLD.expires_at,OLD.creation_operation_id) OR OLD.revoked_at IS NOT NULL OR NEW.revoked_at IS NULL OR NEW.revoked_by IS DISTINCT FROM op.actor_id OR NEW.revocation_operation_id IS DISTINCT FROM op.id OR NEW.revision<>OLD.revision+1 OR op.command_kind NOT IN ('measurement-card.revoke','customer.archive','wearer.archive','measurement.archive') OR (op.tenant_id,op.location_id) IS DISTINCT FROM (OLD.tenant_id,OLD.location_id) THEN RAISE EXCEPTION 'Immutable card grant' USING ERRCODE='42501'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER immutable_header BEFORE UPDATE ON app.measurement_cards FOR EACH ROW EXECUTE FUNCTION app.measurement_card_fixed();
CREATE FUNCTION app.measurement_card_manager() RETURNS void LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$ BEGIN
 PERFORM app.measurement_admit(); IF NOT coalesce(app.has_permission('measurements.cards.manage'),false) THEN RAISE EXCEPTION 'Card management denied' USING ERRCODE='42501'; END IF;
END $$;
CREATE FUNCTION app.measurement_card_issuer_available(h app.measurement_cards) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT FROM app.principals p JOIN public."user" u ON u.id=p.auth_user_id JOIN app.memberships m ON m.principal_id=p.id JOIN app.tenants t ON t.id=m.tenant_id JOIN app.location_grants g ON (g.tenant_id,g.membership_id)=(m.tenant_id,m.id) JOIN app.locations l ON (l.tenant_id,l.id)=(g.tenant_id,g.location_id) WHERE p.id=h.issuer_id AND p.active AND u.email_verified AND m.active AND t.active AND (g.tenant_id,g.location_id)=(h.tenant_id,h.location_id) AND l.archived_at IS NULL AND ARRAY['workspace.read','customers.read','measurements.read','measurements.cards.manage']::text[] <@ (SELECT coalesce(array_agg(permission),'{}') FROM app.permission_grants WHERE (tenant_id,role_id)=(g.tenant_id,g.role_id)))
$$;
CREATE FUNCTION app.measurement_card_projection(customer uuid,wearer uuid,selections jsonb,locked boolean DEFAULT false) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE s record; selection jsonb; node jsonb; field jsonb; v app.measurement_versions; h app.measurement_profiles; val jsonb; fields jsonb; projected jsonb; values_out jsonb; items jsonb:='[]'; wearer_label text; ordinal integer:=0; BEGIN
 PERFORM app.measurement_card_manager(); IF NOT app.measurement_owner(customer,wearer,locked) THEN RAISE EXCEPTION 'Card selection unavailable' USING ERRCODE='FM001'; END IF; SELECT * INTO s FROM app.customer_scope();
 PERFORM app.measurement_require(jsonb_typeof(selections)='array' AND jsonb_array_length(selections) BETWEEN 1 AND 10 AND (SELECT count(*)=count(DISTINCT value->>'versionId') FROM jsonb_array_elements(selections)),ARRAY['selections']);
 IF locked THEN PERFORM 1 FROM app.measurement_profiles WHERE (tenant_id,location_id,customer_id,wearer_id)=(s.tenant,s.location,customer,wearer) AND id IN (SELECT app.master_uuid(value->'profileId') FROM jsonb_array_elements(selections)) ORDER BY id FOR UPDATE NOWAIT; END IF;
 FOR selection IN SELECT value FROM jsonb_array_elements(selections) LOOP
  PERFORM app.master_keys(selection,ARRAY['profileId','versionId','fieldIds'],ARRAY['selections']);
  SELECT * INTO h FROM app.measurement_profiles WHERE (tenant_id,location_id,customer_id,wearer_id,id)=(s.tenant,s.location,customer,wearer,app.master_uuid(selection->'profileId'));
  IF h.id IS NULL OR h.archived_at IS NOT NULL THEN RAISE EXCEPTION 'Card selection unavailable' USING ERRCODE='FM001'; END IF;
  SELECT * INTO v FROM app.measurement_versions WHERE (tenant_id,location_id,customer_id,wearer_id,profile_id,id)=(s.tenant,s.location,customer,wearer,h.id,app.master_uuid(selection->'versionId'));
  IF v.id IS NULL THEN RAISE EXCEPTION 'Card selection unavailable' USING ERRCODE='FM001'; END IF;
  fields:=selection->'fieldIds'; PERFORM app.measurement_require(jsonb_typeof(fields)='array' AND jsonb_array_length(fields) BETWEEN 1 AND 30 AND (SELECT count(*)=count(DISTINCT app.master_uuid(value)) FROM jsonb_array_elements(fields)),ARRAY['selections','fieldIds']);
  values_out:='[]';
  FOR node IN SELECT value FROM jsonb_array_elements(fields) LOOP
   SELECT value INTO field FROM jsonb_array_elements((v.document->'schema'->'fields')||(v.document->'customFields')) WHERE value->>'id'=app.master_uuid(node)::text;
   PERFORM app.measurement_require(field IS NOT NULL,ARRAY['selections','fieldIds']);
   SELECT value INTO val FROM jsonb_array_elements(v.document->'values') WHERE value->>'fieldId'=field->>'id';
   IF val IS NULL THEN projected:=jsonb_build_object('kind','missing','label',field->'label','basis',CASE WHEN field->>'kind'='length' THEN field->'basis' ELSE 'null'::jsonb END);
   ELSIF val->>'kind'='length' THEN projected:=jsonb_build_object('kind','length','label',field->'label','basis',field->'basis','decimal',val->'decimal','unit',val->'unit');
   ELSIF val->>'kind'='number' THEN projected:=jsonb_build_object('kind','number','label',field->'label','decimal',val->'decimal','unit',field->'unit');
   ELSIF val->>'kind'='text' THEN projected:=jsonb_build_object('kind','text','label',field->'label','text',val->'text');
   ELSIF val->>'kind'='boolean' THEN projected:=jsonb_build_object('kind','boolean','label',field->'label','value',val->'value');
   ELSE projected:=jsonb_build_object('kind','select','label',field->'label','choiceLabel',(SELECT value->'label' FROM jsonb_array_elements(field->'choices') WHERE value->>'id'=val->>'choiceId')); END IF;
   values_out:=values_out||jsonb_build_array(projected);
  END LOOP;
  ordinal:=ordinal+1;
  items:=items||jsonb_build_array(jsonb_build_object('position',ordinal,'profileLabel',v.document->'label','schemaLabel',v.document->'schema'->'label','measuredOn',v.measured_on,'sourceKind',v.document->'origin'->'kind','values',values_out));
 END LOOP;
 SELECT name INTO wearer_label FROM app.customer_wearers WHERE (tenant_id,location_id,customer_id,id)=(s.tenant,s.location,customer,wearer);
 RETURN jsonb_build_object('projectionVersion',1,'wearerLabel',wearer_label,'warning','Verify before cutting','items',items);
END $$;
CREATE FUNCTION app.measurement_card_mutate(command_name text,p jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE op app.command_operations:=app.active_operation(); h app.measurement_cards; projection jsonb; identity uuid; selection jsonb; position integer:=0; customer uuid; wearer uuid; BEGIN
 PERFORM app.measurement_admit(); IF op.command_kind<>command_name OR command_name NOT IN ('measurement-card.create','measurement-card.revoke') THEN RAISE EXCEPTION 'Card command denied' USING ERRCODE='42501'; END IF;
 customer:=app.master_uuid(p->'customerId'); wearer:=app.master_uuid(p->'wearerId');
 IF command_name='measurement-card.create' THEN
  PERFORM app.master_keys(p,ARRAY['customerId','wearerId','selections','expiresInDays'],ARRAY['payload']);
  PERFORM app.measurement_require(app.master_integer(p->'expiresInDays',1,30),ARRAY['expiresInDays']);
  projection:=app.measurement_card_projection(customer,wearer,p->'selections',true);
  INSERT INTO app.measurement_cards(tenant_id,location_id,customer_id,wearer_id,issuer_id,wearer_label,expires_at,creation_operation_id) VALUES(op.tenant_id,op.location_id,customer,wearer,op.actor_id,projection->>'wearerLabel',now()+make_interval(days=>(p->>'expiresInDays')::int),op.id) RETURNING * INTO h;
  FOR selection IN SELECT value FROM jsonb_array_elements(p->'selections') LOOP
   position:=position+1;
   INSERT INTO app.measurement_card_selections(tenant_id,location_id,customer_id,wearer_id,card_id,position,profile_id,version_id,field_ids,projection) VALUES(op.tenant_id,op.location_id,customer,wearer,h.id,position,app.master_uuid(selection->'profileId'),app.master_uuid(selection->'versionId'),selection->'fieldIds',projection->'items'->(position-1));
  END LOOP;
 ELSE
  PERFORM app.master_keys(p,ARRAY['customerId','wearerId','cardId','expectedRevision','reason'],ARRAY['payload']);PERFORM app.measurement_owner(customer,wearer);
  SELECT * INTO h FROM app.measurement_cards WHERE (tenant_id,location_id,customer_id,wearer_id,id)=(op.tenant_id,op.location_id,customer,wearer,app.master_uuid(p->'cardId')) FOR UPDATE NOWAIT;
  IF h.id IS NULL OR (h.issuer_id<>op.actor_id AND NOT coalesce(app.has_permission('measurements.cards.manage'),false)) THEN RAISE EXCEPTION 'Card unavailable' USING ERRCODE='FM001'; END IF;
  PERFORM app.measurement_require(app.master_integer(p->'expectedRevision',1,2147483647) AND jsonb_typeof(p->'reason')='string' AND app.customer_text_valid(p->>'reason',1000,false),ARRAY['reason']);
  IF h.revision<>(p->>'expectedRevision')::int THEN RAISE EXCEPTION 'Card revision changed' USING ERRCODE='FM002'; END IF;
  IF h.revoked_at IS NOT NULL THEN RETURN jsonb_build_object('kind','measurement-card-saved','cardId',h.id,'revision',h.revision,'changed',false); END IF;
  UPDATE app.measurement_cards SET revoked_at=clock_timestamp(),revoked_by=op.actor_id,revocation_reason=p->>'reason',revocation_operation_id=op.id,revision=revision+1 WHERE id=h.id;
  h.revision:=h.revision+1;
 END IF;
 RETURN jsonb_build_object('kind','measurement-card-saved','cardId',h.id,'revision',h.revision,'changed',true);
END $$;
CREATE FUNCTION app.measurement_card_list(customer uuid,wearer uuid,cursor jsonb DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE s record; result jsonb; BEGIN
 PERFORM app.measurement_owner(customer,wearer);SELECT * INTO s FROM app.customer_scope();
 IF cursor IS NOT NULL AND cursor<>'null'::jsonb THEN PERFORM app.master_keys(cursor,ARRAY['createdAt','cardId'],ARRAY['after']);PERFORM app.master_uuid(cursor->'cardId'); END IF;
 WITH candidates AS MATERIALIZED(SELECT h.* FROM app.measurement_cards h WHERE (tenant_id,location_id,customer_id,wearer_id)=(s.tenant,s.location,customer,wearer) AND (h.issuer_id=s.actor OR app.has_permission('measurements.cards.manage')) AND (cursor IS NULL OR cursor='null'::jsonb OR (h.created_at,h.id)<((cursor->>'createdAt')::timestamptz,app.master_uuid(cursor->'cardId'))) ORDER BY created_at DESC,id DESC LIMIT 26),page AS(SELECT * FROM candidates ORDER BY created_at DESC,id DESC LIMIT 25)
 SELECT jsonb_build_object('items',(SELECT coalesce(jsonb_agg(jsonb_build_object('cardId',h.id,'revision',h.revision,'issuedAt',h.created_at,'expiresAt',h.expires_at,'revokedAt',h.revoked_at,'issuedByMe',h.issuer_id=s.actor,'issuerAvailable',app.measurement_card_issuer_available(h),'selections',(SELECT jsonb_agg(jsonb_build_object('profileId',profile_id,'versionId',version_id,'fieldIds',field_ids) ORDER BY position) FROM app.measurement_card_selections WHERE card_id=h.id)) ORDER BY h.created_at DESC,h.id DESC),'[]'::jsonb) FROM page h),'next',CASE WHEN (SELECT count(*) FROM candidates)>25 THEN (SELECT jsonb_build_object('createdAt',created_at,'cardId',id) FROM page ORDER BY created_at,id LIMIT 1) END) INTO result;RETURN result;
END $$;
CREATE FUNCTION app.measurement_card_admit() RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=nullif(current_setting('app.principal_id',true),'')::uuid; n integer; BEGIN
 IF NOT app.principal_active() THEN RAISE EXCEPTION 'Card unavailable' USING ERRCODE='42501'; END IF;
 INSERT INTO app.measurement_card_admissions(principal_id,window_started_at,requests) VALUES(actor,now(),1) ON CONFLICT(principal_id) DO UPDATE SET requests=CASE WHEN measurement_card_admissions.window_started_at<=now()-interval '60 seconds' THEN 1 ELSE least(31,measurement_card_admissions.requests+1) END,window_started_at=CASE WHEN measurement_card_admissions.window_started_at<=now()-interval '60 seconds' THEN now() ELSE measurement_card_admissions.window_started_at END RETURNING requests INTO n;
 RETURN n<=30;
END $$;
CREATE FUNCTION app.measurement_card_resolve(identity uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE h app.measurement_cards; projection jsonb; BEGIN
 IF NOT app.principal_active() THEN RAISE EXCEPTION 'Card unavailable' USING ERRCODE='FM001'; END IF;
 SELECT * INTO h FROM app.measurement_cards WHERE id=identity;
 IF h.id IS NULL OR h.revoked_at IS NOT NULL OR h.expires_at<=now() OR NOT app.measurement_card_issuer_available(h) THEN RAISE EXCEPTION 'Card unavailable' USING ERRCODE='FM001'; END IF;
 PERFORM set_config('app.tenant_id',h.tenant_id::text,true);PERFORM set_config('app.location_id',h.location_id::text,true);PERFORM app.measurement_admit();
 IF NOT app.measurement_owner(h.customer_id,h.wearer_id) OR EXISTS(SELECT FROM app.measurement_card_selections s JOIN app.measurement_profiles p ON p.id=s.profile_id WHERE s.card_id=h.id AND p.archived_at IS NOT NULL) THEN RAISE EXCEPTION 'Card unavailable' USING ERRCODE='FM001'; END IF;
 SELECT jsonb_build_object('projectionVersion',h.projection_version,'wearerLabel',h.wearer_label,'warning','Verify before cutting','cardId',h.id,'issuedAt',h.created_at,'expiresAt',h.expires_at,'items',jsonb_agg(s.projection ORDER BY s.position)) INTO projection FROM app.measurement_card_selections s WHERE s.card_id=h.id;
 RETURN projection;
END $$;
CREATE FUNCTION app.measurement_card_archive_revoke() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE op app.command_operations; BEGIN
 IF OLD.archived_at IS NULL AND NEW.archived_at IS NOT NULL THEN
  IF TG_TABLE_NAME='customers' THEN IF NOT EXISTS(SELECT FROM app.measurement_cards WHERE tenant_id=NEW.tenant_id AND location_id=NEW.location_id AND customer_id=NEW.id AND revoked_at IS NULL) THEN RETURN NEW; END IF;
  ELSIF TG_TABLE_NAME='customer_wearers' THEN IF NOT EXISTS(SELECT FROM app.measurement_cards WHERE tenant_id=NEW.tenant_id AND location_id=NEW.location_id AND customer_id=NEW.customer_id AND wearer_id=NEW.id AND revoked_at IS NULL) THEN RETURN NEW; END IF;
  ELSE IF NOT EXISTS(SELECT FROM app.measurement_cards h JOIN app.measurement_card_selections s ON s.card_id=h.id WHERE s.profile_id=NEW.id AND h.revoked_at IS NULL) THEN RETURN NEW; END IF; END IF;
  op:=app.active_operation();
  IF op.command_kind NOT IN ('customer.archive','wearer.archive','measurement.archive') OR (op.tenant_id,op.location_id) IS DISTINCT FROM (NEW.tenant_id,NEW.location_id) THEN RAISE EXCEPTION 'Card lifecycle operation denied' USING ERRCODE='42501'; END IF;
  IF TG_TABLE_NAME='customers' THEN UPDATE app.measurement_cards SET revoked_at=clock_timestamp(),revoked_by=op.actor_id,revocation_reason='Customer archived',revocation_operation_id=op.id,revision=revision+1 WHERE tenant_id=NEW.tenant_id AND location_id=NEW.location_id AND customer_id=NEW.id AND revoked_at IS NULL;
  ELSIF TG_TABLE_NAME='customer_wearers' THEN UPDATE app.measurement_cards SET revoked_at=clock_timestamp(),revoked_by=op.actor_id,revocation_reason='Wearer archived',revocation_operation_id=op.id,revision=revision+1 WHERE tenant_id=NEW.tenant_id AND location_id=NEW.location_id AND customer_id=NEW.customer_id AND wearer_id=NEW.id AND revoked_at IS NULL;
  ELSE UPDATE app.measurement_cards h SET revoked_at=clock_timestamp(),revoked_by=op.actor_id,revocation_reason='Measurement profile archived',revocation_operation_id=op.id,revision=revision+1 WHERE h.tenant_id=NEW.tenant_id AND h.location_id=NEW.location_id AND h.customer_id=NEW.customer_id AND h.wearer_id=NEW.wearer_id AND h.revoked_at IS NULL AND EXISTS(SELECT FROM app.measurement_card_selections s WHERE s.card_id=h.id AND s.profile_id=NEW.id); END IF;
 END IF; RETURN NEW;
END $$;
CREATE TRIGGER measurement_card_revoke_customer AFTER UPDATE OF archived_at ON app.customers FOR EACH ROW EXECUTE FUNCTION app.measurement_card_archive_revoke();
CREATE TRIGGER measurement_card_revoke_wearer AFTER UPDATE OF archived_at ON app.customer_wearers FOR EACH ROW EXECUTE FUNCTION app.measurement_card_archive_revoke();
CREATE TRIGGER measurement_card_revoke_profile AFTER UPDATE OF archived_at ON app.measurement_profiles FOR EACH ROW EXECUTE FUNCTION app.measurement_card_archive_revoke();
DO $$ DECLARE f record; BEGIN FOR f IN SELECT p.oid::regprocedure signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='app' AND p.proname LIKE 'measurement_card_%' LOOP EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,fitloom_web,fitloom_worker,fitloom_auth,fitloom_operator',f.signature); END LOOP; END $$;
GRANT EXECUTE ON FUNCTION app.measurement_card_manager(),app.measurement_card_projection(uuid,uuid,jsonb,boolean),app.measurement_card_mutate(text,jsonb),app.measurement_card_list(uuid,uuid,jsonb),app.measurement_card_admit(),app.measurement_card_resolve(uuid) TO fitloom_web;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.measurement_context(customer uuid,wearer uuid,entry boolean DEFAULT false) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE s record; effective boolean; customer_name text; wearer_name text; tz text; today date;
BEGIN
 PERFORM app.measurement_admit(entry); effective:=app.measurement_owner(customer,wearer); SELECT * INTO s FROM app.customer_scope();
 IF entry AND NOT effective THEN RAISE EXCEPTION 'Restore owner before adding measurements' USING ERRCODE='FM002'; END IF;
 SELECT name INTO customer_name FROM app.customers WHERE (tenant_id,location_id,id)=(s.tenant,s.location,customer);
 SELECT name INTO wearer_name FROM app.customer_wearers WHERE (tenant_id,location_id,customer_id,id)=(s.tenant,s.location,customer,wearer);
 SELECT timezone INTO tz FROM app.shop_settings WHERE tenant_id=s.tenant;
 IF tz IS NOT NULL AND EXISTS(SELECT FROM pg_catalog.pg_timezone_names WHERE name=tz) THEN today:=(statement_timestamp() AT TIME ZONE tz)::date; END IF;
 IF entry AND today IS NULL THEN RAISE EXCEPTION 'Shop timezone unavailable' USING ERRCODE='FM006'; END IF;
 RETURN jsonb_build_object('customerId',customer,'wearerId',wearer,'customerName',customer_name,'wearerName',wearer_name,'active',effective,'today',today,'bodySchemaRef',app.measurement_body_current(),'capabilities',jsonb_build_object('cardIssue',app.has_permission('measurements.cards.manage'),'cardManage',app.has_permission('measurements.cards.manage') OR EXISTS(SELECT FROM app.measurement_cards WHERE (tenant_id,location_id,customer_id,wearer_id,issuer_id)=(s.tenant,s.location,customer,wearer,s.actor)),'photoRead',app.has_permission('measurements.photos.read'),'photoManage',app.has_permission('measurements.photos.manage'),'manage',effective AND app.has_permission('measurements.manage'),'archive',effective AND app.has_permission('measurements.archive')));
END $$;


--> statement-breakpoint
CREATE FUNCTION app.measurement_card_revoke_authorize(customer uuid,wearer uuid,identity uuid) RETURNS void LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE s record; h app.measurement_cards; BEGIN
 PERFORM app.measurement_owner(customer,wearer);SELECT * INTO s FROM app.customer_scope();SELECT * INTO h FROM app.measurement_cards WHERE (tenant_id,location_id,customer_id,wearer_id,id)=(s.tenant,s.location,customer,wearer,identity);
 IF h.id IS NULL OR (h.issuer_id<>s.actor AND NOT coalesce(app.has_permission('measurements.cards.manage'),false)) THEN RAISE EXCEPTION 'Card unavailable' USING ERRCODE='FM001'; END IF;
END $$;
REVOKE ALL ON FUNCTION app.measurement_card_revoke_authorize(uuid,uuid,uuid) FROM PUBLIC,fitloom_web,fitloom_worker,fitloom_auth,fitloom_operator;
GRANT EXECUTE ON FUNCTION app.measurement_card_revoke_authorize(uuid,uuid,uuid) TO fitloom_web;
