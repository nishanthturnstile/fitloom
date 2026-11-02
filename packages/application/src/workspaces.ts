import { randomUUID } from "node:crypto";
import {
  type createPool,
  type TransactionDatabase,
  withScope,
} from "@fitloom/db";
import { sql } from "drizzle-orm";
import { z } from "zod";
import {
  type Command,
  createCommandExecutor,
  type Identity,
  uuid,
} from "./commands.js";
import { CommandError, sqlState } from "./errors.js";
import { encryptMail } from "./mail.js";
import type { Observe } from "./operations.js";
import {
  choicePage,
  jobSummary,
  pageOf,
  pageOffset,
  setupDraftSchema,
  workspaceTeam as teamView,
  workspaceChoice,
  workspaceTarget,
  workspaceView,
} from "./workspace-contracts.js";

export {
  completedSetupSchema,
  setupDraftSchema,
  workspaceTarget,
  workspaceView,
} from "./workspace-contracts.js";

const version = z.int().nonnegative();
function command<P, R>(options: {
  kind: string;
  permission?: string;
  input: z.ZodType<P>;
  output: z.ZodType<R>;
  entity: string;
  changes: string[];
  entityId?: (payload: P, result: R) => string;
  versions?: (
    payload: P,
    result: R,
  ) => { previousVersion: number; nextVersion: number };
  mutate: (db: TransactionDatabase, payload: P) => Promise<R>;
}): Command<P, R> {
  return {
    kind: options.kind,
    access: options.permission
      ? {
          kind: "tenant",
          permission: options.permission,
          projection: options.entity,
        }
      : { kind: "principal", projection: options.entity },
    input: options.input,
    output: options.output,
    async mutate(db, authority, payload) {
      const result = await options.mutate(db, payload);
      return {
        result,
        audit: {
          entityKind: options.entity,
          entityId:
            options.entityId?.(payload, result) ??
            (authority.scope.kind === "tenant"
              ? authority.scope.tenantId
              : authority.scope.principalId),
          reason: options.kind,
          changedFields: options.changes,
          previousVersion: null,
          nextVersion: null,
          ...options.versions?.(payload, result),
        },
        jobs: [],
      };
    },
  };
}
async function value<T extends z.ZodType>(
  db: TransactionDatabase,
  query: ReturnType<typeof sql>,
  schema: T,
): Promise<z.infer<T>> {
  return schema.parse(
    z
      .object({ rows: z.array(z.object({ value: z.unknown() })).length(1) })
      .parse(await db.execute(query)).rows[0]?.value,
  );
}
export const beginAnotherSetup = command({
  kind: "setup.begin",
  input: z.strictObject({
    expectedVersion: version,
    createAnother: z.literal(true),
  }),
  output: z.object({ version }),
  entity: "setup-draft",
  changes: ["provisioningId"],
  versions: (p, r) => ({
    previousVersion: p.expectedVersion,
    nextVersion: r.version,
  }),
  mutate: async (db, p) => ({
    version: await value(
      db,
      sql`SELECT app.begin_another_setup(${p.expectedVersion}) AS value`,
      version,
    ),
  }),
});
export const savePreferences = command({
  kind: "preferences.save",
  input: z.strictObject({
    locale: z.enum(["en", "ta", "hi"]),
    tenantId: uuid.nullable(),
    locationId: uuid.nullable(),
  }),
  output: z.object({ saved: z.literal(true) }),
  entity: "personal-preferences",
  changes: ["locale", "workspaceHint"],
  mutate: async (db, p) => {
    await db.execute(
      sql`SELECT app.save_personal_preferences(${p.locale},${p.tenantId}::uuid,${p.locationId}::uuid)`,
    );
    return { saved: true } satisfies { saved: true };
  },
});
export const updateWorkspace = command({
  kind: "workspace.update",
  permission: "workspace.manage",
  input: z.strictObject({
    expectedVersion: version,
    shopName: z.string().trim().min(1).max(200),
    address: z.string().trim().min(1).max(1000),
  }),
  output: z.object({ version }),
  entity: "shop-settings",
  changes: ["shopName", "address"],
  versions: (p, r) => ({
    previousVersion: p.expectedVersion,
    nextVersion: r.version,
  }),
  mutate: async (db, p) => ({
    version: await value(
      db,
      sql`SELECT app.update_workspace(${p.expectedVersion},${p.shopName},${p.address}) AS value`,
      version,
    ),
  }),
});
export const createRole = command({
  kind: "role.create",
  permission: "access.manage",
  input: z
    .strictObject({
      name: z.string().trim().min(1).max(80),
      permissions: z
        .array(
          z.enum([
            "workspace.read",
            "workspace.manage",
            "workspace.private.read",
            "access.manage",
            "locations.all",
            "audit.read",
            "journal.read",
            "journal.post",
            "files.read",
            "files.manage",
            "masters.read",
            "masters.manage",
            "masters.rates.read",
          ]),
        )
        .min(1)
        .max(20),
    })
    .superRefine((role, ctx) => {
      if (
        role.permissions.includes("masters.manage") &&
        (!role.permissions.includes("masters.read") ||
          !role.permissions.includes("masters.rates.read"))
      )
        ctx.addIssue({
          code: "custom",
          path: ["permissions"],
          message:
            "Master management requires schema and rate read permissions",
        });
    }),
  output: z.object({ roleId: uuid }),
  entity: "role",
  changes: ["permissions"],
  entityId: (_p, r) => r.roleId,
  mutate: async (db, p) => ({
    roleId: await value(
      db,
      sql`SELECT app.create_custom_role(${p.name},${sql.param(p.permissions)}::text[]) AS value`,
      uuid,
    ),
  }),
});
export const setMemberRole = command({
  kind: "member.role",
  permission: "access.manage",
  input: z.strictObject({
    membershipId: uuid,
    roleId: uuid,
    expectedVersion: version,
    enabled: z.boolean(),
  }),
  output: z.object({ version }),
  entity: "membership",
  changes: ["role", "locationGrants"],
  entityId: (p) => p.membershipId,
  versions: (p, r) => ({
    previousVersion: p.expectedVersion,
    nextVersion: r.version,
  }),
  mutate: async (db, p) => ({
    version: await value(
      db,
      sql`SELECT app.set_member_role(${p.membershipId}::uuid,${p.roleId}::uuid,${p.expectedVersion},${p.enabled}) AS value`,
      version,
    ),
  }),
});
export const revokeInvitation = command({
  kind: "staff.revoke",
  permission: "access.manage",
  input: z.strictObject({ invitationId: uuid }),
  output: z.object({ invitationId: uuid }),
  entity: "staff-invitation",
  changes: ["revokedAt"],
  entityId: (_p, r) => r.invitationId,
  mutate: async (db, p) => ({
    invitationId: await value(
      db,
      sql`SELECT app.revoke_invitation(${p.invitationId}::uuid) AS value`,
      uuid,
    ),
  }),
});
export function invitationCommand(config: {
  baseURL: string;
  mailKey: string;
}) {
  return command({
    kind: "staff.invite",
    permission: "access.manage",
    input: z.strictObject({
      email: z.email().transform((email) => email.toLowerCase()),
      roleId: uuid,
    }),
    output: z.object({ invitationId: uuid }),
    entity: "staff-invitation",
    changes: ["recipient", "role", "location"],
    entityId: (_p, r) => r.invitationId,
    mutate: async (db, p) => {
      const id = randomUUID();
      const url = new URL(`/invitations/${id}`, config.baseURL).href;
      const encrypted = encryptMail(
        { kind: "invitation", to: p.email, url },
        config.mailKey,
      );
      return {
        invitationId: await value(
          db,
          sql`SELECT app.invite_staff(${id}::uuid,${p.email},${p.roleId}::uuid,${encrypted}) AS value`,
          uuid,
        ),
      };
    },
  });
}
const acceptanceInput = z.strictObject({ invitationId: uuid });
export const acceptInvitation: Command<
  z.infer<typeof acceptanceInput>,
  z.infer<typeof workspaceTarget>
