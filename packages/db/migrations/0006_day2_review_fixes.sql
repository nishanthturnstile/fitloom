-- Review corrections: source-location admission and safe change descriptions.
ALTER TABLE app.command_audit ADD COLUMN changed_fields text[] NOT NULL DEFAULT '{}';
ALTER TABLE app.command_audit ADD CONSTRAINT changed_fields_bounded CHECK(cardinality(changed_fields)<=30);
CREATE OR REPLACE FUNCTION app.post_journal(source_kind text, source_id uuid, currency text, lines jsonb, reversal_of uuid DEFAULT NULL) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE op app.command_operations := app.active_operation(); entry uuid; item jsonb; amount_text text; line_index integer:=0; original app.journal_entries;
BEGIN
  -- Platform accounting remains migration-admin-only until operator MFA admission exists.
  IF op.owner_kind<>'tenant' OR NOT app.has_permission('journal.post') THEN RAISE EXCEPTION 'Journal authority denied' USING ERRCODE='42501'; END IF;
  IF currency IS DISTINCT FROM 'INR' THEN RAISE EXCEPTION 'Unsupported currency policy' USING ERRCODE='22023'; END IF;
  IF reversal_of IS NOT NULL THEN
    SELECT e.* INTO original FROM app.journal_entries e JOIN app.command_operations source_op ON source_op.id=e.operation_id
      WHERE e.id=post_journal.reversal_of AND e.owner_kind=op.owner_kind AND e.owner_id=op.owner_id
        AND app.can_access_location(source_op.tenant_id,source_op.location_id) FOR UPDATE OF e;
    IF original.id IS NULL OR original.currency<>currency THEN RAISE EXCEPTION 'Reversal owner or currency mismatch' USING ERRCODE='22023'; END IF;
    IF lines IS DISTINCT FROM '[]'::jsonb THEN RAISE EXCEPTION 'Reversal lines must be derived' USING ERRCODE='22023'; END IF;
  ELSIF jsonb_typeof(lines) IS DISTINCT FROM 'array' OR jsonb_array_length(lines) NOT BETWEEN 2 AND 200 THEN
    RAISE EXCEPTION 'Invalid journal lines' USING ERRCODE='22023';
  END IF;
  INSERT INTO app.journal_entries(owner_kind,owner_id,operation_id,source_kind,source_id,currency,actor_id,reversal_of)
    VALUES(op.owner_kind,op.owner_id,op.id,source_kind,source_id,currency,op.actor_id,reversal_of) RETURNING id INTO entry;
  IF reversal_of IS NOT NULL THEN
    INSERT INTO app.journal_lines(owner_kind,owner_id,entry_id,line_number,account_code,side,amount)
      SELECT owner_kind,owner_id,entry,line_number,account_code,CASE side WHEN 'debit' THEN 'credit' ELSE 'debit' END,amount FROM app.journal_lines WHERE entry_id=original.id;
  ELSE
    FOR item IN SELECT value FROM jsonb_array_elements(lines) LOOP
      amount_text:=item->>'amount';
      IF jsonb_typeof(item->'amount') IS DISTINCT FROM 'string' OR amount_text !~ '^(0|[1-9][0-9]{0,17})(\.[0-9]{1,2})?$' OR amount_text::numeric<=0 THEN
        RAISE EXCEPTION 'Invalid posted amount' USING ERRCODE='22023'; END IF;
      line_index:=line_index+1;
      INSERT INTO app.journal_lines VALUES(op.owner_kind,op.owner_id,entry,line_index,item->>'accountCode',item->>'side',amount_text::numeric);
    END LOOP;
  END IF;
  IF (SELECT sum(CASE side WHEN 'debit' THEN amount ELSE -amount END) FROM app.journal_lines WHERE entry_id=entry)<>0 THEN
    RAISE EXCEPTION 'Journal must balance' USING ERRCODE='23514'; END IF;
  RETURN entry;
END $$;

DROP FUNCTION app.finish_operation(jsonb,text,uuid,text,integer,integer,jsonb);
CREATE FUNCTION app.finish_operation(outcome jsonb, entity_kind text, entity_id uuid, reason text, previous_version integer, next_version integer, jobs jsonb, changed_fields text[] DEFAULT '{}')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE op app.command_operations := app.active_operation(); job jsonb;
BEGIN
  IF outcome IS NULL OR outcome='null'::jsonb OR octet_length(outcome::text)>65536 OR jsonb_typeof(jobs)<>'array' OR jsonb_array_length(jobs)>20 THEN
    RAISE EXCEPTION 'Invalid operation outcome' USING ERRCODE='22023'; END IF;
  INSERT INTO app.command_audit(operation_id,owner_kind,owner_id,actor_id,action,entity_kind,entity_id,reason,previous_version,next_version,changed_fields)
    VALUES (op.id,op.owner_kind,op.owner_id,op.actor_id,op.command_kind,entity_kind,entity_id,reason,previous_version,next_version,changed_fields);
  FOR job IN SELECT value FROM jsonb_array_elements(jobs) LOOP
    IF octet_length(job::text)>65536 THEN RAISE EXCEPTION 'Job input too large' USING ERRCODE='22023'; END IF;
    INSERT INTO app.command_outbox(operation_id,owner_kind,owner_id,job_key,job_kind,input_version,payload)
      VALUES(op.id,op.owner_kind,op.owner_id,job->>'key',job->>'kind',(job->>'inputVersion')::integer,job->'payload');
  END LOOP;
  UPDATE app.command_operations SET result=outcome,completed_at=clock_timestamp() WHERE id=op.id;
END $$;

REVOKE ALL ON FUNCTION app.finish_operation(jsonb,text,uuid,text,integer,integer,jsonb,text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.finish_operation(jsonb,text,uuid,text,integer,integer,jsonb,text[]) TO fitloom_web,fitloom_worker;
