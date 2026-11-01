import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createPool } from "@fitloom/db";
import { z } from "zod";
import { migrateDatabase } from "../../db/scripts/migrate.mjs";
import {
  blobKey,
  createBlobStore,
  createCommandExecutor,
  createFileService,
  referenceForFile,
  savePreferences,
} from "../dist/index.js";

const env = process.env,
  root = "/recovery",
  action = process.argv[2];
for (const purpose of ["MIGRATOR", "WEB"]) {
  const url = new URL(env[`TEST_${purpose}_DATABASE_URL`]);
  if (
    url.pathname !== "/fitloom_test" ||
    url.username !== `fitloom_test_${purpose.toLowerCase()}` ||
    url.hostname !== "postgres" ||
    url.port !== "24430"
  )
    throw new Error("Isolated container test identity required");
}
if (
  env.TEST_STORAGE_BUCKET !== "fitloom-test" ||
  new URL(env.TEST_STORAGE_ENDPOINT).hostname !== "seaweedfs"
)
  throw new Error("Isolated container storage required");
const config = {
  endpoint: env.TEST_STORAGE_ENDPOINT,
  bucket: "fitloom-test",
  accessKey: env.TEST_STORAGE_ACCESS_KEY,
  secretKey: env.TEST_STORAGE_SECRET_KEY,
};
const store = createBlobStore(config);
const tables = [
  "principals",
  "tenants",
  "memberships",
  "location_grants",
  "permission_grants",
  "journal_entries",
  "journal_lines",
  "command_operations",
  "command_audit",
  "command_outbox",
  "foundation_jobs",
  "provider_inbox",
  "private_files",
  "file_attachments",
  "operator_operations",
];
const fileSchema = z.strictObject({
  id: blobKey,
  ownerId: z.uuid(),
  tenantId: z.uuid(),
  locationId: z.uuid(),
  size: z.int().positive().max(5242880),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  storageVersion: z.union([z.literal(1), z.literal(2)]),
  mediaType: z.enum(["image/png", "image/jpeg"]),
  state: z.enum(["finalized", "attached"]),
});
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
async function sourceFingerprint() {
  const hash = createHash("sha256");
  for (const folder of [
    "packages/application/src",
    "packages/db/src",
    "apps/worker/src",
    "apps/web/src",
  ]) {
    async function walk(path) {
      for (const name of (await readdir(path, { withFileTypes: true })).sort(
        (a, b) => a.name.localeCompare(b.name),
      )) {
        const full = `${path}/${name.name}`;
        if (name.isDirectory()) await walk(full);
        else {
          hash.update(full);
          hash.update(await readFile(full));
        }
      }
    }
    await walk(folder);
  }
  return {
    applicationSourceSha256: hash.digest("hex"),
    lockSha256: digest(await readFile("pnpm-lock.yaml")),
    node: process.version,
  };
}
async function facts(pool) {
  const counts = {};
  for (const table of tables)
    counts[table] = (
      await pool.query(`SELECT count(*)::int AS n FROM app.${table}`)
    ).rows[0].n;
  const journal = (
    await pool.query(
      "SELECT count(*)::int AS lines,coalesce(sum(amount) FILTER(WHERE side='debit'),0)::text AS debit,coalesce(sum(amount) FILTER(WHERE side='credit'),0)::text AS credit FROM app.journal_lines",
    )
  ).rows[0];
  const migrations = (
    await pool.query(
      "SELECT hash,created_at FROM drizzle.__drizzle_migrations ORDER BY id",
    )
  ).rows;
  return { counts, journal, migrations };
}
function urlFor(purpose, database) {
  const url = new URL(env[`TEST_${purpose}_DATABASE_URL`]);
  url.pathname = `/${database}`;
  return url.href;
}
if (action === "snapshot") {
  const admin = createPool({
      connectionString: env.TEST_MIGRATOR_DATABASE_URL,
      purpose: "operator",
      max: 1,
    }),
    web = createPool({
      connectionString: env.TEST_WEB_DATABASE_URL,
      purpose: "web",
      max: 2,
    });
  try {
    const other = (
      await admin.query(
        "SELECT count(*)::int AS n FROM pg_stat_activity WHERE datname=current_database() AND backend_type='client backend' AND pid<>pg_backend_pid()",
      )
    ).rows[0].n;
    assert.equal(
      other,
      0,
      "Stop other test clients/workers before the restore rehearsal",
    );
    await admin.query("SET statement_timeout='60s'");
    await admin.query("SELECT pg_advisory_lock(68122902)");
    const files = z
      .array(fileSchema)
      .parse(
        (
          await admin.query(
            'SELECT id,owner_id AS "ownerId",tenant_id AS "tenantId",location_id AS "locationId",byte_size AS size,sha256,storage_version AS "storageVersion",media_type AS "mediaType",state FROM app.private_files WHERE state IN (\'finalized\',\'attached\') ORDER BY id LIMIT 251',
          )
        ).rows,
      );
    assert.ok(
      files.length > 0 && files.length <= 250,
      "Expected bounded, real file fixtures from pnpm validate",
    );
    assert.ok(
      files.reduce((n, f) => n + f.size, 0) <= 50 * 1024 * 1024,
      "Recovery fixture byte budget exceeded",
    );
    let subject;
    for (const file of files) {
      if (
        file.state === "attached" &&
        (
          await admin.query(
            "SELECT app.member_permission($1,$2,$3,'files.read') AS allowed",
            [file.ownerId, file.tenantId, file.locationId],
          )
        ).rows[0].allowed
      ) {
        subject = file;
        break;
      }
    }
    assert.ok(subject, "Expected an authorized referenced file");
    const request = {
      scope: { kind: "principal" },
      operationKey: randomUUID(),
      correlationId: randomUUID(),
      payload: {
        locale: "en",
        tenantId: subject.tenantId,
        locationId: subject.locationId,
      },
    };
    const executor = createCommandExecutor({
      pool: web,
      resolveIdentity: async () => ({ principalId: subject.ownerId }),
    });
    const operation = await executor(savePreferences, request);
    for (const file of files) {
      const bytes = Buffer.from(
        await new Response(
          await store.open(referenceForFile(file), file.size),
        ).arrayBuffer(),
      );
      assert.equal(digest(bytes), file.sha256);
      await writeFile(`${root}/${file.id}.blob`, bytes, { mode: 0o600 });
    }
    const foreign = (
      await admin.query(
        'SELECT tenant_id AS "tenantId",id AS "locationId" FROM app.locations WHERE tenant_id<>$1 AND archived_at IS NULL LIMIT 1',
        [subject.tenantId],
      )
    ).rows[0];
    assert.ok(foreign);
    const manifest = {
      release: await sourceFingerprint(),
      files,
      subject,
      foreign,
      request,
      operationId: operation.operationId,
      facts: await facts(admin),
    };
    await writeFile(`${root}/manifest.json`, JSON.stringify(manifest), {
      mode: 0o600,
    });
    console.log(
      `Recovery snapshot: ${files.length} private objects and ${manifest.facts.migrations.length} migrations; test writers quiesced.`,
    );
  } finally {
    await Promise.all([web.end(), admin.end()]);
  }
} else if (action === "verify") {
  const database = env.RECOVERY_DATABASE;
  if (!/^fitloom_restore_[a-f0-9]{12}$/.test(database ?? ""))
    throw new Error("Disposable recovery target required");
  const manifest = JSON.parse(await readFile(`${root}/manifest.json`, "utf8"));
  const files = z.array(fileSchema).parse(manifest.files);
  assert.deepEqual(
    await sourceFingerprint(),
    manifest.release,
    "Restore release/configuration must match the snapshot",
  );
  const admin = createPool({
      connectionString: urlFor("MIGRATOR", database),
      purpose: "operator",
      max: 1,
    }),
    web = createPool({
      connectionString: urlFor("WEB", database),
      purpose: "web",
      max: 2,
    });
  const raw = new S3Client({
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
  async function restoreFiles() {
    for (const file of files) {
      const bytes = await readFile(`${root}/${file.id}.blob`);
      assert.equal(digest(bytes), file.sha256);
      const key =
        file.storageVersion === 1
          ? `objects/${file.id}`
          : `objects/v2/${file.id}/${file.sha256}`;
      await raw.send(
        new PutObjectCommand({
          Bucket: "fitloom-test",
          Key: key,
          Body: bytes,
          ContentLength: bytes.length,
          ContentType: file.mediaType,
        }),
        { abortSignal: AbortSignal.timeout(6000) },
      );
    }
  }
  try {
    await migrateDatabase(urlFor("MIGRATOR", database));
    assert.deepEqual(
      await facts(admin),
      manifest.facts,
      "Restore table counts, exact journal sums, and migration hashes must match",
    );
    assert.equal(manifest.facts.journal.debit, manifest.facts.journal.credit);
    await store.remove([referenceForFile(manifest.subject)]);
    await assert.rejects(
      store.open(referenceForFile(manifest.subject), manifest.subject.size),
    );
    await restoreFiles();
    for (const file of files) {
      const bytes = Buffer.from(
        await new Response(
          await store.open(referenceForFile(file), file.size),
        ).arrayBuffer(),
      );
      assert.equal(
        digest(bytes),
        file.sha256,
        "Restored object digest must match",
      );
    }
    const service = createFileService({
      pool: web,
      store,
      resolveIdentity: async () => ({ principalId: manifest.subject.ownerId }),
    });
    const response = await service.download(
      {
        tenantId: manifest.subject.tenantId,
        locationId: manifest.subject.locationId,
      },
      manifest.subject.id,
    );
    assert.equal(
      digest(Buffer.from(await response.arrayBuffer())),
      manifest.subject.sha256,
    );
    await assert.rejects(
      service.download(manifest.foreign, manifest.subject.id),
      (e) => e.category === "access",
    );
    await assert.rejects(
      web.query("SELECT * FROM app.private_files"),
      (e) => e.code === "42501",
    );
    await assert.rejects(
      web.query("CREATE TABLE app.restore_bypass(id int)"),
      (e) => e.code === "42501",
    );
    const execute = createCommandExecutor({
      pool: web,
      resolveIdentity: async () => ({ principalId: manifest.subject.ownerId }),
    });
    const replay = await execute(savePreferences, manifest.request);
    assert.equal(replay.replayed, true);
    assert.equal(replay.operationId, manifest.operationId);
    await admin.query("UPDATE app.principals SET active=false WHERE id=$1", [
      manifest.subject.ownerId,
    ]);
    await assert.rejects(
      execute(savePreferences, manifest.request),
      (e) => e.category === "access",
    );
    await writeFile(
      `${root}/result.json`,
      JSON.stringify({
        passed: true,
        objects: files.length,
        migrations: manifest.facts.migrations.length,
        journalLines: manifest.facts.journal.lines,
        release: manifest.release,
        checks: [
          "matched logical PostgreSQL restore",
          "matched private-object restore after deliberate loss",
          "migration compatibility",
          "exact journal balances",
          "runtime RLS and DDL denial",
          "cross-tenant denial",
          "idempotent operation replay",
          "revoked authority after restore",
        ],
        sideEffectWorkersStarted: false,
      }),
      { mode: 0o600 },
    );
    console.log(
      "Recovery verification passed: matched database/objects, runtime isolation, journal sums, saved operation replay, and revocation. No side-effect worker started.",
    );
  } finally {
    await restoreFiles();
    raw.destroy();
    await Promise.all([web.end(), admin.end()]);
  }
} else throw new Error("Expected snapshot or verify");
