# Durable workers and provider inbox

Day 5 implements encrypted identity/invitation mail, abandoned staging-file cleanup, and a signed development/test inbox fixture. No payment provider is installed. Fixture events do not change billing, subscriptions, entitlements, or journals.

## Transaction and queue boundary

Commands write `app.command_outbox` in the same transaction as their mutation, audit, and saved result. Rollback removes all of them. The worker relays at most 50 committed intents per iteration. Outbox identity and source-key uniqueness make concurrent dispatch idempotent.

The pinned pg-boss 12.38.0 supports `fromDrizzle`. Fitloom deliberately retains its existing outbox to keep queue privileges out of the web role. Migrations create one fixed `fitloom-foundation` queue. Narrow security-definer functions insert envelopes, claim work, reconcile leases, and settle outcomes in its pinned PostgreSQL tables. The worker uses this SQL adapter, **not** pg-boss's JavaScript worker or supervisor. It never starts the SDK, installs schemas, or runs runtime DDL. Queue upgrades must review this adapter against the new storage schema and rerun the real-database suite. This is an explicit exception to the plan's preference for direct adapter enqueueing.

Application metadata is authoritative: job ID, kind, actor/service authority, tenant/location, source identity, input version, payload, state, total/cycle attempts, claim token, lease, due time, start/finish times, and safe error category. Attempts have separate durable rows. Completed, failed, and cancelled queue envelopes are pruned after seven days, at most 100 per iteration; application identities and outcomes remain. Pruning locks the application row against concurrent retry. Authorized retry recreates a missing envelope.

All these tables force RLS. Runtime roles cannot read or mutate them directly. Functions have fixed search paths, qualified references, and explicit role grants. Queue envelopes contain only the application job ID.

## Work execution and recovery

| Handler | Authority and execution policy |
| --- | --- |
| Identity/invitation mail | Separate encrypted transactional mail intent; one active bounded SMTP attempt; five attempts, persistent backoff, expiry, and interrupted-attempt recovery |
| `files.cleanup` | Daily UTC service obligation; one active batch of up to 50 eligible records; three attempts per failing batch; successful batches continue immediately until drained |
| `provider.fixture.v1` | Durable inbox receipt supplies service authority; three attempts with 5/10-second retry delays |
| `fixture.sensitive.v1` | Test fixture only; checks current verified active principal, membership, tenant/location, workspace permission, and authority consent before settlement |

The process executes at most one mail and one foundation handler concurrently. Foundation claims expire after 60 seconds. Each claim receives a new fencing token; expired tokens cannot finish later attempts. Recovery processes at most 50 expired claims per iteration. Exhausted work becomes visibly failed. Unknown handler kinds and unsupported input versions fail without automatic retry.

SIGINT/SIGTERM stop new iterations and drain current handlers for at most 25 seconds before forced exit. Durable claims recover after lease expiry. The heartbeat advances after successful database processing; a heartbeat establishes worker observation, not an empty backlog or successful recipient delivery.

Actor jobs are cancelled if current authority is revoked before execution. Explicit cancellation invalidates the claim token. Service obligations use durable records rather than a former employee's session. Provider effects, source state, receipt outcome, and successful job settlement commit together; event receipt uniqueness and source/version effect uniqueness are separate constraints.

Mail failures can be inspected with `pnpm --filter @fitloom/application mail:status` using the local auth credentials. Failed/expired mail payloads are erased; the existing verified-account resend/recovery flow creates a fresh token and durable intent rather than replaying an expired secret. The job retry APIs below manage foundation jobs, not erased auth-mail payloads.

SMTP acceptance can precede a lost database settlement. Recovery may send another message. Fitloom does not promise exactly-once email or equate SMTP acceptance with recipient delivery. Development/test mail uses Mailpit; production configuration requires Resend SMTP. No production delivery was tested.

## Protected status, cancellation, and retry

| Endpoint | Admission and result |
| --- | --- |
| `GET /api/workspaces/{tenant}/{location}/jobs?offset=0` | Current identity and `access.manage` in that location; tenant jobs in pages of 50 with scoped totals/continuation headers |
| `POST /api/workspaces/{tenant}/{location}/actions/retry-job` | Shared command envelope, payload `{ "jobId": "uuid" }`; failed jobs only |
| `POST /api/workspaces/{tenant}/{location}/actions/cancel-job` | Same command envelope and permission; pending/running jobs only |
| `GET /api/operator/jobs?offset=0` | Explicit `jobs.manage` grant and recent session-bound operator MFA; service jobs in pages of 50 with safe inbox outcome and scoped totals/continuation headers |
| `GET /api/operator/status` | Same grant/MFA; database/storage availability, worker observation, queue lag/failures, and explicitly unknown external backup status |
| `POST /api/operator/jobs` | Same admission, trusted origin, body `{ "jobId": "uuid", "action": "retry", "reason": "investigation reason", "operationKey": "unique key", "correlationId": "uuid" }`; `cancel` also supported |

