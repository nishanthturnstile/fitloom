import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { createPool, schema, withScope } from "@fitloom/db";
import { sql } from "drizzle-orm";
import { getTableConfig } from "drizzle-orm/pg-core";
import { migrateDatabase } from "../../db/scripts/migrate.mjs";
import { createRole } from "../dist/index.js";
import * as contracts from "../dist/master-contracts.js";
import { createStarterBundle } from "../dist/master-starters.js";
import { workspacePermissionLabel } from "../dist/workspace-contracts.js";

const target = new URL(process.env.TEST_MIGRATOR_DATABASE_URL);
if (
  target.pathname !== "/fitloom_test" ||
  target.username !== "fitloom_test_migrator" ||
  !["localhost", "127.0.0.1", "postgres"].includes(target.hostname)
)
  throw Error("Expected isolated test database");
for (const purpose of ["web", "worker"]) {
  const url = new URL(
    process.env[`TEST_${purpose.toUpperCase()}_DATABASE_URL`],
  );
  if (
    url.hostname !== target.hostname ||
    url.port !== target.port ||
    url.pathname !== target.pathname ||
    url.username !== `fitloom_test_${purpose}`
  )
    throw Error("Expected matching test runtime");
}
const code = (expected) => (error) =>
  error?.code === expected || error?.cause?.code === expected;
const functions = {
  "garment.save": "master_garment_save",
  "service.save": "master_service_save",
  "addon.save": "master_addon_save",
};
function document(label = `Garment ${randomUUID()}`) {
  const d = createStarterBundle(randomUUID).garments[0].definition;
  return { ...d, label, services: [], addons: [] };
}
const savePayload = (definition) => ({
  mode: "create",
  definition,
  baseRate: null,
  currency: "INR",
  serviceOverrides: [],
});

