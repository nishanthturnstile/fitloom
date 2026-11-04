# Build Three technical findings

Research date: 2026-11-03. Baseline: `390690c`, with customer delivery at `ed33045`. This is source and documentation research. The checks reported by earlier builds were not rerun for this planning task.

## 1. Scope authority

The [roadmap](../../../product/roadmap.md#phase-2-build-the-customer-and-measurement-book) assigns the remaining phase 2 work to measurements, reuse, comparisons, charts, revocable QR cards, and supported customer/measurement imports. [REQ-MEASURE](../../../product/requirements.md#req-measure-versioned-body-and-garment-measurements) also requires custom dimensions, illustrations, photos, archival, provenance, explicit units, and preservation of legacy garment definitions.

The Build Two plan refers to a later reuse/import build without naming its number. The current status names Build Three as next. The complete Build Three plan therefore owns all remaining phase 2 behaviors. It must not stop after basic entry. OCR belongs to phase 5. Customer portal access, anonymous sharing, cross-shop Fit Card import, and cross-phone linking belong to phase 8. Order snapshots are integrated in phase 3; this build establishes an executable price-free capture contract and tests its stability without creating orders.

## 2. Existing paths traced

| Path | Actual source behavior | Build Three consequence |
| --- | --- | --- |
| Customer profile page → server customer adapter → `createCustomerService` → `withScope` → restricted customer SQL | Reads resolve the current identity and concrete tenant/location. Customer and wearer ownership is explicit. | Add the measurement entry inside this route family. Never treat the contact as a wearer automatically. |
| Customer command route → `mutation` → application command → `createCommandExecutor` | Request parsing, origin/body bounds, current authority, actor/scope-bound operation claim, mutation, audit, and result commit are already centralized. | Add domain commands and SQL guards. Do not invent another replay store or put values in durable operation results. |
| Executor `authorize` → claim → replay or `mutate` | Authorization runs on replay. Mutable domain preconditions belong after the replay branch. | Archive/schema/preview-expiry checks cannot break recovery of an already committed operation. Result rehydration still needs current read authority. |
| Retained `app.claim_operation` in migration `0037` | Customer/photo actor/location replay checks use an explicit command-name allowlist. | Extend that allowlist or its reviewed equivalent for every new command family. The generic executor alone does not provide this domain binding automatically. |
| `master-contracts.ts` → `measurementField` and `garmentDefinition` | Five field kinds; 60 garment fields; stable semantic and node IDs; body/garment basis; select choice IDs; explicit bounds; ten known semantics. | Derive value contracts from these schemas. Do not index values by display label or assume every field is numeric. |
| `garment-definition.ts` → `definitionIdentities` and `identityIssues` → independent SQL validator | Meaning changes require new IDs. Cosmetic changes preserve identity. Retired IDs cannot be reused. | Same-node copies may be mapped within a garment lineage. Cross-garment matching needs explicit semantics or mapping. |
| `MasterService` management admission | Management requires master read/manage and rate read. Existing schema-only projections still use master authority. | A separate measurement intake projection must be authorized by measurement permission and omit prices recursively. Reusing the administration endpoint would overgrant staff. |
| `customer-photo-contracts.ts` → `customer-photos.ts` → private-file functions → `private-image.ts` and blob store | CRM purposes have immutable owner metadata, actor-bound staging, normalized images, atomic binding, current authorization, and cleanup exclusions. Workspace functions reject CRM purposes. | Add a measurement-specific purpose and audited attachment rules. Generic files and wearer photos cannot serve as an authorization shortcut. |
| `navigation-guard.tsx` → one registered controller | Dirty, locked, and uncertain state protects native navigation. Reload on restored pages prevents stale private screens. | Use a dedicated full-page measurement editor and aggregate its photo state. Do not nest independent guard owners. |
| `workspace-route-policy.ts` and destination contracts | Customer routes classify only register/new/profile/edit. Switch output has an explicit URL allowlist. | Add measurement-aware breadcrumbs and classification while keeping cross-shop destinations at the customer register. Update both browser and server allowlists together. |
| Workspace role contracts and SQL | Permission enums, dependency resolution, preset grants, and custom-role validation are bounded. `customRoleInput.permissions` currently permits 20 entries. | Adding eight measurement permissions exceeds an all-permissions role's current budget. Raise the bound using the authoritative permission count and align SQL/HTTP/UI limits. Do not silently grant new access to custom roles. |

The source files above are under `packages/application/src`, `apps/web/src/server`, and `apps/web/src/components/workspace`. Retained migrations `0034`–`0039` establish the customer/photo authority. The current journal has 40 retained migrations. Preserve them and append forward migrations.

## 3. Candidate structures

### Candidate A: profile header and immutable complete versions

The caller requests one save with wearer, pinned schema, typed values, provenance, optional attachment references, and an expected profile revision. One transaction validates the full version, inserts it, advances the header, and records audit/result. History reads exact versions. Comparison and capture consume the same immutable projection.

This hides schema validation, unit meaning, parent state, attachment binding, and replay behind a small measurement interface. It matches the existing garment and customer command conventions. A bounded JSONB snapshot is appropriate for a small set of heterogeneous fields. Header/search/history columns remain relational.

### Candidate B: event log and per-field materialized state

The caller appends dimension-change, note-change, schema-change, and attachment events. Reads reconstruct the profile or depend on an asynchronously maintained materialization. This supports fine-grained collaboration but introduces event ordering, projection rebuilds, compatibility between event formats, and partial-state semantics.

Reject Candidate B for this build. No requirement calls for concurrent per-field collaboration or event-stream integration. Immutable complete versions already provide history and reproducibility. Candidate A has fewer caller rules and fits a single local transaction. Keep domain logic together rather than splitting public load/validate/convert/save modules that callers must coordinate.

## 4. Reference behavior accepted or corrected

| Appendix evidence | Adopt | Correction |
| --- | --- | --- |
| Tailorman F020–F025 | Named profiles, illustrated typed fields, progressive detail, custom fields and notes | Use wearer IDs, immutable versions, missing versus false, and numeric conversion when changing units. Never overwrite a saved record or merely relabel values. |
| Tailorman F026–F027 | Reusable measurement selection | Reject live order measurement references. Phase 3 freezes the selected version and schema. |
| Tailorman F028 | Printable customer measurement card | Generate QR locally. Use an opaque revocable card locator with current staff authority, without sending customer data to an external QR service. |
| Tailormate F007–F011 | Separate body/garment entry and dated history, field illustrations | A gender filter can guide discovery, but cannot infer a wearer's gender or prevent authorized garment selection. |
| NoolTech F030–F041 | Garment filters, units, custom dimensions, versions, compare, archive, five reference photos, discard guard | Do not adopt local-storage drafts or an arbitrary 0.1 comparison tolerance. Preserve original decimals, compare exact compatible quantities, and protect private data. |
| Import references and REQ-ONBOARD | Explicit supported-format definitions and row outcomes | No archived evidence establishes a general customer/measurement vendor importer. Specify Fitloom CSV v1, provide fixtures, and reject unsupported formats honestly. |

Reference evidence is code-defined or a limited browser observation, not proof of vendor persistence or security. [The source appendix](../../../references/source_feature_details.md#req-measure-versioned-body-and-garment-measurements) preserves provenance and verification limits.

## 5. Primary external evidence and resulting decisions

| Source inspected | Supported fact | Fitloom design inference |
| --- | --- | --- |
| [NIST conversion factors](https://www.nist.gov/pml/special-publication-811/nist-guide-si-appendix-b-conversion-factors/nist-guide-si-appendix-b9) and [NIST metric conversion card](https://tsapps.nist.gov/publication/get_pdf.cfm?pub_id=958415) | Inch and centimetre quantities use the exact 2.54 factor. | Keep original decimal/unit and derive exact rational comparisons. Round only display values or an explicitly accepted conversion. |
| [PostgreSQL 18 row security](https://www.postgresql.org/docs/18/ddl-rowsecurity.html) | Table owners can bypass ordinary RLS; referential-integrity checks have separate behavior. | Force RLS, restrict function grants, and use owner-qualified composite keys rather than relying on application filters. |
| [PostgreSQL 18 explicit locking](https://www.postgresql.org/docs/18/explicit-locking.html) | Row and transaction advisory locks coordinate concurrent work. | Establish one lock order for parent archive, schema/lifecycle changes, measurement versions, imports, and media. Validate races on real PostgreSQL. |
| [RFC 4180](https://www.rfc-editor.org/rfc/rfc4180.html) | The informational RFC documents CSV quoting, embedded delimiters, and line endings. | Use a maintained parser with strict headers and budgets. Do not split lines or commas manually. |
| [CSV Parse options](https://csv.js.org/parse/options/) | The parser exposes BOM handling and record-size limits. | Evaluate `csv-parse` for bounded server parsing. Pin a verified version only during implementation. |
| [node-qrcode](https://github.com/soldair/node-qrcode) | The maintained project supports local QR generation and error-correction configuration. | Evaluate `qrcode` for server-generated PNG cards. Test decoding the real output. No remote QR service is needed. |
| [W3C complex images](https://www.w3.org/WAI/tutorials/images/complex/) | Complex charts need equivalent descriptive information. | Pair a simple trend chart with the complete accessible value table and state missing values explicitly. |
| [Next.js data security](https://nextjs.org/docs/app/guides/data-security) | Server rendering does not itself authorize data disclosure. | Return narrow authorized DTOs from domain reads before they reach client props. Keep private pages and media uncached. |

These sources inform technical decisions, not tailoring formulas or legal retention rules. The Next.js page currently documents 16.4.4; this checkout pins 16.4.3. No framework upgrade is proposed. Context7 is unavailable, so official pages were used directly.

## 6. Decisions that need explicit acceptance tests

- Body values and garment values have distinct basis. Bust and chest remain distinct. No automatic ease formula exists.
- Saved labels are presentation. Stable node identity, schema lineage, semantics, kind, and basis govern matching.
- The default body schema is versioned and value-free. Wearer height/weight are contextual attributes, never silently copied as confirmed measurements.
- QR cards are authenticated same-shop staff locators in this phase. Expiry and revocation still apply. Customer login, public bearer sharing, and cross-shop import keep phase 8 ownership.
- Copies stay under the same wearer in this phase. New profiles have independent IDs and history. Cross-wearer reuse requires manual entry and is not an automatic action.
- Customer import decisions reuse the customer module's canonical phone normalization, matching, and mutation rules. Measurement imports never match people by phone or name.
- Measurement media have immutable version membership and separately revocable byte access. Cleanup cannot remove a live historical attachment.
- Complete phase 2 acceptance includes import reconciliation and QR revocation. A basic-entry demonstration alone is insufficient.

## 7. Research limits

No migrations, code, dependencies, infrastructure, or development records changed during research. Application behavior is inferred from source plus dated acceptance records. Build Three has no runtime evidence yet. Tailor validation of original templates and illustrations remains necessary before real cutting. Browser screenshots from earlier builds establish their own scope only.

## 8. Independent-review follow-through

The authorized OpenCode Go DeepSeek V4.1 Flash Max review produced [17 findings](../../reviews/phase-2-build-3-measurements-deepseek-findings.md). The lead accepted and corrected all of them in the plan and [import format reference](../../plans/phase-2-build-3-import-formats.md). [The disposition record](../../reviews/phase-2-build-3-measurements-review.md) maps each correction to its future acceptance case. This does not claim the corrected plan received another independent pass.

The source checks clarified these integration constraints: executor access permission is static; interactive customer duplicate limits cannot cover a bulk preview; the customer mutation/review/activity kinds are constrained; claim keys use UUIDv4; future-date validation already uses the shop timezone; master bounds allow 18 integer digits; existing owner grants need a forward backfill; and database statement/transaction timeouts are 10/20 seconds respectively. The revised import protocol owns bounded bulk decisions, profile/version source identity, format-specific commands, persisted random operation keys, private transaction-local mutation seams and a separate authorized recovery read. Body publication, staged photo reservations and immutable card labels/selections now have explicit storage contracts.
