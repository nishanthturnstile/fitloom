import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { bodyCoreV1 } from "../dist/measurement-body-schema.js";
import * as c from "../dist/measurement-contracts.js";
import * as v from "../dist/measurement-values.js";

const fails = (schema, value) =>
  assert.equal(schema.safeParse(value).success, false);
const length = (decimal, unit = "in", fieldId = bodyCoreV1().fields[0].id) => ({
  kind: "length",
  fieldId,
  decimal,
  unit,
});
const compare = (source, target) =>
  v.compareLengths({
    source: c.measurementValue.parse(source),
    target: c.measurementValue.parse(target),
  });
const field = (overrides = {}) => ({ ...bodyCoreV1().fields[0], ...overrides });
const validate = (fields, values, currentValues) =>
  v.validateMeasurementValues({ fields, values, currentValues });
const base = () => {
  const { kind, basis, displayUnit, displayPrecision, min, max, ...common } =
    field();
  return { ...common, semanticId: null };
};

test("measurement decimals retain spelling and reject unsupported forms and negative zero", () => {
  for (const decimal of [
    "0",
    "0.000000",
    "1.2300",
    "999999999999999999.999999",
    "-999999999999999999.999999",
  ])
    assert.equal(c.measurementDecimal.parse(decimal), decimal);
  for (const decimal of [
    "-0",
    "-0.000000",
    "1e2",
    "NaN",
    "Infinity",
    "1,5",
    "1/2",
    ".5",
    "01",
    " 1",
    "+1",
    "1.",
    "1000000000000000000",
    "0.0000001",
  ])
    fails(c.measurementDecimal, decimal);
  fails(c.measurementLengthDecimal, "-0.1");
  fails(c.measurementDecimal, 1);
  assert.equal(v.canonicalMeasurementDecimal("1.230000"), "1.23");
  assert.equal(v.canonicalMeasurementDecimal("0.000000"), "0");
});

test("unit equality and ordering stay exact across recurring conversions and the full magnitude range", () => {
  assert.equal(compare(length("1"), length("2.54", "cm")), 0);
  assert.equal(compare(length("0.1", "cm"), length("0.039370", "in")), 1);
  assert.equal(
    compare(
      length("999999999999999999.999998"),
      length("999999999999999999.999999"),
    ),
    -1,
  );
  assert.equal(compare(length("0"), length("0", "cm")), 0);
  // Metamorphic fixture: exact conversion in either direction preserves order.
  for (let i = 0; i <= 100; i++) {
    const inches = String(i);
    const cm = `${Math.floor((i * 254) / 100)}.${String((i * 254) % 100).padStart(2, "0")}`;
    assert.equal(compare(length(inches), length(cm, "cm")), 0);
  }
});

test("presentation reports rounding and never changes the source quantity", () => {
  const input = {
    decimal: c.measurementDecimal.parse("0.100000"),
    unit: "cm",
    displayUnit: "in",
    precision: 6,
  };
  assert.deepEqual(v.displayLength(input), {
    decimal: "0.039370",
    approximate: true,
  });
  assert.equal(input.decimal, "0.100000");
  assert.deepEqual(
    v.displayLength({
      ...input,
      decimal: c.measurementDecimal.parse("1"),
      unit: "in",
      displayUnit: "cm",
      precision: 2,
    }),
    { decimal: "2.54", approximate: false },
  );
  assert.deepEqual(
    v.displayLength({
      ...input,
      decimal: c.measurementDecimal.parse("1.005"),
      unit: "cm",
      displayUnit: "cm",
      precision: 2,
    }),
    { decimal: "1.01", approximate: true },
  );
  assert.throws(() => v.displayLength({ ...input, precision: 7 }));
});

