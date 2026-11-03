# Fitloom database

This guide covers `packages/db/`. Run project commands from the repository root unless a command specifies another directory.

Days 1 and 2 implement PostgreSQL 18 roles, identity/tenancy tables, reviewed migrations, scoped transactions, command persistence, audit/outbox, and journal constraints. Day 3 connects verified identity, encrypted auth mail, and session-bound operator challenges. Day 4 adds resumable profiles, personal preferences, protected roles, and recipient-bound invitations. See [workspace contracts](../architecture/workspaces.md) and [identity and mail policy](../architecture/authentication.md).

## Start the local database

Run `pnpm dev` from the repository root. Compose starts PostgreSQL 18 on `24430`, initializes separate development/test roles and databases, applies reviewed migrations, and starts the application services. Existing data stays in the `fitloom-postgres-local` external volume. See [local Docker Compose development](../operations/local-development.md).

Run `pnpm db:migrate` for new forward migrations. The migration runner acquires an advisory lock and verifies retained hashes and timestamps. Reapplication has no new effects. Changed applied SQL fails history verification.

`pnpm test` runs tests in a tools container. The database suite **deletes only the guarded `fitloom_test` schemas**. Test runtime logins cannot connect to the development database. Developer credentials remain in ignored `packages/db/.env`; Compose uses separate per-service files under `.local/` with private permissions.

`pnpm dev:down` stops the stack and watcher while preserving the data volumes. Runtime processes never perform bootstrap or DDL.

## Database identities

| Group role | Granted access |
| --- | --- |
| `fitloom_migrator` | Owns schemas, tables, policies, and queue installation. Only migration logins inherit it. |
| `fitloom_web` | Scoped metadata reads, membership discovery, claimed setup/provisioning commands, and permission-checked journal functions |
| `fitloom_worker` | Scoped tenant metadata reads and membership discovery. No provisioning or DDL. |
| `fitloom_auth` | CRUD on the six global Better Auth tables only. No application schema access. |
| `fitloom_operator` | Reads own principal and operator grants only. No tenant-data access or grant mutation. |

Runtime roles lack superuser, database creation, role creation, table ownership, TRUNCATE, and BYPASSRLS. Grants are explicit. New tables receive no runtime privileges by default. All application tables enable and force RLS. Security-definer functions have an empty search path, qualified object references, explicit execution grants, and the migration role's dedicated RLS policy.

Auth tables are global identity records. Principals and operator records are global application records with principal-scoped access. Tenant records require explicit tenant scope; location records additionally require the selected location and a current location grant. `setup_drafts` belongs to a principal. `tenant_setup` belongs to a tenant. `security_audit` is written only through the provisioning function or migration administration. Runtime identities cannot update or delete it.

The auth identity is a separate trusted server admission path. Never expose it as a generic query endpoint. Operator MFA checks and operator command execution arrive on Days 3 and 6. The database role alone does not establish an MFA challenge.

## Execute a scoped transaction

Import `createPool` and `withScope` from `@fitloom/db`. Construct a bounded pool with its purpose and the matching runtime URL. Supply an authenticated principal from trusted application code. Never derive authority from a client-supplied principal or tenant ID.

`withScope(pool, scope, callback)` accepts either `{ kind: "principal", principalId }` or `{ kind: "tenant", principalId, tenantId, locationId }`. It validates IDs, acquires one client, begins a transaction, sets all three context values locally, and checks current principal, tenant, membership, and location admission. The callback receives Drizzle bound to that exact client. It commits on success, rolls back on error, and destroys the connection if rollback fails. Use the callback's database for every statement. Do not call the pool from inside the callback.

Missing context denies application rows. `app.discover_memberships()` returns only the current active principal's active tenant/location/role IDs before tenant selection. No null location means all locations. Location roles and permission grants are tenant-qualified. Foreign keys prevent mixed-tenant role, location, and membership references.

`app.provision_tenant(shop_name, location_name, expected_version)` requires an active claimed `tenant.provision` command, a verified active principal, and an existing own setup draft at the expected version. It locks the durable draft identity and creates the tenant, first location, owner membership/role/grants, setup record, and security audit in one transaction. Repeating it returns the existing tenant. The Day 2 application executor supplies canonical operation hashes, changed-input conflicts, fresh replay authorization, and command audit. Day 4 also creates shared settings and private owner contacts atomically. A separate claimed command starts another setup identity. Day 3 maps principals during auth user creation on the same transaction and provides idempotent repair from a current signed session.

RLS checks current security status and membership but does not replace command permissions or field projections. PostgreSQL context variables are supplied by trusted server code and are not proof of identity against a compromised server/database credential. Application commands must resolve sessions and enforce granular permissions before calling persistence functions.

