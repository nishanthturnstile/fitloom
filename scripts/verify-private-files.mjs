import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";

const sharp = createRequire(
  new URL("../packages/application/package.json", import.meta.url),
)("sharp");
const access = JSON.parse(
  await readFile(new URL("../.local/access.json", import.meta.url), "utf8"),
);
const account = JSON.parse(
  await readFile(
    new URL("../.local/validation-account.json", import.meta.url),
    "utf8",
  ),
);
const origin = access.origin;
const host = new URL(origin).hostname;
if (
  account.email !== "demo@fitloom.test" ||
  (!host.endsWith(".ts.net") && host !== "localhost")
)
  throw new Error("Only the local demo fixture may be validated");
const signed = await fetch(`${origin}/api/auth/sign-in/email`, {
  method: "POST",
  headers: { origin, "content-type": "application/json" },
  body: JSON.stringify({ email: account.email, password: account.password }),
});
assert.equal(signed.status, 200, "Demo sign-in succeeds");
const cookie = signed.headers
  .getSetCookie()
  .map((entry) => entry.split(";")[0])
  .join("; ");
const request = (path, init = {}) =>
  fetch(`${origin}${path}`, {
    ...init,
    headers: { origin, cookie, ...init.headers },
    signal: AbortSignal.timeout(30000),
  });
try {
  const choices = await (await request("/api/workspaces")).json();
  const target = choices.find((row) => row.shopName === "Fitloom Demo");
  assert.ok(target, "Only the Fitloom Demo workspace is used");
  const base = `/api/workspaces/${target.tenantId}/${target.locationId}`;
  const fileURL = new URL(
    "../.local/private-file-fixture.json",
    import.meta.url,
  );
  let fixture;
  try {
    fixture = JSON.parse(await readFile(fileURL, "utf8"));
  } catch {
    fixture = null;
  }
  const listed = await (await request(`${base}/files`)).json();
  if (
    !fixture ||
    fixture.tenantId !== target.tenantId ||
    fixture.locationId !== target.locationId ||
    !listed.some((row) => row.id === fixture.id)
  ) {
    const command = async (path, payload, key = randomUUID()) => {
      const response = await request(path, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          operationKey: key,
          correlationId: randomUUID(),
          payload,
        }),
      });
      assert.equal(response.status, 200, "Demo file command succeeds");
      return response.json();
    };
    const begun = await command(`${base}/files`, {}),
      id = begun.result.id;
    const bytes = await sharp({
      create: { width: 96, height: 64, channels: 3, background: "#355d4b" },
    })
      .png()
      .toBuffer();
    const uploaded = await request(`${base}/files/${id}`, {
      method: "PUT",
      headers: { "content-type": "image/png" },
      body: bytes,
    });
    assert.equal(uploaded.status, 200, "Live SeaweedFS upload succeeds");
    const finalized = await uploaded.json();
    await command(`${base}/actions/attach-file`, {
      fileId: id,
      expectedVersion: finalized.version,
    });
    fixture = { tenantId: target.tenantId, locationId: target.locationId, id };
  }
  const response = await request(`${base}/files/${fixture.id}`);
  assert.equal(response.status, 200, "Protected live download succeeds");
  assert.ok(response.headers.get("cache-control").includes("no-store"));
  assert.ok(
    response.headers.get("content-disposition").includes("attachment;"),
  );
  const bytes = Buffer.from(await response.arrayBuffer());
  assert.equal((await sharp(bytes).metadata()).width, 96);
  const digest = createHash("sha256").update(bytes).digest("hex");
  if (fixture.sha256)
    assert.equal(
      digest,
      fixture.sha256,
      "Stored bytes survive repeat/restart unchanged",
    );
  fixture.sha256 = digest;
  await writeFile(fileURL, JSON.stringify(fixture, null, 2), { mode: 0o600 });
  assert.equal(
    (await fetch(`${origin}${base}/files/${fixture.id}`)).status,
    403,
    "Anonymous download denied",
  );
  assert.equal(
    (await request("/api/operator/tenants")).status,
    403,
    "Demo owner has no operator grant",
  );
  const page = await (
    await request(`/workspaces/${target.tenantId}/${target.locationId}`)
  ).text();
  assert.ok(page.includes("Private files"));
  assert.ok(page.includes("Upload private image"));
  console.log(
    "Live Tailscale/Compose verified: private demo upload, attachment, bounded download, stable digest, workspace UI, anonymous denial, and operator denial. One reusable reference image remains in Fitloom Demo.",
  );
} finally {
  await request("/api/auth/sign-out", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}",
  });
}
