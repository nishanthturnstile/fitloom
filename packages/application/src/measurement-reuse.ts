import { type MeasurementField, schemaNodeId } from "./master-contracts.js";
import * as c from "./measurement-contracts.js";
import {
  canonicalMeasurementDecimal,
  compareLengths,
  displayLength,
} from "./measurement-values.js";

type Detail = ReturnType<typeof c.measurementDetail.parse>;
type Field = MeasurementField;
const scale = 1000000n;
function integer(decimal: string): bigint {
  const [whole = "0", fraction = ""] = decimal.replace(/^-/, "").split(".");
  return (
    BigInt(whole + fraction.padEnd(6, "0")) *
    (decimal.startsWith("-") ? -1n : 1n)
  );
}
function factor(unit: c.MeasurementUnit) {
  return unit === "in" ? 254n : 100n;
}
function fixed(value: bigint): string {
  const digits = (value < 0n ? -value : value).toString().padStart(7, "0");
  return `${value < 0n ? "-" : ""}${digits.slice(0, -6)}.${digits.slice(-6)}`;
}
export function addMeasurementEase(
  value: Extract<c.MeasurementValue, { kind: "length" }>,
  rule: Extract<c.MeasurementMappingDecision, { rule: "ease" }>,
) {
  const numerator =
      integer(value.decimal) * factor(value.unit) +
      integer(rule.decimal) * factor(rule.unit),
    denominator = factor(rule.resultUnit);
  if (numerator < 0n) throw Error("Ease produces a negative length");
  const rounded = (numerator + denominator / 2n) / denominator;
  const approximate = numerator % denominator !== 0n;
  if (approximate && !rule.acceptRounding)
    throw Error("Confirm rounding to six decimal places before applying ease");
  return {
    decimal: c.measurementLengthDecimal.parse(fixed(rounded)),
    unit: rule.resultUnit,
    approximate,
  };
}
export function measurementFieldMeaning(field: Field) {
  return field.semanticId?.replace(/^(body|garment)\./, "") ?? null;
}
export function mappingCompatible(
  source: Field,
  target: Field,
  rule: "identity" | "ease",
): boolean {
  if (source.kind !== target.kind) return false;
  if (
    source.semanticId !== null &&
    target.semanticId !== null &&
    (rule === "identity"
      ? source.semanticId !== target.semanticId
      : measurementFieldMeaning(source) !== measurementFieldMeaning(target))
  )
    return false;
  if (source.kind === "length" && target.kind === "length")
    return rule === "ease"
      ? source.basis === target.basis ||
          (source.basis === "body" && target.basis === "garment")
      : source.basis === target.basis;
  if (rule === "ease") return false;
  return (
    source.kind !== "number" ||
    target.kind !== "number" ||
    source.unit === target.unit
  );
}
export function mappedMeasurementValue(
  sourceFields: Field[],
  target: Field,
  values: c.MeasurementValue[],
  decision: c.MeasurementMappingDecision,
): c.MeasurementValue | null {
  const source = sourceFields.find((f) => f.id === decision.sourceFieldId);
  if (
    !source ||
    target.id !== decision.targetFieldId ||
    !mappingCompatible(source, target, decision.rule)
  )
    throw Error("These field meanings are incompatible");
  const value = values.find((v) => v.fieldId === source.id);
  if (!value) return null;
  if (decision.rule === "ease") {
    if (value.kind !== "length") throw Error("Ease requires a length");
    const sum = addMeasurementEase(value, decision);
    return c.measurementValue.parse({
      kind: "length",
      fieldId: target.id,
      decimal: sum.decimal,
      unit: sum.unit,
    });
  }
  if (value.kind === "select") {
    if (target.kind !== "select") throw Error("Selection kind changed");
    const mapped = decision.choices.find(
      (choice) => choice.sourceChoiceId === value.choiceId,
    );
    if (mapped?.targetChoiceId === null) return null;
    const choice = target.choices.find(
      (choice) => choice.id === (mapped?.targetChoiceId ?? value.choiceId),
    );
    if (!choice?.active) return null;
    return { ...value, fieldId: target.id, choiceId: choice.id };
  }
  return { ...value, fieldId: target.id };
}
export function cloneMeasurementCustomFields(
  source: Detail,
  target: c.MeasurementSchema,
  uuid: () => string,
) {
  const fields: Field[] = [],
    decisions: c.MeasurementMappingDecision[] = [];
  for (const field of source.document.customFields) {
    const id = schemaNodeId.parse(uuid()),
      sectionId =
        target.sections[0]?.id ??
        schemaNodeId.parse(c.MEASUREMENT_CUSTOM_SECTION_ID);
    const choices =
      field.kind === "select"
        ? field.choices.map((choice) => ({
            ...choice,
            id: schemaNodeId.parse(uuid()),
          }))
        : [];
    const next =
      field.kind === "select"
        ? { ...field, id, sectionId, choices }
        : { ...field, id, sectionId };
    fields.push(next);
    decisions.push({
      rule: "identity",
      sourceFieldId: field.id,
      targetFieldId: id,
      choices:
        field.kind === "select"
          ? field.choices.flatMap((choice, i) =>
              choices[i]
                ? [{ sourceChoiceId: choice.id, targetChoiceId: choices[i].id }]
                : [],
            )
          : [],
    });
  }
  return { fields, decisions };
}
export function sameMeasurementLineage(
  a: ReturnType<typeof c.measurementSchemaRef.parse>,
  b: ReturnType<typeof c.measurementSchemaRef.parse>,
) {
  return (
    a.kind === b.kind &&
    (a.kind === "body" || (b.kind === "garment" && a.garmentId === b.garmentId))
  );
}
export function suggestMeasurementSource(
  source: Detail,
  target: Field,
  targetRef: ReturnType<typeof c.measurementSchemaRef.parse>,
): Field | undefined {
  const fields = [
    ...source.document.schema.fields,
    ...source.document.customFields,
  ];
  const exact = sameMeasurementLineage(source.schemaRef, targetRef)
    ? source.document.schema.fields.find((f) => f.id === target.id)
    : undefined;
  if (exact && mappingCompatible(exact, target, "identity")) return exact;
  const candidates =
    target.semanticId === null
      ? []
      : fields.filter(
          (f) =>
            f.semanticId === target.semanticId &&
            mappingCompatible(f, target, "identity"),
        );
  return candidates.length === 1 ? candidates[0] : undefined;
}
export function measurementValueLabel(
  value: c.MeasurementValue | undefined,
  field: Field | undefined,
): string {
  if (!value) return "Not recorded";
  switch (value.kind) {
    case "length":
      return `${value.decimal} ${value.unit}`;
    case "number":
      return value.decimal;
    case "text":
      return value.text;
    case "boolean":
      return value.value ? "Yes" : "No";
    case "select":
      return field?.kind === "select"
        ? (field.choices.find((choice) => choice.id === value.choiceId)
            ?.label ?? "Unavailable selection")
        : "Unavailable selection";
    default: {
      const exhaustive: never = value;
      return exhaustive;
    }
  }
}
export function measurementDelta(
  a: c.MeasurementValue,
  b: c.MeasurementValue,
  unit: c.MeasurementUnit,
): ReturnType<typeof c.measurementRatio.parse> | null {
  if (a.kind === "length" && b.kind === "length")
    return {
      numerator: String(
        integer(b.decimal) * factor(b.unit) -
          integer(a.decimal) * factor(a.unit),
      ),
      denominator: String(scale * factor(unit)),
    };
  if (a.kind === "number" && b.kind === "number")
    return {
      numerator: String(integer(b.decimal) - integer(a.decimal)),
      denominator: String(scale),
    };
  return null;
}
function valueEqual(
  a: c.MeasurementValue,
  b: c.MeasurementValue,
  af: Field,
  bf: Field,
): boolean {
  if (a.kind !== b.kind) return false;
  switch (a.kind) {
    case "length":
      return (
        b.kind === "length" && compareLengths({ source: a, target: b }) === 0
      );
    case "number":
      return (
        b.kind === "number" &&
        canonicalMeasurementDecimal(a.decimal) ===
          canonicalMeasurementDecimal(b.decimal)
      );
    case "text":
      return b.kind === "text" && a.text === b.text;
    case "boolean":
      return b.kind === "boolean" && a.value === b.value;
    case "select":
      return (
        b.kind === "select" && af.id === bf.id && a.choiceId === b.choiceId
      );
    default: {
      const exhaustive: never = a;
      return exhaustive;
    }
  }
}
function selectionSame(
  a: Detail,
  b: Detail,
  af: Field,
  bf: Field,
  av: Extract<c.MeasurementValue, { kind: "select" }>,
  bv: Extract<c.MeasurementValue, { kind: "select" }>,
): boolean | null {
  if (af.id === bf.id) return av.choiceId === bv.choiceId;
  const forward =
    (b.document.origin.kind === "copy" ||
      b.document.origin.kind === "mapped") &&
    b.document.origin.sourceVersionId === a.versionId
      ? b.document.origin.decisions.find(
          (d) => d.sourceFieldId === af.id && d.targetFieldId === bf.id,
        )
      : undefined;
  const reverse =
    (a.document.origin.kind === "copy" ||
      a.document.origin.kind === "mapped") &&
    a.document.origin.sourceVersionId === b.versionId
      ? a.document.origin.decisions.find(
          (d) => d.sourceFieldId === bf.id && d.targetFieldId === af.id,
        )
      : undefined;
  if (forward?.rule === "identity") {
    const pair = forward.choices.find((p) => p.sourceChoiceId === av.choiceId);
    return pair ? pair.targetChoiceId === bv.choiceId : null;
  }
  if (reverse?.rule === "identity") {
    const pair = reverse.choices.find((p) => p.sourceChoiceId === bv.choiceId);
    return pair ? pair.targetChoiceId === av.choiceId : null;
  }
  return null;
}
export function compareMeasurements(
  versions: Detail[],
  unit: c.MeasurementUnit,
): ReturnType<typeof c.measurementComparison.parse> {
  const rows: ReturnType<typeof c.measurementComparison.parse>["rows"] = [],
    used = versions.map(() => new Set<string>());
  for (const [vi, version] of versions.entries())
    for (const field of [
      ...version.document.schema.fields,
      ...version.document.customFields,
    ]) {
      if (used[vi]?.has(field.id)) continue;
      const matches = versions.map((v) => {
        const fields = [
          ...v.document.schema.fields,
          ...v.document.customFields,
        ];
        const standard =
          version.document.schema.fields.some((f) => f.id === field.id) &&
          v.document.schema.fields.some((f) => f.id === field.id);
        const exact =
          sameMeasurementLineage(v.schemaRef, version.schemaRef) &&
          (standard || v.profileId === version.profileId)
            ? fields.find((f) => f.id === field.id)
            : undefined;
        const forward =
          (v.document.origin.kind === "copy" ||
            v.document.origin.kind === "mapped") &&
          v.document.origin.sourceVersionId === version.versionId
            ? v.document.origin.decisions.find(
                (d) => d.sourceFieldId === field.id,
              )
            : undefined;
        const reverse =
          (version.document.origin.kind === "copy" ||
            version.document.origin.kind === "mapped") &&
          version.document.origin.sourceVersionId === v.versionId
            ? version.document.origin.decisions.find(
                (d) => d.targetFieldId === field.id,
              )
            : undefined;
        const explicit = fields.find(
          (f) => f.id === (forward?.targetFieldId ?? reverse?.sourceFieldId),
        );
        if (explicit)
          return {
            field: explicit,
            compatible: mappingCompatible(field, explicit, "identity"),
          };
        if (exact)
          return {
            field: exact,
            compatible: mappingCompatible(field, exact, "identity"),
          };
        const candidates =
          field.semanticId === null
            ? []
            : fields.filter((f) => f.semanticId === field.semanticId);
        const same = candidates.length === 1 ? candidates[0] : undefined;
        const concept =
          field.semanticId === null
            ? []
            : fields.filter(
                (f) =>
                  measurementFieldMeaning(f) === measurementFieldMeaning(field),
              );
        return {
          field: same,
          compatible:
            candidates.length < 2 &&
            (!same || mappingCompatible(field, same, "identity")),
          incompatible: !same && (candidates.length > 1 || concept.length > 0),
        };
      });
      const baseField = matches[0]?.field,
        base = versions[0]?.document.values.find(
          (v) => v.fieldId === baseField?.id,
        );
      const cells: ReturnType<
        typeof c.measurementComparison.parse
      >["rows"][number]["cells"] = [];
      for (const [index, v] of versions.entries()) {
        const match = matches[index],
          f = match?.field,
          value = v.document.values.find((value) => value.fieldId === f?.id);
        if (f) used[index]?.add(f.id);
        const choiceSame =
          base?.kind === "select" &&
          value?.kind === "select" &&
          baseField &&
          f &&
          versions[0]
            ? selectionSame(versions[0], v, baseField, f, base, value)
            : undefined;
        const incompatible =
          !match?.compatible || match.incompatible || choiceSame === null;
        const status = incompatible
          ? "incompatible"
          : !base
            ? value
              ? "missing-in-source"
              : "missing-in-target"
            : !value
              ? "missing-in-target"
              : baseField &&
                  f &&
                  (choiceSame ?? valueEqual(base, value, baseField, f))
                ? "same"
                : "changed";
        cells.push({
          transformed:
            (v.document.origin.kind === "copy" ||
              v.document.origin.kind === "mapped") &&
            v.document.origin.decisions.some(
              (d) => d.targetFieldId === f?.id && d.rule === "ease",
            ),
          status,
          value: value ?? null,
          display: measurementValueLabel(value, f),
          converted:
            value?.kind === "length"
              ? displayLength({
                  decimal: value.decimal,
                  unit: value.unit,
                  displayUnit: unit,
                  precision: 6,
                })
              : null,
          delta:
            !incompatible && base && value
              ? measurementDelta(base, value, unit)
              : null,
        });
      }
      rows.push({
        key: `${version.profileId}/${field.id}`,
        label: field.label,
        basis: field.kind === "length" ? field.basis : null,
        cells,
      });
    }
  return c.measurementComparison.parse({
    unit,
    versions: versions.map((v) => ({
      profileId: v.profileId,
      versionId: v.versionId,
      label: v.document.label,
      measuredOn: v.measuredOn,
      sequence: v.sequence,
    })),
    rows,
  });
}
export function projectMeasurementTrend(
  raw: ReturnType<typeof c.measurementTrendRaw.parse>,
  unit: c.MeasurementUnit,
): ReturnType<typeof c.measurementTrend.parse> {
  const anchor = raw.anchorField;
  if (anchor.kind !== "length" && anchor.kind !== "number")
    throw Error("Choose a numeric dimension");
  return c.measurementTrend.parse({
    field: anchor,
    unit,
    next: raw.next,
    items: raw.items.map((point) => {
      const exact = point.fields.find((f) => f.id === anchor.id),
        semantic =
          anchor.semanticId === null
            ? []
            : point.fields.filter((f) => f.semanticId === anchor.semanticId),
        concept =
          anchor.semanticId === null
            ? []
            : point.fields.filter(
                (f) =>
                  measurementFieldMeaning(f) ===
                  measurementFieldMeaning(anchor),
              ),
        field =
          exact ??
          (semantic.length === 1
            ? semantic[0]
            : semantic.length === 0 && concept.length === 1
              ? concept[0]
              : undefined);
      const compatible = field && mappingCompatible(anchor, field, "identity");
      const value = point.values.find((value) => value.fieldId === field?.id);
      const status =
        (field && !compatible) ||
        (!exact &&
          (semantic.length > 1 ||
            (semantic.length === 0 && concept.length > 0)))
          ? "incompatible"
          : !value
            ? "missing"
            : "recorded";
      const display =
        status === "recorded" && value?.kind === "length"
          ? displayLength({
              decimal: value.decimal,
              unit: value.unit,
              displayUnit: unit,
              precision: 6,
            })
          : null;
      return {
        versionId: point.versionId,
        measuredOn: point.measuredOn,
        recordedAt: point.recordedAt,
        transformed: point.transformed,
        status,
        original: measurementValueLabel(value, field),
        decimal:
          status === "recorded"
            ? (display?.decimal ??
              (value?.kind === "number" ? value.decimal : null))
            : null,
        approximate: display?.approximate ?? false,
      };
    }),
  });
}

// Presentation of an exact signed ratio. This never participates in equality or saved values.
export function displayMeasurementRatio(
  ratio: ReturnType<typeof c.measurementRatio.parse>,
  precision = 10,
) {
  if (!Number.isInteger(precision) || precision < 0 || precision > 12)
    throw Error("Unsupported display precision");
  const numerator = BigInt(ratio.numerator),
    denominator = BigInt(ratio.denominator),
    negative = numerator < 0n,
    magnitude = (negative ? -numerator : numerator) * 10n ** BigInt(precision),
    rounded = (magnitude + denominator / 2n) / denominator;
  const digits = rounded.toString().padStart(precision + 1, "0");
  const text =
    precision === 0
      ? digits
      : `${digits.slice(0, -precision)}.${digits.slice(-precision)}`
          .replace(/0+$/, "")
          .replace(/\.$/, "");
  return {
    decimal: negative && rounded !== 0n ? `-${text}` : text,
    approximate: magnitude % denominator !== 0n,
  };
}
