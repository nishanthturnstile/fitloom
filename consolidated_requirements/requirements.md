# Fitloom product requirements

Status: consolidated development baseline, updated 31 October 2026 after final review and hosting selection. Requirements describe intended behavior, not implemented capabilities.

## Purpose and scope

Fitloom combines the tailoring, boutique retail, workshop, inventory, finance, customer access, and operator capabilities extracted from Tailorman, Tailormate, and NoolTech. The scope is the union of the supplied inventories, including capabilities evidenced in only one application.

Fitloom is a production multi-tenant SaaS application. Independent businesses use isolated tenant workspaces with their own members, locations, settings, operational records, and subscriptions. A tenant represents a business; a location represents an outlet or workshop within that business. Supporting one initial location per tenant does not limit the platform to one tenant.

Development builds the actual product continuously, starting with the tailor's workflow and extending the same application through the full consolidated scope. Each phase delivers retained production code, data models, and integrations. Phases describe the order of retained implementation work. Begin with the project structure and pnpm workspace, then add the actual application foundations and business modules. Resolve issues as they arise in their owning work. The [implementation roadmap](roadmap.md) defines the detailed build order. No preliminary feature subset, trial workspace, deployment experiment, or standalone validation stage precedes implementation.

The current infrastructure target is one OVHcloud VPS-3 with 6 vCores, 12 GB RAM, and 100 GB NVMe storage for development and testing. The application, PostgreSQL, worker, private files, builds, and tests share that server. [The architecture](architecture.md#single-server-infrastructure-as-code) selects the stack and repeatable host setup. Production capacity, availability, charging, and recovery commitments are later decisions. Tenant isolation, financial correctness, durable history, and retry safety apply during development.

Resolve development issues through fixes, compatible alternatives, or documented workarounds, then continue the sequence. A workaround must preserve tenant isolation, authorization, financial correctness, historical records, and retry safety. Track its limitations and follow-up work. An unresolved issue blocks its affected dependency, not unrelated development, and cannot be represented as a completed capability.

This document defines canonical requirements. The [source feature appendix](references/source_feature_details.md) is a normative scope appendix: its retained source behaviors must be considered within the requirement to which they map. The canonical requirements and [architecture decisions](architecture.md) take precedence when a source behavior conflicts with the selected design. Defects, implementation-specific limits, UI labels, hardcoded prices, and unverified server claims are not automatically target requirements.

Every source entry has one primary requirement mapping in the [source feature appendix](references/source_feature_details.md). A mapping means the entry's scope has an owner; it does not mean the source behavior has been tested or that every detail is adopted unchanged. Entries can inform other requirements, such as financial visibility across all printed documents.

The sources describe 860 extracted entries, with overlapping and differently sized definitions. This document deliberately does not call those entries 860 distinct consolidated features. Full original functionality descriptions, roles, evidence pointers, and verification gaps remain available in the appendix and frozen reference baseline.

| Read next | Contents |
| --- | --- |
| [Customers and measurements](#customer-and-measurement-requirements) | Profiles, versions, scanning, garment masters, and packages |
| [Orders and workshop](#order-workshop-and-delivery-requirements) | Intake, pricing, collection, documents, production, tasks, and delivery |
| [Retail and stock](#retail-stock-and-procurement-requirements) | Checkout, returns, materials, procurement, transfers, counts, and labels |
| [Workforce and finance](#workforce-finance-and-analytics-requirements) | Permissions, earnings, expenses, ledger, and reports |
| [Workspace foundations](#workspace-and-platform-foundations) | Authentication, stores, settings, backup, audit, plans, and subscriptions |
| [Customer access](#customer-access-and-engagement) | Public shop, portal, booking, Fit Cards, messaging, and tools |
| [Operator requirements](#software-operator-requirements) | Tenant, billing, support, communications, health, privacy, and content administration |
| [Acceptance and delivery](#cross-cutting-acceptance-requirements) | Shared guarantees, proposed release sequence, end-to-end scenarios, and open decisions |

## Requirement conventions

- Each `REQ-*` identifier names a canonical capability. Requirement IDs are stable across future revisions.
- **Required behavior** describes the proposed Fitloom behavior. These statements are requirements for the combined product, not claims about current Fitloom implementation.
- **Acceptance** gives reviewable outcomes for implementation. Cross-cutting requirements apply to every capability, including capabilities introduced in later releases.
- P1, P2, and P3 group implementation dependencies within the same production application. They do not define separate product versions or require a launch between groups. The roadmap phases provide the detailed tailor-first order. All capabilities remain in scope.
- Application coverage is computed in the source appendix. “Single-source” means evidenced in only one supplied inventory, not proven unique in the market or absent from the other products.
- Every implementation task records its requirement IDs, accepted source details, dependencies, policy decisions, and acceptance evidence. Explicitly record modified or inapplicable source behavior under the existing precedence rules. A broad ownership row does not replace those checks.

## Users and access boundaries

| User | Responsibilities and permitted information |
| --- | --- |
| Shop owner/admin | Business setup, staff and location access, operations, finance, reports, and subscription management |
| Manager | Delegated shop/location management, scheduling, approvals, and permitted financial views |
| Cashier/office/sales staff | Customer intake, orders, POS, collections, delivery, and documents within explicit grants |
| Cutter/tailor/stitcher/QC worker | Assigned tasks, measurements, technical instructions, progress, and own earnings; financial details require a separate grant |
| Inventory/procurement staff | Product/material stock, vendors, POs, receiving, transfers, and physical counts within location scope |
| Customer | Approved linked-shop orders, invoices, measurements, appointments, sharing permissions, and own profile |
| Public visitor | Published shop information, booking entry, and limited tracking after the required verification |
| Platform operator | Tenant lifecycle, plans, support, billing, system health, and approved privacy processes through separate operator permissions |

Workers and staff logins are separate records. An owner can link them. Roles are presets over granular permissions, and a staff member can have different roles in different locations.

## Product workflows

```text
Customer + wearer → versioned measurements → tailoring order → review/advance
                                                           ↓
                 delivery + remaining collection ← production + tasks + trials

Product/material → purchase/receipt → available stock → POS → receipt/credit
                                              ↑               ↓
                                     return/restock ← return or exchange

Public shop → booking/tracking       Linked customer → portal + shared Fit Card
```

An order can combine typed service and stock lines, but each line keeps its pricing, production, and stock rules. Walk-in alteration and anonymous paid retail flows may require less customer information. Credit sales require enough contact information for collection.

## Canonical state and dependency rules

The following is the proposed target state model. Reference state names differ and are retained in the appendix. They must be translated at migration boundaries rather than combined into one ambiguous status field.

| Record | Proposed state model and rule |
| --- | --- |
| Order | Draft → confirmed → active → fulfilled, or cancelled. Drafts do not count as billed sales. Fulfilled means every noncancelled quantity has been handed over. Financial settlement remains separate. |
| Production item | Each garment piece has a stable production-unit ID under a commercial line, with its own assignments and configured stages through ready. Delivered quantities belong to delivery events. A simple view derives progress without deleting detailed events. |
| Task | Not started → in progress → completed. Reset/reopen is an authorized event with a reason, not deletion of prior timestamps. |
| Delivery | Immutable event with line quantities and applicable production-unit IDs. Remaining handover equals ordered quantity minus cancelled undelivered quantity minus net delivery after delivery reversals. A commercial return does not reduce net delivery or create a replacement obligation. |
| Payment | Derive unpaid/partial/paid from the effective charge and net settlement allocations. Charge credits, receipt reversals, refund obligations, actual refunds, and exchange credit retain separate records and state. A refund alone must not recreate a debt on a credited charge. |
| PO | Draft → approved → ordered → partially received → received, or cancelled remaining quantity. Received quantities retain their goods-receipt records. |
| Transfer | In transit → completed or cancelled. Partial receipt requires a defined quantity model before that option is exposed. |
| Alteration | Pending → in progress → done → delivered. Rework keeps a link to the original item. |
| Subscription | Trial/active/grace/expired/suspended with effective dates and server-resolved entitlements. Trial-to-paid activation requires verified billing or an audited operator action. |
| Background job | Pending → running → succeeded or failed. Retry preserves the same business operation identity. |
| Booking | Confirmed, cancelled, completed, or no-show. Confirmation/rescheduling checks the complete resource/time interval under concurrency. An availability response is not a reservation. |

Core dependencies apply regardless of release phase:

- Orders depend on identity, authorized workspace, customer policy, garment/catalog data, canonical pricing, and audit. Measurement-required lines also depend on a confirmed measurement version or explicit pending-measurement policy.
- Production and job sheets depend on order snapshots and assignment permissions. Wage accrual depends on stable worker identity, agreed rates, and eligible completion events.
- Checkout, returns, POs, transfers, and counts depend on the stock movement model. Collections, refunds, wages, and purchases depend on source-linked finance.
- Portal access depends on customer authentication and approved shop links. Booking depends on a working availability service; Fit Card imports depend on sharing authorization and versioned measurements.
- Automation depends on consent, durable jobs, provider configuration, audit, and truthful delivery states. Paid hosting also depends on entitlement and billing reconciliation.
- Staff working hours, holidays, leave, service durations, buffers, branch timezone, and trial conflicts belong to REQ-CALENDAR. Public booking consumes that schedule and capacity contract.

## Financial, quantity, and access contracts

These financial, quantity, and access rules apply across modules. The [architecture policies](architecture.md#domain-records-and-policies) define implementation defaults and ownership.

- Garment quantities are positive integers. Material quantities use fixed decimals and explicit units. A line with three shirts creates three independently tracked production units. Different wearers, measurement snapshots, or designs use separate commercial lines. Quantity reductions cannot remove delivered pieces or completed work without the relevant reversal or commercial-return command.
- Effective charge equals posted charge amounts minus posted charge credits. Net settlement equals posted receipt and credit-redemption allocations minus allocation reversals and settled refunds. Outstanding equals the positive part of effective charge minus net settlement. Any excess settlement is a visible customer liability, not negative receivables. Cash-change tender is not an allocation above the charge.
- A ₹1,000 fully paid order credited by ₹400 and refunded by ₹400 has a ₹600 effective charge and ₹600 net settlement, so its outstanding amount is zero. Before the refund settles, show a ₹400 refund liability without collecting another ₹400.
- Financial posting uses an append-only balanced journal by accounting owner and currency. The daybook projects actual cash movements. Shop finance and platform subscription finance have separate accounting owners, balances, and invoice identities. Each domain adds its posting rules before accepting its transactions. This does not claim a complete statutory accounting suite.
- Freeze price, package allocation, discount, tax, and cost calculations in the source record. Posted invoices keep their legal number/date and snapshot. Corrections issue linked adjustment documents; an audited order-display correction cannot rewrite an issued invoice.
- Authentication proves identity. Fitloom separately checks tenant membership, location, permission, field projection, subscription admission, and customer/operator authority. No active-tenant cookie, UI flag, QR code, or organization membership alone grants domain access.
- Suspension, plan expiry, override precedence, usage counting, owner export, and session revocation follow the explicit [access policy](architecture.md#authentication-and-entitlement-policy). Sensitive jobs recheck current access/request state before disclosure or deletion.

## Customer and measurement requirements

### REQ-HOME: Operational dashboard and global search

Sequence: P1. Users: shop staff, managers, and workers according to permission.

Required behavior: Show delivery, overdue, ready, receivable, stock, sales, unassigned work, team workload, and own-work counters. Provide operational queues, global customer/order search, quick actions, delivery-load and production charts, period/location filters, and onboarding progress. Financial cards require financial access. Announcements and advanced forecasts can arrive with their owning later capability.

Acceptance: A counter opens the same filtered records it counts. A failed query displays an unavailable/error state. Totals cover the authorized query scope rather than silently counting one loaded page.

### REQ-CRM: Customer register, profile, and history

Sequence: P1. Users: customer-facing staff and managers.

Required behavior: Create, search, edit, archive, and restore customers with country-aware mobile, name, email, address, notes, optional birthday, gender, height, weight, GSTIN, face/body photographs, preferences, segments, tags, and loyalty references. Show orders, payments, delivery, alterations, measurements, and app-connection history. Offer duplicate detection with an explicit reuse/keep-separate decision. Preserve historical records when a customer is archived.

Acceptance: Name and mobile search work across paginated records. Duplicate contact information never silently merges wearers. Linked financial history remains readable after archival, and image failures have a fallback.

### REQ-MEASURE: Versioned body and garment measurements

Sequence: P1. Users: authorized staff; customer read access in P3.

Required behavior: Store named wearers under a customer and body/garment profiles with typed dimensions, illustrated fields, notes, photos, date, source, explicit inch/cm units, and version history. Support garment-filtered reuse, copy-and-edit, body-to-garment mapping, custom dimensions, comparisons, charts, archival, and customer measurement QR cards. QR cards use an authorized, revocable projection rather than exposing a raw customer identifier. Preserve legacy garment definitions. Order confirmation captures measurement values, units, schema version, and provenance.

Acceptance: Editing a profile does not alter a historical order's measurements. Comparisons convert compatible units, mark absent dimensions as missing, and avoid treating bust/chest as equivalent without a defined mapping. Copying creates an independent editable version. Dirty forms require a discard decision.

### REQ-SCAN: Measurement-slip scanning with review

Sequence: P2. Users: measurement staff.

Required behavior: Capture/upload a photographed slip for the chosen garment, compress the input, and request extracted values. Distinguish high-confidence fills, low-confidence suggestions, and unmapped readings. Preserve the original inputs and allow undo. The user reviews and explicitly saves a new measurement version.

Acceptance: A scan failure preserves manual inputs. Low-confidence suggestions do not overwrite confirmed values. Undo restores dimensions, unit, wearer, and notes. Scanning alone never saves a customer profile or approves cutting instructions.

Integration contract: Before provider selection, define supported handwriting/languages, a representative slip corpus, accuracy/confidence checks, upload limits, provider retention, and whether images leave the server. OCR availability never blocks manual measurements. Test low-confidence, rotated, incomplete, and failed scans before marking support complete.

### REQ-MASTER: Garment, measurement, service, and add-on configuration

Sequence: P1. Users: owners and permitted managers.

Required behavior: Configure standard/custom garments, active state, default rates, measurement fields and sections, field types, icons, required fields, ordering, gender/category applicability, stitch types, illustrated construction options, add-ons, and material requirements. Maintain material/readymade types, stock units and unit codes, and size names/codes as inventory reference data. Permit hiding standard masters. Keep historical schema versions usable after an option is changed or retired.

Acceptance: Reordering persists consistently. Retiring a field cannot corrupt past measurements. Invalid definitions fail with field-specific errors, and unsaved changes require confirmation before discard.

### REQ-PACKAGE: Service packages and bundle pricing

Sequence: P2. Users: managers and intake staff.

Required behavior: Define active packages with description, garment components, quantities, rates, notes, and a selected component-priced or fixed-total pricing policy. Adding a package expands independent order lines and records the package version and allocation.

Acceptance: The advertised package total equals the quoted total under its selected policy. Later package edits/deletion do not alter existing orders. Discounts and tax apply once to the visible allocation.

## Order, workshop, and delivery requirements

### REQ-INTAKE: Guided order intake and garment detail

Sequence: P1. Users: sales, office staff, and managers.

Required behavior: Guide customer selection/inline creation, business/sale type, garment selection, measurements, dates, prices, and review. Support multiple garments, nickname, stitch options, quantity, up to the configured sales-staff allocation, urgent/express flags, material-received date, delivery time, function date, multiple trial appointments, instructions, video links, cloth images with length/per-piece metadata, and pattern photos. Allow adding to an existing order and resuming drafts.

Acceptance: All trials entered in the UI persist and reload. Required measurement links follow the garment's policy, with a clear authorized “pending measurement” path when allowed. Review shows the complete persisted quote. Temporary uploads and failed saves do not leave misleading confirmed orders.

Custody contract: Customer-supplied cloth has receipt, piece/length/unit, custodian/location, usage, waste, remnant, and return events. It is excluded from shop-owned stock valuation. Custody corrections retain source events. Acceptance includes receiving cloth, using part, and returning the remnant without creating purchased stock.

### REQ-ORDER: Order register, detail, amendments, and lifecycle

Sequence: P1. Users: authorized shop staff.

Required behavior: List tailoring, boutique, and mixed orders with active/past-due/upcoming/completed/urgent/delivered queues, text/date/location/taken-by filters, pagination, CSV, and refresh. Detail includes line items, images, assignments, timeline, attachments, customer contact, totals, and history. Support add/edit/archive lines, number/date corrections, repeat/clone selected items, cancellation, voiding, and authorized reopening.

Acceptance: Direct links load without prior list navigation. A repeat order copies chosen design/measurement data into a new record without copying payments, delivery, or completed tasks. Cancellation retains financial history and handles stock reservations. Intake finalization is separate from delivery or production completion.

Quantity contract: Commercial lines own independently identified garment pieces. Split progress, assignments, cancellation, and handover must work within one multi-piece line. A post-confirmation amendment preserves prior versions and validates existing deliveries, earnings, reservations, and charge credits. Returning a fulfilled sale does not automatically reopen it. Replacement work has an explicit linked obligation.

### REQ-PRICE: Canonical quotes, tax, discounts, and numbering

Sequence: P1. Users: intake/POS staff and finance.

Required behavior: Calculate quantity × unit rate, base and add-on charges, package allocation, express surcharge, customer loyalty discount, manual fixed/percentage discounts, tax, advance, total, and balance through a server-owned quote. Configure inclusive/exclusive tax, invoice identity, and automatic/manual/custom numbering. Permit explicit zero-price or price-later lines only under a named business policy. Treat discounts separately from received cash.

Acceptance: Preview, persisted order, invoice, and ledger allocations agree under documented rounding and operation order. Unusually large quotes require explicit confirmation at a configurable threshold. Number allocation remains unique under concurrent saves. A reset cannot reuse an existing number. Example regression: two ₹100 units, 10% discount, 5% exclusive tax, and ₹50 advance produce ₹189 total and ₹139 balance.

Calculation contract: Use the versioned rounding/allocation order in the architecture, with decimal-string inputs and explicit currency. Allocate fixed package totals and order discounts deterministically to lines before tax. Partial cancellation/return uses the original allocation. Invoice sequences are unique by accounting owner, document kind, and configured fiscal period; issued numbers cannot be reset, reused, or silently edited.

### REQ-COLLECT: Receipts, receivables, refunds, and corrections

Sequence: P1. Users: staff with collection rights and finance.

Required behavior: Record dated receipts with cash/UPI/card/bank components, references, notes, attachments, and source allocations. Support partial collections, full credit, balance lists, aging, reminders, payment history, receipt printing, and cancellation refunds. Corrections reverse and replace a posted receipt with an audit reason. Separate customer payment state from production and order lifecycle.

Acceptance: Reject nonfinite/nonpositive collections, invalid component sums, and overpayment unless an explicit credit policy exists. Retried requests post once. Reopening an order does not erase receipts. Reversed collections visibly adjust balance and ledger without deleting history.

Settlement contract: Record charge credits and refund liabilities separately from refund execution. Pending external refunds do not count as cash already paid out. Apply the effective-charge/net-settlement formulas above, including the paid ₹1,000 order with ₹400 credit/refund regression. Recording cash/UPI/card/bank identifies a method; gateway initiation, verified payment, and bank settlement require their own integration state.

### REQ-DOC: Invoices, receipts, payment advice, and order documents

Sequence: P1. Users: staff with relevant document permissions; linked customers in P3.

Required behavior: Generate versioned branded invoices/receipts, GST details, bill terms, payment advice, garment/whole-order references, QR outputs, PDF download, print, native share, and message-link sharing. Support configurable A4/A5 layouts, consolidated and price-breakup formats, and appropriate thermal retail formats. Record document generation errors and allow regeneration with version identity.

Acceptance: A worker lacking price permission cannot retrieve financial values through print, PDF, share, file URL, or QR. Historical invoices retain their original totals and branding snapshot. A failed generation never presents a broken URL as a completed document.

Document contract: Distinguish order confirmation, advance receipt, tax invoice, credit adjustment, and refund advice. Preserve issued legal identifiers and use linked corrections. Test A4, A5, and 58/80 mm thermal layouts with bundled fonts and representative local-language text. Browser printing requires an explicit user action; silent device-specific printing is not implied. Unsupported printer/script combinations remain unclaimed.

### REQ-PRODUCTION: Item stages, assignments, and production board

Sequence: P1. Users: managers, cutters, stitchers, and QC staff.

Required behavior: Provide simple and detailed progress views, per-item cutter/stitcher assignments, My Work, urgency/staff filters, drag/one-tap transitions, bulk assignment/movement, KPIs, timeline, and refresh. Configure optional ironing/QC stages. The default detailed template can cover material received, measurement taken, cutting assigned/started/completed, stitching assigned/started/completed, ironing, QC, ready, and delivered.

The board's delivered display is a projection of delivery events. It is not an independently editable production stage that bypasses quantity and handover checks.

Acceptance: Server checks each transition and assignment. Skips require an allowed workflow rule or an audited override. Batch actions report per-item failures. Completing work triggers each qualifying material/earning effect once.

Piece and earning contract: Stage/assignment events identify individual production units. Qualifying cutting/stitching completion accrues the minimal piece-rate earning in phase 4 using the assignment rate snapshot and a unique completion identity. Phase 5 adds payroll settlement and broader task/salary behavior. Retried completion cannot duplicate earnings. Rework/reopening creates an adjustment policy outcome rather than erasing an accrued or settled earning.

### REQ-TASK: Task planning, duration, execution, and cost allocation

Sequence: P2. Users: workshop managers and assigned workers.

Required behavior: Define ordered task types and durations, select tasks for a garment, assign staff and agreed rates, plan backward from expected completion/delivery, and show late start estimates. Track not started/in progress/completed with actors, timestamps, comments, and queues for delayed/today/tomorrow work. Allocate garment expense heads and show a clearly scoped item-cost estimate.

Acceptance: Task detail loads directly using its ID without requiring a prior list cache. Starting/finishing persists across direct navigation and refresh. Replanning started work requires an explicit amendment and cannot reset completed tasks. Resetting an accidental start records a reversal event. Expense estimates do not masquerade as full business profit.

### REQ-CALENDAR: Workload, trials, quantity delivery, and capacity

Sequence: P1 workload/trials/delivery and schedule primitives, P2 staff schedule exceptions, P3 public booking integration. Users: intake, delivery, and workshop managers.

Required behavior: Offer date-grouped queues and week/month/multi-month workload views, trial and delivery appointments, daily capacity ranges, drill-down, monthly summaries, and upcoming windows. Record delivered quantities by line, optional balance collection at handover, and ready/delivered bulk actions.

Acceptance: Net delivered quantity never exceeds ordered quantity minus cancelled undelivered quantity. Commercial returns have their own eligibility and replacement rules and do not silently reduce fulfillment. Partial handover leaves remaining quantities visible. Capacity color ranges reject invalid overlaps. Whole-order delivery validates every remaining line and applies the configured balance policy.

Schedule ownership: Maintain location timezone, staff working hours, holidays, leave, appointment types, durations, buffers, and staff/location capacity. Scheduled trials use these rules. Existing appointments are not silently moved when working hours change. Validate interval conflicts and concurrent confirmation/rescheduling on the server. Start schedule primitives in phase 4, expand staff exceptions in phase 5, and consume them for phase 8 booking.

### REQ-ALTER: Standalone alterations and rework

Sequence: P2. Users: front office and workshop staff.

Required behavior: Create an alteration for a saved customer or walk-in with contact, item description, notes, price, payment, due date, and pending/in-progress/done/delivered state. Link order rework to the original item while retaining its original delivery and payment history. Archive with a reason and retain financial records.

Acceptance: A payment cannot exceed the alteration's collectible amount. Editing contact after selection requires confirming or clearing the customer link. Payment changes produce financial correction records rather than rewriting the original collection date.

### REQ-JOB: Workshop job cards and visual construction sheets

Sequence: P1 basic cards, P2 visual configurator. Users: assigned workers and managers.

Required behavior: Produce authenticated item-level sheets with garment appearance, construction choices, component checklist, material images/color, measurements, source version, technical notes, and QR reference. Persist reviewed design choices; restrict modification of completed sheets to an explicit revision.

Acceptance: A QR grants only its authorized projection and does not expose financial/customer data beyond permission. Completed-sheet edits create a new revision. A profile measurement edit cannot change the sheet's cutting snapshot.

### REQ-GALLERY: Design gallery and reusable media

Sequence: P2. Users: authorized design and sales staff.

Required behavior: Browse/search folders and named images, create/rename/archive folders, upload images, manage favorites, and inspect a keyboard/touch carousel. Attach chosen designs to garments as independent references.

Acceptance: View, edit, and favorite operations follow explicit permissions. Archiving a gallery entry does not break an existing order's design reference. Invalid file uploads fail clearly.

## Retail, stock, and procurement requirements

### REQ-PRODUCT: Retail catalog and stock master

Sequence: P2. Users: stock managers and sales staff.

Required behavior: Maintain readymade products with SKU/barcode, name, category, size/color variants, unit, supplier, cost/selling price, images, HSN/tax category, active state, reorder threshold, and quantity discount tiers. Support catalog search, valuation, low-stock summaries, import templates and row-level CSV outcomes. Legacy local data migration requires preview and duplicate detection.

Acceptance: SKU uniqueness follows tenant policy. Variant stock is unambiguous. Opening stock posts once, and edits require an explicit stock adjustment. Archiving preserves historical sale snapshots.

### REQ-POS: Retail/material checkout, held carts, and loyalty

Sequence: P2 checkout, held carts, and loyalty. Users: counter sales and cashiers.

Required behavior: Support product/material search, size guide, line quantities/rates, add/remove items, discounts, applicable tax, optional alteration/stitching charges, customer selection, cash change, split payment, full credit, receipts, and later collection. Hold/resume/delete carts with customer, branch, discounts, loyalty, and exchange-credit state. Configure loyalty earning/redemption and show scoped margin estimates only to permitted staff.

Acceptance: Checkout revalidates available stock and prices. Credit requires customer contact. Resume restores the same customer and cart context and requotes changed prices. Concurrent checkout cannot oversell. An explicit zero rate is not silently replaced with catalog price.

Loyalty contract: Keep a server-owned append-only points ledger for earn, redeem, expiry, and reversal. Freeze the rule version, conversion value, caps, eligible amount, and discount treatment on the sale. Reject concurrent redemption beyond the available balance. A partial return reverses the originally allocated points and handles spent earned points through an explicit adjustment/debt policy. Held carts do not reserve stock or points until an explicit reservation exists.

### REQ-RETURN: Retail returns, refunds, and exchanges

Sequence: P2. Users: authorized sales managers and finance.

Required behavior: Select return quantities against original sold lines, record reason and resellable/damaged disposition, calculate refund with original tax/discount allocation, restore eligible stock, and optionally issue exchange credit for a new cart. Exclude nonreturnable service lines unless a separate service-refund policy allows them.

Acceptance: Cumulative returns cannot exceed eligible sold quantity. A return produces a consistent refund/credit and stock outcome. External refund failures remain visible and retryable. Exchange credit cannot be redeemed twice.

Return contract: Retain original charge, discount, tax, loyalty, and cost allocations. A return creates a charge credit, a refund or exchange-credit liability, and the selected stock disposition atomically. Settle an external refund separately. Restock at the original attributable cost, not the latest selling/catalog price. A return is distinct from reversing an accidental delivery; a replacement requires an explicit linked order obligation.

### REQ-MATERIAL: Material inventory, variants, reservations, and consumption

Sequence: P2 basic stock and advanced tracking. Users: inventory and workshop staff.

Required behavior: Maintain fabrics/notions with SKU, category, unit, costs, supplier, barcode, images, storage location, reorder settings, transaction history, and valuation. Support fabric width/roll/remaining length, size/color variants, serial-tracking configuration, component bundles, reserved/available quantities, waste, order-linked consumption, release, and demand/reorder suggestions. Validate an actual serial workflow before advertising serialized traceability.

Acceptance: Opening quantity creates exactly one movement. Stock effects carry source IDs and units; invalid unit conversions fail. Consumption and bundle expansion are atomic and cannot double deduct on retry. Availability subtracts active reservations.

Stock policy: The initial policy rejects negative availability, uses fixed-decimal compatible-unit conversions, and requires explicit release/expiry events for reservations. Customer-owned cloth uses the intake custody record. Valued movements capture their cost under the architecture's moving-weighted-average policy; later catalog cost changes cannot rewrite stock history.

### REQ-PURCHASE: Direct purchases, stock adjustments, and history

Sequence: P2. Users: inventory staff and finance.

Required behavior: Receive material/readymade purchases with quantity, unit cost, supplier, date, and payment/payable reference. Support manual stock-in/out with reason, source history, purchase search/grouping, CSV, and purchase corrections.

Acceptance: Receipt, movement, cost, and finance references reconcile. Correcting a purchase posts a compensating movement and financial adjustment. It cannot silently overwrite stock after some received units have been consumed.

Receiving dependency: A minimal vendor identity exists before supplier-linked receiving. Purchase corrections after consumption retain original movements and post the required quantity/cost/payable adjustments. Do not recompute historical sales margins from the current master cost.

### REQ-VENDOR: Vendor directory and supplier information

Sequence: P2. Users: procurement managers and finance.

Required behavior: Create/search/edit/archive vendors with contacts, tax details, payment terms, documents, controlled bank details, CSV import, purchase/receipt history, performance, reviews, and communication log.

Acceptance: Sensitive bank/documents require explicit permission. Archive retains PO references. CSV imports report row-level validation and duplicate outcomes.

### REQ-PO: Purchase orders, approval, and goods receiving

Sequence: P2. Users: procurement, approvers, receiving staff, and finance.

Required behavior: Manage draft/approved/ordered/partially received/received/cancelled POs, quick-create linked inventory, supplier/delivery/payment information, receipt history, and analytics. Configure automatic reorder drafting by threshold, quantity, and vendor; approval remains a configurable policy.

Acceptance: Partial receipts accumulate by line and do not exceed an approved tolerance. Cancellation affects remaining quantities, preserving receipts. A retried receipt adds stock once. Auto-reorder suppresses duplicate open demand.

### REQ-TRANSFER: Inter-location stock transfers

Sequence: P2. Users: authorized source and destination inventory staff.

Required behavior: Dispatch quantities between distinct locations, track in-transit/completed/cancelled state, receive at destination, cancel with reason, and inspect history.

Acceptance: Dispatch removes availability at source and records in-transit quantity. Receive posts destination stock once. Cancellation restores eligible source stock once and cannot cancel already received units silently.

### REQ-COUNT: Physical stock reconciliation

Sequence: P2. Users: counters and authorized reviewers.

Required behavior: Start/resume a count from a system-stock snapshot, save physical quantities, review variances, and post approved adjustments with actor and date.

Acceptance: Concurrent stock movement is frozen or reconciled through a documented cutoff rule. Reposting the same count cannot duplicate adjustments. Count history preserves expected, counted, and adjusted quantities.

### REQ-LABEL: Barcode, QR, scanning, and label printing

Sequence: P2. Users: inventory and sales staff.

Required behavior: Look up catalog/stock using camera or hardware scanner; support item QR download, batch labels, thermal/A4 formats, and serial-number allocation where configured. Provide permission-denied, unknown-code, and camera-error states.

Acceptance: Labels resolve the intended tenant/item/variant and remain stable after renaming. Concurrent batches cannot allocate duplicate label serials. Scanning does not grant unauthorized item access.

### REQ-INVREPORT: Inventory and supplier analytics

Sequence: P2 inventory/supplier reports, P3 advanced demand estimates. Users: inventory/procurement managers.

Required behavior: Report stock turnover, aging/slow movers, consumption, supplier performance, demand/reorder estimates, and cost valuation by authorized location and period. Export inventory to CSV and configured accounting formats, including the evidenced Tally XML, QuickBooks IIF, and Zoho CSV formats.

Acceptance: Reports reconcile to stock/receipt history. Forecasts identify their time window and missing data. Export formats use tested schemas and explicit accounting mappings before being advertised as compatible.

Cost and export contract: Use frozen movement/receipt/sale costs under the selected valuation policy. Returns and corrections reconcile that history. Verify each advertised accounting format against representative target-system imports, field mappings, tax accounts, and error results. A generated XML/IIF/CSV file alone does not establish compatibility.

## Workforce, finance, and analytics requirements

### REQ-WORKER: Worker records, staff linkage, and assignments

Sequence: P1. Users: owners and workshop managers.

Required behavior: Maintain worker contacts/photos/active status, production specialization, location membership, optional login link, per-worker garment rates, assignment history, task/dress assignment reports, and own-work views. Support invitation/account provisioning without treating every worker as a login seat.

Acceptance: Assignment identity uses IDs, so duplicate worker names remain distinct. Deactivation preserves work and earnings. Location changes do not expose another location's work implicitly.

### REQ-ROLE: Granular permissions and location membership

Sequence: P1. Users: owners and delegated access administrators.

Required behavior: Provide built-in role presets and custom roles for web access, customer/gallery access, order creation/editing, assignment/task management, prices, collections, reports, setup, and operator actions. Offer View Permissions and multi-location roles. Protect built-in definitions while allowing assigned presets to be changed by authorized administrators.

Acceptance: Authorization covers direct URLs, API calls, document generation, downloads, and exports. Removing a membership invalidates access within the defined revocation window. A user cannot grant a permission beyond their delegation rights.

### REQ-WAGE: Earnings, salary, advances, and payouts

Sequence: P1 minimal piece-rate accrual with production completion, P2 salary/advances/deductions/settlements. Users: payroll staff, managers, and workers viewing own records.

Required behavior: Support cutting/stitching/garment/task piece rates and monthly/daily salary configuration. Accrue eligible completed work at agreed rates; show dues by worker/date/paid state. Select whole earning rows for settlement, record salary/advance/deduction/piece payments, method/date/notes, payout history, monthly summaries, CSV, and corrections.

Acceptance: A unique earning cannot be settled twice. Rate changes preserve prior accrued/paid amounts. A payout reversal reinstates only eligible unpaid earnings and reverses its financial posting. Payroll totals reconcile to earnings, advances, deductions, and actual payouts.

Accrual sequence: Minimal piece-rate accrual starts with phase 4 completion events. Every eligible completion stores worker, production unit, role/task, agreed rate, currency, and operation identity. Reassignment and completion reversal preserve prior accruals and settled history. Salary-period, advance, deduction, and recovery policies must be versioned before their phase 5 commands are enabled.

### REQ-EXPENSE: Categorized expenses and recurring schedules

Sequence: P1 basic expenses, P2 recurrence. Users: authorized staff and finance.

Required behavior: Configure expense heads, create/edit/archive entries with date, amount, category, payment method, location, notes and receipt, view summaries, and schedule recurring expenses with explicit posting rules. Garment-specific costs link to the item without double counting shop expense.

Acceptance: Today's date is permitted unless a named business policy restricts it. A recurring run is idempotent. Correcting a posted expense retains its original record and financial reversal.

### REQ-LEDGER: Daybook, cashflow, and source-linked finance

Sequence: P1. Users: owners and finance.

Required behavior: Combine collections, retail receipts, refunds, purchases, expenses, wages, and manual in/out entries into a date/location-scoped daybook with source breakdown, party, method, notes, totals, and CSV. Keep billed revenue, received cash, receivables, inventory cost, and estimated profit distinct.

Acceptance: Each posting resolves to its source transaction. Income minus expense is labeled cashflow under the chosen method. Reversing a source creates the matching correction, and manual-entry changes cannot orphan their ledger history.

Journal contract: Each posted transaction balances debits and credits per accounting owner/currency and links to the business operation. Define posting matrices for charges, advances, receipts, charge credits, refund/exchange-credit liabilities, supplier payables/payments, costs, expenses, and wages before their owning module posts them. A paid-on-receipt purchase cannot count twice as an expense and a supplier payment. Estimated margin, journal income, and cashflow have separate definitions.

### REQ-REPORT: Standard reports and business insights

Sequence: P1 core operational/financial reports, P2 domain reports, P3 advanced insights. Users: owners and permitted managers.

Required behavior: Provide sales, collections, dues, bills, garment rankings, retail results, customer repeat/spend, worker throughput, express/regular comparison, monthly trends, weekday/date rankings, expense breakdown, procurement, and scoped profit/cashflow views. Filter date presets, location, category, worker, and customer; drill into source records; export CSV/Excel/PDF where appropriate. Forecasting and retention insights show assumptions and data sufficiency.

Acceptance: Aggregates and exports cover the entire authorized filtered dataset. A truncated/incomplete report is clearly labeled and cannot claim complete totals. Estimates state excluded costs and do not present cashflow as profit.

### REQ-CUSTOMREPORT: Saved custom reports

Sequence: P3. Users: permitted analysts/managers.

Required behavior: Save named report definitions with approved data source, columns, filters, grouping, sort, and chart type. Run and export PDF/CSV with the current user's authorized scope.

Acceptance: A saved definition cannot bypass tenant/financial permissions. Invalid fields and unsupported combinations fail clearly. Report definition versions make later output reproducible.

## Workspace and platform foundations

### REQ-AUTH: Business sign-in, account security, and sessions

Sequence: P1. Users: business users and operators.

Required behavior: Support configured email/password, Google, and phone OTP sign-in; verification, resend, password reset/change, invitation activation, session restoration, logout, and authenticator second factor. Handle inactive users, changed roles, expired sessions, and remembered-device choice with explicit policy.

Acceptance: Password change reports success only after a successful persisted server operation. OTP/MFA validation is rate-limited and server-verified. Logout invalidates the intended session, and stale client state cannot bypass membership checks.

Authority policy: Start with verified email/password, password recovery, database-backed sessions, and mandatory operator authenticator MFA. Keep customer and operator authority explicit even if one identity has several roles. Disable session cookie caching initially and recheck membership/entitlement per protected request. Revoked sessions or memberships fail the next protected request after the revocation commits. Remaining configured Google/phone/customer methods keep their roadmap completion owners.

### REQ-ONBOARD: Shop creation, setup, and first-use guidance

Sequence: P1. Users: owners and invited staff.

Required behavior: Collect business profile, tailoring/boutique/both mode, specialization, plan/trial selection, referral/promo input, and consent. Support optional/resumable setup, verification before provisioning, default masters, first-store setup, guided tours, and opt-in sample data with removal. Track setup and first-order completion.

Acceptance: Repeated provisioning cannot create duplicate tenants. Sample records are clearly marked and removable without deleting real records. Completing one step persists and can resume on another session.

Import contract: Each supported CSV/legacy import has a dry-run preview, stable source IDs, duplicate decisions, row errors, retry identity, and reconciliation totals. Whole legacy order/payment/measurement migration is not assumed from product CSV support; record the formats and their owning requirement before implementing each importer. Use synthetic/sample data for the development server and keep sample removal separate from real records.

### REQ-WORKSPACE: Tenant workspace, stores, and navigation

Sequence: P1 multi-tenant workspaces with an initial location per tenant, P2 advanced multi-location workflows. Users: authorized business members.

Required behavior: Provide role-aware navigation, eligible-shop/location switcher, tenant branding, outlet/workshop/both configuration, main-shop designation, directory, contact/social/map/address/logo/photo details, and optional main-shop value copying. Support tenant-wide reports through explicit All Locations access.

Acceptance: Multiple independent tenants can be provisioned and operated from the foundation phase. Tenant selection is server-authorized, and cross-tenant record references are rejected. Switching tenant or location updates every list, draft context, cache, and mutation target. No client sentinel value broadens scope without authorization. Whether multiple workshops are allowed is a configurable policy rather than a copied reference restriction.

### REQ-SETTINGS: Business, appearance, and document preferences

Sequence: P1. Users: owners and relevant administrators.

Required behavior: Configure business/receipt identity, GSTIN/tax behavior, units, services offered, standard-master visibility, invoice/PDF templates, numbering policy, wage defaults, optional production stages, list windows, language/theme/fullscreen preferences, and customer-status notification selections. Support the business user's personal profile and avatar. Distinguish user preferences from shared shop settings.

Acceptance: Saved settings refresh affected views and are consistent across devices where shared. Unsaved previews do not change stored values. Financial/document setting changes are versioned and cannot rewrite historical documents.

### REQ-BACKUP: Scheduled business exports and recovery

Sequence: P1 operational backup/recovery, P2 scheduled business exports. Users: owners and authorized data administrators.

Required behavior: Configure activation, daily/weekly/monthly/yearly frequency, timezone, recipient, email attachment or protected cloud-link delivery. Provide run status, history, failures, retry, and download expiry. Define a separate operational backup/restore procedure with an exercised recovery check.

Acceptance: Delivery choices accurately describe delivery rather than frequency. A schedule alone is not labeled a completed backup. An authorized sample export can be opened, its record coverage checked, and the recovery procedure exercised before claiming restoration support. Restore/history are proposed completeness requirements beyond Tailormate's extracted schedule UI.

Development recovery: Use the matched database-dump, private-file, configuration, and release manifest backup defined in the architecture. Take an encrypted copy outside the VPS, initially through a restic repository on the operator workstation. A local staging backup is not a host-loss backup. Use the restore/move procedure when recovery or a machine change is needed; no upfront trial environment is required. Production RPO/RTO, continuous WAL archiving, and retention commitments are a later prelaunch decision.

### REQ-AUDIT: Business audit and change history

Sequence: P1 for critical writes, P2 general viewer. Users: owners and authorized auditors.

Required behavior: Record actor, tenant/location, entity, action, timestamp, reason, before/after changes, and operation ID for sensitive business changes, assignments, money, stock, settings, and authorization. Provide search/filter/detail and correct entity deep links.

Acceptance: Posted corrections keep original events. An expense audit link opens the expense rather than a bill. Worker/customer projections exclude private audit fields.

### REQ-PLAN: Plans, usage limits, trial, and account access

Sequence: P1 mandatory SaaS foundation, P3 expanded administration. Users: owners and operators.

Required behavior: Define configurable plans, monthly/yearly comparison, resource limits, business-type features, trial policy, override precedence, usage indicators, and trial/active/grace/expired/suspended states. Support mid-session reevaluation, renewal reminders, and protected owner data export after operational lockout.

Acceptance: UI promises and effective entitlement checks agree. A usage limit is enforced at commit under concurrency. Plan changes show their actual effective state. Reference plan names/prices are evidence, not Fitloom commercial commitments.

Foundation ownership: Provide a manual, authorized owner export in phase 1, including during ordinary subscription lockout; scheduled delivery remains phase 5. Security suspension follows the restricted operator-reviewed export procedure. Usage limits are enforced atomically using versioned count rules, tenant-local periods, and explicit unlimited values. Overrides can change commercial access but cannot grant permissions or bypass security suspension.

### REQ-BILLING: Subscription payment, invoices, and referral credits

Sequence: P1 subscription billing foundation, P3 referral incentives and expanded commercial administration. Users: owners and operators.

Required behavior: Select/renew/upgrade plans, create hosted provider checkout, verify provider results, show activation pending/success/failure, renewal/auto-renew state, billing invoices/history, referrals, promo validation, and applied credits. Record manual subscription payments through authorized operator actions.

Acceptance: Client checkout success alone never activates access. Verified duplicate provider events apply once. A failed or pending activation remains visible, with reconciliation and retry. Exact pricing, proration, refunds, and referral terms remain open.

### REQ-CACHE: Installable web access and offline boundaries

Sequence: P2. Users: business staff and customers where supported.

Required behavior: Provide installable app metadata, shortcuts, cached shell/resources, local draft recovery, and honest offline status. Protect cached customer data. Permit offline reads/drafts within defined scope, and require explicit synchronization results for queued work.

Acceptance: Offline payment/stock/order actions never appear confirmed without a committed server result. Reconnect detects conflicts instead of overwriting current work. Logout or tenant switch prevents another user from reading private cached data.

Offline policy: The initial installable app caches public shell assets and explicitly allowed local draft fields. Private API responses, photos, measurements, financial records, and documents are excluded from service-worker caching by default. Tenant/principal-scoped drafts expire under policy and are cleared on logout or context switch. Previously downloaded files cannot be remotely erased. No offline financial/order/stock confirmation is implied.

## Customer access and engagement

### REQ-PUBLIC: Public shop, showcase, and limited tracking

Sequence: P2. Users: public visitors and customers.

Required behavior: Publish configured identity/contact/social links, hours/location, gallery/lookbook, starting prices, booking/contact actions, help/product pages, and app links. Track orders through an unguessable scoped link or verified phone/order flow with limited fields. Reflect the actual configured workflow, optional stages, and current progress.

Acceptance: Invalid/expired tracking credentials reveal no customer/order details. Disabled stages do not appear as unfinished work. Refresh behavior is visible, and unavailable shops have a truthful error state. Phone plus order number requires abuse controls and a defined privacy policy.

### REQ-CUSTAUTH: Customer identity and linked-shop selection

Sequence: P3. Users: customers.

Required behavior: Offer configured phone OTP, email OTP, or Google customer sign-in, identity completion, resend/back navigation, session handling, global/tenant entry, and selection among approved linked shops.

Acceptance: A customer identity cannot read a shop record until its link is authorized. Customer and business/operator roles do not share an implicit session authority. Revoked links stop new reads and downloads.

### REQ-PORTAL: Customer orders, invoices, measurements, and profile

Sequence: P3. Users: signed-in linked customers.

Required behavior: Provide dashboard, order progress, cross-shop search/filter, appointments/history/cancellation, garment measurements, invoices/tax breakdown, PDF download/share, display-name edits, and push registration/subscription management.

Acceptance: Cross-shop results contain only approved links. A customer can read only the projection permitted by the shop and consent policy. Expired file links and unavailable data show errors rather than fabricated empty success.

### REQ-BOOK: Public and customer appointment booking

Sequence: P3. Users: visitors/customers and shop schedulers.

Required behavior: Show shop booking details, appointment types, dates, available slots, staff-aware capacity, sign-in before confirmation, notes, success/empty/error states, cancellation rules, and history. Incorporate trial appointments from orders where the scheduling policy requires it.

Acceptance: Slot availability comes from a working service. Concurrent bookings cannot exceed capacity. A confirmed booking has a persisted ID, and failures do not show confirmation. Do not reproduce the reference route-not-found slot behavior.

Booking dependency: Use REQ-CALENDAR working-time and resource rules before exposing confirmation. Availability is advisory until a transactional reservation succeeds. Default development fixtures use 30-minute slots and capacity one per staff member; other durations/capacities require explicit configuration. Cancellation and rescheduling retain history and revalidate capacity. Duplicate requests return the same booking.

### REQ-FIT: Shareable Fit Cards and reviewed measurement import

Sequence: P3. Users: consenting customers and authorized shop staff.

Required behavior: Share selected measurement versions through expiring, revocable tokens with source attribution, units, measurement date, and verify-before-cutting warning. Accept links/codes, select entries, create/reuse a customer, detect duplicate imports, and require explicit cross-phone confirmation when allowed. Imported copies become independent shop-owned versions.

Acceptance: Tokens cannot access unselected profiles. Revocation prevents further fetches. Imports preserve provenance and never overwrite a confirmed order snapshot. Phone mismatch does not silently attach another person's measurements.

Copy boundary: Revocation blocks future authorized fetches. It cannot erase an already downloaded file or independent imported shop version. Explain that distinction when sharing/importing, retain provenance/consent, and process deletion requests against each holder's retention policy. Direct download-link lifetime must match the declared revocation window.

### REQ-CONNECT: Customer app invitations and connection approvals

Sequence: P3. Users: shop staff and customers.

Required behavior: Create/share tokenized invitations and mobile landing links, inspect link state, approve/reject connection requests against an existing/new shop customer, and disconnect.

Acceptance: Invitations expire, are scoped to their intended shop/customer action, and cannot be reused beyond policy. Approval records who linked which identities. Disconnect revokes future portal access without deleting shop history.

### REQ-NOTIFY: Reminders, campaigns, messaging, and notification center

Sequence: P1 manual reminders, P2 preferences/notification center, P3 automation/campaigns. Users: staff, customers, and operators.

Required behavior: Provide delivery/pickup/payment queues, ready-for-pickup nudges, template previews, WhatsApp/SMS composers, notification preferences/center, consented automatic WhatsApp, bulk customer message preparation, inactivity segmentation, recovery campaigns, execution/results, and push delivery where supported.

Acceptance: Opening a composer records “opened,” not “delivered.” Provider-backed sends expose queued/accepted/delivered/failed states where supplied. Campaigns honor consent and deduplication. Retry never repeats business mutations. Provider policy and template constraints are configurable integration rules.

### REQ-ENGAGE: Shop achievements and activation challenges

Sequence: P3. Users: shop owners.

Required behavior: Track qualifying activity, achievement levels, monthly progress, acknowledgement, optional sharing, and first-order/first-sale challenge progress with incomplete-order guidance and configured rewards.

Acceptance: Qualifying rules are visible and computed from persisted eligible records. Reversed/test/sample orders follow an explicit exclusion policy. A reward is applied once.

### REQ-TOOLS: Tailoring calculators and advice

Sequence: P3. Users: tailoring staff.

Required behavior: Offer bust/blouse estimates from bra size, height/weight waist estimates, flat-garment-to-body estimates, fabric estimates by width/garment/sleeve/size/print matching, standard size references, inch/cm conversion, and tailoring advice.

Acceptance: Estimates state inputs, units, method, and that they require physical verification. They never automatically become confirmed customer measurements. Conversion uses 2.54 cm per inch; incomplete/out-of-range inputs produce a clear validation state.

### REQ-SUPPORT: Help, tours, spoken guidance, and support tickets

Sequence: P1 written help/contact, P2 tours/audio/tickets. Users: business users and public visitors where intended.

Required behavior: Provide contextual help, searchable manual, FAQs, role-aware first-use tours, optional localized spoken walkthroughs, audio/visual fallback, support contacts, and ticket submission/status/history. Allow restarting or dismissing guidance.

Acceptance: Help is accessible without audio and does not block primary work. A contact composer is not labeled a sent ticket. Submitted tickets have persisted IDs and visible failure handling.

Triage dependency: When phase 5 ticket intake starts, provide a minimal authorized operator queue/detail/status path. The full shared messaging inbox remains phase 9. A persisted ticket without a reachable operator handling path does not complete this capability.

### REQ-PRIVACY: Consent, sharing, personal exports, and deletion requests

Sequence: P1 consent/access boundaries, P3 self-service workflows. Users: customers, owners, and privacy operators.

Required behavior: Manage consent preferences, nominees where policy permits, export requests/downloads, deletion request/cancellation, sharing revocation, and tenant-aware data ownership. Preserve required financial/audit records according to the selected retention policy while processing eligible personal data.

Acceptance: Export identity and scope are verified. Downloads expire and are audited. A deletion request has a reviewable status and policy outcome; the UI never promises immediate deletion where retention or approval prevents it. Jurisdiction-specific policy requires separate confirmation.

Retention contract: Define separate retention for photos, measurements, local drafts, exported files, historical order documents, financial postings, audit, and backups. Revocation controls future access, not copies already held by recipients. Keep deletion/suppression records outside a restored data snapshot or reconcile them before reopening restored access, so old backups do not silently republish deleted data. Financial-history retention and nominee authority require the applicable policy before real-data use.

## Software-operator requirements

Operator functions are separate from shop administration. Tenant provisioning, lifecycle enforcement, subscription administration, and audited operator access are part of the production SaaS foundation. Later phases extend the same operations into the complete console.

### REQ-OPS-TENANT: Tenant directory, lifecycle, overrides, and trials

Sequence: P1 minimum provisioning/support, P3 full console. Users: authorized platform operators.

Required behavior: Search/filter/create/edit tenants, inspect owner/contact/business type, usage/security/activation funnel, extend/reactivate trials, activate/suspend, soft-delete/restore, unlock accounts, initiate owner credential recovery, apply resource/feature overrides, manage demo access, and export authorized tenant usage.

Acceptance: Changes persist and display effective values. Suspension and overrides affect server admission. Credential recovery does not reveal existing passwords. Deletion/restore follows retention and operator permission rules.

### REQ-OPS-PLAN: Platform plans, subscriptions, and billing administration

Sequence: P1 subscription and billing operations, P3 full console. Users: billing operators.

Required behavior: Edit/version plan identity, pricing, feature flags and limits; activate/synchronize plans; inspect/change/pause/resume subscriptions; extend grace; record manual payments; list invoices and failed payments; download invoices and issue reminders; view revenue/signup/tenant analytics and exports.

Acceptance: Editing a plan has an explicit effective date and grandfathering rule. Manual payments are auditable and deduplicated. Platform billing and effective tenant entitlements reconcile.

### REQ-OPS-SUPPORT: Platform support and shared messaging inbox

Sequence: P3. Users: support operators.

Required behavior: Search/filter tickets and conversations, inspect ticket details, update status/notes/assignee/read state, send text/media/approved templates, and inspect/retry failed messaging webhook events.

Acceptance: Replies are tenant-scoped and follow the provider's permitted conversation/template policy. Retried webhook events do not create duplicate replies or tickets. Sensitive support access is audited.

### REQ-OPS-COMMS: Announcements, campaigns, referrals, and templates

Sequence: P3. Users: communications operators.

Required behavior: Create/edit/publish/unpublish announcements, shop-page activation/email campaigns, referral programs/promos, and transactional/marketing templates with preview, test, active state, and deletion rules.

Acceptance: Drafts remain unpublished. Test sends are explicitly distinguished from production sends. Campaigns record recipient scope, consent basis, and outcome without exposing another tenant's data.

### REQ-OPS-FLAG: Rollout flags and guarded bulk actions

Sequence: P3. Users: restricted operators.

Required behavior: Configure rollout flags and targeting, activate/disable/retire flags, preview selected tenants, and run bulk email, suspension, activation, plan change, or deletion actions through authorized jobs.

Acceptance: Preview states exact target scope and action. Execution records per-tenant outcome and operation ID, supports bounded retry, and requires the configured confirmation for destructive bulk changes. A rollout flag does not bypass permission or entitlement checks.

### REQ-OPS-SYSTEM: Operator identity, policy, audit, and system settings

Sequence: P1 operator access/audit minimum, P3 full settings. Users: platform administrators.

Required behavior: Maintain operator users/roles/permissions, searchable platform audit, application identity/support details, session/password/MFA policy, SMTP/email defaults and tests, and scheduled email-job switches.

Acceptance: Operators cannot elevate their own privileges outside delegation policy. Secret values are stored privately and are not returned in general settings reads. A settings update affects actual server policy or reports that the capability is unsupported.

### REQ-OPS-HEALTH: Tenant health, platform metrics, and alerts

Sequence: P1 operational telemetry, P2 expanded monitoring, P3 console. Users: operations staff.

Required behavior: Show system/tenant health, resource usage, issue categories, thresholds, alert rule lifecycle, alert events/acknowledgement, and trends. Separate estimated counts from exact metrics.

Acceptance: Every health state includes observation time and error context. Missing telemetry cannot display healthy zeroes. Alert acknowledgements preserve actor/time and do not erase the underlying issue.

### REQ-OPS-RETENTION: Privacy operations and retention processing

Sequence: P1 authorized operational procedure, P3 self-service processing and full console. Users: restricted privacy operators.

Required behavior: Review export/deletion requests, execute or cancel eligible deletion, configure retention policy, manage downloadable export jobs, and record trial/deletion scheduled processing outcomes.

Acceptance: Processing checks identity, ownership, applicable retention, and request state. Jobs support safe retry and produce an audit trail. Cancelled requests cannot be processed by a stale queued job.

### REQ-OPS-CONTENT: Public content and blog administration

Sequence: P3. Users: content operators.

Required behavior: Create/edit draft articles, publish/unpublish, upload/remove cover images, and optionally import sample content in a marked nonproduction context.

Acceptance: Publication respects access and validation. Removing an image does not break unrelated articles. Sample imports do not silently publish test content.

## Cross-cutting acceptance requirements

The following are proposed Fitloom guarantees derived from the source limitations and operational needs. They are not independently extracted reference features.

| ID | Required outcome |
| --- | --- |
| NFR-ACCESS | Server enforcement, tenant-qualified relations, and PostgreSQL RLS isolate tenant-owned business records. Runtime roles cannot own tables or bypass RLS. Validate identity/membership before transaction-local tenant context. Test missing context, pooled-connection reuse, jobs, fields, files, and customer/operator projections with at least two tenants. |
| NFR-CONSISTENCY | Business changes, critical audit, idempotency results, and outbox/job records commit in the same PostgreSQL transaction. Every mutation defines operation-key scope, request hash, replay result, and concurrent conflict handling. Failure injection cannot create duplicate or half-posted local effects. |
| NFR-MONEY | Use a fixed decimal/currency representation and documented rounding/allocation order. Never rely on binary floating point for authoritative totals. Store currency and original price/tax snapshots. |
| NFR-HISTORY | Measurements, prices, wage rates, document versions, corrections, and critical events remain historically reproducible. Archive rather than destroy referenced operational records. |
| NFR-QUERY | Search and aggregate over authorized server data with pagination. Explain incomplete imports, exports, reports, and failed queries. Never silently report capped subsets as complete totals. |
| NFR-USABILITY | Responsive tables/cards, keyboard access, labeled controls, touch work actions, inline validation, readable contrast, and loading/empty/error/retry states apply across modules. Target WCAG 2.2 AA as a proposed accessibility goal, subject to implementation verification. |
| NFR-FILES | Validate file type/size, authorize private retrieval, expire shared links, and clean up orphaned uploads according to retention policy. QR/deep links convey only intended scope. |
| NFR-JOBS | Application jobs expose pending/running/succeeded/failed state, bounded retries, terminal failure, and correlation IDs. At-least-once execution requires business/provider idempotency. Verify provider signatures on raw bytes; durably capture deduplicated inbox events before acknowledging them and handle out-of-order delivery. Host backup timers expose their own durable result/history. |
| NFR-OBSERVE | Log command/job failures with tenant-safe diagnostics. Monitor incomplete financial/stock operations, queue lag, failed notifications, and backup freshness. |
| NFR-RECOVERY | Implement daily/pre-move matched database/file/configuration backups with an encrypted off-VPS copy and restore/move commands. Use them during actual recovery or machine changes. Whole-product production RPO/RTO, WAL/PITR, backup retention, and availability commitments are selected before real-data launch. |
| NFR-PERFORMANCE | Resolve VPS-3 resource bottlenecks as actual features, builds, and reports are implemented. Bound worker/PDF/OCR concurrency, database pools, uploads, query time, logs, and disk use. Record measurements and tune development budgets. Production tenant counts, volumes, latency objectives, and capacity remain a separate prelaunch decision. |
| NFR-LOCAL | Store timestamps with timezone context, present shop-local dates, retain measurement units/currency, support configured languages, and keep original input precision through conversion. |
| NFR-PORTABILITY | Version Ansible host setup and Compose services/networks/ports/volumes, pin releases, and externalize secrets. For an actual host move, rebuild a compatible Linux target, restore its matched data backup, and cut over with one active writer. This is not an upfront environment exercise. Reapplying setup preserves data. Provider account/VPS purchase, assigned public IP, and DNS delegation are explicit external inputs. |

## Recommended delivery sequence

| Stage | Intended result | Included implementation |
| --- | --- | --- |
| P1: SaaS foundation and tailoring operations | Production multi-tenancy, identity/workspaces, plans/entitlements/subscription billing, operator access, audit/recovery, customers, measurements, garment masters, tailoring intake, prices/documents/collections, production/job cards/trials/delivery, expenses/daybook/core reports | Implement partial delivery, financial reconciliation, tenant/role isolation, subscription lifecycle, corrections, and operational recovery in the retained application. |
| P2: Workshop, inventory, retail, and location depth | Scan slips, packages, tasks, visual sheets/gallery, alterations, wages, products/materials/direct purchases, vendors/POs, reservations/transfers/counts/labels, POS/mixed orders, returns/exchanges, loyalty, multi-location workflows, recurring work, scheduled exports, public shop/tracking, and domain reports | Implement retry handling, concurrent stock changes, selected-row payouts, PO partial receipts, retail returns/restock, and location isolation. |
| P3: Customer and operator expansion | Customer authentication/portal, booking, Fit Cards/connections, campaigns/push, achievements/tools, custom reports, privacy self-service, and complete operator suite/content | Implement customer link isolation/revocation, capacity-safe booking, consented communications, privacy processing, and scoped bulk operator actions. |

These groups describe cumulative construction of the complete product. There is no validation-only implementation stage or requirement to release a smaller version before continuing. The roadmap phases are the authoritative detailed sequence. SaaS billing, entitlement enforcement, tenant isolation, audit, and operational recovery start in the foundation and remain required throughout development. Production launch timing is a separate decision.

## End-to-end acceptance scenarios

These describe complete product behavior as its modules are implemented. They are not a separate validation phase, an upfront trial workspace, or a prerequisite to start development.

1. Create a customer with two wearers and two measurement versions. Confirm an order using one version, then edit the profile. The original job card and invoice remain reproducible.
2. Create a multi-line tailoring order with express charge, add-ons, discount, tax, and advance. Assign tasks, complete cutting/stitching, deliver one quantity, collect a partial balance, then finish delivery. Reconcile quantities, receipts, ledger, earnings, and history.
3. Hold a retail cart with its customer and loyalty state, resume it, complete split payment, return part of a line, and apply exchange credit once. Reconcile sale, stock, refund, credit, and receipt.
4. Receive a partial PO, reserve stock for work, consume material, dispatch and receive a transfer, then post a physical count. Retry each command and prove quantities do not duplicate.
5. Accrue earnings for two workers with identical names. Change the current rate, settle selected rows, and reverse one payout. Original rates and worker identities remain correct.
6. Attempt direct API/document/export access as a worker, another location, another tenant, and an unlinked customer. Each result respects data and field permissions.
7. Simulate provider failure after local commit, then retry payment verification, notification, and refund work. Business records remain consistent, and pending external actions remain visible.
8. Approve a customer link, book a slot concurrently with another customer, share/revoke a Fit Card, export authorized personal data, and cancel a deletion request before its queued processor runs.
9. Expire a plan mid-session. Protected mutations stop according to policy while authorized owner export and renewal remain available. Duplicate billing callbacks do not double-activate credits or access.
10. Run a scheduled export, inspect its contents, and execute the approved recovery procedure. Recreate the stack from versioned Ansible/Compose on a clean target, restore a matched database/file/configuration backup, open historical files, reconcile totals, and prove only one writer/side-effect worker is active after cutover. A configuration screen alone does not satisfy recovery or portability.
11. Confirm three identical garment pieces, assign different workers, complete two, deliver one, and cancel one undelivered piece. Reverse an accidental completion/delivery through explicit events. Commercially return a sold piece and verify it does not create an unrequested replacement.
12. Fully settle a ₹1,000 order, post a ₹400 charge credit, and settle a ₹400 refund. Outstanding stays zero, refund liability becomes zero after settlement, and each accounting owner/currency journal balances. Exercise duplicate and failed refund settlement.

## Open decisions

The selected baseline and remaining decision deadlines are recorded below.

| Decision | Selected baseline or remaining decision | Owner and latest safe point |
| --- | --- | --- |
| Product direction | Full production multi-tenant SaaS, continuous retained implementation, tailor-first order. Current hosting is development/testing. | Confirmed by user. Preserve scope through phases 1–9. |
| Stack and hosting | OVHcloud VPS-3, 6 vCores, 12 GB RAM, 100 GB NVMe. Ubuntu 24.04 LTS, Ansible, Compose, and the application/library stack in architecture. | Selected. Pin compatible package/image versions while implementing the actual phase 1 application; fix integration issues as encountered. |
| Money and documents | Decimal calculations, balanced journals, immutable charge credits/refunds, original allocations, and fiscal document sequences. INR is the development fixture currency. | Product owner confirms actual market, currency, tax/invoice rules, fiscal year, and zero-price policy before issuing the relevant real document. Development uses explicit test policies. |
| Production and quantities | Individual garment units, separate return/replacement obligations, phase 4 piece-rate accrual, explicit cloth custody. Default fixture workflow and overrides are in architecture. | Product owner confirms real garment templates, QC/trial/skip/unpaid-delivery rules before operational use. |
| Location policies | Tenant isolation and location-qualified records/grants are mandatory from phase 1; additional locations arrive in phase 7. | Product owner chooses workshop/outlet relationships, cross-location customer/pricing policy, and consolidated reporting grants before phase 7 commands. |
| Identity and access | Better Auth database sessions, operator MFA, fresh protected-request checks, explicit authority and entitlement precedence. | Selected foundation. Product owner confirms optional owner MFA and remaining configured login methods before their owning phase completes. |
| Stock and loyalty | Moving weighted average, original-cost returns, nonnegative availability, explicit reservation releases, server-owned loyalty journal. | Selected stock baseline. Product owner sets PO tolerance, transfer partial-receipt policy, loyalty rates/caps/expiry, and serial scope before those phase 6–7 commands. |
| Payroll | Assignment rate snapshots and minimal phase 4 piece-rate accrual. Phase 5 adds salary and settlement. | Product owner defines salary accrual, advances/deductions, rework, and settled-earning adjustment rules before those commands are enabled. |
| Scheduling | REQ-CALENDAR owns working-time/capacity; phase 8 booking consumes it. Fixture slots are 30 minutes with one place per staff member. | Product owner sets hours, leave, durations, buffers, resource capacity, cancellation, and rescheduling policy before accepting real bookings. |
| Providers and integration contracts | Nodemailer SMTP adapter selected. Payments, phone OTP, messaging, and OCR use versioned adapters and sandbox/provider fixtures during development. | Developer evaluates contracts; product owner selects accounts/terms before integration acceptance. Missing credentials cannot count as a completed provider integration. |
| Subscription offer | Versioned trial/plan/grace/override rules, atomic usage admission, protected owner export, and separate platform accounting. | Product owner sets real prices, renewal/proration/refund/referral rules before exposing their commercial actions. Test plans do not set public prices. |
| Recovery and scale | One shared development server, daily/pre-move dumps plus encrypted file/configuration backup, basic alerts, and implemented migration commands. | Selected development scope. Product owner sets production traffic/capacity, availability, RPO/RTO, retention, and support coverage before real-data launch. |
| Privacy and sharing | Private-file projections, future-access revocation, explicit downloaded/imported-copy limits, restore-time deletion reconciliation. | Product owner confirms jurisdiction, photo limits, wearer identity/consent, retained financial records, and nominee authority before real-data use. Fit Card fields/expiry and cross-shop sharing policy are due before phase 8 sharing. |
| Imports and accounting exports | Dry-run, source IDs, row outcomes, and reconciliation for each claimed format. Complete legacy-history migration is not inferred. | Developer and product owner specify input/target formats before implementing each import/export. |
| Analytics and automation | Source-reconciled reports, explicit estimate scope, consent and truthful delivery, idempotent recurrence. | Product owner selects forecast methods, data sufficiency, campaign consent, and recurring timing before their owning phase. |

A recorded policy gate addresses a review gap without inventing legal, commercial, or payroll decisions. It blocks its affected command or real-data release, not unrelated development.

## Evidence limits

The original Tailorman, Tailormate, and NoolTech reports are retained verbatim in the `research_notes` sections of [the frozen reference baseline](references/reference_baseline.json). They describe the inspected builds and their boundaries. Most entries are code-defined, with browser evidence of forms, screens, restrictions, or previews. Successful writes, server authorization, provider delivery, backup execution, and complete backend behavior were generally not established. Raw scripts and screenshots are archived outside this workspace. Their original coordinates and hashes remain provenance metadata, not live local dependencies.

The consolidated baseline preserves those limits. It covers every supplied inventory row, not every possible feature of the original applications. Architectural choices and acceptance criteria are proposed Fitloom design work. The archived coverage verification checks mapping and source preservation, not implementation readiness or business correctness. Its location is recorded in [README](README.md).
