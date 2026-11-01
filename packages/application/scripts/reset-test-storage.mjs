import {
  DeleteObjectsCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";

const env = process.env;
const endpoint = new URL(env.TEST_STORAGE_ENDPOINT);
if (
  !["127.0.0.1", "seaweedfs"].includes(endpoint.hostname) ||
  endpoint.port !== "24453" ||
  env.TEST_STORAGE_BUCKET !== "fitloom-test"
)
  throw new Error("Only isolated local test storage may be reset");
const client = new S3Client({
  endpoint: endpoint.href,
  region: "us-east-1",
  forcePathStyle: true,
  credentials: {
    accessKeyId: env.TEST_STORAGE_RESET_ACCESS_KEY,
    secretAccessKey: env.TEST_STORAGE_RESET_SECRET_KEY,
  },
  maxAttempts: 1,
  requestChecksumCalculation: "WHEN_REQUIRED",
});
try {
  let continuation;
  let count = 0;
  do {
    const list = await client.send(
      new ListObjectsV2Command({
        Bucket: "fitloom-test",
        ContinuationToken: continuation,
        MaxKeys: 500,
      }),
      { abortSignal: AbortSignal.timeout(6000) },
    );
    const keys = (list.Contents ?? []).flatMap((row) =>
      row.Key ? [row.Key] : [],
    );
    if (
      keys.some(
        (key) =>
          key !== "checks/readiness" &&
          !/^objects\/(?:[a-f0-9-]{36}|v2\/[a-f0-9-]{36}\/[a-f0-9]{64})$/.test(
            key,
          ),
      )
    )
      throw new Error("Unexpected test object namespace");
    count += keys.length;
    if (count > 10000) throw new Error("Test storage reset limit exceeded");
    for (let i = 0; i < keys.length; i += 50) {
      const result = await client.send(
        new DeleteObjectsCommand({
          Bucket: "fitloom-test",
          Delete: {
            Objects: keys.slice(i, i + 50).map((Key) => ({ Key })),
            Quiet: true,
          },
        }),
        { abortSignal: AbortSignal.timeout(6000) },
      );
      if (result.Errors?.length)
        throw new Error("Test storage reset unavailable");
    }
    continuation = list.IsTruncated ? list.NextContinuationToken : undefined;
  } while (continuation);
  console.log("Isolated test storage reset");
} finally {
  client.destroy();
}
