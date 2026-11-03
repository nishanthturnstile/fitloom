import { z } from "zod";
import {
  customerId,
  customerInvocation,
  customerText,
  wearerId,
} from "./customer-contracts.js";
export const photoOwner = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("customer-avatar"), customerId }),
  z.strictObject({
    kind: z.literal("wearer-photo"),
    customerId,
    wearerId,
    role: z.enum(["face", "body"]),
  }),
]);
export type PhotoOwner = z.infer<typeof photoOwner>;
export const photoSlot = z.strictObject({
  version: z.int().nonnegative(),
  photo: z
    .strictObject({
      fileId: z.uuid(),
      note: customerText(1000, true),
      createdAt: z.iso.datetime({ offset: true }),
    })
    .nullable(),
});
export const photoPayloads = {
  "customer-photo.begin": z.strictObject({ owner: photoOwner }),
  "customer-photo.bind": z.strictObject({
    owner: photoOwner,
    fileId: z.uuid(),
    fileVersion: z.int().positive(),
    expectedVersion: z.int().nonnegative(),
    note: customerText(1000, true),
  }),
  "customer-photo.remove": z.strictObject({
    owner: photoOwner,
    expectedVersion: z.int().nonnegative(),
  }),
};
export const photoCommandName = z.enum([
  "customer-photo.begin",
  "customer-photo.bind",
  "customer-photo.remove",
]);
export const photoResult = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("staged"),
    fileId: z.uuid(),
    version: z.literal(0),
  }),
  z.strictObject({
    kind: z.literal("photo-saved"),
    customerId,
    version: z.int().nonnegative(),
    changed: z.boolean(),
  }),
]);
export const photoCommandResponse = z.strictObject({
  outcome: z.literal("saved"),
  result: photoResult,
  correlationId: z.uuid(),
});
export const photoInvocation = customerInvocation;
export const photoUploadResult = z.strictObject({
  id: z.uuid(),
  version: z.int().positive(),
});
