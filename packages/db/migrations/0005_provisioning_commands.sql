-- Draft content and provisioning now require a claimed application command.
REVOKE INSERT ON app.setup_drafts FROM fitloom_web;
ALTER FUNCTION app.provision_tenant(text,text) RENAME TO provision_tenant_internal;
REVOKE EXECUTE ON FUNCTION app.provision_tenant_internal(text,text) FROM fitloom_web;
CREATE FUNCTION app.principal_verified() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT app.principal_active() AND EXISTS (SELECT FROM app.principals p JOIN public."user" u ON u.id=p.auth_user_id
    WHERE p.id=nullif(current_setting('app.principal_id',true),'')::uuid AND u.email_verified)
$$;
CREATE FUNCTION app.provision_tenant(shop_name text,location_name text,expected_version integer) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE op app.command_operations:=app.active_operation(); current_version integer;
BEGIN
  IF op.owner_kind<>'principal' OR op.command_kind<>'tenant.provision' OR NOT app.principal_verified() THEN
    RAISE EXCEPTION 'Verified provisioning command required' USING ERRCODE='42501'; END IF;
  SELECT version INTO current_version FROM app.setup_drafts WHERE principal_id=op.actor_id FOR UPDATE;
  IF current_version IS NULL OR current_version IS DISTINCT FROM expected_version THEN
    RAISE EXCEPTION 'Stale setup version' USING ERRCODE='P0003'; END IF;
  RETURN app.provision_tenant_internal(shop_name,location_name);
END $$;
REVOKE ALL ON FUNCTION app.principal_verified(),app.provision_tenant(text,text,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.principal_verified(),app.provision_tenant(text,text,integer) TO fitloom_web;
