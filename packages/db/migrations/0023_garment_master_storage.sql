-- Tenant-wide configuration, admitted through a concrete location. No runtime table grants.
CREATE FUNCTION app.normalize_master_name(value text) RETURNS text
LANGUAGE sql IMMUTABLE STRICT SET search_path='' AS $$
 SELECT translate(normalize(btrim(value), NFC),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz')
$$;
CREATE TABLE app.master_catalog_state (
 tenant_id uuid PRIMARY KEY REFERENCES app.tenants(id), version integer NOT NULL DEFAULT 0 CHECK(version>=0),
 hide_standard_garments boolean NOT NULL DEFAULT false, hide_standard_services boolean NOT NULL DEFAULT false,
 starter_bundle_version text CHECK(starter_bundle_version='tailoring-core-v1'), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE app.garments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES app.tenants(id),
 origin text NOT NULL CHECK(origin IN ('standard','custom')), template_key text,
 active boolean NOT NULL DEFAULT true, normalized_name text NOT NULL CHECK(length(normalized_name) BETWEEN 1 AND 100),
 applicability text NOT NULL CHECK(applicability IN ('masculine','feminine','unisex','unspecified')),
 sort_position integer NOT NULL CHECK(sort_position>=0), version integer NOT NULL CHECK(version>0),
 current_version_id uuid, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(tenant_id,id), UNIQUE(tenant_id,normalized_name), UNIQUE(tenant_id,template_key),
 CHECK((origin='standard' AND template_key IS NOT NULL AND template_key IN ('shirt','blouse','trouser')) OR (origin='custom' AND template_key IS NULL))
);
CREATE TABLE app.master_services (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES app.tenants(id),
 origin text NOT NULL CHECK(origin IN ('standard','custom')), template_key text,
 active boolean NOT NULL DEFAULT true, normalized_name text NOT NULL CHECK(length(normalized_name) BETWEEN 1 AND 100),
 sort_position integer NOT NULL CHECK(sort_position>=0), version integer NOT NULL CHECK(version>0), current_version_id uuid,
 UNIQUE(tenant_id,id), UNIQUE(tenant_id,normalized_name), UNIQUE(tenant_id,template_key),
 CHECK((origin='standard' AND template_key IS NOT NULL AND template_key IN ('new-stitching','alteration')) OR (origin='custom' AND template_key IS NULL))
);
CREATE TABLE app.master_addons (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES app.tenants(id),
 active boolean NOT NULL DEFAULT true, normalized_name text NOT NULL CHECK(length(normalized_name) BETWEEN 1 AND 100),
 sort_position integer NOT NULL CHECK(sort_position>=0), version integer NOT NULL CHECK(version>0), current_version_id uuid,
 UNIQUE(tenant_id,id), UNIQUE(tenant_id,normalized_name)
);
CREATE TABLE app.garment_versions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL, garment_id uuid NOT NULL,
 revision integer NOT NULL CHECK(revision>0), format_version integer NOT NULL CHECK(format_version=1), definition jsonb NOT NULL,
 base_rate numeric(24,6) CHECK(base_rate>=0 AND base_rate<=999999999999999999.999999), currency text NOT NULL CHECK(currency='INR'),
 author_id uuid NOT NULL REFERENCES app.principals(id), created_location_id uuid NOT NULL,
 operation_id uuid NOT NULL REFERENCES app.command_operations(id), created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(tenant_id,garment_id,id), UNIQUE(tenant_id,garment_id,revision),
 FOREIGN KEY(tenant_id,garment_id) REFERENCES app.garments(tenant_id,id),
 FOREIGN KEY(tenant_id,created_location_id) REFERENCES app.locations(tenant_id,id),
 CHECK(jsonb_typeof(definition)='object' AND octet_length(definition::text)<=65536)
);
CREATE TABLE app.master_service_versions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL, service_id uuid NOT NULL,
 revision integer NOT NULL CHECK(revision>0), label text NOT NULL CHECK(length(btrim(label)) BETWEEN 1 AND 100),
 author_id uuid NOT NULL REFERENCES app.principals(id), created_location_id uuid NOT NULL,
 operation_id uuid NOT NULL REFERENCES app.command_operations(id), created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(tenant_id,service_id,id), UNIQUE(tenant_id,service_id,revision),
 FOREIGN KEY(tenant_id,service_id) REFERENCES app.master_services(tenant_id,id),
 FOREIGN KEY(tenant_id,created_location_id) REFERENCES app.locations(tenant_id,id)
);
CREATE TABLE app.master_addon_versions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL, addon_id uuid NOT NULL,
 revision integer NOT NULL CHECK(revision>0), label text NOT NULL CHECK(length(btrim(label)) BETWEEN 1 AND 100),
 amount numeric(24,6) NOT NULL CHECK(amount>=0 AND amount<=999999999999999999.999999), currency text NOT NULL CHECK(currency='INR'),
 author_id uuid NOT NULL REFERENCES app.principals(id), created_location_id uuid NOT NULL,
 operation_id uuid NOT NULL REFERENCES app.command_operations(id), created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(tenant_id,addon_id,id), UNIQUE(tenant_id,addon_id,revision),
 FOREIGN KEY(tenant_id,addon_id) REFERENCES app.master_addons(tenant_id,id),
 FOREIGN KEY(tenant_id,created_location_id) REFERENCES app.locations(tenant_id,id)
);
ALTER TABLE app.garments ADD FOREIGN KEY(tenant_id,id,current_version_id) REFERENCES app.garment_versions(tenant_id,garment_id,id);
ALTER TABLE app.master_services ADD FOREIGN KEY(tenant_id,id,current_version_id) REFERENCES app.master_service_versions(tenant_id,service_id,id);
ALTER TABLE app.master_addons ADD FOREIGN KEY(tenant_id,id,current_version_id) REFERENCES app.master_addon_versions(tenant_id,addon_id,id);
CREATE TABLE app.garment_schema_identities (
 tenant_id uuid NOT NULL, garment_id uuid NOT NULL, node_id uuid NOT NULL,
 node_kind text NOT NULL CHECK(node_kind IN ('field','section','group','option')), signature jsonb NOT NULL,
 owner_node_id uuid, created_revision integer NOT NULL CHECK(created_revision>0), retired_revision integer CHECK(retired_revision>created_revision),
 PRIMARY KEY(tenant_id,garment_id,node_id), FOREIGN KEY(tenant_id,garment_id) REFERENCES app.garments(tenant_id,id),
 FOREIGN KEY(tenant_id,garment_id,owner_node_id) REFERENCES app.garment_schema_identities(tenant_id,garment_id,node_id)
);
CREATE TABLE app.garment_version_services (
 tenant_id uuid NOT NULL, garment_id uuid NOT NULL, garment_version_id uuid NOT NULL, service_id uuid NOT NULL,
 position integer NOT NULL CHECK(position>=0), saved_label text NOT NULL CHECK(length(btrim(saved_label)) BETWEEN 1 AND 100),
 rate_override numeric(24,6) CHECK(rate_override>=0 AND rate_override<=999999999999999999.999999),
 PRIMARY KEY(tenant_id,garment_version_id,service_id), UNIQUE(tenant_id,garment_version_id,position),
 FOREIGN KEY(tenant_id,garment_id,garment_version_id) REFERENCES app.garment_versions(tenant_id,garment_id,id),
 FOREIGN KEY(tenant_id,service_id) REFERENCES app.master_services(tenant_id,id)
);
CREATE TABLE app.garment_version_addons (
 tenant_id uuid NOT NULL, garment_id uuid NOT NULL, garment_version_id uuid NOT NULL, addon_id uuid NOT NULL,
 position integer NOT NULL CHECK(position>=0), saved_label text NOT NULL CHECK(length(btrim(saved_label)) BETWEEN 1 AND 100),
 PRIMARY KEY(tenant_id,garment_version_id,addon_id), UNIQUE(tenant_id,garment_version_id,position),
 FOREIGN KEY(tenant_id,garment_id,garment_version_id) REFERENCES app.garment_versions(tenant_id,garment_id,id),
 FOREIGN KEY(tenant_id,addon_id) REFERENCES app.master_addons(tenant_id,id)
);
-- Tenant prefix supports the foreign keys too; referencing indexes are explicit.
CREATE INDEX garments_name_prefix ON app.garments(tenant_id,normalized_name text_pattern_ops);
CREATE INDEX services_name_prefix ON app.master_services(tenant_id,normalized_name text_pattern_ops);
CREATE INDEX addons_name_prefix ON app.master_addons(tenant_id,normalized_name text_pattern_ops);
CREATE INDEX garments_register ON app.garments(tenant_id,origin,active,sort_position,id);
CREATE INDEX garments_applicability ON app.garments(tenant_id,applicability,sort_position,id);
CREATE INDEX services_register ON app.master_services(tenant_id,origin,active,sort_position,id);
CREATE INDEX addons_register ON app.master_addons(tenant_id,active,sort_position,id);
CREATE INDEX identities_owner ON app.garment_schema_identities(tenant_id,garment_id,owner_node_id);
CREATE INDEX garment_services_version ON app.garment_version_services(tenant_id,garment_id,garment_version_id);
CREATE INDEX garment_services_reference ON app.garment_version_services(tenant_id,service_id);
CREATE INDEX garment_addons_version ON app.garment_version_addons(tenant_id,garment_id,garment_version_id);
CREATE INDEX garment_addons_reference ON app.garment_version_addons(tenant_id,addon_id);
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['garment_versions','master_service_versions','master_addon_versions'] LOOP
 EXECUTE format('CREATE INDEX ON app.%I(author_id)',t);
 EXECUTE format('CREATE INDEX ON app.%I(tenant_id,created_location_id)',t);
 EXECUTE format('CREATE INDEX ON app.%I(operation_id)',t);
 END LOOP;
 FOREACH t IN ARRAY ARRAY['master_catalog_state','garments','master_services','master_addons','garment_versions','master_service_versions','master_addon_versions','garment_schema_identities','garment_version_services','garment_version_addons'] LOOP
 EXECUTE format('ALTER TABLE app.%I ENABLE ROW LEVEL SECURITY',t);
 EXECUTE format('ALTER TABLE app.%I FORCE ROW LEVEL SECURITY',t);
 EXECUTE format('CREATE POLICY migration_access ON app.%I TO fitloom_migrator USING(true) WITH CHECK(true)',t);
 END LOOP;
