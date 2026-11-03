import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { once } from "node:events";
import http from "node:http";
import { test } from "node:test";
import { blobDigest, blobKey, createBlobStore } from "../dist/index.js";

const actual = new URL(process.env.TEST_STORAGE_ENDPOINT);
if (
  process.env.TEST_STORAGE_BUCKET !== "fitloom-test" ||
  !["127.0.0.1", "seaweedfs"].includes(actual.hostname) ||
  actual.port !== "24453"
)
  throw new Error("Isolated storage required");
const credentials = {
  bucket: "fitloom-test",
  accessKey: process.env.TEST_STORAGE_ACCESS_KEY,
  secretKey: process.env.TEST_STORAGE_SECRET_KEY,
};
const ref = (id, bytes) => ({
  layout: "sha256",
  id,
  digest: blobDigest.parse(createHash("sha256").update(bytes).digest("hex")),
});
await test("late timed-out writes cannot overwrite a newer immutable object", {
  timeout: 20000,
}, async () => {
  let first = true,
    lateDone;
  const late = new Promise((resolve) => {
    lateDone = resolve;
  });
  const proxy = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks);
    const forward = () =>
      new Promise((resolve) => {
        const upstream = http.request(
          {
            hostname: actual.hostname,
            port: actual.port,
            path: req.url,
            method: req.method,
            headers: req.headers,
          },
          (response) => {
            const parts = [];
            response.on("data", (chunk) => parts.push(chunk));
            response.on("end", () => {
              if (!res.destroyed) {
                res.writeHead(response.statusCode, response.headers);
                res.end(Buffer.concat(parts));
              }
              resolve(response.statusCode);
            });
          },
        );
        upstream.on("error", () => {
          if (!res.destroyed) res.destroy();
          resolve(0);
        });
        upstream.end(body);
      });
    if (req.method === "PUT" && first) {
      first = false;
      setTimeout(async () => lateDone(await forward()), 9000);
    } else await forward();
  });
  proxy.listen(0, "127.0.0.1");
  await once(proxy, "listening");
  const address = proxy.address();
  assert.ok(address && typeof address === "object");
  const delayed = createBlobStore({
      ...credentials,
      endpoint: `http://127.0.0.1:${address.port}`,
    }),
    direct = createBlobStore({ ...credentials, endpoint: actual.href });
  const id = blobKey.parse(randomUUID()),
    old = Buffer.from("old!"),
    fresh = Buffer.from("new!"),
    oldRef = ref(id, old),
    freshRef = ref(id, fresh);
  try {
    await assert.rejects(delayed.put(oldRef, old, "application/octet-stream"));
    await delayed.put(freshRef, fresh, "application/octet-stream");
    assert.equal(await late, 200);
    assert.equal(
      await new Response(await direct.open(freshRef, 4)).text(),
      "new!",
    );
    assert.equal(
      await new Response(await direct.open(oldRef, 4)).text(),
      "old!",
    );
    await assert.rejects(direct.put(freshRef, old, "application/octet-stream"));
  } finally {
    await direct.remove([oldRef, freshRef]);
    proxy.closeAllConnections();
    await new Promise((resolve) => proxy.close(resolve));
  }
});
await test("a paused consumer cannot read buffered bytes after the whole-stream deadline", async (t) => {
  const server = http.createServer((_req, res) => {
    res.writeHead(200, {
      "content-length": "3",
      "content-type": "application/octet-stream",
    });
    res.end("abc");
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address === "object");
  try {
    t.mock.timers.enable({ apis: ["setTimeout"] });
    const store = createBlobStore({
      ...credentials,
      endpoint: `http://127.0.0.1:${address.port}`,
    });
    const body = await store.open(
      { layout: "legacy", id: blobKey.parse(randomUUID()) },
      3,
    );
    await new Promise((resolve) => setImmediate(resolve));
    t.mock.timers.tick(15001);
    await assert.rejects(new Response(body).text(), /File stream unavailable/);
  } finally {
    t.mock.timers.reset();
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});
