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
} from "./commands.js";
import { databaseValue as value } from "./database-value.js";
import { CommandError, sqlState } from "./errors.js";
import * as c from "./master-contracts.js";
import { createStarterBundle } from "./master-starters.js";
import { emit, type Observe } from "./operations.js";
import { workspaceTarget } from "./workspace-contracts.js";

export class MasterError extends CommandError {
  readonly issues: c.MasterValidationIssue[];
  correlationId: string;
  constructor(
    category: CommandError["category"],
    message: string,
    issues: c.MasterValidationIssue[] = [],
    correlationId: string = randomUUID(),
  ) {
    super(category, message);
    this.issues = issues;
    this.correlationId = correlationId;
  }
}
function parse<T extends z.ZodType>(schema: T, input: unknown): z.infer<T> {
  const result = schema.safeParse(input);
  if (!result.success)
    throw new MasterError(
      "validation",
      "Invalid master input",
      c.masterIssues(result.error),
    );
  return result.data;
}
function databaseIssues(error: unknown): c.MasterValidationIssue[] {
  if (!(error instanceof Error)) return [];
  if ("detail" in error && typeof error.detail === "string") {
    try {
      const result = z
        .object({ issues: z.array(c.masterValidationIssue).max(30) })
        .safeParse(JSON.parse(error.detail));
      if (result.success) return result.data.issues;
    } catch {
      /* Driver details are never returned. */
    }
  }
  return databaseIssues(error.cause);
}
function masterError(error: unknown, correlationId?: string): never {
  if (error instanceof MasterError) {
    if (correlationId) error.correlationId = correlationId;
    throw error;
  }
  if (error instanceof CommandError)
    throw new MasterError(error.category, error.message, [], correlationId);
  const code = sqlState(error);
  if (
    code === "42501" ||
    (error instanceof Error && error.message === "Database scope denied")
  )
    throw new MasterError("access", "Master access denied", [], correlationId);
  if (code === "P0002" || code === "P0003" || code === "23505")
    throw new MasterError(
      "conflict",
      "Master input, name, or version conflict",
      databaseIssues(error),
      correlationId,
    );
  if (code?.startsWith("22") || code === "23514" || code === "23503")
    throw new MasterError(
      "validation",
      "Invalid master configuration",
      databaseIssues(error),
      correlationId,
    );
  throw new MasterError("temporary", "Masters unavailable", [], correlationId);
}
async function management(db: TransactionDatabase) {
  const allowed = await value(
    db,
    sql`SELECT app.has_permission('masters.read') AND app.has_permission('masters.manage') AND app.has_permission('masters.rates.read') AS value`,
    z.boolean().nullable(),
  );
  if (!allowed) throw new MasterError("access", "Master management denied");
}
function command<P, R>(options: {
  kind: string;
  input: z.ZodType<P>;
  output: z.ZodType<R>;
  entity: string;
  changes: string[];
  id: (p: P, r: R) => string;
  versions: (p: P, r: R) => { previousVersion: number; nextVersion: number };
  mutate: (db: TransactionDatabase, p: P) => Promise<R>;
}): Command<P, R> {
  return {
    kind: options.kind,
    input: options.input,
    output: options.output,
    access: {
      kind: "tenant",
      permission: "masters.manage",
      projection: options.entity,
    },
    authorize: management,
    async mutate(db, _authority, p) {
      try {
        const result = await options.mutate(db, p);
        return {
          result,
          audit: {
            entityKind: options.entity,
            entityId: options.id(p, result),
            reason: options.kind,
            changedFields: options.changes,
            ...options.versions(p, result),
          },
          jobs: [],
        };
      } catch (error) {
        if (["40001", "40P01"].includes(sqlState(error) ?? "")) throw error;
        masterError(error);
      }
    },
  };
}
export const saveGarment = command({
  kind: "garment.save",
  input: c.garmentSave,
  output: c.garmentSaveResult,
  entity: "garment",
  changes: ["definition", "services", "addons", "rates"],
  id: (_p, r) => r.garmentId,
  versions: (p, r) => ({
    previousVersion: p.mode === "update" ? p.expectedVersion : 0,
    nextVersion: r.version,
  }),
  mutate: (db, p) =>
    value(
      db,
      sql`SELECT app.master_garment_save(${JSON.stringify(p)}::jsonb) AS value`,
      c.garmentSaveResult,
    ),
});
export const saveMasterService = command({
  kind: "service.save",
  input: c.serviceSave,
  output: c.serviceSaveResult,
  entity: "master_service",
  changes: ["label"],
  id: (_p, r) => r.serviceId,
  versions: (p, r) => ({
    previousVersion: p.mode === "update" ? p.expectedVersion : 0,
    nextVersion: r.version,
  }),
  mutate: (db, p) =>
    value(
      db,
      sql`SELECT app.master_service_save(${JSON.stringify(p)}::jsonb) AS value`,
      c.serviceSaveResult,
    ),
});
export const saveMasterAddon = command({
  kind: "addon.save",
  input: c.addonSave,
  output: c.addonSaveResult,
  entity: "master_addon",
  changes: ["label", "rates"],
  id: (_p, r) => r.addonId,
  versions: (p, r) => ({
    previousVersion: p.mode === "update" ? p.expectedVersion : 0,
    nextVersion: r.version,
  }),
  mutate: (db, p) =>
    value(
      db,
      sql`SELECT app.master_addon_save(${JSON.stringify(p)}::jsonb) AS value`,
      c.addonSaveResult,
    ),
});
export const changeGarmentLifecycle = command({
  kind: "garment.lifecycle",
  input: c.garmentLifecycle,
  output: c.garmentLifecycleResult,
  entity: "garment",
  changes: ["active"],
  id: (p) => p.garmentId,
  versions: (p, r) => ({
    previousVersion: p.expectedVersion,
    nextVersion: r.version,
  }),
  mutate: (db, p) =>
    value(
      db,
      sql`SELECT app.master_lifecycle('garment',${p.garmentId}::uuid,${p.expectedVersion},${p.active}) AS value`,
      c.garmentLifecycleResult,
    ),
});
export const changeServiceLifecycle = command({
  kind: "service.lifecycle",
  input: c.serviceLifecycle,
  output: c.serviceLifecycleResult,
  entity: "master_service",
  changes: ["active"],
  id: (p) => p.serviceId,
  versions: (p, r) => ({
    previousVersion: p.expectedVersion,
    nextVersion: r.version,
  }),
  mutate: (db, p) =>
    value(
      db,
      sql`SELECT app.master_lifecycle('service',${p.serviceId}::uuid,${p.expectedVersion},${p.active}) AS value`,
      c.serviceLifecycleResult,
    ),
});
export const changeAddonLifecycle = command({
  kind: "addon.lifecycle",
  input: c.addonLifecycle,
  output: c.addonLifecycleResult,
  entity: "master_addon",
  changes: ["active"],
  id: (p) => p.addonId,
  versions: (p, r) => ({
    previousVersion: p.expectedVersion,
    nextVersion: r.version,
  }),
  mutate: (db, p) =>
    value(
      db,
      sql`SELECT app.master_lifecycle('addon',${p.addonId}::uuid,${p.expectedVersion},${p.active}) AS value`,
      c.addonLifecycleResult,
    ),
});

