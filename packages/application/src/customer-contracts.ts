import { z } from "zod";
import { canonicalCustomerPhone } from "./customer-phone.js";

export const CUSTOMER_PROFILE_REQUEST_BYTES = 128 * 1024;
export const CUSTOMER_PERMISSIONS = [
  "customers.read",
  "customers.manage",
  "customers.archive",
  "customers.photos.read",
  "customers.photos.manage",
] as const;
export const customerId = z
  .uuid()
  .transform((value) => value.toLowerCase())
  .brand<"CustomerId">();
export const wearerId = z
  .uuid()
  .transform((value) => value.toLowerCase())
  .brand<"WearerId">();
export const duplicateReviewId = z
  .uuid()
  .transform((value) => value.toLowerCase())
  .brand<"DuplicateReviewId">();
export const customerOperationKey = z
  .uuidv4()
  .transform((value) => value.toLowerCase())
  .brand<"CustomerOperationKey">();

// SQL uses the same NFC and ASCII-only case folding for indexed identities.
export const normalizeCustomerSearch = (value: string) =>
  value
    .normalize("NFC")
    .trim()
    .replace(/[\t\n\v\f\r ]+/g, " ")
    .replace(/[A-Z]/g, (letter) => letter.toLowerCase());
export function customerText(max: number, multiline = false) {
  return z
    .string()
    .transform((value) => value.normalize("NFC").replace(/\r\n?/g, "\n").trim())
    .superRefine((value, context) => {
      const controls = /[\p{Cc}]/u;
      const checked = multiline ? value.replace(/[\n\t]/g, "") : value;
      if (
        !value ||
        Array.from(value).length > max ||
        controls.test(checked) ||
        /\p{Cs}/u.test(value)
      )
        context.addIssue({
          code: "custom",
          message: `Enter 1–${max} characters without control characters`,
        });
    });
}
export const customerName = z
  .string()
  .transform((value) =>
    value
      .normalize("NFC")
      .trim()
      .replace(/[\t\n\v\f\r ]+/g, " "),
  )
  .pipe(customerText(120));
const countryCode = z.string().regex(/^[A-Z]{2}$/);
export const customerSegment = z.enum(["new", "regular", "important", "bulk"]);
export const customerPreferences = z.strictObject({
  fit: customerText(1000, true).nullable(),
  fabric: customerText(1000, true).nullable(),
  design: customerText(1000, true).nullable(),
});
export const customerAddress = z.strictObject({
  line1: customerText(200).nullable(),
  line2: customerText(200).nullable(),
  city: customerText(100).nullable(),
  region: customerText(100).nullable(),
  postalCode: customerText(32).nullable(),
  countryCode,
});
export const customerTags = z
  .array(customerText(40))
  .max(20)
  .superRefine((tags, context) => {
    const seen = new Set<string>();
    tags.forEach((tag, index) => {
      const key = normalizeCustomerSearch(tag);
      if (seen.has(key))
        context.addIssue({
          code: "custom",
          path: [index],
          message: "Tags must be unique",
        });
      seen.add(key);
    });
  });
export const gstin = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/);
const profileFields = {
  name: customerName,
  phone: canonicalCustomerPhone.nullable(),
  email: z
    .string()
    .transform((value) => value.normalize("NFC").trim())
    .refine((value) => Array.from(value).length <= 254)
    .pipe(z.email())
    .nullable(),
  address: customerAddress.nullable(),
  taxCountryCode: countryCode.nullable(),
  gstin: gstin.nullable(),
  segment: customerSegment.nullable(),
  notes: customerText(2000, true).nullable(),
  preferences: customerPreferences,
  tags: customerTags,
};
function taxCountry(
  value: { taxCountryCode: string | null; gstin: string | null },
  context: z.RefinementCtx,
) {
  if (value.gstin !== null && value.taxCountryCode !== "IN")
    context.addIssue({
      code: "custom",
      path: ["gstin"],
      message: "Clear GSTIN before choosing another tax country",
    });
}
export const customerProfile = z
  .strictObject(profileFields)
  .superRefine(taxCountry);
