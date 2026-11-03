import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import {
  createWorkspaceService,
  provisionTenant,
  saveSetupDraft,
} from "../packages/application/dist/index.js";
import { createPool } from "../packages/db/dist/index.js";

// biome-ignore lint/suspicious/noUndeclaredEnvVars: One-shot verification runs outside Turbo.
const connectionString = process.env.TEST_MIGRATOR_DATABASE_URL;
// biome-ignore lint/suspicious/noUndeclaredEnvVars: One-shot verification runs outside Turbo.
const webConnectionString = process.env.TEST_WEB_DATABASE_URL;
if (
  new URL(connectionString).pathname !== "/fitloom_test" ||
  new URL(webConnectionString).pathname !== "/fitloom_test"
)
  throw Error("Isolated test database required");
const admin = createPool({ connectionString, purpose: "web", max: 1 }),
  web = createPool({
    connectionString: webConnectionString,
    purpose: "web",
    max: 1,
  });
const identity = randomUUID(),
  user = randomUUID(),
  records = [];
await admin.query("SELECT pg_advisory_lock(68122902)");
try {
  await admin.query(
    'INSERT INTO public."user"(id,name,email,email_verified) VALUES($1,$1,$2,true)',
    [user, `${user}@example.test`],
  );
  await admin.query(
    "INSERT INTO app.principals(id,auth_user_id) VALUES($1,$2)",
    [identity, user],
  );
  const service = createWorkspaceService({
      pool: web,
      resolveIdentity: async () => ({ principalId: identity }),
    }),
    profile = {
      shopName: "Search plan fixture",
      locationName: "Main",
      businessMode: "tailoring",
      ownerName: "Synthetic owner",
      ownerPhone: "+919876543210",
      address: "Synthetic street",
      timezone: "Asia/Kolkata",
      consentAccepted: true,
      consentVersion: "workspace-authority-v1",
    };
  const envelope = (payload) => ({
    scope: { kind: "principal" },
    operationKey: randomUUID(),
    correlationId: randomUUID(),
    payload,
  });
  await service.execute(
    saveSetupDraft,
    envelope({ ...profile, expectedVersion: 0 }),
  );
  const provision = await service.execute(
    provisionTenant,
    envelope({ ...profile, expectedVersion: 1 }),
  );
  const target = (await service.choices())[0];
  await admin.query("BEGIN");
  try {
    await admin.query("SET LOCAL ROLE fitloom_migrator");
    await admin.query(
      "SELECT set_config('app.principal_id',$1,true),set_config('app.tenant_id',$2,true),set_config('app.location_id',$3,true)",
      [identity, target.tenantId, target.locationId],
    );
    await admin.query(
      "INSERT INTO app.customers(tenant_id,location_id,name,created_by,updated_by,creation_operation_id,segment,phone_display,phone_country_code,phone_e164) SELECT $1,$2,'Search fixture '||lpad(n::text,5,'0'),$3,$3,$4,CASE WHEN n%10=0 THEN 'important' END,CASE WHEN n=9999 THEN '+919876543210' END,CASE WHEN n=9999 THEN 'IN' END,CASE WHEN n=9999 THEN '+919876543210' END FROM generate_series(1,10000)n",
      [target.tenantId, target.locationId, identity, provision.operationId],
    );
    await admin.query(
      "INSERT INTO app.customer_tags(tenant_id,location_id,customer_id,label) SELECT tenant_id,location_id,id,'Priority' FROM app.customers WHERE tenant_id=$1 AND location_id=$2 AND segment='important'",
      [target.tenantId, target.locationId],
    );
    await admin.query("ANALYZE app.customers");
    await admin.query("ANALYZE app.customer_tags");
    const sizes = (
      await admin.query(
        "SELECT count(*)::integer rows,sum(pg_column_size(c))::bigint row_bytes,pg_total_relation_size('app.customers')::bigint table_and_index_bytes FROM app.customers c WHERE (tenant_id,location_id)=($1,$2)",
        [target.tenantId, target.locationId],
      )
    ).rows[0];
    assert.equal(sizes.rows, 10000);
    const source = await readFile(
      new URL(
        "../packages/db/migrations/0035_customer_authority.sql",
        import.meta.url,
      ),
      "utf8",
    );
    const start = source.indexOf(" WITH filtered AS MATERIALIZED");
    const end = source.indexOf(" RETURN result;", start);
    const extracted = source
      .slice(start, end)
      .trim()
      .replace(" INTO result", "");
    const core = extracted
      .replace(/s\.tenant/g, "($1::uuid)")
      .replace(/s\.location/g, "($2::uuid)")
      .replace(/\bq\b/g, "($3::jsonb)")
      .replace(/\bneedle\b/g, "($4::text)")
      .replace(/\bdigits\b/g, "($5::text)")
      .replace(/\boff\b/g, "($6::int)")
      .replace(/\blim\b/g, "($7::int)");
    const cases = [
      { name: "empty", search: "", offset: 0, tags: [] },
      { name: "exact-phone", search: "9876543210", offset: 0, tags: [] },
      { name: "substring", search: "fixture 099", offset: 0, tags: [] },
      { name: "tag", search: "", offset: 0, tags: ["Priority"] },
      { name: "count", search: "fixture", offset: 0, tags: [] },
      { name: "late-page", search: "", offset: 9975, tags: [] },
    ];
    for (const scenario of cases) {
      const q = { status: "active", segment: null, limit: 25, ...scenario };
      delete q.name;
      const raw = JSON.stringify(q);
      const actual = (
        await admin.query(
          "EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) SELECT app.customer_page($1::jsonb)",
          [raw],
        )
      ).rows[0]["QUERY PLAN"];
      const params = [
        target.tenantId,
        target.locationId,
        raw,
        q.search
          .replaceAll("\\", "\\\\")
          .replaceAll("%", "\\%")
          .replaceAll("_", "\\_"),
        q.search.replace(/[^0-9]/g, ""),
        q.offset,
        25,
      ];
      const plan = (
        await admin.query(
          `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${core}`,
          params,
        )
      ).rows[0]["QUERY PLAN"];
      records.push({
        scenario: scenario.name,
        query: q,
        actualFunction: actual,
        expandedFunctionStatement: plan,
      });
    }
    await writeFile(
      new URL(
        "../docs/implementation/evidence/customer-search-10000-plans.json",
        import.meta.url,
      ),
      `${JSON.stringify(
        {
          recordedAt: new Date().toISOString(),
          scopeRows: 10000,
          sizes,
          method:
            "Actual customer_page execution plus its verbatim inner SELECT expanded with bound local variables under the same owner role/scope. Seed and ANALYZE are rolled back in fitloom_test.",
          records,
        },
        null,
        2,
      )}\n`,
    );
    console.log(
      JSON.stringify(
        records.map((r) => ({
          scenario: r.scenario,
          functionMs: r.actualFunction[0]["Execution Time"],
          expandedMs: r.expandedFunctionStatement[0]["Execution Time"],
        })),
      ),
    );
  } finally {
    await admin.query("ROLLBACK");
  }
} finally {
  await Promise.all([admin.end(), web.end()]);
}
