import { createHash } from "node:crypto";
import {
  CreateBucketCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { z } from "zod";

export const blobKey = z.uuid().brand<"BlobKey">();
export type BlobKey = z.infer<typeof blobKey>;
export const blobDigest = z
  .string()
  .regex(/^[a-f0-9]{64}$/)
  .brand<"BlobDigest">();
export const blobReference = z.discriminatedUnion("layout", [
  z.strictObject({ layout: z.literal("legacy"), id: blobKey }),
  z.strictObject({
    layout: z.literal("sha256"),
    id: blobKey,
    digest: blobDigest,
  }),
]);
export type BlobReference = z.infer<typeof blobReference>;
export function referenceForFile(file: {
  id: BlobKey;
  storageVersion: 1 | 2;
  sha256: string;
}): BlobReference {
  return file.storageVersion === 1
    ? { layout: "legacy", id: file.id }
    : { layout: "sha256", id: file.id, digest: blobDigest.parse(file.sha256) };
}
export interface BlobStore {
  put(
    reference: BlobReference,
    bytes: Uint8Array,
    mediaType: string,
  ): Promise<void>;
  open(
    reference: BlobReference,
    size: number,
  ): Promise<ReadableStream<Uint8Array>>;
  remove(references: BlobReference[]): Promise<void>;
  probe(): Promise<void>;
}
const storageConfig = z.strictObject({
  endpoint: z.url(),
  bucket: z.string().regex(/^[a-z0-9][a-z0-9-]{2,62}$/),
  accessKey: z.string().min(16),
  secretKey: z.string().min(32),
});
export function blobStoreEnvironment(env: NodeJS.ProcessEnv) {
  return storageConfig.parse({
    endpoint: env.STORAGE_ENDPOINT,
    bucket: env.STORAGE_BUCKET,
    accessKey: env.STORAGE_ACCESS_KEY,
    secretKey: env.STORAGE_SECRET_KEY,
  });
}
export function createBlobStore(
  input: z.infer<typeof storageConfig>,
): BlobStore {
  const config = storageConfig.parse(input);
  const endpoint = new URL(config.endpoint);
  if (
    !["http:", "https:"].includes(endpoint.protocol) ||
    endpoint.username ||
    endpoint.password ||
    endpoint.search ||
    endpoint.pathname !== "/"
  )
    throw new Error("Invalid storage endpoint");
  const client = new S3Client({
    endpoint: endpoint.href,
    region: "us-east-1",
    forcePathStyle: true,
    credentials: {
      accessKeyId: config.accessKey,
      secretAccessKey: config.secretKey,
    },
    maxAttempts: 2,
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
  const key = (value: BlobReference) => {
    const ref = blobReference.parse(value);
    return ref.layout === "legacy"
      ? `objects/${ref.id}`
      : `objects/v2/${ref.id}/${ref.digest}`;
  };
  return {
    async put(id, bytes, mediaType) {
      if (
        id.layout !== "sha256" ||
        createHash("sha256").update(bytes).digest("hex") !== id.digest
      )
        throw new Error("Immutable content reference required");
      await client.send(
        new PutObjectCommand({
          Bucket: config.bucket,
          Key: key(id),
          Body: bytes,
          ContentLength: bytes.byteLength,
          ContentType: mediaType,
        }),
        { abortSignal: AbortSignal.timeout(6000) },
      );
    },
    async open(id, size) {
      const abort = new AbortController();
      let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
      let exposed: ReadableStreamDefaultController<Uint8Array> | undefined;
      let ended = false;
      const fail = () => {
        if (ended) return;
        ended = true;
        clearTimeout(timer);
        abort.abort();
        exposed?.error(new Error("File stream unavailable"));
        void reader?.cancel().catch(() => {});
      };
      const timer = setTimeout(fail, 15000);
      try {
        const result = await client.send(
          new GetObjectCommand({ Bucket: config.bucket, Key: key(id) }),
          { abortSignal: abort.signal },
        );
        if (
          ended ||
          !result.Body ||
          result.ContentLength !== size ||
          size > 5 * 1024 * 1024 ||
          size < 1
        )
          throw new Error("Stored file mismatch");
        reader = result.Body.transformToWebStream().getReader();
        const upstream = reader;
        let received = 0;
        return new ReadableStream<Uint8Array>({
          start(controller) {
            exposed = controller;
          },
          async pull(controller) {
            if (ended) return;
            try {
              const chunk = await upstream.read();
              if (ended) return;
              if (chunk.done) {
                if (received !== size) throw new Error("Incomplete file");
                ended = true;
                clearTimeout(timer);
                controller.close();
                return;
              }
              received += chunk.value.byteLength;
              if (received > size) throw new Error("File too large");
              controller.enqueue(chunk.value);
            } catch {
              fail();
            }
          },
          cancel() {
            if (ended) return;
            ended = true;
            clearTimeout(timer);
            abort.abort();
            void upstream.cancel().catch(() => {});
          },
        });
      } catch (error) {
        fail();
        throw error;
      }
    },
    async probe() {
      await client.send(new HeadBucketCommand({ Bucket: config.bucket }), {
        abortSignal: AbortSignal.timeout(3000),
      });
    },
    async remove(ids) {
      if (ids.length > 100) throw new Error("Cleanup batch too large");
      if (!ids.length) return;
      const result = await client.send(
        new DeleteObjectsCommand({
          Bucket: config.bucket,
          Delete: { Objects: ids.map((id) => ({ Key: key(id) })), Quiet: true },
        }),
        { abortSignal: AbortSignal.timeout(6000) },
      );
      if (result.Errors?.length) throw new Error("Storage cleanup unavailable");
    },
  };
}
// Migration/bootstrap credentials are consumed only by the one-shot storage initializer.
export async function initializeBlobBuckets(config: {
  endpoint: string;
  accessKey: string;
  secretKey: string;
  buckets: string[];
}) {
  const client = new S3Client({
    endpoint: config.endpoint,
    region: "us-east-1",
    forcePathStyle: true,
    credentials: {
      accessKeyId: config.accessKey,
      secretAccessKey: config.secretKey,
    },
    maxAttempts: 1,
    requestChecksumCalculation: "WHEN_REQUIRED",
  });
  try {
    for (const bucket of config.buckets) {
      try {
        await client.send(new HeadBucketCommand({ Bucket: bucket }), {
          abortSignal: AbortSignal.timeout(3000),
        });
      } catch (error) {
        if (
          !(
            typeof error === "object" &&
            error !== null &&
            "$metadata" in error &&
            typeof error.$metadata === "object" &&
            error.$metadata !== null &&
            "httpStatusCode" in error.$metadata &&
            error.$metadata.httpStatusCode === 404
          )
        )
          throw error;
        await client.send(new CreateBucketCommand({ Bucket: bucket }), {
          abortSignal: AbortSignal.timeout(3000),
        });
      }
      const probe = Buffer.from("Fitloom private storage readiness");
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: "checks/readiness",
          Body: probe,
          ContentLength: probe.length,
        }),
        { abortSignal: AbortSignal.timeout(6000) },
      );
      const read = await client.send(
        new GetObjectCommand({ Bucket: bucket, Key: "checks/readiness" }),
        { abortSignal: AbortSignal.timeout(3000) },
      );
      if (
        !read.Body ||
        Buffer.from(await read.Body.transformToByteArray()).compare(probe) !== 0
      )
        throw new Error("Storage readiness mismatch");
      const deleted = await client.send(
        new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: { Objects: [{ Key: "checks/readiness" }], Quiet: true },
        }),
        { abortSignal: AbortSignal.timeout(3000) },
      );
      if (deleted.Errors?.length)
        throw new Error("Storage readiness cleanup unavailable");
    }
  } finally {
    client.destroy();
  }
}
