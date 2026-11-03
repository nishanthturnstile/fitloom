import { fixtureInbox, identityEnvironment } from "@fitloom/application";
import { createPool } from "@fitloom/db";

let pool: ReturnType<typeof createPool> | undefined;
export const runtime = "nodejs";
export async function POST(request: Request) {
  const { config } = identityEnvironment(process.env);
  if (
    config.mode === "production" ||
    process.env.FIXTURE_INBOX_ENABLED !== "true"
  )
    return new Response(null, { status: 404 });
  const secret = process.env.FIXTURE_INBOX_SECRET;
  if (!secret || !process.env.WEB_DATABASE_URL)
    return new Response(null, { status: 503 });
  if (!pool) {
    pool = createPool({
      purpose: "web",
      connectionString: process.env.WEB_DATABASE_URL,
      max: 2,
    });
    pool.on("error", () => {});
  }
  return fixtureInbox({
    pool,
    secret,
    environment: config.mode,
    account: "local-fixture",
  })(request);
}
