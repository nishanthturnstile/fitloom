-- Capture is an exact scalar snapshot. Eligibility is evaluated separately in
-- the same statement; display labels and private-file state are not inputs.
CREATE OR REPLACE FUNCTION app.measurement_capture(customer uuid,wearer uuid,profile uuid,version uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE h app.measurement_profiles;v app.measurement_versions;s record;effective boolean;active boolean;schema_current boolean;ref jsonb;
BEGIN
 effective:=app.measurement_owner(customer,wearer);
 PERFORM app.measurement_require(version IS NOT NULL,ARRAY['versionId']);
 SELECT * INTO s FROM app.customer_scope();
 SELECT * INTO h FROM app.measurement_profiles WHERE (tenant_id,location_id,customer_id,wearer_id,id)=(s.tenant,s.location,customer,wearer,profile);
 IF h.id IS NULL THEN RAISE EXCEPTION 'Measurement unavailable' USING ERRCODE='FM001'; END IF;
 SELECT * INTO v FROM app.measurement_versions WHERE (tenant_id,location_id,customer_id,wearer_id,profile_id,id)=(s.tenant,s.location,customer,wearer,profile,version);
 IF v.id IS NULL THEN RAISE EXCEPTION 'Measurement unavailable' USING ERRCODE='FM001'; END IF;
 IF v.body_schema_version IS NOT NULL THEN
  ref:=jsonb_build_object('kind','body','bundleVersion',v.body_schema_version);
  active:=true;
  SELECT current_version=v.body_schema_version INTO schema_current FROM app.measurement_body_schema_state WHERE singleton;
 ELSE
  ref:=jsonb_build_object('kind','garment','garmentId',v.garment_id,'versionId',v.garment_version_id);
  SELECT g.active,g.current_version_id=v.garment_version_id INTO active,schema_current FROM app.garments g WHERE (g.tenant_id,g.id)=(s.tenant,v.garment_id);
 END IF;
 RETURN jsonb_build_object(
  'immutable',jsonb_build_object('customerId',v.customer_id,'wearerId',v.wearer_id,'profileId',v.profile_id,'versionId',v.id,'sequence',v.sequence,'measuredOn',v.measured_on,'recordedAt',v.recorded_at,'recordedBy',v.recorded_by,'priorVersionId',v.prior_version_id,'schemaRef',ref,'document',v.document),
  'eligibility',jsonb_build_object('effectiveActive',effective AND h.archived_at IS NULL,'currentVersion',v.id=h.current_version_id,'schemaActive',coalesce(active,false),'currentSchema',coalesce(schema_current,false))
 );
END $$;
REVOKE ALL ON FUNCTION app.measurement_capture(uuid,uuid,uuid,uuid) FROM PUBLIC,fitloom_worker,fitloom_auth,fitloom_operator;
GRANT EXECUTE ON FUNCTION app.measurement_capture(uuid,uuid,uuid,uuid) TO fitloom_web;
