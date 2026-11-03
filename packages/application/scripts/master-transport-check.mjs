import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { request as httpRequest } from "node:http";
import { createRequire } from "node:module";

const target = new URL(process.env.TEST_WEB_DATABASE_URL);
if (
  target.pathname !== "/fitloom_test" ||
  target.username !== "fitloom_test_web"
)
  throw Error("Isolated test URL required");
const root = new URL("../../../", import.meta.url),
  base = "http://localhost:24415";
const next = createRequire(new URL("apps/web/package.json", root)).resolve(
  "next/dist/bin/next",
);
const child = spawn(
  process.execPath,
  [next, "start", "--port", "24415", "--hostname", "127.0.0.1"],
  {
    cwd: new URL("apps/web/", root),
    env: {
      ...process.env,
      NODE_ENV: "production",
      FITLOOM_ENV: "test",
      AUTH_DATABASE_URL: process.env.TEST_AUTH_DATABASE_URL,
      WEB_DATABASE_URL: process.env.TEST_WEB_DATABASE_URL,
      AUTH_SECRET: process.env.TEST_AUTH_SECRET,
      AUTH_BASE_URL: base,
      AUTH_TRUSTED_ORIGINS: base,
      MAIL_PROVIDER: "mailpit",
      MAIL_ENCRYPTION_KEY: process.env.TEST_MAIL_ENCRYPTION_KEY,
    },
    stdio: ["ignore", "ignore", "ignore"],
  },
);
try {
  for (let i = 0; i < 50; i++) {
    try {
      if ((await fetch(`${base}/account`)).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  for (const action of [
    "garment.save",
    "service.save",
    "garment.save",
    "garment.save",
    "garment.save",
  ]) {
    const size = action === "garment.save" ? 131073 : 16385;
    const response = await fetch(
      `${base}/api/workspaces/${randomUUID()}/${randomUUID()}/masters/commands/${action}`,
      {
        method: "POST",
        headers: { origin: base, "content-type": "application/json" },
        body: JSON.stringify({
          operationKey: randomUUID(),
          correlationId: randomUUID(),
          payload: { padding: "x".repeat(size) },
        }),
      },
    );
    await response.arrayBuffer();
    assert.equal(response.status, 413);
    assert.ok(response.headers.get("cache-control").includes("no-store"));
  }
  const slowStatus = await new Promise((resolve, reject) => {
    const request = httpRequest(
      `${base}/api/workspaces/${randomUUID()}/${randomUUID()}/masters/commands/garment.save`,
      {
        method: "POST",
        headers: { origin: base, "content-type": "application/json" },
      },
      (response) => {
        response.resume();
        response.on("end", () => {
          resolve(response.statusCode);
          request.destroy();
        });
      },
    );
    request.on("error", reject);
    request.setTimeout(8000, () =>
      request.destroy(new Error("Body deadline response was not received")),
    );
    request.write("{");
  });
  assert.equal(slowStatus, 408);
  console.log(
    "Master body limits return stable 413 responses and a slow stream returns 408",
  );
} finally {
  child.kill("SIGTERM");
  await once(child, "exit");
}
