import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";

const { Client } = createRequire(
  new URL("../packages/db/package.json", import.meta.url),
)("pg");
const admin = new Client({
  // biome-ignore lint/suspicious/noUndeclaredEnvVars: Compose bootstrap only; never forward administrator credentials through Turbo.
  connectionString: process.env.LOCAL_ADMIN_DATABASE_URL,
});
await admin.connect();
try {
  await admin.query(
    await readFile(
      new URL("../packages/db/sql/bootstrap.sql", import.meta.url),
      "utf8",
    ),
  );
  for (const [database, prefix] of [
    ["fitloom_dev", ""],
    ["fitloom_test", "TEST_"],
  ]) {
    for (const identity of ["migrator", "web", "worker", "auth", "operator"]) {
      const login = `${database}_${identity}`;
      const connection = new URL(
        process.env[`${prefix}${identity.toUpperCase()}_DATABASE_URL`],
      );
      if (
        connection.username !== login ||
        !/^[a-f0-9]{64}$/.test(connection.password)
      )
        throw new Error("Invalid local bootstrap identity");
      const found = await admin.query(
        "SELECT 1 FROM pg_roles WHERE rolname=$1",
        [login],
      );
      if (!found.rowCount)
        await admin.query(
          `CREATE ROLE ${login} LOGIN PASSWORD '${connection.password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS`,
        );
      await admin.query(`GRANT fitloom_${identity} TO ${login}`);
    }
    if (
      !(
        await admin.query("SELECT 1 FROM pg_database WHERE datname=$1", [
          database,
        ])
      ).rowCount
    )
      await admin.query(
        `CREATE DATABASE ${database} OWNER ${database}_migrator`,
      );
    await admin.query(`REVOKE ALL ON DATABASE ${database} FROM PUBLIC`);
    for (const identity of ["migrator", "web", "worker", "auth", "operator"])
      await admin.query(
        `GRANT CONNECT ON DATABASE ${database} TO ${database}_${identity}`,
      );
    // biome-ignore lint/suspicious/noUndeclaredEnvVars: Compose bootstrap only; never forward administrator credentials through Turbo.
    const target = new URL(process.env.LOCAL_ADMIN_DATABASE_URL);
    target.pathname = `/${database}`;
    const client = new Client({ connectionString: target.href });
    await client.connect();
    try {
      await client.query(
        "REVOKE ALL ON SCHEMA public FROM PUBLIC; ALTER SCHEMA public OWNER TO fitloom_migrator",
      );
      await client.query(
        `GRANT CREATE ON DATABASE ${database} TO fitloom_migrator`,
      );
    } finally {
      await client.end();
    }
  }
  console.log(
    "Development and isolated test roles/databases ready; existing records retained.",
  );
} finally {
  await admin.end();
}
