# Build Three increment 7: supported customer and measurement imports

Status: Complete locally on 2026-11-03. Aggregate validation, full/focused Chrome acceptance, generated-artifact conformance, schema alignment and development migration pass.

## Boundaries and implementation sketch

The caller selects a format and namespace, uploads a bounded CSV, reviews every logical group, and approves a decision. The service persists a random UUIDv4 commit key and exact request hash for each reviewed revision. Chunk scheduling retrieves those keys. After a lost response, the client calls read-only recovery before scheduling another mutation.

The implementation extends the existing command executor with optional attempt/deadline bounds and keeps its current defaults for other callers. Each concrete customer-import command has `customers.import`; each measurement-import command has `measurements.import`. Stored family, actor and location are checked before claim and again in mutation. A read-only recovery projection checks the exact stored attempt and journal result without acquiring a scheduling lease or consuming fresh-work admission.

Existing customer writes enter through `customer_mutate`, which enforces its eight command kinds and interactive duplicate-review protocol. Imports use a separate private `customer_import_commit_group` under the exact import operation. It shares profile validation, candidate fingerprints, phone locks and apply helpers. It never invokes a nested executor or extends interactive review lifetime. A bulk preview materializes candidate sets for every phone within one import admission.

Existing measurement writes validate the current schema, shop-local date, typed values, immutable content and custom identity lineage. A private complete-history seam creates one profile with up to twenty source versions, ordered by source sequence, and updates its current pointer only within that transaction. Source maps retain the original identity and sequence. No v1 import appends or overwrites an existing profile.

The selected modules are `import-contracts.ts` for closed browser-safe grammar and DTOs, `import-formats.ts` for bounded parsing and exact manifest materialization, and `domain-imports.ts` for authorized orchestration. The web adapter owns identity and bounded transport. Two scoped screens share one import controller. PostgreSQL owns actor-bound batches, logical records, immutable attempts, protected source maps, budgets and leases. The existing worker purges private previews after twenty-four hours without deleting outcomes or mappings.

A row-by-row wrapper around customer create was rejected because it consumes interactive duplicate budgets and cannot atomically map wearer groups. A worker that executes new business groups was also rejected. The request scheduler commits one bounded group per transaction, and the worker only reconciles abandoned reservations and purges expired private content.

## Verification

The baseline was 12 database and 222 application tests plus full Chrome/HTTP acceptance. The import increment adds parser/artifact conformance, storage/authority/concurrency and real timeout coverage. Tests use only guarded test databases and blob storage. The final application suite passes 247 tests. Development data is neither reset nor seeded.

## Interchange and private review

`fitloom-customers-v1` imports one customer and its explicitly named wearers as an atomic group. Contact-only rows never invent a self wearer. Exact repeated rows remain visible as redundant CSV rows. Canonical equality includes the normalized phone country/E.164 value and excludes display punctuation. Candidate fingerprints are checked again under the phone lock. Reuse preserves existing customer fields. An accepted source customer or wearer cannot move to a different owner.

`fitloom-measurements-v1` imports one complete source profile with one to twenty versions. Source sequence determines the current version, independently of dates or row order. Distinct source profile IDs remain distinct even when their labels match. Repeating the same complete set reports already-imported. Changed content, owner, schema binding or version membership requires another supported source identity or a future incremental format.

The pinned `csv-parse` 7.0.3 parser reads RFC 4180 comma CSV with fatal UTF-8 decoding. Headers and typed JSON objects are closed. File errors reject the file; row errors block their complete logical group. Every data row retains its original ordinal. Imported strings render as plain text. Formula prefixes never execute.

The browser-safe contracts generate value, custom-field and manifest JSON Schemas, both CSV templates and the concrete body-core-v1 manifest. `pnpm --filter @fitloom/application generate:imports` regenerates and formats these artifacts. Conformance compares the retained artifacts with runtime output, validates all five value kinds through Ajv and the runtime parser, and checks field-owned choice aliases and custom identity lineage. Garment-specific templates and exact manifests require current measurement-import access and contain no pricing.

Both import screens use the existing workspace shell and navigation guard. Staff review every logical group, select an explicit create/reuse/separate/skip decision or measurement owner, then commit approved groups. Source-owner lookup resolves protected mappings to current customer and wearer names. Current-schema bindings and explicit field/choice/drop decisions support stale source manifests. Batches resume only for their original actor and location. Browser storage and URLs do not contain CSV contents, source identities or measurement values.

