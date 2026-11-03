-- Keep the restricted boundary aligned with Zod's RFC UUID contract, including nil/max UUIDs.
CREATE OR REPLACE FUNCTION app.master_uuid(value jsonb) RETURNS uuid LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $$
BEGIN
 PERFORM app.master_require(jsonb_typeof(value)='string' AND (value#>>'{}') ~ '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$',ARRAY['identity']);
 RETURN (value#>>'{}')::uuid;
END $$;
