-- Qualify role permission input separately from the PL/pgSQL loop variable.
CREATE OR REPLACE FUNCTION app.create_custom_role(role_name text,permissions text[]) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE op app.command_operations:=app.active_operation();role_identity uuid;p text;
BEGIN
 PERFORM 1 FROM app.tenants WHERE id=op.owner_id FOR UPDATE;
 IF op.owner_kind<>'tenant' OR op.command_kind<>'role.create' OR NOT app.has_permission('access.manage') THEN RAISE EXCEPTION 'Role administration denied' USING ERRCODE='42501'; END IF;
 IF length(trim(role_name)) NOT BETWEEN 1 AND 80 OR cardinality(permissions) NOT BETWEEN 1 AND 20 OR NOT 'workspace.read'=ANY(permissions) THEN RAISE EXCEPTION 'Invalid role' USING ERRCODE='22023'; END IF;
 FOREACH p IN ARRAY permissions LOOP IF p NOT IN ('workspace.read','workspace.manage','workspace.private.read','access.manage','locations.all','audit.read','journal.read','journal.post') OR NOT app.has_permission(p) THEN RAISE EXCEPTION 'Permission exceeds delegation' USING ERRCODE='42501'; END IF; END LOOP;
 INSERT INTO app.roles(tenant_id,name) VALUES(op.owner_id,trim(role_name)) RETURNING id INTO role_identity;
 INSERT INTO app.permission_grants SELECT DISTINCT op.owner_id,role_identity,permission_row.permission FROM unnest(permissions) AS permission_row(permission);RETURN role_identity;
END $$;
