import "server-only";
import {
  CommandError,
  CustomerError,
  createCustomerPhotoService,
} from "@fitloom/application";
import { pino } from "pino";
import { privateStore } from "./files";
import { identityService } from "./identity";
import { workspacePool } from "./workspaces";

const logger = pino({
  name: "fitloom-customer-photos",
  level: process.env.LOG_LEVEL ?? "info",
});
export function customerPhotoService(headers: Headers) {
  return createCustomerPhotoService({
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
          throw new CustomerError("session-expired", "Sign in to continue");
        throw error;
      }
    },
  });
}
