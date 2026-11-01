import "server-only";
import {
  createIdentityService,
  identityEnvironment,
} from "@fitloom/application";
import { pino } from "pino";
import { runtimePool } from "./runtime-pools";

let service: ReturnType<typeof createIdentityService> | undefined;
export function identityService() {
  if (service) return service;
  const { config } = identityEnvironment(process.env);
  const pool = runtimePool("auth");
  const logger = pino({
    name: "fitloom-auth",
    level: process.env.LOG_LEVEL ?? "info",
  });
  service = createIdentityService({
    pool,
    config,
    observe: (event) => logger.info(event, "Operator observation"),
    onFailure: (category) =>
      logger.error(
        { event: "auth_request_failed", category },
        "Authentication request failed",
      ),
  });
  return service;
}
