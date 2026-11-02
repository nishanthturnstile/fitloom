import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { createPool } from "@fitloom/db";
import { migrateDatabase } from "../../db/scripts/migrate.mjs";
import { createCommandExecutor, principalId } from "../dist/commands.js";
import { createStarterBundle } from "../dist/master-starters.js";
import { createMasterService, saveGarment } from "../dist/masters.js";

const u = new URL(process.env.TEST_MIGRATOR_DATABASE_URL);
if (
  u.pathname !== "/fitloom_test" ||
  u.username !== "fitloom_test_migrator" ||
  !["localhost", "127.0.0.1", "postgres"].includes(u.hostname)
)
  throw Error("Isolated test credentials required");
const runtime = new URL(process.env.TEST_WEB_DATABASE_URL);
if (
  runtime.hostname !== u.hostname ||
  runtime.port !== u.port ||
  runtime.pathname !== u.pathname ||
  runtime.username !== "fitloom_test_web"
)
  throw Error("Matching test runtime required");
const category = (kind) => (e) => e.category === kind;
const invocation = (payload, key = randomUUID()) => ({
  payload,
  operationKey: key,
  correlationId: randomUUID(),
});
function garment(label) {
  const d = createStarterBundle(randomUUID).garments[0].definition;
  return {
    mode: "create",
    definition: {
      ...d,
      label,
      fields: [],
      sections: [],
      constructionGroups: [],
      services: [],
      addons: [],
    },
    baseRate: null,
    currency: "INR",
    serviceOverrides: [],
  };
}
await test("master service commands, initialization, projections, catalog and replay", async (t) => {
  const admin = createPool({
    connectionString: u.href,
    purpose: "web",
    max: 1,
  });
  const web = createPool({
    connectionString: runtime.href,
    purpose: "web",
    max: 6,
  });
  try {
    await admin.query("SET lock_timeout='60s'; SET statement_timeout='60s'");
    await admin.query("SELECT pg_advisory_lock(68122902)");
    await admin.query("SET ROLE fitloom_migrator");
    await migrateDatabase(u.href);
    async function shop() {
      const actor = randomUUID(),
        tenant = randomUUID(),
        location = randomUUID(),
        member = randomUUID(),
        role = randomUUID();
      await admin.query(
        'INSERT INTO public."user"(id,name,email,email_verified) VALUES($1,$1,$2,true)',
        [actor, `${actor}@example.test`],
      );
      await admin.query(
        "INSERT INTO app.principals(id,auth_user_id) VALUES($1::uuid,$1::text)",
        [actor],
      );
      await admin.query(
        "INSERT INTO app.tenants(id,name) VALUES($1,'Master service fixture')",
        [tenant],
      );
      await admin.query(
        "INSERT INTO app.locations(id,tenant_id,name) VALUES($1,$2,'Main')",
        [location, tenant],
      );
      await admin.query(
        "INSERT INTO app.memberships(id,tenant_id,principal_id) VALUES($1,$2,$3)",
        [member, tenant, actor],
      );
      await admin.query(
        "INSERT INTO app.roles(id,tenant_id,name) VALUES($1,$2,'Owner')",
        [role, tenant],
      );
      await admin.query("INSERT INTO app.location_grants VALUES($1,$2,$3,$4)", [
        tenant,
        member,
        location,
        role,
      ]);
      await admin.query("SELECT app.install_role_presets($1,$2)", [
        tenant,
        role,
      ]);
      return {
        target: { tenantId: tenant, locationId: location },
        role,
        actor,
        service: createMasterService({
          pool: web,
          resolveIdentity: async () => ({
            principalId: principalId.parse(actor),
          }),
        }),
      };
    }
    const a = await shop();
    const command = (action, payload, key) =>
      a.service.command(action, a.target, invocation(payload, key));
    let init;
    await t.test(
      "empty catalog GET is virtual; simultaneous successful install replays exact IDs",
      async () => {
        assert.equal((await a.service.catalog(a.target)).catalogVersion, 0);
        const request = invocation({
          bundleVersion: "tailoring-core-v1",
          expectedCatalogVersion: 0,
        });
        const results = await Promise.all(
          [1, 2].map(() =>
            a.service.command("masters.starters.install", a.target, request),
          ),
        );
        assert.equal(results.filter((r) => r.replayed).length, 1);
        assert.deepEqual(results[0].result, results[1].result);
        init = results[0].result;
        assert.equal(init.catalogVersion, 1);
        assert.equal(init.garmentIds.length, 3);
        const c = await a.service.catalog(a.target);
        assert.equal(c.installedTemplateKeys.length, 5);
      },
    );
    await t.test(
      "no-op installation preserves edits and catalog audit identity",
      async () => {
        const first = await a.service.garment(a.target, init.garmentIds[0]);
        await command("garment.save", {
          mode: "update",
          garmentId: first.garmentId,
          expectedVersion: first.version,
          definition: { ...first.definition, label: "Edited shirt" },
          baseRate: "0",
          currency: "INR",
          serviceOverrides: first.serviceOverrides,
        });
        const noop = await command("masters.starters.install", {
          bundleVersion: "tailoring-core-v1",
          expectedCatalogVersion: 1,
        });
        assert.equal(noop.result.catalogVersion, 1);
        assert.deepEqual(noop.result.garmentIds, init.garmentIds);
        assert.equal(
          (await a.service.garment(a.target, first.garmentId)).definition.label,
          "Edited shirt",
        );
        const audit = (
          await admin.query(
            "SELECT entity_kind,entity_id,previous_version,next_version FROM app.command_audit WHERE operation_id=$1",
            [noop.operationId],
          )
        ).rows[0];
        assert.deepEqual(audit, {
          entity_kind: "master_catalog",
          entity_id: a.target.tenantId,
          previous_version: 1,
          next_version: 1,
        });
      },
    );
    await t.test(
      "bounded registers share filtered counts; cross-page reorder uses full catalog",
      async () => {
        for (let i = 0; i < 53; i++)
          await command(
            "garment.save",
            garment(`Custom ${String(i).padStart(2, "0")}`),
          );
        const first = await a.service.page(a.target, "garment");
        assert.equal(first.items.length, 50);
        assert.equal(first.total, 56);
        assert.equal(first.nextOffset, 50);
        const second = await a.service.page(a.target, "garment", {
          offset: 50,
        });
        assert.equal(second.items.length, 6);
        const moved = second.items.at(-1).id;
        const r = await command("masters.reorder", {
          kind: "garment",
          movedId: moved,
          beforeId: first.items[0].id,
          expectedCatalogVersion: first.catalogVersion,
        });
        assert.equal(
          (await a.service.page(a.target, "garment")).items[0].id,
          moved,
        );
        const noop = await command("masters.reorder", {
          kind: "garment",
          movedId: moved,
          beforeId: first.items[0].id,
          expectedCatalogVersion: r.result.catalogVersion,
        });
        assert.equal(noop.result.catalogVersion, r.result.catalogVersion);
        await assert.rejects(
          command("masters.reorder", {
            kind: "garment",
            movedId: moved,
            beforeId: null,
            expectedCatalogVersion: first.catalogVersion,
          }),
          category("conflict"),
        );
        const search = await a.service.page(a.target, "garment", {
          search: "CUSTOM 0",
          origin: "custom",
        });
        assert.equal(search.total, 10);
        const filtered = await a.service.page(a.target, "garment", {
          applicability: "feminine",
        });
        assert.equal(filtered.total, 1);
        const hidden = await command("masters.visibility", {
          expectedCatalogVersion: r.result.catalogVersion,
          hideStandardGarments: true,
          hideStandardServices: true,
        });
        assert.equal((await a.service.page(a.target, "garment")).total, 53);
        assert.equal(
          (await a.service.page(a.target, "garment", { visibility: "all" }))
            .total,
          56,
        );
        assert.equal((await a.service.page(a.target, "service")).total, 0);
        assert.equal(
          (await a.service.page(a.target, "service", { visibility: "all" }))
            .total,
          2,
        );
        assert.equal(
          (await a.service.catalog(a.target)).catalogVersion,
          hidden.result.catalogVersion,
        );
      },
    );
    await t.test(
      "filtered pages, normalized prefixes and catalog audits use authoritative current state",
      async () => {
        const fixture = await shop();
        const execute = (action, payload) =>
          fixture.service.command(action, fixture.target, invocation(payload));
        const installed = await execute("masters.starters.install", {
          bundleVersion: "tailoring-core-v1",
          expectedCatalogVersion: 0,
        });
        const ids = [];
        for (let index = 0; index < 5; index++) {
          const payload = garment(`Filtered ${index}`);
          payload.definition.applicability = "feminine";
          ids.push((await execute("garment.save", payload)).result.garmentId);
        }
        let token = (await fixture.service.catalog(fixture.target))
          .catalogVersion;
        const current = await fixture.service.garment(fixture.target, ids[0]);
        const edited = await execute("garment.save", {
          mode: "update",
          garmentId: current.garmentId,
          expectedVersion: current.version,
          definition: { ...current.definition, applicability: "masculine" },
          baseRate: "0",
          currency: "INR",
          serviceOverrides: [],
        });
        assert.equal(edited.result.catalogVersion, token);
        const query = {
          search: "FILTERED",
          applicability: "feminine",
          origin: "custom",
          limit: 2,
        };
        const pages = [];
        let offset = 0;
        do {
          const page = await fixture.service.page(fixture.target, "garment", {
            ...query,
            offset,
          });
          assert.equal(page.total, 4);
          assert.equal(page.catalogVersion, token);
          pages.push(...page.items);
          offset = page.nextOffset;
        } while (offset !== null);
        assert.deepEqual(
          pages.map((row) => row.id),
          ids.slice(1),
        );
        const audit = async (result, previous, next) => {
          assert.equal(result.result.catalogVersion, next);
          assert.deepEqual(
            (
              await admin.query(
                "SELECT entity_kind,entity_id,previous_version,next_version FROM app.command_audit WHERE operation_id=$1",
                [result.operationId],
              )
            ).rows[0],
            {
              entity_kind: "master_catalog",
              entity_id: fixture.target.tenantId,
              previous_version: previous,
              next_version: next,
            },
          );
        };
        await audit(
          await execute("masters.visibility", {
            expectedCatalogVersion: token,
            hideStandardGarments: true,
            hideStandardServices: true,
          }),
          token,
          token + 1,
        );
        token++;
        await audit(
          await execute("masters.reorder", {
            kind: "garment",
            movedId: ids[4],
            beforeId: ids[1],
            expectedCatalogVersion: token,
          }),
          token,
          token + 1,
        );
        token++;
        await audit(
          await execute("masters.starters.install", {
            bundleVersion: "tailoring-core-v1",
            expectedCatalogVersion: token,
          }),
          token,
          token,
        );
        assert.equal(
          (await fixture.service.page(fixture.target, "garment")).total,
          5,
        );
        assert.equal(
          (
            await fixture.service.page(fixture.target, "garment", {
              visibility: "all",
            })
          ).total,
          8,
        );
        assert.deepEqual(
          (
            await fixture.service.page(fixture.target, "garment", query)
          ).items.map((row) => row.id),
          [ids[4], ids[1]],
        );
        for (const [label, prefix] of [
          ["Cafe\u0301 tailoring", "CAFé"],
          ["தமிழ் தையல்", "தமிழ்"],
        ]) {
          const created = await execute("service.save", {
            mode: "create",
            label,
          });
          const found = await fixture.service.page(fixture.target, "service", {
            search: prefix,
          });
          assert.deepEqual(
            found.items.map((row) => row.id),
            [created.result.serviceId],
          );
          await execute("service.lifecycle", {
            serviceId: created.result.serviceId,
            expectedVersion: created.result.version,
            active: false,
          });
          assert.equal(
            (
              await fixture.service.page(fixture.target, "service", {
                search: prefix,
              })
            ).total,
            0,
          );
          assert.equal(
            (
              await fixture.service.page(fixture.target, "service", {
                search: prefix,
                active: "inactive",
              })
            ).items[0].id,
            created.result.serviceId,
          );
        }
        assert.equal(installed.result.garmentIds.length, 3);
      },
    );
    await t.test(
      "lost-response retry returns exact version; changed payload and stale saves conflict",
      async () => {
        const request = invocation(garment("Retry garment"));
        const first = await a.service.command(
          "garment.save",
          a.target,
          request,
        );
        const replay = await a.service.command("garment.save", a.target, {
          ...request,
          correlationId: randomUUID(),
        });
        assert.equal(replay.replayed, true);
        assert.deepEqual(replay.result, first.result);
        await assert.rejects(
          a.service.command("garment.save", a.target, {
            ...request,
            payload: garment("Changed payload"),
          }),
          category("conflict"),
        );
        const detail = await a.service.garment(
          a.target,
          first.result.garmentId,
        );
        const edit = {
          mode: "update",
          garmentId: detail.garmentId,
          expectedVersion: detail.version,
          definition: { ...detail.definition, label: "Edited retry" },
          baseRate: null,
          currency: "INR",
          serviceOverrides: [],
        };
        const results = await Promise.allSettled(
          [1, 2].map(() => command("garment.save", edit)),
        );
        assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
        assert.ok(
          results
            .filter((r) => r.status === "rejected")
            .every((r) => r.reason.category === "conflict"),
        );
        assert.equal(
          (
            await a.service.garment(
              a.target,
              detail.garmentId,
              detail.garmentVersionId,
            )
          ).definition.label,
          "Retry garment",
        );
        assert.equal(
          (await a.service.history(a.target, "garment", detail.garmentId))
            .total,
          2,
        );
      },
    );
    await t.test(
      "revoked rate authority blocks full save and replay, with price-free reads",
      async () => {
        const request = invocation(garment("Revoked replay"));
        const first = await a.service.command(
          "garment.save",
          a.target,
          request,
        );
        await command("addon.save", {
          mode: "create",
          label: "Priced addon",
          amount: "12.34",
          currency: "INR",
        });
        await admin.query(
          "DELETE FROM app.permission_grants WHERE role_id=$1 AND permission='masters.rates.read'",
          [a.role],
        );
        await assert.rejects(
          a.service.command("garment.save", a.target, request),
          category("access"),
        );
        const detail = await a.service.garment(
          a.target,
          first.result.garmentId,
        );
        assert.equal("baseRate" in detail, false);
        assert.equal("serviceOverrides" in detail, false);
        assert.ok(
          (await a.service.page(a.target, "garment")).items.every(
            (row) => !("baseRate" in row),
          ),
        );
        const addons = await a.service.page(a.target, "addon");
        assert.ok(addons.items.every((row) => !("amount" in row)));
        assert.equal(
          "amount" in (await a.service.addon(a.target, addons.items[0].id)),
          false,
        );
        await admin.query(
          "INSERT INTO app.permission_grants VALUES($1,$2,'masters.rates.read')",
          [a.target.tenantId, a.role],
        );
        assert.equal(
          (await a.service.command("garment.save", a.target, request)).replayed,
          true,
        );
      },
    );
    await t.test(
      "starter collisions roll back the full bundle; new concurrent installs conflict safely",
      async () => {
        const b = await shop();
        await b.service.command(
          "garment.save",
          b.target,
          invocation(garment("Shirt")),
        );
        await assert.rejects(
          b.service.command(
            "masters.starters.install",
            b.target,
            invocation({
              bundleVersion: "tailoring-core-v1",
              expectedCatalogVersion: 1,
            }),
          ),
          (e) => e.category === "conflict" && e.issues.length === 1,
        );
        assert.equal((await b.service.page(b.target, "service")).total, 0);
        assert.equal((await b.service.page(b.target, "garment")).total, 1);
        assert.equal(
          (await b.service.catalog(b.target)).starterBundleVersion,
          null,
        );
        const c = await shop();
        const results = await Promise.allSettled(
          [1, 2].map(() =>
            c.service.command(
              "masters.starters.install",
              c.target,
              invocation({
                bundleVersion: "tailoring-core-v1",
                expectedCatalogVersion: 0,
              }),
            ),
          ),
        );
        assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
        assert.ok(
          results
            .filter((r) => r.status === "rejected")
            .every((r) => r.reason.category === "conflict"),
        );
        await assert.rejects(a.service.catalog(b.target), category("access"));
      },
    );
    await t.test(
      "successful replay survives a later retired service dependency",
      async () => {
        const payload = garment("Dependency replay");
        const serviceId = init.serviceIds[0];
        payload.definition.services = [
          { serviceId, savedLabel: "New stitching" },
        ];
        payload.serviceOverrides = [{ serviceId, rateOverride: "0" }];
        const request = invocation(payload);
        const first = await a.service.command(
          "garment.save",
          a.target,
          request,
        );
        await command("service.lifecycle", {
          serviceId,
          expectedVersion: 1,
          active: false,
        });
        const replay = await a.service.command(
          "garment.save",
          a.target,
          request,
        );
        assert.equal(replay.replayed, true);
        assert.deepEqual(replay.result, first.result);
        await assert.rejects(
          command("garment.save", {
            ...payload,
            definition: {
              ...payload.definition,
              label: "New inactive binding",
            },
          }),
          category("validation"),
        );
      },
    );
    await t.test(
      "bounded validation issues, safe error translation and rollback before completion",
      async () => {
        const invalid = garment(" ");
        invalid.definition.fields = Array.from({ length: 60 }, () => ({
          kind: "date",
        }));
        await assert.rejects(
          command("garment.save", invalid),
          (e) =>
            e.category === "validation" &&
            e.issues.length <= 30 &&
            e.issues.length > 0,
        );
        await assert.rejects(
          async () =>
            a.service.page(a.target, "garment", { search: "x", unknown: true }),
          category("validation"),
        );
        const before = await a.service.catalog(a.target);
        const execute = createCommandExecutor({
          pool: web,
          resolveIdentity: async () => ({
            principalId: principalId.parse(a.actor),
          }),
        });
        const broken = {
          ...saveGarment,
          async mutate(...args) {
            await saveGarment.mutate(...args);
            throw Error("Injected before audit");
          },
        };
        await assert.rejects(
          execute(broken, {
            ...invocation(garment("Rolled back")),
            scope: { kind: "tenant", ...a.target },
          }),
          category("temporary"),
        );
        assert.deepEqual(await a.service.catalog(a.target), before);
        assert.equal(
          (await a.service.page(a.target, "garment", { search: "Rolled back" }))
            .total,
          0,
        );
      },
    );
  } finally {
    await web.end();
    await admin.query("SELECT pg_advisory_unlock(68122902)");
    await admin.end();
  }
});
