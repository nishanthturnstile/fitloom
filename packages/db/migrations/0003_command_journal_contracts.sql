-- SQL is authoritative for the command and accounting contracts in this migration.
ALTER TABLE app.setup_drafts ADD COLUMN version integer NOT NULL DEFAULT 0 CHECK (version >= 0);
REVOKE UPDATE ON app.setup_drafts FROM fitloom_web;
REVOKE UPDATE (draft) ON app.setup_drafts FROM fitloom_web;

CREATE TABLE app.command_owners (
  kind text NOT NULL CHECK (kind IN ('principal','tenant','platform')),
  id uuid NOT NULL,
  principal_id uuid UNIQUE REFERENCES app.principals(id),
  tenant_id uuid UNIQUE REFERENCES app.tenants(id),
  PRIMARY KEY(kind,id),
  CHECK ((kind = 'principal' AND principal_id = id AND tenant_id IS NULL)
    OR (kind = 'tenant' AND tenant_id = id AND principal_id IS NULL)
    OR (kind = 'platform' AND principal_id IS NULL AND tenant_id IS NULL)),
  CHECK ((kind <> 'principal' OR principal_id IS NOT NULL) AND (kind <> 'tenant' OR tenant_id IS NOT NULL))
);
CREATE TABLE app.command_operations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_kind text NOT NULL, owner_id uuid NOT NULL,
  tenant_id uuid, location_id uuid,
  actor_id uuid NOT NULL REFERENCES app.principals(id),
  command_kind text NOT NULL CHECK (length(command_kind) BETWEEN 1 AND 100),
  operation_key text NOT NULL CHECK (length(operation_key) BETWEEN 1 AND 200),
  request_hash text NOT NULL CHECK (request_hash ~ '^v1:[0-9a-f]{64}$'),
  correlation_id uuid NOT NULL,
  transaction_id bigint NOT NULL DEFAULT txid_current(),
  result jsonb, completed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT command_operation_identity UNIQUE(owner_kind,owner_id,command_kind,operation_key), UNIQUE(owner_kind,owner_id,id),
  FOREIGN KEY(owner_kind,owner_id) REFERENCES app.command_owners(kind,id),
  FOREIGN KEY(tenant_id,location_id) REFERENCES app.locations(tenant_id,id),
  CHECK ((owner_kind = 'tenant' AND tenant_id IS NOT NULL AND tenant_id = owner_id AND location_id IS NOT NULL)
    OR (owner_kind <> 'tenant' AND tenant_id IS NULL AND location_id IS NULL)),
  CHECK ((result IS NULL) = (completed_at IS NULL))
);
CREATE INDEX command_operations_actor ON app.command_operations(actor_id);
CREATE INDEX command_operations_location ON app.command_operations(tenant_id,location_id);
CREATE TABLE app.command_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id uuid NOT NULL UNIQUE,
  owner_kind text NOT NULL, owner_id uuid NOT NULL,
  actor_id uuid NOT NULL REFERENCES app.principals(id),
  action text NOT NULL, entity_kind text NOT NULL, entity_id uuid NOT NULL,
  reason text NOT NULL CHECK (length(reason) BETWEEN 1 AND 500),
  previous_version integer, next_version integer,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY(owner_kind,owner_id,operation_id) REFERENCES app.command_operations(owner_kind,owner_id,id)
);
CREATE INDEX command_audit_actor ON app.command_audit(actor_id,occurred_at);
CREATE TABLE app.command_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id uuid NOT NULL, owner_kind text NOT NULL, owner_id uuid NOT NULL,
  job_key text NOT NULL CHECK (length(job_key) BETWEEN 1 AND 100),
  job_kind text NOT NULL CHECK (length(job_kind) BETWEEN 1 AND 100),
  input_version integer NOT NULL CHECK (input_version > 0), payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(operation_id,job_key),
  FOREIGN KEY(owner_kind,owner_id,operation_id) REFERENCES app.command_operations(owner_kind,owner_id,id)
);

