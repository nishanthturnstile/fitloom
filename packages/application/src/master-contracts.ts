import { z } from "zod";
import { nonnegativeRateInput } from "./decimals.js";
import {
  SEMANTIC_REGISTRY,
  STARTER_BUNDLE_VERSION,
  STARTER_TEMPLATE_KEYS,
} from "./master-manifest.js";

export {
  MASTER_ILLUSTRATIONS,
  SEMANTIC_REGISTRY,
  STARTER_BUNDLE_VERSION,
  STARTER_TEMPLATE_KEYS,
} from "./master-manifest.js";
export const MASTER_DEFINITION_BYTES = 64 * 1024;
export const MASTER_REQUEST_BYTES = 128 * 1024;
export const garmentId = z
  .uuid()
  .transform((v) => v.toLowerCase())
  .brand<"GarmentId">();
export const garmentVersionId = z
  .uuid()
  .transform((v) => v.toLowerCase())
  .brand<"GarmentVersionId">();
export const serviceId = z
  .uuid()
  .transform((v) => v.toLowerCase())
  .brand<"ServiceId">();
export const addonId = z
  .uuid()
  .transform((v) => v.toLowerCase())
  .brand<"AddonId">();
export const schemaNodeId = z
  .uuid()
  .transform((v) => v.toLowerCase())
  .brand<"SchemaNodeId">();
export const masterVersionId = z
  .uuid()
  .transform((v) => v.toLowerCase())
  .brand<"MasterVersionId">();
export const masterLabel = z.string().trim().min(1).max(100);
export const masterRateInput = nonnegativeRateInput;
export const masterRate = z
  .string()
  .regex(/^(0|[1-9]\d{0,17})\.\d{6}$/)
  .brand<"UnitPrice">();
export const masterCurrency = z.literal("INR");
export const illustrationId = z.enum([
  "shirt",
  "blouse",
  "trouser",
  "dimension",
  "construction",
]);
export const semanticId = z.enum([
  "body.chest.circumference",
  "body.bust.circumference",
  "body.waist.circumference",
  "body.hip.circumference",
  "body.shoulder.width",
  "garment.chest.circumference",
  "garment.sleeve.length",
  "garment.body.length",
  "garment.inseam.length",
  "garment.outseam.length",
]);
const guidance = {
  help: z.string().trim().max(500),
  illustrationId: illustrationId.nullable(),
};
const choice = z.strictObject({
  id: schemaNodeId,
  label: masterLabel,
  illustrationId: illustrationId.nullable(),
  active: z.boolean(),
});
export const masterChoice = choice;
export const garmentSection = z.strictObject({
  id: schemaNodeId,
  label: masterLabel,
});
const decimalBound = z.string().regex(/^-?(0|[1-9]\d{0,17})(\.\d{1,6})?$/);
function scaled(value: string): bigint {
  const negative = value.startsWith("-");
  const [integer = "0", fraction = ""] = value.replace(/^-/, "").split(".");
  return BigInt(integer + fraction.padEnd(6, "0")) * (negative ? -1n : 1n);
}
const commonField = {
  id: schemaNodeId,
  label: masterLabel,
  sectionId: schemaNodeId,
  required: z.boolean(),
  semanticId: semanticId.nullable(),
  ...guidance,
};
const bounds = { min: decimalBound.nullable(), max: decimalBound.nullable() };
export const measurementField = z
  .discriminatedUnion("kind", [
    z.strictObject({
      ...commonField,
      kind: z.literal("length"),
      basis: z.enum(["body", "garment"]),
      displayUnit: z.enum(["in", "cm"]),
      displayPrecision: z.int().min(0).max(6),
      ...bounds,
    }),
    z.strictObject({
      ...commonField,
      kind: z.literal("number"),
      unit: z.enum(["count", "unitless"]),
      decimalPlaces: z.int().min(0).max(6),
      ...bounds,
    }),
    z.strictObject({
      ...commonField,
      kind: z.literal("text"),
      maxLength: z.int().min(1).max(500),
    }),
    z.strictObject({ ...commonField, kind: z.literal("boolean") }),
    z.strictObject({
      ...commonField,
      kind: z.literal("select"),
      choices: z.array(choice).min(1).max(30),
    }),
  ])
  .superRefine((field, ctx) => {
    if (field.semanticId !== null) {
      const semantic = SEMANTIC_REGISTRY[field.semanticId];
      if (field.kind !== semantic.kind || field.basis !== semantic.basis)
        ctx.addIssue({
          code: "custom",
          path: ["semanticId"],
          message: "Semantic identity is incompatible with field kind or basis",
        });
    }
    if (field.kind === "length" || field.kind === "number") {
      if (
        (field.min !== null && !decimalBound.safeParse(field.min).success) ||
        (field.max !== null && !decimalBound.safeParse(field.max).success)
      )
        return;
      if (
        field.min !== null &&
        field.max !== null &&
        scaled(field.max) < scaled(field.min)
      )
        ctx.addIssue({
          code: "custom",
          path: ["max"],
          message: "Maximum must be at least minimum",
        });
      for (const key of ["min", "max"] as const) {
        const value = field[key];
        if (
          value !== null &&
          (field.kind === "length" || field.unit === "count") &&
          value.startsWith("-")
        )
          ctx.addIssue({
            code: "custom",
            path: [key],
            message: "Bound must be nonnegative",
          });
        if (
          value !== null &&
          field.kind === "number" &&
          field.unit === "count" &&
          scaled(value) % 1000000n !== 0n
        )
          ctx.addIssue({
            code: "custom",
            path: [key],
            message: "Count bounds must be integers",
          });
      }
      if (
        field.kind === "number" &&
        field.unit === "count" &&
        field.decimalPlaces !== 0
      )
        ctx.addIssue({
          code: "custom",
          path: ["decimalPlaces"],
          message: "Count requires zero decimal places",
        });
    }
    if (
      field.kind === "select" &&
      field.required &&
      !field.choices.some((c) => c.active)
    )
      ctx.addIssue({
        code: "custom",
        path: ["choices"],
        message: "Required selection needs an active choice",
      });
  });
