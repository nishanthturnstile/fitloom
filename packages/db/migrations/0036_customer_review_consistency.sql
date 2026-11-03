-- Review projections use one candidate snapshot. Existing function grants remain unchanged.
CREATE OR REPLACE FUNCTION app.customer_review_read(identity uuid,lease uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r app.customer_duplicate_reviews; s record; candidates jsonb; summaries jsonb;
BEGIN
 PERFORM app.customer_check_use(lease); SELECT * INTO s FROM app.customer_scope(); PERFORM app.customer_maintenance();
 SELECT * INTO r FROM app.customer_duplicate_reviews WHERE id=identity AND (tenant_id,location_id,actor_id)=(s.tenant,s.location,s.actor);
 IF r.id IS NULL OR r.expires_at<=clock_timestamp() OR r.consumed_operation_id IS NOT NULL THEN RETURN jsonb_build_object('outcome','review-expired','reviewId',identity); END IF;
 -- One statement snapshot owns both the fingerprint and visible candidate summaries.
 WITH matches AS MATERIALIZED (
 SELECT c.* FROM app.customers c WHERE (c.tenant_id,c.location_id)=(s.tenant,s.location) AND c.phone_e164=r.phone AND (r.excluded_customer_id IS NULL OR c.id<>r.excluded_customer_id)
 ), visible AS (SELECT * FROM matches ORDER BY normalized_name,id LIMIT 5)
 SELECT (SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'version',version) ORDER BY id),'[]'::jsonb) FROM matches),
 (SELECT coalesce(jsonb_agg(jsonb_build_object('customerId',id,'name',name,'phone',app.customer_phone_json(v::app.customers),'archivedAt',archived_at,'version',version) ORDER BY normalized_name,id),'[]'::jsonb) FROM visible v)
 INTO candidates,summaries;
 IF md5(candidates::text)<>r.candidate_fingerprint THEN RETURN jsonb_build_object('outcome','review-stale','reviewId',identity); END IF;
 RETURN jsonb_build_object('outcome','review-required','review',jsonb_build_object('reviewId',r.id,'expiresAt',r.expires_at,'candidateCount',jsonb_array_length(candidates),'candidates',summaries));
END $$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.customer_check_begin(lease boolean DEFAULT true) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE s record; bucket timestamptz; b app.customer_request_budgets; token uuid:=gen_random_uuid(); active integer;
BEGIN
 PERFORM app.customer_admit(true); SELECT * INTO s FROM app.customer_scope();
 -- Serialize admissions across minute buckets, including uncommitted previous-minute leases.
 IF NOT pg_try_advisory_xact_lock(hashtextextended('customer-check:'||s.tenant||':'||s.location||':'||s.actor,0)) THEN RAISE EXCEPTION 'Customer check admission busy' USING ERRCODE='FC006'; END IF;
 bucket:=date_trunc('minute',clock_timestamp());
 PERFORM app.customer_maintenance();
 INSERT INTO app.customer_request_budgets(tenant_id,location_id,principal_id,minute) VALUES(s.tenant,s.location,s.actor,bucket) ON CONFLICT DO NOTHING;
 SELECT * INTO b FROM app.customer_request_budgets WHERE (tenant_id,location_id,principal_id,minute)=(s.tenant,s.location,s.actor,bucket) FOR UPDATE;
 SELECT count(*) INTO active FROM app.customer_request_budgets r CROSS JOIN LATERAL jsonb_each_text(r.leases) l WHERE (r.tenant_id,r.location_id,r.principal_id)=(s.tenant,s.location,s.actor) AND r.minute>=bucket-interval '1 minute' AND l.value::timestamptz>clock_timestamp();
 IF b.checks>=30 OR active>=2 THEN RAISE EXCEPTION 'Customer check limit reached' USING ERRCODE='FC006'; END IF;
 SELECT coalesce(jsonb_object_agg(key,value),'{}'::jsonb) INTO b.leases FROM jsonb_each_text(b.leases) WHERE value::timestamptz>clock_timestamp();
 UPDATE app.customer_request_budgets SET checks=checks+1,leases=b.leases||CASE WHEN lease THEN jsonb_build_object(token,clock_timestamp()+interval '15 seconds') ELSE '{}'::jsonb END WHERE (tenant_id,location_id,principal_id,minute)=(s.tenant,s.location,s.actor,bucket);
 RETURN token;
END $$;