test("bounds are evaluated exactly in the pinned display unit", () => {
  const bounded = field({ min: "1", max: "1" });
  assert.deepEqual(validate([bounded], [length("2.540000", "cm")]), []);
  assert.equal(
    validate([bounded], [length("2.539999", "cm")])[0].fieldId,
    bounded.id,
  );
  assert.equal(validate([bounded], [length("2.540001", "cm")]).length, 1);
  const large = field({ min: "999999999999999999.999999", max: null });
  assert.deepEqual(
    validate([large], [length("999999999999999999.999999")]),
    [],
  );
});

test("all five value kinds are strict and missing is distinct from false and zero", () => {
  const bool = { ...base(), kind: "boolean", required: true };
  const falseValue = { kind: "boolean", fieldId: bool.id, value: false };
  assert.deepEqual(validate([bool], [falseValue]), []);
  assert.deepEqual(validate([field({ required: true })], [length("0")]), []);
  assert.throws(() => validate([bool], []));
  const another = field({ id: randomUUID() });
  assert.equal(
    validate([bool, another], [length("0", "in", another.id)])[0].fieldId,
    bool.id,
  );
  fails(c.measurementValue, { ...falseValue, value: null });
  fails(c.measurementValue, { ...falseValue, recordedBy: randomUUID() });
  fails(c.measurementValues, [length("1"), length("2")]);
  fails(
    c.measurementValues,
    Array.from({ length: 81 }, () => length("1", "in", randomUUID())),
  );
  assert.equal(validate([bool], [length("1")]).length, 1);
  assert.equal(
    validate([bool], [{ ...falseValue, fieldId: randomUUID() }]).length,
    2,
  );
});

test("numbers enforce count, sign, decimal places and bounds without floating point", () => {
  const count = {
    ...base(),
    kind: "number",
    unit: "count",
    decimalPlaces: 0,
    min: "0",
    max: "3",
  };
  const number = (decimal) => ({ kind: "number", fieldId: count.id, decimal });
  assert.deepEqual(validate([count], [number("2.000000")]), []);
  for (const decimal of ["-1", "1.5", "4"])
    assert.ok(validate([count], [number(decimal)]).length > 0);
  const unitless = { ...count, unit: "unitless", decimalPlaces: 2, min: "-2" };
  assert.deepEqual(validate([unitless], [number("-1.25")]), []);
  assert.ok(validate([unitless], [number("0.001")]).length > 0);
});

test("text uses code points and required text cannot be whitespace", () => {
  const text = { ...base(), kind: "text", maxLength: 2, required: true };
  const value = (textValue) => ({
    kind: "text",
    fieldId: text.id,
    text: textValue,
  });
  assert.deepEqual(validate([text], [value("😀அ")]), []);
  assert.equal(validate([text], [value("😀அx")]).length, 1);
  assert.equal(validate([text], [value(" ")]).length, 1);
  fails(c.measurementValue, value("a\u0000"));
  fails(c.measurementValue, value("\ud800"));
});

test("select choices belong to their field and inactive carry-forward requires exact current content", () => {
  const active = {
    id: randomUUID(),
    label: "Active",
    illustrationId: null,
    active: true,
  };
  const inactive = {
    ...active,
    id: randomUUID(),
    label: "Retired",
    active: false,
  };
  const select = { ...base(), kind: "select", choices: [active, inactive] };
  const value = (choiceId) => ({
    kind: "select",
    fieldId: select.id,
    choiceId,
  });
  assert.deepEqual(validate([select], [value(active.id)]), []);
  assert.equal(validate([select], [value(randomUUID())]).length, 1);
  assert.equal(validate([select], [value(inactive.id)]).length, 1);
  assert.deepEqual(
    validate([select], [value(inactive.id)], [value(inactive.id)]),
    [],
  );
  assert.equal(
    validate([select], [value(inactive.id)], [value(active.id)]).length,
    1,
  );
  assert.equal(
    validate(
      [{ ...select, choices: [active] }],
      [value(inactive.id)],
      [value(inactive.id)],
    ).length,
    1,
  );
});

