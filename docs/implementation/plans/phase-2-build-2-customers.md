# Phase 2, Build Two: customers and wearers

Status: Complete locally on 2026-11-03. Increments 0–5 deliver customer authority, searchable register/navigation, create/edit and duplicate recovery, wearers/lifecycle/activity, private photos, complete local regression and measurement-consumer handoff. See [Increment 5 acceptance and handoff](../evidence/phase-2-build-2-increment-5.md). Next is Build Three measurements. The research baseline and earlier review history below remain dated planning evidence.

Build a customer book that a tailor can use immediately after entering an authorized shop. Find or create the customer, identify the people being stitched for, and maintain their contact details and preferences. Build Three adds measurement entry against those wearers and the completed garment masters.

This plan implements the customer portion of [roadmap phase 2](../../product/roadmap.md#phase-2-build-the-customer-and-measurement-book). Follow [REQ-CRM and REQ-MEASURE](../../product/requirements.md#customer-and-measurement-requirements), the [architecture](../../architecture/overview.md), and the existing [workspace contracts](../../architecture/workspaces.md). Requirement P1/P2/P3 groupings are broader than roadmap phase numbers.

## 1. Establish the actual starting point

Research baseline: commit `3cdd9cf`, inspected on 2026-11-02. Recheck the checkout and unfinished UI work before implementation. The following distinguishes existing behavior from proposed customer behavior.

| Area | Evidence inspected | Consequence for this build |
| --- | --- | --- |
| Identity and shop setup | `packages/application/src/setup.ts`, workspace contracts, implementation status | Reuse verified identity, resumable provisioning, tenant/location selection, and current permission checks. Do not repeat shop registration. |
| Garment masters | [Build One final acceptance](../evidence/phase-2-build-1-increment-6.md), browser contracts, master service and scoped HTTP route | Completed locally. Stable garment/version IDs and semantic field identities are ready for later measurements. No customer values exist in these definitions. |
| UI migration | [UI v3 plan](ui-foundation-v3-implementation-plan.md), [evidence](../evidence/ui-foundation-v3.md), current components | Shared shell and UI increments 2–4 are verified. Increment 5 has incomplete runtime verification. Home readiness and final UI acceptance remain unfinished. |
| Home | `apps/web/src/app/workspaces/[tenant]/[location]/page.tsx` | Current root is a transitional tools overview. It is not the mockup's completed readiness Home or an operational dashboard. |
| Navigation | `workspace-navigation.tsx`, `workspace-topbar.tsx`, `workspace-switcher.tsx`, `navigation-guard.tsx` | Current navigation is catalog-focused. Exact-path selection, hard-coded labels/search, and suffix-preserving switches need customer-aware rules. |
| Writes and storage | `commands.ts`, `errors.ts`, `masters.ts`, retained SQL migrations | Reuse strict contracts, authorized command replay, expected versions, atomic audit, restricted SQL functions, and forced RLS. |
| Private images | `files.ts`, migrations `0018`, `0020`, and `0022` | Image normalization/storage exists. Current workspace-file permissions do not implement customer/wearer photo ownership. Add that boundary before attaching customer photos. |
| Customer domain | Application source, web routes, schema, current status | Customers, wearers, customer routes, duplicate decisions, and CRM permissions are not implemented. |

### Runtime and UI observations

The shared T3 preview opened the canonical account URL, but two snapshot attempts returned `Preview automation snapshot timed out after 15000ms`. A separate local Playwright/Chrome session then used the existing demo fixture without printing credentials. The sign-in request returned HTTP 404; the account screen remained visible with an `Unexpected token '<'` JSON parsing error. The first attempt timed out waiting for `/workspaces` after 30 seconds. No authenticated customer or master workflow was freshly verified in this planning run. The cause of the runtime 404 is undiagnosed; do not describe it as a proven source-code authentication regression.

Retained synthetic-fixture captures were inspected directly: [desktop workspace shell](../evidence/screenshots/ui-foundation-v3/increment-2/shell-1440.png) and [390px catalog cards](../evidence/screenshots/ui-foundation-v3/increment-3/register-cards-390.png). The newer editor structure was traced through current source and increment 4 evidence. These establish design context, not a fresh runtime pass.

The later **Follow-up: manual test app available** entry in the UI v3 evidence reports recovery: a healthy stack, matching container source, successful demo sign-in/workspace responses, and an authenticated catalog response. Preserve the earlier 404 as a dated observation, not a claim that sign-in is still broken. That follow-up does not close the pending increment 5 full-suite acceptance. Recheck current runtime at implementation start.

Complete UI v3 increments 5–7 in that plan's owning work, including readiness Home and final regression coverage, before starting customer Increment 2. Treat that completed shell as the baseline. UI v3 owns existing shell/Home changes until this handoff; Build Two then owns `workspace-route-policy.ts`, the customer extension, the new switch resolver, and its navigation regressions. Do not edit those shell components concurrently in two workstreams. If canonical sign-in fails again, diagnose that current failure before browser acceptance. Preserve development data and credentials. No database reset or deployment work is a prerequisite for planning or contract design.

## 2. Follow one progressive workflow

```text
Sign in → select shop → Home → Customers → search
                                           ├─ found → open profile
                                           └─ new → basic details → duplicate decision → save
                                                                            ↓
                                                 Profile → named wearers → wearer details
                                                                            ↓
                                                 Build Three: garment → measurement version
```

The common case is one contact who is also the wearer. Family and business contacts can have multiple wearers. A customer is a shop's business relationship; a wearer is the person whose physical details and later measurements are recorded. Neither entity is a login or a global customer identity.

Use a dedicated register and routable profile. Keep basic creation short. Reveal address, billing details, preferences, photos, and wearer demographics as optional sections. Do not turn customer creation into a second shop-onboarding wizard.

Compare the two implementation shapes before coding:

| Shape | Consequence | Decision |
| --- | --- | --- |
| One large customer page with register, editable profile, wearers, and future measurements always mounted | Mirrors the old catalog's crowded register/editor arrangement. Direct links, browser Back, and future order preselection become ambiguous. | Reject. |
| Shared workspace shell, routable register/profile, and one form controller per active editor | Creates clear URLs and return paths. Small wearer dialogs keep a single task in context. Existing guarded document navigation remains usable. | Adopt. |

Use the installed `base-vega`/`mist` design, Base UI components, Hugeicons, and existing font tokens. Reuse `PageHeader`, `Field`, `Input`, `Button`, `Alert`, `Empty`, `Dialog`, `Sheet`, and avatar fallback components where installed. Do not initialize a new preset or add a general form framework for this build.

## 3. Define the scope and later handoffs

| Capability | Build Two delivery | Later owner |
| --- | --- | --- |
| Customer register | Authorized name/mobile search, stable pagination, active/archived filters, manual segment and tag filters, desktop rows and mobile cards | Future reporting adds business-derived segmentation. |
| Customer lifecycle | Create, edit, archive, restore, duplicate decisions, safe profile history | Privacy erasure/exports remain their own later workflows. |
| Contact/profile | Name, country-aware optional phone, optional email, structured address, GSTIN, notes, preferences, tags, manual segment | Invoicing validates its real-document policies in phase 3. |
| Wearers | Explicit self wearer, additional named wearers, edit, archive, restore, optional personal details and photos | Build Three owns measurement values and immutable versions. |
| Customer history | CRM-created/edited/archived/restored events and wearer events | Measurements in Build Three; orders/payments in phase 3; delivery in phase 4; alterations in phase 5; app links in phase 8. |
| Photos | Optional customer face/avatar and wearer face/body images, private preview, replacement, removal, fallback | Measurement-specific attachments belong to Build Three. |
| Loyalty | No loyalty field or behavior in this build | References, points, balances, discounts, accrual, and redemption remain phase 7, matching roadmap ownership. |
| Navigation | Home entry, Customers section, breadcrumbs, context-aware search, safe switching, guarded return paths | Orders and production join when implemented. |
| Measurement handoff | Stable customer/wearer IDs and active-selection rules | Build Three supplies the executable entry route and price-free garment intake projection. |
| Imports and QR cards | No customer import or QR execution in this build | Phase 2's later reuse/import build supplies dry-run, source IDs, duplicate reconciliation, and revocable cards. |

Customer creation must work without installed garments or configured rates. Customers must not receive a customer sign-in, connection, marketing subscription, or sharing grant automatically. OCR, bulk campaigns, merge, hard delete, orders, financial totals, subscriptions, stock, and deployment are outside this build.

## 4. Repair navigation as part of the customer journey

Use `W` for `/workspaces/[tenant]/[location]`.

| Current behavior | Required change | Validation |
| --- | --- | --- |
| Catalog is the only domain destination | Add **Customers** under Work. Keep Garments, Services, and Add-ons together under Catalog. Keep People & access in administration so customers and staff are distinct. | A user with customer access and no master access can find Customers without seeing catalog tools. |
| Root labelled Overview | Align root navigation, breadcrumbs, and readiness page on **Home** when the v3 Home work lands. Add real customer actions only after their routes exist. | Home → Add customer and Home → Find customer lead to working authorized pages. |
| Active selection uses exact path equality | Match the customer route family on path-segment boundaries. `/customers/new` and `/customers/{id}/edit` keep Customers selected. Preserve query-aware catalog selection. | Exactly one applicable section is selected on each route. `/customers-elsewhere` must not match. |
| Topbar labels a fixed set of pages | Keep topbar breadcrumbs structural: `Home / Customers / Profile` or `Edit`. Put the authorized name and `Customers / name / Edit` links in the page-level header rendered by its detail loader. Handle long names and unavailable records without a name leak. | Direct links, reload, and browser history have correct titles, breadcrumb labels, and focus. No child-to-layout name channel or extra shell detail fetch is required. |
| Search always opens the catalog | On customer pages, search focuses the real customer register input or navigates to `W/customers?focus=search`. On catalog pages keep catalog search. On Home and general settings prefer customer search when allowed; otherwise use permitted catalog search. Label the action accurately. | Ctrl/Cmd+K respects the current context, permissions, and dirty guard. No false all-module search is presented. |
| Workspace switch copies every suffix and query | Use `POST /api/workspaces/switch`: the authenticated server reads target workspace permissions, saves preferences through the existing command, and returns an allowlisted destination. A customer detail/new/edit switches to the target customer register if permitted, otherwise Home. Catalog retention likewise requires target master access. Clear IDs, search/filter/page/editor state, and return targets. | Switching from customer A in shop A cannot put A's ID or search into shop B. Target choices need no permission flags. Canceled/failed switch keeps A's input and selector on A. |
| Register → profile can lose list context | Keep query, tags, status, segment, view, page, and focused row in bounded `sessionStorage`, scoped to principal/tenant/location. Carry only an opaque `return` token in profile/edit URLs. On direct entry default to the active register. | Full document navigation restores the last authorized view and focus without an arbitrary redirect. No search or tag text enters page or API URLs. |
| Shell guard accepts one active editor registration | Keep one active customer or wearer editor at a time. Aggregate its dirty/uncertain/saving state in its controller; do not register competing nested forms. | Closing a wearer dialog, replacing a draft, navigating, reloading, and switching shops preserve the correct protection. |

Create a small browser-safe `workspace-route-policy.ts` for route classification, active groups, search destinations, and requested switch families. The switch endpoint accepts only `home`, `customers`, `catalog` with an allowlisted kind, or existing safe settings roots, never a source record URL. Resolve the target with current identity and `workspaceService.view(target)` before saving preferences. Build the returned relative URL on the server, reject non-workspace targets, and reauthorize on arrival. A failed preference command leaves the page and selector unchanged. On cancel or failure, explicitly reset the DOM select value to the current `selected` value. Do not assume a controlled select rerenders after an early return. Existing `/api/preferences` callers retain their contract.

Resolve customer display labels only in the authorized page header. The route classifier remains pure. Keep native document navigation and the existing `NavigationGuard`; introducing client-side routing must not bypass `beforeunload` protection.

Use a versioned `sessionStorage` namespace and random return tokens. Store at most ten return entries per tab, each expiring after 15 minutes, with search ≤120 code points, up to five tag filters, allowlisted scalar filters, offset/view, and an opaque focused-row ID. Read entries only after fresh page authorization and exact principal/tenant/location match. Do not store arbitrary hrefs. Missing/expired/invalid tokens return to the active register. Reject absolute/protocol-relative URLs and cross-scope descriptors. Storage unavailable falls back to a fresh register with no restoration claim.

Wire clearing into the existing account sign-in/sign-out flow and shell principal/scope changes. Notify other tabs of logout with a non-PII BroadcastChannel signal; each tab clears its own entries. Store no records, photos, editable drafts, credentials, or session tokens. Clear before switching successfully; failed/canceled switches retain current entries. An expired session cannot read the store into a private screen until fresh authorization. Never promise draft recovery after browser termination.

## 5. Specify each screen

### Customer register

Render **Customers**, the selected shop/location, an authorized count for the current filters, search, and **Add customer** when permitted. Use one server-backed page for both table and card layouts. Rows show name, formatted phone or **No phone**, manual segment, active state, active wearer count, and an optional authorized avatar. Open the customer through its name. Put archive/restore behind a labelled secondary action.

Search the complete authorized database scope, not loaded rows or a fixed first-500 sample. Match normalized name text and normalized phone digits. Escape wildcard characters so `%` and `_` are literal user input. Use a read-only `POST /search` body, with no operation identity or durable mutation. Do not use a native GET search form. Page/request URLs, diagnostic events, and access logs contain no search terms or tags; disable body logging on these reads. Empty search lists the directory. Debounce by 250ms, cancel superseded requests, ignore stale responses, and bound reads to 15 seconds. Refresh is explicit and cancels a queued debounce.

Default to active customers, alphabetical normalized name plus UUID tie-break, 25 rows per page, maximum 50. Retain the repository's bounded offset contract, with maximum offset 100000 and an explicit limit error beyond it. Return `{items,total,nextOffset}` for the same filters and scope. Counts never come from the loaded page. Concurrent edits can move records between offset pages; refresh after writes and do not promise a frozen directory snapshot.

Show different states for initial loading, no customers, no matches, archived-only results, temporary read failure, access denial, and expired session. A failed query cannot become a successful zero count. Keep no-photo fallback initials. On small screens prioritize name, phone, wearer count, and Open; do not make horizontal page scrolling the default interaction.

### New customer and edit customer

Use separate `new` and `edit` routes with one shared form controller. The initial form asks for **Customer name**, **Country**, **Phone**, and **This customer is also a wearer**. Name is required. Phone is optional, with an explicit **No phone provided** path; never invent a number. A supplied phone must parse under the chosen country or explicit international prefix. Contact is not OTP-verified.

Expand optional contact/address, billing, preferences, and classification sections. Save opens the new/existing customer profile and announces success. Do not require a second Save before the customer exists. Validation preserves every input, expands the relevant section, focuses the first error, and provides linked field errors. Cancel returns through the guard. While saving, disable conflicting actions and show a specific saving label.

On creation, the self-wearer checkbox defaults on and displays the name that will be used. Create that wearer in the same transaction. Unchecking creates only the contact record and offers **Add wearer** after save. Editing the customer never creates another wearer or silently renames an existing wearer. Customer and wearer names become independent after creation; offer an explicit wearer edit when both should change.

### Duplicate decision

Perform a convenience exact-phone check after a structurally valid phone is entered. On create, lock and perform the authoritative check for the normalized phone in the current tenant/location. On update, do so only if the normalized E.164 value changes to another non-null phone. An unchanged phone or clearing a phone needs no duplicate review. Exclude the edited customer's own ID. Include archived matches, clearly labelled. Do not treat a matching name or phone as proof of the same person.

Persist a projection-free `review-required` result, then fetch candidate summaries through a separately authorized read. Offer **Open existing customer**, **Back to edit**, and, for create, **Keep separate**. For a phone-changing update, label the decision **Use this phone for this customer anyway**; it updates this existing customer rather than creating another. Archived matches offer a permitted restore path rather than silently reactivating. Opening an existing record requires an explicit discard decision for the local form. Neither decision is a hidden client boolean.

Bind the challenge to actor, scope, command kind, normalized phone, hash of the entire normalized intended payload, current candidate-set fingerprint, and expiry. Hash optional self-wearer creation, tags, expected version, and every profile field; exclude only the decision/review token itself so check-first and accepted intents can share that draft hash. Create and update have distinct check-first/accepted variants. Serialize competing creates/phone changes on transaction-scoped tenant/location/phone locks, then recheck candidates. A changed payload, candidate set, or expired challenge requires a new review for a fresh operation. Lock multiple affected phones in deterministic order.

The preflight check is advisory and does not issue a durable challenge. A save-time duplicate outcome commits the review row and operation result before any customer/wearer write. The durable result contains only `reviewId`, `expiresAt`, and `candidateCount`. Never store candidate IDs, names, phones, tags, or profile values in `command_operations.result`. Candidate identities/fingerprint remain in the restricted review table, with no runtime SELECT grant. Project at most five candidate summaries afresh through a function requiring current `customers.read` and `customers.manage`, actor/scope match, and a valid challenge. If more matches exist, show the count and a link back to authorized search. The response is translated to a typed HTTP 409 outside the executor transaction. A failed projection cannot expose the cached candidates or undo the committed review.

`command.authorize` rechecks current identity, scope, and permission dependencies on every attempt. The atomic SQL claim checks operation actor ownership. Neither stage checks challenge expiry, use, candidate fingerprint, expected row version, or mutable parent state. Those checks run only in `mutate`, before fresh writes. A committed create/update replay returns its saved opaque result even after the challenge expires, is consumed, or is purged. For a replayed review-required result, the post-executor projection returns `review-expired` if expired/consumed/missing, or `review-stale` if candidates/draft no longer match. The client retains the draft and submits a new check-first operation with a new key. Fresh reuse of a consumed challenge fails. A refreshed review never rewrites the old operation result.

Set challenge TTL to 10 minutes. Index expiry. Purge expired rows on create/read/use in bounded batches and add a narrow service maintenance function, called at most once per minute by the existing worker loop, to delete expired rows in batches of 100 without logging PII. It runs on restart as well; expired rows may remain during worker downtime but cannot be read/used and are purged after recovery. No external scheduler is required. Keep consumed challenges only until expiry. Restrict maintenance to expiry deletion with no candidate read projection. The durable operation row retains only the non-PII result.

Both advisory checks and review issuance/projection require CRM read/manage, fully valid input, at most five summaries, at most two concurrent checks per principal/location, and a shared database-backed 30-checks-per-minute principal/location limit. Reuse the foundation limiter pattern and return 429 with Retry-After on excess. Record counters/correlation IDs without raw phone or search text. Limit review issuance in create/update by the same budget. Add burst, concurrency, no-preflight-write, expiry, and cleanup tests. Do not rate-limit replay recovery of an already committed opaque save result.

Use the bounded customer error/response schema in section 11. Duplicate phone is not a unique customer constraint. Missing-phone customers do not share a fake duplicate key. No automatic merge is included.

### Customer profile and wearers

Show name, status, contact information, permitted Edit/Archive/Restore actions, preferences, named wearers, and bounded CRM activity. Use sections for Overview, Wearers, and Activity. Do not show empty operational-history tabs, fake zero balances, a New order button, or a live Add measurements link before those modules exist. A short contextual note can explain that measurement entry is the next build.

Create/edit a wearer in a labelled dialog or sheet over the profile. Ask for a name and optional relationship label first. Reveal birthday, gender, height, weight, fit/fabric/design preferences, personal notes, and photos only when needed. Person attributes belong to the named wearer, including the self wearer, rather than a second copy on the contact. A contact-only customer has no demographic fields until an explicit named wearer is added. This interpretation is recorded alongside REQ-CRM; do not silently create a person or claim all contact-only customers have physical profiles. Show each wearer's active/archived state. Repeated names warn but remain allowed; IDs determine identity.

Wearer selection in Build Three must be explicit when multiple selectable wearers exist. Define `effectiveActive = customer.archivedAt IS NULL AND wearer.archivedAt IS NULL`. Every new-selection projection joins both headers and uses that predicate. Persist each entity's own `archivedAt`, not a second independent active boolean. For archived customers label wearer totals **saved wearers**, with zero selectable wearers; restoring makes only individually unarchived wearers selectable again. Historical profile, activity, and permitted photo reads remain available after archive, while edits/new photo bindings are blocked. Archiving never moves measurements between wearers. Wearer reparenting and customer merging are excluded.

### Archive and restore

Use **Archive**, never **Delete account**. Confirm which customer/wearer changes state and explain that history remains. Archive the customer header without rewriting individual wearer states. Hide the customer from active new-selection queries and deny further customer/wearer edits until restored. Historical authorized reads remain available. Restoring the customer restores its availability, while individually archived wearers stay archived.

Wearer archive/restore applies only within an active customer. Restoring the last/only wearer is allowed; a contact may have zero active wearers. Archived customers and wearers cannot be selected for new measurements/orders. Existing future historical snapshots remain readable and reproducible. Require expected versions and recheck state under lock so archive versus edit or wearer-create races have one consistent result.

## 6. Define fields, validation, and privacy

| Field | Proposed contract |
| --- | --- |
| Customer and wearer names | NFC-normalized, trimmed, 1–120 Unicode code points. Preserve display spelling. No minimum-three-character or ASCII-only rule. SQL owns deterministic search normalization. |
| Phone | Optional. Preserve supplied display input and selected ISO country, store valid E.164 and searchable digits. Require whole-input parsing plus `isValid()` under the chosen metadata. Reject too-short/long numbers, region-invalid national input, pasted prose, and extensions. Explicit valid international input controls its country code; do not prepend the selected dial code again. |
| Email | Optional, trimmed, maximum 254 characters, syntax validation only. Preserve display spelling; duplicate email does not merge people or authorize access. |
| Address | Optional line1/line2/city/region/postalCode/countryCode. Bound line fields to 200, locality/region to 100, postal code to 32. Do not impose India-only postal rules on other countries. |
| Notes and preferences | Plain text only, customer/wearer notes up to 2000 characters, fit/fabric/design notes up to 1000 each. Render as text; never interpret HTML. |
| Tags | At most 20 unique normalized tags, each 1–40 characters. Store display labels and normalized identity. No marketing audience or computed classification is implied. |
| Segment | Optional manual enum: new, regular, important, bulk. Display that it is staff-assigned. Do not compute it from nonexistent orders. |
| GSTIN | Optional uppercase 15-character identifier shown only when explicit `taxCountryCode = IN`. Implement the documented Indian GSTIN format fixture. When another country is selected, require an explicit clear before removing an existing GSTIN; a generic foreign tax-ID field is outside this build. No registration or tax-eligibility verification is implied. Real invoice policy remains phase 3. |
| Birthday and gender | Optional wearer fields. Birthday is a date, cannot be in the future under the shop timezone. Gender supports unspecified and self-described text with a 60-character bound. Do not infer garment eligibility from gender. |
| Height and weight | Optional wearer profile attributes with explicit units: cm/in and kg/lb. Positive finite decimal strings, maximum 6 fractional digits, height ≤300cm equivalent and weight ≤700kg equivalent. These are input sanity bounds, not medical judgments. Retain original value/unit and do not create confirmed cutting measurements. |
| Relationship | Optional wearer label up to 60 characters. A label is not proof of guardianship, consent, or portal authority. |

Add a shared browser-safe phone parser using `libphonenumber-js/max` so browser and server use the same validity metadata and `extract: false` behavior. Pin the actual installed version during implementation. Validate again on the server; preserve its normalized result in the command and independently check SQL structural/length constraints. Metadata upgrades require the same international fixtures. Structural validity does not establish ownership, reachability, or a number's ability to receive messages. See the [maintainer documentation](https://github.com/catamphetamine/libphonenumber-js).

Count every text bound in Unicode code points after NFC normalization, using a schema refinement equivalent to `Array.from(value).length` and SQL `char_length`, not JavaScript UTF-16 length. Names trim and collapse ASCII whitespace to a single space. The authoritative SQL search function applies NFC plus deterministic ASCII case folding, matching the existing master convention; non-ASCII letters retain their case. Thus É and é are distinct, composed/decomposed É match, and Tamil and emoji retain their meaning. Document this limit instead of promising universal linguistic case folding. Use the same SQL function for stored name indexes and query normalization. Normalize note line endings to LF; reject disallowed control characters while permitting newline/tab in notes.

Keep nullable fields distinct from empty text at the API boundary. Reject unknown fields and out-of-bound arrays before SQL casts. Preserve exact decimal strings through UI, service, and storage. Unit conversion must retain the original input precision and must not run through JavaScript floating-point numbers. Customer/wearer create/update use the explicit 128KiB profile transport budget in section 11; maximal field-valid normalized profiles must save, including Unicode and an optional self wearer.

## 7. Design storage and transaction invariants

Migration 0034 applies the customer/wearer/tag storage foundation. Migration 0035 implements the command, duplicate-review, activity and limiter protocol. Migration 0036 repairs reviewed authority defects; migrations 0037–0039 implement the private photo purpose, ownership and staging-expiry protocol. Load the repository's PostgreSQL and type-system rules when changing these contracts.

For this build, customer records belong to a concrete tenant and owning location. All reads/writes use that authorized location. This is a conservative initial policy while phase 7's cross-location customer/pricing policy remains undecided. A customer ID remains stable within its tenant; do not impose global phone uniqueness. Tenant-wide sharing/search requires an explicit later policy and migration. Do not silently expose another location's customers because garment definitions are tenant-wide.

| Proposed table | Purpose and constraints |
| --- | --- |
| `app.customers` | UUID, tenant/location, display and normalized name, nullable display phone/country/E.164/digits, contact/address/tax-country fields, manual segment, preferences, nullable archived_at/archived_by, integer version, actor/timestamps, creation operation. |
| `app.customer_wearers` | UUID, tenant/location/customer FK, name, optional relationship and personal fields, original-unit height/weight, preferences, nullable archived_at/archived_by, version, actor/timestamps, creation operation. |
| `app.customer_tags` | Tenant/location/customer FK, normalized tag identity and display label; unique per customer. Replace the bounded set atomically with profile edits. |
| `app.customer_activity` | Append-only safe event summaries, target customer and optional wearer, stored actor ID, event kind, changed field names, previous/next version, operation, timestamp. No before/after PII dumps. |
| `app.customer_duplicate_reviews` | Opaque identity, actor/scope/command kind, normalized phone, full intended-payload hash, restricted candidate identities/fingerprint, ten-minute expiry, use/operation binding. No runtime SELECT grant. Bounded expiry cleanup and protected projection only. |
| `app.customer_request_budgets` | Principal/tenant/location/minute counters and bounded check leases for the shared review/preflight limiter. No phone, query, candidate, or profile content. Protected narrow functions; maintenance removes expired buckets/leases. |
| `app.customer_photos` | Domain binding from a same-scope private-file ID to either a customer avatar or wearer face/body role; current/retired state, version, actor, provenance/permission note, operation/timestamps. |

Use `UNIQUE(tenant_id,id)` and location-qualified keys needed by child FKs. Every wearer references the full customer tenant/location identity. Customer-photo and activity references include the full parent identity; a wearer photo also proves that the wearer belongs to that customer. All operation and actor references use existing foundation identities. Do not cascade-delete retained domain history or file objects.

Give new tables forced RLS, tenant/location context checks, required NOT NULLs, finite decimal constraints, and indexes on referencing keys. Runtime roles receive only named function execution, with `PUBLIC` execution revoked and a fixed privileged search path. Fresh authority checks are required for reads, writes, and successful-operation replay. A request cookie or supplied tenant/customer ID never supplies authorization.

Index scoped active/name/UUID ordering, exact E.164 duplicate lookup, wearer lookup, tag filtering, and activity by customer/time/UUID. Add `pg_trgm` GIN search indexes on normalized name and phone digits through a reviewed migration for substring search. Preserve B-tree equality indexes. Short search terms may need scoped scans; set a query timeout and prove behavior with representative data. PostgreSQL documents that patterns without usable trigrams can degrade to an index scan; do not claim all substring searches have constant cost. See [PostgreSQL 18 pg_trgm](https://www.postgresql.org/docs/18/pgtrgm.html).

Use one total lock order: sorted scoped phone advisory locks, then the parent customer, then the wearer/file. A create with a phone and a phone-changing update take the phone locks first. An unchanged-phone update, archive/restore, or wearer/photo mutation takes only its parent and child locks. No path holding a parent lock may acquire a phone lock. Phone edits read the old phone optimistically, acquire old/new phone locks, then lock/recheck the parent version; a changed parent returns a version conflict without writes. All candidate-affecting changes use the same protocol, so review validation never upgrades locks in reverse order.

The pool currently uses 2-second lock, 10-second statement, and 20-second transaction timeouts; the executor retries only `40001`/`40P01`. Use `pg_try_advisory_xact_lock` and row `FOR UPDATE NOWAIT` for customer-owned locks. Return typed 409 `busy`, retaining the exact envelope, when unavailable. Do not spin, sleep, or silently turn an ordinary lock wait into 503. Add a narrow optional SQLSTATE-to-`CommandError` adapter on the command definition, called by the executor after its existing retry branches. Customer commands map their dedicated busy SQLSTATE and `55P03` to `CustomerError` conflict/busy; this also covers a concurrent claim of the same operation key. Other commands retain current mappings. A busy attempt rolls back its operation claim and all partial work, so explicit retry of the same key is safe. Database/storage outages remain 503. Prove shared-executor regressions before using this adapter.

Create customer plus optional self wearer plus tags plus safe activity plus command audit/result in one transaction. A failed substep leaves none of those records. Each customer/profile or wearer update verifies its own expected version and the locked parent state in mutate. Archive, restore, and photo replacement use the same command protocol. Every saved result includes `changed`. A true no-op returns 200 with `changed:false`, preserves versions, writes the operation audit/result for replay, and emits no customer activity. Repeating archive/restore in its current state and binding the same current photo are no-ops; replacing it with a different file is a change even if pixels happen to match. Distinguish **No changes to save** from a changed-save announcement.

Activity is a domain projection, not direct access to `audit.read`. `customers.read` permits event summaries and timestamps, but not staff identities by default. Project the actor as **You** when it matches the current principal, otherwise **Shop staff**. Do not expose other principal IDs or join raw auth/owner-contact data for this projection. This does not require `access.manage`. Record archive/restore, wearer lifecycle, profile field names, and photo actions. Do not include phone numbers, addresses, birthdays, body details, or image bytes in logs, operation diagnostics, general audit summaries, or durable command results.

## 8. Add CRM permissions without broadening existing roles

| Permission | Meaning |
| --- | --- |
| `customers.read` | Register, contact/profile details, wearers, and safe CRM activity within the concrete location. Duplicate summaries additionally require customers.manage. |
| `customers.manage` | Create/edit customers and wearers. Requires `customers.read`. |
| `customers.archive` | Archive/restore customers and wearers. Requires `customers.read`; independent from ordinary editing. |
| `customers.photos.read` | View customer/wearer images. Requires `customers.read`. No photo IDs or URLs in projections without it. |
| `customers.photos.manage` | Upload, bind, replace, and remove CRM images. Requires `customers.manage` and `customers.photos.read`. |

Backfill these grants only to the Owner preset and provision them for future owners. Do not silently grant customer access to managers, staff, workers, or existing custom roles. Managers/staff receive explicit delegated roles as needed. Update SQL permission allowlists, role dependency validation, any role-count bounds, future provisioning functions, and browser/server permission schemas together. Granting `customers.read` must not imply `masters.read`, financial access, generic file-library access, customer portal access, or all-location reads.

Enforce all implications in `createRole`'s Zod refinement and SQL `create_custom_role`: manage ⇒ read; archive ⇒ read; photos.read ⇒ read; photos.manage ⇒ manage and photos.read. Update `workspacePermissionLabel` and browser checkbox behavior. The current 13 permissions plus these five total 18, within the existing maximum 20. Recheck against the actual checkout and change the bound only if another owning feature adds permissions. Direct commands cannot bypass the dependency or delegation rules.

Test revocation after a page is open, after a duplicate challenge is issued, before an image fetch, and before an operation replay. Unauthorized/missing/cross-scope customer IDs return the same safe unavailable response; malformed IDs return validation errors. SSR, API, image streaming, and direct SQL all enforce the boundary.

## 9. Extend private files for customer ownership

Do not implement photos by letting staff browse or attach arbitrary workspace files. The existing `files.read`/`files.manage` path is a workspace library, not a CRM projection.

Add an immutable file purpose at staging: existing records retain `workspace`; CRM starts use `customer-photo` with same-scope owner identity. Purpose cannot change through a generic attach command. Add domain-specific upload/prepare/finalize/bind/read/remove authorization using the existing BlobStore and normalization path. A staged CRM upload belongs to its actor and target customer/wearer. It cannot be rebound to another customer or attached by the generic library API.

Keep workspace-file lists, stream reads, and generic change/upload functions restricted to purpose `workspace`. They must not expose, retire, finalize, or rebind `customer-photo` files even to a holder of `files.manage` alone. CRM endpoints require the photo permission plus current customer/location access. Reuse content-addressed storage and cleanup, but test both legacy and new-purpose lifecycle paths. No public bucket, bearer image URL, or raw object key is exposed.

Enumerate the retained functions in the forward migration rather than relying on a purpose column alone:

| Retained path | Required purpose behavior |
| --- | --- |
| `file_begin` | Creates workspace files only. Caller cannot choose a CRM purpose. |
| `file_upload_target`, `file_prepare`, `file_finalize`, `file_change` | Require purpose workspace and existing files permission. Deny CRM staging, upload completion, attach, and retirement. |
| `file_read`, `file_list`, `file_list_page` | Restrict to workspace purpose, including legacy wrappers and streamed-object lookup. |
| `file_cleanup_candidates`, `file_cleanup_objects`, `file_cleanup_done`, and `foundation_finish` cleanup continuation | Remain service-only and handle abandoned/retired objects of either purpose. Exclude live generic attachments and live CRM bindings, both at candidate claim and before deletion; use the same predicate for continuation. They must not skip abandoned CRM files forever. |

Add CRM-only `customer_photo_begin`, `customer_photo_upload_target`, `customer_photo_prepare`, `customer_photo_finalize`, `customer_photo_bind`, `customer_photo_read`, and `customer_photo_remove`. These check `customers.photos.*`, same-scope owner/target, staged actor ownership, parent state for writes, version, and file purpose. They must work without `files.read/manage`. Reuse the bounded decoder and BlobStore through a purpose-aware internal interface, not by calling the old permission-gated SQL functions. No runtime caller selects an arbitrary permission/purpose mode. Worker cleanup uses the existing lease/fence and parent/file locking to prevent bind-versus-delete races.

Allow one current customer avatar and one current face plus one current body photo per wearer. Enforce role/owner shape with CHECK constraints and separate scoped partial unique indexes for a current customer-avatar and a current wearer-role binding. Lock parent then file(s), retire the previous binding, and insert the new one atomically. Concurrent binds cannot leave two current rows. Upload JPEG/PNG using the existing 5MiB input/output, 12-million-pixel, single-frame, and decoder timeout limits. Normalize orientation and explicitly strip EXIF/GPS metadata; test normalized output metadata. Record the staff-entered permission/provenance note and timestamp; this is not an automatic legal consent assertion. Preview locally before save, revoke object URLs after use, and retain the old image until replacement is finalized and bound. A failed upload preserves the saved profile and old image.

Keep photo upload a separate explicit action on an existing customer/wearer. A failed photo never rolls back an already reported successful customer save. Removal retires the domain binding and denies new reads immediately. Stream previews with `Content-Disposition: inline`, private no-store, correct image content type, `nosniff`, existing restrictive CSP, current authorization before opening and again before returning bytes, and accessible fallback text. Do not copy the workspace download's attachment disposition. Existing reads on archived customers remain permission-checked historical reads; no new binding is allowed. Cleanup must preserve live CRM bindings. Define any new cleanup job payload/version before enqueueing it.

## 10. Keep interfaces small and browser-safe

The caller flow is `customerService.page(target, query)`, `customerService.detail(target, customerId)`, then a fixed `customerService.command(name, target, envelope)`. The service owns authority, parsing, command coordination, and safe projection. Pages do not call SQL or assemble domain writes.

Derive all types from authoritative strict Zod schemas. Brand `CustomerId`, `WearerId`, and `DuplicateReviewId` separately, reusing existing tenant/location/principal/operation brands. Prefer discriminated unions for creation intents, save outcomes, photo owners, and client mutation states. The conceptual shapes are:

```text
CreateIntent = check-first | keep-separate(reviewId)
UpdatePhoneIntent = check-first | keep-duplicate-phone(reviewId)
DurableResult = saved(customerId, version, createdWearerId?, changed)
              | review-required(reviewId, candidateCount, expiresAt)
ReviewProjection = current-authority-read(reviewId) → boundedCandidates
PhotoOwner = customer-avatar(customerId) | wearer-photo(customerId, wearerId, role)
MutationState = idle | saving(envelope) | failed(issues, draft)
              | uncertain(exactEnvelope) | conflict(draft, latestVersion)
```

Treat the optional created wearer as a nullable result field or a distinct creation-result variant, not an unchecked assertion. Do not accept a generic arbitrary entity type or arbitrary command name. Reuse `workspaceTarget` and the existing invocation envelope. Keep body fields out of generic query parsers and URLs.

| Module/path | Ownership |
| --- | --- |
| `packages/application/src/customer-contracts.ts` | Browser-safe IDs, payloads, projections, queries, issues, and discriminated outcomes. Add an explicit package subpath export and transitive import-boundary check. |
| `packages/application/src/customer-phone.ts` | Shared strict whole-input phone parsing and canonical output contract. |
| `packages/application/src/customers.ts` | Authorized reads, fixed command map, duplicate review protocol, activity and lifecycle coordination. |
| `packages/application/src/customer-photos.ts` | CRM file purpose, attachment commands, and authorized streaming using existing storage. |
| `packages/db/src/schema.ts`, next retained migrations, `migrations/meta/00XX_snapshot.json` | CRM relations/indexes, SQL validation/functions, grants, RLS, purpose enforcement, Owner backfill/provisioning, actor-bound customer operation claims, and reviewed Drizzle snapshot baseline. Determine actual numbers from the current journal. |
| `apps/web/src/server/customers.ts` | Request-bound identity, shared pool, service creation, structured safe diagnostics. |
| `apps/web/src/components/workspace/workspace-route-policy.ts` | Pure route/search/requested-switch-family classification after UI v3 handoff. Page headers own authorized customer labels. |
| `apps/web/src/app/api/workspaces/switch/route.ts`, workspace service | Fresh target authorization plus preference command and safe destination response; retain existing preferences API. |
| Customer return-state helper and account/shell hooks | Bounded sessionStorage descriptors and explicit login/logout/principal/scope cleanup. No editable draft persistence. |
| Shared command/HTTP helpers | Optional narrow SQLSTATE error adapter, domain response/error adapter, customer-profile body limit, and current-session status mapping. Retain other domains' behavior. |
| `apps/web/src/app/workspaces/[tenant]/[location]/customers/` | Register, new, detail, and edit loaders plus page-owned client controllers and wearer/photo panels. |
| `apps/web/src/app/api/workspaces/[tenant]/[location]/customers/[[...path]]/route.ts` | Fixed read/command allowlist with existing private JSON, origin, bounded body, and error helpers. |
| Application tests and HTTP/browser scripts | Real SQL/service/transport/browser evidence. Share fixture setup; do not replace Build One checks. |

## 11. Define page and API contracts

| Page route | Behavior |
| --- | --- |
| `W/customers` | Authorized register. UI-only `focus=search` and opaque `return` tokens never reach API query parsers. |
| `W/customers/new` | Short create form and optional sections. Restore valid return context. |
| `W/customers/{customerId}` | Saved profile, wearer panels, safe activity, and permitted actions. |
| `W/customers/{customerId}/edit` | Expected-version edit of the saved contact/profile. |

Under `/api/workspaces/{tenant}/{location}/customers`, support these fixed operations:

| Operation | Contract |
| --- | --- |
| `GET /` | Empty directory only, with strict status/segment/offset/limit query; no search text or tags in URLs. Same-scope page/count, no raw private notes or body attributes in rows. |
| `POST /search` | Read-only strict JSON `{search,status,segment,tags,offset,limit}` using 16KiB read-body bound. `tags` is an array of up to five normalized tag strings with AND semantics. Empty array means no tag constraint. Same result shape as directory GET. No command operation or payload logging. |
| `GET /{id}` | Explicit detail projection, including a bounded first wearer page and capability flags. |
| `GET /{id}/wearers`, `GET /{id}/activity` | Independently bounded continuation, maximum 50 items, current authority on each page. |
| `POST /duplicate-check` | Read-only advisory check, phone in bounded JSON rather than URL; authorization and abuse/resource limits apply. |
| `POST /reviews/{reviewId}/read` | Protected current candidate projection, valid actor/scope/expiry/fingerprint and current CRM read/manage. Same limiter, at most five summaries. The response is not saved in an operation result. |
| `POST /commands/{name}` | Fixed customer create/update/archive/restore and wearer create/update/archive/restore commands. Scope comes from route/session; conflicting JSON scope is rejected. |
| `POST /photos/slot` | Private read of one strict customer-avatar or wearer face/body owner. Current photo read permission; no operation key or durable mutation. |
| `POST /photos/commands/{begin,bind,remove}` | Dedicated fixed photo commands, actor-bound replay and a strict staged/photo-saved result envelope. Shared bounded customer errors. |
| `PUT /photos/uploads/{fileId}`, `GET /photos/files/{fileId}` | Same-scope CRM upload/inline stream, immutable owner/file identity, content-type/body limits, current permission checks and no-store response. Image bytes never enter command JSON. |

Add explicit `bodyLimit: "customer-profile"` with 128KiB raw UTF-8 JSON allowance only for customer/wearer create/update commands. Keep the 16KiB default for other JSON reads/mutations and the existing master limit unchanged. Enforce bounded fields and actual canonical UTF-8 size before dispatch. The complete maximal valid customer plus initial self-wearer payload, including tags and Unicode, must fit and save; retain its measured byte size. Raw bytes over the route budget return 413, malformed/domain fields return 400 with bounded issues, and a stalled body returns 408. Image bytes never enter command JSON. Reject unknown/duplicate/inherited query keys consistently with the master route, noting Next may strip `__proto__` before handlers. All page/API URLs remain free of search/tag values.

Customer/wearer writes use the browser-safe strict `customerResponse` union in `customer-contracts.ts`. The dedicated photo service uses `photoCommandResponse` in `customer-photo-contracts.ts` for staged and photo-saved results; it shares the bounded customer error envelope. This keeps the upload state machine separate from profile/duplicate outcomes. Every variant carries `correlationId`; error messages/issues are bounded to 20 issues, 12 path segments, allowlisted field segments, and 200 code points per issue. The HTTP envelope is separate from the non-PII durable result:

```text
200 { outcome: saved, result: DurableSavedResult, correlationId }
409 { outcome: review-required, review: {reviewId, expiresAt, candidateCount,
                                        candidates: AuthorizedSummaries}, correlationId }
409 { outcome: review-expired | review-stale, reviewId, correlationId }
4xx/5xx { outcome: error, category, code, message, issues: [], correlationId }
```

The client validates content type and the union before using a body, then branches on `outcome` before generic `response.ok` handling. `review-required` opens the decision UI and preserves the draft. Expired/stale reviews offer **Check again** with a new key. `error` codes distinguish validation 400, expired session 401, denied action 403, unavailable record 404, version/operation conflict or busy 409, rate limit 429, temporary outage 503, and raw body 413/408. A malformed UUID is 400; valid missing/cross-scope IDs share 404. Reads and list endpoints use their own strict projected schemas with the same typed error envelope.

Implement `CustomerError extends CommandError` with an allowlisted code, bounded issues, and correlation ID. Add an optional domain error adapter to shared `safeRoute`/`mutation`, preserving the existing master boolean/options and default callers. The customer adapter serializes customer issues, maps unavailable to 404 and session expiry to 401, and handles BodyReadError consistently. It must not add these fields to generic audit/log output. The route translates non-error review outcomes after the executor and current candidate projection, rather than throwing the committed result away. Retain existing origin/content-type checks and private no-store on every branch. Test the shared helper's legacy callers.

Never parse an HTML error response as successful JSON; show a safe retryable message and correlation ID while preserving input. Do not return stack traces, SQL details, raw server HTML, or another customer's PII.

## 12. Preserve drafts and uncertain operations

Keep customer/wearer drafts in memory for this build. Form mode and panels are local state; profile identity is the URL. No autosave or server drafts are implied. Customer form and wearer editor have one active owner. Navigating between read-only profile sections does not mutate records.

Generate an operation key only when the canonical payload is ready. Retain the exact bytes, key, expected version, and correlation ID after dispatch until the outcome is known. A lost response enters uncertain state. **Retry save** replays the same envelope; it does not create a second customer or wearer. A corrected payload after a known validation/duplicate response receives a new operation key. A successful replay still checks current permission.

Require random UUIDv4 customer operation keys. The current foundation uniqueness is tenant/command/key and does not compare the replay actor. Extend `claim_operation` through a forward migration: after locking an existing row and before returning any result, require `op.actor_id` to match the current principal for the fixed allowlist of customer, wearer, and CRM-photo command kinds. No other command's replay behavior changes. The check must be inside the SQL claim path, not a race-prone pre-read. Deny a second actor's reuse with an opaque conflict, even with matching payload/current CRM permission. The challenge projection also requires its originating actor. Keep customer durable results limited to opaque resource IDs, versions, changed flags, and review metadata; no candidate/profile/image content.

On stale version, preserve local values and offer reload of the latest record after explicit discard. Do not auto-merge contact, tags, wearers, or photos. On permission loss, stop further reads/writes and do not persist the draft to browser storage. Use the existing guard for sidebar links, breadcrumbs, cancel, shortcuts, native Back/Forward, reload, and shop switching. Test uncertain results even when the draft compares equal to its initial values.

## 13. Implement in six retained increments

Complete required checks inside each increment. Keep one usable workflow after every increment. These are implementation groups, not separate deployment or approval stages.

Current local acceptance closes all six increments. The records below preserve each increment's acceptance boundary.

| Increment | Deliverables | Evidence required before dependent work |
| --- | --- | --- |
| 0. Reconcile the UI/runtime baseline | Finish v3 increments 5–7 in their owner; reconcile dated failure/recovery observations against a fresh runtime check; freeze and hand off shared shell ownership; confirm migration baseline and development/test isolation. | Real sign-in → workspace → Home → catalog/settings on desktop/narrow, current role checks, existing recovery/navigation coverage. Record any remaining unrelated failures truthfully. |
| 1. Contracts, storage, and authority | Customer/wearer schemas, parser, read projections, fixed commands, private duplicate review/projection/expiry, limiter, safe activity, indexes, restricted SQL, permission dependencies/backfill/future provisioning, actor-bound claim and narrow error adapters, reviewed Drizzle snapshot. | Real DB lifecycle, two tenants/locations, duplicate concurrency, busy handling, stale versions, replay after challenge expiry, operation-result privacy, rollback, runtime privileges, clean upgrade/reapply, and no schema drift. |
| 2. Register and shared navigation | Customers route, authorized list, real search/count/paging, table/cards, Home entry, route metadata, search shortcut, safe shop switch. | Search finds records beyond row 500 and on later pages; counts and view parity; stale-response rejection; detail-route classification; no catalog/price permission dependency. |
| 3. Create, edit, profile, and duplicate UX | Short progressive form, optional profile fields/tags/manual segment, atomic self-wearer checkbox, exact duplicate review and distinct create/update decisions, saved profile, sessionStorage return context, conflicts/uncertain recovery. | Home → search → create → profile → edit → return; duplicate archived/active/missing-phone cases; unchanged-phone edits; save-time race; maximal Unicode profile; response loss creates one customer; dirty navigation and failures preserve input. |
| 4. Wearers and lifecycle | Extend the atomic self-wearer path already exposed in Increment 3 with wearer dialogs/details, optional demographics/preferences, independent archive/restore, and CRM activity continuation. | Customer with zero/one/two wearers, independent names/preferences, active/archived rules, customer-archive races, no reparenting, no mutation from tab navigation. |
| 5. Photos, complete regression, and handoff | File-purpose boundary, domain photo routes, replacement/removal, fallback, responsive/accessibility checks, updated docs and measurement-consumer contract. | Actual upload → normalized object → bind → authorized fetch → replace/remove → denied fetch; generic-file bypass denial; complete workflow matrix below and existing master/foundation regressions. |

Local acceptance on 2026-11-02 closes increments 0, 1, and 2. The [implementation review](../reviews/phase-2-build-2-increments-0-1-review.md) repaired two authority defects through forward migration 0036. Increment 2 also brings forward a minimal read-only customer profile and scoped register return state so row navigation works. These do not close Increment 3 forms, duplicate decisions, or recovery. Add/Edit/lifecycle controls remain with their owning increments.

Local acceptance on 2026-11-03 closes Increment 3. The [Increment 2 review](../reviews/phase-2-build-2-increment-2-review.md) found no runtime defect and corrected one stale status paragraph. The shared create/edit controller uses the atomic self-wearer path, explicit duplicate decisions, private register return state, and exact-envelope uncertain retry. Richer wearer management remains Increment 4.

Local acceptance on 2026-11-03 closes Increment 4. The [Increment 3 review](../reviews/phase-2-build-2-increment-3-review.md) repaired typed-whitespace loss, denied replay recovery, and advisory-denial behavior. Wearer sheets, independent preferences, lifecycle confirmations, shop-local birthdays, original units, bounded continuation, conflict reload, and dirty/uncertain guards pass the owning journey. No photo workflow is claimed.

Local acceptance on 2026-11-03 closes Increment 5 and Build Two. The [Increment 4 review](../reviews/phase-2-build-2-increment-4-review.md) repaired nested preference errors and no-op save announcements. Private customer avatar and wearer face/body photos enforce immutable purpose/owner, current authority, normalized content, atomic replacement/removal and cleanup boundaries. Final validation passed 12 database and 164 application tests, existing HTTP regressions, the complete Chrome harness, clean upgrade/reapply, schema drift and delivery checks. All 40 migrations are applied to development with original data counts preserved. The [final evidence](../evidence/phase-2-build-2-increment-5.md) retains captures, 10,000-customer SQL plans, browser limits and the Build Three contract.

Increment 3's creation UI must not offer the self-wearer checkbox without its already implemented atomic storage path. Increment 4 adds the richer wearer management UI; it does not retrofit partially saved creation. Photos are added after stable saved owners exist. Do not mark Build Two complete when only register/create works.

## 14. Validate the full user workflow

Use synthetic fixtures in isolated test databases/buckets. Reuse the current optimized-app HTTP and Chrome harness patterns. Never reset `fitloom_dev` or attach test photos to real customer records. Run full validation and browser suites sequentially because they share fixtures and the current evidence records worker/Docker contention.

| Scenario | Required observable result |
| --- | --- |
| New shop, no garments | Sign in, select shop, open Customers, create a contact and optional self wearer. No garment/rate prerequisite. Reload retrieves saved values. |
| Existing shop | Existing master versions, rates, files, setup, roles, and memberships remain unchanged after forward migrations and customer use. |
| Returning customer | Find by name and formatted/international phone; open profile; edit; save; return to the same authorized register context and focused row. |
| Complete family flow | Create contact with self wearer, add two named wearers, change one wearer's preferences, reload, and verify all three identities remain separate. Also test a contact who is not a wearer. |
| Duplicate decision | Exact normalized phone finds active and archived matches. Open existing, cancel, restore, and keep-separate behave explicitly. No automatic merge or wearer transfer. |
| Concurrent duplicates | Three creates, create-vs-phone-edit, and parent archive/restore races use the documented lock order. Busy returns 409 with preserved envelope, not lock-timeout 503. Explicit retries reach a valid duplicate/saved outcome; changed candidate sets/drafts invalidate review. |
| Duplicate update semantics | After explicit shared-phone creation, edit notes without a duplicate prompt. Changing to another customer's phone requires the update-specific decision; clearing a phone does not. Editing tags/self-wearer/profile data after review invalidates its payload hash. |
| Private operation results | Issue review, revoke CRM read/manage, and inspect actual operation rows as the actor and an audit-only actor. No names, phones, candidate IDs, tags, or profile values persist there. Review projection/direct table access is denied. |
| Challenge expiry and replay | Lose a committed keep-separate response and replay the exact key after challenge expiry, consumption, and cleanup; retrieve the same saved identity. Fresh challenge reuse fails. Replayed review-required yields review-expired/stale and a new-key path. |
| Review resource limits | Burst 31 checks in a minute, exceed two concurrent checks, and test issuance/projection limits. Responses show 429/Retry-After or bounded busy. Preflight writes only limiter metadata, never a review. Expired/consumed review cleanup deletes private rows, including after worker restart. |
| Search completeness | Use more than 500 records, over 50 matching names, shared phones, Unicode/Tamil names, punctuation, literal wildcard characters, and later-page exact matches. Totals and continuation match the full authorized scope. |
| International contact input | Missing phone, Indian national/international equivalents, a non-Indian leading-zero case, pasted text, invalid country/number, malformed email, whitespace, and NFC-equivalent names have defined results. |
| Optional profile | Short names, no optional fields, explicit India/non-India GSTIN behavior, tag AND semantics, code-point boundaries for emoji, É/é case policy, NFC equivalence, future birthday, and original-unit decimals have matching UI/service/SQL results. A contact-only customer gets no implicit demographic person record. |
| Maximum profile | Save a fully maximal valid customer plus self-wearer with Tamil/emoji through the 128KiB customer-profile route and record actual bytes. Invalid fields return bounded 400 issues; raw oversized/stalled requests return 413/408. Other domain routes keep their original limits. |
| Archive and restore | Archive contact, reload historical profile, confirm no new child edits/selections; restore; individually archived wearers stay archived. Race archive against edit/add wearer and check one consistent outcome. |
| Two-actor edits | One expected-version edit succeeds. Stale actor retains draft, sees conflict, and cannot silently overwrite. No-op behavior is explicit. |
| Lost response | Drop a successful create/edit/child/photo-bind response, retry exact envelope, and inspect one durable mutation/activity/result. Changed-payload operation reuse conflicts. |
| Two-actor operation keys | Another actor in the same tenant cannot replay a customer/wearer/photo key with matching payload, even with CRM rights. Challenge IDs are actor-bound. Existing non-customer command replay remains compatible. |
| True no-ops | Unchanged customer/wearer edits, already-applied archive/restore, and binding the same current photo return changed:false with preserved versions, operation audit/result, and no added CRM activity. |
| Isolation and direct access | Wrong tenant/location/customer-wearer pair, absent/stale scope, revoked membership, and pooled connection reuse cannot read or mutate another scope. SQL runtime cannot bypass functions/RLS. |
| Role matrix | Owner, delegated CRM editor, read-only CRM user, no-CRM user, photo-denied user, archive-only user, and worker see correct projections. Dependent-only custom roles fail in Zod, UI, and SQL. Activity shows You/Shop staff without other staff identities. Customer access works without catalog/finance rights. |
| Revocation while open | Revoke read/manage/photo permission after page load and before challenge use, save/replay, image fetch, and history continuation. Current checks deny the action without cached disclosure. |
| Photo chain | Upload JPEG/PNG; verify normalized digest and absent EXIF/GPS; inline img renders; bind/reload/replace/remove deny old future reads. Two concurrent binds leave one current role. Test input/output/pixel/time limits, failures, and fallback. |
| Photo bypass and cleanup | Generic files-only roles cannot list/stream/attach/rebind/retire/prepare/finalize CRM files. CRM-photo-only roles complete the full chain without files permissions. Every named legacy function rejects the wrong purpose. Cleanup preserves live domain bindings and later deletes abandoned/retired CRM objects. Workspace files still work. |
| Archived wearer selection | Archive a customer with individually active wearers. The effective-selection projection returns none and the register says saved wearers. Restore re-enables only individually unarchived wearers. Historical photos/activity remain permitted reads; new bindings are denied. |
| Mobile and keyboard | 320, 390, 720, 1024, and 1440px; 200% zoom; long Unicode names; keyboard-only forms, dialog focus containment/Escape/restoration, visible errors, and labelled table/card actions. No page-level horizontal overflow. |
| Navigation chain | Home → Customers → New → Profile → Edit → Back. Test direct URL/reload, native Back/Forward, mobile menu, breadcrumbs, search shortcut, and browser-cache re-entry. Active section remains correct. |
| Dirty and uncertain exits | Cancel sidebar/breadcrumb/cancel/reload/Back/switch exits and inspect intact input. Accept exits and observe correct destination. Guard exists for uncertain clean-looking saves. |
| Workspace switch | Target resolver uses target permissions: customer/catalog route families fall back to Home when denied there. Cancel and preference failure leave both the select value and page on the current shop with draft intact. Successful switch clears IDs/search/tags/return data. |
| Search privacy and return | Search name/phone/tag with POST; page/API URLs, browser history, and captured access/diagnostic logs contain no terms. Full document register → profile → return restores sessionStorage view/query/focus. Invalid/cross-scope/expired tokens fall back safely; login/logout/switch clears entries across tabs. |
| Customer HTTP union | Parse 200 saved, typed 409 review-required/expired/stale, and 400/401/403/404/409 busy/version/429/503/413/408 error envelopes through the real client. Field issues focus the right input; review opens its dialog rather than throwing away the challenge. Existing master/workspace HTTP behavior still passes. |
| Unavailable backend | HTML 404/502, malformed JSON, 401/403/409/503, stalled/oversized body, worker/storage outage, and out-of-order list responses show accurate errors; no invented success or zero totals. |
| Future handoff | Saved active customer/wearer IDs and same-scope ownership can be read without prices; measurements/orders are still unimplemented and have no fake actions, counters, or snapshots. |

For search performance, retain `EXPLAIN (ANALYZE, BUFFERS)` on a synthetic 10,000-customer scope for empty, exact-phone, substring, tag, count, and late-page reads. Record data size, plan, and measured time. Enforce the 15-second HTTP deadline and database statement timeout; tune indexes/query shape if representative reads approach that bound. Do not use timing assertions that become unreliable under ordinary shared-machine load.

Run focused contract/service/storage tests while building each feature. At final acceptance run the current `pnpm validate`, the existing optional `MASTER_UI_CHECKS=1 pnpm --filter @fitloom/application test:http`, and the customer HTTP/Chrome suite integrated into that harness or exposed as a documented owning script. Define the exact command when adding the script; do not claim a nonexistent `test:customers` already exists. Also run `git diff --check`, clean upgrade/reapply checks, and the browser-safe import-boundary checks. Include a reviewed `00XX_snapshot.json` matching the final migration/schema baseline, then require `pnpm --filter @fitloom/db db:generate` to report no schema changes. Counts must be recorded from actual results, including whether Node parent tests are included.

Retain synthetic desktop/mobile/profile/duplicate/error/photo captures and actual workflow results under `docs/implementation/evidence/`. Inspect the captures, not just screenshot-file existence. Record browser/version and limits. Chrome acceptance does not establish Safari or assistive-technology coverage; record a keyboard/VoiceOver spot check separately if performed.

## 15. Complete the handoff and documentation

Build Two is complete when the full Home → Customers → create/reuse → profile → wearers → edit/archive/restore journey persists correctly, private photos enforce their domain boundary, and the matrix has observed evidence. A rendered form, a compiling schema, or an earlier master test pass is insufficient.

Update [implementation status](../status.md), [documentation index](../../README.md), and the application/database/web guides with actual commands, routes, permissions, migration ownership, and evidence. Preserve earlier acceptance records. Keep UI v3 completion separate from customer completion; repair a shared regression in its owner and retain the customer's regression scenario.

Build Three receives stable customer/wearer IDs, concrete scope, lifecycle rules, original-unit profile attributes, private-photo ownership, and the page/navigation conventions. It must add its own measurement permissions and price-free garment intake projection. Do not require measuring staff to receive master-management rights. Measurement versions own date, author, schema/version, values/units, notes, and provenance; profile height/weight are not cutting-ready measurements. Later order confirmation freezes the selected measurement/schema/design/price snapshots in phase 3.

## 16. Record decisions and remaining review

The following are proposed implementation defaults, not claims of existing policy: optional phone, explicit default self-wearer creation, concrete location ownership, staff-assigned segments, owner-only initial grants, private photo purposes, bounded substring search, and in-memory drafts. They resolve routine implementation choices so development can proceed without repeated approval pauses. An explicit later product instruction can revise them before dependent behavior ships.

Real-data use still requires the product's jurisdiction/retention/consent decisions, especially body photos and minors. This does not block local implementation with synthetic fixtures or require implementing privacy self-service now. Cross-location customer sharing remains phase 7. Unsupported legacy imports must not be advertised as supported migration.

DeepSeek 4.1 Flash completed the requested full-file review through OpenCode, model `opencode-go/deepseek-v4.1-flash`, with `effort=max`. The initial verdict was revise before implementation, with 3 blockers, 10 high, and 16 medium findings. The [original findings](../reviews/phase-2-build-2-customers-deepseek-findings.md) remain unchanged. The primary agent inspected repository evidence and revised the plan; [dispositions](../reviews/phase-2-build-2-customers-review.md) account for every finding. No second independent review or customer-runtime acceptance is implied.

## 17. Research sources and their limits

Repository sources establish product scope and actual integration points. The [frozen source feature appendix](../../references/source_feature_details.md#req-crm-customer-register-profile-and-history) supplies comparative behavior, not verified Fitloom capabilities:

- Tailorman F009–F015 supports directory/duplicate/profile patterns but its F010 search stops at 500 loaded records, and F013 totals use only 100 bills. Do not copy those limits into complete search or lifetime totals.
- Tailormate F001–F006 shows country-aware profile fields and face/body images. Its register searches loaded names, and inactive removal has misleading permanent-delete text. Use database-backed search and accurate Archive wording.
- NoolTech F008–F017 supports paginated directory, explicit duplicate recovery, manual segments, fit notes, and avatar patterns. Its loyalty/order features belong to their later owners.
- Tailorman F195 provides a useful contextual search interaction. Build Two searches only implemented authorized customer/catalog destinations; it does not invent bill results.

External primary sources checked on 2026-11-02:

| Source | Planning implication |
| --- | --- |
| [libphonenumber-js maintainer documentation](https://github.com/catamphetamine/libphonenumber-js) | Parse complete country-aware inputs, select metadata intentionally, and distinguish parsing from verification. |
| [W3C breadcrumb pattern](https://www.w3.org/WAI/ARIA/apg/patterns/breadcrumb/) | Use labelled hierarchical navigation and identify the current page. |
| [W3C form notifications](https://www.w3.org/WAI/tutorials/forms/notifications/) | Provide associated field errors and clear submission feedback; preserve actionable recovery. |
| [PostgreSQL 18 trigram indexes](https://www.postgresql.org/docs/18/pgtrgm.html) | Index supported substring predicates, keep equality indexes, and measure short-term scans. |
| [Build One technical findings](../research/build-one/technical-findings.md) | Retain existing RLS, composite-FK, exact-decimal, semantic-identity, and accessible-control constraints. |

These sources do not decide a shop's real garment semantics, legal consent, tax registration, or production readiness. No new application dependency, migration, customer record, or deployment was created during this planning task.