export const constructionGroup = z
  .strictObject({
    id: schemaNodeId,
    label: masterLabel,
    kind: z.enum(["single", "multiple"]),
    required: z.boolean(),
    ...guidance,
    choices: z.array(choice).min(1).max(30),
  })
  .superRefine((group, ctx) => {
    if (group.required && !group.choices.some((c) => c.active))
      ctx.addIssue({
        code: "custom",
        path: ["choices"],
        message: "Required group needs an active choice",
      });
  });
export const applicability = z.enum([
  "masculine",
  "feminine",
  "unisex",
  "unspecified",
]);
export const garmentDefinition = z
  .strictObject({
    formatVersion: z.literal(1),
    label: masterLabel,
    category: masterLabel,
    applicability,
    iconId: illustrationId.nullable(),
    ...guidance,
    sections: z.array(garmentSection).max(10),
    fields: z.array(measurementField).max(60),
    constructionGroups: z.array(constructionGroup).max(12),
    services: z
      .array(z.strictObject({ serviceId, savedLabel: masterLabel }))
      .max(20),
    addons: z
      .array(z.strictObject({ addonId, savedLabel: masterLabel }))
      .max(30),
    sourceVersionId: garmentVersionId.nullable(),
  })
  .superRefine((definition, ctx) => {
    const seen = new Set<string>();
    const unique = (id: string, path: (string | number)[]) => {
      if (seen.has(id))
        ctx.addIssue({ code: "custom", path, message: "Duplicate identity" });
      seen.add(id);
    };
    const sections = new Set(definition.sections.map((s) => s.id));
    definition.sections.forEach((s, i) => {
      unique(s.id, ["sections", i, "id"]);
    });
    definition.fields.forEach((f, i) => {
      unique(f.id, ["fields", i, "id"]);
      if (!sections.has(f.sectionId))
        ctx.addIssue({
          code: "custom",
          path: ["fields", i, "sectionId"],
          message: "Section must exist in this definition",
        });
      if (f.kind === "select")
        f.choices.forEach((c, n) => {
          unique(c.id, ["fields", i, "choices", n, "id"]);
        });
    });
    definition.constructionGroups.forEach((g, i) => {
      unique(g.id, ["constructionGroups", i, "id"]);
      g.choices.forEach((c, n) => {
        unique(c.id, ["constructionGroups", i, "choices", n, "id"]);
      });
    });
    for (const [key, ids] of [
      ["services", definition.services.map((s) => s.serviceId)],
      ["addons", definition.addons.map((a) => a.addonId)],
    ] as const) {
      const bindings = new Set<string>();
      ids.forEach((id, i) => {
        if (bindings.has(id))
          ctx.addIssue({
            code: "custom",
            path: [key, i],
            message: "Duplicate binding",
          });
        bindings.add(id);
      });
    }
  });
