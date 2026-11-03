import { createHash } from "node:crypto";
import {
  type createPool,
  type Scope,
  type TransactionDatabase,
  withScope,
} from "@fitloom/db";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { CommandError, sqlState } from "./errors.js";
import { emit, type Observe } from "./operations.js";

export const uuid = z.uuid();
export const principalId = uuid.brand<"PrincipalId">();
export const tenantId = uuid.brand<"TenantId">();
export const locationId = uuid.brand<"LocationId">();
export type Identity = { principalId: z.infer<typeof principalId> };
const requestedScope = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("principal") }),
  z.strictObject({ kind: z.literal("tenant"), tenantId, locationId }),
]);
const invocation = z.strictObject({
  scope: requestedScope,
  operationKey: z.string().min(1).max(200),
  correlationId: uuid,
  payload: z.unknown(),
});
const jsonValue = z.json();
const job = z.strictObject({
  key: z.string().min(1).max(100),
  kind: z.string().min(1).max(100),
  inputVersion: z.int().positive(),
  payload: jsonValue,
});
const audit = z.strictObject({
  entityKind: z.string().min(1).max(100),
  entityId: uuid,
  reason: z.string().min(1).max(500),
  changedFields: z
    .array(z.string().regex(/^[a-zA-Z][a-zA-Z0-9.]{0,79}$/))
    .max(30),
  previousVersion: z.int().nonnegative().nullable(),
  nextVersion: z.int().nonnegative().nullable(),
});
export type Mutation<R> = {
  result: R;
  audit: z.infer<typeof audit>;
  jobs: z.infer<typeof job>[];
};
export type AuthorizedScope = {
  scope: Scope;
  authority: "principal" | "staff";
  permission: string;
  projection: string;
};
export type Command<P, R> = {
  kind: string;
  access:
    | { kind: "principal"; projection: string }
    | { kind: "tenant"; permission: string; projection: string };
  input: z.ZodType<P>;
  output: z.ZodType<R>;
  // Runs on every attempt, including replay, on the command connection.
  authorize?: (
    db: TransactionDatabase,
    authority: AuthorizedScope,
    payload: P,
  ) => Promise<void>;
  // Domain-specific SQL states are interpreted only after shared retry handling.
  mapError?: (error: unknown) => CommandError | undefined;
  mutate: (
    db: TransactionDatabase,
    authority: AuthorizedScope,
    payload: P,
  ) => Promise<Mutation<R>>;
};

export type AdmissionPolicy = {
  mode: "commercial";
  commercial: (
    db: TransactionDatabase,
    authority: AuthorizedScope,
    kind: string,
  ) => Promise<void>;
  features: (
    db: TransactionDatabase,
    authority: AuthorizedScope,
    kind: string,
  ) => Promise<void>;
  usage: (
    db: TransactionDatabase,
    authority: AuthorizedScope,
    kind: string,
  ) => Promise<void>;
};
export const developmentAdmission = {
  mode: "development-unimplemented",
} satisfies { mode: "development-unimplemented" };
// z.json rejects non-JSON values first; recursion here sorts object keys only.
function canonical(value: z.infer<typeof jsonValue>): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonical(value[key] ?? null)}`)
    .join(",")}}`;
}
export function requestHash(value: unknown): string {
  return `v1:${createHash("sha256")
    .update(canonical(jsonValue.parse(value)))
    .digest("hex")}`;
}
const claimRow = z.object({ id: uuid, result: jsonValue.nullable() });
const resultRows = z.object({ rows: z.array(claimRow).length(1) });

