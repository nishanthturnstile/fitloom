# Fitloom application

This guide covers `packages/application/`. Run project commands from the repository root unless a command specifies another directory.

Shared server command execution, verified identity, email/MFA, decimal policies, and journal contracts. See [identity, Mailpit, and production Resend configuration](../architecture/authentication.md). PostgreSQL persistence functions, grants, and migrations belong to `@fitloom/db`. The main entry point is Node-only. `./workspace-contracts` exposes browser-safe Zod schemas and inferred types.

## Execute commands

Create a runtime pool with `createPool` from `@fitloom/db`. Pass that pool and a trusted `resolveIdentity` function to `createCommandExecutor`. The identity resolver runs on every attempt, including replay. It must resolve a current authenticated session and return a validated `principalId`; it must reject unauthenticated requests with an access `CommandError`. Day 3 supplies the Better Auth database-session identity service. Day 4 product routes use this resolver for each protected read and mutation.

The returned executor accepts a trusted command definition and an untrusted invocation:

```ts
const execute = createCommandExecutor({ pool, resolveIdentity });
const saved = await execute(saveSetupDraft, {
	scope: { kind: "principal" },
	operationKey,
	correlationId,
	payload: { expectedVersion: 0, shopName: "Example shop", locationName: "Main" },
});
```

A tenant invocation supplies `{ kind: "tenant", tenantId, locationId }`. It never supplies a principal. Identity, current principal status, tenant/membership/location admission, and the command's current permission are checked before operation lookup. Command-specific `authorize` checks run on the same database connection before replay or mutation. The authority includes the admitted scope, permission, and projection name. The command's strict output schema defines the returned fields. Workspace reads use explicit field schemas. The retained admission interface and development-only guard are described in [workspace contracts](../architecture/workspaces.md). Subscriptions, commercial entitlements/quotas, platform billing, and payment-provider integrations are deferred for the internal product; this interface does not require implementing them. Manual shop payment records remain in their owning business modules.

The operation identity is unique by explicit owner kind, owner ID, command kind, and caller operation key. Principal owners cover pre-tenant work. Tenant owners cover shop commands. Platform owners are separate database records and receive no ordinary runtime admission.

`requestHash` prefixes SHA-256 with `v1:`. It hashes validated JSON with sorted object keys and stable array order. The executor includes scope and normalized payload, including expected versions. Correlation ID is excluded so retries can carry a new request trace. Whitespace trimmed by a command's schema therefore has the same semantic hash. Changed semantic input under the same key raises a conflict.

Claiming an operation waits on PostgreSQL uniqueness and row locks. A completed matching operation returns its saved result after authorization. A new operation executes its mutation and writes audit, outcome, and deferred job intents in the same transaction. A deferred constraint prevents incomplete operations from committing. Durable operation identities have no expiry or runtime deletion path.

Serialization and deadlock errors retry the whole transaction at most three times with the same operation identity. Each attempt resolves identity and authorizes again. Other failures return a `CommandError` with category `validation`, `access`, `conflict`, or `temporary`. Public errors omit SQL and driver details. Command callbacks must perform only local transactional work. External effects belong to a worker after commit.

## Available foundation commands

| Command | Authority and behavior |
| --- | --- |
| `saveSetupDraft` | Own principal. Creates or updates a bounded shop/location draft with an expected version. Initial version is zero; each successful mutation increments it. |
| `provisionTenant` | Verified active principal. Checks the current setup version and creates the initial owner workspace through the restricted provisioning function. Replay rechecks verification. |
| `postJournal` | Current location and explicit `journal.post` permission. Posts a balanced journal or derives a reversal from an existing entry. |

Draft content and provisioning have no direct runtime write path. The old provisioning function is migration-only. Day 4 adds `beginAnotherSetup`, `savePreferences`, `updateWorkspace`, `createRole`, `setMemberRole`, `invitationCommand`, `revokeInvitation`, and `acceptInvitation`. `createWorkspaceService` composes current-identity reads and command execution. See [setup identities, role permissions, invitations, projections, and current admission wiring](../architecture/workspaces.md).

## Audit and deferred work

A mutation returns its result, an audit description, and a list of deferred jobs. Audit records retain actor, command action, entity identity, reason, previous/next versions, changed field names, operation identity, and timestamp. Tenant, location, and correlation ID are available through the owner-qualified operation relationship. Audit accepts bounded changed field names, not arbitrary payload or before/after value JSON. Foundation commands use fixed reasons and version metadata, so shop names, passwords, session/reset tokens, MFA secrets, and provider secrets never enter command audit.

`command_outbox` stores at most twenty bounded, versioned job intents per operation. Job keys are unique within the operation. Audit, outcome, and all intents commit or roll back with domain changes and journal entries. The worker relays committed intents through a fixed migrated queue with durable outcomes, fenced claims, bounded retries, cancellation, and authorized retry. See [durable workers and inbox](../architecture/jobs-and-inbox.md) for the SQL adapter choice and signed fixture contract. Day 3 implements a separate encrypted, transactional auth-mail intent and consumer. No external provider is called by the executor.

## Decimal policies

Pinned `decimal.js` 10.6.0 uses an isolated constructor with sixty significant digits and half-up rounding. Zod 4.6.7 validates external inputs before arithmetic. Decimal boundaries accept plain decimal strings only. Numbers, exponents, non-finite values, leading-zero forms, excessive fractional precision, and out-of-range values fail validation.

