import { randomUUID } from "node:crypto";
import { parse as parseCSV } from "csv-parse/sync";
import { z } from "zod";
import { requestHash } from "./commands.js";
import {
  customerName,
  customerProfile,
  customerText,
  normalizeCustomerSearch,
} from "./customer-contracts.js";
import { customerPhone } from "./customer-phone.js";
import * as c from "./import-contracts.js";
import { measurementField } from "./master-contracts.js";
import {
  MEASUREMENT_CUSTOM_SECTION_ID,
  measurementCustomFields,
  measurementSchema,
  measurementSchemaRef,
  measurementValues,
} from "./measurement-contracts.js";
import { mappingCompatible } from "./measurement-reuse.js";
import {
  canonicalMeasurementDecimal,
  validateMeasurementValues,
} from "./measurement-values.js";

type Group = z.infer<typeof c.importGroup>;
type Row = z.infer<typeof c.importMeasurementRow>;
type Manifest = z.infer<typeof c.importManifest>;
type Binding = z.infer<typeof c.importSchemaBinding>;
export class ImportFileError extends Error {}
const optional = (value: string | undefined, max: number, multiline = false) =>
  !value?.trim() ? null : customerText(max, multiline).parse(value);
const canonical = (v: unknown) => requestHash(v);
const preferences = { fit: null, fabric: null, design: null };
function csvCustomer(row: Record<string, string>) {
  const country = row.phone_country?.trim() ?? "",
    phone = row.phone?.trim() ?? "";
  if (Boolean(country) !== Boolean(phone))
    throw new ImportFileError("Supply both phone and country");
  const profile = customerProfile.parse({
    name: customerName.parse(row.customer_name),
    phone: phone
      ? customerPhone.parse({ countryCode: country, display: phone })
      : null,
    email: row.email?.trim() ? row.email.normalize("NFC").trim() : null,
    address: null,
    taxCountryCode: null,
    gstin: null,
    segment: null,
    notes: optional(row.notes, 2000, true),
    preferences,
    tags: [],
  });
  const sourceId = c.importSourceId.parse(row.source_customer_id);
  const wearerId = row.source_wearer_id?.trim(),
    wearerName = row.wearer_name?.trim();
  if (
    Boolean(wearerId) !== Boolean(wearerName) ||
    (!wearerId && row.relationship?.trim())
  )
    throw new ImportFileError("Supply both wearer identity and name");
  return {
    sourceId,
    profile,
    wearer: wearerId
      ? {
          sourceId: c.importSourceId.parse(wearerId),
          name: customerName.parse(wearerName),
          relationship: optional(row.relationship, 60),
        }
      : null,
  };
}
function normalizedJSON(value: unknown): unknown {
  if (typeof value === "string") return value.normalize("NFC");
  if (Array.isArray(value)) return value.map(normalizedJSON);
  if (value !== null && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        key === "label" && typeof item === "string"
          ? item.normalize("NFC").trim()
          : normalizedJSON(item),
      ]),
    );
  return value;
}
function csvMeasurement(row: Record<string, string>): Row {
  const sequence = z
    .string()
    .regex(/^[1-9]\d{0,9}$/)
    .transform(Number)
    .pipe(z.int().max(2147483647))
    .parse(row.source_version_sequence);
  return c.importMeasurementRow.parse({
    sourceId: row.source_measurement_id,
    sequence,
    sourceCustomerId: row.source_customer_id,
    sourceWearerId: row.source_wearer_id,
    label: row.profile_label,
    schemaKey: row.schema_key,
    measuredOn: row.measured_on,
    values: c.importValues.parse(
      normalizedJSON(JSON.parse(row.values_json ?? "")),
    ),
    customFields: c.importCustomFields.parse(
      row.custom_fields_json?.trim()
        ? normalizedJSON(JSON.parse(row.custom_fields_json))
        : [],
    ),
    notes: optional(row.notes, 2000, true),
    sourceAuthor: optional(row.source_author, 500),
  });
}
export function canonicalImportGroup(group: Group): unknown {
  if (group.family === "customers")
    return {
      ...group,
      profile: {
        ...group.profile,
        phone: group.profile.phone
          ? {
              countryCode: group.profile.phone.countryCode,
              e164: group.profile.phone.e164,
            }
          : null,
      },
      wearers: [...group.wearers].sort((a, b) =>
        a.sourceId < b.sourceId ? -1 : a.sourceId > b.sourceId ? 1 : 0,
      ),
    };
  return {
    ...group,
    versions: [...group.versions]
      .sort((a, b) => a.sequence - b.sequence)
      .map((v) => ({
        ...v,
        values: [...v.values]
          .sort((a, b) =>
            a.fieldKey < b.fieldKey ? -1 : a.fieldKey > b.fieldKey ? 1 : 0,
          )
          .map((x) =>
            x.kind === "number" || x.kind === "length"
              ? { ...x, decimal: canonicalMeasurementDecimal(x.decimal) }
              : x.kind === "text"
                ? { ...x, text: x.text.normalize("NFC") }
                : x,
          ),
        customFields: v.customFields.map((f) =>
          f.kind === "number" || f.kind === "length"
            ? {
                ...f,
                label: f.label.normalize("NFC").trim(),
                help: f.help.normalize("NFC"),
                min: f.min === null ? null : canonicalMeasurementDecimal(f.min),
                max: f.max === null ? null : canonicalMeasurementDecimal(f.max),
              }
            : f,
        ),
      })),
  };
}
export function parseImportFile(
  bytes: Uint8Array,
  family: z.infer<typeof c.importFamily>,
): z.infer<typeof c.importParsedFile> {
  if (bytes.byteLength > c.IMPORT_FILE_BYTES)
    throw new ImportFileError("CSV exceeds 1 MiB");
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new ImportFileError("CSV must be valid UTF-8");
  }
  let records: string[][];
  try {
    records = z.array(z.array(z.string())).parse(
      parseCSV(text.replace(/(?:\r?\n)+$/, ""), {
        bom: true,
        record_delimiter: ["\r\n", "\n"],
        max_record_size: c.IMPORT_RECORD_BYTES * 2 + 1024,
        skip_empty_lines: false,
        relax_quotes: false,
        relax_column_count: false,
      }),
    );
  } catch {
    throw new ImportFileError(
      "CSV has invalid quoting, column counts or record size",
    );
  }
  const header = records.shift();
  const columns: readonly string[] =
      family === "customers"
        ? [...c.importCustomerColumns]
        : [...c.importMeasurementColumns],
    required =
      family === "customers" ? columns.slice(0, 2) : columns.slice(0, 9);
  if (
    !header ||
    new Set(header).size !== header.length ||
    header.some((v) => !columns.includes(v)) ||
    required.some((v) => !header.includes(v))
  )
    throw new ImportFileError(
      "CSV header is missing, duplicated or unsupported",
    );
  if (!records.length || records.length > c.IMPORT_MAX_ROWS)
    throw new ImportFileError("Supply 1–200 CSV data rows");
  type Work = {
    sourceId: string | null;
    rows: number[];
    redundantRows: number[];
    issues: z.infer<typeof c.importRowIssue>[];
    customer: ReturnType<typeof csvCustomer> | null;
    wearers: Map<string, NonNullable<ReturnType<typeof csvCustomer>["wearer"]>>;
    versions: Row[];
    seen: Set<string>;
  };
  const groups = new Map<string, Work>(),
    wearerOwners = new Map<string, Set<Work>>(),
    versionOwners = new Map<string, Set<Work>>();
  const issue = (
    group: Work,
    row: number,
    path: (string | number)[],
    message: string,
  ) => {
    if (group.issues.length < 200)
      group.issues.push(
        c.importRowIssue.parse({ row, path: path.slice(0, 12), message }),
      );
  };
  for (const [index, cells] of records.entries()) {
    const row = index + 1;
    if (
      new TextEncoder().encode(cells.join(",")).byteLength >
      c.IMPORT_RECORD_BYTES
    )
      throw new ImportFileError("Decoded CSV record exceeds 64 KiB");
    const data = Object.fromEntries(
      header.map((key, i) => [key, cells[i] ?? ""]),
    );
    const source = c.importSourceId.safeParse(
      data[family === "customers" ? "source_customer_id" : "source_profile_id"],
    );
    const key = source.success ? `source:${source.data}` : `invalid:${row}`;
    let group = groups.get(key);
    if (!group) {
      group = {
        sourceId: source.success ? source.data : null,
        rows: [],
        redundantRows: [],
        issues: [],
        customer: null,
        wearers: new Map(),
        versions: [],
        seen: new Set(),
      };
      groups.set(key, group);
    }
    group.rows.push(row);
    try {
      if (!source.success)
        throw new ImportFileError("Supply a valid source identity");
      if (family === "customers") {
        const parsed = csvCustomer(data),
          hash = canonical(
            canonicalImportGroup({
              family: "customers",
              sourceId: parsed.sourceId,
              profile: parsed.profile,
              wearers: [],
            }),
          );
        if (group.customer) {
          const old = group.customer;
          if (
            hash !==
            canonical(
              canonicalImportGroup({
                family: "customers",
                sourceId: old.sourceId,
                profile: old.profile,
                wearers: [],
              }),
            )
          )
            throw new ImportFileError(
              "Customer columns differ within this source group",
            );
        } else group.customer = parsed;
        if (parsed.wearer) {
          const old = group.wearers.get(parsed.wearer.sourceId);
          if (old && canonical(old) !== canonical(parsed.wearer))
            throw new ImportFileError(
              "Wearer columns differ within this source group",
            );
          group.wearers.set(parsed.wearer.sourceId, parsed.wearer);
          const owners = wearerOwners.get(parsed.wearer.sourceId) ?? new Set();
          owners.add(group);
          wearerOwners.set(parsed.wearer.sourceId, owners);
        }
        const rowHash = canonical({ hash, wearer: parsed.wearer });
        if (group.seen.has(rowHash)) group.redundantRows.push(row);
        group.seen.add(rowHash);
      } else {
        const parsed = csvMeasurement(data);
        if (
          group.versions.some(
            (v) =>
              v.sourceId === parsed.sourceId || v.sequence === parsed.sequence,
          )
        )
          throw new ImportFileError(
            "Source version identities and sequences must be unique",
          );
        if (
          group.versions.some(
            (v) =>
              v.sourceCustomerId !== parsed.sourceCustomerId ||
              v.sourceWearerId !== parsed.sourceWearerId,
          )
        )
          throw new ImportFileError(
            "Every version must name the same source wearer",
          );
        group.versions.push(parsed);
        const owners = versionOwners.get(parsed.sourceId) ?? new Set();
        owners.add(group);
        versionOwners.set(parsed.sourceId, owners);
      }
    } catch (error) {
      if (error instanceof z.ZodError)
        for (const detail of error.issues.slice(0, 10))
          issue(
            group,
            row,
            detail.path.filter(
              (p) => typeof p === "string" || typeof p === "number",
            ),
            "Check the declared column or JSON field",
          );
      else
        issue(
          group,
          row,
          [],
          error instanceof ImportFileError
            ? error.message
            : "Invalid JSON value",
        );
    }
  }
  for (const owners of [...wearerOwners.values(), ...versionOwners.values()])
    if (owners.size > 1)
      for (const g of owners)
        issue(
          g,
          g.rows[0] ?? 1,
          [],
          "Source child identity belongs to more than one group",
        );
  return c.importParsedFile.parse({
    family,
    rowCount: records.length,
    groups: [...groups.values()].map((g) => {
      if (g.wearers.size > 20 || g.versions.length > 20)
        issue(g, g.rows[0] ?? 1, [], "Logical group exceeds 20 members");
      let payload: Group | null = null;
      if (!g.issues.length && g.sourceId) {
        if (family === "customers" && g.customer)
          payload = c.importCustomerGroup.parse({
            family,
            sourceId: g.sourceId,
            profile: g.customer.profile,
            wearers: [...g.wearers.values()].sort((a, b) =>
              a.sourceId < b.sourceId ? -1 : a.sourceId > b.sourceId ? 1 : 0,
            ),
          });
        else
          payload = c.importMeasurementGroup.parse({
            family,
            sourceId: g.sourceId,
            versions: g.versions.sort((a, b) => a.sequence - b.sequence),
          });
      }
      if (
        payload &&
        Buffer.byteLength(JSON.stringify(canonicalImportGroup(payload))) >
          c.IMPORT_GROUP_BYTES
      ) {
        issue(g, g.rows[0] ?? 1, [], "Logical group exceeds 512 KiB");
        payload = null;
      }
      return {
        sourceId: g.sourceId,
        rows: g.rows,
        redundantRows: g.redundantRows,
        payload,
        issues: g.issues,
      };
    }),
  });
}
export function createImportManifest(
  schemaKey: unknown,
  ref: unknown,
  input: unknown,
): Manifest {
  const schema = measurementSchema.parse(input),
    schemaRef = measurementSchemaRef.parse(ref);
  return c.importManifest.parse({
    formatVersion: 1,
    schemaKey: c.importSourceId.parse(schemaKey),
    schemaRef,
    schemaHash: canonical({ schemaRef, schema }),
    schema,
    aliases: schema.fields.map((field, index) => ({
      key: `f${String(index + 1).padStart(3, "0")}`,
      fieldId: field.id,
      choices:
        field.kind === "select"
          ? field.choices.map((choice, i) => ({
              key: `c${String(i + 1).padStart(3, "0")}`,
              choiceId: choice.id,
            }))
          : [],
    })),
  });
}
export function importTemplate(
  family: z.infer<typeof c.importFamily>,
  manifest?: Manifest,
): string {
  const quote = (v: string) => `"${v.replaceAll('"', '""')}"`;
  const columns: readonly string[] =
    family === "customers"
      ? c.importCustomerColumns
      : c.importMeasurementColumns;
  if (family === "customers")
    return (
      columns.join(",") +
      "\r\n" +
      [
        "customer_001",
        "Sample customer",
        "",
        "",
        "",
        "wearer_001",
        "Sample wearer",
        "self",
        "",
      ]
        .map(quote)
        .join(",") +
      "\r\n"
    );
  if (!manifest) return columns.join(",") + "\r\n";
  const values = manifest.schema.fields.flatMap<unknown>((f, i) => {
    const fieldKey = manifest.aliases[i]?.key;
    if (!fieldKey) return [];
    switch (f.kind) {
      case "length":
        return [
          {
            kind: f.kind,
            fieldKey,
            decimal: f.min ?? "1",
            unit: f.displayUnit,
          },
        ];
      case "number":
        return [{ kind: f.kind, fieldKey, decimal: f.min ?? "0" }];
      case "text":
        return [
          { kind: f.kind, fieldKey, text: "Sample".slice(0, f.maxLength) },
        ];
      case "boolean":
        return [{ kind: f.kind, fieldKey, value: false }];
      case "select": {
        const choice = f.choices.findIndex((c) => c.active);
        return choice < 0
          ? []
          : [
              {
                kind: f.kind,
                fieldKey,
                choiceKey: manifest.aliases[i]?.choices[choice]?.key,
              },
            ];
      }
    }
    return [];
  });
  return (
    columns.join(",") +
    "\r\n" +
    [
      "profile_001",
      "version_001",
      "1",
      "customer_001",
      "wearer_001",
      "Sample profile",
      manifest.schemaKey,
      "2020-01-02",
      JSON.stringify(values),
      "[]",
      "",
      "",
    ]
      .map(quote)
      .join(",") +
    "\r\n"
  );
}
export const preparedImportHistory = z.strictObject({
  profileId: z.uuid(),
  schemaRef: measurementSchemaRef,
  schema: measurementSchema,
  versions: z
    .array(
      z.strictObject({
        versionId: z.uuid(),
        sourceId: c.importSourceId,
        sourceSequence: z.int().positive(),
        sourceHash: c.importHash,
        label: customerText(120),
        measuredOn: measurementDate,
        values: measurementValues,
        customFields: measurementCustomFields,
        notes: customerText(2000, true).nullable(),
        sourceNote: customerText(500).nullable(),
      }),
    )
    .min(1)
    .max(20),
});