END $$;
CREATE FUNCTION app.master_immutable() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN RAISE EXCEPTION 'Saved master history is immutable' USING ERRCODE='23514'; END $$;
CREATE FUNCTION app.master_identity_retirement() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Schema identities are retained' USING ERRCODE='23514'; END IF;
 IF (to_jsonb(NEW)-'retired_revision') IS DISTINCT FROM (to_jsonb(OLD)-'retired_revision') OR OLD.retired_revision IS NOT NULL OR NEW.retired_revision IS NULL THEN
 RAISE EXCEPTION 'Only one-way retirement is permitted' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER identities_retirement BEFORE UPDATE OR DELETE ON app.garment_schema_identities FOR EACH ROW EXECUTE FUNCTION app.master_identity_retirement();
CREATE FUNCTION app.master_current_required() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE present boolean;
BEGIN
 EXECUTE format('SELECT current_version_id IS NOT NULL FROM app.%I WHERE tenant_id=$1 AND id=$2',TG_TABLE_NAME) INTO present USING NEW.tenant_id,NEW.id;
 IF present IS DISTINCT FROM true THEN RAISE EXCEPTION 'Current master version required' USING ERRCODE='23514'; END IF;
 RETURN NULL;
END $$;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['garment_versions','master_service_versions','master_addon_versions','garment_version_services','garment_version_addons'] LOOP
 EXECUTE format('CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON app.%I FOR EACH ROW EXECUTE FUNCTION app.master_immutable()',t);
 END LOOP;
 FOREACH t IN ARRAY ARRAY['garments','master_services','master_addons'] LOOP
 EXECUTE format('CREATE CONSTRAINT TRIGGER current_required AFTER INSERT OR UPDATE ON app.%I DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION app.master_current_required()',t);
 EXECUTE format('CREATE TRIGGER retained BEFORE DELETE ON app.%I FOR EACH ROW EXECUTE FUNCTION app.master_immutable()',t);
 END LOOP;
