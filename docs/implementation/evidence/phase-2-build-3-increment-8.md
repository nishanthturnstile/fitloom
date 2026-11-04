# Build Three increment 8: final phase 2 acceptance and handoff

Status: Complete locally on 2026-11-03. All 47 planned scenarios have executable coverage. Final aggregate validation, full Chrome/HTTP regression, matched recovery, inspected screenshots, schema alignment and development migration pass. Phase 2 is complete locally.

## Exact capture boundary

The early capture contract already separates immutable scalar data from current eligibility. Final review found that its SQL helper accepted a null version through the general detail function's current-version fallback. The service rejected that input, but the SQL boundary did not. A real PostgreSQL regression first failed with `Missing expected rejection`. Forward migration `0048_measurement_capture_handoff` now requires the exact version and projects immutable fields directly from the saved content row.

`measurementCaptureQuery` makes the exact-version requirement explicit at the application boundary. The output shape stays compatible. The SQL read no longer depends on mutable detail/photo/display-label projections. It returns the saved owner/version/schema/values/units/date/recording principal/provenance and separate effective-active/current-version/schema-active/current-schema flags. It contains no order or pricing code.

Focused checks compare identical immutable JSON before and after source revision, recording-staff rename, garment schema rename/republication/retirement and profile archive. Separate body-publication checks preserve the old body snapshot. Media tests compare scalar capture with photo read denied, then after historical removal and archived privacy revocation. Imported capture retains verified opaque provenance and original source-decimal spelling without leaking raw source identifiers. Capture and photo reads still check current scope and permission.

The final [measurement/media reference](../../architecture/measurements.md) defines the phase 3 boundary. Confirmation must recheck authority and selection eligibility in its own locked transaction. The public capture read does not reserve a version or authorize a later order write. Media membership stays separate, exact-version scoped and revocable.

## Matched recovery

The retained recovery rehearsal predates measurement-owned media. Its generic-file subject selection now explicitly requires workspace purpose. A second subject uses a real authorized measurement photo and its scalar capture. The manifest records every application-table count, exact journal sums, migration hashes, content digests and release fingerprints.

The clone check restores both deliberately removed objects, verifies every digest, reads measurement bytes through their own service, verifies the same scalar capture, rejects generic-purpose and foreign-scope reads, and revokes the photo in the clone without changing the scalar capture. Test writers remain quiescent; no side-effect worker runs on the clone. Production backup scheduling and post-snapshot privacy reconciliation remain external work.

## Complete acceptance matrix

Each row records local executable coverage. Earlier increment records retain detailed fixtures and screenshots; the final aggregate and Chrome runs re-execute the retained suites. Operational tailoring and untested devices are recorded separately below.