## Resource limits

| Limit | Initial local value |
| --- | --- |
| Web pool | 5 connections |
| Other runtime pools | 3 connections |
| Configurable pool bound | 1–20 connections |
| Connection acquisition | 3 seconds |
| Statement | 10 seconds |
| Lock wait | 2 seconds |
| Idle transaction | 15 seconds |
| Whole transaction | 20 seconds, enforced by PostgreSQL 18 |
| Idle pooled connection | 30 seconds |

Callers own pool shutdown and idle-client error reporting. These local defaults are not deployment capacity measurements.

## Generate future migrations

```sh
pnpm --filter @fitloom/db db:generate --name describe_change
pnpm --filter @fitloom/db db:auth-generate
```

Review generated SQL before migration. Use custom SQL migrations for grants, policies, functions, and other mechanisms absent from the stable schema API. Do not use schema push. The auth generator configuration is schema-only and is not exported as a running auth service. After regeneration, preserve the reviewed use of timezone-aware timestamps. Authentication plugins and runtime configuration must stay aligned with the generation configuration.

`migrations/meta/0033_snapshot.json` is the reviewed Drizzle baseline for the SQL-owned increments. `schema.ts` declares the master tables, but migrations `0011`–`0032` were added as custom SQL without generated snapshots. The 0033 snapshot captures the current declared schema so the next `db:generate` diffs against reality instead of replaying duplicate master DDL. Keep it updated whenever a future migration changes `schema.ts`; a `db:generate` run that proposes no changes is the expected clean state.

Pinned packages are `pg` 8.23.1, `drizzle-orm` 0.45.4, `drizzle-kit` 0.31.11, Better Auth, its Drizzle adapter, and its `auth` generator 1.7.14, and `pg-boss` 12.38.0. The generated auth schema includes two-factor secrets, backup codes, verification lockout state, database sessions, and persistent rate-limit records. Compatibility is checked through generation, migration, TypeScript, and real SQL access. Day 3 verifies actual sign-in, email, recovery, and MFA flows against these tables.

The retained pg-boss installation is generated by `packages/db/scripts/generate-queue.mjs`. Its outer BEGIN/COMMIT is removed so Drizzle owns the transaction. Day 5 creates one fixed queue and adds narrow worker functions for its SQL adapter. Runtime roles still have no direct queue privileges. The SDK worker/supervisor and automatic migration are not started. See [queue lifecycle and upgrade contract](../architecture/jobs-and-inbox.md). Workers never initialize or upgrade queue tables through runtime DDL.

Day 2 adds SQL-owned command, audit, outbox, and journal tables through custom migrations. Their SQL functions and constraints are authoritative; they are intentionally outside Drizzle's generated table snapshot. The setup version column remains represented in the Drizzle schema and snapshot. Day 4 tables and its `roles.preset`, `memberships.is_owner`, and `memberships.version` extensions are also SQL-owned and intentionally absent from generated snapshots. Continue using custom migrations for these SQL-owned contracts. Day 5 adds SQL-owned job outcomes, attempts, inbox receipts/fixtures, staging cleanup metadata, and operator job audit. Full attachment metadata remains Day 6. See [application contracts](application.md).

