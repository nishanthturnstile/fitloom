import "server-only";
import {
  blobStoreEnvironment,
  createBlobStore,
  createFileService,
} from "@fitloom/application";
import { pino } from "pino";
import { identityService } from "./identity";
import { workspacePool } from "./workspaces";

const commandLogger = pino({
  name: "fitloom-command",
  level: process.env.LOG_LEVEL ?? "info",
});
let store: ReturnType<typeof createBlobStore> | undefined;
export function privateStore() {
  store ??= createBlobStore(blobStoreEnvironment(process.env));
  return store;
}
export function fileService(headers: Headers) {
  return createFileService({
    pool: workspacePool(),
    observe: (event) => commandLogger.info(event, "Command observation"),
    store: privateStore(),
    resolveIdentity: async () => ({
      principalId: (await identityService().identity(headers)).principalId,
    }),
  });
}
