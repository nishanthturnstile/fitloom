-- Empty permission is an internal any-grant check for protecting MFA configuration.
CREATE OR REPLACE FUNCTION app.operator_has_grant(auth_user text,permission_name text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT FROM app.principals p JOIN app.operator_grants g ON g.principal_id=p.id
  WHERE p.auth_user_id=auth_user AND p.active AND (permission_name='' OR g.permission=permission_name))
$$;
CREATE FUNCTION app.recovery_mail_consumed() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF OLD.identifier LIKE 'reset-password:%' THEN
  UPDATE app.auth_mail SET consumed_at=now(),encrypted_payload=NULL,state=CASE WHEN state IN ('pending','running') THEN 'expired' ELSE state END
    WHERE kind='recovery' AND token_hash=encode(sha256(convert_to(substr(OLD.identifier,length('reset-password:')+1),'UTF8')),'hex');
 END IF;
 RETURN OLD;
END $$;
CREATE TRIGGER recovery_mail_consumed AFTER DELETE ON public.verification FOR EACH ROW EXECUTE FUNCTION app.recovery_mail_consumed();
REVOKE ALL ON FUNCTION app.recovery_mail_consumed() FROM PUBLIC;
