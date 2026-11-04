import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { bodyCoreV1 } from "../dist/measurement-body-schema.js";
import {
  measurementCells,
  reviewMeasurementSchema,
} from "../dist/measurement-draft.js";

test("revision draft preserves false, zero, units and decimal spelling", () => {
  const cells = measurementCells([
    { kind: "boolean", fieldId: randomUUID(), value: false },
    { kind: "length", fieldId: "length", decimal: "0.000000", unit: "cm" },
    { kind: "number", fieldId: "number", decimal: "0" },
    { kind: "text", fieldId: "text", text: "Tamil அளவு" },
    { kind: "select", fieldId: "select", choiceId: "choice" },
  ]);
  assert.equal(Object.values(cells)[0].raw, "false");
  assert.deepEqual(cells.length, { raw: "0.000000", unit: "cm" });
  assert.equal(cells.number.raw, "0");
  assert.equal(cells.text.raw, "Tamil அளவு");
  assert.equal(cells.select.raw, "choice");
});
test("reviewed rebase matches identity or unique compatible semantic, never labels or changed basis", () => {
  const source = bodyCoreV1();
  const original = source.fields[0];
  const raw = { raw: "38.250000", unit: "in" };
  const target = structuredClone(source);
  target.fields[0] = {
    ...original,
    id: randomUUID(),
    label: "New chest label",
    displayUnit: "cm",
    max: "90",
  };
  target.fields[1] = {
    ...target.fields[1],
    id: randomUUID(),
    semanticId: null,
    label: original.label,
  };
  target.fields[2] = {
    ...target.fields[2],
    basis: "garment",
    semanticId: null,
  };
  target.fields = target.fields.slice(0, 3);
  const review = reviewMeasurementSchema({
    source,
    target,
    cells: { [original.id]: raw, [source.fields[2].id]: raw },
  });
  assert.deepEqual(review.cells[target.fields[0].id], raw);
  assert.equal(review.rows[0].status, "retained");
  assert.equal(review.rows[1].status, "missing");
  assert.equal(review.rows[2].status, "incompatible");
  assert.equal(
    review.rows.filter((row) => row.status === "source-only").length,
    3,
  );
  assert.deepEqual(raw, { raw: "38.250000", unit: "in" });
});
test("ambiguous semantics and removed choices leave target values missing for review", () => {
  const source = bodyCoreV1();
  const field = source.fields[0];
  source.fields.push({ ...field, id: randomUUID() });
  const target = structuredClone(source);
  target.fields = [{ ...field, id: randomUUID() }];
  let review = reviewMeasurementSchema({
    source,
    target,
    cells: { [field.id]: { raw: "1", unit: "in" } },
  });
  assert.equal(review.rows[0].status, "missing");
  const selection = {
    ...field,
    kind: "select",
    semanticId: null,
    choices: [
      { id: randomUUID(), label: "Old", active: true, illustrationId: null },
    ],
  };
  source.fields = [selection];
  target.fields = [{ ...selection, choices: [] }];
  review = reviewMeasurementSchema({
    source,
    target,
    cells: { [selection.id]: { raw: selection.choices[0].id, unit: "in" } },
  });
  assert.equal(review.rows[0].status, "incompatible");
  assert.deepEqual(review.cells, {});
});
