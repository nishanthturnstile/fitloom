# Build One plan: DeepSeek review findings

Plan: [Phase 2, Build One: garment masters](../plans/phase-2-build-1-garment-masters.md).
Reviewer: DeepSeek V4.1 Flash through OpenCode Go (repaired connection; connection state is not part of these findings).
Date: 2026-11-01. Baseline read: repository at `9317c14`.
Scope: planning artifact only. No application code, migration, test, or UI for this build exists, so nothing below is evidence of runtime behavior. Every statement is about the plan's requirements and design.

Verdict: **revise before implementation**. Three blockers, five high findings, six medium findings, and a set of optional suggestions. The design direction is sound; the defects are concentrated in size limits, catalog-version semantics, increment ordering, and a few under-specified contracts.

Sources compared: roadmap phase 2 and requirement-ownership table; REQ-MASTER and REQ-MEASURE; `docs/architecture/workspaces.md`; `docs/development/application.md`; `packages/application/src/commands.ts`; `packages/application/src/decimals.ts`; `apps/web/src/server/workspaces.ts`; `packages/db/migrations/0001_isolation.sql`, `0003_command_journal_contracts.sql`, `0004_command_safety.sql`, `0018_private_files.sql`, `0022_bounded_foundation_lists.sql`; `docs/implementation/research/build-one/technical-findings.md`; the existing workspace page and action routes.

---

## Blockers

### B1. Field, option, and byte caps contradict each other

Location: §5 lines 154 and 160; command caps in §7 line 228.

The plan allows 60 fields, 30 choices per select field, 12 groups, and 30 options per group, then caps a normalized definition at 64 KiB and the whole request at 128 KiB. Those maxima cannot coexist.

Failure scenario: a garment with 20 select fields of 30 short choices plus 60 fields of 250-character help text is valid under every declared per-field bound but serializes well above 128 KiB (roughly: 600 choices at ~80–170 bytes each is 48–102 KiB, plus 15 KiB of help and field envelopes). The editor rejects a definition that satisfies every documented limit, and the failure is a transport-size error rather than a field-specific issue. Tightening the byte cap instead makes the field/option caps meaningless.

Fix: derive the byte budget from the structural maxima and state it once. Either lower choice counts (for example 10 choices per select, 20 options per group, 300-character help) so the worst case fits 64 KiB, or raise the normalized cap to at least the computed worst case and the request cap proportionally (with a test that constructs the maximal valid document and saves it). State exactly which serialization the DB check measures.

Related, same line 160: the plan says SQL checks "stored JSONB text byte size" and warns about expansion, but does not cap the discrepancy. JSONB text adds separators and spaces, so a 64 KiB normalized document can exceed a 64 KiB JSONB check. Fix: one measured form (normalized compact UTF-8 bytes computed in the insert function) or a DB threshold explicitly above the app cap.

### B2. Catalog version conflates ordering with content, and most mutations do not return it

Location: §3 line 94; §7 lines 196–207 (command results), 214–218, 230; §9 line 269.

`masters.reorder` and `masters.visibility` check `expectedCatalogVersion`, but the plan also increments the catalog version for every content save ("Content saves also increment it for consistent collection freshness", line 216) and for creates. No `garment.save`, `service.save`, `addon.save`, or lifecycle result returns the new catalog version (only install, reorder, and visibility results mention one). `masters.starters.install` returns the original result on replay.

Failure scenario: two owners have the settings register open at catalog version 7. Owner A saves a help-text change on one garment (catalog becomes 8). Owner B clicks Move up on a service; the client still holds 7 and the server rejects with a version conflict even though service ordering did not change and B's intended move is valid. B cannot resolve the conflict meaningfully, and every save by anyone invalidates everyone's pending reorder. Separately, `garment.lifecycle` changes `active`, which changes the default register's membership, yet its payload and result carry no catalog version, so the plan does not say whether reorder's ordering set can be stale after a retirement.

Fix: split the token. Keep `orderVersion` (membership and order: create, lifecycle active change, reorder, visibility, starter install) and a separate `contentVersion` (any definition save). Reorder and visibility check `orderVersion`; definition saves do not. Return the advanced token from every command that advances it, including on a normal (non-replay) starter install, and document that replay returns the original result, so clients must refresh after any conflict. Define lifecycle's effect explicitly.

### B3. Increment 4 depends on Increment 5

