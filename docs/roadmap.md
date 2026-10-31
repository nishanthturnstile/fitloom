# Fitloom implementation roadmap

Build the production multi-tenant SaaS application in dependency order, starting with its SaaS foundation and the tailor's workflow. Continue into workshop management, inventory, boutique retail, customer access, and full platform operations. Every phase extends the same product and retains its code, records, and integrations.

This roadmap sequences the [product requirements](requirements.md) using the selected stack and contracts in [the architecture](architecture.md). Phases 1–9 describe implementation order within one complete application. They are ordered implementation groups within the same retained application. The requirements' P1/P2/P3 groups summarize these dependencies at a broader level.

The current environment is one OVHcloud VPS-3 with 6 vCores, 12 GB RAM, and 100 GB NVMe. Development, builds, tests, web, worker, PostgreSQL, and private files share it. Phase 1 delivers repeatable Ansible/Compose setup and a basic backup/restore/move path. Production capacity, availability, continuous archiving, and service-level recovery objectives are prelaunch decisions, not prerequisites to begin development.

## Start with the tailor's workflow on the SaaS foundation

Support independent business tenants from the start, each with authorized members, its own initial location, settings, and subscription. Build the tailoring owner workflow first. The owner can take orders, do the work, and collect payments. Optional workers can receive assignments without needing accounts. Record customer-supplied cloth receipt and images without treating that cloth as shop-owned inventory.

The first operational dependency chain is:

```text
Set up shop → add customer/wearer → save measurements → confirm order + advance
                                                                  ↓
Reconcile receipts ← collect balance + hand over quantities ← stitch + trial + ready
```

Retail checkout, stock purchasing, and mixed orders follow the core tailoring workflow. All remain required for the complete application. Implementation continues directly from the tailoring workflow into the remaining modules.

Keep tenant and location identity, typed order lines, and module boundaries in the underlying design from the start. Expose tailoring first. Add retail and material-sale line behavior when their stock rules are ready.

## Build sequence at a glance

| Phase | Build | Result | Depends on |
| --- | --- | --- | --- |
| 1 | Project structure, shared foundations, Linux deployment, and subscriptions | Retained workspace/application, safe records, independent tenants, repeatable deployment, and billing | Implement 1A → 1B → 1C → 1D below |
| 2 | Customers, garment masters, and measurements | A tailor can record reusable, versioned cutting information | 1 |
| 3 | Orders, pricing, collections, and documents | A tailor can accept and bill a real order | 2 |
| 4 | Production, trials, delivery, and daily control | Complete tailoring workflow within the production application | 3 |
| 5 | Workshop depth and workforce finance | A team can plan work, handle rework, and pay workers | 4 |
| 6 | Materials, stock, and procurement | A shop can buy, reserve, consume, and reconcile stock | 3–5 |
| 7 | Boutique retail and multiple locations | Retail, mixed orders, returns, and branch stock work together | 6 |
| 8 | Customer identity, portal, booking, and sharing | Customers can safely interact with linked shops | 4–5 and availability policy |
| 9 | Advanced insights, engagement, and full operator suite | Complete consolidated product scope | Owning operational modules |

Follow this sequence while preserving each feature's dependencies. SaaS identity, tenancy, subscriptions, entitlement checks, and core billing operations start in phase 1. Advanced operator interfaces arrive later. Phase numbers express dependencies. Implement each capability and resolve issues within its owning work before continuing to dependent code.

## Phase 1: Build the production SaaS foundation

Start immediately with the retained product repository. Every step below produces actual application or deployment code used by subsequent modules. Handle installation, framework, database, and hosting issues when they arise in that work. There is no preliminary feasibility build, trial workspace, disposable feature slice, or separate deployment/validation stage.

### 1A. Create the project structure and pnpm workspace

The initial structure is implemented with Turborepo. Current work status lives in [IN_PROGRESS.md](../IN_PROGRESS.md); runnable commands live in the [root README](../README.md).

