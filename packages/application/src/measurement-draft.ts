import type { MeasurementField } from "./master-contracts.js";
import type {
  MeasurementSchema,
  MeasurementValue,
} from "./measurement-contracts.js";

export type MeasurementCell = { raw: string; unit: "in" | "cm" };
export function measurementCells(
  values: MeasurementValue[],
): Record<string, MeasurementCell> {
  return Object.fromEntries(
    values.map((value) => [
      value.fieldId,
      {
        raw:
          value.kind === "length" || value.kind === "number"
            ? value.decimal
            : value.kind === "text"
              ? value.text
              : value.kind === "boolean"
                ? String(value.value)
                : value.choiceId,
        unit: value.kind === "length" ? value.unit : "in",
      },
    ]),
  );
}
export function compatibleMeasurementFields(
  source: MeasurementField,
  target: MeasurementField,
): boolean {
  if (source.kind !== target.kind || source.semanticId !== target.semanticId)
    return false;
  if (source.kind === "length" && target.kind === "length")
    return source.basis === target.basis;
  if (source.kind === "number" && target.kind === "number")
    return source.unit === target.unit;
  return true;
}
// Same-family, same-profile schema review. Never infer meanings from labels or convert quantities.
export function reviewMeasurementSchema(input: {
  source: MeasurementSchema;
  target: MeasurementSchema;
  cells: Record<string, MeasurementCell>;
}) {
  const cells: Record<string, MeasurementCell> = {};
  const used = new Set<string>();
  const rows: {
    id: string;
    label: string;
    status: "retained" | "missing" | "incompatible" | "source-only";
  }[] = [];
  for (const target of input.target.fields) {
    const exact = input.source.fields.find((source) => source.id === target.id);
    const semantic =
      target.semanticId === null
        ? []
        : input.source.fields.filter(
            (source) =>
              source.semanticId === target.semanticId &&
              compatibleMeasurementFields(source, target),
          );
    const source = exact ?? (semantic.length === 1 ? semantic[0] : undefined);
    let status: (typeof rows)[number]["status"] = "missing";
    if (source) {
      used.add(source.id);
      const cell = input.cells[source.id];
      const choiceExists =
        target.kind !== "select" ||
        !cell?.raw ||
        target.choices.some((choice) => choice.id === cell.raw);
      if (compatibleMeasurementFields(source, target) && choiceExists) {
        status = "retained";
        if (cell) cells[target.id] = { ...cell };
      } else status = "incompatible";
    }
    rows.push({ id: target.id, label: target.label, status });
  }
  for (const source of input.source.fields)
    if (!used.has(source.id))
      rows.push({ id: source.id, label: source.label, status: "source-only" });
  return { cells, rows };
}