await test("master storage, SQL validation, permissions and immutable tenant history", async (t) => {
  const admin = createPool({
    connectionString: target.href,
    purpose: "web",
    max: 1,
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
  try {
    await admin.query("SET lock_timeout='60s'; SET statement_timeout='60s'");
    await admin.query("SELECT pg_advisory_lock(68122902)");
    await admin.query("SET ROLE fitloom_migrator");
    await migrateDatabase(target.href);
    async function shop() {
      const principalId = randomUUID(),
        tenantId = randomUUID(),
        locationId = randomUUID(),
        membershipId = randomUUID(),
        roleId = randomUUID();
      await admin.query(
        'INSERT INTO public."user"(id,name,email,email_verified) VALUES($1,$1,$2,true)',
        [principalId, `${principalId}@example.test`],
      );
      await admin.query(
        "INSERT INTO app.principals(id,auth_user_id) VALUES($1::uuid,$1::text)",
        [principalId],
      );
      await admin.query(
        "INSERT INTO app.tenants(id,name) VALUES($1,'Master fixture')",
        [tenantId],
      );
      await admin.query(
        "INSERT INTO app.locations(id,tenant_id,name) VALUES($1,$2,'Main')",
        [locationId, tenantId],
      );
      await admin.query(
        "INSERT INTO app.memberships(id,tenant_id,principal_id) VALUES($1,$2,$3)",
        [membershipId, tenantId, principalId],
      );
      await admin.query(
        "INSERT INTO app.roles(id,tenant_id,name) VALUES($1,$2,'Owner')",
        [roleId, tenantId],
      );
      await admin.query("INSERT INTO app.location_grants VALUES($1,$2,$3,$4)", [
        tenantId,
        membershipId,
        locationId,
        roleId,
      ]);
      await admin.query("SELECT app.install_role_presets($1,$2)", [
        tenantId,
        roleId,
      ]);
      return {
        scope: { kind: "tenant", principalId, tenantId, locationId },
        roleId,
        membershipId,
      };
    }
    const a = await shop(),
      b = await shop();
    async function run(scope, kind, payload, options = {}) {
      return withScope(web, scope, async (db) => {
        await db.execute(
          sql`SELECT * FROM app.claim_operation('tenant',${kind},${randomUUID()},${`v1:${"a".repeat(64)}`},${randomUUID()}::uuid)`,
        );
        let result;
        if (kind.endsWith(".lifecycle")) {
          result = (
            await db.execute(
              sql`SELECT app.master_lifecycle(${kind.split(".")[0]},${payload.id}::uuid,${payload.version},${payload.active}) AS value`,
            )
          ).rows[0].value;
        } else {
          result = (
            await db.execute(
              sql`SELECT ${sql.raw(`app.${functions[kind]}`)}(${JSON.stringify(payload)}::jsonb) AS value`,
            )
          ).rows[0].value;
        }
        if (options.fail) throw Error("Injected before completion");
        await db.execute(
          sql`SELECT app.finish_operation(${JSON.stringify(result)}::jsonb,'master_catalog',${scope.tenantId}::uuid,'Synthetic storage check',0,1,'[]'::jsonb)`,
        );
        return result;
      });
    }
    const read = (scope, name, id, version = null) =>
      withScope(
        web,
        scope,
        async (db) =>
          (
            await db.execute(
              sql`SELECT ${sql.raw(`app.${name}`)}(${id}::uuid,${version}::uuid) AS value`,
            )
          ).rows[0].value,
      );
    const catalog = (scope) =>
      withScope(
        web,
        scope,
        async (db) =>
          (await db.execute(sql`SELECT app.master_catalog() AS value`)).rows[0]
            .value,
      );
    const update = (saved, definition, rates = {}) => ({
      ...savePayload(definition),
      mode: "update",
      garmentId: saved.garmentId,
      expectedVersion: saved.version,
      ...rates,
    });

    await t.test(
      "new Owner receives all permissions, other presets remain unchanged; GET does not seed",
      async () => {
        const c = await catalog(a.scope);
        contracts.masterCatalog.parse(c);
        assert.equal(c.catalogVersion, 0);
        assert.equal(
          (
            await admin.query(
              "SELECT * FROM app.master_catalog_state WHERE tenant_id=$1",
              [a.scope.tenantId],
            )
          ).rowCount,
          0,
        );
        const rows = (
          await admin.query(
            "SELECT r.preset,p.permission FROM app.roles r JOIN app.permission_grants p ON p.role_id=r.id WHERE r.tenant_id=$1 AND p.permission LIKE 'masters.%'",
            [a.scope.tenantId],
          )
        ).rows;
        assert.deepEqual(rows.map((r) => r.permission).sort(), [
          "masters.manage",
          "masters.rates.read",
          "masters.read",
        ]);
        assert.ok(rows.every((r) => r.preset === "owner"));
      },
    );
    await t.test(
      "Drizzle declarations match actual master columns and references",
      async () => {
        const tables = [
          schema.masterCatalogState,
          schema.garments,
          schema.masterServices,
          schema.masterAddons,
          schema.garmentVersions,
          schema.masterServiceVersions,
          schema.masterAddonVersions,
          schema.garmentSchemaIdentities,
          schema.garmentVersionServices,
          schema.garmentVersionAddons,
        ];
        for (const table of tables) {
          const config = getTableConfig(table);
          const actual = (
            await admin.query(
              "SELECT column_name,is_nullable,data_type,numeric_precision,numeric_scale FROM information_schema.columns WHERE table_schema='app' AND table_name=$1 ORDER BY ordinal_position",
              [config.name],
            )
          ).rows;
          assert.deepEqual(
            config.columns.map((c) => c.name).sort(),
            actual.map((c) => c.column_name).sort(),
          );
          for (const column of config.columns) {
            const physical = actual.find((c) => c.column_name === column.name);
            assert.equal(
              column.notNull,
              physical.is_nullable === "NO",
              `${config.name}.${column.name}`,
            );
            if (physical.data_type === "numeric") {
              assert.equal(physical.numeric_precision, 24);
              assert.equal(physical.numeric_scale, 6);
            }
          }
          for (const foreignKey of config.foreignKeys) {
            const ref = foreignKey.reference();
            const actualKeys = (
              await admin.query(
                "SELECT pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE conrelid=$1::regclass AND contype='f'",
                [`app.${config.name}`],
              )
            ).rows.map((r) => r.definition);
            assert.ok(
              actualKeys.some(
                (key) =>
                  key.includes(
                    `FOREIGN KEY (${ref.columns.map((c) => c.name).join(", ")})`,
                  ) &&
                  key.includes(
                    `REFERENCES app.${getTableConfig(ref.foreignTable).name}(${ref.foreignColumns.map((c) => c.name).join(", ")})`,
                  ),
              ),
              `${config.name} foreign key`,
            );
          }
        }
      },
    );
    await t.test(
      "custom-role management dependencies hold in application and direct SQL",
      async () => {
        const permissions = [
          "workspace.read",
          "masters.read",
          "masters.manage",
          "masters.rates.read",
        ];
        createRole.input.parse({ name: "Master manager", permissions });
        for (const missing of ["masters.read", "masters.rates.read"]) {
          const incomplete = permissions.filter((p) => p !== missing);
          assert.equal(
            createRole.input.safeParse({
              name: "Incomplete",
              permissions: incomplete,
            }).success,
            false,
          );
          await assert.rejects(
            withScope(web, a.scope, async (db) => {
              await db.execute(
                sql`SELECT * FROM app.claim_operation('tenant','role.create',${randomUUID()},${`v1:${"a".repeat(64)}`},${randomUUID()}::uuid)`,
              );
              await db.execute(
                sql`SELECT app.create_custom_role('Incomplete',${sql.param(incomplete)}::text[])`,
              );
            }),
            code("22023"),
          );
        }
        await withScope(web, a.scope, async (db) => {
          await db.execute(
            sql`SELECT * FROM app.claim_operation('tenant','role.create',${randomUUID()},${`v1:${"a".repeat(64)}`},${randomUUID()}::uuid)`,
          );
          const roleId = (
            await db.execute(
              sql`SELECT app.create_custom_role('Master manager',${sql.param(permissions)}::text[]) AS id`,
            )
          ).rows[0].id;
          await db.execute(
            sql`SELECT app.finish_operation(${JSON.stringify({ roleId })}::jsonb,'role',${roleId}::uuid,'Synthetic role',0,1,'[]'::jsonb)`,
          );
        });
        assert.equal(
          workspacePermissionLabel("masters.manage"),
          "Manage garments and services",
        );
        assert.equal(
          workspacePermissionLabel("masters.rates.read"),
          "View garment and add-on rates",
        );
      },
    );
    const service = await run(a.scope, "service.save", {
      mode: "create",
      label: "New stitching",
    });
    const addon = await run(a.scope, "addon.save", {
      mode: "create",
      label: "Lining",
      amount: "0",
      currency: "INR",
    });
    const d = document();
    d.services = [
      { serviceId: service.serviceId, savedLabel: "Client label ignored" },
    ];
    d.addons = [{ addonId: addon.addonId, savedLabel: "Client label ignored" }];
    const rates = {
      baseRate: "25.5",
      serviceOverrides: [{ serviceId: service.serviceId, rateOverride: "0" }],
    };
    let garment = await run(a.scope, "garment.save", {
      ...savePayload(d),
      ...rates,
    });
    const original = await read(
      a.scope,
      "master_garment_priced",
      garment.garmentId,
    );
    contracts.pricedGarmentDetail.parse(original);
    const other = await run(b.scope, "garment.save", savePayload(document()));
    const otherBefore = await read(
      b.scope,
      "master_garment_priced",
      other.garmentId,
    );
    await t.test(
      "canonical rates and bindings are extracted atomically; independent add-on history",
      async () => {
        assert.equal(original.baseRate, "25.500000");
        assert.equal(original.serviceOverrides[0].rateOverride, "0.000000");
        assert.equal(
          original.definition.services[0].savedLabel,
          "New stitching",
        );
        assert.equal(original.definition.addons[0].savedLabel, "Lining");
        assert.equal(
          (await read(a.scope, "master_addon_priced", addon.addonId)).amount,
          "0.000000",
        );
        const edited = await run(a.scope, "addon.save", {
          mode: "update",
          addonId: addon.addonId,
          expectedVersion: addon.version,
          label: "Premium lining",
          amount: "12.123456",
          currency: "INR",
        });
        assert.equal(edited.catalogVersion, garment.catalogVersion);
        contracts.pricedAddonVersion.parse(
          await read(a.scope, "master_addon_priced", addon.addonId),
        );
        assert.equal(
          (
            await read(
              a.scope,
              "master_addon_priced",
              addon.addonId,
              addon.addonVersionId,
            )
          ).amount,
          "0.000000",
        );
        assert.deepEqual(
          await read(a.scope, "master_garment_priced", garment.garmentId),
          original,
        );
      },
    );
    await t.test(
      "rename/reorder/retire preserve exact v1 and reject retired or repurposed identities",
      async () => {
        const renamed = structuredClone(original.definition);
        renamed.fields.reverse();
        renamed.fields[0].label = "Renamed dimension";
        garment = await run(
          a.scope,
          "garment.save",
          update(garment, renamed, { ...rates, baseRate: "25.500000" }),
        );
        assert.equal(garment.catalogVersion, original.version + 2);
        const v2 = await read(
          a.scope,
          "master_garment_priced",
          garment.garmentId,
        );
        const retired = structuredClone(renamed);
        retired.fields.pop();
        garment = await run(
          a.scope,
          "garment.save",
          update(garment, retired, rates),
        );
        assert.deepEqual(
          await read(
            a.scope,
            "master_garment_priced",
            garment.garmentId,
            original.garmentVersionId,
          ),
          { ...original, version: garment.version },
        );
        assert.deepEqual(
          await read(
            a.scope,
            "master_garment_priced",
            garment.garmentId,
            v2.garmentVersionId,
          ),
          { ...v2, version: garment.version },
        );
        await assert.rejects(
          run(a.scope, "garment.save", update(garment, renamed, rates)),
          code("22023"),
        );
        const changed = structuredClone(retired);
        changed.fields[0].semanticId = null;
        changed.fields[0].basis =
          changed.fields[0].basis === "body" ? "garment" : "body";
        await assert.rejects(
          run(a.scope, "garment.save", update(garment, changed, rates)),
          code("22023"),
        );
        const history = await withScope(
          web,
          a.scope,
          async (db) =>
            (
              await db.execute(
                sql`SELECT app.master_history('garment',${garment.garmentId}::uuid,0) AS value`,
              )
            ).rows[0].value,
        );
        contracts.masterHistoryPage.parse(history);
        assert.equal(history.total, 3);
        assert.deepEqual(
          history.items.map((v) => v.revision),
          [3, 2, 1],
        );
      },
    );
    await t.test(
      "inactive references carry forward only from locked current state",
      async () => {
        const retired = await run(a.scope, "service.lifecycle", {
          id: service.serviceId,
          version: service.version,
          active: false,
        });
        const current = await read(
          a.scope,
          "master_garment_priced",
          garment.garmentId,
        );
        const edited = structuredClone(current.definition);
        edited.category = "Updated category";
        garment = await run(
          a.scope,
          "garment.save",
          update(garment, edited, rates),
        );
        assert.equal(
          (await read(a.scope, "master_garment_schema", garment.garmentId))
            .services[0].bindingState,
          "retired",
        );
        await assert.rejects(
          run(
            a.scope,
            "garment.save",
            update(garment, edited, {
              ...rates,
              serviceOverrides: [
                { serviceId: service.serviceId, rateOverride: "1" },
              ],
            }),
          ),
          code("22023"),
        );
        const crafted = document();
        crafted.services = edited.services;
        await assert.rejects(
          run(a.scope, "garment.save", { ...savePayload(crafted), ...rates }),
          code("22023"),
        );
        const noop = await run(a.scope, "service.lifecycle", {
          id: service.serviceId,
          version: retired.version,
          active: false,
        });
        assert.equal(noop.catalogVersion, retired.catalogVersion);
        assert.equal(noop.version, retired.version);
      },
    );
    await t.test(
      "tenant and concrete-location authority plus independent schema-only projection",
      async () => {
        await assert.rejects(
          read(b.scope, "master_garment_schema", garment.garmentId),
          code("42501"),
        );
        const second = randomUUID();
        await admin.query(
          "INSERT INTO app.locations(id,tenant_id,name) VALUES($1,$2,'Second')",
          [second, a.scope.tenantId],
        );
        await assert.rejects(
          catalog({ ...a.scope, locationId: second }),
          /scope denied/,
        );
        await admin.query(
          "INSERT INTO app.location_grants VALUES($1,$2,$3,$4)",
          [a.scope.tenantId, a.membershipId, second, a.roleId],
        );
        assert.equal(
          (
            await read(
              { ...a.scope, locationId: second },
              "master_garment_priced",
              garment.garmentId,
            )
          ).garmentVersionId,
          garment.garmentVersionId,
        );
        await admin.query(
          "DELETE FROM app.permission_grants WHERE role_id=$1 AND permission IN ('masters.manage','masters.rates.read')",
          [a.roleId],
        );
        const schema = await read(
          a.scope,
          "master_garment_schema",
          garment.garmentId,
        );
        contracts.garmentDetail.parse(schema);
        assert.equal("baseRate" in schema, false);
        assert.equal("serviceOverrides" in schema, false);
        assert.equal("currency" in schema, false);
        const add = await read(a.scope, "master_addon_schema", addon.addonId);
        contracts.addonVersion.parse(add);
        assert.equal("amount" in add, false);
        await assert.rejects(
          read(a.scope, "master_garment_priced", garment.garmentId),
          code("42501"),
        );
        await assert.rejects(
          run(
            a.scope,
            "garment.save",
            update(garment, schema.definition, rates),
          ),
          code("42501"),
        );
        await admin.query(
          "INSERT INTO app.permission_grants SELECT $1,$2,p FROM unnest(ARRAY['masters.manage','masters.rates.read']) p",
          [a.scope.tenantId, a.roleId],
        );
      },
    );
    await t.test(
      "direct runtime table writes/reads and internal helpers are denied; no worker grants",
      async () => {
        const publicFunctions = new Set([
          "master_catalog",
          "master_garment_schema",
          "master_garment_priced",
          "master_service_version",
          "master_addon_schema",
          "master_addon_priced",
          "master_history",
          "master_register_schema",
          "master_register_priced",
          "master_garment_save",
          "master_service_save",
          "master_addon_save",
          "master_lifecycle",
          "master_visibility",
          "master_reorder",
          "master_starters_install",
        ]);
        const routines = (
          await admin.query(
            "SELECT p.proname,p.prosecdef,p.proconfig,has_function_privilege('fitloom_test_web',p.oid,'EXECUTE') AS web,has_function_privilege('fitloom_test_worker',p.oid,'EXECUTE') AS worker FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='app' AND (starts_with(p.proname,'master_') OR p.proname='normalize_master_name')",
          )
        ).rows;
        assert.ok(routines.length > publicFunctions.size);
        assert.deepEqual(
          new Set(routines.filter((r) => r.web).map((r) => r.proname)),
          publicFunctions,
        );
        for (const routine of routines) {
          assert.equal(
            routine.worker,
            false,
            `${routine.proname} worker grant`,
          );
          if (routine.prosecdef)
            assert.ok(
              routine.proconfig?.includes('search_path=""'),
              `${routine.proname} search path`,
            );
        }
        for (const pool of [web, worker]) {
          for (const table of [
            "garments",
            "garment_versions",
            "master_services",
            "master_service_versions",
            "master_addons",
            "master_addon_versions",
            "garment_schema_identities",
            "garment_version_services",
            "garment_version_addons",
            "master_catalog_state",
          ]) {
            for (const query of [
              `SELECT * FROM app.${table}`,
              `DELETE FROM app.${table}`,
              `UPDATE app.${table} SET tenant_id=tenant_id`,
              `INSERT INTO app.${table} DEFAULT VALUES`,
            ])
              await assert.rejects(pool.query(query), code("42501"));
          }
          await assert.rejects(
            pool.query("SELECT app.master_begin('garment.save')"),
            code("42501"),
          );
        }
        await assert.rejects(
          web.query("SELECT app.master_catalog()"),
          code("42501"),
        );
        await assert.rejects(
          worker.query("SELECT app.master_catalog()"),
          code("42501"),
        );
        await assert.rejects(
          withScope(web, a.scope, (db) =>
            db.execute(
              sql`SELECT app.master_garment_save(${JSON.stringify(savePayload(document()))}::jsonb)`,
            ),
          ),
          code("42501"),
        );
        await assert.rejects(
          withScope(web, a.scope, async (db) => {
            await db.execute(
              sql`SELECT * FROM app.claim_operation('tenant','service.save',${randomUUID()},${`v1:${"a".repeat(64)}`},${randomUUID()}::uuid)`,
            );
            await db.execute(
              sql`SELECT app.master_garment_save(${JSON.stringify(savePayload(document()))}::jsonb)`,
            );
          }),
          code("42501"),
        );
      },
    );
    await t.test(
      "immutable versions, binding rows, one-way registry, pointers and finite numeric constraints",
      async () => {
        for (const table of [
          "garment_versions",
          "master_service_versions",
          "master_addon_versions",
          "garment_version_services",
          "garment_version_addons",
        ]) {
          await assert.rejects(
            admin.query(`UPDATE app.${table} SET tenant_id=tenant_id`),
            code("23514"),
          );
          await assert.rejects(
            admin.query(`DELETE FROM app.${table}`),
            code("23514"),
          );
        }
        await assert.rejects(
          admin.query(
            "UPDATE app.garment_schema_identities SET retired_revision=NULL WHERE retired_revision IS NOT NULL",
          ),
          code("23514"),
        );
        await assert.rejects(
          admin.query(
            "UPDATE app.garments SET current_version_id=$1 WHERE id=$2",
            [other.garmentVersionId, garment.garmentId],
          ),
          code("23503"),
        );
        const sameTenant = await run(
          a.scope,
          "garment.save",
          savePayload(document()),
        );
        await assert.rejects(
          admin.query(
            "UPDATE app.garments SET current_version_id=$1 WHERE id=$2",
            [sameTenant.garmentVersionId, garment.garmentId],
          ),
          code("23503"),
        );
        await assert.rejects(
          admin.query(
            "INSERT INTO app.master_addons(tenant_id,normalized_name,sort_position,version) VALUES($1,'missing pointer',99,1)",
            [a.scope.tenantId],
          ),
          code("23514"),
        );
        assert.ok(
          (
            await admin.query(
              "SELECT relname,relrowsecurity,relforcerowsecurity FROM pg_class WHERE relnamespace='app'::regnamespace AND relname=ANY($1)",
              [
                [
                  "garments",
                  "garment_versions",
                  "master_catalog_state",
                  "garment_schema_identities",
                ],
              ],
            )
          ).rows.every((r) => r.relrowsecurity && r.relforcerowsecurity),
        );
      },
    );
    await t.test(
      "SQL rejects every definition defect and rate overflow before persistence",
      async () => {
        const mutations = [
          (d) => {
            d.fields[0].kind = "unknown";
          },
          (d) => {
            d.fields[0].basis = "garment";
          },
          (d) => {
            d.fields[0].sectionId = randomUUID();
          },
          (d) => {
            d.fields.push(d.fields[0]);
          },
          (d) => {
            d.fields[0].min = "NaN";
          },
          (d) => {
            d.fields[0].min = "-0";
          },
          (d) => {
            d.fields[0].max = "1.0000001";
          },
          (d) => {
            d.fields[0].min = "2";
            d.fields[0].max = "1";
          },
          (d) => {
            d.iconId = "/tmp/unsafe.svg";
          },
          (d) => {
            d.unknown = true;
          },
        ];
        for (const mutate of mutations) {
          const invalid = document();
          mutate(invalid);
          await assert.rejects(
            run(a.scope, "garment.save", savePayload(invalid)),
            code("22023"),
          );
        }
        for (const baseRate of [
          "-0",
          "-1",
          "NaN",
          "1e2",
          "1.0000000",
          "1000000000000000000",
          0,
        ])
          await assert.rejects(
            run(a.scope, "garment.save", {
              ...savePayload(document()),
              baseRate,
            }),
            code("22023"),
          );
        await assert.rejects(
          run(a.scope, "garment.save", {
            ...savePayload(document()),
            currency: "USD",
          }),
          code("22023"),
        );
        const crossTenant = document();
        crossTenant.services = [
          { serviceId: service.serviceId, savedLabel: "New stitching" },
        ];
        await assert.rejects(
          run(b.scope, "garment.save", {
            ...savePayload(crossTenant),
            serviceOverrides: [
              { serviceId: service.serviceId, rateOverride: null },
            ],
          }),
          code("22023"),
        );
      },
    );
    await t.test(
      "numeric checks reject NaN and negative values under direct privileged inserts",
      async () => {
        const operationId = (
          await admin.query(
            "SELECT operation_id FROM app.master_addon_versions WHERE addon_id=$1 LIMIT 1",
            [addon.addonId],
          )
        ).rows[0].operation_id;
        for (const amount of ["NaN", "-1", "1000000000000000000"]) {
          await assert.rejects(
            admin.query(
              "INSERT INTO app.master_addon_versions(tenant_id,addon_id,revision,label,amount,currency,author_id,created_location_id,operation_id) VALUES($1,$2,999,'Invalid',$3::numeric,'INR',$4,$5,$6)",
              [
                a.scope.tenantId,
                addon.addonId,
                amount,
                a.scope.principalId,
                a.scope.locationId,
                operationId,
              ],
            ),
            code(amount === "1000000000000000000" ? "22003" : "23514"),
          );
        }
      },
    );
    await t.test(
      "all field kinds and semantic signatures are revalidated in SQL",
      async () => {
        const d = document();
        const common = {
          sectionId: d.sections[0].id,
          label: "Custom",
          required: false,
          semanticId: null,
          help: "",
          illustrationId: null,
        };
        d.fields.push(
          {
            ...common,
            id: randomUUID(),
            kind: "number",
            unit: "count",
            decimalPlaces: 0,
            min: "0",
            max: "10",
          },
          { ...common, id: randomUUID(), kind: "text", maxLength: 500 },
          { ...common, id: randomUUID(), kind: "boolean" },
          {
            ...common,
            id: randomUUID(),
            kind: "select",
            choices: [
              {
                id: randomUUID(),
                label: "Regular",
                illustrationId: null,
                active: true,
              },
            ],
          },
        );
        const saved = await run(a.scope, "garment.save", savePayload(d));
        contracts.pricedGarmentDetail.parse(
          await read(a.scope, "master_garment_priced", saved.garmentId),
        );
        const oldId = d.fields[4].id;
        d.fields[4].unit = "unitless";
        await assert.rejects(
          run(a.scope, "garment.save", update(saved, d)),
          code("22023"),
        );
        d.fields[4].id = randomUUID();
        await run(a.scope, "garment.save", update(saved, d));
        assert.notEqual(d.fields[4].id, oldId);
        d.fields[4].unit = "count";
        d.fields[4].min = "0.1";
        await assert.rejects(
          run(a.scope, "garment.save", savePayload(d)),
          code("22023"),
        );
        const space = document();
        space.label = "\u00a0";
        await assert.rejects(
          run(a.scope, "garment.save", savePayload(space)),
          code("22023"),
        );
        assert.equal(
          (
            await admin.query("SELECT app.normalize_master_name($1) AS name", [
              "\u00a0 Shirt \ufeff",
            ])
          ).rows[0].name,
          "shirt",
        );
      },
    );
    await t.test(
      "group kinds and option owners cannot be reassigned in direct SQL publication",
      async () => {
        const d = document();
        const common = {
          sectionId: d.sections[0].id,
          label: "Custom choice",
          required: false,
          semanticId: null,
          help: "",
          illustrationId: null,
        };
        d.fields.push({
          ...common,
          id: randomUUID(),
          kind: "select",
          choices: [
            {
              id: randomUUID(),
              label: "One",
              illustrationId: null,
              active: true,
            },
            {
              id: randomUUID(),
              label: "Two",
              illustrationId: null,
              active: true,
            },
          ],
        });
        const saved = await run(a.scope, "garment.save", savePayload(d));
        const regrouped = structuredClone(d);
        regrouped.constructionGroups[0].kind = "multiple";
        await assert.rejects(
          run(a.scope, "garment.save", update(saved, regrouped)),
          code("22023"),
        );
        const moved = structuredClone(d);
        moved.constructionGroups[0].choices.push(moved.fields[4].choices.pop());
        await assert.rejects(
          run(a.scope, "garment.save", update(saved, moved)),
          code("22023"),
        );
        const duplicate = structuredClone(d);
        duplicate.label = `Duplicate IDs ${randomUUID()}`;
        duplicate.fields[0].id = duplicate.fields[0].id.toUpperCase();
        duplicate.fields.push({
          ...duplicate.fields[0],
          id: duplicate.fields[0].id.toLowerCase(),
        });
        await assert.rejects(
          run(a.scope, "garment.save", savePayload(duplicate)),
          code("22023"),
        );
      },
    );
    await t.test(
      "tenant-qualified binding rows and creation locations reject foreign references",
      async () => {
        await assert.rejects(
          admin.query(
            "INSERT INTO app.garment_version_services(tenant_id,garment_id,garment_version_id,service_id,position,saved_label) VALUES($1,$2,$3,$4,0,'Foreign')",
            [
              b.scope.tenantId,
              other.garmentId,
              other.garmentVersionId,
              service.serviceId,
            ],
          ),
          code("23503"),
        );
        const operationId = (
          await admin.query(
            "SELECT operation_id FROM app.master_service_versions WHERE id=$1",
            [service.serviceVersionId],
          )
        ).rows[0].operation_id;
        await assert.rejects(
          admin.query(
            "INSERT INTO app.master_service_versions(tenant_id,service_id,revision,label,author_id,created_location_id,operation_id) VALUES($1,$2,999,'Foreign',$3,$4,$5)",
            [
              a.scope.tenantId,
              service.serviceId,
              a.scope.principalId,
              b.scope.locationId,
              operationId,
            ],
          ),
          code("23503"),
        );
      },
    );
    await t.test(
      "SQL UUID boundary accepts every RFC form admitted by the shared contract",
      async () => {
        const d = document();
        d.sections[0].id = "00000000-0000-0000-0000-000000000000";
        for (const field of d.fields) field.sectionId = d.sections[0].id;
        d.fields[0].id = "ffffffff-ffff-ffff-ffff-ffffffffffff";
        contracts.garmentDefinition.parse(d);
        const saved = await run(a.scope, "garment.save", savePayload(d));
        contracts.garmentDetail.parse(
          await read(a.scope, "master_garment_schema", saved.garmentId),
        );
      },
    );
    await t.test(
      "SQL budget includes JSONB spacing and escaping; normalized stored document is bounded",
      async () => {
        const large = document();
        const sectionId = large.sections[0].id;
        large.fields = Array.from({ length: 60 }, () => ({
          id: randomUUID(),
          kind: "text",
          label: '"'.repeat(100),
          help: '"'.repeat(500),
          sectionId,
          required: false,
          semanticId: null,
          illustrationId: null,
          maxLength: 500,
        }));
        contracts.garmentDefinition.parse(large);
        await assert.rejects(
          run(a.scope, "garment.save", savePayload(large)),
          code("22023"),
        );
        large.fields = large.fields.slice(0, 20);
        const bounded = await run(a.scope, "garment.save", savePayload(large));
        const size = (
          await admin.query(
            "SELECT octet_length(definition::text) AS bytes FROM app.garment_versions WHERE id=$1",
            [bounded.garmentVersionId],
          )
        ).rows[0].bytes;
        assert.ok(size <= 65536);
      },
    );
    await t.test(
      "NFC, Tamil and ASCII name reservation survive retirement",
      async () => {
        const composed = `Cafe\u0301 ${randomUUID()}`;
        const s = await run(a.scope, "service.save", {
          mode: "create",
          label: composed,
        });
        await assert.rejects(
          run(a.scope, "service.save", {
            mode: "create",
            label: composed.normalize("NFC").replace("Caf", "CAF"),
          }),
          code("23505"),
        );
        await run(a.scope, "service.lifecycle", {
          id: s.serviceId,
          version: s.version,
          active: false,
        });
        await assert.rejects(
          run(a.scope, "service.save", { mode: "create", label: composed }),
          code("23505"),
        );
        const tamil = `தமிழ் ${randomUUID()}`;
        await run(a.scope, "service.save", { mode: "create", label: tamil });
        assert.equal(
          (
            await admin.query("SELECT app.normalize_master_name($1) AS name", [
              tamil,
            ])
          ).rows[0].name,
          tamil,
        );
      },
    );
    await t.test(
      "failed updates roll back pointers, versions, bindings and identity retirement together",
      async () => {
        const definition = document();
        definition.services = [
          { serviceId: service.serviceId, savedLabel: "New stitching" },
        ];
        definition.addons = [
          { addonId: addon.addonId, savedLabel: "Premium lining" },
        ];
        // This service was retired above. Restore it before creating a new binding.
        const header = (
          await admin.query(
            "SELECT version FROM app.master_services WHERE id=$1",
            [service.serviceId],
          )
        ).rows[0];
        await run(a.scope, "service.lifecycle", {
          id: service.serviceId,
          version: header.version,
          active: true,
        });
        const saved = await run(a.scope, "garment.save", {
          ...savePayload(definition),
          baseRate: "88.123456",
          serviceOverrides: [
            { serviceId: service.serviceId, rateOverride: "0" },
          ],
        });
        const snapshot = async () => {
          const values = {};
          for (const table of [
            "garments",
            "garment_versions",
            "garment_version_services",
            "garment_version_addons",
            "garment_schema_identities",
          ]) {
            const column = table === "garments" ? "id" : "garment_id";
            values[table] = (
              await admin.query(
                `SELECT to_jsonb(r) AS row FROM app.${table} r WHERE tenant_id=$1 AND ${column}=$2 ORDER BY to_jsonb(r)::text`,
                [a.scope.tenantId, saved.garmentId],
              )
            ).rows;
          }
          values.catalog = await catalog(a.scope);
          return values;
        };
        const before = await snapshot();
        const failed = structuredClone(definition);
        failed.fields.pop();
        failed.services = [];
        failed.addons = [];
        await assert.rejects(
          run(
            a.scope,
            "garment.save",
            update(saved, failed, { baseRate: "0" }),
            { fail: true },
          ),
          /Injected before completion/,
        );
        assert.deepEqual(await snapshot(), before);
        assert.deepEqual(
          await read(b.scope, "master_garment_priced", other.garmentId),
          otherBefore,
        );
      },
    );
    await t.test(
      "two stale saves serialize with one conflict and rollback before audit completion is complete",
      async () => {
        const current = await read(
          a.scope,
          "master_garment_priced",
          garment.garmentId,
        );
        const results = await Promise.allSettled(
          [1, 2].map((i) =>
            run(
              a.scope,
              "garment.save",
              update(
                garment,
                { ...current.definition, category: `Concurrent ${i}` },
                rates,
              ),
            ),
          ),
        );
        assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
        assert.ok(
          results
            .filter((r) => r.status === "rejected")
            .every((r) => code("P0003")(r.reason)),
        );
        const before = await catalog(a.scope);
        const label = `Rollback ${randomUUID()}`;
        await assert.rejects(
          run(a.scope, "garment.save", savePayload(document(label)), {
            fail: true,
          }),
          /Injected/,
        );
        assert.deepEqual(await catalog(a.scope), before);
        assert.equal(
          (
            await admin.query(
              "SELECT * FROM app.garments WHERE tenant_id=$1 AND normalized_name=app.normalize_master_name($2)",
              [a.scope.tenantId, label],
            )
          ).rowCount,
          0,
        );
        assert.deepEqual(
          await read(b.scope, "master_garment_priced", other.garmentId),
          otherBefore,
        );
      },
    );
  } finally {
    await Promise.all([web.end(), worker.end()]);
    await admin.query("SELECT pg_advisory_unlock(68122902)");
    await admin.end();
  }
});