> = {
  kind: "staff.accept",
  access: { kind: "principal", projection: "accepted-workspace" },
  input: acceptanceInput,
  output: workspaceTarget,
  async authorize(db, _authority, p) {
    if (
      !(await value(
        db,
        sql`SELECT app.invitation_visible(${p.invitationId}::uuid) AS value`,
        z.boolean(),
      ))
    )
      throw new CommandError(
        "access",
        "Invitation is unavailable for this verified identity",
      );
  },
  async mutate(db, _authority, p) {
    const result = await value(
      db,
      sql`SELECT app.accept_invitation(${p.invitationId}::uuid) AS value`,
      workspaceTarget,
    );
    return {
      result,
      audit: {
        entityKind: "staff-invitation",
        entityId: p.invitationId,
        reason: "Accept staff invitation",
        changedFields: ["acceptedAt", "membership", "locationGrants"],
        previousVersion: null,
        nextVersion: null,
      },
      jobs: [],
    };
  },
};
const preference = z.strictObject({
  locale: z.string(),
  tenantId: uuid.nullable(),
  locationId: uuid.nullable(),
});
const progress = z.strictObject({
  version,
  draft: z.unknown(),
  tenantId: uuid.nullable(),
});

export { workspaceTeam as teamView } from "./workspace-contracts.js";

