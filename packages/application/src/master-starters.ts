import {
  type GarmentDefinition,
  garmentDefinition,
  STARTER_BUNDLE_VERSION,
  serviceId,
} from "./master-contracts.js";

// Installation allocates tenant-owned identities. These fixtures have no global IDs
// and never infer a rate. The future installer must preserve installed template keys.
export function createStarterBundle(newId: () => string) {
  const services = [
    {
      id: serviceId.parse(newId()),
      templateKey: "new-stitching",
      label: "New stitching",
    },
    {
      id: serviceId.parse(newId()),
      templateKey: "alteration",
      label: "Alteration",
    },
  ];
  const garment = (
    templateKey: "shirt" | "blouse" | "trouser",
    label: string,
    applicability: GarmentDefinition["applicability"],
    measurements: {
      label: string;
      semanticId: string;
      basis: "body" | "garment";
    }[],
  ) => {
    const sectionId = newId();
    const definition = garmentDefinition.parse({
      formatVersion: 1,
      label,
      category: "Tailoring",
      applicability,
      iconId: templateKey,
      help: "Development example. A tailor must confirm these dimensions before cutting.",
      illustrationId: null,
      sourceVersionId: null,
      sections: [{ id: sectionId, label: "Dimensions" }],
      fields: measurements.map((m) => ({
        id: newId(),
        sectionId,
        kind: "length",
        ...m,
        required: true,
        help: `${m.label}. Bounds are expressed in centimetres.`,
        illustrationId: "dimension",
        displayUnit: "in",
        displayPrecision: 2,
        min: null,
        max: null,
      })),
      constructionGroups: [
        {
          id: newId(),
          label: "Finish",
          kind: "single",
          required: false,
          help: "Choose a finish",
          illustrationId: "construction",
          choices: [
            { id: newId(), label: "Plain", illustrationId: null, active: true },
            {
              id: newId(),
              label: "Topstitched",
              illustrationId: "construction",
              active: true,
            },
          ],
        },
      ],
      services: services.map((s) => ({ serviceId: s.id, savedLabel: s.label })),
      addons: [],
    });
    return {
      templateKey,
      definition,
      baseRate: null,
      currency: "INR",
      serviceOverrides: services.map((s) => ({
        serviceId: s.id,
        rateOverride: null,
      })),
    };
  };
  return {
    bundleVersion: STARTER_BUNDLE_VERSION,
    services,
    garments: [
      garment("shirt", "Shirt", "masculine", [
        {
          label: "Body chest circumference",
          semanticId: "body.chest.circumference",
          basis: "body",
        },
        {
          label: "Body shoulder width",
          semanticId: "body.shoulder.width",
          basis: "body",
        },
        {
          label: "Garment sleeve length",
          semanticId: "garment.sleeve.length",
          basis: "garment",
        },
        {
          label: "Garment body length",
          semanticId: "garment.body.length",
          basis: "garment",
        },
      ]),
      garment("blouse", "Blouse", "feminine", [
        {
          label: "Body bust circumference",
          semanticId: "body.bust.circumference",
          basis: "body",
        },
        {
          label: "Body waist circumference",
          semanticId: "body.waist.circumference",
          basis: "body",
        },
        {
          label: "Body shoulder width",
          semanticId: "body.shoulder.width",
          basis: "body",
        },
        {
          label: "Garment sleeve length",
          semanticId: "garment.sleeve.length",
          basis: "garment",
        },
      ]),
      garment("trouser", "Trouser", "unisex", [
        {
          label: "Body waist circumference",
          semanticId: "body.waist.circumference",
          basis: "body",
        },
        {
          label: "Body hip circumference",
          semanticId: "body.hip.circumference",
          basis: "body",
        },
        {
          label: "Garment inseam length",
          semanticId: "garment.inseam.length",
          basis: "garment",
        },
        {
          label: "Garment outseam length",
          semanticId: "garment.outseam.length",
          basis: "garment",
        },
      ]),
    ],
  };
}
