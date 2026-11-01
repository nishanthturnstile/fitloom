import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const root = fileURLToPath(new URL("../", import.meta.url));
const execute = promisify(execFile);
const docker = async (args) =>
  (await execute("docker", args, { cwd: root, timeout: 20000 })).stdout.trim();
const services = [
  "postgres",
  "seaweedfs",
  "mailpit",
  "mailpit-test",
  "web",
  "worker",
];
const lines = (text) =>
  text
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
const containers = lines(
  await docker(["compose", "ps", "--format", "json", ...services]),
);
assert.equal(containers.length, services.length);
for (const container of containers)
  assert.equal(container.Health, "healthy", container.Service);
const ids = containers.map((container) => container.ID);
const names = new Map(
  containers.map((container) => [container.Name, container.Service]),
);
const warmup = await fetch("http://127.0.0.1:24410/account", {
  signal: AbortSignal.timeout(15000),
});
assert.equal(warmup.status, 200);
await warmup.arrayBuffer();
const started = new Date().toISOString();
const samples = [];
async function sample(phase) {
  const [stats, database] = await Promise.all([
    docker(["stats", "--no-stream", "--format", "{{json .}}", ...ids]),
    docker([
      "compose",
      "exec",
      "-T",
      "--user",
      "postgres",
      "postgres",
      "psql",
      "-p",
      "24430",
      "-d",
      "postgres",
      "-At",
      "-c",
      "SELECT json_build_object('maxConnections',current_setting('max_connections')::int,'clientConnections',(SELECT count(*) FROM pg_stat_activity WHERE backend_type='client backend'),'applicationPools',coalesce((SELECT json_agg(row_to_json(x)) FROM (SELECT application_name AS purpose,state,count(*)::int AS connections FROM pg_stat_activity WHERE application_name LIKE 'fitloom:%' GROUP BY application_name,state ORDER BY application_name,state) x),'[]'::json))",
    ]),
  ]);
  samples.push({
    at: new Date().toISOString(),
    phase,
    services: lines(stats).map((row) => ({
      service: names.get(row.Name),
      cpu: row.CPUPerc,
      memory: row.MemUsage,
      pids: Number(row.PIDs),
    })),
    database: JSON.parse(database),
  });
}
for (let index = 0; index < 3; index++) await sample("baseline");
let stop = false;
const requests = { completed: 0, failed: 0 };
async function traffic() {
  while (!stop) {
    try {
      const response = await fetch("http://127.0.0.1:24410/account", {
        signal: AbortSignal.timeout(5000),
      });
      await response.arrayBuffer();
      if (response.status === 200) requests.completed++;
      else requests.failed++;
    } catch {
      requests.failed++;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}
const clients = [traffic(), traffic()];
try {
  for (let index = 0; index < 5; index++)
    await sample("account-http-two-clients");
} finally {
  stop = true;
  await Promise.all(clients);
}
assert.ok(requests.completed > 0);
assert.equal(requests.failed, 0);
const report = {
  started,
  finished: new Date().toISOString(),
  scope:
    "Local development Compose observations; not production capacity or a saturation benchmark",
  traffic: { route: "/account", clients: 2, pacingMs: 100, ...requests },
  samples,
};
await mkdir(`${root}.local`, { recursive: true, mode: 0o700 });
await writeFile(
  `${root}.local/foundation-resources-latest.json`,
  JSON.stringify(report, null, 2),
  { mode: 0o600 },
);
console.log(
  `Resource observations passed: ${samples.length} samples, ${requests.completed} account requests, no failures. Report: .local/foundation-resources-latest.json`,
);
