import { readFile, stat } from "node:fs/promises";

if (process.argv[2] === "web") {
  const { createPool } = await import("../packages/db/dist/index.js");
  const response = await fetch("http://127.0.0.1:24410/account", {
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) process.exitCode = 1;
  for (const purpose of ["auth", "web"]) {
    const pool = createPool({
      connectionString: process.env[`${purpose.toUpperCase()}_DATABASE_URL`],
      purpose,
      max: 1,
    });
    try {
      await pool.query("SELECT 1");
    } finally {
      await pool.end();
    }
  }
} else {
  const path = "/tmp/fitloom-worker-heartbeat";
  const data = JSON.parse(await readFile(path, "utf8"));
  const details = await stat(path);
  if (Date.now() - details.mtimeMs > 30000 || !Number.isInteger(data.pid))
    process.exitCode = 1;
  else process.kill(data.pid, 0);
}
