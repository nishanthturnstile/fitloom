# Build Three: baseline and value/schema prerequisites

Status: Started on 2026-11-03. This is the first implementation slice, covering increment 0 investigation and the browser-safe contracts in increment 1. It does not close increment 1 or phase 2.

## Baseline and ownership

Checkout: `ed3304539481f35497b68b4c00706d5b151b1c22`. The supplied Build Three plan, research, review and import-format documents were already uncommitted inputs. The implementation follows that reviewed architecture without a new architecture selection.

The retained journal ends at `0039_customer_photo_stage_expiry`, with 40 migrations. A read-only query of `fitloom_dev` confirmed 40 installed entries, zero customers and zero wearers. No migration, reset or synthetic customer seed was applied to development. Existing PostgreSQL, SeaweedFS, both Mailpit services, web and worker reported healthy. Compose Watch was running. Canonical UI: [Fitloom account](https://nishanths-macbook-pro.tail30fb6a.ts.net:24443/account); the loopback web port remains 24410.

Read path: the web customer adapter resolves current identity through `createCustomerService`; its bounded read wrapper parses a concrete workspace target, enters `withScope`, and invokes the named customer SQL projection. Writes parse the fixed command and invocation, execute through `createCommandExecutor`, and return opaque durable results. SQL claim binding currently names customer/photo commands explicitly. New measurement commands must extend that allowlist before registration. No second executor is needed.

The Build One handoff supplies garment/version/node identities and typed fields. Build Two supplies explicit named wearers, concrete location authority and private CRM photos. Height/weight and CRM image bindings cannot substitute for measurement records. New saves must lock and recheck the active customer and wearer, then pin the schema and check the expected profile revision. Historical reads keep their original ownership.

## Implemented boundary

- `measurement-contracts` exports branded profile/version/schema IDs, strict schema references, the five typed value variants, bounded unique value lists, measured dates, and a strict value-free intake snapshot. It reuses the master field grammar. It rejects management configuration at every snapshot nesting level.
- `measurement-values` preserves original decimal spelling and units. BigInt quantities compare in a common exact basis. Display conversion returns a rounded decimal plus an explicit approximation flag. Validation covers cross-unit bounds, number precision/count policy, required false/zero, text limits, field-owned active choices and unchanged inactive choices from current revision content. Empty saves, unknown fields and duplicate definitions fail. Linked semantic issues are capped at 30.
- `measurement-body-schema` supplies fresh validated copies of the exact five-field `body-core-v1` manifest from the plan. SHA-256 of the schema-normalized compact JSON is `d0e56403a7473f16d5f86c83910017a99329d8b8fe5029f407404a448cf05353`. The fixture detects accidental edits. SQL publication and publication-state locking remain the next storage work.

These exports contain no database, identity or Node runtime imports. They are prerequisites for entry, storage, comparison and interchange. The quantity comparator intentionally knows only units; the future mapping/compare service must prove field semantics and basis compatibility before calling it. The value validator receives current content from a trusted service for revisions only; copies/imports must omit it. Its date helper requires an explicit validated shop-local today. The service/SQL boundary must obtain that date from shop settings and reject missing/invalid timezone configuration.

## Customer entry wireframe

The planned full-page controller reuses the workspace shell, Field/Input/Select primitives, semantic tokens, existing SVG illustrations and NavigationGuard. It does not create an implicit self wearer.

```text
Customer / named wearer / Measurements
[ Body | Garment ]   Profile label      Measured on
Sections     Chest circumference  [       ] [in/cm]
             Body basis · measuring guidance · illustration
             Other typed fields / custom dimensions
Notes        [                                    ]
             Save status                 [Save version]
```

At narrow widths, sections and fields stack in one column and the save row wraps. Storage/permissions precede exposing this entry route.

## Synthetic fixture inventory

`packages/application/test/measurement-contracts.test.mjs` owns the executable pure fixtures. All identities are fixed manifest IDs or generated in memory. No customer rows are created.

| Fixture family | Observed boundary |
| --- | --- |
| Decimal spelling and range | 18 integer/6 fractional digits, exact originals, exponent/fraction/comma/negative-zero rejection |
| Exact quantities | 1 inch = 2.54 cm, recurring cm-to-inch presentation, 101 exact conversion pairs, smallest-scale differences at maximum magnitude |
| Bounds and display | Cross-unit minimum/maximum, half-up display, approximation flag, no mutation of originals |
| Typed presence | Missing versus false/zero, duplicate/unknown values, nonempty save, 80-field maximum |
| Number/text/select | Count fractions, negative unitless values, schema precision, Unicode code points, foreign/retired choices and revision-only carry-forward |
| Publication and intake | Five exact semantic IDs, fixed UUIDs/help/defaults, hash fixture, fresh copies, nested management-key rejection |
| Date and module boundary | Impossible/future dates, explicit shop-local today, no default machine date, transitive browser import audit |

Real SQL validation, lifecycle/concurrency, publication v2, mapping, photos, cards, imports and browser acceptance fixtures retain the owners below. They have not been replaced by pure tests.

## Acceptance ownership

The application domain owns contracts/services, the database owns independent constraints/authority, and the web layer owns transport/controllers. Each row retains the plan's required evidence. Increment numbers identify the implementation gate; partial contract coverage does not count as a passed end-to-end scenario.

| Scenario | Behavior | Increment gate | Current evidence |
| --- | --- | --- | --- |
| M01 | Contact-only, one wearer and family selection | 2–3 | Pending |
| M02 | Body and mixed-basis garment entry | 1–3 | Pending |
| M03 | All five kinds and custom dimensions | 1/3 | Pure contracts covered; DB/UI pending |
| M04 | Exact units and bounds | 1/4 | Pure contracts covered; DB/UI pending |
| M05 | Schema history and drift | 1/3/4 | Pending |
| M06 | Immutable history and no-op | 1 | Pending |
| M07 | Concurrent revisions and archive races | 1 | Pending |
| M08 | Authority and roles | 1/2 | Pending |
| M09 | Price-free staff intake | 2 | Snapshot shape covered; scoped intake pending |
| M10 | Replay and commit uncertainty | 1/3 | Pending |
| M11 | Post-commit projection failure | 3 | Pending |
| M12 | Complete lists/search/history | 2 | Pending |
| M13 | Independent copy | 4 | Pending |
| M14 | Mapping and comparison | 4 | Pending |
| M15 | Charts | 4 | Pending |
| M16 | Dirty and uncertain navigation | 3 | Pending |
| M17 | Private reference files | 5 | Pending |
| M18 | Historical media and revocation | 5 | Pending |
| M19 | Cards and QR output | 6 | Pending |
| M20 | Import parsing and dry-run | 7 | Pending |
| M21 | Import decisions and identity | 7 | Pending |
| M22 | Import retry/concurrency | 7 | Pending |
| M23 | Import totals and cleanup | 7 | Pending |
| M24 | Transport and diagnostics | 2–7 | Pending |
| M25 | Migration and function authority | 1/5–7 | Pending |
| M26 | Later order handoff | 4/8 | Pending |
| M27 | Real UI quality | 3–8 | Pending |
| M28 | Existing behavior remains | 0/8 | Pending |
| M29 | Bulk duplicate preview, DS-01 | 7 | Pending |
| M30 | Customer import seam, DS-02 | 7 | Pending |
| M31 | Imported history identity, DS-03 | 7 | Pending |
| M32 | Static import permissions, DS-04 | 7 | Pending |
| M33 | UUIDv4 import attempts, DS-05 | 1/7 | Pending |
| M34 | Shop-local measured dates, DS-06 | 1/3 | Pure contracts covered; DB/UI pending |
| M35 | Saved card labels, DS-07 | 6 | Pending |
| M36 | Closed interchange grammar, DS-08 | 7 | Pending |
| M37 | Import states, DS-09 | 7 | Pending |
| M38 | Canonical customer groups, DS-10 | 7 | Pending |
| M39 | Body publication/rebase, DS-11 | 1/3/4 | Pure contracts covered; DB/UI pending |
| M40 | Photo reservation integrity, DS-12 | 5 | Pending |
| M41 | Immutable card selection, DS-13 | 6 | Pending |
| M42 | Recovery admission, DS-14 | 7 | Pending |
| M43 | Preset forward upgrade, DS-15 | 1 | Pending |
| M44 | Decimal range, DS-16 | 1 | Pure contracts covered; DB/UI pending |
| M45 | Card admission details | 6 | Pending |
| M46 | Template and file budgets | 7 | Pending |
| M47 | Actual timeout budget | 1/7 | Pending |

## Verification and next gate

Initial `pnpm check` passed before implementation. The focused current-source build, 13 measurement contract tests, lint and all workspace type checks pass. Public package subpath imports also loaded and validated a body measurement successfully. Local file links and all 47 unique acceptance IDs pass verification. `pnpm validate` completed successfully against the pre-change Docker snapshot: 12 database tests, 164 application tests, lint, workspace type checks, production build and HTTP smoke/transport checks. These establish the baseline, not end-to-end measurement acceptance. Worker restart/recovery, private storage, operator MFA, customer directory/save/replay, master authority and 413/408 checks passed. The snapshot had 229 checked files; the final current-source lint checked 233 files including the four new source/test files.

| Command | Result |
| --- | --- |
| `pnpm validate` | Baseline passed: 12 DB / 164 application tests, build, lint/types and HTTP/transport |
| `pnpm --filter @fitloom/application build` | Current source compiled |
| `node --test packages/application/test/measurement-contracts.test.mjs` | 13 passed |
| `pnpm check` | Current source lint and all workspace type checks passed |
| Public package subpath import and validation | Passed without database/identity setup |
| Local documentation links, acceptance IDs, `git diff --check` | Passed |

No new UI route or measurement SQL storage is claimed. No browser measurement journey was run.

Next: finish increment 1 with forward SQL/Drizzle storage, immutable body publication/state, all eight permission grants/dependencies and Owner preset upgrade, named scoped reads/mutations, claim binding and real PostgreSQL create/revise/archive/restore/replay/race fixtures. Only then expose the wearer book and customer entry through increments 2–3. Photos, cards and imports keep their later gates. Operational tailoring validation of illustrations remains required before cutting.
