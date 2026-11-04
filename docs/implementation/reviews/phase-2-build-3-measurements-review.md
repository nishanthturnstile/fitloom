# Build Three plan review

Status: Independent OpenCode Go DeepSeek V4.1 Flash Max review completed on 2026-11-03. The lead resolved all 17 findings in the plan and recorded their dispositions below. No second independent review of the corrections was run. Application implementation has not started.

## Requested external review

The review was submitted to OpenCode, model `opencode/deepseek-v4.1-flash`, with `variant=max`. The brief included the [complete implementation plan](../plans/phase-2-build-3-measurements.md), [research findings](../research/build-three/technical-findings.md), canonical phase 2 requirements, both completed-build handoffs and relevant source paths.

The first provider attempt returned `Upstream request failed: Insufficient account funds`. That run failed before producing a review artifact.

Attempt: <t3-thread://v2/69ae9107-364e-4f36-8371-7123417cfcf2/thread:delegated-task:command%3Amcp%3Ac647c9f6-714c-4ef9-8d82-6d97b035dcf6%3Adelegate-task%3Af548bf17-a6da-4b25-b14a-c96f12b525ed>

The user then explicitly authorized `opencode-go/deepseek-v4.1-flash` with `variant=max`. That review completed. Its [original findings](phase-2-build-3-measurements-deepseek-findings.md) are preserved unchanged: six High, eight Medium and three Low findings, with a pre-correction verdict of revise before implementation.

Completed review: <t3-thread://v2/69ae9107-364e-4f36-8371-7123417cfcf2/thread:delegated-task:command%3Amcp%3Ac647c9f6-714c-4ef9-8d82-6d97b035dcf6%3Adelegate-task%3Abad79576-2bcd-490d-b235-aad85c641149>

The lead read the actual findings file and checked the cited executor, claim, customer-review/activity, role, field, phone and timeout contracts. Corrections belong to the plan and its [import format reference](../plans/phase-2-build-3-import-formats.md). The original report describes the draft it reviewed; its earlier verdict and findings remain historical evidence, not a second judgment of the revised plan.

## Independent finding dispositions

All 17 findings are accepted as contract gaps and addressed in the planning documents. The acceptance checks below are required future implementation evidence, not tests already run.

| Finding | Severity | Disposition and correction | Acceptance owner |
| --- | --- | --- | --- |
| DS-01 | High | Accepted. Section 11 defines one bulk preview matcher using canonical candidates/fingerprints, the separate 5/minute/two-concurrent preview budget and a 30-minute import-decision lifetime. Interactive 30-check/two-lease/10-minute rules remain unchanged. | M29, increment 7 |
| DS-02 | High | Accepted. Section 11 specifies the restricted customer_import_commit_group seam, the exact allowed active import operation, private shared validation/apply helpers, unchanged interactive review table, and forward activity-kind/contract changes for customer.import/wearer.import. One import transaction owns business rows, activity, source maps and aggregate audit. | M30, increment 7 |
| DS-03 | High | Accepted. Add source_profile_id and source_version_sequence, separate profile/version source maps, one atomic complete-history group and explicit ordering/current-version rules. V1 creates a bounded new profile with complete reviewed history; changed/appended sets conflict rather than silently merging or editing an existing profile. | M31, increment 7 |
| DS-04 | High | Accepted. Section 3 now has separate customer-import and measurement-import command objects with static format-specific permissions before authorize/claim. Read/status/recovery paths also verify stored format. No executor access-resolver change is needed. | M32, increment 7 |
| DS-05 | High | Accepted. Generate and persist a random UUIDv4 for each logical-record/review attempt before scheduling. Retrieve it for exact retry; no deterministic derived key or UUIDv5. Other commands also retain random UUIDv4 envelopes. Extend actor/location claim binding without loosening key validation. | M33, increment 7 |
| DS-06 | High | Accepted. Section 6 derives measured-on today from app.shop_settings.timezone, matching the existing birthday policy. Missing/invalid timezone fails explicitly. | M34, increments 1/3 |
| DS-07 | Medium | Accepted. Card projection includes immutable saved field/custom/choice labels, basis and units from the exact version snapshot; wearer label is fixed at issuance. Human print output never substitutes raw IDs or current master labels. | M35, increment 6 |
| DS-08 | Medium | Accepted. The import format reference defines every column, the closed five-kind JSON grammar, custom definitions, manifest-scoped field/choice aliases and examples. Increment 7 must derive downloadable JSON Schemas from its authoritative Zod contracts and validate templates/fixtures. No executable importer/schema generation is claimed now. | M36/M46, increment 7 |
| DS-09 | Medium | Accepted. Section 11 defines all nine group states and the count partition. Failed/needs-review block complete; cancellation serializes with bounded work, preserves success and terminates remaining groups as cancelled. Retry/skip is explicit. | M37, increment 7 |
| DS-10 | Medium | Accepted. Canonical grouping defines the exact normalized customer/wearer columns, phone ISO alpha-2/E.164 rules, contact-only plus wearer behavior, redundant duplicates, conflicts and canonical hash inputs. Cosmetic phone/decimal re-export does not create changed data. | M38, increment 7 |
| DS-11 | Medium | Accepted. Section 4 supplies fixed body field UUIDs, section, help, unit, precision, bounds and illustration metadata, plus current-bundle state and the same stale/reviewed-rebase policy as garments. | M39, increments 1/3/4 |
| DS-12 | Medium | Accepted. Choose a separate photo reservation table with real parent FKs, planned opaque content IDs without premature FKs, file-to-reservation FK and a validated one-time consumed-version FK after content creation. Ownership is immutable; rollback and expiry are explicit. | M40, increment 5 |
| DS-13 | Medium | Accepted. Selection rows reject privileged UPDATE/DELETE; card issuance metadata is immutable. Header mutation is limited to irreversible versioned revoke. Selection/expiry changes require reissue. | M41, increment 6 |
| DS-14 | Medium | Accepted. Add authorized read-only POST recover for the exact actor/scope/family/key/hash. It looks up opaque results without claiming work or acquiring the scheduling lease, outside fresh-work limiters. Unknown/in-progress is distinct from authoritative rollback. | M42, increment 7 |
| DS-15 | Low | Accepted. Section 5 explicitly backfills existing Owner presets and updates future provisioning with all eight new grants/dependencies. Manager/Staff/custom grants remain unchanged. | M43, increment 1 |
| DS-16 | Low | Accepted. Measurement input range aligns with master bounds at 18 integer and 6 fractional digits, with exact conversion intermediates and field-specific rejection beyond the range. | M44, increment 1 |
| DS-17 | Low | Accepted. Plan status, this record, docs index and current status now distinguish completed original review, lead corrections and lack of a second external pass. | Final document verification |

