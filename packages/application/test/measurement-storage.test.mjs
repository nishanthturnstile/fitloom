import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import test from "node:test";
import { createPool, schema, withScope } from "@fitloom/db";
import { sql } from "drizzle-orm";
import { getTableConfig } from "drizzle-orm/pg-core";
import { migrateDatabase } from "../../db/scripts/migrate.mjs";
import {
  createCustomerService,
  createMasterService,
  createMeasurementService,
  createRole,
  createWorkspaceService,
  provisionTenant,
  saveSetupDraft,
} from "../dist/index.js";
import { createStarterBundle } from "../dist/master-starters.js";
import { bodyCoreV1 } from "../dist/measurement-body-schema.js";
import * as c from "../dist/measurement-contracts.js";
import {
  changeRolePermission,
  customRoleInput,
  workspacePermission,
} from "../dist/workspace-contracts.js";
import { exerciseMeasurementCapture } from "./measurement-capture-checks.mjs";
import { exerciseMeasurementCards } from "./measurement-card-checks.mjs";
import { exerciseMeasurementPhotos } from "./measurement-photo-checks.mjs";

for (const purpose of ["MIGRATOR", "WEB", "WORKER"]) {
  const url = new URL(process.env[`TEST_${purpose}_DATABASE_URL`]);
  if (
    url.pathname !== "/fitloom_test" ||
    url.username !== `fitloom_test_${purpose.toLowerCase()}` ||
    !["127.0.0.1", "postgres"].includes(url.hostname)
  )
    throw Error("Guarded test database required");
}
const invoke = (payload) => ({
  payload,
  operationKey: randomUUID(),
  correlationId: randomUUID(),
});
const code = (expected) => (error) =>
  error?.code === expected ||
  error?.cause?.code === expected ||
  error?.category === expected;
