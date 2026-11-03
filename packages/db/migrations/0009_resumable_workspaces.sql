-- Day 4: SQL-owned domain tables and narrow authorization/provisioning paths.
ALTER TABLE app.roles ADD COLUMN preset text CHECK(preset IN ('owner','manager','staff'));
ALTER TABLE app.memberships ADD COLUMN is_owner boolean NOT NULL DEFAULT false;
ALTER TABLE app.memberships ADD COLUMN version integer NOT NULL DEFAULT 0;
CREATE TABLE app.shop_settings (
 tenant_id uuid PRIMARY KEY REFERENCES app.tenants(id),business_mode text NOT NULL CHECK(business_mode IN ('tailoring','boutique','mixed')),
 timezone text NOT NULL,address text NOT NULL,consent_version text NOT NULL,consented_at timestamptz NOT NULL DEFAULT now(),
 version integer NOT NULL DEFAULT 0 CHECK(version>=0)
);
CREATE TABLE app.owner_contacts (
 tenant_id uuid PRIMARY KEY REFERENCES app.tenants(id),principal_id uuid NOT NULL REFERENCES app.principals(id),name text NOT NULL,email text NOT NULL,phone text NOT NULL
);
CREATE INDEX owner_contacts_principal ON app.owner_contacts(principal_id);
CREATE TABLE app.personal_preferences (
 principal_id uuid PRIMARY KEY REFERENCES app.principals(id),locale text NOT NULL DEFAULT 'en',tenant_id uuid,location_id uuid,
 FOREIGN KEY(tenant_id,location_id) REFERENCES app.locations(tenant_id,id),CHECK((tenant_id IS NULL)=(location_id IS NULL))
);
CREATE TABLE app.staff_invitations (
 id uuid PRIMARY KEY,tenant_id uuid NOT NULL,location_id uuid NOT NULL,role_id uuid NOT NULL,
 recipient_email text NOT NULL CHECK(recipient_email=lower(recipient_email)),inviter_id uuid NOT NULL REFERENCES app.principals(id),
 expires_at timestamptz NOT NULL DEFAULT (now()+interval '48 hours'),revoked_at timestamptz,accepted_by uuid REFERENCES app.principals(id),accepted_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(tenant_id,id),
 FOREIGN KEY(tenant_id,location_id) REFERENCES app.locations(tenant_id,id),FOREIGN KEY(tenant_id,role_id) REFERENCES app.roles(tenant_id,id),
 CHECK((accepted_by IS NULL)=(accepted_at IS NULL))
);
CREATE INDEX invitations_location ON app.staff_invitations(tenant_id,location_id);
CREATE INDEX invitations_role ON app.staff_invitations(tenant_id,role_id);
CREATE INDEX invitations_recipient ON app.staff_invitations(recipient_email);
CREATE INDEX invitations_inviter ON app.staff_invitations(inviter_id);
CREATE INDEX invitations_accepted_by ON app.staff_invitations(accepted_by);
ALTER TABLE app.auth_mail DROP CONSTRAINT auth_mail_kind_check;
ALTER TABLE app.auth_mail ADD CONSTRAINT auth_mail_kind_check CHECK(kind IN ('verification','recovery','invitation'));
ALTER TABLE app.auth_mail ADD COLUMN invitation_id uuid;
ALTER TABLE app.auth_mail ADD COLUMN tenant_id uuid;
ALTER TABLE app.auth_mail ADD FOREIGN KEY(tenant_id,invitation_id) REFERENCES app.staff_invitations(tenant_id,id);
ALTER TABLE app.auth_mail ADD CHECK((kind='invitation' AND invitation_id IS NOT NULL AND tenant_id IS NOT NULL) OR (kind<>'invitation' AND invitation_id IS NULL AND tenant_id IS NULL));
CREATE INDEX auth_mail_invitation ON app.auth_mail(tenant_id,invitation_id);

-- Internal helper deliberately independent of selected context, never granted to runtime.
CREATE FUNCTION app.member_permission(actor uuid,tenant uuid,location uuid,permission text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT FROM app.memberships m JOIN app.principals p ON p.id=m.principal_id JOIN app.tenants t ON t.id=m.tenant_id
 JOIN app.location_grants g ON (g.tenant_id,g.membership_id)=(m.tenant_id,m.id)
 JOIN app.locations l ON (l.tenant_id,l.id)=(g.tenant_id,g.location_id)
 JOIN app.permission_grants grant_row ON (grant_row.tenant_id,grant_row.role_id)=(g.tenant_id,g.role_id)
 WHERE m.tenant_id=tenant AND m.principal_id=actor AND m.active AND p.active AND t.active AND l.archived_at IS NULL
 AND g.location_id=location AND grant_row.permission=permission)
