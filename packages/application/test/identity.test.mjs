import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash, createHmac, randomUUID } from "node:crypto";
import { test } from "node:test";
import { createPool } from "@fitloom/db";
import { migrateDatabase } from "../../db/scripts/migrate.mjs";
import {
  createCommandExecutor,
  createIdentityService,
  createMailTransport,
  createWorkspaceService,
  deliverAuthMail,
  provisionTenant,
  saveSetupDraft,
} from "../dist/index.js";
import { totp } from "./auth-helpers.mjs";

const baseURL = "http://localhost:24411";
for (const purpose of ["MIGRATOR", "AUTH", "WEB", "WORKER"]) {
  const value = process.env[`TEST_${purpose}_DATABASE_URL`];
  if (!value) throw new Error("Run db:local and mail:local");
  const url = new URL(value);
  if (
    url.pathname !== "/fitloom_test" ||
    !["127.0.0.1", "postgres"].includes(url.hostname) ||
    url.port !== "24430" ||
    url.username !== `fitloom_test_${purpose.toLowerCase()}`
  )
    throw new Error("Isolated test credentials required");
}
function browser(service) {
  const cookies = new Map();
  const headers = () =>
    new Headers({
      cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join("; "),
    });
  return {
    headers,
    async request(path, body, options = {}) {
      const method = body === undefined ? "GET" : "POST";
      const h = headers();
      h.set("origin", options.origin ?? baseURL);
      if (body !== undefined) h.set("content-type", "application/json");
      for (const [key, value] of Object.entries(options.headers ?? {}))
        h.set(key, value);
      const result = await service.handle(
        new Request(new URL(`/api/auth${path}`, baseURL), {
          method,
          headers: h,
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        }),
      );
      for (const cookie of result.headers.getSetCookie()) {
        const pair = cookie.split(";")[0];
        const pos = pair.indexOf("=");
        const key = pair.slice(0, pos);
        if (/max-age=0/i.test(cookie)) cookies.delete(key);
        else cookies.set(key, pair.slice(pos + 1));
      }
      return result;
    },
  };
}
await test("verified identity, real Mailpit delivery, recovery, and operator MFA", async (t) => {
  const admin = createPool({
    connectionString: process.env.TEST_MIGRATOR_DATABASE_URL,
    purpose: "auth",
    max: 1,
  });
  const authPool = createPool({
    connectionString: process.env.TEST_AUTH_DATABASE_URL,
    purpose: "auth",
    max: 3,
  });
  const web = createPool({
    connectionString: process.env.TEST_WEB_DATABASE_URL,
    purpose: "web",
    max: 2,
  });
  const worker = createPool({
    connectionString: process.env.TEST_WORKER_DATABASE_URL,
    purpose: "worker",
    max: 1,
  });
  const secret = process.env.TEST_AUTH_SECRET,
    mailKey = process.env.TEST_MAIL_ENCRYPTION_KEY;
  if (!secret || !mailKey) throw new Error("Run mail:local first");
  const config = {
    mode: "test",
    baseURL,
    trustedOrigins: [baseURL],
    secret,
    mailKey,
  };
  const failures = [];
  const observations = [];
  const service = createIdentityService({
    pool: authPool,
    config,
    onFailure: (code) => failures.push(code),
    observe: (event) => observations.push(event),
  });
  const transport = createMailTransport({
    provider: "mailpit",
    host: process.env.TEST_MAILPIT_HOST ?? "127.0.0.1",
    port: 24423,
    from: "fitloom@example.test",
  });
  await admin.query("SET lock_timeout='20s'");
  await admin.query("SELECT pg_advisory_lock(68122902)");
  async function drain() {
    for (let i = 0; i < 30; i++)
      if (
        !(await deliverAuthMail({ pool: worker, secret: mailKey, transport }))
      )
        return;
    throw new Error("Mail queue did not drain");
  }
  async function message(email, subject) {
    const list = await (
      await fetch(
        `${process.env.TEST_MAILPIT_URL ?? "http://127.0.0.1:24422"}/api/v1/messages`,
      )
    ).json();
    const selected = list.messages.find(
      (m) =>
        m.To.some((to) => to.Address === email) &&
        (!subject || m.Subject.includes(subject)),
    );
    assert.ok(selected, "Expected Mailpit message");
    const full = await (
      await fetch(
        `${process.env.TEST_MAILPIT_URL ?? "http://127.0.0.1:24422"}/api/v1/message/${selected.ID}`,
      )
    ).json();
    const link = full.Text.match(/https?:\/\/[^\s]+/);
    assert.ok(link, "Expected link in captured message");
    return link[0];
  }
  const password = "Fitloom testing password 2026!";
  async function register(email) {
    const client = browser(service);
    const result = await client.request("/sign-up/email", {
      name: "Identity fixture",
      email,
      password,
      callbackURL: "/account",
    });
    assert.equal(result.status, 200);
    return client;
  }
  async function verify(email, client) {
    await drain();
    const link = await message(email, "Verify");
    const response = await service.handle(new Request(link));
    assert.ok([200, 302].includes(response.status));
    const signed = await client.request("/sign-in/email", { email, password });
    assert.equal(signed.status, 200);
    return link;
  }
  try {
    await migrateDatabase(process.env.TEST_MIGRATOR_DATABASE_URL);
    t.beforeEach(async () => {
      await admin.query(
        "UPDATE app.auth_admission SET window_started_at=now()-interval '61 seconds'; UPDATE public.rate_limit SET last_request=last_request-61000",
      );
    });
    await admin.query("TRUNCATE app.auth_admission,public.rate_limit");
    const email = `identity-${randomUUID()}@example.test`;
    let client;
    await t.test(
      "registration maps one principal and atomically retains an encrypted verification email",
      async () => {
        client = await register(email);
        const rows = await admin.query(
          'SELECT p.id,m.encrypted_payload,m.state FROM public."user" u JOIN app.principals p ON p.auth_user_id=u.id JOIN app.auth_mail m ON m.user_id=u.id WHERE u.email=$1',
          [email],
        );
        assert.equal(rows.rowCount, 1);
        assert.equal(rows.rows[0].state, "pending");
        assert.ok(!rows.rows[0].encrypted_payload.includes(email));
        assert.ok(!rows.rows[0].encrypted_payload.includes("token="));
        assert.equal(
          (await client.request("/sign-in/email", { email, password })).status,
          403,
        );
        await assert.rejects(service.identity(client.headers()));
        const execute = createCommandExecutor({
          pool: web,
          resolveIdentity: async () => {
            const user = (
              await admin.query('SELECT id FROM public."user" WHERE email=$1', [
                email,
              ])
            ).rows[0];
            const principal = (
              await admin.query(
                "SELECT id FROM app.principals WHERE auth_user_id=$1",
                [user.id],
              )
            ).rows[0];
            return { principalId: principal.id };
          },
        });
        await assert.rejects(
          execute(provisionTenant, {
            scope: { kind: "principal" },
            operationKey: randomUUID(),
            correlationId: randomUUID(),
            payload: {
              expectedVersion: 0,
              shopName: "Blocked",
              locationName: "Main",
            },
          }),
          (error) => error.category === "access",
        );
      },
    );
    let verification;
    await t.test(
      "Mailpit captures SMTP; verification is single-use and login restores a database session",
      async () => {
        verification = await verify(email, client);
        assert.equal(
          (await service.handle(new Request(verification))).status,
          400,
        );
        const identity = await service.identity(client.headers());
        assert.equal(identity.user.emailVerified, true);
        const count = await admin.query(
          "SELECT * FROM app.ensure_principal($1)",
          [identity.user.id],
        );
        assert.equal(count.rowCount, 1);
        assert.equal(count.rows[0].id, identity.principalId);
        await admin.query(
          "UPDATE app.principals SET active=false WHERE id=$1",
          [identity.principalId],
        );
        await assert.rejects(service.identity(client.headers()));
        await admin.query("UPDATE app.principals SET active=true WHERE id=$1", [
          identity.principalId,
        ]);
      },
    );
    await t.test(
      "logout, revocation, and password changes invalidate subsequent protected requests",
      async () => {
        const old = client.headers();
        assert.equal((await client.request("/sign-out", {})).status, 200);
        await assert.rejects(service.identity(old));
        await client.request("/sign-in/email", { email, password });
        const current = await service.identity(client.headers());
        assert.equal(
          (
            await client.request("/revoke-session", {
              token: current.session.token,
            })
          ).status,
          200,
        );
        await assert.rejects(service.identity(client.headers()));
        await client.request("/sign-in/email", { email, password });
        const second = browser(service);
        await second.request("/sign-in/email", { email, password });
        const changed = await client.request("/change-password", {
          currentPassword: password,
          newPassword: "Changed testing password 2026!",
          revokeOtherSessions: false,
        });
        assert.equal(changed.status, 200);
        await assert.rejects(service.identity(client.headers()));
        await assert.rejects(service.identity(second.headers()));
        assert.equal(
          (
            await client.request("/sign-in/email", {
              email,
              password: "Changed testing password 2026!",
            })
          ).status,
          200,
        );
      },
    );
    await t.test(
      "password recovery uses Mailpit, consumes its token once, and revokes every session",
      async () => {
        const before = client.headers();
        assert.equal(
          (
            await client.request("/request-password-reset", {
              email,
              redirectTo: "/account/reset",
            })
          ).status,
          200,
        );
        await drain();
        const link = await message(email, "Reset"),
          token = new URL(link).pathname.split("/").at(-1);
        const reset = await client.request("/reset-password", {
          token,
          newPassword: "Recovered testing password 2026!",
        });
        assert.equal(reset.status, 200);
        await assert.rejects(service.identity(before));
        assert.equal(
          (
            await client.request("/reset-password", {
              token,
              newPassword: "Another testing password 2026!",
            })
          ).status,
          400,
        );
        assert.equal(
          (
            await client.request("/sign-in/email", {
              email,
              password: "Recovered testing password 2026!",
            })
          ).status,
          200,
        );
      },
    );
    await t.test(
      "operator access requires a real recent challenge; backup codes are single-use",
      async () => {
        const email = `operator-${randomUUID()}@example.test`,
          operator = await register(email);
        await verify(email, operator);
        const identity = await service.identity(operator.headers());
        await admin.query(
          "INSERT INTO app.operator_grants VALUES($1,'operator.access')",
          [identity.principalId],
        );
        await assert.rejects(
          service.requireOperator(operator.headers(), "operator.access"),
        );
        const enabled = await operator.request("/two-factor/enable", {
          password,
          issuer: "Fitloom",
        });
        assert.equal(enabled.status, 200);
        const enrollment = await enabled.json();
        assert.ok(enrollment.totpURI);
        assert.ok(enrollment.backupCodes.length);
        await assert.rejects(
          service.requireOperator(operator.headers(), "operator.access"),
        );
        const verified = await operator.request("/two-factor/verify-totp", {
          code: totp(enrollment.totpURI),
        });
        assert.equal(verified.status, 200);
        await service.requireOperator(operator.headers(), "operator.access");
        const proofSession = (await service.identity(operator.headers()))
          .session.id;
        await admin.query(
          "INSERT INTO app.operator_grants VALUES($1,'jobs.manage')",
          [identity.principalId],
        );
        await service.requireOperator(operator.headers(), "jobs.manage");
        const serviceJob = randomUUID();
        await admin.query(
          "INSERT INTO app.foundation_jobs(id,kind,authority,source_id,source_key,input_version,payload,status) VALUES($1,'files.cleanup','service',$1,$2,1,'{}','failed')",
          [serviceJob, `operator-test:${serviceJob}`],
        );
        const retryInput = {
          action: "job.retry",
          jobId: serviceJob,
          reason: "Retry synthetic cleanup failure",
          operationKey: randomUUID(),
          correlationId: randomUUID(),
        };
        const retried = await service.operatorCommand(
          operator.headers(),
          retryInput,
        );
        const replayed = await service.operatorCommand(
          operator.headers(),
          retryInput,
        );
        assert.equal(replayed.replayed, true);
        assert.equal(retried.operationId, replayed.operationId);
        await assert.rejects(
          service.operatorCommand(operator.headers(), {
            ...retryInput,
            reason: "Changed retry reason",
          }),
          (e) => e.category === "conflict",
        );
        assert.equal(
          (
            await admin.query(
              "SELECT status FROM app.foundation_jobs WHERE id=$1",
              [serviceJob],
            )
          ).rows[0].status,
          "pending",
        );
        assert.equal(
          (
            await admin.query(
              "SELECT count(*)::int AS n FROM app.foundation_operator_audit WHERE job_id=$1",
              [serviceJob],
            )
          ).rows[0].n,
          1,
        );
        await service.operatorCommand(operator.headers(), {
          action: "job.cancel",
          jobId: serviceJob,
          reason: "Cancel synthetic cleanup fixture",
          operationKey: randomUUID(),
          correlationId: randomUUID(),
        });
        await admin.query(
          "DELETE FROM app.operator_grants WHERE principal_id=$1",
          [identity.principalId],
        );
        await assert.rejects(
          service.requireOperator(operator.headers(), "operator.access"),
        );
        await admin.query(
          "INSERT INTO app.operator_grants VALUES($1,'operator.access')",
          [identity.principalId],
        );
        assert.ok(
          (
            await admin.query(
              "SELECT * FROM app.operator_challenges WHERE session_id=$1",
              [proofSession],
            )
          ).rowCount === 1,
        );

        assert.equal(
          (await operator.request("/two-factor/disable", { password })).status,
          403,
        );
        assert.equal(
          (
            await operator.request("/two-factor/verify-totp", {
              code: totp(enrollment.totpURI),
              trustDevice: true,
            })
          ).status,
          400,
        );
        await admin.query(
          "UPDATE app.operator_challenges SET verified_at=now()-interval '6 minutes' WHERE session_id=$1",
          [(await service.identity(operator.headers())).session.id],
        );
        await assert.rejects(
          service.requireOperator(operator.headers(), "operator.access"),
        );
        await assert.rejects(
          authPool.query("SELECT app.foundation_operator($1,$2)", [
            identity.user.id,
            proofSession,
          ]),
          (e) => e.code === "42501",
        );
        await operator.request("/sign-out", {});
        const challenged = await operator.request("/sign-in/email", {
          email,
          password,
        });
        assert.equal(challenged.status, 200);
        assert.equal((await challenged.json()).twoFactorRedirect, true);
        await assert.rejects(service.identity(operator.headers()));
        assert.equal(
          (
            await operator.request("/two-factor/verify-totp", {
              code: "invalid",
            })
          ).status,
          401,
        );
        assert.equal(
          (
            await operator.request("/two-factor/verify-backup-code", {
              code: enrollment.backupCodes[0],
            })
          ).status,
          200,
        );
        await service.requireOperator(operator.headers(), "operator.access");
        await operator.request("/sign-out", {});
        await operator.request("/sign-in/email", { email, password });
        assert.equal(
          (
            await operator.request("/two-factor/verify-backup-code", {
              code: enrollment.backupCodes[0],
            })
          ).status,
          401,
        );
      },
    );
    await t.test(
      "resend works and expired verification/reset links fail",
      async () => {
        const email = `expiry-${randomUUID()}@example.test`,
          pending = await register(email);
        assert.equal(
          (
            await pending.request("/send-verification-email", {
              email,
              callbackURL: "/account",
            })
          ).status,
          200,
        );
        await drain();
        const link = await message(email, "Verify");
        const payload = Buffer.from(
          JSON.stringify({
            email,
            iat: Math.floor(Date.now() / 1000) - 7200,
            exp: Math.floor(Date.now() / 1000) - 3600,
          }),
        ).toString("base64url");
        const header = Buffer.from(
          JSON.stringify({ alg: "HS256", typ: "JWT" }),
        ).toString("base64url");
        const token = `${header}.${payload}.${createHmac("sha256", secret).update(`${header}.${payload}`).digest("base64url")}`;
        await admin.query(
          "UPDATE app.auth_mail SET token_hash=$1 WHERE token_hash=$2",
          [
            createHash("sha256").update(token).digest("hex"),
            createHash("sha256")
              .update(new URL(link).searchParams.get("token"))
              .digest("hex"),
          ],
        );
        const expired = await service.handle(
          new Request(`${baseURL}/api/auth/verify-email?token=${token}`),
        );
        assert.equal(expired.status, 401);
        assert.equal(
          (
            await admin.query(
              'SELECT email_verified FROM public."user" WHERE email=$1',
              [email],
            )
          ).rows[0].email_verified,
          false,
        );
        await client.request("/request-password-reset", {
          email: (await service.identity(client.headers())).user.email,
          redirectTo: "/account/reset",
        });
        await drain();
        const resetLink = await message(
            (await service.identity(client.headers())).user.email,
            "Reset",
          ),
          resetToken = new URL(resetLink).pathname.split("/").at(-1);
        await admin.query(
          "UPDATE public.verification SET expires_at=now()-interval '1 second' WHERE identifier=$1",
          [`reset-password:${resetToken}`],
        );
        assert.equal(
          (
            await client.request("/reset-password", {
              token: resetToken,
              newPassword: "Expired token password 2026!",
            })
          ).status,
          400,
        );
      },
    );
    await t.test(
      "concurrent backup challenges consume a code only once",
      async () => {
        const email = `backup-${randomUUID()}@example.test`,
          enroller = await register(email);
        await verify(email, enroller);
        const enabled = await enroller.request("/two-factor/enable", {
          password,
        });
        const enrollment = await enabled.json();
        assert.equal(
          (
            await enroller.request("/two-factor/verify-totp", {
              code: totp(enrollment.totpURI),
            })
          ).status,
          200,
        );
        const first = browser(service),
          second = browser(service);
        await first.request("/sign-in/email", { email, password });
        await second.request("/sign-in/email", { email, password });
        const results = await Promise.all(
          [first, second].map((browser) =>
            browser.request("/two-factor/verify-backup-code", {
              code: enrollment.backupCodes[0],
            }),
          ),
        );
        assert.equal(results.filter((r) => r.status === 200).length, 1);
        assert.equal(
          results.filter((r) => [401, 409].includes(r.status)).length,
          1,
          JSON.stringify(results.map((r) => r.status)),
        );
      },
    );
    await t.test(
      "MFA failures lock the account across fresh challenges",
      async () => {
        const email = `locked-${randomUUID()}@example.test`,
          account = await register(email);
        await verify(email, account);
        const enabled = await account.request("/two-factor/enable", {
          password,
        });
        const enrollment = await enabled.json();
        assert.equal(
          (
            await account.request("/two-factor/verify-totp", {
              code: totp(enrollment.totpURI),
            })
          ).status,
          200,
        );
        await account.request("/sign-out", {});
        await account.request("/sign-in/email", { email, password });
        for (let i = 0; i < 5; i++)
          assert.equal(
            (
              await account.request("/two-factor/verify-totp", {
                code: "invalid",
              })
            ).status,
            401,
          );
        const fresh = browser(service);
        await fresh.request("/sign-in/email", { email, password });
        assert.equal(
          (
            await fresh.request("/two-factor/verify-totp", {
              code: totp(enrollment.totpURI),
            })
          ).status,
          429,
        );
        await assert.rejects(service.identity(fresh.headers()));
      },
    );
    await t.test(
      "step-up MFA ignores arbitrary email fields and unrelated cookies for admission",
      async () => {
        const email = `step-up-${randomUUID()}@example.test`,
          account = await register(email);
        await verify(email, account);
        const enrollment = await (
          await account.request("/two-factor/enable", { password })
        ).json();
        assert.equal(
          (
            await account.request("/two-factor/verify-totp", {
              code: totp(enrollment.totpURI),
            })
          ).status,
          200,
        );
        await admin.query(
          "UPDATE app.auth_admission SET window_started_at=now()-interval '61 seconds'; UPDATE public.rate_limit SET last_request=last_request-61000",
        );
        const cookie = account.headers().get("cookie");
        for (let i = 0; i < 5; i++) {
          assert.equal(
            (
              await account.request(
                "/two-factor/verify-totp",
                { code: "invalid", email: `rotated-${i}@example.test` },
                { headers: { cookie: `${cookie}; unrelated=${i}` } },
              )
            ).status,
            401,
          );
        }
        assert.equal(
          (
            await account.request(
              "/two-factor/verify-totp",
              { code: totp(enrollment.totpURI), email: "another@example.test" },
              { headers: { cookie: `${cookie}; unrelated=last` } },
            )
          ).status,
          429,
        );
        // Account lock remains after the short admission window expires and across process instances.
        await admin.query(
          "UPDATE app.auth_admission SET window_started_at=now()-interval '61 seconds'; UPDATE public.rate_limit SET last_request=last_request-61000",
        );
        const restarted = createIdentityService({ pool: authPool, config });
        assert.equal(
          (
            await browser(restarted).request(
              "/two-factor/verify-totp",
              { code: totp(enrollment.totpURI) },
              { headers: { cookie } },
            )
          ).status,
          429,
        );
      },
    );
    await t.test(
      "persistent admission rejects repeat recovery requests despite spoofed forwarded addresses",
      async () => {
        const email = `unknown-${randomUUID()}@example.test`,
          limited = browser(service);
        for (let i = 0; i < 5; i++)
          assert.equal(
            (
              await limited.request(
                "/request-password-reset",
                { email },
                { headers: { "x-forwarded-for": `10.0.0.${i}` } },
              )
            ).status,
            200,
          );
        const restarted = createIdentityService({ pool: authPool, config });
        assert.equal(
          (
            await browser(restarted).request(
              "/request-password-reset",
              { email },
              { headers: { "x-forwarded-for": "10.1.2.3" } },
            )
          ).status,
          429,
        );
        assert.ok(
          (await admin.query("SELECT * FROM app.auth_admission")).rowCount > 0,
        );
        assert.equal(
          (
            await client.request(
              "/sign-in/email",
              { email, password },
              { origin: "https://untrusted.invalid" },
            )
          ).status,
          403,
        );
        assert.equal(
          (
            await client.request("/request-password-reset", {
              email,
              redirectTo: "https://untrusted.invalid/account",
            })
          ).status,
          400,
        );
      },
    );
    await t.test(
      "SMTP failure persists safe attempts; retries, terminal failure, and expiry remain visible",
      async () => {
        await register(`smtp-${randomUUID()}@example.test`);
        const broken = createMailTransport({
          provider: "mailpit",
          host: "127.0.0.1",
          port: 1,
          from: "fitloom@example.test",
        });
        try {
          assert.equal(
            await deliverAuthMail({
              pool: worker,
              secret: mailKey,
              transport: broken,
            }),
            true,
          );
          const failed = (
            await admin.query(
              "SELECT * FROM app.auth_mail WHERE last_error='smtp_unavailable' ORDER BY created_at DESC LIMIT 1",
            )
          ).rows[0];
          assert.equal(failed.state, "pending");
          assert.equal(failed.attempts, 1);
          await admin.query(
            "UPDATE app.auth_mail SET next_attempt_at=now() WHERE id=$1",
            [failed.id],
          );
          await drain();
          assert.equal(
            (
              await admin.query("SELECT state FROM app.auth_mail WHERE id=$1", [
                failed.id,
              ])
            ).rows[0].state,
            "sent",
          );
          await register(`terminal-${randomUUID()}@example.test`);
          const target = (
            await admin.query(
              "SELECT id FROM app.auth_mail WHERE state='pending' ORDER BY created_at DESC LIMIT 1",
            )
          ).rows[0].id;
          for (let i = 0; i < 5; i++) {
            await admin.query(
              "UPDATE app.auth_mail SET next_attempt_at=now() WHERE id=$1",
              [target],
            );
            await deliverAuthMail({
              pool: worker,
              secret: mailKey,
              transport: broken,
            });
          }
          const terminal = (
            await admin.query(
              "SELECT state,encrypted_payload FROM app.auth_mail WHERE id=$1",
              [target],
            )
          ).rows[0];
          assert.equal(terminal.state, "failed");
          assert.equal(terminal.encrypted_payload, null);
          await register(`expired-${randomUUID()}@example.test`);
          await admin.query(
            "UPDATE app.auth_mail SET expires_at=now()-interval '1 second' WHERE state='pending'",
          );
          await drain();
          assert.ok(
            (
              await admin.query(
                "SELECT * FROM app.auth_mail WHERE state='expired' AND encrypted_payload IS NULL",
              )
            ).rowCount > 0,
          );
        } finally {
          broken.close();
        }
      },
    );
    await t.test(
      "auth/token and email intent roll back together when persistence fails",
      async () => {
        await admin.query(
          "CREATE FUNCTION app.test_mail_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected email persistence failure'; END $$; CREATE TRIGGER test_mail_failure BEFORE INSERT ON app.auth_mail FOR EACH ROW EXECUTE FUNCTION app.test_mail_failure()",
        );
        const email = `atomic-${randomUUID()}@example.test`;
        try {
          assert.equal(
            (
              await browser(service).request("/sign-up/email", {
                email,
                password,
                name: "Atomic fixture",
              })
            ).status,
            503,
          );
          assert.equal(
            (
              await admin.query('SELECT * FROM public."user" WHERE email=$1', [
                email,
              ])
            ).rowCount,
            0,
          );
          const current = await service.identity(client.headers());
          const before = (
            await admin.query(
              "SELECT count(*)::int AS count FROM public.verification WHERE value=$1",
              [current.user.id],
            )
          ).rows[0].count;
          assert.equal(
            (
              await client.request("/request-password-reset", {
                email: current.user.email,
              })
            ).status,
            503,
          );
          assert.equal(
            (
              await admin.query(
                "SELECT count(*)::int AS count FROM public.verification WHERE value=$1",
                [current.user.id],
              )
            ).rows[0].count,
            before,
          );
        } finally {
          await admin.query(
            "DROP TRIGGER test_mail_failure ON app.auth_mail; DROP FUNCTION app.test_mail_failure()",
          );
        }
      },
    );
    await t.test(
      "SMTP acceptance with lost database settlement remains uncertain and recoverable",
      async () => {
        await drain();
        const email = `uncertain-${randomUUID()}@example.test`,
          client = await register(email);
        await verify(email, client);
        assert.equal(
          (
            await client.request("/request-password-reset", {
              email,
              redirectTo: `${baseURL}/account/reset`,
            })
          ).status,
          200,
        );
        const identity = await service.identity(client.headers());
        const mail = (
          await admin.query(
            "SELECT id FROM app.auth_mail WHERE user_id=$1 AND kind='recovery' AND state='pending' ORDER BY created_at DESC LIMIT 1",
            [identity.user.id],
          )
        ).rows[0];
        assert.ok(mail);
        await admin.query(
          "CREATE FUNCTION app.test_smtp_settlement() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.state='sent' THEN RAISE EXCEPTION 'injected settlement failure';END IF;RETURN NEW;END $$;CREATE TRIGGER test_smtp_settlement BEFORE UPDATE ON app.auth_mail FOR EACH ROW EXECUTE FUNCTION app.test_smtp_settlement()",
        );
        const events = [];
        try {
          await assert.rejects(
            deliverAuthMail({
              pool: worker,
              secret: mailKey,
              transport,
              observe: (event) => events.push(event),
            }),
            /settlement unavailable/,
          );
        } finally {
          await admin.query(
            "DROP TRIGGER test_smtp_settlement ON app.auth_mail;DROP FUNCTION app.test_smtp_settlement()",
          );
        }
        assert.equal(events[0].outcome, "smtp_accepted_settlement_unknown");
        assert.equal(
          (
            await admin.query("SELECT state FROM app.auth_mail WHERE id=$1", [
              mail.id,
            ])
          ).rows[0].state,
          "running",
        );
        await message(email, "Reset");
        await admin.query(
          "UPDATE app.auth_mail SET locked_at=now()-interval '3 minutes' WHERE id=$1",
          [mail.id],
        );
        await deliverAuthMail({
          pool: worker,
          secret: mailKey,
          transport,
          observe: (event) => events.push(event),
        });
        const done = (
          await admin.query(
            "SELECT state,attempts FROM app.auth_mail WHERE id=$1",
            [mail.id],
          )
        ).rows[0];
        assert.equal(done.state, "sent");
        assert.equal(done.attempts, 2);
        assert.equal(events[1].outcome, "smtp_accepted");
        assert.ok(!JSON.stringify(events).includes(email));
        assert.ok(!JSON.stringify(events).includes(mailKey));
      },
    );
    await t.test(
      "operator bootstrap, durable lifecycle commands, supported owner recovery, and restricted MFA recovery",
      async () => {
        const operatorEmail = `day6-operator-${randomUUID()}@example.test`,
          operator = await register(operatorEmail);
        await verify(operatorEmail, operator);
        const opIdentity = await service.identity(operator.headers());
        await assert.rejects(
          authPool.query("SELECT app.bootstrap_operator($1,$2,$3)", [
            operatorEmail,
            "Bootstrap fixture",
            "test:verified",
          ]),
          (e) => e.code === "42501",
        );
        await admin.query("SELECT app.bootstrap_operator($1,$2,$3)", [
          operatorEmail,
          "Bootstrap verified fixture operator",
          "test:verified",
        ]);
        const repeat = spawnSync(
          process.execPath,
          [
            new URL("../../../scripts/operator-admin.mjs", import.meta.url)
              .pathname,
            "bootstrap",
            "--email",
            operatorEmail,
            "--reason",
            "Repeat bootstrap",
            "--evidence",
            "test:verified",
          ],
          {
            env: {
              ...process.env,
              MIGRATOR_DATABASE_URL: process.env.TEST_MIGRATOR_DATABASE_URL,
            },
            encoding: "utf8",
          },
        );
        assert.equal(
          repeat.status,
          0,
          "Restricted bootstrap CLI succeeds with isolated migration credentials",
        );
        assert.equal(
          (
            await admin.query(
              "SELECT count(*)::int AS n FROM app.operator_admin_audit WHERE principal_id=$1 AND action='bootstrap'",
              [opIdentity.principalId],
            )
          ).rows[0].n,
          1,
        );
        await assert.rejects(
          service.operatorTenants(operator.headers(), ""),
          (e) => e.category === "access",
        );
        const enrollment = await (
          await operator.request("/two-factor/enable", {
            password,
            issuer: "Fitloom",
          })
        ).json();
        assert.equal(
          (
            await operator.request("/two-factor/verify-totp", {
              code: totp(enrollment.totpURI),
            })
          ).status,
          200,
        );
        const ownerEmail = `day6-owner-${randomUUID()}@example.test`,
          owner = await register(ownerEmail);
        await verify(ownerEmail, owner);
        const ownerIdentity = await service.identity(owner.headers());
        const workspaces = createWorkspaceService({
          pool: web,
          resolveIdentity: async () => ({
            principalId: (await service.identity(owner.headers())).principalId,
          }),
        });
        const profile = {
          shopName: "Operator recovery fixture",
          locationName: "Main",
          businessMode: "tailoring",
          ownerName: "Recovery owner",
          ownerPhone: "+919876543210",
          address: "Fixture address",
          timezone: "Asia/Kolkata",
          consentAccepted: true,
          consentVersion: "workspace-authority-v1",
        };
        const command = (payload) => ({
          scope: { kind: "principal" },
          operationKey: randomUUID(),
          correlationId: randomUUID(),
          payload,
        });
        await workspaces.execute(
          saveSetupDraft,
          command({ ...profile, expectedVersion: 0 }),
        );
        const tenant = (
          await workspaces.execute(
            provisionTenant,
            command({ ...profile, expectedVersion: 1 }),
          )
        ).result.tenantId;
        const selected = (await workspaces.choices())[0];
        const target = {
          tenantId: selected.tenantId,
          locationId: selected.locationId,
        };
        const execute = (action, extra = {}, key = randomUUID()) =>
          service.operatorCommand(operator.headers(), {
            action,
            tenantId: tenant,
            ...extra,
            reason: "Synthetic operator lifecycle verification",
            operationKey: key,
            correlationId: randomUUID(),
          });
        await assert.rejects(
          service.operatorCommand(owner.headers(), {
            action: "tenant.suspend",
            tenantId: tenant,
            reason: "Denied",
            operationKey: randomUUID(),
            correlationId: randomUUID(),
          }),
          (e) => e.category === "access",
        );
        await assert.rejects(
          service.operationalStatus(owner.headers()),
          (e) => e.category === "access",
        );
        await admin.query("DELETE FROM app.worker_observations");
        const unknown = await service.operationalStatus(operator.headers());
        assert.equal(unknown.database.state, "available");
        assert.equal(unknown.worker.state, "unknown");
        assert.equal(unknown.worker.lastSeenAt, null);
        assert.equal(unknown.backups.state, "unknown");
        await worker.query("SELECT app.worker_observed($1)", [randomUUID()]);
        assert.equal(
          (await service.operationalStatus(operator.headers())).worker.state,
          "observed",
        );
        await admin.query(
          "UPDATE app.worker_observations SET observed_at=now()-interval '40 seconds'",
        );
        assert.equal(
          (await service.operationalStatus(operator.headers())).worker.state,
          "stale",
        );
        const failedStatusJob = randomUUID();
        await admin.query(
          "INSERT INTO app.foundation_jobs(id,kind,authority,source_id,source_key,input_version,payload,status) VALUES($1,'unknown.status','service',$1,$2,1,'{}','failed')",
          [failedStatusJob, `status:${failedStatusJob}`],
        );
        const degraded = await service.operationalStatus(operator.headers());
        assert.ok(degraded.queues.foundation.failed >= 1);
        assert.equal(degraded.worker.state, "stale");
        assert.ok(!JSON.stringify(degraded).includes(ownerEmail));
        await assert.rejects(
          web.query("SELECT app.foundation_status($1,$2)", [
            opIdentity.user.id,
            opIdentity.session.id,
          ]),
          (e) => e.code === "42501",
        );
        await assert.rejects(
          worker.query("SELECT * FROM app.worker_observations"),
          (e) => e.code === "42501",
        );
        await worker.query("SELECT app.worker_observed($1)", [randomUUID()]);
        const found = await service.operatorTenants(operator.headers(), tenant);
        assert.equal(found[0].active, true);
        assert.equal(found[0].owners[0].principalId, ownerIdentity.principalId);
        assert.equal("email" in found[0], false);
        const key = randomUUID();
        const results = await Promise.all([
          execute("tenant.suspend", {}, key),
          execute("tenant.suspend", {}, key),
        ]);
        assert.equal(results[0].operationId, results[1].operationId);
        await assert.rejects(
          workspaces.view(target),
          (e) => e.category === "access",
        );
        await execute("tenant.restore");
        await workspaces.view(target);
        await execute("sessions.revoke", {
          principalId: ownerIdentity.principalId,
        });
        await assert.rejects(service.identity(owner.headers()));
        assert.equal(
          (
            await owner.request("/sign-in/email", {
              email: ownerEmail,
              password,
            })
          ).status,
          200,
        );
        const recoveryKey = randomUUID();
        const before = (
          await admin.query(
            "SELECT count(*)::int AS n FROM app.auth_mail WHERE user_id=$1 AND kind='recovery'",
            [ownerIdentity.user.id],
          )
        ).rows[0].n;
        const recovered = await execute(
          "owner.recover",
          { principalId: ownerIdentity.principalId },
          recoveryKey,
        );
        await execute(
          "owner.recover",
          { principalId: ownerIdentity.principalId },
          recoveryKey,
        );
        assert.deepEqual(recovered.result, { accepted: true });
        assert.ok(!JSON.stringify(recovered).includes(ownerEmail));
        assert.equal(
          (
            await admin.query(
              "SELECT count(*)::int AS n FROM app.auth_mail WHERE user_id=$1 AND kind='recovery'",
              [ownerIdentity.user.id],
            )
          ).rows[0].n,
          before + 1,
        );
        await drain();
        const link = await message(ownerEmail, "Reset");
        const token = new URL(link).pathname.split("/").at(-1);
        assert.equal(
          (
            await owner.request("/reset-password", {
              token,
              newPassword: "Recovered owner password 2026!",
            })
          ).status,
          200,
        );
        await assert.rejects(service.identity(owner.headers()));
        assert.equal(
          (
            await owner.request("/sign-in/email", {
              email: ownerEmail,
              password: "Recovered owner password 2026!",
            })
          ).status,
          200,
        );
        // Failed mail persistence must roll back the operator result and audit as well.
        await admin.query(
          "CREATE FUNCTION app.test_operator_mail_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected';END $$;CREATE TRIGGER test_operator_mail_failure BEFORE INSERT ON app.auth_mail FOR EACH ROW EXECUTE FUNCTION app.test_operator_mail_failure()",
        );
        const failedKey = randomUUID();
        try {
          await assert.rejects(
            execute(
              "owner.recover",
              { principalId: ownerIdentity.principalId },
              failedKey,
            ),
          );
          assert.equal(
            (
              await admin.query(
                "SELECT id FROM app.operator_operations WHERE operation_key=$1",
                [failedKey],
              )
            ).rowCount,
            0,
          );
        } finally {
          await admin.query(
            "DROP TRIGGER test_operator_mail_failure ON app.auth_mail;DROP FUNCTION app.test_operator_mail_failure()",
          );
        }
        await execute(
          "owner.recover",
          { principalId: ownerIdentity.principalId },
          failedKey,
        );
        assert.ok(
          observations.some(
            (event) =>
              event.event === "operator_finished" &&
              event.outcome === "replayed",
          ),
        );
        assert.ok(!JSON.stringify(observations).includes(ownerEmail));
        assert.ok(!JSON.stringify(observations).includes(password));
        assert.ok(!JSON.stringify(observations).includes(secret));
        const session = (await service.identity(operator.headers())).session.id;
        await admin.query(
          "UPDATE app.operator_challenges SET verified_at=now()-interval '6 minutes' WHERE session_id=$1",
          [session],
        );
        await assert.rejects(
          execute("tenant.restore"),
          (e) => e.category === "access",
        );
        await assert.rejects(
          authPool.query("SELECT app.recover_operator_mfa($1,$2,$3)", [
            operatorEmail,
            "Denied runtime recovery",
            "test:verified",
          ]),
          (e) => e.code === "42501",
        );
        const recovery = spawnSync(
          process.execPath,
          [
            new URL("../../../scripts/operator-admin.mjs", import.meta.url)
              .pathname,
            "recover-mfa",
            "--email",
            operatorEmail,
            "--reason",
            "Lost authenticator verified out of band",
            "--evidence",
            "test:verified",
          ],
          {
            env: {
              ...process.env,
              MIGRATOR_DATABASE_URL: process.env.TEST_MIGRATOR_DATABASE_URL,
            },
            encoding: "utf8",
          },
        );
        assert.equal(
          recovery.status,
          0,
          "Restricted MFA recovery CLI revokes old sessions",
        );
        await assert.rejects(service.identity(operator.headers()));
        assert.equal(
          (
            await operator.request("/sign-in/email", {
              email: operatorEmail,
              password,
            })
          ).status,
          200,
        );
        await assert.rejects(
          service.operatorTenants(operator.headers(), ""),
          (e) => e.category === "access",
        );
        const replacement = await (
          await operator.request("/two-factor/enable", {
            password,
            issuer: "Fitloom",
          })
        ).json();
        assert.equal(
          (
            await operator.request("/two-factor/verify-totp", {
              code: totp(replacement.totpURI),
            })
          ).status,
          200,
        );
        assert.ok(
          (await service.operatorTenants(operator.headers(), tenant)).length ===
            1,
        );
      },
    );
  } finally {
    transport.close();
    await Promise.all([web.end(), authPool.end(), worker.end()]);
    await admin.end();
  }
});
