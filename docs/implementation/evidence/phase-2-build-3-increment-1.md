# Build Three increment 1: measurement storage and authority

Status: Complete locally on 2026-11-03. Focused PostgreSQL checks, full aggregate validation and development forward migration pass. The wearer book and entry UI remain increment 2–3 work.

## Implemented behavior

`createMeasurementService` now provides `bodySchema`, `intakeSchema`, `book`, `detail`, `history` and the four fixed commands `measurement.create`, `measurement.revise`, `measurement.archive` and `measurement.restore`. It uses the retained command executor, current identity resolver, concrete tenant/location scope, bounded reads, strict browser-safe contracts and validated database results. Errors expose bounded field issues and correlation IDs. The service does not require master, rate, generic-file or customer-edit permissions for measurement entry.

The caller supplies an explicit customer and named wearer, reserved profile/version IDs, current schema reference, label, measured date, complete typed values/custom definitions and optional notes/source attribution. Recording principal and timestamp come from the server. This increment accepts manual provenance only. Copy/mapped origins and CSV provenance remain owned by increments 4 and 7; unsupported origins fail validation rather than trusting asserted source IDs. Media membership remains increment 5.

A save claims the operation, locks customer then wearer, locks the garment header or body publication state, and locks the profile. It checks active parents, schema currency and profile revision before writing. Header revision advances for content and lifecycle changes. Content sequence advances only for new immutable versions. An unchanged save returns the current exact version with `changed=false`; a stale expected revision still fails. Profile ownership and schema family cannot change.

Exact reads retain the saved schema, original decimals/units, custom definitions, labels, notes, source attribution, author and dates. Parent/profile archive does not remove historical access. `effectiveActive` describes parent/profile lifecycle; new-save schema eligibility is checked separately by the SQL mutation. Phase 3 capture eligibility remains an increment 8 responsibility. History uses sequence continuation, and the book uses bounded filtering/counts/offsets. These reads are service prerequisites; no measurement HTTP route or web page is exposed yet.

## Storage and migrations

Forward migrations `0040_measurement_storage` and `0041_measurement_authority` append to the 40 retained migrations. Existing SQL files remain unchanged. The new Drizzle snapshot describes five tables:

- `measurement_body_schemas` stores immutable bundle definitions and canonical hashes. Its v1 manifest matches the existing browser fixture exactly.
- `measurement_body_schema_state` selects the current bundle and publication revision. Fresh saves hold its share lock; publishing a new bundle cannot race a successful save against an obsolete schema.
- `measurement_profiles` owns the permanent tenant/location/customer/wearer/schema family and current pointer. The owner-qualified current-version FK is deferred during bootstrap, and a deferred trigger rejects a committed header without content.
- `measurement_versions` stores exact body/garment references, sequence, measured/recorded dates, author, operation/prior-version references and the bounded content document. Privileged UPDATE/DELETE attempts fail.
- `measurement_custom_identities` retains per-profile field/choice meanings and introduction/retirement sequences. A restricted save can retire an identity once. Reusing a retired ID, changing its meaning or reactivating it fails; previous version definitions remain intact.

All five tables have enabled and forced RLS, migration-owner policies and no runtime table grants. Composite parent/version FKs and indexed owner/history/garment/actor/operation paths retain scope. SQL owns operation references, deferred current-pointer behavior, immutable triggers and privileged function grants, following the existing master convention. Drizzle generation reports no further schema changes.

The SQL boundary independently checks the closed value grammar, all five field kinds, required presence, custom definitions, 18+6 decimal range, exact cross-unit bounds, count/precision rules, field-owned choices, revision-only inactive-choice carry-forward and JSONB document size. It builds the schema snapshot from immutable body/garment storage, never from client schema JSON or a management projection. It obtains today from the shop timezone, rejects future/impossible dates and reports missing timezone configuration explicitly.

## Permissions and replay

The permission catalog now contains 26 entries, including all eight planned measurement/import permissions. Browser dependencies, labels, automatic dependency selection and role-count validation use that catalog. SQL has an equal catalog and enforces dependency completeness and delegation bounds. New and upgraded Owner presets receive the new permissions and dependencies. Manager, Staff and custom grants remain unchanged. Later photo/card/import protocols have grants reserved now, but no endpoints are fabricated for them.

The existing claim protocol retains its UUIDv4 requirement and lock namespace. Its actor/location binding now includes measurement, measurement-photo/card and both fixed import command families. Tests exercise each of the four implemented commands under changed actor/location and verify changed-envelope denial. Future family mutation protocols retain their own later acceptance gates.

Authorization runs before replay, without reapplying mutable parent/schema preconditions. A committed create result therefore remains recoverable after a later parent/profile archive, while revoked measurement authority denies replay. Durable results contain only the fixed kind, correlation ID, opaque profile/version IDs, header revision, content sequence and changed flag. General audit records safe changed-field names. Values, notes and schema documents never enter those results or audit.

## Observed verification

The guarded fixture uses only `fitloom_test` and synthetic identities. It takes the retained fixture advisory lock and runs sequential database scenarios. It does not seed or reset development data.

