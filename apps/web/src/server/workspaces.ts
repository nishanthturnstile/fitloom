import "server-only";
import { randomUUID } from "node:crypto";
import {
  BodyReadError,
  CommandError,
  createWorkspaceService,
  identityEnvironment,
  MasterError,
  readBoundedBody,
} from "@fitloom/application";
import { pino } from "pino";
import { identityService } from "./identity";
import { runtimePool } from "./runtime-pools";

const commandLogger = pino({
  name: "fitloom-command",
  level: process.env.LOG_LEVEL ?? "info",
});
export function workspacePool() {
  if (identityEnvironment(process.env).config.mode === "production")
    throw new CommandError(
      "temporary",
      "Commercial admission must be configured before production workspace use",
    );
  return operationalWebPool();
}
export function operationalWebPool() {
  return runtimePool("web");
}
export function workspaceService(headers: Headers) {
  return createWorkspaceService({
    pool: workspacePool(),
    observe: (event) => commandLogger.info(event, "Command observation"),
    resolveIdentity: async () => ({
      principalId: (await identityService().identity(headers)).principalId,
    }),
  });
}
export function privateJson(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "X-Fitloom-Admission": "development-unimplemented",
    },
  });
}
export async function safeRoute(
  run: () => Promise<Response>,
  masterErrors = false,
) {
  try {
    return await run();
  } catch (error) {
    if (error instanceof BodyReadError) {
      const response = privateJson(
        {
          message: error.message,
          category: "validation",
          ...(masterErrors ? { correlationId: randomUUID() } : {}),
        },
        error.status,
      );
      // An early body rejection leaves unread request bytes. Tell HTTP/1 clients
      // to close this connection instead of reusing a socket the server will drain.
      response.headers.set("Connection", "close");
      return response;
    }
    const category =
      error instanceof CommandError
        ? error.category
        : typeof error === "object" &&
            error !== null &&
            "code" in error &&
            error.code === "42501"
          ? "access"
          : "temporary";
    return privateJson(
      {
        message:
          category === "temporary"
            ? "Workspace unavailable"
            : error instanceof CommandError
              ? error.message
              : "Access denied",
        category,
        ...(masterErrors
          ? {
              correlationId:
                error instanceof MasterError
                  ? error.correlationId
                  : randomUUID(),
              ...(error instanceof MasterError && error.issues.length
                ? { issues: error.issues }
                : {}),
            }
          : {}),
      },
      category === "access"
        ? 403
        : category === "validation"
          ? 400
          : category === "conflict"
            ? 409
            : 503,
    );
  }
}
export async function mutation(
  request: Request,
  run: (input: unknown) => Promise<Response>,
  options: { bodyLimit?: "master-definition"; masterErrors?: boolean } = {},
) {
  return safeRoute(async () => {
    const { config } = identityEnvironment(process.env);
    const origins = [
      new URL(config.baseURL).origin,
      ...config.trustedOrigins.map((value) => new URL(value).origin),
    ];
    if (!origins.includes(request.headers.get("origin") ?? ""))
      throw new CommandError("access", "Origin denied");
    if (!request.headers.get("content-type")?.startsWith("application/json"))
      throw new CommandError("validation", "JSON required");
    const bytes = await readBoundedBody(request, {
      maxBytes: options.bodyLimit === "master-definition" ? 131072 : 16384,
      timeoutMs: 5000,
    });
    let input: unknown;
    try {
      input = JSON.parse(
        new TextDecoder("utf-8", { fatal: true }).decode(bytes),
      );
    } catch {
      throw new CommandError("validation", "Invalid JSON");
    }
    return run(input);
  }, options.masterErrors);
}
export function invocation(input: unknown, scope: unknown) {
  if (
    typeof input !== "object" ||
    input === null ||
    !("operationKey" in input) ||
    !("correlationId" in input) ||
    !("payload" in input)
  )
    throw new CommandError("validation", "Invalid command");
  return {
    scope,
    operationKey: input.operationKey,
    correlationId: input.correlationId,
    payload: input.payload,
  };
}
export function pageJson<T>(page: {
  items: T[];
  total: number;
  nextOffset: number | null;
}) {
  const response = privateJson(page.items);
  response.headers.set("X-Total-Count", String(page.total));
  if (page.nextOffset !== null)
    response.headers.set("X-Next-Offset", String(page.nextOffset));
  return response;
}
