# Phase 2, Build Three: the complete measurement book

Status: Complete locally on 2026-11-03. [Final phase 2 acceptance](../evidence/phase-2-build-3-increment-8.md) covers all 47 scenarios, exact capture/media handoff and full regression. All 49 development migrations match retained SQL; phase 3 is next. Plan researched and revised on 2026-11-03 against `390690c`. OpenCode Go DeepSeek V4.1 Flash at Max completed the independent review. All 17 findings have lead dispositions and document corrections in the [review record](../reviews/phase-2-build-3-measurements-review.md). The [original findings](../reviews/phase-2-build-3-measurements-deepseek-findings.md) remain unchanged. The revised plan has not received a second independent review. Implementation started on 2026-11-03 with the baseline and browser-safe value/schema prerequisites. See the [first implementation record](../evidence/phase-2-build-3-increment-0.md). Increment 1 storage, permissions and service commands are complete locally: 12 database/192 application tests, build, lint/types and HTTP regression pass. See the [increment 1 record](../evidence/phase-2-build-3-increment-1.md) for backend verification. Increment 2 is complete locally: the wearer book, strict HTTP reads and initial creation UI pass 12 database/193 application tests, lint/types, production build, HTTP and Chrome regression. The [increment 2 record](../evidence/phase-2-build-3-increment-2.md) retains its delivery evidence; increment 3 completion is recorded below.

