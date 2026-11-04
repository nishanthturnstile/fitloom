import "server-only";
import {
  BodyReadError,
  CommandError,
  createMeasurementService,
  MeasurementError,
} from "@fitloom/application";
import { measurementErrorResponse } from "@fitloom/application/measurement-contracts";
import { pino } from "pino";
import { identityService } from "./identity";
import { privateJson, workspacePool } from "./workspaces";

const logger = pino({
  name: "fitloom-measurements",
  level: process.env.LOG_LEVEL ?? "info",
});
export function measurementService(headers: Headers) {
  return createMeasurementService({
    pool: workspacePool(),
    observe: (event) => logger.info(event, "Measurement observation"),
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
          throw new MeasurementError("session-expired", "Sign in to continue");
        throw error;
      }
    },
  });
}
export function measurementHttpError(error: unknown): Response {
  const mapped =
    error instanceof MeasurementError
      ? error
      : error instanceof BodyReadError
        ? new MeasurementError(
            error.status === 413
              ? "body-too-large"
              : error.status === 408
                ? "body-timeout"
                : "validation",
            error.message,
          )
        : error instanceof CommandError
          ? new MeasurementError(
              error.category === "access"
                ? "denied"
                : error.category === "validation"
                  ? "validation"
                  : error.category === "conflict"
                    ? "operation-conflict"
                    : "temporary",
              error.message,
            )
          : new MeasurementError(
              "temporary",
              "Measurements unavailable. Try again.",
            );
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
    measurementErrorResponse.parse({
      outcome: "error",
      code: mapped.code,
      category: mapped.category,
      message: mapped.message,
      issues: mapped.issues,
      correlationId: mapped.correlationId,
    }),
    status,
  );
  if (status === 429) response.headers.set("Retry-After", "60");
  return response;
}
