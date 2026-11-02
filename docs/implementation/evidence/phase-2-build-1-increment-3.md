# Garment masters increment 3 evidence

Verified locally on 2026-11-01. This records the increment 3 checkpoint; see [increment 4 evidence](phase-2-build-1-increment-4.md) for subsequent garment UI work. This records the service, catalog operations, and HTTP increment of [Build One](../plans/phase-2-build-1-garment-masters.md). The garment register/editor interface and full UI acceptance remain increments 4–6.

## Implemented artifacts

- `packages/application/src/masters.ts`: `createMasterService`, nine named commands, current-identity scoped reads, authorization before replay, safe projection selection, strict result parsing, bounded errors, and correlation IDs. Mutations use the existing executor and emit no external jobs.
- `packages/db/migrations/0030_master_catalog_commands.sql`: private publication helpers and restricted atomic starter, visibility, and full-catalog reorder functions.
- `packages/db/migrations/0031_master_registers.sql`: explicit schema-only/priced bounded registers with matching counts and normalized prefix/applicability/visibility predicates.
- `packages/db/migrations/0032_master_empty_bindings.sql`: fixes SQL validation for zero-field definitions with empty service/add-on collections. The real service test exposed an uninitialized binding key; earlier applied migrations were preserved.
- `packages/db/migrations/0033_master_page_bounds.sql`: bounds register/history continuation tokens to the admitted offset range.
- `apps/web/src/server/masters.ts` and `apps/web/src/app/api/workspaces/[tenant]/[location]/masters/[[...path]]/route.ts`: session-backed service binding and fixed GET/POST route matching, strict query/envelope validation, private responses, and opt-in 128 KiB definition/starter request limits.
- `packages/application/test/masters.test.mjs`: real executor/service scenarios using synthetic shops and the guarded `fitloom_test` database/advisory lock.
- `packages/application/scripts/master-http-checks.mjs`: master scenarios called from the existing optimized-app HTTP harness with its real verified session.
- `packages/application/scripts/master-transport-check.mjs`: isolated optimized-app checks for repeated 413 responses and a real stalled-stream 408 response.

## Behavior exercised

The service scenarios verify simultaneous same-key installation returns the original IDs, a second operation is a no-op, edited standard copies survive installation, collision rollback is complete, and separate fresh initializations from the same token yield one success and one conflict. The catalog audit entity is the tenant UUID with the correct equal previous/next token for a no-op.

A register with more than 50 garments exercises matching totals, continuation, normalized prefix search, applicability filters, cross-page moves, stale collection tokens, and hidden-standard discovery. Read projections omit base rates, service overrides, and add-on amounts after rate permission is revoked. Writes and replay both fail on revoked rate authority. A prior successful command replays after its service dependency is retired; a new inactive binding is rejected.

Lost-response retries return the exact saved version, changed semantic input under the same key conflicts, two edits from one header version yield one winner, and exact historical reads retain old labels. An injected exception after the domain mutation but before audit/outcome completion rolls back all local state. Synthetic tenants cannot read each other's catalog.

The actual HTTP checks cover catalog/register/current/history/exact endpoints, starter replay, schema edits, service rename without historical label changes, add-on amounts, stale/new-key conflicts, changed-payload key conflicts, validation issues, rate revocation before replay, schema-only projections, hide/discovery, and reorder. A definition larger than 16 KiB succeeds through the 128 KiB route. An escaped definition below the transport cap fails the exact stored JSONB budget with a bounded issue. Oversized requests return 413, invalid origins and scopes return 403, and responses carry private/no-store headers.

## Verification

The final `pnpm validate` tools-container run exited 0. Observed results:

| Check | Observed result |
| --- | --- |
| Retained history | 34 migrations; direct clean install, foundation upgrade/Owner backfill, and repeat invocation pass |
| Database suite | 12 reported tests pass, 0 fail |
| Application suite | 144 reported tests pass, 0 fail, including 9 reported master-service tests |
| Lint | Biome checks 128 files, no errors |
| Type checks | All 6 dependency/type-check tasks pass |
| Production build | All 4 workspace build tasks pass; the master route appears in the optimized Next.js route table |
| HTTP verification | New master checks, existing account/workspace/files/operator/worker/outage smoke checks, repeated 413 requests, and a stalled-stream 408 pass |

Focused commands were `node --env-file=packages/db/.env --test packages/application/test/masters.test.mjs`, `pnpm --filter @fitloom/application test:http`, and `node --env-file=packages/db/.env packages/application/scripts/master-transport-check.mjs` after building the affected packages/application. Full final output is captured locally in `/tmp/fitloom-increment3-final-validate.log`.

The focused checks and final full run exercise compiled artifacts and the actual optimized server. No mock SQL, HTTP handler substitute, or browser screenshot is used as API evidence.

The first full regression run passed the database/application suites, lint/types/build, then exposed a connection reset during oversized HTTP-body rejection. A small optimized-app harness reproduced the failure with repeated JSON requests. Early body-error responses now send `Connection: close`; repeated over-limit requests return 413 and a stalled body returns 408. The existing byte/deadline limits and unrelated error response shapes remain intact.

## Remaining boundaries

No garment settings page or editor is included. Dirty navigation, keyboard reorder/focus, narrow layouts, copy-from-history controls, and the full Build One UI acceptance matrix remain later work. Customer values, orders, quotes, inventory, uploads, and deployment are outside this increment.

Tests use `fitloom_test` and synthetic shops. No developer shop or uploads are used as acceptance data, and no new migration is applied to `fitloom_dev` by this increment's verification commands. Starter dimensions and illustrations remain development aids requiring a tailor's confirmation for operational use.