export const savedCustomerProfile = customerProfile;

export const positiveProfileDecimal = z
  .string()
  .regex(/^(0|[1-9][0-9]{0,5})(\.[0-9]{1,6})?$/)
  .refine((value) => /[1-9]/.test(value), "Enter a positive decimal")
  .brand<"PositiveProfileDecimal">();
function scaled(value: z.infer<typeof positiveProfileDecimal>): bigint {
  const [whole = "0", fraction = ""] = value.split(".");
  return BigInt(whole) * 1000000n + BigInt(fraction.padEnd(6, "0"));
}
export const wearerHeight = z
  .strictObject({ value: positiveProfileDecimal, unit: z.enum(["cm", "in"]) })
  .transform((height, context) => {
    if (
      scaled(height.value) * (height.unit === "in" ? 254n : 100n) >
      300000000n * 100n
    )
      context.addIssue({
        code: "custom",
        path: ["value"],
        message: "Height must be at most 300 cm equivalent",
      });
    return height;
  });
export const wearerWeight = z
  .strictObject({ value: positiveProfileDecimal, unit: z.enum(["kg", "lb"]) })
  .transform((weight, context) => {
    if (
      scaled(weight.value) * (weight.unit === "lb" ? 45359237n : 100000000n) >
      700000000n * 100000000n
    )
      context.addIssue({
        code: "custom",
        path: ["value"],
        message: "Weight must be at most 700 kg equivalent",
      });
    return weight;
  });
