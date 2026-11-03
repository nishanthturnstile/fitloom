# Phase 2 Build One, increment 6 evidence

Verification date: 2026-11-02. Scope: final acceptance of garment masters, not the whole phase or REQ-MASTER.

Status: Done locally. All six Build One increments are implemented and verified. The acceptance checks below pass; customer/measurement development remains Planned.

## Verification changes

This increment adds acceptance checks and handoff documentation. It changes no production domain behavior, schema, migration, dependency, or deployment configuration.

- `masters.test.mjs` follows a filtered register across two pages, checks totals and unique ordered IDs, changes current applicability without advancing the catalog token, and checks visibility/reorder/no-op installation audit identities and previous/next tokens. NFC and Tamil prefix queries use the SQL name policy, including inactive discovery.
- `master-storage.test.mjs` checks the execution privileges of every master function, the exact web-function allowlist, absence of worker grants, and empty search paths on privileged functions. A failed existing-garment update removes a field and both binding types, then throws before command completion. Exact snapshots prove rollback of the header, versions, bindings, identity retirement, and catalog state. Another tenant's saved detail stays unchanged.
- `master-http-checks.mjs` recursively rejects price properties in all three registers, current details, exact versions, metadata histories, and catalog responses after rate revocation. It also checks fresh-save denial, replay denial after each write permission is revoked, archived schema reads, lifecycle token advancement, and stale settings conflicts.
- `master-ui-browser-checks.mjs` adds an incompatible numeric-bounds scenario. An inline Maximum error appears while the invalid Minimum remains in the draft. Correcting it allows the existing end-to-end save workflow to continue.
- The Chrome harness writes this run's screenshots to `fitloom-increment6-ui`, preserving earlier increments' screenshot directories.

The first expanded test run used an uppercase accented prefix as though the name policy folded non-ASCII case. The fixture now uses uppercase ASCII letters with the original accented character. The documented policy remains NFC normalization plus ASCII case folding; no production code changed.

## Acceptance matrix

The sources below run against synthetic data in guarded `fitloom_test`. Database suites use actual migration, web, and worker login roles and advisory lock `68122902`. The optimized HTTP and optional Chrome checks use a real verified session and the same lock.

Source keys:

- [DB](../../../packages/db/test/isolation.test.mjs): foundation, migration upgrade, and clean/repeated installation checks.
- [Contracts](../../../packages/application/test/master-contracts.test.mjs): strict browser contracts, semantic identities, decimal boundaries, preview, and browser dependency checks.
- [Storage](../../../packages/application/test/master-storage.test.mjs): independent SQL validation, permissions, persistence, and rollback.
- [Service](../../../packages/application/test/masters.test.mjs): public application service, commands, concurrency, registers, and audit.
- [HTTP](../../../packages/application/scripts/master-http-checks.mjs): optimized application routes with real authentication.
- [Transport](../../../packages/application/scripts/master-transport-check.mjs): repeated overflow and a stalled request stream.
- [Garment UI](../../../packages/application/scripts/master-ui-browser-checks.mjs), [catalog UI](../../../packages/application/scripts/master-catalog-ui-checks.mjs), and [UI driver](../../../packages/application/scripts/master-ui-checks.mjs): real Chrome interactions, native dialogs, and screenshots.

