import encodeQR from "qr";
import sharp from "sharp";
import { measurementCardPath } from "./measurement-card-contracts.js";
export function measurementCardURL(origin: string, id: unknown) {
  const parsed = new URL(origin);
  if (
    !["http:", "https:"].includes(parsed.protocol) ||
    parsed.username ||
    parsed.password ||
    parsed.pathname !== "/" ||
    parsed.search ||
    parsed.hash
  )
    throw Error("Invalid card application origin");
  return new URL(measurementCardPath(id), parsed.origin).href;
}
export async function measurementCardPNG(origin: string, id: unknown) {
  const svg = encodeQR(measurementCardURL(origin, id), "svg", {
    ecc: "quartile",
    border: 4,
    scale: 8,
  });
  return sharp(Buffer.from(svg))
    .flatten({ background: "#ffffff" })
    .png()
    .toBuffer();
}
