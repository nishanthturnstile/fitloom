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
  requestHash,
} from "./commands.js";
import { customerId, wearerId } from "./customer-contracts.js";
import { databaseValue as value } from "./database-value.js";
import { CommandError, sqlState } from "./errors.js";
import * as c from "./import-contracts.js";
import {
  canonicalImportGroup,
  createImportManifest,
  ImportFileError,
  parseImportFile,
  type preparedImportHistory,
  prepareImportHistory,
} from "./import-formats.js";
import {
  measurementSchema,
  measurementSchemaRef,
} from "./measurement-contracts.js";
import type { Observe } from "./operations.js";
import { workspaceTarget } from "./workspace-contracts.js";

type Family = z.infer<typeof c.importFamily>;
type Target = z.infer<typeof workspaceTarget>;
export class ImportError extends CommandError {
  readonly correlationId = randomUUID();
  readonly code: z.infer<typeof c.importErrorCode>;
  constructor(code: z.infer<typeof c.importErrorCode>, message: string) {
    super(
      code === "validation" || code.startsWith("body-")
        ? "validation"
        : ["denied", "session-expired", "unavailable"].includes(code)
          ? "access"
          : ["needs-review", "expired", "busy"].includes(code)
            ? "conflict"
            : "temporary",
      message,
    );
    this.code = code;
  }
}
export function importDatabaseError(error: unknown): ImportError {
  if (error instanceof ImportError) return error;
  const code = sqlState(error);
  if (
    code === "42501" ||
    (error instanceof Error && error.message === "Database scope denied")
  )
    return new ImportError("denied", "Import access denied");
  if (code === "FI001" || code === "FC002" || code === "FM001")
    return new ImportError(
      "unavailable",
      "Import or selected owner is unavailable",
    );
  if (
    code === "FI002" ||
    code === "FM002" ||
    code === "FM003" ||
    code === "FC003" ||
    code === "23505" ||
    code === "P0002" ||
    code === "P0003"
  )
    return new ImportError(
      "needs-review",
      "This import changed. Review the group again",
    );
  if (code === "FI003" || code === "FC001" || code === "55P03")
    return new ImportError(
      "busy",
      "Import work is still active. Recover before retrying",
    );
  if (code === "FI004")
    return new ImportError(
      "rate-limit",
      "Import limit reached. Try again shortly",
    );
  if (code === "FI005")
    return new ImportError(
      "expired",
      "This preview expired or closed. Create a new dry-run",
    );
  if (error instanceof ImportFileError)
    return new ImportError("validation", error.message);
  if (
    code?.startsWith("22") ||
    code === "23514" ||
    code === "23503" ||
    code === "FM004" ||
    error instanceof z.ZodError
  )
    return new ImportError(
      "validation",
      "Check import columns, values and mappings",
    );
  if (error instanceof CommandError)
    return new ImportError(
      error.category === "access"
        ? "denied"
        : error.category === "validation"
          ? "validation"
          : error.category === "conflict"
            ? "needs-review"
            : "temporary",
      error.message,
    );
  return new ImportError(
    "temporary",
    "Import could not complete. Recover the exact attempt",
  );
}
function parse<T extends z.ZodType>(schema: T, value: unknown): z.infer<T> {
  const result = schema.safeParse(value);
  if (!result.success)
    throw new ImportError("validation", "Check import request");
  return result.data;
}
const storedRecord = z.object({
  id: c.importRecordId,
  payload: c.importGroup.nullable(),
  revision: z.int().positive(),
  bindings: z.array(c.importSchemaBinding),
  canonical_hash: c.importHash.nullable(),
});
const scheduled = z.strictObject({
  ...c.importCommit.shape,
  operationKey: c.importOperationKey,
  requestHash: c.importHash,
});
const attemptOutcome = z.strictObject({
  batchId: c.importBatchId,
  recordId: c.importRecordId,
  operationKey: c.importOperationKey,
  requestHash: c.importHash,
  outcome: z.enum(["failed", "needs-review"]),
});
const commands = z.enum([
  "customer-import.preview",
  "customer-import.decide",
  "customer-import.cancel",
  "measurement-import.preview",
  "measurement-import.decide",
  "measurement-import.cancel",
]);
const prefix = (family: Family) =>
  family === "customers" ? "customer-import" : "measurement-import";