| Schema or helper | Policy |
| --- | --- |
| `moneyInput` | Signed decimal string, eighteen integer digits and two fractional places. Canonical output has two places. Matches journal `numeric(20,2)`. |
| `positiveMoneyInput` | Posted money strictly greater than zero |
| `unitPriceInput` | Eighteen integer digits and six fractional places |
| `quantityInput` | Twelve integer digits and six fractional places, with explicit `piece`, `metre`, or `hour` unit |
| `intermediateInput` | Thirty integer digits and twelve fractional places |
| `roundPosted` | Explicit half-up rounding of a validated intermediate to posted money |
| `extendPrice` | Exact unit price times quantity, then explicit posted rounding |
| `sumMoney` | Exact sum, validated against the posted-money bound |

Precision limits count supplied fractional digits, including trailing zeros. `moneyInput` rejects `1.000`; callers must use an explicit rounding step when reducing precision. Unit-price and quantity fields are not persisted before their owning business modules exist. Those modules must declare matching PostgreSQL precision and scale. Date-only business fields remain distinct from timestamp fields.

Development fixtures use INR with two posted decimal places. Real currency, tax, legal document, and recognition policies remain product decisions.

## Journal invariants

Ledger accounts belong to an explicit tenant or platform owner. Entry source identity and source operation are unique within that owner. Each line references both its entry and account through owner-qualified foreign keys. Entries retain actor, currency, source, and reversal links.

Runtime roles cannot insert, update, or delete journal rows directly. `app.post_journal` checks current `journal.post` permission, account ownership, bounded decimal strings, currency, and balance before returning. It rejects excess precision before inserting into `numeric(20,2)`. Deferred database balance checks remain independent of reader projections. SQL triggers reject changes to existing entries and lines. A reversal retains the original, derives the opposite sides and exact amounts, and can reference only an entry under the same owner and currency. An entry can have one direct reversal.

Journal reads require `journal.read` and the posting's location scope. No fixture accounting permission or account is granted to real owners automatically. Business modules must provide their posting matrices and account setup before financial commands become product entry points. Platform ledger ownership is modeled and isolated; runtime platform posting awaits separate operator MFA admission. No null tenant means unrestricted access.

## Verify locally

From the repository root, run `pnpm dev` to start the Compose stack, then `pnpm test` or `pnpm validate`. Tests execute inside a tools container using the current Linux image. See [local Compose setup and hot reload](../operations/local-development.md).

The database suite resets only the guarded local `fitloom_test` schemas. The application suite uses fresh synthetic principals and tenants in that database. Both suites hold the same test advisory lock so their database work cannot overlap. Developer records stay in `fitloom_dev`.

The suites cover clean/repeated migrations, role and tenant isolation, false-commit and timeout regressions, concurrent normalized retries, changed input, stale edits, replay authorization, bounded conflict retries, rollback of all local effects, outbox deduplication, decimal limits, journal immutability, source uniqueness, owner separation, and reversals. Run `pnpm lint`, `pnpm typecheck`, and `pnpm build` for workspace checks.

References: [decimal.js API](https://mikemcl.github.io/decimal.js/), [PostgreSQL constraint triggers](https://www.postgresql.org/docs/18/sql-createtrigger.html), and [node-postgres client errors](https://node-postgres.com/apis/client).

Day 3 verification on 2026-11-01: 25 application tests pass, including parent tests. The HTTP smoke script launches the optimized Next.js app and actual mail worker with test-only credentials, then verifies account rendering, registration, Mailpit capture, verification, sign-in, protected projection, operator denial, and logout. After `pnpm build` and `pnpm test`, run `pnpm --filter @fitloom/application test:http`.

Day 4 verification on 2026-11-01: 41 reported application tests pass, including parent tests. New checks cover setup and invitations against PostgreSQL and Mailpit, prior identity review fixes, and commercial/feature/usage hook ordering. The optimized-app HTTP check also covers resumable setup, provisioning retry, workspace rendering, direct-route denial, origin rejection, private response caching, and recovery UI with an existing session.

Day 5 adds `processFoundationWork`, `fixtureInbox`, `signFixture`, `retryJob`, and `cancelJob`. The real cleanup handler, inbox effects, queue pruning/retry, actor revocation, claim recovery, and operator MFA admission are exercised against PostgreSQL; HTTP verification includes an actual worker-process restart.

Day 6 adds a SeaweedFS-backed `BlobStore`, bounded image validation/streaming, `beginFile`/`attachFile`/`retireFile`, and current-identity `createFileService`. The identity service supplies strict, durable operator commands and supported owner recovery on the same transaction as its encrypted mail intent. See [private files and operator recovery](../operations/private-files-and-operator-recovery.md). Application test files run serially against the shared isolated database, while tests retain explicit concurrent command/race checks.

Day 7 adds immutable digest-addressed blob references, durable content preparation, whole-stream download deadlines, protected `operationalStatus`, bounded page methods, shared browser-safe team schemas, and optional typed `Observe` callbacks. Diagnostics never include domain inputs and cannot alter command results. `pnpm validate` passes 65 application tests and optimized HTTP failure/recovery checks. Root `pnpm verify:recovery` exercises actual database/object restore; `pnpm verify:resources` measures the live local stack. See [the operating contract and evidence](../operations/foundation-operations.md).
