# Build Three increment 4: reuse, comparisons and lifecycle

Status: Complete locally on 2026-11-03. Aggregate validation, full and final focused Chrome acceptance, schema alignment and development migration pass.

## Reuse and provenance

Copy starts from an exact version under the selected wearer. The server loads the source and an active current target schema. A retired source garment can fall back to target selection with the body bundle. Authorization, configuration and temporary failures remain failures. Source values never enter URLs or browser storage.

`MeasurementReuse` builds a reviewed draft inside the existing full-page entry controller. It proposes exact standard IDs within a schema lineage and unique compatible semantics. It never matches labels. Custom fields and their choices get fresh IDs in an independent copy. Nonsemantic fields require explicit decisions. Source-only and target-only fields stay visible as source-only or missing. Incompatible kinds, known semantic meanings, number units and length bases cannot use identity mapping.

A body-to-garment basis change requires an explicit additive ease rule. The user supplies the amount and units. The shared engine uses integer arithmetic, rejects negative results and requires explicit acceptance when six-decimal storage needs rounding. Identity mappings retain original decimal/unit spelling. The preview is unsaved; only the ordinary complete-version command creates a profile. The existing controller alone owns leave protection, including edits to mapping rules.

`measurement.create` accepts closed copy/mapped origin inputs with an exact source profile/version and bounded field/choice decisions. SQL verifies the full tenant/location/customer/wearer source tuple, field ownership, compatible meanings, choice mappings, ease and rounding. Copies cannot reuse source custom identities. SQL derives `manualFieldIds` and changed metadata separately from the verified source decisions. Runtime callers cannot assert those derived claims. Recording principal/time remain server-owned. Copy replay retains the original opaque result; a later source mutation cannot change the independent document.

Forward migration `0044_measurement_reuse_analysis` adds restricted provenance validation and scoped compare/trend/capture functions. Existing applied development migrations remain unchanged. The declaration/snapshot baseline has no table or column change.

## Comparison, trend and capture contracts

Comparison accepts two to four exact selections of one wearer. The SQL read checks each exact owner tuple before the pure comparison engine runs. Results distinguish same, changed, missing-in-source, missing-in-target and incompatible. Standard identities match only in a lineage; custom identities match only in their profile or through an exact verified mapping. Different select-choice ownership requires that explicit mapping. False and zero stay values. Numeric differences are exact integer ratios. The table presents signed decimal differences and marks rounded presentation as approximate. Expandable details retain the exact fraction.

Trend reads one numeric field of a profile, anchored to an exact version. Each request has an inclusive date window of at most 3660 days and a page of at most 50 records. The new decade bound keeps the planned bounded date window explicit. Keyset continuation uses measured date, recording time and version ID. The SQL projection includes only candidate fields/values and provenance flags, not notes, rates, services or construction configuration. Missing and incompatible points retain gaps.

