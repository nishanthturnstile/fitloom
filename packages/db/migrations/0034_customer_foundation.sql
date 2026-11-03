-- Customer storage foundation. Runtime tables remain private until the
-- authorized read/command protocol lands in the next Increment 1 slice.
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;
--> statement-breakpoint
CREATE FUNCTION app.customer_trim_chars() RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE SET search_path='' AS $$
 SELECT U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF'
$$;
--> statement-breakpoint
CREATE FUNCTION app.customer_display_name(value text) RETURNS text LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE SET search_path='' AS $$
 SELECT btrim(regexp_replace(normalize(value,NFC),'['||chr(9)||'-'||chr(13)||' ]+',' ','g'),app.customer_trim_chars())
$$;
--> statement-breakpoint
CREATE FUNCTION app.normalize_customer_name(value text) RETURNS text LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE SET search_path='' AS $$
 SELECT translate(app.customer_display_name(value),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz')
$$;
--> statement-breakpoint
CREATE FUNCTION app.customer_text_valid(value text,max_length integer,multiline boolean) RETURNS boolean LANGUAGE sql IMMUTABLE PARALLEL SAFE SET search_path='' AS $$
 SELECT value IS NULL OR (char_length(value) BETWEEN 1 AND max_length
  AND value=normalize(value,NFC) AND value=btrim(value,app.customer_trim_chars())
  AND (CASE WHEN multiline THEN translate(value,E'\n\t','') ELSE value END) !~ '[[:cntrl:]]')
$$;
--> statement-breakpoint
CREATE FUNCTION app.customer_attribute_valid(value text,unit text,kind text) RETURNS boolean LANGUAGE sql IMMUTABLE PARALLEL SAFE SET search_path='' AS $$
 SELECT CASE
 WHEN value IS NULL THEN unit IS NULL
 WHEN unit IS NULL OR value !~ '^(0|[1-9][0-9]{0,5})(\.[0-9]{1,6})?$' THEN false
 WHEN kind='height' AND unit IN ('cm','in') THEN value::numeric>0 AND value::numeric*(CASE unit WHEN 'in' THEN 2.54 ELSE 1 END)<=300
 WHEN kind='weight' AND unit IN ('kg','lb') THEN value::numeric>0 AND value::numeric*(CASE unit WHEN 'lb' THEN 0.45359237 ELSE 1 END)<=700
 ELSE false END
$$;
--> statement-breakpoint
CREATE TABLE "app"."customer_tags" (
	"tenant_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"label" text NOT NULL,
	"normalized_tag" text GENERATED ALWAYS AS (app.normalize_customer_name(label)) STORED NOT NULL,
	CONSTRAINT "customer_tags_tenant_id_location_id_customer_id_normalized_tag_pk" PRIMARY KEY("tenant_id","location_id","customer_id","normalized_tag"),
	CONSTRAINT "customer_tags_label_check" CHECK (app.customer_text_valid("app"."customer_tags"."label",40,false))
);
--> statement-breakpoint
ALTER TABLE "app"."customer_tags" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."customer_wearers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"name" text NOT NULL,
	"normalized_name" text GENERATED ALWAYS AS (app.normalize_customer_name(name)) STORED NOT NULL,
	"relationship" text,
	"birthday" date,
	"gender_kind" text DEFAULT 'unspecified' NOT NULL,
	"gender_description" text,
	"height_value" text,
	"height_unit" text,
	"weight_value" text,
	"weight_unit" text,
	"notes" text,
	"fit_notes" text,
	"fabric_notes" text,
	"design_notes" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_by" uuid NOT NULL,
	"archived_at" timestamp with time zone,
	"archived_by" uuid,
	"creation_operation_id" uuid NOT NULL,
	CONSTRAINT "customer_wearers_tenant_identity" UNIQUE("tenant_id","id"),
	CONSTRAINT "customer_wearers_parent_identity" UNIQUE("tenant_id","location_id","customer_id","id"),
	CONSTRAINT "customer_wearers_name_check" CHECK (app.customer_text_valid("app"."customer_wearers"."name",120,false) AND "app"."customer_wearers"."name"=app.customer_display_name("app"."customer_wearers"."name")),
	CONSTRAINT "customer_wearers_gender_check" CHECK (("app"."customer_wearers"."gender_kind"='unspecified' AND "app"."customer_wearers"."gender_description" IS NULL) OR ("app"."customer_wearers"."gender_kind"='self-described' AND "app"."customer_wearers"."gender_description" IS NOT NULL AND app.customer_text_valid("app"."customer_wearers"."gender_description",60,false))),
	CONSTRAINT "customer_wearers_height_check" CHECK (app.customer_attribute_valid("app"."customer_wearers"."height_value","app"."customer_wearers"."height_unit",'height')),
	CONSTRAINT "customer_wearers_weight_check" CHECK (app.customer_attribute_valid("app"."customer_wearers"."weight_value","app"."customer_wearers"."weight_unit",'weight')),
	CONSTRAINT "customer_wearers_birthday_check" CHECK ("app"."customer_wearers"."birthday" IS NULL OR ("app"."customer_wearers"."birthday" BETWEEN '0001-01-01'::date AND '9999-12-31'::date AND isfinite("app"."customer_wearers"."birthday"))),
	CONSTRAINT "customer_wearers_version_check" CHECK ("app"."customer_wearers"."version">0),
	CONSTRAINT "customer_wearers_archive_check" CHECK (("app"."customer_wearers"."archived_at" IS NULL)=("app"."customer_wearers"."archived_by" IS NULL)),
	CONSTRAINT "customer_wearers_relationship_check" CHECK (app.customer_text_valid("app"."customer_wearers"."relationship",60,false)),
	CONSTRAINT "customer_wearers_notes_check" CHECK (app.customer_text_valid("app"."customer_wearers"."notes",2000,true)),
	CONSTRAINT "customer_wearers_fit_check" CHECK (app.customer_text_valid("app"."customer_wearers"."fit_notes",1000,true)),
	CONSTRAINT "customer_wearers_fabric_check" CHECK (app.customer_text_valid("app"."customer_wearers"."fabric_notes",1000,true)),
	CONSTRAINT "customer_wearers_design_check" CHECK (app.customer_text_valid("app"."customer_wearers"."design_notes",1000,true))
);
--> statement-breakpoint
ALTER TABLE "app"."customer_wearers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"name" text NOT NULL,
	"normalized_name" text GENERATED ALWAYS AS (app.normalize_customer_name(name)) STORED NOT NULL,
	"phone_display" text,
	"phone_country_code" text,
	"phone_e164" text,
	"phone_digits" text GENERATED ALWAYS AS (substring(phone_e164 from 2)) STORED,
	"email" text,
	"address_line1" text,
	"address_line2" text,
	"city" text,
	"region" text,
	"postal_code" text,
	"address_country_code" text,
	"tax_country_code" text,
	"gstin" text,
	"segment" text,
	"notes" text,
	"fit_notes" text,
	"fabric_notes" text,
	"design_notes" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_by" uuid NOT NULL,
	"archived_at" timestamp with time zone,
	"archived_by" uuid,
	"creation_operation_id" uuid NOT NULL,
	CONSTRAINT "customers_tenant_identity" UNIQUE("tenant_id","id"),
	CONSTRAINT "customers_location_identity" UNIQUE("tenant_id","location_id","id"),
	CONSTRAINT "customers_name_check" CHECK (app.customer_text_valid("app"."customers"."name",120,false) AND "app"."customers"."name"=app.customer_display_name("app"."customers"."name")),
	CONSTRAINT "customers_phone_check" CHECK (("app"."customers"."phone_e164" IS NULL AND "app"."customers"."phone_display" IS NULL AND "app"."customers"."phone_country_code" IS NULL) OR ("app"."customers"."phone_e164" IS NOT NULL AND "app"."customers"."phone_display" IS NOT NULL AND "app"."customers"."phone_country_code" IS NOT NULL AND "app"."customers"."phone_e164" ~ '^\+[1-9][0-9]{6,14}$' AND "app"."customers"."phone_country_code" ~ '^[A-Z]{2}$' AND app.customer_text_valid("app"."customers"."phone_display",64,false))),
	CONSTRAINT "customers_country_check" CHECK (("app"."customers"."address_country_code" IS NULL OR "app"."customers"."address_country_code" ~ '^[A-Z]{2}$') AND ("app"."customers"."tax_country_code" IS NULL OR "app"."customers"."tax_country_code" ~ '^[A-Z]{2}$')),
	CONSTRAINT "customers_address_country_check" CHECK ("app"."customers"."address_country_code" IS NOT NULL OR ("app"."customers"."address_line1" IS NULL AND "app"."customers"."address_line2" IS NULL AND "app"."customers"."city" IS NULL AND "app"."customers"."region" IS NULL AND "app"."customers"."postal_code" IS NULL)),
	CONSTRAINT "customers_gstin_check" CHECK ("app"."customers"."gstin" IS NULL OR ("app"."customers"."tax_country_code" IS NOT NULL AND "app"."customers"."tax_country_code"='IN' AND "app"."customers"."gstin" ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$')),
	CONSTRAINT "customers_segment_check" CHECK ("app"."customers"."segment" IS NULL OR "app"."customers"."segment" IN ('new','regular','important','bulk')),
	CONSTRAINT "customers_version_check" CHECK ("app"."customers"."version">0),
	CONSTRAINT "customers_archive_check" CHECK (("app"."customers"."archived_at" IS NULL)=("app"."customers"."archived_by" IS NULL)),
	CONSTRAINT "customers_email_check" CHECK (app.customer_text_valid("app"."customers"."email",254,false)),
	CONSTRAINT "customers_address_line1_check" CHECK (app.customer_text_valid("app"."customers"."address_line1",200,false)),
	CONSTRAINT "customers_address_line2_check" CHECK (app.customer_text_valid("app"."customers"."address_line2",200,false)),
	CONSTRAINT "customers_city_check" CHECK (app.customer_text_valid("app"."customers"."city",100,false)),
	CONSTRAINT "customers_region_check" CHECK (app.customer_text_valid("app"."customers"."region",100,false)),
	CONSTRAINT "customers_postal_check" CHECK (app.customer_text_valid("app"."customers"."postal_code",32,false)),
	CONSTRAINT "customers_notes_check" CHECK (app.customer_text_valid("app"."customers"."notes",2000,true)),
	CONSTRAINT "customers_fit_check" CHECK (app.customer_text_valid("app"."customers"."fit_notes",1000,true)),
	CONSTRAINT "customers_fabric_check" CHECK (app.customer_text_valid("app"."customers"."fabric_notes",1000,true)),
	CONSTRAINT "customers_design_check" CHECK (app.customer_text_valid("app"."customers"."design_notes",1000,true))
);
--> statement-breakpoint
ALTER TABLE "app"."customers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app"."customer_tags" ADD CONSTRAINT "customer_tags_parent_fk" FOREIGN KEY ("tenant_id","location_id","customer_id") REFERENCES "app"."customers"("tenant_id","location_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."customer_wearers" ADD CONSTRAINT "customer_wearers_created_by_principals_id_fk" FOREIGN KEY ("created_by") REFERENCES "app"."principals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."customer_wearers" ADD CONSTRAINT "customer_wearers_updated_by_principals_id_fk" FOREIGN KEY ("updated_by") REFERENCES "app"."principals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."customer_wearers" ADD CONSTRAINT "customer_wearers_archived_by_principals_id_fk" FOREIGN KEY ("archived_by") REFERENCES "app"."principals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."customer_wearers" ADD CONSTRAINT "customer_wearers_parent_fk" FOREIGN KEY ("tenant_id","location_id","customer_id") REFERENCES "app"."customers"("tenant_id","location_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."customers" ADD CONSTRAINT "customers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "app"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."customers" ADD CONSTRAINT "customers_created_by_principals_id_fk" FOREIGN KEY ("created_by") REFERENCES "app"."principals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."customers" ADD CONSTRAINT "customers_updated_by_principals_id_fk" FOREIGN KEY ("updated_by") REFERENCES "app"."principals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."customers" ADD CONSTRAINT "customers_archived_by_principals_id_fk" FOREIGN KEY ("archived_by") REFERENCES "app"."principals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."customers" ADD CONSTRAINT "customers_location_fk" FOREIGN KEY ("tenant_id","location_id") REFERENCES "app"."locations"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "customer_tags_filter" ON "app"."customer_tags" USING btree ("tenant_id","location_id","normalized_tag","customer_id");--> statement-breakpoint
CREATE INDEX "customer_wearers_parent_order" ON "app"."customer_wearers" USING btree ("tenant_id","location_id","customer_id","normalized_name","id");--> statement-breakpoint
CREATE INDEX "customer_wearers_created_by" ON "app"."customer_wearers" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "customer_wearers_updated_by" ON "app"."customer_wearers" USING btree ("updated_by");--> statement-breakpoint
CREATE INDEX "customer_wearers_archived_by" ON "app"."customer_wearers" USING btree ("archived_by");--> statement-breakpoint
CREATE INDEX "customer_wearers_creation_operation" ON "app"."customer_wearers" USING btree ("creation_operation_id");--> statement-breakpoint
CREATE INDEX "customers_name_order" ON "app"."customers" USING btree ("tenant_id","location_id","normalized_name","id");--> statement-breakpoint
CREATE INDEX "customers_active_name_order" ON "app"."customers" USING btree ("tenant_id","location_id","normalized_name","id") WHERE "app"."customers"."archived_at" IS NULL;--> statement-breakpoint
CREATE INDEX "customers_phone_lookup" ON "app"."customers" USING btree ("tenant_id","location_id","phone_e164") WHERE "app"."customers"."phone_e164" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "customers_name_trigrams" ON "app"."customers" USING gin ("normalized_name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "customers_phone_trigrams" ON "app"."customers" USING gin ("phone_digits" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "customers_created_by" ON "app"."customers" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "customers_updated_by" ON "app"."customers" USING btree ("updated_by");--> statement-breakpoint
CREATE INDEX "customers_archived_by" ON "app"."customers" USING btree ("archived_by");--> statement-breakpoint
CREATE INDEX "customers_creation_operation" ON "app"."customers" USING btree ("creation_operation_id");--> statement-breakpoint
CREATE POLICY "migration_access" ON "app"."customer_tags" AS PERMISSIVE FOR ALL TO "fitloom_migrator" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "migration_access" ON "app"."customer_wearers" AS PERMISSIVE FOR ALL TO "fitloom_migrator" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "migration_access" ON "app"."customers" AS PERMISSIVE FOR ALL TO "fitloom_migrator" USING (true) WITH CHECK (true);
--> statement-breakpoint
ALTER TABLE app.customers FORCE ROW LEVEL SECURITY;
ALTER TABLE app.customer_wearers FORCE ROW LEVEL SECURITY;
ALTER TABLE app.customer_tags FORCE ROW LEVEL SECURITY;
REVOKE ALL ON app.customers,app.customer_wearers,app.customer_tags FROM PUBLIC,fitloom_web,fitloom_worker,fitloom_auth,fitloom_operator;
ALTER TABLE app.customers ADD CONSTRAINT customers_creation_operation_fk FOREIGN KEY(creation_operation_id) REFERENCES app.command_operations(id);
ALTER TABLE app.customer_wearers ADD CONSTRAINT customer_wearers_creation_operation_fk FOREIGN KEY(creation_operation_id) REFERENCES app.command_operations(id);
REVOKE ALL ON FUNCTION app.customer_trim_chars(),app.customer_display_name(text),app.normalize_customer_name(text),app.customer_text_valid(text,integer,boolean),app.customer_attribute_valid(text,text,text) FROM PUBLIC;
--> statement-breakpoint
INSERT INTO app.permission_grants(tenant_id,role_id,permission)
 SELECT tenant_id,id,p FROM app.roles CROSS JOIN unnest(ARRAY['customers.read','customers.manage','customers.archive','customers.photos.read','customers.photos.manage']) p WHERE preset='owner' ON CONFLICT DO NOTHING;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.install_role_presets(tenant uuid,owner_role uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE manager uuid; staff uuid;
BEGIN
 UPDATE app.roles SET preset='owner' WHERE id=owner_role AND tenant_id=tenant;
 INSERT INTO app.roles(tenant_id,name,preset) VALUES(tenant,'Manager','manager') RETURNING id INTO manager;
 INSERT INTO app.roles(tenant_id,name,preset) VALUES(tenant,'Staff','staff') RETURNING id INTO staff;
 INSERT INTO app.permission_grants SELECT tenant,owner_role,permission FROM unnest(ARRAY['workspace.read','workspace.private.read','access.manage','locations.all','audit.read','files.read','files.manage','masters.read','masters.manage','masters.rates.read','customers.read','customers.manage','customers.archive','customers.photos.read','customers.photos.manage']) permission ON CONFLICT DO NOTHING;
 INSERT INTO app.permission_grants VALUES(tenant,manager,'workspace.read'),(tenant,manager,'workspace.manage'),(tenant,staff,'workspace.read');
 UPDATE app.memberships m SET is_owner=true WHERE m.tenant_id=tenant AND EXISTS(SELECT FROM app.location_grants g WHERE (g.tenant_id,g.membership_id)=(m.tenant_id,m.id) AND g.role_id=owner_role);
END $$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.create_custom_role(role_name text,permissions text[]) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE op app.command_operations:=app.active_operation(); role_identity uuid; p text;
BEGIN
 PERFORM 1 FROM app.tenants WHERE id=op.owner_id FOR UPDATE;
 IF op.owner_kind<>'tenant' OR op.command_kind<>'role.create' OR NOT app.has_permission('access.manage') THEN RAISE EXCEPTION 'Role administration denied' USING ERRCODE='42501'; END IF;
 IF role_name IS NULL OR permissions IS NULL OR length(trim(role_name)) NOT BETWEEN 1 AND 80 OR cardinality(permissions) NOT BETWEEN 1 AND 20 OR NOT 'workspace.read'=ANY(permissions) THEN RAISE EXCEPTION 'Invalid role' USING ERRCODE='22023'; END IF;
 IF 'masters.manage'=ANY(permissions) AND NOT (ARRAY['masters.read','masters.rates.read'] <@ permissions) THEN RAISE EXCEPTION 'Master management requires schema and rate read permissions' USING ERRCODE='22023'; END IF;
 IF 'customers.manage'=ANY(permissions) AND NOT 'customers.read'=ANY(permissions) THEN RAISE EXCEPTION 'Customer management requires read access' USING ERRCODE='22023'; END IF;
 IF 'customers.archive'=ANY(permissions) AND NOT 'customers.read'=ANY(permissions) THEN RAISE EXCEPTION 'Customer archive requires read access' USING ERRCODE='22023'; END IF;
 IF 'customers.photos.read'=ANY(permissions) AND NOT 'customers.read'=ANY(permissions) THEN RAISE EXCEPTION 'Customer photos require read access' USING ERRCODE='22023'; END IF;
 IF 'customers.photos.manage'=ANY(permissions) AND NOT ARRAY['customers.manage','customers.photos.read'] <@ permissions THEN RAISE EXCEPTION 'Photo management requires customer management and photo read access' USING ERRCODE='22023'; END IF;
 FOREACH p IN ARRAY permissions LOOP
 IF p IS NULL OR p NOT IN ('workspace.read','workspace.manage','workspace.private.read','access.manage','locations.all','audit.read','journal.read','journal.post','files.read','files.manage','masters.read','masters.manage','masters.rates.read','customers.read','customers.manage','customers.archive','customers.photos.read','customers.photos.manage') OR NOT app.has_permission(p) THEN RAISE EXCEPTION 'Permission exceeds delegation' USING ERRCODE='42501'; END IF;
 END LOOP;
 INSERT INTO app.roles(tenant_id,name) VALUES(op.owner_id,trim(role_name)) RETURNING id INTO role_identity;
 INSERT INTO app.permission_grants SELECT DISTINCT op.owner_id,role_identity,x.permission FROM unnest(permissions) AS x(permission);
 RETURN role_identity;
END $$;
