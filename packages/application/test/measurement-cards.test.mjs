import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import decodeQR from "qr/decode.js";
import sharp from "sharp";
import * as c from "../dist/measurement-card-contracts.js";
import {
  measurementCardPNG,
  measurementCardURL,
} from "../dist/measurement-card-qr.js";

test("card locators are closed same-origin paths and real PNG bytes decode to exactly that locator", async () => {
  const id = randomUUID(),
    url = `https://fitloom.example/measurement-cards/${id}`;
  assert.equal(measurementCardURL("https://fitloom.example", id), url);
  assert.equal(c.measurementCardReturn(id), `/measurement-cards/${id}`);
  for (const bad of [
    "https://other.example",
    "//evil.example",
    "../account",
    "bad",
    "00000000-0000-0000-0000-000000000000?next=evil",
  ])
    assert.equal(c.measurementCardReturn(bad), null);
  for (const origin of [
    "javascript:alert(1)",
    "ftp://example.test",
    "https://a:b@example.test",
    "https://example.test/path",
    "https://example.test/?other=1",
  ])
    assert.throws(() => measurementCardURL(origin, id));
  const bytes = await measurementCardPNG("https://fitloom.example", id),
    { data, info } = await sharp(bytes)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
  assert.equal(decodeQR({ data, width: info.width, height: info.height }), url);
  assert.deepEqual([...data.subarray(0, 4)], [255, 255, 255, 255]);
});
test("card selections, expiry and public projection remain closed and bounded", () => {
  const id = randomUUID(),
    selection = {
      profileId: randomUUID(),
      versionId: randomUUID(),
      fieldIds: [randomUUID()],
    },
    base = {
      customerId: randomUUID(),
      wearerId: randomUUID(),
      selections: [selection],
    };
  assert.equal(c.measurementCardCreate.parse(base).expiresInDays, 7);
  for (const patch of [
    { expiresInDays: 0 },
    { expiresInDays: 31 },
    { selections: [] },
    { selections: [selection, selection] },
    {
      selections: Array.from({ length: 11 }, () => ({
        ...selection,
        versionId: randomUUID(),
      })),
    },
    {
      selections: [
        {
          ...selection,
          fieldIds: Array.from({ length: 31 }, () => randomUUID()),
        },
      ],
    },
  ])
    assert.equal(
      c.measurementCardCreate.safeParse({ ...base, ...patch }).success,
      false,
    );
  const value = { kind: "boolean", label: "Confirmed", value: false };
  assert.equal(
    c.measurementCardValueText(c.measurementCardValue.parse(value)),
    "No",
  );
  assert.equal(
    c.measurementCardValue.safeParse({ ...value, fileId: id }).success,
    false,
  );
  assert.equal(
    c.measurementCardValueText({
      kind: "number",
      label: "Count",
      decimal: "0",
      unit: "count",
    }),
    "0 count",
  );
});
