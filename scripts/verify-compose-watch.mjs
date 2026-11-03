import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { setTimeout as pause } from "node:timers/promises";

// Run with the development stack and Compose Watch active. Uses no account data.
const token = randomUUID();
const source = `apps/web/src/.watch-probe-${token}.txt`;
const ignored = [
  `apps/web/.next/.watch-probe-${token}.txt`,
  `node_modules/.watch-probe-${token}.txt`,
];
const docker = (...args) =>
  execFileSync("docker", ["compose", ...args], {
    encoding: "utf8",
    timeout: 20000,
  }).trim();
const inspect = () =>
  JSON.parse(
    docker(
      "exec",
      "-T",
      "web",
      "node",
      "-e",
      `const f=require('node:fs');console.log(JSON.stringify({source:f.existsSync(${JSON.stringify(source)})?f.readFileSync(${JSON.stringify(source)},'utf8'):null,ignored:${JSON.stringify(ignored)}.map(p=>f.existsSync(p)),productionBuild:f.existsSync('apps/web/.next/BUILD_ID')}))`,
    ),
  );
const identities = docker("ps", "--quiet", "web", "worker");
assert.ok(identities, "Development services must be running");
assert.equal(
  inspect().productionBuild,
  false,
  "Recreate the contaminated web container first",
);
try {
  await mkdir("apps/web/.next", { recursive: true });
  await writeFile(source, token);
  for (const path of ignored) await writeFile(path, token);
  let synced = false;
  for (let attempt = 0; attempt < 30; attempt++) {
    if (inspect().source === token) {
      synced = true;
      break;
    }
    await pause(500);
  }
  assert.ok(synced, "Source changes did not reach the web container");
  execFileSync("pnpm", ["build"], { stdio: "inherit", timeout: 180000 });
  const result = inspect();
  assert.deepEqual(
    result.ignored,
    [false, false],
    "Host generated files leaked into the container",
  );
  assert.equal(
    result.productionBuild,
    false,
    "Host production output replaced the development cache",
  );
  assert.equal(
    docker("ps", "--quiet", "web", "worker"),
    identities,
    "Source/build checks recreated a live service",
  );
  const response = await fetch("http://127.0.0.1:24410/account", {
    signal: AbortSignal.timeout(15000),
  });
  assert.equal(
    response.status,
    200,
    "Development account broke after the host build",
  );
  console.log(
    "Compose Watch verified: source sync, generated/dependency isolation, stable services, and account HTTP 200 after host build.",
  );
} finally {
  for (const path of [source, ...ignored])
    await unlink(path).catch((error) => {
      if (error.code !== "ENOENT") throw error;
    });
}
