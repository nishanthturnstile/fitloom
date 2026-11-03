# Fitloom application

This guide covers `packages/application/`. Run project commands from the repository root unless a command specifies another directory.

Shared server command execution, verified identity, email/MFA, decimal policies, and journal contracts. See [identity, Mailpit, and production Resend configuration](../architecture/authentication.md). PostgreSQL persistence functions, grants, and migrations belong to `@fitloom/db`. The main entry point is Node-only. `./workspace-contracts`, `./master-contracts`, and `./garment-definition` expose browser-safe schemas and pure helpers.

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
| `nonnegativeRateInput` | Configured default rate, zero allowed, six canonical places; rejects every negative spelling before normalization, including `-0` |
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

## Garment master contracts

Phase 2 Build One increment 1 provides `master-contracts.ts`, `garment-definition.ts`, `master-manifest.ts`, and `master-starters.ts`. The contracts cover format 1 definitions, command payloads, bounded errors and pages, and separate schema-only/priced output schemas. Command execution lives in the separate master service described below.

`garmentDefinition` validates ordered sections, length/number/text/boolean/select fields, construction groups, semantic compatibility, and unique IDs. Every eligible service requires an explicit nullable rate override in `garmentSave`; an unset base rate also uses explicit null. `masterRateInput` aliases `nonnegativeRateInput`. Names retain their display spelling; authoritative name normalization belongs to the SQL persistence function.

`definitionIdentities` separates immutable meaning from editable labels, order, bounds, and precision. `identityIssues` compares against a tenant/garment-scoped registry. `copyHistoricalDefinition` creates fresh IDs for retired nodes and for options whose owner receives a new ID. The SQL persistence layer independently enforces the same rules.

`garmentPreview` creates an ordered, value-free model for both unsaved and exact historical definitions. It supplies image alternatives and an explicit empty-schema message. `createStarterBundle(newId)` allocates original development examples with unset rates and no database writes. Original illustration IDs resolve only to bundled static assets.

Run `pnpm --filter @fitloom/application build`, then `node --test packages/application/test/master-contracts.test.mjs` for the focused contract checks. Increment 1 verified 51 contract tests alongside workspace lint, type checks, and production build. See [increment 1 evidence](../implementation/evidence/phase-2-build-1-increment-1.md). Subsequent increments add independent SQL enforcement, permission delegation, the service/API, and the complete garment/service/add-on settings workflow.

Increment 2 extends `createRole` to accept `masters.read`, `masters.manage`, and `masters.rates.read`. Management requires both read permissions, and SQL independently checks the same rule and the actor's current delegation authority. `workspacePermissionLabel` supplies display labels while preserving the exact permission values in role submissions. [Master persistence](database.md#garment-master-persistence) documents the restricted save/read functions. Increment 3 adds the master service and its authorization-before-replay wiring, described below.

Increment 2 verification on 2026-11-01: `pnpm validate` passes 12 database tests and 135 application tests, including 19 reported storage tests. The final retained set contains 30 migrations. Lint, types, production build, and optimized HTTP smoke also pass. [Increment 2 evidence](../implementation/evidence/phase-2-build-1-increment-2.md) records actual behavior, migration corrections, and remaining service/API/UI boundaries.

## Execute master commands and queries

Build One increment 3 adds `createMasterService({ pool, resolveIdentity, observe? })`. It uses the existing command executor and scoped transaction owner. The factory exposes `command(action, target, invocation)`, `catalog(target)`, `page(target, kind, query?)`, `garment(target, id, versionId?)`, `service(target, id, versionId?)`, `addon(target, id, versionId?)`, and `history(target, kind, id, query?)`.

The target is `{ tenantId, locationId }`. Invocation is `{ operationKey, correlationId, payload }`; actor identity comes from the trusted resolver. Command input and output are parsed with the shared strict contracts. The service pre-parses editor input to provide at most 30 bounded validation issues, then the executor validates normalized input again before hashing it. `MasterError` exposes a safe category, issues, and correlation ID. Driver SQL, constraint names, and payloads do not enter responses.

| Action | Exported command | Payload |
| --- | --- | --- |
| `garment.save` | `saveGarment` | Create/update definition, explicit nullable base rate, currency, and one explicit nullable override per eligible service |
| `garment.lifecycle` | `changeGarmentLifecycle` | Garment ID, expected header version, active state |
| `service.save` | `saveMasterService` | Create/update label, with ID and expected version for update |
| `service.lifecycle` | `changeServiceLifecycle` | Service ID, expected header version, active state |
| `addon.save` | `saveMasterAddon` | Create/update label, amount, INR currency, with ID and expected version for update |
| `addon.lifecycle` | `changeAddonLifecycle` | Add-on ID, expected header version, active state |
| `masters.starters.install` | `installMasterStarters` | `bundleVersion: "tailoring-core-v1"`, expected catalog version |
| `masters.reorder` | `reorderMasters` | Kind, moved ID, before ID or null for end, expected catalog version |
| `masters.visibility` | `changeMasterVisibility` | Expected catalog version and both hide-standard flags |

