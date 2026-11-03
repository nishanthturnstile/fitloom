import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { createPool, withScope } from "@fitloom/db";
import { sql } from "drizzle-orm";
import sharp from "sharp";
import { migrateDatabase } from "../../db/scripts/migrate.mjs";
import {
  attachFile,
  beginFile,
  blobKey,
  createBlobStore,
  createCustomerPhotoService,
  createCustomerService,
  createFileService,
  createWorkspaceService,
  processFoundationWork,
  provisionTenant,
  referenceForFile,
  retireFile,
  saveSetupDraft,
} from "../dist/index.js";

const dbURL = new URL(process.env.TEST_MIGRATOR_DATABASE_URL);
if (
  dbURL.pathname !== "/fitloom_test" ||
  dbURL.username !== "fitloom_test_migrator" ||
  !["127.0.0.1", "postgres"].includes(dbURL.hostname) ||
  dbURL.port !== "24430" ||
  process.env.TEST_STORAGE_BUCKET !== "fitloom-test" ||
  !["127.0.0.1", "seaweedfs"].includes(
    new URL(process.env.TEST_STORAGE_ENDPOINT).hostname,
  )
)
  throw new Error("Isolated test database and storage required");
await test("private SeaweedFS files, current authority, attachment atomicity and cleanup", async (t) => {
  const admin = createPool({
    connectionString: process.env.TEST_MIGRATOR_DATABASE_URL,
    purpose: "auth",
    max: 2,
  });
  const web = createPool({
    connectionString: process.env.TEST_WEB_DATABASE_URL,
    purpose: "web",
    max: 3,
  });
  const worker = createPool({
    connectionString: process.env.TEST_WORKER_DATABASE_URL,
    purpose: "worker",
    max: 2,
  });
  const config = {
    endpoint: process.env.TEST_STORAGE_ENDPOINT,
    bucket: "fitloom-test",
    accessKey: process.env.TEST_STORAGE_ACCESS_KEY,
    secretKey: process.env.TEST_STORAGE_SECRET_KEY,
  };
  const store = createBlobStore(config),
    cleaner = createBlobStore({
      ...config,
      accessKey: process.env.TEST_STORAGE_WORKER_ACCESS_KEY,
      secretKey: process.env.TEST_STORAGE_WORKER_SECRET_KEY,
    });
  const stagingRoot = await mkdtemp(join(tmpdir(), "fitloom-file-test-"));
  await admin.query("SET lock_timeout='20s'");
  await admin.query("SELECT pg_advisory_lock(68122902)");
  try {
    await migrateDatabase(process.env.TEST_MIGRATOR_DATABASE_URL);
    async function owner() {
      const principal = randomUUID(),
        user = randomUUID();
      await admin.query(
        'INSERT INTO public."user"(id,name,email,email_verified) VALUES($1,$1,$2,true)',
        [user, `files-${user}@example.test`],
      );
      await admin.query(
        "INSERT INTO app.principals(id,auth_user_id) VALUES($1,$2)",
        [principal, user],
      );
      const resolveIdentity = async () => ({ principalId: principal }),
        workspaces = createWorkspaceService({ pool: web, resolveIdentity }),
        files = createFileService({ pool: web, resolveIdentity, store });
      const profile = {
        shopName: "Private files fixture",
        locationName: "Main",
        businessMode: "tailoring",
        ownerName: "File owner",
        ownerPhone: "+919876543210",
        address: "Fixture address",
        timezone: "Asia/Kolkata",
        consentAccepted: true,
        consentVersion: "workspace-authority-v1",
      };
      const execute = (cmd, payload) =>
        workspaces.execute(cmd, {
          scope: { kind: "principal" },
          operationKey: randomUUID(),
          correlationId: randomUUID(),
          payload,
        });
      await execute(saveSetupDraft, { ...profile, expectedVersion: 0 });
      await execute(provisionTenant, { ...profile, expectedVersion: 1 });
      const choice = (await workspaces.choices())[0],
        target = { tenantId: choice.tenantId, locationId: choice.locationId };
      const command = (cmd, payload = {}, key = randomUUID()) =>
        files.execute(cmd, {
          scope: { kind: "tenant", ...target },
          operationKey: key,
          correlationId: randomUUID(),
          payload,
        });
      return { principal, target, files, command, workspaces };
    }
    const a = await owner(),
      b = await owner();
    const image = await sharp({
      create: { width: 8, height: 6, channels: 3, background: "#448866" },
    })
      .png()
      .toBuffer();
    const upload = (owner, id, bytes = image, type = "image/png") =>
      owner.files.upload(
        owner.target,
        id,
        new Request("http://localhost/upload", {
          method: "PUT",
          headers: { "content-type": type },
          body: bytes,
        }),
      );
    const reserve = async (owner) => (await owner.command(beginFile)).result.id;
    const reference = async (id) => {
      const row = (
        await admin.query(
          "SELECT storage_version,sha256 FROM app.private_files WHERE id=$1",
          [id],
        )
      ).rows[0];
      return referenceForFile({
        id: blobKey.parse(id),
        storageVersion: row.storage_version,
        sha256: row.sha256,
      });
    };
    let attached;
    await t.test(
      "real S3 is private, credential-scoped, and finalized files need attachment before download",
      async () => {
        const id = await reserve(a);
        const ready = await upload(a, id);
        assert.equal(ready.version, 1);
        assert.equal((await upload(a, id)).version, 1);
        await assert.rejects(
          a.files.download(a.target, id),
          (e) => e.category === "access",
        );
        const different = await sharp({
          create: { width: 4, height: 4, channels: 3, background: "red" },
        })
          .png()
          .toBuffer();
        await assert.rejects(
          upload(a, id, different),
          (e) => e.category === "conflict",
        );
        const completed = await a.command(attachFile, {
          fileId: id,
          expectedVersion: 1,
        });
        assert.equal(completed.result.version, 2);
        attached = id;
        const response = await a.files.download(a.target, id);
        assert.ok(response.headers.get("cache-control").includes("no-store"));
        assert.equal(response.headers.get("x-content-type-options"), "nosniff");
        assert.ok(
          response.headers.get("content-disposition").startsWith("attachment;"),
        );
        const bytes = Buffer.from(await response.arrayBuffer());
        assert.equal((await sharp(bytes).metadata()).width, 8);
        const metadata = (
          await admin.query(
            "SELECT sha256 FROM app.private_files WHERE id=$1",
            [id],
          )
        ).rows[0];
        assert.equal(
          createHash("sha256").update(bytes).digest("hex"),
          metadata.sha256,
        );
        assert.equal(
          (await fetch(`${config.endpoint}/fitloom-test/objects/${id}`)).status,
          403,
        );
        await assert.rejects(
          createBlobStore({ ...config, bucket: "fitloom-dev" }).open(
            await reference(id),
            bytes.length,
          ),
          (e) =>
            e.name === "AccessDenied" && e.$metadata?.httpStatusCode === 403,
        );
        await assert.rejects(
          cleaner.open(await reference(id), bytes.length),
          (e) =>
            e.name === "AccessDenied" && e.$metadata?.httpStatusCode === 403,
        );
        await assert.rejects(
          web.query("SELECT * FROM app.private_files"),
          (e) => e.code === "42501",
        );
        assert.ok((await a.files.list(a.target)).some((row) => row.id === id));
      },
    );
    await t.test(
      "cross-tenant, location, path and current permission changes deny new downloads",
      async () => {
        await assert.rejects(
          b.files.download(b.target, attached),
          (e) => e.category === "access",
        );
        await assert.rejects(
          b.command(attachFile, { fileId: attached, expectedVersion: 2 }),
        );
        await assert.rejects(
          a.files.download({ ...a.target, locationId: randomUUID() }, attached),
          (e) => e.category === "access",
        );
        await assert.rejects(
          a.files.download(a.target, "../../etc/passwd"),
          (e) => e.category === "validation",
        );
        for (const [disable, restore, key] of [
          [
            "UPDATE app.memberships SET active=false WHERE principal_id=$1",
            "UPDATE app.memberships SET active=true WHERE principal_id=$1",
            a.principal,
          ],
          [
            "UPDATE app.tenants SET active=false WHERE id=$1",
            "UPDATE app.tenants SET active=true WHERE id=$1",
            a.target.tenantId,
          ],
          [
            "UPDATE app.locations SET archived_at=now() WHERE id=$1",
            "UPDATE app.locations SET archived_at=NULL WHERE id=$1",
            a.target.locationId,
          ],
        ]) {
          await admin.query(disable, [key]);
          try {
            await assert.rejects(
              a.files.download(a.target, attached),
              (e) => e.category === "access",
            );
          } finally {
            await admin.query(restore, [key]);
          }
        }
        await admin.query(
          "DELETE FROM app.permission_grants WHERE tenant_id=$1 AND permission='files.read'",
          [a.target.tenantId],
        );
        try {
          await assert.rejects(
            a.files.download(a.target, attached),
            (e) => e.category === "access",
          );
        } finally {
          await admin.query(
            "INSERT INTO app.permission_grants SELECT tenant_id,id,'files.read' FROM app.roles WHERE tenant_id=$1 AND preset='owner'",
            [a.target.tenantId],
          );
        }
      },
    );
    await t.test(
      "actual content, decoded pixels, byte limits and immutable upload identity are enforced",
      async () => {
        const id = await reserve(a);
        await assert.rejects(
          upload(
            a,
            id,
            Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'),
          ),
          (e) => e.category === "validation",
        );
        await assert.rejects(
          upload(a, id, image, "image/jpeg"),
          (e) => e.category === "validation",
        );
        await assert.rejects(
          upload(a, id, Buffer.alloc(5 * 1024 * 1024 + 1)),
          (e) => e.category === "validation",
        );
        const huge = await sharp({
          create: {
            width: 4000,
            height: 4000,
            channels: 3,
            background: "white",
          },
        })
          .png()
          .toBuffer();
        await assert.rejects(
          upload(a, id, huge),
          (e) => e.category === "validation",
        );
        assert.equal(
          (
            await admin.query(
              "SELECT state FROM app.private_files WHERE id=$1",
              [id],
            )
          ).rows[0].state,
          "staged",
        );
      },
    );
    const run = () =>
      processFoundationWork({
        pool: worker,
        stagingRoot,
        allowFixtures: true,
        store: cleaner,
      });
    async function cleanup() {
      const id = randomUUID();
      await admin.query(
        "INSERT INTO app.foundation_jobs(id,kind,authority,source_id,source_key,input_version,payload,created_at) VALUES($1,'files.cleanup','service',$1,$2,1,'{}',now()-interval '2 days')",
        [id, `files-test:${id}`],
      );
      await admin.query(
        "SELECT app.foundation_enqueue(f) FROM app.foundation_jobs f WHERE id=$1",
        [id],
      );
      return id;
    }
    await t.test(
      "interrupted finalization leaves a collectable orphan; referenced and recent objects survive",
      async () => {
        const orphan = await reserve(a);
        await admin.query(
          "CREATE FUNCTION app.test_file_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action='finalize' THEN RAISE EXCEPTION 'injected';END IF;RETURN NEW;END $$;CREATE TRIGGER test_file_failure BEFORE INSERT ON app.file_events FOR EACH ROW EXECUTE FUNCTION app.test_file_failure()",
        );
        try {
          await assert.rejects(
            upload(a, orphan),
            (e) => e.category === "temporary",
          );
        } finally {
          await admin.query(
            "DROP TRIGGER test_file_failure ON app.file_events;DROP FUNCTION app.test_file_failure()",
          );
        }
        const canonical = await sharp(image).rotate().png().toBuffer();
        await (
          await store.open(await reference(orphan), canonical.length)
        ).cancel();
        assert.equal(
          (
            await admin.query(
              "SELECT state FROM app.private_files WHERE id=$1",
              [orphan],
            )
          ).rows[0].state,
          "staged",
        );
        const different = await sharp({
          create: { width: 4, height: 4, channels: 3, background: "red" },
        })
          .png()
          .toBuffer();
        await assert.rejects(
          upload(a, orphan, different),
          (e) => e.category === "conflict",
          "The pre-write content binding survives finalization rollback",
        );
        await admin.query(
          "UPDATE app.private_files SET updated_at=now()-interval '48 hours' WHERE id=ANY($1::uuid[])",
          [[orphan, attached]],
        );
        const job = await cleanup();
        await run();
        assert.equal(
          (
            await admin.query(
              "SELECT status FROM app.foundation_jobs WHERE id=$1",
              [job],
            )
          ).rows[0].status,
          "succeeded",
        );
        assert.equal(
          (
            await admin.query(
              "SELECT state FROM app.private_files WHERE id=$1",
              [orphan],
            )
          ).rows[0].state,
          "deleted",
        );
        await assert.rejects(
          store.open(await reference(orphan), canonical.length),
        );
        await (await a.files.download(a.target, attached)).arrayBuffer();
      },
    );
    await t.test(
      "attachment holds the same metadata lock as cleanup; retirement is distinct from deletion",
      async () => {
        const id = await reserve(a);
        await upload(a, id);
        await admin.query(
          "UPDATE app.private_files SET updated_at=now()-interval '48 hours' WHERE id=$1",
          [id],
        );
        let release;
        const hold = new Promise((resolve) => {
          release = resolve;
        });
        let entered;
        const acquired = new Promise((resolve) => {
          entered = resolve;
        });
        const held = {
          ...attachFile,
          async mutate(...args) {
            const result = await attachFile.mutate(...args);
            entered();
            await hold;
            return result;
          },
        };
        const attaching = a.command(held, { fileId: id, expectedVersion: 1 });
        await acquired;
        await cleanup();
        try {
          await run();
        } finally {
          release();
        }
        await attaching;
        await (await a.files.download(a.target, id)).arrayBuffer();
        await a.command(retireFile, { fileId: id, expectedVersion: 2 });
        await assert.rejects(
          a.files.download(a.target, id),
          (e) => e.category === "access",
        );
        assert.equal(
          (
            await admin.query(
              "SELECT state FROM app.private_files WHERE id=$1",
              [id],
            )
          ).rows[0].state,
          "retired",
        );
        await admin.query(
          "UPDATE app.private_files SET updated_at=now()-interval '48 hours' WHERE id=$1",
          [id],
        );
        for (let n = 0; n < 10; n++) if (!(await run())) break;
        assert.equal(
          (
            await admin.query(
              "SELECT state FROM app.private_files WHERE id=$1",
              [id],
            )
          ).rows[0].state,
          "deleted",
        );
      },
    );
    await t.test(
      "bounded pages keep stable ordering, scoped counts, and current authorization",
      async () => {
        const membership = (
          await admin.query(
            "SELECT m.id,g.role_id FROM app.memberships m JOIN app.location_grants g ON g.membership_id=m.id AND g.tenant_id=m.tenant_id WHERE m.principal_id=$1 AND g.location_id=$2",
            [a.principal, a.target.locationId],
          )
        ).rows[0];
        const staff = (
          await admin.query(
            "SELECT id FROM app.roles WHERE tenant_id=$1 AND preset='staff'",
            [a.target.tenantId],
          )
        ).rows[0].id;
        const locations = [];
        for (let n = 0; n < 55; n++) {
          const user = randomUUID(),
            principal = randomUUID(),
            member = randomUUID(),
            location = randomUUID();
          locations.push(location);
          await admin.query(
            'INSERT INTO public."user"(id,name,email,email_verified) VALUES($1,$3,$2,true)',
            [user, `page-${user}@example.test`, "Paged person"],
          );
          await admin.query(
            "INSERT INTO app.principals(id,auth_user_id) VALUES($1,$2)",
            [principal, user],
          );
          await admin.query(
            "INSERT INTO app.memberships(id,tenant_id,principal_id) VALUES($1,$2,$3)",
            [member, a.target.tenantId, principal],
          );
          await admin.query(
            "INSERT INTO app.location_grants(tenant_id,membership_id,location_id,role_id) VALUES($1,$2,$3,$4)",
            [a.target.tenantId, member, a.target.locationId, staff],
          );
          await admin.query(
            "INSERT INTO app.locations(id,tenant_id,name) VALUES($1,$2,$3)",
            [
              location,
              a.target.tenantId,
              `Paged outlet ${String(n).padStart(2, "0")}`,
            ],
          );
          await admin.query(
            "INSERT INTO app.location_grants(tenant_id,membership_id,location_id,role_id) VALUES($1,$2,$3,$4)",
            [a.target.tenantId, membership.id, location, membership.role_id],
          );
        }
        const first = await a.workspaces.team(a.target),
          second = await a.workspaces.team(a.target, first.nextOffset);
        assert.equal(first.members.length, 50);
        assert.equal(first.counts.members, 56);
        assert.equal(second.members.length, 6);
        assert.equal(
          new Set([...first.members, ...second.members].map((row) => row.id))
            .size,
          56,
        );
        const choices1 = await a.workspaces.choicePage(),
          choices2 = await a.workspaces.choicePage(choices1.nextOffset);
        assert.equal(choices1.total, 56);
        assert.equal(choices2.items.length, 6);
        assert.equal(
          new Set(
            [...choices1.items, ...choices2.items].map((row) => row.locationId),
          ).size,
          56,
        );
        const all = await a.workspaces.allLocationsPage(a.target);
        assert.equal(all.total, 56);
        assert.equal(all.items.length, 50);
        await assert.rejects(
          a.files.download({ ...a.target, locationId: locations[0] }, attached),
          (e) => e.category === "access",
        );
        await assert.rejects(
          b.workspaces.team(a.target),
          (e) => e.category === "access",
        );
        assert.throws(
          () => a.workspaces.choicePage(-1),
          (e) => e.category === "validation",
        );
        assert.throws(
          () => a.files.page(a.target, 100001),
          (e) => e.category === "validation",
        );
        // Real backing objects keep pagination fixtures valid for the subsequent restore rehearsal.
        const canonical = await sharp(image).rotate().png().toBuffer(),
          digest = createHash("sha256").update(canonical).digest("hex");
        for (let n = 0; n < 53; n++) {
          const id = randomUUID();
          await admin.query(
            "INSERT INTO app.private_files(id,owner_id,tenant_id,location_id,state,byte_size,media_type,sha256,version,storage_version,created_at) VALUES($1,$2,$3,$4,'attached',$5,'image/png',$6,2,2,'2026-01-01')",
            [
              id,
              a.principal,
              a.target.tenantId,
              a.target.locationId,
              canonical.length,
              digest,
            ],
          );
          await admin.query(
            "INSERT INTO app.file_attachments(file_id,tenant_id,location_id,attached_by) VALUES($1,$2,$3,$4)",
            [id, a.target.tenantId, a.target.locationId, a.principal],
          );
          await store.put(
            referenceForFile({
              id: blobKey.parse(id),
              storageVersion: 2,
              sha256: digest,
            }),
            canonical,
            "image/png",
          );
        }
        const page1 = await a.files.page(a.target),
          page2 = await a.files.page(a.target, page1.nextOffset);
        assert.equal(page1.total, 54);
        assert.equal(page1.items.length, 50);
        assert.equal(page2.items.length, 4);
        assert.equal(
          new Set([...page1.items, ...page2.items].map((row) => row.id)).size,
          54,
        );
        assert.equal((await b.files.page(b.target)).total, 0);
        await admin.query(
          "UPDATE app.memberships SET active=false WHERE principal_id=$1",
          [a.principal],
        );
        try {
          await assert.rejects(
            a.files.page(a.target, 50),
            (e) => e.category === "access",
          );
        } finally {
          await admin.query(
            "UPDATE app.memberships SET active=true WHERE principal_id=$1",
            [a.principal],
          );
        }
      },
    );
    await t.test(
      "CRM photos retain private purpose, owner, normalized content, replay, replacement and cleanup boundaries",
      async () => {
        const resolveIdentity = async () => ({ principalId: a.principal });
        const crm = createCustomerService({ pool: web, resolveIdentity });
        const photos = createCustomerPhotoService({
          pool: web,
          resolveIdentity,
          store,
        });
        const otherPhotos = createCustomerPhotoService({
          pool: web,
          resolveIdentity: async () => ({ principalId: b.principal }),
          store,
        });
        const envelope = (payload) => ({
          operationKey: randomUUID(),
          correlationId: randomUUID(),
          payload,
        });
        const profile = {
          name: "Photo contact",
          phone: null,
          email: null,
          address: null,
          taxCountryCode: null,
          gstin: null,
          segment: null,
          notes: null,
          preferences: { fit: null, fabric: null, design: null },
          tags: [],
        };
        const attributes = {
          relationship: null,
          birthday: null,
          gender: { kind: "unspecified" },
          height: null,
          weight: null,
          notes: null,
          preferences: { fit: null, fabric: null, design: null },
        };
        const created = await crm.command(
          "customer.create",
          a.target,
          envelope({
            profile,
            selfWearer: { kind: "self", attributes },
            intent: { kind: "check-first" },
          }),
        );
        const owner = {
          kind: "customer-avatar",
          customerId: created.result.customerId,
        };
        const stage = async (targetOwner = owner) =>
          (
            await photos.command(
              "customer-photo.begin",
              a.target,
              envelope({ owner: targetOwner }),
            )
          ).result.fileId;
        const jpeg = await sharp(image)
          .jpeg()
          .withMetadata({ orientation: 6 })
          .toBuffer();
        assert.ok((await sharp(jpeg).metadata()).exif);
        const put = (id, bytes = jpeg, type = "image/jpeg") =>
          photos.upload(
            a.target,
            id,
            new Request("http://localhost/photo", {
              method: "PUT",
              headers: { "content-type": type },
              body: bytes,
            }),
          );
        const first = await stage();
        const uploaded = await put(first);
        await assert.rejects(otherPhotos.read(b.target, first));
        await assert.rejects(photos.read(a.target, first));
        await assert.rejects(upload(a, first));
        await assert.rejects(
          a.command(attachFile, {
            fileId: first,
            expectedVersion: uploaded.version,
          }),
        );
        await assert.rejects(
          a.command(retireFile, {
            fileId: first,
            expectedVersion: uploaded.version,
          }),
        );
        await assert.rejects(a.files.download(a.target, first));
        for (const query of [
          sql`SELECT app.file_prepare(${first}::uuid,${jpeg.length},'image/jpeg',${"0".repeat(64)})`,
          sql`SELECT app.file_finalize(${first}::uuid,1,'image/jpeg',${"0".repeat(64)})`,
        ])
          await assert.rejects(
            withScope(
              web,
              { kind: "tenant", principalId: a.principal, ...a.target },
              (db) => db.execute(query),
            ),
          );
        assert.equal(
          (await a.files.list(a.target)).some((f) => f.id === first),
          false,
        );
        const bind = envelope({
          owner,
          fileId: first,
          fileVersion: uploaded.version,
          expectedVersion: 0,
          note: "Synthetic staff permission note",
        });
        await admin.query("BEGIN");
        try {
          await admin.query(
            "SELECT id FROM app.private_files WHERE id=$1 FOR UPDATE",
            [first],
          );
          await assert.rejects(
            photos.command("customer-photo.bind", a.target, bind),
            (e) => e.code === "busy",
          );
        } finally {
          await admin.query("ROLLBACK");
        }
        const bound = await photos.command(
          "customer-photo.bind",
          a.target,
          bind,
        );
        assert.equal(bound.result.version, 1);
        assert.deepEqual(
          (await photos.command("customer-photo.bind", a.target, bind)).result,
          bound.result,
        );
        const response = await photos.read(a.target, first);
        assert.match(response.headers.get("content-disposition"), /^inline/);
        assert.equal(
          response.headers.get("cache-control"),
          "private, no-store",
        );
        const normalized = Buffer.from(await response.arrayBuffer());
        const meta = await sharp(normalized).metadata();
        assert.equal(meta.exif, undefined);
        assert.equal(meta.orientation, undefined);
        assert.equal(meta.xmp, undefined);
        assert.equal(
          (
            await photos.command(
              "customer-photo.bind",
              a.target,
              envelope({ ...bind.payload, expectedVersion: 1 }),
            )
          ).result.changed,
          false,
        );
        const foreign = await crm.command(
          "customer.create",
          a.target,
          envelope({
            profile: { ...profile, name: "Other contact" },
            selfWearer: { kind: "none" },
            intent: { kind: "check-first" },
          }),
        );
        const second = await stage();
        const secondUpload = await put(second);
        await assert.rejects(
          photos.command(
            "customer-photo.bind",
            a.target,
            envelope({
              owner: {
                kind: "customer-avatar",
                customerId: foreign.result.customerId,
              },
              fileId: second,
              fileVersion: secondUpload.version,
              expectedVersion: 0,
              note: "Wrong owner",
            }),
          ),
        );
        const memberId = randomUUID();
        await admin.query(
          "INSERT INTO app.memberships(id,tenant_id,principal_id) VALUES($1,$2,$3)",
          [memberId, a.target.tenantId, b.principal],
        );
        await admin.query(
          "INSERT INTO app.location_grants(tenant_id,membership_id,location_id,role_id) SELECT $1,$2,$3,id FROM app.roles WHERE tenant_id=$1 AND preset='owner'",
          [a.target.tenantId, memberId, a.target.locationId],
        );
        await assert.rejects(
          otherPhotos.upload(
            a.target,
            second,
            new Request("http://localhost/photo", {
              method: "PUT",
              headers: { "content-type": "image/jpeg" },
              body: jpeg,
            }),
          ),
          (e) => e.code === "unavailable",
        );
        const expired = await stage();
        const expiredUpload = await put(expired);
        await admin.query(
          "UPDATE app.private_files SET created_at=now()-interval '48 hours',updated_at=now()-interval '48 hours' WHERE id=$1",
          [expired],
        );
        await assert.rejects(
          photos.command(
            "customer-photo.bind",
            a.target,
            envelope({
              owner,
              fileId: expired,
              fileVersion: expiredUpload.version,
              expectedVersion: 1,
              note: "Expired stage",
            }),
          ),
          (e) => e.code === "version-conflict",
        );
        const bad = await stage();
        await assert.rejects(put(bad, Buffer.from("not an image")));
        assert.equal((await photos.slot(a.target, owner)).photo.fileId, first);
        // CRM management works with no generic file-library grants.
        await admin.query(
          "DELETE FROM app.permission_grants WHERE tenant_id=$1 AND permission IN ('files.read','files.manage','masters.read','masters.manage','masters.rates.read')",
          [a.target.tenantId],
        );
        const replacement = envelope({
          owner,
          fileId: second,
          fileVersion: secondUpload.version,
          expectedVersion: 1,
          note: "Replacement permission note",
        });
        try {
          await crm.command(
            "customer.create",
            a.target,
            envelope({
              profile: { ...profile, name: "No catalog rights contact" },
              selfWearer: { kind: "none" },
              intent: { kind: "check-first" },
            }),
          );
          await photos.command("customer-photo.bind", a.target, replacement);
          await assert.rejects(a.files.list(a.target));
        } finally {
          await admin.query(
            "INSERT INTO app.permission_grants SELECT tenant_id,id,p FROM app.roles CROSS JOIN unnest(ARRAY['files.read','files.manage','masters.read','masters.manage','masters.rates.read']) p WHERE tenant_id=$1 AND preset='owner' ON CONFLICT DO NOTHING",
            [a.target.tenantId],
          );
        }
        await assert.rejects(photos.read(a.target, first));
        await assert.rejects(
          otherPhotos.command("customer-photo.bind", a.target, replacement),
          (e) => e.code === "operation-conflict",
        );
        await admin.query(
          "DELETE FROM app.permission_grants WHERE tenant_id=$1 AND permission='customers.photos.read'",
          [a.target.tenantId],
        );
        try {
          await assert.rejects(
            photos.read(a.target, second),
            (e) => e.code === "denied",
          );
          await assert.rejects(
            photos.command("customer-photo.bind", a.target, replacement),
            (e) => e.code === "denied",
          );
        } finally {
          await admin.query(
            "INSERT INTO app.permission_grants SELECT tenant_id,id,'customers.photos.read' FROM app.roles WHERE tenant_id=$1 AND preset='owner' ON CONFLICT DO NOTHING",
            [a.target.tenantId],
          );
        }
        const row = (
          await admin.query(
            "SELECT result::text FROM app.command_operations WHERE operation_key=$1",
            [replacement.operationKey],
          )
        ).rows[0];
        assert.equal(row.result.includes("Replacement permission note"), false);
        await photos.command(
          "customer-photo.remove",
          a.target,
          envelope({ owner, expectedVersion: 2 }),
        );
        await assert.rejects(photos.read(a.target, second));
        assert.equal((await photos.slot(a.target, owner)).photo, null);
        const face = {
          kind: "wearer-photo",
          customerId: owner.customerId,
          wearerId: created.result.createdWearerId,
          role: "face",
        };
        const faceFile = await stage(face),
          faceUpload = await put(faceFile);
        await photos.command(
          "customer-photo.bind",
          a.target,
          envelope({
            owner: face,
            fileId: faceFile,
            fileVersion: faceUpload.version,
            expectedVersion: 0,
            note: "Face photo permission",
          }),
        );
        await crm.command(
          "customer.archive",
          a.target,
          envelope({ customerId: owner.customerId, expectedVersion: 1 }),
        );
        await (await photos.read(a.target, faceFile)).arrayBuffer();
        await assert.rejects(
          photos.command(
            "customer-photo.begin",
            a.target,
            envelope({ owner: face }),
          ),
          (e) => e.code === "version-conflict",
        );
        await admin.query(
          "UPDATE app.private_files SET updated_at=now()-interval '48 hours' WHERE id=ANY($1::uuid[])",
          [[first, second, bad, faceFile]],
        );
        await cleanup();
        await run();
        const states = (
          await admin.query(
            "SELECT id,state FROM app.private_files WHERE id=ANY($1::uuid[])",
            [[first, second, bad, faceFile]],
          )
        ).rows;
        assert.equal(states.find((f) => f.id === bad).state, "deleted");
        assert.equal(states.find((f) => f.id === first).state, "deleted");
        assert.equal(states.find((f) => f.id === faceFile).state, "attached");
        await (await photos.read(a.target, faceFile)).arrayBuffer();
      },
    );
  } finally {
    await Promise.all([web.end(), worker.end()]);
    await admin.end();
    await rm(stagingRoot, { recursive: true, force: true });
  }
});