| Check | Evidence |
| --- | --- |
| Clean installation, older foundation and exact `0039` forward upgrade, repeated migration invocation | 12 database tests passed; old Owner upgrade and unchanged Manager/Staff/custom grants verified |
| Body publication | Exact definition/hash match; immutable publication rejects updates; v2 fixture leaves v1 content unchanged, rejects stale create/revise and accepts an explicitly repinned draft |
| Two versions and lifecycle | Original values/schema/author/recorded time retained; content sequence stays separate from archive/restore revisions; unchanged save emits no version |
| Current authority | Foreign tenant/location/owner denial, measuring-only reads, revoked-manage replay denial, all four core commands reject changed actor/location |
| SQL boundaries | Raw SQL rejects empty/unknown/over-range/ill-typed values, invalid dates, invented actor/schema keys and field-owned choice spoofing |
| Garment behavior | Price-free fields with no base rate, all five kinds, exact other-unit bounds, inactive-choice revision exception, stale schema and retired garment denial with historical reads retained |
| Custom identities | Changed basis/meaning, removed-ID reuse and privileged reactivation fail; old custom definitions remain readable |
| Races and rollback | Competing expected-revision saves yield one success; wearer lock contention rejects a save; parent archive blocks fresh saves; unfinished operation rolls back profile/version writes |
| Storage authority | Runtime table reads/writes and internal helpers denied, privileged version UPDATE/DELETE denial, cross-profile current-pointer denial, immutable owner denial and deferred blank-header rejection |
| Scoped reads | Book count/next-page and exact history continuation, recursively absent rates/services/construction data; more-than-50-row and browser journeys remain increment 2 acceptance |
| Shop-local dates | Today/tomorrow checked in Asia/Kolkata and America/Los_Angeles; missing shop settings fail without a machine-date fallback; archived-wearer fresh save denied but committed replay succeeds |
| Contracts and imports | 13 pure contract tests plus 15 storage tests passed, including the parent storage test; browser exports remain free of server/database imports |
| Drizzle alignment | Declared columns/nullability and forced-RLS catalogs checked; `db:generate` reports no changes |

The focused command including existing CRM contracts reports 36 passing tests. The measurement-only command reports 28, comprising 13 pure contracts and 15 storage tests including the parent. The initial aggregate run caught the retained CRM test's hardcoded 18-permission count; its expectation now matches the expanded 26-permission catalog, and the focused CRM/measurement run passes.

| Acceptance IDs | Increment 1 evidence and remaining owner |
| --- | --- |
| M02/M03 | Body/garment and all five kinds/custom identities round-trip through the service and SQL; entry UI remains 2–3 |
| M04/M44 | Pure and SQL exact units/range/bounds pass; comparison presentation remains 4 |
| M05/M39 | Retained v1 snapshots, stale garment/body save rejection and current-bundle repinning pass; reviewed UI rebase/mapping remains 3–4 |
| M06 | Immutable versions, pointer ownership and no-op sequence stability pass |
| M07 | Real competing edits, parent/wearer archive rejection and lock contention pass |
| M08/M43 | Current scope/grants/dependencies and old/new preset upgrade pass; capabilities/navigation remain 2 |
| M09 | Price-free intake/detail service grammar and SQL projection pass; isolated-role HTTP/RSC/browser proof remains 2 |
| M10/M33 | All four implemented commands enforce actor/location/key/hash replay, changed intent and rollback; uncertain-response controller remains 3 and future-family protocols remain 5–7 |
| M12 | Service book/history continuation passes; >50-row and full HTTP/browser traversal remain 2 |
| M25 | Clean/upgrade/repeat migrations, forced RLS, immutable triggers, named grants and Drizzle alignment pass; later tables retain 5–7 gates |
| M28 | Full existing regression is the aggregate command below; Chrome remains an explicit later UI acceptance run |
| M34 | Shop-local today/tomorrow and missing-setting behavior pass; editor defaults/field focus remain 3 |

Development forward migration completed with `pnpm db:migrate`. A direct read of `fitloom_dev` confirmed the journal advanced from 40 to 42 entries, `body-core-v1` is current at publication revision 1, and customers/wearers remain 0/0. New measurement profiles/versions remain 0/0. The preflight reported zero pending lock waits. No development reset or synthetic customer/measurement seed occurred.

| Final command | Observed result |
| --- | --- |
| `pnpm validate` | Passed: 12 database / 192 application tests, lint, all workspace type checks, production build and existing HTTP/worker/operator/private-storage/413/408 regressions |
| `pnpm --filter @fitloom/application exec node --env-file=../db/.env --test test/customer-contracts.test.mjs test/measurement-contracts.test.mjs test/measurement-storage.test.mjs` | 36 passed, including all new storage scenarios and existing CRM contracts |
| `pnpm check` | Passed on final source, 236 linted files and all workspace type checks |
| `pnpm --filter @fitloom/db db:generate` | No schema changes after the new snapshot |
| `pnpm db:migrate` | Development journal advanced 40 → 42; body publication and empty measurement tables read back directly |
| Local documentation links and `git diff --check` | Passed |

No measurement browser journey was run because its routes/controller are the next increment. Optional Chrome UI regression, Safari, physical devices and assistive-technology acceptance are not claimed by the HTTP/service evidence.

## Next implementation gate

Increment 2 exposes the scoped HTTP contracts and wearer book, integrates measurement capabilities with the customer profile, and preserves route classification/breadcrumbs/search/return/switch behavior. Increment 3 owns the full entry/revision controller, linked errors, dirty navigation, conflict/schema-rebase drafts and uncertain retries. The backend supports these flows now; browser acceptance has not been claimed. Private references, cards, imports, comparisons and exact order capture keep increments 4–8 and their acceptance owners in the plan. The existing generic illustrations still require operational tailor validation before cutting.
