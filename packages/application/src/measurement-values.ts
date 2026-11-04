import { z } from "zod";
import { measurementField, schemaNodeId } from "./master-contracts.js";
import {
  MEASUREMENT_MAX_FIELDS,
  type MeasurementDecimal,
  type MeasurementUnit,
  measurementDecimal,
  measurementValues,
} from "./measurement-contracts.js";

const SCALE = 1000000n;
function scaled(value: string): bigint {
  const [integer = "0", fraction = ""] = value.replace(/^-/, "").split(".");
  return (
    BigInt(integer + fraction.padEnd(6, "0")) *
    (value.startsWith("-") ? -1n : 1n)
  );
}
// Both units are integers in a common exact basis. No division or tolerance in comparisons.
function quantity(decimal: MeasurementDecimal, unit: MeasurementUnit): bigint {
  return scaled(decimal) * (unit === "in" ? 254n : 100n);
}
export function compareLengths(input: {
  source: { decimal: MeasurementDecimal; unit: MeasurementUnit };
  target: { decimal: MeasurementDecimal; unit: MeasurementUnit };
}): -1 | 0 | 1 {
  const difference =
    quantity(input.source.decimal, input.source.unit) -
    quantity(input.target.decimal, input.target.unit);
  return difference < 0n ? -1 : difference > 0n ? 1 : 0;
}

// Presentation only. Return approximation explicitly; never feed this back into saved values.
export function displayLength(input: {
  decimal: MeasurementDecimal;
  unit: MeasurementUnit;
  displayUnit: MeasurementUnit;
  precision: number;
}): { decimal: string; approximate: boolean } {
  const precision = z.int().min(0).max(6).parse(input.precision);
  const numerator =
    quantity(input.decimal, input.unit) * 10n ** BigInt(precision);
  const denominator = SCALE * (input.displayUnit === "in" ? 254n : 100n);
  const negative = numerator < 0n;
  const magnitude = negative ? -numerator : numerator;
  const rounded = (magnitude + denominator / 2n) / denominator;
  const digits = rounded.toString().padStart(precision + 1, "0");
  const decimal =
    precision === 0
      ? digits
      : `${digits.slice(0, -precision)}.${digits.slice(-precision)}`;
  return {
    decimal: negative && rounded !== 0n ? `-${decimal}` : decimal,
    approximate: magnitude % denominator !== 0n,
  };
}
export function canonicalMeasurementDecimal(input: unknown): string {
  const value = measurementDecimal.parse(input);
  return value.includes(".")
    ? value.replace(/0+$/, "").replace(/\.$/, "")
    : value;
}

const fieldsSchema = z
  .array(measurementField)
  .max(MEASUREMENT_MAX_FIELDS)
  .superRefine((fields, ctx) => {
    const identities = new Set<string>();
    const unique = (id: string, path: (string | number)[]) => {
      if (identities.has(id))
        ctx.addIssue({
          code: "custom",
          path,
          message: "Duplicate field or choice identity",
        });
      identities.add(id);
    };
    fields.forEach((field, index) => {
      unique(field.id, [index, "id"]);
      if (field.kind === "select")
        field.choices.forEach((choice, choiceIndex) => {
          unique(choice.id, [index, "choices", choiceIndex, "id"]);
        });
    });
  });
export const measurementValueIssue = z.strictObject({
  fieldId: schemaNodeId,
  message: z.string().max(160),
});
export type MeasurementValueIssue = z.infer<typeof measurementValueIssue>;

// Current locked content is supplied only by the service for revisions. Copies/imports omit it.
// Definition lineage and custom identity lifecycle remain the storage owner's responsibility.
export function validateMeasurementValues(input: {
  fields: unknown;
  values: unknown;
  currentValues?: unknown;
  canonicalLengthFieldIds?: unknown;
}): MeasurementValueIssue[] {
  const fields = fieldsSchema.parse(input.fields);
  const values = measurementValues
    .min(1, "Enter at least one measurement")
    .parse(input.values);
  const current = measurementValues.parse(input.currentValues ?? []);
  const canonicalBounds = new Set(
    z
      .array(schemaNodeId)
      .max(MEASUREMENT_MAX_FIELDS)
      .parse(input.canonicalLengthFieldIds ?? []),
  );
  const byId = new Map(values.map((value) => [value.fieldId, value]));
  const definitions = new Map(fields.map((field) => [field.id, field]));
  const issues: MeasurementValueIssue[] = [];
  const issue = (
    fieldId: MeasurementValueIssue["fieldId"],
    message: string,
  ) => {
    if (issues.length < 30) issues.push({ fieldId, message });
  };
  for (const value of values)
    if (!definitions.has(value.fieldId))
      issue(value.fieldId, "This field is not in the pinned schema");
  for (const field of fields) {
    const value = byId.get(field.id);
    if (!value) {
      if (field.required)
        issue(field.id, "Enter a value for this required field");
      continue;
    }
    if (field.kind !== value.kind) {
      issue(field.id, "Value kind must match the field");
      continue;
    }
    switch (field.kind) {
      case "length":
        if (value.kind !== "length") break;
        for (const bound of ["min", "max"] as const) {
          const limit = field[bound];
          if (limit === null) continue;
          const difference =
            quantity(value.decimal, value.unit) -
            quantity(
              measurementDecimal.parse(limit),
              canonicalBounds.has(field.id) ? "cm" : field.displayUnit,
            );
          if (bound === "min" ? difference < 0n : difference > 0n)
            issue(field.id, `Value is outside the field ${bound}imum`);
        }
        break;
      case "number": {
        if (value.kind !== "number") break;
        const decimal = scaled(value.decimal);
        if (decimal % 10n ** BigInt(6 - field.decimalPlaces) !== 0n)
          issue(field.id, "Value has more decimal places than allowed");
        if (
          field.unit === "count" &&
          (value.decimal.startsWith("-") || decimal % SCALE !== 0n)
        )
          issue(field.id, "Count must be a nonnegative whole number");
        if (field.min !== null && decimal < scaled(field.min))
          issue(field.id, "Value is below the field minimum");
        if (field.max !== null && decimal > scaled(field.max))
          issue(field.id, "Value exceeds the field maximum");
        break;
      }
      case "text":
        if (
          value.kind === "text" &&
          (Array.from(value.text).length > field.maxLength ||
            (field.required && !value.text.trim()))
        )
          issue(field.id, "Enter text within the field limit");
        break;
      case "select": {
        if (value.kind !== "select") break;
        const choice = field.choices.find(
          (choice) => choice.id === value.choiceId,
        );
        const previous = current.find(
          (previous) => previous.fieldId === field.id,
        );
        const unchanged =
          previous?.kind === "select" && previous.choiceId === value.choiceId;
        if (!choice || (!choice.active && !unchanged))
          issue(field.id, "Choose an active option owned by this field");
        break;
      }
      case "boolean":
        break;
      default: {
        const exhaustive: never = field;
        throw new Error(`Unknown measurement field: ${exhaustive}`);
      }
    }
  }
  return issues;
}
