# Build Two increment 1: customer contracts, storage and authority

Status: Complete locally. Contracts/storage and the executable authority protocol are delivered. The initial sections retain first-slice evidence; the completed protocol and final validation record below supersede their remaining-work notes. Customer pages and photos remain later increments.

## Runtime recovery

The development account repeatedly returned 404 with "missing required error components, refreshing...". The working web container contained the same production BUILD_ID as the host, plus old host-generated Next files. Its log reported changes beneath node_modules and temporary missing Drizzle dependencies. A fresh container from the same image contained no Next output, so these files entered after image creation. Restarting the old root watcher did not copy a simple ignored-file probe; the exact archive event that introduced the old output was not isolated.

Compose Watch now synchronizes explicit source roots, public assets, runtime scripts, and the Next config. Manifest and compiler changes rebuild through an explicit file list. No sync rule targets the workspace root. Web and worker were rebuilt from clean images while PostgreSQL, mail, storage, volumes, and credentials were preserved.

The [Watch verification script](../../../scripts/verify-compose-watch.mjs) tests actual source synchronization, ignored build/dependency probes, stable service IDs, a real host production build, and account HTTP 200 afterward. It passes. Canonical HTTPS demo sign-in, workspace discovery, Home, settings, and catalog returned 200, and the temporary session was signed out.

