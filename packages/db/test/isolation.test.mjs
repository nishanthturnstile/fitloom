import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import { createPool, withScope } from "../dist/index.js";
import { migrateDatabase } from "../scripts/migrate.mjs";

async function provisionOnDb(db, name, key = "fixture-provision") {
  const hash = `v1:${createHash("sha256").update(name).digest("hex")}`;
  const op = (
    await db.execute(
      sql`SELECT * FROM app.claim_operation('principal','tenant.provision',${key},${hash},${randomUUID()}::uuid)`,
    )
  ).rows[0];
  if (op.result) return { rows: [{ id: op.result.id }] };
  const result = await db.execute(
    sql`SELECT app.provision_tenant(${name},'Main',0) AS id`,
  );
  await db.execute(
    sql`SELECT app.finish_operation(${JSON.stringify(result.rows[0])}::jsonb,'tenant',${result.rows[0].id}::uuid,'Provision fixture',0,NULL,'[]'::jsonb)`,
  );
  return result;
}

const hasCode = (code) => (error) =>
  error?.code === code || error?.cause?.code === code;
const url = process.env.TEST_MIGRATOR_DATABASE_URL;
if (!url) throw new Error("Run db:local first");
const target = new URL(url);
// This suite destroys only the fixed local test schemas. Never accept developer URLs.
if (
  target.pathname !== "/fitloom_test" ||
  target.username !== "fitloom_test_migrator" ||
  !["127.0.0.1", "localhost", "postgres"].includes(target.hostname)
)
  throw new Error("Expected isolated local fitloom_test credentials");

for (const purpose of ["web", "worker", "auth", "operator"]) {
  const runtimeUrl = process.env[`TEST_${purpose.toUpperCase()}_DATABASE_URL`];
  if (!runtimeUrl) throw new Error("Missing isolated runtime test URL");
  const runtime = new URL(runtimeUrl);
  if (
    runtime.origin !== target.origin ||
    runtime.hostname !== target.hostname ||
    runtime.port !== target.port ||
    runtime.pathname !== target.pathname ||
    runtime.username !== `fitloom_test_${purpose}`
  )
    throw new Error("Expected matching isolated runtime test credentials");
}

