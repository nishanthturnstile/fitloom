CREATE FUNCTION app.page_offset_valid(value integer) RETURNS void LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $$
BEGIN IF value IS NULL OR value NOT BETWEEN 0 AND 100000 THEN RAISE EXCEPTION 'Invalid page offset' USING ERRCODE='22023';END IF;END $$;
REVOKE ALL ON FUNCTION app.page_offset_valid(integer) FROM PUBLIC;
CREATE FUNCTION app.workspace_choices_page(page_offset integer) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM app.page_offset_valid(page_offset);
 IF NOT app.principal_verified() THEN RAISE EXCEPTION 'Verified identity required' USING ERRCODE='42501';END IF;
 RETURN (WITH choices AS (
 SELECT DISTINCT t.id AS "tenantId",t.name AS "shopName",l.id AS "locationId",l.name AS "locationName"
 FROM app.memberships m JOIN app.tenants t ON t.id=m.tenant_id JOIN app.location_grants g ON (g.tenant_id,g.membership_id)=(m.tenant_id,m.id) JOIN app.locations l ON (l.tenant_id,l.id)=(g.tenant_id,g.location_id)
 WHERE m.principal_id=nullif(current_setting('app.principal_id',true),'')::uuid AND m.active AND t.active AND l.archived_at IS NULL AND app.member_permission(m.principal_id,t.id,l.id,'workspace.read'))
 SELECT jsonb_build_object('items',(SELECT coalesce(jsonb_agg(to_jsonb(p) ORDER BY p."shopName",p."locationName",p."tenantId",p."locationId"),'[]') FROM (SELECT * FROM choices ORDER BY "shopName","locationName","tenantId","locationId" LIMIT 50 OFFSET page_offset)p),'total',(SELECT count(*) FROM choices),'nextOffset',CASE WHEN (SELECT count(*) FROM choices)>page_offset+50 THEN page_offset+50 END));
END $$;
CREATE OR REPLACE FUNCTION app.workspace_choices() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$ SELECT app.workspace_choices_page(0)->'items' $$;
CREATE FUNCTION app.workspace_team_page(page_offset integer) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE tenant uuid:=nullif(current_setting('app.tenant_id',true),'')::uuid;location uuid:=nullif(current_setting('app.location_id',true),'')::uuid;
BEGIN
 PERFORM app.page_offset_valid(page_offset);
 IF NOT app.has_permission('access.manage') THEN RAISE EXCEPTION 'Team access denied' USING ERRCODE='42501';END IF;
 RETURN (WITH roles AS (SELECT r.id,r.name,r.preset,(SELECT coalesce(jsonb_agg(p.permission ORDER BY p.permission),'[]') FROM app.permission_grants p WHERE p.tenant_id=r.tenant_id AND p.role_id=r.id) AS permissions FROM app.roles r WHERE r.tenant_id=tenant),
 members AS (SELECT m.id,m.principal_id AS "principalId",u.name,g.role_id AS "roleId",m.version,m.is_owner AS owner FROM app.memberships m JOIN app.principals p ON p.id=m.principal_id JOIN public."user" u ON u.id=p.auth_user_id JOIN app.location_grants g ON (g.tenant_id,g.membership_id)=(m.tenant_id,m.id) WHERE m.tenant_id=tenant AND g.location_id=location AND m.active),
 invitations AS (SELECT id,recipient_email AS email,role_id AS "roleId",expires_at AS "expiresAt",revoked_at IS NOT NULL AS revoked,accepted_at IS NOT NULL AS accepted,created_at FROM app.staff_invitations WHERE tenant_id=tenant AND location_id=location)
 SELECT jsonb_build_object('roles',(SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY r.name,r.id),'[]') FROM (SELECT * FROM roles ORDER BY name,id LIMIT 50 OFFSET page_offset)r),
 'members',(SELECT coalesce(jsonb_agg(to_jsonb(m) ORDER BY m.name,m.id),'[]') FROM (SELECT * FROM members ORDER BY name,id LIMIT 50 OFFSET page_offset)m),
 'invitations',(SELECT coalesce(jsonb_agg(to_jsonb(i)-'created_at' ORDER BY i.created_at DESC,i.id),'[]') FROM (SELECT * FROM invitations ORDER BY created_at DESC,id LIMIT 50 OFFSET page_offset)i),
 'counts',jsonb_build_object('roles',(SELECT count(*) FROM roles),'members',(SELECT count(*) FROM members),'invitations',(SELECT count(*) FROM invitations)),
 'nextOffset',CASE WHEN greatest((SELECT count(*) FROM roles),(SELECT count(*) FROM members),(SELECT count(*) FROM invitations))>page_offset+50 THEN page_offset+50 END));
