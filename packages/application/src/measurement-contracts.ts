import { z } from "zod";
import { customerId, customerText, wearerId } from "./customer-contracts.js";
import {
  garmentId,
  garmentSection,
  garmentVersionId,
  measurementField,
  schemaNodeId,
} from "./master-contracts.js";

export const MEASUREMENT_REQUEST_BYTES = 128 * 1024;
export const MEASUREMENT_MAX_FIELDS = 80;
export const MEASUREMENT_MAX_CUSTOM_FIELDS = 20;
export const measurementProfileId = z
  .uuid()
  .transform((v) => v.toLowerCase())
  .brand<"MeasurementProfileId">();
export const measurementVersionId = z
  .uuid()
  .transform((v) => v.toLowerCase())
  .brand<"MeasurementVersionId">();
export const bodySchemaVersion = z
  .string()
  .regex(/^body-core-v[1-9]\d{0,5}$/)
  .brand<"BodySchemaVersion">();
export const measurementSchemaRef = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("body"), bundleVersion: bodySchemaVersion }),
  z.strictObject({
    kind: z.literal("garment"),
    garmentId,
    versionId: garmentVersionId,
  }),
]);

// Preserve the supplied decimal spelling. Presentation must never rewrite originals.
export const measurementDecimal = z
  .string()
  .max(26)
  .regex(
    /^-?(0|[1-9]\d{0,17})(\.\d{1,6})?$/,
    "Enter a decimal with up to 18 integer and 6 fractional digits",
  )
  .refine(
    (value) => !/^-0(?:\.0+)?$/.test(value),
    "Negative zero is not a measurement",
  )
  .brand<"MeasurementDecimal">();
export const measurementLengthDecimal = measurementDecimal.refine(
  (value) => !value.startsWith("-"),
  "Length must be nonnegative",
);
export const measurementUnit = z.enum(["in", "cm"]);
const fieldId = schemaNodeId;
export const measurementValue = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("length"),
    fieldId,
    decimal: measurementLengthDecimal,
    unit: measurementUnit,
  }),
  z.strictObject({
    kind: z.literal("number"),
    fieldId,
    decimal: measurementDecimal,
  }),
  z.strictObject({
    kind: z.literal("text"),
    fieldId,
    text: z
      .string()
      .max(1000)
      .refine(
        (v) => Array.from(v).length <= 500 && !/[\p{Cc}\p{Cs}]/u.test(v),
        "Enter plain text up to 500 characters",
      ),
  }),
  z.strictObject({ kind: z.literal("boolean"), fieldId, value: z.boolean() }),
  z.strictObject({
    kind: z.literal("select"),
    fieldId,
    choiceId: schemaNodeId,
  }),
]);
export const measurementValues = z
  .array(measurementValue)
  .max(MEASUREMENT_MAX_FIELDS)
  .superRefine((values, ctx) => {
    const seen = new Set<string>();
    values.forEach((value, index) => {
      if (seen.has(value.fieldId))
        ctx.addIssue({
          code: "custom",
          path: [index, "fieldId"],
          message: "Enter each field once",
        });
      seen.add(value.fieldId);
    });
  });

// Allowlisted value-free snapshot. Services, construction, rates and overrides are absent.
export const measurementSchema = z
  .strictObject({
    formatVersion: z.literal(1),
    label: z.string().trim().min(1).max(120),
    guidance: z.string().max(500),
    sections: z.array(garmentSection).max(10),
    fields: z.array(measurementField).max(60),
  })
  .superRefine((schema, ctx) => {
    const seen = new Set<string>();
    const unique = (id: string, path: (string | number)[]) => {
      if (seen.has(id))
        ctx.addIssue({
          code: "custom",
          path,
          message: "Duplicate schema identity",
        });
      seen.add(id);
    };
    const sections = new Set(schema.sections.map((section) => section.id));
    schema.sections.forEach((section, index) => {
      unique(section.id, ["sections", index, "id"]);
    });
    schema.fields.forEach((field, index) => {
      unique(field.id, ["fields", index, "id"]);
      if (!sections.has(field.sectionId))
        ctx.addIssue({
          code: "custom",
          path: ["fields", index, "sectionId"],
          message: "Section must exist",
        });
      if (field.kind === "select")
        field.choices.forEach((choice, choiceIndex) => {
          unique(choice.id, ["fields", index, "choices", choiceIndex, "id"]);
        });
    });
  });
