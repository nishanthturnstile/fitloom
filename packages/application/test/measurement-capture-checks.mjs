import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { withScope } from "@fitloom/db";
import { sql } from "drizzle-orm";
import { createMasterService } from "../dist/index.js";
import { bodyCoreV1 } from "../dist/measurement-body-schema.js";
import { measuredOnAllowed } from "../dist/measurement-contracts.js";

const invoke = (payload) => ({
  payload,
  operationKey: randomUUID(),
  correlationId: randomUUID(),
});
const rejected =
  (...codes) =>
  (error) =>
    codes.includes(error?.code) ||
    codes.includes(error?.category) ||
    codes.includes(error?.cause?.code);
const noLeakedFields = (data) => {
  if (data && typeof data === "object")
    for (const [key, value] of Object.entries(data)) {
      assert.ok(
        ![
          "photos",
          "fileId",
          "reservationId",
          "objectKey",
          "url",
          "recordedByLabel",
          "revision",
          "archivedAt",
          "currentVersionId",
          "effectiveActive",
          "baseRate",
          "rates",
          "services",
          "addons",
          "constructionGroups",
          "orderId",
          "orderNumber",
        ].includes(key),
        key,
      );
      noLeakedFields(value);
    }
};
export async function exerciseMeasurementCapture({
  t,
  admin,
  web,
  a,
  b,
  payload,
  owner,
  actor,
}) {
  const exact = (p) => ({
    ...owner,
    profileId: p.profileId,
    versionId: p.versionId,
  });
  const run = (name, p) => a.service.command(name, a.target, invoke(p));
  await t.test(
    "exact capture requires a version at the service and SQL boundaries",
    async () => {
      const p = payload();
      await run("measurement.create", p);
      for (const versionId of [undefined, null])
        await assert.rejects(
          async () => a.service.capture(a.target, { ...exact(p), versionId }),
          rejected("validation"),
        );
      await assert.rejects(
        withScope(web, a.scope, (db) =>
          db.execute(
            sql`SELECT app.measurement_capture(${owner.customerId}::uuid,${owner.wearerId}::uuid,${p.profileId}::uuid,NULL::uuid)`,
          ),
        ),
        rejected("FM004"),
      );
      await assert.rejects(
        a.service.capture(a.target, { ...exact(p), versionId: randomUUID() }),
        rejected("unavailable"),
      );
      const captured = await a.service.capture(a.target, exact(p));
      assert.deepEqual(captured.eligibility, {
        effectiveActive: true,
        currentVersion: true,
        schemaActive: true,
        currentSchema: true,
      });
      noLeakedFields(captured.immutable);
      assert.equal(captured.immutable.document.values[0].decimal, "38.250000");
      assert.equal(captured.immutable.document.values[0].unit, "in");
      assert.equal(captured.immutable.recordedBy, a.principalId);
    },
  );
  await t.test(
    "capture retains exact content as current measurement, author labels, schemas and lifecycle change",
    async () => {
      const masters = createMasterService({
        pool: web,
        resolveIdentity: async () => ({ principalId: a.principalId }),
      });
      const section = randomUUID(),
        field = {
          ...bodyCoreV1().fields[0],
          id: randomUUID(),
          sectionId: section,
          semanticId: null,
          label: "Saved finished chest",
          basis: "garment",
        };
      const definition = {
        formatVersion: 1,
        label: "Capture garment",
        category: "Fixture",
        applicability: "unspecified",
        iconId: null,
        help: "Saved guidance",
        illustrationId: null,
        sections: [{ id: section, label: "Dimensions" }],
        fields: [field],
        constructionGroups: [],
        services: [],
        addons: [],
        sourceVersionId: null,
      };
      const made = await masters.command(
        "garment.save",
        a.target,
        invoke({
          mode: "create",
          definition,
          baseRate: "100.00",
          currency: "INR",
          serviceOverrides: [],
        }),
      );
      const schemaRef = {
        kind: "garment",
        garmentId: made.result.garmentId,
        versionId: made.result.garmentVersionId,
      };
      const p = payload("1", {
        schemaRef,
        values: [
          {
            kind: "length",
            fieldId: field.id,
            decimal: "40.250000",
            unit: "in",
          },
        ],
      });
      await run("measurement.create", p);
      const before = await a.service.capture(a.target, exact(p));
      const frozen = JSON.stringify(before.immutable);
      const changed = await run("measurement.revise", {
        ...p,
        versionId: randomUUID(),
        expectedRevision: 1,
        values: [{ ...p.values[0], decimal: "102.870000", unit: "cm" }],
      });
      let after = await a.service.capture(a.target, exact(p));
      assert.equal(JSON.stringify(after.immutable), frozen);
      assert.deepEqual(after.eligibility, {
        effectiveActive: true,
        currentVersion: false,
        schemaActive: true,
        currentSchema: true,
      });
      const originalName = (
        await admin.query('SELECT name FROM public."user" WHERE id=$1', [
          a.principalId,
        ])
      ).rows[0].name;
      try {
        await admin.query('UPDATE public."user" SET name=$1 WHERE id=$2', [
          "Renamed recording staff",
          a.principalId,
        ]);
        assert.equal(
          (await a.service.detail(a.target, exact(p))).recordedByLabel,
          "Renamed recording staff",
        );
        assert.equal(
          JSON.stringify(
            (await a.service.capture(a.target, exact(p))).immutable,
          ),
          frozen,
        );
      } finally {
        await admin.query('UPDATE public."user" SET name=$1 WHERE id=$2', [
          originalName,
          a.principalId,
        ]);
      }
      const advanced = await masters.command(
        "garment.save",
        a.target,
        invoke({
          mode: "update",
          garmentId: schemaRef.garmentId,
          expectedVersion: made.result.version,
          definition: {
            ...definition,
            label: "Current renamed garment",
            fields: [{ ...field, label: "Current renamed dimension" }],
            sourceVersionId: schemaRef.versionId,
          },
          baseRate: "999.99",
          currency: "INR",
          serviceOverrides: [],
        }),
      );
      after = await a.service.capture(a.target, exact(p));
      assert.equal(JSON.stringify(after.immutable), frozen);
      assert.equal(after.eligibility.currentSchema, false);
      await masters.command(
        "garment.lifecycle",
        a.target,
        invoke({
          garmentId: schemaRef.garmentId,
          expectedVersion: advanced.result.version,
          active: false,
        }),
      );
      await run("measurement.archive", {
        ...owner,
        profileId: p.profileId,
        expectedRevision: changed.result.revision,
      });
      after = await a.service.capture(a.target, exact(p));
      assert.equal(JSON.stringify(after.immutable), frozen);
      assert.deepEqual(after.eligibility, {
        effectiveActive: false,
        currentVersion: false,
        schemaActive: false,
        currentSchema: false,
      });
      noLeakedFields(after.immutable);
      assert.equal(
        after.immutable.document.schema.fields[0].label,
        "Saved finished chest",
      );
      await assert.rejects(
        b.service.capture(b.target, exact(p)),
        rejected("unavailable"),
      );
      await assert.rejects(
        a.service.capture(b.target, exact(p)),
        rejected("denied"),
      );
      const grants = (
        await admin.query(
          "SELECT permission,role_id FROM app.permission_grants WHERE tenant_id=$1 AND role_id IN (SELECT role_id FROM app.location_grants g JOIN app.memberships m ON m.id=g.membership_id WHERE m.principal_id=$2 AND g.location_id=$3) AND permission='measurements.read'",
          [a.target.tenantId, a.principalId, a.target.locationId],
        )
      ).rows;
      await admin.query(
        "DELETE FROM app.permission_grants WHERE tenant_id=$1 AND role_id=ANY($2::uuid[]) AND permission='measurements.read'",
        [a.target.tenantId, grants.map((g) => g.role_id)],
      );
      try {
        await assert.rejects(
          a.service.capture(a.target, exact(p)),
          rejected("denied"),
        );
      } finally {
        for (const g of grants)
          await admin.query(
            "INSERT INTO app.permission_grants VALUES($1,$2,$3) ON CONFLICT DO NOTHING",
            [a.target.tenantId, g.role_id, g.permission],
          );
      }
    },
  );
  await t.test(
    "shop-local dates cross midnight in both offset directions without a UTC fallback",
    async () => {
      for (const [timezone, instant, today, tomorrow] of [
        ["Asia/Kolkata", "2026-01-01T18:29:59Z", "2026-01-01", "2026-01-02"],
        ["Asia/Kolkata", "2026-01-01T18:30:00Z", "2026-01-02", "2026-01-03"],
        [
          "America/Los_Angeles",
          "2026-01-02T07:59:59Z",
          "2026-01-01",
          "2026-01-02",
        ],
        [
          "America/Los_Angeles",
          "2026-01-02T08:00:00Z",
          "2026-01-02",
          "2026-01-03",
        ],
      ]) {
        const local = (
          await admin.query(
            "SELECT to_char(($1::timestamptz AT TIME ZONE $2)::date,'YYYY-MM-DD') AS today",
            [instant, timezone],
          )
        ).rows[0].today;
        assert.equal(local, today);
        assert.equal(measuredOnAllowed(today, local), true);
        assert.equal(measuredOnAllowed(tomorrow, local), false);
      }
    },
  );
  await t.test(
    "every retained import command claim is actor and location bound before replay",
    async () => {
      const locationId = randomUUID(),
        peer = await actor(),
        membership = randomUUID();
      const grant = (
        await admin.query(
          "SELECT g.* FROM app.location_grants g JOIN app.memberships m ON m.id=g.membership_id WHERE m.principal_id=$1 AND g.location_id=$2",
          [a.principalId, a.target.locationId],
        )
      ).rows[0];
      await admin.query(
        "INSERT INTO app.locations(id,tenant_id,name) VALUES($1,$2,'Capture claim fixture')",
        [locationId, a.target.tenantId],
      );
      await admin.query("INSERT INTO app.location_grants VALUES($1,$2,$3,$4)", [
        a.target.tenantId,
        grant.membership_id,
        locationId,
        grant.role_id,
      ]);
      await admin.query(
        "INSERT INTO app.memberships(id,tenant_id,principal_id) VALUES($1,$2,$3)",
        [membership, a.target.tenantId, peer],
      );
      await admin.query("INSERT INTO app.location_grants VALUES($1,$2,$3,$4)", [
        a.target.tenantId,
        membership,
        a.target.locationId,
        grant.role_id,
      ]);
      for (const family of ["customer-import", "measurement-import"])
        for (const action of [
          "preview",
          "decide",
          "commit-row",
          "attempt-outcome",
          "cancel",
        ]) {
          const name = `${family}.${action}`,
            key = randomUUID(),
            hash = `v1:${"0".repeat(64)}`,
            correlation = randomUUID();
          const claim = (scope) =>
            withScope(web, scope, async (db) => {
              const result = await db.execute(
                sql`SELECT * FROM app.claim_operation('tenant',${name},${key},${hash},${correlation}::uuid)`,
              );
              if (result.rows[0].result === null)
                await db.execute(
                  sql`SELECT app.finish_operation('{"verified":true}'::jsonb,'import_claim_fixture',${key}::uuid,'scope binding',NULL,NULL,'[]'::jsonb,ARRAY['scope'])`,
                );
              return result;
            });
          await claim(a.scope);
          await assert.rejects(
            claim({ ...a.scope, principalId: peer }),
            rejected("FC007"),
          );
          await assert.rejects(
            claim({ ...a.scope, locationId }),
            rejected("FC007"),
          );
        }
    },
  );
}