## Additional lead corrections and reviewer preferences

- The baseline in packages/db/src/index.ts has 10-second statement and 20-second transaction timeouts, plus 2-second lock and 3-second connection-acquisition bounds. Section 11 corrects the earlier transaction claim and defines import scheduling/attempt-deadline behavior; M47 covers it.
- Charts use the architecture's selected Recharts library. This removes the plan's competing simple-SVG dependency choice.
- Independent profile copies never carry photo references. Both reuse and photo sections say the same thing.
- Card management explains issuer-role dependency and provides revoke/reissue under a new authorized issuer. Application logs use a redacted route template; external proxy log handling remains deployment work.
- The body manifest uses the existing generic dimension illustration. The plan explicitly retains operational tailor validation before real cutting; no new artwork or usability evidence is claimed.
- Owner is the only preset automatically receiving new business grants. The narrow Manager and Staff presets retain their current purpose.
- M45 adds allowlisted card sign-in return, limiter and reader-without-card-manage cases. M46 adds template/manifests and file/row/group budget cases.

## Lead audit corrections

These are the lead's own findings, not DeepSeek findings.

| ID | Issue and evidence | Correction in the plan |
| --- | --- | --- |
| L01 | The current SQL `app.claim_operation` actor/location checks apply only to an explicit customer/photo command list in migration `0037`. Generic executor reuse would leave new command families without that binding. | Section 2 explicitly extends the protocol to measurement, card, photo, and import commands. M08/M10 test cross-actor/location replay for the new families. |
| L02 | A full garment DTO exposes configuration beyond measurement needs. An asserted source ID also does not prove valid provenance. | Section 4 allowlists the price-free intake/snapshot projection and requires server verification of source owner, version and mapping compatibility. |
| L03 | Calling the custom-identity registry wholly immutable conflicts with marking a removed identity retired. | Section 4 makes signatures/introduction immutable and allows one restricted retirement transition, with no reactivation. Saved version content remains append-only. |
| L04 | A batch row lock acquired before parent locks could invert the declared order. Card creation/archive could likewise race without coordinated profile locks. | Section 5 fixes batch/source advisory ordering, late outcome-row locking, sorted selected-profile locks and explicit customer/wearer lifecycle integration. |
| L05 | Grouped customer/wearer imports could use nested executor transactions, commit partial groups, or impersonate the existing customer command kind. | Section 11 defines one import command, a private transaction-local customer seam, aggregate audit and atomic source/outcome writes. It retains the canonical phone-before-parent lock order. |
| L06 | A cap of 20 import records alone does not bound request duration or wearer fan-out. | Section 11 caps a customer group at 20 wearers and stops scheduling before the request deadline, leaving unprocessed rows pending. |
| L07 | Source identifiers may contain personal data. Purging preview rows could also delete terminal reconciliation or source mappings. | Section 11 clears only private preview payload/candidate columns, retains protected mappings/outcomes, bounds source text, and keeps raw source text out of operation keys and results. |
| L08 | Lifecycle no-op behavior was less precise than expected-version save behavior. Reserved create IDs could collide with another operation. | Section 5 requires each command's expected header revision and rejects foreign operation ownership of reserved IDs. |

## Verification and limits

The original draft had 28 acceptance scenarios and 76 checked local links. The revised plan keeps increments 0–8 and expands the matrix to 47 scenarios, including DS-01 through DS-16 and additional card/template/timeout cases. Final verification passed all 93 local links/anchors, both JSON examples, balanced code fences, whitespace, 47 unique scenario IDs, 17 unique finding dispositions and all six fixed manifest UUIDs. `git diff --check` passes. Working-tree inspection confirms documentation-only changes, including the new files. The check does not claim that JSON examples were exercised through an implemented importer.

The preserved original findings file has SHA-256 `7ebdd7f0fb12a15f02ee9ecd2351834adef3ba0ea9f87ad3774cf29c5c2e7929`. Its content was not edited when resolving the findings.

No Build Three code, migrations, dependencies or development records were changed. No application/database/browser acceptance suite was rerun for this documentation task. The lead considers the revised contracts ready to begin increment 0 and the ordered implementation gates. This is a planning-readiness judgment. The independent reviewer did not rerun after the corrections, and runtime acceptance remains entirely future work.
