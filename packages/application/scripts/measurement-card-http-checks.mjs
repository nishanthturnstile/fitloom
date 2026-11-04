import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createPool } from "@fitloom/db";
import decodeQR from "qr/decode.js";
import sharp from "sharp";
import { createMeasurementCardService } from "../dist/index.js";
import * as c from "../dist/measurement-card-contracts.js";
export async function measurementCardHttpChecks({
  base,
  prefix,
  cookie,
  owner,
  payload,
  admin,
  tenant,
}) {
  const issuer = randomUUID(),
    role = randomUUID(),
    membership = randomUUID(),
    location = prefix.split("/")[4];
  await admin.query(
    "INSERT INTO public.\"user\"(id,name,email,email_verified) VALUES($1,'HTTP card issuer',$2,true)",
    [issuer, `${issuer}@example.test`],
  );
  await admin.query(
    "INSERT INTO app.principals(id,auth_user_id) VALUES($1::uuid,$1::text)",
    [issuer],
  );
  await admin.query(
    "INSERT INTO app.memberships(id,tenant_id,principal_id) VALUES($1,$2,$3)",
    [membership, tenant, issuer],
  );
  await admin.query(
    "INSERT INTO app.roles(id,tenant_id,name) VALUES($1,$2,'HTTP card issuing role')",
    [role, tenant],
  );
  await admin.query(
    "INSERT INTO app.permission_grants SELECT $1,$2,p FROM unnest(ARRAY['workspace.read','customers.read','measurements.read','measurements.cards.manage']) p",
    [tenant, role],
  );
  await admin.query(
    "INSERT INTO app.location_grants(tenant_id,membership_id,location_id,role_id) VALUES($1,$2,$3,$4)",
    [tenant, membership, location, role],
  );
  const web = createPool({
    connectionString: process.env.TEST_WEB_DATABASE_URL,
    purpose: "web",
    max: 1,
  });
  const cards = createMeasurementCardService({
    pool: web,
    resolveIdentity: async () => ({ principalId: issuer }),
  });
  const selections = [
      {
        profileId: payload.profileId,
        versionId: payload.versionId,
        fieldIds: [payload.values[0].fieldId],
      },
    ],
    target = { tenantId: tenant, locationId: location };
  const issued = await cards.command("measurement-card.create", target, {
    payload: { ...owner, selections, expiresInDays: 7 },
    operationKey: randomUUID(),
    correlationId: randomUUID(),
  });
  const id = issued.result.cardId,
    path = `/measurement-cards/${id}`,
    api = `/api/measurement-cards/${id}`;
  const get = (url, selectedCookie = cookie) =>
    fetch(base + url, {
      headers: { cookie: selectedCookie },
      redirect: "manual",
    });
  const expect = async (response, status) => {
    assert.equal(response.status, status, await response.clone().text());
    assert.match(response.headers.get("cache-control"), /no-store/);
    assert.equal(response.headers.get("referrer-policy"), "no-referrer");
    return response;
  };
  const original = c.measurementCardResolved.parse(
    await (await expect(await get(api), 200)).json(),
  );
  assert.equal(original.items[0].values.length, 1);
  assert.equal(original.items[0].values[0].decimal, "38.250000");
  assert.ok(!JSON.stringify(original).includes("notes"));
  assert.ok(!JSON.stringify(original).includes(payload.values[0].fieldId));
  const png = await expect(await get(`${api}/qr.png`), 200);
  assert.equal(png.headers.get("content-type"), "image/png");
  const { data, info } = await sharp(Buffer.from(await png.arrayBuffer()))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const decoded = decodeQR({ data, width: info.width, height: info.height });
  assert.equal(decoded, base + path);
  const html = await (
    await expect(await get(new URL(decoded).pathname), 200)
  ).text();
  assert.ok(html.includes("Verify before cutting"));
  assert.ok(html.includes("38.250000 in"));
  assert.ok(!html.includes("Waist circumference"));
  assert.ok(!html.includes(payload.values[0].fieldId));
  assert.ok(!html.includes("Private fitting notes"));
  assert.ok(!html.includes("<script>inert text"));
  const anonymous = await expect(await get(path, ""), 303);
  assert.equal(anonymous.headers.get("location"), `${base}/account?card=${id}`);
  await expect(await get(api, ""), 401);
  await expect(await get("/measurement-cards/not-a-uuid", ""), 404);
  await expect(await get(`${api}?tenant=${randomUUID()}`), 404);
  const unknown = await expect(
      await get(`/measurement-cards/${randomUUID()}`),
      404,
    ),
    bad = await expect(await get("/measurement-cards/not-a-uuid"), 404);
  assert.equal(await unknown.text(), await bad.text());
  const admission = await admin.query(
    "UPDATE app.measurement_card_admissions SET window_started_at=now(),requests=30 WHERE principal_id=(SELECT created_by FROM app.customers WHERE id=$1 AND tenant_id=$2) RETURNING principal_id",
    [owner.customerId, tenant],
  );
  assert.equal(admission.rowCount, 1);
  try {
    for (const route of [path, api]) {
      const limited = await expect(await get(route), 429);
      assert.equal(limited.headers.get("retry-after"), "60");
      assert.ok(!(await limited.text()).includes("38.250000"));
    }
  } finally {
    await admin.query(
      "UPDATE app.measurement_card_admissions SET requests=0 WHERE principal_id=$1",
      [admission.rows[0].principal_id],
    );
  }
  await web.end();
  return {
    cardId: id,
    issuerId: issuer,
    roleId: role,
    async reader() {
      const read = c.measurementCardResolved.parse(
        await (await expect(await get(api), 200)).json(),
      );
      assert.deepEqual(read, original);
      const denied = await fetch(
        `${base}${prefix}/commands/measurement-card.create`,
        {
          method: "POST",
          headers: { cookie, origin: base, "Content-Type": "application/json" },
          body: JSON.stringify({
            payload: { ...owner, selections, expiresInDays: 7 },
            operationKey: randomUUID(),
            correlationId: randomUUID(),
          }),
        },
      );
      assert.equal(denied.status, 403);
    },
    async archive() {
      await expect(await get(new URL(decoded).pathname), 404);
      assert.equal(
        (
          await admin.query(
            "SELECT revoked_at IS NOT NULL AS revoked FROM app.measurement_cards WHERE id=$1",
            [id],
          )
        ).rows[0].revoked,
        true,
      );
    },
    async finish() {
      await expect(await get(path), 404);
      await expect(await get(`${api}/qr.png`), 404);
      console.log(
        "Measurement card HTTP passed: actual PNG decode/resolution, fixed one-field projection, current reader/issuer scope, allowlisted sign-in return, uniform unavailable responses, private 429/Retry-After headers and archive/restore non-reactivation.",
      );
    },
  };
}
