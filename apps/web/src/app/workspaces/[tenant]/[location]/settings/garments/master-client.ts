import * as c from "@fitloom/application/master-contracts";
import type { Issues } from "./editor-controls";
export type Page =
  | ReturnType<typeof c.garmentPage.parse>
  | ReturnType<typeof c.pricedGarmentPage.parse>
  | ReturnType<typeof c.servicePage.parse>
  | ReturnType<typeof c.addonPage.parse>
  | ReturnType<typeof c.pricedAddonPage.parse>;
export type Row = Page["items"][number];
export type Detail = c.GarmentDetail | c.PricedGarmentDetail;
export class ApiError extends Error {
  status: number;
  issues: Issues;
  constructor(status: number, input: unknown) {
    const parsed = c.masterError.safeParse(input);
    super(
      parsed.success
        ? parsed.data.message
        : "Garment settings could not be reached",
    );
    this.status = status;
    this.issues = parsed.success ? (parsed.data.issues ?? []) : [];
  }
}
export async function response<T>(
  request: Promise<Response>,
  schema: { parse: (input: unknown) => T },
): Promise<T> {
  const result = await request;
  const raw: unknown = await result.json();
  if (!result.ok) throw new ApiError(result.status, raw);
  return schema.parse(raw);
}
export const detailSchema = {
  parse(input: unknown): Detail {
    const priced = c.pricedGarmentDetail.safeParse(input);
    return priced.success ? priced.data : c.garmentDetail.parse(input);
  },
};
export function pageSchema(kind: "garment" | "service" | "addon") {
  return {
    parse(input: unknown): Page {
      if (kind === "service") return c.servicePage.parse(input);
      if (kind === "addon") {
        const priced = c.pricedAddonPage.safeParse(input);
        return priced.success ? priced.data : c.addonPage.parse(input);
      }
      const priced = c.pricedGarmentPage.safeParse(input);
      return priced.success ? priced.data : c.garmentPage.parse(input);
    },
  };
}
export const resource = (kind: "garment" | "service" | "addon") =>
  c.masterResources[kind];

export function rate(value: string | null) {
  if (value === null) return "Unset";
  const [integer, fraction = ""] = value.split(".");
  const digits = fraction.replace(/0+$/, "");
  return `${integer}${digits ? `.${digits}` : ""} INR`;
}
