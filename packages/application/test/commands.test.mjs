import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { createPool, withScope } from "@fitloom/db";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { migrateDatabase } from "../../db/scripts/migrate.mjs";
import {
  CommandError,
  createCommandExecutor,
  extendPrice,
  intermediateInput,
  moneyInput,
  postJournal,
  principalId,
  provisionTenant,
  quantityInput,
  requestHash,
  roundPosted,
  savePreferences,
  saveSetupDraft,
  unitPriceInput,
  updateWorkspace,
} from "../dist/index.js";

const setupDefaults = {
  businessMode: "tailoring",
  ownerName: "Fixture owner",
  ownerPhone: "+919876543210",
  address: "Fixture street",
  timezone: "Asia/Kolkata",
  consentAccepted: true,
  consentVersion: "workspace-authority-v1",
};
const isCategory = (category) => (error) =>
  error instanceof CommandError && error.category === category;
const hasCode = (code) => (error) =>
  error?.code === code || error?.cause?.code === code;
for (const identity of ["MIGRATOR", "WEB"]) {
  const value = process.env[`TEST_${identity}_DATABASE_URL`];
  if (!value) throw new Error("Run db:local first");
  const target = new URL(value);
  if (
    target.pathname !== "/fitloom_test" ||
    target.username !== `fitloom_test_${identity.toLowerCase()}` ||
    !["127.0.0.1", "postgres"].includes(target.hostname) ||
    target.port !== "24430"
  )
    throw new Error("Expected isolated test credentials");
}

await test("decimal policies reject precision loss and use exact half-up rounding", () => {
  for (const bad of [
    1.2,
    "NaN",
    "Infinity",
    "1e2",
    "1.001",
    "0.000",
    "1000000000000000000",
    "01.00",
    "-Infinity",
  ])
    assert.equal(moneyInput.safeParse(bad).success, false);
  assert.equal(moneyInput.parse("1.2"), "1.20");
  assert.equal(roundPosted("1.005"), "1.01");
  assert.equal(roundPosted("-1.005"), "-1.01");
  assert.equal(
    extendPrice(
      unitPriceInput.parse("0.100000"),
      quantityInput.parse({ value: "3.000000", unit: "piece" }),
    ),
    "0.30",
  );
  assert.equal(
    quantityInput.safeParse({ value: "1.0000001", unit: "metre" }).success,
    false,
  );
  assert.equal(
    quantityInput.safeParse({ value: "1", unit: "unknown" }).success,
    false,
  );
  assert.equal(unitPriceInput.safeParse("1.0000001").success, false);
  assert.equal(intermediateInput.safeParse("1.0000000000001").success, false);
  assert.equal(
    requestHash({ b: 2, a: { z: 0, y: 1 } }),
    requestHash({ a: { y: 1, z: 0 }, b: 2 }),
  );
  assert.notEqual(requestHash([1, 2]), requestHash([2, 1]));
});

