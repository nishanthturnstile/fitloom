import { CommandError } from "@fitloom/application";
import { privateStore } from "@/server/files";
import { identityService } from "@/server/identity";
import { operationalWebPool, privateJson } from "@/server/workspaces";
export const GET = async (request: Request) => {
  try {
    const status = await identityService().operationalStatus(request.headers);
    const checks = await Promise.allSettled([
      Promise.resolve().then(() => privateStore().probe()),
      Promise.resolve().then(() => operationalWebPool().query("SELECT 1")),
    ]);
    const storage =
      checks[0]?.status === "fulfilled" ? "available" : "unavailable";
    const webRole =
      checks[1]?.status === "fulfilled" ? "available" : "unavailable";
    return privateJson({
      ...status,
      database: { ...status.database, authRole: "available", webRole },
      storage: { state: storage, checkedAt: new Date().toISOString() },
      state:
        storage === "available" &&
        webRole === "available" &&
        status.worker.state === "observed" &&
        status.queues.foundation.failed === 0 &&
        status.queues.mail.failed === 0
          ? "ok"
          : "degraded",
    });
  } catch (error) {
    if (error instanceof CommandError && error.category === "access")
      return privateJson({ message: "Operator access denied" }, 403);
    return privateJson(
      {
        message: "Operational status unavailable",
        database: { state: "unknown" },
        worker: { state: "unknown" },
        queues: null,
        storage: { state: "unknown" },
        backups: { state: "unknown", owner: "external" },
      },
      503,
    );
  }
};
