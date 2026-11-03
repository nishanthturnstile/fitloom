import {
  type createPool,
  type TransactionDatabase,
  withScope,
} from "@fitloom/db";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { type BlobStore, blobKey, referenceForFile } from "./blob-store.js";
import { BodyReadError } from "./body.js";
import {
  type Command,
  createCommandExecutor,
  type Identity,
  uuid,
} from "./commands.js";
import { CommandError, sqlState } from "./errors.js";
import type { Observe } from "./operations.js";
import {
  claimImageUpload,
  normalizePrivateImage,
  privateImageResponse,
} from "./private-image.js";
import {
  pageOffset,
  privateFileList,
  privateFilePage,
  workspaceTarget,
} from "./workspace-contracts.js";

const fileResult = z.strictObject({ id: uuid, version: z.int().nonnegative() });
const metadata = z.strictObject({
  id: blobKey,
  size: z
    .int()
    .positive()
    .max(5 * 1024 * 1024),
  mediaType: z.enum(["image/png", "image/jpeg"]),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  version: z.int().nonnegative(),
  storageVersion: z.union([z.literal(1), z.literal(2)]),
});
async function value<T>(
  db: TransactionDatabase,
  query: ReturnType<typeof sql>,
  schema: z.ZodType<T>,
) {
  const result = z
    .object({ rows: z.array(z.object({ value: schema })).length(1) })
    .parse(await db.execute(query));
  const first = result.rows[0];
  if (!first) throw new Error("Missing file result");
  return first.value;
}
export const beginFile: Command<
  Record<string, never>,
  z.infer<typeof fileResult>
> = {
  kind: "file.begin",
  access: {
    kind: "tenant",
    permission: "files.manage",
    projection: "private-file",
  },
  input: z.strictObject({}),
  output: fileResult,
  async mutate(db) {
    const id = await value(db, sql`SELECT app.file_begin() AS value`, uuid);
    return {
      result: { id, version: 0 },
      audit: {
        entityKind: "file",
        entityId: id,
        reason: "Stage private workspace file",
        changedFields: ["state"],
        previousVersion: null,
        nextVersion: 0,
      },
      jobs: [],
    };
  },
};
function fileCommand(
  retire: boolean,
): Command<
  { fileId: string; expectedVersion: number },
  z.infer<typeof fileResult>
> {
  return {
    kind: retire ? "file.retire" : "file.attach",
    access: {
      kind: "tenant",
      permission: "files.manage",
      projection: "private-file",
    },
    input: z.strictObject({
      fileId: uuid,
      expectedVersion: z.int().nonnegative(),
    }),
    output: fileResult,
    async mutate(db, _authority, p) {
      const result = await value(
        db,
        sql`SELECT app.file_change(${p.fileId}::uuid,${p.expectedVersion},${retire}) AS value`,
        fileResult,
      );
      return {
        result,
        audit: {
          entityKind: "file",
          entityId: p.fileId,
          reason: retire
            ? "Retire private file attachment"
            : "Attach private workspace file",
          changedFields: ["state", "attachment"],
          previousVersion: p.expectedVersion,
          nextVersion: result.version,
        },
        jobs: [],
      };
    },
  };
}
export const attachFile = fileCommand(false);
export const retireFile = fileCommand(true);
function fileError(error: unknown): never {
  if (error instanceof CommandError) throw error;
  if (error instanceof BodyReadError)
    throw new CommandError("validation", error.message);
  const state = sqlState(error);
  if (
    state === "42501" ||
    (error instanceof Error && error.message === "Database scope denied")
  )
    throw new CommandError("access", "File access denied");
  if (state === "P0003")
    throw new CommandError("conflict", "File state changed");
  if (state?.startsWith("22"))
    throw new CommandError("validation", "Invalid file");
  throw new CommandError("temporary", "File storage unavailable");
}
export function createFileService(options: {
  pool: ReturnType<typeof createPool>;
  resolveIdentity: () => Promise<Identity>;
  store: BlobStore;
  observe?: Observe;
}) {
  async function scoped<T>(
    target: unknown,
    run: (db: TransactionDatabase) => Promise<T>,
  ) {
    const selected = workspaceTarget.safeParse(target);
    if (!selected.success)
      throw new CommandError("validation", "Invalid workspace");
    const actor = await options.resolveIdentity();
    return withScope(
      options.pool,
      { kind: "tenant", principalId: actor.principalId, ...selected.data },
      run,
    ).catch(fileError);
  }
  return {
    execute: createCommandExecutor(options),
    page(target: unknown, offset: unknown = 0) {
      const parsed = pageOffset.safeParse(offset);
      if (!parsed.success)
        throw new CommandError("validation", "Invalid page offset");
      return scoped(target, (db) =>
        value(
          db,
          sql`SELECT app.file_list_page(${parsed.data}) AS value`,
          privateFilePage,
        ),
      );
    },
    list(target: unknown) {
      return scoped(target, (db) =>
        value(db, sql`SELECT app.file_list() AS value`, privateFileList),
      );
    },
    async upload(target: unknown, id: unknown, request: Request) {
      const release = claimImageUpload();
      try {
        const parsedId = blobKey.safeParse(id);
        if (!parsedId.success)
          throw new CommandError("validation", "Invalid file identifier");
        // Check current authority before reading or decoding untrusted bytes, then again under the file lock.
        await scoped(target, (db) =>
          value(
            db,
            sql`SELECT app.file_upload_target(${parsedId.data}::uuid) AS value`,
            z.unknown(),
          ),
        );
        const { bytes, mediaType, digest } =
          await normalizePrivateImage(request);
        // Bind the validated content durably before any external write. A retry cannot choose different bytes.
        await scoped(target, (db) =>
          value(
            db,
            sql`SELECT app.file_prepare(${parsedId.data}::uuid,${bytes.length},${mediaType},${digest}) AS value`,
            z.unknown(),
          ),
        );
        return await scoped(target, async (db) => {
          const stored = await value(
            db,
            sql`SELECT app.file_upload_target(${parsedId.data}::uuid) AS value`,
            z.object({
              id: blobKey,
              state: z.enum(["staged", "finalized"]),
              sha256: z.string(),
              storageVersion: z.union([z.literal(1), z.literal(2)]),
            }),
          );
          if (stored.state === "finalized" && stored.sha256 !== digest)
            throw new CommandError("conflict", "Upload content changed");
          if (stored.state === "staged")
            await options.store.put(referenceForFile(stored), bytes, mediaType);
          return value(
            db,
            sql`SELECT app.file_finalize(${stored.id}::uuid,${bytes.length},${mediaType},${digest}) AS value`,
            fileResult,
          );
        });
      } finally {
        release();
      }
    },
    async download(target: unknown, id: unknown): Promise<Response> {
      const selected = blobKey.safeParse(id);
      if (!selected.success)
        throw new CommandError("validation", "Invalid file identifier");
      const get = () =>
        scoped(target, (db) =>
          value(
            db,
            sql`SELECT app.file_read(${selected.data}::uuid) AS value`,
            metadata,
          ),
        );
      try {
        return await privateImageResponse(get, options.store, "attachment");
      } catch (error) {
        return fileError(error);
      }
    },
  };
}