Mechanism references: [PostgreSQL row security](https://www.postgresql.org/docs/18/ddl-rowsecurity.html), [node-postgres transactions](https://node-postgres.com/features/transactions), [Drizzle migrations](https://orm.drizzle.team/docs/migrations), [Better Auth Drizzle adapter](https://better-auth.com/docs/adapters/drizzle), and [pg-boss installation](https://pgboss.io/api/database-install).

## Verification recorded on 2026-10-31

Verified on PostgreSQL 18.6 with Node.js 26.13.0 and pnpm 12.16.1. The Day 1 suite originally passed ten reported tests, including the parent test. Day 2 expands it to twelve with false-commit and timeout regressions. The suite verifies clean installation, migration reapplication, restricted role privileges, principal discovery, verified provisioning, real concurrent provisioning retries, rollback atomicity, two-tenant and location isolation, foreign-key rejection, current security status, and same-backend context cleanup. Repeated local setup and development migrations preserve existing records. Frozen installation, repository lint, typecheck, production build, and diff checks pass.

Day 2 adds three forward migrations, for six retained migrations in total. The application suite reports twelve tests, including its parent test. Schema generation reports no drift in the Drizzle-managed tables. Both review findings in the transaction helper are covered by real PostgreSQL regression tests.

Day 3 adds migrations 0006–0008, for nine retained migrations. They repair reversal source-location admission, add audit changed-field metadata, and establish explicitly global auth-mail, delivery-attempt, persistent admission, and session-challenge tables. The auth role can call narrow principal/operator admission functions but gains no tenant data access. The worker can claim/finish mail through narrow functions and receives no auth table privileges. `withDatabaseTransaction` supplies the real same-client Drizzle transaction required by the auth adapter's nested savepoints.

Day 4 adds migrations 0009–0013, for fourteen retained migrations. These add SQL-owned shop settings, owner contacts, personal preferences, and invitations; role and membership extensions; protected workspace commands and projections; and stricter audit visibility. Forward validation migrations qualify ambiguous SQL arguments, preserve existing setup identities during profile completion, and require a remaining owner grant at an active location. Clean installation and migration reapplication pass all twelve database tests.

Day 5 adds migrations 0014–0017, for eighteen retained migrations. These implement the fixed queue, fenced durable jobs, bounded supervision/retention, signature-verified fixture receipts, state-aware local effects, protected job queries/retry/cancel, and staging cleanup. Runtime roles gain only named function execution. Service changes require the actual session’s recent operator MFA and `jobs.manage`. Forward hardening covers multi-batch cleanup, input bounds, source-state regression, and pruning versus retry locks.

Day 6 adds migrations 0018–0019, for twenty retained migrations. Private files, tenant-qualified attachments, file events, durable operator operation/audit records, and restricted administrative audit are SQL-owned with forced RLS. Runtime functions enforce file permissions, versions, attachment/cleanup locks, actual operator-session MFA, grants, and replay hashes. Only migration administration can execute bootstrap or MFA recovery; auth runtime gains no general tenant-data bypass. See [operating procedures](../operations/private-files-and-operator-recovery.md).

Day 7 adds forward migrations 0020–0022, for 23 total. They retain legacy file layouts while preparing immutable new content, add narrow worker-observation/protected-status functions and safe job correlations, and replace bounded-list wrappers with scoped page/count functions. New records remain SQL-owned with forced RLS; runtime roles gain only explicit function execution. Clean installation/reapplication and all 12 database tests pass. Root `pnpm verify:recovery` verifies a real logical restore, migration compatibility, runtime isolation, journal totals, object digests, and command replay. See [foundation operations](../operations/foundation-operations.md).

## Garment master persistence

Phase 2 Build One increment 2 adds retained migrations `0023`–`0029`. `schema.ts` declares the ten master tables and tenant-qualified references. SQL owns forced RLS, deferred current-version requirements, immutable history triggers, restricted function grants, and the operation foreign keys to the retained command foundation.

`master_catalog_state` serializes tenant-wide administrative writes through a concrete admitted location. Garments, services, and add-ons have stable headers and append-only versions. Garment versions keep schema JSONB, while prices and service/add-on bindings are relational. The restricted save function extracts current binding labels and rejects new inactive references. Unchanged retired bindings can carry forward from the locked current version.

Starter installation calls the same private publication helpers as ordinary saves. Those helpers increment the catalog token once per created record; installation then deliberately restores the pre-install token plus one (or leaves it unchanged on a no-op), so a successful install advances `catalogVersion` exactly once regardless of how many starter records it creates. The token assertion in the master service tests covers that arithmetic.

Every master table has forced RLS and a migrator policy. Runtime roles receive no direct table reads or writes. `fitloom_web` can execute named save/lifecycle functions, explicit schema-only/priced version reads, bounded history, and catalog metadata. `fitloom_worker` receives no master function grants. All functions use an empty search path and qualified application relations.

| SQL function | Contract |
| --- | --- |
| `master_garment_save(jsonb)` | Requires active `garment.save`, all three master permissions, strict format 1 JSON validation, bounded rates, valid tenant references, stable schema lineage, and expected header version for updates |
| `master_service_save(jsonb)`, `master_addon_save(jsonb)` | Require their matching active command and append an immutable revision |
| `master_lifecycle(text,uuid,integer,boolean)` | Fixed garment/service/addon allowlist; requires the corresponding lifecycle command and preserves the catalog token on no-op |
| `master_garment_schema(uuid,uuid)`, `master_garment_priced(uuid,uuid)` | Current detail when the version argument is null, otherwise one exact version; priced reads also require `masters.rates.read` |
| `master_service_version(uuid,uuid)` | Current or exact service label and version metadata |
| `master_addon_schema(uuid,uuid)`, `master_addon_priced(uuid,uuid)` | Current or exact add-on metadata, with amounts present only in the priced projection |
| `master_history(text,uuid,integer)` | At most 50 metadata rows, newest revision first, with authorized total/next offset and catalog token |
| `master_catalog()` | Authoritative settings header; returns virtual empty state at version 0 without writing |

Internal validators and assembly functions have no runtime execution grants. `master_begin` checks current `masters.read`, `masters.manage`, and `masters.rates.read` permissions and matches the operation's tenant, location, and command; the actor comes from the executor's admitted operation context rather than a separate payload check. The caller must use the existing command executor to finish audit/outcome in the same transaction. Missing completion cannot commit.

`normalize_master_name` is authoritative for NFC, ECMAScript-compatible whitespace trimming, and ASCII case folding. It preserves non-ASCII case. Inactive records keep their reserved names. Prefix queries in later increments must use this same function.

The SQL boundary validates each collection limit and the exact UTF-8 size of the stored JSONB text, including server-resolved labels. Rates are checked as plain decimal strings before casts. Nullable rates retain unset versus zero; configured currency is INR. Numeric constraints independently reject negatives, NaN, and overflow. Schema identity signatures preserve kind, semantic identity, basis/unit, selection kind, and option ownership; registry retirement is one-way.

The clean database test installs the retained foundation through `0022`, creates synthetic existing Owner/Manager roles, applies the new migrations, and verifies Owner backfill without changing Manager grants. It then checks a direct empty-database installation and repeat invocation. `master-storage.test.mjs` exercises real runtime roles, immutable versions and bindings, cross-tenant keys, scoped locations, schema-only projections, identity lineage, direct SQL validation, concurrent edits, and transaction rollback. See [increment 2 evidence](../implementation/evidence/phase-2-build-1-increment-2.md).

The next section describes increment 3 service/register/starter/reorder/visibility functions exposed through protected master routes. Settings UI remains in later increments.

## Catalog commands and registers

Build One increment 3 appends `0030_master_catalog_commands`, `0031_master_registers`, `0032_master_empty_bindings`, and `0033_master_page_bounds`. Earlier applied SQL remains unchanged.

`master_service_publish(jsonb,text)` and `master_garment_publish(jsonb,text)` are private helpers shared by the normal save wrappers and atomic starter installation. Runtime roles cannot execute them. Public save wrappers bind their own command names. `master_starters_install(integer,jsonb)` requires an active `masters.starters.install`, validates the known bundle/template-key set, resolves existing starter identities, and publishes missing tenant copies using the same schema/lineage/binding checks. The application supplies the code-owned bundle; client command JSON contains only bundle version and expected catalog version.

`master_reorder(text,uuid,uuid,integer)` validates a fixed kind and complete-catalog anchor membership under the catalog lock. It moves an identity before another or to the end, then assigns dense positions atomically. It does not require a client to load every page. `master_visibility(integer,boolean,boolean)` checks the catalog token and both flags. No-op reorder/visibility retain the token. These functions receive web execution grants; workers receive none.

`master_register_schema(text,jsonb)` and `master_register_priced(text,jsonb)` return bounded pages and counts with one shared set of predicates. The internal assembly function is private. The schema-only branch constructs JSON without price keys. Prefix search uses `normalize_master_name`; active state, standard visibility, origin, and extracted garment applicability are applied before both counting and paging.

The zero-field integration scenario exposed an uninitialized binding-key variable in the prior validator. `0032` initializes the key before processing an empty service/add-on array. `0033` keeps register/history continuation tokens within the admitted offset bound. Clean and upgrade migration checks cover the full retained set. [Increment 3 evidence](../implementation/evidence/phase-2-build-1-increment-3.md) records actual command/API verification.


### Customer photo persistence

Migration 0037 adds `customer_photos`, immutable file purpose/owner fields, named CRM upload/bind/read/remove functions, current binding uniqueness, complete role shapes, safe activity kinds and actor-bound photo replay. It enumerates workspace-only filtering for every retained generic file function and live-CRM exclusion in cleanup/continuation. Migration 0038 supplies complete immutable target reference keys between bindings and the SQL-owned private-file table. Migration 0039 rejects fresh binds after upload expiry or cleanup eligibility; committed replay remains valid. The Drizzle snapshot models the new CRM relation and activity enum constraint. Legacy private-file storage and its custom reference keys remain explicitly SQL-owned, consistent with the existing foundation baseline.

Writes lock the parent customer, optional wearer, then sorted file rows with NOWAIT. Cleanup locks file metadata under its existing job fence and never acquires a parent afterward. A cleanup claim therefore prevents a simultaneous bind from racing object deletion; busy commands retain their envelope for explicit retry. Live generic and CRM attachments are excluded again before deletion and by continuation. Runtime roles receive named functions, not table access.
