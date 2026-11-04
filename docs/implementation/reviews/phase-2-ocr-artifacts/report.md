# Fitloom phase 2 — completed OCR delegation code review

Source: `/tmp/fitloom-review-artifacts.OTzlr7/fitloom`. Artifact HEAD `9317c14ee1fbab1c0bc027c7669e3f290c4e9d1e`; original source index `ed3304539481f35497b68b4c00706d5b151b1c22` supplied by preflight. Build 3 untracked overlay included.

**Result:** 10 validated findings: 7 medium, 3 low. No critical/high finding was validated. All 255 manifest files (157 tracked + 98 untracked) reviewed; no in-scope skips or review blockers. Findings are based on static source tracing; no runtime reproduction or new test execution was performed.

## Findings

### 1. Medium — `apps/web/src/app/workspaces/[tenant]/[location]/settings/garments/editor-controls.tsx:535`

Reconcile the displayed bound unit with the measurement validator. This editor always labels length bounds “(cm)” and persists the raw strings, while measurement intake projects them unchanged and measurement-values.ts:135 plus SQL0041:81 interpret them in field.displayUnit. For an inch-display garment field configured with “Maximum(cm)=100”, 80in is accepted as below100in even though it exceeds100cm; “Minimum(cm)=50” rejects40cm as below50in. BuildOne §5 specifies canonicalcm bounds while BuildThree §6 describes display-unit bounds; the implementation must resolve that contract difference and preserve saved schema meaning. Do not change custom-field semantics incidentally, because their editor explicitly uses displayUnit.

### 2. Medium — `apps/web/src/app/workspaces/[tenant]/[location]/settings/garments/garment-settings.tsx:840`

Do not recover an exact service/add-on header from only the first prefix-search page. If 50 records named “Hem ...” precede the record named “Hem” in catalog order, opening “Hem” from a later register page fetches its exact version successfully, but this unpaginated prefix search returns only the first 50 matches (masterPageQuery default), excludes its header and throws a false409. saveItem repeats the same lookup after committing, so a valid save/rename can also be presented as a conflict. Fetch an exact header or follow all required pages instead of assuming the exact name is on page1. Spec: BuildOne §7 bounded complete queries / §8 service and addon editors; NFR-QUERY.

### 3. Medium — `apps/web/src/components/imports/domain-import-panel.tsx:350`

Invalidate a pending status read when starting a new dry-run. Resume import starts load() asynchronously, while locked remains false. If the user clicks New dry-run before that read completes, this reset neither aborts controller nor advances readId. The old response still passes load() line141 and restores the prior batch over the new form, hiding new CSV/namespace input and offering actions for the prior import. Cancel/invalidate the read as part of this reset (and prevent stale loads overwriting a newly completed preview). Spec: Build Three §11 reviewed import workflow and §14 M22; OCR React effect/async race handling.

### 4. Medium — `apps/web/src/components/measurements/measurement-comparison.tsx:145`

Reset trendBusy when invalidating a pending trend for an anchor change. Start “Load trend”, then select a different “Trend anchor version” before the response returns. This effect increments trendRequest, so the old loadTrend finally block skips setTrendBusy(false); loading the new anchor never resets it either. “Load trend” stays disabled after the new anchor loads until the user changes another field/date/unit or reloads. Reset busy alongside invalidation (as the other filter handlers do), or disable anchor changes during a pending request. Spec: phase-2-build-3-measurements.md §7 Comparison and trends / M15; development web standards require usable stale-read recovery.

### 5. Medium — `apps/web/src/components/measurements/measurement-reuse.tsx:142`

Honor an explicit “Leave missing” choice when copying a select field. For a same-schema copy whose source has an active selected option, selecting “Leave missing” stores an empty target in row.choices, but this filter removes it. mappedMeasurementValue then sees no mapping and falls back to the original choice ID (packages/application/src/measurement-reuse.ts:103), so Preview and Apply silently retain the value the user chose to omit. Distinguish an explicit omission from an unspecified identity mapping and omit the value/decision accordingly. Spec: phase-2-build-3-measurements.md §7 Mapping and REQ-MEASURE (reviewed mapping, missing distinct from recorded values).

### 6. Medium — `packages/application/src/masters.ts:139`

Preserve retryable SQLSTATEs until the shared executor handles them. A serialization failure (40001) or deadlock (40P01) raised by a master publication is caught here and translated by masterError into a fresh temporary MasterError without its cause. createCommandExecutor therefore cannot detect the SQLSTATE and never runs its bounded retry for these master mutations, returning 503 on the first transient failure instead. Move the domain mapping after shared retry handling (as the customer commands already do), or retain the original cause. This violates the Build One plan §2 shared-command retry contract and docs/development/application.md command execution rules. Trigger: a transient serialization/deadlock failure inside app.master_garment_publish/master_service_publish or another master mutation.

### 7. Medium — `packages/db/migrations/0042_measurement_intake_reads.sql:21`

Honor hidden standard garments in measurement discovery. After the owner enables Hide standard garments, this query still returns every active standard garment because it does not consult master_catalog_state.hide_standard_garments. MeasurementEntry uses this list to start new profiles and measurement_intake also accepts them, so hidden templates remain offered for new selection. Apply the standard-visibility predicate to fresh discovery/admission while preserving historical reads. Spec: Build One §4 invariant 11 (plan line129); REQ-MASTER.

### 8. Low — `apps/web/src/app/workspaces/[tenant]/[location]/customers/[customerId]/customer-profile-panel.tsx:230`