await test("PostgreSQL roles, migrations, and tenant isolation", async (t) => {
  const migration = new pg.Client({ connectionString: url });
  await migration.connect();
  await migration.query("SELECT pg_advisory_lock(68122902)");
  const pools = Object.fromEntries(
    ["web", "worker", "auth", "operator"].map((purpose) => [
      purpose,
      createPool({
        connectionString:
          process.env[`TEST_${purpose.toUpperCase()}_DATABASE_URL`],
        purpose,
        max: 1,
      }),
    ]),
  );
  const { web, worker, auth, operator } = pools;
  try {
    await migration.query(
      "SET ROLE fitloom_migrator; DROP SCHEMA IF EXISTS app CASCADE; DROP SCHEMA public CASCADE; DROP SCHEMA IF EXISTS drizzle CASCADE; DROP SCHEMA IF EXISTS pgboss CASCADE; CREATE SCHEMA public AUTHORIZATION fitloom_migrator; REVOKE ALL ON SCHEMA public FROM PUBLIC",
    );
    await t.test(
      "clean migrations, existing Owner upgrade, and repeated invocation",
      async () => {
        const folder = await mkdtemp(join(tmpdir(), "fitloom-foundation-"));
        const journal = JSON.parse(
          await readFile(
            new URL("../migrations/meta/_journal.json", import.meta.url),
            "utf8",
          ),
        );
        const foundation = {
          ...journal,
          entries: journal.entries.slice(0, 23),
        };
        const legacyTenant = randomUUID(),
          ownerRole = randomUUID(),
          managerRole = randomUUID();
        try {
          await mkdir(join(folder, "meta"));
          await writeFile(
            join(folder, "meta", "_journal.json"),
            JSON.stringify(foundation),
          );
          for (const entry of foundation.entries)
            await copyFile(
              new URL(`../migrations/${entry.tag}.sql`, import.meta.url),
              join(folder, `${entry.tag}.sql`),
            );
          await migrate(drizzle(migration), { migrationsFolder: folder });
          await migration.query(
            "INSERT INTO app.tenants(id,name) VALUES($1,'Existing master migration fixture')",
            [legacyTenant],
          );
          await migration.query(
            "INSERT INTO app.roles(id,tenant_id,name,preset) VALUES($1,$3,'Owner','owner'),($2,$3,'Manager','manager')",
            [ownerRole, managerRole, legacyTenant],
          );
          await migration.query(
            "INSERT INTO app.permission_grants VALUES($1,$2,'workspace.manage'),($1,$3,'workspace.read')",
            [legacyTenant, ownerRole, managerRole],
          );
          await migrateDatabase(url);
          const upgraded = (
            await migration.query(
              "SELECT permission FROM app.permission_grants WHERE role_id=$1 ORDER BY permission",
              [ownerRole],
            )
          ).rows.map((r) => r.permission);
          assert.deepEqual(upgraded, [
            "customers.archive",
            "customers.manage",
            "customers.photos.manage",
            "customers.photos.read",
            "customers.read",
            "masters.manage",
            "masters.rates.read",
            "masters.read",
            "workspace.manage",
          ]);
          assert.equal(
            (
              await migration.query(
                "SELECT * FROM app.permission_grants WHERE role_id=$1 AND (permission LIKE 'masters.%' OR permission LIKE 'customers.%')",
                [managerRole],
              )
            ).rowCount,
            0,
          );
          await migration.query(
            "DELETE FROM app.permission_grants WHERE tenant_id=$1",
            [legacyTenant],
          );
          await migration.query("DELETE FROM app.roles WHERE tenant_id=$1", [
            legacyTenant,
          ]);
          await migration.query("DELETE FROM app.tenants WHERE id=$1", [
            legacyTenant,
          ]);
        } finally {
          await rm(folder, { recursive: true, force: true });
        }
        // Also prove the full retained set installs directly from an empty database.
        await migration.query(
          "DROP SCHEMA app CASCADE; DROP SCHEMA public CASCADE; DROP SCHEMA drizzle CASCADE; DROP SCHEMA pgboss CASCADE; CREATE SCHEMA public AUTHORIZATION fitloom_migrator; REVOKE ALL ON SCHEMA public FROM PUBLIC",
        );
        await migrateDatabase(url);
        const before = await migration.query(
          "SELECT * FROM drizzle.__drizzle_migrations ORDER BY id",
        );
        await migrateDatabase(url);
        assert.deepEqual(
          (
            await migration.query(
              "SELECT * FROM drizzle.__drizzle_migrations ORDER BY id",
            )
          ).rows,
          before.rows,
        );
        assert.equal(before.rowCount, journal.entries.length);
      },
    );
    const actorA = randomUUID(),
      actorB = randomUUID(),
      userA = randomUUID(),
      userB = randomUUID();
    for (const [actor, user] of [
      [actorA, userA],
      [actorB, userB],
    ]) {
      await auth.query(
        'INSERT INTO public."user" (id, name, email, email_verified) VALUES ($1, $1, $2, true)',
        [user, `${user}@example.test`],
      );
      await migration.query(
        "INSERT INTO app.principals(id, auth_user_id) VALUES ($1, $2)",
        [actor, user],
      );
    }
    let tenantA, tenantB, locationA, locationB;
    const principal = (principalId) => ({ kind: "principal", principalId });
    async function provision(actor, name) {
      return withScope(web, principal(actor), async (db) => {
        await migration.query(
          "INSERT INTO app.setup_drafts(principal_id,draft) VALUES ($1,$2::jsonb)",
          [
            actor,
            JSON.stringify({
              shopName: typeof name !== "undefined" ? name : "Shop C",
              locationName: "Main",
              businessMode: "tailoring",
              ownerName: "Fixture",
              ownerPhone: "+919876543210",
              address: "Fixture",
              timezone: "Asia/Kolkata",
              consentAccepted: true,
              consentVersion: "workspace-authority-v1",
            }),
          ],
        );
        return (await provisionOnDb(db, name)).rows[0].id;
      });
    }
    await t.test(
      "restricted verified provisioning and principal discovery",
      async () => {
        tenantA = await provision(actorA, "Shop A");
        tenantB = await provision(actorB, "Shop B");
        const a = await withScope(web, principal(actorA), (db) =>
          db.execute(sql`SELECT * FROM app.discover_memberships()`),
        );
        assert.equal(a.rowCount, 1);
        assert.equal(a.rows[0].tenant_id, tenantA);
        locationA = a.rows[0].location_id;
        const b = await withScope(web, principal(actorB), (db) =>
          db.execute(sql`SELECT * FROM app.discover_memberships()`),
        );
        locationB = b.rows[0].location_id;
        assert.equal(
          (await web.query("SELECT * FROM app.discover_memberships()"))
            .rowCount,
          0,
        );
        const retries = await Promise.all(
          [1, 2].map(() =>
            withScope(web, principal(actorA), (db) =>
              provisionOnDb(db, "Shop A"),
            ),
          ),
        );
        assert.ok(retries.every((r) => r.rows[0].id === tenantA));
        assert.equal(
          (await migration.query("SELECT * FROM app.tenants")).rowCount,
          2,
        );
        await auth.query(
          'UPDATE public."user" SET email_verified = false WHERE id = $1',
          [userB],
        );
        await assert.rejects(
          withScope(web, principal(actorB), (db) =>
            provisionOnDb(db, "Shop B", randomUUID()),
          ),
          hasCode("42501"),
        );
        await auth.query(
          'UPDATE public."user" SET email_verified = true WHERE id = $1',
          [userB],
        );
      },
    );
    const scopeA = {
      kind: "tenant",
      principalId: actorA,
      tenantId: tenantA,
      locationId: locationA,
    };
    const scopeB = {
      kind: "tenant",
      principalId: actorB,
      tenantId: tenantB,
      locationId: locationB,
    };
    await t.test(
      "runtime roles cannot manage schema, authority, or bypass RLS",
      async () => {
        for (const pool of Object.values(pools)) {
          const flags = (
            await pool.query(
              "SELECT rolsuper, rolbypassrls, rolcreatedb, rolcreaterole, pg_has_role(current_user, 'fitloom_migrator', 'MEMBER') AS owner_role FROM pg_roles WHERE rolname = current_user",
            )
          ).rows[0];
          assert.ok(Object.values(flags).every((v) => v === false));
          await assert.rejects(
            pool.query("CREATE TABLE public.attack(id int)"),
            hasCode("42501"),
          );
          await assert.rejects(
            pool.query("SET ROLE fitloom_migrator"),
            hasCode("42501"),
          );
          await assert.rejects(
            pool.query("TRUNCATE app.tenants"),
            hasCode("42501"),
          );
          await assert.rejects(
            pool.query("ALTER TABLE app.tenants DISABLE ROW LEVEL SECURITY"),
            hasCode("42501"),
          );
        }
        await assert.rejects(
          web.query("SELECT * FROM public.session"),
          hasCode("42501"),
        );
        await assert.rejects(
          auth.query("SELECT * FROM app.tenants"),
          hasCode("42501"),
        );
        await assert.rejects(
          operator.query("SELECT * FROM app.tenants"),
          hasCode("42501"),
        );
        await assert.rejects(
          web.query("INSERT INTO app.operator_grants VALUES ($1, 'all')", [
            actorA,
          ]),
          hasCode("42501"),
        );
        await assert.rejects(
          worker.query("SELECT app.provision_tenant('attack', 'attack',0)"),
          hasCode("42501"),
        );
        const owners = await migration.query(
          "SELECT count(*)::int AS count FROM pg_tables WHERE schemaname IN ('public','app','pgboss') AND tableowner <> 'fitloom_migrator'",
        );
        assert.equal(owners.rows[0].count, 0);
      },
    );
    await t.test(
      "missing context, wrong tenant, and unauthorized locations deny access",
      async () => {
        for (const pool of [web, worker]) {
          assert.equal(
            (await pool.query("SELECT * FROM app.tenants")).rowCount,
            0,
          );
          const a = await withScope(pool, scopeA, (db) =>
            db.execute(sql`SELECT id FROM app.tenants`),
          );
          assert.deepEqual(a.rows, [{ id: tenantA }]);
          const b = await withScope(pool, scopeB, (db) =>
            db.execute(sql`SELECT id FROM app.tenants`),
          );
          assert.deepEqual(b.rows, [{ id: tenantB }]);
          await assert.rejects(
            withScope(pool, { ...scopeB, principalId: actorA }, async () => {}),
            /scope denied/,
          );
          await assert.rejects(
            withScope(
              pool,
              { ...scopeA, locationId: locationB },
              async () => {},
            ),
            /scope denied/,
          );
        }
        const otherLocation = (
          await migration.query(
            "INSERT INTO app.locations(tenant_id, name) VALUES ($1, 'Restricted') RETURNING id",
            [tenantA],
          )
        ).rows[0].id;
        await assert.rejects(
          withScope(
            web,
            { ...scopeA, locationId: otherLocation },
            async () => {},
          ),
          /scope denied/,
        );
        assert.equal(
          (
            await withScope(web, scopeA, (db) =>
              db.execute(sql`SELECT * FROM app.locations`),
            )
          ).rowCount,
          1,
        );
        await migration.query(
          "UPDATE app.memberships SET active = false WHERE principal_id = $1",
          [actorA],
        );
        await assert.rejects(
          withScope(web, scopeA, async () => {}),
          /scope denied/,
        );
        await migration.query(
          "UPDATE app.memberships SET active = true WHERE principal_id = $1",
          [actorA],
        );
        await migration.query(
          "UPDATE app.tenants SET active = false WHERE id = $1",
          [tenantA],
        );
        await assert.rejects(
          withScope(web, scopeA, async () => {}),
          /scope denied/,
        );
        await migration.query(
          "UPDATE app.tenants SET active = true WHERE id = $1",
          [tenantA],
        );
      },
    );
    await t.test(
      "tenant-qualified foreign keys reject mixed-tenant references",
      async () => {
        const member = (
          await migration.query(
            "SELECT id FROM app.memberships WHERE tenant_id = $1",
            [tenantA],
          )
        ).rows[0].id;
        const role = (
          await migration.query(
            "SELECT id FROM app.roles WHERE tenant_id = $1",
            [tenantA],
          )
        ).rows[0].id;
        await assert.rejects(
          migration.query(
            "INSERT INTO app.location_grants VALUES ($1,$2,$3,$4)",
            [tenantA, member, locationB, role],
          ),
          hasCode("23503"),
        );
        await assert.rejects(
          withScope(web, scopeA, (db) =>
            db.execute(
              sql`INSERT INTO app.location_grants VALUES (${tenantA},${member},${locationB},${role})`,
            ),
          ),
          hasCode("42501"),
        );
      },
    );
    await t.test(
      "pool reuse clears context after commit and rollback on the same backend",
      async () => {
        const pid = (await web.query("SELECT pg_backend_pid() AS pid")).rows[0]
          .pid;
        await withScope(web, scopeA, async (db) => {
          assert.equal(
            (await db.execute(sql`SELECT pg_backend_pid() AS pid`)).rows[0].pid,
            pid,
          );
        });
        assert.equal(
          (await web.query("SELECT * FROM app.tenants")).rowCount,
          0,
        );
        await assert.rejects(
          withScope(web, scopeB, async (db) => {
            await db.execute(sql`SELECT 1`);
            throw new Error("Injected failure");
          }),
          /Injected failure/,
        );
        assert.equal(
          (await web.query("SELECT pg_backend_pid() AS pid")).rows[0].pid,
          pid,
        );
        assert.equal(
          (await web.query("SELECT * FROM app.tenants")).rowCount,
          0,
        );
        assert.deepEqual(
          (
            await migration.query(
              "SELECT draft FROM app.setup_drafts WHERE principal_id = $1",
              [actorB],
            )
          ).rows[0].draft,
          {
            shopName: "Shop B",
            locationName: "Main",
            businessMode: "tailoring",
            ownerName: "Fixture",
            ownerPhone: "+919876543210",
            address: "Fixture",
            timezone: "Asia/Kolkata",
            consentAccepted: true,
            consentVersion: "workspace-authority-v1",
          },
        );
        const settings = (
          await web.query(
            "SELECT nullif(current_setting('app.principal_id',true),'') AS principal, nullif(current_setting('app.tenant_id',true),'') AS tenant, nullif(current_setting('app.location_id',true),'') AS location",
          )
        ).rows[0];
        assert.deepEqual(settings, {
          principal: null,
          tenant: null,
          location: null,
        });
      },
    );
    await t.test(
      "principal writes cannot change provisioning identity or another principal's draft",
      async () => {
        await assert.rejects(
          withScope(web, principal(actorA), (db) =>
            db.execute(
              sql`UPDATE app.setup_drafts SET draft = '{}' WHERE principal_id = ${actorB}`,
            ),
          ),
          hasCode("42501"),
        );
        await assert.rejects(
          withScope(web, principal(actorA), (db) =>
            db.execute(
              sql`UPDATE app.setup_drafts SET provisioning_id = gen_random_uuid()`,
            ),
          ),
          hasCode("42501"),
        );
        await migration.query(
          "UPDATE app.principals SET active = false WHERE id = $1",
          [actorA],
        );
        await assert.rejects(
          withScope(web, principal(actorA), async () => {}),
          /scope denied/,
        );
      },
    );
    await t.test(
      "provisioning rolls back atomically and concurrent fresh retries create one tenant",
      async () => {
        const actor = randomUUID(),
          user = randomUUID();
        await auth.query(
          'INSERT INTO public."user" (id, name, email, email_verified) VALUES ($1, $1, $2, true)',
          [user, `${user}@example.test`],
        );
        await migration.query(
          "INSERT INTO app.principals(id, auth_user_id) VALUES ($1,$2)",
          [actor, user],
        );
        await migration.query(
          "INSERT INTO app.setup_drafts(principal_id,draft) VALUES ($1,$2::jsonb)",
          [
            actor,
            JSON.stringify({
              shopName: typeof name !== "undefined" ? name : "Shop C",
              locationName: "Main",
              businessMode: "tailoring",
              ownerName: "Fixture",
              ownerPhone: "+919876543210",
              address: "Fixture",
              timezone: "Asia/Kolkata",
              consentAccepted: true,
              consentVersion: "workspace-authority-v1",
            }),
          ],
        );
        await assert.rejects(
          withScope(web, principal(actor), async (db) => {
            await provisionOnDb(db, "Shop C");
            throw new Error("Injected provisioning failure");
          }),
          /Injected provisioning failure/,
        );
        assert.equal(
          (
            await migration.query(
              "SELECT * FROM app.tenant_setup WHERE principal_id = $1",
              [actor],
            )
          ).rowCount,
          0,
        );
        assert.equal(
          (
            await migration.query(
              "SELECT * FROM app.tenants WHERE name = 'Shop C'",
            )
          ).rowCount,
          0,
        );
        const concurrent = createPool({
          connectionString: process.env.TEST_WEB_DATABASE_URL,
          purpose: "web",
          max: 2,
        });
        try {
          const results = await Promise.all(
            [1, 2].map(() =>
              withScope(concurrent, principal(actor), (db) =>
                provisionOnDb(db, "Shop C"),
              ),
            ),
          );
          assert.equal(results[0].rows[0].id, results[1].rows[0].id);
          assert.equal(
            (
              await migration.query(
                "SELECT * FROM app.tenants WHERE name = 'Shop C'",
              )
            ).rowCount,
            1,
          );
          assert.equal(
            (
              await migration.query(
                "SELECT * FROM app.security_audit WHERE principal_id = $1",
                [actor],
              )
            ).rowCount,
            1,
          );
        } finally {
          await concurrent.end();
        }
      },
    );
    await t.test("caught SQL errors cannot report commit success", async () => {
      await assert.rejects(
        withScope(web, principal(actorB), async (db) => {
          await db.execute(sql`SELECT 1`);
          try {
            await db.execute(sql`SELECT 1/0`);
          } catch {
            /* Prove an aborted transaction cannot report success. */
          }
          return "reported-success";
        }),
        /rolled back before commit/,
      );
    });
    await t.test(
      "transaction timeouts reject without crashing and discard the connection",
      async () => {
        const pid = (await web.query("SELECT pg_backend_pid() AS pid")).rows[0]
          .pid;
        await assert.rejects(
          withScope(web, principal(actorB), async (db) => {
            await db.execute(
              sql`SET LOCAL idle_in_transaction_session_timeout = 50`,
            );
            await new Promise((resolve) => setTimeout(resolve, 150));
          }),
          hasCode("25P03"),
        );
        assert.notEqual(
          (await web.query("SELECT pg_backend_pid() AS pid")).rows[0].pid,
          pid,
        );
        assert.equal(
          (await web.query("SELECT * FROM app.tenants")).rowCount,
          0,
        );
      },
    );
    await t.test(
      "queue installation matches the pinned package and is inaccessible to runtime until handlers exist",
      async () => {
        const { queueSql } = await import("../scripts/generate-queue.mjs");
        const retained = await readFile(
          new URL("../migrations/0002_queue_install.sql", import.meta.url),
          "utf8",
        );
        assert.ok(retained.includes(queueSql));
        for (const pool of [web, worker])
          await assert.rejects(
            pool.query("SELECT * FROM pgboss.job"),
            hasCode("42501"),
          );
      },
    );
  } finally {
    await Promise.all(Object.values(pools).map((pool) => pool.end()));
    await migration.end();
  }
});