import { measurementDate } from "./measurement-contracts.js";
export function prepareImportHistory(
  group: z.infer<typeof c.importMeasurementGroup>,
  verified: { binding: Binding; source: Manifest; target: Manifest }[],
): z.infer<typeof preparedImportHistory> {
  const nodeIds = new Map<string, string>(),
    signatures = new Map<string, string>(),
    retired = new Set<string>(),
    previous = new Set<string>();
  let target: Manifest | undefined;
  const versions = group.versions.map((row) => {
    const selected = verified.find(
      (v) => v.binding.schemaKey === row.schemaKey,
    );
    if (!selected)
      throw new ImportFileError(
        "Bind every schema key to its exact source and current target",
      );
    if (
      target &&
      canonical(target.schemaRef) !== canonical(selected.target.schemaRef)
    )
      throw new ImportFileError(
        "A profile must use one reviewed target schema family",
      );
    target = selected.target;
    const { source, binding } = selected;
    if (
      source.schemaRef.kind !== selected.target.schemaRef.kind ||
      (source.schemaRef.kind === "garment" &&
        selected.target.schemaRef.kind === "garment" &&
        source.schemaRef.garmentId !== selected.target.schemaRef.garmentId)
    )
      throw new ImportFileError(
        "A source profile must stay in its body or garment schema family",
      );
    if (
      new Set(binding.mappings.map((m) => m.sourceKey)).size !==
      binding.mappings.length
    )
      throw new ImportFileError("Map each source field once");
    for (const mapping of binding.mappings) {
      if (!source.aliases.some((a) => a.key === mapping.sourceKey))
        throw new ImportFileError(
          "Mapping key is absent from its source manifest",
        );
      if (
        mapping.kind === "field" &&
        !selected.target.schema.fields.some(
          (f) => f.id === mapping.targetFieldId,
        )
      )
        throw new ImportFileError(
          "Mapping target is absent from the reviewed schema",
        );
    }
    const custom = row.customFields.map((f) => {
      if (retired.has(f.key))
        throw new ImportFileError("Retired custom keys cannot be reintroduced");
      const signature = JSON.stringify([
        f.kind,
        f.kind === "length" ? f.basis : null,
        f.kind === "number" ? f.unit : null,
      ]);
      if (signatures.has(f.key) && signatures.get(f.key) !== signature)
        throw new ImportFileError(
          "A custom key cannot change kind, basis or unit",
        );
      signatures.set(f.key, signature);
      const id = nodeIds.get(f.key) ?? randomUUID();
      nodeIds.set(f.key, id);
      const { key: _key, ...properties } = f;
      return measurementField.parse({
        ...properties,
        id,
        sectionId:
          selected.target.schema.sections[0]?.id ??
          MEASUREMENT_CUSTOM_SECTION_ID,
        semanticId: null,
        illustrationId: f.kind === "length" ? "dimension" : null,
        ...(f.kind === "select"
          ? {
              choices: f.choices.map((choice) => {
                const choiceKey = `${f.key}:${choice.key}`,
                  choiceId = nodeIds.get(choiceKey) ?? randomUUID();
                nodeIds.set(choiceKey, choiceId);
                return {
                  id: choiceId,
                  label: choice.label,
                  active: choice.active,
                  illustrationId: null,
                };
              }),
            }
          : {}),
      });
    });
    for (const key of previous)
      if (!row.customFields.some((f) => f.key === key)) retired.add(key);
    previous.clear();
    row.customFields.forEach((f) => {
      previous.add(f.key);
    });
    const sourceValues = measurementValues.parse(
      row.values.map((value) => {
        const index = row.customFields.findIndex(
          (f) => f.key === value.fieldKey,
        );
        const alias = source.aliases.find((a) => a.key === value.fieldKey);
        const field =
          index >= 0
            ? custom[index]
            : source.schema.fields.find((f) => f.id === alias?.fieldId);
        if (!field || field.kind !== value.kind)
          throw new ImportFileError("Unknown source field or value kind");
        const { fieldKey: _key, ...v } = value;
        if (value.kind === "select") {
          const definition = row.customFields[index];
          const choiceIndex =
            definition?.kind === "select"
              ? definition.choices.findIndex((c) => c.key === value.choiceKey)
              : -1;
          return {
            kind: "select",
            fieldId: field.id,
            choiceId:
              index >= 0 && field.kind === "select"
                ? field.choices[choiceIndex]?.id
                : alias?.choices.find((c) => c.key === value.choiceKey)
                    ?.choiceId,
          };
        }
        return { ...v, fieldId: field.id };
      }),
    );
    if (
      validateMeasurementValues({
        fields: [...source.schema.fields, ...custom],
        values: sourceValues,
        canonicalLengthFieldIds:
          selected.binding.sourceRef.kind === "garment"
            ? source.schema.fields.map((f) => f.id)
            : [],
      }).length
    )
      throw new ImportFileError(
        "Values do not satisfy the exact source manifest",
      );
    const usedTargets = new Set<string>();
    const values = row.values.flatMap<unknown>((value) => {
      if (value.fieldKey.startsWith("custom.")) {
        const index = row.customFields.findIndex(
            (f) => f.key === value.fieldKey,
          ),
          field = custom[index];
        if (!field) throw new ImportFileError("Unknown custom field key");
        const { fieldKey: _key, ...v } = value;
        if (value.kind === "select" && field.kind === "select") {
          const definition = row.customFields[index],
            choiceIndex =
              definition?.kind === "select"
                ? definition.choices.findIndex((x) => x.key === value.choiceKey)
                : -1;
          return [
            {
              kind: "select",
              fieldId: field.id,
              choiceId: field.choices[choiceIndex]?.id,
            },
          ];
        }
        return [{ ...v, fieldId: field.id }];
      }
      const alias = source.aliases.find((x) => x.key === value.fieldKey),
        sf = source.schema.fields.find((f) => f.id === alias?.fieldId);
      if (!alias || !sf || sf.kind !== value.kind)
        throw new ImportFileError(
          "Value key or kind is absent from its exact manifest",
        );
      const same =
          canonical(source.schemaRef) === canonical(selected.target.schemaRef),
        decision = binding.mappings.find((m) => m.sourceKey === value.fieldKey);
      if (decision?.kind === "drop") return [];
      if (
        decision?.kind === "field" &&
        decision.rule !== "identity" &&
        decision.rule !== sf.kind
      )
        throw new ImportFileError("Mapping rule must match the source kind");
      const targetId =
        decision?.kind === "field"
          ? decision.targetFieldId
          : same
            ? sf.id
            : null;
      if (!targetId)
        throw new ImportFileError(
          "Every source value needs a reviewed mapping or explicit drop",
        );
      const tf = selected.target.schema.fields.find((f) => f.id === targetId);
      if (!tf || !mappingCompatible(sf, tf, "identity"))
        throw new ImportFileError(
          "Incompatible field kind, semantic meaning, unit or basis",
        );
      if (usedTargets.has(tf.id))
        throw new ImportFileError("Map each target field once");
      usedTargets.add(tf.id);
      const { fieldKey: _key, ...v } = value;
      if (value.kind === "select") {
        const choice = alias.choices.find((c) => c.key === value.choiceKey),
          mapped =
            decision?.kind === "field"
              ? decision.choiceMappings.find(
                  (c) => c.sourceKey === value.choiceKey,
                )
              : null;
        if (
          !choice ||
          sf.kind !== "select" ||
          !sf.choices.some((c) => c.id === choice.choiceId && c.active)
        )
          throw new ImportFileError(
            "Choice key is not an active option owned by this field",
          );
        return [
          {
            kind: "select",
            fieldId: tf.id,
            choiceId: mapped?.targetChoiceId ?? (same ? choice.choiceId : null),
          },
        ];
      }
      return [{ ...v, fieldId: tf.id }];
    });
    const parsed = measurementValues.parse(values),
      fields = [...selected.target.schema.fields, ...custom];
    const issues = validateMeasurementValues({
      fields,
      values: parsed,
      canonicalLengthFieldIds:
        selected.binding.targetRef.kind === "garment"
          ? selected.target.schema.fields.map((f) => f.id)
          : [],
    });
    if (issues.length)
      throw new ImportFileError(
        "Values do not satisfy the reviewed target fields",
      );
    if (
      new Set(fields.map((f) => normalizeCustomerSearch(f.label))).size !==
      fields.length
    )
      throw new ImportFileError(
        "Custom labels must not duplicate displayed labels",
      );
    return {
      versionId: randomUUID(),
      sourceId: row.sourceId,
      sourceSequence: row.sequence,
      sourceHash: canonical(
        canonicalImportGroup({
          family: "measurements",
          sourceId: group.sourceId,
          versions: [row],
        }),
      ),
      label: row.label,
      measuredOn: row.measuredOn,
      values: parsed,
      customFields: custom,
      notes: row.notes,
      sourceNote: row.sourceAuthor,
    };
  });
  if (!target) throw new ImportFileError("Missing reviewed target schema");
  return preparedImportHistory.parse({
    profileId: randomUUID(),
    schemaRef: target.schemaRef,
    schema: target.schema,
    versions,
  });
}