A lost preview or review response retains the exact request bytes for retry. Once a command response proves success, a failed projection read retries only that projection. A lost chunk response recovers each persisted attempt key/hash before scheduling more work. Permission loss clears private previews and releases leave protection. Cancellation is irreversible and preserves all committed successes.

## Resource bounds and authority

| Resource | Enforced bound |
| --- | --- |
| CSV file | 1 MiB, 200 data rows, 64 KiB per decoded record |
| Logical group | 20 wearers or versions; measurement group canonical content at most 512 KiB |
| Saved measurement version | Existing 128 KiB complete document limit, including schema |
| Upload transport | 3 MiB bounded JSON profile; existing smaller profiles stay unchanged; five-second body deadline |
| Preview admission | Five fresh previews per actor/location/minute and two concurrent parses; independent of interactive duplicate checks |
| Preview retention | Thirty minutes for fresh work; private content purged after twenty-four hours |
| Chunk admission | Ten fresh chunks per actor/location/minute, one batch lease, at most twenty groups |
| Chunk deadline | Thirty seconds, with a twenty-three-second reserve before starting another group |
| Row execution | One attempt; existing three-second acquisition, two-second lock, ten-second statement and twenty-second transaction limits |
| Review and history pages | Twenty-five logical groups per page; bounded owner/schema continuation |

Five private tables force RLS and have no runtime table grants. SQL functions check stored family, actor and exact workspace before claims or private reads. Customer-import and measurement-import permissions remain separate. Measurement import requires measurement management/read and customer read, without customer management. Private commit helpers cannot be called by runtime roles.

The command executor's optional deadline/retry policy leaves every existing caller's three-attempt default unchanged. Read-only recovery does not claim a command, acquire a scheduling lease or consume fresh-work quota. It checks the exact actor/family/batch/group/key/hash and reads the original journal result. An active original operation lock reports in-progress. Outcome bookkeeping can mark a failed reservation only after proving the original transaction no longer holds that lock. The public HTTP dispatcher never exposes this bookkeeping command.

The worker reconciles abandoned reservations and purges private preview content. It creates no customer or measurement groups. Source maps, opaque journal outcomes and reconciled counts survive purge. General measurement documents record only imported provenance with opaque batch/group IDs; raw source identities remain in protected import storage.

## Acceptance coverage

| Matrix IDs | Retained proof |
| --- | --- |
| M20, M36, M38, M46 | Parser and generated-artifact conformance, exact headers/UTF-8, all five kinds, field-owned choices, formula text, normalized phone/source identity, every file/record/group limit |
| M21, M29, M30 | Full 200-phone preview outside interactive admission, current candidate drift, explicit wearer ownership, no overwrite on reuse, atomic activity/source maps |
| M22, M31, M33 | Complete histories and sequence-defined current, immutable exact source sets, UUIDv4 review attempts, same-batch and same-source concurrency, all-or-nothing rollback |
| M23, M37, M42 | Nine-state reconciliation, partial cancellation, abandoned reservations, active transaction recovery, expired/quota/lease-independent committed recovery, twenty-four-hour purge |
| M24, M32 | Actual protected HTTP routes, isolated format-specific roles, revoked replay/recovery, no-store/origin checks, hidden bookkeeping endpoint, private template/outcome downloads and bounded transport |
| M25, M43 | Clean/upgrade/repeated migration checks, retained hashes, forced RLS, runtime privilege denial, existing owner/preset forward-grant regression and Drizzle alignment |
| M27, M28 | Both import screens at 1440/1024/390/320 pixels, lost-response recovery and revoked drafts, plus retained customer/master/measurement/media/card/auth/worker/operator suites |
| M34, M35, M39–M41, M44 | Retained prerequisite date/publication/value/photo/card suites, imported saved labels/custom lineage and stale garment-schema checks |
| M47 | Real pool exhaustion, held advisory lock, slow statement and composed slow transaction; bounded executor retries and pool recovery |

The first aggregate run passed all feature checks, then its new oversized-body fetch probe raised `EPIPE` while the server rejected the upload early. The corrected probe sends advertised-length headers first and separately streams the actual 3 MiB limit plus one byte without Content-Length. Both paths must observe HTTP 413 with no-store. Slow master and import streams must observe 408. No server request limit or cancellation behavior changed to accommodate the test.