Location: §8 line 245 (editor section 4: "Eligible services, base default rate, and optional service-rate overrides") versus §11 lines 340–357.

Increment 4 builds the garment editor, preview, and history. Its editor includes service eligibility and rate controls, but services, add-ons, and the service/add-on editors are Increment 5. Increment 4's stated result ("configure a garment through the UI, save, reload, edit it") cannot be met with the documented six-section editor, and Increment 4 cannot test rate display or eligibility.

Fix: either move `service.save`/`addon.save` and the eligibility/rate read model into Increment 3–4, or split Increment 4 into 4a (schema sections: fields, groups, preview, history) and 4b (eligibility, rates, add-ons) after the service/add-on editors, with the editor's section 4 disabled and labelled in 4a. Update the Increment 4 result sentence to match.

---

## High

### H1. The applicability filter has no relational or indexed source, and contradicts the index decision

Location: §7 line 226 (page filters include applicability); §4 line 132 ("Do not add JSON GIN … indexes until a real supported query needs them"); §7 line 228 (counts and pages share filters).

Applicability is described in §5 line 140 as part of the schema document, not a header column (§4 line 103 lists no applicability). A supported, counted, paginated filter is exactly the "real supported query" the index rule reserves. Without a column or index, every register page and count must scan and parse the current version JSON for the tenant.

Failure scenario: with a few hundred garments the filter works but slows; with the documented 100 000 offset bound and page/count agreement it degrades and the plan's "review referencing indexes" posture is violated. If the implementer instead filters client-side, `total` and `nextOffset` become wrong for a filtered view.

Fix: extract `applicability` (and `category` if it is ever filtered) into `app.garments` or a small current-attributes row under the save lock, indexed by tenant/applicability. Otherwise remove applicability from the bounded filter list and document that it is not a server filter. Add an acceptance scenario that checks filtered counts across pages.

### H2. No read exposes catalog state, hide flags, or the starter bundle version

Location: §7 lines 196–202 and 224–230; §8 line 238 and 257; §9 line 269; §10 lines 297–303.

The UI must render hide-standard toggles (Services tab), decide whether to offer "Load starter library", and send `bundleVersion` to `masters.starters.install`. The only carrier mentioned is a "bounded collection-version value with register results", with no read for `hideStandardGarments`, `hideStandardServices`, `starterBundleVersion`, or whether template keys are already installed. Register results are also the wrong place for shop-level settings.

Failure scenario: on the Services tab before any garment exists, the client has no register page to read the settings from, cannot render the current hide state, and cannot construct a valid visibility or install payload. The implementer invents an ad hoc endpoint or embeds the settings in an unrelated projection.

Fix: add `GET /masters/catalog` (or `masters.state`) returning `catalogVersion`/`orderVersion`, both hide flags, `starterBundleVersion`, and installed template keys (bounded), authorized by `masters.read`. Use it as the single source for the settings header and the starter CTA, and pair it with B2's returned tokens.

### H3. The "immutable semantic signature" is never defined, so lineage checks are unverifiable

Location: §4 lines 105, 122, 124; §5 line 152.

Line 122 allows rename, required status, guidance, bounds, and order to change; line 124 forbids kind, semantic identity, basis, option ownership, and group selection kind from changing. The registry stores an "immutable semantic signature" without saying what it covers. An implementer cannot tell whether `decimalPlaces`, `unit` (count/unitless), `displayPrecision`, `maxLength`, min/max, illustration, or category are inside the signature.

Failure scenario A: the signature hashes the whole field node. A legitimate help-text edit or reorder then changes the signature, and the save is rejected as an identity change unless every edit mints new IDs — which contradicts line 122 and would churn the schema on every cosmetic change. Failure scenario B: the signature covers only kind and semantic ID, so a `number` field changes `unit` from `count` to `unitless` or `decimalPlaces` from 0 to 6 under the same ID. Later measurement values silently change meaning, and the retirement/copy path never fires.

Fix: add a table in §5 listing, per node kind, the immutable attributes (kind, semantic ID, basis, owning parent, group selection kind, option ownership) and the mutable attributes (label, help, required, guidance, bounds, decimal places, display precision, order, illustration). State that the signature is a hash over the immutable subset only, and that changing `unit` for a `number` field counts as a semantic change requiring a new ID. Add an acceptance case for each side.

### H4. Inactive-binding carry-forward must be server-derived, and the read model must expose binding state

