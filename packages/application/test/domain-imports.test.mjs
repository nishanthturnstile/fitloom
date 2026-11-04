import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { createPool, withScope } from "@fitloom/db";
import { sql } from "drizzle-orm";
import { migrateDatabase } from "../../db/scripts/migrate.mjs";
import {
  createImportManifest,
  importTemplate,
} from "../dist/import-formats.js";
import {
  createCustomerService,
  createDomainImportService,
  createMasterService,
  createMeasurementService,
  createWorkspaceService,
  provisionTenant,
  saveSetupDraft,
} from "../dist/index.js";
import { bodyCoreV1 } from "../dist/measurement-body-schema.js";

const invoke = (payload) => ({
  payload,
  operationKey: randomUUID(),
  correlationId: randomUUID(),
});
const csv = (headers, rows) =>
  headers.join(",") +
  "\r\n" +
  rows
    .map((row) =>
      row.map((v) => '"' + String(v).replaceAll('"', '""') + '"').join(","),
    )
    .join("\r\n") +
  "\r\n";
const columns = [
  "source_customer_id",
  "customer_name",
  "phone_country",
  "phone",
  "email",
  "source_wearer_id",
  "wearer_name",
  "relationship",
  "notes",
];
const rejected =
  (...codes) =>
  (e) =>
    codes.includes(e?.code) ||
    codes.includes(e?.category) ||
    codes.includes(e?.cause?.code);
