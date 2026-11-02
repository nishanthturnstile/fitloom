// Original bundled development aids. IDs, rather than paths, cross the boundary.
export const MASTER_ILLUSTRATIONS = {
  shirt: { src: "/illustrations/garments/shirt.svg", alt: "Shirt outline" },
  blouse: { src: "/illustrations/garments/blouse.svg", alt: "Blouse outline" },
  trouser: {
    src: "/illustrations/garments/trouser.svg",
    alt: "Trouser outline",
  },
  dimension: {
    src: "/illustrations/garments/dimension.svg",
    alt: "Measure between the marked endpoints",
  },
  construction: {
    src: "/illustrations/garments/construction.svg",
    alt: "Construction detail guide",
  },
};
export const SEMANTIC_REGISTRY = {
  "body.chest.circumference": { kind: "length", basis: "body" },
  "body.bust.circumference": { kind: "length", basis: "body" },
  "body.waist.circumference": { kind: "length", basis: "body" },
  "body.hip.circumference": { kind: "length", basis: "body" },
  "body.shoulder.width": { kind: "length", basis: "body" },
  "garment.chest.circumference": { kind: "length", basis: "garment" },
  "garment.sleeve.length": { kind: "length", basis: "garment" },
  "garment.body.length": { kind: "length", basis: "garment" },
  "garment.inseam.length": { kind: "length", basis: "garment" },
  "garment.outseam.length": { kind: "length", basis: "garment" },
} satisfies Record<string, { kind: "length"; basis: "body" | "garment" }>;
export const STARTER_BUNDLE_VERSION = "tailoring-core-v1";
export const STARTER_TEMPLATE_KEYS = [
  "shirt",
  "blouse",
  "trouser",
  "new-stitching",
  "alteration",
] as const;
