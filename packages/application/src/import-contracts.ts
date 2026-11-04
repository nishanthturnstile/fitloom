import { z } from "zod";
import {
  customerId,
  customerName,
  customerProfile,
  customerText,
  wearerId,
} from "./customer-contracts.js";
import {
  measurementDate,
  measurementSchema,
  measurementSchemaRef,
} from "./measurement-contracts.js";

export const IMPORT_REQUEST_BYTES = 3 * 1024 * 1024;
export const IMPORT_FILE_BYTES = 1024 * 1024;
export const IMPORT_RECORD_BYTES = 64 * 1024;
export const IMPORT_GROUP_BYTES = 512 * 1024;
export const IMPORT_MAX_ROWS = 200;
export const IMPORT_MAX_MEMBERS = 20;
export const IMPORT_CHUNK_DEADLINE_MS = 30000;
export const IMPORT_ATTEMPT_RESERVE_MS = 23000;
export const importFamily = z.enum(["customers", "measurements"]);
export const importFormat = z.enum([
  "fitloom-customers-v1",
  "fitloom-measurements-v1",
]);
export const importBatchId = z.uuid().brand<"ImportBatchId">();
export const importRecordId = z.uuid().brand<"ImportRecordId">();
export const importOperationKey = z.uuidv4().brand<"ImportOperationKey">();
export const importHash = z.string().regex(/^v1:[0-9a-f]{64}$/);
export const importSourceId = customerText(100);
export const importFieldKey = z
  .string()
  .regex(/^(?:f(?:00[1-9]|0[1-7][0-9]|080)|custom\.[a-z0-9_]{1,60})$/);
const standardFieldKey = z.string().regex(/^f(?:00[1-9]|0[1-7][0-9]|080)$/);
export const importChoiceKey = z.string().regex(/^[a-z0-9_]{1,40}$/);
const text = (max: number, empty = false) =>
  z
    .string()
    .regex(new RegExp(`^[^\\p{Cc}\\p{Cs}]{${empty ? 0 : 1},${max}}$`, "u"));
const decimal = z
  .string()
  .regex(/^(?!-0(?:\.0{1,6})?$)-?(?:0|[1-9]\d{0,17})(?:\.\d{1,6})?$/);
const lengthDecimal = z.string().regex(/^(?:0|[1-9]\d{0,17})(?:\.\d{1,6})?$/);
const unit = z.enum(["in", "cm"]);
export const importValue = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("length"),
    fieldKey: importFieldKey,
    decimal: lengthDecimal,
    unit,
  }),
  z.strictObject({
    kind: z.literal("number"),
    fieldKey: importFieldKey,
    decimal,
  }),
  z.strictObject({
    kind: z.literal("text"),
    fieldKey: importFieldKey,
    text: text(500, true),
  }),
  z.strictObject({
    kind: z.literal("boolean"),
    fieldKey: importFieldKey,
    value: z.boolean(),
  }),
  z.strictObject({
    kind: z.literal("select"),
    fieldKey: importFieldKey,
    choiceKey: importChoiceKey,
  }),
]);
export const importValues = z
  .array(importValue)
  .min(1)
  .max(80)
  .superRefine((values, ctx) => {
    if (new Set(values.map((v) => v.fieldKey)).size !== values.length)
      ctx.addIssue({
        code: "custom",
        message: "Each field key must occur once",
      });
    if (!values.some((v) => v.kind !== "text" || v.text.trim().length > 0))
      ctx.addIssue({
        code: "custom",
        message: "Enter at least one actual value",
      });
  });
const common = {
  key: z.string().regex(/^custom\.[a-z0-9_]{1,60}$/),
  label: text(100),
  required: z.boolean(),
  help: text(500, true),
};
export const importCustomField = z.discriminatedUnion("kind", [
  z.strictObject({
    ...common,
    kind: z.literal("length"),
    basis: z.enum(["body", "garment"]),
    displayUnit: unit,
    displayPrecision: z.int().min(0).max(6),
    min: lengthDecimal.nullable(),
    max: lengthDecimal.nullable(),
  }),
  z.strictObject({
    ...common,
    kind: z.literal("number"),
    unit: z.enum(["count", "unitless"]),
    decimalPlaces: z.int().min(0).max(6),
    min: decimal.nullable(),
    max: decimal.nullable(),
  }),
  z.strictObject({
    ...common,
    kind: z.literal("text"),
    maxLength: z.int().min(1).max(500),
  }),
  z.strictObject({ ...common, kind: z.literal("boolean") }),
  z.strictObject({
    ...common,
    kind: z.literal("select"),
    choices: z
      .array(
        z.strictObject({
          key: importChoiceKey,
          label: text(100),
          active: z.boolean(),
        }),
      )
      .min(1)
      .max(30),
  }),
]);
export const importCustomFields = z
  .array(importCustomField)
  .max(20)
  .superRefine((fields, ctx) => {
    if (new Set(fields.map((f) => f.key)).size !== fields.length)
      ctx.addIssue({ code: "custom", message: "Custom keys must be unique" });
    for (const [index, f] of fields.entries())
      if (
        f.kind === "select" &&
        (new Set(f.choices.map((c) => c.key)).size !== f.choices.length ||
          (f.required && !f.choices.some((c) => c.active)))
      )
        ctx.addIssue({
          code: "custom",
          path: [index, "choices"],
          message: "Choose unique options and an active required choice",
        });
  });
