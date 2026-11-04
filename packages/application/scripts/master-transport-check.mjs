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
  const importPath = `${base}/api/workspaces/${randomUUID()}/${randomUUID()}/imports/customers/commands/preview`;
  // Send headers first for the advertised-length rejection. Sending the entire
  // buffer with fetch can raise EPIPE when an early 413 closes the upload.
  const declared = await new Promise((resolve, reject) => {
    const request = httpRequest(
      importPath,
      {
        method: "POST",
        headers: {
          origin: base,
          "content-type": "application/json",
          "content-length": 3 * 1024 * 1024 + 1,
        },
      },
      (response) => {
        response.resume();
        response.on("end", () => {
          resolve({
            status: response.statusCode,
            cache: response.headers["cache-control"],
          });
          request.destroy();
        });
      },
    );
    request.on("error", reject);
    request.setTimeout(8000, () =>
      request.destroy(Error("Import length rejection response missing")),
    );
    request.flushHeaders();
  });
  assert.equal(declared.status, 413);
  assert.match(declared.cache, /no-store/);
  // Exercise the actual byte counter without Content-Length. The final byte
  // crosses the limit after all bounded chunks have been written.
  const streamed = await new Promise((resolve, reject) => {
    const request = httpRequest(
      importPath,
      {
        method: "POST",
        headers: { origin: base, "content-type": "application/json" },
      },
      (response) => {
        response.resume();
        response.on("end", () =>
          resolve({
            status: response.statusCode,
            cache: response.headers["cache-control"],
          }),
        );
      },
    );
    request.on("error", reject);
    request.setTimeout(8000, () =>
      request.destroy(Error("Import stream rejection response missing")),
    );
    void (async () => {
      const chunk = Buffer.alloc(65536, 120);
      for (let i = 0; i < 48; i++)
        await new Promise((done, fail) =>
          request.write(chunk, (error) => (error ? fail(error) : done())),
        );
      request.end("x");
    })().catch(reject);
  });
  assert.equal(streamed.status, 413);
  assert.match(streamed.cache, /no-store/);
  for (const suffix of [
    "masters/commands/garment.save",
    "imports/measurements/commands/preview",
  ]) {
    const slowStatus = await new Promise((resolve, reject) => {
      const request = httpRequest(
        `${base}/api/workspaces/${randomUUID()}/${randomUUID()}/${suffix}`,
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
  }
  console.log(
    "Master/import body limits return stable 413 responses and slow streams return 408",
  );
} finally {
  child.kill("SIGTERM");
  await once(child, "exit");
}