Location: §4 line 125; §3 lines 84–86; §8 line 238 (the editor "identifies them and offers removal/replacement").

Bindings live in insert-only rows created per version, so every save re-inserts every binding. Line 125 says "new or changed bindings require active records" and "unchanged inactive bindings may be retained", but the plan never says how "unchanged" is established, nor what the detail projection returns so the UI can show an inactive notice. §6 line 184 removes prices, not activeness, but no projection field is specified.

Failure scenario A: a service is retired after the editor loads. The user changes an unrelated field and saves. If SQL requires every inserted binding to reference an active service, the save fails and the user must remove the service before making any schema change — the opposite of "optional". Failure scenario B: if the client asserts carry-forward, a crafted payload can introduce an inactive service that was never in the previous version, so the new immutable version claims an eligibility that never existed.

Fix: define carry-forward as a server comparison against the locked current version (`garments.current_version_id`) for the same tenant and garment, never a client flag. Reject only additions or changed labels/overrides on inactive records. Add `bindingState` (active/retired, and whether it is retained from the prior version) to the detail read so the UI can render the notice without a second query. Add a save scenario where a referenced service is retired between load and save.

### H5. A complete-version save can silently erase rates when the editor cannot see them

Location: §3 line 92 ("Save … appends a complete version"); §6 lines 180, 184; §7 line 208 ("All writes require masters.manage and the read dependencies").

The save payload is the whole definition including `baseRate` and per-service overrides, and price fields are physically absent from projections for anyone without `masters.rates.read`. Line 180 says a management role must also hold the two read permissions, but line 208's "the read dependencies" is too vague to enforce, and a role's grants can change while an editor page is open.

Failure scenario: an owner edits a role to drop `masters.rates.read` while another user has the editor open with previously loaded rates. The next save from a refreshed client carries no rate fields. If the command maps absent to null, every base rate and override on that garment is erased by a schema-only edit; the audit records only "rates", so the loss is not obvious. If the command rejects, the user gets an unexplained validation failure for a change that has nothing to do with prices.

Fix: state that a rate-bearing save requires current `masters.manage` plus `masters.rates.read` in service and SQL checks, and that a save without rate visibility is refused rather than treated as unset. Alternatively add an explicit "preserve rates" mode that copies the current version's rate columns under the same lock and records that choice in the audit. Add an acceptance scenario that a `masters.read`-less/`masters.rates.read`-less actor cannot erase or observe prices.

---

## Medium

### M1. Add-on amounts are not snapshotted in garment versions, unlike service labels and rate overrides

Location: §3 lines 84–88; §4 line 107; §8 line 247.

`garment_version_addons` stores `saved_label` only. Add-on amounts live on `master_addon_versions`, so a historical garment version's "eligible add-ons" render with current prices, while service labels and per-service `rate_override` are frozen with the version.

Failure scenario: an owner opens revision 3 of a garment to check what was offered at that time. The add-on list shows today's amounts, possibly after a large price change, while every other historical element is faithful. If any screen or export computes a preview total, it reports a number that never existed for that revision. Phase 3 snapshots its own prices, but Build One's own historical view is misleading.

Fix: either add `amount`/`currency` snapshot columns to `garment_version_addons`, or state in the plan and UI that historical garment views show current add-on amounts and never compute a total. The second is cheaper but must be explicit.

### M2. Name normalization is implemented twice, so collisions and search can disagree

Location: §4 line 119.

"Define one deterministic normalization function, use it in both database writes and lookups" cannot be literally true across the TypeScript boundary and a SQL unique index. The plan does not say which side is authoritative for writes versus search.

Failure scenario: a Tamil or full-width label normalizes differently in `normalizeMasterName()` and in the SQL index expression. The application accepts a name, the insert fails with a generic 23505 that the plan maps to a name conflict with no useful message, or a prefix search returns zero rows for a record that exists. A locale or Unicode-normalization change in one implementation silently forks the namespace.

Fix: make SQL authoritative (`app.normalize_master_name`), use it in the unique index and in the prefix read function, and have the application send the raw name (normalizing only for display hints). If the application must pre-check, call the SQL function through a read. Add Unicode, combining-mark, and case-folding fixtures plus an inactive-name reservation case.

### M3. Catalog-level commands have no natural audit entity, but the executor requires one

Location: §7 lines 196–207 and 208; `packages/application/src/commands.ts` lines 36–44 (`entityId: uuid` required, `entityKind` required); `app.finish_operation` requires both.

