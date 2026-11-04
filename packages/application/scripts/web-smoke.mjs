import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHmac, randomUUID } from "node:crypto";
import { once } from "node:events";
import { createRequire } from "node:module";
import { createPool } from "@fitloom/db";
import sharp from "sharp";
import { signFixture } from "../dist/index.js";
import { totp } from "../test/auth-helpers.mjs";
import { customerHttpChecks } from "./customer-http-checks.mjs";
import { domainImportHttpChecks } from "./domain-import-http-checks.mjs";
import { masterHttpChecks } from "./master-http-checks.mjs";
import { masterUiChecks } from "./master-ui-checks.mjs";
import { measurementHttpChecks } from "./measurement-http-checks.mjs";
import { workspaceHomeHttpChecks } from "./workspace-home-http-checks.mjs";

const root = new URL("../../../", import.meta.url),
  base = "http://localhost:24411";
for (const name of ["AUTH", "WEB", "WORKER", "MIGRATOR"]) {
  const target = new URL(process.env[`TEST_${name}_DATABASE_URL`]);
  if (
    target.pathname !== "/fitloom_test" ||
    !["127.0.0.1", "postgres"].includes(target.hostname) ||
    target.username !== `fitloom_test_${name.toLowerCase()}`
  )
    throw new Error("Expected isolated local test credentials");
}
const admin = createPool({
  connectionString: process.env.TEST_MIGRATOR_DATABASE_URL,
  purpose: "auth",
  max: 1,
});
await admin.query("SET lock_timeout='20s'");
await admin.query("SELECT pg_advisory_lock(68122902)");
const next = createRequire(new URL("apps/web/package.json", root)).resolve(
  "next/dist/bin/next",
);
const fixtureSecret = createHmac("sha256", process.env.TEST_AUTH_SECRET)
  .update("http-smoke-fixture-key")
  .digest("hex");
