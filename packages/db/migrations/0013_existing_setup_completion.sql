-- Earlier local foundation shops resume profile completion under their original provisioning identity.
CREATE OR REPLACE FUNCTION app.provision_tenant(shop_name text,location_name text,expected_version integer) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE op app.command_operations:=app.active_operation(); d app.setup_drafts; result uuid; owner_role uuid; email text;
BEGIN
 IF op.owner_kind<>'principal' OR op.command_kind<>'tenant.provision' OR NOT app.principal_verified() THEN RAISE EXCEPTION 'Verified provisioning command required' USING ERRCODE='42501'; END IF;
 SELECT * INTO d FROM app.setup_drafts WHERE principal_id=op.actor_id FOR UPDATE;
 IF d.principal_id IS NULL OR d.version IS DISTINCT FROM expected_version THEN RAISE EXCEPTION 'Stale setup version' USING ERRCODE='P0003'; END IF;
 SELECT tenant_id INTO result FROM app.tenant_setup WHERE provisioning_id=d.provisioning_id;
 IF result IS NOT NULL AND EXISTS(SELECT FROM app.shop_settings WHERE tenant_id=result) THEN RETURN result; END IF;
 IF d.draft->>'shopName' IS DISTINCT FROM shop_name OR d.draft->>'locationName' IS DISTINCT FROM location_name
 OR coalesce(d.draft->>'businessMode','') NOT IN ('tailoring','boutique','mixed')
 OR length(trim(coalesce(d.draft->>'ownerName',''))) NOT BETWEEN 1 AND 200
 OR coalesce(d.draft->>'ownerPhone','') !~ '^[+0-9 ()-]{7,30}$'
 OR length(trim(coalesce(d.draft->>'address',''))) NOT BETWEEN 1 AND 1000
 OR d.draft->>'consentVersion' IS DISTINCT FROM 'workspace-authority-v1' OR d.draft->'consentAccepted' IS DISTINCT FROM 'true'::jsonb
 OR NOT EXISTS(SELECT FROM pg_catalog.pg_timezone_names WHERE name=d.draft->>'timezone')
 THEN RAISE EXCEPTION 'Complete setup and authority consent required' USING ERRCODE='22023'; END IF;
 result:=app.provision_tenant_internal(shop_name,location_name);
 SELECT id INTO owner_role FROM app.roles WHERE tenant_id=result AND name='Owner';
 IF NOT EXISTS(SELECT FROM app.roles WHERE tenant_id=result AND preset='manager') THEN PERFORM app.install_role_presets(result,owner_role); END IF;
 SELECT u.email INTO email FROM public."user" u JOIN app.principals p ON p.auth_user_id=u.id WHERE p.id=op.actor_id;
 INSERT INTO app.shop_settings(tenant_id,business_mode,timezone,address,consent_version) VALUES(result,d.draft->>'businessMode',d.draft->>'timezone',d.draft->>'address','workspace-authority-v1');
 INSERT INTO app.owner_contacts VALUES(result,op.actor_id,d.draft->>'ownerName',email,d.draft->>'ownerPhone');
 RETURN result;
END $$;
CREATE OR REPLACE FUNCTION app.begin_another_setup(expected_version integer) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE op app.command_operations:=app.active_operation(); d app.setup_drafts;
BEGIN
 IF op.owner_kind<>'principal' OR op.command_kind<>'setup.begin' OR NOT app.principal_verified() THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
 SELECT * INTO d FROM app.setup_drafts WHERE principal_id=op.actor_id FOR UPDATE;
 IF d.version IS DISTINCT FROM expected_version OR NOT EXISTS(SELECT FROM app.tenant_setup t JOIN app.shop_settings s ON s.tenant_id=t.tenant_id WHERE t.provisioning_id=d.provisioning_id) THEN RAISE EXCEPTION 'Finish the current setup first' USING ERRCODE='P0003'; END IF;
 UPDATE app.setup_drafts SET provisioning_id=gen_random_uuid(),draft='{}',version=version+1 WHERE principal_id=op.actor_id RETURNING version INTO expected_version;
 RETURN expected_version;
