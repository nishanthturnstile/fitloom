import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, open, readFile, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
process.chdir(root);
const suffix = randomUUID().replaceAll("-", "").slice(0, 12),
  database = `fitloom_restore_${suffix}`;
const directory = `${root}.local/recovery-${suffix}`;
await mkdir(directory, { recursive: true, mode: 0o700 });
const started = Date.now();
let created = false,
  passed = false;
async function run(args, { input, output } = {}) {
  const err = await open(`${directory}/commands.log`, "a", 0o600),
    out = output ? await open(output, "w", 0o600) : undefined,
    stdin = input ? await open(input, "r") : undefined;
  try {
    await new Promise((resolve, reject) => {
      const child = spawn("docker", ["compose", ...args], {
        cwd: root,
        stdio: [stdin?.fd ?? "ignore", out?.fd ?? "inherit", err.fd],
      });
      child.on("error", reject);
      child.on("exit", (code) =>
        code === 0 ? resolve() : reject(new Error("Recovery command failed")),
      );
    });
  } finally {
    await Promise.all([err.close(), out?.close(), stdin?.close()]);
  }
}
const admin = (sql) =>
  run([
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
    "-v",
    "ON_ERROR_STOP=1",
    "-q",
    "-c",
    sql,
  ]);
const helper = (action) =>
  run([
    "run",
    "--no-deps",
    "--rm",
    "--user",
    `${process.getuid()}:${process.getgid()}`,
    "-e",
    `RECOVERY_DATABASE=${database}`,
    "-v",
    `${directory}:/recovery`,
    "tools",
    "node",
    "packages/application/scripts/recovery-check.mjs",
    action,
  ]);
try {
  await run(["build", "tools"]);
  await helper("snapshot");
  await run(
    [
      "exec",
      "-T",
      "--user",
      "postgres",
      "postgres",
      "pg_dump",
      "-p",
      "24430",
      "-U",
      "postgres",
      "-d",
      "fitloom_test",
      "--format=custom",
      "--no-owner",
    ],
    { output: `${directory}/database.dump` },
  );
  await admin(
    `CREATE DATABASE "${database}" OWNER fitloom_migrator TEMPLATE template0`,
  );
  created = true;
  await admin(
    `REVOKE CONNECT ON DATABASE "${database}" FROM PUBLIC;GRANT CONNECT ON DATABASE "${database}" TO fitloom_test_migrator,fitloom_test_web,fitloom_test_worker,fitloom_test_auth,fitloom_test_operator`,
  );
  await run(
    [
      "exec",
      "-T",
      "--user",
      "postgres",
      "postgres",
      "pg_restore",
      "-p",
      "24430",
      "-U",
      "postgres",
      "-d",
      database,
      "--role=fitloom_migrator",
      "--no-owner",
      "--clean",
      "--if-exists",
      "--single-transaction",
      "--exit-on-error",
    ],
    { input: `${directory}/database.dump` },
  );
  await helper("verify");
  await admin(`DROP DATABASE "${database}" WITH (FORCE)`);
  created = false;
  const result = JSON.parse(await readFile(`${directory}/result.json`, "utf8"));
  result.elapsedMs = Date.now() - started;
  result.disposableDatabaseDropped = true;
  await writeFile(
    `${root}.local/foundation-recovery-latest.json`,
    JSON.stringify(result, null, 2),
    { mode: 0o600 },
  );
  passed = true;
  console.log(
    `Local application restore rehearsal passed in ${result.elapsedMs} ms. Report: .local/foundation-recovery-latest.json`,
  );
} finally {
  if (created) await admin(`DROP DATABASE "${database}" WITH (FORCE)`);
  if (passed) await rm(directory, { recursive: true, force: true });
  else
    console.error(
      `Recovery rehearsal failed; restricted diagnostic artifacts retained in ${directory}`,
    );
}