const shared = {
  PATH: process.env.PATH,
  NODE_ENV: "production",
  FITLOOM_ENV: "test",
  MAIL_PROVIDER: "mailpit",
  MAIL_ENCRYPTION_KEY: process.env.TEST_MAIL_ENCRYPTION_KEY,
};
const webEnvironment = {
  ...shared,
  AUTH_DATABASE_URL: process.env.TEST_AUTH_DATABASE_URL,
  WEB_DATABASE_URL: process.env.TEST_WEB_DATABASE_URL,
  STORAGE_ENDPOINT: process.env.TEST_STORAGE_ENDPOINT,
  STORAGE_BUCKET: process.env.TEST_STORAGE_BUCKET,
  STORAGE_ACCESS_KEY: process.env.TEST_STORAGE_ACCESS_KEY,
  STORAGE_SECRET_KEY: process.env.TEST_STORAGE_SECRET_KEY,
  AUTH_SECRET: process.env.TEST_AUTH_SECRET,
  AUTH_BASE_URL: base,
  AUTH_TRUSTED_ORIGINS: base,
  FIXTURE_INBOX_ENABLED: "true",
  FIXTURE_INBOX_SECRET: fixtureSecret,
};
const web = spawn(
  process.execPath,
  [next, "start", "--port", "24411", "--hostname", "127.0.0.1"],
  {
    cwd: new URL("apps/web/", root),
    env: webEnvironment,
    stdio: ["ignore", "pipe", "pipe"],
  },
);
const startWorker = () =>
  spawn(
    process.execPath,
    [new URL("apps/worker/dist/index.js", root).pathname],
    {
      cwd: root,
      env: {
        ...shared,
        WORKER_DATABASE_URL: process.env.TEST_WORKER_DATABASE_URL,
        STORAGE_ENDPOINT: process.env.TEST_STORAGE_ENDPOINT,
        STORAGE_BUCKET: process.env.TEST_STORAGE_BUCKET,
        STORAGE_ACCESS_KEY: process.env.TEST_STORAGE_WORKER_ACCESS_KEY,
        STORAGE_SECRET_KEY: process.env.TEST_STORAGE_WORKER_SECRET_KEY,
        MAILPIT_HOST: process.env.TEST_MAILPIT_HOST ?? "127.0.0.1",
        MAILPIT_SMTP_PORT: "24423",
        MAIL_FROM: "fitloom@example.test",
        LOG_LEVEL: "error",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
let worker = startWorker();
// Inspect only the safe observer envelope; never retain or print raw server output.
const observedAdapters = new Set();
let observationBuffer = "";
web.stdout.on("data", (chunk) => {
  observationBuffer += chunk.toString();
  const lines = observationBuffer.split("\n");
  observationBuffer = lines.pop() ?? "";
  for (const line of lines) {
    let event;
    try {
      event = JSON.parse(line);
    } catch {
      continue;
    }
    if (
      ["command_finished", "command_failed"].includes(event.event) &&
      [
        "fitloom-customer-photos",
        "fitloom-measurement-photos",
        "fitloom-measurement-cards",
      ].includes(event.name)
    ) {
      const allowed = new Set([
        "level",
        "time",
        "pid",
        "hostname",
        "name",
        "msg",
        "event",
        "correlationId",
        "operationId",
        "jobId",
        "tenantId",
        "locationId",
        "kind",
        "attempt",
        "elapsedMs",
        "outcome",
        "errorCategory",
      ]);
      assert.ok(
        Object.keys(event).every((key) => allowed.has(key)),
        "Command observer emitted private or unexpected fields",
      );
      observedAdapters.add(event.name);
    }
  }
});
// Keep server output private: these checks report statuses without request/token details.
for (const child of [web, worker]) {
  child.stdout.resume();
  child.stderr.resume();
}
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
// Fresh worker startup includes database/queue initialization and durable work.
// Use one bounded observation policy for both restart scenarios.
async function waitForWorker(check, message) {
  const started = Date.now();
  while (Date.now() - started < 30000) {
    assert.ok(
      worker.exitCode === null && worker.signalCode === null,
      "Worker exited before recovery",
    );
    if (await check()) return Date.now() - started;
    await pause(200);
  }
  assert.fail(message);
}
async function failureServer(overrides, run) {
  const failureBase = "http://127.0.0.1:24412";
  const child = spawn(
    process.execPath,
    [next, "start", "--port", "24412", "--hostname", "127.0.0.1"],
    {
      cwd: new URL("apps/web/", root),
      env: { ...webEnvironment, ...overrides },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  child.stdout.resume();
  child.stderr.resume();
  try {
    let ready = false;
    for (let n = 0; n < 50; n++) {
      try {
        if ((await fetch(`${failureBase}/account`)).ok) {
          ready = true;
          break;
        }
      } catch {}
      await pause(200);
    }
    assert.ok(ready, "Failure-check server ready");
    await run(failureBase);
  } finally {
    child.kill("SIGTERM");
    await Promise.race([once(child, "exit"), pause(5000)]);
    if (child.exitCode === null && child.signalCode === null)
      child.kill("SIGKILL");
  }
}

try {
  let ready = false;
  for (let i = 0; i < 40; i++) {
    try {
      if ((await fetch(`${base}/account`)).ok) {
        ready = true;
        break;
      }
    } catch {
      /* Starting. */
    }
    await pause(200);
  }
  assert.ok(ready, "Next server became ready");
  const page = await (await fetch(`${base}/account`)).text();
  assert.ok(page.includes("Sign in to Fitloom"));
  assert.ok(page.includes('name="email"'));
  assert.ok(
    page.includes("Open Mailpit"),
    "Local account entry explains where verification mail is delivered",
  );
  // A signed receipt must survive an actual worker-process restart before processing.
  worker.kill("SIGTERM");
  await once(worker, "exit");
  const event = {
    eventId: randomUUID(),
    sourceId: randomUUID(),
    version: 1,
    state: "confirmed",
  };
  const raw = Buffer.from(JSON.stringify(event)),
    stamp = String(Math.floor(Date.now() / 1000));
  const providerPost = (signature) =>
    fetch(`${base}/api/providers/fixture-v1`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-fitloom-timestamp": stamp,
        "x-fitloom-signature": signature,
      },
      body: raw,
    });
  assert.equal((await providerPost(`v1=${"0".repeat(64)}`)).status, 401);
  const signature = signFixture(raw, stamp, fixtureSecret);
  const received = await providerPost(signature);
  assert.equal(received.status, 202);
  const receipt = (await received.json()).receiptId;
  assert.equal(
    (await (await providerPost(signature)).json()).receiptId,
    receipt,
  );
  assert.equal(
    (
      await admin.query("SELECT outcome FROM app.provider_inbox WHERE id=$1", [
        receipt,
      ])
    ).rows[0].outcome,
    null,
  );
  worker = startWorker();
  worker.stdout.resume();
  worker.stderr.resume();
  const receiptRecoveryMs = await waitForWorker(
    async () =>
      (
        await admin.query(
          "SELECT outcome FROM app.provider_inbox WHERE id=$1",
          [receipt],
        )
      ).rows[0].outcome === "applied",
    "Actual worker restart processes the durable receipt",
  );
  console.log(
    `Worker receipt recovered ${receiptRecoveryMs} ms after restart.`,
  );
  assert.equal(
    (
      await admin.query(
        "SELECT count(*)::int AS n FROM app.provider_fixture_effects WHERE source_id=$1",
        [event.sourceId],
      )
    ).rows[0].n,
    1,
  );
  assert.equal((await fetch(`${base}/api/operator/jobs`)).status, 403);
  const email = `web-smoke-${randomUUID()}@example.test`,
    password = "Web smoke testing password 2026!";
  const post = (path, body, cookie = "") =>
    fetch(`${base}/api/auth${path}`, {
      method: "POST",
      headers: { origin: base, "content-type": "application/json", cookie },
      body: JSON.stringify(body),
    });
  assert.equal(
    (
      await post("/sign-up/email", {
        email,
        password,
        name: "Web smoke",
        callbackURL: "/account?verified=1",
      })
    ).status,
    200,
  );
  assert.equal(
    (await post("/sign-in/email", { email, password })).status,
    403,
    "Unverified accounts must complete email verification",
  );
  let link;
  for (let i = 0; i < 40; i++) {
    const list = await (
      await fetch(
        `${process.env.TEST_MAILPIT_URL ?? "http://127.0.0.1:24422"}/api/v1/messages`,
      )
    ).json();
    const mail = list.messages.find((message) =>
      message.To.some((to) => to.Address === email),
    );
    if (mail) {
      const full = await (
        await fetch(
          `${process.env.TEST_MAILPIT_URL ?? "http://127.0.0.1:24422"}/api/v1/message/${mail.ID}`,
        )
      ).json();
      link = full.Text.match(/https?:\/\/[^\s]+/)[0];
      break;
    }
    await pause(250);
  }
  assert.ok(link, "Actual worker delivered mail to isolated Mailpit");
  const verificationResponse = await fetch(link, { redirect: "manual" });
  assert.equal(verificationResponse.status, 302);
  const verifiedPage = await (
    await fetch(new URL(verificationResponse.headers.get("location"), base))
  ).text();
  assert.ok(
    verifiedPage.includes("Email verified. Sign in to continue."),
    "Verification return explains the next step",
  );
  const signed = await post("/sign-in/email", { email, password });
  assert.equal(signed.status, 200);
  let cookie = signed.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");
  assert.ok(cookie.includes("session_token"));
  assert.ok(
    signed.headers
      .getSetCookie()
      .some((value) => /httponly/i.test(value) && /samesite=lax/i.test(value)),
  );
  const current = await fetch(`${base}/api/session`, { headers: { cookie } });
  assert.equal(current.status, 200);
  assert.equal((await current.json()).email, email);
  assert.equal(
    (await fetch(`${base}/api/operator/session`, { headers: { cookie } }))
      .status,
    403,
  );
  const resetPage = await (
    await fetch(`${base}/account/reset?token=smoke`, { headers: { cookie } })
  ).text();
  assert.ok(
    resetPage.includes("Choose a new password"),
    "Recovery form stays available with an existing session",
  );
  const api = (path, payload, key = randomUUID(), selectedCookie = cookie) =>
    fetch(`${base}${path}`, {
      method: "POST",
      headers: {
        origin: base,
        "content-type": "application/json",
        cookie: selectedCookie,
      },
      body: JSON.stringify({
        operationKey: key,
        correlationId: randomUUID(),
        payload,
      }),
    });
  assert.equal((await fetch(`${base}/api/setup`)).status, 403);
  const profile = {
    shopName: "HTTP fixture shop",
    locationName: "Main",
    businessMode: "mixed",
    ownerName: "HTTP owner",
    ownerPhone: "+919876543210",
    address: "HTTP fixture street",
    timezone: "Asia/Kolkata",
    consentAccepted: true,
    consentVersion: "workspace-authority-v1",
  };
  assert.equal(
    (await api("/api/setup", { ...profile, expectedVersion: 0 })).status,
    200,
  );
  const draft = await (
    await fetch(`${base}/api/setup`, { headers: { cookie } })
  ).json();
  assert.equal(draft.draft.shopName, profile.shopName);
  const operationKey = randomUUID();
  const provision = await api(
    "/api/setup/provision",
    { ...profile, expectedVersion: 1 },
    operationKey,
  );
  assert.equal(provision.status, 200);
  const tenant = (await provision.json()).result.tenantId;
  assert.equal(
    (
      await api(
        "/api/setup/provision",
        { ...profile, expectedVersion: 1 },
        operationKey,
      )
    ).status,
    200,
  );
  const choices = await (
    await fetch(`${base}/api/workspaces`, { headers: { cookie } })
  ).json();
  const choice = choices.find((row) => row.tenantId === tenant);
  assert.ok(choice);
  const workspacePath = `/api/workspaces/${tenant}/${choice.locationId}`;
  const view = await fetch(`${base}${workspacePath}`, { headers: { cookie } });
  assert.equal(view.status, 200);
  assert.ok(view.headers.get("cache-control").includes("no-store"));
  assert.equal((await view.json()).owner.email, email);
  await workspaceHomeHttpChecks({ base, workspacePath, cookie });
  const customers = await customerHttpChecks({
    base,
    workspacePath,
    api,
    cookie,
    admin,
  });
  await masterHttpChecks({ base, workspacePath, api, cookie, admin, tenant });
  const measurements = await measurementHttpChecks({
    base,
    workspacePath,
    api,
    cookie,
    admin,
    tenant,
  });
  await workspaceHomeHttpChecks({ base, workspacePath, cookie });
  if (process.env.MASTER_UI_CHECKS === "1")
    await masterUiChecks({
      base,
      workspacePath,
      api,
      cookie,
      admin,
      tenant,
      location: choice.locationId,
      customers,
      measurements,
      account: { email, password },
    });
  await domainImportHttpChecks({ base, workspacePath, cookie, admin, tenant });
  const settingsPage = await fetch(
    `${base}/workspaces/${tenant}/${choice.locationId}/settings/garments`,
    { headers: { cookie } },
  );
  assert.equal(settingsPage.status, 200);
  const catalogHtml = await settingsPage.text();
  assert.ok(catalogHtml.includes("Garments and services"));
  assert.ok(
    !catalogHtml.includes(email),
    "Catalog shell exposed private owner contact data",
  );
  const anonymousSettings = await fetch(
    `${base}/workspaces/${tenant}/${choice.locationId}/settings/garments`,
    { redirect: "manual" },
  );
  assert.equal(anonymousSettings.status, 307);
  assert.equal(anonymousSettings.headers.get("location"), "/account");
  const jobs = await fetch(`${base}${workspacePath}/jobs`, {
    headers: { cookie },
  });
  assert.equal(jobs.status, 200);
  assert.ok(jobs.headers.get("cache-control").includes("no-store"));
  assert.ok(Array.isArray(await jobs.json()));
  assert.ok(Number(jobs.headers.get("X-Total-Count")) >= 0);
  assert.equal(
    (
      await fetch(`${base}${workspacePath}/files?offset=-1`, {
        headers: { cookie },
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await fetch(`${base}/api/workspaces?offset=invalid`, {
        headers: { cookie },
      })
    ).status,
    400,
  );
  assert.equal(
    (await fetch(`${base}/api/operator/status`, { headers: { cookie } }))
      .status,
    403,
  );

  assert.equal(
    (await fetch(`${base}/api/operator/tenants`, { headers: { cookie } }))
      .status,
    403,
  );
  assert.equal(
    (
      await fetch(`${base}/api/operator/commands`, {
        method: "POST",
        headers: { origin: base, "content-type": "application/json", cookie },
        body: JSON.stringify({
          action: "tenant.suspend",
          tenantId: tenant,
          reason: "Denied HTTP fixture",
          operationKey: randomUUID(),
          correlationId: randomUUID(),
        }),
      })
    ).status,
    403,
  );
  const fileIntent = await api(`${workspacePath}/files`, {});
  assert.equal(fileIntent.status, 200);
  const fileId = (await fileIntent.json()).result.id;
  const image = await sharp({
    create: { width: 9, height: 7, channels: 3, background: "#447766" },
  })
    .png()
    .toBuffer();
  const upload = await fetch(`${base}${workspacePath}/files/${fileId}`, {
    method: "PUT",
    headers: { origin: base, "content-type": "image/png", cookie },
    body: image,
  });
  assert.equal(upload.status, 200);
  const finalized = await upload.json();
  assert.equal(
    (
      await api(`${workspacePath}/actions/attach-file`, {
        fileId,
        expectedVersion: finalized.version,
      })
    ).status,
    200,
  );
  const downloaded = await fetch(`${base}${workspacePath}/files/${fileId}`, {
    headers: { cookie },
  });
  assert.equal(downloaded.status, 200);
  assert.ok(downloaded.headers.get("cache-control").includes("no-store"));
  assert.ok(
    downloaded.headers.get("content-disposition").startsWith("attachment;"),
  );
  assert.equal(
    (await sharp(Buffer.from(await downloaded.arrayBuffer())).metadata()).width,
    9,
  );
  assert.equal(
    (await fetch(`${base}${workspacePath}/files/${fileId}`)).status,
    403,
  );
  const fileList = await (
    await fetch(`${base}${workspacePath}/files`, { headers: { cookie } })
  ).json();
  assert.ok(fileList.some((f) => f.id === fileId));
  await admin.query(
    "UPDATE app.memberships SET active=false WHERE tenant_id=$1",
    [tenant],
  );
  try {
    assert.equal(
      (
        await fetch(`${base}${workspacePath}/files/${fileId}`, {
          headers: { cookie },
        })
      ).status,
      403,
    );
  } finally {
    await admin.query(
      "UPDATE app.memberships SET active=true WHERE tenant_id=$1",
      [tenant],
    );
  }
  assert.equal(
    (
      await api(`${workspacePath}/actions/retire-file`, {
        fileId,
        expectedVersion: 2,
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await fetch(`${base}${workspacePath}/files/${fileId}`, {
        headers: { cookie },
      })
    ).status,
    403,
  );
  const workspacePage = await (
    await fetch(`${base}/workspaces/${tenant}/${choice.locationId}`, {
      headers: { cookie },
    })
  ).text();
  assert.ok(workspacePage.includes("HTTP fixture shop"));
  assert.ok(workspacePage.includes("People &amp; access"));
  assert.ok(workspacePage.includes("workspace-app-topbar"));
  for (const [suffix, content] of [
    ["/settings", "Personal preferences"],
    ["/settings/shop", "Update shop profile"],
    ["/settings/access", "Send invitation"],
    ["/files", "Upload private image"],
  ]) {
    const url = `${base}/workspaces/${tenant}/${choice.locationId}${suffix}`;
    const response = await fetch(url, { headers: { cookie } });
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.ok(
      html.includes(content),
      `${suffix} lost its existing workspace tool`,
    );
    assert.ok(
      html.includes("workspace-app-topbar"),
      `${suffix} lost the shared shell`,
    );
    const anonymous = await fetch(url, { redirect: "manual" });
    assert.equal(anonymous.status, 307);
    assert.equal(anonymous.headers.get("location"), "/account");
  }
  assert.equal(
    (
      await fetch(
        `${base}/api/workspaces/${randomUUID()}/${choice.locationId}`,
        { headers: { cookie } },
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await api(
        `${workspacePath}/actions/member`,
        {
          membershipId: randomUUID(),
          roleId: randomUUID(),
          expectedVersion: 0,
          enabled: true,
        },
        randomUUID(),
        "",
      )
    ).status,
    403,
  );
  // Exercise the actual operator routes with a real TOTP-proven session.
  await admin.query("SELECT app.bootstrap_operator($1,$2,$3)", [
    email,
    "HTTP verified synthetic operator",
    "test:http",
  ]);
  async function operatorAuth(path, body) {
    const response = await post(path, body, cookie);
    const pairs = new Map(
      cookie.split("; ").map((item) => {
        const i = item.indexOf("=");
        return [item.slice(0, i), item.slice(i + 1)];
      }),
    );
    for (const entry of response.headers.getSetCookie()) {
      const pair = entry.split(";")[0],
        i = pair.indexOf("=");
      pairs.set(pair.slice(0, i), pair.slice(i + 1));
    }
    cookie = [...pairs].map(([k, v]) => `${k}=${v}`).join("; ");
    return response;
  }
  const enrollment = await (
    await operatorAuth("/two-factor/enable", { password, issuer: "Fitloom" })
  ).json();
  assert.equal(
    (
      await operatorAuth("/two-factor/verify-totp", {
        code: totp(enrollment.totpURI),
      })
    ).status,
    200,
  );
  const operatorPost = (body) =>
    fetch(`${base}/api/operator/commands`, {
      method: "POST",
      headers: { origin: base, "content-type": "application/json", cookie },
      body: JSON.stringify({
        operationKey: randomUUID(),
        correlationId: randomUUID(),
        reason: "HTTP synthetic operator validation",
        ...body,
      }),
    });
  assert.equal(
    (
      await fetch(`${base}/api/operator/tenants?query=${tenant}`, {
        headers: { cookie },
      })
    ).status,
    200,
  );
  assert.equal(
    (await fetch(`${base}/api/operator/jobs`, { headers: { cookie } })).status,
    200,
  );
  const status = await fetch(`${base}/api/operator/status`, {
    headers: { cookie },
  });
  assert.equal(status.status, 200);
  assert.ok(status.headers.get("cache-control").includes("no-store"));
  const observed = await status.json();
  assert.equal(observed.database.state, "available");
  assert.equal(observed.worker.state, "observed");
  assert.equal(observed.storage.state, "available");
  assert.equal(observed.backups.state, "unknown");
  assert.ok(!JSON.stringify(observed).includes(email));
  const drainStarted = Date.now();
  worker.kill("SIGTERM");
  await Promise.race([once(worker, "exit"), pause(5000)]);
  assert.ok(
    worker.exitCode !== null || worker.signalCode !== null,
    "Worker drains within five seconds when idle",
  );
  const drainMs = Date.now() - drainStarted;
  let stale = false;
  for (let n = 0; n < 40; n++) {
    const data = await (
      await fetch(`${base}/api/operator/status`, { headers: { cookie } })
    ).json();
    if (data.worker.state === "stale") {
      stale = true;
      break;
    }
    await pause(1000);
  }
  assert.ok(stale, "Stopped worker becomes stale through protected status");
  worker = startWorker();
  worker.stdout.resume();
  worker.stderr.resume();
  const restartMs = await waitForWorker(
    async () =>
      (
        await (
          await fetch(`${base}/api/operator/status`, { headers: { cookie } })
        ).json()
      ).worker.state === "observed",
    "Restart refreshes durable worker observation",
  );
  console.log(
    `Worker drain observed: ${drainMs} ms; stopped telemetry became stale and recovered ${restartMs} ms after restart.`,
  );
  const outageIntent = await (await api(`${workspacePath}/files`, {})).json();
  const outageFile = outageIntent.result.id;
  assert.equal(
    (
      await fetch(`${base}${workspacePath}/files/${outageFile}`, {
        method: "PUT",
        headers: { origin: base, "content-type": "image/png", cookie },
        body: image,
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await api(`${workspacePath}/actions/attach-file`, {
        fileId: outageFile,
        expectedVersion: 1,
      })
    ).status,
    200,
  );
  await failureServer(
    { STORAGE_ENDPOINT: "http://127.0.0.1:24454" },
    async (host) => {
      const response = await fetch(`${host}/api/operator/status`, {
        headers: { cookie },
      });
      assert.equal(response.status, 200);
      const data = await response.json();
      assert.equal(data.storage.state, "unavailable");
      assert.equal(data.state, "degraded");
      assert.equal(
        (
          await fetch(`${host}${workspacePath}/files/${outageFile}`, {
            headers: { cookie },
          })
        ).status,
        503,
      );
    },
  );
  const downAuth = new URL(webEnvironment.AUTH_DATABASE_URL);
  downAuth.port = "24431";
  const downWeb = new URL(webEnvironment.WEB_DATABASE_URL);
  downWeb.port = "24431";
  await failureServer({ WEB_DATABASE_URL: downWeb.href }, async (host) => {
    const response = await fetch(`${host}/api/operator/status`, {
      headers: { cookie },
    });
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.database.webRole, "unavailable");
    assert.equal(data.state, "degraded");
  });
  await failureServer(
    { AUTH_DATABASE_URL: downAuth.href, WEB_DATABASE_URL: downWeb.href },
    async (host) => {
      const response = await fetch(`${host}/api/operator/status`, {
        headers: { cookie },
      });
      assert.equal(response.status, 503);
      const data = await response.json();
      assert.equal(data.database.state, "unknown");
      assert.equal(data.worker.state, "unknown");
      assert.equal(data.queues, null);
      assert.ok(!JSON.stringify(data).includes(downAuth.password));
    },
  );
  const recoveredDownload = await fetch(
    `${base}${workspacePath}/files/${outageFile}`,
    { headers: { cookie } },
  );
  assert.equal(recoveredDownload.status, 200);
  await recoveredDownload.arrayBuffer();
  assert.equal(
    (
      await api(`${workspacePath}/actions/retire-file`, {
        fileId: outageFile,
        expectedVersion: 2,
      })
    ).status,
    200,
  );
  const suspendKey = randomUUID();
  const suspended = await operatorPost({
    action: "tenant.suspend",
    tenantId: tenant,
    operationKey: suspendKey,
  });
  assert.equal(suspended.status, 200);
  const repeated = await operatorPost({
    action: "tenant.suspend",
    tenantId: tenant,
    operationKey: suspendKey,
  });
  assert.equal(repeated.status, 200);
  assert.equal(
    (await suspended.json()).operationId,
    (await repeated.json()).operationId,
  );
  assert.equal(
    (await fetch(`${base}${workspacePath}`, { headers: { cookie } })).status,
    403,
  );
  assert.equal(
    (await operatorPost({ action: "tenant.restore", tenantId: tenant })).status,
    200,
  );
  const subject = (
    await admin.query(
      'SELECT p.id FROM app.principals p JOIN public."user" u ON u.id=p.auth_user_id WHERE u.email=$1',
      [email],
    )
  ).rows[0].id;
  const recovery = await operatorPost({
    action: "owner.recover",
    tenantId: tenant,
    principalId: subject,
  });
  assert.equal(recovery.status, 200);
  assert.deepEqual((await recovery.json()).result, { accepted: true });
  const serviceJob = randomUUID();
  await admin.query(
    "INSERT INTO app.foundation_jobs(id,kind,authority,source_id,source_key,input_version,payload,status) VALUES($1,'unsupported.fixture','service',$1,$2,1,'{}','failed')",
    [serviceJob, `http-job:${serviceJob}`],
  );
  const retry = {
    jobId: serviceJob,
    action: "retry",
    reason: "HTTP retry validation",
    operationKey: randomUUID(),
    correlationId: randomUUID(),
  };
  const jobPost = () =>
    fetch(`${base}/api/operator/jobs`, {
      method: "POST",
      headers: { origin: base, "content-type": "application/json", cookie },
      body: JSON.stringify(retry),
    });
  const retried = await jobPost(),
    retriedAgain = await jobPost();
  assert.equal(retried.status, 200);
  assert.equal(retriedAgain.status, 200);
  assert.equal(
    (await retried.json()).operationId,
    (await retriedAgain.json()).operationId,
  );
  assert.equal(
    (
      await operatorPost({
        action: "sessions.revoke",
        tenantId: tenant,
        principalId: subject,
      })
    ).status,
    200,
  );
  assert.equal(
    (await fetch(`${base}/api/session`, { headers: { cookie } })).status,
    401,
  );
  const untrusted = await fetch(`${base}/api/setup`, {
    method: "POST",
    headers: {
      origin: "https://untrusted.invalid",
      "content-type": "application/json",
      cookie,
    },
    body: "{}",
  });
  assert.equal(untrusted.status, 403);
  assert.equal((await post("/sign-out", {}, cookie)).status, 200);
  assert.equal(
    (await fetch(`${base}/api/session`, { headers: { cookie } })).status,
    401,
  );
  for (const name of [
    "fitloom-measurement-photos",
    "fitloom-measurement-cards",
    ...(process.env.MASTER_UI_CHECKS === "1" &&
    process.env.MEASUREMENT_UI_ONLY !== "1" &&
    process.env.IMPORT_UI_ONLY !== "1"
      ? ["fitloom-customer-photos"]
      : []),
  ]) {
    assert.ok(
      observedAdapters.has(name),
      `Missing safe command diagnostics from ${name}`,
    );
  }
  console.log(
    "HTTP smoke passed: account SSR → registration → mail worker → Mailpit → verify → sign in → protected projection → resumable setup → shop provisioning → workspace SSR → direct-route authorization → logout. Operator default access denied. Signed provider receipts survive a real worker restart with one local effect; protected job projections pass. Private SeaweedFS upload/attach/download, current-authority denial, retirement, workspace UI, and operator-route denial pass. Actual TOTP operator routes pass lookup, replay, suspend/restore, recovery, job retry, and session revocation. Protected telemetry, stale-worker recovery, bounded pages, database failure, and storage failure return truthful outcomes.",
  );
} finally {
  for (const child of [worker, web]) {
    if (child.exitCode !== null) continue;
    child.kill("SIGTERM");
    await Promise.race([once(child, "exit"), pause(5000)]);
    if (child.exitCode === null) child.kill("SIGKILL");
  }
  await admin.end();
}