1. Keep the existing Git repository and `docs/`. Use the official `create-turbo` CLI, then adapt root `package.json`, `pnpm-workspace.yaml`, `turbo.json`, one `pnpm-lock.yaml`, Node/package-manager version pins, shared TypeScript/Biome configuration, `.gitignore`, and `.env.example` files with placeholder names only.
2. Scaffold `apps/web` using the official `create-next-app` template for the selected Next.js release. Choose TypeScript, App Router, Tailwind, Biome, `src/`, and the standard import alias. Keep workspace and lockfile ownership at the repository root and avoid nested Git repositories or duplicate lockfiles.
3. Create the retained Node worker entry point in `apps/worker`, compiled with TypeScript and run by Node. Add `packages/db` for database ownership and `packages/application` for commands shared by web/worker. Add shared UI/config packages only when actual reusable code needs them.
4. Add root scripts for development, build, start, formatting, and type checking. Use Turborepo for dependency-ordered tasks, pnpm filters for package selection, and `workspace:*` for local packages. Keep secrets/server-only imports out of browser bundles. Install only the dependencies used by this foundation.

This creates Fitloom's own reusable repository structure. Do not create a separate template repository or evaluate multiple third-party starters before implementing the product.

### 1B. Implement the database, identity, and shared application foundations

1. Add PostgreSQL/Drizzle schemas, reviewed migrations, explicit runtime/migration roles, and the same-connection transaction helper.
2. Implement Better Auth email/password, verification/recovery, database sessions, and operator MFA. Add principals, tenants, locations, memberships, role grants, resumable onboarding, and authorized workspace selection as real product features.
3. Add tenant-qualified relationships, scoped uniqueness/indexes, RLS, field projections, and fresh permission/session checks. Tenant context is resolved from authorized membership; connection reuse cannot broaden access.
4. Implement decimal money/quantity primitives, accounting-owner journal contracts, audit/history, operation identities, request hashes, and expected versions. Business writes, audit, idempotency result, and pg-boss/outbox insert share one transaction.
5. Implement the actual worker handlers and durable job states, provider inbox/signature handling, private-file staging/streaming, sensitive-job authorization, and the minimum operator lifecycle/account-recovery commands. Add limits and error reporting with their owning entry points.

### 1C. Add deployment for the retained application

1. Add web/worker Docker images, one Compose file, PostgreSQL persistence, Caddy routing/TLS, environment configuration, and bounded worker/database resources for the selected VPS-3.
2. Implement Ansible inventory/host tasks for Ubuntu, deploy-user SSH access, UFW/IPv6 policy, Docker, directories/permissions, secret files, startup, and log rotation. Publish only Caddy ports; retain deploy access while applying SSH changes.
3. Add Make commands for provisioning, application deployment, migrations, backup, and restore. Deploy the retained application on the one development server as part of its implementation. Fix deployment issues there and continue feature development.
4. Add daily/pre-change database-dump plus file/configuration backups and the encrypted off-VPS copy. Keep the documented single-writer move procedure for when a machine move is actually required. Do not provision an extra VM/workspace or perform an upfront restore/redeployment exercise.

### 1D. Implement subscription and platform foundations

1. Add versioned plans, trial/active/grace/expired/suspended lifecycle, effective entitlements, overrides, atomic usage admission, and separate platform accounting.
2. Implement plan selection/renewal, provider checkout and signed events, durable deduplication, pending/failed activation, reconciliation, invoices/history, and minimum operator billing commands. Use the provider's development mode when implementing its integration; it is part of the integration, not a preliminary product experiment.
3. Implement owner renewal/manual export during ordinary commercial lockout and restricted operator recovery during security suspension. Scheduled business exports and broader consoles retain their later phase owners.

