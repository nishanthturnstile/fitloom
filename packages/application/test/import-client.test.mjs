import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import { z } from "zod";
import {
  importFetch,
  importRead,
} from "../../../apps/web/src/components/imports/import-client.ts";

test("stalled import requests time out and chunk callers can cancel", async () => {
  const server = createServer((_request, _response) => {});
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const base = `http://127.0.0.1:${address.port}`;
  try {
    const started = performance.now();
    const timeout = (error) => error.name === "TimeoutError";
    await Promise.all([
      assert.rejects(importFetch(`${base}/commands/preview`, {}), timeout),
      assert.rejects(importRead(`${base}/owner`, z.unknown()), timeout),
    ]);
    const elapsed = performance.now() - started;
    assert.ok(elapsed >= 14500 && elapsed < 22000, `${elapsed} ms`);
    await assert.rejects(
      importFetch(`${base}/chunk`, {}, AbortSignal.timeout(25)),
      timeout,
    );
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});
