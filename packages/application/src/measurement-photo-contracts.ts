import { z } from "zod";
import { customerText } from "./customer-contracts.js";
import {
  measurementOwner,
  measurementProfileId,
  measurementSchemaRef,
  measurementVersionId,
} from "./measurement-contracts.js";
export const measurementPhotoPayloads = {
  "measurement-photo.begin": z.strictObject({
    ...measurementOwner,
    reservationId: z.uuid(),
    profileId: measurementProfileId,
    versionId: measurementVersionId,
    expectedRevision: z.int().nonnegative(),
    schemaRef: measurementSchemaRef,
  }),
  "measurement-photo.revoke": z.strictObject({
    ...measurementOwner,
    profileId: measurementProfileId,
    fileId: z.uuid(),
    reason: customerText(1000),
  }),
};
export const measurementPhotoCommandName = z.enum([
  "measurement-photo.begin",
  "measurement-photo.revoke",
]);
export const measurementPhotoResult = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("photo-staged"),
    fileId: z.uuid(),
    reservationId: z.uuid(),
    version: z.literal(0),
  }),
  z.strictObject({
    kind: z.literal("photo-revoked"),
    fileId: z.uuid(),
    changed: z.boolean(),
  }),
]);
export const measurementPhotoResponse = z.strictObject({
  result: measurementPhotoResult,
  replayed: z.boolean(),
  operationId: z.uuid(),
});
export const measurementPhotoUploadResult = z.strictObject({
  id: z.uuid(),
  version: z.int().positive(),
});
export const measurementPhotoRead = z.strictObject({
  ...measurementOwner,
  profileId: measurementProfileId,
  versionId: measurementVersionId,
  fileId: z.uuid(),
});
