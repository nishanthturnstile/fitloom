-- SQL column names take precedence over named arguments. Bind permission explicitly.
CREATE OR REPLACE FUNCTION app.member_permission(actor uuid,tenant uuid,location uuid,permission text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT FROM app.memberships m JOIN app.principals p ON p.id=m.principal_id JOIN app.tenants t ON t.id=m.tenant_id
 JOIN app.location_grants g ON (g.tenant_id,g.membership_id)=(m.tenant_id,m.id)
 JOIN app.locations l ON (l.tenant_id,l.id)=(g.tenant_id,g.location_id)
 JOIN app.permission_grants grant_row ON (grant_row.tenant_id,grant_row.role_id)=(g.tenant_id,g.role_id)
 WHERE m.tenant_id=$2 AND m.principal_id=$1 AND m.active AND p.active AND t.active AND l.archived_at IS NULL
 AND g.location_id=$3 AND grant_row.permission=$4)
$$;