Restore the Measurements tab from its saved URL hash too. selectSection writes #measurements when the user selects that tab, but this initialization accepts only #wearers and #activity. Selecting Measurements and reloading, or opening a copied #measurements link, therefore shows Overview while leaving the Measurements hash in the address bar. Include the permitted measurements tab in the restoration allowlist. This is inconsistent with the profile-tab routing behavior and Build Three §8 navigation/direct-link workflow.

### 9. Low — `apps/web/src/app/workspaces/[tenant]/[location]/page.tsx:110`

Replace the obsolete Measurements next-build notice. This production Home card says wearer measurements will be available in a later build even though this patch implements the measurement book and links to it through customer profiles. Users arriving at Home are told the shipped feature is unavailable. Link authorized users to the customer/wearer measurement flow and reserve future wording for orders/production. Spec: REQ-MEASURE and Build Three §8 screen/navigation behavior.

### 10. Low — `apps/web/src/components/measurements/measurement-photos.tsx:518`

Restore the parent availability state after a successful image retry. A transient failed image request calls onUnavailable and permanently sets SavedPhoto.unavailable=true. “Retry reference photo” only clears MeasurementPhotoImage.failed; when the retry succeeds, the image returns but its note and “Revoke photo access” controls remain hidden because unavailable is never reset. Add a successful-load callback/reset so recovery restores the authorized actions without a page reload. Spec: phase-2-build-3-measurements.md §9 (readable fallback and privacy revocation) and §8 distinct recoverable unavailable states.

## Coverage and method

| Scope | Total | Reviewed | Skipped | Coverage |
| --- | ---: | ---: | ---: | ---: |
| Phase 2 manifest | 255 | 255 | 0 | 100% |
| All OCR preview entries | 326 | 255 | 71 | 78.22% |
| OCR reviewable entries | 258 | 247 | 11 | 95.74% |
| OCR excluded entries | 68 | 8 manually | 60 | 11.76% |

All 71 skips are explicitly outside `phase2-review-scope.json`. The 8 unsupported manifest files (5 SVG illustrations, 2 CSV templates, DB README) received manual review. `preview-checklist.json` accounts for every preview `(path,status)`; `per-file-checklist.json` accounts for all 255 manifest paths and identifies each reviewer/method. The final disjoint ownership is 105 parent + 87 masters/customer reviewer + 63 measurement reviewer.

Used the installed Alibaba OCR Codex delegation skill, supplied successful preview and real `delegate rule --format json --repo SOURCE` resolution in seven batches of at most 40 paths. All seven commands exited 0; complete stdout/stderr and commands are saved. Rules resolved 266 distinct selected paths (258 reviewable preview paths plus 8 unsupported manifest paths). No OCR LLM endpoint, provider setup, discovery, transfer or provider-backed scan was used.

Tracked files were reviewed using entire plain HEAD diffs; untracked files were read in full. Cross-file checks covered tenant/location/current authority, replay and retries, immutable histories and owner-qualified references, exact quantities/provenance, private photos/cards, reviewed import decisions and grouped commit/recovery/cancellation, and UI state/navigation/accessibility. The parent personally validated every retained finding against source and relevant callers. Spec disagreements are identified explicitly in the bound-unit finding rather than silently selecting one interpretation.

Generated Drizzle snapshots received **manual structural review**, not a claim of line-by-line manual review of every generated value. Review included parsed complete schema structures, chain IDs, table deltas, scoped foreign keys, indexes/checks and relation to migrations/schema declarations. See `snapshot-structural-masters_customers.json` and each corresponding checklist method. Public generated import schemas/templates were reviewed structurally against their documented grammar. No visual/browser rendering was performed.

The measurement reviewer read all three phase 2 plans and the complete import format reference in bounded, untruncated chunks. Review context also included the repository README (no source AGENTS.md found), canonical REQ-CRM/MEASURE/MASTER and relevant architecture/development standards. The supplied review instructions applied throughout. Old review reports, supplied reproduction scripts and candidate findings were not read or executed.

## Integrity and execution limits

All 255 SHA-256 values matched the supplied manifest before review and after all source review. `hashes-before.json`, `hashes-after.json`, and `source-identity.json` retain the records. The scope manifest declares digest `43d9d4d772964b96cfc698f7d6721cf0f1cdbe8bf7d3b77da16bd6cbadc328f7`; the actual JSON file byte digest is separately recorded as `04e59e8ec35a45976d6a324aafd250cbbd9c0cbaa830993f4e005f39540d871a` (these are distinct identity fields, not an assertion that the declared scope digest is its file-byte hash).

Git reads used `GIT_CONFIG_NOSYSTEM=1`, `GIT_CONFIG_GLOBAL=/dev/null`, and `GIT_OPTIONAL_LOCKS=0`. No source edits, Git initialization/cloning/new checkout, commits, installs, database access, supplied-code execution, or tests occurred. The root validation result reported by the user (12 DB / 252 application) was not rerun and does not establish absence of defects. All saved files are new review artifacts outside the source tree.

## Artifact index

- `comments.json`: final deduplicated OCR-shaped comments.
- `per-file-checklist.json`, `preview-checklist.json`, `coverage-summary.json`, `final-partition.json`: coverage and strict ownership.
- `preview.json`, `rules-0.json` through `rules-6.json` and stderr: complete deterministic OCR outputs.
- `command-exit-statuses.json`, original command records and captured diff/full-file material: execution evidence.
- `hashes-before.json`, `hashes-after.json`, `source-identity.json`: source integrity.
- Reviewer notes, supplemental checklists and snapshot structural records: review details.