Docker documents [Watch ignore rules and source synchronization](https://docs.docker.com/compose/how-tos/file-watch/). The restricted source roots additionally prevent parent workspace copies from including host dependencies or generated build trees.

## Customer contracts

The application package has explicit customer-contracts and customer-phone browser subpaths. They define distinct customer/wearer/review ID brands, UUIDv4 operation keys, strict profiles, separate create/update duplicate intents, fixed command names, bounded directory/search projections, opaque durable outcomes, and the discriminated HTTP response contract.

The phone parser uses pinned libphonenumber-js 1.13.15 max metadata, whole-input parsing, validity checks, and extension rejection, following the [maintainer documentation](https://github.com/catamphetamine/libphonenumber-js). The form helper produces display/country/E.164/digits; the command contract accepts that canonical shape and independently recomputes it. Parsing a canonical profile again preserves its shape, which is required for exact-envelope retry.

Text limits count Unicode code points after NFC normalization. Search identities fold ASCII letters only; É and é remain distinct. Notes normalize CRLF to LF and reject other controls. Decimal height/weight strings retain original precision and use exact integer comparisons against unit bounds. Birthday syntax and a shop-date comparison helper are provided; the future write service must supply today's date in the authorized shop timezone.

The maximal populated Unicode contract fixture measures **47,739 UTF-8 bytes** including the command envelope and initial self-wearer attributes. It fits the planned 128KiB allowance. This verifies the contract budget; the customer HTTP route and save transaction are still pending.

## Storage and authority

Retained migration 0034_customer_foundation.sql and its reviewed Drizzle snapshot add:

- Location-owned customers, wearers, and tags, with full tenant/location/customer references.
- Generated normalized name/tag identities and phone digits, scoped ordering and exact-phone indexes, and trigram GIN indexes.
- Unicode/text, nullable-phone shape, GSTIN country/format, archive actor/state, positive-version, gender, date, and exact-unit constraints.
- Creation-operation and staff-principal references.
- Forced RLS with migration-only access. Runtime roles receive no table access or helper execution. No customer read or mutation function is exposed yet.
- Five CRM permissions backfilled only to Owner presets, also installed for future owners. Existing manager/staff/custom-role grants are preserved.
- Matching permission dependencies in SQL, shared Zod role validation, and the role form. Selecting photo management selects the required CRM reads/management; removing a required read removes its dependants.

Duplicate phone is deliberately not unique. The transactional duplicate decision remains in the next slice. Tag-count limits, active-parent write checks, birthday timezone validation, activity atomicity, expected versions, no-op behavior, and replay must be enforced by that protocol before customer writes are exposed.

The snapshot comparison adds only app.customers, app.customer_wearers, and app.customer_tags, with no changes to existing table definitions. The database package's db:generate reports no schema changes. Forced RLS, procedural helpers, operation FKs, and grants stay in retained SQL, following the existing repository convention.

## Verification

| Check | Result |
| --- | --- |
| Focused customer contracts | 7 passed, including canonical-phone round trips, Unicode limits, whole-input phone fixtures, exact decimals, birthday validation, strict intents/results, maximum payload, role dependencies, and browser import boundaries |
| Focused real PostgreSQL storage/authority | 6 Node tests passed including the parent; 5 leaf scenarios cover new-owner permissions, direct SQL role validation, normalization, compound scope ownership, decimal constraints, tag identity, forced RLS and runtime denial |
| Clean upgrade/reapply database suite | 12 passed, including existing Owner backfill and no manager CRM grant |
| Application regression suite | 159 passed, including parent entries; final focused contracts were rerun after tightening canonical wire round trips and calendar-year validation |
| Lint/types/production build | Passed in the container regression run |
| Final HTTP/worker/transport | Pass in pnpm validate; receipt recovery 6803ms, idle drain 76ms, worker observation recovery 6429ms, plus stable 413/408 transport checks |
| Development forward migration and focused Chrome role check | Pass. 35 retained migrations applied; new customer/wearer tables empty. Canonical sign-in, permission dependencies, no implied master access, Home, and 1440/390px overflow checks pass |

An initial database assertion hard-coded the old 34-migration total. It now compares applied rows with the retained journal length. The first combined HTTP run also exposed a ten-second receipt-recovery window, separate from the previous six-second heartbeat check. Both worker recovery scenarios now share a bounded 30-second wait with early child-exit detection and measured recovery time. Application worker behavior is unchanged.

Logs are /tmp/fitloom-watch-isolation.log, /tmp/fitloom-runtime-recovery.log, /tmp/fitloom-customer-contracts-test.log, /tmp/fitloom-customer-storage-test.log, /tmp/fitloom-customer-drift.log, and /tmp/fitloom-customers-increment-1-validate.log. Earlier failed regression output is retained at /tmp/fitloom-customers-increment-1-before-worker-wait.log.

## Original next slice (implemented below)

Implement customers.ts and the restricted SQL read/write functions, safe activity, private actor-bound duplicate reviews and expiry cleanup, shared request budgets, parent/phone locking and busy mapping, actor-bound operation claims, and HTTP error/body adapters. Verify the full transaction/replay/concurrency matrix before exposing register and create/edit pages. Photos remain increment 5.


## Final development acceptance

The development forward migration is applied. The migration journal has 35 entries and the new development customer/wearer tables contain zero records. No customer data was seeded into development.

A cold service refresh initially declared the worker unhealthy before its TypeScript startup compilation completed. Web and worker now have a 180-second startup grace period; successful checks still mark them healthy immediately. The worker health probe imports only filesystem dependencies, while the database pool import is confined to the web branch. Two observed healthy worker checks took 151ms and 179ms after that change. Both services are healthy, and the background Watch service is active.

The final Watch verification passes again after a host production build, with unchanged web/worker container IDs and account HTTP 200. Final focused contract tests also pass after calendar-year, canonical-phone, validated-decimal typing, and malformed UTF-16 checks were tightened. Schema generation reports no changes.

The [focused browser script](../../../scripts/verify-customer-foundation-ui.mjs) uses the existing private demo fixture and accepts an installed Playwright module path as its argument. Its first development navigation hit the old 30-second observer deadline; the successful run uses a 120-second navigation allowance for cold Next development compilation and emits only safe path/status diagnostics on failure. It never prints credentials or request bodies. It changes checkboxes without saving a role, returns Home, signs out its session, and closes its browser.

Inspected captures show the required CRM dependencies selected without catalog access at [1440px](screenshots/customers-foundation/role-permissions-1440.png) and [390px](screenshots/customers-foundation/role-permissions-390.png). The existing access panel retains its compatibility styling; this is not a new customer page or a claim that the remaining v3 visual/CSS acceptance is complete.

Additional logs: /tmp/fitloom-customer-development-up.log, /tmp/fitloom-watch-isolation-final.log, and /tmp/fitloom-customer-foundation-ui.log.


## Completed authority protocol, 2026-11-02

Migration 0035 and customers.ts implement the eight fixed customer/wearer commands, authorized directory/detail/wearer/activity reads, and the duplicate-review protocol. Customer, optional initial self wearer, tags, safe activity, command audit and opaque result commit together. Parent/child state and expected versions are checked under NOWAIT locks; sorted scoped phone locks serialize competing creates and phone changes. Busy attempts roll back their claim and can retry with the same key. True no-ops preserve versions and create no domain activity.

The claim function adds actor/location ownership checks for customer commands while preserving other command behavior. Current CRM dependencies run before every replay. Mutable parent/version/challenge checks remain in fresh mutation, so committed results replay after a consumed/expired/purged review. Review-required results contain only review ID, expiry and count. Actor/scope-bound review projection returns at most five current summaries; changed drafts or candidate versions require a new review.

Private activity, review and budget tables have forced RLS, scoped parent references, indexes and no runtime table grants. The reviewed snapshot adds these three tables without changing existing definitions. Helpers and operation foreign keys remain in retained SQL. The journal contains 36 migrations. Schema generation reports no changes.

Advisory/review reads consume database-issued single-use leases and share the 30/minute, two-live-lease principal/location budget with review issuance. Successful opaque-save recovery is not rate limited. Ten-minute reviews are purged in bounded batches of 100 on protocol access and by the worker at most once per minute, including startup. Worker execution permits expiry deletion only.

CustomerError and optional shared executor/HTTP adapters retain bounded allowlisted field issues, distinguish busy/version/operation conflicts, session expiry, denied/unavailable, rate limit and temporary failures, and preserve legacy master/workspace responses. SQL birthday errors retain the correct customer/self-wearer field path. Search rejects NUL/control input. The scoped customer API implements private POST search, strict directory queries and the 128KiB profile budget; pages/navigation remain Increment 2 onward. Customer photos remain Increment 5.

### Focused verification scope

Three service scenarios extend the existing storage fixture, bringing that file to nine Node entries including its parent. They cover runtime lifecycle and independent wearer identity, no-op/version/busy behavior, duplicate create/update decisions, actual competing creates, changed candidates/drafts, expiry and worker cleanup, saved replay after challenge removal, actor isolation, current permission loss, shared counters/leases, cross-location reads and rollback after an injected wearer-insert failure. Existing structural tests retain two-tenant/location foreign-key and private-runtime checks. The contract file remains seven tests, with control-character assertions added to its existing validation case.

The existing optimized HTTP fixture adds one customer protocol path. It saves and reads a fully populated Unicode customer plus self wearer, replays the save once, returns a typed duplicate 409, searches with POST, and verifies validation/session/body-size errors. The final full request measures 47737 UTF-8 bytes. Original decimal strings and Unicode notes survive the real route/database round trip. No separate customer test server, broad mock suite or customer UI suite was added.

The first guarded validation passes 12 database and 162 application Node entries, lint, types, build and real HTTP/worker/storage/operator/transport checks. The final rerun additionally checks the SQL birthday issue path. The final-source Chrome run passes all existing scenarios. Final validation and development-migration results are recorded after their runs below.

Logs: `/tmp/fitloom-customers-increments-0-1-final-validate.log`, `/tmp/fitloom-customers-increments-0-1-ui-accepted.log`, `/tmp/fitloom-customer-authority-drift-final.log`. The owning commands remain `pnpm validate`, the documented optional Chrome HTTP command, `pnpm --filter @fitloom/db db:generate`, and `git diff --check`.


### Final validation

| Check | Observed result |
| --- | --- |
| Final `pnpm validate` | Exit 0: 12 database and 162 application Node entries, lint/types/build, optimized customer/master/foundation HTTP, Mailpit/SeaweedFS/operator/outage checks, and existing 413/408 transport scenarios |
| Clean migration/upgrade/reapply | Pass through the existing database suite; 36 retained migrations |
| Final SQL field issue path | Pass in the existing lifecycle scenario: a future self-wearer birthday returns bounded validation at selfWearer.attributes.birthday |
| Browser-safe contracts | Seven tests pass, including phone metadata, Unicode/control bounds and transitive import boundaries |
| Optional Chrome HTTP suite | Exit 0; all existing master/workspace scenarios pass, with actual workflow captures inspected |
| Maximal Unicode route save | 47737 raw UTF-8 request bytes; successful customer/self-wearer save, detail read and exact-key retry |
| Drizzle generation | No schema changes |
| Final lint/diff whitespace | Pass |

Final worker receipt recovery was 2843ms, drain 35ms and observation recovery 2673ms. These are observations, not performance budgets. The Chrome run precedes only the final bounded SQL-issue extraction; the final guarded run verifies that extraction and all shared helper/HTTP regressions. No UI implementation changed afterward.


### Development handoff

`pnpm db:migrate` exits zero and applies the forward migration without resetting development data or volumes. A guarded read of fitloom_dev reports 36 migrations, zero customers and zero wearers. All six long-running services are healthy. The existing focused Chrome script passes canonical HTTPS sign-in, CRM role dependencies, no implied catalog permission, 1440/390px overflow checks, Home and a currently authorized customer-directory API read. It saves neither a role nor a customer, signs out its temporary session and closes the browser. Updated role captures are [desktop](screenshots/customers-foundation/role-permissions-1440.png) and [390px](screenshots/customers-foundation/role-permissions-390.png).

Logs: `/tmp/fitloom-customers-increments-0-1-development-migration.log` and `/tmp/fitloom-customers-increments-0-1-live-ui.log`. Increment 2 can now implement the register and navigation on these authorized services; private photos and the complete end-user customer journey remain later increments.
