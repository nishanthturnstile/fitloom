# Phase 1B database identity and application foundations plan

Status: Planned. Prepared on 2026-10-31 against repository baseline `2958755`.

Execution policy updated on 2026-10-31: implement and verify on the local machine. Infrastructure, deployment platforms, server backup automation, and host schedulers are user-managed work outside Fitloom. The plan is ready; application implementation has not started.

Implement roadmap 1B in the retained Fitloom application. Deliver database isolation, verified identity, resumable shop setup, authorized workspaces, transactional commands, durable jobs, private files, and minimum operator recovery commands.

Use seven focused engineering days as the initial planning target. These are work increments, not calendar deadlines or a measured estimate. Resolve integration problems within the affected increment. If work exceeds the target, continue the same scope and retain its acceptance criteria.

The [requirements](requirements.md), [architecture](architecture.md), and [roadmap](roadmap.md#1b-implement-the-database-identity-and-shared-application-foundations) remain authoritative. This plan expands their implementation steps. Proposed names and implementation choices below become final when the corresponding code and migrations are reviewed.

## Establish the starting point

The [implementation status](../IN_PROGRESS.md) records workspace verification on 2026-10-31. The three commits present at preparation are dated that day. They establish a repository baseline, not a full week of implementation history.

| Area | State at preparation | Work remaining for 1B |
| --- | --- | --- |
| Workspace | pnpm and Turborepo, one lockfile, shared TypeScript and Biome configuration | Add dependencies, environment inputs, and scripts with their actual implementation |
| Web application | Next.js scaffold displaying the Fitloom heading | Authentication, onboarding, workspace selection, protected routes, and file streaming |
| Worker | Pino logging, idle lifecycle, and signal handling | PostgreSQL connection, durable handlers, retries, and outcomes |
| Database package | Empty module | Schema, migrations, role grants, constraints, RLS, and transaction helpers |
| Application package | Empty module | Shared commands, authorization, identity integration, and foundation services |
| Deployment | Deferred external 1C handoff | User manages the environment separately; local development continues |
| Subscription billing | Planned in 1D | Define the admission integration contract now and implement commercial behavior in 1D |

The workspace pins Node.js 26.13.0, pnpm 12.16.1, Next.js 16.4.3, React 19.3.1, TypeScript 7.0.2, Turborepo 2.11.10, Tailwind CSS 4.3.3, Biome 2.6.4, and worker Pino 10.4.0. These are repository facts. New foundation packages have not been installed or compatibility-tested.

## Keep the scope aligned with the roadmap

| Roadmap 1B item | Implementation increments | Required result |
| --- | --- | --- |
| 1. Database, reviewed migrations, roles, and transactions | Days 1 and 2 | Reproducible schema and one-connection transaction execution |
| 2. Identity, tenancy, operator MFA, onboarding, and selection | Days 1, 3, 4, and 6 | Real account and workspace flows with explicit authority |
| 3. Relationships, RLS, projections, and fresh checks | Days 1, 4, 6, and 7 | Tenant and location boundaries across reads, writes, files, and jobs |
| 4. Decimals, journal contracts, audit, operations, and atomic enqueueing | Days 1, 2, and 5 | Consistent local effects under failure, conflict, and retry |
| 5. Workers, inbox, private files, operator commands, limits, and errors | Days 3, 5, 6, and 7 | Observable durable work and authorized recovery |

Retain these later-phase boundaries:

- 1C records a deferred external handoff. The user owns Linux setup, deployment-platform selection, routing/TLS, host timers, server backups, and VPS moves separately. Do not implement infrastructure or deployment tooling in Fitloom. Use a real local PostgreSQL instance for application development and tests.
- 1D owns versioned commercial plans, subscription state, entitlements, usage admission, checkout, billing callbacks, manual owner export during lockout, and billing operator actions.
- Phase 2 owns customers, garment masters, and measurements. Phase 3 extends accounting into real charges, collections, refunds, pricing, and documents.
- Google, phone OTP, customer identity, advanced multi-location operations, full operator consoles, scheduled business exports, and privacy self-service retain their roadmap owners.

Build the foundation portions of onboarding and settings now. Later owners add plan selection, garment defaults, first-order tracking, tours, sample data, document settings, and operational policies. Do not mark the full parent requirements complete when only their foundation portions exist.

Continue 1B → 1D → phases 2–9 locally. Notify the user to plan the separate environment after locally verified phase 3. Assess the first deployment candidate after locally verified phase 4, when the tailoring workflow works end to end. Continue locally if the user is not ready. See the [deployment readiness checkpoint](roadmap.md#deployment-readiness-and-external-handoff). Application jobs, business scheduling, and local dependency setup remain in scope.

## Preserve module ownership

```text
Web route or Server Action
  -> shared application command
  -> current identity and authorized tenant/location
  -> one database transaction
       business records + audit + operation result + job
  -> commit
  -> worker performs external or deferred work
```

| Location | Owns |
| --- | --- |
| `packages/db/src/` | Connection creation, schema, transaction helpers, and persistence support |
| `packages/db/` | Drizzle configuration, reviewed migrations, and versioned role/bootstrap SQL |
| `packages/application/src/` | Identity, authorization, onboarding, commands, accounting contracts, audit, jobs, files, providers, and operator operations |
| `apps/web/src/app/` | Auth and setup screens, workspace navigation, route handlers, and Server Actions |
| `apps/worker/src/` | Handler registration, worker lifecycle, bounded concurrency, and shutdown |

Create internal modules inside these packages as real code requires them. Keep server exports out of browser bundles. Client components may import browser-safe input schemas or contracts through explicit safe exports, never the server module entry point. Add shared UI packages only when reuse exists.

Use the selected PostgreSQL 18, `pg`, stable Drizzle, Better Auth, Zod, decimal.js, pg-boss, Nodemailer, and Pino stack. Add sharp when the file implementation accepts images requiring decoding and re-encoding. Pin compatible package versions and the auth generator at implementation time. Do not replace the repository's existing pins based on an unverified version assumption.

## Day 1: Implement database roles schema and isolation

1. Set up a real local PostgreSQL instance and document connection setup. Separate runtime, migration, and test credentials. Isolate test databases and file paths from developer records. This local dependency setup does not require a Linux server or deployment platform.
2. Select compatible releases of `pg`, `drizzle-orm`, `drizzle-kit`, Better Auth, its Drizzle adapter, and pg-boss. Include the two-factor and persistent rate-limit schema requirements before generating auth tables.
3. Generate and review migrations. Use explicit SQL where the installed stable Drizzle release cannot express a required grant, constraint, or policy. Avoid schema push as the retained migration history.
4. Establish the initial schema groups below. Add their migrations with their owning increment when details depend on later implementation.
5. Implement bounded pools and transaction helpers. Set transaction-local tenant context on the exact connection used by the command.
6. Implement and verify tenant-qualified relationships and RLS before building protected product commands.

### Define record ownership

The groups below describe required concepts, not final table names.

| Group | Records and constraints |
| --- | --- |
| Authentication | Generated users, accounts, database sessions, verification records, MFA records, and persistent rate-limit storage required by the selected release |
| Principals | One explicit application principal mapped uniquely to an auth user, with current security status |
| Tenancy | Tenants, locations, memberships, roles, permission grants, and location grants with scoped uniqueness |
| Setup | Principal-owned setup progress before provisioning and tenant-owned progress after provisioning, with a durable provisioning identity |
| Operator authority | Explicit platform grants and security audit, separate from staff memberships |
| Operations | Owner-scoped operation keys, canonical hashes, outcomes, expected versions, and critical audit events |
| Accounting | Distinct shop and platform owners, posting source identity, currency, journal lines, and reversal links |
| Jobs and providers | Queue infrastructure, application job outcomes, delivery attempts, and deduplicated provider inbox events |
| Files | Opaque object identity, tenant and owner, location when applicable, lifecycle, checksum, media type, and byte count |

Use tenant-qualified parent keys and foreign keys for tenant-owned relationships. Include location identity in relationships that must remain within one location. Index the tenant-scoped filters and referencing columns used by actual queries. Archive referenced business records instead of applying broad cascading deletes.

Classify global authentication, principal, operator, and queue records explicitly. Do not use a null tenant value to mean unrestricted tenant access. Protect platform-owned accounting separately from tenant-owned accounting.

### Separate database privileges

- Give the migration identity schema and policy management rights. Runtime processes must not receive its credentials.
- Give the web runtime only required table, sequence, and queue insertion privileges. It must not own tables, inherit an owner role, be a superuser, or have `BYPASSRLS`.
- Give the worker only required queue privileges and authorized domain access. Tenant handlers use the same scoped transaction contract as web commands.
- Define separate, narrow admission paths for authentication and operator operations. Neither path implies unrestricted tenant reads.
- Version queue installation and upgrades. Do not grant worker DDL rights merely to make automatic queue initialization succeed.

Resolve membership discovery without requiring an already-selected tenant. Permit only principal-scoped discovery, followed by membership and location validation. During initial tenant creation, use a restricted provisioning path that creates the owner relationship atomically. Do not solve either bootstrap problem by disabling RLS globally.

Tenant context must be transaction-local and missing context must deny tenant-owned access. Database context is set by trusted server code after authorization, never directly from a client-supplied tenant ID. RLS supplements application permissions and field projections. PostgreSQL documents table-owner bypass, `BYPASSRLS`, and operations outside row-policy enforcement. See [PostgreSQL 18 row security](https://www.postgresql.org/docs/18/ddl-rowsecurity.html).

All transaction statements must use one acquired client. Do not mix a transaction with independent `pool.query` calls. See [node-postgres transactions](https://node-postgres.com/features/transactions).

Day 1 is complete when clean-database migrations succeed, repeated migration invocation has no new effects, runtime privileges are verified, and two-tenant isolation survives missing context and pool reuse after both commit and rollback.

## Day 2: Implement command consistency audit and decimals

Create one shared execution contract for Fitloom business commands. Define these inputs and outputs before implementing the first onboarding mutation:

| Contract | Required content |
| --- | --- |
| Invocation | Current actor, requested scope, command kind, operation identity, correlation ID, and validated payload |
| Authorized scope | Principal, explicit authority, tenant, permitted locations, permission decision, and projection |
| Mutation | Expected version when applicable and an owner-scoped operation key |
| Outcome | Persisted result reference or a specific validation, access, conflict, or temporary-failure error |
| Audit event | Actor, tenant/location where applicable, entity, action, time, reason, redacted changes, and operation ID |

Execute mutations in this order:

1. Parse external input and resolve current session and authority.
2. Open the scoped transaction and recheck the authorization facts needed for the write.
3. Claim the operation under a database uniqueness constraint. Canonicalize the validated semantic input and record a versioned request hash.
4. On a matching retry, reauthorize before returning the original result. Reject different input under the same operation key.
5. Check expected versions and apply business changes. Concurrent edits must produce an explicit conflict instead of silently overwriting state.
6. Write critical audit, operation outcome, and deferred job in the same transaction.
7. Commit before invoking an external service. Bound database conflict retries and retain the same operation identity throughout.

Scope operations by business or accounting owner and command kind. Define a principal-scoped operation for pre-tenant provisioning. Retain operation identities with durable source records. Audit authorization changes and protect audit history from ordinary update or deletion. Exclude passwords, session tokens, reset links, MFA secrets, and provider secrets from logs and audit payloads.

Implement decimal helpers with decimal strings at JSON boundaries and PostgreSQL `numeric` persistence. Reject non-finite values, excess input precision, and amounts outside declared bounds before database coercion. Declare precision and scale for each persisted field.

Support at least six fractional places where unit prices, quantities, and intermediate allocations require them. Development posted-money fixtures use INR with two decimal places and half-up rounding. Keep quantity units explicit and separate date-only fields from timezone-aware instants. The real market, currency, tax, and document rules remain product-owner decisions before real use.

Implement the journal contract with distinct shop and platform owners, source operation uniqueness, currency, debit and credit lines, actor, and reversal links. Verify balance per owner and currency before posting. Enforce immutability and prevent an alternate runtime write path from bypassing posting validation. Later modules supply their posting matrices before their first financial command.

Day 2 is complete when concurrent duplicate commands create one effect, changed payloads conflict, stale versions fail, injected failures roll back every local effect, and invalid decimal or journal inputs are rejected.

## Day 3: Implement verified identity email and operator MFA

Implement registration, email verification, resend, sign-in, session restoration, logout, password reset, password change, and session revocation. Do not provision a shop before verification.

Use Better Auth database sessions with cookie caching disabled. Map auth users uniquely to application principals. Check current principal status and session validity on every protected request. Handle missing principal mappings through an idempotent repair or fail-closed path, not duplicate principal creation.

Generate the auth schema using the chosen release and plugin configuration. Current documentation uses `@better-auth/drizzle-adapter`; verify the actual release's package and import paths rather than copying older examples. See [Better Auth Drizzle adapter](https://better-auth.com/docs/adapters/drizzle) and [session management](https://better-auth.com/docs/concepts/session-management).

Configure explicit origins, callback destinations, cookie policy, CSRF protection, session expiry, and sensitive-action freshness. Support localhost and the documented Tailscale development origin only when configured. Next.js development-origin configuration does not replace auth trusted origins.

Enable persistent rate limiting explicitly in development checks. Apply limits to sign-up, sign-in, recovery, resend, and MFA. Better Auth documents that server-side `auth.api` calls bypass its built-in client limiter, so any exposed wrapper using those calls needs its own admission limits. Trust forwarded client-address headers only from configured proxies. See [Better Auth rate limiting](https://better-auth.com/docs/concepts/rate-limit).

Require authenticator enrollment and a verified challenge before admitting an operator session to operator commands. Implement backup-code handling, one-time consumption, and rate-limited recovery. A stored MFA-enabled flag alone is not proof of a completed challenge. Define operator session freshness and trusted-device policy explicitly. See [Better Auth two-factor authentication](https://better-auth.com/docs/plugins/2fa).

Use Nodemailer for actual email transport. Introduce the minimal queue consumer now if needed, then complete worker behavior on Day 5. Persist delivery intent, attempts, and terminal errors. Make verification and recovery resends safe under retry. See [Nodemailer SMTP transport](https://nodemailer.com/smtp).

Inspect the installed auth adapter's transaction boundaries. A lifecycle hook is not evidence that token creation and job insertion share a transaction. Verify supported transaction participation, or implement a durable reconciliation mechanism for committed token records and document its guarantees. Do not claim atomic auth-email delivery based on a separate enqueue after a hook. Protect queued recovery-token material and discard expired work.

Day 3 is complete when verification gates provisioning, expired or reused tokens fail, recovery and logout persist correctly, revocation blocks the next protected request, operator MFA cannot be skipped, and failed email delivery remains visible. Test the password-reset and password-change session invalidation policy explicitly. Local SMTP capture proves local integration. Actual provider delivery requires configured credentials and recipient-side evidence.

## Day 4: Implement resumable shop setup and authorized workspaces

Build this real product flow:

```text
Register -> verify email -> save shop setup -> provision tenant and first location
                                           -> enter authorized workspace
```

Collect the foundation business profile, supported business mode, owner details, location details, timezone, and required setup consent. Separate personal preferences from shared shop settings. Persist progress server-side so setup resumes in another session.

Provision the tenant, initial location, owner membership, required grants, settings, audit, and operation result atomically. Lock or uniquely constrain the provisioning identity so concurrent submissions return the same tenant. Make deliberate creation of another tenant a distinct authorized operation.

Implement built-in role presets, protected preset definitions, explicit permissions, and location grants. Permit tenant role administration only within the actor's delegation rights. Prevent unauthorized self-elevation and removal of the final active owner. Implement the minimal staff invitation and acceptance path needed to exercise real membership assignment, with expiry, revocation, verified recipient identity, and duplicate acceptance handling.

Implement tenant and location selectors backed by authorized membership queries. Store a selection hint only after validation. Revalidate every command target and record reference. Explicitly authorize All Locations access. A client sentinel cannot widen scope.

Return field allowlists for each query. A restricted member must not receive owner contacts, private audit details, or financial fields merely because the UI hides them. Invalidate private view state on workspace change, and scope any existing drafts or caches to the principal and tenant.

Protect pages, route handlers, and Server Actions through shared application checks. Keep protected responses out of shared caches. Layout or navigation checks alone are insufficient. See [Next.js authentication guidance](https://nextjs.org/docs/app/guides/authentication).

Define the 1D admission contract now. Preserve the authority order of identity/security, membership/location, commercial state, feature resolution, and atomic usage admission. Before 1D exists, identify commercial behavior as unimplemented development policy. Do not substitute a hard-coded active subscription and claim entitlement enforcement is complete.

Day 4 is complete when two shops can be provisioned independently, setup resumes without duplication, invited membership works, tenant and location tampering fails, and permission changes take effect on the next protected request.

## Day 5: Complete durable workers and the provider inbox

Replace the idle worker with registered handlers for real foundation work. Complete auth-email delivery, abandoned-file cleanup, and inbox processing where an installed provider adapter exists.

Enqueue work inside the business transaction. Prefer pg-boss's documented `fromDrizzle(tx, sql)` adapter when supported by the pinned release. If unavailable, insert a domain outbox row in the transaction and implement a durable dispatcher with deduplication. Choose and document one path. Verify rollback of the job with the business mutation. See [pg-boss transaction adapters](https://pgboss.io/api/adapters).

Persist application job identity, kind, actor or service authority, tenant/location, source reference, input version, timestamps, attempts, and safe error details. Map queue outcomes into pending, running, succeeded, failed, and applicable cancelled states. Expose terminal failure and authorized retry through a minimal query or operator command.

Start with bounded concurrency and handler-specific retry limits. Stop accepting work on shutdown, allow a bounded drain period, and leave interrupted work recoverable. Reconcile application state after crashes so a job cannot remain misleadingly running forever.

Recheck current membership, consent, suspension, and cancellation immediately before delayed sensitive work. System obligations use explicit service authority and durable source records, not a former staff session. Preserve this distinction for future refunds and billing reconciliation.

Implement the provider inbox contract:

1. Bound the request body and retain exact raw bytes for signature verification.
2. Resolve provider, account, and environment from trusted configuration.
3. Reject invalid signatures before accepting an event. Apply provider-specific replay rules when defined.
4. Persist deduplicated event receipt and processing intent before acknowledgment.
5. Apply events through state-aware commands. Separate event uniqueness from business-effect uniqueness.
6. Retain processing failures and support authorized retry and reconciliation.

Use versioned signed fixtures to prove the generic inbox contract. A fixture verifier does not complete a real payment integration. Implement the selected billing provider's actual signature and event contract in 1D, with the relevant account and environment.

Provider acceptance followed by a worker crash can leave an uncertain outcome. Use provider idempotency and status lookup when available. For SMTP, do not promise exactly-once delivery or interpret SMTP acceptance as delivery to the recipient. See [AWS transactional outbox guidance](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html).

Day 5 is complete when real handlers survive restart, rolled-back commands enqueue nothing, duplicates cannot repeat local effects, cancelled sensitive work is blocked, and invalid, duplicate, or unordered provider fixtures produce the expected durable outcomes.

## Day 6: Implement private files and minimum operator recovery

Implement the filesystem `BlobStore` behind an application interface. Keep objects outside public web assets. Use generated opaque keys and reject path traversal, symlinks, and user-controlled filesystem paths.

Use this lifecycle:

```text
Authorize upload -> stage bounded bytes -> validate and checksum -> finalize object
                 -> attach metadata in scoped transaction -> authorized streaming
Failed attachment -> retained orphan -> reconciled cleanup after a grace period
```

Record owner, tenant, location when applicable, size, checksum, media type, and lifecycle. Validate actual content against the allowlist. If accepting images, bound decoded pixels and re-encode through the selected image tooling. Do not execute uploaded HTML or fetch arbitrary network URLs during processing.

Authorize attachment and every new download against current grants. Choose safe content disposition and private cache policy. Stream bounded data instead of buffering unrestricted files. Recheck attachment references before orphan cleanup and protect uploads still being finalized. Retirement is distinct from physical deletion.

Implement minimum operator commands for tenant lookup, lifecycle status, security suspension/restoration, session revocation, and owner recovery initiation. Require explicit grants, verified operator MFA, a reason, and audit. Suspension must affect ordinary requests and queued user-authorized disclosure. Restoration does not invent a paid subscription state.

Bootstrap the first operator through a restricted, one-time or explicitly repeat-safe administrative procedure. Bind it to a known verified identity, require MFA before normal operator admission, and record the action. Do not grant operator access through public registration or a shared default password. Prevent operators from assigning themselves authority outside delegation policy.

Initiate owner password recovery through supported reset flows. Do not expose existing passwords or reset links in operator responses. Document restricted operator MFA recovery with identity checks, session revocation, and audit. Make any temporary privileged database capability specific to its command rather than a general tenant-data bypass.

Day 6 is complete when cross-tenant downloads fail, current authorization controls new downloads, interrupted attachment produces a collectable orphan, referenced objects survive cleanup, and operator actions enforce authority and audit. Previously downloaded copies remain outside server revocation guarantees.

## Day 7: Verify the complete foundation and document operations

Exercise the retained application end to end locally. Run verification throughout Days 1 through 6 as each feature lands. Day 7 closes integration gaps and records final evidence. Preserve development data and use isolated test databases and temporary file paths.

Use real PostgreSQL and runtime roles for the checks below. Keep tests focused on externally meaningful behavior. Use Node's built-in test runner and existing tooling where sufficient. A separate test framework, trial workspace, or preliminary deployment is not required.

| Check | Required observation |
| --- | --- |
| Migrations and roles | Clean installation works, reapplication is safe, and runtime identities cannot manage schema or bypass RLS |
| Two tenants | Tenant A cannot read, mutate, attach, or enqueue references belonging to tenant B |
| Location scope | Location-restricted members cannot access another location or use an All Locations sentinel |
| Pool reuse | Tenant context disappears after commit and rollback before another principal reuses the connection |
| Sessions and grants | Logout, principal disablement, membership revocation, and grant changes affect the next protected request |
| Operator identity | Password-only sessions and incomplete MFA cannot invoke operator commands |
| Provisioning | Interrupted setup resumes and simultaneous retries create exactly one tenant per provisioning operation |
| Invitations | Wrong identity, expired invitation, revoked invitation, and duplicate acceptance behave safely |
| Commands | Concurrent replay returns one authorized result, changed payload conflicts, and stale versions fail |
| Atomicity | Failures after intermediate writes leave no partial business, audit, operation, journal, or job effects |
| Money and journal | Decimal policy, rounding, owner separation, balance, source uniqueness, and reversals hold |
| Jobs | Restart, retry exhaustion, cancellation, and uncertain provider outcomes remain visible and recoverable |
| Inbox | Invalid signatures fail and duplicate or unordered events cannot duplicate business effects |
| Files | Size/type/path violations fail, current access controls streaming, and cleanup preserves referenced files |
| Projections and caching | Restricted fields never reach unauthorized responses or shared caches |
| Error handling | Invalid input, unavailable database, provider failure, and permission denial return truthful outcomes |

Run the existing `pnpm lint`, `pnpm typecheck`, and `pnpm build` commands with the pinned runtime. Add targeted verification scripts with their actual implementation and document their exact invocation. Do not describe proposed database or integration test commands as already available.

Update environment examples, package READMEs, setup instructions, migration commands, operator recovery instructions, and [implementation status](../IN_PROGRESS.md). Record tested versions, checks and outcomes, and unresolved external dependencies. Mark 1B Done only after its required behavior is implemented and verified.

## Add limits and observability with each entry point

Configure and document the following limits when their owning feature is added. Select initial budgets from observed local behavior. Tune and verify target-server budgets at the external deployment handoff rather than presenting local measurements as hosting capacity guarantees.

| Entry point | Required controls |
| --- | --- |
| Database | Bounded web and worker pools, acquisition timeout, statement timeout, lock timeout, and transaction duration |
| Authentication | Persistent endpoint limits, recovery/resend limits, MFA attempt limits, and session policy |
| Commands and queries | Body size, list pagination, stable ordering, scoped counts, expected versions, and bounded retries |
| Upload and download | Byte limits, image pixel limits where applicable, stream timeout, and cleanup grace period |
| Jobs | Concurrency, attempt limits, backoff, lease/recovery behavior, backlog visibility, and drain timeout |
| Provider inbox | Body size, signature rules, replay policy, processing limits, and payload retention |

Log correlation ID, command/job ID, safe tenant scope, elapsed time, attempt number, and error category. Redact secrets and sensitive input. Report database availability, worker observation time, queue lag, and terminal failures through a minimal protected status path. Missing telemetry must appear unknown or unavailable. Server backup scheduling and freshness are external responsibilities, verified before deployed use. Product export jobs keep their application owner.

Add configuration variables only with consumers. Cover runtime and migration database connections, auth secret and base URL, configured origins, SMTP connection and sender, private-file root, queue settings, and resource limits. Keep secret values outside version control and browser bundles. Update Turborepo environment declarations so actual server inputs reach the appropriate processes without exposing them to client builds or caching secret-dependent outcomes incorrectly.

## Resolve dependencies without blocking unrelated work

| Dependency or decision | Owner | Latest safe point and handling |
| --- | --- | --- |
| Local PostgreSQL access and runtime credentials | Developer | Day 1. Use a real local instance and isolated test database. External server provisioning does not block 1B. |
| Compatible auth, ORM, and queue releases | Developer | Day 1. Pin releases and verify required APIs in the retained implementation. |
| Auth hooks and transaction participation | Developer | Before Day 3 email guarantees. Prove atomicity or implement and document durable reconciliation. |
| SMTP account and sender configuration | Product owner and developer | Before actual external-email acceptance. Continue local capture and unrelated work while unavailable. |
| Operator bootstrap and MFA recovery procedure | Developer with product owner | Before admitting the first operator. Document authority and identity requirements. |
| Owner MFA and additional login methods | Product owner | Before their owning authentication work completes. Mandatory operator MFA remains required now. |
| Upload allowlist, limits, and retention | Developer, with product owner for real-data policy | Before enabling the corresponding file type. Use explicit development policies until real-data rules are approved. |
| Real currency, tax, fiscal year, and document rules | Product owner | Before relevant real documents or financial operations. INR fixtures do not settle these policies. |
| Commercial plan rules and payment provider | Product owner and developer | 1D. Fixtures cannot count as commercial billing or entitlement enforcement. |
| Privacy jurisdiction and real-data retention | Product owner | Before real-data use. Keep synthetic development records meanwhile. |

Keep a missing provider integration visibly incomplete. Do not bypass verification, fabricate provider success, weaken tenant boundaries, or grant broad database privileges to meet a day target.

## Complete 1B and continue local development

- [ ] Reviewed migrations and explicit runtime/migration privileges are reproducible.
- [ ] Same-connection tenant transactions, tenant-qualified relationships, RLS, and location checks pass real-database verification.
- [ ] Verified email/password, recovery, database sessions, revocation, and mandatory operator MFA work.
- [ ] Independent tenants, initial locations, memberships, grants, resumable onboarding, and workspace selection work.
- [ ] Protected requests and sensitive jobs check current authority and return permitted fields only.
- [ ] Decimal money/quantity helpers and accounting-owner journal contracts enforce their declared invariants.
- [ ] Critical audit, operation hashes/results, expected versions, and deferred work satisfy transaction guarantees.
- [ ] Real worker handlers expose durable progress, bounded retry, terminal failure, and recovery behavior.
- [ ] Provider inbox signature and deduplication foundations are verified, with real-provider completion clearly distinguished from fixtures.
- [ ] Private-file staging, finalization, attachment, authorized streaming, and safe cleanup work.
- [ ] Minimum operator lifecycle and account-recovery commands enforce grants, MFA, and audit.
- [ ] Limits, structured errors, protected status, environment examples, and operating instructions match running behavior.
- [ ] Lint, types, build, and relevant integration checks pass with recorded evidence.
- [ ] Unresolved provider dependencies and later-phase requirements retain explicit owners and status.

Continue to 1D locally for commercial admission and billing, then the dependent application phases. Do not wait for 1C or create an infrastructure project as part of 1B.

Keep runtime variables, database bootstrap and migration commands, queue privileges, writable private-file paths, process startup/shutdown behavior, health observations, and local resource measurements documented as features arrive. Supply this application contract when the user plans the external environment after phase 3 and reviews a deployment candidate after phase 4. Verify target-specific behavior during that later handoff. Local checks do not establish deployed TLS, proxy/cookie behavior, provider delivery, Linux compatibility, or server disaster recovery.

## Official implementation references

These primary sources support library mechanisms. Fitloom's product rules remain in its requirements and architecture. Recheck documentation against the exact pinned release during implementation.

| Source | Use |
| --- | --- |
| [PostgreSQL 18 row security](https://www.postgresql.org/docs/18/ddl-rowsecurity.html) | Policies, default denial, bypass rules, and enforcement boundaries |
| [PostgreSQL 18 constraints](https://www.postgresql.org/docs/18/ddl-constraints.html) | Foreign keys, uniqueness, and data invariants |
| [node-postgres transactions](https://node-postgres.com/features/transactions) | Same-client transaction execution |
| [Drizzle migrations](https://orm.drizzle.team/docs/migrations) | Generated and reviewed migration workflow |
| [Better Auth Drizzle adapter](https://better-auth.com/docs/adapters/drizzle) | Adapter package and generated schema integration |
| [Better Auth email and password](https://better-auth.com/docs/authentication/email-password) | Verification, password flows, and integration callbacks |
| [Better Auth sessions](https://better-auth.com/docs/concepts/session-management) | Database sessions, freshness, revocation, and cookie caching |
| [Better Auth two-factor authentication](https://better-auth.com/docs/plugins/2fa) | Authenticator challenges and recovery codes |
| [Better Auth rate limiting](https://better-auth.com/docs/concepts/rate-limit) | Persistent limits, server-call exclusions, and proxy address handling |
| [Next.js authentication](https://nextjs.org/docs/app/guides/authentication) | Authorization at data access and server entry points |
| [pg-boss transaction adapters](https://pgboss.io/api/adapters) | Transaction-bound enqueueing and rollback |
| [AWS transactional outbox guidance](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html) | Durable local intent and idempotent consumers |
| [decimal.js documentation](https://mikemcl.github.io/decimal.js/) | Decimal arithmetic and rounding configuration |
| [Nodemailer SMTP transport](https://nodemailer.com/smtp) | SMTP connection and message transport |