| Plan scenario | Observed checks |
| --- | --- |
| Existing and newly registered shop | DB installs the 23 foundation migrations, creates existing Owner/Manager roles, then verifies master permission backfill. Storage checks future presets. HTTP and catalog UI install starters through an already provisioned workspace and a separate newly provisioned shop without repeating registration. |
| Standard/custom lifecycle | Garment and catalog UI create, rename, deactivate, restore, reorder, and hide standards. HTTP reads an archived exact version and restores the header. |
| Schema history | Storage saves renamed/reordered v2 and retired-field v3, then compares exact v1/v2 definitions. Garment UI reloads and copies history with fresh retired identities. Current header versions can advance while historical content remains immutable. |
| Identity protection | Contracts reject changed meanings and retired IDs and regenerate copied identities. Storage independently rejects repurposed fields, groups, option owners, and duplicate case-normalized UUIDs. |
| Typed configuration | Contracts cover all five field kinds, both construction variants, strict keys, IDs, sections, bounds, semantic compatibility, and unsupported formats. Storage revalidates SQL inputs. Garment UI saves all five kinds and both construction variants and checks inline incompatible-bounds errors. |
| Ordering and pagination | Service creates 53 custom garments plus starters, reads both pages, and moves across pages. Garment UI pages a register and moves before a searched destination. Stale tokens conflict; hidden records remain discoverable with visibility=all. |
| Rates | Contracts cover null, zero, precedence, six places, maximum magnitude, excess precision, negatives including negative zero, exponent, NaN, and overflow. Storage rejects invalid decimals/currency before insertion. Catalog UI persists zero/unset base and overrides and six-place add-on amounts. |
| Services and add-ons | Storage and catalog UI retire references, preserve saved labels, reject new inactive selection and inactive override changes, resolve renamed current services, and change add-on prices without rewriting garment history. |
| Tenant/location authority | Storage uses two tenants and a second synthetic location. Ungranted access fails, a granted second location reads the same shop definition, and cross-tenant bindings/current pointers fail. Another tenant's exact saved detail remains unchanged. |
| Read projections | HTTP recursively checks every current/exact/history/register response for absent price keys after rate revocation. Contracts reject supplied price keys in schema-only outputs. Chrome checks absent price controls and denied settings access. |
| Privilege boundary | Storage denies table reads/writes, missing operation/context, mismatched command calls, and worker access. Function-catalog checks cover every master routine's execution grants and privileged search path. |
| Concurrency and replay | Service and Storage run concurrent stale edits with one success. HTTP and Chrome replay committed saves after response loss with the original key and revision. Changed-payload reuse conflicts. |
| Transaction rollback | Storage compares every existing-garment row, version, service/add-on binding, identity registry row, and catalog state before/after injected failure. Create rollback and public-executor failure before audit are also checked. |
| Starter installation | Service covers virtual empty state, simultaneous initialization with same/different keys, exact replay, no-op, edited copies, and atomic name-collision rollback. Catalog UI proves collision recovery and first-use installation in another synthetic shop. |
| Request bounds | HTTP admits a definition larger than 16 KiB, rejects aggregate stored JSONB overflow with bounded issues, and retains 16 KiB elsewhere. Contracts/Storage cover UTF-8, escaping, normalized/stored budgets, and bounded errors. Transport checks stable 413 and stalled-stream 408. |
| Version constraints | Storage denies runtime writes, rejects privileged update/delete of immutable versions and bindings, rejects wrong-parent/tenant pointers, and refuses a header without a current version. |
| UI behavior | Chrome covers empty preview, keyboard reorder and retained focus, native discard dialogs, unload-guard installation/removal, inline errors, stale-save input preservation, exact-key retry, read-only controls, and 390-pixel layout without horizontal overflow. |
| Dependency boundaries | Contracts walk browser exports transitively and reject Node/database/secret imports. Scope inspection confirms no customer, order, stock, billing, upload, or deployment implementation in this increment. |
| Catalog state/token | Service/HTTP cover virtual empty state, unchanged tokens for content/price edits, lifecycle advancement, no-op retention, result tokens, and stale membership/settings conflict. Chrome renders a new shop's empty settings page. |
| Filter correctness | Service follows search/origin/applicability filters through two pages after changing the extracted current applicability. Totals, unique IDs, ordering, and visibility counts match the selected records. |
| Semantic signature | Contracts preserve IDs through cosmetic/order/display-precision edits and reject kind/basis/unit/option-owner changes. Storage independently validates immutable meaning. Wearer values and rescaling are absent from this build. |
| Inactive carry-forward | Storage retires a service after reading a garment, then saves an unrelated change with its locked-current binding. Crafted inactive additions and changed overrides fail. Catalog UI carries then removes retired references. |
| Revoked rate access | HTTP rejects a fresh full save and successful-operation replay after revocation. Schema-only reads omit all price properties. Chrome read-only checks contain no saved private amount. |
| Catalog audit identity | Service reads actual audit rows for visibility, reorder, and no-op installation and verifies master_catalog, tenant UUID, and exact previous/next tokens. |
| Name normalization | Storage checks NFC reservation, Tamil, ASCII case, whitespace, and reservation after retirement. Service searches composed/decomposed NFC and Tamil prefixes and discovers inactive records explicitly. |
| Aggregate budget | Storage combines valid per-item sizes with JSONB spacing/escaping overflow, then persists a smaller document and reads its stored byte count. HTTP distinguishes definition validation 400 from raw transport 413. |

## Commands and results

| Command/check | Actual result |
| --- | --- |
| `node --env-file=packages/db/.env --test --test-concurrency=1 packages/application/test/masters.test.mjs packages/application/test/master-storage.test.mjs` | 30 reported tests pass, including parents; 0 fail, skip, or cancel |
| `pnpm validate` | Exit 0. 12 database and 146 application tests pass, 0 failures; Biome checks 138 files; all 6 type/dependency and 4 build tasks pass |
| Optimized HTTP inside `pnpm validate` | Expanded master checks and existing account/workspace/operator/files/worker/outage checks pass; repeated overflow gives 413 and a stalled stream gives 408 |
| Host `pnpm build` | Exit 0; all 4 build tasks pass |
| `MASTER_UI_CHECKS=1 pnpm --filter @fitloom/application test:http` | Exit 0; real Chrome garment/catalog/starter/role/desktop/narrow checks pass, followed by the baseline HTTP checks and 413/408 transport checks |
| Final `pnpm lint` | Exit 0; 138 files checked, no fixes |
| Read-only migration comparison against `HEAD` | 23 foundation migrations and original journal entries unchanged; 34 retained SQL files match the complete journal |
| Final acceptance/document links | All 26 plan scenarios have matching evidence rows; all 92 checked local links resolve, including screenshots |
| `git diff --check` | Pass |

