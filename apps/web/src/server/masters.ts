import "server-only";
import { createMasterService } from "@fitloom/application";
import { pino } from "pino";
import { identityService } from "./identity";
import { workspacePool } from "./workspaces";

const logger = pino({
  name: "fitloom-masters",
  level: process.env.LOG_LEVEL ?? "info",
});
export function masterService(headers: Headers) {
  return createMasterService({
    pool: workspacePool(),
    resolveIdentity: async () => ({
      principalId: (await identityService().identity(headers)).principalId,
    }),
    observe: (event) => logger.info(event, "Master observation"),
  });
}
