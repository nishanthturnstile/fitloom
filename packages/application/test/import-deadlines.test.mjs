import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { createPool, withScope } from "@fitloom/db";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { migrateDatabase } from "../../db/scripts/migrate.mjs";
import { createCommandExecutor } from "../dist/commands.js";

for (const purpose of ["MIGRATOR", "WEB"]) {
  const url = new URL(process.env[`TEST_${purpose}_DATABASE_URL`]);
  if (
    url.pathname !== "/fitloom_test" ||
    url.username !== `fitloom_test_${purpose.toLowerCase()}` ||
    !["127.0.0.1", "postgres"].includes(url.hostname)
  )
    throw Error("Guarded test database required");
}
test("import scheduling preserves real connection, lock, statement and transaction timeouts", async (t) => {
  const admin = createPool({
      connectionString: process.env.TEST_MIGRATOR_DATABASE_URL,
      purpose: "auth",
      max: 2,
    }),
    web = createPool({
      connectionString: process.env.TEST_WEB_DATABASE_URL,
      purpose: "web",
      max: 2,
    }),
    lease = await admin.connect();
  await lease.query("SELECT pg_advisory_lock(68122902)");
  try {
    await migrateDatabase(process.env.TEST_MIGRATOR_DATABASE_URL);
    const principalId = randomUUID();
    await admin.query(
      'INSERT INTO public."user"(id,name,email,email_verified) VALUES($1,$1,$2,true)',
      [principalId, `${principalId}@example.test`],
    );
    await admin.query(
      "INSERT INTO app.principals(id,auth_user_id) VALUES($1::uuid,$1::text)",
      [principalId],
    );
    const scope = { kind: "principal", principalId };
    await t.test(
      "deadline and attempt policy stop fresh work without changing executor defaults",
      async () => {
        let calls = 0;
        const command = {
          kind: "import-deadline.fixture",
          access: { kind: "principal", projection: "fixture" },
          input: z.strictObject({}),
          output: z.null(),
          mutate: async (db) => {
            calls++;
            await db.execute(
              sql`DO $$BEGIN RAISE EXCEPTION 'Serialization fixture' USING ERRCODE='40001';END $$`,
            );
            throw Error("Unreachable");
          },
        };
        const execute = createCommandExecutor({
            pool: web,
            resolveIdentity: async () => ({ principalId }),
          }),
          request = {
            scope: { kind: "principal" },
            payload: {},
            operationKey: randomUUID(),
            correlationId: randomUUID(),
          };
        await assert.rejects(
          execute(command, request, {
            maxAttempts: 1,
            deadlineAt: Date.now() - 1,
            minRemainingMs: 23000,
          }),
        );
        assert.equal(calls, 0);
        await assert.rejects(
          execute(command, request, {
            maxAttempts: 1,
            deadlineAt: Date.now() + 30000,
            minRemainingMs: 23000,
          }),
        );
        assert.equal(calls, 1);
        calls = 0;
        await assert.rejects(
          execute(command, { ...request, operationKey: randomUUID() }),
        );
        assert.equal(calls, 3);
        const delayed = createCommandExecutor({
          pool: web,
          resolveIdentity: async () => {
            await admin.query("SELECT pg_sleep(0.06)");
            return { principalId };
          },
        });
        calls = 0;
        await assert.rejects(
          delayed(
            command,
            { ...request, operationKey: randomUUID() },
            { maxAttempts: 1, deadlineAt: Date.now() + 30, minRemainingMs: 0 },
          ),
        );
        assert.equal(calls, 0);
      },
    );
    await t.test(
      "connection acquisition actually stops after three seconds",
      async () => {
        const tiny = createPool({
            connectionString: process.env.TEST_WEB_DATABASE_URL,
            purpose: "web",
            max: 1,
          }),
          held = await tiny.connect();
        try {
          const start = performance.now();
          await assert.rejects(
            withScope(tiny, scope, (db) => db.execute(sql`SELECT 1`)),
          );
          const elapsed = performance.now() - start;
          assert.ok(elapsed >= 2800 && elapsed < 5000, `${elapsed} ms`);
        } finally {
          held.release();
          await tiny.end();
        }
      },
    );
    await t.test(
      "contended advisory locks actually stop after two seconds",
      async () => {
        const held = await admin.connect();
        try {
          await held.query("BEGIN");
          await held.query("SELECT pg_advisory_xact_lock(765481122)");
          const start = performance.now();
          await assert.rejects(
            withScope(web, scope, (db) =>
              db.execute(sql`SELECT pg_advisory_xact_lock(765481122)`),
            ),
            (e) => e.cause?.code === "55P03",
          );
          const elapsed = performance.now() - start;
          assert.ok(elapsed >= 1800 && elapsed < 4500, `${elapsed} ms`);
        } finally {
          await held.query("ROLLBACK");
          held.release();
        }
      },
    );
    await t.test(
      "a slow statement actually stops at ten seconds and the pool recovers",
      async () => {
        const start = performance.now();
        await assert.rejects(
          withScope(web, scope, (db) => db.execute(sql`SELECT pg_sleep(10.5)`)),
          (e) => e.cause?.code === "57014",
        );
        const elapsed = performance.now() - start;
        assert.ok(elapsed >= 9500 && elapsed < 14000, `${elapsed} ms`);
        assert.equal(
          (
            await withScope(web, scope, (db) =>
              db.execute(sql`SELECT 1 AS value`),
            )
          ).rows[0].value,
          1,
        );
      },
    );
    await t.test(
      "multiple statements actually reach the twenty-second transaction timeout",
      async () => {
        const start = performance.now();
        await assert.rejects(
          withScope(web, scope, async (db) => {
            await db.execute(sql`SELECT pg_sleep(9)`);
            await db.execute(sql`SELECT pg_sleep(9)`);
            await db.execute(sql`SELECT pg_sleep(4)`);
          }),
        );
        const elapsed = performance.now() - start;
        assert.ok(elapsed >= 19000 && elapsed < 25000, `${elapsed} ms`);
        assert.equal(
          (
            await withScope(web, scope, (db) =>
              db.execute(sql`SELECT 1 AS value`),
            )
          ).rows[0].value,
          1,
        );
      },
    );
  } finally {
    await lease.query("SELECT pg_advisory_unlock(68122902)");
    lease.release();
    await admin.end();
    await web.end();
  }
});
