import "server-only";
import {
  BodyReadError,
  CommandError,
  createDomainImportService,
  ImportError,
  importDatabaseError,
} from "@fitloom/application";
import { importErrorBody } from "@fitloom/application/import-contracts";
import { pino } from "pino";
import { identityService } from "./identity";
import { privateJson, workspacePool } from "./workspaces";

const logger = pino({
  name: "fitloom-imports",
  level: process.env.LOG_LEVEL ?? "info",
});
export function domainImportService(headers: Headers) {
  return createDomainImportService({
    pool: workspacePool(),
    observe: (event) => logger.info(event, "Import observation"),
    resolveIdentity: async () => {
      try {
        return {
          principalId: (await identityService().identity(headers)).principalId,
        };
      } catch (error) {
        if (
          error instanceof CommandError &&
          error.message === "Sign in required"
        )
          throw new ImportError("session-expired", "Sign in to continue");
        throw error;
      }
    },
  });
}
export function importHttpError(error: unknown) {
  const mapped =
    error instanceof BodyReadError
      ? new ImportError(
          error.status === 413
            ? "body-too-large"
            : error.status === 408
              ? "body-timeout"
              : "validation",
          error.message,
        )
      : importDatabaseError(error);
  const status =
    mapped.code === "session-expired"
      ? 401
      : mapped.code === "denied"
        ? 403
        : mapped.code === "unavailable"
          ? 404
          : mapped.code === "rate-limit"
            ? 429
            : mapped.code === "body-too-large"
              ? 413
              : mapped.code === "body-timeout"
                ? 408
                : mapped.category === "validation"
                  ? 400
                  : mapped.category === "conflict"
                    ? 409
                    : 503;
  const response = privateJson(
    importErrorBody.parse({
      code: mapped.code,
      message: mapped.message,
      correlationId: mapped.correlationId,
    }),
    status,
  );
  if (status === 429) response.headers.set("Retry-After", "60");
  return response;
}
