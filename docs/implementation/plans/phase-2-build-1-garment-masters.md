# Phase 2, Build One: garment masters implementation plan

Status: Done locally on 2026-11-02. Increments 1–6 are implemented and verified. See [contract evidence](../evidence/phase-2-build-1-increment-1.md), [persistence evidence](../evidence/phase-2-build-1-increment-2.md), [service/API evidence](../evidence/phase-2-build-1-increment-3.md), [garment UI evidence](../evidence/phase-2-build-1-increment-4.md), [catalog configuration evidence](../evidence/phase-2-build-1-increment-5.md), and the [final acceptance matrix and handoff](../evidence/phase-2-build-1-increment-6.md). Customer/measurement development remains Planned; phase 2 and REQ-MASTER are not complete.
Prepared: 2026-11-01 against repository baseline 9317c14.
Scope: The first build within roadmap phase 2, not the whole phase.

Implement a shop-owned catalog of garments, measurement schemas, services, default rates, and add-ons. A permitted owner or manager can configure what the shop stitches and preview the form that later measurement entry uses. Saving a definition preserves every earlier schema version.

The [requirements](../../product/requirements.md#req-master-garment-measurement-service-and-add-on-configuration), [roadmap](../../product/roadmap.md#phase-2-build-the-customer-and-measurement-book), and [architecture](../../architecture/overview.md) remain authoritative. This plan supplies implementation decisions within those contracts. Names below are proposed new symbols unless identified as existing. Check the current repository before assigning migration numbers.

## 1. Deliver the configuration that measurement entry needs

The owner-facing workflow is:

    Authorized shop workspace
        → Settings → Garments and services
        → Load starter library or create custom garment
        → Configure sections, dimensions, styles, and default rates
        → Preview → Save a new version
        → Later builds use the saved schema for measurements and orders

The first usable result is a shirt, blouse, or trouser definition whose fields survive reload, can be reordered or retired, and remain readable in earlier versions. Users must not repeat shop registration to reach this configuration.

### Scope and requirement ownership

| Capability | Build One result | Later owner |
| --- | --- | --- |
| Standard and custom garments | Tenant-owned starter copies, custom creation, edit, activation, retirement, and standard visibility | Broader real-world template library can grow without schema redesign |
| Measurement configuration | Sections, typed dimensions, labels, required flags, illustrated guidance, ordering, custom dimensions, and immutable versions | Actual wearer values, inch/cm conversion, measurement comparison, and body-to-garment mapping belong to later phase 2 builds |
| Construction choices | Ordered stitch/style groups with selectable options and built-in illustrations | Order-specific choices and design snapshots belong to phase 3 |
| Services and default rates | Standard/custom stitch services, garment-service eligibility, garment base rate, and optional per-service overrides | Quotes, discounts, tax, collections, and invoices belong to phase 3 |
| Add-ons | Named fixed-price additions, garment eligibility, active state, and versioned prices | Applying an add-on to a real order belongs to phase 3 |
| Historical definitions | Explicit version reads, historical rendering, no destructive schema rewrite | Later measurements and orders reference these identities and take their own snapshots |
| Master permissions and UI | Separate read, edit, and rate-read projections under existing workspace authority | Customer/worker projections arrive with their modules |
| Inventory reference data | No stock, material master, readymade size, or material-requirement editor in this build | Roadmap phase 6 owns inventory reference data and requirement quantities |
| Customers, QR cards, imports, OCR, portal | No implementation in this build | Remaining phase 2 builds, phase 5 OCR, and phase 8 portal/sharing |

REQ-MASTER spans multiple phases. Do not mark the entire requirement or phase 2 complete after Build One. Keep production stages, package pricing, gallery management, user-supplied image uploads, and subscription/deployment work outside this implementation.

## 2. Reuse the foundation rather than create a second command path

The following facts were checked in the actual repository.

| Existing artifact | Current behavior | Required integration |
| --- | --- | --- |
| packages/db/src/index.ts | withScope uses one acquired connection, transaction-local identity/scope, and location admission | Execute every master read and command within that scope. Tenant IDs in request JSON are not authority |
| packages/application/src/commands.ts | Command<P,R>, current-identity authorization before replay, request hashes, expected versions, transactional audit/outcome/outbox, bounded database retries | Define named master commands using createCommandExecutor. Keep mutations local to the transaction |
| packages/application/src/workspaces.ts | Shared identity-backed service, SQL result parsing, safe category mapping | Add a separate createMasterService with the same ownership pattern; do not grow workspace administration into the garment domain |
| packages/db/migrations/0018_private_files.sql | Existing and future Owner presets get file permissions; custom-role permissions use an explicit whitelist | Add master permissions to existing owners, future-owner preset installation, and the current delegation whitelist |
| packages/application/src/workspace-contracts.ts and package exports | Dedicated browser-safe Zod contract subpath | Add a browser-safe ./master-contracts export without importing Node, database, or secret modules |
| packages/application/src/decimals.ts | Decimal strings, unitPriceInput with 18 integer and 6 fractional digits, INR development fixture | Add a nonnegative rate refinement. Do not use positiveMoneyInput for optional or zero defaults |
| apps/web/src/server/workspaces.ts | Current session, origin check, safeRoute, privateJson, bounded JSON mutations at 16 KiB | Reuse these guards with a narrowly configurable body limit for master definition saves |
| apps/web/src/app/workspaces/[tenant]/[location]/ | Protected workspace shell and permission-aware controls | Link to a dedicated settings page. Keep the workspace selector and identity behavior |
| packages/db/scripts/migrate.mjs | Advisory-locked migration execution and retained-history hash verification | Append reviewed SQL and metadata. Never edit applied migrations or use schema push |
| Private-file foundation | Workspace/location attachments, private JPEG/PNG normalization and revocation | Use bundled illustration IDs in this build. A master does not gain cross-location file access through a raw file UUID |
| Existing local tests and pnpm validate | Guarded fitloom_test database, real roles, serial suite ownership with explicit concurrent scenarios | Extend these checks using synthetic fixtures, preserving fitloom_dev and existing uploads |

There are no garment/customer/measurement domain modules at this baseline. The workspace currently proves foundation operations; it is not an operational dashboard. Preserve the existing development-only workspace admission guard. Replacing it or deploying the app is separate work.

## 3. Fix the main design decisions before implementation

### Keep a relational identity with immutable version documents

Use a stable garment row and append-only garment-version rows. Store the bounded schema document as JSONB, with relational columns for ownership, version identity, rate values, and references to other master identities. Use explicit arrays for section, field, group, and option order.

Alternatives considered:

| Design | Benefit | Cost or failure mode | Decision |
| --- | --- | --- | --- |
| One mutable shop-wide JSON settings document | Very small initial implementation | Every edit conflicts with unrelated garments; unsafe historical references; poor tenant-qualified relationships | Reject |
| Normalize every versioned field, option, label, and section into separate tables | Fine-grained relational queries and constraints | Many joins and publication writes for a form always saved/rendered as a whole | Reserve for demonstrated cross-schema query needs |
| Stable relational identities plus bounded immutable version documents | Small domain interface, atomic saves, straightforward historical rendering | Requires explicit JSON validation and relational extraction of references | Select |

JSONB is not itself a schema validator or an immutability mechanism. Validate at the application boundary and again in the restricted persistence function. The database rejects mutation/deletion of saved version rows independently of the UI.

### Treat catalog ownership as tenant-wide and authority as location-specific

Definitions are shared configuration within one shop tenant. Every request still supplies a concrete authorized location. A user with master edit permission at that location edits shared shop configuration, and the UI says so. Do not add branch-specific rates or All Locations admission to this build. Future branch overrides require an explicit owning design in phase 7.

Keep a created-at location on version metadata for audit provenance, not as the visibility filter for the shared schema. Never interpret a null location as permission to browse other shops.

### Separate schema history from current service and add-on choices

Service and add-on identities have their own immutable revisions. Garment versions reference stable eligible service/add-on IDs, with saved display labels for historical schema previews. Their relational binding rows enforce tenant-qualified relationships.

Current pickers resolve eligible IDs to their current active service/add-on versions. Retiring a service or add-on prevents new selection but does not invalidate old bindings or old schema reads. Renaming a service updates the current picker; an earlier garment preview retains its saved label. An add-on price edit creates a new add-on version and affects later quotes only. It does not create new garment versions.

Garment base rates and per-service rate overrides belong to the garment version. Service names carry no independent global price. Resolve the offered rate as a per-service override when set, otherwise the garment base rate, otherwise unset. Do not add both amounts. Add-ons are separate future quote components. Phase 3 must snapshot the resolved garment, service, add-on, and rate versions before confirmation.

### Save directly to a new immutable version

Keep unsaved edits in client memory. Save validates and appends a complete version, then advances the garment's current pointer atomically. There is no server draft/publish approval workflow in Build One. A failed save preserves the form.

Lifecycle changes update the stable header's expected version without rewriting content. A definition edit increments both the header edit version and the content revision. A repeated successful operation key returns the original version. A stale edit with a new operation key returns a conflict.

## 4. Define the data model and invariants

The proposed tables are:

| Table | Important columns and constraints |
| --- | --- |
| app.master_catalog_state | tenant_id primary key, version, hide_standard_garments, hide_standard_services, starter_bundle_version, updated_at |
| app.garments | id, tenant_id, origin standard/custom, nullable template_key, active, reserved normalized_name, current applicability, sort_position, version, current_version_id, created_at |
| app.garment_versions | id, tenant_id, garment_id, revision, format_version, definition JSONB, nullable base_rate numeric(24,6), currency, author_id, created_location_id, operation_id, created_at |
| app.garment_schema_identities | tenant_id, garment_id, node_id, node_kind field/section/group/option, immutable semantic signature, optional owning choice/group ID, created_revision, nullable retired_revision |
| app.garment_version_services | tenant_id, garment_id, garment_version_id, service_id, position, saved_label, nullable rate_override numeric(24,6); currency inherited from garment version |
| app.garment_version_addons | tenant_id, garment_id, garment_version_id, addon_id, position, saved_label |
| app.master_services | id, tenant_id, origin, nullable template_key, active, normalized_name, sort_position, version, current_version_id |
| app.master_service_versions | id, tenant_id, service_id, revision, label, author_id, created_location_id, operation_id, created_at |
| app.master_addons | id, tenant_id, active, normalized_name, sort_position, version, current_version_id |
| app.master_addon_versions | id, tenant_id, addon_id, revision, label, amount numeric(24,6), currency, author_id, created_location_id, operation_id, created_at |

Use UUID primary identities and explicit NOT NULL declarations for required values. Give tenant-owned identities UNIQUE(tenant_id,id). Version rows also have UNIQUE(tenant_id,parent_id,id) and UNIQUE(tenant_id,parent_id,revision). Parent current-version pointers reference the full tenant/parent/version key, preventing a pointer to another garment or service in the same tenant.

Create parent rows with a temporary null pointer within the publication transaction. A deferred constraint trigger rejects commit without a valid current version. Historical version rows use tenant-qualified foreign keys to their parent. Do not use cascading deletes on retained identities or versions.

Additional invariants:

1. Reserve trimmed, case-normalized names per tenant and master kind, including inactive records. Restore an existing record or choose a different name. Display names retain the user's spelling. Make app.normalize_master_name authoritative in SQL for both stored uniqueness and prefix queries. Specify NFC normalization, trim, and ASCII case folding with deterministic translate behavior; preserve non-ASCII letters instead of promising full linguistic case folding. The application sends the name without a second authoritative normalization implementation. Test combining marks, Tamil labels, and ASCII case variants.
2. Standard garments/services have a non-null template key unique within the tenant and kind. Custom records have no template key. Starter origin is provenance, not a live link to a global row.
3. Version rows and their service/add-on binding rows are insert-only. Triggers reject UPDATE and DELETE. The only mutable version-related state is the stable header/current pointer and the schema identity registry's one-way retirement marker. A restricted insert path extracts bindings from the validated document in the same transaction, preventing disagreement between JSON references and relational references.
4. A field UUID is scoped to one tenant and garment. Reusing it cannot change its kind, semantic identity, or measurement basis. Rename, required status, guidance, bounds, and order can change in a new version. A meaning/type change requires a new field UUID.
5. Once a field disappears from a saved version, it becomes retired. It cannot silently reappear under that identity. Copying an old schema for correction gives retired fields new IDs and records the source version. Earlier version documents remain intact.
6. Within a version, section, field, group, and option IDs are unique. A section reference must exist in that version. Style/choice option IDs stay stable across label edits and are never derived from labels. Removed IDs cannot be reassigned to a different meaning. Use the schema identity registry for lineage checks across every node kind; compare the incoming document with the current version and look up incoming IDs in the registry, without scanning every historical document on each save. Option ownership and group selection kind cannot change under an existing ID. Moving an existing field between sections is allowed.
7. Eligible service/add-on references exist in the same tenant. New or changed bindings require active records. Derive unchanged inactive carry-forward from the locked current garment version on the server. Never trust a client carry-forward flag. Retain the saved label and rate override exactly for an inactive binding; changes require removal or an active replacement. Detail projections expose current bindingState active/retired so the editor can show a notice. An unrelated schema edit can preserve a binding retired after the form loaded.
8. Foreign-key and uniqueness errors must not disclose another tenant's names or identity existence.
9. Rates are nullable when unset. An explicit zero is distinct and allowed in this configuration build. Negative values, exponents, non-finite values, more than 18 integer digits, or more than 6 fractional digits fail before any numeric cast. Store and transmit rates as canonical six-place decimal strings.
10. Garment/add-on version currency is NOT NULL with CHECK currency = 'INR'. Service overrides inherit garment-version currency. Base rates and overrides may be null; an add-on amount is required and zero is allowed. CHECK every non-null numeric value against both zero and the finite eighteen-integer/six-fractional maximum, excluding NaN, in addition to validation before casting. Every created_location_id has a tenant-qualified location foreign key. These are configured defaults, not posted money, quotes, or accounting entries.
11. Retirement/hiding never deletes history. Both active state and standard-visibility settings affect new-selection queries; explicit authorized historical reads ignore those selection filters.
12. Record actor, creation location, operation identity, revision, and timestamp on every new version. The existing command audit stores field names and version metadata, not full definition/value dumps.

Create indexes for tenant/name lookup, tenant/origin/active/order/id lists, tenant/applicability/order/id lists, tenant/parent/revision history, schema-registry ownership, and child service/add-on references. Extract current applicability into the garment header in the same save transaction as the immutable document. Review referencing indexes because PostgreSQL does not create them automatically. Do not add JSON GIN or fuzzy-search indexes until a real supported query needs them.

## 5. Specify schema documents and their validation

Use a versioned format with formatVersion = 1. Zod strict objects and discriminated unions are the authoritative browser/application contract; infer TypeScript types rather than hand-maintain parallel interfaces. Parse SQL results too. Use branded garment, version, service, add-on, and field IDs at application boundaries.

The document contains label, category, applicability, garment icon ID, ordered sections, ordered fields, ordered construction groups, eligible service IDs, eligible add-on IDs, and guidance. Persist rate values and extracted bindings relationally in the same transaction. The published query reconstructs one canonical output; do not keep independently editable copies of rates in both JSON and numeric columns.

Applicability is descriptive metadata: masculine, feminine, unisex, or unspecified. Category is a bounded editable label. Neither field prevents a future wearer from using the garment. They are picker filters, not identity/access rules.

### Field variants

| Kind | Properties beyond shared identity, label, section, required, help, and illustration |
| --- | --- |
| length | basis body/garment, displayUnit in/cm, displayPrecision 0–6, optional min/max expressed as decimal cm strings |
| number | unit count/unitless, decimalPlaces 0–6, optional decimal-string min/max; count requires zero decimal places |
| text | maxLength 1–500 |
| boolean | No numeric bounds, units, or choices |
| select | Ordered choices with stable ID and label, single selection |

All field kinds carry nullable semanticId, validated against a registry that declares compatible kind and basis. Custom fields default to null. The semantic signature contains only the immutable attributes below. Its hash is an implementation detail, not a hash of the full editable node.

| Node | Immutable identity attributes | Editable attributes in a new version |
| --- | --- | --- |
| Field | kind, semanticId, length basis, number unit | Label, help, required, illustration, section, order, bounds, displayUnit, displayPrecision, decimalPlaces, maxLength |
| Section | Node kind and garment ownership | Label and order |
| Construction group | Node kind, single/multiple selection kind | Label, help, required, illustration, and order |
| Option | Node kind and owning select-field/group ID | Label, illustration, and order |

Option ownership determines whether its namespace is a field choice or construction choice. Number count always requires decimalPlaces = 0. Changing display precision does not rescale historical values or change a unit. A semantic kind, basis, unit, or ownership change requires a new node ID.

Length is the only inch/cm-convertible kind. Its unit policy is explicit; no value is stored in Build One. Canonical range metadata uses cm, so later entry converts compatible units before comparing bounds. Bounds use plain decimal strings with at most 18 integer and 6 fractional digits; length/count bounds are nonnegative, count bounds are integers, and max must be at least min. Do not infer bust/chest equivalence from labels. Semantic IDs come from a small documented registry such as body.chest.circumference and garment.chest.circumference; custom dimensions use their field UUID and null semantic ID. A mapping between body and garment values is absent until explicitly configured in later phase 2.

Shared labels are 1–100 trimmed characters. Help text is at most 500 characters. Garment/service/add-on names are 1–100 characters. There are at most 10 sections, 60 fields total, 12 construction groups, 30 options per select/group, 20 eligible services, and 30 eligible add-ons per garment. Sections/groups/options have bounded labels and IDs. A garment can have no measurement fields; this is a valid configuration, and the preview states that no dimensions are required.

Construction groups use ordered single-choice or multiple-choice variants with stable group/option IDs, required flags, bounded guidance, and illustration IDs. A required group needs at least one active choice. Do not mix construction options into body dimensions or attach arbitrary price formulas to them.

Validate empty labels, duplicate identities, missing sections, invalid semantic/basis combinations, invalid numeric ranges, unsupported illustration IDs, duplicate service/add-on bindings, and excess structure with field-specific errors. Unknown variants or keys fail; never silently normalize them into text fields.

Use one authoritative aggregate definition budget: at most 64 KiB measured by octet_length of the validated definition's JSONB text representation in UTF-8. Validate that exact representation in SQL before insertion and return a definition-path validation issue on overflow. The browser shows an estimated size budget; it does not promise that all per-collection maxima can be reached together. Every valid definition must satisfy both the individual bounds and the aggregate budget. Test large nested definitions at the actual SQL boundary, including JSON escaping and separator expansion.

Use a dedicated 128 KiB request cap, including the invocation envelope, for master-definition saves and starter operations. The client sends compact JSON and checks the whole request size before dispatch. Keep 16 KiB as the default for other mutations. Reject oversized streams early with the existing timeout behavior. A definition budget error is a bounded validation issue; a raw transport overflow is HTTP 413.

Return safe validation issues as bounded paths and messages, at most 30 issues. The existing executor's generic validation error is insufficient for this editor: pre-parse with the same strict contract in the master service to produce issues, then pass normalized data through the executor, preserving its authoritative validation and canonical hashing. Add optional issues to the master error response without changing unrelated error responses.

### Illustrations

Bundle a small original SVG asset set and a manifest of allowed illustration IDs for garment, dimension, and construction guidance. Use static trusted assets with text alternatives. A custom field can choose a generic dimension illustration or no illustration. Do not accept SVG markup, filesystem paths, arbitrary URLs, or private-file UUIDs in a master document. Give absent images a readable label fallback.

The starter graphics explain field direction; they are development aids, not certified cutting instructions. Measurement photos and customer images remain with later measurement entry.

## 6. Add permissions and safe projections

Introduce these exact permission names:

| Permission | Capability |
| --- | --- |
| masters.read | Read garment schemas, services, eligible add-on identities, and history without prices |
| masters.manage | Create/edit/retire/reorder masters and change configuration |
| masters.rates.read | Read base rates, overrides, and add-on amounts |

Existing and future Owner presets receive all three. Manager and Staff presets receive no new master permissions automatically. An owner can create a permitted manager role through the existing delegation UI. A management role must also include masters.read and masters.rates.read; enforce these dependencies in custom-role creation and service/SQL mutation checks. Do not imply journal, receipt, operator, or file permissions.

Update the current permission whitelist and preset installer in a new migration, including a backfill for existing Owner preset roles. Preserve all existing grants. The existing UI renders permissions the actor currently holds; verify the new names appear and supply readable labels.

All reads require current masters.read at the request location, active session/principal/tenant/membership, and normal workspace admission. Price fields are physically absent from schema-only projections, including list rows, version history, defaults, add-on summaries, errors, and command results. Never fetch a priced record into a client component then hide its price controls.

Use separate explicit schema-only and priced output schemas/functions. Historical versions follow the same current permission checks. A read-only master user cannot replay an editor's mutation or retrieve its priced result. Authorization and projection checks occur before operation replay.

Force RLS on all new tables. Ordinary web/worker roles receive no direct INSERT/UPDATE/DELETE grants. Follow the established restricted-function pattern: SECURITY DEFINER, empty search_path, schema-qualified relations, REVOKE PUBLIC execution, active-operation owner/command checks on mutations, and explicit current permissions. Read functions also check identity/scope/projection. Grant only named functions to the web runtime; no new worker function access is required yet. Retain migrator policies rather than assuming SECURITY DEFINER automatically respects a caller's RLS.

## 7. Define commands, queries, and concurrency

Expose one createMasterService factory with pool, resolveIdentity, and optional observe dependencies. It owns strict input/output parsing, authorized scoped reads, and named command execution. Routes perform transport work only. Do not add a generic user-selected SQL/function dispatcher.

### Named commands

| Command kind | Payload beyond operation envelope | Atomic result |
| --- | --- | --- |
| masters.starters.install | bundleVersion, expectedCatalogVersion | Catalog initialized if absent, missing starter identities installed once, IDs and resulting catalog version |
| garment.save | Discriminated create/update input; update includes garmentId and expectedVersion; normalized definition, baseRate, service overrides | garmentId, garmentVersionId, revision, header version |
| garment.lifecycle | garmentId, expectedVersion, active | Header version and active state, retaining definition |
| masters.reorder | kind garment/service/addon, movedId, beforeId or null, expectedCatalogVersion | New catalog version after an atomic move within that kind |
| masters.visibility | expectedCatalogVersion, hideStandardGarments, hideStandardServices | New catalog version and settings |
| service.save | Discriminated create/update; label; update includes ID and expectedVersion | Service identity, immutable revision identity, header version |
| service.lifecycle | serviceId, expectedVersion, active | Header version and active state |
| addon.save | Discriminated create/update; label, amount, currency; update includes ID and expectedVersion | Add-on identity, immutable revision identity, header version |
| addon.lifecycle | addonId, expectedVersion, active | Header version and active state |

All writes explicitly require current masters.manage, masters.read, and masters.rates.read in both service authorization before replay and the restricted SQL mutation. Losing any permission returns access denied, never a schema-only save that substitutes null for hidden prices. Base rate and every override key are required in a garment-save payload, with an explicit null for unset values. No absent-price-to-null default is allowed.

Derive actor, tenant, and location from admitted operation context, never from arbitrary payload fields. Every successful command returns minimal IDs/state plus catalogVersion, including an unchanged token when only content changed. Results are saved by the executor, so replay returns the original token and clients refresh state after conflicts. Use jobs: [] unless an actual later external effect is introduced.

Record commands audit their stable entity as garment, master_service, or master_addon, with header previous/next versions. Catalog commands use entityKind master_catalog and entityId = the tenant UUID, which identifies its catalog-state row. Use catalog previous/next versions, including equal versions for a no-op install. Audit broad field names only, with no field UUIDs, labels, or prices.

Create/update inputs form a discriminated union; do not combine optional ID and expected-version fields. Use server-generated master/version UUIDs. New field/group/option UUIDs can originate in a client draft for stable reordering, but validate their ownership and lineage before accepting them.

### Locking and idempotency

Create or lock the tenant's catalog-state row first for every master mutation. When it is absent, insert with ON CONFLICT DO NOTHING and then SELECT FOR UPDATE so concurrent first writes serialize. Serialize this small administrative write domain intentionally. Then lock affected headers in deterministic kind/UUID order, check expected versions, validate references and lineage, append immutable rows, and advance current pointers. Rate and lifecycle races use the same lock order. Readers do not take these write locks.

The catalog-state version is an order/settings token. Creates, actual active-state changes, reorders, visibility changes, and starter installations that change state increment it. An existing record's content, label, field, or price edit does not increment it; those changes use the header/content versions. No-op lifecycle/visibility/reorder requests retain the token. Reorder uses movedId/beforeId against the complete current catalog under lock, not a browser page's partial ordered list. Cross-kind or missing anchors fail validation/conflict; move-to-end uses null. Recompute dense positions for that kind atomically. Catalog writes are small and infrequent; avoid per-garment locking complexity until this design has a measured bottleneck.

Check catalog expected versions for visibility, initialization, and reorder; check header expected versions for record edits. A catalog change unrelated to a garment does not reject a valid garment edit solely because its catalog version changed.

Reuse the executor's operation identity, request hash, rollback contract, and serialization/deadlock retry bound. Keep one operation key and identical normalized payload while retrying an uncertain response. Generate a new key after an actual form change. Do not reuse a key for changed semantic input.

Keep current identity, permission, and projection admission before operation replay. Keep expected-version, current lifecycle, and mutable reference checks inside the new-operation mutation path, after replay lookup. Otherwise a valid replay could fail because the original successful command advanced the version or a later edit retired a dependency. Audit broad field names such as fields, services, and rates rather than listing all field UUIDs, preserving the existing thirty-field audit bound.

### Queries

Provide bounded page, current-detail, version-history, and exact-version queries. Preview is a pure renderer of the unsaved document or an exact-version read, not a separate server preview endpoint. Page filters are kind, search prefix, active/inactive/all, origin standard/custom/all, applicability, and visibility available/all. The default register predicate is active AND available under hide-standard settings. Selecting visibility = all reveals hidden standard entries. Future selection queries always honor active state plus hide-standard settings.

Use the existing page shape items/total/nextOffset, a maximum of 50 rows, and an offset bound of 100000. Query ordering is sort_position then ID. Counts and pages share the same authorized filters. Search is a bounded normalized prefix, not an unindexed substring promise. Version history orders revision descending and returns metadata only; fetch one selected version document separately. Do not return every prior schema inside a list row.

Keep a bounded collection-version value with register results so reorder and visibility mutations can send expectedCatalogVersion. First use with no state row returns a virtual empty catalog at version 0; GET does not seed or write.

GET /masters/catalog is the settings header's authoritative read. Return catalogVersion, hideStandardGarments, hideStandardServices, starterBundleVersion or null, supportedBundleVersion, and installedTemplateKeys, bounded to the known bundled template keys. It requires masters.read and contains no prices. An uninitialized catalog returns false hide flags, null installed bundle, an empty installed-key list, and version 0.

Map SQLSTATE 42501 to access, 22023/23514 to validation, P0003 to expected-version/reference conflict, and safe same-tenant 23505 name conflicts to conflict. Unexpected database errors are temporary failures with correlation IDs in safe diagnostics. Never return raw constraint names or foreign values.

## 8. Design the settings interface

Add a protected page at /workspaces/[tenant]/[location]/settings/garments. Link it from the existing workspace when masters.read is present. Keep the current shop and location visible, with a short note that these definitions apply to the whole shop.

Use three tabs: Garments, Services, and Add-ons. The garment tab has a searchable paginated register and a detail/editor view. Show status, standard/custom origin, schema revision, and a default rate only when permitted. Provide empty, loading, saving, unavailable, access-changed, conflict, and retry states.

The garment editor has these sections:

1. Name, category/applicability, icon, and active state.
2. Ordered sections and measurement fields, with kind-specific controls.
3. Ordered construction groups and choices.
4. Eligible services, base default rate, and optional service-rate overrides.
5. Eligible add-ons.
6. Form preview and saved-version history.

The preview uses the same pure renderer and contracts later measurement entry can reuse. It labels itself as a preview and never saves customer values. Required fields display their markers and guidance. Render an explicit zero-field state.

Use Move up/Move down buttons for fields, sections, groups, and choices, preserving focus and announcing the new position. Dragging can be added as an enhancement. Catalog rows use move-before/move-to-end commands that work across pagination; do not require all records to be loaded.

Save publishes one complete version. Cancel discards local changes after an explicit discard decision. Warn on app-owned links, tabs, workspace switch, and refresh/tab close while dirty. Browser beforeunload has platform limits; register it only while dirty and do not claim guaranteed protection on browser/process termination.

Offer Copy from previous version as a local draft operation. It preserves the current version until Save, generates fresh identities for retired fields/options, shows the source revision, and never moves the current pointer backward. No Reset entire shop or destructive delete action is required.

Historical garment views show the saved schema and saved binding labels. They show no historical add-on amount and compute no total. A separate, clearly labelled Current add-on prices panel may resolve current add-on versions for a rate-authorized user. This distinction follows the independent add-on price lifecycle.

For services and add-ons, offer create/edit/deactivate/restore, standard visibility for services, and current/history views. Standard entries are tenant copies and can be customized without changing another shop. Disable write controls for read-only roles; server checks remain authoritative.

On a 409 conflict, preserve local edits, explain that another save won, and offer Reload saved version or return to editing. Do not silently overwrite or apply a last-write-wins merge. On an uncertain network outcome, expose retry of the same operation key.

Use the existing React/Tailwind styling and accessible native controls. No new form, drag/drop, icon, or state library is required to implement this plan. If implementation establishes a real need, evaluate and pin that dependency within the relevant task.

## 9. Define starter fixtures and installation behavior

Ship a code-owned starter bundle named tailoring-core-v1. Include Shirt, Blouse, and Trouser plus standard services New stitching and Alteration. Include a small ordered set of illustrated length fields and construction choices sufficient to exercise every supported renderer kind through test fixtures. Do not infer production rates.

All starter rates are unset. Example charge amounts appear only in synthetic tests. Suggested demonstration dimensions include shirt chest/shoulder/sleeve/length, blouse bust/waist/shoulder/sleeve, and trouser waist/hip/inseam/outseam. Give labels explicit body/garment basis and individual semantic IDs. A tailor must confirm actual operational definitions; these examples do not establish universal cutting standards.

On an empty catalog, editors see Load starter library and Create custom garment. Installation is an explicit command, not a write during page rendering. It atomically installs missing template keys, preserving existing IDs and all user edits. Replay creates nothing twice. Applying the same bundle again is a no-op apart from the recorded command result; do not advance catalog version when no state changes.

If a custom garment already reserves a starter's display name, return a bounded collision report and roll back the whole installation. Let the owner rename the custom item or proceed with custom configuration. Never silently match by name, merge it, or partially install a bundle.

A future bundle version cannot overwrite existing standard copies automatically. New defaults require an explicit compare/copy action in later work. Installation is available to existing shops as well as newly registered shops, so onboarding does not need to be rerun or extended with mandatory garment setup.

## 10. Establish module ownership and transport routes

| Location | Planned responsibility |
| --- | --- |
| packages/db/src/schema.ts | Drizzle declarations for the new relational envelope and references |
| packages/db/migrations/next retained SQL files | Tables, grants, RLS, immutable triggers, lineage validation, safe query/write functions, owner permission backfill |
| packages/application/src/master-contracts.ts | Browser-safe strict input/output schemas, brands, field discriminated union, page/error contracts |
| packages/application/src/masters.ts | Named commands, createMasterService, safe SQL parsing, projection selection, database error translation |
| packages/application/src/garment-definition.ts | Pure definition normalization/validation, identity comparison, rendering model, shared semantic registry |
| packages/application/src/master-starters.ts | Versioned original development starter bundle and manifest references |
| packages/application/src/index.ts and package.json | Server exports plus a browser-safe ./master-contracts subpath |
| apps/web/src/server/masters.ts | Request-bound service using workspacePool and current identity |
| apps/web/src/server/workspaces.ts | Preserve existing helper defaults; add bounded mutation options/error issues only where needed |
| apps/web/src/app/workspaces/[tenant]/[location]/settings/garments/ | Server page, register, garment editor, field/choice controls, preview, history, and service/add-on editors |
| apps/web/src/app/api/workspaces/[tenant]/[location]/masters/ | Protected bounded query routes and explicit named mutation dispatch |
| apps/web/public/illustrations/garments/ | Trusted bundled SVG assets referenced only through an allowlisted manifest |
| packages/application/test/masters.test.mjs | Real command, authorization, version, projection, and concurrency tests |
| packages/db/test/ | Migration, runtime grant, constraint, and immutability checks using the existing suite pattern |
| packages/application/scripts/web-smoke.mjs | Real optimized-app route checks for master operations and failure states |

Keep pure schema/rendering utilities browser-safe. Do not create a new workspace package just for this domain. If a public helper subpath is needed by the preview, export a narrow pure subpath rather than importing the server entry.

Proposed endpoints under .../masters:

- GET /catalog for the catalog settings, order token, and starter installation state.
- GET /garments, /services, /addons for bounded registers.
- GET /garments/[id] and /garments/[id]/versions with a paginated metadata result.
- GET /garments/[id]/versions/[versionId] for one authorized immutable schema.
- GET /services/[id]/versions and /addons/[id]/versions plus exact revision endpoints for their promised history UI.
- POST /commands/[action] for a fixed allowlist mapped to the named command definitions above.

The route action selects a compiled command, never a database function name supplied by the caller. Route tenant/location parameters supply requested scope, then current membership authorizes it. GET query keys and POST bodies are strict and bounded. Return private/no-store on success and failure. Mark protected pages dynamic; retain existing origin/content-type checks and body deadlines. Do not add Server Actions alongside this route pattern.

## 11. Implement in dependency order

These are work increments, not calendar estimates or approval gates. Resolve integration problems within the increment. Do not start customers or orders while implementing this plan.

### Increment 1: contracts, semantic registry, and test fixtures

1. Add strict schemas and inferred types for fields, sections, construction groups, rates, commands, page results, schema-only/priced projections, and validation issues.
2. Specify formatVersion 1, stable identity rules, input bounds, canonical rate representation, and development currency.
3. Create original starter/edge-case fixtures, illustration IDs, and the pure preview rendering model.
4. Verify invalid combinations fail with specific issue paths. Cover unchanged IDs after renaming and fresh IDs after semantic changes.

Result: one authoritative definition contract usable by both the server and editor, with no database or secret import in its browser-safe exports.

### Increment 2: persistence, isolation, and permission admission

1. Add Drizzle tables and append reviewed migrations using the existing runner/journal conventions.
2. Add keys, reference indexes, deferred current-pointer checks, immutable-version triggers, lineage validator, and tenant-qualified binding rows.
3. Add master permissions for existing/future owners and bounded custom-role delegation. Preserve unrelated grants.
   Update the Owner preset table and permission dependencies in docs/architecture/workspaces.md. At this baseline, new migrations start at 0023; recheck the retained journal before assigning numbers.
4. Implement master persistence functions with strict JSON/decimal validation before casts and no direct runtime mutation.
5. Implement explicit schema-only/priced read functions and protected historical reads.

Result: real database tests prove new rows cannot cross tenant boundaries, raw runtime SQL cannot modify history, and invalid domain input cannot bypass application validation through named SQL functions.

### Increment 3: commands, initialization, queries, and HTTP

1. Implement createMasterService and named commands using the existing executor.
2. Add starter installation, expected-version conflicts, collection-version/reorder logic, and safe reference/lifecycle rules.
3. Add current/detail/history/page queries and projection selection.
4. Add server binding and fixed route allowlist with scoped 128 KiB save limits and bounded issue responses.
5. Verify retries, lost-response replay, changed payload conflicts, rollback, and current permission rechecks through real HTTP.

Result: a permitted owner can create and retrieve masters through the actual API; a reader receives no prices; denied and unavailable requests produce truthful errors.

### Increment 4: garment schema register, editor, preview, and history

1. Add the workspace settings entry point and protected page.
2. Implement garment creation/editing, sections, fields, construction groups, and image/text fallbacks.
3. Implement ordered controls, preview, saved history, copy-from-history, and lifecycle actions.
4. Add dirty-form decisions and persistent local form state through validation, conflicts, and network failures.
5. Exercise desktop and narrow-screen layouts, keyboard controls, focus, and native browser close limitations.

Result: configure schema sections, save, reload, edit, and inspect both schema versions with their original labels and order. Eligibility and rate controls arrive in Increment 5. Until then, load complete priced detail only for fully authorized editors and preserve unchanged base-rate and binding values in the save payload. Do not default the not-yet-rendered controls to empty arrays or null. Keep these sections read-only in this increment.

### Increment 5: services, rates, add-ons, and starter setup

1. Add service/add-on editors, eligibility controls, inactive-reference notices, and visibility settings.
2. Add base/override rate controls that distinguish unset and zero, plus INR labels.
3. Add first-use starter installation and collision/replay feedback.
4. Verify a service rename and add-on price edit update current choices without rewriting garment schema history.

Result: the settings workflow covers every Build One capability without exposing order confirmation or implying that a configured default is a quote.

### Increment 6: regression verification and implementation evidence

1. Complete the acceptance matrix below using isolated synthetic shops and real PostgreSQL roles.
2. Extend optimized-app HTTP verification and perform the actual UI scenarios using the available browser workflow when implementation requests browser work.
3. Run pnpm validate and inspect the migration/schema diff. Rerun only checks affected by subsequent fixes.
4. Record actual commands, outputs, unresolved issues, migration IDs, and screenshots where appropriate in the implementation evidence.
5. Update implementation status and this plan only after the behavior is verified. Update docs/development/application.md with master commands, projections, decimal refinements, and test evidence, and docs/development/web.md with the settings route. Keep later phase 2 work Planned.

Result: Build One is ready for customer/measurement development to consume its stable schema contracts.

## 12. Verify behavior with the real application and database

| Scenario | Evidence required |
| --- | --- |
| Existing and newly registered shop | Owner permissions work in both; loading starters does not repeat registration or overwrite any existing record |
| Standard/custom lifecycle | Create, rename, deactivate, restore, and hide standards; archived definitions remain explicitly readable |
| Schema history | Save v1 with a field, rename/reorder it in v2, retire it in v3; exact v1/v2 remain unchanged and current reads use v3 |
| Identity protection | Reusing a retired field ID or changing its kind/basis/semantic ID fails in application and direct SQL; copying history gives appropriate fresh IDs |
| Typed configuration | Exercise all five field kinds and construction choice variants; unknown keys, duplicate IDs, invalid sections, and incompatible bounds fail visibly |
| Ordering and pagination | More than 50 garments, stable counts, search prefix filters, cross-page moves, stale collection version, hidden-standard discovery |
| Rates | Unset versus zero, six-place decimals, service override precedence, extra precision, negatives, exponent/NaN, overflow, and unsupported currency |
| Services and add-ons | Retire referenced service, keep historical reads, exclude new selection, rename current label, update add-on price without rewriting history |
| Tenant/location authority | Two tenants and two synthetic locations; shared definitions visible only with authorized location grants; cross-tenant binding/current pointer rejected |
| Read projections | A masters.read-only role has no price properties in any page/detail/history/preview response; management/rate dependencies and revoked replay are enforced |
| Privilege boundary | Web role cannot mutate tables directly; missing context and SECURITY DEFINER function calls cannot broaden scope; worker receives no accidental grant |
| Concurrency and replay | Two edits from the same header version yield one success and one conflict; lost-response retry returns the same revision; changed-payload key conflicts |
| Transaction rollback | Inject failure before audit/outcome completion and verify no version, pointer, binding, or catalog-state change commits |
| Starter installation | Empty initialization, exact replay, second operation no-op, simultaneous initialization, name collision full rollback, install with edited standard copies |
| Request bounds | 16 KiB unchanged elsewhere, master request/normalized/stored size boundaries, too-large/slow body, bounded validation issue count |
| Version constraints | Cannot delete or update versions as runtime; wrong-parent pointers fail; parent with no current version cannot commit |
| UI behavior | Dirty navigation, keyboard reorder/focus, inline errors, empty schema, conflict retains input, network retry reuses key, read-only controls, narrow screen |
| Dependency boundaries | Browser export has no Node/database imports; no new stock, billing, customer, order, or deployment work |
| Catalog state/token | Empty-catalog settings render; an unrelated content save preserves the order token; lifecycle advances it; every result returns it; stale membership changes require refresh |
| Filter correctness | Applicability/visibility filtered total matches all authorized pages, using the extracted current attributes |
| Semantic signature | Cosmetic edits retain IDs; kind/basis/unit/option-owner changes require fresh IDs; precision edits do not rescale historical values |
| Inactive carry-forward | Retire a service after form load; unrelated save retains its locked-current binding; crafted inactive additions or rate changes fail |
| Revoked rate access | Losing rates.read blocks a full save and replay without erasing or returning prices |
| Catalog audit identity | Visibility, reorder, and no-op initialization resolve to master_catalog with the tenant UUID and correct previous/next token |
| Name normalization | NFC combining-mark, Tamil, ASCII case, prefix-search, and inactive reservation cases use the same authoritative SQL function |
| Aggregate budget | Per-item bounds plus aggregate SQL text budget are enforced together with bounded errors and transport overflow distinguished |

Use the existing guarded fitloom_test credentials and test advisory lock. Never reset fitloom_dev or mutate the user's shop to create acceptance evidence. Check migrations both from a clean test database and after the retained foundation migration set. Verify another tenant's immutable rows remain unchanged.

Final verification on 2026-11-02 passes `pnpm validate`, including 12 database and 146 application tests, lint, types, build, and optimized HTTP checks. The additional real Chrome workflow also passes. The [increment 6 evidence](../evidence/phase-2-build-1-increment-6.md) maps every scenario above to executable checks, logs, screenshots, migration review, and explicit verification limits.

## 13. Preserve the handoff to later builds

Later customer/measurement work can consume a stable garment ID, exact schema-version ID, typed ordered fields, semantic identity/basis, and explicit units. It stores wearer values separately and must not mutate a saved garment version. Historical schema access is a normal supported API, not a fallback to current fields.

Later phase 3 takes immutable measurement, garment/schema, service, add-on, and resolved price snapshots. A new catalog rate does not reprice a confirmed order. No measurement is cut-ready merely because its garment template exists.

Rate precedence is null-coalescing, so an explicit zero override beats a nonzero base rate. Reject a negative-zero input spelling before decimal normalization, matching the stated nonnegative input policy. Phase 5 standalone alterations may add independent service pricing through a separate priced-service contract.

Later measurement entry must define its own narrow intake projection and permissions. Do not grant every Staff member the complete master administration register merely to render a measurement form.

Retain migration and document format versioning. Unknown format versions produce an unsupported-version error rather than silently rendering incomplete fields. Implement the renderer for every format that the application has persisted before introducing a new format.

## 14. Track assumptions without blocking local development

| Decision | Development choice in this plan | When to revisit |
| --- | --- | --- |
| Real template dimensions and construction details | Original shirt/blouse/trouser fixtures with explicit semantics | A tailor validates operational templates before real cutting use |
| Currency and zero defaults | INR, nullable or explicit nonnegative rate; no actual quote | Phase 3 confirms real currency, tax, invoice, and zero-charge policy |
| Branch ownership | Tenant-wide masters edited through a concrete granted location | Phase 7 branch-specific configuration policy |
| Illustrated guidance | Trusted bundled images and textual alternatives | Custom uploaded guidance requires a separate safe domain-file design |
| Field equivalence and fit allowances | No inferred mappings or calculated ease | Later measurement mapping design |
| Published schemas | Every Save appends a complete immutable version | Revisit only if a real multi-editor draft approval requirement appears |

These choices allow implementation now. None requires a new approval gate for this plan or creates a mandatory production deployment activity.

## 15. Research evidence and review record

Repository sources were inspected at baseline 9317c14, including the actual command executor, workspace service/routes, decimal helpers, migration runner, permission functions, and test fixtures listed above. Product behavior comes from Fitloom requirements, not competitor defaults.

The frozen [reference feature evidence](../../references/source_feature_details.md#req-master-garment-measurement-service-and-add-on-configuration) supplies context: Tailorman F032–F038, Tailormate F136–F142 and F150–F153, and NoolTech F235–F236. These entries are largely code-defined evidence with explicit verification gaps. They justify examining custom fields, ordering, services, and add-ons; they do not prove server authorization or require copying competitor assets, prices, data models, or unsafe deletion behavior.

Official technical sources checked on 2026-11-01:

- [PostgreSQL 18 row security](https://www.postgresql.org/docs/18/ddl-rowsecurity.html): runtime/owner separation, forced policies, and integrity-check bypass boundaries.
- [PostgreSQL 18 constraints](https://www.postgresql.org/docs/18/ddl-constraints.html): composite references, null handling, cross-row limits, and referencing indexes.
- [PostgreSQL JSON types](https://www.postgresql.org/docs/18/datatype-json.html): JSONB structure and ordering constraints.
- [PostgreSQL numeric types](https://www.postgresql.org/docs/18/datatype-numeric.html): exact numeric storage and scale rounding before a post-cast check.
- [PostgreSQL explicit locking](https://www.postgresql.org/docs/18/explicit-locking.html): row locking and consistent lock order.
- [Drizzle migrations](https://orm.drizzle.team/docs/migrations), [custom migrations](https://orm.drizzle.team/docs/kit-custom-migrations), and [RLS](https://orm.drizzle.team/docs/rls): retain reviewed SQL and check installed stable declarations before adopting documented helpers.
- [Zod schema API](https://zod.dev/api?id=discriminated-unions): strict objects, discriminated unions, and inferred boundary types.
- [WCAG dragging alternatives](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html): offer non-drag reorder controls.

See [research findings](../research/build-one/technical-findings.md) for facts, implications, and limits. Keep the installed stack rather than adding upgrades to this feature. Document schema/version choices are design decisions inferred from Fitloom's invariants, not prescriptions made by those sources.

The full-file DeepSeek V4.1 Flash review completed after repairing the OpenCode Go connection. See [the original reviewer findings](../reviews/phase-2-build-1-deepseek-findings.md) and [the review record and finding dispositions](../reviews/phase-2-build-1-garment-masters-review.md). The primary agent revised the plan in response; those revisions have not received a second independent review. A finding cannot silently enlarge this build into customers, orders, inventory, or production infrastructure.
