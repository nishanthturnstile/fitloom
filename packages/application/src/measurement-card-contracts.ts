import { z } from "zod";
import { customerText } from "./customer-contracts.js";
import { schemaNodeId } from "./master-contracts.js";
import {
  measurementDate,
  measurementDecimal,
  measurementLengthDecimal,
  measurementOwner,
  measurementProfileId,
  measurementUnit,
  measurementVersionId,
} from "./measurement-contracts.js";
export const measurementCardId = z
  .uuid()
  .transform((value) => value.toLowerCase())
  .brand<"MeasurementCardId">();
export const measurementCardPath = (id: unknown) =>
  `/measurement-cards/${measurementCardId.parse(id)}`;
export function measurementCardReturn(input: unknown): string | null {
  const parsed = measurementCardId.safeParse(input);
  return parsed.success ? measurementCardPath(parsed.data) : null;
}
const uniqueIds = (ids: string[]) => new Set(ids).size === ids.length;
export const measurementCardSelection = z.strictObject({
  profileId: measurementProfileId,
  versionId: measurementVersionId,
  fieldIds: z
    .array(schemaNodeId)
    .min(1)
    .max(30)
    .refine(uniqueIds, "Select each field once"),
});
export const measurementCardSelections = z
  .array(measurementCardSelection)
  .min(1)
  .max(10)
  .refine(
    (items) => uniqueIds(items.map((item) => item.versionId)),
    "Select each exact version once",
  );
export const measurementCardCreate = z.strictObject({
  ...measurementOwner,
  selections: measurementCardSelections,
  expiresInDays: z.int().min(1).max(30).default(7),
});
export const measurementCardRevoke = z.strictObject({
  ...measurementOwner,
  cardId: measurementCardId,
  expectedRevision: z.int().positive(),
  reason: customerText(1000),
});
export const measurementCardPayloads = {
  "measurement-card.create": measurementCardCreate,
  "measurement-card.revoke": measurementCardRevoke,
};
export const measurementCardCommandName = z.enum([
  "measurement-card.create",
  "measurement-card.revoke",
]);
const label = customerText(160);
export const measurementCardValue = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("length"),
    label,
    basis: z.enum(["body", "garment"]),
    decimal: measurementLengthDecimal,
    unit: measurementUnit,
  }),
  z.strictObject({
    kind: z.literal("number"),
    label,
    decimal: measurementDecimal,
    unit: z.string().max(40),
  }),
  z.strictObject({
    kind: z.literal("text"),
    label,
    text: z.string().max(4000),
  }),
  z.strictObject({ kind: z.literal("boolean"), label, value: z.boolean() }),
  z.strictObject({ kind: z.literal("select"), label, choiceLabel: label }),
  z.strictObject({
    kind: z.literal("missing"),
    label,
    basis: z.enum(["body", "garment"]).nullable(),
  }),
]);
export const measurementCardItem = z.strictObject({
  position: z.int().min(1).max(10),
  profileLabel: customerText(120),
  schemaLabel: customerText(100),
  measuredOn: measurementDate,
  sourceKind: z.enum(["manual", "copy", "mapped", "imported"]),
  values: z.array(measurementCardValue).min(1).max(30),
});
export const measurementCardProjection = z.strictObject({
  projectionVersion: z.literal(1),
  wearerLabel: customerText(120),
  warning: z.literal("Verify before cutting"),
  items: z.array(measurementCardItem).min(1).max(10),
});
export const measurementCardResolved = measurementCardProjection.extend({
  cardId: measurementCardId,
  issuedAt: z.string(),
  expiresAt: z.string(),
});
export const measurementCardResult = z.strictObject({
  kind: z.literal("measurement-card-saved"),
  cardId: measurementCardId,
  revision: z.int().positive(),
  changed: z.boolean(),
});
export const measurementCardResponse = z.strictObject({
  operationId: z.uuid(),
  replayed: z.boolean(),
  result: measurementCardResult,
});
export const measurementCardCursor = z.strictObject({
  createdAt: z.string().max(60),
  cardId: measurementCardId,
});
export const measurementCardListQuery = z.strictObject({
  ...measurementOwner,
  after: measurementCardCursor.nullable().default(null),
});
export const measurementCardList = z.strictObject({
  items: z
    .array(
      z.strictObject({
        cardId: measurementCardId,
        revision: z.int().positive(),
        issuedAt: z.string(),
        expiresAt: z.string(),
        revokedAt: z.string().nullable(),
        issuedByMe: z.boolean(),
        issuerAvailable: z.boolean(),
        selections: measurementCardSelections,
      }),
    )
    .max(25),
  next: measurementCardCursor.nullable(),
});
export const measurementCardPreviewQuery = measurementCardCreate.omit({
  expiresInDays: true,
});
export function measurementCardValueText(
  value: z.infer<typeof measurementCardValue>,
): string {
  switch (value.kind) {
    case "length":
      return `${value.decimal} ${value.unit} · ${value.basis} basis`;
    case "number":
      return `${value.decimal} ${value.unit}`;
    case "text":
      return value.text;
    case "boolean":
      return value.value ? "Yes" : "No";
    case "select":
      return value.choiceLabel;
    case "missing":
      return `Not recorded${value.basis ? ` · ${value.basis} basis` : ""}`;
    default: {
      const exhaustive: never = value;
      return exhaustive;
    }
  }
}