`masters.visibility` changes `app.master_catalog_state`, whose primary key is `tenant_id`, not a UUID row id. A no-op starter install and a reorder change no single garment either. The plan does not define `entityKind`, `entityId`, `previousVersion`, or `nextVersion` for these commands.

Failure scenario: an implementer passes the tenant id as `entityId` with `entityKind='tenant'`, so the audit trail records a tenant change for a catalog edit and the "audit entity" no longer identifies what changed. A no-op install has nothing to point at, so a synthetic UUID is invented and cannot be joined back to a master.

Fix: add an `id uuid` to `app.master_catalog_state` (or define `entityKind='master_catalog'` with `entityId` = tenant id and document the choice), and add a small command-to-audit-entity table to §7 covering all ten commands, including previous/next version semantics (header version for record edits, order/catalog version for catalog commands).

### M4. Length unit policy is named but not represented, and semantic identity is limited to length

Location: §5 lines 146, 152, 249.

The length variant has `basis`, `semanticId`, `displayPrecision`, and cm bounds, but "Its unit policy is explicit" refers to a policy that does not exist as a field. The preview must label bounds, and later measurement entry needs a default entry unit. Separately, only length carries `semanticId`, so `number` (count/unitless) and `text` dimensions cannot participate in later semantic mapping even though REQ-MEASURE asks for semantic fields and body-to-garment mapping.

Failure scenario: Build Two renders the preview and must guess whether a shoulder bound is cm or inches, or must add a shop-level setting that the schema contract does not carry. A custom `number` dimension such as "sleeve opening" cannot be mapped later because it has no semantic slot.

Fix: add an explicit `displayUnit` (or documented always-cm rule) to length fields and show it in the preview, and hoist an optional `semanticId` to all dimension variants with the same immutability rule. Keep the "no inferred bust/chest equivalence" constraint.

### M5. Rate/currency column constraints and cross-column currency equality are left open

Location: §4 lines 104–111, 127–128.

`base_rate` is nullable but the nullability of `currency` is unstated; `master_addon_versions.amount` is not described as nullable or required, while line 127 says rates are nullable when unset; `garment_version_services` carries its own `currency` with no rule that it equals the garment version's; no CHECK enforces INR or non-negativity at the database boundary; `created_location_id` has no stated tenant-qualified foreign key.

Failure scenarios: an add-on version with a null amount is rendered as "unset" by one read and as zero by another; a binding override saved with a different currency than the garment passes application validation and later resolution mixes currencies; a negative or non-finite value reaches a cast because a future migration path bypasses the app refinement.

Fix: require `currency` NOT NULL everywhere, add `CHECK (currency = 'INR')` and non-negativity/scale checks in SQL, require add-on `amount` (zero allowed) or state explicitly that it is nullable and how reads render it, drop `currency` from bindings and require equality with the garment version, and give `created_location_id` a `(tenant_id, id)` foreign key to `app.locations`.

### M6. Documentation and migration bookkeeping are not in the increments

Location: §10 line 280 ("next retained SQL files"); §11 lines 359–365.

The repository is at migration `0022`; the plan's factual table cites `0018` as the current permission source (still accurate for `create_custom_role`, but not the latest migration). Adding `masters.*` makes the preset table in `docs/architecture/workspaces.md` (lines 19–23) wrong and leaves `docs/development/application.md`'s command table without the new commands. Increment 6 updates only the status and the plan.

Failure scenario: after implementation, an operator or agent reads the architecture contract and grants or explains permissions from a table that omits `masters.manage` and `masters.rates.read`; the next delegation change uses a stale whitelist description.

Fix: name the intended migration numbers (0023+), and add explicit doc updates to Increment 2 (workspace preset table, permission labels) and Increment 6 (application command/decimal tables, status). Keep the existing "verify the repository before assigning numbers" caveat.

---

## Optional suggestions