Resolve missing accounts, adapter incompatibilities, and provider issues within the affected integration. Continue independent modules while a provider dependency is unavailable. Record the actual limitation instead of presenting simulated checkout as completed billing. Remaining business decisions have owners and deadlines in [the requirements](requirements.md#open-decisions).

## Phase 2: Build the customer and measurement book

Build garment masters before measurement entry, because measurement versions need a stable schema.

1. Configure standard/custom garments, services, rates, add-ons, field types, illustrated dimensions, required fields, ordering, and retired schema versions.
2. Add customer creation, search, duplicate decisions, contact/profile details, notes, preferences, archive/restore, and named wearers.
3. Save body and garment measurements with explicit units, semantic fields, date, author, notes, photos, provenance, and immutable versions.
4. Support reuse, copy-and-edit, comparison, charts, garment filtering, custom dimensions, and explicit body-to-garment mapping.
5. Add measurement history, authorized revocable measurement QR cards, and dirty-form protection. Keep QR cards scoped to the permitted projection.
6. Add only the supported customer/measurement imports with dry-run, source IDs, duplicate decisions, row outcomes, and reconciliation. Record accepted normative source details and fixture definitions in the task evidence.

Measurement-slip scanning comes in phase 5. Manual measurement entry must already work without it.

## Phase 3: Accept an order and account for its money

Build the server quote and financial records together with intake. A displayed total alone is insufficient for accepting an order.

1. Extend the finance primitives with shop charge/credit, receipt/allocation, refund/exchange-credit liability, and balanced journal posting contracts. Keep shop and subscription accounts separate. Define the real-document policy gate and use explicit INR test fixtures until it is resolved.
2. Implement canonical quotes, add-ons, express charges, package-ready allocations, fixed/percentage discounts, inclusive/exclusive tax, deterministic rounding, and owner/kind/fiscal-period numbering. Retain currency and the complete calculation breakdown before order confirmation uses it.
3. Build customer → garments/measurements → dates/prices → review. Save drafts, multiple garments, stitch choices, urgency, images, instructions, trials, and customer-cloth receipt/custody. Model integer production units under each garment line; separate lines with different wearer/measurement/design snapshots.
4. Confirm immutable measurement/design/price/tax/schema snapshots. Enforce confirmed measurement or the explicit pending policy. Validate line amendments/cancellations against existing units and financial state.
5. Record advances and later split-method collections, allocations, references, receipts, and balances. Implement reversal/replacement, charge credits, refund obligations, settlement attempts, and truthful pending/failed/succeeded outcomes with order acceptance.
6. Generate versioned confirmations, advance receipts, invoices, credit adjustments, payment advice, and order references. Test tailoring A4/A5 layouts and bundled local-language fonts. Issued invoice corrections use linked documents; order-display correction cannot rewrite them.
7. Add registers/direct detail, filters/pagination, history, amendments, cancellation, repeat/clone, and authorized reopening. Copies do not inherit payments, delivery, or completed work.
8. Project the source-linked daybook from the journal/cash records. Add basic expenses, receivables, and full-scope totals. Test import reconciliation for every supported finance/order input format; do not claim complete legacy migration by implication.

This phase implements order acceptance in the production application. Phase 4 adds the dependent garment handover workflow.

## Phase 4: Complete the tailoring workflow

Build a simple production view over durable item-stage events, then connect it to delivery and daily queues.

- Maintain workers separately from logins. Add specialization, location, optional staff linkage, cutter/stitcher assignments, agreed-rate snapshots, and own-work access for workers who have accounts.
- Implement configured stages per production unit, permitted skips, ready state, basic board/queues, and price-masked job cards with frozen measurements/instructions. Complete two pieces while another piece in the same commercial line remains in progress.
- Accrue minimal piece-rate earnings at each qualifying cutting/stitching completion now, using unique unit/assignment/completion identity and agreed rates. Completion reversal/reassignment preserves original and settled history. Phase 5 extends the same earnings rather than attempting to reconstruct them from current stages.
- Persist trials and establish working hours, appointment durations/buffers, timezone, resources, and capacity ownership under REQ-CALENDAR. Show date-grouped trial/delivery queues, workload, capacity ranges, and source drill-down. Staff leave/exception editing expands in phase 5.
- Record deliveries by line quantity and applicable unit IDs. Support partial handover, optional balance collection, remaining quantities, delivery reversal, cloth remnant return, and authorized overrides. A commercial return/replacement uses separate records.
- Keep commercial order status, production progress, delivered quantities, and payment state independent.
- Add the useful home screen now: due today, overdue, ready, receivables, unassigned work, own work, search, and quick actions. Financial cards follow permissions.
- Provide order, collection, dues, delivery, expense, and cashflow reports with full-scope totals and source drill-down. Add written help and support contacts.
- Add manual pickup/payment reminder composers with accurate opened status. Do not claim provider delivery from opening a message app.

This completes the core tailoring dependency chain. Retain these modules and continue directly into phase 5. The full application remains the delivery objective.

## Phase 5: Run a workshop and pay the team

Extend the implemented order workflow into team operations:

- Detailed boards, configurable ironing/QC, bulk assignment/movement with per-item outcomes, KPIs, and production timelines.
- Ordered task templates, durations, backward scheduling, late-start estimates, execution timestamps, comments, replanning rules, and scoped item-cost estimates. Expand REQ-CALENDAR with staff holidays/leave and working-time exceptions while retaining confirmed trials.
- Extend phase 4 earning accrual to detailed tasks, then add selected-row settlement, daily/monthly salary, advances, deductions, payout history, adjustments, and worker views. Apply versioned payroll eligibility/period/rework rules. Preserve agreed rates and settled history; backfill imported eligible work explicitly before settlement rather than reading current stages/rates.
- Standalone walk-in alterations and original-order rework, retaining original delivery/payment history and using the same financial correction rules.
- Packages with explicit component/fixed-total allocation, design gallery, reusable media, visual construction sheets, and reviewed sheet revisions.
- Measurement-slip OCR with confidence states, preserved manual input, undo, explicit review, and save as a new version. Implement the selected provider with handwriting/language support and explicit image egress/retention policy.
- Recurring expenses, broader audit viewer, scheduled business exports with status/history, and an exercised recovery check. Operational recovery already exists from phase 1.
- Installable web shell, allowlisted principal/tenant-scoped IndexedDB drafts, honest offline state, and conflict handling. Exclude private responses/photos/measurements/documents from service-worker caching by default. Clear drafts on logout/context switch. Offline financial/order actions cannot appear server-confirmed.
- Expanded role administration, remaining configured sign-in methods, owner authenticator/remembered-device controls, tours, localized audio with text fallback, and persisted support tickets/status. Deliver a minimum authorized operator triage queue/detail/status path alongside ticket intake; the shared inbox remains phase 9.
- Public shop/showcase and scoped order tracking. Publish booking entry only when phase 8 provides working confirmation. Add notification preferences and the basic notification center.

## Phase 6: Manage shop-owned materials and purchasing

Introduce the stock movement model before building checkout or procurement screens that affect stock.

1. Add stock units and minimal vendor identities before catalog records or receiving reference them. Configure materials, rolls/width/length, variants, locations, suppliers, reorder fields, and retail catalog records for phase 7.
2. Implement stock movements, original-unit/decimal rules, moving-weighted-average cost, frozen issue/COGS cost, nonnegative availability, and source-linked stock/payable journal contracts before posting opening or purchase movements.
3. Add direct receiving, reasoned adjustments, purchase corrections after consumption, payment/payable references, transaction history, and CSV dry-runs with source IDs, row outcomes, and reconciliation.
4. Reserve/release/consume for orders, record waste, and atomically expand bundles. Held carts do not reserve implicitly. Add expiry only under an explicit policy and retain the movement/valuation history.
5. Expand vendors with controlled documents/bank details, terms, history, and reviews. Add POs with approval, configured tolerance, partial receiving, and remaining-quantity cancellation.
6. Add physical counts using a recorded movement cutoff, barcode/QR lookup, camera/hardware scanner failures, and batch labels. Implement support for the selected scanner/printer combinations.
7. Add duplicate-suppressed reorder drafts, original-cost return/correction reconciliation, valuation/consumption/aging/supplier reports, and verified Tally XML/QuickBooks IIF/Zoho CSV mappings against representative target imports.

Keep customer-supplied cloth separate from purchased stock. Implement serial tracking with its receipt-to-use records before exposing its controls.

## Phase 7: Add boutique sales and multiple locations

Reuse orders, quotes, collections, documents, and stock commands to add retail behavior.

- Establish additional location directory/switching, per-location membership, main-shop defaults, explicit tenant-wide access, and context-safe drafts/reports before cross-location checkout or transfers.
- Complete the readymade catalog, price/quantity tiers, size guides, retail/material checkout, anonymous paid sales, identified credit sales, cash change, split payment, and tested 58/80 mm thermal receipts.
- Enable mixed orders containing tailoring, retail, material, and alteration lines. Preserve each line's stock, measurement, production, pricing, and fulfillment rules.
- Add server-saved held carts with customer/branch/discount state and permitted margin estimates. Resume revalidates price/stock. Implement the server-owned loyalty ledger, versioned rules, concurrent redemption limits, original-allocation return reversal, and points-debt treatment; carts do not reserve points implicitly.
- Add returns against original sold quantities, resellable/damaged disposition, original tax/discount/loyalty/cost allocation, charge credits, refund/exchange-credit liabilities, and retryable external settlement. Complete the correction path alongside checkout. A return does not reopen fulfillment; replacements create explicit linked obligations.
- Add dispatch, in-transit stock, destination receiving, and cancellation for inter-location transfers only after location switching and grants work.

This phase completes the retail and advanced location workflows in implementation group P2.

## Phase 8: Give customers controlled access

Build approved identity links before exposing shop records through the portal.

1. Add configured customer phone/email OTP and Google sign-in with separate authority from business/operator sessions.
2. Create tokenized shop invitations, connection requests, explicit approval/rejection, linked-shop selection, expiry, and disconnect/revocation.
3. Complete the server availability service over REQ-CALENDAR working hours, holidays/leave, duration/buffers, timezone, resource capacity, and order trials. Implement transactional confirmation/rescheduling, cancellation/history, expected versions, and duplicate-request replay before publishing booking confirmation.
4. Expose authorized dashboards, orders/progress, appointments/booking, measurement projections, invoices/downloads, cross-shop search, profile edits, and push registration. Order/measurement reads can proceed independently while availability is being completed.
5. Add expiring/revocable Fit Cards, selected-version sharing, reviewed import into independent shop versions, provenance, duplicate-import handling, and explicit cross-phone confirmation.
6. Add privacy self-service for consent, sharing revocation, verified exports, deletion request/cancellation, and nominees where policy permits. Explain downloaded/imported-copy limits and reconcile deletion/suppression state after restores. Connect request processing to operator review and retention jobs.

## Phase 9: Complete analytics, engagement, and platform administration

These capabilities grow around operational data and integrations that already work:

- Complete standard reports across tailoring, retail, inventory, procurement, customers, workers, and finance. Add forecast/retention insights only with stated assumptions and sufficient data. Keep estimated margin, cashflow, and business profit distinct.
- Add versioned saved custom reports with approved sources, columns, filters, grouping, sorting, charts, and scoped exports.
- Extend manual reminders into consented provider messaging, automatic status/pickup/payment updates, push, bulk preparation, inactivity/recovery campaigns, and visible execution outcomes.
- Add achievements, activation challenges, one-time rewards, tailoring calculators, size references, conversions, fabric estimates, and advice. Estimates cannot become confirmed measurements automatically.
- Complete tenant lifecycle/security/usage tooling, demo access, overrides, trial management, versioned plans, subscription administration, invoice/failed-payment handling, revenue reports, and billing exports.
- Complete operator support ticket administration and shared messaging inbox, templates, media replies, and failed-webhook retry.
- Add announcements, promotions/referrals, email campaigns, template preview/tests, public content/blog authoring, and draft/publication control.
- Complete operator identity/permissions/settings/audit, rollout targeting, exact bulk-action previews, bounded jobs, per-tenant outcomes, and required destructive-action confirmations.
- Add health/usage dashboards, alert rules/events/acknowledgement, privacy/retention console, and scheduled processing. Missing telemetry must remain unknown, not healthy.

## Extend the shared foundation with each feature

Keep tenant/location authority, effective plans, usage admission, owner renewal/export, immutable billing history, and audited operator actions in the actual commands as modules are added. Provider callbacks retain deduplication and state-aware recovery. Resolve defects in the owning implementation and continue in dependency order.

## Keep the architecture rules through every phase

| Rule | Consequence for build order |
| --- | --- |
| Modules own their records and expose domain commands | Extend the existing order/finance/stock operations instead of creating separate conflicting totals for retail or alterations. |
| Measurement, price, rate, and document snapshots preserve history | Build versions before confirming orders, assigning paid work, or issuing documents. |
| Commercial, production, delivery, and payment state are separate | Never use a single completed flag to collect money, finish work, and hand over all quantities. |
| Stock is derived from movements and reservations | Build the stock transaction model before POS, returns, POs, transfers, or counts. |
| Money, stock, delivery, and earnings require concurrency and retry safety | Implement atomic local effects and stable operation identities in every mutation. |
| Outbox/job records commit with the business transaction; workers act after commit | Handle crash/retry and uncertain provider acceptance in the command/worker implementation. A standalone post-commit queue publish is insufficient. |
| Host configuration and application deployment are versioned separately from data | Ansible/Compose recreates configuration; a matched dump/blob/config backup restores data. Implement restoration and single-writer cutover for actual recovery/moves. |
| Authorization applies to every projection | Enforce scope in APIs, direct URLs, files, documents, QR links, exports, and jobs. |

Keep the modular monolith until measured scale or independent module ownership justifies a service split. This roadmap does not require microservices or a separate native mobile app.

## Requirement coverage and completion ownership

Every canonical capability has an initial build point and a completion owner. A phase reference assigns remaining scope; it does not waive any subfeature or acceptance criterion. When preparing implementation tasks, expand each row using its required behavior and mapped entries in the normative [source appendix](references/source_feature_details.md). Record accepted/modified/inapplicable source details, policy gates, dependencies, and actual acceptance evidence. Resolve conflicting source behaviors through the canonical requirements and architecture. Every supported importer/exporter includes format/version, dry-run or validation, source identity, row outcomes, and reconciliation before support is claimed.

| Requirement | Initial build | Remaining scope / completion owner |
| --- | --- | --- |
| REQ-HOME | 4: tailoring queues/search | 5–7: work/stock/retail cards; 9: forecasts/announcements |
| REQ-CRM | 2: register, wearers, profile/history | 7: loyalty references; 8: connection history; 9: campaign segments |
| REQ-MEASURE | 2: schemas, versions, comparison, QR | 3: immutable order snapshots; 8: customer projection/sharing |
| REQ-SCAN | 5 | 5: reviewed OCR, confidence, undo |
| REQ-MASTER | 2: tailoring configuration | 6–7: material/retail types, units, size codes |
| REQ-PACKAGE | 5 | 5: package policy and frozen allocations |
| REQ-INTAKE | 3: tailoring intake, production units, cloth custody | 4: cloth usage/remnant return; 5: package/design depth; 7: mixed lines |
| REQ-ORDER | 3: lifecycle, units, safe amendments/charge credits | 4: unit fulfillment; 6: reservation cancellation; 7: return/replacement and mixed views |
| REQ-PRICE | 3: canonical tailoring quotes | 5: packages; 7: retail/loyalty pricing |
| REQ-COLLECT | 3 | 4: handover collections; 7: retail allocations/refunds |
| REQ-DOC | 3: versioned financial documents | 7: thermal/retail formats; 8: linked-customer access |
| REQ-PRODUCTION | 4: per-unit stages, assignments, qualifying earning accrual | 5: detailed/bulk/team/task effects; 6: stock-linked effects |
| REQ-TASK | 5 | 5: planning, execution, duration, item costs |
| REQ-CALENDAR | 3: persisted trial records | 4: working-time/capacity primitives and handover; 5: staff exceptions; 8: booking integration |
| REQ-ALTER | 5 | 5: standalone alterations and linked rework |
| REQ-JOB | 4: masked basic cards | 5: visual sheets and design revisions |
| REQ-GALLERY | 5 | 5: folders, favorites, carousel, persistent order references |
| REQ-PRODUCT | 6: catalog and stock master | 7: retail tiers, catalog presentation, size guides |
| REQ-POS | 7 | 7: checkout, held carts, credit, loyalty |
| REQ-RETURN | 7 | 7: return disposition, refund, exchange credit |
| REQ-MATERIAL | 6 | 6: rolls, variants, reservations, consumption, implemented serial workflow |
| REQ-PURCHASE | 6 | 6: direct receiving, adjustments, corrections, history |
| REQ-VENDOR | 6: minimal identity before receiving/catalog links | 6: imports, terms, sensitive details, history/performance |
| REQ-PO | 6 | 6: approvals, partial receipts, auto-reorder |
| REQ-TRANSFER | 7 | 7: dispatch, receive, cancel, history |
| REQ-COUNT | 6 | 6: snapshot/cutoff, variance approval, adjustments |
| REQ-LABEL | 6 | 6: scanning, labels, unique configured serial allocation |
| REQ-INVREPORT | 6 | 7: cross-location scope; 9: mature demand estimates |
| REQ-WORKER | 4 | 5: detailed task reports; 7: cross-location membership |
| REQ-ROLE | 1: enforcement and presets | 5: custom roles/viewer; 7: multi-location grants |
| REQ-WAGE | 4: rate snapshots and minimal piece-rate accrual | 5: task accrual, salaries, advances, deductions, settlements and adjustments |
| REQ-EXPENSE | 3: basic entries and corrections | 5: recurring schedules and garment cost linkage |
| REQ-LEDGER | 3: collections/refunds/expenses | 5–7: wages, purchases, retail, all source types |
| REQ-REPORT | 4: tailoring/financial reporting | 5–7: owning-domain reports; 9: full insights and export formats |
| REQ-CUSTOMREPORT | 9 | 9: saved definitions, charts, authorized exports |
| REQ-AUTH | 1: production sign-in/security | 5: remaining configured login methods and account-security UI |
| REQ-ONBOARD | 1: retained tenant onboarding and subscription selection | Each import: source IDs/preview/reconciliation; 5: tours/sample UI; 7: boutique/both setup; 9: offers |
| REQ-WORKSPACE | 1: multiple tenants, authorized selection, initial location per tenant | 7: advanced location directory/switching and tenant-wide reports |
| REQ-SETTINGS | 1: shop/user settings | 2–7: domain/document preferences; 9: remaining notification settings |
| REQ-BACKUP | 1C: backup/off-VPS copy and restore/move commands | 5: scheduled business exports; prelaunch: production recovery objectives |
| REQ-AUDIT | 1: critical event capture | Every phase: new writes; 5: general audit viewer |
| REQ-PLAN | 1: effective plans, atomic limits, lifecycle, protected owner export/renewal | 9: expanded comparison/admin UI |
| REQ-BILLING | 1: verified subscription payments and history | 9: referral/promo credits and expanded commercial UI |
| REQ-CACHE | 5 | 5: public shell, allowlisted scoped drafts, cleanup/conflicts; 8: customer scope |
| REQ-PUBLIC | 5: shop/showcase/tracking | 8: working booking/app links; 9: public help/product content |
| REQ-CUSTAUTH | 8 | 8: customer sign-in and linked-shop selection |
| REQ-PORTAL | 8 | 8: orders, invoices, measurements, appointments, profile, push registration |
| REQ-BOOK | 8 | 8: availability, capacity-safe booking, cancellation/history |
| REQ-FIT | 8 | 8: revocable sharing and reviewed independent import |
| REQ-CONNECT | 8 | 8: invitations, approval/rejection, disconnect |
| REQ-NOTIFY | 4: manual reminders | 5: preferences/center; 9: providers, automation, campaigns, push delivery |
| REQ-ENGAGE | 9 | 9: qualifying achievements, challenges, one-time rewards |
| REQ-TOOLS | 9 | 9: verified-input estimates, conversions, references, advice |
| REQ-SUPPORT | 4: written help/contact | 5: tours/audio/tickets; 9: full operator support integration |
| REQ-PRIVACY | 1: consent/access and manual request handling | 8: self-service; 9: complete operational console |
| REQ-OPS-TENANT | 1: minimum lifecycle/support | 9: full tenant/security/usage/override console |
| REQ-OPS-PLAN | 1: core plan/subscription/billing administration | 9: full administration and analytics |
| REQ-OPS-SUPPORT | 5: ticket intake and minimum operator triage | 9: complete operator ticket tools and shared messaging inbox |
| REQ-OPS-COMMS | 9 | 9: announcements, templates, campaigns, referrals |
| REQ-OPS-FLAG | 9 | 9: rollout rules, targeting, guarded bulk jobs |
| REQ-OPS-SYSTEM | 1: separate identity/access/audit | 9: operator directory, policies, settings, email-job controls |
| REQ-OPS-HEALTH | 1: runtime telemetry; 5: operational monitoring procedures | 9: complete health/metrics/alerts console |
| REQ-OPS-RETENTION | 1: authorized privacy procedure | 8: request processing/jobs; 9: complete retention console |
| REQ-OPS-CONTENT | 9 | 9: article/media draft and publication workflows |

## Apply shared acceptance criteria from the first affected feature

| Requirement | Start | Required implementation behavior |
| --- | --- | --- |
| NFR-ACCESS | 1 | Two tenants, roles, locations, private files, and later customer links remain isolated. |
| NFR-CONSISTENCY | 1, extended with each module | Retry, concurrent writes, and injected failure cannot duplicate or half-post local subscription/money/stock/work effects. |
| NFR-MONEY | 1, extended with order finance in 3 | Decimal totals, rounding, discounts, tax, allocations, and currency agree across subscription and business records/documents. |
| NFR-HISTORY | 1, extended from 2 onward | Billing/plan/audit history starts in phase 1; measurement, quote, rate, correction, and document versions extend it. |
| NFR-QUERY | 1, extended with domain queries | Search, counters, reports, and exports cover the full authorized filter scope. |
| NFR-USABILITY | 1 | Each interface supports mobile/desktop, keyboard/touch, readable contrast, validation, and truthful loading/error/retry states. Apply the proposed WCAG 2.2 AA accessibility target. |
| NFR-FILES | 1 | Upload validation, private retrieval, expiry, scope checks, and orphan cleanup work. |
| NFR-JOBS | 1, extended with each integration | Document/export/provider jobs expose actual state, bounded retries, and correlation IDs. |
| NFR-OBSERVE | 1 | Failures, queue lag, incomplete effects, delivery errors, and backup freshness are observable as modules arrive. |
| NFR-RECOVERY | 1 | Implement daily/pre-move matched dump/file/config backup, off-VPS status, and the actual restore command. Production RPO/RTO/PITR are selected before launch. |
| NFR-PERFORMANCE | 1, extended with each module | Bound pools/concurrency on VPS-3 and resolve resource bottlenecks encountered during implementation. Production capacity objectives remain later work. |
| NFR-LOCAL | 1 | Shop-local dates, timezones, original units/precision, currency, and configured language remain consistent. |
| NFR-PORTABILITY | 1C, extended with stateful modules | Implement repeatable Ansible/Compose setup, backup/restore commands, and single-writer move/rollback. Use the procedure when recovery or a host move is needed. |

## Production readiness is a later release decision

The selected development baseline is one VPS and a repeatable move/restore path. Before real-data launch, confirm capacity and service budgets, production RPO/RTO and retention, off-site backup automation and any WAL/PITR need, external alert destination/support coverage, actual tax/invoice/payment policy, privacy jurisdiction/consent, and production provider credentials. Preserve the existing application and schemas; this later release decision does not interrupt the current implementation sequence.

## Continue implementation in dependency order

Implement phases 1–9 as one cumulative backlog. Each phase adds retained UI, commands, persistence, and integrations. Resolve issues in the work that encounters them, preserve completed modules, and proceed to the next dependency. There are no phase-exit validation gates, trial deployments, or separate small-product approval stages.

The requirements' acceptance criteria describe expected product behavior. They do not create a separate activity before feature implementation. Server-side input validation, permission checks, and provider signature verification remain application behavior.

Estimate dates from the actual repository work, team capacity, provider availability, and policy deadlines. Phase numbers are implementation groups, not sprint estimates. Production launch timing remains a separate decision.
