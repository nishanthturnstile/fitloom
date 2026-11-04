import { measurementSchema } from "./measurement-contracts.js";

const prefix = "51c4b79e-9be7-4dd9-9c91-";
export const BODY_CORE_V1 = "body-core-v1";
// The v1 bytes are a publication contract. Add a new bundle instead of editing v1.
const manifest = {
  formatVersion: 1,
  label: "Body measurements",
  guidance: "Record body dimensions. Garment ease is entered separately.",
  sections: [{ id: `${prefix}000000000000`, label: "Body" }],
  fields: [
    {
      suffix: "000000000001",
      semanticId: "body.chest.circumference",
      label: "Chest circumference",
      help: "Record the chest measurement using the shop's measuring practice.",
    },
    {
      suffix: "000000000002",
      semanticId: "body.bust.circumference",
      label: "Bust circumference",
      help: "Record the bust measurement separately from chest.",
    },
    {
      suffix: "000000000003",
      semanticId: "body.waist.circumference",
      label: "Waist circumference",
      help: "Record the waist position used by the shop.",
    },
    {
      suffix: "000000000004",
      semanticId: "body.hip.circumference",
      label: "Hip circumference",
      help: "Record the hip measurement using the shop's measuring practice.",
    },
    {
      suffix: "000000000005",
      semanticId: "body.shoulder.width",
      label: "Shoulder width",
      help: "Confirm the shoulder endpoints before recording width.",
    },
  ].map(({ suffix, ...field }) => ({
    ...field,
    id: `${prefix}${suffix}`,
    sectionId: `${prefix}000000000000`,
    kind: "length",
    basis: "body",
    displayUnit: "in",
    displayPrecision: 2,
    required: false,
    min: "0",
    max: null,
    illustrationId: "dimension",
  })),
};
// A fresh validated copy prevents caller edits from mutating the bundled publication.
export function bodyCoreV1() {
  return measurementSchema.parse(manifest);
}