The full retained Chrome regression passes. A later focused run verifies long Tamil notes, expanded history values, explicit accepted source owners, exact lost-preview retry, lost-chunk recovery, cancellation totals and revoked draft removal. The narrow-screen correction wraps long action labels. Captures scroll to the top and wait for paint to avoid the browser's fixed-element full-page screenshot artifact. A final file-selection check covers valid CSV followed by invalid UTF-8 or an oversized file; rejected replacement files clear the previous CSV and stale reads cannot repopulate a reset screen.

## Inspected browser evidence

These eleven captures use synthetic test data. Both review screens pass document-width and button-text clipping assertions at all four widths.

| Width or state | Customer review | Measurement review |
| --- | --- | --- |
| 1440 pixels | [Review](screenshots/imports/customer-import-review-1440.png) | [Expanded history](screenshots/imports/measurement-import-review-1440.png) |
| 1024 pixels | [Review](screenshots/imports/customer-import-review-1024.png) | [Expanded history](screenshots/imports/measurement-import-review-1024.png) |
| 390 pixels | [Long Tamil notes](screenshots/imports/customer-import-review-390.png) | [Expanded history](screenshots/imports/measurement-import-review-390.png) |
| 320 pixels | [Review](screenshots/imports/customer-import-review-320.png) | [Expanded history](screenshots/imports/measurement-import-review-320.png) |
| Completed | [Two customer groups, one named wearer](screenshots/imports/customer-import-complete-1440.png) | [One profile, two versions](screenshots/imports/measurement-import-complete-390.png) |
| Cancelled | [One saved group and one cancelled group](screenshots/imports/customer-import-cancelled-320.png) | Not applicable |

Physical printing/scanning, Safari, screen-reader testing and tailoring validation are outside this increment's observed evidence.

## Executed verification and development migration

| Command or check | Observed result |
| --- | --- |
| `pnpm validate` | Exit 0 on the corrected run. 12 database and 247 application tests, lint across 314 files, workspace types, production build, HTTP, worker, identity, operator and storage regression, plus declared/chunked 413 and slow-stream 408 checks |
| `pnpm check` and `pnpm build` | Exit 0 after the final client file-selection guard |
| `MASTER_UI_CHECKS=1 FITLOOM_UI_ARTIFACTS=fitloom-build3-increment7-final pnpm --filter @fitloom/application test:http` | Exit 0. Full retained customer/master/measurement/photo/card/workspace/authority Chrome regression, both import screens, HTTP and transport |
| `MASTER_UI_CHECKS=1 IMPORT_UI_ONLY=1 FITLOOM_UI_ARTIFACTS=fitloom-build3-increment7-focused-final pnpm --filter @fitloom/application test:http` | Exit 0. Focused import workflow, long Tamil notes, expanded values, cancellation totals, private recovery and all four widths. Retained screenshot source |
| `MASTER_UI_CHECKS=1 IMPORT_UI_ONLY=1 FITLOOM_UI_ARTIFACTS=fitloom-build3-increment7-file-selection-final pnpm --filter @fitloom/application test:http` | Exit 0 after the final client guard. Rejecting invalid UTF-8 or oversized replacement files disables preview of the earlier file; the complete focused workflow, HTTP and transport still pass |
| `pnpm --filter @fitloom/application generate:imports` | Generated and formatted six public artifacts. Conformance compares retained JSON/templates with runtime output |
| `pnpm --filter @fitloom/db db:generate` | No schema changes after the retained 0047 snapshot |
| `pnpm db:migrate` and direct readback | Exit 0. All 48 retained migration hashes/timestamps match; existing data counts are unchanged; five import tables are empty with forced RLS; worker maintenance returns zero |
| Relative documentation links and `git diff --check` | Passed after status edits |

Real timeout checks observed approximately three-second acquisition, two-second lock, ten-second statement and twenty-second transaction limits. The pool remains usable afterward. The import executor uses one attempt and a twenty-three-second start reserve; the existing default still retries serialization failures up to three times.

Development preflight confirms `fitloom_dev`, 47 matching applied migrations, no waiting locks and zero customer, wearer, profile, version, photo reservation/membership and card/selection rows. `pnpm db:migrate` applies only `0047_supported_domain_imports`. Readback confirms all 48 hashes and timestamps match, the eight prior counts stay zero, and batch/record/attempt/source/budget tables are empty. Runtime web/worker and supporting services remain healthy; the development account route returns 200. No development reset or seed was performed. Migration 0047 is now applied and frozen.

## Next scope

Increment 8 closes complete phase 2 acceptance and the final immutable capture/media handoff. Phase 2 remains in progress until that increment passes. Phase 3 owns orders, pricing and manually recorded payments. Deployment remains separate user-owned work.
