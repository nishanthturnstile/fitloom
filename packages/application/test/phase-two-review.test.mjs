import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { sqlState } from "../dist/errors.js";
import { saveGarment } from "../dist/masters.js";
import { bodyCoreV1 } from "../dist/measurement-body-schema.js";
import * as c from "../dist/measurement-contracts.js";
import { mappedMeasurementValue } from "../dist/measurement-reuse.js";
import { validateMeasurementValues } from "../dist/measurement-values.js";

test("master mutations preserve transient SQL states for the executor retry loop", async () => {
  for (const code of ["40001", "40P01"]) {
    const driver = Object.assign(new Error("Synthetic transient failure"), {
      code,
    });
    await assert.rejects(
      saveGarment.mutate(
        {
          execute: async () => {
            throw driver;
          },
        },
        {},
        {},
      ),
      (error) => sqlState(error) === code,
    );
  }
});

test("standard garment bounds use centimetres while custom bounds retain display units", () => {
  const standard = {
    ...bodyCoreV1().fields[0],
    displayUnit: "in",
    min: null,
    max: "100",
  };
  const custom = { ...standard, id: randomUUID(), label: "Custom length" };
  const value = (field, decimal) => ({
    kind: "length",
    fieldId: field.id,
    decimal,
    unit: "cm",
  });
  const issues = validateMeasurementValues({
    fields: [standard, custom],
    values: [value(standard, "150"), value(custom, "150")],
    canonicalLengthFieldIds: [standard.id],
  });
  assert.deepEqual(
    issues.map((issue) => issue.fieldId),
    [standard.id],
  );
  assert.deepEqual(
    validateMeasurementValues({
      fields: [standard],
      values: [value(standard, "100")],
      canonicalLengthFieldIds: [standard.id],
    }),
    [],
  );
});

test("an explicitly omitted select mapping cannot fall back to the same source choice", () => {
  const choiceId = randomUUID();
  const field = {
    id: randomUUID(),
    sectionId: randomUUID(),
    label: "Shape",
    semanticId: null,
    required: false,
    help: "",
    illustrationId: null,
    kind: "select",
    choices: [
      { id: choiceId, label: "Selected", illustrationId: null, active: true },
    ],
  };
  const decision = c.measurementMappingDecision.parse({
    rule: "identity",
    sourceFieldId: field.id,
    targetFieldId: field.id,
    choices: [{ sourceChoiceId: choiceId, targetChoiceId: null }],
  });
  assert.equal(
    mappedMeasurementValue(
      [field],
      field,
      [{ kind: "select", fieldId: field.id, choiceId }],
      decision,
    ),
    null,
  );
});

test("only revisions can retain server-owned provenance", () => {
  const input = {
    customerId: randomUUID(),
    wearerId: randomUUID(),
    profileId: randomUUID(),
    versionId: randomUUID(),
    schemaRef: { kind: "body", bundleVersion: "body-core-v1" },
    label: "Retained source",
    measuredOn: "2020-01-02",
    values: [
      {
        kind: "length",
        fieldId: bodyCoreV1().fields[0].id,
        decimal: "38",
        unit: "in",
      },
    ],
    customFields: [],
    notes: null,
    sourceNote: null,
    origin: { kind: "retain" },
    expectedRevision: 1,
  };
  assert.equal(c.measurementRevise.safeParse(input).success, true);
  const { expectedRevision, ...create } = input;
  assert.equal(c.measurementCreate.safeParse(create).success, false);
  assert.equal(
    c.measurementRevise.safeParse({
      ...input,
      origin: {
        kind: "imported",
        batchId: randomUUID(),
        recordId: randomUUID(),
      },
    }).success,
    false,
  );
});
