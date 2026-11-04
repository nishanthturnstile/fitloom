# Foundation operations and verification

Phase 1B is implemented and verified locally on 2026-11-01. The next application increment is [phase 2 customers, garment masters, and measurements](../product/roadmap.md#phase-2-build-the-customer-and-measurement-book). Subscriptions, platform billing, and payment-provider integrations are deferred for the internal product. Manually recorded business payments remain required in phase 3 and their other owning phases. Production hosting, backup scheduling, real provider integration, and business policy decisions retain their owners below.

## Run and inspect the application

Run commands from the Mac checkout with Docker Desktop and Tailscale available. [Local development](local-development.md) lists fixed ports, private configuration, volumes, and Windows access.

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Build current code, apply reviewed migrations, start dependencies, and enable background Compose Watch |
| `pnpm dev:status` | Inspect all services and Watch |
| `pnpm dev:logs` | Follow web and worker diagnostics |
| `pnpm db:migrate` | Build and apply forward migrations without resetting records |
| `pnpm validate` | Reset only guarded test data; run database/application tests, lint, types, optimized build, and HTTP integration checks |
| `pnpm verify:recovery` | Rehearse a matched database/private-object restore using synthetic test fixtures |
| `pnpm verify:resources` | Record local container and database observations during baseline and two-client account traffic |
| `node scripts/verify-hot-reload.mjs` | Temporarily edit and restore web/shared/worker source; verify loaded code and unchanged container identities |
| `pnpm dev:down` | Stop containers and Watch, retaining volumes |

Six persistent services should be healthy: PostgreSQL, SeaweedFS, two Mailpit instances, web/API, and worker. `bootstrap`, `migrate`, and `storage-init` normally finish as `Exited (0)`. Do not interpret those successful one-shot exits as crashes. Restart policies recover processes while Docker is running; they do not keep a sleeping or disconnected Mac reachable.

Apply only reviewed forward migrations. Never edit a migration already applied to a retained database, use schema push, or pass migration credentials to web/worker. A queue-library upgrade also requires reviewing the retained SQL adapter against pg-boss's pinned schema. Runtime processes do not start the SDK supervisor or install queues. Current installation contains 23 migrations, `0000`–`0022`.

## Read protected operational status

After a real operator authenticator challenge, call `GET /api/operator/status` using that session's cookie. Admission requires an active verified principal, explicit `jobs.manage`, a session created within fifteen minutes, and a verified challenge within five minutes. Ordinary owners receive 403. Do not paste cookies or challenge material into tickets.

| Field | Meaning and limit |
| --- | --- |
| `database` | Snapshot query succeeded through the auth role; a separate web-role `SELECT 1` reports that connection's availability |
| `storage` | A bounded three-second S3 `HeadBucket` succeeded with the configured web identity; it does not test every object's integrity |
| `worker` | Latest successful database iteration: `observed` through thirty seconds, then `stale`; absent observation is `unknown` with null time/age |
| `queues.foundation`, `queues.mail` | Pending/running/terminal-failed counts, currently due work, expired claims, and oldest due age; no due work has null age |
| `queues.outbox` | Undispatched intent count and oldest pending age |
| `backups` | Always `unknown`, owner `external`; no backup monitor or schedule is installed |
| `state` | `ok` when the observed worker, tested connections/storage, and known terminal-failure counts pass; otherwise `degraded` |

HTTP 200 means the protected snapshot was retrieved. Inspect its component fields even when the response is 200. `ok` does not establish backup freshness, recipient delivery, commercial readiness, or production readiness. The singleton worker observation advances at most once per five seconds after successful processing; it records one observed instance, not fleet membership. An observation within thirty seconds can precede a subsequent crash. Queue lag and failures remain independent signals.

When identity/snapshot storage cannot be queried, status returns 503 with unknown components and null queues. It never invents zero backlog during an outage. A web-only database or S3 outage returns a retrieved but degraded snapshot. Responses are private/no-store and contain no job payloads, email contents, storage keys, session tokens, or MFA secrets.

## Trace commands and work safely

Web command and operator execution, worker jobs, and mail attempts emit structured Pino observations. Fields include event/kind, correlation ID, operation/job IDs when applicable, safe tenant/location IDs, attempt, elapsed milliseconds, outcome, and error category. `LOG_LEVEL` is consumed by web and worker loggers and passed through Turborepo. Logger failures cannot change a committed command result.

Command outbox jobs retain the source command's correlation ID. Service work uses its durable job identity; global auth mail uses its mail UUID and has no tenant command identity. These observations cover those execution boundaries, not a complete distributed trace of every HTTP request. Raw upload lifecycle events also remain in PostgreSQL file events. Access logging is disabled because verification/reset URLs contain tokens. Neither domain payloads nor operator reasons are copied into diagnostic events; reasons remain in restricted durable audit.

Mail `smtp_accepted` means SMTP accepted the message. `smtp_accepted_settlement_unknown` means SMTP acceptance preceded failed database settlement. Leave the durable claim for recovery and investigate the database; another send may occur. Do not report recipient delivery or exactly-once email. Failure tests exercise this sequence against real Mailpit.

Web auth/workspace pools are process-owned and reused across route-module reloads. Identity services and source modules still reload, so this does not pin old application logic. Environment/credential changes require a process restart through `pnpm dev`. Resource observations include short-lived health-check clients and all processes using the named database roles; the live reload check separately exercises the demo's protected discovery route and verifies auth/web connection bounds after each edit.

## Respect runtime budgets

These are initial local limits from the implemented consumers. Changing them requires reviewing those consumers and repeating the affected verification. Local observations are not target-server capacity estimates.

| Boundary | Current budget |
| --- | --- |
| Database pools | Web 5, auth 3, worker 3 per process; web pools persist across module reloads, operator APIs reuse auth. `createPool` accepts only integer maxima 1–20. Container health probes briefly use separate one-connection pools |
| Database deadlines | Acquire 3 s; statement 10 s; lock 2 s; idle transaction 15 s; entire transaction 20 s; idle pooled connection 30 s |
| Command conflict retry | At most 3 complete attempts; each resolves current authority before replay/write |
| JSON mutations and fixture inbox | 16 KiB streamed body, 5 s deadline, cancellation observed |
| Lists | 50 per page, deterministic UUID tie ordering, offset integer 0–100000, scoped totals and continuation |
| Images | JPEG/PNG, 5 MiB input/output, 12 million decoded pixels, 2 active uploads per web process, body 15 s, encoder 5 s |
| S3 | 6 s put/delete; download length bound and 15 s deadline enforced on the returned stream, including already-buffered bytes |
| File lifecycle | Upload intent accepts for 1 h; unreferenced cleanup grace 24 h; at most 50 file rows/100 legacy-plus-v2 keys per batch |
| Worker concurrency | One mail attempt and one foundation handler concurrently; idle poll 1 s; outbox and expired-claim recovery batches 50 |
| Foundation jobs | 60 s fenced lease; 3 attempts per cycle, 5/10 s delays; terminal failure requires admitted investigation/retry |
| Mail | 120 s interrupted-claim recovery; 5 attempts with persisted backoff and token expiry; SMTP connect/greeting 5 s, socket 10 s |
| Queue retention | Prune at most 100 settled envelopes per iteration after 7 days; durable application identities/outcomes remain |
| Process shutdown | SIGINT/SIGTERM stop new iterations; drain bounded at 25 s, Compose grace 30 s |
| Fixture replay window | Exact raw-byte HMAC; timestamp within ±300 s before and after ingestion; receipt and local-effect uniqueness are separate |
| Authentication | Database sessions 8 h, freshness 15 min, refresh interval 1 h, cookie cache disabled; persistent route/subject limits and MFA lockout documented in [identity policy](../architecture/authentication.md) |
| Local logs | Docker JSON rotation at 10 MiB × 3 per service |

Paged GET array APIs preserve their array response and add `X-Total-Count` plus `X-Next-Offset` when another page exists. This applies to workspace discovery, files, tenant jobs, operator jobs, and tenant lookup. Team JSON contains independently bounded member/role/invitation groups with counts and a common next offset. Workspace discovery and file/team panels expose continuation controls. All Locations checks authority at every location before returning its scoped count or page. Invalid offsets fail with 400. Each page rechecks current authority; offsets describe the current dataset, so inserts/deletions between requests can change page membership. Operator owner IDs are capped at fifty per tenant with a separate `ownerCount`.

## Local resource observations

`pnpm verify:resources` passed on 2026-11-01, 12:17:50–12:18:07 UTC. After warming `/account`, the script took three baseline samples and five samples while two clients requested that route with 100-ms pacing. It completed 112 requests with no failures. Baseline means the script generated no traffic during those samples; other clients and normal container health checks can still run. Development Next.js, TypeScript watchers, and worker processes are included.

| Container | Observed memory range (MiB) | Highest sampled Docker CPU % |
| --- | --- | --- |
| Web | 1416.2–1598.5 | 92.74 |
| Worker | 875.3–934.4 | 20.82 |
| PostgreSQL | 69.4–70.0 | 8.48 |
| SeaweedFS | 188.8–188.9 | 4.41 |
| Development Mailpit | 13.1–13.3 | 5.37 |
| Test Mailpit | 17.2–17.3 | 4.68 |

The observed client-connection maximum was four, including the measurement connection and transient probes; PostgreSQL's configured maximum was 100. This account-only traffic does not fill authenticated workspace pools. The separate live hot-reload check signs in the demo, repeatedly exercises protected workspace discovery around source edits, and verifies auth/web bounds. The optimized HTTP suite exercises authenticated commands and actual dependencies. These short local observations do not establish saturation throughput, memory limits, production pool sizing, or a production capacity guarantee. Raw timestamped observations are in `.local/foundation-resources-latest.json`; the script overwrites that machine-local report on each successful run.

## Recover known failures

| Symptom | Action |
| --- | --- |
| Database unavailable | Check PostgreSQL health and private runtime configuration. Restore connectivity; do not change grants to bypass a failing query. Reuse the original operation key when retrying uncertain mutations |
| Storage unavailable | Check SeaweedFS health, bucket, service credentials, and local volume space. After config changes restart SeaweedFS and run `pnpm dev` to repeat actual startup write/read/delete probes |
| Worker stale, queue age increasing | Inspect worker health/logs and database availability, then restart the worker. Expired claims recover with a new fence; stale handlers cannot settle the replacement claim |
| Terminal foundation failure | Read safe job status with current workspace permission or operator MFA. Investigate the category, then use the documented retry/cancel API with an operation key, correlation ID, and operator reason. Retry preserves total attempts and resets the cycle bound |
| Failed/expired verification or reset mail | Use `pnpm --filter @fitloom/application mail:status` from the prepared checkout for bounded safe IDs/states/categories. Request a fresh verification/reset through the supported account flow; erased/expired payloads are not replayable |
| Lost upload/attachment response | Keep the staging UUID and begin/attach keys. Retry the same normalized image/command; changed bytes conflict after preparation. Do not create a new identity just because the first response was lost |
| Retired/orphan bytes remain | Collection intentionally waits 24 h. Check active references and the cleanup job. Investigate/retry failed cleanup rather than deleting arbitrary bucket keys |
| Login loops or verification opens old URL | Use the canonical Tailscale HTTPS origin, configured trusted origins, and a fresh email. Cookies and callbacks derive from this origin; loopback is for health checks |
| Lost operator authenticator | Follow the independently verified identity/evidence procedure in [operator recovery](private-files-and-operator-recovery.md#bootstrap-and-restricted-operator-mfa-recovery); the CLI revokes sessions and forces new enrollment/challenge |
| Backup status unknown | Consult the external backup owner. A passing local restore rehearsal does not supply an offsite copy or backup schedule |

Operator bootstrap/recovery commands now build and run inside the migration container with its private migration credential. They require no host application build and do not put database URLs on the command line. The documented CLI arguments are unchanged. No real demo owner is granted operator access by tests or startup.

Day 7 repairs a delayed-write race from Day 6: preparation commits normalized digest/size/type before S3, and new objects use `objects/v2/{UUID}/{SHA256}`. A retry with different content fails; a delayed earlier write cannot replace the successful object at a different digest key. Existing layout-1 objects remain readable at their original keys. Before upgrading any other retained environment, stop/drain old web writers and confirm legacy objects match recorded digests. Migration labels legacy metadata but cannot reconstruct bytes already damaged by an earlier race. Cleanup derives only registered legacy/v2 references. No runtime path accepts arbitrary object keys.

## Rehearse application restore locally

1. Run `pnpm validate` successfully to create fresh, synthetic database and real private-file fixtures.
2. Stop other **test** writers/workers and avoid source/config changes during the rehearsal. Keep the normal development stack running. Do not run another validation concurrently.
3. Run `pnpm verify:recovery` from the prepared checkout.
4. Read the redacted `.local/foundation-recovery-latest.json` report. Success includes `disposableDatabaseDropped: true`.

The script guards exact `fitloom_test` roles/database and `fitloom-test` storage. It rejects existing test clients, captures at most 250 finalized/attached objects within 50 MiB, verifies their digests, records release source/lock fingerprints and migration hashes, and takes a custom-format PostgreSQL dump. Test writers must remain quiescent throughout capture; the script does not coordinate arbitrary external writers. Never point it at development or production data.

The dump restores into a randomly named, restricted disposable database using the matching PostgreSQL tools. No side-effect worker starts on the clone. Verification compares every application-table count, migration hashes and exact journal debit/credit totals; reapplies migrations safely; deliberately removes a workspace object and a measurement photo; restores the captured object set and verifies each digest; then exercises purpose-specific downloads, exact measurement capture, foreign-tenant denial, runtime table/DDL denial, saved-operation replay, and revoked authority. Measurement-photo revocation in the clone blocks new byte reads while preserving its scalar capture. Test objects are restored in cleanup, and the clone is dropped. Private artifacts use a restricted `.local/recovery-*` directory and are removed on success; failure retains diagnostics for investigation. Remove failed artifacts after resolving the cause because they contain synthetic database/object snapshots.

This proves an application-level matched logical restore using the retained local release, roles, and configuration. It does not recreate a lost PostgreSQL cluster/roles, restore the entire SeaweedFS filer/volume server, establish PITR, or measure production RPO/RTO. The external environment must retain PostgreSQL, object data and filer metadata, compatible releases, credentials/configuration, encryption keys, and actual backup evidence together. Restore into isolation with side effects stopped, validate authority/integrity, and only then admit traffic/workers. PostgreSQL's [SQL dump guidance](https://www.postgresql.org/docs/18/backup-dump.html) and [pg_restore reference](https://www.postgresql.org/docs/18/app-pgrestore.html) describe logical restore mechanics; the rehearsal is not host backup automation.

## Verification recorded on 2026-11-01

`pnpm validate` passed **12 database tests and 65 application tests**, lint, TypeScript, optimized production build, and real optimized-app HTTP integration checks. Counts include Node parent tests. Migrations install cleanly and reapply. All checks use the isolated test database/bucket/Mailpit, while explicit live demo checks use only their documented fixture.

| Acceptance area | Retained evidence |
| --- | --- |
| Roles, tenant/location relationships, context cleanup, migrations | `packages/db/test/isolation.test.mjs`: runtime privilege denial, two-tenant isolation, same-backend commit/rollback, false commit, transaction timeout |
| Commands, decimals, journals, audit/outbox atomicity | `packages/application/test/commands.test.mjs`: concurrent replay, changed payload/stale version, injected rollback, balanced immutable journals, correlation/redaction, throwing observer |
| Verified identity, sessions, operator MFA/recovery | `test/identity.test.mjs`: actual Mailpit links and TOTP, password/reset/revocation, SQL admission and CLI recovery, transactional owner recovery, uncertain SMTP settlement |
| Resumable setup, workspace authorization, delegation, invitations | `test/workspaces.test.mjs`: repeated provisioning, partial drafts, current grant changes, wrong/expired/revoked/duplicate invitations, final-owner and location checks |
| Durable workers and inbox | `test/jobs.test.mjs`: receipt/intent atomicity, duplicate/unordered events, signature rejection, restart/lease/fence, retry exhaustion, cancellation, multi-batch cleanup |
| Files and bounded pages | `test/files.test.mjs`: image bounds, lifecycle/replay, cross-tenant/location and revoked access, finalization failure, attachment/cleanup race, 56-member/location and 54-file page boundaries |
| Delayed S3 writes and stream deadline | `test/blob-store.test.mjs`: real delayed SeaweedFS write after timeout cannot replace different-content retry; buffered HTTP body rejects reads beyond its whole-stream deadline |
| HTTP errors, cache/projections, status truthfulness | `scripts/web-smoke.mjs` in application package: actual web/worker/SMTP/S3, real worker stop/restart and natural stale transition, isolated database/storage failures, MFA status and ordinary-owner denial |
| Matched restore | Phase 2 final `pnpm verify:recovery`: 49 migrations, 61 objects, 8 balanced journal lines; exact measurement capture, purpose-specific photo restore/revocation, saved results and permissions verified after actual dump/restore; clone removed. Latest elapsed time 57.306 s includes rebuilding tools; see [final phase 2 evidence](../implementation/evidence/phase-2-build-3-increment-8.md) |
| Live development behavior | Demo file/API and Chrome regressions pass download integrity, lost-response attachment replay, retirement and mobile layout; live web/shared/worker source reload passes with stable container identities and bounded auth/web connections |

The latest HTTP run observed an idle worker drain of 24 ms; the configured hard limit remains 25 seconds. The restore run is timed only as a local rehearsal, not a recovery objective. Machine-local redacted resource and restore reports are generated under `.local/`; they contain no passwords or mail/reset contents. Re-run commands to obtain current evidence after changes.

Tested stack: Node.js 26.13.0, pnpm 12.16.1, PostgreSQL 18.6, Next.js 16.4.3, React 19.3.1, TypeScript 7.0.2, Drizzle ORM 0.45.4, pg 8.23.1, Better Auth/adapter 1.7.14, pg-boss 12.38.0, Nodemailer 10.3.1, Mailpit 1.33.0, SeaweedFS 4.51, AWS S3 client 3.1161.0, Sharp 0.35.5, Pino 10.4.0, Docker Engine 29.9.2 and Compose 5.6.1. Manifests, lockfile, and image digests retain exact dependencies.

## Dependencies and next owners

| Item | Owner and latest safe point |
| --- | --- |
| Commercial admission, plans, billing callbacks, entitlements | Deferred in full by internal-product decision. Existing development wiring/production guard remains; an internal deployment needs explicit internal-access wiring, not subscription implementation |
| Payment-provider signatures, account mapping, reconciliation | Deferred until explicitly reopened. Business money is recorded manually. The signed local fixture is generic test evidence only |
| Resend credentials and verified sender | Product owner/developer before external email acceptance. Only Mailpit delivery is verified here |
| Real currency/tax/document/posting rules | Product owner before corresponding real financial/document operations; INR fixtures do not settle policy |
| Privacy jurisdiction, retention, upload types | Product owner before real-data use; initial image policy and synthetic records remain development defaults |
| Offsite backups, scheduling, freshness, cluster/server restore, routing/TLS and capacity | External environment owner before deployed use. Notify after locally verified phase 3; assess first deployment candidate after phase 4 |

Continue 1B → phase 2 → phase 3 and onward locally. Neither deferred 1C nor deferred 1D blocks internal business development. Phase 3 must retain advances, collections, balances, receipts, refunds, and correction history as manual records without a payment provider.
