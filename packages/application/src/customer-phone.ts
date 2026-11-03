import {
  type CountryCode,
  getCountries,
  isSupportedCountry,
  parsePhoneNumberFromString,
} from "libphonenumber-js/max";
import { z } from "zod";

export const phoneCountryCode = z.custom<CountryCode>(
  (value) => typeof value === "string" && isSupportedCountry(value),
  "Choose a supported phone country",
);
const displayPhone = z
  .string()
  .transform((value) => value.normalize("NFC").trim())
  .refine(
    (value) =>
      Array.from(value).length >= 1 &&
      Array.from(value).length <= 64 &&
      !/[\p{Cc}]/u.test(value),
    "Enter a phone number of at most 64 characters",
  );
export const customerPhoneInput = z.strictObject({
  countryCode: phoneCountryCode,
  display: displayPhone,
});

export function normalizeCustomerPhone(
  input: z.infer<typeof customerPhoneInput>,
) {
  const phone = parsePhoneNumberFromString(input.display, {
    defaultCountry: input.countryCode,
    extract: false,
  });
  if (
    !phone?.isValid() ||
    phone.ext ||
    (!input.display.startsWith("+") && phone.country !== input.countryCode)
  )
    return null;
  return {
    countryCode: input.countryCode,
    display: input.display,
    e164: phone.number,
    digits: phone.number.slice(1),
  };
}
export const customerPhone = customerPhoneInput.transform((input, context) => {
  const result = normalizeCustomerPhone(input);
  if (result) return result;
  context.addIssue({
    code: "custom",
    path: ["display"],
    message: "Enter a valid whole phone number without an extension",
  });
  return z.NEVER;
});
export const canonicalCustomerPhone = z
  .strictObject({
    countryCode: phoneCountryCode,
    display: displayPhone,
    e164: z.string().regex(/^\+[1-9][0-9]{6,14}$/),
    digits: z.string().regex(/^[1-9][0-9]{6,14}$/),
  })
  .superRefine((value, context) => {
    const normalized = normalizeCustomerPhone(value);
    if (
      !normalized ||
      normalized.e164 !== value.e164 ||
      normalized.digits !== value.digits
    )
      context.addIssue({
        code: "custom",
        message: "Phone normalization does not match",
      });
  });
export type CustomerPhone = z.infer<typeof canonicalCustomerPhone>;

export function formatCustomerPhone(
  phone: z.infer<typeof canonicalCustomerPhone> | null,
): string {
  return phone
    ? (parsePhoneNumberFromString(phone.e164)?.formatInternational() ??
        phone.display)
    : "No phone";
}

export const customerPhoneCountries = getCountries();
