# Build One implementation review: findings and dispositions

Plan: [Phase 2, Build One: garment masters](../plans/phase-2-build-1-garment-masters.md).
Date: 2026-11-02. Baseline: `9317c14`, 67 uncommitted files, +13288/−49.
Scope: the completed implementation, reviewed on two axes — repository standards and conformance to the plan/spec. This is not a second review of the plan itself.

## Verdict

The build is sound and the plan is implemented faithfully. The review found one operational migration hazard, two small transport/UI gaps, and several judgement-call refactors. All correctness items are fixed. The automated and real-Chrome checks below were rerun after the fixes.

## Standards findings

| Finding | Disposition |
| --- | --- |
| Drizzle declared the ten master tables but `migrations/meta/` stopped at `0010`, so the next `db:generate` would replay duplicate master DDL. | Added the reviewed `0033_snapshot.json` baseline and documented it in [database.md](../../development/database.md). `db:generate` now reports no schema changes. |
| `key in result` in the master query guard treated inherited names such as `toString` and `constructor` as duplicate keys. | Switched to a null-prototype object with `Object.hasOwn`, and added explicit `__proto__` rejection. Unknown, duplicate, `toString`, and `constructor` keys now fail with 400. |
| `database.md` said `master_begin` checks the operation's actor; the SQL checks tenant, location, command, and permissions, with the actor supplied by the admitted operation context. | Corrected the documentation rather than the SQL. |
| `masters.ts` duplicated `masterHistoryQuery`. | Reused the shared contract. |
| The garment/service/add-on resource mapping was repeated in the route and the client. | Added `masterResources` / `masterKindFromResource` to the browser-safe contracts. |
| `MASTER_DEFINITION_BYTES` and `masterCommandPayloads` had no consumers. | Used the byte constant in the displayed budget and removed the unused payload registry. |
| `garment-settings.tsx` owns register, editor, catalog, and library concerns. | **Deferred.** The file is large, but splitting it is a behavioural refactor with no Build One acceptance impact. The safe duplication was removed (shared resource map, extracted dialog, shared lifecycle handling). Track the split separately. |
| Move-before dialog lacked a labelled heading and focus restoration; the tab strip used `aria-current` on buttons. | Extracted the dialog, added `aria-labelledby`/`aria-describedby`, restored focus on close, and used `aria-pressed` for the toggle buttons. |

## Spec findings

| Finding | Disposition |
| --- | --- |
| Garment editor section 1 omitted the plan's active-state control. | Added an active checkbox to the editor. It calls `garment.lifecycle`, preserves unsaved definition/rate edits, updates optimistically, and reverts on failure. |
| The client 128 KiB pre-dispatch check covered `garment.save` but not `masters.starters.install`, although the plan names both. | Extended the client check to starter installation. |
| Starter installation's nested publication increments were overwritten by its single final token write. | Behaviour was externally correct and already covered by the install-token assertion. Documented the deliberate collapse in [database.md](../../development/database.md); no migration was added, because editing applied migration `0030` would break the retained-history hash check and a new migration would change the retained count for a documentation-only clarification. |
| The plan says a separate current add-on price panel *may* exist; prices render per binding. | Accepted as written; no historical amount or total is shown. |
| Chrome screenshot links pointed at `/var/folders/...` temp paths. | Screenshots are retained under `evidence/screenshots/phase-2-build-1-increment-6/` and linked relatively. |
| Extra `./garment-definition` subpath, extra SQLSTATE mappings, and additional check scripts. | Accepted; permitted by the plan's module and transport boundaries. |

## Deliberate deferrals

- `fetchItem`/`saveItem` re-read the register header after a save. The detail schemas omit header fields such as `active`, `version`, and `currentVersionId`, and the register read also selects the permitted priced/schema projection. Removing the round-trip would duplicate that projection logic, so it stays as a correctness guard.
- A full split of `garment-settings.tsx` into register/editor/catalog components is a follow-up refactor, not a Build One defect.

## Verification after the fixes

- `pnpm lint`, `pnpm typecheck`, and `pnpm build` pass.
- `packages/db` suite: 12/12. `packages/application` suite: 146/146.
- Optimized-app HTTP checks pass, including the new strict-query probes and the 413/408 transport checks.
- `MASTER_UI_CHECKS=1` real Chrome run passes, including the new editor active-state regression, move-before dialog, lifecycle, dirty navigation, and desktop/narrow layouts.
- `pnpm --filter @fitloom/db db:generate` reports no schema changes against the new baseline.

## Limit

Next strips a `__proto__` search parameter before the route handler receives the URL, so the handler cannot reject it; it is ignored and produces the default page rather than an error. The explicit guard remains as defense in depth if that framework behaviour changes. Inherited keys that do reach the handler (`toString`, `constructor`) are rejected.
