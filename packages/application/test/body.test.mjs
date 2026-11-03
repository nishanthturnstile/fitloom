import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import {
  BodyReadError,
  fixtureInbox,
  readBoundedBody,
  signFixture,
} from "../dist/index.js";

await test("bounded body reader observes deadlines and disconnected clients", async () => {
  const request = () =>
    new Request("http://localhost", {
      method: "POST",
      body: new ReadableStream({ start() {} }),
      duplex: "half",
    });
  await assert.rejects(
    readBoundedBody(request(), { maxBytes: 10, timeoutMs: 30 }),
    (e) => e instanceof BodyReadError && e.status === 408,
  );
  const controller = new AbortController();
  const input = new Request(request(), { signal: controller.signal });
  const reading = readBoundedBody(input, { maxBytes: 10, timeoutMs: 1000 });
  controller.abort();
  await assert.rejects(reading, (e) => e.status === 408);
  await assert.rejects(
    readBoundedBody(
      new Request("http://localhost", { method: "POST", body: "01234567890" }),
      { maxBytes: 10, timeoutMs: 1000 },
    ),
    (e) => e.status === 413,
  );
});
await test("fixture freshness is rechecked after body ingestion", async () => {
  const now = Date.now,
    initial = now(),
    stamp = String(Math.floor(initial / 1000)),
    secret = "test-fixture-secret".repeat(3);
  const raw = Buffer.from(
    JSON.stringify({
      eventId: randomUUID(),
      sourceId: randomUUID(),
      version: 1,
      state: "pending",
    }),
  );
  let writes = 0;
  const inbox = fixtureInbox({
    pool: {
      query: async () => {
        writes++;
        throw new Error("Must not persist");
      },
    },
    secret,
    environment: "test",
    account: "local-fixture",
  });
  try {
    Date.now = () => initial;
    const input = new Request("http://localhost", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-fitloom-timestamp": stamp,
        "x-fitloom-signature": signFixture(raw, stamp, secret),
      },
      body: new ReadableStream({
        pull(c) {
          Date.now = () => initial + 301000;
          c.enqueue(raw);
          c.close();
        },
      }),
      duplex: "half",
    });
    assert.equal((await inbox(input)).status, 401);
    assert.equal(writes, 0);
  } finally {
    Date.now = now;
  }
});
