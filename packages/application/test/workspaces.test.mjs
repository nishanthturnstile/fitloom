import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { createPool, withScope } from "@fitloom/db";
import { sql } from "drizzle-orm";
import { migrateDatabase } from "../../db/scripts/migrate.mjs";
import {
  acceptInvitation,
  beginAnotherSetup,
  createMailTransport,
  createRole,
  createWorkspaceService,
  deliverAuthMail,
  invitationCommand,
  provisionTenant,
  revokeInvitation,
  savePreferences,
  saveSetupDraft,
  setMemberRole,
  updateWorkspace,
} from "../dist/index.js";

const category = (kind) => (error) => error.category === kind;
const defaults = {
  businessMode: "tailoring",
  ownerName: "Private owner",
  ownerPhone: "+919876543210",
  address: "Private fixture street",
  timezone: "Asia/Kolkata",
  consentAccepted: true,
  consentVersion: "workspace-authority-v1",
};
const invoke = (scope, payload, key = randomUUID()) => ({
  scope,
  payload,
  operationKey: key,
  correlationId: randomUUID(),
});
const principal = { kind: "principal" };
const targetOf = ({ tenantId, locationId }) => ({ tenantId, locationId });
for (const name of ["MIGRATOR", "WEB", "WORKER"]) {
  const target = new URL(process.env[`TEST_${name}_DATABASE_URL`]);
  if (
    target.pathname !== "/fitloom_test" ||
    target.username !== `fitloom_test_${name.toLowerCase()}` ||
    !["127.0.0.1", "postgres"].includes(target.hostname)
  )
    throw new Error("Isolated tests required");
}
await test("resumable setup and authorized workspaces", async (t) => {
  const admin = createPool({
      connectionString: process.env.TEST_MIGRATOR_DATABASE_URL,
      purpose: "web",
      max: 1,
    }),
    web = createPool({
      connectionString: process.env.TEST_WEB_DATABASE_URL,
      purpose: "web",
      max: 4,
    }),
    worker = createPool({
      connectionString: process.env.TEST_WORKER_DATABASE_URL,
      purpose: "worker",
      max: 1,
    });
  await admin.query("SET lock_timeout='20s'");
  await admin.query("SELECT pg_advisory_lock(68122902)");
  const transport = createMailTransport({
    provider: "mailpit",
    host: process.env.TEST_MAILPIT_HOST ?? "127.0.0.1",
    port: 24423,
    from: "fitloom@example.test",
  });
  try {
    await migrateDatabase(process.env.TEST_MIGRATOR_DATABASE_URL);
    async function identity() {
      const id = randomUUID(),
        user = randomUUID(),
        email = `workspace-${user}@example.test`;
      await admin.query(
        'INSERT INTO public."user"(id,name,email,email_verified) VALUES($1,$1,$2,true)',
        [user, email],
      );
      await admin.query(
        "INSERT INTO app.principals(id,auth_user_id) VALUES($1,$2)",
        [id, user],
      );
      return { id, user, email };
    }
    const owner = await identity(),
      other = await identity(),
      staff = await identity(),
      manager = await identity();
    let actor = owner;
    const service = createWorkspaceService({
      pool: web,
      resolveIdentity: async () => ({ principalId: actor.id }),
    });
    const invite = invitationCommand({
      baseURL: "http://localhost:24411",
      mailKey: process.env.TEST_MAIL_ENCRYPTION_KEY,
    });
    const profile = {
      ...defaults,
      shopName: "Resumable fixture",
      locationName: "Main",
    };
    let shopA, shopB, scopeA, scopeB, staffRole, managerRole, ownerRole;
    await t.test(
      "profile persistence failure rolls back the entire provisioning command",
      async () => {
        const fixture = await identity();
        actor = fixture;
        await service.execute(
          saveSetupDraft,
          invoke(principal, { ...profile, expectedVersion: 0 }),
        );
        const key = randomUUID();
        await admin.query(
          "CREATE FUNCTION app.test_profile_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected profile persistence failure'; END $$; CREATE TRIGGER test_profile_failure BEFORE INSERT ON app.owner_contacts FOR EACH ROW EXECUTE FUNCTION app.test_profile_failure()",
        );
        try {
          await assert.rejects(
            service.execute(
              provisionTenant,
              invoke(principal, { ...profile, expectedVersion: 1 }, key),
            ),
            category("temporary"),
          );
          assert.equal((await service.choices()).length, 0);
          assert.equal(
            (
              await admin.query(
                "SELECT * FROM app.command_operations WHERE owner_id=$1 AND operation_key=$2",
                [fixture.id, key],
              )
            ).rowCount,
            0,
          );
          assert.equal(
            (
              await admin.query(
                "SELECT * FROM app.tenant_setup WHERE principal_id=$1",
                [fixture.id],
              )
            ).rowCount,
            0,
          );
          assert.equal((await service.setup()).version, 1);
        } finally {
          await admin.query(
            "DROP TRIGGER test_profile_failure ON app.owner_contacts; DROP FUNCTION app.test_profile_failure()",
          );
          actor = owner;
        }
      },
    );
    await t.test(
      "partial setup resumes on another service and consent gates provisioning",
      async () => {
        await service.execute(
          saveSetupDraft,
          invoke(principal, { expectedVersion: 0, shopName: profile.shopName }),
        );
        const resumed = await createWorkspaceService({
          pool: web,
          resolveIdentity: async () => ({ principalId: owner.id }),
        }).setup();
        assert.equal(resumed.version, 1);
        assert.equal(resumed.draft.shopName, profile.shopName);
        await assert.rejects(
          service.execute(
            provisionTenant,
            invoke(principal, { ...profile, expectedVersion: 1 }),
          ),
          category("validation"),
        );
        await service.execute(
          saveSetupDraft,
          invoke(principal, { ...profile, expectedVersion: 1 }),
        );
        await assert.rejects(
          service.execute(
            provisionTenant,
            invoke(principal, {
              ...profile,
              ownerPhone: "+918888888888",
              expectedVersion: 2,
            }),
          ),
          category("validation"),
        );
      },
    );
    await t.test(
      "concurrent provisioning creates one complete tenant; another owner provisions independently",
      async () => {
        const request = invoke(principal, { ...profile, expectedVersion: 2 });
        const results = await Promise.all([
          service.execute(provisionTenant, request),
          service.execute(provisionTenant, request),
        ]);
        assert.equal(results[0].result.tenantId, results[1].result.tenantId);
        shopA = results[0].result.tenantId;
        assert.equal(
          (
            await admin.query(
              "SELECT * FROM app.shop_settings WHERE tenant_id=$1",
              [shopA],
            )
          ).rowCount,
          1,
        );
        assert.equal(
          (
            await admin.query(
              "SELECT * FROM app.owner_contacts WHERE tenant_id=$1",
              [shopA],
            )
          ).rows[0].email,
          owner.email,
        );
        const choice = (await service.choices()).find(
          (row) => row.tenantId === shopA,
        );
        scopeA = {
          kind: "tenant",
          tenantId: shopA,
          locationId: choice.locationId,
        };
        const team = await service.team(targetOf(scopeA));
        staffRole = team.roles.find((r) => r.preset === "staff").id;
        managerRole = team.roles.find((r) => r.preset === "manager").id;
        ownerRole = team.roles.find((r) => r.preset === "owner").id;
        actor = other;
        await service.execute(
          saveSetupDraft,
          invoke(principal, {
            ...profile,
            shopName: "Other shop",
            expectedVersion: 0,
          }),
        );
        shopB = (
          await service.execute(
            provisionTenant,
            invoke(principal, {
              ...profile,
              shopName: "Other shop",
              expectedVersion: 1,
            }),
          )
        ).result.tenantId;
        const second = (await service.choices())[0];
        scopeB = {
          kind: "tenant",
          tenantId: shopB,
          locationId: second.locationId,
        };
        assert.notEqual(shopA, shopB);
        actor = owner;
      },
    );
    await t.test(
      "deliberately starting another setup creates a fresh durable identity without duplicating old shops",
      async () => {
        const started = await service.execute(
          beginAnotherSetup,
          invoke(principal, { expectedVersion: 2, createAnother: true }),
        );
        assert.equal(started.result.version, 3);
        assert.equal((await service.setup()).tenantId, null);
        await assert.rejects(
          service.execute(
            beginAnotherSetup,
            invoke(principal, { expectedVersion: 3, createAnother: true }),
          ),
          category("conflict"),
        );
        const secondProfile = { ...profile, shopName: "Owner second shop" };
        await service.execute(
          saveSetupDraft,
          invoke(principal, { ...secondProfile, expectedVersion: 3 }),
        );
        const second = await service.execute(
          provisionTenant,
          invoke(principal, { ...secondProfile, expectedVersion: 4 }),
        );
        assert.notEqual(second.result.tenantId, shopA);
        assert.equal((await service.choices()).length, 2);
      },
    );
    await t.test(
      "an earlier foundation shop can complete its profile without creating another tenant",
      async () => {
        actor = other;
        await admin.query("DELETE FROM app.owner_contacts WHERE tenant_id=$1", [
          shopB,
        ]);
        await admin.query("DELETE FROM app.shop_settings WHERE tenant_id=$1", [
          shopB,
        ]);
        assert.equal((await service.setup()).tenantId, null);
        await service.execute(
          saveSetupDraft,
          invoke(principal, {
            ...profile,
            shopName: "Other shop",
            expectedVersion: 1,
          }),
        );
        const completed = await service.execute(
          provisionTenant,
          invoke(principal, {
            ...profile,
            shopName: "Other shop",
            expectedVersion: 2,
          }),
        );
        assert.equal(completed.result.tenantId, shopB);
        assert.equal((await service.choices()).length, 1);
        assert.equal(
          (await service.view(targetOf(scopeB))).owner.email,
          other.email,
        );
        actor = owner;
      },
    );
    let invitation;
    await t.test(
      "invitations bind verified identity, accept once, and return only the authorized workspace",
      async () => {
        invitation = (
          await service.execute(
            invite,
            invoke(scopeA, { email: staff.email, roleId: staffRole }),
          )
        ).result.invitationId;
        actor = other;
        await assert.rejects(
          service.execute(
            acceptInvitation,
            invoke(principal, { invitationId: invitation }),
          ),
          category("access"),
        );
        actor = staff;
        await admin.query(
          'UPDATE public."user" SET email_verified=false WHERE id=$1',
          [staff.user],
        );
        await assert.rejects(
          service.execute(
            acceptInvitation,
            invoke(principal, { invitationId: invitation }),
          ),
          category("access"),
        );
        await admin.query(
          'UPDATE public."user" SET email_verified=true WHERE id=$1',
          [staff.user],
        );
        const request = invoke(principal, { invitationId: invitation });
        const accepted = await Promise.all([
          service.execute(acceptInvitation, request),
          service.execute(acceptInvitation, request),
        ]);
        assert.equal(accepted[0].operationId, accepted[1].operationId);
        assert.equal((await service.choices()).length, 1);
        assert.equal(
          (
            await admin.query(
              "SELECT * FROM app.memberships WHERE tenant_id=$1 AND principal_id=$2",
              [shopA, staff.id],
            )
          ).rowCount,
          1,
        );
      },
    );
    await t.test(
      "staff fields exclude owner contacts, team details, audit, and foreign-tenant references",
      async () => {
        const view = await service.view(targetOf(scopeA));
        assert.equal("owner" in view, false);
        assert.equal("financial" in view, false);
        await assert.rejects(
          service.team(targetOf(scopeA)),
          category("access"),
        );
        await assert.rejects(
          service.view(targetOf(scopeB)),
          category("access"),
        );
        await assert.rejects(
          service.view({ ...targetOf(scopeA), locationId: scopeB.locationId }),
          category("access"),
        );
        await assert.rejects(
          service.view({ ...targetOf(scopeA), locationId: "all" }),
          category("validation"),
        );
        const audit = await withScope(
          web,
          { ...scopeA, principalId: staff.id },
          (db) => db.execute(sql`SELECT * FROM app.command_audit`),
        );
        assert.equal(audit.rowCount, 0);
        await assert.rejects(
          service.execute(
            updateWorkspace,
            invoke(scopeA, {
              expectedVersion: 0,
              shopName: "Tampered",
              address: "Tampered",
            }),
          ),
          category("access"),
        );
      },
    );
    await t.test(
      "current role changes affect the next query; self elevation and preset edits fail",
      async () => {
        actor = owner;
        let member = (await service.team(targetOf(scopeA))).members.find(
          (m) => m.principalId === staff.id,
        );
        await service.execute(
          setMemberRole,
          invoke(scopeA, {
            membershipId: member.id,
            roleId: managerRole,
            expectedVersion: member.version,
            enabled: true,
          }),
        );
        actor = staff;
        assert.ok(
          (await service.view(targetOf(scopeA))).permissions.includes(
            "workspace.manage",
          ),
        );
        assert.equal("owner" in (await service.view(targetOf(scopeA))), false);
        await service.execute(
          updateWorkspace,
          invoke(scopeA, {
            expectedVersion: 0,
            shopName: "Updated fixture",
            address: "Shared changed street",
          }),
        );
        await assert.rejects(
          service.execute(
            setMemberRole,
            invoke(scopeA, {
              membershipId: member.id,
              roleId: ownerRole,
              expectedVersion: member.version + 1,
              enabled: true,
            }),
          ),
          category("access"),
        );
        await assert.rejects(
          web.query("UPDATE app.roles SET name='Injected' WHERE id=$1", [
            ownerRole,
          ]),
          (error) => error.code === "42501",
        );
        actor = owner;
        member = (await service.team(targetOf(scopeA))).members.find(
          (m) => m.principalId === staff.id,
        );
        await service.execute(
          setMemberRole,
          invoke(scopeA, {
            membershipId: member.id,
            roleId: staffRole,
            expectedVersion: member.version,
            enabled: true,
          }),
        );
        actor = staff;
        assert.ok(
          !(await service.view(targetOf(scopeA))).permissions.includes(
            "workspace.manage",
          ),
        );
      },
    );
    await t.test(
      "delegated access administrators cannot exceed grants or remove the final owner",
      async () => {
        actor = owner;
        const custom = (
          await service.execute(
            createRole,
            invoke(scopeA, {
              name: "Access assistant",
              permissions: ["workspace.read", "access.manage"],
            }),
          )
        ).result.roleId;
        const invited = (
          await service.execute(
            invite,
            invoke(scopeA, { email: manager.email, roleId: custom }),
          )
        ).result.invitationId;
        actor = manager;
        await service.execute(
          acceptInvitation,
          invoke(principal, { invitationId: invited }),
        );
        await assert.rejects(
          service.execute(
            createRole,
            invoke(scopeA, {
              name: "Escalation",
              permissions: ["workspace.read", "workspace.private.read"],
            }),
          ),
          category("access"),
        );
        await assert.rejects(
          service.execute(
            invite,
            invoke(scopeA, { email: other.email, roleId: managerRole }),
          ),
          category("access"),
        );
        await assert.rejects(
          service.execute(
            invite,
            invoke(scopeA, { email: other.email, roleId: ownerRole }),
          ),
          category("access"),
        );
        const target = (await service.team(targetOf(scopeA))).members.find(
          (m) => m.principalId === owner.id,
        );
        await assert.rejects(
          service.execute(
            setMemberRole,
            invoke(scopeA, {
              membershipId: target.id,
              roleId: staffRole,
              expectedVersion: target.version,
              enabled: false,
            }),
          ),
          category("validation"),
        );
        const self = (await service.team(targetOf(scopeA))).members.find(
          (m) => m.principalId === manager.id,
        );
        await assert.rejects(
          service.execute(
            setMemberRole,
            invoke(scopeA, {
              membershipId: self.id,
              roleId: custom,
              expectedVersion: self.version,
              enabled: true,
            }),
          ),
          category("access"),
        );
        actor = owner;
      },
    );
    await t.test(
      "expired, revoked, and no-longer-delegable invitations cannot activate staff",
      async () => {
        const recipient = await identity();
        let id = (
          await service.execute(
            invite,
            invoke(scopeA, { email: recipient.email, roleId: staffRole }),
          )
        ).result.invitationId;
        await admin.query(
          "UPDATE app.staff_invitations SET expires_at=now()-interval '1 second' WHERE id=$1",
          [id],
        );
        actor = recipient;
        await assert.rejects(
          service.execute(
            acceptInvitation,
            invoke(principal, { invitationId: id }),
          ),
          category("access"),
        );
        actor = owner;
        id = (
          await service.execute(
            invite,
            invoke(scopeA, { email: recipient.email, roleId: staffRole }),
          )
        ).result.invitationId;
        await service.execute(
          revokeInvitation,
          invoke(scopeA, { invitationId: id }),
        );
        actor = recipient;
        await assert.rejects(
          service.execute(
            acceptInvitation,
            invoke(principal, { invitationId: id }),
          ),
          category("access"),
        );
        actor = owner;
        id = (
          await service.execute(
            invite,
            invoke(scopeA, { email: recipient.email, roleId: staffRole }),
          )
        ).result.invitationId;
        await admin.query(
          "DELETE FROM app.permission_grants WHERE tenant_id=$1 AND role_id=$2 AND permission='access.manage'",
          [shopA, ownerRole],
        );
        actor = recipient;
        await assert.rejects(
          service.execute(
            acceptInvitation,
            invoke(principal, { invitationId: id }),
          ),
          category("access"),
        );
        actor = owner;
        await admin.query(
          "INSERT INTO app.permission_grants VALUES($1,$2,'access.manage')",
          [shopA, ownerRole],
        );
      },
    );
    await t.test(
      "selection preferences stay personal; revoked hints cannot become authority",
      async () => {
        actor = staff;
        await service.execute(
          savePreferences,
          invoke(principal, {
            locale: "ta",
            tenantId: shopA,
            locationId: scopeA.locationId,
          }),
        );
        assert.equal((await service.preferences()).locale, "ta");
        await assert.rejects(
          service.execute(
            savePreferences,
            invoke(principal, {
              locale: "en",
              tenantId: shopB,
              locationId: scopeB.locationId,
            }),
          ),
          category("access"),
        );
        actor = owner;
        const m = (await service.team(targetOf(scopeA))).members.find(
          (m) => m.principalId === staff.id,
        );
        await service.execute(
          setMemberRole,
          invoke(scopeA, {
            membershipId: m.id,
            roleId: staffRole,
            expectedVersion: m.version,
            enabled: false,
          }),
        );
        actor = staff;
        assert.equal((await service.preferences()).tenantId, null);
        assert.equal((await service.choices()).length, 0);
        await assert.rejects(
          service.view(targetOf(scopeA)),
          category("access"),
        );
        await assert.rejects(
          service.execute(
            acceptInvitation,
            invoke(principal, { invitationId: invitation }),
          ),
          category("access"),
        );
        actor = owner;
      },
    );
    await t.test(
      "All Locations needs explicit permission and access to every location",
      async () => {
        assert.equal((await service.allLocations(targetOf(scopeA))).length, 1);
        const location = (
          await admin.query(
            "INSERT INTO app.locations(tenant_id,name) VALUES($1,'Restricted fixture') RETURNING id",
            [shopA],
          )
        ).rows[0].id;
        const m = (await service.team(targetOf(scopeA))).members.find(
          (m) => m.principalId === owner.id,
        );
        await admin.query(
          "INSERT INTO app.location_grants VALUES($1,$2,$3,$4)",
          [shopA, m.id, location, staffRole],
        );
        await assert.rejects(
          service.allLocations(targetOf(scopeA)),
          category("access"),
        );
        await admin.query(
          "INSERT INTO app.location_grants VALUES($1,$2,$3,$4)",
          [shopA, m.id, location, ownerRole],
        );
        assert.equal((await service.allLocations(targetOf(scopeA))).length, 2);
      },
    );
    await t.test(
      "invitation mail is encrypted and delivered through isolated Mailpit",
      async () => {
        const recipient = await identity();
        const id = (
          await service.execute(
            invite,
            invoke(scopeA, { email: recipient.email, roleId: staffRole }),
          )
        ).result.invitationId;
        const queued = (
          await admin.query(
            "SELECT encrypted_payload FROM app.auth_mail WHERE invitation_id=$1",
            [id],
          )
        ).rows[0];
        assert.ok(!queued.encrypted_payload.includes(recipient.email));
        for (let n = 0; n < 30; n++)
          if (
            !(await deliverAuthMail({
              pool: worker,
              secret: process.env.TEST_MAIL_ENCRYPTION_KEY,
              transport,
            }))
          )
            break;
        assert.equal(
          (
            await admin.query(
              "SELECT state FROM app.auth_mail WHERE invitation_id=$1",
              [id],
            )
          ).rows[0].state,
          "sent",
        );
        const list = await (
          await fetch(
            `${process.env.TEST_MAILPIT_URL ?? "http://127.0.0.1:24422"}/api/v1/messages`,
          )
        ).json();
        assert.ok(
          list.messages.some(
            (m) =>
              m.Subject.includes("invitation") &&
              m.To.some((to) => to.Address === recipient.email),
          ),
        );
      },
    );
  } finally {
    transport.close();
    await Promise.all([web.end(), worker.end()]);
    await admin.end();
  }
});