CREATE FUNCTION app.has_permission(permission_name text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT app.can_access_location(nullif(current_setting('app.tenant_id',true),'')::uuid, nullif(current_setting('app.location_id',true),'')::uuid)
    AND EXISTS (SELECT FROM app.location_grants g
      JOIN app.memberships m ON (m.tenant_id,m.id) = (g.tenant_id,g.membership_id)
      JOIN app.permission_grants p ON (p.tenant_id,p.role_id) = (g.tenant_id,g.role_id)
      WHERE g.tenant_id = nullif(current_setting('app.tenant_id',true),'')::uuid
        AND g.location_id = nullif(current_setting('app.location_id',true),'')::uuid
        AND m.principal_id = nullif(current_setting('app.principal_id',true),'')::uuid AND m.active AND p.permission = permission_name)
$$;
CREATE FUNCTION app.owner_visible(kind text, owner uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT CASE kind WHEN 'principal' THEN app.principal_active() AND owner = nullif(current_setting('app.principal_id',true),'')::uuid
    WHEN 'tenant' THEN app.can_access_tenant(owner) ELSE false END
$$;

CREATE FUNCTION app.claim_operation(owner_kind text, command_kind text, operation_key text, request_hash text, correlation_id uuid)
RETURNS TABLE(id uuid, result jsonb)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE owner uuid; actor uuid := nullif(current_setting('app.principal_id',true),'')::uuid; op app.command_operations;
BEGIN
  IF NOT app.principal_active() THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
  IF owner_kind = 'principal' THEN
    owner := actor;
    INSERT INTO app.command_owners(kind,id,principal_id) VALUES ('principal',owner,owner) ON CONFLICT DO NOTHING;
  ELSIF owner_kind = 'tenant' AND app.can_access_location(nullif(current_setting('app.tenant_id',true),'')::uuid,nullif(current_setting('app.location_id',true),'')::uuid) THEN
    owner := nullif(current_setting('app.tenant_id',true),'')::uuid;
    INSERT INTO app.command_owners(kind,id,tenant_id) VALUES ('tenant',owner,owner) ON CONFLICT DO NOTHING;
  ELSE RAISE EXCEPTION 'Owner access denied' USING ERRCODE='42501'; END IF;
  INSERT INTO app.command_operations(owner_kind,owner_id,tenant_id,location_id,actor_id,command_kind,operation_key,request_hash,correlation_id)
    VALUES (owner_kind,owner,CASE WHEN owner_kind='tenant' THEN owner END,CASE WHEN owner_kind='tenant' THEN nullif(current_setting('app.location_id',true),'')::uuid END,actor,command_kind,operation_key,request_hash,correlation_id)
    ON CONFLICT ON CONSTRAINT command_operation_identity DO NOTHING;
  SELECT o.* INTO op FROM app.command_operations o WHERE o.owner_kind=claim_operation.owner_kind AND o.owner_id=owner
    AND o.command_kind=claim_operation.command_kind AND o.operation_key=claim_operation.operation_key FOR UPDATE;
  IF op.request_hash <> request_hash THEN RAISE EXCEPTION 'Operation input conflict' USING ERRCODE='P0002'; END IF;
  IF op.result IS NULL AND op.transaction_id <> txid_current() THEN RAISE EXCEPTION 'Incomplete operation' USING ERRCODE='40001'; END IF;
  PERFORM set_config('app.operation_id',op.id::text,true);
  RETURN QUERY SELECT op.id, op.result;
END $$;

CREATE FUNCTION app.active_operation() RETURNS app.command_operations
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE op app.command_operations;
BEGIN
  SELECT * INTO op FROM app.command_operations WHERE id = nullif(current_setting('app.operation_id',true),'')::uuid;
  IF op.id IS NULL OR op.result IS NOT NULL OR op.transaction_id <> txid_current()
    OR op.actor_id <> nullif(current_setting('app.principal_id',true),'')::uuid OR NOT app.owner_visible(op.owner_kind,op.owner_id)
  THEN RAISE EXCEPTION 'Active command required' USING ERRCODE='42501'; END IF;
  RETURN op;
END $$;
CREATE FUNCTION app.finish_operation(outcome jsonb, entity_kind text, entity_id uuid, reason text, previous_version integer, next_version integer, jobs jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE op app.command_operations := app.active_operation(); job jsonb;
BEGIN
  IF outcome IS NULL OR outcome='null'::jsonb OR octet_length(outcome::text)>65536 OR jsonb_typeof(jobs)<>'array' OR jsonb_array_length(jobs)>20 THEN
    RAISE EXCEPTION 'Invalid operation outcome' USING ERRCODE='22023'; END IF;
  INSERT INTO app.command_audit(operation_id,owner_kind,owner_id,actor_id,action,entity_kind,entity_id,reason,previous_version,next_version)
    VALUES (op.id,op.owner_kind,op.owner_id,op.actor_id,op.command_kind,entity_kind,entity_id,reason,previous_version,next_version);
  FOR job IN SELECT value FROM jsonb_array_elements(jobs) LOOP
    IF octet_length(job::text)>65536 THEN RAISE EXCEPTION 'Job input too large' USING ERRCODE='22023'; END IF;
    INSERT INTO app.command_outbox(operation_id,owner_kind,owner_id,job_key,job_kind,input_version,payload)
      VALUES(op.id,op.owner_kind,op.owner_id,job->>'key',job->>'kind',(job->>'inputVersion')::integer,job->'payload');
  END LOOP;
  UPDATE app.command_operations SET result=outcome,completed_at=clock_timestamp() WHERE id=op.id;
END $$;
CREATE FUNCTION app.operation_completed() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF EXISTS (SELECT FROM app.command_operations WHERE id=NEW.id AND result IS NULL) THEN
    RAISE EXCEPTION 'Cannot commit incomplete command' USING ERRCODE='23514'; END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER operation_completed AFTER INSERT ON app.command_operations DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION app.operation_completed();

CREATE FUNCTION app.save_setup_draft(expected_version integer, content jsonb) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE op app.command_operations := app.active_operation(); next_version integer;
BEGIN
  IF op.owner_kind<>'principal' OR op.command_kind<>'setup.save' THEN RAISE EXCEPTION 'Wrong command' USING ERRCODE='42501'; END IF;
  IF jsonb_typeof(content)<>'object' OR octet_length(content::text)>16384 THEN RAISE EXCEPTION 'Invalid draft' USING ERRCODE='22023'; END IF;
  INSERT INTO app.setup_drafts(principal_id) VALUES(op.actor_id) ON CONFLICT DO NOTHING;
  UPDATE app.setup_drafts SET draft=content,version=version+1 WHERE principal_id=op.actor_id AND version=expected_version RETURNING version INTO next_version;
  IF next_version IS NULL THEN RAISE EXCEPTION 'Stale version' USING ERRCODE='P0003'; END IF;
  RETURN next_version;
END $$;

-- All new tables deny direct runtime writes. Only narrow functions mutate them.
DO $$ DECLARE name text; BEGIN
  FOREACH name IN ARRAY ARRAY['command_owners','command_operations','command_audit','command_outbox'] LOOP
    EXECUTE format('ALTER TABLE app.%I ENABLE ROW LEVEL SECURITY',name);
    EXECUTE format('ALTER TABLE app.%I FORCE ROW LEVEL SECURITY',name);
    EXECUTE format('CREATE POLICY migration_access ON app.%I TO fitloom_migrator USING(true) WITH CHECK(true)',name);
  END LOOP;
END $$;
CREATE POLICY owner_read ON app.command_owners FOR SELECT TO fitloom_web,fitloom_worker USING(app.owner_visible(kind,id));
CREATE POLICY operation_read ON app.command_operations FOR SELECT TO fitloom_web,fitloom_worker USING(app.owner_visible(owner_kind,owner_id) AND (owner_kind<>'tenant' OR app.can_access_location(tenant_id,location_id)));
CREATE POLICY audit_read ON app.command_audit FOR SELECT TO fitloom_web,fitloom_worker USING(operation_id IN (SELECT id FROM app.command_operations));
CREATE POLICY outbox_read ON app.command_outbox FOR SELECT TO fitloom_web,fitloom_worker USING(operation_id IN (SELECT id FROM app.command_operations));
GRANT SELECT ON app.command_owners,app.command_operations,app.command_audit,app.command_outbox TO fitloom_web,fitloom_worker;
GRANT EXECUTE ON FUNCTION app.has_permission(text),app.owner_visible(text,uuid),app.claim_operation(text,text,text,text,uuid),app.finish_operation(jsonb,text,uuid,text,integer,integer,jsonb),app.save_setup_draft(integer,jsonb) TO fitloom_web,fitloom_worker;

CREATE TABLE app.ledger_accounts (
  owner_kind text NOT NULL CHECK(owner_kind IN ('tenant','platform')), owner_id uuid NOT NULL,
  code text NOT NULL CHECK(code ~ '^[a-z][a-z0-9_.]{0,79}$'),
  PRIMARY KEY(owner_kind,owner_id,code),
  FOREIGN KEY(owner_kind,owner_id) REFERENCES app.command_owners(kind,id)
);
CREATE TABLE app.journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_kind text NOT NULL CHECK(owner_kind IN ('tenant','platform')), owner_id uuid NOT NULL,
  operation_id uuid NOT NULL, source_kind text NOT NULL CHECK(length(source_kind) BETWEEN 1 AND 100), source_id uuid NOT NULL,
  currency text NOT NULL CHECK(currency='INR'), actor_id uuid NOT NULL REFERENCES app.principals(id),
  reversal_of uuid, created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(owner_kind,owner_id,id), UNIQUE(owner_kind,owner_id,operation_id),
  UNIQUE(owner_kind,owner_id,source_kind,source_id), UNIQUE(owner_kind,owner_id,reversal_of),
  FOREIGN KEY(owner_kind,owner_id,operation_id) REFERENCES app.command_operations(owner_kind,owner_id,id),
  FOREIGN KEY(owner_kind,owner_id,reversal_of) REFERENCES app.journal_entries(owner_kind,owner_id,id),
  CHECK (id IS DISTINCT FROM reversal_of)
);
CREATE TABLE app.journal_lines (
  owner_kind text NOT NULL, owner_id uuid NOT NULL, entry_id uuid NOT NULL,
  line_number integer NOT NULL CHECK(line_number>0), account_code text NOT NULL,
  side text NOT NULL CHECK(side IN ('debit','credit')), amount numeric(20,2) NOT NULL CHECK(amount>0 AND amount<1000000000000000000),
  PRIMARY KEY(owner_kind,owner_id,entry_id,line_number),
  FOREIGN KEY(owner_kind,owner_id,entry_id) REFERENCES app.journal_entries(owner_kind,owner_id,id),
  FOREIGN KEY(owner_kind,owner_id,account_code) REFERENCES app.ledger_accounts(owner_kind,owner_id,code)
);
CREATE INDEX journal_lines_account ON app.journal_lines(owner_kind,owner_id,account_code);
CREATE INDEX journal_entries_actor ON app.journal_entries(actor_id);
CREATE FUNCTION app.immutable_record() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN RAISE EXCEPTION 'Immutable history' USING ERRCODE='42501'; END $$;
CREATE TRIGGER journal_entry_immutable BEFORE UPDATE OR DELETE ON app.journal_entries FOR EACH ROW EXECUTE FUNCTION app.immutable_record();
CREATE TRIGGER journal_line_immutable BEFORE UPDATE OR DELETE ON app.journal_lines FOR EACH ROW EXECUTE FUNCTION app.immutable_record();
CREATE TRIGGER command_audit_immutable BEFORE UPDATE OR DELETE ON app.command_audit FOR EACH ROW EXECUTE FUNCTION app.immutable_record();

CREATE FUNCTION app.journal_balanced() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
DECLARE target uuid := NEW.id;
BEGIN
  IF (SELECT count(*) FROM app.journal_lines WHERE entry_id=target)<2 OR
    (SELECT coalesce(sum(CASE side WHEN 'debit' THEN amount ELSE -amount END),0) FROM app.journal_lines WHERE entry_id=target)<>0
  THEN RAISE EXCEPTION 'Journal must balance' USING ERRCODE='23514'; END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER journal_balanced AFTER INSERT ON app.journal_entries DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION app.journal_balanced();

CREATE FUNCTION app.post_journal(source_kind text, source_id uuid, currency text, lines jsonb, reversal_of uuid DEFAULT NULL) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE op app.command_operations := app.active_operation(); entry uuid; item jsonb; amount_text text; line_index integer:=0; original app.journal_entries;
BEGIN
  -- Platform accounting remains migration-admin-only until operator MFA admission exists.
  IF op.owner_kind<>'tenant' OR NOT app.has_permission('journal.post') THEN RAISE EXCEPTION 'Journal authority denied' USING ERRCODE='42501'; END IF;
  IF currency IS DISTINCT FROM 'INR' THEN RAISE EXCEPTION 'Unsupported currency policy' USING ERRCODE='22023'; END IF;
  IF reversal_of IS NOT NULL THEN
    SELECT * INTO original FROM app.journal_entries e WHERE e.id=reversal_of AND e.owner_kind=op.owner_kind AND e.owner_id=op.owner_id FOR UPDATE;
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
DO $$ DECLARE name text; BEGIN
  FOREACH name IN ARRAY ARRAY['ledger_accounts','journal_entries','journal_lines'] LOOP
    EXECUTE format('ALTER TABLE app.%I ENABLE ROW LEVEL SECURITY',name);
    EXECUTE format('ALTER TABLE app.%I FORCE ROW LEVEL SECURITY',name);
    EXECUTE format('CREATE POLICY migration_access ON app.%I TO fitloom_migrator USING(true) WITH CHECK(true)',name);
  END LOOP;
END $$;
CREATE POLICY account_read ON app.ledger_accounts FOR SELECT TO fitloom_web,fitloom_worker USING(owner_kind='tenant' AND app.owner_visible(owner_kind,owner_id) AND app.has_permission('journal.read'));
CREATE POLICY journal_read ON app.journal_entries FOR SELECT TO fitloom_web,fitloom_worker USING(owner_kind='tenant' AND app.has_permission('journal.read') AND operation_id IN (SELECT id FROM app.command_operations));
CREATE POLICY line_read ON app.journal_lines FOR SELECT TO fitloom_web,fitloom_worker USING(entry_id IN (SELECT id FROM app.journal_entries));
GRANT SELECT ON app.ledger_accounts,app.journal_entries,app.journal_lines TO fitloom_web,fitloom_worker;
GRANT EXECUTE ON FUNCTION app.post_journal(text,uuid,text,jsonb,uuid) TO fitloom_web,fitloom_worker;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA app FROM PUBLIC;