export const measurementCurrentIntakeQuery = z.strictObject({
  customerId,
  wearerId,
  schemaRef: measurementSchemaRef,
});
export const measurementCurrentIntake = z.strictObject({
  schemaRef: measurementSchemaRef,
  schema: measurementSchema,
});
export const measurementDate = z.iso
  .date()
  .refine((value) => value >= "0001-01-01", "Choose a valid calendar year");
// shopToday must come from the authorized shop setting, never the client timezone.
export function measuredOnAllowed(
  measuredOn: unknown,
  shopToday: unknown,
): boolean {
  return measurementDate.parse(measuredOn) <= measurementDate.parse(shopToday);
}
export type MeasurementValue = z.infer<typeof measurementValue>;
export type MeasurementDecimal = z.infer<typeof measurementDecimal>;
export type MeasurementUnit = z.infer<typeof measurementUnit>;
export type MeasurementSchema = z.infer<typeof measurementSchema>;

// Save metadata and command envelopes. Provenance families land with reuse/import protocols.
export const MEASUREMENT_PERMISSIONS = [
  "measurements.read",
  "measurements.manage",
  "measurements.archive",
  "measurements.photos.read",
  "measurements.photos.manage",
  "measurements.cards.manage",
  "customers.import",
  "measurements.import",
] as const;

export const measurementOwner = { customerId, wearerId };
export const measurementProfileQuery = z.strictObject({
  ...measurementOwner,
  profileId: measurementProfileId,
});
export const measurementCaptureQuery = measurementProfileQuery.extend({
  versionId: measurementVersionId,
});
export const measurementExactQuery = measurementProfileQuery.extend({
  versionId: measurementVersionId.nullable().default(null),
});
const choiceMapping = z.strictObject({
  sourceChoiceId: schemaNodeId,
  targetChoiceId: schemaNodeId.nullable(),
});
const mappingNodes = {
  sourceFieldId: schemaNodeId,
  targetFieldId: schemaNodeId,
};
export const measurementMappingDecision = z.discriminatedUnion("rule", [
  z.strictObject({
    ...mappingNodes,
    rule: z.literal("identity"),
    choices: z.array(choiceMapping).max(30),
  }),
  z.strictObject({
    ...mappingNodes,
    rule: z.literal("ease"),
    decimal: measurementDecimal,
    unit: measurementUnit,
    resultUnit: measurementUnit,
    acceptRounding: z.boolean(),
  }),
]);
export const measurementMappingDecisions = z
  .array(measurementMappingDecision)
  .max(80)
  .superRefine((decisions, ctx) => {
    const ids = new Set<string>();
    for (const [index, d] of decisions.entries()) {
      if (ids.has(d.targetFieldId))
        ctx.addIssue({
          code: "custom",
          path: [index, "targetFieldId"],
          message: "Map each target once",
        });
      ids.add(d.targetFieldId);
    }
  });
const reuseOrigin = {
  sourceProfileId: measurementProfileId,
  sourceVersionId: measurementVersionId,
  decisions: measurementMappingDecisions,
};
export const measurementOriginInput = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("manual") }),
  z.strictObject({ kind: z.literal("copy"), ...reuseOrigin }),
  z.strictObject({ kind: z.literal("mapped"), ...reuseOrigin }),
]);
const provenanceEdits = {
  manualFieldIds: z.array(schemaNodeId).max(80),
  editedMetadata: z
    .array(
      z.enum(["label", "measuredOn", "notes", "sourceNote", "customFields"]),
    )
    .max(5),
};
export const measurementOrigin = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("manual") }),
  z.strictObject({
    kind: z.literal("imported"),
    batchId: z.uuid(),
    recordId: z.uuid(),
  }),
  z.strictObject({
    kind: z.literal("copy"),
    ...reuseOrigin,
    ...provenanceEdits,
  }),
  z.strictObject({
    kind: z.literal("mapped"),
    ...reuseOrigin,
    ...provenanceEdits,
  }),
]);
export const measurementCustomFields = z
  .array(measurementField)
  .max(MEASUREMENT_MAX_CUSTOM_FIELDS);
