import "server-only";
import { CommandError } from "@fitloom/application";
import { createPool } from "@fitloom/db";
import { pino } from "pino";

type Purpose = "auth" | "web";
declare global {
  var fitloomRuntimePools:
    | Map<Purpose, ReturnType<typeof createPool>>
    | undefined;
}

// Next.js can reload route modules while old pooled clients remain connected.
// Keep pools for the process lifetime; source modules/services still reload.
export function runtimePool(purpose: Purpose) {
  globalThis.fitloomRuntimePools ??= new Map();
  const pools = globalThis.fitloomRuntimePools;
  const existing = pools.get(purpose);
  if (existing) return existing;
  const connectionString =
    purpose === "auth"
      ? process.env.AUTH_DATABASE_URL
      : process.env.WEB_DATABASE_URL;
  if (!connectionString)
    throw new CommandError("temporary", "Runtime database unavailable");
  const pool = createPool({ purpose, connectionString });
  const logger = pino({
    name: `fitloom-${purpose}-database`,
    level: process.env.LOG_LEVEL ?? "info",
  });
  pool.on("error", () =>
    logger.error(
      { event: "runtime_database_unavailable", purpose },
      "Idle database connection failed",
    ),
  );
  pools.set(purpose, pool);
  return pool;
}