END $$;
CREATE OR REPLACE FUNCTION app.setup_progress() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT jsonb_build_object('version',d.version,'draft',d.draft,'tenantId',(SELECT t.tenant_id FROM app.tenant_setup t JOIN app.shop_settings s ON s.tenant_id=t.tenant_id WHERE t.provisioning_id=d.provisioning_id))
 FROM app.setup_drafts d WHERE d.principal_id=nullif(current_setting('app.principal_id',true),'')::uuid AND app.principal_verified()
$$;

-- An alternative owner must retain an actual owner grant at an active location.
CREATE OR REPLACE FUNCTION app.set_member_role(membership uuid,role_identity uuid,expected_version integer,enabled boolean) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE op app.command_operations:=app.active_operation();target app.memberships;location uuid:=nullif(current_setting('app.location_id',true),'')::uuid;new_owner boolean;
BEGIN
 PERFORM 1 FROM app.tenants WHERE id=op.owner_id FOR UPDATE;
 IF op.owner_kind<>'tenant' OR op.command_kind<>'member.role' OR NOT app.has_permission('access.manage') OR NOT app.delegates_role(op.actor_id,op.owner_id,location,role_identity) THEN RAISE EXCEPTION 'Delegation denied' USING ERRCODE='42501'; END IF;
 SELECT * INTO target FROM app.memberships WHERE tenant_id=op.owner_id AND id=membership FOR UPDATE;
 IF target.id IS NULL OR target.principal_id=op.actor_id THEN RAISE EXCEPTION 'Self-assignment or invalid member denied' USING ERRCODE='42501'; END IF;
 IF target.version IS DISTINCT FROM expected_version THEN RAISE EXCEPTION 'Stale member version' USING ERRCODE='P0003'; END IF;
 IF target.is_owner AND NOT EXISTS(SELECT FROM app.memberships m JOIN app.principals p ON p.id=m.principal_id WHERE m.tenant_id=op.owner_id AND m.id<>target.id AND m.active AND m.is_owner AND p.active AND EXISTS(SELECT FROM app.location_grants g JOIN app.roles r ON (r.tenant_id,r.id)=(g.tenant_id,g.role_id) JOIN app.locations l ON (l.tenant_id,l.id)=(g.tenant_id,g.location_id) WHERE (g.tenant_id,g.membership_id)=(m.tenant_id,m.id) AND r.preset='owner' AND l.archived_at IS NULL)) THEN RAISE EXCEPTION 'Final active owner must remain' USING ERRCODE='23514'; END IF;
 IF target.is_owner AND NOT EXISTS(SELECT FROM app.memberships WHERE tenant_id=op.owner_id AND principal_id=op.actor_id AND is_owner AND active) THEN RAISE EXCEPTION 'Only an owner manages owner membership' USING ERRCODE='42501'; END IF;
 DELETE FROM app.location_grants WHERE tenant_id=op.owner_id AND membership_id=target.id AND location_id=location;
 IF enabled THEN INSERT INTO app.location_grants VALUES(op.owner_id,target.id,location,role_identity);END IF;
 SELECT EXISTS(SELECT FROM app.location_grants g JOIN app.roles r ON (r.tenant_id,r.id)=(g.tenant_id,g.role_id) WHERE g.tenant_id=op.owner_id AND g.membership_id=target.id AND r.preset='owner') INTO new_owner;
 UPDATE app.memberships SET is_owner=new_owner,version=version+1,active=EXISTS(SELECT FROM app.location_grants WHERE tenant_id=op.owner_id AND membership_id=target.id) WHERE id=target.id RETURNING version INTO expected_version;
 RETURN expected_version;
END $$;
