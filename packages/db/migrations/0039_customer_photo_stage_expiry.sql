-- Fresh binding must precede upload expiry and cleanup eligibility. Committed replay remains unaffected.
CREATE OR REPLACE FUNCTION app.customer_photo_bind(o jsonb,identity uuid,expected integer,file_version integer,provenance text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE op app.command_operations:=app.active_operation(); owner record;slot jsonb;current_file uuid;f app.private_files;v integer;
BEGIN
 IF op.command_kind<>'customer-photo.bind' THEN RAISE EXCEPTION 'Invalid photo operation' USING ERRCODE='42501';END IF;
 SELECT * INTO owner FROM app.customer_photo_owner(o,true);slot:=app.customer_photo_slot(o);v:=(slot->>'version')::integer;current_file:=(slot->'photo'->>'fileId')::uuid;
 IF expected IS NULL OR expected<>v THEN RAISE EXCEPTION 'Photo changed' USING ERRCODE='FC003';END IF;
 IF current_file=identity THEN RETURN jsonb_build_object('kind','photo-saved','customerId',owner.customer_id,'version',v,'changed',false);END IF;
 PERFORM 1 FROM app.private_files WHERE id=ANY(ARRAY[identity,current_file]) ORDER BY id FOR UPDATE NOWAIT;
 SELECT * INTO f FROM app.private_files WHERE (tenant_id,location_id,id,owner_id)=(op.tenant_id,op.location_id,identity,op.actor_id) AND purpose='customer-photo' AND (customer_id,photo_role)=(owner.customer_id,owner.role) AND wearer_id IS NOT DISTINCT FROM owner.wearer_id;
 IF f.id IS NULL OR f.state<>'finalized' OR f.version IS DISTINCT FROM file_version OR f.created_at<now()-interval '1 hour' OR f.updated_at<now()-interval '24 hours' THEN RAISE EXCEPTION 'Photo upload unavailable' USING ERRCODE='FC003';END IF;
 PERFORM app.master_require(app.customer_text_valid(provenance,1000,true),ARRAY['note']);
 UPDATE app.customer_photos SET retired_at=now() WHERE file_id=current_file AND retired_at IS NULL;
 UPDATE app.private_files SET state='retired',version=version+1,updated_at=now() WHERE id=current_file;
 INSERT INTO app.customer_photos(tenant_id,location_id,customer_id,wearer_id,role,file_id,version,note,actor_id) VALUES(op.tenant_id,op.location_id,owner.customer_id,owner.wearer_id,owner.role,identity,v+1,provenance,op.actor_id);
 UPDATE app.private_files SET state='attached',version=version+1,updated_at=now() WHERE id=identity;
 INSERT INTO app.customer_activity(tenant_id,location_id,customer_id,wearer_id,actor_id,kind,changed_fields,previous_version,next_version,operation_id) VALUES(op.tenant_id,op.location_id,owner.customer_id,owner.wearer_id,op.actor_id,'customer-photo.bind',ARRAY['photo.'||owner.role],v,v+1,op.id);
 RETURN jsonb_build_object('kind','photo-saved','customerId',owner.customer_id,'version',v+1,'changed',true);
END $$;