// Resolve a current database-backed session here on Day 3. Never accept identity from request JSON.
export function createCommandExecutor(dependencies: {
  pool: ReturnType<typeof createPool>;
  resolveIdentity: () => Promise<Identity>;
  admission?: AdmissionPolicy;
  observe?: Observe;
}) {
  return async function execute<P, R>(
    command: Command<P, R>,
    raw: unknown,
  ): Promise<{ operationId: string; replayed: boolean; result: R }> {
    const request = invocation.safeParse(raw);
    if (!request.success)
      throw new CommandError("validation", "Invalid command invocation");
    const input = command.input.safeParse(request.data.payload);
    if (!input.success)
      throw new CommandError("validation", "Invalid command payload");
    if (request.data.scope.kind !== command.access.kind)
      throw new CommandError("access", "Command scope denied");
    const semantic = jsonValue.safeParse({
      scope: request.data.scope,
      payload: input.data,
    });
    if (!semantic.success)
      throw new CommandError("validation", "Command input must be JSON");
    const hash = requestHash(semantic.data);
    const started = performance.now();
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const identity = await dependencies.resolveIdentity();
        const actor = principalId.parse(identity.principalId);
        const scope: Scope = { ...request.data.scope, principalId: actor };
        const outcome = await withScope(
          dependencies.pool,
          scope,
          async (db) => {
            if (command.access.kind === "tenant") {
              const permission = z
                .object({
                  rows: z
                    .array(z.object({ allowed: z.boolean().nullable() }))
                    .length(1),
                })
                .parse(
                  await db.execute(
                    sql`SELECT app.has_permission(${command.access.permission}) AS allowed`,
                  ),
                );
              if (!permission.rows[0]?.allowed)
                throw new CommandError("access", "Command permission denied");
            }
            const authority: AuthorizedScope = {
              scope,
              authority:
                command.access.kind === "principal" ? "principal" : "staff",
              permission:
                command.access.kind === "principal"
                  ? "self"
                  : command.access.permission,
              projection: command.access.projection,
            };
            await command.authorize?.(db, authority, input.data);
            await dependencies.admission?.commercial(
              db,
              authority,
              command.kind,
            );
            await dependencies.admission?.features(db, authority, command.kind);
            const claimed = resultRows.parse(
              await db.execute(
                sql`SELECT * FROM app.claim_operation(${scope.kind},${command.kind},${request.data.operationKey},${hash},${request.data.correlationId}::uuid)`,
              ),
            ).rows[0];
            if (!claimed) throw new Error("Missing claimed operation");
            if (claimed.result !== null)
              return {
                operationId: claimed.id,
                replayed: true,
                result: command.output.parse(claimed.result),
              };
            await dependencies.admission?.usage(db, authority, command.kind);
            const mutation = await command.mutate(db, authority, input.data);
            const result = command.output.parse(mutation.result);
            const safeResult = jsonValue.parse(result);
            const event = audit.parse(mutation.audit);
            const jobs = z.array(job).max(20).parse(mutation.jobs);
            await db.execute(
              sql`SELECT app.finish_operation(${JSON.stringify(safeResult)}::jsonb,${event.entityKind},${event.entityId}::uuid,${event.reason},${event.previousVersion},${event.nextVersion},${JSON.stringify(jobs)}::jsonb,${sql.param(event.changedFields)}::text[])`,
            );
            return { operationId: claimed.id, replayed: false, result };
          },
        );
        emit(dependencies.observe, {
          event: "command_finished",
          correlationId: request.data.correlationId,
          operationId: outcome.operationId,
          jobId: null,
          tenantId: scope.kind === "tenant" ? scope.tenantId : null,
          locationId: scope.kind === "tenant" ? scope.locationId : null,
          kind: command.kind,
          attempt: attempt + 1,
          elapsedMs: Math.round(performance.now() - started),
          outcome: outcome.replayed ? "replayed" : "committed",
          errorCategory: null,
        });
        return outcome;
      } catch (error) {
        const code = sqlState(error);
        emit(dependencies.observe, {
          event: "command_failed",
          correlationId: request.data.correlationId,
          operationId: null,
          jobId: null,
          tenantId:
            request.data.scope.kind === "tenant"
              ? request.data.scope.tenantId
              : null,
          locationId:
            request.data.scope.kind === "tenant"
              ? request.data.scope.locationId
              : null,
          kind: command.kind,
          attempt: attempt + 1,
          elapsedMs: Math.round(performance.now() - started),
          outcome:
            code === "40001" || code === "40P01" ? "conflict" : "rejected",
          errorCategory:
            error instanceof CommandError
              ? error.category
              : code === "42501"
                ? "access"
                : "database",
        });
        if ((code === "40001" || code === "40P01") && attempt < 2) continue;
        const domainError = command.mapError?.(error);
        if (domainError) throw domainError;
        if (error instanceof CommandError) throw error;
        if (
          code === "42501" ||
          (error instanceof Error && error.message === "Database scope denied")
        )
          throw new CommandError("access", "Command access denied");
        if (code === "P0002" || code === "P0003" || code === "23505")
          throw new CommandError(
            "conflict",
            "Operation input, version, or source conflict",
          );
        if (code?.startsWith("22") || code === "23514" || code === "23503")
          throw new CommandError("validation", "Command invariants rejected");
        // Avoid returning SQL strings, payloads, credentials, or driver details to callers.
        throw new CommandError("temporary", "Command could not complete");
      }
    }
    throw new CommandError("temporary", "Command retry limit reached");
  };
}