for (const purpose of ["MIGRATOR", "WEB"]) {
  const url = new URL(process.env[`TEST_${purpose}_DATABASE_URL`]);
  if (
    url.pathname !== "/fitloom_test" ||
    url.username !== `fitloom_test_${purpose.toLowerCase()}` ||
    !["127.0.0.1", "postgres"].includes(url.hostname)
  )
    throw Error("Guarded test database required");
}
test("supported imports preserve atomic groups, private review, source identity and recoverable outcomes", async (t) => {
  const admin = createPool({
      connectionString: process.env.TEST_MIGRATOR_DATABASE_URL,
      purpose: "auth",
      max: 4,
    }),
    web = createPool({
      connectionString: process.env.TEST_WEB_DATABASE_URL,
      purpose: "web",
      max: 6,
    });
  const lock = await admin.connect();
  await lock.query("SELECT pg_advisory_lock(68122902)");
  try {
    await migrateDatabase(process.env.TEST_MIGRATOR_DATABASE_URL);
    async function shop() {
      const principalId = randomUUID();
      await admin.query(
        'INSERT INTO public."user"(id,name,email,email_verified) VALUES($1,$1,$2,true)',
        [principalId, `${principalId}@example.test`],
      );
      await admin.query(
        "INSERT INTO app.principals(id,auth_user_id) VALUES($1::uuid,$1::text)",
        [principalId],
      );
      const resolveIdentity = async () => ({ principalId }),
        workspace = createWorkspaceService({ pool: web, resolveIdentity }),
        profile = {
          shopName: "Import fixture",
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
      const choice = (await workspace.choices())[0],
        target = { tenantId: choice.tenantId, locationId: choice.locationId };
      return {
        principalId,
        target,
        resolveIdentity,
        service: createDomainImportService({ pool: web, resolveIdentity }),
        customers: createCustomerService({ pool: web, resolveIdentity }),
        measurements: createMeasurementService({ pool: web, resolveIdentity }),
      };
    }
    const a = await shop(),
      b = await shop();
    const preview = async (family, namespace, text, bindings = []) => {
      const command =
        family === "customers"
          ? "customer-import.preview"
          : "measurement-import.preview";
      const result = await a.service.command(
        command,
        a.target,
        invoke({ namespace, csv: text, bindings }),
      );
      return a.service.status(family, a.target, result.result.batchId);
    };
    const decide = (family, batch, record, decision, bindings = []) =>
      a.service.command(
        family === "customers"
          ? "customer-import.decide"
          : "measurement-import.decide",
        a.target,
        invoke({
          batchId: batch.id,
          recordId: record.id,
          expectedRevision: record.revision,
          decision,
          bindings,
        }),
      );
    const resetBudget = () =>
      admin.query(
        "UPDATE app.domain_import_budgets SET window_started_at=now()-interval '61 seconds',leases='{}' WHERE actor_id=$1",
        [a.principalId],
      );
    await t.test(
      "import relations force RLS and expose no table or private helper privileges",
      async () => {
        const tables = [
          "domain_import_batches",
          "domain_import_records",
          "domain_import_attempts",
          "domain_import_sources",
          "domain_import_budgets",
        ];
        const relations = (
          await admin.query(
            "SELECT relname,relrowsecurity,relforcerowsecurity FROM pg_class WHERE relnamespace='app'::regnamespace AND relname=ANY($1::text[])",
            [tables],
          )
        ).rows;
        assert.equal(relations.length, 5);
        assert.ok(
          relations.every((r) => r.relrowsecurity && r.relforcerowsecurity),
        );
        for (const role of [
          "fitloom_web",
          "fitloom_worker",
          "fitloom_auth",
          "fitloom_operator",
        ]) {
          for (const table of tables)
            assert.equal(
              (
                await admin.query(
                  "SELECT has_table_privilege($1,$2,'SELECT,INSERT,UPDATE,DELETE') AS allowed",
                  [role, `app.${table}`],
                )
              ).rows[0].allowed,
              false,
            );
          for (const signature of [
            "app.customer_import_commit_group(app.domain_import_batches,app.domain_import_records)",
            "app.measurement_import_commit_group(app.domain_import_batches,app.domain_import_records)",
            "app.domain_import_admit(text)",
            "app.domain_import_lock(uuid,boolean)",
          ])
            assert.equal(
              (
                await admin.query(
                  "SELECT has_function_privilege($1,$2,'EXECUTE') AS allowed",
                  [role, signature],
                )
              ).rows[0].allowed,
              false,
            );
        }
      },
    );
    let customerBatch, customerOwner, measurementBatch;
    await t.test(
      "full 200-row preview avoids interactive duplicate admission and mutates no business rows",
      async () => {
        const before = (
          await admin.query(
            "SELECT count(*)::int n FROM app.customers WHERE tenant_id=$1",
            [a.target.tenantId],
          )
        ).rows[0].n;
        const text = csv(
          columns,
          Array.from({ length: 200 }, (_, i) => [
            "customer_" + i,
            "Name " + i,
            "IN",
            "98765" + String(40000 + i),
            "",
            "",
            "",
            "",
            "",
          ]),
        );
        const batch = await preview("customers", "bulk", text);
        assert.equal(batch.total, 200);
        assert.equal(batch.rowCount, 200);
        assert.equal(batch.items.length, 25);
        assert.equal(batch.nextOffset, 25);
        const all = [];
        for (let offset = 0; offset < 200; offset += 25)
          all.push(
            ...(await a.service.status("customers", a.target, batch.id, offset))
              .items,
          );
        assert.equal(all.length, 200);
        assert.ok(all.every((r) => r.candidateCount === 0));
        assert.equal(
          (
            await admin.query(
              "SELECT count(*)::int n FROM app.customers WHERE tenant_id=$1",
              [a.target.tenantId],
            )
          ).rows[0].n,
          before,
        );
        assert.equal(
          (
            await admin.query(
              "SELECT count(*)::int n FROM app.customer_request_budgets WHERE principal_id=$1",
              [a.principalId],
            )
          ).rows[0].n,
          0,
        );
        await assert.rejects(
          b.service.status("customers", b.target, batch.id),
          rejected("unavailable"),
        );
        await assert.rejects(
          a.service.status("measurements", a.target, batch.id),
          rejected("unavailable"),
        );
        await a.service.command(
          "customer-import.cancel",
          a.target,
          invoke({ batchId: batch.id }),
        );
        const cancelled = await a.service.status(
          "customers",
          a.target,
          batch.id,
        );
        assert.equal(cancelled.state, "cancelled");
        assert.equal(cancelled.counts.cancelled, 200);
      },
    );
    await t.test(
      "customer and named wearer groups commit once, replay canonical phones, and preserve explicit ownership",
      async () => {
        await resetBudget();
        const text = csv(columns, [
          [
            "customer_001",
            "Imported customer",
            "IN",
            "98765 43210",
            "",
            "wearer_001",
            "First wearer",
            "self",
            "Multiline\nnotes",
          ],
          [
            "customer_001",
            "Imported customer",
            "IN",
            "+91 9876543210",
            "",
            "wearer_002",
            "Second wearer",
            "family",
            "Multiline\nnotes",
          ],
        ]);
        customerBatch = await preview("customers", "source-v1", text);
        const row = customerBatch.items[0];
        const review = await decide("customers", customerBatch, row, {
          kind: "create",
        });
        assert.equal(review.result.state, "reviewed");
        const ready = await a.service.status(
          "customers",
          a.target,
          customerBatch.id,
        );
        assert.match(ready.items[0].operationKey, /^[0-9a-f-]{14}4/);
        assert.ok(ready.items[0].requestHash);
        const committed = await a.service.chunk(
          "customers",
          a.target,
          customerBatch.id,
        );
        assert.equal(committed.state, "complete");
        assert.equal(committed.counts.created, 1);
        assert.deepEqual(committed.items[0].counts, {
          customers: 1,
          wearers: 2,
          profiles: 0,
          versions: 0,
        });
        const record = committed.items[0];
        const recovery = await a.service.recover(a.target, {
          family: "customers",
          batchId: committed.id,
          logicalRecordId: record.id,
          operationKey: record.operationKey,
          requestHash: record.requestHash,
        });
        assert.equal(recovery.kind, "committed");
        assert.equal(recovery.result.state, "created");
        customerOwner = await a.service.ownerMapping(a.target, {
          namespace: "source-v1",
          sourceCustomerId: "customer_001",
          sourceWearerId: "wearer_001",
        });
        assert.ok(customerOwner);
        const customer = await a.customers.detail(
          a.target,
          customerOwner.customerId,
        );
        assert.equal(customer.profile.name, "Imported customer");
        assert.equal(customer.wearers.items.length, 2);
        const activities = await a.customers.activity(
          a.target,
          customerOwner.customerId,
        );
        assert.equal(
          activities.items.filter((x) => x.kind === "customer.import").length,
          1,
        );
        assert.equal(
          activities.items.filter((x) => x.kind === "wearer.import").length,
          2,
        );
        await resetBudget();
        const repeat = await preview(
          "customers",
          "source-v1",
          text.replace("98765 43210", "9876543210"),
        );
        await decide("customers", repeat, repeat.items[0], {
          kind: "separate",
          reason: "Same source replay",
        });
        const changedIntent = await a.service.chunk(
          "customers",
          a.target,
          repeat.id,
        );
        assert.equal(changedIntent.counts["already-imported"], 1);
        await resetBudget();
        const rebound = await preview("customers", "source-v1", text);
        const second = (
          await a.customers.detail(a.target, customerOwner.customerId)
        ).wearers.items.find((w) => w.id !== customerOwner.wearerId);
        assert.ok(second);
        await decide("customers", rebound, rebound.items[0], {
          kind: "reuse",
          customerId: customerOwner.customerId,
          wearers: [
            {
              sourceId: "wearer_001",
              action: { kind: "reuse", wearerId: second.id },
            },
            { sourceId: "wearer_002", action: { kind: "create" } },
          ],
        });
        const conflict = await a.service.chunk(
          "customers",
          a.target,
          rebound.id,
        );
        assert.equal(conflict.counts["needs-review"], 1);
        assert.deepEqual(
          await a.service.ownerMapping(a.target, {
            namespace: "source-v1",
            sourceCustomerId: "customer_001",
            sourceWearerId: "wearer_001",
          }),
          customerOwner,
        );
        const latest = changedIntent.items[0];
        await decide("customers", changedIntent, latest, {
          kind: "create",
        }).catch(() => {});
      },
    );
    await t.test(
      "complete measurement histories use sequence order, one profile and immutable exact source maps",
      async () => {
        await resetBudget();
        assert.deepEqual((await a.service.schemas(a.target, {})).body, {
          kind: "body",
          bundleVersion: "body-core-v1",
        });
        const manifest = await a.service.manifest(a.target, {
          schemaKey: "body_v1",
          schemaRef: { kind: "body", bundleVersion: "body-core-v1" },
        });
        const header = [
          "source_profile_id",
          "source_measurement_id",
          "source_version_sequence",
          "source_customer_id",
          "source_wearer_id",
          "profile_label",
          "schema_key",
          "measured_on",
          "values_json",
        ];
        const values = (decimal) =>
          JSON.stringify([
            { kind: "length", fieldKey: "f001", decimal, unit: "in" },
          ]);
        const text = csv(header, [
            [
              "profile_001",
              "version_2",
              "10",
              "customer_001",
              "wearer_001",
              "Imported body",
              "body_v1",
              "2020-01-01",
              values("40.00"),
            ],
            [
              "profile_001",
              "version_1",
              "2",
              "customer_001",
              "wearer_001",
              "Earlier body",
              "body_v1",
              "2020-02-01",
              values("39"),
            ],
          ]),
          binding = {
            schemaKey: "body_v1",
            sourceRef: manifest.schemaRef,
            targetRef: manifest.schemaRef,
            mappings: [],
          };
        measurementBatch = await preview("measurements", "source-v1", text, [
          binding,
        ]);
        await decide(
          "measurements",
          measurementBatch,
          measurementBatch.items[0],
          { kind: "owner", ...customerOwner },
        );
        const committed = await a.service.chunk(
          "measurements",
          a.target,
          measurementBatch.id,
        );
        assert.equal(committed.counts.created, 1);
        assert.equal(committed.items[0].counts.versions, 2);
        const maps = (
          await admin.query(
            "SELECT * FROM app.domain_import_sources WHERE tenant_id=$1 AND family='measurements' ORDER BY source_sequence NULLS FIRST",
            [a.target.tenantId],
          )
        ).rows;
        const profile = maps.find((m) => m.kind === "profile");
        const detail = await a.measurements.detail(a.target, {
          ...customerOwner,
          profileId: profile.profile_id,
        });
        assert.equal(detail.sequence, 2);
        assert.equal(detail.document.label, "Imported body");
        assert.equal(detail.document.origin.kind, "imported");
        const capture = await a.measurements.capture(a.target, {
          ...customerOwner,
          profileId: profile.profile_id,
          versionId: detail.versionId,
        });
        assert.deepEqual(capture.immutable.document, detail.document);
        assert.deepEqual(capture.immutable.document.origin, {
          kind: "imported",
          batchId: measurementBatch.id,
          recordId: committed.items[0].id,
        });
        assert.ok(!JSON.stringify(capture).includes("profile_001"));
        assert.ok(!JSON.stringify(capture).includes("version_2"));
        assert.equal(detail.measuredOn, "2020-01-01");
        assert.equal(maps.filter((m) => m.kind === "version").length, 2);
        await resetBudget();
        const repeat = await preview(
          "measurements",
          "source-v1",
          text.replace("40.00", "40.0"),
          [binding],
        );
        await decide("measurements", repeat, repeat.items[0], {
          kind: "owner",
          ...customerOwner,
        });
        const replayed = await a.service.chunk(
          "measurements",
          a.target,
          repeat.id,
        );
        assert.equal(replayed.counts["already-imported"], 1);
        assert.deepEqual(replayed.items[0].counts, {
          customers: 0,
          wearers: 0,
          profiles: 0,
          versions: 0,
        });
      },
    );
    async function oneCustomer(
      namespace,
      name = "Boundary customer",
      phone = "",
    ) {
      const text = csv(columns, [
        ["c", name, phone ? "IN" : "", phone, "", "", "", "", ""],
      ]);
      const batch = await preview("customers", namespace, text);
      await decide("customers", batch, batch.items[0], {
        kind: phone ? "separate" : "create",
        ...(phone ? { reason: "Deliberately separate source" } : {}),
      });
      return a.service.status("customers", a.target, batch.id);
    }
    await t.test(
      "revoked and format-specific roles protect preview, commit, mapping, status and replay",
      async () => {
        async function restricted(family) {
          const principalId = randomUUID(),
            role = randomUUID(),
            membership = randomUUID();
          await admin.query(
            'INSERT INTO public."user"(id,name,email,email_verified) VALUES($1,$1,$2,true)',
            [principalId, `${principalId}@example.test`],
          );
          await admin.query(
            "INSERT INTO app.principals(id,auth_user_id) VALUES($1::uuid,$1::text)",
            [principalId],
          );
          await admin.query(
            "INSERT INTO app.memberships(id,tenant_id,principal_id) VALUES($1,$2,$3)",
            [membership, a.target.tenantId, principalId],
          );
          await admin.query(
            "INSERT INTO app.roles(id,tenant_id,name) VALUES($1,$2,$3)",
            [role, a.target.tenantId, "Import role " + role],
          );
          const permissions =
            family === "customers"
              ? [
                  "workspace.read",
                  "customers.read",
                  "customers.manage",
                  "customers.import",
                ]
              : [
                  "workspace.read",
                  "customers.read",
                  "measurements.read",
                  "measurements.manage",
                  "measurements.import",
                ];
          await admin.query(
            "INSERT INTO app.permission_grants SELECT $1,$2,unnest($3::text[])",
            [a.target.tenantId, role, permissions],
          );
          await admin.query(
            "INSERT INTO app.location_grants(tenant_id,membership_id,location_id,role_id) VALUES($1,$2,$3,$4)",
            [a.target.tenantId, membership, a.target.locationId, role],
          );
          return {
            role,
            principalId,
            service: createDomainImportService({
              pool: web,
              resolveIdentity: async () => ({ principalId }),
            }),
          };
        }
        const customerOnly = await restricted("customers"),
          measurementOnly = await restricted("measurements");
        const ownRequest = invoke({
          namespace: "role-only",
          csv: importTemplate("customers"),
          bindings: [],
        });
        const own = await customerOnly.service.command(
          "customer-import.preview",
          a.target,
          ownRequest,
        );
        const status = await customerOnly.service.status(
          "customers",
          a.target,
          own.result.batchId,
        );
        await customerOnly.service.command(
          "customer-import.decide",
          a.target,
          invoke({
            batchId: status.id,
            recordId: status.items[0].id,
            expectedRevision: status.items[0].revision,
            decision: { kind: "create" },
            bindings: [],
          }),
        );
        assert.equal(
          (await customerOnly.service.chunk("customers", a.target, status.id))
            .counts.created,
          1,
        );
        await assert.rejects(
          customerOnly.service.command(
            "measurement-import.preview",
            a.target,
            invoke({
              namespace: "no",
              csv: importTemplate(
                "measurements",
                createImportManifest(
                  "body_v1",
                  { kind: "body", bundleVersion: "body-core-v1" },
                  bodyCoreV1(),
                ),
              ),
              bindings: [],
            }),
          ),
          rejected("denied"),
        );
        await assert.rejects(
          measurementOnly.service.command(
            "customer-import.preview",
            a.target,
            ownRequest,
          ),
          rejected("denied"),
        );
        assert.deepEqual(
          await measurementOnly.service.ownerMapping(a.target, {
            namespace: "source-v1",
            sourceCustomerId: "customer_001",
            sourceWearerId: "wearer_001",
          }),
          customerOwner,
        );
        const manifest = await measurementOnly.service.manifest(a.target, {
            schemaKey: "body_v1",
            schemaRef: { kind: "body", bundleVersion: "body-core-v1" },
          }),
          binding = {
            schemaKey: "body_v1",
            sourceRef: manifest.schemaRef,
            targetRef: manifest.schemaRef,
            mappings: [],
          };
        const request = invoke({
          namespace: "measure-role-only",
          csv: importTemplate("measurements", manifest),
          bindings: [binding],
        });
        const issued = await measurementOnly.service.command(
            "measurement-import.preview",
            a.target,
            request,
          ),
          batch = await measurementOnly.service.status(
            "measurements",
            a.target,
            issued.result.batchId,
          );
        await measurementOnly.service.command(
          "measurement-import.decide",
          a.target,
          invoke({
            batchId: batch.id,
            recordId: batch.items[0].id,
            expectedRevision: 1,
            decision: { kind: "owner", ...customerOwner },
            bindings: [binding],
          }),
        );
        assert.equal(
          (
            await measurementOnly.service.chunk(
              "measurements",
              a.target,
              batch.id,
            )
          ).counts.created,
          1,
        );
        await admin.query(
          "DELETE FROM app.permission_grants WHERE role_id=$1 AND permission='measurements.import'",
          [measurementOnly.role],
        );
        await assert.rejects(
          measurementOnly.service.command(
            "measurement-import.preview",
            a.target,
            request,
          ),
          rejected("denied"),
        );
        await assert.rejects(
          measurementOnly.service.status("measurements", a.target, batch.id),
          rejected("denied"),
        );
        await assert.rejects(
          a.service.status("customers", a.target, status.id),
          rejected("unavailable"),
        );
      },
    );
    await t.test(
      "two concurrent tabs cannot duplicate one reviewed group or source map",
      async () => {
        await resetBudget();
        const batch = await oneCustomer("two-tabs");
        const results = await Promise.allSettled([
          a.service.chunk("customers", a.target, batch.id),
          a.service.chunk("customers", a.target, batch.id),
        ]);
        assert.ok(results.some((r) => r.status === "fulfilled"));
        const settled = await a.service.status("customers", a.target, batch.id);
        assert.equal(settled.counts.created, 1);
        assert.equal(
          (
            await admin.query(
              "SELECT count(*)::int n FROM app.domain_import_sources WHERE tenant_id=$1 AND namespace='two-tabs'",
              [a.target.tenantId],
            )
          ).rows[0].n,
          1,
        );
        assert.equal(
          (
            await admin.query(
              "SELECT count(*)::int n FROM app.command_operations WHERE owner_id=$1 AND command_kind='customer-import.commit-row' AND operation_key=$2",
              [a.target.tenantId, settled.items[0].operationKey],
            )
          ).rows[0].n,
          1,
        );
      },
    );
    await t.test(
      "two distinct batches serialize the same immutable source identity",
      async () => {
        await resetBudget();
        const left = await oneCustomer("same-source-race"),
          right = await oneCustomer("same-source-race");
        await Promise.allSettled([
          a.service.chunk("customers", a.target, left.id),
          a.service.chunk("customers", a.target, right.id),
        ]);
        const settled = [];
        for (const batch of [left, right]) {
          let status = await a.service.status("customers", a.target, batch.id);
          if (
            !["created", "already-imported"].includes(status.items[0].state)
          ) {
            await decide("customers", status, status.items[0], {
              kind: "create",
            });
            status = await a.service.chunk("customers", a.target, batch.id);
          }
          settled.push(status);
        }
        assert.equal(
          settled.reduce((n, b) => n + b.counts.created, 0),
          1,
        );
        assert.equal(
          settled.reduce((n, b) => n + b.counts["already-imported"], 0),
          1,
        );
        assert.equal(
          (
            await admin.query(
              "SELECT count(*)::int n FROM app.domain_import_sources WHERE tenant_id=$1 AND namespace='same-source-race'",
              [a.target.tenantId],
            )
          ).rows[0].n,
          1,
        );
      },
    );
    await t.test(
      "customer group failures roll back every wearer, source map and command claim",
      async () => {
        await resetBudget();
        const before = (
          await admin.query(
            "SELECT (SELECT count(*) FROM app.customers WHERE tenant_id=$1)::int customers,(SELECT count(*) FROM app.customer_wearers WHERE tenant_id=$1)::int wearers",
            [a.target.tenantId],
          )
        ).rows[0];
        const batch = await preview(
          "customers",
          "source-v1",
          csv(columns, [
            [
              "new_customer",
              "Must roll back",
              "",
              "",
              "",
              "a_new_wearer",
              "New first wearer",
              "",
              "",
            ],
            [
              "new_customer",
              "Must roll back",
              "",
              "",
              "",
              "wearer_001",
              "Conflicting source wearer",
              "",
              "",
            ],
          ]),
        );
        await decide("customers", batch, batch.items[0], { kind: "create" });
        const settled = await a.service.chunk("customers", a.target, batch.id);
        assert.equal(settled.counts["needs-review"], 1);
        assert.deepEqual(
          (
            await admin.query(
              "SELECT (SELECT count(*) FROM app.customers WHERE tenant_id=$1)::int customers,(SELECT count(*) FROM app.customer_wearers WHERE tenant_id=$1)::int wearers",
              [a.target.tenantId],
            )
          ).rows[0],
          before,
        );
        assert.equal(
          (
            await admin.query(
              "SELECT count(*)::int n FROM app.domain_import_sources WHERE tenant_id=$1 AND source_id='new_customer'",
              [a.target.tenantId],
            )
          ).rows[0].n,
          0,
        );
        assert.equal(
          (
            await admin.query(
              "SELECT count(*)::int n FROM app.command_operations WHERE owner_id=$1 AND command_kind='customer-import.commit-row' AND operation_key=$2",
              [a.target.tenantId, settled.items[0].operationKey],
            )
          ).rows[0].n,
          0,
        );
      },
    );
    await t.test(
      "candidate drift requires another review and reuse never overwrites customer fields",
      async () => {
        await resetBudget();
        const text = csv(columns, [
          [
            "reviewed",
            "Source name differs",
            "IN",
            "9876543210",
            "",
            "extra_wearer",
            "New source wearer",
            "",
            "Source notes must not overwrite",
          ],
        ]);
        const batch = await preview("customers", "review-drift", text);
        assert.equal(batch.items[0].candidateCount, 1);
        const current = await a.customers.detail(
          a.target,
          customerOwner.customerId,
        );
        await admin.query(
          "UPDATE app.customers SET version=version+1 WHERE id=$1",
          [customerOwner.customerId],
        );
        const decision = {
          kind: "reuse",
          customerId: customerOwner.customerId,
          wearers: [{ sourceId: "extra_wearer", action: { kind: "create" } }],
        };
        const changed = await decide(
          "customers",
          batch,
          batch.items[0],
          decision,
        );
        assert.equal(changed.result.state, "needs-review");
        const fresh = await a.service.status("customers", a.target, batch.id);
        await decide("customers", fresh, fresh.items[0], decision);
        const settled = await a.service.chunk("customers", a.target, batch.id);
        assert.equal(settled.counts.reused, 1);
        assert.equal(settled.items[0].counts.customers, 0);
        assert.equal(settled.items[0].counts.wearers, 1);
        const after = await a.customers.detail(
          a.target,
          customerOwner.customerId,
        );
        assert.deepEqual(after.profile, current.profile);
      },
    );
    await t.test(
      "active original transactions block settlement and cancellation without hiding recovery",
      async () => {
        await resetBudget();
        const batch = await preview(
          "customers",
          "active-transaction",
          csv(columns, [
            ["active", "Active import", "", "", "", "", "", "", ""],
          ]),
        );
        await decide("customers", batch, batch.items[0], { kind: "create" });
        const ready = await a.service.status("customers", a.target, batch.id),
          row = ready.items[0];
        const held = await admin.connect();
        try {
          await held.query("BEGIN");
          await held.query(
            "SELECT pg_advisory_xact_lock(hashtextextended($1,0)),pg_advisory_xact_lock(hashtextextended($2,0))",
            [
              `customer-operation:${a.target.tenantId}:customer-import.commit-row:${row.operationKey}`,
              `domain-import-batch:${batch.id}`,
            ],
          );
          const before = (
            await admin.query(
              "SELECT count(*)::int n FROM app.command_operations WHERE owner_id=$1",
              [a.target.tenantId],
            )
          ).rows[0].n;
          assert.equal(
            (
              await a.service.recover(a.target, {
                family: "customers",
                batchId: batch.id,
                logicalRecordId: row.id,
                operationKey: row.operationKey,
                requestHash: row.requestHash,
              })
            ).kind,
            "in-progress",
          );
          // Cancellation uses the same batch transaction lock and the global two-second lock budget.
          await assert.rejects(
            a.service.command(
              "customer-import.cancel",
              a.target,
              invoke({ batchId: batch.id }),
            ),
            rejected("busy", "temporary", "55P03"),
          );
          assert.equal(
            (
              await admin.query(
                "SELECT count(*)::int n FROM app.command_operations WHERE owner_id=$1",
                [a.target.tenantId],
              )
            ).rows[0].n,
            before,
          );
        } finally {
          await held.query("ROLLBACK");
          held.release();
        }
        assert.equal(
          (
            await a.service.recover(a.target, {
              family: "customers",
              batchId: batch.id,
              logicalRecordId: row.id,
              operationKey: row.operationKey,
              requestHash: row.requestHash,
            })
          ).kind,
          "unknown",
        );
        await a.service.command(
          "customer-import.cancel",
          a.target,
          invoke({ batchId: batch.id }),
        );
      },
    );
    await t.test(
      "recovery remains read-only after expiry, quota exhaustion, another lease and payload purge",
      async () => {
        const batch = await a.service.status(
            "customers",
            a.target,
            customerBatch.id,
          ),
          row = batch.items[0],
          query = {
            family: "customers",
            batchId: batch.id,
            logicalRecordId: row.id,
            operationKey: row.operationKey,
            requestHash: row.requestHash,
          };
        await admin.query(
          "UPDATE app.domain_import_batches SET expires_at=now()-interval '1 second',lease_token=$2,lease_until=now()+interval '30 seconds' WHERE id=$1",
          [batch.id, randomUUID()],
        );
        await admin.query(
          "UPDATE app.domain_import_budgets SET previews=5,chunks=10 WHERE actor_id=$1",
          [a.principalId],
        );
        const before = (
          await admin.query(
            "SELECT count(*)::int n FROM app.command_operations WHERE owner_id=$1",
            [a.target.tenantId],
          )
        ).rows[0].n;
        assert.equal(
          (await a.service.recover(a.target, query)).kind,
          "committed",
        );
        assert.equal(
          (
            await admin.query(
              "SELECT count(*)::int n FROM app.command_operations WHERE owner_id=$1",
              [a.target.tenantId],
            )
          ).rows[0].n,
          before,
        );
        await assert.rejects(
          a.service.recover(a.target, {
            ...query,
            requestHash: "v1:" + "0".repeat(64),
          }),
          rejected("denied"),
        );
        await assert.rejects(
          b.service.recover(b.target, query),
          rejected("unavailable"),
        );
        await admin.query(
          "UPDATE app.domain_import_batches SET created_at=now()-interval '25 hours' WHERE id=$1",
          [batch.id],
        );
        await admin.query("SELECT app.domain_import_maintenance()");
        const purged = await a.service.status("customers", a.target, batch.id);
        assert.equal(purged.purged, true);
        assert.equal(purged.namespace, null);
        assert.equal(purged.items[0].payload, null);
        assert.equal(purged.items[0].sourceId, null);
        assert.equal(purged.counts.created, 1);
        assert.equal(
          (await a.service.recover(a.target, query)).kind,
          "committed",
        );
        assert.deepEqual(
          await a.service.ownerMapping(a.target, {
            namespace: "source-v1",
            sourceCustomerId: "customer_001",
            sourceWearerId: "wearer_001",
          }),
          customerOwner,
        );
      },
    );
    await t.test(
      "cancellation preserves committed successes and reconciles all nine group states",
      async () => {
        await resetBudget();
        const batch = await preview(
          "customers",
          "cancel-after-chunk",
          csv(
            columns,
            Array.from({ length: 21 }, (_, i) => [
              "c" + i,
              "Cancellation fixture " + i,
              "",
              "",
              "",
              "",
              "",
              "",
              "",
            ]),
          ),
        );
        for (const row of batch.items)
          await decide("customers", batch, row, { kind: "create" });
        const partial = await a.service.chunk("customers", a.target, batch.id);
        assert.equal(partial.counts.created, 20);
        assert.equal(partial.counts.pending, 1);
        const request = invoke({ batchId: batch.id });
        await a.service.command("customer-import.cancel", a.target, request);
        assert.equal(
          (await a.service.command("customer-import.cancel", a.target, request))
            .replayed,
          true,
        );
        const cancelled = await a.service.status(
          "customers",
          a.target,
          batch.id,
        );
        assert.equal(cancelled.state, "cancelled");
        assert.equal(cancelled.counts.cancelled, 1);
        assert.equal(cancelled.counts.created, 20);
        assert.equal(
          Object.values(cancelled.counts).reduce((a, b) => a + b, 0),
          cancelled.total,
        );
        await assert.rejects(
          decide("customers", cancelled, cancelled.items[20], {
            kind: "create",
          }),
          rejected("expired"),
        );
      },
    );
    await t.test(
      "preview admission is shared, fresh-only, and limited to two concurrent parses",
      async () => {
        await resetBudget();
        const scope = {
          kind: "tenant",
          ...a.target,
          principalId: a.principalId,
        };
        const begin = () =>
          withScope(web, scope, (db) =>
            db.execute(
              sql`SELECT app.domain_import_budget('customers',true) AS token`,
            ),
          );
        const first = (await begin()).rows[0].token,
          second = (await begin()).rows[0].token;
        await assert.rejects(begin(), rejected("FI004"));
        await withScope(web, scope, (db) =>
          db.execute(
            sql`SELECT app.domain_import_preview_end('customers',${first}::uuid),app.domain_import_preview_end('customers',${second}::uuid)`,
          ),
        );
        await resetBudget();
        const request = invoke({
            namespace: "quota-replay",
            csv: importTemplate("customers"),
            bindings: [],
          }),
          result = await a.service.command(
            "customer-import.preview",
            a.target,
            request,
          );
        await admin.query(
          "UPDATE app.domain_import_budgets SET previews=5 WHERE actor_id=$1",
          [a.principalId],
        );
        assert.equal(
          (
            await a.service.command(
              "customer-import.preview",
              a.target,
              request,
            )
          ).replayed,
          true,
        );
        await assert.rejects(
          preview("customers", "sixth", importTemplate("customers")),
          rejected("rate-limit"),
        );
        assert.equal(
          (await a.service.status("customers", a.target, result.result.batchId))
            .total,
          1,
        );
      },
    );
    await t.test(
      "garment imports preserve five value kinds, custom lineage, saved labels and current schema review",
      async () => {
        await resetBudget();
        const section = randomUUID(),
          base = {
            id: randomUUID(),
            sectionId: section,
            label: "Garment length",
            required: false,
            semanticId: null,
            help: "",
            illustrationId: "dimension",
          },
          choice = randomUUID();
        const fields = [
          {
            ...base,
            kind: "length",
            basis: "garment",
            displayUnit: "in",
            displayPrecision: 2,
            min: "0",
            max: null,
          },
          {
            ...base,
            id: randomUUID(),
            label: "Button count",
            illustrationId: null,
            kind: "number",
            unit: "count",
            decimalPlaces: 0,
            min: "0",
            max: null,
          },
          {
            ...base,
            id: randomUUID(),
            label: "Text",
            illustrationId: null,
            kind: "text",
            maxLength: 100,
          },
          {
            ...base,
            id: randomUUID(),
            label: "Confirmed",
            illustrationId: null,
            kind: "boolean",
          },
          {
            ...base,
            id: randomUUID(),
            label: "Fit",
            illustrationId: null,
            kind: "select",
            choices: [
              {
                id: choice,
                label: "Original option",
                active: true,
                illustrationId: null,
              },
            ],
          },
        ];
        const masters = createMasterService({
            pool: web,
            resolveIdentity: a.resolveIdentity,
          }),
          definition = {
            formatVersion: 1,
            label: "Imported garment",
            category: "Tailoring",
            applicability: "unspecified",
            iconId: null,
            help: "",
            illustrationId: null,
            sections: [{ id: section, label: "Dimensions" }],
            fields,
            constructionGroups: [],
            services: [],
            addons: [],
            sourceVersionId: null,
          };
        const saved = await masters.command(
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
        const choices = await a.service.schemas(a.target, {
          search: "Imported garment",
        });
        assert.equal(choices.garments.length, 1);
        assert.equal(choices.garments[0].label, "Imported garment");
        assert.equal(choices.garments[0].id, saved.result.garmentId);
        assert.equal(
          (await a.service.schemas(a.target, { search: "%" })).garments.length,
          0,
        );
        const ref = {
            kind: "garment",
            garmentId: saved.result.garmentId,
            versionId: saved.result.garmentVersionId,
          },
          manifest = await a.service.manifest(a.target, {
            schemaKey: "garment_v1",
            schemaRef: ref,
          }),
          binding = {
            schemaKey: "garment_v1",
            sourceRef: manifest.schemaRef,
            targetRef: manifest.schemaRef,
            mappings: [],
          };
        const custom = [
            {
              key: "custom.allowance",
              label: "Saved custom allowance",
              kind: "length",
              required: false,
              help: "Verify before cutting",
              basis: "garment",
              displayUnit: "cm",
              displayPrecision: 2,
              min: "0",
              max: null,
            },
          ],
          values = [
            {
              kind: "length",
              fieldKey: "f001",
              decimal: "1.000000",
              unit: "in",
            },
            { kind: "number", fieldKey: "f002", decimal: "0" },
            { kind: "text", fieldKey: "f003", text: "தமிழ்" },
            { kind: "boolean", fieldKey: "f004", value: false },
            { kind: "select", fieldKey: "f005", choiceKey: "c001" },
            {
              kind: "length",
              fieldKey: "custom.allowance",
              decimal: "2.500000",
              unit: "cm",
            },
          ];
        const headers = [
          "source_profile_id",
          "source_measurement_id",
          "source_version_sequence",
          "source_customer_id",
          "source_wearer_id",
          "profile_label",
          "schema_key",
          "measured_on",
          "values_json",
          "custom_fields_json",
        ];
        const rows = [
          [
            "garment_profile",
            "garment_v1",
            "4",
            "customer_001",
            "wearer_001",
            "Imported garment",
            "garment_v1",
            "2020-01-01",
            JSON.stringify(values),
            JSON.stringify(custom),
          ],
          [
            "garment_profile",
            "garment_v2",
            "8",
            "customer_001",
            "wearer_001",
            "Changed label",
            "garment_v1",
            "2020-01-02",
            JSON.stringify(values),
            JSON.stringify([{ ...custom[0], label: "Renamed custom display" }]),
          ],
        ];
        const batch = await preview(
          "measurements",
          "garment-source",
          csv(headers, rows),
          [binding],
        );
        await decide("measurements", batch, batch.items[0], {
          kind: "owner",
          ...customerOwner,
        });
        assert.equal(
          (await a.service.chunk("measurements", a.target, batch.id)).counts
            .created,
          1,
        );
        const versions = (
          await admin.query(
            "SELECT v.document,v.sequence FROM app.measurement_versions v JOIN app.domain_import_sources s ON s.version_id=v.id WHERE s.tenant_id=$1 AND s.namespace='garment-source' ORDER BY v.sequence",
            [a.target.tenantId],
          )
        ).rows;
        assert.equal(versions.length, 2);
        assert.equal(
          versions[0].document.values.find((v) => v.kind === "boolean").value,
          false,
        );
        assert.equal(
          versions[0].document.values.find((v) => v.kind === "number").decimal,
          "0",
        );
        assert.equal(
          versions[0].document.customFields[0].id,
          versions[1].document.customFields[0].id,
        );
        assert.equal(
          versions[0].document.customFields[0].label,
          "Saved custom allowance",
        );
        assert.equal(
          versions[1].document.customFields[0].label,
          "Renamed custom display",
        );
        await resetBudget();
        const stale = await preview(
          "measurements",
          "garment-stale",
          csv(headers, rows),
          [binding],
        );
        await decide("measurements", stale, stale.items[0], {
          kind: "owner",
          ...customerOwner,
        });
        await masters.command(
          "garment.save",
          a.target,
          invoke({
            mode: "update",
            garmentId: ref.garmentId,
            expectedVersion: saved.result.version,
            definition: {
              ...definition,
              label: "New master label",
              sourceVersionId: ref.versionId,
            },
            baseRate: null,
            currency: "INR",
            serviceOverrides: [],
          }),
        );
        const result = await a.service.chunk(
          "measurements",
          a.target,
          stale.id,
        );
        assert.equal(result.counts["needs-review"], 1);
        assert.equal(
          (
            await admin.query(
              "SELECT count(*)::int n FROM app.domain_import_sources WHERE tenant_id=$1 AND namespace='garment-stale'",
              [a.target.tenantId],
            )
          ).rows[0].n,
          0,
        );
      },
    );
    await t.test(
      "shop-local future dates, changed complete sets and abandoned scheduling cannot commit silently",
      async () => {
        await resetBudget();
        const manifest = createImportManifest(
            "body_v1",
            { kind: "body", bundleVersion: "body-core-v1" },
            bodyCoreV1(),
          ),
          binding = {
            schemaKey: "body_v1",
            sourceRef: manifest.schemaRef,
            targetRef: manifest.schemaRef,
            mappings: [],
          };
        const future = importTemplate("measurements", manifest).replace(
            "2020-01-02",
            "9999-01-01",
          ),
          batch = await preview("measurements", "future-date", future, [
            binding,
          ]);
        await decide("measurements", batch, batch.items[0], {
          kind: "owner",
          ...customerOwner,
        });
        const failed = await a.service.chunk(
          "measurements",
          a.target,
          batch.id,
        );
        assert.equal(failed.counts["needs-review"], 1);
        assert.equal(
          (
            await admin.query(
              "SELECT count(*)::int n FROM app.domain_import_sources WHERE tenant_id=$1 AND namespace='future-date'",
              [a.target.tenantId],
            )
          ).rows[0].n,
          0,
        );
        await resetBudget();
        const abandoned = await oneCustomer("abandoned-attempt"),
          scope = { kind: "tenant", ...a.target, principalId: a.principalId };
        const token = (
          await withScope(web, scope, (db) =>
            db.execute(
              sql`SELECT app.domain_import_chunk_begin('customers',${abandoned.id}::uuid) AS token`,
            ),
          )
        ).rows[0].token;
        const scheduled = (
          await withScope(web, scope, (db) =>
            db.execute(
              sql`SELECT app.domain_import_schedule('customers',${abandoned.id}::uuid,${token}::uuid) AS task`,
            ),
          )
        ).rows[0].task;
        await admin.query(
          "UPDATE app.domain_import_batches SET lease_until=now()-interval '1 second' WHERE id=$1",
          [abandoned.id],
        );
        const query = {
          family: "customers",
          batchId: abandoned.id,
          logicalRecordId: scheduled.recordId,
          operationKey: scheduled.operationKey,
          requestHash: scheduled.requestHash,
        };
        assert.equal(
          (await a.service.recover(a.target, query)).kind,
          "unknown",
        );
        const settled = await a.service.chunk(
          "customers",
          a.target,
          abandoned.id,
        );
        assert.equal(settled.counts.failed, 1);
        await decide("customers", settled, settled.items[0], {
          kind: "create",
        });
        const ready = await a.service.status(
          "customers",
          a.target,
          abandoned.id,
        );
        assert.notEqual(ready.items[0].operationKey, scheduled.operationKey);
        assert.equal(
          (await a.service.recover(a.target, query)).kind,
          "unknown",
        );
        assert.equal(
          (await a.service.chunk("customers", a.target, abandoned.id)).counts
            .created,
          1,
        );
      },
    );
  } finally {
    await lock.query("SELECT pg_advisory_unlock(68122902)");
    lock.release();
    await Promise.all([admin.end(), web.end()]);
  }
});