export const MEASUREMENT_MAX_PHOTOS = 5;
export const measurementPhotoReference = z.strictObject({
  fileId: z.uuid(),
  note: customerText(1000, true).nullable(),
});
export const measurementPhotoReferences = z
  .array(measurementPhotoReference)
  .max(MEASUREMENT_MAX_PHOTOS)
  .refine(
    (items) => new Set(items.map((item) => item.fileId)).size === items.length,
    "Each photo can appear once",
  );
export const measurementPhotoChange = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("retain") }),
  z.strictObject({
    kind: z.literal("replace"),
    reservationId: z.uuid().nullable(),
    items: measurementPhotoReferences,
  }),
]);
export const measurementPhotoProjection = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("restricted") }),
  z.strictObject({
    kind: z.literal("available"),
    items: z
      .array(measurementPhotoReference.extend({ revoked: z.boolean() }))
      .max(MEASUREMENT_MAX_PHOTOS),
  }),
]);
const content = {
  photos: measurementPhotoChange.default({ kind: "retain" }),
  ...measurementOwner,
  profileId: measurementProfileId,
  versionId: measurementVersionId,
  schemaRef: measurementSchemaRef,
  label: customerText(120),
  measuredOn: measurementDate,
  values: measurementValues.min(1),
  customFields: measurementCustomFields,
  notes: customerText(2000, true).nullable(),
  sourceNote: customerText(500).nullable(),
  origin: measurementOriginInput,
};
export const measurementCreate = z.strictObject(content);
export const measurementRevise = z.strictObject({
  ...content,
  origin: z.union([
    measurementOriginInput,
    z.strictObject({ kind: z.literal("retain") }),
  ]),
  expectedRevision: z.int().positive().max(2147483647),
});
export const measurementLifecycle = measurementProfileQuery.extend({
  expectedRevision: z.int().positive().max(2147483647),
});
export const measurementCommandPayloads = {
  "measurement.create": measurementCreate,
  "measurement.revise": measurementRevise,
  "measurement.archive": measurementLifecycle,
  "measurement.restore": measurementLifecycle,
};
export const measurementCommandName = z
  .object(measurementCommandPayloads)
  .keyof();
export const measurementInvocation = (payload: z.ZodType) =>
  z.strictObject({
    payload,
    operationKey: z.uuidv4().transform((v) => v.toLowerCase()),
    correlationId: z.uuid(),
  });
export const measurementResult = z.strictObject({
  kind: z.literal("measurement-saved"),
  correlationId: z.uuid(),
  profileId: measurementProfileId,
  versionId: measurementVersionId,
  revision: z.int().positive(),
  sequence: z.int().positive(),
  changed: z.boolean(),
});
export const measurementDocument = z.strictObject({
  schema: measurementSchema,
  label: customerText(120),
  values: measurementValues.min(1),
  customFields: measurementCustomFields,
  notes: customerText(2000, true).nullable(),
  sourceNote: customerText(500).nullable(),
  origin: measurementOrigin,
});
export const measurementDetail = z.strictObject({
  photos: measurementPhotoProjection.default({ kind: "restricted" }),
  ...measurementOwner,
  profileId: measurementProfileId,
  versionId: measurementVersionId,
  revision: z.int().positive(),
  sequence: z.int().positive(),
  currentVersionId: measurementVersionId,
  archivedAt: z.string().nullable(),
  measuredOn: measurementDate,
  recordedAt: z.string(),
  recordedBy: z.uuid(),
  recordedByLabel: z.string().min(1).max(240),
  priorVersionId: measurementVersionId.nullable(),
  schemaRef: measurementSchemaRef,
  document: measurementDocument,
  effectiveActive: z.boolean(),
});
export const measurementBookQuery = z.strictObject({
  ...measurementOwner,
  kind: z.enum(["all", "body", "garment"]).default("all"),
  garmentId: garmentId.nullable().default(null),
  status: z.enum(["active", "archived", "all"]).default("active"),
  search: z
    .string()
    .transform((v) => v.normalize("NFC").trim())
    .pipe(
      z
        .string()
        .max(240)
        .refine(
          (v) => Array.from(v).length <= 120 && !/[\p{Cc}\p{Cs}]/u.test(v),
        ),
    )
    .default(""),
  offset: z.int().min(0).max(100000).default(0),
  limit: z.int().min(1).max(50).default(25),
});
export const measurementBook = z.strictObject({
  items: z
    .array(
      z.strictObject({
        profileId: measurementProfileId,
        versionId: measurementVersionId,
        revision: z.int().positive(),
        sequence: z.int().positive(),
        kind: z.enum(["body", "garment"]),
        garmentId: garmentId.nullable(),
        archivedAt: z.string().nullable(),
        label: customerText(120),
        measuredOn: measurementDate,
      }),
    )
    .max(50),
  total: z.int().nonnegative(),
  nextOffset: z.int().nonnegative().nullable(),
});
export const measurementHistoryQuery = measurementProfileQuery.extend({
  beforeSequence: z.int().positive().nullable().default(null),
  limit: z.int().min(1).max(50).default(25),
});
export const measurementHistory = z.strictObject({
  items: z
    .array(
      z.strictObject({
        versionId: measurementVersionId,
        sequence: z.int().positive(),
        measuredOn: measurementDate,
        recordedAt: z.string(),
        label: customerText(120),
      }),
    )
    .max(50),
  nextBeforeSequence: z.int().positive().nullable(),
});
export const measurementErrorCode = z.enum([
  "session-expired",
  "body-too-large",
  "body-timeout",
  "validation",
  "denied",
  "unavailable",
  "version-conflict",
  "operation-conflict",
  "schema-stale",
  "configuration-unavailable",
  "busy",
  "rate-limit",
  "temporary",
]);
export const measurementIssue = z.strictObject({
  path: z.array(z.union([z.string().max(100), z.int().nonnegative()])).max(8),
  message: z.string().max(160),
});

