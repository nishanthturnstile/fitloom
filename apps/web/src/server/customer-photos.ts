import "server-only";
import {
  CommandError,
  CustomerError,
  createCustomerPhotoService,
} from "@fitloom/application";
import { privateStore } from "./files";
import { identityService } from "./identity";
import { workspacePool } from "./workspaces";
export function customerPhotoService(headers: Headers) {
  return createCustomerPhotoService({
    pool: workspacePool(),
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
