import { parseArgs } from "node:util";
import { createPool } from "../packages/db/dist/index.js";

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    email: { type: "string" },
    reason: { type: "string" },
    evidence: { type: "string" },
  },
});
const [action] = positionals;
if (
  !["bootstrap", "recover-mfa"].includes(action) ||
  positionals.length !== 1 ||
  !values.email ||
  !values.reason ||
  !values.evidence
)
  throw new Error(
    "Specify bootstrap/recover-mfa, --email, --reason, and --evidence (verified identity check reference)",
  );
// biome-ignore lint/suspicious/noUndeclaredEnvVars: Administrative/one-shot script runs outside Turbo.
const url = new URL(process.env.MIGRATOR_DATABASE_URL);
if (!url.username.endsWith("_migrator"))
  throw new Error("A dedicated migration identity is required");
const pool = createPool({
  connectionString: url.href,
  purpose: "operator",
  max: 1,
});
try {
  await pool.query("SET ROLE fitloom_migrator");
  const command =
    action === "bootstrap"
      ? "SELECT app.bootstrap_operator($1,$2,$3) AS id"
      : "SELECT app.recover_operator_mfa($1,$2,$3) AS id";
  const result = await pool.query(command, [
    values.email,
    values.reason,
    values.evidence,
  ]);
  console.log(
    `${action} completed for principal ${result.rows[0].id}. Operator admission requires a new verified authenticator challenge.`,
  );
} catch {
  process.exitCode = 1;
  console.error(
    "Administrative action rejected; verify the known identity, evidence reference, and migration access.",
  );
} finally {
  await pool.end();
}
