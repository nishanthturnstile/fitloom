import { lstat, mkdir, unlink } from "node:fs/promises";
import { resolve } from "node:path";
import { type createPool, withDatabaseTransaction } from "@fitloom/db";
import { sql } from "drizzle-orm";
import { z } from "zod";
import {
  type BlobReference,
  type BlobStore,
  blobKey,
  referenceForFile,
} from "./blob-store.js";
import { type Command, uuid } from "./commands.js";
import { emit, type Observe } from "./operations.js";

const claimed = z.object({
  id: uuid,
  kind: z.string(),
  input_version: z.int(),
  token: uuid,
  authority: z.enum(["actor", "service"]),
  attempts: z.int().positive(),
  correlation_id: uuid,
  tenant_id: uuid.nullable(),
  location_id: uuid.nullable(),
});
export async function processFoundationWork(options: {
  pool: ReturnType<typeof createPool>;
  stagingRoot: string;
  allowFixtures: boolean;
  store?: BlobStore;
  observe?: Observe;
}) {
  await options.pool.query("SELECT app.foundation_dispatch()");
  const rows = z
    .array(claimed)
    .parse(
      (await options.pool.query("SELECT * FROM app.foundation_take()")).rows,
    );
  const job = rows[0];
  if (!job) return false;
  const started = performance.now();
  let errorCategory: string | null = null;
  try {
    if (job.input_version !== 1) {
      errorCategory = "invalid_input";
      await options.pool.query(
        "SELECT app.foundation_finish($1,$2,'failed','invalid_input')",
        [job.id, job.token],
      );
    } else if (job.kind === "files.cleanup" && job.authority !== "service") {
      errorCategory = "access";
      await options.pool.query(
        "SELECT app.foundation_finish($1,$2,'cancelled',NULL)",
        [job.id, job.token],
      );
    } else if (job.kind === "files.cleanup") {
      await mkdir(options.stagingRoot, { recursive: true });
      if ((await lstat(options.stagingRoot)).isSymbolicLink())
        throw new Error("Unsafe staging root");
      await withDatabaseTransaction(options.pool, async (db) => {
        if (options.store) {
          const objects = z
            .object({
              rows: z
                .array(
                  z.object({
                    value: z.array(
                      z.object({
                        id: blobKey,
                        storageVersion: z.union([z.literal(1), z.literal(2)]),
                        sha256: z.string().nullable(),
                      }),
                    ),
                  }),
                )
                .length(1),
            })
            .parse(
              await db.execute(
                sql`SELECT app.file_cleanup_objects(${job.id}::uuid,${job.token}::uuid) AS value`,
              ),
            );
          const files = objects.rows[0]?.value ?? [];
          const ids = files.map((file) => file.id);
          const refs: BlobReference[] = files.flatMap((file) => {
            const legacy: BlobReference = { layout: "legacy", id: file.id };
            return file.storageVersion === 2 && file.sha256 !== null
              ? [legacy, referenceForFile({ ...file, sha256: file.sha256 })]
              : [legacy];
          });
          await options.store.remove(refs);
          await db.execute(
            sql`SELECT app.file_cleanup_done(${job.id}::uuid,${job.token}::uuid,${sql.param(ids)}::uuid[])`,
          );
        }
        const candidates = z
          .object({ rows: z.array(z.object({ id: uuid })) })
          .parse(
            await db.execute(
              sql`SELECT app.foundation_cleanup_candidates(${job.id}::uuid,${job.token}::uuid) AS id`,
            ),
          );
        for (const candidate of candidates.rows) {
          const path = resolve(options.stagingRoot, `${candidate.id}.stage`);
          try {
            const entry = await lstat(path);
            if (!entry.isFile() || entry.isSymbolicLink())
              throw new Error("Unsafe staged file");
            await unlink(path);
          } catch (error) {
            if (
              !(
                error instanceof Error &&
                "code" in error &&
                error.code === "ENOENT"
              )
            )
              throw error;
          }
          await db.execute(
            sql`SELECT app.foundation_cleanup_done(${job.id}::uuid,${job.token}::uuid,${candidate.id}::uuid)`,
          );
        }
        await db.execute(
          sql`SELECT app.foundation_finish(${job.id}::uuid,${job.token}::uuid,'succeeded',NULL)`,
        );
      });
    } else if (
      options.allowFixtures &&
      ["provider.fixture.v1", "fixture.sensitive.v1"].includes(job.kind)
    ) {
      await options.pool.query("SELECT app.foundation_apply($1,$2)", [
        job.id,
        job.token,
      ]);
    } else {
      errorCategory = "unsupported_kind";
      await options.pool.query(
        "SELECT app.foundation_finish($1,$2,'failed','unsupported_kind')",
        [job.id, job.token],
      );
    }
  } catch {
    errorCategory = "handler_failed";
    await options.pool.query(
      "SELECT app.foundation_finish($1,$2,'failed','handler_failed')",
      [job.id, job.token],
    );
  }
  emit(options.observe, {
    event: "job_finished",
    correlationId: job.correlation_id,
    jobId: job.id,
    operationId: null,
    tenantId: job.tenant_id,
    locationId: job.location_id,
    kind: job.kind,
    attempt: job.attempts,
    elapsedMs: Math.round(performance.now() - started),
    outcome: "attempt_settled",
    errorCategory,
  });
  return true;
}
const jobInput = z.strictObject({ jobId: uuid });
const jobOutput = z.strictObject({ jobId: uuid });
function change(
  retry: boolean,
): Command<z.infer<typeof jobInput>, z.infer<typeof jobOutput>> {
  return {
    kind: retry ? "job.retry" : "job.cancel",
    access: {
      kind: "tenant",
      permission: "access.manage",
      projection: "job-status",
    },
    input: jobInput,
    output: jobOutput,
    async mutate(db, _authority, payload) {
      await db.execute(
        sql`SELECT app.foundation_job_change(${payload.jobId}::uuid,${retry})`,
      );
      return {
        result: payload,
        audit: {
          entityKind: "job",
          entityId: payload.jobId,
          changedFields: ["status"],
          reason: retry ? "Retry failed job" : "Cancel delayed work",
          previousVersion: null,
          nextVersion: null,
        },
        jobs: [],
      };
    },
  };
}
export const retryJob = change(true);
export const cancelJob = change(false);
