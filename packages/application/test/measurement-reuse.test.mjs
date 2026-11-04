import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { bodyCoreV1 } from "../dist/measurement-body-schema.js";
import * as c from "../dist/measurement-contracts.js";
import {
  addMeasurementEase,
  cloneMeasurementCustomFields,
  compareMeasurements,
  displayMeasurementRatio,
  mappedMeasurementValue,
  mappingCompatible,
  projectMeasurementTrend,
  suggestMeasurementSource,
} from "../dist/measurement-reuse.js";

const profile = randomUUID(),
  customer = randomUUID(),
  wearer = randomUUID(),
  section = randomUUID(),
  chest = bodyCoreV1().fields[0];
function detail(values, fields = [chest], patch = {}) {
  return c.measurementDetail.parse({
    customerId: customer,
    wearerId: wearer,
    profileId: profile,
    versionId: randomUUID(),
    currentVersionId: randomUUID(),
    revision: 1,
    sequence: 1,
    archivedAt: null,
    measuredOn: "2026-11-03",
    recordedAt: "2026-11-03T10:00:00+00:00",
    recordedBy: randomUUID(),
    recordedByLabel: "Synthetic staff",
    priorVersionId: null,
    schemaRef: { kind: "body", bundleVersion: "body-core-v1" },
    effectiveActive: true,
    document: {
      schema: {
        ...bodyCoreV1(),
        sections: [{ id: section, label: "Dimensions" }],
        fields: fields.map((f) => ({ ...f, sectionId: section })),
      },
      label: "Fixture",
      values,
      customFields: [],
      notes: null,
      sourceNote: null,
      origin: { kind: "manual" },
    },
    ...patch,
  });
}
const length = (decimal, unit = "in", fieldId = chest.id) => ({
  kind: "length",
  fieldId,
  decimal,
  unit,
});
test("comparison equality and delta stay exact across units, small differences and maximum magnitude", () => {
  const a = detail([length("1")]),
    b = detail([length("2.540000", "cm")]);
  let compared = compareMeasurements([a, b], "cm");
  assert.equal(compared.rows[0].cells[1].status, "same");
  assert.equal(compared.rows[0].cells[1].delta.numerator, "0");
  b.document.values = [length("2.540001", "cm")];
  compared = compareMeasurements([a, b], "cm");
  assert.equal(compared.rows[0].cells[1].status, "changed");
  assert.notEqual(compared.rows[0].cells[1].delta.numerator, "0");
  a.document.values = [length("999999999999999999.999998")];
  b.document.values = [length("999999999999999999.999999")];
  compared = compareMeasurements([a, b], "in");
  assert.equal(compared.rows[0].cells[1].delta.numerator, "254");
});
test("false, zero, missing, text and field-owned choices are never coerced", () => {
  const bool = {
      ...chest,
      id: randomUUID(),
      semanticId: null,
      kind: "boolean",
    },
    number = {
      ...chest,
      id: randomUUID(),
      semanticId: null,
      kind: "number",
      unit: "count",
      decimalPlaces: 0,
      min: null,
      max: null,
    };
  for (const f of [bool, number]) {
    delete f.basis;
    delete f.displayUnit;
    delete f.displayPrecision;
    delete f.min;
    delete f.max;
  }
  number.min = null;
  number.max = null;
  const a = detail(
    [
      length("1"),
      { kind: "boolean", fieldId: bool.id, value: false },
      { kind: "number", fieldId: number.id, decimal: "0" },
    ],
    [chest, bool, number],
  );
  const b = detail([length("1")], [chest, bool, number]);
  const result = compareMeasurements([a, b], "cm");
  assert.equal(result.rows[1].cells[0].display, "No");
  assert.equal(result.rows[1].cells[1].status, "missing-in-target");
  assert.equal(result.rows[2].cells[0].display, "0");
  assert.equal(result.rows[2].cells[1].delta, null);
});
test("known chest/bust and basis differences cannot be mapped by a matching label", () => {
  const bust = { ...bodyCoreV1().fields[1], label: chest.label };
  assert.equal(mappingCompatible(chest, bust, "identity"), false);
  const garment = {
    ...chest,
    id: randomUUID(),
    basis: "garment",
    semanticId: "garment.chest.circumference",
  };
  assert.equal(mappingCompatible(chest, garment, "identity"), false);
  assert.equal(mappingCompatible(chest, garment, "ease"), true);
  const source = detail([length("1")]);
  assert.equal(
    suggestMeasurementSource(source, bust, source.schemaRef),
    undefined,
  );
  const b = detail([length("1", "in", garment.id)], [garment], {
    schemaRef: {
      kind: "garment",
      garmentId: randomUUID(),
      versionId: randomUUID(),
    },
  });
  assert.equal(
    compareMeasurements([source, b], "cm").rows[0].cells[1].status,
    "incompatible",
  );
});
test("ease is exact or explicitly rounded, remains nonnegative and respects decimal bounds", () => {
  const rule = {
    rule: "ease",
    sourceFieldId: chest.id,
    targetFieldId: randomUUID(),
    decimal: "2.54",
    unit: "cm",
    resultUnit: "cm",
    acceptRounding: false,
  };
  assert.deepEqual(addMeasurementEase(length("1"), rule), {
    decimal: "5.080000",
    unit: "cm",
    approximate: false,
  });
  const recurring = { ...rule, decimal: "0", resultUnit: "in" };
  assert.throws(
    () => addMeasurementEase(length("1", "cm"), recurring),
    /rounding/,
  );
  assert.deepEqual(
    addMeasurementEase(length("1", "cm"), {
      ...recurring,
      acceptRounding: true,
    }),
    { decimal: "0.393701", unit: "in", approximate: true },
  );
  assert.throws(
    () => addMeasurementEase(length("1"), { ...rule, decimal: "-20" }),
    /negative/,
  );
  assert.throws(() =>
    addMeasurementEase(length("999999999999999999"), {
      ...rule,
      decimal: "1",
      unit: "in",
      resultUnit: "in",
    }),
  );
});
test("independent custom clones have fresh field/choice IDs and explicit source-owned choice maps", () => {
  const source = detail([length("1")]);
  const id = randomUUID(),
    choice = randomUUID();
  source.document.customFields = [
    {
      id,
      sectionId: section,
      kind: "select",
      label: "Custom",
      required: false,
      semanticId: null,
      help: "",
      illustrationId: null,
      choices: [
        { id: choice, label: "Choice", illustrationId: null, active: true },
      ],
    },
  ];
  source.document.values.push({
    kind: "select",
    fieldId: id,
    choiceId: choice,
  });
  const cloned = cloneMeasurementCustomFields(
    source,
    source.document.schema,
    randomUUID,
  );
  assert.notEqual(cloned.fields[0].id, id);
  assert.notEqual(cloned.fields[0].choices[0].id, choice);
  const mapped = mappedMeasurementValue(
    source.document.customFields,
    cloned.fields[0],
    source.document.values,
    cloned.decisions[0],
  );
  assert.equal(mapped.choiceId, cloned.fields[0].choices[0].id);
  source.document.customFields[0].choices[0].label = "Changed";
  assert.equal(cloned.fields[0].choices[0].label, "Choice");
  cloned.fields[0].choices[0].active = false;
  assert.equal(
    mappedMeasurementValue(
      source.document.customFields,
      cloned.fields[0],
      source.document.values,
      cloned.decisions[0],
    ),
    null,
  );
});
test("trends retain missing gaps and reject nonnumeric dimensions", () => {
  const v = () => ({
    versionId: randomUUID(),
    measuredOn: "2026-11-03",
    recordedAt: "2026-11-03T10:00:00+00:00",
    transformed: false,
    fields: [chest],
    values: [length("1")],
  });
  const first = v(),
    missing = { ...v(), values: [] },
    last = v();
  const result = projectMeasurementTrend(
    { anchorField: chest, items: [first, missing, last], next: null },
    "cm",
  );
  assert.deepEqual(
    result.items.map((p) => p.decimal),
    ["2.540000", null, "2.540000"],
  );
  assert.equal(result.items[1].status, "missing");
  assert.throws(
    () =>
      projectMeasurementTrend(
        { anchorField: { ...chest, kind: "boolean" }, items: [], next: null },
        "cm",
      ),
    /numeric/,
  );
});
test("comparison and trend requests are bounded and closed", () => {
  const version = { profileId: profile, versionId: randomUUID() };
  assert.equal(
    c.measurementCompareFilters.safeParse({ versions: [version] }).success,
    false,
  );
  assert.equal(
    c.measurementCompareFilters.safeParse({ versions: Array(5).fill(version) })
      .success,
    false,
  );
  assert.equal(
    c.measurementTrendFilters.safeParse({
      anchorVersionId: version.versionId,
      fieldId: chest.id,
      from: "0001-01-01",
      to: "2026-11-03",
    }).success,
    false,
  );
  assert.equal(
    c.measurementOriginInput.safeParse({
      kind: "copy",
      sourceProfileId: profile,
      sourceVersionId: version.versionId,
      decisions: [],
      manualFieldIds: [],
    }).success,
    false,
  );
});