END $$;
CREATE OR REPLACE FUNCTION app.workspace_team() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$ SELECT app.workspace_team_page(0) $$;
CREATE FUNCTION app.all_locations_page(page_offset integer) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE tenant uuid:=nullif(current_setting('app.tenant_id',true),'')::uuid;actor uuid:=nullif(current_setting('app.principal_id',true),'')::uuid;
BEGIN
 PERFORM app.page_offset_valid(page_offset);
 IF NOT app.has_permission('locations.all') OR EXISTS(SELECT FROM app.locations l WHERE l.tenant_id=tenant AND l.archived_at IS NULL AND NOT app.member_permission(actor,tenant,l.id,'locations.all')) THEN RAISE EXCEPTION 'All Locations access denied' USING ERRCODE='42501';END IF;
 RETURN (WITH locations AS (SELECT id,name FROM app.locations WHERE tenant_id=tenant AND archived_at IS NULL) SELECT jsonb_build_object('items',(SELECT coalesce(jsonb_agg(to_jsonb(p) ORDER BY p.name,p.id),'[]') FROM (SELECT * FROM locations ORDER BY name,id LIMIT 50 OFFSET page_offset)p),'total',(SELECT count(*) FROM locations),'nextOffset',CASE WHEN (SELECT count(*) FROM locations)>page_offset+50 THEN page_offset+50 END));
END $$;
CREATE OR REPLACE FUNCTION app.all_locations_view() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$ SELECT app.all_locations_page(0)->'items' $$;
CREATE FUNCTION app.file_list_page(page_offset integer) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM app.page_offset_valid(page_offset);
 IF NOT app.has_permission('files.read') THEN RAISE EXCEPTION 'File access denied' USING ERRCODE='42501';END IF;
 RETURN (WITH files AS (SELECT id,byte_size AS size,media_type AS "mediaType",version,created_at AS "createdAt" FROM app.private_files WHERE tenant_id=nullif(current_setting('app.tenant_id',true),'')::uuid AND location_id=nullif(current_setting('app.location_id',true),'')::uuid AND state='attached') SELECT jsonb_build_object('items',(SELECT coalesce(jsonb_agg(to_jsonb(p) ORDER BY p."createdAt" DESC,p.id),'[]') FROM (SELECT * FROM files ORDER BY "createdAt" DESC,id LIMIT 50 OFFSET page_offset)p),'total',(SELECT count(*) FROM files),'nextOffset',CASE WHEN (SELECT count(*) FROM files)>page_offset+50 THEN page_offset+50 END));
END $$;
CREATE OR REPLACE FUNCTION app.file_list() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$ SELECT app.file_list_page(0)->'items' $$;
CREATE FUNCTION app.foundation_job_page(page_offset integer) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM app.page_offset_valid(page_offset);
 IF NOT app.has_permission('access.manage') THEN RAISE EXCEPTION 'Job access denied' USING ERRCODE='42501';END IF;
 RETURN (WITH jobs AS (SELECT id,kind,status,attempts,last_error,created_at,finished_at FROM app.foundation_jobs WHERE tenant_id=nullif(current_setting('app.tenant_id',true),'')::uuid AND location_id=nullif(current_setting('app.location_id',true),'')::uuid) SELECT jsonb_build_object('items',(SELECT coalesce(jsonb_agg(to_jsonb(p) ORDER BY p.created_at DESC,p.id),'[]') FROM (SELECT * FROM jobs ORDER BY created_at DESC,id LIMIT 50 OFFSET page_offset)p),'total',(SELECT count(*) FROM jobs),'nextOffset',CASE WHEN (SELECT count(*) FROM jobs)>page_offset+50 THEN page_offset+50 END));