export const importCustomerColumns = [
  "source_customer_id",
  "customer_name",
  "phone_country",
  "phone",
  "email",
  "source_wearer_id",
  "wearer_name",
  "relationship",
  "notes",
] as const;
export const importMeasurementColumns = [
  "source_profile_id",
  "source_measurement_id",
  "source_version_sequence",
  "source_customer_id",
  "source_wearer_id",
  "profile_label",
  "schema_key",
  "measured_on",
  "values_json",
  "custom_fields_json",
  "notes",
  "source_author",
] as const;
export const importCustomerGroup = z.strictObject({
  family: z.literal("customers"),
  sourceId: importSourceId,
  profile: customerProfile,
  wearers: z
    .array(
      z.strictObject({
        sourceId: importSourceId,
        name: customerName,
        relationship: customerText(60).nullable(),
      }),
    )
    .max(20),
});
export const importMeasurementRow = z.strictObject({
  sourceId: importSourceId,
  sequence: z.int().min(1).max(2147483647),
  sourceCustomerId: importSourceId,
  sourceWearerId: importSourceId,
  label: customerText(120),
  schemaKey: importSourceId,
  measuredOn: measurementDate,
  values: importValues,
  customFields: importCustomFields,
  notes: customerText(2000, true).nullable(),
  sourceAuthor: customerText(500).nullable(),
});
export const importMeasurementGroup = z.strictObject({
  family: z.literal("measurements"),
  sourceId: importSourceId,
  versions: z.array(importMeasurementRow).min(1).max(20),
});
export const importGroup = z.discriminatedUnion("family", [
  importCustomerGroup,
  importMeasurementGroup,
]);
export const importRowIssue = z.strictObject({
  row: z.int().min(1).max(200),
  path: z.array(z.union([z.string().max(100), z.int().nonnegative()])).max(12),
  message: z.string().max(180),
});
export const importParsedGroup = z.strictObject({
  sourceId: importSourceId.nullable(),
  rows: z.array(z.int().min(1).max(200)).min(1).max(200),
  redundantRows: z.array(z.int().min(1).max(200)).max(200),
  payload: importGroup.nullable(),
  issues: z.array(importRowIssue).max(200),
});
export const importParsedFile = z.strictObject({
  family: importFamily,
  rowCount: z.int().min(1).max(200),
  groups: z.array(importParsedGroup).min(1).max(200),
});
export const importManifest = z.strictObject({
  formatVersion: z.literal(1),
  schemaKey: importSourceId,
  schemaRef: measurementSchemaRef,
  schemaHash: importHash,
  schema: measurementSchema,
  aliases: z
    .array(
      z.strictObject({
        key: z.string().regex(/^f\d{3}$/),
        fieldId: z.uuid(),
        choices: z
          .array(
            z.strictObject({
              key: z.string().regex(/^c\d{3}$/),
              choiceId: z.uuid(),
            }),
          )
          .max(30),
      }),
    )
    .max(80),
});
export const importSchemaBinding = z.strictObject({
  schemaKey: importSourceId,
  sourceRef: measurementSchemaRef,
  targetRef: measurementSchemaRef,
  mappings: z
    .array(
      z.discriminatedUnion("kind", [
        z.strictObject({
          kind: z.literal("field"),
          sourceKey: standardFieldKey,
          targetFieldId: z.uuid(),
          rule: z.enum([
            "identity",
            "length",
            "number",
            "text",
            "boolean",
            "select",
          ]),
          choiceMappings: z
            .array(
              z.strictObject({
                sourceKey: importChoiceKey,
                targetChoiceId: z.uuid(),
              }),
            )
            .max(30),
        }),
        z.strictObject({
          kind: z.literal("drop"),
          sourceKey: standardFieldKey,
          reason: customerText(500),
        }),
      ]),
    )
    .max(80),
});
export const importWearerDecision = z.strictObject({
  sourceId: importSourceId,
  action: z.discriminatedUnion("kind", [
    z.strictObject({ kind: z.literal("create") }),
    z.strictObject({ kind: z.literal("reuse"), wearerId }),
  ]),
});
export const importDecision = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("create") }),
  z.strictObject({ kind: z.literal("separate"), reason: customerText(500) }),
  z.strictObject({
    kind: z.literal("reuse"),
    customerId,
    wearers: z.array(importWearerDecision).max(20),
  }),
  z.strictObject({ kind: z.literal("owner"), customerId, wearerId }),
  z.strictObject({ kind: z.literal("skip"), reason: customerText(500) }),
]);
export const importState = z.enum([
  "pending",
  "in-progress",
  "created",
  "reused",
  "already-imported",
  "skipped",
  "needs-review",
  "failed",
  "cancelled",
]);
export const importCounts = z.strictObject({
  pending: z.int().nonnegative(),
  "in-progress": z.int().nonnegative(),
  created: z.int().nonnegative(),
  reused: z.int().nonnegative(),
  "already-imported": z.int().nonnegative(),
  skipped: z.int().nonnegative(),
  "needs-review": z.int().nonnegative(),
  failed: z.int().nonnegative(),
  cancelled: z.int().nonnegative(),
});
export const importEntityCounts = z.strictObject({
  customers: z.int().nonnegative(),
  wearers: z.int().nonnegative(),
  profiles: z.int().nonnegative(),
  versions: z.int().nonnegative(),
});
export const importResult = z.strictObject({
  kind: z.literal("import-saved"),
  batchId: importBatchId,
  recordId: importRecordId.nullable(),
  state: z.enum([
    "preview",
    "reviewed",
    "in-progress",
    "created",
    "reused",
    "already-imported",
    "skipped",
    "needs-review",
    "failed",
    "cancelled",
  ]),
  revision: z.int().positive(),
  counts: importEntityCounts,
});
export const importResponse = z.strictObject({
  operationId: z.uuid(),
  replayed: z.boolean(),
  result: importResult,
});
export const importRecord = z.strictObject({
  id: importRecordId,
  revision: z.int().positive(),
  state: importState,
  rows: z.array(z.int()).max(200),
  redundantRows: z.array(z.int()).max(200),
  sourceId: importSourceId.nullable(),
  payload: importGroup.nullable(),
  issues: z.array(importRowIssue).max(200),
  decision: importDecision.nullable(),
  candidates: z
    .array(
      z.strictObject({
        customerId,
        name: customerName,
        version: z.int().positive(),
        archivedAt: z.string().nullable(),
      }),
    )
    .max(200),
  candidateCount: z.int().nonnegative(),
  operationKey: importOperationKey,
  requestHash: importHash.nullable(),
  counts: importEntityCounts,
});
export const importBatch = z.strictObject({
  id: importBatchId,
  family: importFamily,
  state: z.enum(["preview", "running", "complete", "cancelled"]),
  revision: z.int().positive(),
  expiresAt: z.string(),
  purged: z.boolean(),
  namespace: importSourceId.nullable(),
  rowCount: z.int().nonnegative(),
  total: z.int().nonnegative(),
  counts: importCounts,
  csvRows: z.strictObject({
    total: z.int().nonnegative(),
    redundant: z.int().nonnegative(),
    invalid: z.int().nonnegative(),
  }),
  items: z.array(importRecord).max(25),
  nextOffset: z.int().nonnegative().nullable(),
});
export const importOutcomes = importBatch.extend({
  items: z.array(importRecord).max(IMPORT_MAX_ROWS),
  nextOffset: z.null(),
});
export const importPreviewRequest = z.strictObject({
  namespace: importSourceId,
  csv: z.string().max(IMPORT_REQUEST_BYTES),
  bindings: z.array(importSchemaBinding).max(20).default([]),
});
export const importReview = z.strictObject({
  batchId: importBatchId,
  recordId: importRecordId,
  expectedRevision: z.int().positive(),
  decision: importDecision,
  bindings: z.array(importSchemaBinding).max(20).default([]),
});
export const importCommit = z.strictObject({
  batchId: importBatchId,
  recordId: importRecordId,
  expectedRevision: z.int().positive(),
});
export const importBatchRequest = z.strictObject({ batchId: importBatchId });
export const importRecovery = z.strictObject({
  family: importFamily,
  batchId: importBatchId,
  logicalRecordId: importRecordId,
  operationKey: importOperationKey,
  requestHash: importHash,
});
export const importRecovered = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("committed"),
    operationId: z.uuid(),
    result: importResult,
  }),
  z.strictObject({ kind: z.literal("in-progress") }),
  z.strictObject({ kind: z.literal("unknown") }),
]);
export const importCommandEnvelope = <T extends z.ZodType>(payload: T) =>
  z.strictObject({
    operationKey: importOperationKey,
    correlationId: z.uuid(),
    payload,
  });
export const importErrorCode = z.enum([
  "validation",
  "denied",
  "session-expired",
  "unavailable",
  "needs-review",
  "expired",
  "busy",
  "rate-limit",
  "temporary",
  "body-too-large",
  "body-timeout",
]);
export const importErrorBody = z.strictObject({
  code: importErrorCode,
  message: z.string().max(200),
  correlationId: z.uuid(),
});
export function importJSONSchemas() {
  return {
    values: z.toJSONSchema(importValues, { io: "input" }),
    customFields: z.toJSONSchema(importCustomFields, { io: "input" }),
    manifest: z.toJSONSchema(importManifest, { io: "input" }),
  };
}

export const importBatchList = z.strictObject({
  items: z
    .array(
      z.strictObject({
        id: importBatchId,
        state: z.enum(["preview", "running", "complete", "cancelled"]),
        createdAt: z.string(),
        expiresAt: z.string(),
        rowCount: z.int().nonnegative(),
      }),
    )
    .max(25),
  nextOffset: z.int().nonnegative().nullable(),
});
