import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  customerDetail,
  customerErrorResponse,
  customerPage,
  customerResponse,
} from "../dist/customer-contracts.js";
import { customerPhone } from "../dist/customer-phone.js";

// Use the existing authenticated optimized-app fixture; no extra server or database.
export async function customerHttpChecks({
  base,
  workspacePath,
  api,
  cookie,
  admin,
}) {
  const path = `${workspacePath}/customers`;
  const json = async (response, status, schema) => {
    assert.equal(response.status, status, await response.clone().text());
    assert.ok(response.headers.get("cache-control")?.includes("no-store"));
    return schema.parse(await response.json());
  };
  const prefs = {
    fit: "😀".repeat(1000),
    fabric: "😀".repeat(1000),
    design: "😀".repeat(1000),
  };
  const profile = {
    name: "😀".repeat(120),
    phone: customerPhone.parse({
      countryCode: "IN",
      display: `+91${" ".repeat(51)}9876543210`,
    }),
    email: `${"a".repeat(64)}@${"b".repeat(63)}.${"c".repeat(63)}.${"d".repeat(61)}`,
    address: {
      line1: "😀".repeat(200),
      line2: "😀".repeat(200),
      city: "😀".repeat(100),
      region: "😀".repeat(100),
      postalCode: "😀".repeat(32),
      countryCode: "IN",
    },
    taxCountryCode: "IN",
    gstin: "33ABCDE1234F1Z5",
    segment: "regular",
    notes: "😀".repeat(2000),
    preferences: prefs,
    tags: Array.from(
      { length: 20 },
      (_, i) => String(i).padStart(2, "0") + "😀".repeat(38),
    ),
  };
  const payload = {
    profile,
    selfWearer: {
      kind: "self",
      attributes: {
        relationship: "😀".repeat(60),
        birthday: "2000-01-01",
        gender: { kind: "self-described", description: "😀".repeat(60) },
        height: { value: "118.110236", unit: "in" },
        weight: { value: "1543.235835", unit: "lb" },
        notes: "😀".repeat(2000),
        preferences: prefs,
      },
    },
    intent: { kind: "check-first" },
  };
  const key = randomUUID();
  const created = await json(
    await api(`${path}/commands/customer.create`, payload, key),
    200,
    customerResponse,
  );
  assert.equal(created.outcome, "saved");
  const detail = await json(
    await fetch(`${base}${path}/${created.result.customerId}`, {
      headers: { cookie },
    }),
    200,
    customerDetail,
  );
  assert.equal(detail.profile.notes, profile.notes);
  assert.equal(detail.wearers.total, 1);
  const replay = await json(
    await api(`${path}/commands/customer.create`, payload, key),
    200,
    customerResponse,
  );
  assert.deepEqual(replay.result, created.result);
  const review = await json(
    await api(`${path}/commands/customer.create`, {
      ...payload,
      selfWearer: { kind: "none" },
    }),
    409,
    customerResponse,
  );
  assert.equal(review.outcome, "review-required");
  assert.equal(review.review.candidateCount, 1);
  const post = (body) =>
    fetch(`${base}${path}/search`, {
      method: "POST",
      headers: { cookie, origin: base, "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  assert.equal(
    (
      await json(
        await post({ search: "😀", tags: [profile.tags[0]] }),
        200,
        customerPage,
      )
    ).total,
    1,
  );
  const invalid = await json(
    await post({ search: "abc\u0000def" }),
    400,
    customerErrorResponse,
  );
  assert.equal(invalid.code, "validation");
  assert.equal(
    (await json(await fetch(`${base}${path}`), 401, customerErrorResponse))
      .code,
    "session-expired",
  );
  const tooLarge = await fetch(`${base}${path}/commands/customer.create`, {
    method: "POST",
    headers: { cookie, origin: base, "content-type": "application/json" },
    body: " ".repeat(131073),
  });
  assert.equal(
    (await json(tooLarge, 413, customerErrorResponse)).code,
    "body-too-large",
  );
  assert.equal(
    (
      await json(
        await fetch(`${base}${path}?search=private`, { headers: { cookie } }),
        400,
        customerErrorResponse,
      )
    ).code,
    "validation",
  );
  const original = (
    await admin.query("SELECT * FROM app.customers WHERE id=$1", [
      created.result.customerId,
    ])
  ).rows[0];
  const lateId = randomUUID(),
    lateName = "ZZZ beyond 500 % _";
  await admin.query(
    "INSERT INTO app.customers(id,tenant_id,location_id,name,created_by,updated_by,creation_operation_id,segment,phone_display,phone_country_code,phone_e164,archived_at,archived_by) SELECT CASE WHEN n=502 THEN $1::uuid ELSE gen_random_uuid() END,$2,$3,CASE WHEN n=502 THEN $4 ELSE 'Directory fixture '||lpad(n::text,4,'0') END,$5,$5,$6,CASE WHEN n=502 THEN 'important' ELSE 'regular' END,CASE WHEN n=502 THEN '98765 43219' END,CASE WHEN n=502 THEN 'IN' END,CASE WHEN n=502 THEN '+919876543219' END,CASE WHEN n=501 THEN now() END,CASE WHEN n=501 THEN $5::uuid END FROM generate_series(1,502) n",
    [
      lateId,
      original.tenant_id,
      original.location_id,
      lateName,
      original.created_by,
      original.creation_operation_id,
    ],
  );
  await admin.query(
    "INSERT INTO app.customer_tags(tenant_id,location_id,customer_id,label) VALUES($1,$2,$3,'Family'),($1,$2,$3,'Priority')",
    [original.tenant_id, original.location_id, lateId],
  );
  const directory = await json(
    await fetch(`${base}${path}`, { headers: { cookie } }),
    200,
    customerPage,
  );
  assert.equal(directory.total, 502);
  assert.equal(directory.items.length, 25);
  assert.equal(directory.nextOffset, 25);
  for (const search of ["beyond 500", "9876543219", "%", "_"]) {
    const found = await json(await post({ search }), 200, customerPage);
    assert.equal(found.total, 1);
    assert.equal(found.items[0].id, lateId);
  }
  const tagged = await json(
    await post({ tags: ["Family", "Priority"] }),
    200,
    customerPage,
  );
  assert.equal(tagged.total, 1);
  assert.equal(tagged.items[0].id, lateId);
  const readOnlyLocation = randomUUID(),
    crmOnlyLocation = randomUUID(),
    readOnlyRole = randomUUID(),
    crmRole = randomUUID();
  await admin.query(
    "INSERT INTO app.locations(id,tenant_id,name) VALUES($1,$3,'Navigation read-only'),($2,$3,'Navigation CRM-only')",
    [readOnlyLocation, crmOnlyLocation, original.tenant_id],
  );
  await admin.query(
    "INSERT INTO app.roles(id,tenant_id,name) VALUES($1,$3,'Navigation viewer'),($2,$3,'Customer reader')",
    [readOnlyRole, crmRole, original.tenant_id],
  );
  await admin.query(
    "INSERT INTO app.permission_grants(tenant_id,role_id,permission) VALUES($1,$2,'workspace.read'),($1,$3,'workspace.read'),($1,$3,'customers.read')",
    [original.tenant_id, readOnlyRole, crmRole],
  );
  const membership = (
    await admin.query(
      "SELECT id FROM app.memberships WHERE tenant_id=$1 AND principal_id=$2",
      [original.tenant_id, original.created_by],
    )
  ).rows[0].id;
  await admin.query(
    "INSERT INTO app.location_grants(tenant_id,membership_id,location_id,role_id) VALUES($1,$2,$3,$4),($1,$2,$5,$6)",
    [
      original.tenant_id,
      membership,
      readOnlyLocation,
      readOnlyRole,
      crmOnlyLocation,
      crmRole,
    ],
  );
  const switchTo = (locationId, destination) =>
    fetch(`${base}/api/workspaces/switch`, {
      method: "POST",
      headers: { cookie, origin: base, "content-type": "application/json" },
      body: JSON.stringify({
        operationKey: randomUUID(),
        correlationId: randomUUID(),
        locale: "en",
        target: { tenantId: original.tenant_id, locationId },
        destination,
      }),
    });
  for (const destination of [
    { kind: "customers" },
    { kind: "catalog", catalog: "addon" },
  ]) {
    const response = await switchTo(readOnlyLocation, destination);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      destination: `/workspaces/${original.tenant_id}/${readOnlyLocation}`,
    });
  }
  const crmSwitch = await switchTo(crmOnlyLocation, { kind: "customers" });
  assert.equal(
    (await crmSwitch.json()).destination,
    `/workspaces/${original.tenant_id}/${crmOnlyLocation}/customers`,
  );
  assert.equal(
    (
      await switchTo(crmOnlyLocation, {
        kind: "customers",
        url: "https://outside.invalid",
      })
    ).status,
    400,
  );
  await switchTo(original.location_id, { kind: "home" });
  console.log(
    "Customer directory/navigation HTTP passed: >500 rows, bounded page/count, literal wildcards, AND tags, current target permissions and switch allowlist.",
  );
  console.log(
    `Customer HTTP protocol passed: maximal Unicode save (${Buffer.byteLength(JSON.stringify({ operationKey: key, correlationId: randomUUID(), payload }))} bytes), replay, typed duplicate review, private POST search, 400/401/413.`,
  );
  return { lateId, lateName, readOnlyLocation, crmOnlyLocation, total: 502 };
}
