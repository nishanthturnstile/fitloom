import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { createPool, withScope } from "@fitloom/db";
import { sql } from "drizzle-orm";
import { migrateDatabase } from "../../db/scripts/migrate.mjs";
import {
  CUSTOMER_PERMISSIONS,
  normalizeCustomerSearch,
} from "../dist/customer-contracts.js";
import {
  createCustomerService,
  createRole,
  createWorkspaceService,
  provisionTenant,
  saveSetupDraft,
} from "../dist/index.js";

for (const purpose of ["MIGRATOR", "WEB", "WORKER"]) {
  const url = new URL(process.env[`TEST_${purpose}_DATABASE_URL`]);
  if (
    url.pathname !== "/fitloom_test" ||
    url.username !== `fitloom_test_${purpose.toLowerCase()}` ||
    !["127.0.0.1", "postgres"].includes(url.hostname)
  )
    throw Error("Isolated test database required");
}
const invoke = (scope, payload) => ({
  scope,
  payload,
  operationKey: randomUUID(),
  correlationId: randomUUID(),
});
const code = (expected) => (error) =>
  error.code === expected || error.cause?.code === expected;

await test("customer storage foundation and CRM authority", async (t) => {
  const admin = createPool({
    connectionString: process.env.TEST_MIGRATOR_DATABASE_URL,
    purpose: "web",
    max: 1,
  });
  const web = createPool({
    connectionString: process.env.TEST_WEB_DATABASE_URL,
    purpose: "web",
    max: 2,
  });
  const worker = createPool({
    connectionString: process.env.TEST_WORKER_DATABASE_URL,
    purpose: "worker",
    max: 1,
  });
  await admin.query("SET lock_timeout='20s'");
  await admin.query("SELECT pg_advisory_lock(68122902)");
  try {
    await migrateDatabase(process.env.TEST_MIGRATOR_DATABASE_URL);
    await migrateDatabase(process.env.TEST_MIGRATOR_DATABASE_URL);
    const identity = randomUUID(),
      user = randomUUID();
    await admin.query(
      'INSERT INTO public."user"(id,name,email,email_verified) VALUES($1,$1,$2,true)',
      [user, `${user}@example.test`],
    );
    await admin.query(
      "INSERT INTO app.principals(id,auth_user_id) VALUES($1,$2)",
      [identity, user],
    );
    const service = createWorkspaceService({
      pool: web,
      resolveIdentity: async () => ({ principalId: identity }),
    });
    const profile = {
      shopName: "Customer storage fixture",
      locationName: "Main",
      businessMode: "tailoring",
      ownerName: "Fixture owner",
      ownerPhone: "+919876543210",
      address: "Synthetic street",
      timezone: "Asia/Kolkata",
      consentAccepted: true,
      consentVersion: "workspace-authority-v1",
    };
    await service.execute(
      saveSetupDraft,
      invoke({ kind: "principal" }, { ...profile, expectedVersion: 0 }),
    );
    await service.execute(
      provisionTenant,
      invoke({ kind: "principal" }, { ...profile, expectedVersion: 1 }),
    );
    const choice = (await service.choices())[0];
    const scope = {
      kind: "tenant",
      tenantId: choice.tenantId,
      locationId: choice.locationId,
    };
    const roleOperation = await service.execute(
      createRole,
      invoke(scope, {
        name: "CRM reader fixture",
        permissions: ["workspace.read", "customers.read"],
      }),
    );
    const operationId = roleOperation.operationId;
    const customer = randomUUID();
    const insert = (name = "É தமிழர்", extra = {}) => {
      const values = {
        id: randomUUID(),
        tenant_id: choice.tenantId,
        location_id: choice.locationId,
        name,
        created_by: identity,
        updated_by: identity,
        creation_operation_id: operationId,
        ...extra,
      };
      const keys = Object.keys(values);
      return admin.query(
        "INSERT INTO app.customers(" +
          keys.join(",") +
          ") VALUES(" +
          keys.map((_, i) => `$${i + 1}`).join(",") +
          ") RETURNING *",
        Object.values(values),
      );
    };
    await insert("É தமிழர்", { id: customer });

    await t.test(
      "fresh owners alone receive CRM presets and roles enforce every dependency",
      async () => {
        const view = await service.view({
          tenantId: choice.tenantId,
          locationId: choice.locationId,
        });
        for (const permission of CUSTOMER_PERMISSIONS)
          assert.ok(view.permissions.includes(permission));
        const grants = (
          await admin.query(
            "SELECT r.preset,p.permission FROM app.roles r JOIN app.permission_grants p ON (p.tenant_id,p.role_id)=(r.tenant_id,r.id) WHERE r.tenant_id=$1 AND p.permission LIKE 'customers.%'",
            [choice.tenantId],
          )
        ).rows;
        assert.ok(
          grants
            .filter((row) => row.preset !== null)
            .every((row) => row.preset === "owner"),
        );
        for (const permission of CUSTOMER_PERMISSIONS.filter(
          (value) => value !== "customers.read",
        )) {
          await assert.rejects(
            service.execute(
              createRole,
              invoke(scope, {
                name: "Invalid CRM role",
                permissions: ["workspace.read", permission],
              }),
            ),
            (error) => error.category === "validation",
          );
          await assert.rejects(
            withScope(web, { ...scope, principalId: identity }, async (db) => {
              await db.execute(
                sql`SELECT app.claim_operation('tenant','role.create',${randomUUID()},${`v1:${"0".repeat(64)}`},${randomUUID()}::uuid)`,
              );
              await db.execute(
                sql`SELECT app.create_custom_role('SQL invalid CRM role',${sql.param(["workspace.read", permission])}::text[])`,
              );
            }),
            code("22023"),
          );
        }
      },
    );
    await t.test(
      "database normalization matches browser NFC, ASCII folding and code-point limits",
      async () => {
        for (const name of [
          "E\u0301",
          " É ",
          "é",
          "தமிழ்",
          "😀".repeat(120),
          "\u00a0A\tB\u00a0",
        ])
          assert.equal(
            (
              await admin.query(
                "SELECT app.normalize_customer_name($1) AS value",
                [name],
              )
            ).rows[0].value,
            normalizeCustomerSearch(name),
          );
        await insert("😀".repeat(120));
        await assert.rejects(insert("😀".repeat(121)), code("23514"));
        await assert.rejects(insert("E\u0301"), code("23514"));
        await assert.rejects(insert("bad\u0001name"), code("23514"));
        const a = await insert("First contact", {
          phone_e164: "+919876543210",
          phone_country_code: "IN",
          phone_display: "98765 43210",
        });
        const b = await insert("Separate contact", {
          phone_e164: "+919876543210",
          phone_country_code: "IN",
          phone_display: "+91 98765 43210",
        });
        assert.equal(a.rows[0].phone_digits, b.rows[0].phone_digits);
        await assert.rejects(
          insert("Bad phone", { phone_e164: "+919876543210" }),
          code("23514"),
        );
        await assert.rejects(
          insert("Bad tax", {
            gstin: "27AAPFU0939F1ZV",
            tax_country_code: "GB",
          }),
          code("23514"),
        );
      },
    );
    await t.test(
      "wearer ownership proves tenant, location and customer; original decimals remain strings",
      async () => {
        const secondLocation = randomUUID(),
          foreignTenant = randomUUID(),
          foreignLocation = randomUUID();
        await admin.query(
          "INSERT INTO app.locations(id,tenant_id,name) VALUES($1,$2,'Second')",
          [secondLocation, choice.tenantId],
        );
        await admin.query(
          "INSERT INTO app.tenants(id,name) VALUES($1,'Other synthetic shop')",
          [foreignTenant],
        );
        await admin.query(
          "INSERT INTO app.locations(id,tenant_id,name) VALUES($1,$2,'Main')",
          [foreignLocation, foreignTenant],
        );
        const wearer = (
          locationId = choice.locationId,
          tenantId = choice.tenantId,
          value = "118.110236",
        ) =>
          admin.query(
            "INSERT INTO app.customer_wearers(tenant_id,location_id,customer_id,name,height_value,height_unit,created_by,updated_by,creation_operation_id) VALUES($1,$2,$3,'Named wearer',$4,'in',$5,$5,$6) RETURNING *",
            [tenantId, locationId, customer, value, identity, operationId],
          );
        assert.equal((await wearer()).rows[0].height_value, "118.110236");
        await assert.rejects(wearer(secondLocation), code("23503"));
        await assert.rejects(
          wearer(foreignLocation, foreignTenant),
          code("23503"),
        );
        await assert.rejects(
          wearer(choice.locationId, choice.tenantId, "118.110237"),
          code("23514"),
        );
        for (const value of ["NaN", "Infinity", "-1", "0", "1e2", "1.0000001"])
          await assert.rejects(
            wearer(choice.locationId, choice.tenantId, value),
            code("23514"),
          );
        assert.deepEqual(
          (
            await admin.query(
              "SELECT app.customer_attribute_valid('1543.235835','lb','weight') AS valid,app.customer_attribute_valid('1543.235836','lb','weight') AS invalid",
            )
          ).rows[0],
          { valid: true, invalid: false },
        );
      },
    );
    await t.test(
      "tag identity is normalized within the full parent scope",
      async () => {
        const tag = (label) =>
          admin.query(
            "INSERT INTO app.customer_tags(tenant_id,location_id,customer_id,label) VALUES($1,$2,$3,$4)",
            [choice.tenantId, choice.locationId, customer, label],
          );
        await tag("Family");
        await assert.rejects(tag("family"), code("23505"));
        await tag("É");
        await tag("é");
      },
    );
    await t.test(
      "forced RLS and named-function-only access deny runtime table and helper bypasses",
      async () => {
        const relations = (
          await admin.query(
            "SELECT relname,relrowsecurity,relforcerowsecurity FROM pg_class WHERE relnamespace='app'::regnamespace AND relname IN ('customers','customer_wearers','customer_tags','customer_activity','customer_duplicate_reviews','customer_request_budgets')",
          )
        ).rows;
        assert.equal(relations.length, 6);
        assert.ok(
          relations.every(
            (row) => row.relrowsecurity && row.relforcerowsecurity,
          ),
        );
        for (const pool of [web, worker]) {
          for (const table of [
            "customers",
            "customer_wearers",
            "customer_tags",
            "customer_activity",
            "customer_duplicate_reviews",
            "customer_request_budgets",
          ])
            await assert.rejects(
              pool.query(`SELECT * FROM app.${table}`),
              code("42501"),
            );
          await assert.rejects(
            pool.query("SELECT app.normalize_customer_name('private')"),
            code("42501"),
          );
        }
        const indexes = (
          await admin.query(
            "SELECT indexname FROM pg_indexes WHERE schemaname='app' AND tablename='customers'",
          )
        ).rows.map((row) => row.indexname);
        assert.ok(
          indexes.includes("customers_name_trigrams") &&
            indexes.includes("customers_phone_trigrams") &&
            indexes.includes("customers_phone_lookup"),
        );
      },
    );

    const crm = createCustomerService({
      pool: web,
      resolveIdentity: async () => ({ principalId: identity }),
    });
    const target = { tenantId: choice.tenantId, locationId: choice.locationId };
    const prefs = { fit: null, fabric: null, design: null };
    const attributes = {
      relationship: null,
      birthday: null,
      gender: { kind: "unspecified" },
      height: { value: "70.000001", unit: "in" },
      weight: null,
      notes: null,
      preferences: prefs,
    };
    const contact = {
      name: "Protocol fixture",
      phone: null,
      email: null,
      address: null,
      taxCountryCode: null,
      gstin: null,
      segment: null,
      notes: "private fixture note",
      preferences: prefs,
      tags: ["Family"],
    };
    const envelope = (payload) => ({
      operationKey: randomUUID(),
      correlationId: randomUUID(),
      payload,
    });
    let saved;
    await t.test(
      "runtime commands atomically save profiles, wearers, lifecycle, no-ops and safe activity",
      async () => {
        await assert.rejects(
          crm.command(
            "customer.create",
            target,
            envelope({
              profile: contact,
              selfWearer: {
                kind: "self",
                attributes: { ...attributes, birthday: "9999-12-31" },
              },
              intent: { kind: "check-first" },
            }),
          ),
          (e) =>
            e.code === "validation" &&
            e.issues.some(
              (issue) =>
                issue.path.join(".") === "selfWearer.attributes.birthday",
            ),
        );
        const request = envelope({
          profile: contact,
          selfWearer: { kind: "self", attributes },
          intent: { kind: "check-first" },
        });
        const created = await crm.command("customer.create", target, request);
        assert.equal(created.outcome, "saved");
        saved = created.result;
        assert.deepEqual(
          await crm.command("customer.create", target, request),
          created,
        );
        const detail = await crm.detail(target, saved.customerId);
        assert.equal(detail.wearers.total, 1);
        assert.equal(detail.wearers.items[0].profile.height.value, "70.000001");
        assert.equal(
          (
            await crm.page(target, {
              search: "Protocol fixture",
              tags: ["Family"],
            })
          ).total,
          1,
        );
        const noop = await crm.command(
          "customer.update",
          target,
          envelope({
            customerId: saved.customerId,
            expectedVersion: 1,
            profile: contact,
            intent: { kind: "check-first" },
          }),
        );
        assert.equal(noop.result.changed, false);
        assert.equal(noop.result.version, 1);
        assert.equal((await crm.activity(target, saved.customerId)).total, 2);
        const changed = await crm.command(
          "customer.update",
          target,
          envelope({
            customerId: saved.customerId,
            expectedVersion: 1,
            profile: { ...contact, name: "Independent contact" },
            intent: { kind: "check-first" },
          }),
        );
        assert.equal(changed.result.version, 2);
        assert.equal(
          (await crm.detail(target, saved.customerId)).wearers.items[0].profile
            .name,
          contact.name,
        );
        await assert.rejects(
          crm.command(
            "customer.update",
            target,
            envelope({
              customerId: saved.customerId,
              expectedVersion: 1,
              profile: contact,
              intent: { kind: "check-first" },
            }),
          ),
          (e) => e.code === "version-conflict",
        );
        await crm.command(
          "wearer.archive",
          target,
          envelope({
            customerId: saved.customerId,
            wearerId: saved.createdWearerId,
            expectedVersion: 1,
          }),
        );
        await crm.command(
          "customer.archive",
          target,
          envelope({ customerId: saved.customerId, expectedVersion: 2 }),
        );
        await assert.rejects(
          crm.command(
            "wearer.create",
            target,
            envelope({
              customerId: saved.customerId,
              profile: { name: "Blocked wearer", ...attributes },
            }),
          ),
          (e) => e.code === "version-conflict",
        );
        await crm.command(
          "customer.restore",
          target,
          envelope({ customerId: saved.customerId, expectedVersion: 3 }),
        );
        assert.equal(
          (await crm.wearers(target, saved.customerId)).items[0]
            .effectiveActive,
          false,
        );
        await crm.command(
          "wearer.restore",
          target,
          envelope({
            customerId: saved.customerId,
            wearerId: saved.createdWearerId,
            expectedVersion: 2,
          }),
        );
        const activity = await crm.activity(target, saved.customerId, {
          limit: 2,
        });
        assert.equal(activity.items.length, 2);
        assert.ok(activity.nextOffset);
        assert.ok(activity.items.every((a) => a.actor === "You"));
        assert.equal(
          JSON.stringify(activity).includes("private fixture note"),
          false,
        );
        const client = await web.connect();
        try {
          await admin.query("BEGIN");
          await admin.query(
            "SELECT id FROM app.customers WHERE id=$1 FOR UPDATE",
            [saved.customerId],
          );
          const busy = envelope({
            customerId: saved.customerId,
            expectedVersion: 4,
          });
          const childDuringArchive = envelope({
            customerId: saved.customerId,
            profile: { name: "Blocked concurrent wearer", ...attributes },
          });
          await assert.rejects(
            crm.command("wearer.create", target, childDuringArchive),
            (e) => e.code === "busy",
          );
          await assert.rejects(
            crm.command("customer.archive", target, busy),
            (e) => e.code === "busy",
          );
          await admin.query("ROLLBACK");
          assert.equal(
            (await crm.command("customer.archive", target, busy)).outcome,
            "saved",
          );
          await assert.rejects(
            crm.command("wearer.create", target, childDuringArchive),
            (e) => e.code === "version-conflict",
          );
        } finally {
          client.release();
          await admin.query("ROLLBACK");
        }
      },
    );
    await t.test(
      "duplicate reviews serialize competing saves and recover without storing candidate PII",
      async () => {
        const { customerPhone } = await import("../dist/customer-phone.js");
        const phone = customerPhone.parse({
          countryCode: "GB",
          display: "+44 7911 123456",
        });
        const draft = {
          profile: { ...contact, name: "Duplicate protocol", phone },
          selfWearer: { kind: "none" },
          intent: { kind: "check-first" },
        };
        const first = await crm.command(
          "customer.create",
          target,
          envelope(draft),
        );
        assert.equal(first.outcome, "saved");
        const counts = await admin.query(
          "SELECT count(*)::int n FROM app.command_operations WHERE tenant_id=$1",
          [choice.tenantId],
        );
        assert.equal(
          (await crm.duplicateCheck(target, { phone })).candidateCount,
          1,
        );
        assert.equal(
          (
            await admin.query(
              "SELECT count(*)::int n FROM app.command_operations WHERE tenant_id=$1",
              [choice.tenantId],
            )
          ).rows[0].n,
          counts.rows[0].n,
        );
        const request = envelope(draft),
          review = await crm.command("customer.create", target, request);
        assert.equal(review.outcome, "review-required");
        assert.equal(review.review.candidateCount, 1);
        const retained = (
          await admin.query(
            "SELECT result FROM app.command_operations WHERE operation_key=$1",
            [request.operationKey],
          )
        ).rows[0].result;
        assert.deepEqual(
          Object.keys(retained).sort(),
          ["candidateCount", "expiresAt", "kind", "reviewId"].sort(),
        );
        const accepted = envelope({
          ...draft,
          intent: { kind: "keep-separate", reviewId: review.review.reviewId },
        });
        const kept = await crm.command("customer.create", target, accepted);
        assert.equal(kept.outcome, "saved");
        await admin.query(
          "DELETE FROM app.customer_duplicate_reviews WHERE id=$1",
          [review.review.reviewId],
        );
        assert.deepEqual(
          await crm.command("customer.create", target, accepted),
          kept,
        );
        assert.equal(
          (await crm.command("customer.create", target, request)).outcome,
          "review-expired",
        );
        const nextReview = await crm.command(
          "customer.create",
          target,
          envelope(draft),
        );
        assert.equal(
          (
            await crm.command(
              "customer.create",
              target,
              envelope({
                ...draft,
                profile: { ...draft.profile, notes: "changed draft" },
                intent: {
                  kind: "keep-separate",
                  reviewId: nextReview.review.reviewId,
                },
              }),
            )
          ).outcome,
          "review-stale",
        );
        await admin.query(
          "UPDATE app.customer_duplicate_reviews SET expires_at=now()-interval '1 second' WHERE id=$1",
          [nextReview.review.reviewId],
        );
        await worker.query("SELECT app.customer_maintenance()");
        assert.equal(
          (
            await admin.query(
              "SELECT count(*)::int n FROM app.customer_duplicate_reviews WHERE id=$1",
              [nextReview.review.reviewId],
            )
          ).rows[0].n,
          0,
        );
        assert.equal(
          (await crm.review(target, nextReview.review.reviewId)).outcome,
          "review-expired",
        );
        // Hold the actual scoped phone lock; a failed attempt must retain no operation claim.
        await admin.query("BEGIN");
        await admin.query(
          "SELECT pg_advisory_xact_lock(hashtextextended($1,0))",
          [
            `customer-phone:${choice.tenantId}:${choice.locationId}:${phone.e164}`,
          ],
        );
        const competing = envelope(draft);
        try {
          await assert.rejects(
            crm.command("customer.create", target, competing),
            (e) => e.code === "busy",
          );
        } finally {
          await admin.query("ROLLBACK");
        }
        assert.equal(
          (await crm.command("customer.create", target, competing)).outcome,
          "review-required",
        );
        const changing = envelope({
          customerId: saved.customerId,
          expectedVersion: 5,
          profile: { ...contact, phone },
          intent: { kind: "check-first" },
        });
        // Archived parent is deliberately blocked before issuing a challenge.
        await assert.rejects(
          crm.command("customer.update", target, changing),
          (e) => e.code === "version-conflict",
        );
        await crm.command(
          "customer.restore",
          target,
          envelope({ customerId: saved.customerId, expectedVersion: 5 }),
        );
        const updateDraft = { ...changing.payload, expectedVersion: 6 };
        const updateReview = await crm.command(
          "customer.update",
          target,
          envelope(updateDraft),
        );
        assert.equal(updateReview.outcome, "review-required");
        const beforeCount = (await crm.page(target, { status: "all" })).total;
        const acceptedUpdate = envelope({
          ...updateDraft,
          intent: {
            kind: "keep-duplicate-phone",
            reviewId: updateReview.review.reviewId,
          },
        });
        const updated = await crm.command(
          "customer.update",
          target,
          acceptedUpdate,
        );
        assert.equal(updated.result.customerId, saved.customerId);
        assert.equal(
          (await crm.page(target, { status: "all" })).total,
          beforeCount,
        );
        assert.deepEqual(
          await crm.command("customer.update", target, acceptedUpdate),
          updated,
        );
        const staleReview = await crm.command(
          "customer.create",
          target,
          envelope(draft),
        );
        await crm.command(
          "customer.update",
          target,
          envelope({
            customerId: first.result.customerId,
            expectedVersion: 1,
            profile: { ...draft.profile, name: "Changed candidate" },
            intent: { kind: "check-first" },
          }),
        );
        assert.equal(
          (await crm.review(target, staleReview.review.reviewId)).outcome,
          "review-stale",
        );
        const racePhone = customerPhone.parse({
          countryCode: "IN",
          display: "9876543219",
        });
        const races = [
          envelope({
            ...draft,
            profile: { ...draft.profile, phone: racePhone },
          }),
          envelope({
            ...draft,
            profile: { ...draft.profile, phone: racePhone },
          }),
        ];
        const outcomes = await Promise.allSettled(
          races.map((r) => crm.command("customer.create", target, r)),
        );
        assert.equal(
          outcomes.filter(
            (r) => r.status === "fulfilled" && r.value.outcome === "saved",
          ).length,
          1,
        );
        for (let i = 0; i < outcomes.length; i++)
          if (outcomes[i].status === "rejected") {
            assert.equal(outcomes[i].reason.code, "busy");
            assert.equal(
              (await crm.command("customer.create", target, races[i])).outcome,
              "review-required",
            );
          }
      },
    );
    await t.test(
      "actor-bound replay, current permissions, shared budgets and rollback enforce private boundaries",
      async () => {
        const other = randomUUID(),
          authUser = randomUUID();
        await admin.query(
          'INSERT INTO public."user"(id,name,email,email_verified) VALUES($1,$1,$2,true)',
          [authUser, `${authUser}@example.test`],
        );
        await admin.query(
          "INSERT INTO app.principals(id,auth_user_id) VALUES($1,$2)",
          [other, authUser],
        );
        const membership = (
          await admin.query(
            "INSERT INTO app.memberships(tenant_id,principal_id) VALUES($1,$2) RETURNING id",
            [choice.tenantId, other],
          )
        ).rows[0].id;
        const role = await service.execute(
          createRole,
          invoke(scope, {
            name: "Protocol writer",
            permissions: [
              "workspace.read",
              "customers.read",
              "customers.manage",
            ],
          }),
        );
        await admin.query(
          "INSERT INTO app.location_grants(tenant_id,membership_id,location_id,role_id) VALUES($1,$2,$3,$4)",
          [
            choice.tenantId,
            membership,
            choice.locationId,
            role.result.roleId ?? role.result.id,
          ],
        );
        const staff = createCustomerService({
          pool: web,
          resolveIdentity: async () => ({ principalId: other }),
        });
        const payload = {
            profile: { ...contact, name: "Actor fixture" },
            selfWearer: { kind: "none" },
            intent: { kind: "check-first" },
          },
          request = envelope(payload);
        const ownerResult = await crm.command(
          "customer.create",
          target,
          request,
        );
        await assert.rejects(
          staff.command("customer.create", target, request),
          (e) => e.code === "operation-conflict",
        );
        assert.ok(
          (
            await staff.activity(target, ownerResult.result.customerId)
          ).items.every((a) => a.actor === "Shop staff"),
        );
        assert.equal(
          JSON.stringify(
            await staff.activity(target, ownerResult.result.customerId),
          ).includes(identity),
          false,
        );
        await assert.rejects(
          staff.detail(target, randomUUID()),
          (e) => e.code === "unavailable",
        );
        const otherLocation = randomUUID();
        await admin.query(
          "INSERT INTO app.locations(id,tenant_id,name) VALUES($1,$2,$3)",
          [otherLocation, choice.tenantId, otherLocation],
        );
        await admin.query(
          "INSERT INTO app.location_grants(tenant_id,membership_id,location_id,role_id) SELECT g.tenant_id,g.membership_id,$1,g.role_id FROM app.location_grants g JOIN app.memberships m ON m.id=g.membership_id WHERE g.tenant_id=$2 AND g.location_id=$3 AND m.principal_id=$4",
          [otherLocation, choice.tenantId, choice.locationId, identity],
        );
        await assert.rejects(
          crm.detail(
            { ...target, locationId: otherLocation },
            ownerResult.result.customerId,
          ),
          (e) => e.code === "unavailable",
        );
        const acquire = () =>
          withScope(
            web,
            { ...scope, principalId: other },
            async (db) =>
              (
                await db.execute(
                  sql`SELECT app.customer_check_begin(true) token`,
                )
              ).rows[0].token,
          );
        await admin.query("BEGIN");
        await admin.query(
          "SELECT pg_advisory_xact_lock(hashtextextended($1,0))",
          [`customer-check:${choice.tenantId}:${choice.locationId}:${other}`],
        );
        try {
          await assert.rejects(acquire(), (e) => e.cause?.code === "FC006");
        } finally {
          await admin.query("ROLLBACK");
        }
        const leases = [await acquire(), await acquire()];
        await assert.rejects(acquire(), (e) => e.cause?.code === "FC006");
        for (const lease of leases)
          await withScope(web, { ...scope, principalId: other }, (db) =>
            db.execute(sql`SELECT app.customer_check_end(${lease}::uuid)`),
          );
        await admin.query(
          "UPDATE app.customer_request_budgets SET checks=30 WHERE principal_id=$1",
          [other],
        );
        const { customerPhone } = await import("../dist/customer-phone.js");
        await assert.rejects(
          staff.duplicateCheck(target, {
            phone: customerPhone.parse({
              countryCode: "IN",
              display: "9876543210",
            }),
          }),
          (e) => e.code === "rate-limit",
        );
        const ownRequest = envelope({
          ...payload,
          profile: { ...contact, name: "Staff fixture" },
        });
        await staff.command("customer.create", target, ownRequest);
        await admin.query(
          "DELETE FROM app.permission_grants WHERE role_id=$1 AND permission='customers.manage'",
          [role.result.roleId ?? role.result.id],
        );
        await assert.rejects(
          staff.command("customer.create", target, ownRequest),
          (e) => e.code === "denied",
        );
        await admin.query(
          "CREATE FUNCTION app.customer_fixture_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.name='Rollback fixture' THEN RAISE EXCEPTION 'Synthetic failure'; END IF; RETURN NEW; END $$",
        );
        await admin.query(
          "CREATE TRIGGER customer_fixture_failure BEFORE INSERT ON app.customer_wearers FOR EACH ROW EXECUTE FUNCTION app.customer_fixture_failure()",
        );
        const broken = envelope({
          profile: { ...contact, name: "Rollback fixture" },
          selfWearer: { kind: "self", attributes },
          intent: { kind: "check-first" },
        });
        try {
          await assert.rejects(crm.command("customer.create", target, broken));
          assert.equal(
            (
              await admin.query(
                "SELECT count(*)::int n FROM app.customers WHERE tenant_id=$1 AND name='Rollback fixture'",
                [choice.tenantId],
              )
            ).rows[0].n,
            0,
          );
          assert.equal(
            (
              await admin.query(
                "SELECT count(*)::int n FROM app.command_operations WHERE operation_key=$1",
                [broken.operationKey],
              )
            ).rows[0].n,
            0,
          );
        } finally {
          await admin.query(
            "DROP TRIGGER customer_fixture_failure ON app.customer_wearers",
          );
          await admin.query("DROP FUNCTION app.customer_fixture_failure()");
        }
      },
    );
  } finally {
    await Promise.all([admin.end(), web.end(), worker.end()]);
  }
});
