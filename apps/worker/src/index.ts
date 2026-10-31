import { pino } from "pino";

const logger = pino({
  name: "fitloom-worker",
  level: process.env.LOG_LEVEL ?? "info",
});

logger.info({ handlers: 0 }, "Worker started; no job handlers configured");

// Keep the scaffold running until the durable queue owns the worker lifecycle.
const heartbeat = setInterval(() => {
  logger.debug({ handlers: 0 }, "Worker idle");
}, 60_000);

function shutdown(signal: NodeJS.Signals): void {
  clearInterval(heartbeat);
  process.removeListener("SIGINT", shutdown);
  process.removeListener("SIGTERM", shutdown);
  logger.info({ signal }, "Worker stopped");
  logger.flush();
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
