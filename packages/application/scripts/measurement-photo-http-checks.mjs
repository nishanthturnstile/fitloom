import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import * as c from "../dist/measurement-contracts.js";
import { measurementPhotoResponse } from "../dist/measurement-photo-contracts.js";
export async function measurementPhotoHttpChecks({
  base,
  prefix,
  cookie,
  owner,
  payload,
  admin,
}) {
  const post = (path, body) =>
    fetch(base + path, {
      method: "POST",
      headers: { cookie, origin: base, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  const get = (path) => fetch(base + path, { headers: { cookie } });
  const envelope = (payload) => ({
    payload,
    operationKey: randomUUID(),
    correlationId: randomUUID(),
  });
  const command = (name, payload) =>
    post(`${prefix}/commands/${name}`, envelope(payload));
  const expect = async (response, status, schema) => {
    assert.equal(response.status, status, await response.clone().text());
    assert.match(response.headers.get("cache-control"), /no-store/);
    return schema ? schema.parse(await response.json()) : response;
  };
  const p = {
      ...payload,
      profileId: randomUUID(),
      versionId: randomUUID(),
      label: "HTTP private references",
    },
    ownerPath = `${prefix}/${owner.customerId}/${owner.wearerId}`;
  const intent = {
    ...owner,
    profileId: p.profileId,
    versionId: p.versionId,
    schemaRef: p.schemaRef,
    reservationId: randomUUID(),
    expectedRevision: 0,
  };
  const staged = await expect(
      await command("measurement-photo.begin", intent),
      200,
      measurementPhotoResponse,
    ),
    id = staged.result.fileId;
  const path = `${ownerPath}/${p.profileId}/versions/${p.versionId}/photos/${id}`;
  await expect(await get(path), 404);
  const bytes = await sharp({
    create: { width: 20, height: 10, channels: 3, background: "#286244" },
  })
    .withMetadata({ orientation: 6 })
    .jpeg()
    .toBuffer();
  const upload = (body = bytes, origin = base) =>
    fetch(`${base}${prefix}/photos/uploads/${id}`, {
      method: "PUT",
      headers: { cookie, origin, "content-type": "image/jpeg" },
      body,
    });
  await expect(await upload(bytes, "https://other.invalid"), 403);
  await expect(await upload(Buffer.from("invalid image")), 400);
  await expect(await upload(), 200);
  await expect(await upload(), 200);
  await expect(await get(path), 404);
  p.photos = {
    kind: "replace",
    reservationId: intent.reservationId,
    items: [{ fileId: id, note: "HTTP private reference note" }],
  };
  await expect(
    await command("measurement.create", { ...p, versionId: randomUUID() }),
    409,
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
  const request = envelope(p);
  await expect(
    await post(`${prefix}/commands/measurement.create`, request),
    200,
    c.measurementSaveResponse,
  );
  assert.equal(
    (
      await expect(
        await post(`${prefix}/commands/measurement.create`, request),
        200,
        c.measurementSaveResponse,
      )
    ).replayed,
    true,
  );
  const detail = await expect(
    await get(`${ownerPath}/${p.profileId}`),
    200,
    c.measurementDetail,
  );
  assert.equal(detail.photos.items[0].fileId, id);
  const response = await expect(await get(path), 200);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.match(response.headers.get("content-security-policy"), /sandbox/);
  assert.match(response.headers.get("content-disposition"), /inline/);
  const metadata = await sharp(
    Buffer.from(await response.arrayBuffer()),
  ).metadata();
  assert.equal(metadata.width, 10);
  assert.equal(metadata.height, 20);
  assert.equal(metadata.exif, undefined);
  const root = prefix.slice(0, -"/measurements".length);
  for (const endpoint of [
    `${root}/files/${id}`,
    `${root}/customers/photos/files/${id}`,
  ])
    assert.ok(!(await get(endpoint)).ok);
  const capture = await expect(
    await get(`${ownerPath}/${p.profileId}/versions/${p.versionId}/capture`),
    200,
    c.measurementCapture,
  );
  assert.ok(!JSON.stringify(capture).includes(id));
  const compare = await expect(
    await post(`${ownerPath}/compare`, {
      versions: [
        { profileId: p.profileId, versionId: p.versionId },
        { profileId: payload.profileId, versionId: payload.versionId },
      ],
      unit: "cm",
    }),
    200,
    c.measurementComparison,
  );
  assert.ok(!JSON.stringify(compare).includes(id));
  return {
    async restricted() {
      await expect(
        await post(`${prefix}/commands/measurement.create`, request),
        403,
      );
      const response = await get(`${ownerPath}/${p.profileId}`),
        text = await response.clone().text();
      const restricted = await expect(response, 200, c.measurementDetail);
      assert.deepEqual(restricted.photos, { kind: "restricted" });
      const restrictedCapture = await expect(
        await get(
          `${ownerPath}/${p.profileId}/versions/${p.versionId}/capture`,
        ),
        200,
        c.measurementCapture,
      );
      assert.deepEqual(restrictedCapture.immutable, capture.immutable);
      assert.ok(!text.includes(id));
      assert.ok(!text.includes("HTTP private reference note"));
      await expect(await get(path), 403);
      const html = await get(
        `${root.replace("/api/workspaces/", "/workspaces/")}/customers/${owner.customerId}/wearers/${owner.wearerId}/measurements/${p.profileId}`,
      );
      assert.equal(html.status, 200);
      assert.ok(!(await html.text()).includes(id));
    },
    async revokeArchived() {
      const result = await expect(
        await command("measurement-photo.revoke", {
          ...owner,
          profileId: p.profileId,
          fileId: id,
          reason: "HTTP archived privacy request",
        }),
        200,
        measurementPhotoResponse,
      );
      assert.equal(result.result.changed, true);
      await expect(await get(path), 404);
      const after = await expect(
        await get(
          `${ownerPath}/${p.profileId}/versions/${p.versionId}/capture`,
        ),
        200,
        c.measurementCapture,
      );
      assert.deepEqual(after.immutable, capture.immutable);
      assert.equal(after.eligibility.effectiveActive, false);
      assert.equal(
        (
          await expect(
            await get(`${ownerPath}/${p.profileId}`),
            200,
            c.measurementDetail,
          )
        ).photos.items[0].revoked,
        true,
      );
      console.log(
        "Measurement photo HTTP passed: reserved upload, normalized private bytes, atomic replay, distinct purpose, restricted DTO/SSR, media-free analysis/capture and archived privacy revocation.",
      );
    },
  };
}
