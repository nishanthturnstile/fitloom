# Garment masters increment 2 evidence

Verified locally on 2026-11-01. This records the increment 2 checkpoint; see [increment 3 evidence](phase-2-build-1-increment-3.md) for subsequent service/API work. This records the persistence and permission increment of [Build One](../plans/phase-2-build-1-garment-masters.md). Application master commands/services, register queries, starter installation, reorder/visibility operations, HTTP routes, and settings editors remain in increments 3–6.

## Retained migrations

| Migration | Result |
| --- | --- |
| `0023_garment_master_storage` | Ten tenant-owned tables; tenant/parent/version keys; reference indexes; deferred current-pointer checks; immutable version/binding triggers; one-way registry retirement; forced RLS; Owner backfill and role permission dependencies |
| `0024_master_validation` | Strict format 1 validation, bounded collections, semantic/basis/range checks, rate validation before casts, illustration allowlist, and immutable node signatures |
| `0025_master_persistence` | Restricted create/update/lifecycle functions, matching active-operation checks, catalog-first locking, expected versions, lineage, relational rate/binding extraction, and retired-reference carry-forward |
| `0026_master_projections` | Explicit schema-only/priced reads, current or exact versions, bounded metadata history, and a read-only catalog header |
| `0027_master_validation_paths` | Corrects an SQL array/scalar path ambiguity found by the first real publication test |
| `0028_master_name_whitespace` | Aligns SQL whitespace validation and name trimming with ECMAScript while preserving SQL-owned NFC and ASCII case folding |
| `0029_master_uuid_contract` | Aligns the SQL UUID boundary with the browser contract's RFC nil/max UUID support |

Corrections append migrations; SQL already applied to the test database was not rewritten. The retained set now contains 30 migrations. No migration was applied to `fitloom_dev` in this increment.

`packages/db/src/schema.ts` declares the new relational columns, keys, references, indexes, checks, and RLS policies. Retained SQL additionally owns forced RLS, trigger behavior, execution grants, and operation foreign keys to the SQL command foundation. The storage test compares every new table's actual column names/nullability, numeric precision, and declared Drizzle foreign keys against PostgreSQL.

## Verified behavior

The real-role suite creates independent synthetic shops and locations using the guarded `fitloom_test` database and shared advisory test lock. It exercises named restricted functions inside actual scoped transactions with claimed/completed operations.

- New and existing Owner roles receive all master permissions. Existing unrelated grants survive; Manager and Staff receive no master grants. Custom management roles require both read permissions in the application contract and SQL role function.
- Garment, service, and add-on saves append versions. Garment content edits preserve the catalog order/settings token. Creates and actual lifecycle changes advance it; no-op lifecycle requests retain it.
- v1, v2, and v3 retain their saved definitions after rename, reorder, and field retirement. Header edit versions describe current concurrency state even on historical reads. Reusing retired IDs or changing kind/basis/unit/group selection/option ownership fails. Fresh field IDs permit semantic changes.
- Service/add-on bindings use same-tenant identities. Active references get server-resolved current labels. An inactive service can carry forward only with its exact locked-current label and override. Add-on price edits leave old schemas and exact add-on versions intact.
- Base rates and overrides distinguish null from zero and return canonical six-place strings. Plain-string validation rejects negative-zero, exponent, excess precision, non-finite, and overflow input before casts. Independent numeric constraints reject NaN/negative values; numeric precision rejects overflow on privileged inserts too.
- SQL revalidates all five field kinds, bounded structure, unknown keys, duplicate IDs, semantic compatibility, option ownership, missing sections, numeric bounds, illustration IDs, and exact stored JSONB text size. Size is checked again after resolving labels. A large escaped definition that passes per-collection contracts fails the 64 KiB SQL budget; a smaller one persists within it.
- Schema-only detail, add-on, and metadata-history projections have no rate properties. Priced reads require current rate permission. Cross-tenant and unauthorized-location reads fail; authorized second locations see the shared tenant definition.
- Every new table forces RLS. Web/worker direct table SELECT/INSERT/UPDATE/DELETE attempts fail. Internal helpers, missing-context calls, missing/wrong operations, and worker function calls fail. Privileged UPDATE/DELETE attempts on versions and bindings also fail independently of runtime grants.
- Wrong-tenant bindings, wrong-parent current pointers, foreign creation locations, missing current versions, and backwards registry changes fail database constraints/triggers.
- Concurrent edits from one header version produce one success and one conflict. An injected failure before audit/outcome completion rolls back header, version, bindings, registry, and catalog changes. Another tenant's exact version stays unchanged.
- NFC combining marks, Tamil names, ASCII case variants, Unicode whitespace, and inactive name reservation use the authoritative SQL normalization policy.

The existing workspace permission/delegation controls now show readable labels for the new permissions and preserve exact submitted permission values. No settings page or master endpoint is added in this increment.

## Verification commands

The focused command is `node --env-file=packages/db/.env --test packages/application/test/master-storage.test.mjs` after building the DB/application packages. The clean database test is `pnpm --filter @fitloom/db test`.

Final `pnpm validate` exited 0 in the tools container. Its observed results were:

| Check | Observed result |
| --- | --- |
| Retained migration history | 30 migrations; clean installation, foundation upgrade with Owner backfill, and repeat invocation pass |
| Database suite | 12 reported tests pass, 0 fail |
| Application suite | 135 reported tests pass, 0 fail, including 51 contract tests and 19 reported master-storage tests |
| `pnpm check` | Biome checks 122 files; all 6 type-check/build dependency tasks pass |
| `pnpm build` | All 4 workspace tasks pass, including optimized Next.js compilation |
| Optimized HTTP smoke | Passes account/session/provisioning/workspace, current authority, private files, operator TOTP/recovery, worker restart, telemetry, bounded lists, and database/storage failure scenarios |

The final run includes migration `0029` and its actual SQL UUID boundary test. The smoke suite verifies existing routes and permission-label compatibility; it does not claim new master HTTP endpoints. The captured local output is `/tmp/fitloom-increment2-final-validate.log`.

An earlier focused run overlapped the full suite and hit the shared test lock's two-second timeout. The new storage harness now permits a bounded wait for that advisory lock and closes pools in `finally`, including admission failures. The final serial tools-container run passes. No developer shop or upload was used as acceptance data.

## Remaining boundaries

The application master service must resolve current authenticated identity and enforce master authorization before operation replay. SQL independently admits every new mutation, but this increment does not introduce a second command executor or route-level command path. The storage suite's synthetic command wrapper is test code only.

Catalog register pagination/search, reorder, visibility changes, and atomic starter installation remain increment 3 work. Schema-only versus priced version functions are ready for that service to choose explicitly. Dirty-form, keyboard, narrow-screen, and new settings-route behavior remain later UI acceptance work. The full Build One acceptance matrix is not complete.

Original starter schemas and illustrations remain development aids. Operational cutting validation and production deployment are outside this increment.