$$;
CREATE FUNCTION app.delegates_role(actor uuid,tenant uuid,location uuid,role_identity uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT app.member_permission(actor,tenant,location,'access.manage') AND EXISTS(SELECT FROM app.roles r WHERE r.tenant_id=tenant AND r.id=role_identity)
 AND NOT EXISTS(SELECT FROM app.permission_grants p WHERE p.tenant_id=tenant AND p.role_id=role_identity AND NOT app.member_permission(actor,tenant,location,p.permission))
 AND (NOT EXISTS(SELECT FROM app.roles WHERE id=role_identity AND preset='owner') OR EXISTS(SELECT FROM app.memberships WHERE tenant_id=tenant AND principal_id=actor AND active AND is_owner))
$$;
CREATE FUNCTION app.install_role_presets(tenant uuid,owner_role uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE manager uuid;staff uuid;
BEGIN
 UPDATE app.roles SET preset='owner' WHERE id=owner_role AND tenant_id=tenant;
 INSERT INTO app.roles(tenant_id,name,preset) VALUES(tenant,'Manager','manager') RETURNING id INTO manager;
 INSERT INTO app.roles(tenant_id,name,preset) VALUES(tenant,'Staff','staff') RETURNING id INTO staff;
 INSERT INTO app.permission_grants SELECT tenant,owner_role,permission FROM unnest(ARRAY['workspace.read','workspace.private.read','access.manage','locations.all','audit.read']) permission ON CONFLICT DO NOTHING;
 INSERT INTO app.permission_grants VALUES(tenant,manager,'workspace.read'),(tenant,manager,'workspace.manage'),(tenant,staff,'workspace.read');
 UPDATE app.memberships m SET is_owner=true WHERE m.tenant_id=tenant AND EXISTS(SELECT FROM app.location_grants g WHERE (g.tenant_id,g.membership_id)=(m.tenant_id,m.id) AND g.role_id=owner_role);
END $$;
-- Preserve existing development shops while installing protected foundation presets.
DO $$ DECLARE r record; BEGIN
 FOR r IN SELECT tenant_id,id FROM app.roles WHERE name='Owner' LOOP PERFORM app.install_role_presets(r.tenant_id,r.id); END LOOP;
END $$;
CREATE OR REPLACE FUNCTION app.provision_tenant(shop_name text,location_name text,expected_version integer) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE op app.command_operations:=app.active_operation(); d app.setup_drafts; result uuid; owner_role uuid; email text;
BEGIN
 IF op.owner_kind<>'principal' OR op.command_kind<>'tenant.provision' OR NOT app.principal_verified() THEN RAISE EXCEPTION 'Verified provisioning command required' USING ERRCODE='42501'; END IF;
 SELECT * INTO d FROM app.setup_drafts WHERE principal_id=op.actor_id FOR UPDATE;
 IF d.principal_id IS NULL OR d.version IS DISTINCT FROM expected_version THEN RAISE EXCEPTION 'Stale setup version' USING ERRCODE='P0003'; END IF;
 SELECT tenant_id INTO result FROM app.tenant_setup WHERE provisioning_id=d.provisioning_id;
 IF result IS NOT NULL THEN RETURN result; END IF;
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
 PERFORM app.install_role_presets(result,owner_role);
 SELECT u.email INTO email FROM public."user" u JOIN app.principals p ON p.auth_user_id=u.id WHERE p.id=op.actor_id;
 INSERT INTO app.shop_settings(tenant_id,business_mode,timezone,address,consent_version) VALUES(result,d.draft->>'businessMode',d.draft->>'timezone',d.draft->>'address','workspace-authority-v1');
 INSERT INTO app.owner_contacts VALUES(result,op.actor_id,d.draft->>'ownerName',email,d.draft->>'ownerPhone');
 RETURN result;
END $$;
CREATE FUNCTION app.begin_another_setup(expected_version integer) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE op app.command_operations:=app.active_operation(); d app.setup_drafts;
BEGIN
 IF op.owner_kind<>'principal' OR op.command_kind<>'setup.begin' OR NOT app.principal_verified() THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
 SELECT * INTO d FROM app.setup_drafts WHERE principal_id=op.actor_id FOR UPDATE;
 IF d.version IS DISTINCT FROM expected_version OR NOT EXISTS(SELECT FROM app.tenant_setup WHERE provisioning_id=d.provisioning_id) THEN RAISE EXCEPTION 'Finish the current setup first' USING ERRCODE='P0003'; END IF;
 UPDATE app.setup_drafts SET provisioning_id=gen_random_uuid(),draft='{}',version=version+1 WHERE principal_id=op.actor_id RETURNING version INTO expected_version;
 RETURN expected_version;
END $$;
CREATE FUNCTION app.setup_progress() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT jsonb_build_object('version',d.version,'draft',d.draft,'tenantId',(SELECT t.tenant_id FROM app.tenant_setup t WHERE t.provisioning_id=d.provisioning_id))
 FROM app.setup_drafts d WHERE d.principal_id=nullif(current_setting('app.principal_id',true),'')::uuid AND app.principal_verified()
$$;
CREATE FUNCTION app.workspace_choices() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT coalesce(jsonb_agg(row_to_json(s) ORDER BY s."shopName",s."locationName"),'[]') FROM (
 SELECT DISTINCT t.id AS "tenantId",t.name AS "shopName",l.id AS "locationId",l.name AS "locationName"
 FROM app.memberships m JOIN app.tenants t ON t.id=m.tenant_id JOIN app.location_grants g ON (g.tenant_id,g.membership_id)=(m.tenant_id,m.id)
 JOIN app.locations l ON (l.tenant_id,l.id)=(g.tenant_id,g.location_id)
 WHERE m.principal_id=nullif(current_setting('app.principal_id',true),'')::uuid AND app.principal_verified() AND m.active AND t.active AND l.archived_at IS NULL
 AND app.member_permission(m.principal_id,t.id,l.id,'workspace.read')) s
$$;
CREATE FUNCTION app.workspace_view() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE tenant uuid:=nullif(current_setting('app.tenant_id',true),'')::uuid;location uuid:=nullif(current_setting('app.location_id',true),'')::uuid;result jsonb;
BEGIN
 IF NOT app.has_permission('workspace.read') THEN RAISE EXCEPTION 'Workspace access denied' USING ERRCODE='42501'; END IF;
 SELECT jsonb_build_object('tenantId',t.id,'shopName',t.name,'locationId',l.id,'locationName',l.name,'businessMode',s.business_mode,'timezone',s.timezone,'address',s.address,'version',s.version,
 'permissions',(SELECT coalesce(jsonb_agg(p.permission ORDER BY p.permission),'[]') FROM (SELECT DISTINCT p.permission FROM app.permission_grants p JOIN app.location_grants g ON (g.tenant_id,g.role_id)=(p.tenant_id,p.role_id)
 JOIN app.memberships m ON (m.tenant_id,m.id)=(g.tenant_id,g.membership_id) WHERE m.tenant_id=tenant AND m.principal_id=nullif(current_setting('app.principal_id',true),'')::uuid AND m.active AND g.location_id=location) p)) INTO result
 FROM app.tenants t JOIN app.locations l ON l.tenant_id=t.id LEFT JOIN app.shop_settings s ON s.tenant_id=t.id WHERE t.id=tenant AND l.id=location;
 IF app.has_permission('workspace.private.read') THEN result:=result||jsonb_build_object('owner',(SELECT jsonb_build_object('name',name,'email',email,'phone',phone) FROM app.owner_contacts WHERE tenant_id=tenant)); END IF;
 RETURN result;
END $$;
CREATE FUNCTION app.all_locations_view() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE tenant uuid:=nullif(current_setting('app.tenant_id',true),'')::uuid;actor uuid:=nullif(current_setting('app.principal_id',true),'')::uuid;
BEGIN
 IF NOT app.has_permission('locations.all') OR EXISTS(SELECT FROM app.locations l WHERE l.tenant_id=tenant AND l.archived_at IS NULL AND NOT app.member_permission(actor,tenant,l.id,'locations.all')) THEN RAISE EXCEPTION 'All Locations access denied' USING ERRCODE='42501'; END IF;
 RETURN (SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name) ORDER BY name),'[]') FROM app.locations WHERE tenant_id=tenant AND archived_at IS NULL);
