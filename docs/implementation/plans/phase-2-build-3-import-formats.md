# Build Three import format reference

Status: Implemented locally in Build Three increment 7 on 2026-11-03. The [implementation evidence](../evidence/phase-2-build-3-increment-7.md) records validation, resource limits and observed browser behavior. The [implementation plan](phase-2-build-3-measurements.md#11-specify-the-complete-supported-import-protocol) owns permissions, preview/commit state, source mapping and acceptance. This file defines the interchange grammar.

## Common CSV rules

The supported format names are `fitloom-customers-v1` and `fitloom-measurements-v1`. A batch supplies one format and source namespace. Header names are exact and case-sensitive. Optional headers may be omitted; their values default as described below. Required cells cannot be empty. Optional empty or whitespace-only text cells become null after normalization. Unknown or duplicate headers fail the file. Fields with commas, quotes or newlines use RFC 4180 quoting with doubled embedded quotes.

Input is UTF-8, optionally with BOM, comma delimiter and CRLF or LF. Empty trailing lines are ignored. An empty file or header-only file is invalid. Every nonempty data row belongs to one explicit source group. Limits are 1 MiB, 200 CSV data rows, 64 KiB per decoded CSV record, 20 members per logical group and the content budgets in the plan. Invalid UTF-8, malformed quotes or inconsistent column counts are file errors. An invalid row blocks its entire group; other groups remain independently reviewable.

Source IDs and namespace are NFC-normalized, trimmed, case-sensitive strings of 1–100 Unicode code points without control/surrogate characters. They are opaque strings, so leading zeros remain. Neither a numeric parse nor name/phone matching determines source identity. Notes normalize CRLF to LF and permit newline/tab under the existing customerText multiline rule. Render every imported string as plain text.

## Customer columns

| Column | Required | Contract |
| --- | --- | --- |
| `source_customer_id` | Yes | Opaque source ID. Group key within the namespace. |
| `customer_name` | Yes | Existing customerName normalization, 1–120 code points. |
| `phone_country` | With phone | Supported uppercase ISO alpha-2 code, e.g. IN. Both phone cells empty means no phone. |
| `phone` | With country | 1–64 code points, national or +international format. Shared normalizeCustomerPhone validity/country checks, no extension. |
| `email` | No | Existing customer profile email contract, NFC/trimmed, ≤254 code points, valid email. Case is preserved. |
| `source_wearer_id` | With wearer name | Opaque source ID unique within the namespace and permanently bound to its source customer. |
| `wearer_name` | With wearer ID | Existing customerName rule, 1–120 code points. |
| `relationship` | No | Existing wearer relationship rule, 1–60 code points when non-null. Requires a wearer. |
| `notes` | No | Customer notes, ≤2000 code points, not wearer notes. |

Canonical customer equality covers name, phone country/E.164, email and notes. Phone display punctuation is excluded. Optional missing and empty cells are equivalent. Canonical wearer equality covers source wearer ID, name and relationship. Repeated customer rows with conflicting canonical customer fields invalidate the entire group. A contact-only row plus matching wearer rows creates one customer and those wearers. A repeated identical wearer row is redundant; conflicting wearer fields or the same wearer ID under another customer are errors. Source group equality is never based on profile labels.

Customer group hashes contain the canonical customer object and source-ID-sorted unique wearer objects. The accepted source mapping stores the group hash plus each individual wearer hash and owner reference. A re-export of a phone with different spacing produces the same canonical hash. Adding/removing a wearer from a previously accepted group is a changed-group conflict in v1, not an implicit update. Reuse picks an existing active customer explicitly and either maps existing wearers or creates the declared new wearers. No absent customer columns erase existing destination data.

## Measurement columns

| Column | Required | Contract |
| --- | --- | --- |
| `source_profile_id` | Yes | Opaque identity for one complete source profile; same owner and schema family in every row. |
| `source_measurement_id` | Yes | Opaque identity for one source version, unique across the namespace. |
| `source_version_sequence` | Yes | Decimal integer text from 1 to 2147483647, unique within the profile. No leading plus, fractional value or exponent. Gaps are allowed. |
| `source_customer_id` | Yes | Explicit reviewed source customer mapping. |
| `source_wearer_id` | Yes | Explicit reviewed source wearer mapping under that customer. |
| `profile_label` | Yes | NFC/trimmed, 1–120 code points. Version-local label; never the grouping key. |
| `schema_key` | Yes | Case-sensitive alias of 1–100 code points bound to a server-verified schema manifest in the batch. |
| `measured_on` | Yes | ISO calendar date, validated against shop-local today. |
| `values_json` | Yes | Nonempty JSON array using the closed value grammar below. At least one entry must be an actual value; false and zero count, empty text alone does not. |
| `custom_fields_json` | No | JSON array of closed custom definitions below; missing/empty cell means `[]`, not null. |
| `notes` | No | Version notes ≤2000 code points. |
| `source_author` | No | Unverified original attribution ≤500 code points. The recording actor is still the current authenticated principal. |

All rows of a source profile are validated before its atomic import. Destination sequence follows ascending source_version_sequence, with the highest becoming current. Up to 20 versions and 512 KiB canonical group content are supported. The stored per-version 128 KiB budget includes the server-derived schema and provenance. No update or append to an existing destination profile is supported in v1. Same complete normalized source-version set is already-imported; a partial/expanded/changed set conflicts. Duplicate labels on different source_profile_id values remain distinct profiles.

## Schema-specific templates and external field keys

After selecting an authorized exact body/garment schema, the user downloads a schema-specific CSV template and a manifest. The manifest contains `formatVersion:1`, a `schemaKey`, exact source schema reference/hash, field aliases and choice aliases. It contains the price-free field projection only. A generic blank CSV header is useful for discovery, but a measurement file becomes reviewable only after its schema_key values bind to manifests.

Standard field aliases are `f001` through `f080` in that exact schema manifest. Choice aliases are `c001` through `c030` within their field. Each manifest maps these aliases to exact stable node UUIDs and saved labels, kinds, semantics/basis/units and choices. An alias has meaning only with that manifest's schema reference/hash. It is never inferred from display labels or carried to another schema by ordinal position.

The preview server regenerates/verifies the manifest from the exact saved source schema; uploaded manifest metadata cannot authorize another tenant or invent fields. If source and current target differ, the reviewer selects explicit source-to-target mappings under the plan's compatibility rules. Unmapped source values require an explicit visible decision or a blocking error; they cannot disappear silently. No commit uses a current schema that differs from the one reviewed without a new review.

Custom aliases have the form `custom.<slug>`, with lowercase ASCII letters, digits and underscores in a 1–60-character slug. A key must be unique in a version. Across a source profile's versions, the same custom key means the same immutable kind/basis/unit/choice ownership. Its first appearance allocates one destination profile-scoped UUID. Retirement is irreversible; reintroduction or changed meaning requires a new custom key. New independent copies allocate fresh destination UUIDs. Select option keys are unique 1–40-character lowercase ASCII letter/digit/underscore strings within their own custom field.

## Closed JSON value grammar

Every entry has exactly the properties listed for its discriminant. Unknown properties, null values, duplicate fieldKey entries and keys missing from both the manifest and custom definitions are errors. At most 80 entries are allowed. A missing field is represented by absence of its entry, never zero, false, null or an empty object. JSON numbers are not accepted for decimal quantities.

| `kind` | Required properties beyond `kind` | Value rules |
| --- | --- | --- |
| `length` | `fieldKey`, `decimal`, `unit` | Decimal string, nonnegative, ≤18 integer and 6 fractional digits, unit exactly in or cm. No negative zero, exponents, commas or fractional notation. |
| `number` | `fieldKey`, `decimal` | Signed decimal string with the same magnitude/scale budget, then the declared count/unitless and decimalPlaces/bounds rules. No negative zero. |
| `text` | `fieldKey`, `text` | NFC plain text bounded by the exact field maxLength, up to 500 code points. A present empty text fails a required field; it is not an absent dimension. |
| `boolean` | `fieldKey`, `value` | JSON boolean true or false. Both are actual values. |
| `select` | `fieldKey`, `choiceKey` | Choice alias owned by that manifest/custom field. Fresh imports select active choices only. |

The fieldKey is an exact manifest alias or declared custom alias. Standard alias order is irrelevant to values. Normalize decimal spelling to its exact numeric canonical form for hashes, including removal of trailing fractional zeroes, while preserving the original supplied spelling/unit in provenance where useful. Conversion never changes semantic identity. The destination version stores parsed branded IDs and the plan's typed value shape, not these external aliases as authority.

Example values for a synthetic manifest with one field of each kind:

```json
[
  {"kind":"length","fieldKey":"f001","decimal":"40.00","unit":"in"},
  {"kind":"select","fieldKey":"f002","choiceKey":"c001"},
  {"kind":"boolean","fieldKey":"f003","value":false},
  {"kind":"number","fieldKey":"f004","decimal":"0"},
  {"kind":"text","fieldKey":"f005","text":"Relaxed fit"},
  {"kind":"length","fieldKey":"custom.back_length","decimal":"60","unit":"cm"}
]
```

This example says nothing about an omitted optional f006. It is missing. Choice c001 is validated against f002's manifest, not a global alias table.

## Closed custom-definition grammar

The array has 0–20 entries. All entries require `key`, `label`, `kind`, `required` and `help`. Label is NFC/trimmed 1–100 code points and must not collide with another displayed label under the existing normalization rule. Help is plain text of 0–500 code points. Required is boolean. Semantics are null and illustrationId is dimension for lengths, null otherwise, assigned by the server. Custom fields occupy a server-owned Custom dimensions section; a CSV cannot set section/node UUIDs or mark a global master field custom.

| `kind` | Additional required properties | Rules |
| --- | --- | --- |
| `length` | `basis`, `displayUnit`, `displayPrecision`, `min`, `max` | Basis body or garment as allowed by the profile, unit in/cm, precision integer 0–6, min/max null or exact bounded decimal strings in displayUnit. Min/max nonnegative when present and min≤max. |
| `number` | `unit`, `decimalPlaces`, `min`, `max` | Unit count/unitless, precision integer 0–6, min/max null or bounded decimal strings. Count requires integer nonnegative bounds and values. |
| `text` | `maxLength` | Integer 1–500. |
| `boolean` | None | The common properties are the complete object. |
| `select` | `choices` | Array of 1–30 objects with exactly key, label, active. Labels 1–100 code points; active boolean, at least one active when required. Choice keys obey the rule above. |

Unknown properties fail. Explicit min/max null is permitted in definitions, while null is forbidden as a value entry. Kind, basis, count/unitless and choice ownership obey the same identity rules as the ordinary editor. Cosmetic labels/help/display precision may change across source versions without creating a new custom identity. Bounds changes still validate every value against that exact version.

```json
[
  {
    "key":"custom.back_length",
    "label":"Back length",
    "kind":"length",
    "required":false,
    "help":"Confirm the measured endpoints.",
    "basis":"garment",
    "displayUnit":"cm",
    "displayPrecision":2,
    "min":"0",
    "max":null
  }
]
```

## Conformance artifact ownership

`pnpm --filter @fitloom/application generate:imports` generates both templates, the concrete body manifest and closed JSON Schemas from the runtime contracts. The [generator](../../../packages/application/scripts/generate-import-artifacts.mjs) formats the JSON output. [Conformance tests](../../../packages/application/test/import-formats.test.mjs) compare every retained artifact with runtime output and validate synthetic valid/invalid examples.

| Artifact | Retained file |
| --- | --- |
| Customer CSV template | [fitloom-customers-v1.csv](../../../apps/web/public/imports/fitloom-customers-v1.csv) |
| Body measurement CSV template | [fitloom-measurements-v1.csv](../../../apps/web/public/imports/fitloom-measurements-v1.csv) |
| Concrete body-core-v1 manifest | [body-core-v1.manifest.json](../../../apps/web/public/imports/body-core-v1.manifest.json) |
| Typed values JSON Schema | [values.schema.json](../../../apps/web/public/imports/values.schema.json) |
| Custom fields JSON Schema | [customFields.schema.json](../../../apps/web/public/imports/customFields.schema.json) |
| Manifest JSON Schema | [manifest.schema.json](../../../apps/web/public/imports/manifest.schema.json) |

These public artifacts contain synthetic examples and the global price-free body schema. Current and earlier garment-specific templates/manifests are protected downloads from the measurement import screen. Each schema key binds to an exact saved source schema and a current reviewed target schema. No tenant garment definitions are written into public artifacts.

Conformance covers every field kind, standard/custom key ownership, false/zero/missing, mixed units, quoted JSON and multiline notes, malformed JSON, unknown properties/keys, choice spoofing, normalized source collisions, two-version profile history, duplicate labels under distinct profile IDs, stale schema mappings, profile-set changes, oversized groups/files/records and formatting-only re-export. File errors, CSV-row errors and logical-group outcomes are separate typed responses. Each row error includes the original 1-based data-row number and safe column/key path without leaking another group's private data.