This build completes the [phase 2 roadmap](../../product/roadmap.md#phase-2-build-the-customer-and-measurement-book). Staff can select a wearer, record body or garment measurements, save immutable versions, reuse and compare them, attach private references, archive profiles, issue revocable QR cards, and import supported customer and measurement records with reconciliation.

Use the [research findings](../research/build-three/technical-findings.md) for source traces, alternatives, references, and research limits. The [research plan](../research/build-three/research-plan.md) records the investigation method. Canonical [REQ-MEASURE](../../product/requirements.md#req-measure-versioned-body-and-garment-measurements), REQ-CRM, REQ-MASTER, and the REQ-ONBOARD import contract govern conflicts. Vendor behavior is evidence of a need, not an implementation specification.

Increment 3 is complete locally. The [typed entry and revision record](../evidence/phase-2-build-3-increment-3.md) records 12 database/196 application tests, lint/types, build, HTTP and full/focused Chrome acceptance for typed revision, reviewed rebase, custom definitions and recovery. Increment 4 is complete locally. The [reuse and comparison record](../evidence/phase-2-build-3-increment-4.md) records independent copy, reviewed mapping/ease, comparison/chart, lifecycle and early capture acceptance. Validation passes 12 database/209 application tests, lint/types, build, HTTP and full/focused Chrome regression. All 45 retained development migrations match. Increment 5 is complete locally. The [private measurement photo record](../evidence/phase-2-build-3-increment-5.md) records reserved uploads, atomic immutable membership, purpose-specific authority, historical retention and archived privacy revocation. Validation passes 12 database/215 application tests, lint/types, build, HTTP and full/focused Chrome acceptance. All 46 development migrations match retained SQL. Increment 6 is complete locally. The [staff QR card record](../evidence/phase-2-build-3-increment-6.md) records fixed projections, current issuer/reader authority, expiry, irreversible lifecycle revocation, local PNG, allowlisted sign-in return and print acceptance. Validation passes 12 database/222 application tests, lint/types, build, HTTP and full/focused Chrome regression. All 47 development migrations match retained SQL. Increment 7 is complete locally. The [supported import record](../evidence/phase-2-build-3-increment-7.md) records strict formats/generated artifacts, full-file private review, atomic customer/wearer and complete-history commits, immutable source maps, independent admission, read-only recovery, cancellation and cleanup. Validation passes 12 database/247 application tests, lint/types, build, HTTP and full/focused Chrome acceptance. All 48 development migrations match retained SQL. Increment 8 is complete locally. The [final record](../evidence/phase-2-build-3-increment-8.md) records 12 database/252 application tests, full Chrome/HTTP acceptance, matched restore, 49 matching migrations and the phase 3 handoff.

## 1. Fix the scope and completion boundary

| Contract | Build Three deliverable | Delivery increment |
| --- | --- | --- |
| Named wearer and scoped customer | Explicit wearer selection using completed customer authority, active-parent checks, historical reads | 1–3 |
| Body and garment profiles | Typed illustrated entry, labels, date, author, source, notes, custom dimensions, explicit units | 1–3 |
| Immutable versions and legacy definitions | Append-only versions, pinned schema, history, exact detail, schema-change recovery | 1–4 |
| Reuse and copy | Garment-filtered lookup, same-wearer independent copy, revise-as-new-version, reviewed mappings | 4 |
| Comparison and charts | Exact compatible-unit comparison, missing/incompatible states, accessible trend table and chart | 4 |
| Archive and restore | Header lifecycle with retained versions and historical references | 1–4 |
| Private reference photos | Up to five references per version, domain-specific ownership, normalization and revocation | 5 |
| Customer measurement QR cards | Selected exact versions and fields, expiry, revocation, authenticated same-shop read and local print | 6 |
| Supported customer/measurement imports | Fitloom CSV v1 templates, full dry-run, reviewed identity decisions, source IDs, resumable row outcomes | 7 |
| Order handoff | Executable exact-version capture contract and mutation-stability fixtures; no order creation | 8 |
| Complete local acceptance | Scope matrix, permission/race/replay/storage/UI checks, migration retention and phase 2 status update | 8 |

Build Three includes the reuse/import work referred to as a later phase 2 build in the Build Two plan. No separate unnamed build is left to finish phase 2.

OCR and photographed-slip extraction remain phase 5. Portal authentication, public bearer links, cross-shop Fit Cards, cross-phone linkage, and customer-facing sharing remain phase 8. Phase 3 owns order confirmation and its financial/design snapshots. Do not add payments, prices, production, deployment, or subscription work here. Preserve source records and mappings for later supported migrations, but do not claim arbitrary vendor databases can be imported.

## 2. Ground the implementation in the existing system

The baseline has completed garment masters, customers, named wearers, CRM photos, a shared workspace shell, and the command executor. It has no measurement permissions, storage, entry routes, value contracts, cards, or import engine. Earlier acceptance reports are dated evidence, not new test results.

Trace the two complete paths before editing:

1. Read: authorized page or route → `apps/web/src/server/customers.ts` → `createCustomerService` → `withScope` → customer SQL projection. Add measurement reads through the same identity/scope pattern.
2. Write: bounded same-origin route → parsed domain invocation → `createCommandExecutor` → current authority → actor/location-bound claim → replay or restricted mutation → audit and opaque result → fresh authorized detail read.

Consume [Build One's schema handoff](../evidence/phase-2-build-1-increment-6.md#handoff-and-limits) and [Build Two's owner handoff](../evidence/phase-2-build-2-increment-5.md#measurement-build-handoff). Stable garment/version/node IDs exist. The existing management projection is not a measurement permission contract. Customer height/weight are not confirmed cutting measurements. Customer photos cannot be rebound as measurement files.

Retain `NavigationGuard`, native navigation, private no-store responses, current identity checks, concrete location authority, and named SQL function grants. Do not introduce a generic repository abstraction or a second command executor.

The retained `app.claim_operation` enforces actor/location replay binding through an explicit customer/photo command-name allowlist. New command names do not inherit that protection automatically. Extend that same reviewed protocol to every measurement, card, photo and import command, including preview/decision/cancel commands that use the executor. Verify same-key cross-actor and cross-location denial for each command family. Do not change existing operation ownership or allow an import command to impersonate a customer command kind.

## 3. Choose the architecture and caller interface

Use a profile header with complete immutable versions. Reject a per-field event log with materialized current state. No requirement needs real-time per-field collaboration, and event reconstruction adds unnecessary ordering and recovery rules. The [candidate comparison](../research/build-three/technical-findings.md#3-candidate-structures) records the tradeoff.

The caller's normal use is:

1. Load a wearer book and a price-free schema for entry.
2. Keep an in-memory editor pinned to that schema.
3. Submit one complete version with an operation identity and expected header revision.
4. Receive opaque IDs and revision, then fetch authorized exact detail.
5. Use the same exact version for history, comparison, card selection, or later order capture.

The following is a proposed interface sketch, not existing exported code:

```ts
type SchemaRef =
	| { kind: "body"; bundleVersion: BodySchemaVersion }
	| { kind: "garment"; garmentId: GarmentId; versionId: GarmentVersionId };

type ProfileTarget =
	| { kind: "create"; profileId: MeasurementProfileId }
	| { kind: "revise"; profileId: MeasurementProfileId; expectedRevision: number };

type TypedValue =
	| { kind: "length"; fieldId: SchemaNodeId; decimal: MeasurementDecimal; unit: "in" | "cm" }
	| { kind: "number"; fieldId: SchemaNodeId; decimal: MeasurementDecimal }
	| { kind: "text"; fieldId: SchemaNodeId; text: string }
	| { kind: "boolean"; fieldId: SchemaNodeId; value: boolean }
	| { kind: "select"; fieldId: SchemaNodeId; choiceId: SchemaNodeId };

type MeasurementOrigin =
	| { kind: "manual" }
	| { kind: "copy"; sourceVersionId: MeasurementVersionId }
	| { kind: "mapped"; sourceVersionId: MeasurementVersionId; decisions: MappingDecision[] }
	| { kind: "csv"; batchId: ImportBatchId; sourceId: ImportSourceId };
```

Derive ID, field, and payload types from browser-safe Zod schemas. Brand new profile/version/card/import IDs. The sketch's arrays are bounded by runtime schemas. Missing values are absent entries, never an untyped null or fabricated zero. Typed external JSON starts as `unknown`. Validate DB results too. Exhaust all field/source/schema variants without `any`, unverified casts, or parallel handwritten enums.

Keep these conceptual operations on the measurement module: `book`, `intakeSchema`, `detail`, `history`, `command`, `compare`, and `capture`. Pure value/compare helpers may have a browser-safe export. Card and import protocols are separate owned modules because their revocation and batch state differ. They call measurement/customer domain operations and internal SQL routines, never bypass their invariants.

The service factory follows `createMeasurementService({ pool, resolveIdentity, observe })`. Reads accept a validated concrete workspace target plus a parsed query/ID. `command(name, target, invocation)` accepts only the schema-derived command registry. Initial command names are `measurement.create`, `measurement.revise`, `measurement.archive`, `measurement.restore`, `measurement-photo.begin`, `measurement-photo.revoke`, `measurement-card.create`, and `measurement-card.revoke`. Imports use two fixed families: `customer-import.preview/decide/commit-row/attempt-outcome/cancel` and `measurement-import.preview/decide/commit-row/attempt-outcome/cancel`. These abbreviations denote five concrete command names in each family, not slash-containing names. Every customer-import command has static `access.permission=customers.import`; every measurement-import command has static `access.permission=measurements.import`. Do not change the executor to dynamic permission resolution or use workspace.read as an import fallback. Stored batch format must match the command family before claim and again in SQL mutation. Attempt-outcome is the narrow server-driven post-rollback bookkeeping command described in section 11; client claims cannot fabricate a successful outcome.

A copy/mapping saves through `measurement.create` with verified origin. Upload/finalize uses the retained immutable upload protocol. Commit chunk is bounded orchestration over `commit-row`, not a second all-batch transaction. All command invocations use random UUIDv4 operation keys. For each reviewed logical-record attempt, the server generates and stores one random UUIDv4 before commit; retries retrieve that exact key rather than deriving one from IDs or hashing a source string. Preview/decision/cancel keys are random UUIDv4 retained with their exact envelopes. Extend the SQL claim allowlist and its actor/location checks without changing its UUIDv4 requirement.

Each create/revise payload includes a reserved `versionId` as well as its profile target, owner IDs, pinned schema reference, complete typed values/custom definitions, date, label, notes, origin, and bounded staged/carried photo references. Reject unknown properties, client actor/timestamps, inconsistent profile/schema kinds and a version ID reserved by another operation. The server returns the saved profile/version IDs and separate header revision/content sequence.

## 4. Define ownership, schemas, and immutable storage

### Profile and version rules

Each profile belongs permanently to one `(tenant, location, customer, wearer)`. A profile is either body or a particular garment ID. Several named profiles of either kind are allowed. Names are not unique identity. Never reparent or silently merge profiles. Copies in this phase stay under the same wearer.

The header contains ID, owner keys, kind/garment, current version ID, concurrency revision, archive metadata, and creation/update actor/time. Its revision advances on each new version and lifecycle change. Each content version records its own monotonically increasing sequence, separate from header revision, because archive/restore does not create measurement content. A no-op emits no content version and reports `changed=false`.

Each immutable version contains the exact schema reference and bounded value-free schema snapshot, profile label, typed values and custom definitions, measured-on date, recorded-at timestamp, recording principal, optional source attribution, notes, origin, optional prior/source version IDs, and immutable photo-reference membership. Server code retrieves and snapshots the schema; it does not trust a client-supplied garment definition or author.

The intake/snapshot DTO explicitly allowlists schema identity, label, sections, measurement fields, semantics, units, bounds and illustration IDs. It omits services, add-ons, rates, overrides and unrelated construction configuration. Validate the projection at its SQL and application boundaries rather than loading a management DTO and deleting a few keys. Origin IDs are references, not proof: the server reauthorizes their owner, verifies same-wearer source versions and mapping compatibility, and records manual changes after copying separately from source attribution.

Use relational columns for ownership, sequence, schema IDs, lifecycle, dates, and source indexes. Keep bounded heterogeneous schema/value/provenance documents in JSONB. Store decimal spelling and unit explicitly. SQL independently validates document shape and core value invariants. Immutable triggers reject UPDATE/DELETE of content versions and attachment memberships, including privileged accidental writes. Custom identity signatures and introduction metadata are immutable; the restricted save routine may set retirement once, without changing meaning or reactivating an ID. Future privacy erasure requires a separate reviewed policy.

### Body schema

Publish `body-core-v1` as an immutable value-free bundled schema. Include the five existing body semantics: chest circumference, bust circumference, waist circumference, hip circumference, and shoulder width. All are optional length fields with body basis, existing original illustrations, and clear labels. No gender inference or body-to-garment conversion is built into the template. Require at least one entered value across standard/custom fields before saving a profile.

Register bundle versions and canonical hashes in immutable storage through forward migration, with a narrow read function. Older bundles remain readable. Never change v1 bytes during a later release. Body profile custom fields remain per-profile definitions; they do not create global master configuration.

Use this concrete v1 manifest. The fixed UUID prefix is `51c4b79e-9be7-4dd9-9c91-`; concatenate it with the suffix below. Section suffix `000000000000` identifies the single **Body** section. The schema label is **Body measurements**, formatVersion is 1, and guidance is **Record body dimensions. Garment ease is entered separately.**

| Field UUID suffix | Semantic ID | Label | Help |
| --- | --- | --- | --- |
| `000000000001` | `body.chest.circumference` | Chest circumference | Record the chest measurement using the shop's measuring practice. |
| `000000000002` | `body.bust.circumference` | Bust circumference | Record the bust measurement separately from chest. |
| `000000000003` | `body.waist.circumference` | Waist circumference | Record the waist position used by the shop. |
| `000000000004` | `body.hip.circumference` | Hip circumference | Record the hip measurement using the shop's measuring practice. |
| `000000000005` | `body.shoulder.width` | Shoulder width | Confirm the shoulder endpoints before recording width. |

Every field has `kind=length`, `basis=body`, `displayUnit=in`, `displayPrecision=2`, `required=false`, `min="0"`, `max=null`, the section UUID above, and `illustrationId=dimension`. Publish the complete manifest and hash fixture, including help text, through migration. The generic existing illustration is only a guide; retain a tailor-validation gate for operationally adequate illustrations before real cutting.

Add a singleton `measurement_body_schema_state` with the current bundle ID and publication revision. New entry and revisions pin its current bundle and acquire its read/row lock in the schema slot between wearer and profile locks. If publication changes before a fresh save, return schema-stale and offer the same reviewed rebase as garments. Existing exact v1 versions never change. Future publication advances the state through migration, not runtime master settings. A v2 fixture must prove preserved v1 rendering, a rejected stale fresh save and explicit reviewed migration to v2.

### Garment schema and drift

New garment profiles use an active garment's current exact schema, even when rates are unset. Applicability is a discovery filter, not an exclusion rule. Preserve exact historical fields, choices, labels, and illustrations after a garment/field is retired.

A new or revised save rechecks garment active state and current version under lock. If the pinned version is no longer current, return `schema-stale` with opaque version IDs. Preserve the draft and offer **Review new schema** or **Keep draft and return**. Reviewing builds a new unsaved draft through the mapping rules in section 7 and requires a new operation identity. Do not silently reinterpret inputs. Existing exact versions remain readable and capturable historically. A retired garment cannot receive fresh versions. A same-wearer independent copy must target an active current schema, with reviewed mappings if needed.

For selects, only active choices are valid for fresh inputs. An unchanged inactive choice may carry into a revision only when the locked-current measurement contains that exact field/choice and the pinned current schema still contains it. Removing or changing it uses active choices. This exception never allows adding a retired choice to a new copy/import.

### Proposed storage map

| Storage | Purpose and required constraints |
| --- | --- |
| `measurement_body_schemas` | Immutable bundle version/hash/definition. No wearer data; migration-owned publication. |
| `measurement_body_schema_state` | Migration-owned current bundle FK and publication revision; narrow scoped read, serialized publication/save validation. |
| `measurement_profiles` | Composite owner identity and wearer FK; kind/garment check; current-version FK scoped to this profile; positive revision; paired archive actor/time. |
| `measurement_versions` | Owner/profile-qualified identity; unique profile/sequence; exact garment-version FK or body bundle FK; bounded schema/value/origin JSONB; recorded actor/time; creation operation reference. |
| `measurement_custom_identities` | Per-profile custom node ID/signature, introduced sequence, retirement sequence; meaning changes need a new ID. |
| `measurement_version_photos` | Immutable owner/profile/version/file membership and saved caption/order; at most five; same-owner file checks. |
| `measurement_photo_reservations` | Existing parent/actor FKs, reserved opaque profile/version IDs, one-hour expiry, immutable owner tuple and an eventual consumed-version FK. Files reference this existing reservation before content exists. |
| `measurement_cards` and card selection rows | Opaque card ID, issuer, scope, fixed expiry/label/projection version, revocation/revision, immutable exact selected versions/field IDs. |
| `domain_import_batches` and `domain_import_rows` | Actor-owned private preview, digest, revision, expiry, normalized rows/decisions and status; row outcomes and owner-qualified source maps. |
| `domain_import_sources` | Unique `(tenant, location, format, sourceNamespace, recordKind, sourceId)` → owner-qualified destination ID and accepted canonical payload hash. Kinds include customer, wearer, measurement-profile and measurement-version. Retained independently of expiring preview data. |

All business tables use enabled and forced RLS, restricted grants, complete tenant/location/parent foreign keys, indexed foreign-key paths, and empty privileged `search_path`. No cascading deletion of history. Bootstrap uses the retained current-version/header creation convention with an appropriate deferred FK. Validate that no committed header lacks a current version. Source namespace is explicitly chosen and reviewed, not inferred from filename.

Indexes support wearer/kind/garment/archive book filters, `(profile, sequence DESC, id)`, measured-on trend reads, current file bindings and card expiry, batch actor/expiry, and exact import-source lookup. Inspect actual plans before adding broad JSON indexes.

## 5. Define permissions and transactional behavior

### Permission matrix

Add these permissions to contracts, database vocabulary, labels, dependency validation, presets, access UI, and test fixtures together:

| Permission | Dependencies and capability |
| --- | --- |
| `measurements.read` | `workspace.read`, `customers.read`; book, exact/history, price-free intake, compare, charts, capture, and authorized card resolution. |
| `measurements.manage` | Measurement read; create, revise, independent copy, custom fields and reviewed mapping. No customer editing grant is required. |
| `measurements.archive` | Measurement read; archive/restore headers. |
| `measurements.photos.read` | Measurement read; read measurement-owned bytes. Does not grant CRM photos. |
| `measurements.photos.manage` | Measurement manage and photo read; stage/bind/revoke measurement media. |
| `measurements.cards.manage` | Measurement read; create/revoke cards. Cannot change source measurements. |
| `customers.import` | Customer read/manage; customer-format import only. |
| `measurements.import` | Measurement manage; measurement-format import only. Does not create customers or wearers. |

Grant all eight new permissions and their dependencies to the Owner preset. Update `install_role_presets` for new tenants and append a forward migration that backfills existing `preset=owner` roles. Preserve the deliberately narrow Manager preset with workspace.read/manage and Staff with workspace.read; neither receives new business grants automatically. Existing custom-role grants remain unchanged. An owner can explicitly create/assign an appropriate custom measurement or import role. Test upgrades from `0039` with existing owner, manager, staff and custom roles, plus provisioning of a new tenant. Test a measuring-only role with customer read and measurement read/manage but no master, rates, files, or customer manage. Test read-only, photo-denied, card administration, customer-import-only and measurement-import-only authority independently.

The custom-role permission count currently has a maximum of 20. Replace that magic bound with the authoritative permission catalog length, and align every SQL/transport/access-screen limit. Check old roles remain valid. Reject incomplete dependency sets and prevent delegation above the acting administrator's authority. Do not use this change to broaden unrelated roles.

### Lock order and replay

On every attempt, resolve identity and current scope/security/permission dependencies before replay. For fresh mutations, lock customer → wearer → garment header or body-schema state as applicable → measurement profiles ordered by UUID → card/batch rows as applicable → photo reservations and files ordered by UUID. Import operations first acquire a transaction advisory lock for the batch, then source-map keys in deterministic order, before those entity locks. Preview decision/cancel/expiry routines use the same batch advisory lock. Claim/lock the row outcome only after the domain locks. This prevents decision revision changes during one row's commit without holding a transaction across chunks. Card creation locks all selected profiles in UUID order under their common parents; parent/profile archive routines acquire the same relevant locks before revoking card rows. Extend the existing customer/wearer lifecycle SQL explicitly rather than relying on UI flags. Document and test any read-only locks that avoid lifecycle races.

Fresh saves recheck both customer and wearer active state, profile state, expected revision, schema activity/current version, custom identities, and every file. Parent lifecycle changes and saves therefore serialize. Only mutable preconditions run inside `mutate`. Recovery of a committed result must still work after parent archive or preview expiry, provided current authority remains. Revoked permission denies replay. A failed post-commit detail read reports **Saved; details unavailable**, not **Save failed**.

The executor commits version/header/files/source mapping, audit, durable opaque result, and any outbox intents together. Durable results contain kind, IDs, revision/sequence, changed flag and correlation ID. They never contain dimensions, notes, phone, source row values, photos, or schema payloads. General audit records field names and opaque references, not private values.

Use exact-envelope retries after timeouts/connection loss: same command, operation key, payload and expected revision. Do not mint a new key until a definitive non-commit or an explicit changed intent. An operation-status/retry path rehydrates from the saved result. Validation, unavailable, forbidden, conflict and uncertain are distinct controller states. The UI locks conflicting edits during a pending save and retains uncertain input in memory.

Revise/archive/restore/revoke/decision commands require the expected revision of their own mutable header. A fresh request already in the desired lifecycle state is a no-op only when its expected revision matches; it cannot swallow a concurrent edit. Creating a reserved profile/version ID that already belongs to another operation fails rather than returning another actor's record.

## 6. Specify values, units, and validation

| Input | Contract |
| --- | --- |
| Profile label | NFC/trimmed, 1–120 Unicode code points; duplicate labels allowed and distinguished by date/ID. |
| Measured-on | Required ISO calendar date, 0001-01-01 through today in the shop's configured IANA timezone. Derive today server-side from `app.shop_settings.timezone`, as the wearer birthday check does; do not trust a client timezone. Reject impossible/local-future dates. Backdated entry differs from recorded-at, which remains an instant. Missing/invalid shop timezone produces configuration-unavailable, not a silent UTC fallback. |
| Author/source | Recording principal comes from current identity. Imported or copied original author/date are unverified source attribution, separately labelled. Source note ≤500 characters. |
| Notes | Optional plain text, ≤2000 code points. Escape on render; never HTML. |
| Length | Decimal string, nonnegative without negative zero, at most 18 integer and 6 fractional digits, matching master decimal bounds; explicit `in` or `cm` per entered value. Reject exponent, NaN, Infinity, comma-decimal and fractions with an actionable error. Zero is a value, subject to schema bounds. |
| Number | Decimal string with the same 18-integer-digit magnitude budget, constrained by the field's unit, decimalPlaces and bounds; count is nonnegative integral, unitless may be negative when bounds permit. |
| Boolean | Explicit true/false selection plus an untouched state. False satisfies a required field; missing does not. |
| Select/text | Exact field-owned choice ID with active/carry-forward checks; text respects the schema's maxLength. |
| Custom dimensions | At most 20 per version, using the existing five field kinds and stable per-profile IDs. Require kind, label, body/garment basis for lengths, units/bounds as applicable, and unique normalized labels within the displayed schema. Custom semantics default to null. |
| Total fields | At most 80 across the garment's ≤60 fields and ≤20 custom fields. Unique IDs, no unknown/duplicate entries, no cross-field choice IDs. |
| Version document | ≤128 KiB authoritative stored JSONB byte size, including schema and values. Ordinary measurement JSON requests ≤128 KiB; unrelated routes retain their existing limits. |
| Errors | At most 30 linked issues; paths ≤8 segments, field IDs allowlisted; bounded plain messages and correlation ID. Never serialize raw SQL/driver details. |

The profile kind identifies its schema family, not the basis of every field. Existing garment schemas may contain both body and garment length fields. Render the basis explicitly and preserve it. Body schemas permit only body-basis length fields. Reject a custom dimension that tries to redefine an existing node's meaning. Changing kind/basis/count-unit/select ownership needs a fresh ID; retired IDs cannot return. New independent copies allocate fresh custom IDs and record source-node mappings.

Keep original decimals and units. One inch equals exactly 2.54 cm. Implement exact rational or sufficiently exact decimal operations with comparison by cross-multiplication, including cm→inch recurring results. Do not use JS floating-point equality, rounded chart values, or a 0.1 tolerance for saved diffs. Evaluate standard garment length min/max in canonical centimetres, as defined by the Build One master schema. Evaluate body-field and custom-dimension length bounds in their pinned display unit. Compare through exact cross-multiplication in both application and SQL validation. Existing schema displayPrecision controls presentation, not admissible measurement precision or physical meaning.

Changing the display unit converts presentation without changing stored originals or dirty state. When a user edits a converted field, that field becomes a new explicit decimal/unit input. Show rounded presentation as approximate and retain the source quantity for untouched fields. Do not repeatedly round-trip and resave untouched values. If bulk conversion becomes a separate user action, show rounding and require acceptance before replacing originals.

Use one shared value engine for validation, display conversion, mapping and comparison; SQL independently verifies authoritative storage constraints. Retain fixtures such as 1 in = 2.54 cm, 0.1 cm comparisons, maximum scale, negative zero, false versus missing, count fractions, choice-ID spoofing, and a bound evaluated in the other unit.

## 7. Define reuse, mapping, comparison, and charts

### Reuse and independent copies

List only the selected wearer's profiles, filterable by body/garment, garment ID, active/archive status and profile label. Default to active profiles. Use a body tab or explicit kind selector so body profiles remain discoverable. A complete authorized page/count query returns 25 rows, max 50, bounded offset up to 100000. History uses stable descending sequence/ID continuation, max 50. Search text goes in a read-only POST body, not URLs or logs. Cancel stale reads and use the existing 15-second read bound.

**Revise** creates a new content version under the same header with expected revision. **Copy as new profile** allocates an independent header/version under the same wearer and records source version provenance. It never copies archive state, cards or photo bytes/references. A historical version can seed a draft. Current eligibility and required fields are checked at save. Duplicate operation replay cannot create another copy. Source mutation cannot change the copied values.

### Mapping

Match exact node IDs inside the same schema lineage first. Across different garment schemas, match only compatible non-null semantic ID, kind, length basis, and unit family. Never match labels. Keep chest and bust distinct. Show source-only, target-only, and incompatible fields; unknowns stay missing. Exact field matches do not bypass changed required/bounds/choice rules.

Body-to-garment mapping is an explicit reviewed draft action. A garment field with body basis can accept an identical compatible body semantic. A body-basis chest cannot silently become garment-basis chest. Offer an explicit per-field transformation with source/target IDs, identity or additive ease rule, amount/unit, and a preview. The user supplies and confirms any ease; ship no guessed tailoring formulas. Reject incompatible basis changes without that explicit rule. Mapping captures source version, target schema version, and decisions in provenance. No saved version exists until the ordinary Save command succeeds.

For custom fields without semantics, same-profile stable ID or an explicit reviewed mapping is required. Do not persist global aliases inferred from one comparison. Booleans/text/selects compare by typed meaning and source-owned choices, not arbitrary numeric coercion. Ambiguous multi-candidate matches require a choice.

### Comparison and trends

Compare two to four exact versions of the same wearer. Default to one profile history, with explicit selection for same-wearer cross-profile comparison. Return typed statuses: same, changed, missing-in-source, missing-in-target, and incompatible. Distinguish absence from zero/false. Only compute numeric deltas for compatible dimensions. Show original quantities plus a selected comparison unit. Cross-basis transformed drafts are displayed as transformed, never as directly equivalent measurements.

For charts, select one compatible numeric dimension and at most 50 exact versions in a date window of at most 3660 days. This keeps each requested window bounded; users can choose another window without losing history. Order by measured-on, then recorded-at and ID for ties. Offer deterministic next-page navigation; never silently truncate a trend. Gaps remain gaps; do not draw a line through missing or incompatible points. Display a textual description and complete data table. Exclude booleans/selects/text from numeric charts. Use the architecture's selected Recharts library, pinned to a verified compatible version during implementation, with the authorized trend DTO and accessible table. Do not show clinical or fit-quality judgments.

## 8. Design the screens and navigation

Use the existing Fitloom shell and components. The visual direction is a quiet tailor's measurement book: wearer identity stays visible, field labels and units align consistently, and the selected garment illustration anchors entry. Reuse existing typography, semantic tokens and SVG artwork. Do not redesign the global shell or add generated artwork for a planning artifact.

The desktop editor has a compact owner/schema header, section navigation, a main measurement grid, optional reference guidance, and a persistent save/status row. At 390px, keep one field column and a wrapping save row. At 320px, all primary actions remain reachable without horizontal page scrolling. Illustrations have text guidance and are never the only instructions. Use existing Field, Input, Select, ToggleGroup, Tabs, Sheet, Dialog, Alert, Empty and Skeleton primitives with proper composition and labels.

Use `W = /workspaces/[tenant]/[location]`, `C = W/customers/[customerId]`, and `M = C/wearers/[wearerId]/measurements`.

| Screen | Required behavior |
| --- | --- |
| Customer profile | Add a real Measurements section only for measurement read. Each named wearer has Open measurements, and Add measurements when permitted/effectively active. No contact-only implicit wearer. Multiple wearers require explicit selection. |
| `M` book | Show authorized wearer/customer, body/garment filter, profile label/date/current version, archive state, pagination and Add. Offer history, compare, copy, card and archive actions only with their capabilities. |
| `M/new` | Choose body or garment, then load the active price-free schema. Confirm wearer and schema before entry. No rates prerequisite. A zero-field garment cannot produce an empty measurement profile; explain and permit a custom dimension. |
| `M/[profileId]` and `/versions/[versionId]` | Direct exact-version reads, date/author/provenance, values with units/basis, schema label, notes and permitted media. Indicate historical versus current. Archived records remain readable. |
| `M/[profileId]/edit` | Full-page controller; pin expected revision/schema, link errors to fields, preserve draft after validation/conflict, and offer rebase review. Custom fields, mappings, and photos aggregate into this controller. |
| `M/compare` | Exact selections in POST/memory state; a direct URL falls back to a selection screen. Table before chart, accessible headings, filters and unit controls. |
| Card management sheet | Select exact versions and allowed fields, preview fixed projection, choose expiry, create, print, revoke. Source edits never broaden a saved card. |
| `W/customers/import` | Customer-format upload, full preview, per-row duplicate choices, commit/retry and reconciliation. Requires customers.import. |
| `W/measurements/import` | Measurement-format upload, explicit source-to-customer/wearer/schema mappings, preview and independent commit/retry. Requires measurements.import. |

Add route classification before child profile paths can be mislabelled as the customer profile. Keep Customers selected for wearer measurement routes. Search focuses measurement profile search within the book, otherwise preserves customer search behavior. Structural breadcrumbs contain no unauthorized names; authorized page loaders render owner labels. New top-level import routes require explicit classifier and switch handling. Switching from any measurement/card/import editor goes to target Customers if allowed, else Home, clearing owner IDs and private filters. Never preserve a source profile ID in another workspace. Update destination schemas and response regexes together if introducing any new switch family.

Return state may reuse the scoped opaque customer return-token mechanism, storing only bounded view/filter/row identifiers. No measurement values, notes, photos, mapping drafts, CSV rows, or credentials enter browser storage, service-worker caches, analytics, URLs, or page titles. Editable draft recovery is in-memory only. Logout/scope changes clear transient state. Native termination cannot guarantee recovery.

Provide distinct loading, empty-book, no-match, unavailable, unauthorized, session-expired and archived-read states. A failed query must not show zero measurements. The full-page editor alone owns leave protection. Sheet close, schema/unit/owner changes, history navigation, search shortcut, browser back, reload and workspace switch all exercise the same dirty/uncertain decisions. After a denied read, remove private content rather than retaining stale values behind an error banner.

Accessibility acceptance covers labelled controls, required and untouched booleans, `aria-invalid` with linked errors, an announced save/conflict state, keyboard-only custom-field actions, labelled modal titles, focus return, touch targets and reduced motion. Expanding optional fields must retain values and focus. Do not claim screen-reader or Safari coverage without running it.

## 9. Give measurement photos their own authority

Extend the existing private-file purpose system with measurement-reference ownership: tenant, location, customer, wearer, staging actor, purpose and a reservation ID. Choose a separate `measurement_photo_reservations` table. After parent authorization, begin creates a reservation with immutable `(tenant, location, customer, wearer, actor, reservedProfileId, reservedVersionId)`, expiry and creation-operation reference. Customer/wearer/actor keys reference existing rows. Reserved content IDs are opaque planned IDs, explicitly without immediate content FKs. A unique owner-qualified reserved-version key prevents another actor reserving that version. Each file has an immediate owner-qualified FK to this existing reservation, so begin succeeds before profile/version creation. No staged file claims a nonexistent content-row FK.

The reservation's nullable `consumedVersionId` has a real composite FK to the eventual `(tenant, location, customer, wearer, profile, version)` content row. Save locks the reservation after parent/schema/profile locks, validates actor, purpose, all reserved IDs, expiry, expected header state and file finalization, inserts the real content/membership rows, and sets consumption once in the same transaction. A trigger permits only that validated consumption transition, never owner/ID rebinding. Consumption belongs to one Save operation. All consumed reservations live as long as referenced files/history. An unconsumed failed save rolls back consumption and remains retryable before expiry. New/stale intents allocate new reservation/version IDs. Cleanup expires unconsumed reservations and their files in bounded batches while preserving consumed historical references. Prove begin-before-create, failed save, wrong version/actor, double consumption and abandoned cleanup with real storage.

Reuse existing JPEG/PNG decoding, byte/pixel/upload concurrency bounds, orientation correction, metadata removal and private streaming. Read the actual shared constants during increment 5; do not duplicate limits. Restrict concurrent uploads to the existing two-upload bound. Validate aggregate staged references before accepting five photos. Never turn generic files.read/manage or customer photo permission into measurement photo access.

On save, insert immutable version membership and bind fresh finalized unexpired actor-owned files in the same transaction. For an ordinary revision, unchanged references from the prior current version may carry forward with explicit same-profile checks; reject foreign or revoked files. A new independent copy has no attachments. After a failed save, current history and previews remain intact. Retain the upload identity for exact recovery and let abandoned staging expire using the existing one-hour rule.

Distinguish **Remove from this draft** from **Revoke photo access**. Removing a reference while revising creates a new version; historical membership remains. Revocation marks that measurement-owned file unavailable across all versions, retains immutable metadata/tombstones, and immediately denies new reads. Require photo manage and a reason. Allow revocation on archived owners for privacy recovery, while new uploads and content edits remain blocked. Cards never include photos or grant photo access.

Update every workspace/CRM/private-file SQL entry point to reject the new purpose unless owned by measurement functions. Extend cleanup live-binding exclusions to every unrevoked historical measurement reference. Revoked files and abandoned staging become cleanup-eligible under the existing fence/lease process. Reads authorize before object access and again before returning bytes; use no-store, nosniff, restrictive image CSP, safe disposition and no image optimizer. An unreadable/revoked image shows a labelled fallback. No raw blob URL crosses a domain API.

## 10. Make QR cards scoped, expiring and revocable

Build Three cards are authenticated staff locators, not anonymous bearer links. The QR encodes `/measurement-cards/{randomCardId}` at the configured trusted application origin. The ID identifies a grant, never a customer, and grants no access by itself. Customer portal or cross-shop sharing cannot reuse this resolver without its later authority design.

Create a fixed card projection from one to ten selected exact versions of the same wearer, at most 30 selected scalar fields per version. Each selected field must belong to that saved schema. Include the profile/garment label, wearer display label fixed at issuance, measured-on date, units, selected typed values, a short source-kind label, and **Verify before cutting**. Each value includes its saved field/custom label and basis; select values also include the saved choice label. Resolve those labels only from the exact immutable version snapshot, never the current master. Print human labels and values rather than raw node/choice IDs. Exclude phone, email, address, private notes, free-text source attribution, prices, photo IDs and object data. Use fixed `projectionVersion=1`; future code cannot silently expand an existing grant.

Card selection rows are append-only with privileged UPDATE/DELETE rejection triggers and no runtime write grants. Header issuer/scope/expiry/wearer-label/projection metadata are immutable too. The only runtime header transition is versioned irreversible revocation, with actor/time/reason. Changing a selection or expiry requires revoke and reissue. Test direct selection mutation denial and successful revoke independently of ordinary route permissions.

Choose an expiry of 1–30 days, default 7, checked on the server. Issue and revoke use ordinary versioned commands and opaque results. Only the issuer or currently authorized card manager in that exact shop may manage the grant. Resolution requires a current authenticated active staff membership, exact location authorization, measurements.read, an active unexpired/unrevoked grant, and a still-authorized active issuer with measurements.cards.manage. A customer/wearer/profile archive invalidates resolution; restoration does not reactivate the card. Lifecycle commands permanently revoke affected cards in their transaction. Source content revisions leave the fixed selection unchanged.

An issuer's role removal can make a printed card unavailable even though its data still exists. Show that consequence in card management and offer an authorized manager **Revoke and reissue** under their own identity; never silently transfer the issuer. Normal card readers need measurement read, not card manage.

Resolve scope from the stored grant after authentication and prove current access; never trust URL tenant/customer claims. Unauthenticated access goes through the existing sign-in flow and returns only to the allowlisted card route. Invalid UUID, unknown, expired, revoked and inaccessible cards share an unavailable response without owner labels. Add a shared database-backed limit of 30 resolutions/minute per principal plus bounded unauthenticated requests at the existing transport boundary. Do not log card IDs as analytics events or attach external resources. Use private no-store and `Referrer-Policy: no-referrer` on card pages and media.

Use the constant route template `/measurement-cards/:id` in application diagnostics and redact card locator path segments from any request logging introduced by this build. Browser history and copied/printed links can retain the locator. Existing external proxy logs remain part of the user's deployment review; do not claim the locator never appears there. It grants no access without current staff authority.

Generate QR PNG locally with a maintained library, using a quiet zone and a tested error-correction setting. Validate the configured origin and encode only the short locator. Provide a print layout with typed units, date and visible authenticated-access note. Do not use the reference's external QR service. Decode the actual PNG in acceptance and resolve its decoded route before/after revocation. Printed/downloaded data cannot be remotely erased; revocation controls subsequent reads. Native browser printing uses the authorized projection without a PDF worker.

## 11. Specify the complete supported import protocol

### Supported formats and canonical identity

Support two strict UTF-8 comma-separated formats with downloadable templates. These are Fitloom interchange formats, not a claim of compatibility with an archived vendor export. Use RFC 4180 quoting, optional UTF-8 BOM, CRLF or LF, a header, no duplicate/unknown headers, no comments, no formula evaluation, and strict types. Preserve names beginning "=" as inert text. Download outcomes as JSON initially.

The [import format reference](phase-2-build-3-import-formats.md) defines the closed JSON grammar, every CSV column, normalization and grouping, schema-specific manifests and conformance examples. Implement browser-safe Zod contracts from that reference and generate downloadable JSON Schemas from the same contracts. Validate the templates/examples against those schemas before increment 7 can complete. Do not create a second handwritten validator.

| Format | Required columns | Optional columns |
| --- | --- | --- |
| `fitloom-customers-v1` | `source_customer_id,customer_name` | `phone_country,phone,email,source_wearer_id,wearer_name,relationship,notes`. A group is one source customer and up to 20 explicit wearers. |
| `fitloom-measurements-v1` | `source_profile_id,source_measurement_id,source_version_sequence,source_customer_id,source_wearer_id,profile_label,schema_key,measured_on,values_json` | `custom_fields_json,notes,source_author`. A group is one source profile and up to 20 complete immutable versions. |

The batch form supplies format and a case-sensitive NFC/trimmed source namespace. Source IDs use the same case-sensitive normalization, with a maximum of 100 code points and no control characters. IDs are not labels and cannot be guessed from names or phones. A source profile ID and each source measurement ID must be unique within that namespace. Repeating a profile ID with another wearer or garment family is a conflict.

Customer groups use normalized source customer ID. Their canonical customer columns are name, canonical phone country/E.164 or null, canonical email or null, and notes or null. Repeated rows must match those columns after the shared customer normalization. An inconsistent group is invalid in full. A contact-only row plus matching wearer rows represents one customer with those explicit wearers, not an extra contact or self wearer. Repeated source wearer IDs require identical normalized wearer fields or the group fails. Identical duplicates are classified as redundant CSV rows, with no second logical record.

Phone country is a supported uppercase ISO alpha-2 code; phone is at most 64 code points, national format or a leading-plus international number, without an extension. Invoke `normalizeCustomerPhone` and the existing country/validity checks. Both phone columns are absent/empty together or both supplied. For hashes, use country and E.164, excluding cosmetic phone spelling. Reuse existing NFC/trim/name/email/relationship/notes limits instead of introducing looser import-only fields.

Accepted hashes use versioned canonical normalized domain JSON: sorted object keys, values sorted by field key, wearer groups sorted by source wearer ID, versions sorted by source sequence, canonical decimals and normalized phone. Preserve meaningful display spelling/case and explicit custom field order; do not lowercase human names or source IDs. A formatting-only phone or decimal re-export is already-imported; a genuinely changed payload conflicts. Bind owner/schema decisions into the reviewed intent hash as well. Do not store private normalized payloads in general audit or operation results.

### Stable profile/version history

Customer import produces explicit source-to-customer/wearer mappings. Measurement import consumes those mappings or explicit reviewed picks of existing authorized owners. Selecting a source owner mapping reads customer/wearer IDs; it never edits a customer and requires no customers.import grant.

Create one destination profile per measurement-profile source identity and one destination content version per source measurement ID. `source_version_sequence` is a unique positive integer within the source profile. Sort it ascending, assign destination sequences 1..N, retain original sequence/ID in provenance, and point currentVersion at the highest source sequence, not the latest measured-on date. Labels may differ between versions. Distinct source profiles may have identical labels and must remain separate.

A complete source profile is one atomic logical record, capped at 20 versions and 512 KiB of canonical normalized content across that group, within the whole-file bound. Reject larger groups with an explicit supported-limit error. In v1, all versions target the same body/garment schema family and one current active target schema chosen in preview. Each known older source schema requires reviewed field mappings to that target or a row error. No implicit missing-field drop is permitted. This format does not promise arbitrary legacy schema creation. Existing saved legacy definitions remain readable.

Import v1 creates a new profile with its full declared history. It never appends to or rewrites an existing destination profile, including one imported by an earlier batch. An exact replay of the entire profile/source-version set is already-imported; a changed set, appended source version or changed mapped owner conflicts and requires a future supported incremental format or a new namespace/new independent profile after explicit review. Do not silently create a second profile or group by label. Save all profile/version source mappings, outcomes and history in one transaction. Extend the measurement module's private complete-history creation seam, preserving the same owner, schema, typed-value and immutable-content rules. No nested executor calls are allowed.

### Bulk duplicate review and customer mutation seam

Build Two's interactive check leases, 30-checks/minute budget and 10-minute review rows remain unchanged. They are unsuitable for a 200-row upload. The import preview uses its own bulk duplicate matcher, limited by the preview budget below. In one authorized bounded read transaction, query the set of up to 200 distinct normalized phones, reuse `customer_candidates` and its candidate/fingerprint semantics, and materialize per-group results into private batch decisions. Do not call `customer_check_begin` once per CSV row or create interactive duplicate-review records.

Import decisions carry actor/scope, normalized group payload hash, candidate fingerprint, selected action and expiry. Their review lifetime is the preview's 30-minute window. Final readiness does not extend that original window; a new dry-run is required after it expires. The preview budget accounts for the entire matcher. Do not retain leases across user interaction. Verify a >30-phone and a full 200-row preview without consuming the interactive check budget.

A group may create new, reuse an explicitly selected active customer and explicitly reuse/create mapped wearers, keep separate despite current phone matches, or skip. Matching phone/name never merges wearers. Include archived duplicate candidates, clearly labelled. Reusing an archived owner is blocked; restore it through the separately authorized customer workflow and rerun review. Keep-separate with an archived duplicate remains a deliberate decision. Reuse never overwrites customer fields. Mark every newly created wearer explicitly.

Introduce restricted `app.customer_import_commit_group` for the exact `customer-import.commit-row` active operation. It reads the normalized payload/decision from the actor-owned batch and checks customers.import plus its dependencies. It shares the existing profile validation, candidate query, phone normalization, apply helpers and canonical phone-lock ordering; it does not call `customer_mutate('customer.create', ...)` under an import operation. Refactor transaction-local validated-write helpers only where sharing is necessary. Existing customer_mutate keeps its eight command kinds, input shape, interactive duplicate-review behavior and caller-kind equality check.

Keep `customer_duplicate_reviews` and its customer.create/customer.update constraint unchanged. Import review state lives in the private batch/row decisions. Add `customer.import` and `wearer.import` to the existing customer_activity check constraint, browser activity-kind contract and safe labels through a forward migration. Created entities receive these activity events with opaque operation/owner IDs and safe changed-field names. Reusing an unchanged customer records no fictional profile change; the import's aggregate audit records mapping/reuse. Reuse plus new wearers records the actual wearer creation events.

Grant web only the narrow import entry routine; shared validated-write helpers have no runtime EXECUTE grants. The import command owns one claim and aggregate audit. Customer/wearer writes, activity, source maps and logical-record outcome commit together. Keep canonical phone advisory locks before customer/wearer locks, after batch/source locks; use the existing candidate row-lock order too. Re-run existing create/edit/archive/photo/duplicate suites after extracting a helper.

### Preview, commit and recovery

1. Read the complete bounded file server-side: at most 1 MiB, 200 data rows, 64 KiB per CSV record, 20 members per logical group and the per-version/group content budgets. Use a maintained parser such as csv-parse. Parse and classify every row, never just the preview page.
2. Create an actor/scope/family-bound preview with file digest, schema manifests, canonical groups, row membership, candidate fingerprints, selected mappings and revision. Dry-run changes no customers, wearers, measurements or source maps. It may create only restricted preview/decision metadata and its opaque command outcome.
3. Show all errors and paginated duplicate decisions. Bind each reviewed revision to the entire intended normalized payload, target owner/schema mapping, candidate fingerprints and action. Unresolved groups cannot commit. Preview expires 30 minutes after creation.
4. Allocate one random UUIDv4 commit key per logical record/review revision before scheduling it. Persist it with the immutable intended envelope and canonical hash. The scheduler/retry retrieves that key. A changed intent gets a reviewed revision and new random key only after the prior attempt's outcome is known.
5. Execute at most 20 independent logical groups per chunk. A customer plus its wearer group, or a profile plus its version group, is atomic. Stop scheduling before the request deadline. Successes are terminal and cannot run again under later preview revisions. No transaction spans groups or an HTTP/user wait.
6. For a fresh attempt, acquire batch/source and canonical phone locks before owner/schema/profile/outcome locks as applicable. Recheck current family-specific permissions, candidate fingerprint, source maps, active parents, schema version and expected state. A change returns needs-review before any business write; unchanged review remains usable throughout the 30-minute window.
7. Commit business rows, activity, source maps, audit, row outcome and opaque executor result together. Same source/hash in a new batch returns already-imported only after verifying the complete owner/group/version identity; changed payload or owner cannot rebind a source.
8. Return disjoint logical-group totals and a separate CSV-row summary. For each group expose source-row membership and created customer/wearer/profile/version counts. A profile with three saved versions is one created group and three created-version entities, not three profiles.

Provide a read-only `POST /imports/recover` with `{family,batchId,logicalRecordId,operationKey,requestHash}`. Authorize current identity, family-specific import permission and exact actor/scope/batch ownership before looking up the operation. The SQL projection checks exact command kind, operation key/hash and batch record; it returns only an opaque committed result, unknown, or currently-in-progress. It neither claims an operation nor acquires the batch lease, and bypasses the fresh-commit rate limiter. Read/status requests retain the ordinary authorization and transport bounds. A mismatched envelope/actor/location is denied. A missing result is not proof of rollback while another attempt is active.

After lost response, the client calls recover first. A committed result is final even when preview expired, the chunk limiter is exhausted, or another tab holds the batch lease. Only a confirmed fresh attempt enters commit scheduling/limiting; a still-in-progress attempt is retried through recovery. The executor's normal replay remains a second safety layer. Mutation exceptions roll back the failed claim; record the attempt's safe failure/needs-review state in a separate narrow bookkeeping command after rollback, with its own UUIDv4 and family permission. Attempt-outcome is callable only from trusted orchestration/reconciliation code, omitted from public command dispatch, and verifies authoritative rollback/no active transaction before changing state. An unconfirmed timeout stays in-progress/uncertain until recovery or the authoritative transaction timeout resolves it.

### States, deadlines and retention

Logical group states are pending, in-progress, created, reused, already-imported, skipped, needs-review, failed and cancelled. Created/reused/already-imported/skipped/cancelled are terminal. Failed and needs-review block successful completion until a reviewed retry succeeds or the user explicitly skips. Retry creates a new reviewed attempt revision without modifying terminal successes. A batch is complete only when every group is created/reused/already-imported/skipped; it is cancelled when cancellation is committed, with no further scheduling, and is never labelled complete/successful.

Cancellation acquires the same batch advisory lock and waits for the current bounded transaction's authoritative outcome. Any already committed success remains. It marks all remaining pending/failed/needs-review groups cancelled and clears dead reservations only after proving no transaction is active. No visible in-progress group may remain when cancellation is finalized. Cancellation is irreversible; another import requires a new preview. Reconciliation always satisfies total = the sum of all nine group-state counts, including cancelled and in-progress. Preview status and row status are separate discriminated unions.

Use a short batch scheduling lease for at most one chunk at a time; transaction advisory locks protect each group/revision. Lease expiry cannot double-process an executor key or bypass source uniqueness. Recovery does not need the lease. The existing worker can purge previews and reconcile expired reservations without executing new business rows.

The database baseline is a 10-second statement timeout, 20-second transaction timeout, 2-second lock timeout and 3-second connection acquisition timeout, not a 10-second transaction limit. Keep those global limits. Set a 30-second chunk scheduling deadline and do not start another group unless at least 23 seconds remain. Reserve time for the response, and stop further automatic retry attempts when the request budget is insufficient. Add a command-executor attempt/deadline option for import orchestration, preserving existing defaults for all other callers. A forced timeout or network loss can still make the response uncertain; recover the exact operation. Never claim this is an unconditional 30-second end-to-end response guarantee.

Rate-limit previews to 5/minute and 2 concurrent per principal/location, with the bulk matcher included. Commit chunks are limited to 10/minute with one active scheduling lease per batch. These limits apply to fresh work only. Return Retry-After on 429. Store private normalized payloads and candidates for 24 hours after creation, then clear those columns without deleting terminal opaque outcomes or rebinding source maps. The worker acquires the batch lock and does not clear a live transaction's input. Status/recovery of an existing result remains possible after payload purge. A new attempt after expiry/purge requires a new dry-run.

Source namespace/IDs may identify people and remain in a restricted mapping table. Keep them out of operation keys, general audit/results, logs and URLs. Retain protected mappings, canonical hashes, operation references and entity counts independently of expiring preview content. This is a technical retention rule, not a legal anonymity/deletion claim.

## 12. Define HTTP boundaries and file ownership

Use the existing identity and `mutation` wrappers. Proposed route groups are below; implement strict dispatch rather than a generic arbitrary resource writer.

| Route family | Interface |
| --- | --- |
| `/api/workspaces/{tenant}/{location}/measurements` | Read-only POST `/search`, `/schema`, `/compare`, `/trend`; GET exact profile/version/history using only opaque IDs and bounded scalar pagination. |
| Same measurement family | POST `/commands/{allowlistedName}` for create/revise/archive/restore/copy/card commands, with strict invocation and command-specific payload. Copy can be a create origin with server validation, not a duplicate save engine. |
| Same measurement family `/photos` | Begin, streamed upload/finalize, authenticated byte reads and revoke through domain-only ownership; version Save performs binding. |
| `/api/workspaces/{tenant}/{location}/imports` | Format-specific customer-import and measurement-import command dispatch with static permission per command; actor-owned status/paginated outcomes and read-only POST recover. Verify stored format on every path. The recover read bypasses fresh-commit limiter/lease after authorization. Separate larger bounded upload profile from ordinary JSON routes. |
| `/measurement-cards/{cardId}` and scoped resolver | Page and narrow authenticated resolution of fixed projection; no public customer lookup or raw customer URL. |

Use 400 for structural validation, 401 for expired identity, 403 for known scoped capability denial, 404 for inaccessible detail/locator, 409 for stale revision/schema/preview or duplicate review, 413 for body overflow, 408 for stalled upload and 429 for limiter excess. Preserve existing temporary-service 503 behavior. Responses use discriminated error categories with correlation IDs and bounded field issues. Never encode a pending or failed save as a successful empty result.

Private page HTML, RSC props, JSON, media, print and outcome downloads receive current authorization and no-store. POST reads still require same-origin protection. No body or private values in access/command logs. Shared observer events contain only operation kind, duration, correlation, outcome category and safe counts. Add request-body profiles deliberately; do not raise the global default limit. Streamed binary uploads use the existing file bounds, independent from CSV/JSON bounds.

### Proposed source ownership

| Location | Work |
| --- | --- |
| `packages/application/src/measurement-contracts.ts` | Browser-safe IDs, schemas, values, DTOs, invocations and bounded errors. |
| `measurement-values.ts` | Exact quantities, field validation, mapping, diff and trend DTO construction. Browser-safe, no identity decisions. |
| `measurements.ts` | Scoped read/command authority, SQL adapters, price-free intake and capture. |
| `measurement-cards.ts`, `measurement-photos.ts`, `import-contracts.ts`, `domain-imports.ts` | Grant resolution, media domain authority, strict formats and bounded batch protocol. Add a module only when it owns distinct policy. |
| Existing `master-contracts.ts`, `garment-definition.ts`, `workspace-contracts.ts` | Derive field schemas, share value-free rendering safely, and add permission/destination contracts. Avoid importing Node/DB code into browser exports. |
| `packages/db/src/schema.ts`, forward SQL, journal and snapshots | Declarative tables/keys/indexes and SQL-owned forced RLS/functions/triggers/grants. |
| `apps/web/src/server/measurements.ts` and domain adapters | Current identity, private error translation, approved pool, no raw SQL in UI. |
| `apps/web/src/app/workspaces/[tenant]/[location]/customers/...` | Wearer book, exact detail/history and the single full-page editor/controller. |
| Existing workspace route policy/navigation/switcher and customer profile | Route classification, labels, capabilities, safe switching and working entry actions. |
| `packages/application/test` and existing HTTP/Chrome fixtures | Real service/storage/transport regressions and journeys; extend existing setup rather than creating competing fixtures. |

## 13. Deliver in ordered increments

Do not mark an increment complete from compilation or a screenshot alone. Each increment produces a working path and retained evidence. Dependencies below are sequential except pure contract fixture work that does not share a mutable test database.

### Increment 0: pin acceptance and runtime baseline

Recheck status, checkout, migration journal and current declarations. Confirm the existing local services and canonical URLs without resetting data. Read shared file bounds and role-preset SQL. Run the existing validation once and record unrelated failures before expanding scope. Create the Build Three requirement/acceptance matrix, synthetic fixture inventory, and original UI wireframe using the existing components. Do not seed development customer data without a deliberate fixture action.

Exit: source/file ownership and baseline are recorded; every remaining phase 2 requirement has an increment and acceptance owner.

### Increment 1: implement domain contracts, storage and permissions

Add body schema publication, profile/version/custom-identity storage, new permissions, role-count alignment, immutable constraints, named functions and full owner FKs. Add exact value parsing and unit primitives. Retain command claim/audit/replay behavior. Implement create/revise/archive/restore and historical reads against real PostgreSQL. Include independent SQL validation and operation-kind checks.

Exit: a service test saves two typed versions, proves old values and schema unchanged, exercises parent archive/save and concurrent stale revisions, rejects cross-owner/current-pointer spoofing and direct runtime writes, and recovers a committed result after archive. Check migration clean install, forward upgrade, replay and Drizzle alignment.

### Increment 2: expose price-free intake and the wearer book

Implement schema/list/detail/history DTOs and strict scoped HTTP routes. Add the wearer measurement book and working profile entry. Update classification/breadcrumbs, search/return behavior, capabilities and cross-shop switching. Deny master/rate leakage recursively, including errors and RSC props. Support body entry when no garments exist.

Exit: measuring-only staff can find a wearer and load fields with no master/rate/file/customer-manage grants. An ungranted location, archived new-selection target and inaccessible exact version fail safely. Lists/counts/history traverse more than one page.

### Increment 3: complete typed entry and revision

Build the full-page controller with all five kinds, explicit units/basis, custom fields, illustration guidance, measured date/notes/source and save status. Wire schema-stale rebase, expected-revision conflicts, required false/missing behavior, no-op announcements and exact uncertain retries. Cover native leave/reload/switch behavior with one guard owner.

Exit: desktop and mobile users create a body profile and a garment profile, reload exact data, revise without rewriting history, and recover a committed save with a dropped response. Validation/conflict preserves input and focuses the correct field. Parent archive between page load and save is rejected.

### Increment 4: implement reuse, mapping, comparisons and lifecycle

Add independent copy, source-version drafts, compatible mapping with reviewed ease, historical schema recovery, compare/table/chart and archive/restore UI. A copied profile stays independent. Add exact capture-ready DTO tests early so later UI changes cannot weaken provenance.

Exit: mixed-unit equivalent quantities compare equal, small real differences remain differences, missing values/booleans are correct, chest/bust and basis mismatches remain incompatible, retired definitions render, and explicit mapping creates an unsaved preview before ordinary Save. Charts paginate and show gaps correctly.

### Increment 5: attach and revoke private reference photos

Add the measurement file purpose, reserved IDs, atomic save membership, authorized byte service, draft upload controller and historical cleanup exclusions. Extend every existing generic/CRM file entry point's purpose tests. Add the privacy revoke path and archived historical fallback.

Exit: five-photo bounds, actor/owner mismatch, expired staging, foreign-purpose bypass, response loss, failed replacement, no-photo-grant detail projection, metadata removal, historical live-file retention and revoked-file cleanup pass on real storage. No photos leak into cards or logs.

### Increment 6: issue and revoke QR cards

Implement fixed selections, issuer/current-reader authority, expiry, lifecycle revocation, local PNG generation and print. Add protected locator sign-in return behavior and rate limits. Keep the anonymous/portal path absent.

Exit: decode a generated QR, open its route as authorized staff, prove the exact selected fields only, revoke it and deny the next fetch. Check foreign shop, revoked issuer/reader, expiry, customer/profile archive then restore, missing photo scope, invalid IDs and print width. Source revision does not change card selection.

### Increment 7: implement supported imports end to end

Complete locally on 2026-11-03. See the [implementation and acceptance evidence](../evidence/phase-2-build-3-increment-7.md).

Publish the strict templates, schema manifests, generated JSON Schemas and conformance fixtures from the [format reference](phase-2-build-3-import-formats.md). Implement private full-file bulk preview, decision revision, the restricted customer-import seam/activity migration, customer/profile/version source maps, atomic logical-group commits, persisted UUIDv4 keys, unthrottled recovery and complete reconciliation states. Add upload/row/group/chunk bounds, deadline-aware retries, concurrency control, cleanup and static format-specific permissions. Wire both import screens and safe exit behavior.

Exit: a full 200-row preview works outside the interactive limiter, dry-run changes no business records, grouped wearers and profile histories commit atomically, duplicate phone requires a current import decision, source profile/version and owner mappings are explicit, isolated import roles work, two tabs cannot double-create, lost responses recover despite limiter/lease/expiry, changed schema/candidate state requires review, cancellation/failure totals reconcile, and a repeated exact batch reports already-imported. Unsupported formats produce row/file errors without truncation or silent loss. M29–M44 and M46/M47 are explicit increment 7 or prerequisite exits, not optional future checks.

### Increment 8: close complete phase 2 acceptance and hand off

Complete locally on 2026-11-03. See [final acceptance](../evidence/phase-2-build-3-increment-8.md) and the [capture/media reference](../../architecture/measurements.md).

Finish `capture` for exact immutable measurement/schema/value/unit/date/provenance data under current authority. The result marks historical/effective-active eligibility separately so phase 3 can enforce its pending/new-selection policies without mutating old content. It contains no prices or order number. Test it before and after subsequent measurement edits, schema retirement and profile archive, asserting identical immutable measurement content and updated eligibility separately.

Run the complete local regression and inspect retained real screenshots. Complete the acceptance matrix and document actual command results, counts, limits and remaining tailoring validation. Update status/README entry points to phase 2 complete only after all exits pass. Phase 3 then owns orders/pricing/manual payments. Infrastructure remains the user's separate responsibility; the milestone reminder is after phase 3, not this planning task.

## 14. Verify the complete behavior matrix

| ID | Scenario | Required evidence |
| --- | --- | --- |
| M01 | Contact-only, one wearer and family selection | HTTP/Chrome explicit identity; no automatic self wearer or cross-wearer copy. |
| M02 | Body and mixed-basis garment entry | Real service and UI round-trip, schema refs and typed values. |
| M03 | All five kinds and custom dimensions | Valid/invalid fixtures, false/zero/missing distinction, active choice and retired-ID checks. |
| M04 | Exact units and bounds | Rational conversion/delta fixtures in application and SQL storage tests, no floating equality. |
| M05 | Schema history and drift | Save against old schema conflicts; reviewed rebase retains values; retired historical schema renders unchanged. |
| M06 | Immutable history and no-op | Direct UPDATE/DELETE denial, header pointer ownership, no-op sequence stability and exact detail. |
| M07 | Concurrent revisions and archive races | Two real DB connections, one stale edit rejected; customer/wearer/profile lifecycle lock cases. |
| M08 | Authority and roles | Two tenants, two locations, custom/preset upgrades, role count/dependency/delegation checks, revoked session/grant. |
| M09 | Price-free staff intake | Deep absent-key assertions across every response/props/error and measuring-only Chrome journey. |
| M10 | Replay and commit uncertainty | Lost response after commit, exact retry, changed-payload/actor/location denial, current authorization on replay. |
| M11 | Post-commit projection failure | UI reports saved outcome, preserves result identity, and retries detail without a second write. |
| M12 | Complete lists/search/history | >50 profiles/versions, count/filter/continuation correctness, stale read cancellation, body tab and archived filters. |
| M13 | Independent copy | Different IDs, fresh custom IDs and provenance, no inherited cards/photos/archive, later source changes have no effect. |
| M14 | Mapping and comparison | Exact identity/semantic matching, ambiguous candidates, no bust/chest or basis guessing, explicit ease approval. |
| M15 | Charts | Date ties/order, missing gaps, numeric compatibility, full table and bounded next page, keyboard access. |
| M16 | Dirty and uncertain navigation | Cancel, links, modal close, reload, browser back, Cmd/Ctrl+K and failed/canceled shop switch. |
| M17 | Private reference files | Real PostgreSQL/blob storage owner/purpose/actor checks, expiry, normalization, upload and stored budgets. |
| M18 | Historical media and revocation | Old version retains membership; global byte revoke denies all references; cleanup retains only live files. |
| M19 | Cards and QR output | PNG decoding, fixed field projection, current issuer/reader, foreign scope, expiry/revoke and archive/restore non-reactivation. |
| M20 | Import parsing and dry-run | Every fixture row classified, strict headers/quoting/bounds, no business mutations, inert formula text. |
| M21 | Import decisions and identity | Canonical phone decisions, candidate fingerprint change, named wearer mappings, no silent merge or source rebind. |
| M22 | Import retry/concurrency | Row operation/source-map/outcome atomicity, partial failure, repeated batch, concurrent tabs, expired preview recovery. |
| M23 | Import totals and cleanup | Logical-record and CSV-row reconciliation, terminal success retention, cancellation, 24-hour private preview purge. |
| M24 | Transport and diagnostics | 400/401/403/404/409/413/408/429/503, no-store and origin, bounded issues, no private logs/URLs/cache. |
| M25 | Migration and function authority | All retained migration hashes, clean/upgrade/reapply, Drizzle no drift, forced RLS/grants/search_path catalog assertions. |
| M26 | Later order handoff | Executable capture read with immutable data and separate eligibility after edits/retirement/archive, no order code. |
| M27 | Real UI quality | 1440/1024/390/320 widths, long Tamil labels, keyboard, focus/errors, print and actual screenshots inspected. |
| M28 | Existing behavior remains | Customer/register/wearer/photo, garment/catalog/authority/shell, auth/worker/operator/file and transport suites still pass. |
| M29 | Bulk duplicate preview, DS-01 | >30 distinct phones and a 200-row file are fully classified without consuming interactive leases/budget; import decisions work throughout the original 30-minute window and expire afterward. |
| M30 | Customer import seam, DS-02 | New customer/wearers, import activity kinds, source maps and aggregate audit commit atomically under customer-import.commit-row; existing customer and interactive-review suites remain unchanged. |
| M31 | Imported history identity, DS-03 | Two source versions produce one profile/two immutable versions with sequence-defined current; duplicate labels with different profile IDs stay separate; repeated set is already-imported and append/changed set conflicts. |
| M32 | Static import permissions, DS-04 | Customer-import-only and measurement-import-only roles each finish their format; every command/status/recovery cross-format request returns 403 and no customer-edit overgrant occurs. |
| M33 | UUIDv4 import attempts, DS-05 | Persisted random UUIDv4 is accepted, exact retry replays, new reviewed attempt uses a new key, and cross-actor/location/hash reuse fails for every command family. |
| M34 | Shop-local measured dates, DS-06 | Today passes around midnight for Asia/Kolkata and a negative-offset shop; local tomorrow/impossible date fails; no silent UTC fallback. |
| M35 | Saved card labels, DS-07 | Standard/custom/select labels and basis print from exact saved snapshots after current schema rename/retirement; raw IDs never print. |
| M36 | Closed interchange grammar, DS-08 | Generated value/custom JSON Schemas validate examples and schema-specific template round-trip; unknown property/key, bad custom definition and field-owned choice spoofing fail. |
| M37 | Import states, DS-09 | Cancel with pending/in-progress work preserves committed successes and ends cancelled; failed work blocks complete until reviewed retry/skip; all nine counts partition groups. |
| M38 | Canonical customer groups, DS-10 | Mismatched source customer fields, contact-only plus wearer rows, duplicate wearer IDs, formatted/unformatted phone, archived duplicate and formatting-only re-export follow explicit outcomes. |
| M39 | Body publication/rebase, DS-11 | Concrete v1 manifest validates/hash matches; v2 publication leaves saved v1 intact, rejects stale fresh entry/revision, and allows only reviewed rebase. |
| M40 | Photo reservation integrity, DS-12 | Begin before content exists, exact final ownership/FK consumption, rollback, double/stale/wrong-version reservation rejection and abandoned cleanup on real storage. |
| M41 | Immutable card selection, DS-13 | Privileged direct UPDATE/DELETE of selected version/field rows fails; header revoke succeeds and cannot alter expiry/issuer/selection. |
| M42 | Recovery admission, DS-14 | Exhaust fresh-commit limiter and hold scheduling lease, then recover the same committed result after preview expiry without another write; wrong actor/location/hash fails. |
| M43 | Preset forward upgrade, DS-15 | Existing/new owners receive all eight grants and dependencies; existing/new Manager, Staff and custom roles retain their intended grants; the expanded role bound is consistent in SQL/UI/contracts. |
| M44 | Decimal range, DS-16 | Schema and value parser both admit the 18+6 maximum; other-unit bounds compare exactly and over-range input returns the correct field path. |
| M45 | Card admission details | Unauthenticated allowlisted sign-in return, invalid/open-redirect target rejection, 30/minute resolution limiter and measurement-read user without card-manage. |
| M46 | Template and file budgets | Both template downloads and manifest/version docs exist; strict UTF-8/header/JSON rules and 1 MiB/200-row/64 KiB/20-member/group-content rejections preserve every outcome. |
| M47 | Actual timeout budget | Forced statement/transaction/lock/connection delays exercise the 10/20/2/3-second baseline, import attempt scheduling stops before deadline and lost committed responses remain recoverable. |

Run guarded database/blob fixtures sequentially. Never reset or seed `fitloom_dev` as test setup. Retained focused test files are `measurement-contracts.test.mjs`, `measurement-storage.test.mjs`, `measurement-cards.test.mjs`, and `domain-imports.test.mjs`, with photo/card/capture fixture modules. Reuse the existing private-file test fixture for measurement-media cases. Add a measurement HTTP/Chrome journey to the retained optional browser suite instead of building a second authentication harness.

Existing aggregate commands for implementation acceptance are `pnpm validate`, `pnpm --filter @fitloom/db db:generate`, `pnpm db:migrate`, and `MASTER_UI_CHECKS=1 pnpm --filter @fitloom/application test:http`. Run them when application changes exist and their dependencies are ready. Report real counts, not the baseline's 12/164 as a forecast. Add focused commands as tests land. Check `git diff --check`, links and requirement coverage on documents too.

## 15. Evolve migrations and manage risks

Append migrations after the currently retained `0039`; choose exact numbers from the journal at implementation time. Do not edit applied migrations, regenerate the frozen reference baseline, use schema push, or reset development data. Preserve declarative schema/snapshot alignment with SQL-owned policies/functions. First introduce tables/permissions and narrow interfaces, then dependent media/cards/import storage. Existing rows need no fake measurement backfill.

Before applying each migration, inspect locks and the target environment. Test clean installation, retained-version upgrade, duplicate migration invocation and runtime-role privileges in the guarded test database. New blank tables do not require concurrent index operations by default. Forward repair is the recovery model; source removal must not drop saved versions or source maps. Rollback a failed transaction before any success response. Record a matched private-file/database recovery requirement if media adds new persisted purposes.

| Risk | Required response |
| --- | --- |
| A schema changes after entry starts | Preserve original draft, reject stale fresh save, offer explicit reviewed mapping. |
| Unit toggle introduces cumulative rounding | Retain original quantity and derive display; do not resave untouched converted values. |
| New permissions exceed old role bounds | Update every catalog/count validator and migration/preset path, retain custom grants. |
| Import duplicates differ between preview and commit | Recheck canonical candidate fingerprint under lock; needs-review outcome. |
| Partial import success looks like a failed whole batch | Store row outcomes atomically, show disjoint totals and resume pending records only. |
| Photo cleanup deletes history | Include all historical live references in cleanup exclusion and test actual object survival. |
| Card expands after source or permission changes | Fixed version/field selection plus current authorization and lifecycle revocation. |
| Current capture and historical capture get confused | Separate immutable content from effective-active eligibility and test both contracts. |
| Templates imply cutting correctness | Use original guidance, no invented ease rules, record tailor review before real cutting use. |

The decisions above are implemented locally and covered by the final acceptance record. Historical increment records retain numeric-bound refinements and their evidence. Future contract changes need updated requirement ownership and fixtures. Operational tailor validation and untested device coverage remain explicitly owned limits in the final handoff.