function readError(error: unknown): never {
  if (error instanceof CommandError) throw error;
  const code = sqlState(error);
  if (
    code === "42501" ||
    (error instanceof Error && error.message === "Database scope denied")
  )
    throw new CommandError("access", "Workspace access denied");
  if (code?.startsWith("22"))
    throw new CommandError("validation", "Invalid workspace");
  throw new CommandError("temporary", "Workspace unavailable");
}
export function createWorkspaceService(dependencies: {
  pool: ReturnType<typeof createPool>;
  resolveIdentity: () => Promise<Identity>;
  observe?: Observe;
}) {
  const execute = createCommandExecutor(dependencies);
  async function principal<T>(run: (db: TransactionDatabase) => Promise<T>) {
    const actor = await dependencies.resolveIdentity();
    return withScope(
      dependencies.pool,
      { kind: "principal", principalId: actor.principalId },
      run,
    ).catch(readError);
  }
  async function scoped<T>(
    target: unknown,
    run: (db: TransactionDatabase) => Promise<T>,
  ) {
    const selected = workspaceTarget.safeParse(target);
    if (!selected.success)
      throw new CommandError("validation", "Invalid workspace target");
    const actor = await dependencies.resolveIdentity();
    return withScope(
      dependencies.pool,
      { kind: "tenant", principalId: actor.principalId, ...selected.data },
      run,
    ).catch(readError);
  }
  return {
    execute,
    async setup() {
      return principal(async (db) => {
        const stored = await value(
          db,
          sql`SELECT app.setup_progress() AS value`,
          progress.nullable(),
        );
        const parsed = setupDraftSchema.safeParse(stored?.draft ?? {});
        return {
          version: stored?.version ?? 0,
          tenantId: stored?.tenantId ?? null,
          draft: parsed.success ? parsed.data : setupDraftSchema.parse({}),
        };
      });
    },
    choicePage(offset: unknown = 0) {
      const parsed = pageOffset.safeParse(offset);
      if (!parsed.success)
        throw new CommandError("validation", "Invalid page offset");
      return principal((db) =>
        value(
          db,
          sql`SELECT app.workspace_choices_page(${parsed.data}) AS value`,
          choicePage,
        ),
      );
    },
    choices() {
      return principal((db) =>
        value(
          db,
          sql`SELECT app.workspace_choices() AS value`,
          z.array(workspaceChoice),
        ),
      );
    },
    preferences() {
      return principal((db) =>
        value(
          db,
          sql`SELECT app.read_personal_preferences() AS value`,
          preference.nullable(),
        ),
      );
    },
    view(target: unknown) {
      return scoped(target, (db) =>
        value(db, sql`SELECT app.workspace_view() AS value`, workspaceView),
      );
    },
    allLocationsPage(target: unknown, offset: unknown = 0) {
      const parsed = pageOffset.safeParse(offset);
      if (!parsed.success)
        throw new CommandError("validation", "Invalid page offset");
      return scoped(target, (db) =>
        value(
          db,
          sql`SELECT app.all_locations_page(${parsed.data}) AS value`,
          pageOf(z.strictObject({ id: uuid, name: z.string() })),
        ),
      );
    },
    allLocations(target: unknown) {
      return scoped(target, (db) =>
        value(
          db,
          sql`SELECT app.all_locations_view() AS value`,
          z.array(z.object({ id: uuid, name: z.string() })),
        ),
      );
    },
    jobsPage(target: unknown, offset: unknown = 0) {
      const parsed = pageOffset.safeParse(offset);
      if (!parsed.success)
        throw new CommandError("validation", "Invalid page offset");
      return scoped(target, (db) =>
        value(
          db,
          sql`SELECT app.foundation_job_page(${parsed.data}) AS value`,
          pageOf(jobSummary),
        ),
      );
    },
    jobs(target: unknown) {
      return scoped(target, (db) =>
        value(
          db,
          sql`SELECT app.foundation_job_list() AS value`,
          z.array(jobSummary),
        ),
      );
    },
    team(target: unknown, offset: unknown = 0) {
      const parsed = pageOffset.safeParse(offset);
      if (!parsed.success)
        throw new CommandError("validation", "Invalid page offset");
      return scoped(target, (db) =>
        value(
          db,
          sql`SELECT app.workspace_team_page(${parsed.data}) AS value`,
          teamView,
        ),
      );
    },
  };
}