test("body v1 uses the pinned manifest, fixed identities, and independent returned copies", () => {
  const schema = bodyCoreV1();
  assert.equal(schema.fields.length, 5);
  assert.equal(schema.sections[0].id, "51c4b79e-9be7-4dd9-9c91-000000000000");
  assert.deepEqual(
    schema.fields.map((f) => f.semanticId),
    [
      "body.chest.circumference",
      "body.bust.circumference",
      "body.waist.circumference",
      "body.hip.circumference",
      "body.shoulder.width",
    ],
  );
  assert.equal(
    createHash("sha256").update(JSON.stringify(schema)).digest("hex"),
    "d0e56403a7473f16d5f86c83910017a99329d8b8fe5029f407404a448cf05353",
  );
  schema.fields[0].label = "Changed by caller";
  assert.equal(bodyCoreV1().fields[0].label, "Chest circumference");
});

test("intake snapshots reject management configuration and broken identities", () => {
  const schema = bodyCoreV1();
  for (const key of [
    "rates",
    "services",
    "addons",
    "constructionGroups",
    "rateOverride",
  ])
    fails(c.measurementSchema, { ...schema, [key]: [] });
  fails(c.measurementSchema, {
    ...schema,
    fields: [schema.fields[0], schema.fields[0]],
  });
  fails(c.measurementSchema, { ...schema, sections: [] });
  fails(c.measurementSchema, {
    ...schema,
    fields: [{ ...schema.fields[0], rate: "1" }],
  });
  fails(c.measurementSchemaRef, {
    kind: "body",
    bundleVersion: "body-core-v1",
    garmentId: randomUUID(),
  });
});

test("measured dates require valid dates and an explicit shop-local today", () => {
  assert.equal(c.measuredOnAllowed("0001-01-01", "2026-11-03"), true);
  assert.equal(c.measuredOnAllowed("2026-11-03", "2026-11-03"), true);
  assert.equal(c.measuredOnAllowed("2026-11-04", "2026-11-03"), false);
  // The same instant may have different shop-local dates. No machine-date fallback.
  assert.equal(c.measuredOnAllowed("2026-11-03", "2026-11-02"), false);
  for (const date of ["0000-01-01", "2026-02-29", "2026-13-01"])
    fails(c.measurementDate, date);
  assert.throws(() => c.measuredOnAllowed("2026-11-03", undefined));
});

test("value validation rejects ambiguous definitions and bounds its linked issues", () => {
  assert.throws(() => validate([field(), field()], [length("1")]));
  const unknown = Array.from({ length: 80 }, () =>
    length("1", "in", randomUUID()),
  );
  assert.equal(validate([], unknown).length, 30);
});