const hashBindings = (bindings: z.infer<typeof c.importSchemaBinding>[]) =>
  [...bindings]
    .sort((a, b) =>
      a.schemaKey < b.schemaKey ? -1 : a.schemaKey > b.schemaKey ? 1 : 0,
    )
    .map((b) => ({
      ...b,
      mappings: [...b.mappings]
        .sort((a, b) =>
          a.sourceKey < b.sourceKey ? -1 : a.sourceKey > b.sourceKey ? 1 : 0,
        )
        .map((m) =>
          m.kind === "field"
            ? {
                ...m,
                choiceMappings: [...m.choiceMappings].sort((a, b) =>
                  a.sourceKey < b.sourceKey
                    ? -1
                    : a.sourceKey > b.sourceKey
                      ? 1
                      : 0,
                ),
              }
            : m,
        ),
    }));
export function createDomainImportService(options: {
  pool: ReturnType<typeof createPool>;
  resolveIdentity: () => Promise<Identity>;
  observe?: Observe;
}) {
  const execute = createCommandExecutor(options);
  async function read<T>(
    target: unknown,
    run: (db: TransactionDatabase) => Promise<T>,
  ) {
    const scope = parse(workspaceTarget, target);
    try {
      const actor = await options.resolveIdentity();
      return await withScope(
        options.pool,
        { kind: "tenant", ...scope, principalId: actor.principalId },
        run,
      );
    } catch (error) {
      throw importDatabaseError(error);
    }
  }
  async function schema(
    db: TransactionDatabase,
    key: string,
    ref: unknown,
    current: boolean,
  ) {
    const selected = parse(measurementSchemaRef, ref);
    return createImportManifest(
      key,
      selected,
      await value(
        db,
        sql`SELECT app.domain_import_schema(${JSON.stringify(selected)}::jsonb,${current}) AS value`,
        measurementSchema,
      ),
    );
  }
  function definition(
    family: Family,
    action: "preview" | "decide" | "commit-row" | "attempt-outcome" | "cancel",
    target: Target,
    previewToken: string | null = null,
  ): Command<unknown, z.infer<typeof c.importResult>> {
    const name = `${prefix(family)}.${action}`;
    const input =
      action === "preview"
        ? c.importPreviewRequest
        : action === "decide"
          ? c.importReview
          : action === "commit-row"
            ? c.importCommit
            : action === "cancel"
              ? c.importBatchRequest
              : attemptOutcome;
    return {
      kind: name,
      input,
      output: c.importResult,
      access: {
        kind: "tenant",
        permission:
          family === "customers" ? "customers.import" : "measurements.import",
        projection: "domain-import",
      },
      mapError: importDatabaseError,
      authorize: async (db, _authority, p) => {
        await db.execute(
          sql`SELECT app.domain_import_authorize(${name},${JSON.stringify(p)}::jsonb)`,
        );
      },
      mutate: async (db, _authority, p) => {
        let extra: unknown = {};
        if (action === "preview") {
          const request = parse(c.importPreviewRequest, p);
          if (!previewToken)
            throw new ImportError(
              "temporary",
              "Preview admission is unavailable",
            );
          const token = previewToken;
          const bytes = new TextEncoder().encode(request.csv);
          if (bytes.length > c.IMPORT_FILE_BYTES)
            throw new ImportError("body-too-large", "CSV exceeds 1 MiB");
          if (/\p{Cs}/u.test(request.csv))
            throw new ImportError(
              "validation",
              "CSV must contain valid UTF-8 text",
            );
          const parsed = parseImportFile(bytes, family);
          extra = {
            token,
            parsed,
            digest: requestHash(request.csv),
            hashes: parsed.groups.map((g) =>
              g.payload ? requestHash(canonicalImportGroup(g.payload)) : null,
            ),
          };
        } else if (action === "decide") {
          const request = parse(c.importReview, p),
            record = await value(
              db,
              sql`SELECT app.domain_import_record_read(${family},${request.batchId}::uuid,${request.recordId}::uuid) AS value`,
              storedRecord,
            );
          if (request.decision.kind !== "skip") {
            if (!record.payload)
              throw new ImportError(
                "needs-review",
                "Correct invalid CSV groups in a new dry-run",
              );
            const bindings = request.bindings.length
              ? request.bindings
              : record.bindings;
            let prepared: z.infer<typeof preparedImportHistory> | null = null;
            if (record.payload.family === "measurements") {
              const verified = [];
              for (const binding of bindings) {
                verified.push({
                  binding,
                  source: await schema(
                    db,
                    binding.schemaKey,
                    binding.sourceRef,
                    false,
                  ),
                  target: await schema(
                    db,
                    binding.schemaKey,
                    binding.targetRef,
                    true,
                  ),
                });
              }
              try {
                prepared = prepareImportHistory(record.payload, verified);
              } catch (error) {
                throw new ImportError(
                  "needs-review",
                  error instanceof ImportFileError
                    ? error.message
                    : "Check values against the reviewed manifest",
                );
              }
            }
            const operationKey = randomUUID(),
              payload = {
                batchId: request.batchId,
                recordId: request.recordId,
                expectedRevision: request.expectedRevision + 1,
              };
            extra = {
              prepared,
              operationKey,
              requestHash: requestHash({
                scope: { kind: "tenant", ...target },
                payload,
              }),
              intentHash: requestHash({
                group: canonicalImportGroup(record.payload),
                decision: request.decision,
                bindings: hashBindings(bindings),
              }),
            };
            p = { ...request, bindings };
          }
        }
        const result = await value(
          db,
          sql`SELECT app.domain_import_mutate(${name},${JSON.stringify(action === "preview" ? { namespace: parse(c.importPreviewRequest, p).namespace, bindings: parse(c.importPreviewRequest, p).bindings } : p)}::jsonb,${JSON.stringify(extra)}::jsonb) AS value`,
          c.importResult,
        );
        return {
          result,
          audit: {
            entityKind: "domain_import",
            entityId: result.recordId ?? result.batchId,
            reason: name,
            changedFields: [action === "commit-row" ? "outcome" : "status"],
            previousVersion:
              action === "commit-row" || action === "attempt-outcome"
                ? result.revision
                : Math.max(0, result.revision - 1),
            nextVersion: result.revision,
          },
          jobs: [],
        };
      },
    };
  }
  const service = {
    batches(family: unknown, target: unknown, offset: unknown = 0) {
      const f = parse(c.importFamily, family),
        off = parse(z.int().min(0).max(100000), offset);
      return read(target, (db) =>
        value(
          db,
          sql`SELECT app.domain_import_batches_page(${f},${off}) AS value`,
          c.importBatchList,
        ),
      );
    },
    access(family: unknown, target: unknown) {
      const f = parse(c.importFamily, family);
      return read(target, async (db) => {
        await db.execute(
          sql`SELECT app.domain_import_authorize(${`${prefix(f)}.preview`},'{}'::jsonb)`,
        );
      });
    },
    async command(name: unknown, target: unknown, raw: unknown) {
      const selected = parse(commands, name),
        scope = parse(workspaceTarget, target),
        family: Family = selected.startsWith("customer-import.")
          ? "customers"
          : "measurements",
        action = selected.endsWith(".preview")
          ? "preview"
          : selected.endsWith(".decide")
            ? "decide"
            : "cancel",
        schema =
          action === "preview"
            ? c.importPreviewRequest
            : action === "decide"
              ? c.importReview
              : c.importBatchRequest;
      const invocation = parse(c.importCommandEnvelope(schema), raw);
      let token: string | null = null;
      try {
        if (action === "preview") {
          const hash = requestHash({
            scope: { kind: "tenant", ...scope },
            payload: invocation.payload,
          });
          const admission = await read(scope, (db) =>
            value(
              db,
              sql`SELECT app.domain_import_preview_admit(${family},${selected},${invocation.operationKey}::uuid,${hash}) AS value`,
              z.discriminatedUnion("kind", [
                z.strictObject({ kind: z.literal("replayed") }),
                z.strictObject({
                  kind: z.literal("admitted"),
                  token: z.uuid(),
                }),
              ]),
            ),
          );
          if (admission.kind === "admitted") token = admission.token;
        }
        return c.importResponse.parse(
          await execute(definition(family, action, scope, token), {
            ...invocation,
            scope: { kind: "tenant", ...scope },
          }),
        );
      } catch (error) {
        throw importDatabaseError(error);
      } finally {
        if (token)
          await read(scope, async (db) => {
            await db.execute(
              sql`SELECT app.domain_import_preview_end(${family},${token}::uuid)`,
            );
          }).catch(() => {});
      }
    },
    outcomes(family: unknown, target: unknown, batchId: unknown) {
      const f = parse(c.importFamily, family),
        id = parse(c.importBatchId, batchId);
      return read(target, (db) =>
        value(
          db,
          sql`SELECT app.domain_import_outcomes(${f},${id}::uuid) AS value`,
          c.importOutcomes,
        ),
      );
    },
    status(
      family: unknown,
      target: unknown,
      batchId: unknown,
      offset: unknown = 0,
    ) {
      const f = parse(c.importFamily, family),
        id = parse(c.importBatchId, batchId),
        off = parse(z.int().min(0).max(100000), offset);
      return read(target, (db) =>
        value(
          db,
          sql`SELECT app.domain_import_status(${f},${id}::uuid,${off}) AS value`,
          c.importBatch,
        ),
      );
    },
    recover(target: unknown, raw: unknown) {
      const p = parse(c.importRecovery, raw);
      return read(target, (db) =>
        value(
          db,
          sql`SELECT app.domain_import_recover(${p.family},${p.batchId}::uuid,${p.logicalRecordId}::uuid,${p.operationKey}::uuid,${p.requestHash}) AS value`,
          c.importRecovered,
        ),
      );
    },
    manifest(target: unknown, raw: unknown) {
      const p = parse(
        z.strictObject({
          schemaKey: c.importSourceId,
          schemaRef: measurementSchemaRef,
        }),
        raw,
      );
      return read(target, (db) => schema(db, p.schemaKey, p.schemaRef, false));
    },
    schemas(target: unknown, raw: unknown = {}) {
      const q = parse(
        z.strictObject({
          search: z.string().max(160).default(""),
          offset: z.int().min(0).max(100000).default(0),
        }),
        raw,
      );
      return read(target, (db) =>
        value(
          db,
          sql`SELECT app.domain_import_schema_choices(${JSON.stringify(q)}::jsonb) AS value`,
          z.strictObject({
            body: measurementSchemaRef,
            garments: z
              .array(
                z.strictObject({
                  id: z.uuid(),
                  versionId: z.uuid(),
                  label: z.string(),
                }),
              )
              .max(25),
          }),
        ),
      );
    },
    ownerMapping(target: unknown, raw: unknown) {
      const p = parse(
        z.strictObject({
          namespace: c.importSourceId,
          sourceCustomerId: c.importSourceId,
          sourceWearerId: c.importSourceId,
        }),
        raw,
      );
      return read(target, (db) =>
        value(
          db,
          sql`SELECT app.domain_import_owner_mapping(${p.namespace},${p.sourceCustomerId},${p.sourceWearerId}) AS value`,
          z.strictObject({ customerId, wearerId }).nullable(),
        ),
      );
    },
    async chunk(family: unknown, target: unknown, batchId: unknown) {
      const f = parse(c.importFamily, family),
        scope = parse(workspaceTarget, target),
        id = parse(c.importBatchId, batchId),
        deadlineAt = Date.now() + c.IMPORT_CHUNK_DEADLINE_MS;
      let page = await service.status(f, scope, id),
        ready = false,
        active = false;
      for (;;) {
        for (const record of page.items) {
          if (record.state === "pending" && record.requestHash) ready = true;
          if (record.state === "in-progress" && record.requestHash) {
            const recovered = await service.recover(scope, {
              family: f,
              batchId: id,
              logicalRecordId: record.id,
              operationKey: record.operationKey,
              requestHash: record.requestHash,
            });
            if (recovered.kind === "in-progress") active = true;
            else if (recovered.kind === "unknown")
              await settle(f, scope, {
                batchId: id,
                recordId: record.id,
                operationKey: record.operationKey,
                requestHash: record.requestHash,
                outcome: "failed",
              });
          }
        }
        if (page.nextOffset === null) break;
        page = await service.status(f, scope, id, page.nextOffset);
      }
      if (
        active ||
        !ready ||
        Date.now() + c.IMPORT_ATTEMPT_RESERVE_MS > deadlineAt
      )
        return service.status(f, scope, id);
      const token = await read(scope, (db) =>
        value(
          db,
          sql`SELECT app.domain_import_chunk_begin(${f},${id}::uuid) AS value`,
          z.uuid(),
        ),
      );
      try {
        for (
          let count = 0;
          count < 20 && Date.now() + c.IMPORT_ATTEMPT_RESERVE_MS <= deadlineAt;
          count++
        ) {
          const task = await read(scope, (db) =>
            value(
              db,
              sql`SELECT app.domain_import_schedule(${f},${id}::uuid,${token}::uuid) AS value`,
              scheduled.nullable(),
            ),
          );
          if (!task) break;
          const { operationKey, requestHash: hash, ...payload } = task;
          try {
            await execute(
              definition(f, "commit-row", scope),
              {
                scope: { kind: "tenant", ...scope },
                payload,
                operationKey,
                correlationId: operationKey,
              },
              {
                maxAttempts: 1,
                deadlineAt,
                minRemainingMs: c.IMPORT_ATTEMPT_RESERVE_MS,
              },
            );
          } catch (error) {
            const mapped = importDatabaseError(error);
            const recovery = await service.recover(scope, {
              family: f,
              batchId: id,
              logicalRecordId: task.recordId,
              operationKey,
              requestHash: hash,
            });
            if (recovery.kind !== "committed")
              await settle(f, scope, {
                batchId: id,
                recordId: task.recordId,
                operationKey,
                requestHash: hash,
                outcome: [
                  "needs-review",
                  "validation",
                  "unavailable",
                  "expired",
                ].includes(mapped.code)
                  ? "needs-review"
                  : "failed",
              }).catch(() => {});
          }
        }
      } finally {
        await read(scope, async (db) => {
          await db.execute(
            sql`SELECT app.domain_import_chunk_end(${f},${id}::uuid,${token}::uuid)`,
          );
        }).catch(() => {});
      }
      return service.status(f, scope, id);
    },
  };
  async function settle(
    f: Family,
    target: Target,
    p: z.infer<typeof attemptOutcome>,
  ) {
    await execute(definition(f, "attempt-outcome", target), {
      scope: { kind: "tenant", ...target },
      payload: p,
      operationKey: randomUUID(),
      correlationId: randomUUID(),
    });
  }
  return service;
}