await test("real command transactions and journals", async (t) => {
  const admin = createPool({
    connectionString: process.env.TEST_MIGRATOR_DATABASE_URL,
    purpose: "web",
    max: 1,
  });
  const web = createPool({
    connectionString: process.env.TEST_WEB_DATABASE_URL,
    purpose: "web",
    max: 4,
  });
  await admin.query("SET lock_timeout='20s'");
  await admin.query("SELECT pg_advisory_lock(68122902)");
  try {
    await migrateDatabase(process.env.TEST_MIGRATOR_DATABASE_URL);
    async function fixture() {
      const actor = randomUUID(),
        user = randomUUID();
      await admin.query(
        'INSERT INTO public."user"(id,name,email,email_verified) VALUES($1,$1,$2,true)',
        [user, `${user}@example.test`],
      );
      await admin.query(
        "INSERT INTO app.principals(id,auth_user_id) VALUES($1,$2)",
        [actor, user],
      );
      const fixtureExecutor = createCommandExecutor({
        pool: web,
        resolveIdentity: async () => ({
          principalId: principalId.parse(actor),
        }),
      });
      await fixtureExecutor(saveSetupDraft, {
        scope: { kind: "principal" },
        operationKey: randomUUID(),
        correlationId: randomUUID(),
        payload: {
          ...setupDefaults,
          expectedVersion: 0,
          shopName: "Fixture",
          locationName: "Main",
        },
      });
      const provisioningRequest = {
        scope: { kind: "principal" },
        operationKey: randomUUID(),
        correlationId: randomUUID(),
        payload: {
          ...setupDefaults,
          expectedVersion: 1,
          shopName: "Fixture",
          locationName: "Main",
        },
      };
      const provisioned = await fixtureExecutor(
        provisionTenant,
        provisioningRequest,
      );
      const tenant = provisioned.result.tenantId;
      // Start each command-consistency fixture at version zero after setup is provisioned.
      await admin.query(
        "UPDATE app.setup_drafts SET version=0 WHERE principal_id=$1",
        [actor],
      );
      const location = (
        await admin.query("SELECT id FROM app.locations WHERE tenant_id=$1", [
          tenant,
        ])
      ).rows[0].id;
      const role = (
        await admin.query("SELECT id FROM app.roles WHERE tenant_id=$1", [
          tenant,
        ])
      ).rows[0].id;
      await admin.query(
        "INSERT INTO app.command_owners(kind,id,tenant_id) VALUES('tenant',$1,$1) ON CONFLICT DO NOTHING",
        [tenant],
      );
      for (const code of ["cash", "revenue"])
        await admin.query(
          "INSERT INTO app.ledger_accounts VALUES('tenant',$1,$2)",
          [tenant, code],
        );
      for (const permission of ["journal.post", "journal.read"])
        await admin.query(
          "INSERT INTO app.permission_grants VALUES($1,$2,$3)",
          [tenant, role, permission],
        );
      return { actor, user, tenant, location, role, provisioningRequest };
    }
    const a = await fixture(),
      b = await fixture();
    let actor = a.actor,
      identityChecks = 0;
    const execute = createCommandExecutor({
      pool: web,
      resolveIdentity: async () => {
        identityChecks++;
        return { principalId: principalId.parse(actor) };
      },
    });
    const principalScope = { kind: "principal" };
    const scopeA = {
      kind: "tenant",
      tenantId: a.tenant,
      locationId: a.location,
    };
    const scopeB = {
      kind: "tenant",
      tenantId: b.tenant,
      locationId: b.location,
    };
    const invoke = (scope, payload, operationKey = randomUUID()) => ({
      scope,
      payload:
        scope.kind === "principal" ? { ...setupDefaults, ...payload } : payload,
      operationKey,
      correlationId: randomUUID(),
    });
    let first, firstRequest;
    await t.test(
      "principal provisioning replay rechecks verification and rejects changed payload",
      async () => {
        const replay = await execute(provisionTenant, a.provisioningRequest);
        assert.equal(replay.replayed, true);
        assert.equal(replay.result.tenantId, a.tenant);
        await assert.rejects(
          execute(provisionTenant, {
            ...a.provisioningRequest,
            payload: { ...a.provisioningRequest.payload, shopName: "Changed" },
          }),
          isCategory("conflict"),
        );
        await admin.query(
          'UPDATE public."user" SET email_verified=false WHERE id=$1',
          [a.user],
        );
        await assert.rejects(
          execute(provisionTenant, a.provisioningRequest),
          isCategory("access"),
        );
        await admin.query(
          'UPDATE public."user" SET email_verified=true WHERE id=$1',
          [a.user],
        );
        identityChecks = 0;
      },
    );

    await t.test(
      "concurrent normalized retries create exactly one effect and saved result",
      async () => {
        const key = randomUUID();
        firstRequest = invoke(
          principalScope,
          { expectedVersion: 0, shopName: "  Shop  ", locationName: "Main" },
          key,
        );
        const results = await Promise.all(
          Array.from({ length: 8 }, (_, i) =>
            execute(saveSetupDraft, {
              ...firstRequest,
              correlationId: randomUUID(),
              payload: {
                ...firstRequest.payload,
                shopName: i % 2 ? "Shop" : "  Shop  ",
              },
            }),
          ),
        );
        first = results[0];
        assert.ok(
          results.every(
            (r) =>
              r.operationId === first.operationId && r.result.version === 1,
          ),
        );
        assert.equal(results.filter((r) => !r.replayed).length, 1);
        assert.equal(identityChecks, 8);
        assert.equal(
          (
            await admin.query(
              "SELECT version FROM app.setup_drafts WHERE principal_id=$1",
              [a.actor],
            )
          ).rows[0].version,
          1,
        );
        assert.equal(
          (
            await admin.query(
              "SELECT * FROM app.command_audit WHERE operation_id=$1",
              [first.operationId],
            )
          ).rowCount,
          1,
        );
      },
    );
    await t.test(
      "changed input conflicts, stale versions fail, and failed claims leave no record",
      async () => {
        await assert.rejects(
          execute(saveSetupDraft, {
            ...firstRequest,
            payload: { ...firstRequest.payload, shopName: "Changed" },
          }),
          isCategory("conflict"),
        );
        const stale = invoke(principalScope, {
          expectedVersion: 0,
          shopName: "Shop",
          locationName: "Main",
        });
        await assert.rejects(
          execute(saveSetupDraft, stale),
          isCategory("conflict"),
        );
        assert.equal(
          (
            await admin.query(
              "SELECT * FROM app.command_operations WHERE operation_key=$1",
              [stale.operationKey],
            )
          ).rowCount,
          0,
        );
        const edits = await Promise.allSettled(
          ["One", "Two"].map((shopName) =>
            execute(
              saveSetupDraft,
              invoke(principalScope, {
                expectedVersion: 1,
                shopName,
                locationName: "Main",
              }),
            ),
          ),
        );
        assert.equal(edits.filter((r) => r.status === "fulfilled").length, 1);
        assert.equal(
          edits.filter(
            (r) => r.status === "rejected" && isCategory("conflict")(r.reason),
          ).length,
          1,
        );
      },
    );
    await t.test(
      "replay checks current identity and current permissions before returning saved results",
      async () => {
        await admin.query(
          "UPDATE app.principals SET active=false WHERE id=$1",
          [a.actor],
        );
        await assert.rejects(
          execute(saveSetupDraft, firstRequest),
          isCategory("access"),
        );
        await admin.query("UPDATE app.principals SET active=true WHERE id=$1", [
          a.actor,
        ]);
        actor = b.actor;
        const other = await execute(saveSetupDraft, firstRequest);
        assert.notEqual(other.operationId, first.operationId);
        actor = a.actor;
      },
    );
    await t.test(
      "serialization retries roll back prior work and exhaustion stays bounded",
      async () => {
        let attempts = 0;
        const retrying = {
          ...saveSetupDraft,
          async mutate(...args) {
            const changed = await saveSetupDraft.mutate(...args);
            attempts++;
            if (attempts === 1)
              await args[0].execute(
                sql`DO $$ BEGIN RAISE EXCEPTION 'serialization fixture' USING ERRCODE='40001'; END $$`,
              );
            return changed;
          },
        };
        const request = invoke(principalScope, {
          expectedVersion: 2,
          shopName: "Retried",
          locationName: "Main",
        });
        const retried = await execute(retrying, request);
        assert.equal(attempts, 2);
        assert.equal(retried.result.version, 3);
        assert.equal(
          (
            await admin.query(
              "SELECT * FROM app.command_operations WHERE operation_key=$1",
              [request.operationKey],
            )
          ).rowCount,
          1,
        );
        attempts = 0;
        const exhausted = {
          ...saveSetupDraft,
          async mutate(db) {
            attempts++;
            await db.execute(
              sql`DO $$ BEGIN RAISE EXCEPTION 'deadlock fixture' USING ERRCODE='40P01'; END $$`,
            );
            throw new Error("unreachable");
          },
        };
        const failingRequest = invoke(principalScope, {
          expectedVersion: 3,
          shopName: "Never",
          locationName: "Main",
        });
        await assert.rejects(
          execute(exhausted, failingRequest),
          isCategory("temporary"),
        );
        assert.equal(attempts, 3);
        assert.equal(
          (
            await admin.query(
              "SELECT * FROM app.command_operations WHERE operation_key=$1",
              [failingRequest.operationKey],
            )
          ).rowCount,
          0,
        );
      },
    );
    const posting = () => ({
      kind: "posting",
      sourceKind: "development-fixture",
      sourceId: randomUUID(),
      currency: "INR",
      lines: [
        { accountCode: "cash", side: "debit", amount: "10.00" },
        { accountCode: "revenue", side: "credit", amount: "10.00" },
      ],
    });
    let entry, journalRequest;
    await t.test(
      "balanced posting is immutable, source-unique, and permission checked on replay",
      async () => {
        journalRequest = invoke(scopeA, posting());
        entry = await execute(postJournal, journalRequest);
        const rows = await admin.query(
          "SELECT sum(CASE side WHEN 'debit' THEN amount ELSE -amount END)::text AS balance FROM app.journal_lines WHERE entry_id=$1",
          [entry.result.entryId],
        );
        assert.equal(rows.rows[0].balance, "0.00");
        const again = await execute(postJournal, journalRequest);
        assert.equal(again.replayed, true);
        await assert.rejects(
          execute(postJournal, {
            ...journalRequest,
            operationKey: randomUUID(),
          }),
          isCategory("conflict"),
        );
        await admin.query(
          "DELETE FROM app.permission_grants WHERE tenant_id=$1 AND role_id=$2 AND permission='journal.post'",
          [a.tenant, a.role],
        );
        await assert.rejects(
          execute(postJournal, journalRequest),
          isCategory("access"),
        );
        await admin.query(
          "INSERT INTO app.permission_grants VALUES($1,$2,'journal.post')",
          [a.tenant, a.role],
        );
        await assert.rejects(
          web.query("UPDATE app.journal_lines SET amount=1"),
          hasCode("42501"),
        );
        await assert.rejects(
          web.query(
            "INSERT INTO app.journal_lines VALUES('tenant',$1,$2,3,'cash','debit',1)",
            [a.tenant, entry.result.entryId],
          ),
          hasCode("42501"),
        );
        await assert.rejects(
          admin.query(
            "UPDATE app.journal_lines SET amount=1 WHERE entry_id=$1",
            [entry.result.entryId],
          ),
          hasCode("42501"),
        );
        await assert.rejects(
          web.query("DELETE FROM app.command_audit"),
          hasCode("42501"),
        );
      },
    );
    await t.test(
      "reversal derives exact opposite lines, keeps original, and cannot cross owners or repeat",
      async () => {
        const reverse = await execute(
          postJournal,
          invoke(scopeA, {
            kind: "reversal",
            sourceKind: "development-reversal",
            sourceId: randomUUID(),
            currency: "INR",
            reversalOf: entry.result.entryId,
          }),
        );
        const total = await admin.query(
          "SELECT sum(CASE side WHEN 'debit' THEN amount ELSE -amount END)::text AS balance FROM app.journal_lines WHERE entry_id=ANY($1::uuid[])",
          [[entry.result.entryId, reverse.result.entryId]],
        );
        assert.equal(total.rows[0].balance, "0.00");
        assert.equal(
          (
            await admin.query("SELECT * FROM app.journal_entries WHERE id=$1", [
              entry.result.entryId,
            ])
          ).rowCount,
          1,
        );
        await assert.rejects(
          execute(
            postJournal,
            invoke(scopeA, {
              kind: "reversal",
              sourceKind: "development-reversal",
              sourceId: randomUUID(),
              currency: "INR",
              reversalOf: entry.result.entryId,
            }),
          ),
          isCategory("conflict"),
        );
        actor = b.actor;
        await assert.rejects(
          execute(
            postJournal,
            invoke(scopeB, {
              kind: "reversal",
              sourceKind: "development-reversal",
              sourceId: randomUUID(),
              currency: "INR",
              reversalOf: entry.result.entryId,
            }),
          ),
          isCategory("validation"),
        );
        assert.equal(
          (
            await withScope(web, { ...scopeB, principalId: b.actor }, (db) =>
              db.execute(
                sql`SELECT * FROM app.journal_entries WHERE id=${entry.result.entryId}`,
              ),
            )
          ).rowCount,
          0,
        );
        actor = a.actor;
      },
    );
    await t.test(
      "a same-tenant reversal cannot reach another location",
      async () => {
        const otherLocation = (
          await admin.query(
            "INSERT INTO app.locations(tenant_id,name) VALUES($1,'Other fixture') RETURNING id",
            [a.tenant],
          )
        ).rows[0].id;
        const membership = (
          await admin.query(
            "SELECT id FROM app.memberships WHERE tenant_id=$1 AND principal_id=$2",
            [a.tenant, a.actor],
          )
        ).rows[0].id;
        await admin.query(
          "INSERT INTO app.location_grants VALUES($1,$2,$3,$4)",
          [a.tenant, membership, otherLocation, a.role],
        );
        const original = await execute(
          postJournal,
          invoke({ ...scopeA, locationId: otherLocation }, posting()),
        );
        await admin.query(
          "DELETE FROM app.location_grants WHERE tenant_id=$1 AND location_id=$2",
          [a.tenant, otherLocation],
        );
        await assert.rejects(
          execute(
            postJournal,
            invoke(scopeA, {
              kind: "reversal",
              sourceKind: "development-reversal",
              sourceId: randomUUID(),
              currency: "INR",
              reversalOf: original.result.entryId,
            }),
          ),
          isCategory("validation"),
        );
        const audit = (
          await admin.query(
            "SELECT changed_fields FROM app.command_audit WHERE operation_id=$1",
            [original.operationId],
          )
        ).rows[0];
        assert.deepEqual(audit.changed_fields, ["journalEntry"]);
      },
    );
    await t.test(
      "invalid decimals and unbalanced or mixed-currency journal payloads fail before writes",
      async () => {
        for (const value of ["1.001", "NaN", 1, "1000000000000000000"]) {
          const bad = posting();
          bad.lines[0].amount = value;
          await assert.rejects(
            execute(postJournal, invoke(scopeA, bad)),
            isCategory("validation"),
          );
        }
        const unbalanced = posting();
        unbalanced.lines[0].amount = "9.00";
        await assert.rejects(
          execute(postJournal, invoke(scopeA, unbalanced)),
          isCategory("validation"),
        );
        const currency = posting();
        currency.currency = "USD";
        await assert.rejects(
          execute(postJournal, invoke(scopeA, currency)),
          isCategory("validation"),
        );
      },
    );
    await t.test(
      "injected failure after mutation, journal, audit, outcome, and outbox rolls back every effect",
      async () => {
        const request = invoke(scopeA, posting());
        const failing = {
          ...postJournal,
          async mutate(db, authority, payload) {
            const changed = await postJournal.mutate(db, authority, payload);
            await db.execute(
              sql`SELECT app.finish_operation(${JSON.stringify(changed.result)}::jsonb,'journal-entry',${changed.result.entryId}::uuid,'Failure fixture',NULL,NULL,${JSON.stringify([{ key: "fixture", kind: "fixture", inputVersion: 1, payload: { sourceId: payload.sourceId } }])}::jsonb)`,
            );
            throw new Error("Injected failure after all effects");
          },
        };
        await assert.rejects(
          execute(failing, request),
          isCategory("temporary"),
        );
        assert.equal(
          (
            await admin.query(
              "SELECT * FROM app.command_operations WHERE operation_key=$1",
              [request.operationKey],
            )
          ).rowCount,
          0,
        );
        assert.equal(
          (
            await admin.query(
              "SELECT * FROM app.journal_entries WHERE source_id=$1",
              [request.payload.sourceId],
            )
          ).rowCount,
          0,
        );
        assert.equal(
          (
            await admin.query(
              "SELECT * FROM app.command_outbox WHERE payload->>'sourceId'=$1",
              [request.payload.sourceId],
            )
          ).rowCount,
          0,
        );
        const outboxCommand = {
          ...postJournal,
          async mutate(...args) {
            const changed = await postJournal.mutate(...args);
            return {
              ...changed,
              jobs: [
                {
                  key: "fixture",
                  kind: "fixture",
                  inputVersion: 1,
                  payload: { sourceId: request.payload.sourceId },
                },
              ],
            };
          },
        };
        const saved = await execute(outboxCommand, request);
        assert.equal(
          (
            await admin.query(
              "SELECT * FROM app.command_outbox WHERE operation_id=$1",
              [saved.operationId],
            )
          ).rowCount,
          1,
        );
        const audit = (
          await admin.query(
            "SELECT * FROM app.command_audit WHERE operation_id=$1",
            [saved.operationId],
          )
        ).rows[0];
        assert.equal("payload" in audit, false);
        await execute(outboxCommand, request);
        assert.equal(
          (
            await admin.query(
              "SELECT * FROM app.command_outbox WHERE operation_id=$1",
              [saved.operationId],
            )
          ).rowCount,
          1,
        );
      },
    );
    await t.test(
      "raw runtime SQL cannot bypass posting validation or commit incomplete operations",
      async () => {
        const raw = async (callback) =>
          withScope(web, { ...scopeA, principalId: a.actor }, async (db) => {
            await db.execute(
              sql`SELECT * FROM app.claim_operation('tenant','raw-fixture',${randomUUID()},${requestHash({ fixture: true })},${randomUUID()}::uuid)`,
            );
            await callback(db);
          });
        await assert.rejects(
          raw(async () => {}),
          hasCode("23514"),
        );
        await assert.rejects(
          raw((db) =>
            db.execute(
              sql`SELECT app.post_journal('fixture',${randomUUID()}::uuid,'INR','[{"accountCode":"cash","side":"debit","amount":"1.001"},{"accountCode":"revenue","side":"credit","amount":"1.001"}]'::jsonb)`,
            ),
          ),
          hasCode("22023"),
        );
        await assert.rejects(
          raw((db) =>
            db.execute(
              sql`SELECT app.post_journal('fixture',${randomUUID()}::uuid,'INR','[{"accountCode":"cash","side":"debit","amount":"1.00"},{"accountCode":"revenue","side":"credit","amount":"2.00"}]'::jsonb)`,
            ),
          ),
          hasCode("23514"),
        );
        await assert.rejects(
          withScope(web, { ...scopeA, principalId: a.actor }, (db) =>
            db.execute(
              sql`SELECT * FROM app.claim_operation('platform','attack','attack',${requestHash({})},${randomUUID()}::uuid)`,
            ),
          ),
          hasCode("42501"),
        );
        const platform = randomUUID();
        await admin.query(
          "INSERT INTO app.command_owners(kind,id) VALUES('platform',$1)",
          [platform],
        );
        await admin.query(
          "INSERT INTO app.ledger_accounts VALUES('platform',$1,'cash')",
          [platform],
        );
        assert.equal(
          (
            await withScope(web, { ...scopeA, principalId: a.actor }, (db) =>
              db.execute(
                sql`SELECT * FROM app.ledger_accounts WHERE owner_id=${platform}`,
              ),
            )
          ).rowCount,
          0,
        );
        const rawOwner = await admin.query(
          "SELECT * FROM app.command_operations WHERE request_hash=$1 AND result IS NULL",
          [requestHash({ fixture: true })],
        );
        assert.equal(rawOwner.rowCount, 0);
      },
    );
    await t.test(
      "commercial and feature admission follow security; replay never consumes usage again",
      async () => {
        const calls = [],
          backends = [];
        let denied = false;
        async function check(db, name) {
          calls.push(name);
          backends.push(
            (await db.execute(sql`SELECT pg_backend_pid() AS id`)).rows[0].id,
          );
          if (denied && name === "commercial")
            throw new CommandError("access", "Commercial access denied");
        }
        const admitted = createCommandExecutor({
          pool: web,
          resolveIdentity: async () => {
            calls.push("identity");
            return { principalId: principalId.parse(a.actor) };
          },
          admission: {
            mode: "commercial",
            commercial: (db) => check(db, "commercial"),
            features: (db) => check(db, "features"),
            usage: (db) => check(db, "usage"),
          },
        });
        const request = invoke(scopeA, {
          expectedVersion: 0,
          shopName: "Admitted fixture",
          address: "Fixture street",
        });
        await admitted(updateWorkspace, request);
        assert.deepEqual(calls, [
          "identity",
          "commercial",
          "features",
          "usage",
        ]);
        assert.equal(new Set(backends).size, 1);
        calls.length = 0;
        assert.equal((await admitted(updateWorkspace, request)).replayed, true);
        assert.deepEqual(calls, ["identity", "commercial", "features"]);
        calls.length = 0;
        denied = true;
        await assert.rejects(
          admitted(updateWorkspace, request),
          isCategory("access"),
        );
        assert.deepEqual(calls, ["identity", "commercial"]);
        calls.length = 0;
        await assert.rejects(
          admitted(updateWorkspace, { ...request, scope: scopeB }),
          isCategory("access"),
        );
        assert.deepEqual(calls, ["identity"]);
      },
    );
    await t.test(
      "structured diagnostics retain IDs and timing without payloads; logger failures cannot undo commits",
      async () => {
        const events = [],
          canary = "private-observation-canary";
        const observed = {
          ...savePreferences,
          input: z.strictObject({
            locale: z.enum(["en", "ta", "hi"]),
            tenantId: z.uuid().nullable(),
            locationId: z.uuid().nullable(),
            canary: z.string(),
          }),
        };
        const run = createCommandExecutor({
          pool: web,
          resolveIdentity: async () => ({ principalId: a.actor }),
          observe: (event) => events.push(event),
        });
        const request = {
          scope: { kind: "principal" },
          operationKey: randomUUID(),
          correlationId: randomUUID(),
          payload: { locale: "en", tenantId: null, locationId: null, canary },
        };
        const committed = await run(observed, request);
        await run(observed, request);
        assert.equal(events[0].correlationId, request.correlationId);
        assert.equal(events[0].operationId, committed.operationId);
        assert.equal(events[1].outcome, "replayed");
        assert.ok(events[0].elapsedMs >= 0);
        assert.ok(!JSON.stringify(events).includes(canary));
        const failing = createCommandExecutor({
          pool: web,
          resolveIdentity: async () => ({ principalId: a.actor }),
          observe: () => {
            throw new Error("Diagnostic output unavailable");
          },
        });
        assert.equal(
          (await failing(observed, { ...request, operationKey: randomUUID() }))
            .result.saved,
          true,
        );
      },
    );
  } finally {
    await web.end();
    await admin.end();
  }
});