- O1. §4 line 105 uses one `option` kind for select-field choices and construction-group options. Distinguish them (for example `choice` versus `group_option`) or state that the owning parent determines the namespace, so ownership and retirement checks cannot confuse the two.
- O2. §3 line 88: state that resolution is null-coalescing, so an override of `0` beats a base rate of `500`, and add that case to the rates acceptance row. A truthiness-based implementation would silently fall through.
- O3. `unitPriceInput` accepts `-0` and canonicalizes it to `0.000000`; either reject the negative-zero spelling or note that it normalizes (minor, but the plan says negatives fail).
- O4. §10 line 289 names the route `commands/[action]` while the existing convention is `actions/[action]`. Pick one for consistency; not a correctness issue.
- O5. §7 line 226 says the default register is "all active origins" while hidden-standard records are "discoverable through an explicit filter". These two sentences imply different defaults. State the default predicate (active AND not hidden-standard, or all active) and the exact filter value that reveals hidden records.
- O6. §7 line 226 lists "preview queries" but §8 line 249 says preview uses the pure client renderer. Remove one or define what the preview query returns.
- O7. §3 line 88 and §4 line 108 give services no independent price, which is defensible for tailoring packages but means phase 5 standalone alterations will need a priced-service capability. Record that handoff in §13 so it is a known extension, not a redesign surprise.
- O8. Later measurement entry by intake staff will need schema reads; the plan grants `masters.read` only to owners and custom roles. Note in §13 that Build Two must define its own entry projection or a separate permission rather than granting the full master register to Staff.
- O9. §4 line 121 makes version rows insert-only by trigger, including for the migrator. Document the reviewed procedure for a future data correction (disable the trigger inside a reviewed migration) so it is not discovered as an outage.
- O10. §4 line 130 says audit records field names; the existing audit schema caps `changedFields` at 30 and requires a single entity. The plan's "broad field names such as fields, services, and rates" is compatible, but say explicitly that no field UUIDs or labels enter the audit.

---

## Verification gaps to add to §12

The matrix is strong; add rows for the defects above so the fixes are observable:

- Catalog token: save content, then reorder from a register loaded before the save, and confirm the reorder succeeds (B2).
- Applicability filter: filtered counts equal the sum of pages (H1).
- Catalog state read: hide toggles, bundle version, and installed keys render before any garment exists (H2).
- Identity signature: cosmetic edits succeed with the same ID; kind/basis/unit changes fail with a new-ID path (H3).
- Inactive carry-forward: retire a referenced service between load and save; an unrelated save succeeds and the notice renders (H4).
- Rate protection: an actor who loses `masters.rates.read` cannot erase or read rates (H5).
- Audit entity: visibility, no-op install, and reorder produce a resolvable audit entity (M3).
- Reserved names: Unicode/combining-mark duplicate and search-prefix cases (M2).

---

## Sound decisions and accepted limitations

Sound:

- Relational identities plus bounded immutable version documents, with validation at the application boundary and again in the restricted persistence function, and triggers that reject mutation independently of the UI.
- Rejecting a single mutable JSON settings document and rejecting full per-field normalization; the middle path matches how the form is saved and rendered.
- Tenant-wide definitions edited through a concrete authorized location, with location recorded as provenance only and a UI statement that definitions apply to the whole shop. This avoids inventing an All-Locations admission the foundation does not have.
- Separating service/add-on identity revisions from garment versions, storing garment rates on the garment version, resolving override → base → unset without summing, and leaving add-ons as separate future quote components.
- Insert-only version and binding rows with a restricted extraction path, so JSON references cannot disagree with relational references.
- Reusing `withScope`, the command executor, operation identity, request hashing, audit/outcome/outbox, and bounded retries rather than creating a second command path; authorization and projection checks before replay, expected-version checks after replay.
- Three permissions with physically separate schema-only and priced projections, plus a dependency from management to both read permissions; no fetch-then-hide in the client.
- Starter bundle as tenant copies installed by an explicit command, with collision rollback, no partial install, no automatic overwrite of user edits, and no invented production rates.
- Decimal discipline: nonnegative refinement beside `unitPriceInput`, six-place canonical strings, validate before cast, nullable versus explicit zero, INR only, no exponent/NaN.
- Native controls, focus preservation, discard decisions, explicit conflict states, and no new UI dependency for dragging.

Accepted limitations (record them, do not treat as defects):

- A manager granted permission at one location changes shop-wide configuration affecting every location; branch-specific rates and schemas wait for phase 7. This build assumes the single initial location.
- No server draft/publish approval; every save publishes a version.
- Bundled public static illustrations only; no uploads, and the assets are non-sensitive.
- INR-only defaults that are not quotes, invoices, or accounting entries.
- Starter garment semantics are development fixtures pending tailor validation.
- Master writes serialize per tenant on the catalog row; revisit only on measured contention.
- Planning-only: no runtime behavior, migration, API, or UI was executed or verified by this review.