test("copied custom choices compare only through their verified source-owned mapping", () => {
  const source = detail([length("1")]);
  const custom = {
    id: randomUUID(),
    sectionId: section,
    kind: "select",
    label: "Custom choice",
    required: false,
    semanticId: null,
    help: "",
    illustrationId: null,
    choices: [
      { id: randomUUID(), label: "A", active: true, illustrationId: null },
    ],
  };
  source.document.customFields = [custom];
  source.document.values.push({
    kind: "select",
    fieldId: custom.id,
    choiceId: custom.choices[0].id,
  });
  const cloned = cloneMeasurementCustomFields(
    source,
    source.document.schema,
    randomUUID,
  );
  const target = structuredClone(source);
  target.profileId = randomUUID();
  target.versionId = randomUUID();
  target.document.customFields = cloned.fields;
  target.document.values = [
    source.document.values[0],
    mappedMeasurementValue(
      [custom],
      cloned.fields[0],
      source.document.values,
      cloned.decisions[0],
    ),
  ];
  target.document.origin = {
    kind: "copy",
    sourceProfileId: source.profileId,
    sourceVersionId: source.versionId,
    decisions: cloned.decisions,
    manualFieldIds: [],
    editedMetadata: [],
  };
  let compared = compareMeasurements([source, target], "cm");
  assert.equal(compared.rows[1].cells[1].status, "same");
  target.document.origin = { kind: "manual" };
  compared = compareMeasurements([source, target], "cm");
  assert.equal(compared.rows[1].cells[1].status, "missing-in-target");
});

