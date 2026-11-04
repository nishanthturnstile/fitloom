import "server-only";
import {
  CommandError,
  createMeasurementPhotoService,
  MeasurementError,
} from "@fitloom/application";
import { pino } from "pino";
import { privateStore } from "./files";
import { identityService } from "./identity";
import { workspacePool } from "./workspaces";

const logger = pino({
  name: "fitloom-measurement-photos",
  level: process.env.LOG_LEVEL ?? "info",
});
export function measurementPhotoService(headers: Headers) {
  return createMeasurementPhotoService({
    pool: workspacePool(),
    observe: (event) => logger.info(event, "Command observation"),
    store: privateStore(),
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