Tenant changes use owner-scoped operation keys and transactional command audit. Operator changes recheck the actual user/session's MFA inside SQL and record principal, job, action, reason, and time. Ordinary owners have no operator grant. A state conflict returns 409. Retry resets the cycle limit and preserves total attempts. Cancellation does not recall an already accepted external message.

Responses use private/no-store caching and omit payloads, signatures, email contents, filesystem paths, and provider secrets. These are minimal diagnostic APIs; a job dashboard and broader operator recovery UI belong to later increments.

Day 7 adds persisted command correlations to foundation jobs and payload-free attempt observations. A real SMTP-accepted/failed-settlement regression proves that interrupted delivery remains recoverable without claiming exactly-once recipient delivery. See [status interpretation and recovery](../operations/foundation-operations.md) before treating HTTP 200 or a worker heartbeat as successful processing of all work.

## Signed fixture contract

Compose generates a separate private `FIXTURE_INBOX_SECRET` in `.local/web.env` and enables `FIXTURE_INBOX_ENABLED=true`. The route is always disabled in production. Outside Compose it is disabled unless explicitly enabled. The worker receives no verifier secret. Account `local-fixture` and environment come from server configuration, never event fields.

Send `POST /api/providers/fixture-v1` with JSON content type and exactly these fields:

```json
{"eventId":"UUID","sourceId":"UUID","version":1,"state":"confirmed"}
```

`version` is a positive PostgreSQL integer. States are `pending`, `confirmed`, and `cancelled`. `x-fitloom-timestamp` is Unix seconds, within five minutes. `x-fitloom-signature` is `v1=` followed by lowercase HMAC-SHA256 hex over `timestamp + "." + exact request bytes`. The exported server helper `signFixture` implements this test protocol. Do not reuse it as a real provider verifier.

The streamed body is limited to 16 KiB and five seconds, observes request cancellation, and rechecks timestamp freshness after ingestion. Verification uses exact raw bytes before JSON parsing or receipt insertion. Receipts retain their digest and validated fields, not unrestricted raw payloads. Invalid signatures return 401, invalid events 400, oversized events 413, and receipt failure 503. HTTP 202 means receipt **and** processing intent committed; it does not mean processing succeeded. An identical event retry returns the same receipt. Reusing an event identity with different bytes returns 409.

Distinct event IDs cannot duplicate an effect for the same provider/account/environment/source/version. Older/equal versions are ignored. Confirmed sources cannot regress to pending, and cancellation cannot be resurrected. Processing outcomes are `applied` or `ignored`; failures remain in the associated job and can be retried by an admitted operator. All payment-provider integration and platform subscription billing are deferred until explicitly reopened. This fixture remains generic inbox evidence. Shop payments are manually recorded through their business commands, not through fixture callbacks.

## Cleanup integration

Day 6 adds real SeaweedFS private files with locked metadata, references, and batch object deletion. Legacy Day 5 local staging remains isolated and collectable through its existing UUID/24-hour/symlink-safe contract. New uploads use the lifecycle in [private files and operator recovery](../operations/private-files-and-operator-recovery.md). Both cleanup paths run under the same fenced daily obligation.

Day 6 review fixed bounded body ingestion, replay freshness after reading, duplicate job projection code, and durable operator job mutations. Service retry/cancel now require an operation key and correlation ID; current MFA/grants are checked before replay.

## Verification

Run `pnpm dev`, then `pnpm validate`. Isolated PostgreSQL tests verify rollback, concurrent dispatch, raw signature and replay checks, receipt atomicity, duplicate/conflicting/unordered events, local-effect uniqueness, revoked authority, cancellation, bounded terminal failure, authorized retry after queue pruning, lease fencing, cleanup across multiple batches, and symlink rejection. Identity tests exercise service retry/cancel after a real TOTP challenge and reject expired MFA. The optimized-app HTTP check stops the actual worker, commits a signed receipt, restarts the worker, and verifies one durable effect alongside the full account/setup/Mailpit flow.

Mechanism references: [pg-boss transaction adapters](https://pgboss.io/api/adapters), [pinned pg-boss 12.38.0 source](https://github.com/timgit/pg-boss/tree/12.38.0), [PostgreSQL explicit locking](https://www.postgresql.org/docs/18/explicit-locking.html), and [transactional outbox guidance](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html).

Verified on 2026-11-01: 18 clean/repeatable migrations, 12 database and 51 application tests, lint, types, production build, optimized HTTP/worker/Mailpit checks, and a live Compose fixture round trip all pass.