Counts include Node parent tests. Browser scenarios are additional checks and do not increase the application test count. The default tools-container run does not require Chrome or Playwright. The added bounds assertion runs in the optional host Chrome check; a subsequent host lint checks that test-only addition. No production source changed after validation.

Local logs:

- `/tmp/fitloom-increment6-focused-masters.log`
- `/tmp/fitloom-increment6-validate.log`
- `/tmp/fitloom-increment6-host-build.log`
- `/tmp/fitloom-increment6-ui.log`
- `/tmp/fitloom-increment6-lint.log`
- `/tmp/fitloom-increment6-migration-audit.log`

Actual screenshots from this run:

- [Garment desktop](screenshots/phase-2-build-1-increment-6/desktop.png)
- [Garment narrow](screenshots/phase-2-build-1-increment-6/narrow.png)
- [Catalog desktop](screenshots/phase-2-build-1-increment-6/catalog-desktop.png)
- [Catalog narrow](screenshots/phase-2-build-1-increment-6/catalog-narrow.png)
- [First-use starter setup](screenshots/phase-2-build-1-increment-6/starter-setup.png)

The catalog desktop/narrow and starter screenshots were visually inspected after the passing run. Chrome uses a separate temporary session; the driver closes its owned browser and removes its private cookie file in `finally`. The screenshots are retained in this repository under `screenshots/phase-2-build-1-increment-6/` so the evidence remains inspectable; logs stay local temporary artifacts and can be regenerated with the commands above.

## Migration and schema review

Read-only comparison against `HEAD` confirms all 23 foundation SQL migrations and their journal entries are unchanged. All 34 retained SQL files appear in the journal. Build One appends only:

```text
0023_garment_master_storage
0024_master_validation
0025_master_persistence
0026_master_projections
0027_master_validation_paths
0028_master_name_whitespace
0029_master_uuid_contract
0030_master_catalog_commands
0031_master_registers
0032_master_empty_bindings
0033_master_page_bounds
```

Increment 6 adds no migration. The schema diff declares ten master tables with tenant-qualified keys, exact numeric rates, indexes, checks, and migration-only RLS policy declarations. Retained SQL owns forced RLS, triggers, privileged functions, and operation relationships. Storage compares the installed columns, nullability, numeric precision/scale, and declared references with Drizzle. DB checks clean installation, upgrade from the retained foundation, retained hashes, and repeat invocation. No schema push or development-database reset is used.

## Handoff and limits

Customer/measurement development can consume stable garment IDs, exact immutable version IDs, ordered typed fields, semantic identities, basis, and units through the browser-safe contracts. It must store wearer values separately and define a narrow intake projection with its own permissions. The administration register is not a measurement-entry permission contract.

Later orders snapshot measurement/schema, service/add-on, and resolved rate versions. An explicit zero override beats the base rate; null falls back to base, then unset. Add-ons stay separate. Configuration does not produce a quote or imply that a garment is cut-ready.

Drafts remain in browser memory. Chrome desktop and narrow viewport checks do not establish other-browser or assistive-technology coverage. Native browser/process termination cannot promise draft recovery. Original templates and illustrations still need a tailor's operational validation before real cutting use.

No unresolved Build One acceptance failure remains. These verification limits do not claim production readiness or completion of the remaining phase 2 modules.

Verification uses synthetic test shops. It neither migrates nor resets `fitloom_dev`. External deployment, host backups, customer records, wearer measurements, orders, inventory, user image uploads, and the rest of phase 2 retain their existing scope and status.

## Post-review corrections on 2026-11-02

A two-axis implementation review ([review record](../reviews/phase-2-build-1-implementation-review.md)) checked the completed build against repository standards and this plan. Corrections:

- Added `packages/db/migrations/meta/0033_snapshot.json` as the reviewed Drizzle baseline. `schema.ts` declared the master tables, but the generated snapshots stopped at `0010`, so the next `db:generate` would have replayed duplicate master DDL. `db:generate` now reports no schema changes.
- Hardened register query parsing: unknown, duplicate, `toString`, and `constructor` keys return 400. Next strips `__proto__` before the handler, so that name is ignored rather than rejected.
- Added the plan's active-state control to garment editor section 1. It uses `garment.lifecycle`, preserves unsaved schema/rate edits, updates optimistically, and reverts on failure. The real Chrome harness now covers it.
- Extended the client 128 KiB pre-dispatch check to starter installation, matching the server limit.
- Reused the shared history query, added the shared `masterResources`/`masterKindFromResource` mapping, used the definition-byte constant in the save-bar budget, removed the unused command-payload registry, and fixed the move-before dialog's labelling/focus restoration and the tab strip's pressed state.
- Retained this run's Chrome screenshots under `screenshots/phase-2-build-1-increment-6/` instead of `/var/folders` links. Logs remain temporary.
- Documented that starter installation deliberately collapses nested publication token increments into one observable `catalogVersion` advance. No migration was added: editing applied migration `0030` would break the retained-history hash check, and the external behaviour was already correct and covered.

Verification after the corrections: lint, type checks, production build, 12 database and 146 application tests, optimized HTTP, and `MASTER_UI_CHECKS=1` real Chrome all pass. No retained migration changed and no new migration was added.