| ID | Local evidence | Source |
| --- | --- | --- |
| M01 | Explicit wearer selection, family identities and contact-only customers | [Increment 2](phase-2-build-3-increment-2.md); [customer-wearers-ui-checks.mjs](../../../packages/application/scripts/customer-wearers-ui-checks.mjs) |
| M02 | Body and garment entry, mixed bases, exact schema/value round-trips | [Increment 3](phase-2-build-3-increment-3.md); [measurement-ui-checks.mjs](../../../packages/application/scripts/measurement-ui-checks.mjs) |
| M03 | Five kinds, false/zero/missing, custom identity retirement and choice ownership | [Increment 3](phase-2-build-3-increment-3.md); [measurement-custom-ui-checks.mjs](../../../packages/application/scripts/measurement-custom-ui-checks.mjs) |
| M04 | Exact conversion, maximum decimals, rational bounds and unmodified source units | [Increment 0](phase-2-build-3-increment-0.md); [measurement-contracts.test.mjs](../../../packages/application/test/measurement-contracts.test.mjs) |
| M05 | Stale saves reject; reviewed rebase and old immutable schema remain readable | [Increment 3](phase-2-build-3-increment-3.md); [measurement-custom-ui-checks.mjs](../../../packages/application/scripts/measurement-custom-ui-checks.mjs) |
| M06 | Privileged content mutations reject; no-op and current pointer/history constraints hold | [Increment 1](phase-2-build-3-increment-1.md); [measurement-storage.test.mjs](../../../packages/application/test/measurement-storage.test.mjs) |
| M07 | Concurrent edits and parent/schema/profile lock conflicts use real connections | [Increment 3](phase-2-build-3-increment-3.md); [measurement-storage.test.mjs](../../../packages/application/test/measurement-storage.test.mjs) |
| M08 | Tenant/location/actor isolation, preset upgrades, role dependencies and current revocation | [Increment 1](phase-2-build-3-increment-1.md); [measurement-storage.test.mjs](../../../packages/application/test/measurement-storage.test.mjs) |
| M09 | Closed price-free projections and measuring-only HTTP/Chrome access | [Increment 2](phase-2-build-3-increment-2.md); [measurement-http-checks.mjs](../../../packages/application/scripts/measurement-http-checks.mjs) |
| M10 | Exact lost-response retries and changed-envelope/actor/location rejection | [Increment 3](phase-2-build-3-increment-3.md); [measurement-revision-ui-checks.mjs](../../../packages/application/scripts/measurement-revision-ui-checks.mjs) |
| M11 | Saved outcome survives projection failure without another content write | [Increment 3](phase-2-build-3-increment-3.md); [measurement-revision-ui-checks.mjs](../../../packages/application/scripts/measurement-revision-ui-checks.mjs) |
| M12 | 52 profiles/versions, filter/count/continuation and stale-read cancellation | [Increment 2](phase-2-build-3-increment-2.md); [measurement-http-checks.mjs](../../../packages/application/scripts/measurement-http-checks.mjs) |
| M13 | Fresh profile/custom identities, no inherited media/cards and source independence | [Increment 4](phase-2-build-3-increment-4.md); [measurement-reuse-ui-checks.mjs](../../../packages/application/scripts/measurement-reuse-ui-checks.mjs) |
| M14 | Explicit identity/ease mapping, no basis inference and immutable provenance | [Increment 4](phase-2-build-3-increment-4.md); [measurement-reuse-ui-checks.mjs](../../../packages/application/scripts/measurement-reuse-ui-checks.mjs) |
| M15 | Four-version tables, 50+2 trend continuation, missing SVG gaps and keyboard chart | [Increment 4](phase-2-build-3-increment-4.md); [measurement-comparison-ui-checks.mjs](../../../packages/application/scripts/measurement-comparison-ui-checks.mjs) |
| M16 | Dirty/uncertain links, sheets, reload/back, shortcut and scope-switch guards | [Increment 3](phase-2-build-3-increment-3.md); [measurement-revision-ui-checks.mjs](../../../packages/application/scripts/measurement-revision-ui-checks.mjs) |
| M17 | Real image/object storage, actor/purpose/reservation ownership and resource bounds | [Increment 5](phase-2-build-3-increment-5.md); [measurement-photo-checks.mjs](../../../packages/application/test/measurement-photo-checks.mjs) |
| M18 | Historical membership survives removal; revocation and leased cleanup deny bytes | [Increment 5](phase-2-build-3-increment-5.md); [measurement-photo-checks.mjs](../../../packages/application/test/measurement-photo-checks.mjs) |
| M19 | Actual PNG decode, fixed selections, current issuer/reader and irreversible lifecycle revoke | [Increment 6](phase-2-build-3-increment-6.md); [measurement-card-checks.mjs](../../../packages/application/test/measurement-card-checks.mjs) |
| M20 | Strict CSV headers/quoting/UTF-8/bounds, every row classified and no business dry-run writes | [Increment 7](phase-2-build-3-increment-7.md); [import-formats.test.mjs](../../../packages/application/test/import-formats.test.mjs) |
| M21 | Current canonical phone fingerprints and explicit customer/wearer mappings | [Increment 7](phase-2-build-3-increment-7.md); [domain-imports.test.mjs](../../../packages/application/test/domain-imports.test.mjs) |
| M22 | Atomic group/outcome/source maps, same-batch and distinct-batch races, exact recovery | [Increment 7](phase-2-build-3-increment-7.md); [domain-imports.test.mjs](../../../packages/application/test/domain-imports.test.mjs) |
| M23 | Nine-state group partition, CSV redundancy, cancellation and private-content purge | [Increment 7](phase-2-build-3-increment-7.md); [domain-imports.test.mjs](../../../packages/application/test/domain-imports.test.mjs) |
| M24 | Current HTTP statuses, no-store/origin, bounded streaming and opaque diagnostics | [Increment 7](phase-2-build-3-increment-7.md); [domain-import-http-checks.mjs](../../../packages/application/scripts/domain-import-http-checks.mjs) |
| M25 | Clean/upgrade/reapply, forced RLS, empty search paths, grants and schema alignment | [Increment 1](phase-2-build-3-increment-1.md); [measurement-storage.test.mjs](../../../packages/application/test/measurement-storage.test.mjs) |
| M26 | Exact required-version scalar capture, stable content, independent eligibility and media access | [This record](#exact-capture-boundary); [measurement-capture-checks.mjs](../../../packages/application/test/measurement-capture-checks.mjs) |
| M27 | Real Chrome 1440/1024/390/320, Tamil text, keyboard/focus, actual print/screenshots | [Increment 6](phase-2-build-3-increment-6.md); [master-ui-checks.mjs](../../../packages/application/scripts/master-ui-checks.mjs) |
| M28 | Retained foundation/customer/master/measurement/media/card/import/worker/operator suites | [Increment 7](phase-2-build-3-increment-7.md); [web-smoke.mjs](../../../packages/application/scripts/web-smoke.mjs) |
| M29 | Full 200-phone preview uses independent admission without interactive review consumption | [Increment 7](phase-2-build-3-increment-7.md); [domain-imports.test.mjs](../../../packages/application/test/domain-imports.test.mjs) |
| M30 | Customer/wearer source maps and import activity commit or roll back together | [Increment 7](phase-2-build-3-increment-7.md); [domain-imports.test.mjs](../../../packages/application/test/domain-imports.test.mjs) |
| M31 | Sequence-defined complete histories, distinct profiles, exact replay and changed-set rejection | [Increment 7](phase-2-build-3-increment-7.md); [domain-imports.test.mjs](../../../packages/application/test/domain-imports.test.mjs) |
| M32 | Isolated import roles and every protected route use static family authority | [Increment 7](phase-2-build-3-increment-7.md); [domain-import-http-checks.mjs](../../../packages/application/scripts/domain-import-http-checks.mjs) |
| M33 | UUIDv4 attempts plus explicit actor/location binding for all ten retained import claim kinds | [This record](#exact-capture-boundary); [measurement-capture-checks.mjs](../../../packages/application/test/measurement-capture-checks.mjs) |
| M34 | Deterministic PostgreSQL midnight fixtures in both offset directions, real shop-local today/tomorrow saves and missing-zone denial | [This record](#exact-capture-boundary); [measurement-capture-checks.mjs](../../../packages/application/test/measurement-capture-checks.mjs) |
| M35 | Saved standard/custom/select labels and basis remain fixed after master changes | [Increment 6](phase-2-build-3-increment-6.md); [measurement-card-checks.mjs](../../../packages/application/test/measurement-card-checks.mjs) |
| M36 | Generated JSON Schema/template conformance, five kinds and field-owned choice spoof rejection | [Increment 7](phase-2-build-3-increment-7.md); [import-formats.test.mjs](../../../packages/application/test/import-formats.test.mjs) |
| M37 | Cancel keeps saved successes; failed/needs-review block complete until explicit review/skip | [Increment 7](phase-2-build-3-increment-7.md); [domain-imports.test.mjs](../../../packages/application/test/domain-imports.test.mjs) |
| M38 | Canonical phone/source/wearer grouping, conflicts, redundant rows and archived candidates | [Increment 7](phase-2-build-3-increment-7.md); [import-formats.test.mjs](../../../packages/application/test/import-formats.test.mjs) |
| M39 | Pinned body manifest; current publication rejects stale fresh saves while v1 capture stays intact | [This record](#exact-capture-boundary); [measurement-storage.test.mjs](../../../packages/application/test/measurement-storage.test.mjs) |
| M40 | Reservation before content, atomic binding/rollback, planned version and actor/expiry limits | [Increment 5](phase-2-build-3-increment-5.md); [measurement-photo-checks.mjs](../../../packages/application/test/measurement-photo-checks.mjs) |
| M41 | Privileged selection/header mutation denial; revoke cannot alter stored projection or expiry | [Increment 6](phase-2-build-3-increment-6.md); [measurement-card-checks.mjs](../../../packages/application/test/measurement-card-checks.mjs) |
| M42 | Exact committed recovery despite expiry, exhausted quota or another lease; wrong actor/hash denied | [Increment 7](phase-2-build-3-increment-7.md); [domain-imports.test.mjs](../../../packages/application/test/domain-imports.test.mjs) |
| M43 | Retained 0039 upgrade and fresh Owner grants; Manager/Staff/custom scopes remain narrow | [Increment 1](phase-2-build-3-increment-1.md); [measurement-storage.test.mjs](../../../packages/application/test/measurement-storage.test.mjs) |
| M44 | 18+6 maximum, exact mixed-unit bounds and owner-field validation paths | [Increment 0](phase-2-build-3-increment-0.md); [measurement-contracts.test.mjs](../../../packages/application/test/measurement-contracts.test.mjs) |
| M45 | Allowlisted sign-in return, current reader-only resolution and shared 30/minute admission | [Increment 6](phase-2-build-3-increment-6.md); [measurement-card-http-checks.mjs](../../../packages/application/scripts/measurement-card-http-checks.mjs) |
| M46 | Both templates/manifests, strict file/group budgets and rejected replacement-file UI | [Increment 7](phase-2-build-3-increment-7.md); [domain-import-ui-checks.mjs](../../../packages/application/scripts/domain-import-ui-checks.mjs) |
| M47 | Actual 3/2/10/20-second limits, one import attempt, deadline reserve and recovery | [Increment 7](phase-2-build-3-increment-7.md); [import-deadlines.test.mjs](../../../packages/application/test/import-deadlines.test.mjs) |

## Verification observations

The initial aggregate run passes all 12 database and 252 application tests, lint/types, production build and the new capture/media HTTP checks. It then fails the retained five-second idle-worker drain assertion. The unchanged rerun passes, with a 71 ms worker drain and subsequent stale-heartbeat/restart recovery. The full Chrome/HTTP run later passes with a 123 ms drain. No worker runtime code, timeout or assertion was relaxed.

The matched restore rehearsal passes with 61 private objects, 49 migrations and eight balanced journal lines. The redacted report confirms exact measurement capture and photo restoration, post-restore privacy revocation, no side-effect workers, and disposable-clone removal. A direct PostgreSQL catalog read confirms no restore databases remain. Restricted snapshot artifacts are removed on success.

The focused storage/contracts/import run passes 63 tests, including four new storage checks and the closed capture-query fixture. Deterministic midnight cases use actual PostgreSQL timezone conversion immediately before/after local midnight in Asia/Kolkata and America/Los_Angeles. Retained real commands separately accept local today, reject tomorrow and reject missing configuration. No database or machine clock is altered.

## Operational limits and phase 3 ownership

These are local technical acceptance checks using synthetic data. Original measuring illustrations, terminology, landmark guidance, and the shop's chosen measuring practice still need operational tailor validation before real cutting. The app ships no inferred body-to-garment ease formula. Staff review explicit mappings and every supported import group.

Chrome checks keyboard/focus, mobile widths and browser print rendering. Safari, VoiceOver, physical-device tests, physical printing and physical QR scanning are not claimed. Generated QR PNGs are decoded by the retained automated check. Printed/downloaded copies stay with their holder; revocation controls subsequent authorized reads.

Phase 3 owns quote and money policy, order confirmation/amendments, manual collection/allocation, receipts/refunds, numbering and immutable order snapshots. It must resolve the roadmap's real-document policy gate before affected real-data actions and can continue with explicit INR development fixtures. This increment creates no order or payment workflow.

External deployment, host backup scheduling and production recovery objectives remain user-owned. The infrastructure planning reminder remains after locally verified phase 3. A first deployment candidate remains the phase 4 milestone. The local matched restore rehearsal does not replace reconciliation of later privacy suppression/revocation before admitting restored production access.

## Inspected final browser evidence

The final full Chrome run produces fresh synthetic-data captures. Twelve inspected files are retained here. Viewport captures show the intended scroll position; the historical detail and import captures show their complete pages. The long full-page wearer-sheet capture was excluded because a fixed modal only covers the actual viewport; the retained book capture shows explicit wearer context clearly.

| State | Inspected capture |
| --- | --- |
| Explicit duplicate-phone decision, 1440 pixels | [Customer matching](screenshots/measurements-acceptance/customer-duplicate-1440.png) |
| Wearer book and count-bearing continuation, 320 pixels | [Measurement book](screenshots/measurements-acceptance/measurement-book-320.png) |
| Exact historical units, missing values and sequence continuation, 1440 pixels | [Saved version](screenshots/measurements-acceptance/measurement-history-1440.png) |
| Long Tamil custom label, 1024 pixels | [Entry](screenshots/measurements-acceptance/measurement-entry-1024.png) |
| Concurrent revision conflict retains draft, 1440 pixels | [Conflict](screenshots/measurements-acceptance/measurement-conflict-1440.png) |
| Custom kind/required-value controls, 320 pixels | [Custom definition](screenshots/measurements-acceptance/measurement-custom-320.png) |
| Explicit additive ease and unsaved result, 390 pixels | [Reviewed mapping](screenshots/measurements-acceptance/measurement-mapping-390.png) |
| Actual gap path and scrollable complete table, 320 pixels | [Trend](screenshots/measurements-acceptance/measurement-trend-gap-320.png) |
| Archived historical privacy fallback, 320 pixels | [Revoked photo](screenshots/measurements-acceptance/measurement-photos-revoked-320.png) |
| Fixed one-field card with original units and local QR, A4 browser print | [Card print](screenshots/measurements-acceptance/measurement-card-print-a4.png) |
| One committed customer group and one cancelled group, 320 pixels | [Cancelled import](screenshots/measurements-acceptance/customer-import-cancelled-320.png) |
| Complete measurement history, expanded values and explicit source owners, 390 pixels | [Measurement import](screenshots/measurements-acceptance/measurement-import-review-390.png) |

## Executed commands and migration readback

| Command or check | Observed result |
| --- | --- |
| `pnpm validate` | Exit 0 on the final rerun. 12 database and 252 application tests, no failures/skips, lint across 316 files, all workspace types, production build, HTTP/worker/identity/operator/private-storage regression, declared/chunked 413 and slow-stream 408 checks |
| Focused `measurement-storage.test.mjs`, `domain-imports.test.mjs`, `measurement-contracts.test.mjs` | Exit 0, 63 tests. Exact-version capture, lifecycle/publication/media stability, source provenance, SQL midnight fixtures and all-ten-import-kind claim binding |
| `pnpm check` and `pnpm build` | Exit 0 on the final application source |
| `MASTER_UI_CHECKS=1 FITLOOM_UI_ARTIFACTS=fitloom-build3-increment8-final pnpm --filter @fitloom/application test:http` | Exit 0. Complete retained customer/master/measurement/media/card/import/workspace/authority Chrome regression, followed by HTTP, worker and transport checks |
| `pnpm verify:recovery` | Exit 0. 61 real private objects, 49 migrations, eight balanced journal lines; matched database/object restore, exact scalar capture and independent media authorization/revocation; no side-effect worker; clone dropped and restricted artifacts removed |
| `pnpm --filter @fitloom/db db:generate` | No schema changes after snapshot 0048 |
| `pnpm db:migrate` and direct readback | Exit 0. 49 retained/applied hashes and timestamps match. All fifteen prior data counts match; six garments and six saved garment versions are preserved. No reset or seed |
| Direct function/catalog and development health checks | Exact required-version projection, STABLE security-definer function, empty search path and web-only runtime execute grant; no waiting locks. Web/worker and supporting services healthy; account route returns HTTP 200 |
| Screenshot inspection, relative links and `git diff --check` | Twelve fresh synthetic-data screenshots inspected; links and diff checks pass |

The new migration changes only `app.measurement_capture`; it creates no business rows or tables. Preflight verifies `fitloom_dev` and the 48-entry retained prefix. Postflight verifies all 49 entries, the same six garment headers/versions, and unchanged customer/wearer/measurement/photo/card/import counts. Migration 0048 is applied and frozen.

## Phase 2 completion

Build One garment masters, Build Two customers/wearers and Build Three measurements are complete locally. The 47-row matrix and retained earlier evidence cover their required measurement dependencies and regression. No required import, history, card, comparison or photo implementation is left as an unowned follow-up.

The next work is the phase 3 implementation plan for canonical quotes, shop accounting/manual collections, order confirmation and documents, using the exact capture/media contract above. Operational tailoring/device limits and external infrastructure responsibilities remain as recorded; they do not imply an implemented order workflow or a production deployment.
