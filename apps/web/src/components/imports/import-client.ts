import { importErrorBody } from "@fitloom/application/import-contracts";
import type { z } from "zod";
export class ImportRequestError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}
// A chunk can include several bounded database transactions and recovery reads.
const IMPORT_REQUEST_TIMEOUT_MS = 60000;
const requestSignal = (signal?: AbortSignal, timeoutMs = 15000) =>
  signal
    ? AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)])
    : AbortSignal.timeout(timeoutMs);
export async function importFetch(
  path: string,
  body: unknown,
  signal?: AbortSignal,
) {
  const response = await fetch(path, {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
    signal: requestSignal(
      signal,
      path.endsWith("/chunk") ? IMPORT_REQUEST_TIMEOUT_MS : 15000,
    ),
  });
  if (!response.ok) {
    const parsed = importErrorBody.safeParse(
      await response.json().catch(() => null),
    );
    throw new ImportRequestError(
      parsed.success
        ? parsed.data.code
        : response.status === 401
          ? "session-expired"
          : response.status === 403
            ? "denied"
            : "temporary",
      parsed.success
        ? parsed.data.message
        : "Import request could not complete",
    );
  }
  return response;
}
export async function importRequest<T extends z.ZodType>(
  path: string,
  schema: T,
  body: unknown = {},
  signal?: AbortSignal,
): Promise<z.infer<T>> {
  return schema.parse(await (await importFetch(path, body, signal)).json());
}
export function importMessage(error: unknown) {
  return error instanceof ImportRequestError
    ? error.message
    : "Request interrupted. Recover before retrying.";
}
export function importDenied(error: unknown) {
  return (
    error instanceof ImportRequestError &&
    ["denied", "session-expired", "unavailable"].includes(error.code)
  );
}
export async function downloadImport(
  path: string,
  body: unknown,
  name: string,
) {
  const response = await importFetch(path, body),
    blob = await response.blob(),
    url = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.append(a);
    a.click();
    a.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function importRead<T extends z.ZodType>(
  path: string,
  schema: T,
  signal?: AbortSignal,
): Promise<z.infer<T>> {
  const response = await fetch(path, {
    cache: "no-store",
    signal: requestSignal(signal),
  });
  if (!response.ok)
    throw new ImportRequestError(
      response.status === 401
        ? "session-expired"
        : response.status === 403
          ? "denied"
          : response.status === 404
            ? "unavailable"
            : "temporary",
      "Selected owner is unavailable with current access",
    );
  return schema.parse(await response.json());
}