END $$;
-- Preserve existing grants, including workspace.manage on existing Owner roles.
INSERT INTO app.permission_grants(tenant_id,role_id,permission)
 SELECT tenant_id,id,p FROM app.roles CROSS JOIN unnest(ARRAY['masters.read','masters.manage','masters.rates.read']) p WHERE preset='owner' ON CONFLICT DO NOTHING;
CREATE OR REPLACE FUNCTION app.install_role_presets(tenant uuid,owner_role uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE manager uuid; staff uuid;
BEGIN
 UPDATE app.roles SET preset='owner' WHERE id=owner_role AND tenant_id=tenant;
 INSERT INTO app.roles(tenant_id,name,preset) VALUES(tenant,'Manager','manager') RETURNING id INTO manager;
 INSERT INTO app.roles(tenant_id,name,preset) VALUES(tenant,'Staff','staff') RETURNING id INTO staff;
 INSERT INTO app.permission_grants SELECT tenant,owner_role,permission FROM unnest(ARRAY['workspace.read','workspace.private.read','access.manage','locations.all','audit.read','files.read','files.manage','masters.read','masters.manage','masters.rates.read']) permission ON CONFLICT DO NOTHING;
 INSERT INTO app.permission_grants VALUES(tenant,manager,'workspace.read'),(tenant,manager,'workspace.manage'),(tenant,staff,'workspace.read');
 UPDATE app.memberships m SET is_owner=true WHERE m.tenant_id=tenant AND EXISTS(SELECT FROM app.location_grants g WHERE (g.tenant_id,g.membership_id)=(m.tenant_id,m.id) AND g.role_id=owner_role);
END $$;
CREATE OR REPLACE FUNCTION app.create_custom_role(role_name text,permissions text[]) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE op app.command_operations:=app.active_operation(); role_identity uuid; p text;
BEGIN
 PERFORM 1 FROM app.tenants WHERE id=op.owner_id FOR UPDATE;
 IF op.owner_kind<>'tenant' OR op.command_kind<>'role.create' OR NOT app.has_permission('access.manage') THEN RAISE EXCEPTION 'Role administration denied' USING ERRCODE='42501'; END IF;
 IF role_name IS NULL OR permissions IS NULL OR length(trim(role_name)) NOT BETWEEN 1 AND 80 OR cardinality(permissions) NOT BETWEEN 1 AND 20 OR NOT 'workspace.read'=ANY(permissions) THEN RAISE EXCEPTION 'Invalid role' USING ERRCODE='22023'; END IF;
 IF 'masters.manage'=ANY(permissions) AND NOT (ARRAY['masters.read','masters.rates.read'] <@ permissions) THEN RAISE EXCEPTION 'Master management requires schema and rate read permissions' USING ERRCODE='22023'; END IF;
 FOREACH p IN ARRAY permissions LOOP
 IF p IS NULL OR p NOT IN ('workspace.read','workspace.manage','workspace.private.read','access.manage','locations.all','audit.read','journal.read','journal.post','files.read','files.manage','masters.read','masters.manage','masters.rates.read') OR NOT app.has_permission(p) THEN RAISE EXCEPTION 'Permission exceeds delegation' USING ERRCODE='42501'; END IF;
 END LOOP;
 INSERT INTO app.roles(tenant_id,name) VALUES(op.owner_id,trim(role_name)) RETURNING id INTO role_identity;
 INSERT INTO app.permission_grants SELECT DISTINCT op.owner_id,role_identity,x.permission FROM unnest(permissions) AS x(permission);
 RETURN role_identity;
END $$;
REVOKE ALL ON FUNCTION app.normalize_master_name(text),app.master_immutable(),app.master_identity_retirement(),app.master_current_required() FROM PUBLIC;