All writes require current `masters.read`, `masters.manage`, and `masters.rates.read` before replay. Expected-version and mutable-reference checks remain inside new mutations, so a successful retry can replay after its original save advanced the version or a service was later retired. Every result includes `catalogVersion`. Record commands audit their stable entity and header versions. Catalog commands audit `master_catalog` with the tenant UUID and previous/next order/settings tokens, including equal tokens on no-op initialization.

Starter definitions and fresh node IDs are generated inside the new-operation mutation. Installation locks catalog state, uses private publication helpers with the existing SQL validation, and creates missing template keys atomically. It preserves existing copies, rates, labels, IDs, active states, and schema history. A name collision rolls back the full installation and returns a bounded issue. Installation advances the catalog token once; applying the installed bundle again leaves it unchanged. Missing garment copies bind active starter services only, preserving any existing retired service copy.

Reads resolve current identity and `masters.read` at a concrete location. The service checks `masters.rates.read` before choosing the SQL projection. Schema-only pages/details/history omit price properties. Registers use active/available defaults, normalized prefix search, origin/applicability filters, a maximum of 50 rows, and offsets through 100000. Page results contain `items`, `total`, `nextOffset`, and `catalogVersion`; counts and rows use the same predicates. Current and exact-version reads remain accessible for inactive or hidden records.

The master contract bounds version inputs to PostgreSQL's positive/nonnegative integer range. A continuation token never exceeds the admitted offset range. `masterHistoryQuery` and `masterEmptyQuery` keep route query validation browser-safe. See [master API transport](web.md#master-api-transport) and [increment 3 evidence](../implementation/evidence/phase-2-build-1-increment-3.md). The settings UI configures garment schemas, services, add-ons, eligibility, nullable rates, and starter visibility.

Increment 3 verification on 2026-11-01: final `pnpm validate` passes 12 database tests, 144 application tests, lint, type checks, production build, and optimized HTTP master/baseline checks. The retained set contains 34 migrations. Actual repeated over-limit requests and a stalled request stream produce 413 and 408 responses. [Increment 3 evidence](../implementation/evidence/phase-2-build-1-increment-3.md) records checks, corrections, and remaining UI work.

Increment 4 adds the browser-safe `masterCommandResponse` schema helper and guidance illustration data in the shared pure preview model. The web garment editor preserves complete current rates and bindings during schema saves. It uses the current schema identity set to regenerate retired IDs when copying historical schemas. [Garment UI evidence](../implementation/evidence/phase-2-build-1-increment-4.md) records real Chrome scenarios plus the unchanged 12 database/144 application test regression counts, types/build/lint, and optimized HTTP checks.

Increment 5 adds service/add-on editors and editable rates/eligibility. Current choices resolve current labels and permitted add-on prices; garment history retains saved labels and its own rates. Retired references can carry forward unchanged from the locked current version or be removed. A retired service override cannot be changed while carried forward. [Catalog configuration evidence](../implementation/evidence/phase-2-build-1-increment-5.md) records first-use starter installation, collision rollback, replay, schema-only UI, and decimal behavior.

## Consume saved garment schemas

Use a stable `garmentId` with an exact `garmentVersionId` when storing a historical reference. Content revision and version ID identify immutable saved content. The detail's `version` is the current header edit token, including lifecycle changes, even when reading an older content version. Do not use that header token to identify historical content.

`catalogVersion` protects membership, ordering, and visibility commands. A content or price edit preserves it. Creation, an actual lifecycle change, ordering, visibility, or installation of missing starter copies advances it. No-op commands preserve it. Reinstallation returns existing IDs as well as new IDs, so nonempty result arrays do not imply a change.

Later measurement entry stores wearer values separately and defines its own intake projection and permissions. It can consume format 1 definitions and the pure ordered preview helpers without importing the Node service. Unknown format versions fail explicitly. A future persisted format requires a renderer for earlier stored formats.

`resolveGarmentRate` applies `rateOverride ?? baseRate`, preserving an explicit zero and leaving both-null unset. Eligible add-ons remain separate components. Later order confirmation owns immutable measurement/schema, service, add-on, and resolved-price snapshots; changing a default must not reprice an existing order.

The [final acceptance matrix](../implementation/evidence/phase-2-build-1-increment-6.md) maps each Build One scenario to executable checks and records the migration review, commands, outputs, and remaining limits.

## Customer foundation contracts

Build Two increment 1 starts with the browser subpaths @fitloom/application/customer-contracts and @fitloom/application/customer-phone. The contracts provide distinct IDs, UUIDv4 operation keys, strict customer and wearer profiles, fixed command payload schemas, bounded search/page shapes, and projection-free durable results. The Node export createCustomerService implements authorized reads and the eight fixed customer/wearer commands; browser modules remain free of service/database imports.

