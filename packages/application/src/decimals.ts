import { Decimal } from "decimal.js";
import { z } from "zod";

// Isolated constructor: other modules cannot change this module's precision policy.
const Exact = Decimal.clone({ precision: 60, rounding: Decimal.ROUND_HALF_UP });
function decimalSchema(scale: number, integerDigits: number) {
  return z
    .string()
    .max(integerDigits + scale + 2)
    .regex(/^-?(0|[1-9]\d*)(\.\d+)?$/)
    .superRefine((value, context) => {
      const [integer = "", fraction = ""] = value.replace(/^-/, "").split(".");
      if (fraction.length > scale || integer.length > integerDigits)
        context.addIssue({
          code: "custom",
          message: "Decimal precision exceeds field policy",
        });
    })
    .transform((value) => new Exact(value).toFixed(scale));
}
export const moneyInput = decimalSchema(2, 18).brand<"PostedMoney">();
export const unitPriceInput = decimalSchema(6, 18).brand<"UnitPrice">();
export const quantityInput = z.strictObject({
  value: decimalSchema(6, 12).brand<"Quantity">(),
  unit: z.enum(["piece", "metre", "hour"]),
});
export const intermediateInput = decimalSchema(12, 30).brand<"Intermediate">();
export type PostedMoney = z.infer<typeof moneyInput>;
export type UnitPrice = z.infer<typeof unitPriceInput>;
export type Quantity = z.infer<typeof quantityInput>;
export const DEVELOPMENT_CURRENCY = "INR";

// Rounding is explicit and only allowed after accepting a bounded intermediate.
export function roundPosted(value: unknown): PostedMoney {
  const parsed = intermediateInput.parse(value);
  return moneyInput.parse(
    new Exact(parsed).toDecimalPlaces(2, Exact.ROUND_HALF_UP).toFixed(2),
  );
}
export function extendPrice(price: UnitPrice, quantity: Quantity): PostedMoney {
  return roundPosted(new Exact(price).times(quantity.value).toFixed(12));
}
export function sumMoney(values: readonly PostedMoney[]): PostedMoney {
  return moneyInput.parse(
    values.reduce((total, value) => total.plus(value), new Exact(0)).toFixed(2),
  );
}
export const positiveMoneyInput = moneyInput.refine(
  (value) => new Exact(value).gt(0),
  "Amount must be positive",
);

export function balances(
  debits: readonly PostedMoney[],
  credits: readonly PostedMoney[],
): boolean {
  const total = (values: readonly PostedMoney[]) =>
    values.reduce((sum, value) => sum.plus(value), new Exact(0));
  return total(debits).eq(total(credits));
}
