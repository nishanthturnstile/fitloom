-- Deferred integrity checks must see all lines regardless of reader projections.
ALTER FUNCTION app.journal_balanced() SECURITY DEFINER;
ALTER FUNCTION app.operation_completed() SECURITY DEFINER;
-- Resolve the parameter explicitly rather than colliding with a journal column.
CREATE OR REPLACE FUNCTION app.post_journal(source_kind text, source_id uuid, currency text, lines jsonb, reversal_of uuid DEFAULT NULL) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE op app.command_operations := app.active_operation(); entry uuid; item jsonb; amount_text text; line_index integer:=0; original app.journal_entries;
BEGIN
  -- Platform accounting remains migration-admin-only until operator MFA admission exists.
  IF op.owner_kind<>'tenant' OR NOT app.has_permission('journal.post') THEN RAISE EXCEPTION 'Journal authority denied' USING ERRCODE='42501'; END IF;
  IF currency IS DISTINCT FROM 'INR' THEN RAISE EXCEPTION 'Unsupported currency policy' USING ERRCODE='22023'; END IF;
  IF reversal_of IS NOT NULL THEN
    SELECT * INTO original FROM app.journal_entries e WHERE e.id=post_journal.reversal_of AND e.owner_kind=op.owner_kind AND e.owner_id=op.owner_id FOR UPDATE;
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