END $$;
CREATE OR REPLACE FUNCTION app.foundation_job_list() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$ SELECT app.foundation_job_page(0)->'items' $$;
CREATE FUNCTION app.operator_tenant_page(user_identity text,session_identity text,query text,page_offset integer) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM app.page_offset_valid(page_offset);
 IF NOT app.operator_admitted(user_identity,session_identity,'tenants.read') THEN RAISE EXCEPTION 'Recent operator MFA required' USING ERRCODE='42501';END IF;
 IF query IS NULL OR length(query)>200 THEN RAISE EXCEPTION 'Invalid lookup' USING ERRCODE='22023';END IF;
 RETURN (WITH tenants AS (SELECT t.id AS "tenantId",t.name AS "shopName",t.active,t.created_at,(SELECT count(*) FROM app.locations l WHERE l.tenant_id=t.id AND l.archived_at IS NULL) AS "locationCount",(SELECT count(*) FROM app.memberships m WHERE m.tenant_id=t.id AND m.active AND m.is_owner) AS "ownerCount",(SELECT coalesce(jsonb_agg(jsonb_build_object('principalId',m.principal_id) ORDER BY m.principal_id),'[]') FROM (SELECT principal_id FROM app.memberships WHERE tenant_id=t.id AND active AND is_owner ORDER BY principal_id LIMIT 50)m) AS owners FROM app.tenants t WHERE query='' OR t.id::text=query OR starts_with(lower(t.name),lower(query))) SELECT jsonb_build_object('items',(SELECT coalesce(jsonb_agg(to_jsonb(p)-'created_at' ORDER BY p.created_at DESC,p."tenantId"),'[]') FROM (SELECT * FROM tenants ORDER BY created_at DESC,"tenantId" LIMIT 50 OFFSET page_offset)p),'total',(SELECT count(*) FROM tenants),'nextOffset',CASE WHEN (SELECT count(*) FROM tenants)>page_offset+50 THEN page_offset+50 END));
END $$;
CREATE OR REPLACE FUNCTION app.operator_tenants(user_identity text,session_identity text,query text) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$ SELECT app.operator_tenant_page(user_identity,session_identity,query,0)->'items' $$;
CREATE FUNCTION app.operator_job_page(user_identity text,session_identity text,page_offset integer) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM app.page_offset_valid(page_offset);
 IF NOT app.operator_admitted(user_identity,session_identity,'jobs.manage') THEN RAISE EXCEPTION 'Recent operator MFA required' USING ERRCODE='42501';END IF;
 RETURN (WITH jobs AS (SELECT f.id,f.kind,f.status,f.attempts,f.last_error,f.created_at,f.finished_at,i.provider,i.account,i.environment,i.outcome AS inbox_outcome FROM app.foundation_jobs f LEFT JOIN app.provider_inbox i ON i.id=f.source_id WHERE f.authority='service') SELECT jsonb_build_object('items',(SELECT coalesce(jsonb_agg(to_jsonb(p) ORDER BY p.created_at DESC,p.id),'[]') FROM (SELECT * FROM jobs ORDER BY created_at DESC,id LIMIT 50 OFFSET page_offset)p),'total',(SELECT count(*) FROM jobs),'nextOffset',CASE WHEN (SELECT count(*) FROM jobs)>page_offset+50 THEN page_offset+50 END));
END $$;
REVOKE ALL ON FUNCTION app.workspace_choices_page(integer),app.workspace_team_page(integer),app.all_locations_page(integer),app.file_list_page(integer),app.foundation_job_page(integer),app.operator_tenant_page(text,text,text,integer),app.operator_job_page(text,text,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.workspace_choices_page(integer),app.workspace_team_page(integer),app.all_locations_page(integer),app.file_list_page(integer),app.foundation_job_page(integer) TO fitloom_web;
GRANT EXECUTE ON FUNCTION app.operator_tenant_page(text,text,text,integer),app.operator_job_page(text,text,integer) TO fitloom_auth;