export type GarmentDefinition = z.infer<typeof garmentDefinition>;
export type MeasurementField = z.infer<typeof measurementField>;
export type SchemaNodeId = z.infer<typeof schemaNodeId>;

const version = z.int().nonnegative().max(2147483647);
const expectedVersion = z.int().positive().max(2147483647);
const serviceOverride = z.strictObject({
  serviceId,
  rateOverride: masterRateInput.nullable(),
});
const garmentSaveFields = {
  definition: garmentDefinition,
  baseRate: masterRateInput.nullable(),
  currency: masterCurrency,
  serviceOverrides: z.array(serviceOverride).max(20),
};
export const garmentSave = z
  .discriminatedUnion("mode", [
    z.strictObject({ mode: z.literal("create"), ...garmentSaveFields }),
    z.strictObject({
      mode: z.literal("update"),
      garmentId,
      expectedVersion,
      ...garmentSaveFields,
    }),
  ])
  .superRefine((payload, ctx) => {
    const ids = new Set<string>();
    const eligible = new Set(
      payload.definition.services.map((s) => s.serviceId),
    );
    payload.serviceOverrides.forEach((o, i) => {
      if (ids.has(o.serviceId) || !eligible.has(o.serviceId))
        ctx.addIssue({
          code: "custom",
          path: ["serviceOverrides", i, "serviceId"],
          message: "Each eligible service needs exactly one override",
        });
      ids.add(o.serviceId);
    });
    if (ids.size !== eligible.size)
      ctx.addIssue({
        code: "custom",
        path: ["serviceOverrides"],
        message: "Each eligible service needs an explicit nullable override",
      });
  });
export const serviceSave = z.discriminatedUnion("mode", [
  z.strictObject({ mode: z.literal("create"), label: masterLabel }),
  z.strictObject({
    mode: z.literal("update"),
    serviceId,
    expectedVersion,
    label: masterLabel,
  }),
]);
const addonFields = {
  label: masterLabel,
  amount: masterRateInput,
  currency: masterCurrency,
};
export const addonSave = z.discriminatedUnion("mode", [
  z.strictObject({ mode: z.literal("create"), ...addonFields }),
  z.strictObject({
    mode: z.literal("update"),
    addonId,
    expectedVersion,
    ...addonFields,
  }),
]);
export const garmentLifecycle = z.strictObject({
  garmentId,
  expectedVersion,
  active: z.boolean(),
});
export const serviceLifecycle = z.strictObject({
  serviceId,
  expectedVersion,
  active: z.boolean(),
});
export const addonLifecycle = z.strictObject({
  addonId,
  expectedVersion,
  active: z.boolean(),
});
export const masterKind = z.enum(["garment", "service", "addon"]);
export type MasterKind = z.infer<typeof masterKind>;
export const masterResources = {
  garment: "garments",
  service: "services",
  addon: "addons",
} as const satisfies Record<MasterKind, string>;
export function masterKindFromResource(
  resource: string | undefined,
): MasterKind | null {
  const match = (Object.keys(masterResources) as MasterKind[]).find(
    (kind) => masterResources[kind] === resource,
  );
  return match ?? null;
}
export const masterReorder = z
  .strictObject({
    kind: masterKind,
    movedId: z.uuid(),
    beforeId: z.uuid().nullable(),
    expectedCatalogVersion: version,
  })
  .refine((v) => v.movedId.toLowerCase() !== v.beforeId?.toLowerCase(), {
    path: ["beforeId"],
    message: "Move anchor must be a different record",
  });