export const measurementContextQuery = z.strictObject({
  ...measurementOwner,
  purpose: z.enum(["view", "entry"]).default("view"),
});
export const measurementContext = z.strictObject({
  ...measurementOwner,
  customerName: customerText(120),
  wearerName: customerText(120),
  active: z.boolean(),
  today: measurementDate.nullable(),
  bodySchemaRef: measurementSchemaRef,
  capabilities: z.strictObject({
    manage: z.boolean(),
    archive: z.boolean(),
    cardIssue: z.boolean().default(false),
    cardManage: z.boolean().default(false),
    photoRead: z.boolean().default(false),
    photoManage: z.boolean().default(false),
  }),
});
export const measurementGarmentQuery = z.strictObject({
  ...measurementOwner,
  search: measurementBookQuery.shape.search,
  offset: measurementBookQuery.shape.offset,
  limit: measurementBookQuery.shape.limit,
});
export const measurementGarments = z.strictObject({
  items: z
    .array(
      z.strictObject({
        garmentId,
        versionId: garmentVersionId,
        label: z.string().min(1).max(100),
        fieldCount: z.int().min(0).max(60),
      }),
    )
    .max(50),
  total: z.int().nonnegative(),
  nextOffset: z.int().nonnegative().nullable(),
});
export const measurementSaveResponse = z.strictObject({
  operationId: z.uuid(),
  replayed: z.boolean(),
  result: measurementResult,
});
export const measurementErrorResponse = z.strictObject({
  outcome: z.literal("error"),
  code: measurementErrorCode,
  category: z.enum(["validation", "access", "conflict", "temporary"]),
  message: z.string().max(500),
  issues: z.array(measurementIssue).max(30),
  correlationId: z.uuid(),
});
export const measurementBookFilters = measurementBookQuery.omit({
  customerId: true,
  wearerId: true,
});
export const measurementGarmentFilters = measurementGarmentQuery.omit({
  customerId: true,
  wearerId: true,
});
export const measurementHistoryFilters = measurementHistoryQuery.omit({
  customerId: true,
  wearerId: true,
  profileId: true,
});
export const MEASUREMENT_CUSTOM_SECTION_ID =
  "0745d19c-3171-44ae-bac3-000000000000";
export const measurementReturnDescriptor = z.strictObject({
  scope: z.strictObject({
    principalId: z.uuid(),
    tenantId: z.uuid(),
    locationId: z.uuid(),
  }),
  customerId,
  wearerId,
  query: measurementBookFilters,
  focusedId: measurementProfileId.nullable(),
  expiresAt: z.number().int().positive(),
});

