# Phase 2 implementation review

Status: Review complete on 2026-11-04, following local checks on 2026-11-03. The local reviews and Linux OCR delegation audit found 17 actionable issues: 12 P2/medium and five P3/low, plus one optional refactor. No critical/high issue was validated. All 17 actionable findings and the optional refactor were corrected on 2026-11-04. See the [finding dispositions and validation evidence](../evidence/phase-2-review-fixes.md) and [verification record](phase-2-review-fixes-verification.json). Findings below describe the original review snapshot.

## Scope and method

The review compares the original phase 2 baseline `9317c14ee1fbab1c0bc027c7669e3f290c4e9d1e` with the current working tree at `ed3304539481f35497b68b4c00706d5b151b1c22`. It includes committed garment/customer work and untracked measurement/import work. A HEAD-only diff would omit substantial phase 2 implementation.

The frozen manifest contains 255 changed or added application/package files. Its canonical SHA-256 is `43d9d4d772964b96cfc698f7d6721cf0f1cdbe8bf7d3b77da16bd6cbadc328f7`. All hashes remained unchanged after the local review and runtime checks.

The governing plans are [garment masters](../plans/phase-2-build-1-garment-masters.md), [customers and wearers](../plans/phase-2-build-2-customers.md), [measurements](../plans/phase-2-build-3-measurements.md), and the [import format reference](../plans/phase-2-build-3-import-formats.md). Canonical requirements, development guides and architecture documents supply the product and coding constraints. Three independent local reviewers examined plan conformance, standards, and correctness. The lead checked their cited paths and reproduced the database findings below.

The standards and spec axes remain separate. Additional transaction/export findings have their own section. P2 means a normal-priority defect; P3 means a lower-priority gap. The optional refactor is not a correctness defect.

## Standards

### S1. P2: Import requests can remain locked indefinitely

