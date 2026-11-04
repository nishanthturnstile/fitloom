import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import * as c from "../dist/import-contracts.js";
import { importTemplate } from "../dist/import-formats.js";
export async function domainImportHttpChecks({
  base,
  workspacePath,
  cookie,
  admin,
  tenant,
}) {
  const prefix = `${workspacePath}/imports`,
    post = (path, body, selectedCookie = cookie) =>
      fetch(base + path, {
        method: "POST",
        headers: {
          cookie: selectedCookie,
          origin: base,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }),
    invoke = (payload) => ({
      payload,
      operationKey: randomUUID(),
      correlationId: randomUUID(),
    });
  const read = async (response, status, schema) => {
    assert.equal(response.status, status, await response.clone().text());
    assert.match(response.headers.get("cache-control"), /no-store/);
    return schema ? schema.parse(await response.json()) : response;
  };
  const {
    rows: [role],
  } = await admin.query(
    "SELECT r.id,m.principal_id FROM app.roles r JOIN app.location_grants g ON g.tenant_id=r.tenant_id AND g.role_id=r.id JOIN app.memberships m ON m.id=g.membership_id WHERE r.tenant_id=$1 AND r.preset='owner' LIMIT 1",
    [tenant],
  );
  const permissions = (
    await admin.query(
      "SELECT permission FROM app.permission_grants WHERE tenant_id=$1 AND role_id=$2",
      [tenant, role.id],
    )
  ).rows.map((r) => r.permission);
  const reset = () =>
    admin.query(
      "UPDATE app.domain_import_budgets SET window_started_at=now()-interval '61 seconds',leases='{}' WHERE actor_id=$1",
      [role.principal_id],
    );
  await reset();
  const ns = `http-${randomUUID()}`,
    request = invoke({
      namespace: ns,
      csv: importTemplate("customers"),
      bindings: [],
    });
  const preview = await read(
    await post(`${prefix}/customers/commands/preview`, request),
    200,
    c.importResponse,
  );
  assert.equal(preview.result.state, "preview");
  assert.equal(
    (
      await read(
        await post(`${prefix}/customers/commands/preview`, request),
        200,
        c.importResponse,
      )
    ).replayed,
    true,
  );
  let batch = await read(
    await post(`${prefix}/customers/status`, {
      batchId: preview.result.batchId,
    }),
    200,
    c.importBatch,
  );
  assert.equal(batch.total, 1);
  assert.equal(batch.items[0].payload.profile.name, "Sample customer");
  await read(
    await post(
      `${prefix}/customers/commands/decide`,
      invoke({
        batchId: batch.id,
        recordId: batch.items[0].id,
        expectedRevision: 1,
        decision: { kind: "create" },
        bindings: [],
      }),
    ),
    200,
    c.importResponse,
  );
  batch = await read(
    await post(`${prefix}/customers/chunk`, { batchId: batch.id }),
    200,
    c.importBatch,
  );
  assert.equal(batch.counts.created, 1);
  assert.equal(batch.items[0].counts.wearers, 1);
  const record = batch.items[0],
    recovery = {
      family: "customers",
      batchId: batch.id,
      logicalRecordId: record.id,
      operationKey: record.operationKey,
      requestHash: record.requestHash,
    };
  await admin.query(
    "UPDATE app.domain_import_batches SET expires_at=now()-interval '1 second',lease_token=$2,lease_until=now()+interval '30 seconds' WHERE id=$1",
    [batch.id, randomUUID()],
  );
  await admin.query(
    "UPDATE app.domain_import_budgets SET chunks=10,previews=5 WHERE actor_id=$1",
    [role.principal_id],
  );
  assert.equal(
    (
      await read(
        await post(`${prefix}/recover`, recovery),
        200,
        c.importRecovered,
      )
    ).kind,
    "committed",
  );
  await read(
    await post(`${prefix}/recover`, {
      ...recovery,
      requestHash: "v1:" + "0".repeat(64),
    }),
    403,
  );
  const limited = await read(
    await post(
      `${prefix}/customers/commands/preview`,
      invoke({ ...request.payload, namespace: ns + "-limited" }),
    ),
    429,
  );
  assert.equal(limited.headers.get("retry-after"), "60");
  await read(
    await post(`${prefix}/measurements/status`, { batchId: batch.id }),
    404,
  );
  await read(
    await post(
      `${prefix}/customers/commands/attempt-outcome`,
      invoke({ batchId: batch.id }),
    ),
    404,
  );
  await read(
    await post(`${prefix}/customers/status`, {
      batchId: batch.id,
      unrecognized: true,
    }),
    400,
  );
  await read(
    await post(`${prefix}/customers/status`, { batchId: batch.id }, ""),
    401,
  );
  const deniedOrigin = await fetch(base + prefix + "/customers/status", {
    method: "POST",
    headers: {
      cookie,
      origin: "https://other.example",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ batchId: batch.id }),
  });
  assert.equal(deniedOrigin.status, 403);
  const outcomes = await read(
    await post(`${prefix}/customers/outcomes`, { batchId: batch.id }),
    200,
  );
  assert.match(outcomes.headers.get("content-disposition"), /attachment/);
  assert.equal((await outcomes.json()).counts.created, 1);
  await reset();
  const before = (
      await admin.query(
        "SELECT count(*)::int n FROM app.customers WHERE tenant_id=$1",
        [tenant],
      )
    ).rows[0].n,
    interactive = (
      await admin.query(
        "SELECT coalesce(sum(checks),0)::int n FROM app.customer_request_budgets WHERE principal_id=$1",
        [role.principal_id],
      )
    ).rows[0].n;
  const quote = (v) => '"' + String(v).replaceAll('"', '""') + '"',
    text =
      c.importCustomerColumns.join(",") +
      "\n" +
      Array.from({ length: 200 }, (_, i) =>
        [
          "full_" + i,
          "HTTP bulk " + i,
          "IN",
          "98765" + String(40000 + i),
          "",
          "",
          "",
          "",
          "தமிழ்".repeat(150),
        ]
          .map(quote)
          .join(","),
      ).join("\n");
  assert.ok(Buffer.byteLength(JSON.stringify({ csv: text })) > 128 * 1024);
  const full = await read(
      await post(
        `${prefix}/customers/commands/preview`,
        invoke({ namespace: ns + "-bulk", csv: text, bindings: [] }),
      ),
      200,
      c.importResponse,
    ),
    fullBatch = await read(
      await post(`${prefix}/customers/status`, {
        batchId: full.result.batchId,
        offset: 175,
      }),
      200,
      c.importBatch,
    );
  assert.equal(fullBatch.total, 200);
  assert.equal(fullBatch.items.length, 25);
  assert.equal(
    (
      await admin.query(
        "SELECT count(*)::int n FROM app.customers WHERE tenant_id=$1",
        [tenant],
      )
    ).rows[0].n,
    before,
  );
  assert.equal(
    (
      await admin.query(
        "SELECT coalesce(sum(checks),0)::int n FROM app.customer_request_budgets WHERE principal_id=$1",
        [role.principal_id],
      )
    ).rows[0].n,
    interactive,
  );
  await read(
    await post(
      `${prefix}/customers/commands/cancel`,
      invoke({ batchId: full.result.batchId }),
    ),
    200,
    c.importResponse,
  );
  await read(
    await post(
      `${prefix}/customers/commands/preview`,
      invoke({
        namespace: ns,
        csv: "x".repeat(c.IMPORT_FILE_BYTES + 1),
        bindings: [],
      }),
    ),
    413,
  );
  try {
    await admin.query(
      "DELETE FROM app.permission_grants WHERE tenant_id=$1 AND role_id=$2",
      [tenant, role.id],
    );
    await admin.query(
      "INSERT INTO app.permission_grants SELECT $1,$2,unnest($3::text[])",
      [
        tenant,
        role.id,
        [
          "workspace.read",
          "customers.read",
          "measurements.read",
          "measurements.manage",
          "measurements.import",
        ],
      ],
    );
    await read(
      await post(`${prefix}/customers/commands/preview`, request),
      403,
    );
    await read(await post(`${prefix}/recover`, recovery), 403);
    const mapping = await read(
      await post(`${prefix}/measurements/owner-mapping`, {
        namespace: ns,
        sourceCustomerId: "customer_001",
        sourceWearerId: "wearer_001",
      }),
      200,
    );
    const owner = await mapping.json();
    assert.ok(owner.customerId && owner.wearerId);
    const manifest = await read(
        await post(`${prefix}/measurements/manifest`, {
          schemaKey: "body_v1",
          schemaRef: { kind: "body", bundleVersion: "body-core-v1" },
        }),
        200,
        c.importManifest,
      ),
      template = await read(
        await post(`${prefix}/measurements/template`, {
          schemaKey: "body_v1",
          schemaRef: manifest.schemaRef,
        }),
        200,
      );
    assert.match(template.headers.get("content-disposition"), /attachment/);
    const csv = await template.text();
    assert.match(csv, /values_json/);
    const binding = {
        schemaKey: "body_v1",
        sourceRef: manifest.schemaRef,
        targetRef: manifest.schemaRef,
        mappings: [],
      },
      measurement = await read(
        await post(
          `${prefix}/measurements/commands/preview`,
          invoke({ namespace: ns, csv, bindings: [binding] }),
        ),
        200,
        c.importResponse,
      );
    let row = await read(
      await post(`${prefix}/measurements/status`, {
        batchId: measurement.result.batchId,
      }),
      200,
      c.importBatch,
    );
    await read(
      await post(
        `${prefix}/measurements/commands/decide`,
        invoke({
          batchId: row.id,
          recordId: row.items[0].id,
          expectedRevision: 1,
          decision: { kind: "owner", ...owner },
          bindings: [binding],
        }),
      ),
      200,
      c.importResponse,
    );
    row = await read(
      await post(`${prefix}/measurements/chunk`, { batchId: row.id }),
      200,
      c.importBatch,
    );
    assert.equal(row.counts.created, 1);
    assert.equal(row.items[0].counts.versions, 1);
    const page = await fetch(
      base + workspacePath.replace("/api", "") + "/measurements/import",
      { headers: { cookie } },
    );
    assert.equal(page.status, 200);
    assert.ok((await page.text()).includes("Import measurement histories"));
  } finally {
    await admin.query(
      "DELETE FROM app.permission_grants WHERE tenant_id=$1 AND role_id=$2",
      [tenant, role.id],
    );
    await admin.query(
      "INSERT INTO app.permission_grants SELECT $1,$2,unnest($3::text[])",
      [tenant, role.id, permissions],
    );
    await reset();
  }
  console.log(
    "Supported import HTTP passed: full 200-row private preview above the interactive body limit, no business dry-run writes, typed decisions, atomic groups, canonical source maps, current format-specific permissions, read-only recovery after expiry/quota/lease, private downloads and 400/401/403/404/413/429 bounds.",
  );
}
