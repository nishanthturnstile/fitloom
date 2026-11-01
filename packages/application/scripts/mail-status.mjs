import { createPool } from "@fitloom/db";

const pool = createPool({
  connectionString: process.env.AUTH_DATABASE_URL,
  purpose: "auth",
  max: 1,
});
try {
  const rows = await pool.query(
    "SELECT id,kind,state,attempts,last_error,created_at FROM app.auth_mail ORDER BY created_at DESC LIMIT 30",
  );
  console.log(JSON.stringify(rows.rows, null, 2));
} finally {
  await pool.end();
}