Location: [import-client.ts:15](../../../apps/web/src/components/imports/import-client.ts#L15), with callers in [domain-import-panel.tsx:215](../../../apps/web/src/components/imports/domain-import-panel.tsx#L215) and line 258.

`importFetch` supplies a signal only when its caller provides one. Preview, decision, cancellation, chunk and recovery requests do not provide a deadline. The panel enters `working` before awaiting them, disables conflicting controls, and exposes recovery only after reaching `uncertain`. A response that stalls without rejecting therefore leaves the panel locked indefinitely. Database transaction and scheduling deadlines do not bound delivery of the HTTP response.

The lead loaded the actual TypeScript request helpers with an instrumented fetch. Both `importFetch` and `importRead` omitted an abort signal by default and remained pending. This checks request construction; no real stalled-browser reproduction is claimed. The controller path establishes the resulting locked state.

Use a finite browser deadline that accommodates import chunks and retains exact-envelope recovery on interruption. Ordinary protected reads also need their existing bounded-read behavior. The measurement plan's retry/uncertainty contract at line 183 and timeout discussion at line 362 govern this behavior.

### S2. P3: Photo and card command diagnostics are unwired

Locations: [measurement-cards.ts:10](../../../apps/web/src/server/measurement-cards.ts#L10), [measurement-photos.ts:11](../../../apps/web/src/server/measurement-photos.ts#L11), and [customer-photos.ts:11](../../../apps/web/src/server/customer-photos.ts#L11).

These server adapters omit the services' `observe` callback. The executor emits success/failure events through the optional observer, so these command families produce none of the structured command diagnostics wired for masters, customers, measurements and imports. Domain audit records still exist; this finding concerns operational diagnostics.

[Architecture overview](../../architecture/overview.md#selected-technology-stack-and-libraries) requires correlation and error reporting on actual commands. Wire the shared safe observer without logging private values. This finding follows the actual factory/executor call chain; it was not verified by issuing a production command and searching process logs.

### S3. Advisory: Repeated scalar projection parsing

The `value()` helpers in [measurement-cards.ts:19](../../../packages/application/src/measurement-cards.ts#L19), [measurement-photos.ts:26](../../../packages/application/src/measurement-photos.ts#L26), [measurements.ts:161](../../../packages/application/src/measurements.ts#L161), [domain-imports.ts:128](../../../packages/application/src/domain-imports.ts#L128), masters and customers repeat the same single-row `value` extraction and schema parsing.

This is a possible duplicated-code smell, not a documented-standard breach. A small shared database projection helper could remove repeated transport parsing while preserving domain-specific error translation. It does not block phase 3.

## Spec

### F1. P2: Revising non-manual measurements resets provenance

Location: [measurement-entry.tsx:113](../../../apps/web/src/components/measurements/measurement-entry.tsx#L113), with submission at line 531.

The editor initializes `origin` to `{kind: "manual"}` even when `revision.document.origin` describes copied, mapped or imported content. Opening a current non-manual profile and saving without changes sends a different document. The SQL no-op check compares the complete document, including origin, so this creates another immutable version. An ordinary edit also removes source/mapping/ease attribution from the new version. Comparison and trend logic use that attribution to mark transformed values.

The lead reproduced this with real guarded database commands. A mapped profile with two inches of explicit ease returned `changed:false` when revised with its preserved origin. Sending the editor's manual origin with otherwise identical content returned `changed:true`, advanced sequence from 1 to 2, and replaced mapped provenance with manual provenance. Every other document property remained equal.

The measurement plan requires no content version for a no-op at line 99, retained mapping decisions at line 224, and transformed-value presentation at line 230. Preserve verified provenance on revisions through an explicit server-validated contract. Imported provenance currently has a stricter input boundary, so simply passing the saved output object back is insufficient.

### F2. P2: Uncertain lifecycle and photo revocation can be discarded silently

Locations: [measurement-lifecycle.tsx:21](../../../apps/web/src/components/measurements/measurement-lifecycle.tsx#L21) and [measurement-photos.tsx:483](../../../apps/web/src/components/measurements/measurement-photos.tsx#L483).

These controllers retain pending and uncertain operation envelopes only in component state. Neither registers leave protection or locks workspace switching. Their detail-page parent does not provide that protection. After a lost archive or photo-revocation response, a link, workspace switch or reload can discard the exact retry bytes without the planned warning. The existing immediate-retry scenario does not exercise those exits.

The lead verified controller, parent and navigation-guard ownership in source. A real lost-response browser/navigation reproduction remains outstanding. The measurement plan's line 183 and M16 at line 480 explicitly cover uncertain intent and exit decisions. Connect these operations to a guard that can preserve each outstanding operation, including multiple photo controls.

### F3. P3: The measurement book lacks its garment filter

Location: [measurement-book.tsx:226](../../../apps/web/src/components/measurements/measurement-book.tsx#L226).

The book offers kind, profile status and label search, but no garment selector and no interaction that sets `garmentId`. The contract and backend already accept that filter. The measurement plan at line 216 explicitly requires garment-ID filtering. Add a bounded garment selector while preserving the other filters and pagination.

## Additional correctness

### C1. P2: Import preview acquires another connection inside its transaction

Locations: [domain-imports.ts:270](../../../packages/application/src/domain-imports.ts#L270) and line 385.

The executor already holds a scoped database connection when preview mutation calls `read()` to reserve the preview budget. That read acquires a second connection from the same pool. Cleanup repeats the nested acquisition before the outer transaction releases its connection.

The lead reproduced this using a valid `createPool({max:1})`: a valid customer preview failed with `temporary` after 3057 ms. The same preview succeeded with the ordinary five-connection pool. With concurrent requests, a larger pool can also have all its connections held by outer transactions while admission waits for extra connections. This is an availability defect, not an authorization escape.

Arrange admission and release without requiring another connection while holding the command transaction. Preserve current authorization, replay behavior and the separately committed admission budget.

### C2. P2: Outcome exports combine different snapshots

Location: [import route.ts:62](../../../apps/web/src/app/api/workspaces/[tenant]/[location]/imports/[[...path]]/route.ts#L62).

The endpoint retains counts and batch state from the first status page, then loads later pages through separate transactions. A decision, cancellation or chunk between those reads can change later rows without updating the exported first-page aggregates.

The lead reproduced the endpoint's exact service-read sequence using a real 30-group preview. Page one reported 30 pending groups. A permitted skip committed for a group on page two before that page was fetched. The assembled export reported 30 pending while its rows contained 29 pending and one skipped. This deterministic interleaving validates the export algorithm; it was not exercised through two simultaneous HTTP clients.

The plan requires disjoint totals and reconciled group states at lines 349 and 358. Export one authorized consistent snapshot, or otherwise prevent inter-page mutations. `domain_import_status` is already `STABLE`; a claimed inconsistency within one SQL call was rejected. The defect crosses separate calls.

## OCR findings

The independent Linux audit found ten additional issues, with no duplicates of S1–S2, F1–F3 or C1–C2. The lead checked every cited source path against the unchanged Mac files. The [original OCR report](phase-2-ocr-artifacts/report.md) and [structured comments](phase-2-ocr-artifacts/comments.json) retain the reviewer's findings. The [verified export archive](phase-2-ocr-artifacts/original-export.tar.gz) preserves the original bytes; readable JSON copies add a terminal newline for repository formatting. The following dispositions add local verification rather than rewriting the original report.

### Medium

| ID | Location | Finding and lead verification |
| --- | --- | --- |
| R01 | [editor-controls.tsx:535](../../../apps/web/src/app/workspaces/[tenant]/[location]/settings/garments/editor-controls.tsx#L535) | Garment bounds say **cm**, but measurement validation uses `displayUnit`. With inch display, the real value engine accepts 150 cm under a maximum labelled 100 cm, and rejects 100 cm under a minimum labelled 50 cm. Build One specifies canonical cm bounds; Build Three specifies display-unit bounds. Resolve that conflict across authoring, storage and intake while preserving saved schema meaning. Changing the label alone does not repair historical interpretation. |
| R02 | [garment-settings.tsx:840](../../../apps/web/src/app/workspaces/[tenant]/[location]/settings/garments/garment-settings.tsx#L840) | Service/add-on exact lookup searches only the first prefix-match page to recover its header. A real 51-service fixture put the exact `Hem` record on page two behind 50 `Hem detail …` siblings. The initial page omitted it, so the UI's ID lookup produces a false conflict. The same lookup runs after a save. This violates complete bounded editor queries in Build One sections 7–8. |
| R03 | [domain-import-panel.tsx:350](../../../apps/web/src/components/imports/domain-import-panel.tsx#L350) | Starting a new dry-run does not invalidate an outstanding resume/status read. Its old response can restore the prior batch over the cleared form because `newPreview()` neither aborts the controller nor advances `readId`. Confirmed by tracing `load()`, reset and control state; no browser interleaving was executed. Build Three's reviewed import workflow and M22 require stale-read safety. |
| R04 | [measurement-comparison.tsx:145](../../../apps/web/src/components/measurements/measurement-comparison.tsx#L145) | Changing the trend anchor during a pending trend invalidates its request ID without resetting `trendBusy`. The old request's `finally` then skips cleanup, leaving Load trend disabled after the new anchor loads. Another field/date/unit change or reload works around it. Confirmed by source tracing, without a browser reproduction. This affects the planned comparison/trend workflow and M15. |
| R05 | [measurement-reuse.tsx:142](../../../apps/web/src/components/measurements/measurement-reuse.tsx#L142) | An explicit **Leave missing** selection becomes an absent choice mapping, which falls back to the source's same-ID option. The lead exercised the real `mappedMeasurementValue` helper with the UI's encoded empty mapping and confirmed the selection is retained. Distinguish explicit omission from unspecified identity mapping under Build Three section 7. |
| R06 | [masters.ts:139](../../../packages/application/src/masters.ts#L139) | Master mutation error conversion discards SQLSTATE `40001`/`40P01` before the shared executor can retry. Injecting each driver error into the real exported mutation produced a temporary `MasterError` with no recoverable SQLSTATE. Executor source confirms it retries only those states. This is an actual-function error probe, not a real PostgreSQL deadlock reproduction. It violates the shared retry contract. |
| R07 | [0042_measurement_intake_reads.sql:21](../../../packages/db/migrations/0042_measurement_intake_reads.sql#L21) | Hidden standard garments remain offered by measurement discovery. After setting Hide standard garments, a real fixture returned zero available garments through master discovery but three selectable garments through measurement discovery. Build One invariant 11 requires visibility settings to affect new-selection queries. Preserve authorized historical reads. Any SQL correction must be a forward migration; do not edit applied `0042`. |

### Low

| ID | Location | Finding and lead verification |
| --- | --- | --- |
| R08 | [customer-profile-panel.tsx:230](../../../apps/web/src/app/workspaces/[tenant]/[location]/customers/[customerId]/customer-profile-panel.tsx#L230) | Selecting Measurements writes `#measurements`, but initialization restores only `#wearers` and `#activity`. Reload/direct-link restoration therefore shows Overview. Source-confirmed; restore the permitted Measurements tab. |
| R09 | [workspace page.tsx:110](../../../apps/web/src/app/workspaces/[tenant]/[location]/page.tsx#L110) | Home still labels measurements “Next build” and says wearer measurements will be available later. This contradicts the implemented feature. Source-confirmed; provide the authorized customer/wearer entry route. |
| R10 | [measurement-photos.tsx:518](../../../apps/web/src/components/measurements/measurement-photos.tsx#L518) | A successful image retry clears the child's failed state but never clears the parent's unavailable state. The image can return while its note and photo-revocation controls remain hidden until reload. Source-confirmed; no browser retry reproduction was run. |

## Verification

- `pnpm validate` exited 0. All 12 database and 252 application tests passed, as did lint, type checks, production build, HTTP/domain checks, transport limits and worker recovery checks.
- Guarded real-database reproduction confirmed F1, C1 and C2. Fixtures were limited to `fitloom_test` with the retained advisory serialization lock. Development data was not reset or seeded.
- Loading the actual request helper confirmed S1's missing default abort signal.
- Source inspection confirmed S2, F2 and F3. F2 still warrants the browser reproduction described above.
- Additional real-database fixtures confirmed R02 and R07. Actual application-function probes confirmed R01, R05 and the SQLSTATE conversion in R06. Other OCR findings were checked through their complete UI state and caller paths, with the browser limits recorded above.
- `git diff --check` passed. All 255 source hashes remained unchanged after these checks.
- The optional full Chrome workflow and matched backup restore were not rerun for this read-only review. Earlier implementation evidence is historical coverage, not a fresh run.

Passing regression tests do not invalidate the reproduced findings. Existing no-op checks cover manual documents; the missing provenance case crosses the editor and SQL no-op logic.

The [verification record](phase-2-complete-review-verification.json) retains the source fingerprint, successful regression counts and observed reproduction results.

## Remote OCR status

Linux has Alibaba `open-code-review-codex` 1.0.0 and native OCR 1.13.4. Windows has the plugin skills but no located OCR executable. The unrelated Mac OpenCode fallback was cancelled after the user clarified the requested plugin.

The sanitized source archive contained all 255 manifest entries and additional source/documentation context. Its SHA-256 is `44dbdbbb00ba5960c4de9bf0f43179667c06ad118d8346697455fd535bf3bbdd`. Remote hashes matched, and the temporary tailnet transfer endpoint closed after its single download.

The provider-backed scan preview selected 344 files and excluded 17. The scan then exited 1 with `resolve LLM endpoint: no valid LLM endpoint configured`. It reviewed zero files. A subsequent delegation-mode attempt also reviewed zero files because both deterministic commands required Git metadata. Neither attempt is a clean review result. No provider credentials or authentication settings were changed.

Sanitized Git metadata was reconstructed and checked locally: its baseline-to-current application/package path set equals the 255-file manifest, with every source hash unchanged. The metadata archive SHA-256 is `387c2351bf953e2d8a77b38bcb47f6da090ab9edf27e92972338cb97cf00f39a`. An initial remote delivery used a stale endpoint and failed. A corrected transfer delivered all 11,851,558 bytes and closed the endpoint afterward.

Remote preflight verified the archive checksum, all 255 unchanged source hashes, the baseline HEAD and current index, and exactly 157 tracked plus 98 untracked application/package paths. Native `ocr delegate preview` and a sample `ocr delegate rule` both exited 0. Workspace preview contains 326 entries: 258 reviewable and 68 excluded. Within the phase 2 manifest, 247 are reviewable and eight have unsupported extensions.

The final audit used the actual Alibaba OCR Codex delegation skill. OCR supplied deterministic file selection and review rules; Codex performed the code review. Seven real rule-resolution batches exited 0. The independent parent reviewer and two subordinate reviewers completed 105, 87 and 63 disjoint manifest files respectively. All 255 in-scope files were reviewed, including manual inspection of eight unsupported files. All 326 preview entries are accounted for: 255 reviewed and 71 explicitly outside the phase 2 manifest. The [per-file checklist](phase-2-ocr-artifacts/per-file-checklist.json), [preview checklist](phase-2-ocr-artifacts/preview-checklist.json) and [coverage summary](phase-2-ocr-artifacts/coverage-summary.json) retain these distinctions.

Generated Drizzle snapshots received complete parsed structural checks and cross-file review, rather than a claim that every generated value was read manually line by line. The remote audit did not execute application code, tests or browser workflows. Full raw rules, diff material and command logs remain with the [completed remote audit](<t3-thread://v2/9d68c40e-f782-4ac2-9d8a-2a4bbe8678bd/mcp:launch:d2048103dabe9bd7fa9a25a9ec56d81361ec5badb279a3042645de42b73ad8c5>). Its final report, comments, coverage and source identity were copied locally through a hash-verified export. All source hashes still match on the Mac.

## Disposition before phase 3

Resolve the P2 defects before extending these workflows into order intake. R01 additionally requires reconciling the conflicting bound-unit contracts; preserve immutable historical content when designing that correction. The P3 items are smaller product/diagnostic gaps. S3 remains an optional refactor. This review does not claim defect-free code or replace the recorded browser/hardware limits.

Standards: two actionable findings plus one advisory, highest P2. Spec: three findings, highest P2. Additional correctness: two findings, highest P2. Independent OCR: seven medium and three low findings; no critical/high finding validated.
