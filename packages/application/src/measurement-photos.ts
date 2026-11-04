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
import { databaseValue as value } from "./database-value.js";
import { measurementInvocation } from "./measurement-contracts.js";
import * as c from "./measurement-photo-contracts.js";
import { MeasurementError, measurementDatabaseError } from "./measurements.js";
import type { Observe } from "./operations.js";
import {
  claimImageUpload,
  normalizePrivateImage,
  privateImageResponse,
} from "./private-image.js";
import { PRIVATE_IMAGE_MAX_BYTES } from "./private-image-limits.js";
import { workspaceTarget } from "./workspace-contracts.js";

function parse<T extends z.ZodType>(schema: T, raw: unknown): z.infer<T> {
  const result = schema.safeParse(raw);
  if (!result.success)
    throw new MeasurementError("validation", "Check measurement photo details");
  return result.data;
}
function definition(
  name: z.infer<typeof c.measurementPhotoCommandName>,
): Command<unknown, z.infer<typeof c.measurementPhotoResult>> {
  return {
    kind: name,
    input: c.measurementPhotoPayloads[name],
    output: c.measurementPhotoResult,
    access: {
      kind: "tenant",
      permission: "measurements.photos.manage",
      projection: "measurement-photo",
    },
    mapError: measurementDatabaseError,
    async authorize(db) {
      await db.execute(sql`SELECT app.measurement_photo_admit(true)`);
    },
    async mutate(db, _authority, raw) {
      const p = parse(c.measurementPhotoPayloads[name], raw);
      const result = await value(
        db,
        name === "measurement-photo.begin"
          ? sql`SELECT app.measurement_photo_begin(${JSON.stringify(p)}::jsonb) AS value`
          : sql`SELECT app.measurement_photo_revoke(${JSON.stringify(p)}::jsonb) AS value`,
        c.measurementPhotoResult,
      );
      return {
        result,
        audit: {
          entityKind: "measurement_photo",
          entityId: result.fileId,
          reason: name,
          changedFields:
            result.kind === "photo-staged"
              ? ["staging"]
              : result.changed
                ? ["revoked"]
                : [],
          previousVersion: null,
          nextVersion: null,
        },
        jobs: [],
      };
    },
  };
}
const commands = {
  "measurement-photo.begin": definition("measurement-photo.begin"),
  "measurement-photo.revoke": definition("measurement-photo.revoke"),
};
export function createMeasurementPhotoService(options: {
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
    const selected = parse(workspaceTarget, target);
    try {
      const identity = await options.resolveIdentity();
      return await withScope(
        options.pool,
        { kind: "tenant", principalId: identity.principalId, ...selected },
        run,
      );
    } catch (error) {
      throw measurementDatabaseError(error);
    }
  }
  return {
    async command(name: unknown, target: unknown, input: unknown) {
      const selected = parse(c.measurementPhotoCommandName, name),
        scope = parse(workspaceTarget, target),
        p = parse(
          measurementInvocation(c.measurementPhotoPayloads[selected]),
          input,
        );
      try {
        return c.measurementPhotoResponse.parse(
          await execute(commands[selected], {
            ...p,
            scope: { kind: "tenant", ...scope },
          }),
        );
      } catch (error) {
        throw measurementDatabaseError(error);
      }
    },
    async upload(target: unknown, id: unknown, request: Request) {
      const identity = parse(blobKey, id),
        release = claimImageUpload();
      try {
        await scoped(target, (db) =>
          value(
            db,
            sql`SELECT app.measurement_photo_upload_target(${identity}::uuid) AS value`,
            z.unknown(),
          ),
        );
        const { bytes, mediaType, digest } =
          await normalizePrivateImage(request);
        await scoped(target, (db) =>
          value(
            db,
            sql`SELECT app.measurement_photo_prepare(${identity}::uuid,${bytes.length},${mediaType},${digest}) AS value`,
            z.unknown(),
          ),
        );
        return await scoped(target, async (db) => {
          const stored = await value(
            db,
            sql`SELECT app.measurement_photo_upload_target(${identity}::uuid) AS value`,
            z.object({
              id: blobKey,
              state: z.enum(["staged", "finalized"]),
              sha256: z.string(),
              storageVersion: z.union([z.literal(1), z.literal(2)]),
            }),
          );
          if (stored.sha256 !== digest)
            throw new MeasurementError(
              "operation-conflict",
              "Photo content changed",
            );
          if (stored.state === "staged")
            await options.store.put(referenceForFile(stored), bytes, mediaType);
          return value(
            db,
            sql`SELECT app.measurement_photo_finalize(${identity}::uuid,${bytes.length},${mediaType},${digest}) AS value`,
            c.measurementPhotoUploadResult,
          );
        });
      } catch (error) {
        throw measurementDatabaseError(error);
      } finally {
        release();
      }
    },
    async read(target: unknown, input: unknown): Promise<Response> {
      const q = parse(c.measurementPhotoRead, input);
      const get = () =>
        scoped(target, (db) =>
          value(
            db,
            sql`SELECT app.measurement_photo_read(${q.customerId}::uuid,${q.wearerId}::uuid,${q.profileId}::uuid,${q.versionId}::uuid,${q.fileId}::uuid) AS value`,
            z.object({
              id: blobKey,
              size: z.int().positive().max(PRIVATE_IMAGE_MAX_BYTES),
              mediaType: z.enum(["image/png", "image/jpeg"]),
              sha256: z.string().regex(/^[a-f0-9]{64}$/),
              version: z.int().positive(),
              storageVersion: z.union([z.literal(1), z.literal(2)]),
            }),
          ),
        );
      try {
        return await privateImageResponse(get, options.store, "inline");
      } catch (error) {
        throw measurementDatabaseError(error);
      }
    },
  };
}