export const measurementExactSelection = z.strictObject({
  profileId: measurementProfileId,
  versionId: measurementVersionId,
});
export const measurementCompareFilters = z.strictObject({
  versions: z.array(measurementExactSelection).min(2).max(4),
  unit: measurementUnit.default("cm"),
});
export const measurementCompareQuery =
  measurementCompareFilters.extend(measurementOwner);
export const measurementRatio = z.strictObject({
  numerator: z.string().regex(/^-?\d{1,60}$/),
  denominator: z.string().regex(/^[1-9]\d{0,59}$/),
});
export const measurementComparisonCell = z.strictObject({
  transformed: z.boolean(),
  status: z.enum([
    "same",
    "changed",
    "missing-in-source",
    "missing-in-target",
    "incompatible",
  ]),
  value: measurementValue.nullable(),
  display: z.string().max(1000),
  converted: z
    .strictObject({ decimal: z.string().max(80), approximate: z.boolean() })
    .nullable(),
  delta: measurementRatio.nullable(),
});
export const measurementComparison = z.strictObject({
  unit: measurementUnit,
  versions: z
    .array(
      z.strictObject({
        profileId: measurementProfileId,
        versionId: measurementVersionId,
        label: customerText(120),
        measuredOn: measurementDate,
        sequence: z.int().positive(),
      }),
    )
    .min(2)
    .max(4),
  rows: z
    .array(
      z.strictObject({
        key: z.string().max(160),
        label: z.string().max(120),
        basis: z.enum(["body", "garment"]).nullable(),
        cells: z.array(measurementComparisonCell).min(2).max(4),
      }),
    )
    .max(320),
});
export const measurementTrendCursor = z.strictObject({
  measuredOn: measurementDate,
  recordedAt: z.iso.datetime({ offset: true }),
  versionId: measurementVersionId,
});
export const measurementTrendFilters = z
  .strictObject({
    anchorVersionId: measurementVersionId,
    fieldId: schemaNodeId,
    from: measurementDate,
    to: measurementDate,
    unit: measurementUnit.default("cm"),
    after: measurementTrendCursor.nullable().default(null),
    limit: z.int().min(1).max(50).default(50),
  })
  .superRefine((q, ctx) => {
    const span = Date.parse(q.to) - Date.parse(q.from);
    if (span < 0 || span > 3660 * 86400000)
      ctx.addIssue({
        code: "custom",
        path: ["to"],
        message: "Choose a date window of at most 3660 days",
      });
  });
export const measurementTrendQuery = measurementTrendFilters.safeExtend({
  ...measurementOwner,
  profileId: measurementProfileId,
});
export const measurementTrendRaw = z.strictObject({
  anchorField: measurementField,
  items: z
    .array(
      z.strictObject({
        versionId: measurementVersionId,
        measuredOn: measurementDate,
        recordedAt: z.iso.datetime({ offset: true }),
        transformed: z.boolean(),
        fields: z.array(measurementField).max(80),
        values: measurementValues,
      }),
    )
    .max(50),
  next: measurementTrendCursor.nullable(),
});
export const measurementTrend = z.strictObject({
  field: measurementField,
  unit: measurementUnit,
  items: z
    .array(
      z.strictObject({
        versionId: measurementVersionId,
        measuredOn: measurementDate,
        recordedAt: z.string(),
        transformed: z.boolean(),
        status: z.enum(["recorded", "missing", "incompatible"]),
        original: z.string().max(80),
        decimal: z.string().max(80).nullable(),
        approximate: z.boolean(),
      }),
    )
    .max(50),
  next: measurementTrendCursor.nullable(),
});
export const measurementCapture = z.strictObject({
  immutable: z.strictObject({
    ...measurementOwner,
    profileId: measurementProfileId,
    versionId: measurementVersionId,
    sequence: z.int().positive(),
    measuredOn: measurementDate,
    recordedAt: z.string(),
    recordedBy: z.uuid(),
    priorVersionId: measurementVersionId.nullable(),
    schemaRef: measurementSchemaRef,
    document: measurementDocument,
  }),
  eligibility: z.strictObject({
    effectiveActive: z.boolean(),
    currentVersion: z.boolean(),
    schemaActive: z.boolean(),
    currentSchema: z.boolean(),
  }),
});
export type MeasurementMappingDecision = z.infer<
  typeof measurementMappingDecision
>;
export type MeasurementOriginInput = z.infer<typeof measurementOriginInput>;
