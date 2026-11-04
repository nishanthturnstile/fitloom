import { measurementErrorResponse } from "@fitloom/application/measurement-contracts";
export class MeasurementRequestError extends Error {
  readonly code: string;
  readonly issues: ReturnType<typeof measurementErrorResponse.parse>["issues"];

  constructor(
    message: string,
    code: string,
    issues: ReturnType<typeof measurementErrorResponse.parse>["issues"] = [],
  ) {
    super(message);
    this.code = code;
    this.issues = issues;
  }
}
export async function measurementRequest<T>(
  url: string,
  schema: { parse: (input: unknown) => T },
  options: { body?: unknown; bytes?: string; signal?: AbortSignal } = {},
): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    ...(options.body !== undefined || options.bytes !== undefined
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: options.bytes ?? JSON.stringify(options.body),
        }
      : {}),
    signal: options.signal
      ? AbortSignal.any([options.signal, AbortSignal.timeout(15000)])
      : AbortSignal.timeout(15000),
  });
  if (!response.headers.get("content-type")?.includes("application/json"))
    throw new MeasurementRequestError(
      "Measurements unavailable. Try again.",
      "temporary",
    );
  const body: unknown = await response.json();
  if (!response.ok) {
    const parsed = measurementErrorResponse.safeParse(body);
    throw new MeasurementRequestError(
      parsed.success
        ? `${parsed.data.message} Reference: ${parsed.data.correlationId}`
        : "Measurements unavailable. Try again.",
      parsed.success ? parsed.data.code : "temporary",
      parsed.success ? parsed.data.issues : [],
    );
  }
  return schema.parse(body);
}
export const measurementDenied = (error: unknown) =>
  error instanceof MeasurementRequestError &&
  ["denied", "session-expired"].includes(error.code);
export const measurementMessage = (error: unknown) =>
  error instanceof MeasurementRequestError
    ? error.message
    : "Measurements unavailable. Try again.";
