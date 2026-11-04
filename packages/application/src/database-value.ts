import type { TransactionDatabase } from "@fitloom/db";
import type { sql } from "drizzle-orm";
import { z } from "zod";

// Parse the single JSON projection returned by restricted database functions.
export async function databaseValue<T extends z.ZodType>(
  db: TransactionDatabase,
  query: ReturnType<typeof sql>,
  schema: T,
): Promise<z.infer<T>> {
  const result = z
    .object({ rows: z.array(z.object({ value: z.unknown() })).length(1) })
    .parse(await db.execute(query));
  return schema.parse(result.rows[0]?.value);
}
