import { readMigrationFiles } from "drizzle-orm/migrator";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

export async function migrateDatabase(connectionString) {
  if (!connectionString) throw new Error("MIGRATOR_DATABASE_URL is required");
  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    await client.query("SET ROLE fitloom_migrator");
    await client.query("SELECT pg_advisory_lock(68122901)");
    const folder = new URL("../migrations", import.meta.url).pathname;
    const history = await client.query(
      "SELECT to_regclass('drizzle.__drizzle_migrations') AS relation",
    );
    if (history.rows[0].relation) {
      const applied = await client.query(
        "SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at",
      );
      const files = readMigrationFiles({ migrationsFolder: folder });
      for (const [index, row] of applied.rows.entries()) {
        const file = files[index];
        if (
          !file ||
          file.hash !== row.hash ||
          String(file.folderMillis) !== row.created_at
        )
          throw new Error(
            "Applied migration history differs from retained SQL",
          );
      }
    }
    await migrate(drizzle(client), { migrationsFolder: folder });
  } finally {
    await client.end();
  }
}
if (process.argv[1] === new URL(import.meta.url).pathname)
  await migrateDatabase(process.env.MIGRATOR_DATABASE_URL);
