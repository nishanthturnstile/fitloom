import { execFileSync, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";

const root = fileURLToPath(new URL("../", import.meta.url));
process.chdir(root);
const directory = resolve(root, ".local");
const label = "dev.fitloom.compose-watch";
const agentPath = resolve(homedir(), "Library/LaunchAgents", `${label}.plist`);
function run(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: root,
    stdio: "inherit",
    ...options,
  });
}
function docker(args) {
  return run("docker", ["compose", ...args]);
}
function write(path, contents) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, contents, { mode: 0o600 });
  chmodSync(path, 0o600);
}
function envFile(name, values) {
  write(
    resolve(directory, name),
    Object.entries(values)
      .map(([key, value]) => `${key}=${JSON.stringify(String(value))}\n`)
      .join(""),
  );
}
function tailnet() {
  try {
    const status = JSON.parse(
      run("tailscale", ["status", "--json"], {
        stdio: "pipe",
        encoding: "utf8",
      }),
    );
    return status.BackendState === "Running"
      ? status.Self.DNSName.replace(/\.$/, "")
      : null;
  } catch {
    return null;
  }
}
function prepare() {
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  chmodSync(directory, 0o700);
  const savedPath = resolve(root, "packages/db/.env");
  const saved = existsSync(savedPath)
    ? parseEnv(readFileSync(savedPath, "utf8"))
    : {};
  const adminPassword = saved.LOCAL_ADMIN_DATABASE_URL
    ? new URL(saved.LOCAL_ADMIN_DATABASE_URL).password
    : randomBytes(32).toString("hex");
  saved.LOCAL_ADMIN_DATABASE_URL = `postgresql://postgres:${adminPassword}@127.0.0.1:24430/postgres`;
  for (const [database, prefix] of [
    ["fitloom_dev", ""],
    ["fitloom_test", "TEST_"],
  ]) {
    for (const purpose of ["migrator", "web", "worker", "auth", "operator"]) {
      const key = `${prefix}${purpose.toUpperCase()}_DATABASE_URL`;
      const connection = new URL(
        saved[key] ??
          `postgresql://${database}_${purpose}:${randomBytes(32).toString("hex")}@127.0.0.1:24430/${database}`,
      );
      if (
        connection.username !== `${database}_${purpose}` ||
        connection.pathname !== `/${database}`
      )
        throw new Error(
          "Unexpected local database identity; refusing to replace credentials",
        );
      connection.hostname = "127.0.0.1";
      connection.port = "24430";
      saved[key] = connection.href;
    }
  }
  for (const name of [
    "AUTH_SECRET",
    "MAIL_ENCRYPTION_KEY",
    "TEST_AUTH_SECRET",
    "TEST_MAIL_ENCRYPTION_KEY",
  ])
    saved[name] ??= randomBytes(32).toString("hex");
  write(
    savedPath,
    Object.entries(saved)
      .map(([k, v]) => `${k}=${v}\n`)
      .join(""),
  );
  for (const prefix of [
    "STORAGE_ADMIN",
    "STORAGE_DEV_WEB",
    "STORAGE_DEV_WORKER",
    "STORAGE_TEST_WEB",
    "STORAGE_TEST_WORKER",
    "STORAGE_TEST_RESET",
  ]) {
    saved[`${prefix}_ACCESS_KEY`] ??= randomBytes(16).toString("hex");
    saved[`${prefix}_SECRET_KEY`] ??= randomBytes(32).toString("hex");
  }
  Object.assign(saved, {
    TEST_STORAGE_RESET_ACCESS_KEY: saved.STORAGE_TEST_RESET_ACCESS_KEY,
    TEST_STORAGE_RESET_SECRET_KEY: saved.STORAGE_TEST_RESET_SECRET_KEY,
    TEST_STORAGE_ENDPOINT: "http://127.0.0.1:24453",
    TEST_STORAGE_BUCKET: "fitloom-test",
    TEST_STORAGE_ACCESS_KEY: saved.STORAGE_TEST_WEB_ACCESS_KEY,
    TEST_STORAGE_SECRET_KEY: saved.STORAGE_TEST_WEB_SECRET_KEY,
    TEST_STORAGE_WORKER_ACCESS_KEY: saved.STORAGE_TEST_WORKER_ACCESS_KEY,
    TEST_STORAGE_WORKER_SECRET_KEY: saved.STORAGE_TEST_WORKER_SECRET_KEY,
  });
  const storageIdentity = (prefix, name, bucket, read) => ({
    name,
    credentials: [
      {
        accessKey: saved[`${prefix}_ACCESS_KEY`],
        secretKey: saved[`${prefix}_SECRET_KEY`],
      },
    ],
    actions: read ? [`Read:${bucket}`, `Write:${bucket}`] : [`Write:${bucket}`],
  });
  write(
    resolve(directory, "seaweed-s3.json"),
    JSON.stringify({
      identities: [
        {
          name: "test-reset",
          credentials: [
            {
              accessKey: saved.STORAGE_TEST_RESET_ACCESS_KEY,
              secretKey: saved.STORAGE_TEST_RESET_SECRET_KEY,
            },
          ],
          actions: ["List:fitloom-test", "Write:fitloom-test"],
        },
        {
          name: "bootstrap",
          credentials: [
            {
              accessKey: saved.STORAGE_ADMIN_ACCESS_KEY,
              secretKey: saved.STORAGE_ADMIN_SECRET_KEY,
            },
          ],
          actions: ["Admin", "Read", "Write", "List"],
        },
        storageIdentity(
          "STORAGE_DEV_WEB",
          "development-web",
          "fitloom-dev",
          true,
        ),
        storageIdentity(
          "STORAGE_DEV_WORKER",
          "development-worker",
          "fitloom-dev",
          false,
        ),
        storageIdentity("STORAGE_TEST_WEB", "test-web", "fitloom-test", true),
        storageIdentity(
          "STORAGE_TEST_WORKER",
          "test-worker",
          "fitloom-test",
          false,
        ),
      ],
    }),
  );
  // Linux file-backed secrets retain host permissions after SeaweedFS drops UID.
  // The private parent directory prevents other host users from reading this file.
  chmodSync(resolve(directory, "seaweed-s3.json"), 0o644);
  envFile("storage-init.env", {
    STORAGE_ENDPOINT: "http://seaweedfs:24453",
    STORAGE_ACCESS_KEY: saved.STORAGE_ADMIN_ACCESS_KEY,
    STORAGE_SECRET_KEY: saved.STORAGE_ADMIN_SECRET_KEY,
  });
  const storageEnv = (prefix, bucket) => ({
    STORAGE_ENDPOINT: "http://seaweedfs:24453",
    STORAGE_BUCKET: bucket,
    STORAGE_ACCESS_KEY: saved[`${prefix}_ACCESS_KEY`],
    STORAGE_SECRET_KEY: saved[`${prefix}_SECRET_KEY`],
  });
  const internal = Object.fromEntries(
    Object.entries(saved)
      .filter(([key]) => key.endsWith("DATABASE_URL"))
      .map(([key, value]) => {
        const url = new URL(value);
        url.hostname = "postgres";
        return [key, url.href];
      }),
  );
  const hostname = tailnet();
  const origin =
    // biome-ignore lint/suspicious/noUndeclaredEnvVars: Host Compose configuration runs outside Turbo.
    process.env.FITLOOM_APP_ORIGIN ??
    (hostname ? `https://${hostname}:24443` : "http://localhost:24410");
  const inbox =
    // biome-ignore lint/suspicious/noUndeclaredEnvVars: Host Compose configuration runs outside Turbo.
    process.env.FITLOOM_MAIL_ORIGIN ??
    (hostname ? `https://${hostname}:24444` : "http://localhost:24420");
  envFile("bootstrap.env", internal);
  envFile("migrate.env", {
    MIGRATOR_DATABASE_URL: internal.MIGRATOR_DATABASE_URL,
  });
  write(resolve(directory, "postgres-password"), adminPassword);
  saved.FIXTURE_INBOX_SECRET ??= randomBytes(32).toString("hex");
  write(
    savedPath,
    Object.entries(saved)
      .map(([k, v]) => `${k}=${v}\n`)
      .join(""),
  );
  const common = {
    FITLOOM_ENV: "development",
    MAIL_PROVIDER: "mailpit",
    MAIL_ENCRYPTION_KEY: saved.MAIL_ENCRYPTION_KEY,
  };
  envFile("web.env", {
    ...common,
    ...storageEnv("STORAGE_DEV_WEB", "fitloom-dev"),
    AUTH_DATABASE_URL: internal.AUTH_DATABASE_URL,
    WEB_DATABASE_URL: internal.WEB_DATABASE_URL,
    AUTH_SECRET: saved.AUTH_SECRET,
    AUTH_BASE_URL: origin,
    AUTH_TRUSTED_ORIGINS: origin,
    MAILPIT_PUBLIC_URL: inbox,
    FIXTURE_INBOX_ENABLED: "true",
    FIXTURE_INBOX_SECRET: saved.FIXTURE_INBOX_SECRET,
  });
  envFile("worker.env", {
    ...common,
    ...storageEnv("STORAGE_DEV_WORKER", "fitloom-dev"),
    WORKER_DATABASE_URL: internal.WORKER_DATABASE_URL,
    FILE_STAGING_ROOT: "/var/lib/fitloom/private-files",
    MAILPIT_HOST: "mailpit",
    MAILPIT_SMTP_PORT: 24421,
    MAIL_FROM: "fitloom@example.test",
  });
  envFile("tools.env", {
    ...Object.fromEntries(
      Object.entries(internal).filter(([key]) => key.startsWith("TEST_")),
    ),
    FITLOOM_ENV: "test",
    MAIL_PROVIDER: "mailpit",
    AUTH_DATABASE_URL: internal.TEST_AUTH_DATABASE_URL,
    AUTH_SECRET: saved.TEST_AUTH_SECRET,
    TEST_AUTH_SECRET: saved.TEST_AUTH_SECRET,
    AUTH_BASE_URL: "http://localhost:24411",
    AUTH_TRUSTED_ORIGINS: "http://localhost:24411",
    MAIL_ENCRYPTION_KEY: saved.TEST_MAIL_ENCRYPTION_KEY,
    TEST_MAIL_ENCRYPTION_KEY: saved.TEST_MAIL_ENCRYPTION_KEY,
    TEST_STORAGE_RESET_ACCESS_KEY: saved.STORAGE_TEST_RESET_ACCESS_KEY,
    TEST_STORAGE_RESET_SECRET_KEY: saved.STORAGE_TEST_RESET_SECRET_KEY,
    TEST_STORAGE_ENDPOINT: "http://seaweedfs:24453",
    TEST_STORAGE_BUCKET: "fitloom-test",
    TEST_STORAGE_ACCESS_KEY: saved.STORAGE_TEST_WEB_ACCESS_KEY,
    TEST_STORAGE_SECRET_KEY: saved.STORAGE_TEST_WEB_SECRET_KEY,
    TEST_STORAGE_WORKER_ACCESS_KEY: saved.STORAGE_TEST_WORKER_ACCESS_KEY,
    TEST_STORAGE_WORKER_SECRET_KEY: saved.STORAGE_TEST_WORKER_SECRET_KEY,
    TEST_MAILPIT_HOST: "mailpit-test",
    TEST_MAILPIT_URL: "http://mailpit-test:24422",
    MAILPIT_PUBLIC_URL: "http://mailpit-test:24422",
  });
  write(
    resolve(directory, "access.json"),
    `${JSON.stringify({ origin, inbox, hostname }, null, 2)}\n`,
  );
  for (const volume of [
    "fitloom-postgres-local",
    "fitloom-mailpit-local",
    "fitloom-mailpit-test",
  ])
    run("docker", ["volume", "create", volume], { stdio: "ignore" });
  return { origin, inbox, hostname };
}
function stopWatcher() {
  if (process.platform !== "darwin" || !existsSync(agentPath)) return;
  spawnSync("launchctl", ["bootout", `gui/${process.getuid()}`, agentPath], {
    stdio: "ignore",
  });
}
function startWatcher() {
  if (process.platform !== "darwin") {
    console.log(
      "For automatic source updates, run pnpm dev:watch in another terminal.",
    );
    return;
  }
  stopWatcher();
  const xmlEscape = (value) =>
    value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  const executable = run("/bin/sh", ["-c", "command -v docker"], {
    stdio: "pipe",
    encoding: "utf8",
  }).trim();
  const path = `${dirname(executable)}:/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin`;
  write(
    agentPath,
    `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0"><dict><key>Label</key><string>${label}</string><key>ProgramArguments</key><array><string>/usr/bin/caffeinate</string><string>-s</string><string>/bin/sh</string><string>${xmlEscape(resolve(root, "scripts/compose-watch.sh"))}</string></array><key>WorkingDirectory</key><string>${xmlEscape(root)}</string><key>EnvironmentVariables</key><dict><key>PATH</key><string>${xmlEscape(path)}</string></dict><key>RunAtLoad</key><true/><key>KeepAlive</key><true/><key>ThrottleInterval</key><integer>10</integer><key>StandardOutPath</key><string>${xmlEscape(resolve(directory, "watch.log"))}</string><key>StandardErrorPath</key><string>${xmlEscape(resolve(directory, "watch.log"))}</string></dict></plist>\n`,
  );
  const log = resolve(directory, "watch.log");
  if (!existsSync(log)) write(log, "");
  chmodSync(log, 0o600);
  run("launchctl", ["bootstrap", `gui/${process.getuid()}`, agentPath]);
}
function configureTailscale({ hostname }) {
  if (!hostname) return;
  run("tailscale", [
    "serve",
    "--bg",
    "--yes",
    "--https=24443",
    "http://127.0.0.1:24410",
  ]);
  run("tailscale", [
    "serve",
    "--bg",
    "--yes",
    "--https=24444",
    "http://127.0.0.1:24420",
  ]);
  const status = JSON.parse(
    run("tailscale", ["serve", "status", "--json"], {
      stdio: "pipe",
      encoding: "utf8",
    }),
  );
  for (const [host, web] of Object.entries(status.Web ?? {})) {
    if (host === `${hostname}:24443` || host === `${hostname}:24444`) continue;
    const port = host.split(":").at(-1);
    if (
      ["http://127.0.0.1:3000", "http://127.0.0.1:18025"].includes(
        web.Handlers?.["/"]?.Proxy,
      )
    )
      run("tailscale", ["serve", `--https=${port}`, "off"]);
  }
}
const action = process.argv[2] ?? "up";
if (action === "up") {
  stopWatcher();
  const access = prepare();
  docker([
    "up",
    "--detach",
    "--build",
    "--wait",
    "--wait-timeout",
    "240",
    "--remove-orphans",
  ]);
  configureTailscale(access);
  startWatcher();
  console.log(
    `Fitloom: ${access.origin}/account\nMailpit: ${access.inbox}\nCompose Watch is running in the background on macOS.`,
  );
} else if (action === "down") {
  stopWatcher();
  docker(["down", "--remove-orphans"]);
} else if (action === "status") {
  docker(["ps", "--all"]);
  if (process.platform === "darwin")
    run("launchctl", ["print", `gui/${process.getuid()}/${label}`]);
} else if (action === "logs")
  docker(["logs", "--follow", "--tail=80", "web", "worker"]);
else if (action === "test" || action === "validate") {
  prepare();
  docker([
    "run",
    "--no-deps",
    "--rm",
    "--build",
    "tools",
    ...(action === "validate"
      ? [
          "sh",
          "-c",
          "pnpm test:workspace && pnpm check && pnpm build && pnpm --filter @fitloom/application test:http",
        ]
      : []),
  ]);
} else if (action === "migrate") {
  prepare();
  docker(["run", "--no-deps", "--rm", "--build", "migrate"]);
} else if (action === "recovery") {
  prepare();
  run(process.execPath, ["scripts/verify-foundation-recovery.mjs"]);
} else if (
  action === "operator-bootstrap" ||
  action === "operator-recover-mfa"
) {
  prepare();
  docker([
    "run",
    "--no-deps",
    "--rm",
    "--build",
    "migrate",
    "node",
    "scripts/operator-admin.mjs",
    action === "operator-bootstrap" ? "bootstrap" : "recover-mfa",
    ...process.argv.slice(3),
  ]);
} else if (action === "account") {
  run(process.execPath, ["scripts/validation-account.mjs"]);
} else
  throw new Error(
    "Expected up, down, status, logs, test, validate, migrate, recovery, operator-bootstrap, operator-recover-mfa, or account",
  );
