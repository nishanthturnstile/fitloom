import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { access, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { createPool } from "@fitloom/db";
import { migrateDatabase } from "../../db/scripts/migrate.mjs";
import {
  cancelJob,
  createWorkspaceService,
  fixtureInbox,
  processFoundationWork,
  provisionTenant,
  retryJob,
  saveSetupDraft,
  signFixture,
  updateWorkspace,
} from "../dist/index.js";

const target = new URL(process.env.TEST_MIGRATOR_DATABASE_URL);
if (
  target.pathname !== "/fitloom_test" ||
  target.username !== "fitloom_test_migrator" ||
  !["127.0.0.1", "postgres"].includes(target.hostname) ||
  target.port !== "24430"
)
  throw new Error("Isolated test database required");
await test("durable foundation jobs and signed provider inbox", async (t) => {
  const admin = createPool({
    connectionString: process.env.TEST_MIGRATOR_DATABASE_URL,
    purpose: "worker",
    max: 1,
  });
  const worker = createPool({
    connectionString: process.env.TEST_WORKER_DATABASE_URL,
    purpose: "worker",
    max: 3,
  });
  const web = createPool({
    connectionString: process.env.TEST_WEB_DATABASE_URL,
    purpose: "web",
    max: 2,
  });
  const auth = createPool({
    connectionString: process.env.TEST_AUTH_DATABASE_URL,
    purpose: "auth",
    max: 1,
  });
  const root = await mkdtemp(join(tmpdir(), "fitloom-staged-"));
  await admin.query("SET lock_timeout='20s'");
  await admin.query("SELECT pg_advisory_lock(68122902)");
  try {
    await migrateDatabase(process.env.TEST_MIGRATOR_DATABASE_URL);
    const run = () =>
      processFoundationWork({
        pool: worker,
        stagingRoot: root,
        allowFixtures: true,
      });
    const drain = async () => {
      for (let i = 0; i < 200; i++) if (!(await run())) return;
      throw new Error("Queue failed to drain");
    };
    const state = async (id) =>
      (await admin.query("SELECT * FROM app.foundation_jobs WHERE id=$1", [id]))
        .rows[0];
    const secret = "fixture-verifier-".repeat(4);
    const inbox = fixtureInbox({
      pool: web,
      secret,
      account: "local-fixture",
      environment: "test",
    });
    const source = randomUUID();
    function event(version, status, eventId = randomUUID()) {
      return { eventId, sourceId: source, version, state: status };
    }
    function request(
      data,
      {
        timestamp = String(Math.floor(Date.now() / 1000)),
        signature,
        raw = Buffer.from(JSON.stringify(data)),
      } = {},
    ) {
      return new Request("http://localhost:24411/api/providers/fixture-v1", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-fitloom-timestamp": timestamp,
          "x-fitloom-signature":
            signature ?? signFixture(raw, timestamp, secret),
        },
        body: raw,
      });
    }
    let first;
    await t.test(
      "exact raw signatures, size, replay window, and strict events reject before receipt",
      async () => {
        const before = (
          await admin.query("SELECT count(*) FROM app.provider_inbox")
        ).rows[0].count;
        assert.equal(
          (
            await inbox(
              request(event(1, "pending"), {
                signature: `v1=${"0".repeat(64)}`,
              }),
            )
          ).status,
          401,
        );
        assert.equal(
          (
            await inbox(
              request(event(1, "pending"), {
                timestamp: String(Math.floor(Date.now() / 1000) - 301),
              }),
            )
          ).status,
          401,
        );
        assert.equal(
          (
            await inbox(
              request(event(1, "pending"), {
                raw: Buffer.from("x".repeat(17000)),
              }),
            )
          ).status,
          413,
        );
        assert.equal(
          (
            await inbox(
              request({ ...event(1, "pending"), account: "untrusted" }),
            )
          ).status,
          400,
        );
        const raw = Buffer.from(JSON.stringify(event(1, "pending"))),
          stamp = String(Math.floor(Date.now() / 1000));
        assert.equal(
          (
            await inbox(
              request(
                {},
                {
                  raw: Buffer.concat([raw, Buffer.from(" ")]),
                  timestamp: stamp,
                  signature: signFixture(raw, stamp, secret),
                },
              ),
            )
          ).status,
          401,
        );
        assert.equal(
          (await admin.query("SELECT count(*) FROM app.provider_inbox")).rows[0]
            .count,
          before,
        );
      },
    );
    await t.test(
      "receipt and processing intent commit before acknowledgment; duplicate identity is durable",
      async () => {
        first = event(2, "confirmed");
        const results = await Promise.all([
          inbox(request(first)),
          inbox(request(first)),
        ]);
        assert.deepEqual(
          results.map((r) => r.status),
          [202, 202],
        );
        assert.equal(
          (await results[0].json()).receiptId,
          (await results[1].json()).receiptId,
        );
        assert.equal(
          (
            await admin.query(
              "SELECT * FROM app.provider_inbox WHERE event_id=$1",
              [first.eventId],
            )
          ).rowCount,
          1,
        );
        assert.equal(
          (await inbox(request({ ...first, state: "cancelled" }))).status,
          409,
        );
        await drain();
        assert.equal(
          (
            await admin.query(
              "SELECT * FROM app.provider_fixture_effects WHERE source_id=$1",
              [source],
            )
          ).rowCount,
          1,
        );
      },
    );
    await t.test(
      "unordered and distinct duplicate effects cannot regress source state or resurrect cancellation",
      async () => {
        for (const data of [
          event(5, "pending"),
          event(1, "pending"),
          event(2, "confirmed"),
          event(3, "cancelled"),
          event(4, "confirmed"),
        ])
          assert.equal((await inbox(request(data))).status, 202);
        await drain();
        const value = (
          await admin.query(
            "SELECT * FROM app.provider_fixture_state WHERE source_id=$1",
            [source],
          )
        ).rows[0];
        assert.equal(value.version, 3);
        assert.equal(value.state, "cancelled");
        assert.equal(
          (
            await admin.query(
              "SELECT * FROM app.provider_fixture_effects WHERE source_id=$1",
              [source],
            )
          ).rowCount,
          2,
        );
      },
    );
    await t.test(
      "receipt insertion failure rolls back receipt and queue intent together",
      async () => {
        const data = event(5, "pending");
        await admin.query(
          "CREATE FUNCTION app.test_job_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected queue failure';END $$; CREATE TRIGGER test_job_failure BEFORE INSERT ON app.foundation_jobs FOR EACH ROW EXECUTE FUNCTION app.test_job_failure()",
        );
        try {
          assert.equal((await inbox(request(data))).status, 503);
          assert.equal(
            (
              await admin.query(
                "SELECT * FROM app.provider_inbox WHERE event_id=$1",
                [data.eventId],
              )
            ).rowCount,
            0,
          );
        } finally {
          await admin.query(
            "DROP TRIGGER test_job_failure ON app.foundation_jobs;DROP FUNCTION app.test_job_failure()",
          );
        }
      },
    );
    const actor = randomUUID(),
      user = randomUUID();
    await admin.query(
      'INSERT INTO public."user"(id,name,email,email_verified) VALUES($1,$1,$2,true)',
      [user, `job-${user}@example.test`],
    );
    await admin.query(
      "INSERT INTO app.principals(id,auth_user_id) VALUES($1,$2)",
      [actor, user],
    );
    const service = createWorkspaceService({
      pool: web,
      resolveIdentity: async () => ({ principalId: actor }),
    });
    const invoke = (scope, payload, key = randomUUID()) => ({
      scope,
      payload,
      operationKey: key,
      correlationId: randomUUID(),
    });
    const profile = {
      shopName: "Jobs fixture",
      locationName: "Main",
      businessMode: "tailoring",
      ownerName: "Jobs owner",
      ownerPhone: "+919876543210",
      address: "Fixture address",
      timezone: "Asia/Kolkata",
      consentAccepted: true,
      consentVersion: "workspace-authority-v1",
    };
    await service.execute(
      saveSetupDraft,
      invoke({ kind: "principal" }, { ...profile, expectedVersion: 0 }),
    );
    const tenant = (
      await service.execute(
        provisionTenant,
        invoke({ kind: "principal" }, { ...profile, expectedVersion: 1 }),
      )
    ).result.tenantId;
    const choice = (await service.choices())[0],
      scope = {
        kind: "tenant",
        tenantId: tenant,
        locationId: choice.locationId,
      };
    let version = 0;
    async function enqueue(kind = "fixture.sensitive.v1", fail = false) {
      const cmd = {
        ...updateWorkspace,
        async mutate(db, a, p) {
          const result = await updateWorkspace.mutate(db, a, p);
          if (fail) throw new Error("Injected command failure");
          return {
            ...result,
            jobs: [{ kind, key: "job", inputVersion: 1, payload: {} }],
          };
        },
      };
      const result = await service.execute(
        cmd,
        invoke(scope, {
          shopName: profile.shopName,
          address: profile.address,
          expectedVersion: version,
        }),
      );
      version++;
      const outbox = (
        await admin.query(
          "SELECT id FROM app.command_outbox WHERE operation_id=$1",
          [result.operationId],
        )
      ).rows[0].id;
      await worker.query("SELECT app.foundation_dispatch()");
      return outbox;
    }
    await t.test(
      "command rollback enqueues nothing; repeated dispatcher claims deduplicate committed outbox",
      async () => {
        const before = (
          await admin.query("SELECT count(*) FROM app.command_outbox")
        ).rows[0].count;
        await assert.rejects(enqueue("fixture.sensitive.v1", true));
        assert.equal(
          (await admin.query("SELECT count(*) FROM app.command_outbox")).rows[0]
            .count,
          before,
        );
        const id = await enqueue();
        await Promise.all([
          worker.query("SELECT app.foundation_dispatch()"),
          worker.query("SELECT app.foundation_dispatch()"),
        ]);
        assert.equal(
          (
            await admin.query("SELECT * FROM app.foundation_jobs WHERE id=$1", [
              id,
            ])
          ).rowCount,
          1,
        );
        await drain();
        assert.equal((await state(id)).status, "succeeded");
      },
    );
    await t.test(
      "revoked membership, consent, principal, and tenant suspension cancel delayed sensitive work",
      async () => {
        const changes = [
          [
            "UPDATE app.memberships SET active=false WHERE principal_id=$1",
            "UPDATE app.memberships SET active=true WHERE principal_id=$1",
            actor,
          ],
          [
            "UPDATE app.principals SET active=false WHERE id=$1",
            "UPDATE app.principals SET active=true WHERE id=$1",
            actor,
          ],
          [
            "UPDATE app.shop_settings SET consent_version='revoked' WHERE tenant_id=$1",
            "UPDATE app.shop_settings SET consent_version='workspace-authority-v1' WHERE tenant_id=$1",
            tenant,
          ],
          [
            "UPDATE app.tenants SET active=false WHERE id=$1",
            "UPDATE app.tenants SET active=true WHERE id=$1",
            tenant,
          ],
        ];
        for (const [disable, restore, key] of changes) {
          const id = await enqueue();
          await admin.query(disable, [key]);
          try {
            await drain();
            assert.equal((await state(id)).status, "cancelled");
          } finally {
            await admin.query(restore, [key]);
          }
        }
      },
    );
    await t.test(
      "cancelled work cannot run; retry is authorized, tenant-qualified and audited",
      async () => {
        const id = await enqueue();
        await service.execute(cancelJob, invoke(scope, { jobId: id }));
        await drain();
        assert.equal((await state(id)).status, "cancelled");
        const failed = await enqueue("unknown.handler");
        await drain();
        assert.equal((await state(failed)).status, "failed");
        const listed = await service.jobs({
          tenantId: tenant,
          locationId: scope.locationId,
        });
        assert.ok(listed.some((j) => j.id === failed));
        assert.equal("payload" in listed[0], false);
        await admin.query(
          "UPDATE app.foundation_jobs SET finished_at=now()-interval '8 days' WHERE id=$1",
          [failed],
        );
        await worker.query("SELECT app.foundation_dispatch()");
        assert.equal(
          (
            await admin.query(
              "SELECT id FROM pgboss.job WHERE name='fitloom-foundation' AND id=$1",
              [failed],
            )
          ).rowCount,
          0,
        );
        assert.equal(
          (await state(failed)).status,
          "failed",
          "Pruning queue envelopes preserves durable outcomes",
        );
        await service.execute(retryJob, invoke(scope, { jobId: failed }));
        await drain();
        assert.equal((await state(failed)).attempts, 2);
        await assert.rejects(
          service.jobs({
            tenantId: randomUUID(),
            locationId: scope.locationId,
          }),
        );
        await assert.rejects(
          web.query("SELECT * FROM app.foundation_jobs"),
          (e) => e.code === "42501",
        );
        await assert.rejects(
          worker.query("CREATE TABLE pgboss.injection(id int)"),
          (e) => e.code === "42501",
        );
        await assert.rejects(
          auth.query("SELECT app.foundation_operator($1,$2)", [user, "fake"]),
          (e) => e.code === "42501",
        );
      },
    );
    await t.test(
      "expired claims recover across worker instances and stale tokens cannot settle new attempts",
      async () => {
        const id = await enqueue();
        const old = (await worker.query("SELECT * FROM app.foundation_take()"))
          .rows[0];
        assert.equal(old.id, id);
        await admin.query(
          "UPDATE app.foundation_jobs SET lease_until=now()-interval '1 second' WHERE id=$1",
          [id],
        );
        await worker.query("SELECT app.foundation_dispatch()");
        const fresh = (
          await worker.query("SELECT * FROM app.foundation_take()")
        ).rows[0];
        assert.notEqual(old.token, fresh.token);
        assert.equal(
          (
            await worker.query(
              "SELECT app.foundation_finish($1,$2,'succeeded',NULL) AS ok",
              [id, old.token],
            )
          ).rows[0].ok,
          false,
        );
        await worker.query("SELECT app.foundation_apply($1,$2)", [
          id,
          fresh.token,
        ]);
        assert.equal((await state(id)).status, "succeeded");
        assert.equal(
          (
            await admin.query(
              "SELECT * FROM app.foundation_attempts WHERE job_id=$1",
              [id],
            )
          ).rowCount,
          2,
        );
      },
    );
    await t.test(
      "real cleanup deletes only abandoned staging; preserves recent/attached and rejects symlinks",
      async () => {
        const old = randomUUID(),
          recent = randomUUID(),
          attached = randomUUID(),
          unsafe = randomUUID();
        for (const [id, status, age] of [
          [old, "staged", "48 hours"],
          [recent, "staged", "1 hour"],
          [attached, "attached", "48 hours"],
        ]) {
          await writeFile(join(root, `${id}.stage`), "fixture");
          await admin.query(
            "INSERT INTO app.staged_file_cleanup(id,state,staged_at) VALUES($1,$2,now()-$3::interval)",
            [id, status, age],
          );
        }
        const cleanup = (
          await admin.query(
            "SELECT id FROM app.foundation_jobs WHERE kind='files.cleanup' ORDER BY created_at LIMIT 1",
          )
        ).rows[0].id;
        await admin.query(
          "UPDATE app.foundation_jobs SET status='pending',cycle_attempts=0,next_attempt_at=now() WHERE id=$1",
          [cleanup],
        );
        await admin.query(
          "UPDATE pgboss.job SET state='retry' WHERE name='fitloom-foundation' AND id=$1",
          [cleanup],
        );
        await drain();
        await assert.rejects(access(join(root, `${old}.stage`)));
        await access(join(root, `${recent}.stage`));
        await access(join(root, `${attached}.stage`));
        // More than one batch must finish during the same daily obligation.
        const batch = Array.from({ length: 51 }, () => randomUUID());
        for (const id of batch) {
          await writeFile(join(root, `${id}.stage`), "batch fixture");
          await admin.query(
            "INSERT INTO app.staged_file_cleanup(id,state,staged_at) VALUES($1,'staged',now()-interval '48 hours')",
            [id],
          );
        }
        await admin.query(
          "UPDATE app.foundation_jobs SET status='pending',cycle_attempts=0,next_attempt_at=now() WHERE id=$1",
          [cleanup],
        );
        await admin.query(
          "UPDATE pgboss.job SET state='retry' WHERE name='fitloom-foundation' AND id=$1",
          [cleanup],
        );
        await drain();
        assert.equal((await state(cleanup)).status, "succeeded");
        assert.equal(
          (
            await admin.query(
              "SELECT count(*)::int AS n FROM app.staged_file_cleanup WHERE id=ANY($1::uuid[]) AND state='deleted'",
              [batch],
            )
          ).rows[0].n,
          51,
        );
        await symlink(
          join(root, `${attached}.stage`),
          join(root, `${unsafe}.stage`),
        );
        await admin.query(
          "INSERT INTO app.staged_file_cleanup(id,state,staged_at) VALUES($1,'staged',now()-interval '48 hours')",
          [unsafe],
        );
        await admin.query(
          "UPDATE app.foundation_jobs SET status='pending',cycle_attempts=0,next_attempt_at=now() WHERE id=$1",
          [cleanup],
        );
        await admin.query(
          "UPDATE pgboss.job SET state='retry' WHERE name='fitloom-foundation' AND id=$1",
          [cleanup],
        );
        for (let i = 0; i < 3; i++) {
          await run();
          await admin.query(
            "UPDATE app.foundation_jobs SET next_attempt_at=now() WHERE id=$1",
            [cleanup],
          );
        }
        assert.equal((await state(cleanup)).status, "failed");
        assert.equal((await state(cleanup)).last_error, "handler_failed");
        await access(join(root, `${attached}.stage`));
      },
    );
  } finally {
    await Promise.all([worker.end(), web.end(), auth.end()]);
    await admin.end();
    await rm(root, { recursive: true, force: true });
  }
});
