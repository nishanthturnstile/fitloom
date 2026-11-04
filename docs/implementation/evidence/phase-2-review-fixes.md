# Phase 2 review corrections

Date: 2026-11-04. All 17 actionable findings and the optional refactor are resolved. Aggregate validation and the complete browser suite pass.

This change addresses the 17 actionable findings and optional shared-parser refactor in the [complete phase 2 review](../reviews/phase-2-complete-code-review.md). The original review and raw OCR findings remain historical evidence.

## Corrections

| Finding | Resolution | Regression evidence |
| --- | --- | --- |
| S1 | Import requests always have an abort deadline: 15 seconds for ordinary requests and 60 seconds for chunks. Caller cancellation remains effective. Exact-envelope uncertainty and recovery remain available. | Actual request helper against a stalled HTTP server rejected after 15,007 ms. A caller timeout also interrupted a chunk request. |
| S2 | Customer-photo, measurement-photo and card server adapters pass structured command observers to their services. | HTTP smoke checks inspect safe observer envelopes and require events from the corresponding adapters. |
| S3, advisory | Six services share the scalar SQL projection parser in `database-value.ts`. Domain error handling stays in each service. | Existing service/storage/transport suites exercise the shared parser. |
| F1 | Revisions send an explicit `retain` origin. SQL resolves and verifies the current saved origin, recomputes copy/mapping edits, and retains imported attribution without accepting forged import provenance. | Application contracts, mapped/imported database no-ops and edits, and copied/mapped browser no-ops. |
| F2 | Lifecycle and photo-revocation controllers register pending and uncertain protection. The workspace guard tracks multiple registrations so an inactive sibling cannot replace an outstanding operation. | Browser response-loss scenarios cancel link exits, test reload protection, preserve exact retry bytes, and cancel a lifecycle scope switch. |
| F3 | Measurement books offer a bounded garment filter, including garments referenced by existing profiles after hiding or archiving. Filter/search changes reset pagination. | Scoped database discovery and browser garment filtering. |
| C1 | Preview admission commits before acquiring the command transaction. Operation-bound reservations support replay and reject concurrent duplicate admission. Release happens after the command connection returns. | Preview succeeds with a one-connection pool; committed replay succeeds after the fresh-preview budget is exhausted. |
| C2 | Outcome export uses one authorized `STABLE` SQL call, assembling all pages under the same statement snapshot. | A 30-group export contains every group and reconciles its counts. The regression verifies the database function's volatility. |
| R01 | Standard garment length bounds use canonical centimetres, matching master authoring. Body and custom length bounds retain their pinned display unit. Exact quantities and saved documents are preserved. The plan now states this distinction. | Application boundary cases and SQL acceptance/rejection with inch display and centimetre values, including independent custom-field bounds. |
| R02 | Exact service/add-on header recovery follows bounded pages until the requested ID is found, both when opening and after saving. | Browser service fixture puts the exact header after 50 prefix siblings. |
| R03 | New dry-runs and writes invalidate and abort pending status reads. | Browser holds a Resume response, clears the dry-run, delivers the old response, and checks that private groups stay cleared. |
| R04 | Changing a trend anchor clears the prior busy state when invalidating its request. | Browser changes anchor while a trend request is held, then checks that Load trend is enabled. |
| R05 | Explicit `Leave missing` is encoded as a null target choice rather than an absent mapping. Application and SQL mapping return no value for that decision. | Real mapping helper and SQL function regressions. |
| R06 | Master mutations rethrow retryable SQL states `40001` and `40P01` to the command executor. | Exported mutation regression retains both states; existing command tests exercise bounded retry behavior. |
| R07 | Hidden standard garments are removed from fresh measurement and import selection, with server admission enforcement. Existing revision/history/capture paths remain available. | Scoped storage tests reject fresh hidden selection and preserve existing revision, capture and book filter discovery. |
| R08 | Customer panels restore `#measurements` on load when the current user has measurement read access. | Browser selects Measurements, reloads, and checks the restored active tab. |
| R09 | Home describes shipped measurements and provides an authorized customer entry link. | Rendered Home HTTP checks require current copy and link text, and reject the old placeholder. |
| R10 | Successful image loads clear the saved photo's unavailable state, restoring note and privacy controls. Initial hydration also detects images that failed before the error handler was attached. | Browser fails a saved image request, retries successfully, and checks that revocation controls return. |

## Database preservation

The new migration is `0049_phase_two_review_corrections.sql`. Previously applied migrations were not edited. It replaces affected functions and grants the new bounded endpoints only to the web role. Private helper functions remain unavailable to runtime roles.

The development preflight matched all 49 applied migration checksums. After `pnpm db:migrate`, all 50 checksums match and the business-row counts are identical. It found six garments and six garment versions, with no customer, wearer, measurement or import rows. No development reset or fixture seeding is part of these corrections. All regression fixtures use guarded `fitloom_test` credentials.

## Validation

`pnpm validate` exited 0. It passed 12 database tests and 264 application tests, lint, type checks, production builds, authenticated HTTP integration and body/slow-stream transport checks. Biome reports 37 informational suggestions and no errors.

The final host production build and complete retained Chrome suite pass. Browser coverage includes all new regression scenarios above, customer and catalog workflows, native navigation decisions, current permission changes and desktop/narrow layouts. The complete browser/HTTP/transport command exited 0.

The new database regression suite passes seven tests, and the four application correction tests pass. The retained stalled-request test checks actual POST/read deadlines against a local HTTP server and preserves caller cancellation for chunks.

`pnpm --filter @fitloom/db db:generate` reports no schema drift. `git diff --check` passes. All seven original OCR artifact checksums remain valid.

The review fixes are included in the phase 2 completion changes. GitHub Actions validates the committed branch before merge to `main`.

Saved evidence: [aggregate validation](../reviews/phase-2-fixes-artifacts/validate.log), [browser/HTTP output](../reviews/phase-2-fixes-artifacts/browser-http.log), [focused database checks](../reviews/phase-2-fixes-artifacts/focused-storage.log), [application checks](../reviews/phase-2-fixes-artifacts/focused-application.log), [request deadlines](../reviews/phase-2-fixes-artifacts/import-client.log), and [source checksums](../reviews/phase-2-fixes-artifacts/source-SHA256SUMS).

Inspected screenshots include the [320 px garment filter](screenshots/phase-2-review-fixes/measurement-book-filter-320.png), [desktop filter](screenshots/phase-2-review-fixes/measurement-book-filter-1440.png), [trend gaps](screenshots/phase-2-review-fixes/measurement-trend-gap-320.png), and [revoked photo fallback](screenshots/phase-2-review-fixes/measurement-photos-revoked-320.png). Only synthetic test data appears in these artifacts.