Recharts 3.10.1 and react-is 19.3.1 are pinned. The installed Recharts peer range includes React 19. The chart uses its accessibility layer, disabled animation and `connectNulls=false`; a complete table accompanies every page. Plot coordinates use JavaScript numbers for presentation. Equality, deltas, mapping and saved values use exact arithmetic. The [Recharts accessibility reference](https://github.com/recharts/recharts/blob/v3.10.1/storybook/stories/API/Accessibility.mdx) documents the chart's keyboard support. Actual local keyboard and rendering results are recorded below.

The early exact `capture` contract separates immutable owner/version/schema/value/date/principal/provenance data from effective-active, current-version, schema-active and current-schema eligibility. Staff display names are excluded from immutable data because their labels can change. Phase 3 can later apply its selection policy without changing stored content. Capture has no prices or order number. Measurement-photo membership remains increment 5 work.

All new reads use the retained identity/scope transaction, narrow web-only grants, empty privileged search paths, strict browser-safe output schemas, same-origin private POST reads and existing deadlines. The new routes remain under the measurement owner namespace. Direct comparison navigation opens selection; exact selections stay in memory.

## Lifecycle and navigation

Read detail exposes archive/restore only with measurement archive authority and active parents. It uses the existing commands, expected header revision and exact-envelope recovery. Header revision advances separately from content sequence. Historical documents remain readable. Comparison and copy routes keep Customers selected and use structural breadcrumbs. Workspace switching drops source owner IDs through the retained customer destination contract.

## Verification

The focused domain checks pass 10 pure reuse/comparison tests and 18 PostgreSQL measurement tests including their parent suite. Aggregate validation passes 12 database and 209 application tests with no failures or skipped tests. The guarded fixtures use only synthetic test data in `fitloom_test`.

| Acceptance | Observed evidence |
| --- | --- |
| M13 | Chrome opens an exact historical source, reviews an unsaved copy, commits once after a dropped response and confirms that a later source edit leaves the independent copy unchanged |
| M14 | Chrome requires explicit body-to-garment ease, retains canceled mapping input, previews 39.25 in plus 2 in as 41.25 in without saving, then records a manual change to 42.25 in separately from the source decision |
| M04/M14 | Pure tests prove equivalent mixed units, the smallest supported differences, maximum magnitude, false, zero and missing values. PostgreSQL and HTTP reject foreign owner selections and forged derived provenance |
| M15 | Chrome compares two and four exact versions, reaches 50 plus 2 trend records through deterministic continuation, focuses the chart and sends ArrowRight. The rendered SVG contains separate line segments across a missing point. PostgreSQL keeps a historical basis change incompatible |
| Lifecycle | Chrome drops a committed archive response, retries the identical envelope and restores the profile. Header revision reaches 3 while content sequence remains 1 |
| M26 early contract | PostgreSQL compares immutable capture bytes before and after source revision, archive and master retirement. Only eligibility changes. Capture excludes prices and mutable staff display labels |
| Current authority | HTTP exercises measuring-only and read-only access, rejects entry without management and denies all new reads after read revocation. Chrome removes private comparison content after an actual revoked read |
| M25 | Database checks prove empty privileged search paths, web-only new read functions, no worker or PUBLIC execution, and no runtime execution of provenance helpers |
| M27 | Chrome checks document overflow at 1440, 1024, 390 and 320 pixels for mapping and chart pages. Complete tables accompany the chart |

The full Chrome run exposed a focus race in the existing revision controller. Server validation could request focus before React unlocked the disabled controls. Focus now runs after the committed state enables the form.

Development migration `pnpm db:migrate` completes. Direct readback confirms `fitloom_dev`, all 45 retained migration hashes and timestamps, and the three new read functions. Customers, wearers, measurement profiles and versions remain 0/0/0/0. Development data has not been seeded or reset.

The inspected captures contain only synthetic records. Desktop and tablet captures show the mapping preview or chart and its table. Narrow captures show usable controls and the horizontal table container. The gap capture shows separate line segments.

- [Mapping at 1440px](screenshots/measurements-reuse/measurement-mapping-1440.png)
- [Mapping at 1024px](screenshots/measurements-reuse/measurement-mapping-1024.png)
- [Mapping at 390px](screenshots/measurements-reuse/measurement-mapping-390.png)
- [Mapping at 320px](screenshots/measurements-reuse/measurement-mapping-320.png)
- [Trend at 1440px](screenshots/measurements-reuse/measurement-trend-1440.png)
- [Trend at 1024px](screenshots/measurements-reuse/measurement-trend-1024.png)
- [Trend at 390px](screenshots/measurements-reuse/measurement-trend-390.png)
- [Trend at 320px](screenshots/measurements-reuse/measurement-trend-320.png)
- [Actual missing-value gap at 320px](screenshots/measurements-reuse/measurement-trend-gap-320.png)

Captures establish their viewport and scroll position. The complete browser assertions establish pagination and gap behavior.

| Final command or check | Observed result |
| --- | --- |
| `pnpm validate` | Exit 0. 12 database and 209 application tests, lint across 267 files, all workspace type checks, production build, customer/master/measurement HTTP checks, auth/operator/private-storage/worker regressions and 413/408 transport checks |
| `MASTER_UI_CHECKS=1 FITLOOM_UI_ARTIFACTS=fitloom-build3-increment4-final pnpm --filter @fitloom/application test:http` | Exit 0. Complete retained Chrome regression including creation, revision, rebase, copy, mapping, lifecycle, comparison, charts and current authority, followed by HTTP/worker and transport checks |
| `MASTER_UI_CHECKS=1 MEASUREMENT_UI_ONLY=1 FITLOOM_UI_ARTIFACTS=fitloom-build3-increment4-focused-final pnpm --filter @fitloom/application test:http` | Exit 0 on the final source. Measurement entry, revision, rebase, reuse, mapping, lifecycle, comparison, chart and current-authority journeys pass, followed by HTTP/worker and transport checks |
| `pnpm --filter @fitloom/db db:generate` | No schema changes |
| `pnpm db:migrate` and direct readback | Exit 0. All 45 retained migration hashes and timestamps match. Development customer and measurement data remains empty |
| Relative documentation file links and `git diff --check` | Passed after final status edits |

The full Chrome run includes the focus fix. A subsequent small change makes read denial terminal for the open comparison page, so an unrelated transient failure cannot restore its private content. The final focused Chrome command passes on that change, including actual read revocation and removal of private content.

## Next scope

Measurement-owned private photos remain increment 5. Cards, imports and complete phase 2 acceptance remain increments 6–8. Capture/media and later order selection policies keep their later acceptance gates. Safari, physical-device and assistive-technology coverage are not claimed. Illustrations still need operational tailor validation before real cutting.