// Catalog commands use the admitted tenant as audit identity and take the previous
// token under the same catalog lock as their mutation. It is not a content revision.
function catalogCommand<
  P extends { expectedCatalogVersion: number },
  R extends { catalogVersion: number },
>(options: {
  kind: string;
  input: z.ZodType<P>;
  output: z.ZodType<R>;
  changes: string[];
  mutate: (db: TransactionDatabase, p: P) => Promise<R>;
}): Command<P, R> {
  return {
    kind: options.kind,
    input: options.input,
    output: options.output,
    access: {
      kind: "tenant",
      permission: "masters.manage",
      projection: "master_catalog",
    },
    authorize: management,
    async mutate(db, authority, p) {
      if (authority.scope.kind !== "tenant")
        throw new MasterError("access", "Tenant required");
      try {
        const result = await options.mutate(db, p);
        return {
          result,
          audit: {
            entityKind: "master_catalog",
            entityId: authority.scope.tenantId,
            reason: options.kind,
            changedFields: options.changes,
            previousVersion: p.expectedCatalogVersion,
            nextVersion: result.catalogVersion,
          },
          jobs: [],
        };
      } catch (error) {
        if (["40001", "40P01"].includes(sqlState(error) ?? "")) throw error;
        masterError(error);
      }
    },
  };
}
export const installMasterStarters = catalogCommand({
  kind: "masters.starters.install",
  input: c.starterInstall,
  output: c.starterInstallResult,
  changes: ["starters"],
  mutate: (db, p) =>
    value(
      db,
      sql`SELECT app.master_starters_install(${p.expectedCatalogVersion},${JSON.stringify(createStarterBundle(randomUUID))}::jsonb) AS value`,
      c.starterInstallResult,
    ),
});
export const reorderMasters = catalogCommand({
  kind: "masters.reorder",
  input: c.masterReorder,
  output: c.catalogCommandResult,
  changes: ["order"],
  mutate: (db, p) =>
    value(
      db,
      sql`SELECT app.master_reorder(${p.kind},${p.movedId}::uuid,${p.beforeId}::uuid,${p.expectedCatalogVersion}) AS value`,
      c.catalogCommandResult,
    ),
});
export const changeMasterVisibility = catalogCommand({
  kind: "masters.visibility",
  input: c.masterVisibility,
  output: c.catalogCommandResult,
  changes: ["visibility"],
  mutate: (db, p) =>
    value(
      db,
      sql`SELECT app.master_visibility(${p.expectedCatalogVersion},${p.hideStandardGarments},${p.hideStandardServices}) AS value`,
      c.catalogCommandResult,
    ),
});
export const masterAction = z.enum([
  "garment.save",
  "garment.lifecycle",
  "service.save",
  "service.lifecycle",
  "addon.save",
  "addon.lifecycle",
  "masters.starters.install",
  "masters.reorder",
  "masters.visibility",
]);
const permissionResult = z.boolean().nullable();
const selectedVersion = z.uuid().nullable();
export function createMasterService(dependencies: {
  pool: ReturnType<typeof createPool>;
  resolveIdentity: () => Promise<Identity>;
  observe?: Observe;
}) {
  const execute = createCommandExecutor(dependencies);
  async function run<P, R>(
    definition: Command<P, R>,
    target: unknown,
    input: unknown,
  ) {
    const selected = parse(workspaceTarget, target);
    const request = parse(c.masterInvocation(definition.input), input);
    return execute(definition, {
      ...request,
      scope: { kind: "tenant", ...selected },
    }).catch((error) => masterError(error, request.correlationId));
  }
  async function scoped<T>(
    target: unknown,
    fn: (db: TransactionDatabase, priced: boolean) => Promise<T>,
  ) {
    const correlationId = randomUUID();
    const selected = parse(workspaceTarget, target);
    try {
      const actor = await dependencies.resolveIdentity();
      return await withScope(
        dependencies.pool,
        { kind: "tenant", principalId: actor.principalId, ...selected },
        async (db) => {
          const allowed = await value(
            db,
            sql`SELECT app.has_permission('masters.read') AS value`,
            permissionResult,
          );
          if (!allowed) throw new MasterError("access", "Master access denied");
          const priced = await value(
            db,
            sql`SELECT app.has_permission('masters.rates.read') AS value`,
            permissionResult,
          );
          return fn(db, priced === true);
        },
      );
    } catch (error) {
      emit(dependencies.observe, {
        event: "command_failed",
        kind: "masters.read",
        correlationId,
        tenantId: selected.tenantId,
        locationId: selected.locationId,
        operationId: null,
        jobId: null,
        attempt: 1,
        elapsedMs: 0,
        outcome: "rejected",
        errorCategory: sqlState(error) ?? "read",
      });
      masterError(error, correlationId);
    }
  }
  return {
    command(action: unknown, target: unknown, input: unknown) {
      switch (parse(masterAction, action)) {
        case "garment.save":
          return run(saveGarment, target, input);
        case "garment.lifecycle":
          return run(changeGarmentLifecycle, target, input);
        case "service.save":
          return run(saveMasterService, target, input);
        case "service.lifecycle":
          return run(changeServiceLifecycle, target, input);
        case "addon.save":
          return run(saveMasterAddon, target, input);
        case "addon.lifecycle":
          return run(changeAddonLifecycle, target, input);
        case "masters.starters.install":
          return run(installMasterStarters, target, input);
        case "masters.reorder":
          return run(reorderMasters, target, input);
        case "masters.visibility":
          return run(changeMasterVisibility, target, input);
      }
    },
    catalog(target: unknown) {
      return scoped(target, (db) =>
        value(db, sql`SELECT app.master_catalog() AS value`, c.masterCatalog),
      );
    },
    page(target: unknown, kind: unknown, query: unknown = {}) {
      const selectedKind = parse(c.masterKind, kind);
      const parsed = parse(c.masterPageQuery, query);
      const filters = {
        ...parsed,
        applicability: parsed.applicability ?? null,
      };
      return scoped(target, async (db, priced) => {
        const result = await value(
          db,
          priced
            ? sql`SELECT app.master_register_priced(${selectedKind},${JSON.stringify(filters)}::jsonb) AS value`
            : sql`SELECT app.master_register_schema(${selectedKind},${JSON.stringify(filters)}::jsonb) AS value`,
          z.unknown(),
        );
        switch (selectedKind) {
          case "garment":
            return priced
              ? c.pricedGarmentPage.parse(result)
              : c.garmentPage.parse(result);
          case "service":
            return c.servicePage.parse(result);
          case "addon":
            return priced
              ? c.pricedAddonPage.parse(result)
              : c.addonPage.parse(result);
        }
      });
    },
    garment(target: unknown, id: unknown, version: unknown = null) {
      const identity = parse(c.garmentId, id),
        revision = parse(selectedVersion, version);
      return scoped(target, (db, priced) =>
        priced
          ? value(
              db,
              sql`SELECT app.master_garment_priced(${identity}::uuid,${revision}::uuid) AS value`,
              c.pricedGarmentDetail,
            )
          : value(
              db,
              sql`SELECT app.master_garment_schema(${identity}::uuid,${revision}::uuid) AS value`,
              c.garmentDetail,
            ),
      );
    },
    service(target: unknown, id: unknown, version: unknown = null) {
      const identity = parse(c.serviceId, id),
        revision = parse(selectedVersion, version);
      return scoped(target, (db) =>
        value(
          db,
          sql`SELECT app.master_service_version(${identity}::uuid,${revision}::uuid) AS value`,
          c.serviceVersion,
        ),
      );
    },
    addon(target: unknown, id: unknown, version: unknown = null) {
      const identity = parse(c.addonId, id),
        revision = parse(selectedVersion, version);
      return scoped(target, (db, priced) =>
        priced
          ? value(
              db,
              sql`SELECT app.master_addon_priced(${identity}::uuid,${revision}::uuid) AS value`,
              c.pricedAddonVersion,
            )
          : value(
              db,
              sql`SELECT app.master_addon_schema(${identity}::uuid,${revision}::uuid) AS value`,
              c.addonVersion,
            ),
      );
    },
    history(target: unknown, kind: unknown, id: unknown, query: unknown = {}) {
      const selectedKind = parse(c.masterKind, kind),
        identity = parse(z.uuid(), id),
        page = parse(c.masterHistoryQuery, query);
      return scoped(target, (db) =>
        value(
          db,
          sql`SELECT app.master_history(${selectedKind},${identity}::uuid,${page.offset}) AS value`,
          c.masterHistoryPage,
        ),
      );
    },
  };
}
