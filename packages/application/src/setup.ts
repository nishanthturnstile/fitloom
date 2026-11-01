import { sql } from "drizzle-orm";
import { z } from "zod";
import { type Command, requestHash, uuid } from "./commands.js";
import { CommandError } from "./errors.js";
import { setupDraftSchema, setupFields } from "./workspace-contracts.js";

const input = z.strictObject({
  expectedVersion: z.int().nonnegative(),
  ...setupFields,
});
const output = z.strictObject({
  principalId: uuid,
  version: z.int().positive(),
});
export const saveSetupDraft: Command<
  z.infer<typeof input>,
  z.infer<typeof output>
> = {
  kind: "setup.save",
  access: { kind: "principal", projection: "own-setup" },
  input,
  output,
  async mutate(db, authority, payload) {
    const rows = z
      .object({
        rows: z.array(z.object({ version: z.int().positive() })).length(1),
      })
      .parse(
        await db.execute(
          sql`SELECT app.save_setup_draft(${payload.expectedVersion},${JSON.stringify(Object.fromEntries(Object.entries(payload).filter(([key]) => key !== "expectedVersion")))}::jsonb) AS version`,
        ),
      );
    const version = rows.rows[0]?.version;
    if (!version) throw new Error("Missing setup version");
    return {
      result: { principalId: authority.scope.principalId, version },
      audit: {
        entityKind: "setup-draft",
        changedFields: [
          "shopName",
          "locationName",
          "businessMode",
          "ownerName",
          "ownerPhone",
          "address",
          "timezone",
          "consentAccepted",
        ],
        entityId: authority.scope.principalId,
        reason: "Save shop setup",
        previousVersion: payload.expectedVersion,
        nextVersion: version,
      },
      jobs: [],
    };
  },
};

const provisioningInput = input;
const provisioningOutput = z.strictObject({ tenantId: uuid });
export const provisionTenant: Command<
  z.infer<typeof provisioningInput>,
  z.infer<typeof provisioningOutput>
> = {
  kind: "tenant.provision",
  access: { kind: "principal", projection: "provisioned-tenant-reference" },
  input: provisioningInput,
  output: provisioningOutput,
  async authorize(db) {
    const check = z
      .object({ rows: z.array(z.object({ allowed: z.boolean() })).length(1) })
      .parse(await db.execute(sql`SELECT app.principal_verified() AS allowed`));
    if (!check.rows[0]?.allowed)
      throw new CommandError("access", "Verified identity required");
  },
  async mutate(db, _authority, payload) {
    const saved = z
      .object({ rows: z.array(z.object({ draft: z.unknown() })).length(1) })
      .parse(
        await db.execute(sql`SELECT app.setup_progress()->'draft' AS draft`),
      );
    const parsed = setupDraftSchema.safeParse(saved.rows[0]?.draft);
    if (!parsed.success)
      throw new CommandError("conflict", "Setup draft required");
    const profile = parsed.data;
    const { expectedVersion: _expectedVersion, ...requested } = payload;
    if (requestHash(profile) !== requestHash(requested))
      throw new CommandError(
        "validation",
        "Save the current setup details before provisioning",
      );
    const rows = z
      .object({ rows: z.array(z.object({ id: uuid })).length(1) })
      .parse(
        await db.execute(
          sql`SELECT app.provision_tenant(${payload.shopName},${payload.locationName},${payload.expectedVersion}) AS id`,
        ),
      );
    const tenantId = rows.rows[0]?.id;
    if (!tenantId) throw new Error("Missing provisioned tenant");
    return {
      result: { tenantId },
      audit: {
        entityKind: "tenant",
        changedFields: [
          "tenant",
          "location",
          "ownerMembership",
          "grants",
          "settings",
          "ownerContact",
          "consent",
        ],
        entityId: tenantId,
        reason: "Provision owner workspace",
        previousVersion: payload.expectedVersion,
        nextVersion: null,
      },
      jobs: [],
    };
  },
};
