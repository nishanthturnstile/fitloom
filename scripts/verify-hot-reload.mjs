import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
process.chdir(root);
const web = new URL(
  "../apps/web/src/app/account/account-panel.tsx",
  import.meta.url,
);
const shared = new URL("../packages/application/src/auth.ts", import.meta.url);
const worker = new URL("../apps/worker/src/index.ts", import.meta.url);
const originals = await Promise.all(
  [web, shared, worker].map((path) => readFile(path, "utf8")),
);
const marker = `Fitloom hot reload ${Date.now()}`;
const fetchText = async (path) =>
  (
    await fetch(`http://127.0.0.1:24410${path}`, {
      signal: AbortSignal.timeout(5000),
    })
  ).text();
const command = (args) =>
  execFileSync("docker", ["compose", ...args], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
const workerPid = () =>
  JSON.parse(
    command([
      "exec",
      "-T",
      "worker",
      "node",
      "-e",
      "process.stdout.write(require('fs').readFileSync('/tmp/fitloom-worker-heartbeat','utf8'))",
    ]),
  ).pid;
async function eventually(check, label) {
  for (let i = 0; i < 60; i++) {
    try {
      if (await check()) {
        console.log(`Passed: ${label}`);
        return;
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Hot reload did not complete: ${label}`);
}
const ids = command(["ps", "--quiet", "web", "worker"]);
const access = JSON.parse(await readFile(`${root}.local/access.json`, "utf8"));
const account = JSON.parse(
  await readFile(`${root}.local/validation-account.json`, "utf8"),
);
assert.equal(account.email, "demo@fitloom.test");
const signed = await fetch(`${access.origin}/api/auth/sign-in/email`, {
  method: "POST",
  headers: { origin: access.origin, "content-type": "application/json" },
  body: JSON.stringify({ email: account.email, password: account.password }),
  signal: AbortSignal.timeout(30000),
});
assert.equal(signed.status, 200, "Demo sign-in succeeds");
const cookie = signed.headers
  .getSetCookie()
  .map((value) => value.split(";")[0])
  .join("; ");
async function exercisePools() {
  const response = await fetch(`${access.origin}/api/workspaces`, {
    headers: { cookie },
    signal: AbortSignal.timeout(15000),
  });
  assert.equal(response.status, 200);
  await response.arrayBuffer();
  const counts = JSON.parse(
    command([
      "exec",
      "-T",
      "--user",
      "postgres",
      "postgres",
      "psql",
      "-p",
      "24430",
      "-d",
      "postgres",
      "-At",
      "-c",
      "SELECT json_build_object('auth',count(*) FILTER(WHERE usename='fitloom_dev_auth'),'web',count(*) FILTER(WHERE usename='fitloom_dev_web')) FROM pg_stat_activity WHERE datname='fitloom_dev' AND application_name LIKE 'fitloom:%' AND backend_start<clock_timestamp()-interval '1 second'",
    ]),
  );
  // Exclude the short-lived container-health probe connections.
  assert.ok(
    counts.auth <= 3 && counts.web <= 5,
    "Runtime connections stay within pool bounds across reloads",
  );
}
try {
  await exercisePools();
  assert.ok(originals[0].includes('"Sign in to Fitloom"'));
  await writeFile(
    web,
    originals[0].replace('"Sign in to Fitloom"', JSON.stringify(marker)),
  );
  await eventually(
    async () => (await fetchText("/account")).includes(marker),
    "web source reaches the live HTTP response",
  );
  await exercisePools();
  await writeFile(web, originals[0]);
  await eventually(
    async () => !(await fetchText("/account")).includes(marker),
    "web source restoration reaches HTTP",
  );
  await exercisePools();
  const beforeShared = workerPid();
  assert.ok(originals[1].includes('"Unknown authentication route"'));
  await writeFile(
    shared,
    originals[1].replace(
      '"Unknown authentication route"',
      JSON.stringify(marker),
    ),
  );
  await eventually(
    async () => (await fetchText("/api/auth/reload-check")).includes(marker),
    "shared application edit reaches the live web API",
  );
  await exercisePools();
  await eventually(
    async () => workerPid() !== beforeShared,
    "shared imported code restarts the worker",
  );
  await writeFile(shared, originals[1]);
  await eventually(
    async () =>
      (await fetchText("/api/auth/reload-check")).includes(
        "Unknown authentication route",
      ),
    "shared application restoration reaches HTTP",
  );
  await exercisePools();
  let beforeWorker;
  await eventually(async () => {
    beforeWorker = workerPid();
    return true;
  }, "worker heartbeat returns after shared-code restoration");
  await writeFile(
    worker,
    `${originals[2]}\n// Temporary hot reload probe; restored by the verification script.\n`,
  );
  await eventually(
    async () => workerPid() !== beforeWorker,
    "worker source edit restarts its running process",
  );
  await exercisePools();
  assert.equal(
    command(["ps", "--quiet", "web", "worker"]),
    ids,
    "source sync does not recreate containers",
  );
  console.log(
    "Hot reload verified through live responses and worker processes, without rebuilding containers. Auth/web connections remain within process pool bounds across reloads.",
  );
} finally {
  await Promise.all(
    [web, shared, worker].map((path, index) =>
      writeFile(path, originals[index]),
    ),
  );
  await fetch(`${access.origin}/api/auth/sign-out`, {
    method: "POST",
    headers: {
      cookie,
      origin: access.origin,
      "content-type": "application/json",
    },
    body: "{}",
    signal: AbortSignal.timeout(15000),
  });
}