test("measurement browser exports have no transitive server imports", async () => {
  const visited = new Set();
  async function walk(file) {
    if (visited.has(file.href)) return;
    visited.add(file.href);
    const source = await readFile(file, "utf8");
    assert.doesNotMatch(source, /process\.env|node:|@fitloom\/db|server-only/);
    for (const [, specifier] of source.matchAll(
      /(?:from\s*|import\s*\()\s*["']([^"']+)["']/g,
    )) {
      if (specifier.startsWith(".")) await walk(new URL(specifier, file));
      else
        assert.ok(
          ["zod", "decimal.js", "libphonenumber-js/max"].includes(specifier),
          specifier,
        );
    }
  }
  for (const name of [
    "measurement-contracts",
    "measurement-values",
    "measurement-body-schema",
    "measurement-draft",
    "measurement-reuse",
    "measurement-photo-contracts",
    "measurement-card-contracts",
    "private-image-limits",
  ])
    await walk(new URL(`../dist/${name}.js`, import.meta.url));
});

test("measurement child routes classify before customer profiles and clear owner IDs on switching", async () => {
  const { workspaceRoute, workspaceSearch } = await import(
    "../../../apps/web/src/components/workspace/workspace-route-policy.ts"
  );
  const { resolveWorkspaceDestination } = await import(
    "../dist/workspace-contracts.js"
  );
  const tenantId = randomUUID(),
    locationId = randomUUID(),
    base = `/workspaces/${tenantId}/${locationId}`,
    book = `${base}/customers/${randomUUID()}/wearers/${randomUUID()}/measurements`;
  for (const path of [
    book,
    `${book}/new`,
    `${book}/${randomUUID()}/edit`,
    `${book}/compare`,
    `${book}/${randomUUID()}/versions/${randomUUID()}/copy`,
    `${book}/${randomUUID()}/versions/${randomUUID()}`,
  ]) {
    const route = workspaceRoute(base, path, new URLSearchParams());
    assert.equal(route.customerPage, "measurements");
    assert.deepEqual(route.destination, { kind: "customers" });
    assert.equal(
      resolveWorkspaceDestination(
        {
          tenantId,
          locationId,
          permissions: ["workspace.read", "customers.read"],
        },
        route.destination,
      ),
      `${base}/customers`,
    );
  }
  assert.equal(
    workspaceRoute(base, `${book}/${randomUUID()}/edit`, new URLSearchParams())
      .label,
    "Revise measurements",
  );
  assert.equal(
    workspaceSearch(base, book, new URLSearchParams(), [
      "workspace.read",
      "customers.read",
      "measurements.read",
    ]).event,
    "fitloom:measurement-search",
  );
  assert.equal(
    workspaceSearch(base, `${book}/new`, new URLSearchParams(), [
      "customers.read",
      "measurements.read",
    ]).event,
    "fitloom:customer-search",
  );
});

test("photo changes are closed, bounded and independent of scalar capture", () => {
  const item = { fileId: randomUUID(), note: null };
  assert.deepEqual(c.measurementPhotoChange.parse({ kind: "retain" }), {
    kind: "retain",
  });
  assert.equal(
    c.measurementPhotoChange.safeParse({ kind: "retain", items: [item] })
      .success,
    false,
  );
  assert.equal(
    c.measurementPhotoChange.safeParse({
      kind: "replace",
      reservationId: null,
      items: [item, item],
    }).success,
    false,
  );
  assert.equal(
    c.measurementPhotoChange.safeParse({
      kind: "replace",
      reservationId: null,
      items: Array.from({ length: 6 }, () => ({
        ...item,
        fileId: randomUUID(),
      })),
    }).success,
    false,
  );
  assert.equal(
    c.measurementPhotoProjection.safeParse({
      kind: "restricted",
      items: [item],
    }).success,
    false,
  );
});

test("capture requires an exact version and a closed owner-qualified snapshot", () => {
  const query = {
    customerId: randomUUID(),
    wearerId: randomUUID(),
    profileId: randomUUID(),
    versionId: randomUUID(),
  };
  assert.equal(
    c.measurementCaptureQuery.parse(query).versionId,
    query.versionId,
  );
  const { versionId, ...current } = query;
  for (const bad of [
    current,
    { ...query, versionId: null },
    { ...query, versionId: "" },
    { ...query, unit: "cm" },
  ])
    fails(c.measurementCaptureQuery, bad);
  const captured = {
    immutable: {
      ...query,
      sequence: 1,
      measuredOn: "2020-01-02",
      recordedAt: "2020-01-02T00:00:00Z",
      recordedBy: randomUUID(),
      priorVersionId: null,
      schemaRef: { kind: "body", bundleVersion: "body-core-v1" },
      document: {
        schema: bodyCoreV1(),
        label: "Exact snapshot",
        values: [length("38.250000")],
        customFields: [],
        notes: null,
        sourceNote: null,
        origin: { kind: "manual" },
      },
    },
    eligibility: {
      effectiveActive: true,
      currentVersion: true,
      schemaActive: true,
      currentSchema: true,
    },
  };
  c.measurementCapture.parse(captured);
  for (const key of ["photos", "recordedByLabel", "rates", "orderNumber"])
    fails(c.measurementCapture, {
      ...captured,
      immutable: { ...captured.immutable, [key]: [] },
    });
});
