import { randomUUID } from "node:crypto";
import { rename, rm, writeFile } from "node:fs/promises";
import {
  blobStoreEnvironment,
  createBlobStore,
  createMailTransport,
  deliverAuthMail,
  mailWorkerEnvironment,
  processFoundationWork,
} from "@fitloom/application";
import { createPool } from "@fitloom/db";
import { pino } from "pino";

const logger = pino({
  name: "fitloom-worker",
  level: process.env.LOG_LEVEL ?? "info",
});
const config = mailWorkerEnvironment(process.env);
const pool = createPool({
  connectionString: config.databaseURL,
  purpose: "worker",
  max: 3,
});
pool.on("error", () =>
  logger.error(
    { event: "mail_database_unavailable" },
    "Idle database connection failed",
  ),
);
const transport = createMailTransport(config.mail);
const store = createBlobStore(blobStoreEnvironment(process.env));
const instanceId = randomUUID();
let stopping = false;
let deadline: ReturnType<typeof setTimeout> | undefined;
let wake: (() => void) | undefined;
const shutdown = (signal: NodeJS.Signals) => {
  if (stopping) return;
  stopping = true;
  deadline = setTimeout(() => process.exit(1), 25000);
  deadline.unref();
  wake?.();
  logger.info({ signal }, "Worker draining");
};
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
logger.info(
  {
    handlers: ["identity-mail", "files.cleanup", "provider.fixture.v1"],
    provider: config.mail.provider,
  },
  "Foundation worker started",
);
try {
  while (!stopping) {
    try {
      const results = await Promise.allSettled([
        deliverAuthMail({
          pool,
          secret: config.secret,
          transport,
          observe: (event) => logger.info(event, "Mail observation"),
        }),
        processFoundationWork({
          pool,
          store,
          observe: (event) => logger.info(event, "Job observation"),
          stagingRoot:
            process.env.FILE_STAGING_ROOT ?? "/var/lib/fitloom/private-files",
          allowFixtures:
            (process.env.FITLOOM_ENV ??
              process.env.NODE_ENV ??
              "development") !== "production",
        }),
      ]);
      if (results.some((result) => result.status === "rejected"))
        throw new Error("Foundation processing unavailable");
      const delivered = results.some(
        (result) => result.status === "fulfilled" && result.value,
      );
      await pool.query("SELECT app.worker_observed($1)", [instanceId]);
      await writeFile(
        "/tmp/fitloom-worker-heartbeat.next",
        JSON.stringify({ pid: process.pid }),
      );
      await rename(
        "/tmp/fitloom-worker-heartbeat.next",
        "/tmp/fitloom-worker-heartbeat",
      );
      if (delivered) continue;
    } catch {
      logger.error(
        { event: "foundation_iteration_failed" },
        "Foundation processing unavailable",
      );
    }
    if (!stopping)
      await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, 1000);
        wake = () => {
          clearTimeout(timer);
          resolve();
        };
      });
  }
} finally {
  await rm("/tmp/fitloom-worker-heartbeat", { force: true });
  transport.close();
  await pool.end();
  if (deadline) clearTimeout(deadline);
  process.removeListener("SIGINT", shutdown);
  process.removeListener("SIGTERM", shutdown);
  logger.info("Worker stopped");
  logger.flush();
}