test("historical cross-basis trend candidates are incompatible gaps, never missing zeroes", () => {
  const anchor = {
    ...chest,
    id: randomUUID(),
    basis: "garment",
    semanticId: "garment.chest.circumference",
  };
  const projected = projectMeasurementTrend(
    {
      anchorField: anchor,
      items: [
        {
          versionId: randomUUID(),
          measuredOn: "2026-11-03",
          recordedAt: "2026-11-03T10:00:00+00:00",
          transformed: false,
          fields: [chest],
          values: [length("38")],
        },
      ],
      next: null,
    },
    "cm",
  );
  assert.equal(projected.items[0].status, "incompatible");
  assert.equal(projected.items[0].decimal, null);
  assert.equal(projected.items[0].original, "38 in");
});

test("delta presentation labels rounding while retaining exact signed ratios", () => {
  assert.deepEqual(
    displayMeasurementRatio({
      numerator: "254000000",
      denominator: "100000000",
    }),
    { decimal: "2.54", approximate: false },
  );
  assert.deepEqual(
    displayMeasurementRatio({ numerator: "1", denominator: "254000000" }),
    { decimal: "0.0000000039", approximate: true },
  );
  assert.deepEqual(
    displayMeasurementRatio({ numerator: "-1", denominator: "10" }),
    { decimal: "-0.1", approximate: false },
  );
  assert.deepEqual(
    displayMeasurementRatio({ numerator: "0", denominator: "10" }),
    { decimal: "0", approximate: false },
  );
});