END $$;
CREATE FUNCTION app.save_personal_preferences(locale text,tenant uuid,location uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE op app.command_operations:=app.active_operation();
BEGIN
 IF op.owner_kind<>'principal' OR op.command_kind<>'preferences.save' OR locale NOT IN ('en','ta','hi') THEN RAISE EXCEPTION 'Invalid preferences' USING ERRCODE='22023'; END IF;
 IF (tenant IS NULL)<>(location IS NULL) OR (tenant IS NOT NULL AND NOT app.member_permission(op.actor_id,tenant,location,'workspace.read')) THEN RAISE EXCEPTION 'Invalid selection' USING ERRCODE='42501'; END IF;
 INSERT INTO app.personal_preferences VALUES(op.actor_id,locale,tenant,location) ON CONFLICT(principal_id) DO UPDATE SET locale=excluded.locale,tenant_id=excluded.tenant_id,location_id=excluded.location_id;
END $$;
CREATE FUNCTION app.read_personal_preferences() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT jsonb_build_object('locale',locale,'tenantId',CASE WHEN app.member_permission(principal_id,tenant_id,location_id,'workspace.read') THEN tenant_id END,'locationId',CASE WHEN app.member_permission(principal_id,tenant_id,location_id,'workspace.read') THEN location_id END)
 FROM app.personal_preferences WHERE principal_id=nullif(current_setting('app.principal_id',true),'')::uuid AND app.principal_verified()
$$;
CREATE FUNCTION app.update_workspace(expected_version integer,shop_name text,address text) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE op app.command_operations:=app.active_operation();next_version integer;
BEGIN
 IF op.owner_kind<>'tenant' OR op.command_kind<>'workspace.update' OR NOT app.has_permission('workspace.manage') THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
 IF length(trim(shop_name)) NOT BETWEEN 1 AND 200 OR length(trim(address)) NOT BETWEEN 1 AND 1000 THEN RAISE EXCEPTION 'Invalid profile' USING ERRCODE='22023'; END IF;
 UPDATE app.shop_settings s SET address=update_workspace.address,version=version+1 WHERE tenant_id=op.owner_id AND version=expected_version RETURNING version INTO next_version;
 IF next_version IS NULL THEN RAISE EXCEPTION 'Stale settings version' USING ERRCODE='P0003'; END IF;
 UPDATE app.tenants SET name=trim(shop_name) WHERE id=op.owner_id;RETURN next_version;
END $$;

CREATE FUNCTION app.create_custom_role(role_name text,permissions text[]) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE op app.command_operations:=app.active_operation();role_identity uuid;p text;
BEGIN
 PERFORM 1 FROM app.tenants WHERE id=op.owner_id FOR UPDATE;
 IF op.owner_kind<>'tenant' OR op.command_kind<>'role.create' OR NOT app.has_permission('access.manage') THEN RAISE EXCEPTION 'Role administration denied' USING ERRCODE='42501'; END IF;
 IF length(trim(role_name)) NOT BETWEEN 1 AND 80 OR cardinality(permissions) NOT BETWEEN 1 AND 20 OR NOT 'workspace.read'=ANY(permissions) THEN RAISE EXCEPTION 'Invalid role' USING ERRCODE='22023'; END IF;
 FOREACH p IN ARRAY permissions LOOP IF p NOT IN ('workspace.read','workspace.manage','workspace.private.read','access.manage','locations.all','audit.read','journal.read','journal.post') OR NOT app.has_permission(p) THEN RAISE EXCEPTION 'Permission exceeds delegation' USING ERRCODE='42501'; END IF; END LOOP;
 INSERT INTO app.roles(tenant_id,name) VALUES(op.owner_id,trim(role_name)) RETURNING id INTO role_identity;
 INSERT INTO app.permission_grants SELECT DISTINCT op.owner_id,role_identity,p FROM unnest(permissions) p;RETURN role_identity;
END $$;
CREATE FUNCTION app.set_member_role(membership uuid,role_identity uuid,expected_version integer,enabled boolean) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE op app.command_operations:=app.active_operation();target app.memberships;location uuid:=nullif(current_setting('app.location_id',true),'')::uuid;new_owner boolean;
BEGIN
 PERFORM 1 FROM app.tenants WHERE id=op.owner_id FOR UPDATE;
 IF op.owner_kind<>'tenant' OR op.command_kind<>'member.role' OR NOT app.has_permission('access.manage') OR NOT app.delegates_role(op.actor_id,op.owner_id,location,role_identity) THEN RAISE EXCEPTION 'Delegation denied' USING ERRCODE='42501'; END IF;
 SELECT * INTO target FROM app.memberships WHERE tenant_id=op.owner_id AND id=membership FOR UPDATE;
 IF target.id IS NULL OR target.principal_id=op.actor_id THEN RAISE EXCEPTION 'Self-assignment or invalid member denied' USING ERRCODE='42501'; END IF;
 IF target.version IS DISTINCT FROM expected_version THEN RAISE EXCEPTION 'Stale member version' USING ERRCODE='P0003'; END IF;
 IF target.is_owner AND NOT EXISTS(SELECT FROM app.memberships m JOIN app.principals p ON p.id=m.principal_id WHERE m.tenant_id=op.owner_id AND m.id<>target.id AND m.active AND m.is_owner AND p.active) THEN RAISE EXCEPTION 'Final active owner must remain' USING ERRCODE='23514'; END IF;
 IF target.is_owner AND NOT EXISTS(SELECT FROM app.memberships WHERE tenant_id=op.owner_id AND principal_id=op.actor_id AND is_owner AND active) THEN RAISE EXCEPTION 'Only an owner manages owner membership' USING ERRCODE='42501'; END IF;
 DELETE FROM app.location_grants WHERE tenant_id=op.owner_id AND membership_id=target.id AND location_id=location;
 IF enabled THEN INSERT INTO app.location_grants VALUES(op.owner_id,target.id,location,role_identity);END IF;
 SELECT EXISTS(SELECT FROM app.location_grants g JOIN app.roles r ON (r.tenant_id,r.id)=(g.tenant_id,g.role_id) WHERE g.tenant_id=op.owner_id AND g.membership_id=target.id AND r.preset='owner') INTO new_owner;
 UPDATE app.memberships SET is_owner=new_owner,version=version+1,active=EXISTS(SELECT FROM app.location_grants WHERE tenant_id=op.owner_id AND membership_id=target.id) WHERE id=target.id RETURNING version INTO expected_version;
 RETURN expected_version;
END $$;
CREATE FUNCTION app.invitation_current(invitation uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT FROM app.staff_invitations i WHERE i.id=invitation AND i.revoked_at IS NULL AND i.accepted_at IS NULL AND i.expires_at>now() AND app.delegates_role(i.inviter_id,i.tenant_id,i.location_id,i.role_id))
$$;
CREATE FUNCTION app.invite_staff(invitation uuid,email text,role_identity uuid,encrypted_mail text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE op app.command_operations:=app.active_operation();location uuid:=nullif(current_setting('app.location_id',true),'')::uuid;auth_user text;
BEGIN
 PERFORM 1 FROM app.tenants WHERE id=op.owner_id FOR UPDATE;
 IF op.owner_kind<>'tenant' OR op.command_kind<>'staff.invite' OR NOT app.delegates_role(op.actor_id,op.owner_id,location,role_identity) THEN RAISE EXCEPTION 'Invitation delegation denied' USING ERRCODE='42501'; END IF;
 IF length(email)>254 OR email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' OR length(encrypted_mail)>32768 THEN RAISE EXCEPTION 'Invalid invitation' USING ERRCODE='22023'; END IF;
 INSERT INTO app.staff_invitations(id,tenant_id,location_id,role_id,recipient_email,inviter_id) VALUES(invitation,op.owner_id,location,role_identity,lower(email),op.actor_id);
 SELECT auth_user_id INTO auth_user FROM app.principals WHERE id=op.actor_id;
 INSERT INTO app.auth_mail(user_id,kind,token_hash,encrypted_payload,expires_at,tenant_id,invitation_id) VALUES(auth_user,'invitation',invitation::text,encrypted_mail,now()+interval '48 hours',op.owner_id,invitation);
 RETURN invitation;
END $$;
CREATE FUNCTION app.revoke_invitation(invitation uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE op app.command_operations:=app.active_operation();
BEGIN
 PERFORM 1 FROM app.tenants WHERE id=op.owner_id FOR UPDATE;
 IF op.owner_kind<>'tenant' OR op.command_kind<>'staff.revoke' OR NOT app.has_permission('access.manage') THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
 UPDATE app.staff_invitations SET revoked_at=now() WHERE id=invitation AND tenant_id=op.owner_id AND location_id=nullif(current_setting('app.location_id',true),'')::uuid AND accepted_at IS NULL;
 IF NOT FOUND THEN RAISE EXCEPTION 'Invitation unavailable' USING ERRCODE='P0003'; END IF;
 UPDATE app.auth_mail SET consumed_at=now(),encrypted_payload=NULL WHERE invitation_id=invitation;RETURN invitation;
END $$;
CREATE FUNCTION app.invitation_visible(invitation uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT app.principal_verified() AND EXISTS(SELECT FROM app.staff_invitations i JOIN public."user" u ON lower(u.email)=i.recipient_email JOIN app.principals p ON p.auth_user_id=u.id
 WHERE i.id=invitation AND p.id=nullif(current_setting('app.principal_id',true),'')::uuid
 AND ((app.invitation_current(i.id)) OR (i.accepted_by=p.id AND app.member_permission(p.id,i.tenant_id,i.location_id,'workspace.read'))))
$$;
CREATE FUNCTION app.accept_invitation(invitation uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE op app.command_operations:=app.active_operation();i app.staff_invitations;m uuid;owner_role boolean;
BEGIN
 IF op.owner_kind<>'principal' OR op.command_kind<>'staff.accept' THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
 SELECT * INTO i FROM app.staff_invitations WHERE id=invitation;
 PERFORM 1 FROM app.tenants WHERE id=i.tenant_id FOR UPDATE;
 SELECT * INTO i FROM app.staff_invitations WHERE id=invitation FOR UPDATE;
 IF NOT app.invitation_visible(invitation) THEN RAISE EXCEPTION 'Invitation unavailable for this identity' USING ERRCODE='42501'; END IF;
 IF i.accepted_by IS NULL THEN
  INSERT INTO app.memberships(tenant_id,principal_id) VALUES(i.tenant_id,op.actor_id) ON CONFLICT(tenant_id,principal_id) DO NOTHING;
  SELECT id INTO m FROM app.memberships WHERE tenant_id=i.tenant_id AND principal_id=op.actor_id FOR UPDATE;
  IF EXISTS(SELECT FROM app.memberships WHERE id=m AND NOT active) THEN DELETE FROM app.location_grants WHERE tenant_id=i.tenant_id AND membership_id=m; END IF;
  INSERT INTO app.location_grants VALUES(i.tenant_id,m,i.location_id,i.role_id) ON CONFLICT DO NOTHING;
  SELECT EXISTS(SELECT FROM app.location_grants g JOIN app.roles r ON (r.tenant_id,r.id)=(g.tenant_id,g.role_id) WHERE g.tenant_id=i.tenant_id AND g.membership_id=m AND r.preset='owner') INTO owner_role;
  UPDATE app.memberships SET active=true,is_owner=owner_role,version=version+1 WHERE id=m;
  UPDATE app.staff_invitations SET accepted_by=op.actor_id,accepted_at=now() WHERE id=invitation;
  UPDATE app.auth_mail SET consumed_at=now(),encrypted_payload=NULL WHERE invitation_id=invitation;
 END IF;
 RETURN jsonb_build_object('tenantId',i.tenant_id,'locationId',i.location_id);
END $$;
CREATE FUNCTION app.workspace_team() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE tenant uuid:=nullif(current_setting('app.tenant_id',true),'')::uuid;location uuid:=nullif(current_setting('app.location_id',true),'')::uuid;
BEGIN
 IF NOT app.has_permission('access.manage') THEN RAISE EXCEPTION 'Team access denied' USING ERRCODE='42501'; END IF;
 RETURN jsonb_build_object('roles',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',r.id,'name',r.name,'preset',r.preset,'permissions',(SELECT coalesce(jsonb_agg(p.permission ORDER BY p.permission),'[]') FROM app.permission_grants p WHERE p.tenant_id=r.tenant_id AND p.role_id=r.id)) ORDER BY r.name),'[]') FROM app.roles r WHERE r.tenant_id=tenant),
 'members',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',m.id,'principalId',m.principal_id,'name',u.name,'roleId',g.role_id,'version',m.version,'owner',m.is_owner) ORDER BY u.name),'[]') FROM app.memberships m JOIN app.principals p ON p.id=m.principal_id JOIN public."user" u ON u.id=p.auth_user_id JOIN app.location_grants g ON (g.tenant_id,g.membership_id)=(m.tenant_id,m.id) WHERE m.tenant_id=tenant AND g.location_id=location AND m.active),
 'invitations',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'email',recipient_email,'roleId',role_id,'expiresAt',expires_at,'revoked',revoked_at IS NOT NULL,'accepted',accepted_at IS NOT NULL) ORDER BY created_at DESC),'[]') FROM (SELECT * FROM app.staff_invitations WHERE tenant_id=tenant AND location_id=location ORDER BY created_at DESC LIMIT 50) i));
END $$;
-- Explicit projections only. No runtime reads of raw owner contacts or invitation recipients.
DO $$ DECLARE name text;BEGIN
 FOREACH name IN ARRAY ARRAY['shop_settings','owner_contacts','personal_preferences','staff_invitations'] LOOP
 EXECUTE format('ALTER TABLE app.%I ENABLE ROW LEVEL SECURITY',name);EXECUTE format('ALTER TABLE app.%I FORCE ROW LEVEL SECURITY',name);
 EXECUTE format('CREATE POLICY migration_access ON app.%I TO fitloom_migrator USING(true) WITH CHECK(true)',name);
 END LOOP;
END $$;
DROP POLICY audit_read ON app.command_audit;
CREATE POLICY audit_read ON app.command_audit FOR SELECT TO fitloom_web,fitloom_worker USING(app.has_permission('audit.read') AND operation_id IN (SELECT id FROM app.command_operations));
DROP POLICY operation_read ON app.command_operations;
CREATE POLICY operation_read ON app.command_operations FOR SELECT TO fitloom_web,fitloom_worker USING(app.owner_visible(owner_kind,owner_id) AND (owner_kind<>'tenant' OR app.can_access_location(tenant_id,location_id)) AND (actor_id=nullif(current_setting('app.principal_id',true),'')::uuid OR app.has_permission('audit.read')));
CREATE FUNCTION app.journal_visible(entry uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT app.has_permission('journal.read') AND EXISTS(SELECT FROM app.journal_entries e JOIN app.command_operations o ON o.id=e.operation_id WHERE e.id=entry AND e.owner_kind='tenant' AND app.can_access_location(o.tenant_id,o.location_id))
$$;
DROP POLICY journal_read ON app.journal_entries;
CREATE POLICY journal_read ON app.journal_entries FOR SELECT TO fitloom_web,fitloom_worker USING(app.journal_visible(id));
GRANT EXECUTE ON FUNCTION app.begin_another_setup(integer),app.setup_progress(),app.workspace_choices(),app.workspace_view(),app.all_locations_view(),app.save_personal_preferences(text,uuid,uuid),app.read_personal_preferences(),app.update_workspace(integer,text,text),app.create_custom_role(text,text[]),app.set_member_role(uuid,uuid,integer,boolean),app.invite_staff(uuid,text,uuid,text),app.revoke_invitation(uuid),app.invitation_visible(uuid),app.accept_invitation(uuid),app.workspace_team(),app.journal_visible(uuid) TO fitloom_web;
GRANT EXECUTE ON FUNCTION app.journal_visible(uuid) TO fitloom_worker;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA app FROM PUBLIC;

CREATE OR REPLACE FUNCTION app.mail_claim() RETURNS TABLE(id uuid,kind text,encrypted_payload text,attempt integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  UPDATE app.auth_mail SET state='expired',encrypted_payload=NULL WHERE state IN ('pending','running') AND (expires_at<=now() OR consumed_at IS NOT NULL OR (kind='invitation' AND NOT app.invitation_current(invitation_id)));
  RETURN QUERY UPDATE app.auth_mail m SET state='running',attempts=m.attempts+1,locked_at=now()
    WHERE m.id=(SELECT q.id FROM app.auth_mail q WHERE q.expires_at>now() AND q.consumed_at IS NULL AND q.attempts<5
      AND ((q.state='pending' AND q.next_attempt_at<=now()) OR (q.state='running' AND q.locked_at<now()-interval '2 minutes'))
      ORDER BY q.next_attempt_at,q.id LIMIT 1 FOR UPDATE SKIP LOCKED)
    RETURNING m.id,m.kind,m.encrypted_payload,m.attempts;
  UPDATE app.auth_mail SET state='failed',last_error='worker_interrupted',encrypted_payload=NULL WHERE state='running' AND attempts>=5 AND locked_at<now()-interval '2 minutes';
END $$;
