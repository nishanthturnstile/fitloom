import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, type PoolClient } from "pg";
import * as authSchema from "./auth-schema.js";
import * as schema from "./schema.js";

export { authSchema, schema };

export function createPool(options: {
  connectionString: string;
  purpose: "web" | "worker" | "auth" | "operator";
  max?: number;
}) {
  const max = options.max ?? (options.purpose === "web" ? 5 : 3);
  if (!Number.isInteger(max) || max < 1 || max > 20)
    throw new Error("Pool max must be between 1 and 20");
  return new Pool({
    connectionString: options.connectionString,
    max,
    application_name: `fitloom:${options.purpose}`,
    connectionTimeoutMillis: 3000,
    idleTimeoutMillis: 30000,
    statement_timeout: 10000,
    lock_timeout: 2000,
    idle_in_transaction_session_timeout: 15000,
    options: "-c transaction_timeout=20000",
  });
}

export type Scope =
  | { kind: "principal"; principalId: string }
  | {
      kind: "tenant";
      principalId: string;
      tenantId: string;
      locationId: string;
    };

function validateId(value: string) {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    )
  )
    throw new Error("Invalid scope identifier");
  return value;
}

const bindDatabase = (client: PoolClient) =>
  drizzle(client, { schema: { ...authSchema, ...schema } });
export type TransactionDatabase = ReturnType<typeof bindDatabase>;

// Trusted server code supplies an authenticated principal. Client input alone is never authority.
export async function withScope<T>(
  pool: Pool,
  scope: Scope,
  run: (db: TransactionDatabase) => Promise<T>,
): Promise<T> {
  const principalId = validateId(scope.principalId);
  const tenantId = scope.kind === "tenant" ? validateId(scope.tenantId) : "";
  const locationId =
    scope.kind === "tenant" ? validateId(scope.locationId) : "";
  const client = await pool.connect();
  let destroy = false;
  let connectionError: Error | undefined;
  const onError = (error: Error) => {
    connectionError ??= error;
    destroy = true;
  };
  client.on("error", onError);
  try {
    await client.query("BEGIN");
    await client.query(
      "SELECT set_config('app.principal_id', $1, true), set_config('app.tenant_id', $2, true), set_config('app.location_id', $3, true)",
      [principalId, tenantId, locationId],
    );
    const admitted = await client.query<{ allowed: boolean }>(
      scope.kind === "tenant"
        ? "SELECT app.can_access_location($1::uuid, $2::uuid) AS allowed"
        : "SELECT app.principal_active() AS allowed",
      scope.kind === "tenant" ? [tenantId, locationId] : [],
    );
    if (!admitted.rows[0]?.allowed) throw new Error("Database scope denied");
    const result = await run(bindDatabase(client));
    if (connectionError) throw connectionError;
    const commit = await client.query("COMMIT");
    if (commit.command !== "COMMIT")
      throw new Error("Transaction was rolled back before commit");
    return result;
  } catch (error) {
    try {
      if (destroy) throw connectionError;
      await client.query("ROLLBACK");
    } catch {
      destroy = true;
    }
    throw error;
  } finally {
    client.release(destroy);
    client.off("error", onError);
  }
}

export type DatabaseTransaction = Parameters<
  Parameters<TransactionDatabase["transaction"]>[0]
>[0];
// Auth adapters need a real Drizzle transaction so their inner transactions use savepoints.
export async function withDatabaseTransaction<T>(
  pool: Pool,
  run: (db: DatabaseTransaction) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  let connectionError: Error | undefined;
  const onError = (error: Error) => {
    connectionError ??= error;
  };
  client.on("error", onError);
  try {
    return await bindDatabase(client).transaction(async (db) => {
      const result = await run(db);
      if (connectionError) throw connectionError;
      // PostgreSQL must still be able to execute a statement before Drizzle commits.
      await db.execute(sql`SELECT 1`);
      return result;
    });
  } finally {
    client.release(Boolean(connectionError));
    client.off("error", onError);
  }
}
