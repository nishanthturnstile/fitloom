import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { createPool } from "@fitloom/db";
import { migrateDatabase } from "../../db/scripts/migrate.mjs";
import {
  createDomainImportService,
  createMasterService,
  createMeasurementService,
  createWorkspaceService,
  importTemplate,
  provisionTenant,
  saveSetupDraft,
} from "../dist/index.js";
import { bodyCoreV1 } from "../dist/measurement-body-schema.js";

for (const purpose of ["MIGRATOR", "WEB"]) {
  const url = new URL(process.env[`TEST_${purpose}_DATABASE_URL`]);
  assert.equal(url.pathname, "/fitloom_test");
  assert.equal(url.username, `fitloom_test_${purpose.toLowerCase()}`);
  assert.ok(["127.0.0.1", "postgres"].includes(url.hostname));
}
const invoke = (payload) => ({
  payload,
  operationKey: randomUUID(),
  correlationId: randomUUID(),
});
await test("phase two review transactional corrections", async (t) => {
  const admin = createPool({
    connectionString: process.env.TEST_MIGRATOR_DATABASE_URL,
    purpose: "web",
    max: 2,
  });
  const web = createPool({
    connectionString: process.env.TEST_WEB_DATABASE_URL,
    purpose: "web",
    max: 5,
  });
  const small = createPool({
    connectionString: process.env.TEST_WEB_DATABASE_URL,
    purpose: "web",
    max: 1,
  });
  const lock = await admin.connect();
  try {
    await lock.query("SELECT pg_advisory_lock(68122902)");
    await migrateDatabase(process.env.TEST_MIGRATOR_DATABASE_URL);
    const principalId = randomUUID();
    await admin.query(
      'INSERT INTO public."user"(id,name,email,email_verified) VALUES($1,$1,$2,true)',
      [principalId, `${principalId}@example.test`],
    );
    await admin.query(
      "INSERT INTO app.principals(id,auth_user_id) VALUES($1::uuid,$1::text)",
      [principalId],
    );
    const resolveIdentity = async () => ({ principalId });
    const workspace = createWorkspaceService({ pool: web, resolveIdentity });
    const profile = {
      shopName: "Review synthetic fixture",
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
    const provision = await workspace.execute(provisionTenant, {
      ...invoke({ ...profile, expectedVersion: 1 }),
      scope: { kind: "principal" },
    });
    const choice = (await workspace.choices())[0];
    const target = { tenantId: choice.tenantId, locationId: choice.locationId };
    const customerId = randomUUID(),
      wearerId = randomUUID();
    await admin.query(
      "INSERT INTO app.customers(id,tenant_id,location_id,name,created_by,updated_by,creation_operation_id) VALUES($1,$2,$3,'Synthetic review contact',$4,$4,$5)",
      [
        customerId,
        target.tenantId,
        target.locationId,
        principalId,
        provision.operationId,
      ],
    );
    await admin.query(
      "INSERT INTO app.customer_wearers(id,tenant_id,location_id,customer_id,name,created_by,updated_by,creation_operation_id) VALUES($1,$2,$3,$4,'Synthetic review wearer',$5,$5,$6)",
      [
        wearerId,
        target.tenantId,
        target.locationId,
        customerId,
        principalId,
        provision.operationId,
      ],
    );
    const measurements = createMeasurementService({
      pool: web,
      resolveIdentity,
    });
    const imports = createDomainImportService({ pool: web, resolveIdentity });
    const tinyImports = createDomainImportService({
      pool: small,
      resolveIdentity,
    });
    const fieldId = bodyCoreV1().fields[0].id;
    const source = {
      customerId,
      wearerId,
      profileId: randomUUID(),
      versionId: randomUUID(),
      schemaRef: { kind: "body", bundleVersion: "body-core-v1" },
      label: "Source",
      measuredOn: "2020-01-02",
      values: [{ kind: "length", fieldId, decimal: "38", unit: "in" }],
      customFields: [],
      notes: null,
      sourceNote: null,
      origin: { kind: "manual" },
      photos: { kind: "retain" },
    };
    await t.test(
      "retained mapped provenance is a no-op until content changes",
      async () => {
        await measurements.command(
          "measurement.create",
          target,
          invoke(source),
        );
        const mapped = {
          ...source,
          profileId: randomUUID(),
          versionId: randomUUID(),
          label: "Mapped review",
          values: [{ ...source.values[0], decimal: "40.000000" }],
          origin: {
            kind: "mapped",
            sourceProfileId: source.profileId,
            sourceVersionId: source.versionId,
            decisions: [
              {
                rule: "ease",
                sourceFieldId: fieldId,
                targetFieldId: fieldId,
                decimal: "2",
                unit: "in",
                resultUnit: "in",
                acceptRounding: false,
              },
            ],
          },
        };
        await measurements.command(
          "measurement.create",
          target,
          invoke(mapped),
        );
        const retained = {
          ...mapped,
          versionId: randomUUID(),
          expectedRevision: 1,
          origin: { kind: "retain" },
        };
        const unchanged = await measurements.command(
          "measurement.revise",
          target,
          invoke(retained),
        );
        assert.equal(unchanged.result.changed, false);
        assert.equal(unchanged.result.sequence, 1);
        const edited = await measurements.command(
          "measurement.revise",
          target,
          invoke({
            ...retained,
            versionId: randomUUID(),
            notes: "Reviewed note",
          }),
        );
        const detail = await measurements.detail(target, {
          customerId,
          wearerId,
          profileId: mapped.profileId,
        });
        assert.equal(edited.result.sequence, 2);
        assert.equal(detail.document.origin.kind, "mapped");
        assert.deepEqual(
          detail.document.origin.decisions,
          mapped.origin.decisions,
        );
        assert.ok(detail.document.origin.editedMetadata.includes("notes"));
      },
    );
    let batch;
    await t.test(
      "one-connection preview, replay and admission limits remain usable",
      async () => {
        const request = invoke({
          namespace: "review-small-pool",
          csv: "source_customer_id,customer_name\r\nsource_1,Synthetic contact\r\n",
          bindings: [],
        });
        const result = await tinyImports.command(
          "customer-import.preview",
          target,
          request,
        );
        batch = await tinyImports.status(
          "customers",
          target,
          result.result.batchId,
        );
        assert.equal(batch.total, 1);
        await admin.query(
          "UPDATE app.domain_import_budgets SET previews=5 WHERE actor_id=$1",
          [principalId],
        );
        assert.equal(
          (
            await tinyImports.command(
              "customer-import.preview",
              target,
              request,
            )
          ).replayed,
          true,
        );
        await assert.rejects(
          tinyImports.command("customer-import.preview", target, {
            ...request,
            operationKey: randomUUID(),
          }),
          (error) => error.code === "rate-limit",
        );
        await admin.query(
          "UPDATE app.domain_import_budgets SET previews=0,chunks=0,leases='{}' WHERE actor_id=$1",
          [principalId],
        );
      },
    );
    await t.test(
      "outcome export returns every group and matching counts in one stable statement",
      async () => {
        const rows = Array.from(
          { length: 30 },
          (_, i) => `row_${i},Synthetic ${i}`,
        ).join("\r\n");
        const result = await imports.command(
          "customer-import.preview",
          target,
          invoke({
            namespace: "review-export",
            csv: `source_customer_id,customer_name\r\n${rows}\r\n`,
            bindings: [],
          }),
        );
        const page = await imports.status(
          "customers",
          target,
          result.result.batchId,
          25,
        );
        await imports.command(
          "customer-import.decide",
          target,
          invoke({
            batchId: result.result.batchId,
            recordId: page.items[0].id,
            expectedRevision: page.items[0].revision,
            decision: { kind: "skip", reason: "Reviewed skip" },
            bindings: [],
          }),
        );
        const outcome = await imports.outcomes(
          "customers",
          target,
          result.result.batchId,
        );
        assert.equal(outcome.items.length, 30);
        assert.equal(outcome.nextOffset, null);
        for (const [state, count] of Object.entries(outcome.counts))
          assert.equal(
            outcome.items.filter((item) => item.state === state).length,
            count,
          );
        assert.equal(
          (
            await admin.query(
              "SELECT provolatile FROM pg_proc WHERE oid='app.domain_import_outcomes(text,uuid)'::regprocedure",
            )
          ).rows[0].provolatile,
          "s",
        );
      },
    );
    await t.test(
      "imported provenance can be retained without allowing forged imports",
      async () => {
        const ref = source.schemaRef;
        const manifest = await imports.manifest(target, {
          schemaKey: "body_v1",
          schemaRef: ref,
        });
        const bindings = [
          {
            schemaKey: "body_v1",
            sourceRef: ref,
            targetRef: ref,
            mappings: [],
          },
        ];
        const result = await imports.command(
          "measurement-import.preview",
          target,
          invoke({
            namespace: "retained-import",
            csv: importTemplate("measurements", manifest),
            bindings,
          }),
        );
        const page = await imports.status(
          "measurements",
          target,
          result.result.batchId,
        );
        await imports.command(
          "measurement-import.decide",
          target,
          invoke({
            batchId: page.id,
            recordId: page.items[0].id,
            expectedRevision: page.items[0].revision,
            decision: { kind: "owner", customerId, wearerId },
            bindings,
          }),
        );
        const settled = await imports.chunk("measurements", target, page.id);
        assert.equal(settled.counts.created, 1);
        const imported = (
          await admin.query(
            "SELECT profile_id FROM app.domain_import_sources WHERE tenant_id=$1 AND namespace='retained-import' AND kind='profile'",
            [target.tenantId],
          )
        ).rows[0];
        const detail = await measurements.detail(target, {
          customerId,
          wearerId,
          profileId: imported.profile_id,
        });
        const payload = {
          ...source,
          profileId: detail.profileId,
          versionId: randomUUID(),
          expectedRevision: detail.revision,
          schemaRef: detail.schemaRef,
          label: detail.document.label,
          measuredOn: detail.measuredOn,
          values: detail.document.values,
          customFields: detail.document.customFields,
          notes: detail.document.notes,
          sourceNote: detail.document.sourceNote,
          origin: { kind: "retain" },
        };
        assert.equal(
          (
            await measurements.command(
              "measurement.revise",
              target,
              invoke(payload),
            )
          ).result.changed,
          false,
        );
        await measurements.command(
          "measurement.revise",
          target,
          invoke({
            ...payload,
            versionId: randomUUID(),
            notes: "Manual annotation",
          }),
        );
        const revised = await measurements.detail(target, {
          customerId,
          wearerId,
          profileId: detail.profileId,
        });
        assert.deepEqual(revised.document.origin, detail.document.origin);
      },
    );
    await t.test(
      "SQL preserves canonical bounds and explicit select omission",
      async () => {
        const base = bodyCoreV1();
        const length = {
          ...base.fields[0],
          basis: "garment",
          semanticId: null,
          required: false,
          displayUnit: "in",
          min: null,
          max: "100",
        };
        const custom = { ...length, id: randomUUID(), label: "Custom length" };
        const pinned = { ...base, fields: [length] };
        const value = (field, decimal) => ({
          kind: "length",
          fieldId: field.id,
          decimal,
          unit: "cm",
        });
        await admin.query(
          "SELECT app.measurement_validate($1,$2,$3,'[]',false)",
          [
            JSON.stringify(pinned),
            JSON.stringify([custom]),
            JSON.stringify([value(length, "80"), value(custom, "150")]),
          ],
        );
        await assert.rejects(
          admin.query(
            "SELECT app.measurement_validate($1,'[]',$2,'[]',false)",
            [JSON.stringify(pinned), JSON.stringify([value(length, "150")])],
          ),
          (error) => error.code === "FM004",
        );
        const shape = {
          id: randomUUID(),
          kind: "select",
          semanticId: null,
          choices: [{ id: randomUUID(), label: "Selected", active: true }],
        };
        const selected = {
          kind: "select",
          fieldId: shape.id,
          choiceId: shape.choices[0].id,
        };
        const decision = {
          rule: "identity",
          sourceFieldId: shape.id,
          targetFieldId: shape.id,
          choices: [
            { sourceChoiceId: selected.choiceId, targetChoiceId: null },
          ],
        };
        const result = await admin.query(
          "SELECT app.measurement_mapping_value($1,$1,$2,$3) AS value",
          [
            JSON.stringify(shape),
            JSON.stringify(selected),
            JSON.stringify(decision),
          ],
        );
        assert.equal(result.rows[0].value, null);
      },
    );
    await t.test(
      "hidden standard garments are excluded from fresh selection but retained in history filters",
      async () => {
        const masters = createMasterService({ pool: web, resolveIdentity });
        await masters.command(
          "masters.starters.install",
          target,
          invoke({
            expectedCatalogVersion: 0,
            bundleVersion: "tailoring-core-v1",
          }),
        );
        const choices = await measurements.garments(target, {
          customerId,
          wearerId,
        });
        const selected = choices.items[0];
        const ref = {
          kind: "garment",
          garmentId: selected.garmentId,
          versionId: selected.versionId,
        };
        const schema = await measurements.intakeSchema(target, ref);
        const payload = {
          ...source,
          profileId: randomUUID(),
          versionId: randomUUID(),
          schemaRef: ref,
          label: "Existing standard",
          values: schema.fields.map((field) => ({
            kind: "length",
            fieldId: field.id,
            decimal: "20",
            unit: "in",
          })),
        };
        await measurements.command(
          "measurement.create",
          target,
          invoke(payload),
        );
        const original = (
          await measurements.capture(target, {
            customerId,
            wearerId,
            profileId: payload.profileId,
            versionId: payload.versionId,
          })
        ).immutable;
        const catalog = await masters.catalog(target);
        await masters.command(
          "masters.visibility",
          target,
          invoke({
            expectedCatalogVersion: catalog.catalogVersion,
            hideStandardGarments: true,
            hideStandardServices: false,
          }),
        );
        assert.equal(
          (await measurements.garments(target, { customerId, wearerId })).total,
          0,
        );
        assert.equal(
          (
            await measurements.bookGarments(target, { customerId, wearerId })
          ).items.some((item) => item.garmentId === selected.garmentId),
          true,
        );
        await assert.rejects(
          measurements.command(
            "measurement.create",
            target,
            invoke({
              ...payload,
              profileId: randomUUID(),
              versionId: randomUUID(),
            }),
          ),
          (error) => error.code === "unavailable",
        );
        assert.equal(
          (
            await measurements.command(
              "measurement.revise",
              target,
              invoke({
                ...payload,
                expectedRevision: 1,
                versionId: randomUUID(),
                origin: { kind: "retain" },
              }),
            )
          ).result.changed,
          false,
        );
        assert.deepEqual(
          (
            await measurements.capture(target, {
              customerId,
              wearerId,
              profileId: payload.profileId,
              versionId: payload.versionId,
            })
          ).immutable,
          original,
        );
      },
    );
  } finally {
    await lock.query("SELECT pg_advisory_unlock(68122902)").catch(() => {});
    lock.release();
    await Promise.all([admin.end(), web.end(), small.end()]);
  }
});