export const wearerGender = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("unspecified") }),
  z.strictObject({
    kind: z.literal("self-described"),
    description: customerText(60),
  }),
]);
export const wearerAttributes = z.strictObject({
  relationship: customerText(60).nullable(),
  birthday: z.iso
    .date()
    .refine(
      (value) => !value.startsWith("0000-"),
      "Choose a valid calendar year",
    )
    .nullable(),
  gender: wearerGender,
  height: wearerHeight.nullable(),
  weight: wearerWeight.nullable(),
  notes: customerText(2000, true).nullable(),
  preferences: customerPreferences,
});
export const wearerProfile = wearerAttributes.extend({ name: customerName });
// The service supplies today's calendar date in the authorized shop timezone.
export function wearerBirthdayAllowed(
  birthday: string | null,
  shopToday: string,
): boolean {
  return birthday === null || birthday <= z.iso.date().parse(shopToday);
}
export const selfWearerIntent = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("none") }),
  z.strictObject({ kind: z.literal("self"), attributes: wearerAttributes }),
]);
const checkFirst = z.strictObject({ kind: z.literal("check-first") });
export const customerCreateIntent = z.discriminatedUnion("kind", [
  checkFirst,
  z.strictObject({
    kind: z.literal("keep-separate"),
    reviewId: duplicateReviewId,
  }),
]);
export const customerUpdatePhoneIntent = z.discriminatedUnion("kind", [
  checkFirst,
  z.strictObject({
    kind: z.literal("keep-duplicate-phone"),
    reviewId: duplicateReviewId,
  }),
]);
const version = z.int().positive();
export const customerCreate = z.strictObject({
  profile: customerProfile,
  selfWearer: selfWearerIntent,
  intent: customerCreateIntent,
});
export const customerUpdate = z.strictObject({
  customerId,
  expectedVersion: version,
  profile: customerProfile,
  intent: customerUpdatePhoneIntent,
});
export const customerLifecycle = z.strictObject({
  customerId,
  expectedVersion: version,
});
export const wearerCreate = z.strictObject({
  customerId,
  profile: wearerProfile,
});
export const wearerUpdate = z.strictObject({
  customerId,
  wearerId,
  expectedVersion: version,
  profile: wearerProfile,
});
export const wearerLifecycle = z.strictObject({
  customerId,
  wearerId,
  expectedVersion: version,
});
export const customerCommandPayloads = {
  "customer.create": customerCreate,
  "customer.update": customerUpdate,
  "customer.archive": customerLifecycle,
  "customer.restore": customerLifecycle,
  "wearer.create": wearerCreate,
  "wearer.update": wearerUpdate,
  "wearer.archive": wearerLifecycle,
  "wearer.restore": wearerLifecycle,
};
export const customerCommandName = z.enum([
  "customer.create",
  "customer.update",
  "customer.archive",
  "customer.restore",
  "wearer.create",
  "wearer.update",
  "wearer.archive",
  "wearer.restore",
]);
export function customerInvocation<T extends z.ZodType>(payload: T) {
  return z.strictObject({
    operationKey: customerOperationKey,
    correlationId: z.uuid(),
    payload,
  });
}
export const customerDirectoryQuery = z.strictObject({
  status: z.enum(["active", "archived", "all"]).default("active"),
  segment: customerSegment.nullable().default(null),
  offset: z.coerce.number().int().min(0).max(100000).default(0),
  limit: z.coerce.number().int().min(1).max(50).default(25),
});
export const customerSearchQuery = customerDirectoryQuery.extend({
  offset: z.int().min(0).max(100000).default(0),
  limit: z.int().min(1).max(50).default(25),
  search: z
    .string()
    .transform(normalizeCustomerSearch)
    .refine(
      (value) =>
        Array.from(value).length <= 120 && !/[\p{Cs}\p{Cc}]/u.test(value),
    )
    .default(""),
  tags: z.array(customerText(40)).max(5).default([]),
});
export const customerSummary = z.strictObject({
  id: customerId,
  name: customerName,
  phone: canonicalCustomerPhone.nullable(),
  segment: customerSegment.nullable(),
  archivedAt: z.iso.datetime({ offset: true }).nullable(),
  version,
  activeWearerCount: z.int().nonnegative(),
  savedWearerCount: z.int().nonnegative(),
});
export const customerPage = z.strictObject({
  items: z.array(customerSummary).max(50),
  total: z.int().nonnegative(),
  nextOffset: z.int().min(0).max(100000).nullable(),
});
export const customerContinuationQuery = z.strictObject({
  offset: z.coerce.number().int().min(0).max(100000).default(0),
  limit: z.coerce.number().int().min(1).max(50).default(25),
});
export const savedWearer = z.strictObject({
  id: wearerId,
  profile: wearerProfile,
  version,
  archivedAt: z.iso.datetime({ offset: true }).nullable(),
  effectiveActive: z.boolean(),
});
export const wearerPage = z.strictObject({
  items: z.array(savedWearer).max(50),
  total: z.int().nonnegative(),
  nextOffset: z.int().min(0).max(100000).nullable(),
});
export const customerActivity = z.strictObject({
  id: z.uuid(),
  wearerId: wearerId.nullable(),
  kind: z.enum([
    ...customerCommandName.options,
    "customer-photo.bind",
    "customer-photo.remove",
  ]),
  actor: z.enum(["You", "Shop staff"]),
  changedFields: z
    .array(z.string().regex(/^[a-zA-Z][a-zA-Z0-9.]{0,79}$/))
    .max(30),
  previousVersion: z.int().nonnegative(),
  nextVersion: version,
  createdAt: z.iso.datetime({ offset: true }),
});
export const customerActivityPage = z.strictObject({
  items: z.array(customerActivity).max(50),
  total: z.int().nonnegative(),
  nextOffset: z.int().min(0).max(100000).nullable(),
});
export const customerDetail = z.strictObject({
  id: customerId,
  profile: savedCustomerProfile,
  version,
  archivedAt: z.iso.datetime({ offset: true }).nullable(),
  wearers: wearerPage,
  capabilities: z.strictObject({
    manage: z.boolean(),
    archive: z.boolean(),
    photosRead: z.boolean(),
    photosManage: z.boolean(),
  }),
});
export const customerDurableResult = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("saved"),
    customerId,
    version,
    createdWearerId: wearerId.nullable(),
    changed: z.boolean(),
  }),
  z.strictObject({
    kind: z.literal("wearer-saved"),
    customerId,
    wearerId,
    version,
    changed: z.boolean(),
  }),
  z.strictObject({
    kind: z.literal("review-required"),
    reviewId: duplicateReviewId,
    candidateCount: z.int().positive(),
    expiresAt: z.iso.datetime({ offset: true }),
  }),
]);
export const customerIssue = z.strictObject({
  path: z
    .array(
      z.union([
        z.enum([
          "profile",
          "name",
          "phone",
          "countryCode",
          "display",
          "e164",
          "digits",
          "email",
          "address",
          "line1",
          "line2",
          "city",
          "region",
          "postalCode",
          "taxCountryCode",
          "gstin",
          "segment",
          "notes",
          "preferences",
          "fit",
          "fabric",
          "design",
          "tags",
          "selfWearer",
          "attributes",
          "relationship",
          "birthday",
          "gender",
          "description",
          "height",
          "weight",
          "unit",
          "value",
          "intent",
          "reviewId",
          "expectedVersion",
          "customerId",
          "wearerId",
          "operationKey",
          "kind",
          "search",
          "status",
          "offset",
          "limit",
        ]),
        z.int().nonnegative(),
      ]),
    )
    .max(12),
  message: customerText(200),
});
export const customerErrorCode = z.enum([
  "validation",
  "session-expired",
  "denied",
  "unavailable",
  "version-conflict",
  "operation-conflict",
  "busy",
  "rate-limit",
  "temporary",
  "body-too-large",
  "body-timeout",
  "invalid-response",
]);
export const customerErrorResponse = z.strictObject({
  outcome: z.literal("error"),
  category: z.enum(["validation", "access", "conflict", "temporary"]),
  code: customerErrorCode,
  message: customerText(200),
  issues: z.array(customerIssue).max(20),
  correlationId: z.uuid(),
});
export type CustomerId = z.infer<typeof customerId>;
export type WearerId = z.infer<typeof wearerId>;
export type DuplicateReviewId = z.infer<typeof duplicateReviewId>;
export type CustomerProfile = z.infer<typeof customerProfile>;
export type WearerProfile = z.infer<typeof wearerProfile>;