export const masterVisibility = z.strictObject({
  expectedCatalogVersion: version,
  hideStandardGarments: z.boolean(),
  hideStandardServices: z.boolean(),
});
export const starterInstall = z.strictObject({
  bundleVersion: z.literal(STARTER_BUNDLE_VERSION),
  expectedCatalogVersion: version,
});
export const masterOperationEnvelope = z.strictObject({
  operationKey: z.string().min(1).max(200),
  correlationId: z.uuid(),
});
export const masterValidationIssue = z.strictObject({
  path: z.array(z.union([z.string().max(100), z.int().nonnegative()])).max(12),
  message: z.string().max(200),
});
export const masterError = z.strictObject({
  category: z.enum(["validation", "access", "conflict", "temporary"]),
  message: z.string().max(200),
  correlationId: z.uuid(),
  issues: z.array(masterValidationIssue).max(30).optional(),
});
export function masterIssues(
  error: z.ZodError,
): z.infer<typeof masterValidationIssue>[] {
  return error.issues.slice(0, 30).map((issue) => ({
    path: issue.path
      .slice(0, 12)
      .map((p) => (typeof p === "number" ? p : String(p).slice(0, 100))),
    message: issue.message.slice(0, 200),
  }));
}
export const masterCatalog = z.strictObject({
  catalogVersion: version,
  hideStandardGarments: z.boolean(),
  hideStandardServices: z.boolean(),
  starterBundleVersion: z.literal(STARTER_BUNDLE_VERSION).nullable(),
  supportedBundleVersion: z.literal(STARTER_BUNDLE_VERSION),
  installedTemplateKeys: z.array(z.enum(STARTER_TEMPLATE_KEYS)).max(5),
});
export const masterPageQuery = z.strictObject({
  search: z.string().trim().max(100).default(""),
  active: z.enum(["active", "inactive", "all"]).default("active"),
  origin: z.enum(["standard", "custom", "all"]).default("all"),
  applicability: applicability.optional(),
  visibility: z.enum(["available", "all"]).default("available"),
  offset: z.coerce.number().int().min(0).max(100000).default(0),
  limit: z.coerce.number().int().min(1).max(50).default(50),
});
const header = {
  id: z.uuid(),
  label: masterLabel,
  active: z.boolean(),
  version: expectedVersion,
  revision: expectedVersion,
  currentVersionId: masterVersionId,
};
const provenance = {
  origin: z.enum(["standard", "custom"]),
  templateKey: z.enum(STARTER_TEMPLATE_KEYS).nullable(),
};
export const garmentSummary = z.strictObject({
  ...header,
  ...provenance,
  applicability,
});
export const pricedGarmentSummary = garmentSummary.extend({
  baseRate: masterRate.nullable(),
  currency: masterCurrency,
});
export const serviceSummary = z.strictObject({ ...header, ...provenance });
export const addonSummary = z.strictObject(header);
export const pricedAddonSummary = addonSummary.extend({
  amount: masterRate,
  currency: masterCurrency,
});
const bindingState = z.enum(["active", "retired"]);
const detail = {
  garmentId,
  garmentVersionId,
  revision: expectedVersion,
  version: expectedVersion,
  definition: garmentDefinition,
  services: z.array(z.strictObject({ serviceId, bindingState })).max(20),
  addons: z.array(z.strictObject({ addonId, bindingState })).max(30),
};
export const garmentDetail = z.strictObject(detail);
export const pricedGarmentDetail = garmentDetail.extend({
  baseRate: masterRate.nullable(),
  currency: masterCurrency,
  serviceOverrides: z
    .array(z.strictObject({ serviceId, rateOverride: masterRate.nullable() }))
    .max(20),
});
export const versionMetadata = z.strictObject({
  id: masterVersionId,
  revision: expectedVersion,
  authorId: z.uuid(),
  createdLocationId: z.uuid(),
  operationId: z.uuid(),
  createdAt: z.iso.datetime({ offset: true }),
});
export const serviceVersion = versionMetadata.extend({
  serviceId,
  label: masterLabel,
});
export const addonVersion = versionMetadata.extend({
  addonId,
  label: masterLabel,
});
export const pricedAddonVersion = addonVersion.extend({
  amount: masterRate,
  currency: masterCurrency,
});
export function masterPageOf<T extends z.ZodType>(item: T) {
  return z.strictObject({
    items: z.array(item).max(50),
    total: z.int().nonnegative(),
    nextOffset: z.int().min(0).max(100000).nullable(),
    catalogVersion: version,
  });
}
export const garmentPage = masterPageOf(garmentSummary);
export const pricedGarmentPage = masterPageOf(pricedGarmentSummary);
export const servicePage = masterPageOf(serviceSummary);
export const addonPage = masterPageOf(addonSummary);
export const pricedAddonPage = masterPageOf(pricedAddonSummary);
export const masterHistoryPage = masterPageOf(versionMetadata);
export const catalogCommandResult = z.strictObject({ catalogVersion: version });
export const garmentSaveResult = catalogCommandResult.extend({
  garmentId,
  garmentVersionId,
  revision: expectedVersion,
  version: expectedVersion,
});
export const serviceSaveResult = catalogCommandResult.extend({
  serviceId,
  serviceVersionId: masterVersionId,
  revision: expectedVersion,
  version: expectedVersion,
});
export const addonSaveResult = catalogCommandResult.extend({
  addonId,
  addonVersionId: masterVersionId,
  revision: expectedVersion,
  version: expectedVersion,
});
export const garmentLifecycleResult = catalogCommandResult.extend({
  garmentId,
  version: expectedVersion,
  active: z.boolean(),
});
export const serviceLifecycleResult = catalogCommandResult.extend({
  serviceId,
  version: expectedVersion,
  active: z.boolean(),
});
export const addonLifecycleResult = catalogCommandResult.extend({
  addonId,
  version: expectedVersion,
  active: z.boolean(),
});
export const starterInstallResult = catalogCommandResult.extend({
  garmentIds: z.array(garmentId).max(3),
  serviceIds: z.array(serviceId).max(2),
});

export function masterInvocation<T extends z.ZodType>(payload: T) {
  return masterOperationEnvelope.extend({ payload });
}
export type GarmentId = z.infer<typeof garmentId>;
export type GarmentVersionId = z.infer<typeof garmentVersionId>;
export type ServiceId = z.infer<typeof serviceId>;
export type AddonId = z.infer<typeof addonId>;
export type GarmentSaveInput = z.input<typeof garmentSave>;
export type GarmentSave = z.infer<typeof garmentSave>;
export type GarmentDetail = z.infer<typeof garmentDetail>;
export type PricedGarmentDetail = z.infer<typeof pricedGarmentDetail>;
export type MasterCatalog = z.infer<typeof masterCatalog>;
export type MasterValidationIssue = z.infer<typeof masterValidationIssue>;
export const masterEmptyQuery = z.strictObject({});
export const masterHistoryQuery = z.strictObject({
  offset: z.coerce.number().int().min(0).max(100000).default(0),
});
export function masterCommandResponse<T extends z.ZodType>(result: T) {
  return z.strictObject({
    operationId: z.uuid(),
    replayed: z.boolean(),
    result,
  });
}
