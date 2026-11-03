import {
  type createPool,
  type TransactionDatabase,
  withScope,
} from "@fitloom/db";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { type BlobStore, blobKey, referenceForFile } from "./blob-store.js";
import {
  type Command,
  createCommandExecutor,
  type Identity,
} from "./commands.js";
import {
  photoCommandName,
  photoCommandResponse,
  photoInvocation,
  photoOwner,
  photoPayloads,
  photoResult,
  photoSlot,
  photoUploadResult,
} from "./customer-photo-contracts.js";
import { CustomerError, customerDatabaseError } from "./customers.js";
import type { Observe } from "./operations.js";
import {
  claimImageUpload,
  normalizePrivateImage,
  privateImageResponse,
} from "./private-image.js";
import { workspaceTarget } from "./workspace-contracts.js";

async function value<T extends z.ZodType>(
  db: TransactionDatabase,
  query: ReturnType<typeof sql>,
  schema: T,
): Promise<z.infer<T>> {
  const result = z
    .object({ rows: z.array(z.object({ value: z.unknown() })).length(1) })
    .parse(await db.execute(query));
  return schema.parse(result.rows[0]?.value);
}
const readMetadata = z.object({
  id: blobKey,
  size: z.int().positive().max(5242880),
  mediaType: z.enum(["image/png", "image/jpeg"]),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  version: z.int().nonnegative(),
  storageVersion: z.union([z.literal(1), z.literal(2)]),
});
function definition(
  name: z.infer<typeof photoCommandName>,
): Command<unknown, z.infer<typeof photoResult>> {
  return {
    kind: name,
    input: photoPayloads[name],
    output: photoResult,
    access: {
      kind: "tenant",
      permission: "customers.photos.manage",
      projection: "customer-photo",
    },
    mapError: customerDatabaseError,
    async authorize(db, _authority, input) {
      const p = photoPayloads[name].parse(input);
      await db.execute(
        sql`SELECT app.customer_photo_authorize(${JSON.stringify(p.owner)}::jsonb)`,
      );
    },
    async mutate(db, _authority, input) {
      let result: z.infer<typeof photoResult>;
      if (name === "customer-photo.begin") {
        const p = photoPayloads[name].parse(input);
        result = await value(
          db,
          sql`SELECT app.customer_photo_begin(${JSON.stringify(p.owner)}::jsonb) AS value`,
          photoResult,
        );
      } else if (name === "customer-photo.bind") {
        const p = photoPayloads[name].parse(input);
        result = await value(
          db,
          sql`SELECT app.customer_photo_bind(${JSON.stringify(p.owner)}::jsonb,${p.fileId}::uuid,${p.expectedVersion},${p.fileVersion},${p.note}) AS value`,
          photoResult,
        );
      } else {
        const p = photoPayloads[name].parse(input);
        result = await value(
          db,
          sql`SELECT app.customer_photo_remove(${JSON.stringify(p.owner)}::jsonb,${p.expectedVersion}) AS value`,
          photoResult,
        );
      }
      return {
        result,
        audit: {
          entityKind: "customer_photo",
          entityId:
            result.kind === "staged" ? result.fileId : result.customerId,
          reason: name,
          changedFields:
            result.kind === "staged" || result.changed ? ["photo"] : [],
          previousVersion:
            result.kind === "staged"
              ? null
              : result.changed
                ? result.version - 1
                : result.version,
          nextVersion: result.version,
        },
        jobs: [],
      };
    },
  };
}
const commands = {
  "customer-photo.begin": definition("customer-photo.begin"),
  "customer-photo.bind": definition("customer-photo.bind"),
  "customer-photo.remove": definition("customer-photo.remove"),
};
export function createCustomerPhotoService(options: {
  pool: ReturnType<typeof createPool>;
  resolveIdentity: () => Promise<Identity>;
  store: BlobStore;
  observe?: Observe;
}) {
  const execute = createCommandExecutor(options);
  async function scoped<T>(
    target: unknown,
    run: (db: TransactionDatabase) => Promise<T>,
  ) {
    const selected = workspaceTarget.safeParse(target);
    if (!selected.success)
      throw new CustomerError("validation", "Invalid workspace");
    const actor = await options.resolveIdentity();
    try {
      return await withScope(
        options.pool,
        { kind: "tenant", principalId: actor.principalId, ...selected.data },
        run,
      );
    } catch (error) {
      throw customerDatabaseError(error);
    }
  }
  return {
    async command(name: unknown, target: unknown, input: unknown) {
      const nameResult = photoCommandName.safeParse(name);
      if (!nameResult.success)
        throw new CustomerError("validation", "Invalid photo command");
      const selected = nameResult.data,
        p = photoInvocation(photoPayloads[selected]).safeParse(input),
        scopeResult = workspaceTarget.safeParse(target);
      if (!scopeResult.success)
        throw new CustomerError("validation", "Invalid workspace");
      const scope = scopeResult.data;
      if (!p.success)
        throw new CustomerError("validation", "Check photo details");
      try {
        const outcome = await execute(commands[selected], {
          ...p.data,
          scope: { kind: "tenant", ...scope },
        });
        return photoCommandResponse.parse({
          outcome: "saved",
          result: outcome.result,
          correlationId: p.data.correlationId,
        });
      } catch (error) {
        throw customerDatabaseError(error);
      }
    },
    async slot(target: unknown, input: unknown) {
      const owner = photoOwner.safeParse(input);
      if (!owner.success)
        throw new CustomerError("validation", "Invalid photo owner");
      return scoped(target, (db) =>
        value(
          db,
          sql`SELECT app.customer_photo_slot(${JSON.stringify(owner.data)}::jsonb) AS value`,
          photoSlot,
        ),
      );
    },
    async upload(target: unknown, id: unknown, request: Request) {
      const identity = blobKey.safeParse(id);
      if (!identity.success)
        throw new CustomerError("validation", "Invalid photo identifier");
      const release = claimImageUpload();
      try {
        await scoped(target, (db) =>
          value(
            db,
            sql`SELECT app.customer_photo_upload_target(${identity.data}::uuid) AS value`,
            z.unknown(),
          ),
        );
        const { bytes, mediaType, digest } =
          await normalizePrivateImage(request);
        await scoped(target, (db) =>
          value(
            db,
            sql`SELECT app.customer_photo_prepare(${identity.data}::uuid,${bytes.length},${mediaType},${digest}) AS value`,
            z.unknown(),
          ),
        );
        return await scoped(target, async (db) => {
          const stored = await value(
            db,
            sql`SELECT app.customer_photo_upload_target(${identity.data}::uuid) AS value`,
            z.object({
              id: blobKey,
              state: z.enum(["staged", "finalized"]),
              sha256: z.string(),
              storageVersion: z.union([z.literal(1), z.literal(2)]),
            }),
          );
          if (stored.sha256 !== digest)
            throw new CustomerError(
              "operation-conflict",
              "Upload content changed",
            );
          if (stored.state === "staged")
            await options.store.put(referenceForFile(stored), bytes, mediaType);
          return value(
            db,
            sql`SELECT app.customer_photo_finalize(${identity.data}::uuid,${bytes.length},${mediaType},${digest}) AS value`,
            photoUploadResult,
          );
        });
      } finally {
        release();
      }
    },
    async read(target: unknown, id: unknown): Promise<Response> {
      const identity = blobKey.safeParse(id);
      if (!identity.success)
        throw new CustomerError("validation", "Invalid photo identifier");
      const get = () =>
        scoped(target, (db) =>
          value(
            db,
            sql`SELECT app.customer_photo_read(${identity.data}::uuid) AS value`,
            readMetadata,
          ),
        );
      try {
        return await privateImageResponse(get, options.store, "inline");
      } catch (error) {
        throw customerDatabaseError(error);
      }
    },
  };
}