export const customerSavedResult = z.discriminatedUnion("kind", [
  customerDurableResult.options[0],
  customerDurableResult.options[1],
]);
export const duplicateCandidate = z.strictObject({
  customerId,
  name: customerName,
  phone: canonicalCustomerPhone.nullable(),
  archivedAt: z.iso.datetime({ offset: true }).nullable(),
  version,
});
export const customerResponse = z.discriminatedUnion("outcome", [
  z.strictObject({
    outcome: z.literal("saved"),
    result: customerSavedResult,
    correlationId: z.uuid(),
  }),
  z.strictObject({
    outcome: z.literal("review-required"),
    review: customerDurableResult.options[2]
      .omit({ kind: true })
      .extend({ candidates: z.array(duplicateCandidate).max(5) }),
    correlationId: z.uuid(),
  }),
  z.strictObject({
    outcome: z.literal("review-expired"),
    reviewId: duplicateReviewId,
    correlationId: z.uuid(),
  }),
  z.strictObject({
    outcome: z.literal("review-stale"),
    reviewId: duplicateReviewId,
    correlationId: z.uuid(),
  }),
  customerErrorResponse,
]);

export const customerReturnToken = z.uuidv4();
export const customerReturnDescriptor = z.strictObject({
  scope: z.strictObject({
    principalId: z.uuid(),
    tenantId: z.uuid(),
    locationId: z.uuid(),
  }),
  expiresAt: z.int().positive(),
  query: customerSearchQuery,
  view: z.enum(["table", "cards"]),
  focusedId: customerId.nullable(),
});
export type CustomerPage = z.infer<typeof customerPage>;
export type CustomerSearchQuery = z.infer<typeof customerSearchQuery>;
