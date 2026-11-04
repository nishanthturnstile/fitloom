import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { withScope } from "@fitloom/db";
import { sql } from "drizzle-orm";
import sharp from "sharp";
import {
  attachFile,
  createBlobStore,
  createCustomerPhotoService,
  createFileService,
  createMeasurementCardService,
  createMeasurementPhotoService,
  createMeasurementService,
  processFoundationWork,
  referenceForFile,
  retireFile,
} from "../dist/index.js";

const invoke = (payload) => ({
  payload,
  operationKey: randomUUID(),
  correlationId: randomUUID(),
});
const rejected =
  (...codes) =>
  (error) =>
    codes.includes(error?.code) ||
    codes.includes(error?.category) ||
    codes.includes(error?.cause?.code);
export async function exerciseMeasurementPhotos({
  t,
  admin,
  web,
  worker,
  a,
  b,
  actor,
  payload,
  owner,
}) {
  if (
    process.env.TEST_STORAGE_BUCKET !== "fitloom-test" ||
    !["127.0.0.1", "seaweedfs"].includes(
      new URL(process.env.TEST_STORAGE_ENDPOINT).hostname,
    )
  )
    throw Error("Guarded measurement storage required");
  const config = {
      endpoint: process.env.TEST_STORAGE_ENDPOINT,
      bucket: "fitloom-test",
      accessKey: process.env.TEST_STORAGE_ACCESS_KEY,
      secretKey: process.env.TEST_STORAGE_SECRET_KEY,
    },
    store = createBlobStore(config),
    cleaner = createBlobStore({
      ...config,
      accessKey: process.env.TEST_STORAGE_WORKER_ACCESS_KEY,
      secretKey: process.env.TEST_STORAGE_WORKER_SECRET_KEY,
    });
  const resolveIdentity = async () => ({ principalId: a.principalId }),
    photos = createMeasurementPhotoService({
      pool: web,
      store,
      resolveIdentity,
    }),
    foreign = createMeasurementPhotoService({
      pool: web,
      store,
      resolveIdentity: async () => ({ principalId: b.principalId }),
    });
  const image = await sharp({
    create: { width: 16, height: 12, channels: 3, background: "#336655" },
  })
    .withMetadata({ orientation: 6 })
    .jpeg()
    .toBuffer();
  const upload = (id, service = photos, bytes = image) =>
    service.upload(
      a.target,
      id,
      new Request("http://localhost/photo", {
        method: "PUT",
        headers: { "Content-Type": "image/jpeg" },
        body: bytes,
      }),
    );
  const begin = (intent, service = photos) =>
    service.command("measurement-photo.begin", a.target, invoke(intent));
  const intentFor = (p) => ({
    ...owner,
    profileId: p.profileId,
    versionId: p.versionId,
    schemaRef: p.schemaRef,
    expectedRevision: p.expectedRevision ?? 0,
    reservationId: randomUUID(),
  });
  const save = (p) =>
    a.service.command(
      p.expectedRevision ? "measurement.revise" : "measurement.create",
      a.target,
      invoke(p),
    );
  const readQuery = (p, fileId) => ({
    ...owner,
    profileId: p.profileId,
    versionId: p.versionId,
    fileId,
  });
  const exact = (p) =>
    a.service.detail(a.target, {
      ...owner,
      profileId: p.profileId,
      versionId: p.versionId,
    });
  const fileRow = async (id) =>
    (await admin.query("SELECT * FROM app.private_files WHERE id=$1", [id]))
      .rows[0];
  const ref = async (id) =>
    referenceForFile({
      id,
      storageVersion: (await fileRow(id)).storage_version,
      sha256: (await fileRow(id)).sha256,
    });
  const expire = async (rid) => {
    await admin.query(
      "ALTER TABLE app.measurement_photo_reservations DISABLE TRIGGER immutable_owner",
    );
    try {
      await admin.query(
        "UPDATE app.measurement_photo_reservations SET created_at=now()-interval '2 days',expires_at=now()-interval '2 days'+interval '1 hour' WHERE id=$1 AND consumed_version_id IS NULL",
        [rid],
      );
    } finally {
      await admin.query(
        "ALTER TABLE app.measurement_photo_reservations ENABLE TRIGGER immutable_owner",
      );
    }
  };
  let first, staged, request, latest, staffId, staff, staffPhotos, firstCapture;
  await t.test(
    "measurement reservations precede content; normalized upload and failed-save recovery consume once",
    async () => {
      first = payload("38.25", { label: "Private photo fixture" });
      const intent = intentFor(first);
      staged = (await begin(intent)).result;
      assert.equal(
        (
          await admin.query(
            "SELECT id FROM app.measurement_profiles WHERE id=$1",
            [first.profileId],
          )
        ).rowCount,
        0,
      );
      assert.equal(
        (
          await admin.query(
            "SELECT consumed_version_id FROM app.measurement_photo_reservations WHERE id=$1",
            [intent.reservationId],
          )
        ).rows[0].consumed_version_id,
        null,
      );
      await assert.rejects(
        photos.read(a.target, readQuery(first, staged.fileId)),
        rejected("unavailable"),
      );
      const uploaded = await upload(staged.fileId);
      assert.equal(uploaded.version, 1);
      assert.deepEqual(await upload(staged.fileId), uploaded);
      await assert.rejects(
        upload(
          staged.fileId,
          photos,
          await sharp({
            create: { width: 8, height: 8, channels: 3, background: "red" },
          })
            .jpeg()
            .toBuffer(),
        ),
        rejected("operation-conflict"),
      );
      first.photos = {
        kind: "replace",
        reservationId: intent.reservationId,
        items: [{ fileId: staged.fileId, note: "Synthetic fitting reference" }],
      };
      await assert.rejects(
        save({ ...first, values: [] }),
        rejected("validation"),
      );
      assert.equal(
        (
          await admin.query(
            "SELECT consumed_version_id FROM app.measurement_photo_reservations WHERE id=$1",
            [intent.reservationId],
          )
        ).rows[0].consumed_version_id,
        null,
      );
      request = invoke(first);
      latest = (
        await a.service.command("measurement.create", a.target, request)
      ).result;
      const replay = await a.service.command(
        "measurement.create",
        a.target,
        request,
      );
      assert.equal(replay.replayed, true);
      assert.deepEqual(replay.result, latest);
      const detail = await exact(first);
      assert.deepEqual(detail.photos, {
        kind: "available",
        items: [{ ...first.photos.items[0], revoked: false }],
      });
      const bytes = Buffer.from(
        await (
          await photos.read(a.target, readQuery(first, staged.fileId))
        ).arrayBuffer(),
      );
      const metadata = await sharp(bytes).metadata();
      assert.equal(metadata.width, 12);
      assert.equal(metadata.height, 16);
      assert.equal(metadata.exif, undefined);
      assert.equal(metadata.orientation, undefined);
      const response = await photos.read(
        a.target,
        readQuery(first, staged.fileId),
      );
      assert.equal(response.headers.get("cache-control"), "private, no-store");
      assert.equal(response.headers.get("x-content-type-options"), "nosniff");
      assert.match(response.headers.get("content-security-policy"), /sandbox/);
      await response.body.cancel();
      const capture = await a.service.capture(a.target, {
        ...owner,
        profileId: first.profileId,
        versionId: first.versionId,
      });
      assert.ok(!JSON.stringify(capture).includes(staged.fileId));
      firstCapture = capture.immutable;
      const cards = createMeasurementCardService({
        pool: web,
        resolveIdentity,
      });
      const card = await cards.command(
        "measurement-card.create",
        a.target,
        invoke({
          ...owner,
          selections: [
            {
              profileId: first.profileId,
              versionId: first.versionId,
              fieldIds: [first.values[0].fieldId],
            },
          ],
          expiresInDays: 7,
        }),
      );
      assert.ok(
        !JSON.stringify(await cards.resolve(card.result.cardId)).includes(
          staged.fileId,
        ),
      );

      await assert.rejects(
        admin.query(
          "UPDATE app.measurement_photo_memberships SET note='changed' WHERE version_id=$1",
          [first.versionId],
        ),
        rejected("23514"),
      );
      await assert.rejects(
        admin.query(
          "UPDATE app.measurement_photo_reservations SET profile_id=$2 WHERE id=$1",
          [intent.reservationId, randomUUID()],
        ),
        rejected("42501"),
      );
      assert.equal((await fileRow(staged.fileId)).state, "attached");
    },
  );
  await t.test(
    "measurement photo authority is separate from workspace and CRM access; scalar revisions retain private membership",
    async () => {
      const generic = createFileService({ pool: web, resolveIdentity, store }),
        crm = createCustomerPhotoService({ pool: web, resolveIdentity, store });
      for (const fn of [
        () =>
          generic.upload(
            a.target,
            staged.fileId,
            new Request("http://localhost/photo", {
              method: "PUT",
              headers: { "content-type": "image/jpeg" },
              body: image,
            }),
          ),
        () => generic.download(a.target, staged.fileId),
        () =>
          crm.upload(
            a.target,
            staged.fileId,
            new Request("http://localhost/photo", {
              method: "PUT",
              headers: { "content-type": "image/jpeg" },
              body: image,
            }),
          ),
        () => crm.read(a.target, staged.fileId),
      ])
        await assert.rejects(fn);
      for (const cmd of [attachFile, retireFile])
        await assert.rejects(
          generic.execute(cmd, {
            ...invoke({ fileId: staged.fileId, expectedVersion: 2 }),
            scope: { kind: "tenant", ...a.target },
          }),
        );
      for (const expression of [
        sql`app.file_prepare(${staged.fileId}::uuid,10,'image/jpeg',${"a".repeat(64)})`,
        sql`app.file_finalize(${staged.fileId}::uuid,10,'image/jpeg',${"a".repeat(64)})`,
        sql`app.customer_photo_prepare(${staged.fileId}::uuid,10,'image/jpeg',${"a".repeat(64)})`,
        sql`app.customer_photo_finalize(${staged.fileId}::uuid,10,'image/jpeg',${"a".repeat(64)})`,
      ])
        await assert.rejects(
          withScope(web, a.scope, (db) =>
            db.execute(sql`SELECT ${expression}`),
          ),
        );
      staffId = await actor();
      const member = randomUUID();
      await admin.query(
        "INSERT INTO app.memberships(id,tenant_id,principal_id) VALUES($1,$2,$3)",
        [member, a.target.tenantId, staffId],
      );
      await admin.query(
        "INSERT INTO app.location_grants(tenant_id,membership_id,location_id,role_id) VALUES($1,$2,$3,$4)",
        [a.target.tenantId, member, a.target.locationId, a.roleId],
      );
      staff = createMeasurementService({
        pool: web,
        resolveIdentity: async () => ({ principalId: staffId }),
      });
      staffPhotos = createMeasurementPhotoService({
        pool: web,
        store,
        resolveIdentity: async () => ({ principalId: staffId }),
      });
      // Earlier authority tests may have removed management from this synthetic role.
      await admin.query(
        "INSERT INTO app.permission_grants(tenant_id,role_id,permission) SELECT $1,$2,p FROM unnest(ARRAY['workspace.read','customers.read','measurements.read','measurements.manage']) p ON CONFLICT DO NOTHING",
        [a.target.tenantId, a.roleId],
      );
      const restricted = await staff.detail(a.target, {
        ...owner,
        profileId: first.profileId,
      });
      assert.deepEqual(restricted.photos, { kind: "restricted" });
      const restrictedCapture = await staff.capture(a.target, {
        ...owner,
        profileId: first.profileId,
        versionId: first.versionId,
      });
      assert.deepEqual(restrictedCapture.immutable, firstCapture);
      assert.ok(!JSON.stringify(restrictedCapture).includes(staged.fileId));
      assert.ok(!JSON.stringify(restricted).includes(staged.fileId));
      assert.ok(
        !JSON.stringify(restricted).includes("Synthetic fitting reference"),
      );
      await assert.rejects(
        staffPhotos.read(a.target, readQuery(first, staged.fileId)),
        rejected("denied"),
      );
      await assert.rejects(
        staffPhotos.command(
          "measurement-photo.begin",
          a.target,
          invoke(intentFor(payload())),
        ),
        rejected("denied"),
      );
      const revised = {
        ...first,
        photos: { kind: "retain" },
        expectedRevision: latest.revision,
        versionId: randomUUID(),
        notes: "Scalar revision without photo access",
      };
      latest = (
        await staff.command("measurement.revise", a.target, invoke(revised))
      ).result;
      assert.equal(
        (
          await admin.query(
            "SELECT file_id FROM app.measurement_photo_memberships WHERE version_id=$1",
            [revised.versionId],
          )
        ).rows[0].file_id,
        staged.fileId,
      );
      assert.equal((await exact(first)).photos.items[0].fileId, staged.fileId);
      const copied = payload("38.25", {
        origin: {
          kind: "copy",
          sourceProfileId: first.profileId,
          sourceVersionId: first.versionId,
          decisions: [
            {
              rule: "identity",
              sourceFieldId: first.values[0].fieldId,
              targetFieldId: first.values[0].fieldId,
              choices: [],
            },
          ],
        },
      });
      await save(copied);
      assert.deepEqual((await exact(copied)).photos, {
        kind: "available",
        items: [],
      });
      await assert.rejects(
        foreign.read(b.target, readQuery(first, staged.fileId)),
        rejected("unavailable", "denied"),
      );
      await assert.rejects(
        save(
          payload("1", {
            photos: {
              kind: "replace",
              reservationId: null,
              items: first.photos.items,
            },
          }),
        ),
        rejected("unavailable"),
      );
    },
  );
  await t.test(
    "photo actor, planned version, expiry, fresh-file limits and storage interruption stay bounded",
    async () => {
      await admin.query(
        "INSERT INTO app.permission_grants(tenant_id,role_id,permission) SELECT $1,$2,p FROM unnest(ARRAY['measurements.photos.read','measurements.photos.manage']) p ON CONFLICT DO NOTHING",
        [a.target.tenantId, a.roleId],
      );
      const p = payload("2"),
        intent = intentFor(p),
        r = (await begin(intent)).result;
      await assert.rejects(
        upload(r.fileId, staffPhotos),
        rejected("unavailable"),
      );
      await assert.rejects(
        begin(intent, staffPhotos),
        rejected("version-conflict", "operation-conflict"),
      );
      let failed = false;
      const interrupted = createMeasurementPhotoService({
        pool: web,
        resolveIdentity,
        store: {
          ...store,
          async put(...args) {
            if (!failed) {
              failed = true;
              throw Error("Synthetic interrupted storage");
            }
            return store.put(...args);
          },
        },
      });
      await assert.rejects(
        upload(r.fileId, interrupted),
        rejected("temporary"),
      );
      await upload(r.fileId, interrupted);
      const pWithPhoto = {
        ...p,
        photos: {
          kind: "replace",
          reservationId: intent.reservationId,
          items: [{ fileId: r.fileId, note: null }],
        },
      };
      await assert.rejects(
        save({ ...pWithPhoto, versionId: randomUUID() }),
        rejected("version-conflict"),
      );
      await assert.rejects(
        staff.command("measurement.create", a.target, invoke(pWithPhoto)),
        rejected("version-conflict"),
      );
      await expire(intent.reservationId);
      await assert.rejects(save(pWithPhoto), rejected("version-conflict"));
      await assert.rejects(upload(r.fileId), rejected("version-conflict"));
      const bounded = payload("3"),
        reservation = intentFor(bounded),
        items = [];
      for (let i = 0; i < 5; i++) {
        const staged = (await begin(reservation)).result;
        await upload(staged.fileId);
        items.push({ fileId: staged.fileId, note: null });
      }
      await assert.rejects(begin(reservation), rejected("validation"));
      await assert.rejects(
        save({
          ...bounded,
          photos: {
            kind: "replace",
            reservationId: reservation.reservationId,
            items: [...items, { fileId: randomUUID(), note: null }],
          },
        }),
        rejected("validation"),
      );
      await assert.rejects(
        withScope(web, a.scope, async (db) => {
          await db.execute(
            sql`SELECT * FROM app.claim_operation('tenant','measurement.create',${randomUUID()},${`v1:${"b".repeat(64)}`},${randomUUID()}::uuid)`,
          );
          await db.execute(
            sql`SELECT app.measurement_mutate('measurement.create',${JSON.stringify({ ...bounded, photos: { kind: "replace", reservationId: reservation.reservationId, items: [...items, { fileId: randomUUID(), note: null }] } })}::jsonb)`,
          );
        }),
        rejected("FM004"),
      );
      await save({
        ...bounded,
        photos: {
          kind: "replace",
          reservationId: reservation.reservationId,
          items,
        },
      });
      assert.equal((await exact(bounded)).photos.items.length, 5);
      await assert.rejects(
        begin({ ...reservation, reservationId: randomUUID() }),
        rejected("operation-conflict"),
      );
    },
  );
  await t.test(
    "photo authority is checked again after opening real object bytes",
    async () => {
      const candidate = (
        await admin.query(
          "SELECT m.* FROM app.measurement_photo_memberships m JOIN app.private_files f ON f.id=m.file_id WHERE m.tenant_id=$1 AND f.state='attached' AND f.revoked_at IS NULL ORDER BY m.version_id LIMIT 1",
          [a.target.tenantId],
        )
      ).rows[0];
      let opened;
      const changing = createMeasurementPhotoService({
        pool: web,
        resolveIdentity,
        store: {
          ...store,
          async open(...args) {
            opened = await store.open(...args);
            await admin.query(
              "DELETE FROM app.permission_grants WHERE tenant_id=$1 AND role_id IN (SELECT id FROM app.roles WHERE tenant_id=$1 AND preset='owner') AND permission IN ('measurements.photos.read','measurements.photos.manage')",
              [a.target.tenantId],
            );
            return opened;
          },
        },
      });
      try {
        await assert.rejects(
          changing.read(a.target, {
            ...owner,
            profileId: candidate.profile_id,
            versionId: candidate.version_id,
            fileId: candidate.file_id,
          }),
          rejected("denied"),
        );
        await assert.rejects(
          a.service.command("measurement.create", a.target, request),
          rejected("denied"),
        );
        assert.ok(opened);
        assert.equal((await opened.getReader().read()).done, true);
      } finally {
        await admin.query(
          "INSERT INTO app.permission_grants SELECT tenant_id,id,p FROM app.roles CROSS JOIN unnest(ARRAY['measurements.photos.read','measurements.photos.manage']) p WHERE tenant_id=$1 AND preset='owner' ON CONFLICT DO NOTHING",
          [a.target.tenantId],
        );
      }
    },
  );
  await t.test(
    "historical live photos survive cleanup; archived privacy revocation denies all versions and permits collection",
    async () => {
      const previous = await a.service.detail(a.target, {
        ...owner,
        profileId: first.profileId,
      });
      const removed = {
        ...first,
        versionId: randomUUID(),
        expectedRevision: latest.revision,
        photos: { kind: "replace", reservationId: null, items: [] },
      };
      latest = (await save(removed)).result;
      assert.equal((await exact(removed)).photos.items.length, 0);
      assert.equal((await exact(first)).photos.items.length, 1);
      const historical = await photos.read(
        a.target,
        readQuery(first, staged.fileId),
      );
      await historical.body.cancel();
      const root = await mkdtemp(join(tmpdir(), "fitloom-measurement-photo-"));
      const cleanup = async () => {
        const id = randomUUID();
        await admin.query(
          "INSERT INTO app.foundation_jobs(id,kind,authority,source_id,source_key,input_version,payload,created_at) VALUES($1,'files.cleanup','service',$1,$2,1,'{}',now()-interval '2 days')",
          [id, `measurement-photos:${id}`],
        );
        await admin.query(
          "SELECT app.foundation_enqueue(f) FROM app.foundation_jobs f WHERE id=$1",
          [id],
        );
        for (let i = 0; i < 30; i++) {
          await processFoundationWork({
            pool: worker,
            stagingRoot: root,
            allowFixtures: true,
            store: cleaner,
          });
          if (
            (
              await admin.query(
                "SELECT status FROM app.foundation_jobs WHERE id=$1",
                [id],
              )
            ).rows[0].status === "succeeded"
          )
            return;
        }
        throw Error("Cleanup did not finish");
      };
      try {
        // Exercise the historical-binding exclusion even for otherwise collectable metadata.
        await admin.query(
          "UPDATE app.private_files SET state='retired',updated_at=now()-interval '2 days' WHERE id=$1",
          [staged.fileId],
        );
        await cleanup();
        assert.equal((await fileRow(staged.fileId)).state, "retired");
        await (
          await store.open(
            await ref(staged.fileId),
            (
              await fileRow(staged.fileId)
            ).byte_size,
          )
        ).cancel();
        await admin.query(
          "UPDATE app.private_files SET state='attached' WHERE id=$1",
          [staged.fileId],
        );
        await a.service.command(
          "measurement.archive",
          a.target,
          invoke({
            ...owner,
            profileId: first.profileId,
            expectedRevision: latest.revision,
          }),
        );
        const before = await exact(first);
        const revoke = invoke({
          ...owner,
          profileId: first.profileId,
          fileId: staged.fileId,
          reason: "Synthetic privacy request",
        });
        await photos.command("measurement-photo.revoke", a.target, revoke);
        assert.equal(
          (await photos.command("measurement-photo.revoke", a.target, revoke))
            .replayed,
          true,
        );
        assert.deepEqual((await exact(first)).document, before.document);
        assert.equal((await exact(first)).photos.items[0].revoked, true);
        const captured = await a.service.capture(a.target, {
          ...owner,
          profileId: first.profileId,
          versionId: first.versionId,
        });
        assert.deepEqual(captured.immutable, firstCapture);
        assert.equal(captured.eligibility.effectiveActive, false);
        for (const versionId of [first.versionId, previous.versionId])
          await assert.rejects(
            photos.read(a.target, {
              ...readQuery(first, staged.fileId),
              versionId,
            }),
            rejected("unavailable"),
          );
        assert.deepEqual(
          (
            await a.service.capture(a.target, {
              ...owner,
              profileId: first.profileId,
              versionId: first.versionId,
            })
          ).immutable,
          firstCapture,
        );
        const abandoned = payload("4"),
          intent = intentFor(abandoned),
          f = (await begin(intent)).result;
        await upload(f.fileId);
        await expire(intent.reservationId);
        await admin.query(
          "UPDATE app.private_files SET updated_at=now()-interval '2 days' WHERE id=ANY($1::uuid[])",
          [[staged.fileId, f.fileId]],
        );
        await cleanup();
        for (const id of [staged.fileId, f.fileId]) {
          assert.equal((await fileRow(id)).state, "deleted");
          await assert.rejects(
            store.open(await ref(id), (await fileRow(id)).byte_size),
          );
        }
        assert.equal(
          (
            await admin.query(
              "SELECT file_id FROM app.measurement_photo_memberships WHERE version_id=$1",
              [first.versionId],
            )
          ).rowCount,
          1,
        );
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
  );
}
