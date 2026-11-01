-- Migrations execute as fitloom_migrator. Default-deny future objects too.
REVOKE ALL ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON SCHEMA app FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA public, app FROM PUBLIC;
ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO fitloom_auth;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."user", public.account, public.session, public.verification, public.two_factor, public.rate_limit TO fitloom_auth;
GRANT USAGE ON SCHEMA app TO fitloom_web, fitloom_worker, fitloom_operator;

CREATE FUNCTION app.principal_active() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT FROM app.principals p WHERE p.id = nullif(current_setting('app.principal_id', true), '')::uuid AND p.active)
$$;
CREATE FUNCTION app.can_access_tenant(target uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT target = nullif(current_setting('app.tenant_id', true), '')::uuid
    AND app.principal_active()
    AND EXISTS (SELECT FROM app.memberships m JOIN app.tenants t ON t.id = m.tenant_id
      WHERE m.tenant_id = target AND m.principal_id = nullif(current_setting('app.principal_id', true), '')::uuid AND m.active AND t.active)
$$;
CREATE FUNCTION app.can_access_location(target uuid, location uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT app.can_access_tenant(target)
    AND location = nullif(current_setting('app.location_id', true), '')::uuid
    AND EXISTS (SELECT FROM app.location_grants g JOIN app.memberships m ON (m.tenant_id, m.id) = (g.tenant_id, g.membership_id)
      JOIN app.locations l ON (l.tenant_id, l.id) = (g.tenant_id, g.location_id)
      WHERE g.tenant_id = target AND g.location_id = location AND l.archived_at IS NULL
        AND m.principal_id = nullif(current_setting('app.principal_id', true), '')::uuid AND m.active)
$$;

-- Only the selected principal's discovery projection is available before tenant selection.
CREATE FUNCTION app.discover_memberships() RETURNS TABLE(tenant_id uuid, location_id uuid, role_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT m.tenant_id, g.location_id, g.role_id FROM app.memberships m
  JOIN app.tenants t ON t.id = m.tenant_id
  JOIN app.location_grants g ON (g.tenant_id, g.membership_id) = (m.tenant_id, m.id)
  JOIN app.locations l ON (l.tenant_id, l.id) = (g.tenant_id, g.location_id)
  WHERE m.principal_id = nullif(current_setting('app.principal_id', true), '')::uuid
    AND app.principal_active() AND m.active AND t.active AND l.archived_at IS NULL
$$;

-- No caller-supplied owner, tenant, role, or permission. A locked setup identity makes retries safe.
CREATE FUNCTION app.provision_tenant(shop_name text, location_name text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor uuid := nullif(current_setting('app.principal_id', true), '')::uuid;
  operation uuid; result uuid; membership uuid; location uuid; owner_role uuid;
BEGIN
  IF NOT app.principal_active() OR NOT EXISTS (SELECT FROM app.principals p JOIN public."user" u ON u.id = p.auth_user_id WHERE p.id = actor AND u.email_verified) THEN
    RAISE EXCEPTION 'Verified active identity required' USING ERRCODE = '42501';
  END IF;
  IF length(trim(shop_name)) NOT BETWEEN 1 AND 200 OR length(trim(location_name)) NOT BETWEEN 1 AND 200 OR shop_name IS NULL OR location_name IS NULL THEN
    RAISE EXCEPTION 'Invalid setup names' USING ERRCODE = '22023';
  END IF;
  SELECT provisioning_id INTO operation FROM app.setup_drafts WHERE principal_id = actor FOR UPDATE;
  IF operation IS NULL THEN RAISE EXCEPTION 'Setup draft required' USING ERRCODE = '42501'; END IF;
  SELECT tenant_id INTO result FROM app.tenant_setup WHERE provisioning_id = operation;
  IF result IS NOT NULL THEN RETURN result; END IF;
  INSERT INTO app.tenants(name) VALUES (trim(shop_name)) RETURNING id INTO result;
  INSERT INTO app.locations(tenant_id, name) VALUES (result, trim(location_name)) RETURNING id INTO location;
  INSERT INTO app.memberships(tenant_id, principal_id) VALUES (result, actor) RETURNING id INTO membership;
  INSERT INTO app.roles(tenant_id, name) VALUES (result, 'Owner') RETURNING id INTO owner_role;
  INSERT INTO app.permission_grants(tenant_id, role_id, permission) VALUES (result, owner_role, 'workspace.manage');
  INSERT INTO app.location_grants VALUES (result, membership, location, owner_role);
  INSERT INTO app.tenant_setup(tenant_id, principal_id, provisioning_id) VALUES (result, actor, operation);
  INSERT INTO app.security_audit(principal_id, action, subject_id) VALUES (actor, 'tenant.provisioned', result);
  RETURN result;
END $$;

-- Security-definer functions run under the migration role's explicit policy.
-- Runtime identities cannot inherit or assume this role.
DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['principals','tenants','locations','memberships','roles','permission_grants','location_grants','setup_drafts','tenant_setup','operator_grants','security_audit'] LOOP
    EXECUTE format('ALTER TABLE app.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE app.%I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format('CREATE POLICY migration_access ON app.%I TO fitloom_migrator USING (true) WITH CHECK (true)', table_name);
  END LOOP;
END $$;
CREATE POLICY principal_self ON app.principals FOR SELECT TO fitloom_web, fitloom_worker, fitloom_operator
  USING (id = nullif(current_setting('app.principal_id', true), '')::uuid AND active);
CREATE POLICY tenant_scope ON app.tenants FOR SELECT TO fitloom_web, fitloom_worker USING (app.can_access_tenant(id));
CREATE POLICY location_scope ON app.locations FOR SELECT TO fitloom_web, fitloom_worker USING (app.can_access_location(tenant_id, id));
CREATE POLICY membership_scope ON app.memberships FOR SELECT TO fitloom_web, fitloom_worker USING (app.can_access_tenant(tenant_id) AND principal_id = nullif(current_setting('app.principal_id', true), '')::uuid);
CREATE POLICY role_scope ON app.roles FOR SELECT TO fitloom_web, fitloom_worker USING (app.can_access_tenant(tenant_id));
CREATE POLICY permission_scope ON app.permission_grants FOR SELECT TO fitloom_web, fitloom_worker USING (app.can_access_tenant(tenant_id));
CREATE POLICY grant_scope ON app.location_grants FOR SELECT TO fitloom_web, fitloom_worker USING (app.can_access_location(tenant_id, location_id) AND membership_id IN (SELECT id FROM app.memberships));
CREATE POLICY draft_scope ON app.setup_drafts TO fitloom_web
  USING (principal_id = nullif(current_setting('app.principal_id', true), '')::uuid AND app.principal_active())
  WITH CHECK (principal_id = nullif(current_setting('app.principal_id', true), '')::uuid AND app.principal_active());
CREATE POLICY setup_scope ON app.tenant_setup FOR SELECT TO fitloom_web, fitloom_worker USING (app.can_access_tenant(tenant_id));
CREATE POLICY operator_self ON app.operator_grants FOR SELECT TO fitloom_operator USING (principal_id = nullif(current_setting('app.principal_id', true), '')::uuid AND app.principal_active());
GRANT SELECT ON app.principals, app.tenants, app.locations, app.memberships, app.roles, app.permission_grants, app.location_grants, app.tenant_setup TO fitloom_web, fitloom_worker;
GRANT SELECT, INSERT ON app.setup_drafts TO fitloom_web;
GRANT UPDATE (draft) ON app.setup_drafts TO fitloom_web;
GRANT SELECT ON app.principals, app.operator_grants TO fitloom_operator;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA app FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.principal_active() TO fitloom_web, fitloom_worker, fitloom_operator;
GRANT EXECUTE ON FUNCTION app.can_access_tenant(uuid), app.can_access_location(uuid, uuid), app.discover_memberships() TO fitloom_web, fitloom_worker;
GRANT EXECUTE ON FUNCTION app.provision_tenant(text, text) TO fitloom_web;
