import "server-only";
import {
  CommandError,
  createMeasurementCardService,
  MeasurementError,
} from "@fitloom/application";
import { pino } from "pino";
import { identityService } from "./identity";
import { workspacePool } from "./workspaces";

const logger = pino({
  name: "fitloom-measurement-cards",
  level: process.env.LOG_LEVEL ?? "info",
});
export function measurementCardService(headers: Headers) {
  return createMeasurementCardService({
    pool: workspacePool(),
    observe: (event) => logger.info(event, "Command observation"),
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