await test("measurement storage, current authority and immutable history", async (t) => {
  const admin = createPool({
    connectionString: process.env.TEST_MIGRATOR_DATABASE_URL,
    purpose: "web",
    max: 2,
  });
  const web = createPool({
    connectionString: process.env.TEST_WEB_DATABASE_URL,
    purpose: "web",
    max: 4,
  });
  const worker = createPool({
    connectionString: process.env.TEST_WORKER_DATABASE_URL,
    purpose: "worker",
    max: 1,
  });
  const lease = await admin.connect();
  try {
    await lease.query("SELECT pg_advisory_lock(68122902)");
    await migrateDatabase(process.env.TEST_MIGRATOR_DATABASE_URL);
    async function actor() {
      const id = randomUUID();
      await admin.query(
        'INSERT INTO public."user"(id,name,email,email_verified) VALUES($1,$1,$2,true)',
        [id, `${id}@example.test`],
      );
      await admin.query(
        "INSERT INTO app.principals(id,auth_user_id) VALUES($1::uuid,$1::text)",
        [id],
      );
      return id;
    }
    async function shop() {
      const principalId = await actor();
      const workspace = createWorkspaceService({
        pool: web,
        resolveIdentity: async () => ({ principalId }),
      });
      const profile = {
        shopName: "Measurement fixture",
        locationName: "Main",
        businessMode: "tailoring",
        ownerName: "Fixture",
        ownerPhone: "+919876543210",
        address: "Synthetic street",
        timezone: "Asia/Kolkata",
        consentAccepted: true,
        consentVersion: "workspace-authority-v1",
      };
      await workspace.execute(saveSetupDraft, {
        ...invoke({ ...profile, expectedVersion: 0 }),
        scope: { kind: "principal" },
      });
      await workspace.execute(provisionTenant, {
        ...invoke({ ...profile, expectedVersion: 1 }),
        scope: { kind: "principal" },
      });
      const choice = (await workspace.choices())[0];
      const target = {
        tenantId: choice.tenantId,
        locationId: choice.locationId,
      };
      const scope = { kind: "tenant", principalId, ...target };
      const service = createMeasurementService({
        pool: web,
        resolveIdentity: async () => ({ principalId }),
      });
      const roleOp = await workspace.execute(createRole, {
        ...invoke({
          name: "Measuring staff",
          permissions: changeRolePermission([], "measurements.manage", true),
        }),
        scope: { kind: "tenant", ...target },
      });
      const roleId = roleOp.result.roleId;
      const customerId = randomUUID(),
        wearerId = randomUUID();
      await admin.query(
        "INSERT INTO app.customers(id,tenant_id,location_id,name,created_by,updated_by,creation_operation_id) VALUES($1,$2,$3,'Synthetic customer',$4,$4,$5)",
        [
          customerId,
          target.tenantId,
          target.locationId,
          principalId,
          roleOp.operationId,
        ],
      );
      await admin.query(
        "INSERT INTO app.customer_wearers(id,tenant_id,location_id,customer_id,name,created_by,updated_by,creation_operation_id) VALUES($1,$2,$3,$4,'Named wearer',$5,$5,$6)",
        [
          wearerId,
          target.tenantId,
          target.locationId,
          customerId,
          principalId,
          roleOp.operationId,
        ],
      );
      return {
        principalId,
        workspace,
        target,
        scope,
        service,
        roleId,
        customerId,
        wearerId,
        roleOp,
      };
    }
    const a = await shop(),
      b = await shop();
    const owner = { customerId: a.customerId, wearerId: a.wearerId };
    const schemaRef = { kind: "body", bundleVersion: "body-core-v1" };
    const query = (profileId, versionId = null) => ({
      ...owner,
      profileId,
      versionId,
    });
    const payload = (decimal = "38.250000", extra = {}) => ({
      ...owner,
      profileId: randomUUID(),
      versionId: randomUUID(),
      schemaRef,
      label: "Daily body",
      measuredOn: "2020-01-02",
      values: [
        {
          kind: "length",
          fieldId: bodyCoreV1().fields[0].id,
          decimal,
          unit: "in",
        },
      ],
      customFields: [],
      notes: "Private fitting notes",
      sourceNote: null,
      origin: { kind: "manual" },
      ...extra,
    });
    const run = (name, p) => a.service.command(name, a.target, invoke(p));
    async function raw(p, name = "measurement.create") {
      return withScope(web, a.scope, async (db) => {
        await db.execute(
          sql`SELECT * FROM app.claim_operation('tenant',${name},${randomUUID()},${`v1:${"a".repeat(64)}`},${randomUUID()}::uuid)`,
        );
        return (
          await db.execute(
            sql`SELECT app.measurement_mutate(${name},${JSON.stringify(p)}::jsonb) AS value`,
          )
        ).rows[0].value;
      });
    }
    let first, second, saved, request, secondPayload;
    await t.test(
      "body publication matches the bundle and Owner alone receives all new grants",
      async () => {
        assert.deepEqual(await a.service.bodySchema(a.target), schemaRef);
        assert.deepEqual(
          await a.service.intakeSchema(a.target, schemaRef),
          bodyCoreV1(),
        );
        const body = (
          await admin.query(
            "SELECT * FROM app.measurement_body_schemas WHERE version='body-core-v1'",
          )
        ).rows[0];
        assert.deepEqual(body.definition, bodyCoreV1());
        assert.equal(
          body.canonical_hash,
          createHash("sha256")
            .update(JSON.stringify(bodyCoreV1()))
            .digest("hex"),
        );
        const granted = (
          await admin.query(
            "SELECT permission FROM app.permission_grants g JOIN app.roles r ON r.id=g.role_id WHERE r.tenant_id=$1 AND r.preset='owner'",
            [a.target.tenantId],
          )
        ).rows.map((r) => r.permission);
        for (const permission of c.MEASUREMENT_PERMISSIONS)
          assert.ok(granted.includes(permission));
        const presets = (
          await admin.query(
            "SELECT preset,array_agg(permission ORDER BY permission) permissions FROM app.roles r JOIN app.permission_grants g ON r.id=g.role_id WHERE r.tenant_id=$1 AND preset IN ('manager','staff') GROUP BY preset ORDER BY preset",
            [a.target.tenantId],
          )
        ).rows;
        assert.deepEqual(presets, [
          {
            preset: "manager",
            permissions: ["workspace.manage", "workspace.read"],
          },
          { preset: "staff", permissions: ["workspace.read"] },
        ]);
        assert.equal(workspacePermission.options.length, 26);
        assert.deepEqual(
          (
            await admin.query(
              "SELECT app.workspace_permissions() AS permissions",
            )
          ).rows[0].permissions,
          workspacePermission.options,
        );
        assert.equal(
          customRoleInput.safeParse({
            name: "All",
            permissions: workspacePermission.options,
          }).success,
          true,
        );
        for (const p of c.MEASUREMENT_PERMISSIONS) {
          const permissions = changeRolePermission([], p, true);
          assert.equal(
            customRoleInput.safeParse({ name: "Valid", permissions }).success,
            true,
          );
          assert.equal(
            customRoleInput.safeParse({
              name: "Invalid",
              permissions: ["workspace.read", p],
            }).success,
            false,
          );
        }
        await assert.rejects(
          a.workspace.execute(createRole, {
            ...invoke({
              name: "Incomplete",
              permissions: ["workspace.read", "measurements.manage"],
            }),
            scope: { kind: "tenant", ...a.target },
          }),
          code("validation"),
        );
      },
    );
    await t.test(
      "two saved versions retain exact values, schema, author and opaque audit/replay results",
      async () => {
        saved = payload();
        request = invoke(saved);
        first = await a.service.command(
          "measurement.create",
          a.target,
          request,
        );
        assert.deepEqual(first.result, {
          kind: "measurement-saved",
          correlationId: request.correlationId,
          profileId: saved.profileId,
          versionId: saved.versionId,
          revision: 1,
          sequence: 1,
          changed: true,
        });
        const original = await a.service.detail(
          a.target,
          query(saved.profileId, saved.versionId),
        );
        assert.equal(original.document.values[0].decimal, "38.250000");
        assert.equal(original.recordedBy, a.principalId);
        secondPayload = {
          ...saved,
          versionId: randomUUID(),
          expectedRevision: 1,
          values: [{ ...saved.values[0], decimal: "39.000000" }],
        };
        second = await run("measurement.revise", secondPayload);
        assert.equal(second.result.sequence, 2);
        assert.equal(second.result.revision, 2);
        const historical = await a.service.detail(
          a.target,
          query(saved.profileId, saved.versionId),
        );
        assert.deepEqual(historical.document, original.document);
        assert.equal(historical.recordedAt, original.recordedAt);
        assert.equal(
          (await a.service.detail(a.target, query(saved.profileId))).document
            .values[0].decimal,
          "39.000000",
        );
        const operations = (
          await admin.query(
            "SELECT result FROM app.command_operations WHERE id=ANY($1::uuid[])",
            [[first.operationId, second.operationId]],
          )
        ).rows;
        for (const { result } of operations)
          assert.deepEqual(Object.keys(result).sort(), [
            "changed",
            "correlationId",
            "kind",
            "profileId",
            "revision",
            "sequence",
            "versionId",
          ]);
        const audit = JSON.stringify(
          (
            await admin.query(
              "SELECT * FROM app.command_audit WHERE operation_id=$1",
              [first.operationId],
            )
          ).rows,
        );
        assert.ok(
          !audit.includes("38.25") && !audit.includes("Private fitting"),
        );
        await assert.rejects(
          run("measurement.revise", {
            ...secondPayload,
            versionId: randomUUID(),
          }),
          code("version-conflict"),
        );
      },
    );
    await t.test(
      "no-op, archive and restore advance header revision separately from content sequence",
      async () => {
        const noop = await run("measurement.revise", {
          ...secondPayload,
          versionId: randomUUID(),
          expectedRevision: 2,
        });
        assert.equal(noop.result.changed, false);
        assert.equal(noop.result.versionId, second.result.versionId);
        const lifecycle = {
          ...owner,
          profileId: saved.profileId,
          expectedRevision: 2,
        };
        const archived = await run("measurement.archive", lifecycle);
        assert.equal(archived.result.revision, 3);
        assert.equal(archived.result.sequence, 2);
        assert.equal(
          (
            await run("measurement.archive", {
              ...lifecycle,
              expectedRevision: 3,
            })
          ).result.changed,
          false,
        );
        await assert.rejects(
          run("measurement.archive", lifecycle),
          code("version-conflict"),
        );
        const replay = await a.service.command(
          "measurement.create",
          a.target,
          request,
        );
        assert.equal(replay.replayed, true);
        assert.deepEqual(replay.result, first.result);
        assert.equal(
          (await a.service.detail(a.target, query(saved.profileId)))
            .effectiveActive,
          false,
        );
        await run("measurement.restore", { ...lifecycle, expectedRevision: 3 });
        assert.equal(
          (await a.service.detail(a.target, query(saved.profileId))).revision,
          4,
        );
        assert.equal(
          (
            await a.service.history(a.target, {
              ...owner,
              profileId: saved.profileId,
            })
          ).items.length,
          2,
        );
      },
    );
    await t.test(
      "SQL independently rejects malformed, foreign, empty and out-of-range values",
      async () => {
        const bads = [
          payload("-0"),
          payload("1e2"),
          payload("1000000000000000000"),
          payload("0.0000001"),
          payload("1", { values: [] }),
          payload("1", {
            values: [
              {
                kind: "length",
                fieldId: randomUUID(),
                decimal: "1",
                unit: "in",
              },
            ],
          }),
          payload("1", {
            values: [
              {
                kind: "length",
                fieldId: bodyCoreV1().fields[0].id,
                decimal: "1",
                unit: "in",
                author: randomUUID(),
              },
            ],
          }),
          payload("1", { measuredOn: "2020-02-30" }),
          payload("1", { notes: 7 }),
          payload("1", { schema: { rates: [] } }),
        ];
        for (const p of bads) await assert.rejects(raw(p));
        const max = await run(
          "measurement.create",
          payload("999999999999999999.999999"),
        );
        assert.ok(max.result.changed);
        await assert.rejects(
          run("measurement.create", payload("1", { measuredOn: "9999-12-31" })),
          code("validation"),
        );
        const copied = payload("1", {
          origin: { kind: "copy", sourceVersionId: first.result.versionId },
        });
        await assert.rejects(
          run("measurement.create", copied),
          code("validation"),
        );
      },
    );
    await t.test(
      "custom identities retain meaning and retire once without historical mutation",
      async () => {
        const custom = {
          ...bodyCoreV1().fields[0],
          id: randomUUID(),
          semanticId: null,
          label: "Custom length",
        };
        const initial = payload("1", { customFields: [custom] });
        const result = await run("measurement.create", initial);
        await assert.rejects(
          run("measurement.revise", {
            ...initial,
            versionId: randomUUID(),
            expectedRevision: 1,
            customFields: [{ ...custom, basis: "garment" }],
          }),
          code("validation"),
        );
        await run("measurement.revise", {
          ...initial,
          versionId: randomUUID(),
          expectedRevision: 1,
          customFields: [],
        });
        await assert.rejects(
          run("measurement.revise", {
            ...initial,
            versionId: randomUUID(),
            expectedRevision: 2,
          }),
          code("validation"),
        );
        assert.equal(
          (
            await a.service.detail(
              a.target,
              query(result.result.profileId, result.result.versionId),
            )
          ).document.customFields[0].id,
          custom.id,
        );
        await assert.rejects(
          admin.query(
            "UPDATE app.measurement_custom_identities SET retired_sequence=NULL WHERE profile_id=$1",
            [initial.profileId],
          ),
          code("23514"),
        );
      },
    );
    await t.test(
      "runtime table/helper bypasses and privileged history/schema/pointer mutations are denied",
      async () => {
        for (const table of [
          "measurement_profiles",
          "measurement_versions",
          "measurement_body_schemas",
          "measurement_body_schema_state",
          "measurement_custom_identities",
        ]) {
          await assert.rejects(
            withScope(web, a.scope, (db) =>
              db.execute(sql.raw(`SELECT * FROM app.${table}`)),
            ),
            code("42501"),
          );
          await assert.rejects(
            withScope(web, a.scope, (db) =>
              db.execute(sql.raw(`INSERT INTO app.${table} DEFAULT VALUES`)),
            ),
            code("42501"),
          );
          await assert.rejects(
            withScope(worker, a.scope, (db) =>
              db.execute(sql.raw(`SELECT * FROM app.${table}`)),
            ),
            code("42501"),
          );
        }
        await assert.rejects(
          withScope(web, a.scope, (db) =>
            db.execute(
              sql`SELECT app.measurement_validate('{}','[]','[]','[]',true)`,
            ),
          ),
          code("42501"),
        );
        await assert.rejects(
          admin.query(
            "UPDATE app.measurement_versions SET measured_on='2020-01-03' WHERE id=$1",
            [first.result.versionId],
          ),
          code("23514"),
        );
        await assert.rejects(
          admin.query("DELETE FROM app.measurement_versions WHERE id=$1", [
            first.result.versionId,
          ]),
          code("23514"),
        );
        await assert.rejects(
          admin.query(
            "UPDATE app.measurement_body_schemas SET definition='{}' WHERE version='body-core-v1'",
          ),
          code("23514"),
        );
        await assert.rejects(
          admin.query(
            "UPDATE app.measurement_profiles SET wearer_id=$1 WHERE id=$2",
            [b.wearerId, saved.profileId],
          ),
          code("23514"),
        );
        const other = await run("measurement.create", payload());
        await assert.rejects(
          admin.query(
            "UPDATE app.measurement_profiles SET current_version_id=$1 WHERE id=$2",
            [other.result.versionId, saved.profileId],
          ),
          code("23503"),
        );
        await assert.rejects(
          raw(payload("1", { profileId: saved.profileId })),
          code("FM005"),
        );
        await assert.rejects(
          raw(payload("1", { versionId: first.result.versionId })),
          code("FM005"),
        );
      },
    );
    await t.test(
      "scope and actor binding, revoked authority and archived-parent replay remain current",
      async () => {
        await assert.rejects(
          b.service.detail(b.target, query(saved.profileId)),
          code("unavailable"),
        );
        await assert.rejects(
          a.service.detail(b.target, query(saved.profileId)),
          code("denied"),
        );
        const otherActor = await actor();
        const membership = randomUUID();
        await admin.query(
          "INSERT INTO app.memberships(id,tenant_id,principal_id) VALUES($1,$2,$3)",
          [membership, a.target.tenantId, otherActor],
        );
        await admin.query(
          "INSERT INTO app.location_grants(tenant_id,membership_id,location_id,role_id) VALUES($1,$2,$3,$4)",
          [a.target.tenantId, membership, a.target.locationId, a.roleId],
        );
        const measuring = createMeasurementService({
          pool: web,
          resolveIdentity: async () => ({ principalId: otherActor }),
        });
        assert.equal(
          (await measuring.detail(a.target, query(saved.profileId))).document
            .values.length,
          1,
        );
        assert.deepEqual(
          await measuring.intakeSchema(a.target, schemaRef),
          bodyCoreV1(),
        );
        await assert.rejects(
          measuring.command("measurement.create", a.target, request),
          code("operation-conflict"),
        );
        await assert.rejects(
          measuring.command(
            "measurement.archive",
            a.target,
            invoke({
              ...owner,
              profileId: saved.profileId,
              expectedRevision: 4,
            }),
          ),
          code("denied"),
        );
        const ownRequest = invoke(payload());
        await measuring.command("measurement.create", a.target, ownRequest);
        await admin.query(
          "DELETE FROM app.permission_grants WHERE role_id=$1 AND permission='measurements.manage'",
          [a.roleId],
        );
        await assert.rejects(
          measuring.command("measurement.create", a.target, ownRequest),
          code("denied"),
        );
        const crm = createCustomerService({
          pool: web,
          resolveIdentity: async () => ({ principalId: a.principalId }),
        });
        await crm.command(
          "customer.archive",
          a.target,
          invoke({ customerId: a.customerId, expectedVersion: 1 }),
        );
        assert.equal(
          (await a.service.detail(a.target, query(saved.profileId)))
            .effectiveActive,
          false,
        );
        assert.equal(
          (await a.service.command("measurement.create", a.target, request))
            .replayed,
          true,
        );
        await assert.rejects(
          run("measurement.create", payload()),
          code("version-conflict"),
        );
        await crm.command(
          "customer.restore",
          a.target,
          invoke({ customerId: a.customerId, expectedVersion: 2 }),
        );
      },
    );
    await t.test(
      "two concurrent edits serialize and parent locks reject fresh saves safely",
      async () => {
        const base = payload();
        const result = await run("measurement.create", base);
        const outcomes = await Promise.allSettled(
          ["2", "3"].map((decimal) =>
            run("measurement.revise", {
              ...base,
              versionId: randomUUID(),
              expectedRevision: 1,
              values: [{ ...base.values[0], decimal }],
            }),
          ),
        );
        assert.equal(
          outcomes.filter((r) => r.status === "fulfilled").length,
          1,
        );
        assert.ok(
          outcomes.some(
            (r) =>
              r.status === "rejected" &&
              ["version-conflict", "busy"].includes(r.reason.code),
          ),
        );
        const lock = await admin.connect();
        try {
          await lock.query("BEGIN");
          await lock.query(
            "SELECT id FROM app.customer_wearers WHERE id=$1 FOR UPDATE",
            [a.wearerId],
          );
          await assert.rejects(
            run("measurement.create", payload()),
            code("busy"),
          );
        } finally {
          await lock.query("ROLLBACK");
          lock.release();
        }
        assert.equal(
          (
            await a.service.history(a.target, {
              ...owner,
              profileId: result.result.profileId,
            })
          ).items.length,
          2,
        );
      },
    );
    await t.test(
      "book and exact history paginate without leaking master pricing or unrelated configuration",
      async () => {
        const book = await a.service.book(a.target, {
          ...owner,
          limit: 2,
          status: "all",
        });
        assert.equal(book.items.length, 2);
        assert.ok(book.total > 2);
        assert.equal(book.nextOffset, 2);
        const next = await a.service.book(a.target, {
          ...owner,
          limit: 2,
          status: "all",
          offset: 2,
        });
        assert.notEqual(book.items[0].profileId, next.items[0].profileId);
        const hist = await a.service.history(a.target, {
          ...owner,
          profileId: saved.profileId,
          limit: 1,
        });
        assert.equal(hist.items[0].sequence, 2);
        const older = await a.service.history(a.target, {
          ...owner,
          profileId: saved.profileId,
          limit: 1,
          beforeSequence: hist.nextBeforeSequence,
        });
        assert.equal(older.items[0].sequence, 1);
        const noPrivate = (object) => {
          if (object && typeof object === "object")
            for (const [key, value] of Object.entries(object)) {
              assert.ok(
                ![
                  "rates",
                  "baseRate",
                  "services",
                  "addons",
                  "constructionGroups",
                  "serviceOverrides",
                ].includes(key),
                key,
              );
              noPrivate(value);
            }
        };
        noPrivate(await a.service.detail(a.target, query(saved.profileId)));
        noPrivate(await a.service.intakeSchema(a.target, schemaRef));
      },
    );
    await t.test(
      "garment intake stays price-free, all five kinds persist and drift/retirement block fresh saves",
      async () => {
        const masters = createMasterService({
          pool: web,
          resolveIdentity: async () => ({ principalId: a.principalId }),
        });
        const template = createStarterBundle(randomUUID).garments[0].definition;
        const section = template.sections[0];
        const common = {
          id: randomUUID(),
          sectionId: section.id,
          label: "Field",
          semanticId: null,
          required: true,
          help: "",
          illustrationId: null,
        };
        const length = {
          ...common,
          id: randomUUID(),
          label: "Cross-unit length",
          kind: "length",
          basis: "garment",
          displayUnit: "in",
          displayPrecision: 2,
          min: "2.54",
          max: "2.54",
        };
        const number = {
          ...common,
          id: randomUUID(),
          label: "Count",
          kind: "number",
          unit: "count",
          decimalPlaces: 0,
          min: "0",
          max: null,
        };
        const text = {
          ...common,
          id: randomUUID(),
          label: "Note",
          kind: "text",
          maxLength: 10,
        };
        const boolean = {
          ...common,
          id: randomUUID(),
          label: "Confirmed",
          kind: "boolean",
        };
        const choice = {
          id: randomUUID(),
          label: "Option",
          illustrationId: null,
          active: true,
        };
        const select = {
          ...common,
          id: randomUUID(),
          label: "Shape",
          kind: "select",
          choices: [choice],
        };
        const definition = {
          ...template,
          label: `Typed fixture ${randomUUID()}`,
          sections: [section],
          fields: [length, number, text, boolean, select],
          services: [],
          addons: [],
          constructionGroups: [],
        };
        const master = await masters.command(
          "garment.save",
          a.target,
          invoke({
            mode: "create",
            definition,
            baseRate: null,
            currency: "INR",
            serviceOverrides: [],
          }),
        );
        const ref = {
          kind: "garment",
          garmentId: master.result.garmentId,
          versionId: master.result.garmentVersionId,
        };
        const intake = await a.service.intakeSchema(a.target, ref);
        assert.equal(intake.fields.length, 5);
        assert.equal("baseRate" in intake, false);
        const values = [
          {
            kind: "length",
            fieldId: length.id,
            decimal: "2.540000",
            unit: "cm",
          },
          { kind: "number", fieldId: number.id, decimal: "0" },
          { kind: "text", fieldId: text.id, text: "தமிழ்" },
          { kind: "boolean", fieldId: boolean.id, value: false },
          { kind: "select", fieldId: select.id, choiceId: choice.id },
        ];
        const p = payload("1", { schemaRef: ref, values });
        const savedGarment = await run("measurement.create", p);
        assert.equal(
          (
            await a.service.detail(a.target, query(p.profileId))
          ).document.values.find((v) => v.kind === "boolean").value,
          false,
        );
        for (const patch of [
          { ...values[0], decimal: "2.539999" },
          { ...values[1], decimal: "1.5" },
          { ...values[4], choiceId: randomUUID() },
        ]) {
          const invalid = values.map((v) =>
            v.fieldId === patch.fieldId ? patch : v,
          );
          await assert.rejects(
            raw(payload("1", { schemaRef: ref, values: invalid })),
          );
        }
        const updated = {
          ...definition,
          fields: [
            length,
            number,
            text,
            boolean,
            {
              ...select,
              required: false,
              choices: [{ ...choice, active: false }],
            },
          ],
        };
        const edit = await masters.command(
          "garment.save",
          a.target,
          invoke({
            mode: "update",
            garmentId: ref.garmentId,
            expectedVersion: master.result.version,
            definition: updated,
            baseRate: null,
            currency: "INR",
            serviceOverrides: [],
          }),
        );
        await assert.rejects(
          run("measurement.create", payload("1", { schemaRef: ref, values })),
          code("schema-stale"),
        );
        const currentRef = { ...ref, versionId: edit.result.garmentVersionId };
        const reviewed = await a.service.currentIntake(a.target, {
          customerId: a.customerId,
          wearerId: a.wearerId,
          schemaRef: ref,
        });
        assert.deepEqual(reviewed.schemaRef, currentRef);
        assert.equal(reviewed.schema.fields.length, 5);
        assert.equal("baseRate" in reviewed.schema, false);
        await assert.rejects(
          a.service.currentIntake(a.target, {
            customerId: a.customerId,
            wearerId: randomUUID(),
            schemaRef: ref,
          }),
          code("unavailable"),
        );
        await assert.rejects(
          run(
            "measurement.create",
            payload("1", { schemaRef: currentRef, values }),
          ),
          code("validation"),
        );
        await run("measurement.revise", {
          ...p,
          versionId: randomUUID(),
          schemaRef: currentRef,
          expectedRevision: 1,
        });
        assert.equal(
          (
            await a.service.detail(
              a.target,
              query(p.profileId, savedGarment.result.versionId),
            )
          ).document.schema.fields.find((f) => f.kind === "select").choices[0]
            .active,
          true,
        );
        await masters.command(
          "garment.lifecycle",
          a.target,
          invoke({
            garmentId: ref.garmentId,
            expectedVersion: edit.result.version,
            active: false,
          }),
        );
        await assert.rejects(
          run("measurement.revise", {
            ...p,
            versionId: randomUUID(),
            schemaRef: currentRef,
            expectedRevision: 2,
          }),
          code("unavailable"),
        );
        assert.equal(
          (await a.service.detail(a.target, query(p.profileId))).document.values
            .length,
          5,
        );
      },
    );
    await t.test(
      "Drizzle columns, forced RLS, named grants and deferred current-version constraints match storage",
      async () => {
        for (const table of [
          schema.measurementBodySchemas,
          schema.measurementBodySchemaState,
          schema.measurementProfiles,
          schema.measurementVersions,
          schema.measurementCustomIdentities,
          schema.measurementPhotoReservations,
          schema.measurementPhotoMemberships,
          schema.measurementCards,
          schema.measurementCardSelections,
          schema.measurementCardAdmissions,
        ]) {
          const config = getTableConfig(table);
          const actual = (
            await admin.query(
              "SELECT column_name,is_nullable FROM information_schema.columns WHERE table_schema='app' AND table_name=$1",
              [config.name],
            )
          ).rows;
          assert.deepEqual(
            config.columns.map((c) => c.name).sort(),
            actual.map((c) => c.column_name).sort(),
          );
          for (const column of config.columns)
            assert.equal(
              column.notNull,
              actual.find((c) => c.column_name === column.name).is_nullable ===
                "NO",
            );
          const flags = (
            await admin.query(
              "SELECT relrowsecurity,relforcerowsecurity FROM pg_class WHERE oid=$1::regclass",
              [`app.${config.name}`],
            )
          ).rows[0];
          assert.ok(flags.relrowsecurity && flags.relforcerowsecurity);
        }
        const blank = await admin.connect();
        try {
          await blank.query("BEGIN");
          await blank.query(
            "INSERT INTO app.measurement_profiles(id,tenant_id,location_id,customer_id,wearer_id,kind,revision,created_by,updated_by,creation_operation_id) VALUES($1,$2,$3,$4,$5,'body',1,$6,$6,$7)",
            [
              randomUUID(),
              a.target.tenantId,
              a.target.locationId,
              a.customerId,
              a.wearerId,
              a.principalId,
              first.operationId,
            ],
          );
          await assert.rejects(blank.query("COMMIT"), code("23514"));
        } finally {
          await blank.query("ROLLBACK");
          blank.release();
        }
        const privileged = (
          await admin.query(
            "SELECT proname,prosecdef,proconfig FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='app' AND proname LIKE 'measurement_%'",
          )
        ).rows;
        for (const f of privileged)
          assert.ok(f.proconfig?.includes('search_path=""'), f.proname);
        const signature = "app.measurement_current_intake(uuid,uuid,jsonb)";
        for (const role of [
          "fitloom_web",
          "fitloom_worker",
          "fitloom_auth",
          "fitloom_operator",
        ]) {
          const allowed = (
            await admin.query(
              "SELECT has_function_privilege($1,$2,'EXECUTE') AS allowed",
              [role, signature],
            )
          ).rows[0].allowed;
          assert.equal(allowed, role === "fitloom_web");
        }
        const newFunctions = (
          await admin.query(
            "SELECT proname,p.oid::regprocedure::text signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='app' AND (p.proname IN ('measurement_compare_sources','measurement_capture','measurement_trend','measurement_mapping_value','measurement_verified_origin') OR p.proname LIKE 'measurement_photo_%' OR p.proname LIKE 'measurement_card_%')",
          )
        ).rows;
        for (const f of newFunctions)
          for (const role of [
            "fitloom_web",
            "fitloom_worker",
            "fitloom_auth",
            "fitloom_operator",
          ]) {
            const allowed = (
              await admin.query(
                "SELECT has_function_privilege($1,$2,'EXECUTE') AS allowed",
                [role, f.signature],
              )
            ).rows[0].allowed;
            assert.equal(
              allowed,
              role === "fitloom_web" &&
                [
                  "measurement_compare_sources",
                  "measurement_capture",
                  "measurement_trend",
                  "measurement_photo_admit",
                  "measurement_photo_begin",
                  "measurement_photo_upload_target",
                  "measurement_photo_prepare",
                  "measurement_photo_finalize",
                  "measurement_photo_read",
                  "measurement_photo_revoke",
                  "measurement_card_manager",
                  "measurement_card_projection",
                  "measurement_card_mutate",
                  "measurement_card_list",
                  "measurement_card_admit",
                  "measurement_card_resolve",
                  "measurement_card_revoke_authorize",
                ].includes(f.proname),
            );
          }
        for (const f of newFunctions)
          assert.equal(
            (
              await admin.query(
                "SELECT 1 FROM pg_proc p CROSS JOIN LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a WHERE p.oid=$1::regprocedure AND a.grantee=0 AND a.privilege_type='EXECUTE'",
                [f.signature],
              )
            ).rowCount,
            0,
            f.proname,
          );
        const publicGrant = await admin.query(
          "SELECT 1 FROM pg_proc p CROSS JOIN LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a WHERE p.oid=$1::regprocedure AND a.grantee=0 AND a.privilege_type='EXECUTE'",
          [signature],
        );
        assert.equal(publicGrant.rowCount, 0);
      },
    );
    await t.test(
      "every core command rejects actor/location replay and changed envelopes; rollback leaves no content",
      async () => {
        const p = payload();
        const createRequest = invoke(p);
        const created = await a.service.command(
          "measurement.create",
          a.target,
          createRequest,
        );
        const revisedRequest = invoke({
          ...p,
          versionId: randomUUID(),
          expectedRevision: 1,
          label: "Revised",
        });
        const revised = await a.service.command(
          "measurement.revise",
          a.target,
          revisedRequest,
        );
        const archiveRequest = invoke({
          ...owner,
          profileId: p.profileId,
          expectedRevision: 2,
        });
        await a.service.command(
          "measurement.archive",
          a.target,
          archiveRequest,
        );
        const restoreRequest = invoke({
          ...owner,
          profileId: p.profileId,
          expectedRevision: 3,
        });
        await a.service.command(
          "measurement.restore",
          a.target,
          restoreRequest,
        );
        const secondLocation = randomUUID();
        await admin.query(
          "INSERT INTO app.locations(id,tenant_id,name) VALUES($1,$2,'Second')",
          [secondLocation, a.target.tenantId],
        );
        const grant = (
          await admin.query(
            "SELECT * FROM app.location_grants g JOIN app.memberships m ON m.id=g.membership_id WHERE m.principal_id=$1 AND g.location_id=$2",
            [a.principalId, a.target.locationId],
          )
        ).rows[0];
        await admin.query(
          "INSERT INTO app.location_grants(tenant_id,membership_id,location_id,role_id) VALUES($1,$2,$3,$4)",
          [
            a.target.tenantId,
            grant.membership_id,
            secondLocation,
            grant.role_id,
          ],
        );
        const peer = await actor(),
          membership = randomUUID();
        await admin.query(
          "INSERT INTO app.memberships(id,tenant_id,principal_id) VALUES($1,$2,$3)",
          [membership, a.target.tenantId, peer],
        );
        await admin.query(
          "INSERT INTO app.location_grants(tenant_id,membership_id,location_id,role_id) VALUES($1,$2,$3,$4)",
          [a.target.tenantId, membership, a.target.locationId, grant.role_id],
        );
        const peerService = createMeasurementService({
          pool: web,
          resolveIdentity: async () => ({ principalId: peer }),
        });
        for (const [name, envelope] of [
          ["measurement.create", createRequest],
          ["measurement.revise", revisedRequest],
          ["measurement.archive", archiveRequest],
          ["measurement.restore", restoreRequest],
        ]) {
          assert.equal(
            (await a.service.command(name, a.target, envelope)).replayed,
            true,
          );
          await assert.rejects(
            peerService.command(name, a.target, envelope),
            code("operation-conflict"),
          );
          await assert.rejects(
            a.service.command(
              name,
              { ...a.target, locationId: secondLocation },
              envelope,
            ),
            code("operation-conflict"),
          );
        }
        await assert.rejects(
          a.service.command("measurement.create", a.target, {
            ...createRequest,
            payload: { ...p, label: "Different intent" },
          }),
          code("operation-conflict"),
        );
        const rolledBack = payload();
        await assert.rejects(raw(rolledBack));
        assert.equal(
          (
            await admin.query(
              "SELECT id FROM app.measurement_profiles WHERE id=$1",
              [rolledBack.profileId],
            )
          ).rowCount,
          0,
        );
        assert.equal(
          (
            await admin.query(
              "SELECT id FROM app.measurement_versions WHERE id=$1",
              [rolledBack.versionId],
            )
          ).rowCount,
          0,
        );
        assert.equal(created.result.sequence, 1);
        assert.equal(revised.result.sequence, 2);
      },
    );
    await t.test(
      "shop-local dates and missing configuration fail without a machine-time fallback",
      async () => {
        const original = (
          await admin.query(
            "SELECT * FROM app.shop_settings WHERE tenant_id=$1",
            [a.target.tenantId],
          )
        ).rows[0];
        try {
          for (const timezone of ["Asia/Kolkata", "America/Los_Angeles"]) {
            await admin.query(
              "UPDATE app.shop_settings SET timezone=$1 WHERE tenant_id=$2",
              [timezone, a.target.tenantId],
            );
            const dates = (
              await admin.query(
                "SELECT to_char((clock_timestamp() AT TIME ZONE $1)::date,'YYYY-MM-DD') today,to_char((clock_timestamp() AT TIME ZONE $1)::date+1,'YYYY-MM-DD') tomorrow",
                [timezone],
              )
            ).rows[0];
            await run(
              "measurement.create",
              payload("1", { measuredOn: dates.today }),
            );
            await assert.rejects(
              run(
                "measurement.create",
                payload("1", { measuredOn: dates.tomorrow }),
              ),
              code("validation"),
            );
          }
          await admin.query(
            "DELETE FROM app.shop_settings WHERE tenant_id=$1",
            [a.target.tenantId],
          );
          await assert.rejects(
            run("measurement.create", payload()),
            code("configuration-unavailable"),
          );
        } finally {
          await admin.query(
            "DELETE FROM app.shop_settings WHERE tenant_id=$1",
            [a.target.tenantId],
          );
          await admin.query(
            "INSERT INTO app.shop_settings SELECT * FROM jsonb_populate_record(NULL::app.shop_settings,$1::jsonb)",
            [JSON.stringify(original)],
          );
        }
        const crm = createCustomerService({
          pool: web,
          resolveIdentity: async () => ({ principalId: a.principalId }),
        });
        await crm.command(
          "wearer.archive",
          a.target,
          invoke({ ...owner, expectedVersion: 1 }),
        );
        await assert.rejects(
          run("measurement.create", payload()),
          code("version-conflict"),
        );
        assert.equal(
          (await a.service.command("measurement.create", a.target, request))
            .replayed,
          true,
        );
        await crm.command(
          "wearer.restore",
          a.target,
          invoke({ ...owner, expectedVersion: 2 }),
        );
      },
    );
    await t.test(
      "independent copies verify same-wearer sources, fresh custom identities and derived manual provenance",
      async () => {
        const custom = {
          ...bodyCoreV1().fields[0],
          id: randomUUID(),
          semanticId: null,
          label: "Wrist custom",
        };
        const p = payload("1", {
          customFields: [custom],
          values: [
            {
              kind: "length",
              fieldId: bodyCoreV1().fields[0].id,
              decimal: "1",
              unit: "in",
            },
            {
              kind: "length",
              fieldId: custom.id,
              decimal: "6.125000",
              unit: "in",
            },
          ],
        });
        const source = await run("measurement.create", p);
        const capture = await a.service.capture(
          a.target,
          query(p.profileId, source.result.versionId),
        );
        assert.ok(
          capture.eligibility.currentVersion &&
            capture.eligibility.effectiveActive,
        );
        const fresh = { ...custom, id: randomUUID() };
        const origin = {
          kind: "copy",
          sourceProfileId: p.profileId,
          sourceVersionId: source.result.versionId,
          decisions: [
            {
              rule: "identity",
              sourceFieldId: p.values[0].fieldId,
              targetFieldId: p.values[0].fieldId,
              choices: [],
            },
            {
              rule: "identity",
              sourceFieldId: custom.id,
              targetFieldId: fresh.id,
              choices: [],
            },
          ],
        };
        const copy = payload("1", {
          label: "Independent copy",
          customFields: [fresh],
          values: [p.values[0], { ...p.values[1], fieldId: fresh.id }],
          origin,
        });
        const request = invoke(copy),
          created = await a.service.command(
            "measurement.create",
            a.target,
            request,
          );
        assert.ok(
          (await a.service.command("measurement.create", a.target, request))
            .replayed,
        );
        const before = await a.service.detail(a.target, query(copy.profileId));
        assert.equal(before.document.origin.kind, "copy");
        assert.deepEqual(before.document.origin.manualFieldIds, []);
        assert.deepEqual(before.document.origin.editedMetadata, ["label"]);
        await run("measurement.revise", {
          ...p,
          versionId: randomUUID(),
          expectedRevision: 1,
          values: [{ ...p.values[0], decimal: "2" }, p.values[1]],
        });
        await run("measurement.archive", {
          ...owner,
          profileId: p.profileId,
          expectedRevision: 2,
        });
        assert.deepEqual(
          (await a.service.detail(a.target, query(copy.profileId))).document,
          before.document,
        );
        const after = await a.service.capture(
          a.target,
          query(p.profileId, source.result.versionId),
        );
        assert.deepEqual(after.immutable, capture.immutable);
        assert.equal(after.eligibility.effectiveActive, false);
        assert.equal(after.eligibility.currentVersion, false);
        const edited = await run("measurement.create", {
          ...copy,
          profileId: randomUUID(),
          versionId: randomUUID(),
          values: [{ ...copy.values[0], decimal: "3" }, copy.values[1]],
        });
        assert.ok(
          (
            await a.service.detail(a.target, query(edited.result.profileId))
          ).document.origin.manualFieldIds.includes(copy.values[0].fieldId),
        );
        await assert.rejects(
          run("measurement.create", {
            ...copy,
            profileId: randomUUID(),
            versionId: randomUUID(),
            customFields: [custom],
            values: p.values,
            origin: {
              ...origin,
              decisions: [
                origin.decisions[0],
                { ...origin.decisions[1], targetFieldId: custom.id },
              ],
            },
          }),
          code("validation"),
        );
        await assert.rejects(
          run("measurement.create", {
            ...copy,
            profileId: randomUUID(),
            versionId: randomUUID(),
            origin: { ...origin, sourceVersionId: randomUUID() },
          }),
          code("unavailable"),
        );
        const foreign = payload("1", {
          customerId: b.customerId,
          wearerId: b.wearerId,
        });
        const foreignSaved = await b.service.command(
          "measurement.create",
          b.target,
          invoke(foreign),
        );
        await assert.rejects(
          run("measurement.create", {
            ...copy,
            profileId: randomUUID(),
            versionId: randomUUID(),
            origin: {
              ...origin,
              sourceProfileId: foreign.profileId,
              sourceVersionId: foreignSaved.result.versionId,
            },
          }),
          code("unavailable"),
        );

        await assert.rejects(
          run("measurement.create", {
            ...copy,
            profileId: randomUUID(),
            versionId: randomUUID(),
            origin: { ...origin, manualFieldIds: [] },
          }),
          code("validation"),
        );
        assert.equal(created.result.sequence, 1);
      },
    );
    await t.test(
      "reviewed body-to-garment ease is independently checked and retained in exact capture",
      async () => {
        const masters = createMasterService({
          pool: web,
          resolveIdentity: async () => ({ principalId: a.principalId }),
        });
        const section = randomUUID(),
          id = randomUUID();
        const field = {
          ...bodyCoreV1().fields[0],
          id,
          sectionId: section,
          basis: "garment",
          semanticId: "garment.chest.circumference",
          label: "Finished chest",
        };
        const made = await masters.command(
          "garment.save",
          a.target,
          invoke({
            mode: "create",
            definition: {
              formatVersion: 1,
              label: "Mapped garment",
              category: "Fixture",
              applicability: "unisex",
              iconId: null,
              help: "Mapping fixture",
              illustrationId: null,
              sections: [{ id: section, label: "Dimensions" }],
              fields: [field],
              constructionGroups: [],
              services: [],
              addons: [],
              sourceVersionId: null,
            },
            baseRate: null,
            currency: "INR",
            serviceOverrides: [],
          }),
        );
        const ref = {
          kind: "garment",
          garmentId: made.result.garmentId,
          versionId: made.result.garmentVersionId,
        };
        const src = payload("1"),
          source = await run("measurement.create", src);
        const decision = {
          rule: "ease",
          sourceFieldId: src.values[0].fieldId,
          targetFieldId: id,
          decimal: "2.54",
          unit: "cm",
          resultUnit: "cm",
          acceptRounding: false,
        };
        const mapped = payload("1", {
          schemaRef: ref,
          values: [
            { kind: "length", fieldId: id, decimal: "5.080000", unit: "cm" },
          ],
          origin: {
            kind: "mapped",
            sourceProfileId: src.profileId,
            sourceVersionId: source.result.versionId,
            decisions: [decision],
          },
        });
        const result = await run("measurement.create", mapped),
          captured = await a.service.capture(
            a.target,
            query(result.result.profileId, result.result.versionId),
          );
        assert.deepEqual(captured.immutable.document.origin.manualFieldIds, []);
        assert.equal(
          captured.immutable.document.origin.decisions[0].rule,
          "ease",
        );
        await assert.rejects(
          run("measurement.create", {
            ...mapped,
            profileId: randomUUID(),
            versionId: randomUUID(),
            origin: {
              ...mapped.origin,
              decisions: [
                {
                  rule: "identity",
                  sourceFieldId: decision.sourceFieldId,
                  targetFieldId: id,
                  choices: [],
                },
              ],
            },
          }),
          code("validation"),
        );
        await assert.rejects(
          run("measurement.create", {
            ...mapped,
            profileId: randomUUID(),
            versionId: randomUUID(),
            origin: {
              ...mapped.origin,
              decisions: [
                { ...decision, sourceFieldId: bodyCoreV1().fields[1].id },
              ],
            },
          }),
          code("validation"),
        );
        const small = payload("1", {
            values: [{ ...src.values[0], unit: "cm" }],
          }),
          smallSource = await run("measurement.create", small);
        const rounded = {
          ...mapped,
          profileId: randomUUID(),
          versionId: randomUUID(),
          values: [
            { kind: "length", fieldId: id, decimal: "0.393701", unit: "in" },
          ],
          origin: {
            kind: "mapped",
            sourceProfileId: small.profileId,
            sourceVersionId: smallSource.result.versionId,
            decisions: [{ ...decision, decimal: "0", resultUnit: "in" }],
          },
        };
        await assert.rejects(
          run("measurement.create", rounded),
          code("validation"),
        );
        await run("measurement.create", {
          ...rounded,
          origin: {
            ...rounded.origin,
            decisions: [
              { ...rounded.origin.decisions[0], acceptRounding: true },
            ],
          },
        });
        const bodyField = {
          ...field,
          id: randomUUID(),
          basis: "body",
          semanticId: "body.chest.circumference",
          label: "Body chest",
        };
        const advanced = await masters.command(
          "garment.save",
          a.target,
          invoke({
            mode: "update",
            garmentId: ref.garmentId,
            expectedVersion: made.result.version,
            definition: {
              formatVersion: 1,
              label: "Mapped garment v2",
              category: "Fixture",
              applicability: "unisex",
              iconId: null,
              help: "Explicit historical basis fixture",
              illustrationId: null,
              sections: [{ id: section, label: "Dimensions" }],
              fields: [bodyField],
              constructionGroups: [],
              services: [],
              addons: [],
              sourceVersionId: null,
            },
            baseRate: null,
            currency: "INR",
            serviceOverrides: [],
          }),
        );
        const changedBasis = await run("measurement.revise", {
          ...mapped,
          profileId: result.result.profileId,
          versionId: randomUUID(),
          expectedRevision: 1,
          schemaRef: { ...ref, versionId: advanced.result.garmentVersionId },
          values: [
            {
              kind: "length",
              fieldId: bodyField.id,
              decimal: "5.080000",
              unit: "cm",
            },
          ],
          origin: { kind: "manual" },
        });
        const historicalTrend = await a.service.trend(a.target, {
          ...owner,
          profileId: result.result.profileId,
          anchorVersionId: changedBasis.result.versionId,
          fieldId: bodyField.id,
          from: "2020-01-01",
          to: "2020-12-31",
        });
        assert.equal(historicalTrend.items[0].status, "incompatible");
        assert.equal(historicalTrend.items[0].decimal, null);
        assert.equal(historicalTrend.items[1].status, "recorded");
        await masters.command(
          "garment.lifecycle",
          a.target,
          invoke({
            garmentId: ref.garmentId,
            expectedVersion: advanced.result.version,
            active: false,
          }),
        );
        const retired = await a.service.capture(
          a.target,
          query(result.result.profileId, result.result.versionId),
        );
        assert.deepEqual(retired.immutable, captured.immutable);
        assert.equal(retired.eligibility.schemaActive, false);
      },
    );
    await t.test(
      "bounded comparisons, trend continuation and missing gaps remain scoped and price-free",
      async () => {
        const chest = bodyCoreV1().fields[0].id,
          waist = bodyCoreV1().fields[2].id;
        let p = payload("0", {
          values: [
            { kind: "length", fieldId: chest, decimal: "0", unit: "in" },
            { kind: "length", fieldId: waist, decimal: "1", unit: "in" },
          ],
        });
        const first = await run("measurement.create", p);
        let latest = first;
        for (let i = 1; i <= 54; i++) {
          p = {
            ...p,
            versionId: randomUUID(),
            expectedRevision: i,
            values: [
              { kind: "length", fieldId: waist, decimal: "1", unit: "in" },
              ...(i === 20
                ? []
                : [
                    {
                      kind: "length",
                      fieldId: chest,
                      decimal: String(i),
                      unit: "in",
                    },
                  ]),
            ],
          };
          latest = await run("measurement.revise", p);
        }
        const q = {
          ...owner,
          profileId: p.profileId,
          anchorVersionId: latest.result.versionId,
          fieldId: chest,
          from: "2020-01-01",
          to: "2020-12-31",
          unit: "cm",
          limit: 50,
        };
        const firstPage = await a.service.trend(a.target, q);
        assert.equal(firstPage.items.length, 50);
        assert.ok(firstPage.next);
        assert.ok(
          firstPage.items.some(
            (row) => row.status === "missing" && row.decimal === null,
          ),
        );
        const lastPage = await a.service.trend(a.target, {
          ...q,
          after: firstPage.next,
        });
        assert.equal(lastPage.items.length, 5);
        assert.equal(lastPage.next, null);
        assert.equal(
          new Set(
            [...firstPage.items, ...lastPage.items].map((row) => row.versionId),
          ).size,
          55,
        );
        const compared = await a.service.compare(a.target, {
          ...owner,
          versions: [
            { profileId: p.profileId, versionId: first.result.versionId },
            { profileId: p.profileId, versionId: latest.result.versionId },
          ],
          unit: "cm",
        });
        assert.equal(compared.rows[0].cells[1].status, "changed");
        assert.ok(!JSON.stringify(compared).includes("baseRate"));
        await assert.rejects(
          a.service.compare(a.target, {
            ...owner,
            versions: [
              { profileId: p.profileId, versionId: first.result.versionId },
              { profileId: b.customerId, versionId: randomUUID() },
            ],
          }),
          code("unavailable"),
        );
        await assert.rejects(
          a.service.trend(a.target, { ...q, fieldId: randomUUID() }),
          code("validation"),
        );
        await assert.rejects(
          a.service.capture(
            b.target,
            query(p.profileId, first.result.versionId),
          ),
          code("denied"),
        );
      },
    );

    await exerciseMeasurementPhotos({
      t,
      admin,
      web,
      worker,
      a,
      b,
      actor,
      payload,
      owner,
    });
    await exerciseMeasurementCards({
      t,
      admin,
      web,
      a,
      b,
      actor,
      payload,
      owner,
    });
    await exerciseMeasurementCapture({
      t,
      admin,
      web,
      a,
      b,
      payload,
      owner,
      actor,
    });
    await t.test(
      "v2 publication rejects stale fresh saves while exact v1 content remains unchanged",
      async () => {
        const before = await a.service.detail(
          a.target,
          query(saved.profileId, first.result.versionId),
        );
        const capturedBefore = await a.service.capture(
          a.target,
          query(saved.profileId, first.result.versionId),
        );
        const v2 = { ...bodyCoreV1(), guidance: "Synthetic v2 fixture" };
        await admin.query(
          "INSERT INTO app.measurement_body_schemas(version,canonical_hash,definition) VALUES('body-core-v2',$1,$2) ON CONFLICT DO NOTHING",
          [
            createHash("sha256").update(JSON.stringify(v2)).digest("hex"),
            JSON.stringify(v2),
          ],
        );
        try {
          await admin.query(
            "UPDATE app.measurement_body_schema_state SET current_version='body-core-v2',revision=revision+1 WHERE singleton",
          );
          await assert.rejects(
            run("measurement.create", payload()),
            code("schema-stale"),
          );
          await assert.rejects(
            run("measurement.revise", {
              ...secondPayload,
              versionId: randomUUID(),
              expectedRevision: 4,
            }),
            code("schema-stale"),
          );
          const after = await a.service.detail(
            a.target,
            query(saved.profileId, first.result.versionId),
          );
          assert.deepEqual(after.document, before.document);
          const capturedAfter = await a.service.capture(
            a.target,
            query(saved.profileId, first.result.versionId),
          );
          assert.deepEqual(capturedAfter.immutable, capturedBefore.immutable);
          assert.equal(capturedAfter.eligibility.currentSchema, false);
          const ref = await a.service.bodySchema(a.target);
          assert.equal(ref.bundleVersion, "body-core-v2");
          const reviewed = await a.service.currentIntake(a.target, {
            ...owner,
            schemaRef: before.schemaRef,
          });
          assert.deepEqual(reviewed.schemaRef, ref);
          assert.equal(reviewed.schema.guidance, v2.guidance);
          const rebased = await run(
            "measurement.create",
            payload("1", { schemaRef: ref }),
          );
          assert.equal(
            (await a.service.detail(a.target, query(rebased.result.profileId)))
              .document.schema.guidance,
            v2.guidance,
          );
        } finally {
          await admin.query(
            "UPDATE app.measurement_body_schema_state SET current_version='body-core-v1',revision=revision+1 WHERE singleton",
          );
        }
      },
    );
  } finally {
    await lease.query("SELECT pg_advisory_unlock(68122902)");
    lease.release();
    await Promise.all([admin.end(), web.end(), worker.end()]);
  }
});