Use the customerPhone form parser to turn display input plus a supported country into the canonical phone object. The profile wire schema independently validates display/country/E.164/digits and accepts its own parsed output unchanged. Do not add phone-derived fields to an otherwise raw envelope after dispatch. Customer operation keys and exact payload bytes remain stable for retry.

Names use NFC, trimmed/collapsed ASCII whitespace, and 120 Unicode code points. Notes normalize line endings. SQL search identities fold ASCII case only. Profile height/weight remain original-unit positive decimal strings; they are not confirmed cutting measurements. Future write commands must use the shop timezone when validating birthdays.

The storage and role authority tests use actual PostgreSQL and the existing isolated test environment. See [increment 1 evidence](../implementation/evidence/phase-2-build-2-increment-1.md) for the 47,739-byte populated Unicode fixture, verification results, and the remaining transaction/duplicate-review work.


### Customer commands and reads

Use `createCustomerService({pool, resolveIdentity, observe})` with request-bound identity. Its interface is `page(target, query)`, `detail(target, customerId)`, `wearers(target, customerId, query)`, `activity(target, customerId, query)`, `duplicateCheck(target, input)`, `review(target, reviewId)`, and `command(name, target, envelope)`. Scope is a concrete tenant/location; the service derives the principal from the current session. Reads have a 15-second deadline and the database keeps its statement/transaction limits.

The fixed commands are customer.create/update/archive/restore and wearer.create/update/archive/restore. They use the existing executor with an optional domain SQLSTATE adapter. Their SQL claim checks the actor and location before replay. Authorization runs on every attempt; version, parent state and duplicate decisions run only for fresh writes. Customer plus optional self wearer, tags, safe activity and operation audit/result commit together. No-op saves preserve versions and produce no domain activity.

Duplicate save results retain only review identity, expiry and count. A separate currently authorized projection returns at most five summaries. Ten-minute reviews bind actor/scope/kind, normalized phone, complete intended-payload hash and candidate versions. Accepted creates and phone updates have distinct intents. Consumed or expired reviews cannot authorize fresh saves; a committed save replays after review removal. Both reads and issuance share the database budget of 30 checks/minute and at most two live check leases. Read leases are consumed by restricted SQL; the worker purges expiry in batches of 100 at most once per minute, including startup.

`CustomerError` carries an allowlisted code and bounded issues. Busy locks return a retryable 409, preserving the operation key. Durable results and diagnostic events contain no profiles or candidate summaries. CRM activity displays only You/Shop staff, event kind, changed field names, versions and timestamp.

The existing customer storage test fixture adds three service scenarios covering lifecycle/no-op/busy behavior, duplicate races/replay, and actor/permission/budget/rollback boundaries. The existing HTTP harness adds one customer protocol path. The customer register/read-only view is delivered in Increment 2. Increment 3 adds creation/editing and duplicate decisions. Photo ownership remains later work.


Workspace switching uses strict browser-safe destination/request/response schemas in workspace-contracts. `resolveWorkspaceDestination` only builds allowlisted paths from a freshly authorized target workspace. The endpoint owns preference persistence; source IDs, query/filter text and return tokens never participate in destination resolution. Customer return-state schemas are browser-safe exports from customer-contracts.


Increment 3 web forms use the existing `customer.create`, `customer.update` and explicit duplicate-review intents. No new command or database migration is required. Self-wearer creation stays atomic. The browser retains exact envelopes for uncertain retries and treats saved/review/error outcomes as the existing strict union. Increment 4 provides richer wearer management; Increment 5 adds private photos.


Increment 4 exposes the existing wearer create/update and customer/wearer archive/restore commands in the profile UI. It adds no persistence contract or migration. Parent/child lifecycle invariants, current-authority checks, same-customer ownership, shop-timezone birthday validation and original-unit strings remain enforced by the service/SQL functions. The existing wearer/activity continuation projections supply the UI's bounded pages. Increment 5 adds the separate photo service described below.


### CRM photo ownership

`createCustomerPhotoService` owns strict photo-owner parsing, current scope/actor authorization, three fixed commands, immutable upload identity and double-authorized inline reads. `customer-photo-contracts` is the browser-safe package subpath. The shared internal private-image module owns bounded normalization and response construction; CRM and workspace services keep separate permission-gated SQL entry points.

A photo owner is either a customer avatar or a named wearer's face/body slot. Bind/remove use slot versions, actor-bound operation replay and safe photo activity. Upload is a separate action after the domain owner exists. Photo results contain IDs, versions and changed state, not provenance or image values. Historical reads remain possible after archive; new writes require active parent and wearer. Cleanup reuses its existing fenced job/version and excludes both kinds of live attachment.
