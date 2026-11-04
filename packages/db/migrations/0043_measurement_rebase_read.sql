-- Resolve only the current schema in the requested family under entry authority.
CREATE FUNCTION app.measurement_current_intake(customer uuid, wearer uuid, ref jsonb)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE ctx jsonb; current_ref jsonb; garment uuid; version uuid; scope record;
BEGIN
 ctx := app.measurement_context(customer, wearer, true);
 IF ref->>'kind' = 'body' THEN
  PERFORM app.master_keys(ref, ARRAY['kind','bundleVersion'], ARRAY['schemaRef']);
  current_ref := ctx->'bodySchemaRef';
 ELSE
  PERFORM app.master_keys(ref, ARRAY['kind','garmentId','versionId'], ARRAY['schemaRef']);
  PERFORM app.measurement_require(ref->>'kind' = 'garment', ARRAY['schemaRef','kind']);
  garment := app.master_uuid(ref->'garmentId');
  PERFORM app.master_uuid(ref->'versionId');
  SELECT * INTO scope FROM app.customer_scope();
  SELECT current_version_id INTO version FROM app.garments
   WHERE tenant_id=scope.tenant AND id=garment AND active;
  IF version IS NULL THEN RAISE EXCEPTION 'Garment unavailable' USING ERRCODE='FM001'; END IF;
  current_ref := jsonb_build_object('kind','garment','garmentId',garment,'versionId',version);
 END IF;
 RETURN jsonb_build_object('schemaRef',current_ref,'schema',app.measurement_intake(current_ref,false));
END $$;
REVOKE ALL ON FUNCTION app.measurement_current_intake(uuid,uuid,jsonb) FROM PUBLIC,fitloom_web,fitloom_worker,fitloom_auth,fitloom_operator;
GRANT EXECUTE ON FUNCTION app.measurement_current_intake(uuid,uuid,jsonb) TO fitloom_web;
