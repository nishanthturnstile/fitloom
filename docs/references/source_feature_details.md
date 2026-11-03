# Source feature details

This appendix preserves every supplied feature entry under one canonical requirement. Descriptions below state extracted reference behavior, including limitations and defects. They are not claims that Fitloom implements that behavior. The [canonical requirements](../product/requirements.md) and [architecture decisions](../architecture/overview.md) resolve conflicts.

Complete original records, source coordinates, configuration references, and authored findings are retained in [the frozen reference baseline](reference_baseline.json). Raw scripts and screenshots have been archived outside this workspace. Evidence paths and anchors below are historical coordinates, not local file links.

Scope update on 2026-11-01: extracted subscription, commercial plan/quota, platform-billing, and payment-provider behaviors remain reference evidence but are deferred until explicitly reopened. They do not require implementation in the internal product or phase 9. Shop collections, refunds, invoices/receipts, and other business payments remain required as manual records. The frozen baseline and requirement mappings are preserved.

Coverage: 860 source entries mapped to 64 canonical requirements. Counts describe inventory entries, not deduplicated actions or executed business tests.

## Requirement and application coverage

An empty source column means no entry is assigned to this capability in that extraction. It does not prove the application lacks related functionality.

| Requirement | Tailorman | Tailormate | NoolTech |
| --- | ---: | ---: | ---: |
| [REQ-HOME: Operational dashboard and global search](../product/requirements.md#req-home-operational-dashboard-and-global-search) | 9 | 7 | 7 |
| [REQ-CRM: Customer register, profile, and history](../product/requirements.md#req-crm-customer-register-profile-and-history) | 11 | 6 | 9 |
| [REQ-MEASURE: Versioned body and garment measurements](../product/requirements.md#req-measure-versioned-body-and-garment-measurements) | 9 | 10 | 15 |
| [REQ-SCAN: Measurement-slip scanning with review](../product/requirements.md#req-scan-measurement-slip-scanning-with-review) | 3 |  |  |
| [REQ-MASTER: Garment, measurement, service, and add-on configuration](../product/requirements.md#req-master-garment-measurement-service-and-add-on-configuration) | 7 | 15 | 2 |
| [REQ-PACKAGE: Service packages and bundle pricing](../product/requirements.md#req-package-service-packages-and-bundle-pricing) | 4 |  |  |
| [REQ-INTAKE: Guided order intake and garment detail](../product/requirements.md#req-intake-guided-order-intake-and-garment-detail) | 5 | 14 | 7 |
| [REQ-ORDER: Order register, detail, amendments, and lifecycle](../product/requirements.md#req-order-order-register-detail-amendments-and-lifecycle) | 9 | 16 | 17 |
| [REQ-PRICE: Canonical quotes, tax, discounts, and numbering](../product/requirements.md#req-price-canonical-quotes-tax-discounts-and-numbering) | 6 | 5 | 6 |
| [REQ-COLLECT: Receipts, receivables, refunds, and corrections](../product/requirements.md#req-collect-receipts-receivables-refunds-and-corrections) | 10 | 3 | 9 |
| [REQ-DOC: Invoices, receipts, payment advice, and order documents](../product/requirements.md#req-doc-invoices-receipts-payment-advice-and-order-documents) | 3 | 7 | 5 |
| [REQ-PRODUCTION: Item stages, assignments, and production board](../product/requirements.md#req-production-item-stages-assignments-and-production-board) | 14 |  | 10 |
| [REQ-TASK: Task planning, duration, execution, and cost allocation](../product/requirements.md#req-task-task-planning-duration-execution-and-cost-allocation) |  | 14 |  |
| [REQ-CALENDAR: Workload, trials, quantity delivery, and capacity](../product/requirements.md#req-calendar-workload-trials-quantity-delivery-and-capacity) | 6 | 7 | 3 |
| [REQ-ALTER: Standalone alterations and rework](../product/requirements.md#req-alter-standalone-alterations-and-rework) | 5 |  | 1 |
| [REQ-JOB: Workshop job cards and visual construction sheets](../product/requirements.md#req-job-workshop-job-cards-and-visual-construction-sheets) | 2 |  | 6 |
| [REQ-GALLERY: Design gallery and reusable media](../product/requirements.md#req-gallery-design-gallery-and-reusable-media) |  | 6 |  |
| [REQ-PRODUCT: Retail catalog and stock master](../product/requirements.md#req-product-retail-catalog-and-stock-master) | 7 | 4 | 10 |
| [REQ-POS: Retail/material checkout, held carts, and loyalty](../product/requirements.md#req-pos-retailmaterial-checkout-held-carts-and-loyalty) | 8 | 5 | 18 |
| [REQ-RETURN: Retail returns, refunds, and exchanges](../product/requirements.md#req-return-retail-returns-refunds-and-exchanges) |  |  | 3 |
| [REQ-MATERIAL: Material inventory, variants, reservations, and consumption](../product/requirements.md#req-material-material-inventory-variants-reservations-and-consumption) | 6 | 5 | 12 |
| [REQ-PURCHASE: Direct purchases, stock adjustments, and history](../product/requirements.md#req-purchase-direct-purchases-stock-adjustments-and-history) | 9 | 10 | 2 |
| [REQ-VENDOR: Vendor directory and supplier information](../product/requirements.md#req-vendor-vendor-directory-and-supplier-information) |  |  | 7 |
| [REQ-PO: Purchase orders, approval, and goods receiving](../product/requirements.md#req-po-purchase-orders-approval-and-goods-receiving) |  |  | 11 |
| [REQ-TRANSFER: Inter-location stock transfers](../product/requirements.md#req-transfer-inter-location-stock-transfers) |  |  | 2 |
| [REQ-COUNT: Physical stock reconciliation](../product/requirements.md#req-count-physical-stock-reconciliation) |  |  | 3 |
| [REQ-LABEL: Barcode, QR, scanning, and label printing](../product/requirements.md#req-label-barcode-qr-scanning-and-label-printing) |  |  | 6 |
| [REQ-INVREPORT: Inventory and supplier analytics](../product/requirements.md#req-invreport-inventory-and-supplier-analytics) |  |  | 6 |
| [REQ-WORKER: Worker records, staff linkage, and assignments](../product/requirements.md#req-worker-worker-records-staff-linkage-and-assignments) | 3 | 10 | 5 |
| [REQ-ROLE: Granular permissions and location membership](../product/requirements.md#req-role-granular-permissions-and-location-membership) | 1 | 8 | 3 |
| [REQ-WAGE: Earnings, salary, advances, and payouts](../product/requirements.md#req-wage-earnings-salary-advances-and-payouts) | 9 | 10 | 3 |
| [REQ-EXPENSE: Categorized expenses and recurring schedules](../product/requirements.md#req-expense-categorized-expenses-and-recurring-schedules) | 6 | 5 | 6 |
| [REQ-LEDGER: Daybook, cashflow, and source-linked finance](../product/requirements.md#req-ledger-daybook-cashflow-and-source-linked-finance) | 7 |  |  |
| [REQ-REPORT: Standard reports and business insights](../product/requirements.md#req-report-standard-reports-and-business-insights) | 11 | 11 | 12 |
| [REQ-CUSTOMREPORT: Saved custom reports](../product/requirements.md#req-customreport-saved-custom-reports) |  |  | 5 |
| [REQ-AUTH: Business sign-in, account security, and sessions](../product/requirements.md#req-auth-business-sign-in-account-security-and-sessions) | 11 | 10 | 10 |
| [REQ-ONBOARD: Shop creation, setup, and first-use guidance](../product/requirements.md#req-onboard-shop-creation-setup-and-first-use-guidance) | 5 | 1 | 8 |
| [REQ-WORKSPACE: Tenant workspace, stores, and navigation](../product/requirements.md#req-workspace-tenant-workspace-stores-and-navigation) | 3 | 9 | 2 |
| [REQ-SETTINGS: Business, appearance, and document preferences](../product/requirements.md#req-settings-business-appearance-and-document-preferences) | 2 | 5 | 4 |
| [REQ-BACKUP: Scheduled business exports and recovery](../product/requirements.md#req-backup-scheduled-business-exports-and-recovery) |  | 3 |  |
| [REQ-AUDIT: Business audit and change history](../product/requirements.md#req-audit-business-audit-and-change-history) | 3 |  | 1 |
| [REQ-PLAN: Plans, usage limits, trial, and account access](../product/requirements.md#req-plan-plans-usage-limits-trial-and-account-access) | 11 |  | 7 |
| [REQ-BILLING: Subscription payment, invoices, and referral credits](../product/requirements.md#req-billing-subscription-payment-invoices-and-referral-credits) | 3 |  | 4 |
| [REQ-CACHE: Installable web access and offline boundaries](../product/requirements.md#req-cache-installable-web-access-and-offline-boundaries) | 3 |  | 2 |
| [REQ-PUBLIC: Public shop, showcase, and limited tracking](../product/requirements.md#req-public-public-shop-showcase-and-limited-tracking) | 5 |  | 10 |
| [REQ-CUSTAUTH: Customer identity and linked-shop selection](../product/requirements.md#req-custauth-customer-identity-and-linked-shop-selection) |  |  | 8 |
| [REQ-PORTAL: Customer orders, invoices, measurements, and profile](../product/requirements.md#req-portal-customer-orders-invoices-measurements-and-profile) |  |  | 18 |
| [REQ-BOOK: Public and customer appointment booking](../product/requirements.md#req-book-public-and-customer-appointment-booking) |  |  | 6 |
| [REQ-FIT: Shareable Fit Cards and reviewed measurement import](../product/requirements.md#req-fit-shareable-fit-cards-and-reviewed-measurement-import) |  |  | 6 |
| [REQ-CONNECT: Customer app invitations and connection approvals](../product/requirements.md#req-connect-customer-app-invitations-and-connection-approvals) |  |  | 10 |
| [REQ-NOTIFY: Reminders, campaigns, messaging, and notification center](../product/requirements.md#req-notify-reminders-campaigns-messaging-and-notification-center) | 2 | 1 | 14 |
| [REQ-ENGAGE: Shop achievements and activation challenges](../product/requirements.md#req-engage-shop-achievements-and-activation-challenges) |  |  | 7 |
| [REQ-TOOLS: Tailoring calculators and advice](../product/requirements.md#req-tools-tailoring-calculators-and-advice) |  |  | 8 |
| [REQ-SUPPORT: Help, tours, spoken guidance, and support tickets](../product/requirements.md#req-support-help-tours-spoken-guidance-and-support-tickets) | 9 | 2 | 2 |
| [REQ-PRIVACY: Consent, sharing, personal exports, and deletion requests](../product/requirements.md#req-privacy-consent-sharing-personal-exports-and-deletion-requests) |  |  | 4 |
| [REQ-OPS-TENANT: Tenant directory, lifecycle, overrides, and trials](../product/requirements.md#req-ops-tenant-tenant-directory-lifecycle-overrides-and-trials) | 7 |  | 15 |
| [REQ-OPS-PLAN: Platform plans, subscriptions, and billing administration](../product/requirements.md#req-ops-plan-platform-plans-subscriptions-and-billing-administration) | 2 |  | 12 |
| [REQ-OPS-SUPPORT: Platform support and shared messaging inbox](../product/requirements.md#req-ops-support-platform-support-and-shared-messaging-inbox) |  |  | 8 |
| [REQ-OPS-COMMS: Announcements, campaigns, referrals, and templates](../product/requirements.md#req-ops-comms-announcements-campaigns-referrals-and-templates) |  |  | 9 |
| [REQ-OPS-FLAG: Rollout flags and guarded bulk actions](../product/requirements.md#req-ops-flag-rollout-flags-and-guarded-bulk-actions) |  |  | 5 |
| [REQ-OPS-SYSTEM: Operator identity, policy, audit, and system settings](../product/requirements.md#req-ops-system-operator-identity-policy-audit-and-system-settings) |  |  | 7 |
| [REQ-OPS-HEALTH: Tenant health, platform metrics, and alerts](../product/requirements.md#req-ops-health-tenant-health-platform-metrics-and-alerts) | 3 |  | 7 |
| [REQ-OPS-RETENTION: Privacy operations and retention processing](../product/requirements.md#req-ops-retention-privacy-operations-and-retention-processing) |  |  | 3 |
| [REQ-OPS-CONTENT: Public content and blog administration](../product/requirements.md#req-ops-content-public-content-and-blog-administration) |  |  | 4 |

## Capabilities evidenced in one source inventory

These groups are retained in the consolidated scope. Source-specific variants also occur inside shared groups, such as Tailormate's cloth-photo metadata and NoolTech's measurement history comparisons.

- [REQ-SCAN: Measurement-slip scanning with review](../product/requirements.md#req-scan-measurement-slip-scanning-with-review), Tailorman.
- [REQ-PACKAGE: Service packages and bundle pricing](../product/requirements.md#req-package-service-packages-and-bundle-pricing), Tailorman.
- [REQ-TASK: Task planning, duration, execution, and cost allocation](../product/requirements.md#req-task-task-planning-duration-execution-and-cost-allocation), Tailormate.
- [REQ-GALLERY: Design gallery and reusable media](../product/requirements.md#req-gallery-design-gallery-and-reusable-media), Tailormate.
- [REQ-RETURN: Retail returns, refunds, and exchanges](../product/requirements.md#req-return-retail-returns-refunds-and-exchanges), NoolTech.
- [REQ-VENDOR: Vendor directory and supplier information](../product/requirements.md#req-vendor-vendor-directory-and-supplier-information), NoolTech.
- [REQ-PO: Purchase orders, approval, and goods receiving](../product/requirements.md#req-po-purchase-orders-approval-and-goods-receiving), NoolTech.
- [REQ-TRANSFER: Inter-location stock transfers](../product/requirements.md#req-transfer-inter-location-stock-transfers), NoolTech.
- [REQ-COUNT: Physical stock reconciliation](../product/requirements.md#req-count-physical-stock-reconciliation), NoolTech.
- [REQ-LABEL: Barcode, QR, scanning, and label printing](../product/requirements.md#req-label-barcode-qr-scanning-and-label-printing), NoolTech.
- [REQ-INVREPORT: Inventory and supplier analytics](../product/requirements.md#req-invreport-inventory-and-supplier-analytics), NoolTech.
- [REQ-LEDGER: Daybook, cashflow, and source-linked finance](../product/requirements.md#req-ledger-daybook-cashflow-and-source-linked-finance), Tailorman.
- [REQ-CUSTOMREPORT: Saved custom reports](../product/requirements.md#req-customreport-saved-custom-reports), NoolTech.
- [REQ-BACKUP: Scheduled business exports and recovery](../product/requirements.md#req-backup-scheduled-business-exports-and-recovery), Tailormate.
- [REQ-CUSTAUTH: Customer identity and linked-shop selection](../product/requirements.md#req-custauth-customer-identity-and-linked-shop-selection), NoolTech.
- [REQ-PORTAL: Customer orders, invoices, measurements, and profile](../product/requirements.md#req-portal-customer-orders-invoices-measurements-and-profile), NoolTech.
- [REQ-BOOK: Public and customer appointment booking](../product/requirements.md#req-book-public-and-customer-appointment-booking), NoolTech.
- [REQ-FIT: Shareable Fit Cards and reviewed measurement import](../product/requirements.md#req-fit-shareable-fit-cards-and-reviewed-measurement-import), NoolTech.
- [REQ-CONNECT: Customer app invitations and connection approvals](../product/requirements.md#req-connect-customer-app-invitations-and-connection-approvals), NoolTech.
- [REQ-ENGAGE: Shop achievements and activation challenges](../product/requirements.md#req-engage-shop-achievements-and-activation-challenges), NoolTech.
- [REQ-TOOLS: Tailoring calculators and advice](../product/requirements.md#req-tools-tailoring-calculators-and-advice), NoolTech.
- [REQ-PRIVACY: Consent, sharing, personal exports, and deletion requests](../product/requirements.md#req-privacy-consent-sharing-personal-exports-and-deletion-requests), NoolTech.
- [REQ-OPS-SUPPORT: Platform support and shared messaging inbox](../product/requirements.md#req-ops-support-platform-support-and-shared-messaging-inbox), NoolTech.
- [REQ-OPS-COMMS: Announcements, campaigns, referrals, and templates](../product/requirements.md#req-ops-comms-announcements-campaigns-referrals-and-templates), NoolTech.
- [REQ-OPS-FLAG: Rollout flags and guarded bulk actions](../product/requirements.md#req-ops-flag-rollout-flags-and-guarded-bulk-actions), NoolTech.
- [REQ-OPS-SYSTEM: Operator identity, policy, audit, and system settings](../product/requirements.md#req-ops-system-operator-identity-policy-audit-and-system-settings), NoolTech.
- [REQ-OPS-RETENTION: Privacy operations and retention processing](../product/requirements.md#req-ops-retention-privacy-operations-and-retention-processing), NoolTech.
- [REQ-OPS-CONTENT: Public content and blog administration](../product/requirements.md#req-ops-content-public-content-and-blog-administration), NoolTech.

## Detailed source entries

## REQ-HOME: Operational dashboard and global search

Target behavior and acceptance: [REQ-HOME](../product/requirements.md#req-home-operational-dashboard-and-global-search).

### Tailorman F001: Daily operational counters

Source module: Dashboard. Evidence class: Code-defined.

Shows today's deliveries, overdue orders, ready orders, payment-pending bills, boutique sales today, boutique low stock, items needing a cutter, and items needing a stitcher. Failed summary queries show a dash and an error toast instead of a confident zero.

Original role context: admin, cashier

Verification gap: Code-defined. This row does not establish a successful business write or server-side enforcement.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F001` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/dashboard.js`. Anchor: `async function loadSummary(dataPromise)`.

### Tailorman F002: Operational bill queues

Source module: Dashboard. Evidence class: Code-defined.

Tabs show Today's Deliveries, Overdue, Ready for Delivery, Pending, and Payment Pending. Pending fetches up to 50 bills. Other tabs reuse prefetched results. Rows open the bill and show customer, date, status, and balance.

Original role context: admin, cashier

Verification gap: Code-defined. This row does not establish a successful business write or server-side enforcement.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F002` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/dashboard.js`. Anchor: `function buildTabs()`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/dashboard.js`. Anchor: `async function renderTab(tab)`.

### Tailorman F003: Delivery load chart

Source module: Dashboard. Evidence class: Code-defined.

Groups active bills due today through the next six days into a seven-day bar chart. Input is capped at 500 active bills.

Original role context: admin, cashier

Verification gap: Code-defined. This row does not establish a successful business write or server-side enforcement.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F003` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/dashboard.js`. Anchor: `function renderDeliveryChart(active)`.

### Tailorman F004: Production funnel chart

Source module: Dashboard. Evidence class: Code-defined.

Counts ordered pieces, using each line's quantity, across Intake, Cutting, Stitching, Ironing, QC Check, and Ready. Multiple detailed production states map to each logical bucket.

Original role context: admin, cashier

Verification gap: Code-defined. This row does not establish a successful business write or server-side enforcement.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F004` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/dashboard.js`. Anchor: `function renderFunnelChart(active)`.

### Tailorman F005: Collections history chart

Source module: Dashboard. Evidence class: Code-defined.

Admin sees a 30-day income chart and total, using account-entry occurredAt dates rather than bill creation dates. It includes ledger income sources, and reads up to 1000 entries. Cashiers do not get the collections panel.

Original role context: admin

Verification gap: Code-defined. This row does not establish a successful business write or server-side enforcement.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F005` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/dashboard.js`. Anchor: `function renderRevenueChart(ledger)`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/dashboard.js`. Anchor: `const canSeeLedger = currentRole === "admin";`.

### Tailorman F006: Top garment types chart

Source module: Dashboard. Evidence class: Code-defined.

Ranks six garment types by quantity ordered on bills created in the past 30 days, using up to 1000 recent bills.

Original role context: admin, cashier

Verification gap: Code-defined. This row does not establish a successful business write or server-side enforcement.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F006` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/dashboard.js`. Anchor: `function renderItemTypesChart(recent)`.

### Tailorman F007: Unassigned work queues

Source module: Dashboard. Evidence class: Code-defined.

Need Cutter and Need Stitcher cards open item lists, showing bill/customer, garment quantity, current stage, delivery date, and material color. Select individual items or all items, choose an active employee of the matching role or an admin, and confirm assignment.

Original role context: admin, cashier

Verification gap: Code-defined. This row does not establish a successful business write or server-side enforcement.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F007` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/dashboard.js`. Anchor: `async function renderAssignTab(role)`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/dashboard.js`. Anchor: `function bindAssignActions(role)`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/db.js`. Anchor: `export async function bulkAssignItems(role, employeeId, employeeName, picks)`.

### Tailorman F008: First-order guidance and sample data

Source module: Dashboard. Evidence class: Code-defined.

Empty due-today or pending queues can offer Create your first bill and an admin-only Explore with sample data action. The action dynamically loads the tenant's sample-data seeder and reloads the dashboard.

Original role context: admin, cashier

Verification gap: Code-defined. Seeding was not invoked. The empty-shop heuristic uses current operational queues rather than an all-time bill count.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F008` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/dashboard.js`. Anchor: `function bindSeedSampleBtn()`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/dashboard.js`. Anchor: `function updateFirstBillBanner()`.

### Tailorman F195: Global customer and bill search

Source module: Workspace and navigation. Evidence class: Code-defined.

Debounces input for 250 ms and requests up to six customers and six bills concurrently. Customer results show name, phone and address. Bill results show number, customer, item count, status and positive balance. Selecting a result opens its detail page.

Original role context: App users with underlying read permission

Verification gap: Search UI and queries are code-defined. Worker access to returned collections and actual search results were not tested.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F195` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/ui.js`. Anchor: `function attachGlobalSearch()`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/ui.js`. Anchor: `searchCustomers({ term: q, pageSize: 6 })`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/ui.js`. Anchor: `}, 250);`.

### Tailormate F189: Daily, weekly, monthly, and yearly filters

Source module: Dashboard. Evidence class: Code-defined.

Dashboard defaults to Daily and today. Switching period resets the date to today. Date inputs switch among day, week, month/year, and year selectors. Request arguments include period, month, year, rep_start_date, shop_id, and user_id. Week/month/year starts are normalized before querying.

Original role context: Signed-in shop user; client permissions and selected-shop context apply

Verification gap: Code-defined. This source review did not execute the action, verify a persisted result, or test backend authorization. Parent browser observations provide separate screen context.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F189` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/page-dc9b232cad4b57dc.js`. Anchor: `let[es,ei]=(0,o.useState)("1")`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/page-dc9b232cad4b57dc.js`. Anchor: `rep_start_date:(0,L._)(es,ed)`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/page-dc9b232cad4b57dc.js`. Anchor: `startOf("week").format("YYYY-MM-DD")`.

### Tailormate F190: Selected or combined location reports

Source module: Dashboard. Evidence class: Code-defined.

The dashboard location selector shows All location plus loaded shops, uses location label or shop name, defaults to the selected workspace shop, and follows later header shop changes. A combined location removes the particular shop filter in its report request.

Original role context: Signed-in shop user; client permissions and selected-shop context apply

Verification gap: Code-defined. This source review did not execute the action, verify a persisted result, or test backend authorization. Parent browser observations provide separate screen context.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F190` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/page-dc9b232cad4b57dc.js`. Anchor: `label:"All location",value:null`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/page-dc9b232cad4b57dc.js`. Anchor: `shop_id:null!=eu?eu:void 0`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/page-dc9b232cad4b57dc.js`. Anchor: `g.Z.subscribe((e,r)=>`.

### Tailormate F191: Sales and payment counters

Source module: Dashboard. Evidence class: Code-defined.

Display API-provided total sales, total payments, material sales, and readymade sales. Total Payments is removed when MANAGE_PAYMENTS is not granted. Missing values become zero. VIEW_REPORTS denial redirects this page to active orders.

Original role context: Signed-in shop user; client permissions and selected-shop context apply

Verification gap: Code-defined. This source review did not execute the action, verify a persisted result, or test backend authorization. Parent browser observations provide separate screen context.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F191` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/page-dc9b232cad4b57dc.js`. Anchor: `text:"Total sales"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/page-dc9b232cad4b57dc.js`. Anchor: `hidden:!r`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/page-dc9b232cad4b57dc.js`. Anchor: `en||er.replace("/orders/active")`.

### Tailormate F192: Operational order counters

Source module: Dashboard. Evidence class: Code-defined.

Display orders received, orders delivered, orders past due, and upcoming orders from the API performance/order response. The upcoming label uses orders_due_today rather than an independently calculated future window.

Original role context: Signed-in shop user; client permissions and selected-shop context apply

Verification gap: Code-defined. This source review did not execute the action, verify a persisted result, or test backend authorization. Parent browser observations provide separate screen context.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F192` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/page-dc9b232cad4b57dc.js`. Anchor: `text:"Order received"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/page-dc9b232cad4b57dc.js`. Anchor: `text:"Order Past Due"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/page-dc9b232cad4b57dc.js`. Anchor: `eg.orders_due_today`.

### Tailormate F193: Order and sales charts

Source module: Dashboard. Evidence class: Code-defined.

Display monthly order totals as a bar chart and sales-by-type values as a pie chart. Each uses response-supplied titles and data and has an empty state. Order x-axis labels concatenate the returned day with the browser current month abbreviation, regardless of the chosen report date.

Original role context: Signed-in shop user; client permissions and selected-shop context apply

Verification gap: Code-defined. Historical-period chart labels need a runtime check with populated data; the client uses the current month token in this path.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F193` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/page-dc9b232cad4b57dc.js`. Anchor: `"Total Orders: "`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/page-dc9b232cad4b57dc.js`. Anchor: `labels:eN.labels,options:T,series:eN.series`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/page-dc9b232cad4b57dc.js`. Anchor: `concat(h()().format("MMM"))`.

### Tailormate F194: Current and predicted sales display

Source module: Dashboard. Evidence class: Code-defined.

The sales-prediction panel compares response fields months_sales and predicted_sales in a horizontal bar chart labelled Current and Predicted. The client does not implement the forecasting model or establish that it uses AI.

Original role context: Signed-in shop user; client permissions and selected-shop context apply

Verification gap: Code-defined display of server-provided predictions. Forecast accuracy, method, and training data are unknown.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F194` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/page-dc9b232cad4b57dc.js`. Anchor: `labels:["Current","Predicted"]`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/page-dc9b232cad4b57dc.js`. Anchor: `monthly_prediction_report.predicted_sales`.

### Tailormate F195: Detailed-report navigation

Source module: Dashboard. Evidence class: Code-defined.

View Detail Reports opens the Insights Report route from the dashboard. Dashboard and report filters have separate defaults rather than passing the current dashboard period in the link.

Original role context: Signed-in shop user; client permissions and selected-shop context apply

Verification gap: Code-defined. This source review did not execute the action, verify a persisted result, or test backend authorization. Parent browser observations provide separate screen context.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F195` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/page-dc9b232cad4b57dc.js`. Anchor: `er.push("/reports/insights")`.

### NoolTech F001: Revenue and business summary

Source module: Dashboard. Evidence class: Code-defined.

Dashboard requests location-aware summary data; renders revenue, orders, customers, overdue work, and recent activity.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F001` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/DashboardPage-CpNQVMTg.js`. Anchor: `getSummary`.

### NoolTech F002: Payment summary API

Source module: Dashboard. Evidence class: Code-defined.

Client requests payment summary for optional start date, end date, and location.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F002` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/dependencies/dashboard.service-CzOsHgSm.js`. Anchor: `getPaymentsSummary`.

### NoolTech F003: Quick business actions

Source module: Dashboard. Evidence class: Code-defined.

Links to customer creation, tailoring order entry, boutique sale, and payment recording adapt to business type.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F003` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/index-Dk-7hFgw.js`. Anchor: `quickActions:"Quick Actions"`.

### NoolTech F004: Usage and limit indicators

Source module: Dashboard. Evidence class: Code-defined.

Usage cards distinguish warning and exceeded states for customers, orders, SMS, staff, and storage.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F004` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/DashboardPage-CpNQVMTg.js`. Anchor: `status==="exceeded"`.

### NoolTech F005: Team ownership overview

Source module: Dashboard. Evidence class: Code-defined.

Team summary card groups work by staff and offers filters when the shop has non-admin team members.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F005` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/DashboardPage-CpNQVMTg.js`. Anchor: `/api/users/team/summary`.

### NoolTech F006: Announcements and local dismissal

Source module: Dashboard. Evidence class: Code-defined.

Retrieves announcements and remembers dismissed announcement IDs in local storage.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F006` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/DashboardPage-CpNQVMTg.js`. Anchor: `announcement-card`.

### NoolTech F007: Profile and onboarding completion

Source module: Dashboard. Evidence class: Code-defined.

Business setup collects profile details and completes onboarding through profile/update and complete-onboarding service calls.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F007` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/DashboardPage-CpNQVMTg.js`. Anchor: `completeOnboarding`.

## REQ-CRM: Customer register, profile, and history

Target behavior and acceptance: [REQ-CRM](../product/requirements.md#req-crm-customer-register-profile-and-history).

### Tailorman F009: Customer directory and pagination

Source module: Customers. Evidence class: Code-defined.

Initially lists 25 customers alphabetically, with name, mobile, address, and a profile link. Load More uses a cursor. Clearing the search restores the directory.

Original role context: admin, cashier

Verification gap: Code-defined. This row does not establish a successful business write or server-side enforcement.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F009` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/customers.js`. Anchor: `async function loadList(reset)`.

### Tailorman F010: Name and mobile substring search

Source module: Customers. Evidence class: Code-defined.

Debounced search filters nameLower and mobileNormalized over the first 500 alphabetically ordered nondeleted customer records. Search results have no pagination cursor.

Original role context: admin, cashier

Verification gap: Code-defined. Customers outside the first 500 records can be absent from substring search.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F010` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/db.js`. Anchor: `export async function searchCustomers({ term = "", pageSize = 20, cursor = null } = {})`.

### Tailorman F011: Create customer

Source module: Customers. Evidence class: Code-defined.

Collects required name and mobile, plus optional address and notes. Validates the mobile with shared mobileError and checks the plan's customer cap before saving a tenant customer with normalized search fields.

Original role context: admin, cashier

Verification gap: Code-defined. This row does not establish a successful business write or server-side enforcement.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F011` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/customers.js`. Anchor: `function openAddCustomer()`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/db.js`. Anchor: `export async function createCustomer(data)`.

### Tailorman F012: Duplicate-mobile decision

Source module: Customers. Evidence class: Code-defined.

Before adding a customer, looks up up to five existing normalized-mobile matches. The safe cancel path opens the existing record. An explicit Create a second record action permits a duplicate.

Original role context: admin, cashier

Verification gap: Code-defined. This row does not establish a successful business write or server-side enforcement.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F012` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/customers.js`. Anchor: `title: "This number is already on file"`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/db.js`. Anchor: `export async function findCustomersByMobile(mobile)`.

### Tailorman F013: Customer profile summary

Source module: Customers. Evidence class: Code-defined.

Shows name, contact details, address, notes, loyalty-discount badge, total bills, pending count, most recent order, and balance. Reads the newest 100 bills. A new-bill link preselects the customer.

Original role context: admin, cashier

Verification gap: Code-defined. The profile's summary is bounded by its latest-100-bills query, so it is not necessarily lifetime totals.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F013` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/customer.js`. Anchor: `function renderHeaderAndTabs()`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/customer.js`. Anchor: `listBillsByCustomer(customerId, 100`.

### Tailorman F014: Customer edit and loyalty rate

Source module: Customers. Evidence class: Code-defined.

Edits name, mobile, address, notes, and, when the plan permits, a loyalty discount percentage. Required-name/mobile and mobile-format checks run before update. A hidden loyalty field preserves the stored rate.

Original role context: admin, cashier

Verification gap: Code-defined. This row does not establish a successful business write or server-side enforcement.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F014` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/customer.js`. Anchor: `function openEditCustomer()`.

### Tailorman F015: Customer deletion guard

Source module: Customers. Evidence class: Code-defined.

Admin can soft-delete a customer after confirmation. The data layer refuses deletion while any nondeleted bill references the customer. The customer disappears from list/search; the database function does not delete measurement subcollection documents.

Original role context: admin

Verification gap: Code-defined. This row does not establish a successful business write or server-side enforcement.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F015` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/customer.js`. Anchor: `async function onDeleteCustomer(btn)`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/db.js`. Anchor: `export async function deleteCustomer(id)`.

### Tailorman F016: Bill history

Source module: Customers. Evidence class: Code-defined.

Profile Bills tab lists bill number, line count, expected delivery, derived status badge, and balance, with links to bill detail.

Original role context: admin, cashier

Verification gap: Code-defined. This row does not establish a successful business write or server-side enforcement.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F016` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/customer.js`. Anchor: `function renderBills()`.

### Tailorman F017: Payment summary

Source module: Customers. Evidence class: Code-defined.

Payments tab aggregates each loaded bill's current total, paid amount, and balance, dated by bill creation time. It is a per-bill summary rather than individual payment-event history.

Original role context: admin, cashier

Verification gap: Code-defined. This row does not establish a successful business write or server-side enforcement.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F017` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/customer.js`. Anchor: `function renderPayments()`.

### Tailorman F018: Delivered-order history

Source module: Customers. Evidence class: Code-defined.

Deliveries tab lists loaded bills whose status is delivered, using deliveredAt or updatedAt for the delivery date.

Original role context: admin, cashier

Verification gap: Code-defined. This row does not establish a successful business write or server-side enforcement.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F018` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/customer.js`. Anchor: `function renderDeliveries()`.

### Tailorman F019: Linked and legacy alteration history

Source module: Customers. Evidence class: Code-defined.

Plan-gated Alterations tab lists customer-linked work, price, balance, status, and due date. Older unlinked alterations are also matched using common representations of the mobile number, excluding records linked to another customer. New Alteration opens a prefilled linked form.

Original role context: admin, cashier

Verification gap: Code-defined. This row does not establish a successful business write or server-side enforcement.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F019` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/customer.js`. Anchor: `async function renderAlterations()`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/db.js`. Anchor: `export async function listAlterationsByCustomer(customer)`.

### Tailormate F001: Customer register and name search

Source module: Customers. Evidence class: Code-defined.

List customer name, country dial code plus mobile number, gender, and face image with avatar fallback. The customer-register search filters the loaded rows by full name. The order-intake customer picker separately searches both name and mobile.

Original role context: Signed-in shop user with relevant page access; server authorization unverified.

Verification gap: Code-defined. This source review did not observe a successful write, populated record, payment, message, or server-side permission check.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F001` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/customers/page-07c5ab5a43787b97.js`. Anchor: `title:"Manage customer(s)"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/orders/add-order/page-0995df84e9bfbe1d.js`. Anchor: `placeholder:"Search customer..."`.

### Tailormate F002: Customer create and edit

Source module: Customers. Evidence class: Code-defined.

The shared form stores full name, country-aware phone, email, date of birth, gender, height, weight, address, customer GSTIN, and optional body-measurement notes. Editing loads existing contact and image values. Name requires at least three characters, phone must be nonempty after trimming, and email is either empty or valid.

Original role context: Signed-in shop user with relevant page access; server authorization unverified.

Verification gap: Code-defined. This source review did not observe a successful write, populated record, payment, message, or server-side permission check.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F002` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/3040-3fd2e3984ab95f57.js`. Anchor: `full_name:i.z.string().min(3`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/3040-3fd2e3984ab95f57.js`. Anchor: `cust_gstin:i.z.string()`.

### Tailormate F003: Country dial-code handling

Source module: Customers. Evidence class: Code-defined.

Phone input stores country code, dial code, country name, and phone number. India is the default. When loading an existing customer, the code trims the dial code, finds the matching country, and falls back to India if unmatched.

Original role context: Signed-in shop user with relevant page access; server authorization unverified.

Verification gap: Code-defined. This source review did not observe a successful write, populated record, payment, message, or server-side permission check.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F003` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/3040-3fd2e3984ab95f57.js`. Anchor: `countryDialCode:g.dialCode`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/3040-3fd2e3984ab95f57.js`. Anchor: `return"IN"===t`.

### Tailormate F004: Customer face and full-body photos

Source module: Customers. Evidence class: Code-defined.

The customer form has separate face and full-size body-image uploaders. Its image-payload helper merges uploaded images with existing customer image records before save.

Original role context: Signed-in shop user with relevant page access; server authorization unverified.

Verification gap: Code-defined. This source review did not observe a successful write, populated record, payment, message, or server-side permission check.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F004` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/3040-3fd2e3984ab95f57.js`. Anchor: `customer_face:i.z.custom().optional()`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/3040-3fd2e3984ab95f57.js`. Anchor: `"customer_image_id"`.

### Tailormate F005: Inline save failure reporting

Source module: Customers. Evidence class: Code-defined.

Customer save recognizes a returned status or type of fail, displays the server message inside the dialog, and keeps it open. Transport errors use a toast and saving state clears on settlement.

Original role context: Signed-in shop user with relevant page access; server authorization unverified.

Verification gap: Code-defined. This source review did not observe a successful write, populated record, payment, message, or server-side permission check.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F005` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/3040-3fd2e3984ab95f57.js`. Anchor: `"Operation failed"`.

### Tailormate F006: Customer removal

Source module: Customers. Evidence class: Code-defined.

The register requests confirmation, then sends customer_id with status_id -1 through the shared customer-save mutation. This is an inactive-status request, despite the generic confirmation text saying account data will be permanently deleted.

Original role context: Signed-in shop user with relevant page access; server authorization unverified.

Verification gap: Code-defined. This source review did not observe a successful write, populated record, payment, message, or server-side permission check.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F006` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/customers/page-07c5ab5a43787b97.js`. Anchor: `status_id:"-1"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/customers/page-07c5ab5a43787b97.js`. Anchor: `This action cannot be undone. This will permanently delete your account`.

### NoolTech F008: Customer directory and search

Source module: Customer CRM. Evidence class: Code-defined.

Paginated customer list supports search by supplied term and returns total/page metadata.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F008` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/index-Dk-7hFgw.js`. Anchor: `async getAllCustomers`.

### NoolTech F009: Create and edit customer profiles

Source module: Customer CRM. Evidence class: Code-defined.

Customer form submits create or patch update with first/last name, phone, email, address, tags, fit, and fabric notes.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F009` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/CustomerCreateForm-BMpQXZxd.js`. Anchor: `updateCustomer(o._id,n)`.

### NoolTech F010: Customer segmentation

Source module: Customer CRM. Evidence class: Code-defined.

Regular, New, Important, and Bulk customer types are selectable; list filtering uses these categories.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F010` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/CustomerCreateForm-BMpQXZxd.js`. Anchor: `customerType`.

### NoolTech F011: Fit preferences and design tags

Source module: Customer CRM. Evidence class: Code-defined.

Records Slim, Regular, or Relaxed preferred fit, comma-separated design tags, and fabric notes.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F011` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/CustomerCreateForm-BMpQXZxd.js`. Anchor: `name:"fabricNotes"`.

### NoolTech F012: Duplicate-customer recovery

Source module: Customer CRM. Evidence class: Code-defined.

When server returns an existing customer ID, offers opening or using that existing record instead of creating another.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F012` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/CustomerCreateForm-BMpQXZxd.js`. Anchor: `customer-exists`.

### NoolTech F013: Customer archive/delete action

Source module: Customer CRM. Evidence class: Code-defined.

Client exposes customer deletion via DELETE and list confirmation flow.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F013` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/index-Dk-7hFgw.js`. Anchor: `async deleteCustomer`.

### NoolTech F014: Customer avatar management

Source module: Customer CRM. Evidence class: Code-defined.

Customer profile uploads an avatar; shared service also exposes delete and avatar URL.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F014` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/index-Dk-7hFgw.js`. Anchor: `async uploadAvatar`.

### NoolTech F015: Customer overview and order history

Source module: Customer CRM. Evidence class: Code-defined.

Profile computes lifetime order value, active count, last order date, and offers all/tailor/boutique history.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F015` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/CustomerProfilePage-DWeCcTMZ.js`. Anchor: `totalValue:r,activeCount:u,lastOrderDate:k`.

### NoolTech F017: Customer loyalty balance

Source module: Customer CRM. Evidence class: Code-defined.

Profile fetches current loyalty points and renders an approximate redemption value.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F017` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/CustomerProfilePage-DWeCcTMZ.js`. Anchor: `getLoyaltyBalance`.

## REQ-MEASURE: Versioned body and garment measurements

Target behavior and acceptance: [REQ-MEASURE](../product/requirements.md#req-measure-versioned-body-and-garment-measurements).

### Tailorman F020: Saved garment measurement profiles

Source module: Measurements. Evidence class: Code-defined.

Lists saved measurements newest first with garment type, optional For name, units, timestamp, nonempty fields, and notes. Customer profile provides add, edit, and confirmed delete actions.

Original role context: admin, cashier

Verification gap: Code-defined. This row does not establish a successful business write or server-side enforcement.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F020` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/customer.js`. Anchor: `async function renderMeasurements()`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/db.js`. Anchor: `export async function addMeasurement(customerId, data)`.

### Tailorman F021: Shared measurement form

Source module: Measurements. Evidence class: Code-defined.

The same add/edit form opens from customer profile, New Bill, and bill item editor. It accepts customerId, existing measurement, initial garment type, default For name, an optional type lock, and a save callback.

Original role context: admin, cashier

Verification gap: Code-defined. This row does not establish a successful business write or server-side enforcement.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F021` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/measurement-form.js`. Anchor: `export async function openMeasurementForm({`.

### Tailorman F022: Family member and units

Source module: Measurements. Evidence class: Code-defined.

Measurement records store optional For name up to 60 characters, garment type, inches or cm, fields, and notes. Units are selected as a label; the form has no numeric unit-conversion handler.

Original role context: admin, cashier

Verification gap: Code-defined. This row does not establish a successful business write or server-side enforcement.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F022` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/measurement-form.js`. Anchor: `maxlength="60"`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/db.js`. Anchor: `export async function updateMeasurement(customerId, measurementId, data)`.

### Tailorman F023: Quick and full template views

Source module: Measurements. Evidence class: Code-defined.

New measurements initially show six non-section fields. Show all reveals the complete garment template and sections while preserving entered values. Editing an existing profile starts with all fields visible.

Original role context: admin, cashier

Verification gap: Code-defined. This row does not establish a successful business write or server-side enforcement.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F023` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/measurement-form.js`. Anchor: `const QUICK_FIELD_COUNT = 6;`.

### Tailorman F024: Typed measurement controls

Source module: Measurements. Evidence class: Code-defined.

Renders numeric inputs with step 0.25, free text, booleans, and fixed-option selects from the shop's garment template. Empty entries and unchecked booleans are omitted from saved fields.

Original role context: admin, cashier

Verification gap: Code-defined. This row does not establish a successful business write or server-side enforcement.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F024` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/measurement-form.js`. Anchor: `const renderField = (f) => {`.

### Tailorman F025: Custom fields and notes

Source module: Measurements. Evidence class: Code-defined.

Adds removable custom key/value rows to a measurement. Save requires at least one populated measurement field or a note; For name alone does not satisfy it. Custom entries persist in the same fields object.

Original role context: admin, cashier

Verification gap: Code-defined. This row does not establish a successful business write or server-side enforcement.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F025` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/measurement-form.js`. Anchor: `if (Object.keys(values).length === 0 && !notes)`.

### Tailorman F026: Bill-linked measurement selection

Source module: Measurements. Evidence class: Code-defined.

New Bill filters the selected customer's saved measurements by garment type, labels family member/date, preserves matching selection, and renders a preview. A New Measurement action can first guide customer creation, then opens a type-locked form and auto-selects the result.

Original role context: admin, cashier

Verification gap: Code-defined. This row does not establish a successful business write or server-side enforcement.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F026` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/new-bill.js`. Anchor: `function populateMeasurements(row)`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/new-bill.js`. Anchor: `function openMeasurementFor(row)`.

### Tailorman F027: Live measurement reference on orders

Source module: Measurements. Evidence class: Code-defined.

Bill lines store measurementId. Detail resolves it against the customer's current measurement records and warns if missing. It renders fields, member name, units, and notes.

Original role context: admin, cashier

Verification gap: Code-defined. The bill references a mutable measurement profile rather than retaining a measurement snapshot in the inspected createBill path. Later edits can change what an older order displays.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F027` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/bill.js`. Anchor: `if (!it.measurementId) return "";`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/db.js`. Anchor: `measurementId: it.measurementId || null,`.

### Tailorman F028: Measurement QR card

Source module: Measurements. Evidence class: Code-defined.

Customer profile builds a QR to the authenticated customer measurements tab, includes customer name/mobile and up to six nonempty fields per saved garment profile, and opens a printable card. QR image generation uses api.qrserver.com.

Original role context: admin, cashier

Verification gap: Code-defined. The generated link points to customer.html with its normal authentication guard. It is not evidence of an anonymous measurement portal.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F028` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/customer.js`. Anchor: `function openQrCard(measurements)`.

### Tailormate F007: Read-only body measurement view

Source module: Customers. Evidence class: Code-defined.

Customer actions open a master-measurement table with measurement name and value. A separate query loads values for that customer.

Original role context: Signed-in shop user with relevant page access; server authorization unverified.

Verification gap: Code-defined. This source review did not observe a successful write, populated record, payment, message, or server-side permission check.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F007` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/customers/page-07c5ab5a43787b97.js`. Anchor: `children:"View Body Measurements"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/customers/page-07c5ab5a43787b97.js`. Anchor: `measurements:(null==l?void 0:`.

### Tailormate F008: Dated garment measurement history

Source module: Customers. Evidence class: Code-defined.

Customer actions list saved garment measurement profiles by name and taken-on date. Selecting a profile opens its name, creation date, and measurement-name/value table.

Original role context: Signed-in shop user with relevant page access; server authorization unverified.

Verification gap: Code-defined. This source review did not observe a successful write, populated record, payment, message, or server-side permission check.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F008` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/customers/page-07c5ab5a43787b97.js`. Anchor: `children:"View Dress Measurements"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/customers/page-07c5ab5a43787b97.js`. Anchor: `customerMeasurement:l`.

### Tailormate F009: Body measurement entry and editing

Source module: Measurements. Evidence class: Code-defined.

The customer form opens a body-measurement modal populated from gender-specific master templates, with measurement illustration URLs and Comments/Notes. Existing customer values are merged by measurement_id. On a new customer, values return into the pending customer payload; for an existing customer, they use the dedicated master-measurement save mutation.

Original role context: Signed-in shop user with relevant page access; server authorization unverified.

Verification gap: Code-defined. This source review did not observe a successful write, populated record, payment, message, or server-side permission check.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F009` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/3040-3fd2e3984ab95f57.js`. Anchor: `children:(t?"Edit":"Add")+" body measurement"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/3040-3fd2e3984ab95f57.js`. Anchor: `customer_master_measurements:{customer_id:t.customer_id`.

### Tailormate F010: Garment measurement wizard on customer profiles

Source module: Measurements. Evidence class: Code-defined.

Existing customers can add garment measurements through two steps: choose a garment for the customer gender, then enter a named set of template measurement fields. The save request stores customer_id, dress_id, measurement name, unit IN, and measurement ID/value pairs.

Original role context: Signed-in shop user with relevant page access; server authorization unverified.

Verification gap: Code-defined. This source review did not observe a successful write, populated record, payment, message, or server-side permission check.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F010` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/3040-3fd2e3984ab95f57.js`. Anchor: `children:"Add dress measurements"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/3040-3fd2e3984ab95f57.js`. Anchor: `measurement_unit:"IN"`.

### Tailormate F011: Inch-based values and illustrations

Source module: Measurements. Evidence class: Code-defined.

Both body and garment measurement editors label units as inches and display field illustrations from the response image base URL. The inspected save paths serialize measurement_unit IN. No unit-conversion UI is established here.

Original role context: Signed-in shop user with relevant page access; server authorization unverified.

Verification gap: Code-defined. This source review did not observe a successful write, populated record, payment, message, or server-side permission check.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F011` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/3040-3fd2e3984ab95f57.js`. Anchor: `children:"Measurements (inches)"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/9491-bcd4f8939976b832.js`. Anchor: `measurement_unit:"IN"`.

### Tailormate F012: Reuse a saved garment measurement set

Source module: Measurements. Evidence class: Code-defined.

The order measurement picker filters customer_measurements to the selected garment ID. Rows show measurement name and date. Selecting an existing set opens it read-only and returns the selected profile to the order.

Original role context: Signed-in shop user with relevant page access; server authorization unverified.

Verification gap: Code-defined. This source review did not observe a successful write, populated record, payment, message, or server-side permission check.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F012` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/9491-bcd4f8939976b832.js`. Anchor: `title:"Select Measurement"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/9491-bcd4f8939976b832.js`. Anchor: `return t===l.id`.

### Tailormate F013: Copy and edit an order measurement set

Source module: Measurements. Evidence class: Code-defined.

Copy & Edit appends copy to the name, clears family_measurement_id and family_member_id, then switches the order measurement editor to editable mode. This creates independent pending form values instead of retaining the original profile identifiers.

Original role context: Signed-in shop user with relevant page access; server authorization unverified.

Verification gap: Code-defined. This source review did not observe a successful write, populated record, payment, message, or server-side permission check.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F013` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/9491-bcd4f8939976b832.js`. Anchor: `children:"Copy & Edit"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/9491-bcd4f8939976b832.js`. Anchor: `b("family_measurement_id",void 0)`.

### Tailormate F014: Order measurement validation

Source module: Measurements. Evidence class: Code-defined.

The order-specific measurement form requires a nonempty measurement name and truthy measurement values. Its message explicitly instructs entering 0 to skip a field. Values from ordinary inputs are strings, so the string 0 passes this truthiness check.

Original role context: Signed-in shop user with relevant page access; server authorization unverified.

Verification gap: Code-defined. This source review did not observe a successful write, populated record, payment, message, or server-side permission check.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F014` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/9491-bcd4f8939976b832.js`. Anchor: `message:"Measurement is required. Enter 0 to skip."`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/9491-bcd4f8939976b832.js`. Anchor: `resolver:(0,d.F)(eu)`.

### Tailormate F015: Populate garment values from body measurements

Source module: Measurements. Evidence class: Code-defined.

Get body measurement requests the customer-to-dress mapping and copies mapped values into the form. The customer-profile editor copies only nonzero numeric mapped values. The order editor uses a different condition, checking mapped value against an empty string.

Original role context: Signed-in shop user with relevant page access; server authorization unverified.

Verification gap: Code-defined. This source review did not observe a successful write, populated record, payment, message, or server-side permission check.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F015` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/3040-3fd2e3984ab95f57.js`. Anchor: `children:"Get body measurement"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/9491-bcd4f8939976b832.js`. Anchor: `(null==t?void 0:t.measurement_value)!==""`.

### Tailormate F016: Measurement data embedded in order items

Source module: Measurements. Evidence class: Code-defined.

The order save payload includes family profile IDs, name, unit IN, and the selected measurement ID/value pairs inside dress_measurement. Stitch type 3 omits the measurement object and stitch features from the payload.

Original role context: Signed-in shop user with relevant page access; server authorization unverified.

Verification gap: Code-defined. This source review did not observe a successful write, populated record, payment, message, or server-side permission check.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F016` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/9491-bcd4f8939976b832.js`. Anchor: `dress_measurement:eM?void 0:`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/9491-bcd4f8939976b832.js`. Anchor: `stitch_features:eM?void 0:$`.

### NoolTech F016: Measurement history chart

Source module: Customer CRM. Evidence class: Code-defined.

Customer profile plots a fixed selected field over chronological measurement records. Default is chest; fixed options are chest, waist, hip, shoulder, sleeves, neck, length, and inseam.

Original role context: Admin, manager, or permitted staff

Verification gap: Missing field values become zero; bust is not mapped to chest and units are not normalized by the chart code.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F016` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/CustomerProfilePage-DWeCcTMZ.js`. Anchor: `selectedField:V`.

### NoolTech F028: Search customer and view measurements

Source module: Measurements. Evidence class: Code-defined.

Measurement page searches customers, keeps recent customer shortcuts, and loads selected customer history.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F028` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/MeasurementsPage-MdNuXeJk.js`. Anchor: `searchCustomers(j,50)`.

### NoolTech F029: Tailoring-business access gate

Source module: Measurements. Evidence class: Code-defined.

Measurement tracking is shown for tailor/both business types.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F029` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/MeasurementsPage-MdNuXeJk.js`. Anchor: `isTailor:o`.

### NoolTech F030: Garment-specific measurement fields

Source module: Measurements. Evidence class: Code-defined.

Measurement forms derive fields from garment master definitions and provide category and garment selection.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F030` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/MeasurementFormModal-CkD_M_Ma.js`. Anchor: `garmentType:p`.

### NoolTech F031: Record measurement profile/member name

Source module: Measurements. Evidence class: Code-defined.

A label such as Self, Dad, Son, or Friend distinguishes measurements for multiple people under one customer.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F031` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/MeasurementFormModal-CkD_M_Ma.js`. Anchor: `label:k.trim()||"Self"`.

### NoolTech F032: Measurement units

Source module: Measurements. Evidence class: Code-defined.

Forms support inches and centimetres; selected unit persists as measurementUnit in local storage.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F032` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/MeasurementsPage-MdNuXeJk.js`. Anchor: `localStorage.getItem("measurementUnit")`.

### NoolTech F033: Custom measurement dimensions

Source module: Measurements. Evidence class: Code-defined.

Forms merge named custom measurements with the garment-defined dimension map.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F033` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/MeasurementFormModal-CkD_M_Ma.js`. Anchor: `s.name&&s.value&&(a[s.name]=s.value)`.

### NoolTech F034: Measurement notes

Source module: Measurements. Evidence class: Code-defined.

Record form sends trimmed optional notes with measurements and profile label.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F034` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/MeasurementFormModal-CkD_M_Ma.js`. Anchor: `notes:j.trim()||void 0`.

### NoolTech F035: History versions and legacy garments

Source module: Measurements. Evidence class: Code-defined.

History groups supported garment types and preserves legacy/other records, ordered by version.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F035` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/MeasurementsPage-MdNuXeJk.js`. Anchor: `k.version-b.version`.

### NoolTech F036: Compare measurement changes

Source module: Measurements. Evidence class: Code-defined.

Comparison marks new/same/up/down fields; numeric changes below 0.1 are treated as unchanged in the displayed diff.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F036` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/MeasurementsPage-MdNuXeJk.js`. Anchor: `Math.abs(h)>=.1`.

### NoolTech F037: Edit existing measurements

Source module: Measurements. Evidence class: Code-defined.

Client exposes PUT update; edit modal sends changed label, dimensions, and notes.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F037` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/dependencies/measurement.service-Ctn_wFKK.js`. Anchor: `async updateMeasurement`.

### NoolTech F038: Archive measurement records

Source module: Measurements. Evidence class: Code-defined.

Client exposes DELETE archiveMeasurement and confirmation UI.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F038` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/dependencies/measurement.service-Ctn_wFKK.js`. Anchor: `async archiveMeasurement`.

### NoolTech F039: Attach reference photos

Source module: Measurements. Evidence class: Code-defined.

Customer measurement detail adds and removes reference photos; profile enforces a maximum of five visible reference photos.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F039` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/CustomerProfilePage-DWeCcTMZ.js`. Anchor: `Maximum 5 reference photos allowed`.

### NoolTech F040: Reference-photo download URL

Source module: Measurements. Evidence class: Code-defined.

Photo resources use per-measurement and per-photo endpoints.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F040` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/dependencies/measurement.service-Ctn_wFKK.js`. Anchor: `getPhotoUrl`.

### NoolTech F041: Prevent accidental draft dismissal

Source module: Measurements. Evidence class: Code-defined.

Form requests discard confirmation when dimensions, custom fields, or notes have been entered.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F041` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/MeasurementFormModal-CkD_M_Ma.js`. Anchor: `A()?z(!0):f()`.

## REQ-SCAN: Measurement-slip scanning with review

Target behavior and acceptance: [REQ-SCAN](../product/requirements.md#req-scan-measurement-slip-scanning-with-review).

### Tailorman F029: Photo capture and scan request

Source module: Measurement slip scanning. Evidence class: Code-defined.

Scan slip chooses an image with rear-camera capture hint, compresses toward 700 KiB with a 1600-pixel maximum, and posts imageBase64, mimeType, and itemType to /api/ai/scan-measurement. The control hides for garment types without measurement fields.

Original role context: admin, cashier

Verification gap: Code-defined. The scan API, model identity, response accuracy, quotas, and server template validation were not executed or recovered.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F029` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/measurement-scan.js`. Anchor: `export function initScan(root, { getItemType, hasFields, onResult, onUndo })`.

### Tailorman F030: Confidence-based review

Source module: Measurement slip scanning. Evidence class: Code-defined.

High-confidence readings populate fields with amber highlighting. Low-confidence nonboolean readings appear as tappable suggestions and do not automatically overwrite inputs. Unmapped readings are listed for manual entry. The form opens all fields after scan.

Original role context: admin, cashier

Verification gap: Code-defined. This row does not establish a successful business write or server-side enforcement.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F030` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/measurement-scan.js`. Anchor: `export function decorateScannedFields(fieldsHost, result, acceptLow)`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/measurement-form.js`. Anchor: `for (const f of result.fields)`.

### Tailorman F031: Undo and explicit save

Source module: Measurement slip scanning. Evidence class: Code-defined.

Before applying scan output, snapshots form values, units, For name, and notes. Undo restores them. Scan can fill missing member name/notes and set units, but saving remains a separate measurement-form confirmation.

Original role context: admin, cashier

Verification gap: Code-defined. This row does not establish a successful business write or server-side enforcement.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F031` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/measurement-form.js`. Anchor: `preScan = {`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/measurement-form.js`. Anchor: `onUndo: () => {`.

## REQ-MASTER: Garment, measurement, service, and add-on configuration

Target behavior and acceptance: [REQ-MASTER](../product/requirements.md#req-master-garment-measurement-service-and-add-on-configuration).

### Tailorman F032: Default garment library

Source module: Garment configuration. Evidence class: Code-defined.

Ships 16 item types: Suite, Pants, Jeans, Shirt, Shorts, Jubba and Kurtha, Nurse Coat, Blouse, Churidar Kurtha, Churidar, Pavada, Gown, Frock, Lehenga, Alteration, and Dress Materials. The final two have empty templates. Defaults can seed a tenant-specific settings document.

Original role context: admin

Verification gap: Code-defined. This row does not establish a successful business write or server-side enforcement.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F032` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/measurement-templates.js`. Anchor: `export const ITEM_TYPES = [`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/item-types.js`. Anchor: `export function buildDefaultItems()`.

### Tailorman F033: Measurement and style schemas

Source module: Garment configuration. Evidence class: Code-defined.

Garment templates include body/garment dimensions and style options, including collar/shoulder models, cuffs, pockets, stitching, neck/sleeve/back styles, skirt model, and closures. Suite separates Coat and Pant sections. The companion measurement_templates.json records every default field and option.

Original role context: admin

Verification gap: Code-defined. This row does not establish a successful business write or server-side enforcement.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F033` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/measurement-templates.js`. Anchor: `export const TEMPLATES = {`.

### Tailorman F034: Item-type lifecycle

Source module: Garment configuration. Evidence class: Code-defined.

Admin adds uniquely named item types, renames them, and confirms removal from dropdowns. Existing stored bills/measurements retain their string references. Editing happens locally until Save changes.

Original role context: admin

Verification gap: Code-defined. This row does not establish a successful business write or server-side enforcement.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F034` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/item-types-page.js`. Anchor: `async function onAddItem()`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/item-types-page.js`. Anchor: `async function onDeleteItem(id)`.

### Tailorman F035: Custom field and section editor

Source module: Garment configuration. Evidence class: Code-defined.

Admin adds, removes, names, and reorders fields or section dividers; chooses number/text/boolean/select; and supplies comma-separated select options. Sanitization trims names/options, drops empty keys, and normalizes unknown types to text.

Original role context: admin

Verification gap: Code-defined. This row does not establish a successful business write or server-side enforcement.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F035` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/item-types-page.js`. Anchor: `function renderFieldsList(it)`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/item-types.js`. Anchor: `function sanitizeFields(fields)`.

### Tailorman F036: Garment and field ordering

Source module: Garment configuration. Evidence class: Code-defined.

Native drag and drop changes item order and each type's field order, which become dropdown/form display order on save.

Original role context: admin

Verification gap: Code-defined. This row does not establish a successful business write or server-side enforcement.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F036` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/item-types-page.js`. Anchor: `function attachDragHandlers(root, kind, onMove)`.

### Tailorman F037: Save, reset, and unsaved-change warning

Source module: Garment configuration. Evidence class: Code-defined.

Admin persists the complete tenant item-type configuration. Reset restores defaults locally after confirmation and still needs Save changes. Navigating away with dirty state triggers beforeunload protection.

Original role context: admin

Verification gap: Code-defined. This row does not establish a successful business write or server-side enforcement.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F037` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/item-types-page.js`. Anchor: `async function onSave()`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/item-types-page.js`. Anchor: `async function onReset()`.

### Tailorman F038: Template fallback and material requirements

Source module: Garment configuration. Evidence class: Code-defined.

A missing shop template document falls back to defaults. Configured materialRequirements are retained per type and exposed to cutting's suggested material-consumption rows. The inspected item-type editor has no material-requirements editing control.

Original role context: admin

Verification gap: Code-defined. Material requirements are a supported stored-data shape, not a confirmed editable feature in this screen.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F038` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/item-types.js`. Anchor: `export function getItemTypeMaterials(name)`.

### Tailormate F107: Material types

Source module: Inventory reference data. Evidence class: Code-defined.

List, create, edit and deactivate material types. A type name must have at least two characters. Saves carry material_type, optional material_type_id, is_active 1, and user context; removal uses is_active 0.

Original role context: Signed-in shop user with access to this module. The parent inventory covers navigation permission checks. Backend authorization and other accounts were not tested.

Verification gap: Code-defined. No persisted business action or successful server result was exercised by this static review.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F107` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/inventory/material-types/page-6efae7378085f700.js`. Anchor: `message:"Material type must be at least 2 characters."`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/inventory/material-types/page-6efae7378085f700.js`. Anchor: `material_type_id:null==a?void 0:a.material_type_id`.

### Tailormate F108: Material units and codes

Source module: Inventory reference data. Evidence class: Code-defined.

Manage unit name and optional unit code, displayed as Name and Code columns. Unit name requires two characters. Existing material_unit_id identifies edits; deletion deactivates the unit.

Original role context: Signed-in shop user with access to this module. The parent inventory covers navigation permission checks. Backend authorization and other accounts were not tested.

Verification gap: Code-defined. No persisted business action or successful server result was exercised by this static review.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F108` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/inventory/material-units/page-b438b120c7de66b8.js`. Anchor: `message:"Material unit must be at least 2 characters."`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/inventory/material-units/page-b438b120c7de66b8.js`. Anchor: `material_unit_code:g.z.string().optional()`.

### Tailormate F109: Readymade types

Source module: Inventory reference data. Evidence class: Code-defined.

List, add, edit and deactivate readymade types. Type names require at least three characters. This master supplies the type select in readymade inventory.

Original role context: Signed-in shop user with access to this module. The parent inventory covers navigation permission checks. Backend authorization and other accounts were not tested.

Verification gap: Code-defined. No persisted business action or successful server result was exercised by this static review.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F109` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/inventory/readymade-types/page-266fedfde8ba8252.js`. Anchor: `message:"Readymade type must be at least 3 characters."`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/inventory/readymade-types/page-266fedfde8ba8252.js`. Anchor: `readymade_type_id:null==r?void 0:r.readymade_type_id`.

### Tailormate F110: Readymade sizes and codes

Source module: Inventory reference data. Evidence class: Code-defined.

Manage size name and optional size code, shown in Name and Code columns and reused by readymade item multi-selects. Size name requires two characters. Create/edit saves is_active 1 and deletion deactivates.

Original role context: Signed-in shop user with access to this module. The parent inventory covers navigation permission checks. Backend authorization and other accounts were not tested.

Verification gap: Code-defined. No persisted business action or successful server result was exercised by this static review.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F110` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/inventory/readymade-sizes/page-54673bf7112531f0.js`. Anchor: `message:"Readymade size must be at least 2 characters."`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/inventory/readymade-sizes/page-54673bf7112531f0.js`. Anchor: `readymade_size_code:y.z.string().optional()`.

### Tailormate F136: Custom garment master

Source module: Administration dresses. Evidence class: Code-defined.

Create, edit and remove custom garment definitions. Fields are dress name, Male or Female gender, and optional default price. Name requires three characters. Prices are converted through the number helper, and saved garments can open their measurement configuration.

Original role context: Signed-in shop user with access to this module. The parent inventory covers navigation permission checks. Backend authorization and other accounts were not tested.

Verification gap: Code-defined. No persisted business action or successful server result was exercised by this static review.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F136` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/admin/dresses/page-e19875bcaf38fb21.js`. Anchor: `message:"Dress name must be at least 3 characters."`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/admin/dresses/page-e19875bcaf38fb21.js`. Anchor: `default_price:N()(e.default_price)`.

### Tailormate F137: Hide standard garment items

Source module: Administration dresses. Evidence class: Code-defined.

The Hide Standard Dress Items switch saves hide_standard_measurements as 1 or 0 through user settings and updates local user-setting state after success.

Original role context: Signed-in shop user with access to this module. The parent inventory covers navigation permission checks. Backend authorization and other accounts were not tested.

Verification gap: Code-defined. No persisted business action or successful server result was exercised by this static review.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F137` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/admin/dresses/page-e19875bcaf38fb21.js`. Anchor: `htmlFor:"hide_standard_dress_switch"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/admin/dresses/page-e19875bcaf38fb21.js`. Anchor: `hide_standard_measurements:t?"1":"0"`.

### Tailormate F138: Add garment measurements in two steps

Source module: Administration dresses. Evidence class: Code-defined.

Select gender-specific measurement icons, then edit names for newly selected measurements. Previously configured icons are selected and disabled and are excluded from new save entries. The form requires at least one selected measurement and nonempty new names.

Original role context: Signed-in shop user with access to this module. The parent inventory covers navigation permission checks. Backend authorization and other accounts were not tested.

Verification gap: Code-defined. No persisted business action or successful server result was exercised by this static review.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F138` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/admin/dresses/page-e19875bcaf38fb21.js`. Anchor: `"Select at least one measurement"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/admin/dresses/page-e19875bcaf38fb21.js`. Anchor: `children:"Add Measurement - Step ".concat(l)`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/admin/dresses/page-e19875bcaf38fb21.js`. Anchor: `master_measurement_id:e.master_measurement_id,measurement_name:r[e.master_measurement_id]||e.measurement_name`.

### Tailormate F139: Edit measurement label and icon

Source module: Administration dresses. Evidence class: Code-defined.

Edit a configured measurement name and optionally pick a replacement icon. Save sends the measurement ID, is_active 1, new label, and selected master_measurement_id and icon_file_name when changed.

Original role context: Signed-in shop user with access to this module. The parent inventory covers navigation permission checks. Backend authorization and other accounts were not tested.

Verification gap: Code-defined. No persisted business action or successful server result was exercised by this static review.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F139` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/admin/dresses/page-e19875bcaf38fb21.js`. Anchor: `children:"Edit Measurement"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/admin/dresses/page-e19875bcaf38fb21.js`. Anchor: `measurement_name:e.measurement.measurement_name`.

### Tailormate F140: Remove and reorder measurements

Source module: Administration dresses. Evidence class: Code-defined.

Remove a garment measurement after confirmation. The measurement table is draggable; moving rows immediately maps each ID to a zero-based sort_order and invokes the save mutation.

Original role context: Signed-in shop user with access to this module. The parent inventory covers navigation permission checks. Backend authorization and other accounts were not tested.

Verification gap: Code-defined. No persisted business action or successful server result was exercised by this static review.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F140` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/admin/dresses/page-e19875bcaf38fb21.js`. Anchor: `Dress measurement removed successfully!`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/admin/dresses/page-e19875bcaf38fb21.js`. Anchor: `id:e.id,sort_order:t`.

### Tailormate F141: Select garment stitching features

Source module: Administration dresses. Evidence class: Code-defined.

Load stitch-feature groups by garment gender and existing selected groups for the dress. Row checkboxes select feature groups. A detail dialog previews each group's option names and pictures, with a letter fallback when an option has no icon.

Original role context: Signed-in shop user with access to this module. The parent inventory covers navigation permission checks. Backend authorization and other accounts were not tested.

Verification gap: Code-defined. No persisted business action or successful server result was exercised by this static review.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F141` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/admin/dresses/page-e19875bcaf38fb21.js`. Anchor: `header:"Stitch Feature Name"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/admin/dresses/page-e19875bcaf38fb21.js`. Anchor: `children:e.stitch_feature_option_value`.

### Tailormate F142: Order and save stitching features

Source module: Administration dresses. Evidence class: Code-defined.

Drag stitching feature groups to assign sort_order starting at 1. Save Stitching submits all available groups, marking selected ones active and unselected ones inactive, retaining existing dress_stitch_feature_id values.

Original role context: Signed-in shop user with access to this module. The parent inventory covers navigation permission checks. Backend authorization and other accounts were not tested.

Verification gap: Code-defined. No persisted business action or successful server result was exercised by this static review.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F142` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/admin/dresses/page-e19875bcaf38fb21.js`. Anchor: `dress_stitch_feature_id:n.dress_stitch_feature_id,is_active:a?"1":"0"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/admin/dresses/page-e19875bcaf38fb21.js`. Anchor: `"Save Stitching"`.

### Tailormate F150: Custom service names

Source module: Stitch types. Evidence class: Code-defined.

Create, edit and deactivate additional stitch-type service names. Name is required, and standard entries whose user_id is 0 have no edit/delete actions.

Original role context: Signed-in shop user with access to this module. The parent inventory covers navigation permission checks. Backend authorization and other accounts were not tested.

Verification gap: Code-defined. No persisted business action or successful server result was exercised by this static review.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F150` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/admin/stitch-types/page-aa3fe888f9857fb5.js`. Anchor: `stitch_type_name:y.z.string().min(1,"Name is required")`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/admin/stitch-types/page-aa3fe888f9857fb5.js`. Anchor: `"0"===s.original.user_id?null:`.

### Tailormate F151: Hide standard services

Source module: Stitch types. Evidence class: Code-defined.

The Hide Standard Services switch saves hide_standard_services as 1 or 0 in user settings and updates local settings after success.

Original role context: Signed-in shop user with access to this module. The parent inventory covers navigation permission checks. Backend authorization and other accounts were not tested.

Verification gap: Code-defined. No persisted business action or successful server result was exercised by this static review.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F151` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/admin/stitch-types/page-aa3fe888f9857fb5.js`. Anchor: `htmlFor:"hide_standard_services_switch"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/admin/stitch-types/page-aa3fe888f9857fb5.js`. Anchor: `hide_standard_services:t?"1":"0"`.

### Tailormate F152: Named fixed-price add-ons

Source module: Price add-ons. Evidence class: Code-defined.

Manage add-on name and price for charges such as embroidery or special lining. Both fields require nonempty strings. Create/edit send addon_name, addon_price, user_id and optional addon_id, and list columns show name and price.

Original role context: Signed-in shop user with access to this module. The parent inventory covers navigation permission checks. Backend authorization and other accounts were not tested.

Verification gap: Code-defined. No persisted business action or successful server result was exercised by this static review.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F152` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/admin/add-ons/page-18ab2e075522adda.js`. Anchor: `addon_name:_.z.string().min(1,"Name is required")`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/admin/add-ons/page-18ab2e075522adda.js`. Anchor: `addon_price:_.z.string().min(1,"Price is required")`.

### Tailormate F153: Deactivate add-on

Source module: Price add-ons. Evidence class: Code-defined.

Removal requires an add-on ID, confirms the action, posts addon_id with is_active 0, and invalidates the add-on query cache.

Original role context: Signed-in shop user with access to this module. The parent inventory covers navigation permission checks. Backend authorization and other accounts were not tested.

Verification gap: Code-defined. No persisted business action or successful server result was exercised by this static review.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F153` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/admin/add-ons/page-18ab2e075522adda.js`. Anchor: `throw Error("AddonId is required.")`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/admin/add-ons/page-18ab2e075522adda.js`. Anchor: `addon_id:e,is_active:"0"`.

### NoolTech F235: Garment master register and activation

Source module: Garment masters. Evidence class: Code-defined.

List all garment types, search name or gender, filter active/inactive and gender, enable/disable with confirmation, edit, or delete with confirmation.

Original role context: Authenticated shop user

Verification gap: Client action, form, or service definition exists. Server execution, persistence, and access enforcement were not tested by this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F235` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/SettingsPage-BspbE0gu.js`. Anchor: `settings.garment.enableConfirm`.

### NoolTech F236: Custom garment definitions and measurement fields

Source module: Garment masters. Evidence class: Code-defined.

Create a named garment with icon and male/female/unisex/service classification; add/remove measurement fields with label-derived key, number/text type, and free-form unit. Blank garment label is rejected.

Original role context: Authenticated shop user

Verification gap: Client action, form, or service definition exists. Server execution, persistence, and access enforcement were not tested by this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F236` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/SettingsPage-BspbE0gu.js`. Anchor: `settings.garment.labelRequired`.

## REQ-PACKAGE: Service packages and bundle pricing

Target behavior and acceptance: [REQ-PACKAGE](../product/requirements.md#req-package-service-packages-and-bundle-pricing).

### Tailorman F039: Package catalog

Source module: Service packages. Evidence class: Code-defined.

Admin lists packages with name, description, active/inactive state, optional advertised price, and component garments with quantities/rates.

Original role context: admin

Verification gap: Code-defined. This row does not establish a successful business write or server-side enforcement.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F039` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/packages.js`. Anchor: `function pkgCard(pkg)`.

### Tailorman F040: Package create and edit

Source module: Service packages. Evidence class: Code-defined.

Admin saves required name, description, optional package price, active state, and any number of component rows with garment type, quantity, optional rate, and notes.

Original role context: admin

Verification gap: Code-defined. This row does not establish a successful business write or server-side enforcement.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F040` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/packages.js`. Anchor: `async function onSave()`.

### Tailorman F041: Package deletion

Source module: Service packages. Evidence class: Code-defined.

Admin confirms deletion. Package document is removed; previously generated bill lines are independent copies.

Original role context: admin

Verification gap: Code-defined. This row does not establish a successful business write or server-side enforcement.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F041` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/packages.js`. Anchor: `async function onDelete(pkg, btn)`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/db.js`. Anchor: `export async function deletePackage(id)`.

### Tailorman F042: Add package to bill

Source module: Service packages. Evidence class: Code-defined.

New Bill selects active packages and appends component garment rows with quantity, rate, and notes. Picker shows the package price, but billing copies component rates without applying the package-level price.

Original role context: admin, cashier

Verification gap: Code-defined. A package's displayed price is not applied by the inspected picker. Only component rates determine the resulting bill total.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F042` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/new-bill.js`. Anchor: `async function openPackagePicker()`.

## REQ-INTAKE: Guided order intake and garment detail

Target behavior and acceptance: [REQ-INTAKE](../product/requirements.md#req-intake-guided-order-intake-and-garment-detail).

### Tailorman F043: Customer-first order intake

Source module: Tailoring bill intake. Evidence class: Code-defined.

Admin/cashier searches and selects an existing customer or creates one inline. A customerId URL parameter preselects a customer. Save requires a selected customer, while measurement creation can guide an unselected user through creating one first.

Original role context: admin, cashier

Verification gap: Code-defined. This row does not establish a successful business write or server-side enforcement.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F043` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/new-bill.js`. Anchor: `async function onSave(e)`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/new-bill.js`. Anchor: `function openNewCustomer(afterPick)`.

### Tailorman F045: Material and promised dates

Source module: Tailoring bill intake. Evidence class: Code-defined.

Material received defaults to today and expected delivery to seven days later. Save requires both dates and rejects delivery before material receipt.

Original role context: admin, cashier

Verification gap: Code-defined. This row does not establish a successful business write or server-side enforcement.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F045` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/new-bill.js`. Anchor: `// Default dates`.

### Tailorman F046: Garment line entry

Source module: Tailoring bill intake. Evidence class: Code-defined.

Adds garment rows with type, quantity, nonnegative-rate input, line subtotal, optional saved measurement, notes, and staged images. Quick-add chips append a chosen garment type. Removing the last row creates a fresh row.

Original role context: admin, cashier

Verification gap: Code-defined. This row does not establish a successful business write or server-side enforcement.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F046` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/new-bill.js`. Anchor: `function addItem(prefill = {})`.

### Tailorman F047: Progressive optional details

Source module: Tailoring bill intake. Evidence class: Code-defined.

Each garment row initially shows type, quantity, and rate. Expandable details hold measurements, notes, and photos; a collapsed label summarizes populated details. Measurement slips may be attached as images instead of entered dimensions.

Original role context: admin, cashier

Verification gap: Code-defined. This row does not establish a successful business write or server-side enforcement.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F047` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/new-bill.js`. Anchor: `const setDetailsOpen = (open) => {`.

### Tailorman F053: Staged item photo upload

Source module: Tailoring bill intake. Evidence class: Code-defined.

Allows multiple image files with thumbnail removal before saving. After creating the bill, uploads each staged image against the saved line ID, records photo metadata, shows progress, and reports failed uploads separately.

Original role context: admin, cashier

Verification gap: Code-defined. This row does not establish a successful business write or server-side enforcement.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F053` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/new-bill.js`. Anchor: `function onPickPhotos(row, rowId, ev)`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/new-bill.js`. Anchor: `const totalPhotos = rowOrder.reduce`.

### Tailormate F017: Three order categories

Source module: Order intake. Evidence class: Code-defined.

Add Order first asks for New Stitching, New Material Sale, or New Readymade Sale. Values are 0, 1, and 2. Closing the initial selector without confirming navigates back.

Original role context: Signed-in shop user with relevant page access; server authorization unverified.

Verification gap: Code-defined. This source review did not observe a successful write, populated record, payment, message, or server-side permission check.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F017` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/orders/add-order/page-0995df84e9bfbe1d.js`. Anchor: `0:"New Stitching",1:"New Material Sale",2:"New Readymade Sale"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/orders/add-order/page-0995df84e9bfbe1d.js`. Anchor: `r||C.back()`.

### Tailormate F018: Category-specific guided steps

Source module: Order intake. Evidence class: Code-defined.

The stepper selects a customer, then a garment, readymade item, or material. Stitching adds an Enter Order Detail step. It switches to a vertical stepper at widths of 1024px or less.

Original role context: Signed-in shop user with relevant page access; server authorization unverified.

Verification gap: Code-defined. This source review did not observe a successful write, populated record, payment, message, or server-side permission check.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F018` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/orders/add-order/page-0995df84e9bfbe1d.js`. Anchor: `children:"Select Customer"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/orders/add-order/page-0995df84e9bfbe1d.js`. Anchor: `children:o===n.STITCHING?"Select Dress"`.

### Tailormate F019: Customer picker and inline creation

Source module: Order intake. Evidence class: Code-defined.

The customer picker displays face thumbnail, full name, mobile, and gender. Search matches name or mobile locally. Add customer opens the shared form with body-measurement capture hidden. A successful creation loads the saved customer and selects it.

Original role context: Signed-in shop user with relevant page access; server authorization unverified.

Verification gap: Code-defined. This source review did not observe a successful write, populated record, payment, message, or server-side permission check.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F019` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/orders/add-order/page-0995df84e9bfbe1d.js`. Anchor: `hideBodyMeasurement:!0`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/orders/add-order/page-0995df84e9bfbe1d.js`. Anchor: `x((await (0,A.U2)(e.customer_id)).customer)`.

### Tailormate F020: Preselected customer and add-to-existing-order context

Source module: Order intake. Evidence class: Code-defined.

The route accepts customer, orderId, and delivery_date query parameters. It can fetch the selected customer and existing order before intake. On save it navigates to the active order detail with from=add-order.

Original role context: Signed-in shop user with relevant page access; server authorization unverified.

Verification gap: Code-defined. This source review did not observe a successful write, populated record, payment, message, or server-side permission check.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F020` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/orders/add-order/page-0995df84e9bfbe1d.js`. Anchor: `l.get("customer")`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/orders/add-order/page-0995df84e9bfbe1d.js`. Anchor: `"?from=add-order"`.

### Tailormate F021: Gender-filtered garment selection

Source module: Order intake. Evidence class: Code-defined.

The stitching branch shows Suggested items for the customer gender plus All items from gender 0. Search filters both groups by garment name, and choosing a garment advances to order detail.

Original role context: Signed-in shop user with relevant page access; server authorization unverified.

Verification gap: Code-defined. This source review did not observe a successful write, populated record, payment, message, or server-side permission check.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F021` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/3040-3fd2e3984ab95f57.js`. Anchor: `55270:function`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/3040-3fd2e3984ab95f57.js`. Anchor: `placeholder:"Search item"`.

### Tailormate F022: Named garment and stitch type

Source module: Stitching order entry. Evidence class: Code-defined.

A garment item has a nickname of at least three characters and a required stitch type loaded from the shop stitch-type service. New intake defaults quantity 1, dress name plus #1, default garment price, no measurement-dress flag, no urgency, and an empty first trial row.

Original role context: Signed-in shop user with relevant page access; server authorization unverified.

Verification gap: Code-defined. This source review did not observe a successful write, populated record, payment, message, or server-side permission check.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F022` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/9491-bcd4f8939976b832.js`. Anchor: `dressName:u.z.string().min(3`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/orders/add-order/page-0995df84e9bfbe1d.js`. Anchor: `price_standard:null!==(e=null==_?void 0:_.default_price)`.

### Tailormate F023: Sales staff allocation

Source module: Stitching order entry. Evidence class: Code-defined.

Select up to two sales staff for a garment line. The dialog loads user names and IDs, validates a maximum of two choices, and serializes the first two as sales_staff_1 and sales_staff_2.

Original role context: Signed-in shop user with relevant page access; server authorization unverified.

Verification gap: Code-defined. This source review did not observe a successful write, populated record, payment, message, or server-side permission check.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F023` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/9491-bcd4f8939976b832.js`. Anchor: `"Maximum 2 staff members allowed"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/9491-bcd4f8939976b832.js`. Anchor: `sales_staff_1:H&&`.

### Tailormate F024: Visual stitching options

Source module: Stitching order entry. Evidence class: Code-defined.

The optional garment feature selector loads shop-defined stitching features and options. UI type 3 renders illustrated cards; other options use radio controls. Save Selection returns dress_stitch_feature_id and stitch_feature_option_id pairs.

Original role context: Signed-in shop user with relevant page access; server authorization unverified.

Verification gap: Code-defined. This source review did not observe a successful write, populated record, payment, message, or server-side permission check.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F024` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/9491-bcd4f8939976b832.js`. Anchor: `let s="3"===e.ui_type_id`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/9491-bcd4f8939976b832.js`. Anchor: `children:"Save Selection"`.

### Tailormate F025: Special instructions and video link

Source module: Stitching order entry. Evidence class: Code-defined.

Store free-text special instructions and a video_link with the garment. The captured schema treats video_link as an optional string and does not require a valid URL.

Original role context: Signed-in shop user with relevant page access; server authorization unverified.

Verification gap: Code-defined. This source review did not observe a successful write, populated record, payment, message, or server-side permission check.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F025` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/9491-bcd4f8939976b832.js`. Anchor: `specialInstruction:u.z.string().optional()`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/9491-bcd4f8939976b832.js`. Anchor: `label:"Video Link"`.

### Tailormate F026: Measurement-dress and urgency flags

Source module: Stitching order entry. Evidence class: Code-defined.

Measurement dress given and Mark as Urgent are independent checkboxes. The payload serializes them as string 1 or 0 under is_measurement_dress and is_urgent.

Original role context: Signed-in shop user with relevant page access; server authorization unverified.

Verification gap: Code-defined. This source review did not observe a successful write, populated record, payment, message, or server-side permission check.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F026` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/9491-bcd4f8939976b832.js`. Anchor: `label:"Measurement dress given"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/9491-bcd4f8939976b832.js`. Anchor: `is_urgent:e.isUrgent?"1":"0"`.

### Tailormate F027: Garment quantity

Source module: Stitching order entry. Evidence class: Code-defined.

New garment intake exposes Number of Dresses with a number input constrained in HTML to 1 through 100. The Zod schema treats quantity as an optional string, and quantity is sent separately from per-item price.

Original role context: Signed-in shop user with relevant page access; server authorization unverified.

Verification gap: Code-defined. This source review did not observe a successful write, populated record, payment, message, or server-side permission check.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F027` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/9491-bcd4f8939976b832.js`. Anchor: `children:"Number of Dresses"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/9491-bcd4f8939976b832.js`. Anchor: `max:"100",min:"1"`.

### Tailormate F031: Cloth photos with per-piece metadata

Source module: Stitching order entry. Evidence class: Code-defined.

Each cloth entry accepts a photo, optional item number when quantity exceeds one, length, and comments. A populated last row appends another empty row. Cloth image payloads retain these metadata values and are merged with existing images when editing.

Original role context: Signed-in shop user with relevant page access; server authorization unverified.

Verification gap: Code-defined. This source review did not observe a successful write, populated record, payment, message, or server-side permission check.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F031` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/9491-bcd4f8939976b832.js`. Anchor: `numberOfDressItems:n`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/9491-bcd4f8939976b832.js`. Anchor: `r.comments=null!==(s=a.comments)`.

### Tailormate F032: Pattern photos

Source module: Stitching order entry. Evidence class: Code-defined.

The garment has separate pattern-image upload rows. They append another row when filled, allow removal of populated rows, and are saved separately from cloth photographs.

Original role context: Signed-in shop user with relevant page access; server authorization unverified.

Verification gap: Code-defined. This source review did not observe a successful write, populated record, payment, message, or server-side permission check.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F032` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/9491-bcd4f8939976b832.js`. Anchor: `children:"Pattern Images"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/9491-bcd4f8939976b832.js`. Anchor: `name:"patternImages"`.

### Tailormate F033: Create or update garment items

Source module: Stitching order entry. Evidence class: Code-defined.

The same garment editor either posts a new order with current user, customer, current shop, and current ISO order date, or posts an update with existing order ID and modified user. Item edits preserve their item ID and status ID.

Original role context: Signed-in shop user with relevant page access; server authorization unverified.

Verification gap: Code-defined. This source review did not observe a successful write, populated record, payment, message, or server-side permission check.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F033` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/9491-bcd4f8939976b832.js`. Anchor: `modified_by_user_id:null==eI?void 0:eI.user_id`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/9491-bcd4f8939976b832.js`. Anchor: `order_date:m()().toISOString()`.

### NoolTech F042: Choose tailor order or boutique sale

Source module: Order entry. Evidence class: Code-defined.

Order entry page directs to the four-step tailor flow or three-step boutique sale.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F042` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/NewOrderEntryPage-C0V1ZJJw.js`. Anchor: `/orders/new/tailor`.

### NoolTech F043: Customer selection and inline creation

Source module: Tailor orders. Evidence class: Code-defined.

Wizard requires a customer, supports search, and embeds the customer-create form.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F043` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/CreateOrderPage-Cx7T-Y8K.js`. Anchor: `customerId:i.customerId`.

### NoolTech F044: Four-step order wizard

Source module: Tailor orders. Evidence class: Code-defined.

Steps cover Customer, Measurements, Items, and Review. A customerId query parameter can preselect the customer and move to measurements.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F044` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/CreateOrderPage-Cx7T-Y8K.js`. Anchor: `k(2)`.

### NoolTech F046: Reuse saved measurements

Source module: Tailor orders. Evidence class: Code-defined.

Wizard groups measurements by garment type and allows a measurement ID to be linked to each order item.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F046` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/CreateOrderPage-Cx7T-Y8K.js`. Anchor: `o.measurementId`.

### NoolTech F047: Save measurements during order entry

Source module: Tailor orders. Evidence class: Code-defined.

Adds or edits measurements from the wizard, including label, custom values, unit, and notes. Saving measurements is a separate server write before order submission.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F047` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/CreateOrderPage-Cx7T-Y8K.js`. Anchor: `await ht({customerId:i.customerId`.

### NoolTech F048: Measurement requirement validation

Source module: Tailor orders. Evidence class: Code-defined.

Step 3 requires garment type, and requires a linked measurement when the selected garment master has fields. Step 2 itself allows continuing without measurements.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F048` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/CreateOrderPage-Cx7T-Y8K.js`. Anchor: `S(o.garmentType).length>0&&!o.measurementId`.

### NoolTech F050: Delivery date and urgent priority

Source module: Tailor orders. Evidence class: Code-defined.

Wizard defaults delivery date to about seven days ahead and submits normal or urgent priority plus notes.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F050` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/CreateOrderPage-Cx7T-Y8K.js`. Anchor: `Date.now()+10080*60*1e3`.

## REQ-ORDER: Order register, detail, amendments, and lifecycle

Target behavior and acceptance: [REQ-ORDER](../product/requirements.md#req-order-order-register-detail-amendments-and-lifecycle).

### Tailorman F055: Searchable bill register

Source module: Tailoring bills. Evidence class: Code-defined.

Lists 25 recent bills at a time with bill/customer/mobile, line count, delivery date, derived status chips, and balance. Filters are All, Pending, Ready, Delivered, and Payment Pending; Pending includes pending and inProgress.

Original role context: admin, cashier

Verification gap: Code-defined. This row does not establish a successful business write or server-side enforcement.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F055` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/bills.js`. Anchor: `async function load(reset)`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/db.js`. Anchor: `function matchesStatusFilter(b, filter)`.

### Tailorman F056: Bill name, number, and mobile search

Source module: Tailoring bills. Evidence class: Code-defined.

Substring search matches bill number, customer name, or phone digits in the latest 500 nondeleted bills. A term with at least ten digits also attempts an exact customerMobile query. Matches merge by ID, apply the selected status, and return without pagination.

Original role context: admin, cashier

Verification gap: Code-defined. Old bill numbers and partial-name/phone matches outside the recent 500 can be missed; the older-phone fallback matches the stored raw phone string exactly.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F056` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/db.js`. Anchor: `export async function searchBills({ term = "", filter = "all", pageSize = 20, cursor = null } = {})`.

### Tailorman F057: Bill summary and progress

Source module: Tailoring bills. Evidence class: Code-defined.

Detail shows customer link, contact, material/promised dates, Express badge, status chips, and Intake → Production → Ready → Delivered stepper. Admin/cashier additionally see totals, paid, discount, GST, surcharge, and balance. Worker views hide these rendered money blocks.

Original role context: admin, cashier, cutter, stitcher

Verification gap: Code-defined. This row does not establish a successful business write or server-side enforcement.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F057` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/bill.js`. Anchor: `function renderHead()`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/bill.js`. Anchor: `function billStepperHtml()`.

### Tailorman F058: Bill header editing

Source module: Tailoring bills. Evidence class: Code-defined.

Admin edits bill number, bill customer name/mobile snapshot, material date, delivery date, and notes. Both dates must be present. The inspected edit path does not repeat new-bill date-order or bill-number-duplicate validation.

Original role context: admin

Verification gap: Code-defined. Editing customer name/mobile here changes bill snapshot fields and does not update the underlying customer profile.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F058` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/bill.js`. Anchor: `function openEditBill()`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/db.js`. Anchor: `export async function editBill(billId, patch)`.

### Tailorman F059: Bill item add, edit, and remove

Source module: Tailoring bills. Evidence class: Code-defined.

Admin edits garment type, quantity, rate, linked measurement, material color, and notes, or adds/removes lines. Totals, discount, GST, balance, and line count recompute while existing line timeline/assignment metadata persists on edit. Photo deletion during removal is best effort.

Original role context: admin

Verification gap: Code-defined. This row does not establish a successful business write or server-side enforcement.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F059` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/bill.js`. Anchor: `async function openItemEditor(itemId`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/db.js`. Anchor: `function recomputeTotals(bill, items)`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/bill.js`. Anchor: `async function onRemoveItem(itemId, btn)`.

### Tailorman F060: Voiding with financial history retained

Source module: Tailoring bills. Evidence class: Code-defined.

Admin confirms void with an optional reason and a notice that collected money stays in the ledger. Soft-deleted bills leave operational queries and reports while the original bill/payments remain stored. Refunds are separate financial entries.

Original role context: admin

Verification gap: Code-defined. This row does not establish a successful business write or server-side enforcement.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F060` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/bill.js`. Anchor: `async function onVoidBill(btn)`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/db.js`. Anchor: `export async function voidBill(billId, reason = "")`.

### Tailorman F061: Reopen delivered order

Source module: Tailoring bills. Evidence class: Code-defined.

Admin can return a delivered bill to Ready after confirmation. Delivered lines return to Ready with reopened timeline events and deliveredAt is cleared. Existing payments remain.

Original role context: admin

Verification gap: Code-defined. This row does not establish a successful business write or server-side enforcement.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F061` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/bill.js`. Anchor: `async function onReopenBill(btn)`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/db.js`. Anchor: `export async function reopenBill(billId)`.

### Tailorman F065: Material photos and color

Source module: Tailoring bills. Evidence class: Code-defined.

Admin/cashier uploads multiple line images or sets/clears a free-text color with common-color suggestions. A lightbox shows image, color, uploader, and upload time. Admin can confirm deletion from storage and bill metadata.

Original role context: admin, cashier; cutter and stitcher view

Verification gap: Code-defined. This row does not establish a successful business write or server-side enforcement.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F065` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/bill.js`. Anchor: `async function onUploadPhotos(itemId, fileList)`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/bill.js`. Anchor: `function openSetColor(itemId)`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/bill.js`. Anchor: `function openPhotoViewer(itemId, photoPath)`.

### Tailorman F066: Order inspiration images

Source module: Tailoring bills. Evidence class: Code-defined.

Admin/cashier adds order-level reference images, views them full size, and removes them after confirmation. Upload processes images individually and reports individual failures.

Original role context: admin, cashier; cutter and stitcher view

Verification gap: Code-defined. This row does not establish a successful business write or server-side enforcement.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F066` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/bill.js`. Anchor: `async function onUploadInspiration(files)`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/bill.js`. Anchor: `async function onDeleteInspiration(path, btn)`.

### Tailormate F039: Operational order queues

Source module: Order lists and search. Evidence class: Code-defined.

The order list has Active, Past Due, Upcoming, Completed, Urgent, and Delivered routes. It requests a tab name, user ID, shop ID, and configurable number-of-days range. Dates and grouping come from the returned tab-specific order groups.

Original role context: Signed-in shop user with relevant page access; server authorization unverified.

Verification gap: Code-defined. This source review did not observe a successful write, populated record, payment, message, or server-side permission check.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F039` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/orders/%5Btype%5D/page-bb03120fbc2dca9c.js`. Anchor: `label:"Active",path:"/orders/active"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/2579-81f953d8d7798c4c.js`. Anchor: `"/getorderlistbyuser"`.

### Tailormate F041: Order period selection

Source module: Order lists and search. Evidence class: Code-defined.

The initial list range comes from order_default_no_of_days in user settings. Change Order Range replaces the current local range and refetches the list. This local change is separate from saving the user default.

Original role context: Signed-in shop user with relevant page access; server authorization unverified.

Verification gap: Code-defined. This source review did not observe a successful write, populated record, payment, message, or server-side permission check.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F041` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/orders/%5Btype%5D/page-bb03120fbc2dca9c.js`. Anchor: `L.order_default_no_of_days`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/orders/%5Btype%5D/page-bb03120fbc2dca9c.js`. Anchor: `children:"Change Order Range"`.

### Tailormate F042: Search within loaded groups

Source module: Order lists and search. Evidence class: Code-defined.

The normal order list searches customer name, order ID, order number, and status description case-insensitively. It retains the date grouping and removes empty groups.

Original role context: Signed-in shop user with relevant page access; server authorization unverified.

Verification gap: Code-defined. This source review did not observe a successful write, populated record, payment, message, or server-side permission check.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F042` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/orders/%5Btype%5D/page-bb03120fbc2dca9c.js`. Anchor: `let r=e.order_list.filter`.

### Tailormate F043: Order table and permission-dependent controls

Source module: Order lists and search. Evidence class: Code-defined.

Rows show thumbnail, order number, customer, order date, item count, due date, and status. Overdue due dates use destructive styling. VIEW_PRICE controls the price column, ADD_ORDER controls the add shortcut, and MANAGE_PAYMENTS controls View Bill.

Original role context: Signed-in shop user with relevant page access; server authorization unverified.

Verification gap: Code-defined. This source review did not observe a successful write, populated record, payment, message, or server-side permission check.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F043` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/orders/%5Btype%5D/page-bb03120fbc2dca9c.js`. Anchor: `U("VIEW_PRICE")`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/orders/%5Btype%5D/page-bb03120fbc2dca9c.js`. Anchor: `U("MANAGE_PAYMENTS")`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/orders/%5Btype%5D/page-bb03120fbc2dca9c.js`. Anchor: `children:"Customer Name"`.

### Tailormate F044: Advanced search filters

Source module: Order lists and search. Evidence class: Code-defined.

The filter dialog accepts mobile, order status, dress item, order-date start/end, and delivery-date start/end. It requires at least one truthy filter before opening the result route with URL query parameters.

Original role context: Signed-in shop user with relevant page access; server authorization unverified.

Verification gap: Code-defined. This source review did not observe a successful write, populated record, payment, message, or server-side permission check.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F044` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/orders/%5Btype%5D/page-bb03120fbc2dca9c.js`. Anchor: `children:"Advanced Search Filter"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/orders/%5Btype%5D/page-bb03120fbc2dca9c.js`. Anchor: `Please select at least one filter.`.

### Tailormate F045: Advanced-search results and back navigation

Source module: Order lists and search. Evidence class: Code-defined.

The result page requests the shared search helper using query parameters and selected shop/user. It reuses the order row and bill viewer, honors VIEW_PRICE and MANAGE_PAYMENTS, and carries the originating query through detail navigation so Back can restore the search.

Original role context: Signed-in shop user with relevant page access; server authorization unverified.

Verification gap: Code-defined. This source review did not observe a successful write, populated record, payment, message, or server-side permission check.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F045` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/orders/advance-search-list/page-4f2f95a000eed5e9.js`. Anchor: `"advanceSearch"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/orders/advance-search-list/page-4f2f95a000eed5e9.js`. Anchor: `fromPage:"advanceSearch"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/2579-81f953d8d7798c4c.js`. Anchor: `"/searchorder"`.

### Tailormate F046: Combined order overview

Source module: Order detail. Evidence class: Code-defined.

Order detail loads one order and renders tailoring, material, and readymade item sections together. It displays customer, order date and status, item summaries, and permission-controlled financial totals.

Original role context: Signed-in shop user with relevant page access; server authorization unverified.

Verification gap: Code-defined. This source review did not observe a successful write, populated record, payment, message, or server-side permission check.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F046` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/orders/%5Btype%5D/%5BorderId%5D/page-b6d17c0c752aa831.js`. Anchor: `j.br)(T)`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/orders/%5Btype%5D/%5BorderId%5D/page-b6d17c0c752aa831.js`. Anchor: `eF.material_items`.

### Tailormate F047: Customer contact view and WhatsApp link

Source module: Order detail. Evidence class: Code-defined.

The order header opens a read-only customer-details dialog with name, mobile, address, gender, and face image. Its WhatsApp link uses the order customer country code and mobile.

Original role context: Signed-in shop user with relevant page access; server authorization unverified.

Verification gap: Code-defined. This source review did not observe a successful write, populated record, payment, message, or server-side permission check.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F047` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/orders/%5Btype%5D/%5BorderId%5D/page-b6d17c0c752aa831.js`. Anchor: `children:"Customer Details"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/orders/%5Btype%5D/%5BorderId%5D/page-b6d17c0c752aa831.js`. Anchor: `customer_country_code`.

### Tailormate F048: Edit order date and number

Source module: Order detail. Evidence class: Code-defined.

The order-date modal posts an updated formatted date with current modifying user. The order-number modal trims the entry, rejects an empty value, and submits order_no. Duplicate-number enforcement is not established by this client.

Original role context: Signed-in shop user with relevant page access; server authorization unverified.

Verification gap: Code-defined. This source review did not observe a successful write, populated record, payment, message, or server-side permission check.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F048` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/orders/%5Btype%5D/%5BorderId%5D/page-b6d17c0c752aa831.js`. Anchor: `children:"Enter Order Date (dd/mm/yyyy)"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/orders/%5Btype%5D/%5BorderId%5D/page-b6d17c0c752aa831.js`. Anchor: `Order number cannot be empty`.

### Tailormate F049: Order-level and garment-level status changes

Source module: Order detail. Evidence class: Code-defined.

A shared modal loads statuses from getorderstatus. It can update the whole order status_id or only the selected garment item status_id, with order ID and current modifying user. The possible status values are server-provided, not hardcoded by this modal.

Original role context: Signed-in shop user with relevant page access; server authorization unverified.

Verification gap: Code-defined. This source review did not observe a successful write, populated record, payment, message, or server-side permission check.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F049` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/orders/%5Btype%5D/%5BorderId%5D/page-b6d17c0c752aa831.js`. Anchor: `children:"Order Status"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/orders/%5Btype%5D/%5BorderId%5D/page-b6d17c0c752aa831.js`. Anchor: `dress_items:t?[{id:null==t?void 0:t.id,status_id:m}]`.

### Tailormate F050: Add items to an existing order

Source module: Order detail. Evidence class: Code-defined.

Add Item returns to the order wizard with current customer ID, first garment expected-delivery date, and existing order ID. New lines can therefore be appended through the category picker.

Original role context: Signed-in shop user with relevant page access; server authorization unverified.

Verification gap: Code-defined. This source review did not observe a successful write, populated record, payment, message, or server-side permission check.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F050` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/orders/%5Btype%5D/%5BorderId%5D/page-b6d17c0c752aa831.js`. Anchor: `pathname:"/orders/add-order"`.

### Tailormate F051: Garment item detail

Source module: Order detail. Evidence class: Code-defined.

A garment detail modal shows nickname, garment name, status, due date, stitch type, added-by identity and date, sales staff, function date, up to three trial dates, special instructions, video link, selected stitching options, and saved measurement values.

Original role context: Signed-in shop user with relevant page access; server authorization unverified.

Verification gap: Code-defined. This source review did not observe a successful write, populated record, payment, message, or server-side permission check.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F051` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/orders/%5Btype%5D/%5BorderId%5D/page-b6d17c0c752aa831.js`. Anchor: `85400:function`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/orders/%5Btype%5D/%5BorderId%5D/page-b6d17c0c752aa831.js`. Anchor: `children:"Stitching Option(s): "`.

### Tailormate F052: Photo inspection

Source module: Order detail. Evidence class: Code-defined.

Cloth and pattern thumbnails open the shared image carousel. Cloth-image popovers expose length and comments. Garment measurement cards pair field names, values, and illustration icons.

Original role context: Signed-in shop user with relevant page access; server authorization unverified.

Verification gap: Code-defined. This source review did not observe a successful write, populated record, payment, message, or server-side permission check.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F052` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/orders/%5Btype%5D/%5BorderId%5D/page-b6d17c0c752aa831.js`. Anchor: `children:"Cloth Images: "`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/orders/%5Btype%5D/%5BorderId%5D/page-b6d17c0c752aa831.js`. Anchor: `children:["Length: "`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/orders/%5Btype%5D/%5BorderId%5D/page-b6d17c0c752aa831.js`. Anchor: `children:"Measurements (inches)"`.

### Tailormate F053: Edit and deactivate items

Source module: Order detail. Evidence class: Code-defined.

EDIT_ORDER-controlled item actions reopen the matching garment or stock-sale editor. Deletion confirmation submits a status_id 0 item update, preserving the order and the relevant garment, material, or readymade line IDs.

Original role context: Signed-in shop user with relevant page access; server authorization unverified.

Verification gap: Code-defined. This source review did not observe a successful write, populated record, payment, message, or server-side permission check.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F053` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/orders/%5Btype%5D/%5BorderId%5D/page-b6d17c0c752aa831.js`. Anchor: `children:"Delete Item"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/orders/%5Btype%5D/%5BorderId%5D/page-b6d17c0c752aa831.js`. Anchor: `dress_items:[{id:null==ev?void 0:ev.id,status_id:"0"}]`.

### Tailormate F056: Permission-dependent item actions

Source module: Order detail. Evidence class: Code-defined.

VIEW_PRICE hides on-screen money. EDIT_ORDER exposes edit, delete, expense, print/share/QR actions within the garment action group. ASSIGN_ITEM adds the staff-assignment action. MANAGE_TASK exposes task planning only when expected delivery is still in the future.

Original role context: Signed-in shop user with relevant page access; server authorization unverified.

Verification gap: Code-defined. This source review did not observe a successful write, populated record, payment, message, or server-side permission check.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F056` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/orders/%5Btype%5D/%5BorderId%5D/page-b6d17c0c752aa831.js`. Anchor: `z("ASSIGN_ITEM")`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/orders/%5Btype%5D/%5BorderId%5D/page-b6d17c0c752aa831.js`. Anchor: `B&&o&&`.

### Tailormate F060: Finish the intake flow

Source module: Order detail. Evidence class: Code-defined.

When the detail URL has any from query value, Finish Order posts finish_order 1 for the order, then navigates to Active Orders. It is separate from changing the order lifecycle status through the status modal.

Original role context: Signed-in shop user with relevant page access; server authorization unverified.

Verification gap: Code-defined. This source review did not observe a successful write, populated record, payment, message, or server-side permission check.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F060` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/orders/%5Btype%5D/%5BorderId%5D/page-b6d17c0c752aa831.js`. Anchor: `finish_order:"1"`.

### NoolTech F056: Tailor/boutique/all source tabs

Source module: Order list. Evidence class: Code-defined.

Order list fetches counts separately for all, boutique, and tailor sources and filters displayed data by source.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F056` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/OrdersPage-D3Hv-8Ek.js`. Anchor: `source:"boutique"`.

### NoolTech F057: Status and text filters

Source module: Order list. Evidence class: Code-defined.

Status tabs include pending/in-progress/completed/delivered; search requests up to 100 results for the chosen order source.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F057` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/OrdersPage-D3Hv-8Ek.js`. Anchor: `searchOrders(W,100,l)`.

### NoolTech F058: Branch filter

Source module: Order list. Evidence class: Code-defined.

Multi-location context synchronizes current branch with the order query.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F058` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/OrdersPage-D3Hv-8Ek.js`. Anchor: `setLocationFilter:G`.

### NoolTech F059: Taken-by staff filter

Source module: Order list. Evidence class: Code-defined.

Owners/managers/staff can filter taken-by ownership. Manager/tailor defaults to me; chosen value is remembered by user in local storage.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F059` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/OrdersPage-D3Hv-8Ek.js`. Anchor: `orders_taken_by_`.

### NoolTech F060: Pagination

Source module: Order list. Evidence class: Code-defined.

Order data includes page, totalPages, total, status/source/location/takenBy filters.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F060` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/index-Dk-7hFgw.js`. Anchor: `totalPages:m.totalPages??1`.

### NoolTech F061: Bulk status updates

Source module: Order list. Evidence class: Code-defined.

Selected order IDs receive independent update requests with the chosen status; selection clears after completion.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F061` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/OrdersPage-D3Hv-8Ek.js`. Anchor: `Promise.all(Array.from(b).map`.

### NoolTech F062: Export selected orders to CSV

Source module: Order list. Evidence class: Code-defined.

CSV includes order, customer, phone, items, total, paid, balance, status, delivery date, and creation date.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F062` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/OrdersPage-D3Hv-8Ek.js`. Anchor: `["Order #","Customer","Phone","Items","Total","Paid","Balance","Status","Delivery Date","Created"]`.

### NoolTech F063: Delete order with confirmation

Source module: Order list. Evidence class: Code-defined.

Order list opens a delete confirmation and calls deleteOrder for the selected order ID.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F063` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/OrdersPage-D3Hv-8Ek.js`. Anchor: `await Le(_.id)`.

### NoolTech F064: Live refresh and update bus

Source module: Order list. Evidence class: Code-defined.

List refreshes approximately every 60 seconds and subscribes to the order-update bus.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F064` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/OrdersPage-D3Hv-8Ek.js`. Anchor: `St(()=>$(),void 0,6e4)`.

### NoolTech F065: Full order record

Source module: Order details. Evidence class: Code-defined.

Loads order, recorded payments, and invoice history together, with periodic order-detail refresh.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F065` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/OrderDetailPage-B2ZYKSVH.js`. Anchor: `Promise.all([z.getById(p),B.getOrderPayments(p),ve.getOrderInvoices(p)`.

### NoolTech F066: Edit status, date, discounts, advance, notes

Source module: Order details. Evidence class: Code-defined.

Edit page submits pending, in-progress, completed, delivered, or cancelled status and updated order details.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F066` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/EditOrderPage-BEwyP7Ug.js`. Anchor: `await Z.update(f,{status:p`.

### NoolTech F068: Edit order item list

Source module: Order details. Evidence class: Code-defined.

Item editor requires at least one item, a garment name, quantity at least one, and nonnegative price; PATCH updates items.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F068` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/OrderDetailPage-B2ZYKSVH.js`. Anchor: `xe.some(i=>!i.garmentType||i.quantity<1||i.pricePerItem<0)`.

### NoolTech F070: Cancel order and record refund amount

Source module: Order details. Evidence class: Code-defined.

Cancel handler requires a nonempty reason despite optional-sounding translated copy, then submits cancelled status, cancellationReason, and optional refundAmount.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F070` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/OrderDetailPage-B2ZYKSVH.js`. Anchor: `if(!(!n||!te.trim()))`.

### NoolTech F071: Clone order

Source module: Order details. Evidence class: Code-defined.

Clone action calls createRepeatOrder with an empty override object and navigates to the new order.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F071` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/OrderDetailPage-B2ZYKSVH.js`. Anchor: `z.createRepeatOrder(n._id,{})`.

### NoolTech F072: Repeat selected items

Source module: Order details. Evidence class: Code-defined.

Repeat modal selects garment items and quantities, optional delivery date and notes, then submits repeat endpoint.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F072` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/OrderDetailPage-B2ZYKSVH.js`. Anchor: `s.items=K.filter(d=>d.selected)`.

### NoolTech F075: Order attachment upload and deletion

Source module: Order details. Evidence class: Code-defined.

Adds/deletes order attachments with image/PDF accept UI. Error copy states 3 MB; actual server enforcement was not tested.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F075` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/OrderDetailPage-B2ZYKSVH.js`. Anchor: `await z.addAttachment(n._id,s)`.

### NoolTech F078: Order change history

Source module: Order details. Evidence class: Code-defined.

Details render field-by-field old/new values, actor, and timestamp from recorded order change history.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F078` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/OrderDetailPage-B2ZYKSVH.js`. Anchor: `t.oldValue||t.newValue`.

## REQ-PRICE: Canonical quotes, tax, discounts, and numbering

Target behavior and acceptance: [REQ-PRICE](../product/requirements.md#req-price-canonical-quotes-tax-discounts-and-numbering).

### Tailorman F044: Automatic and manual bill numbers

Source module: Tailoring bill intake. Evidence class: Code-defined.

Auto mode previews prefix + two-digit year + five-digit counter and makes the field read-only. Save allocates a number with a Firestore counter transaction. Manual mode requires a typed number and checks it against nondeleted bills.

Original role context: admin, cashier

Verification gap: Code-defined. This row does not establish a successful business write or server-side enforcement.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F044` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/new-bill.js`. Anchor: `if (billNumberMode === "manual")`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/db.js`. Anchor: `export async function nextBillNumber()`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/db.js`. Anchor: `export async function billNumberExists(billNumber)`.

### Tailorman F048: Express surcharge

Source module: Tailoring bill intake. Evidence class: Code-defined.

An Express flag reveals a surcharge. The surcharge joins the item subtotal before discount and tax. Plans excluding expressFlag hide the flag, clear its check, and zero the surcharge.

Original role context: admin, cashier

Verification gap: Code-defined. This row does not establish a successful business write or server-side enforcement.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F048` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/new-bill.js`. Anchor: `function applyPlanFeatureGates()`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/new-bill.js`. Anchor: `function updateTotals()`.

### Tailorman F049: Loyalty and manual percentage discount

Source module: Tailoring bill intake. Evidence class: Code-defined.

Selecting a customer loads their saved discount only if loyaltyDiscount is available. The editable discount applies to items plus express surcharge. Manual discount remains available according to the inspected picker comment and handler.

Original role context: admin, cashier

Verification gap: Code-defined. This row does not establish a successful business write or server-side enforcement.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F049` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/new-bill.js`. Anchor: `async function pickCustomer(c)`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/new-bill.js`. Anchor: `const discAmt = Math.round(subtotal * discPct / 100 * 100) / 100;`.

### Tailorman F050: GST and totals

Source module: Tailoring bill intake. Evidence class: Code-defined.

Live summary computes line quantity × rate, adds express surcharge, subtracts rounded percentage discount, adds rounded GST percentage, then subtracts advance for balance. A plan without gst hides the GST field and zeros it.

Original role context: admin, cashier

Verification gap: Code-defined. This row does not establish a successful business write or server-side enforcement.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F050` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/new-bill.js`. Anchor: `function updateTotals()`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/db.js`. Anchor: `const itemsSubtotal = items.reduce((s, it) => s + it.quantity * it.rate, 0);`.

### Tailorman F208: Automatic or manual bill numbering

Source module: Shop settings. Evidence class: Code-defined.

Sets automatic or manual numbering and a configurable bill prefix, default B. Settings display the last issued counter and the next auto number. Existing bill numbers remain attached to their records.

Original role context: Admin

Verification gap: Defined in captured client code. No successful authenticated action or server authorization behavior was tested for this entry.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F208` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/settings.js`. Anchor: `function bindBillingForm()`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/db.js`. Anchor: `export async function getBillingSettings()`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/db.js`. Anchor: `export async function setBillingSettings({ billNumberMode, billNumberPrefix })`.

### Tailorman F209: Bill counter reset with duplicate warning

Source module: Shop settings. Evidence class: Code-defined.

Accepts a positive integer for the next automatic bill number. Resets require confirmation. Moving backwards across issued numbers requires an additional explicit override warning about duplicates, and the data helper rejects backward resets without force.

Original role context: Admin

Verification gap: Defined in captured client code. No successful authenticated action or server authorization behavior was tested for this entry.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F209` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/settings.js`. Anchor: `title: "Those numbers are already used"`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/db.js`. Anchor: `export async function setBillCounterStart(start, { force = false } = {})`.

### Tailormate F028: Base charge and priced add-ons

Source module: Stitching order entry. Evidence class: Code-defined.

Stitching Charges are labeled per item. The main form adds price_standard and price_add_ons. The price-breakup dialog has base price, repeated description/price add-on rows, summed add-ons, and a total shown to three decimals.

Original role context: Signed-in shop user with relevant page access; server authorization unverified.

Verification gap: Code-defined. This source review did not observe a successful write, populated record, payment, message, or server-side permission check.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F028` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/9491-bcd4f8939976b832.js`. Anchor: `children:"Add Price Breakup"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/9491-bcd4f8939976b832.js`. Anchor: `children:"Total Add ons"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/9491-bcd4f8939976b832.js`. Anchor: `price:(+(null!==(c=`.

### Tailormate F059: Financial balance calculation

Source module: Order detail. Evidence class: Code-defined.

The detail view sums garment price fields, material total_price fields, and readymade total_price fields. Balance subtracts order.total_payments plus order.discount. The presentation can display three decimals. Backend quantity expansion and tax computation are not recovered from this summation.

Original role context: Signed-in shop user with relevant page access; server authorization unverified.

Verification gap: Code-defined. This source review did not observe a successful write, populated record, payment, message, or server-side permission check.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F059` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/orders/%5Btype%5D/%5BorderId%5D/page-b6d17c0c752aa831.js`. Anchor: `totalAmount:s,totalPayable:r`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/orders/%5Btype%5D/%5BorderId%5D/page-b6d17c0c752aa831.js`. Anchor: `children:"Total Bill Amount:"`.

### Tailormate F063: Order discount as a payment-type record

Source module: Order payments and documents. Evidence class: Code-defined.

The discount section finds payment_type 2 separately from type-1 receipts. Saving creates or updates a discount amount with order ID and optional payment ID. The amount is subtracted in the order balance calculation.

Original role context: Signed-in shop user with relevant page access; server authorization unverified.

Verification gap: Code-defined. This source review did not observe a successful write, populated record, payment, message, or server-side permission check.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F063` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/orders/%5Btype%5D/%5BorderId%5D/page-b6d17c0c752aa831.js`. Anchor: `payment_type:"2"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/orders/%5Btype%5D/%5BorderId%5D/page-b6d17c0c752aa831.js`. Anchor: `Discount updated successfully`.

### Tailormate F179: GST configuration

Source module: Shop settings. Evidence class: Code-defined.

GST Bill reveals GSTIN, GST rate, and Include gst in price. Turning GST off submits empty GSTIN/rate/inclusion values. The schema declares these fields optional and does not impose a GST range or GSTIN format check in this module.

Original role context: Signed-in shop user; client permissions and selected-shop context apply

Verification gap: Code-defined. This source review did not execute the action, verify a persisted result, or test backend authorization. Parent browser observations provide separate screen context.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F179` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/settings/page-8e56f7911d5a369e.js`. Anchor: `gst_percent:I.z.string().optional()`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/settings/page-8e56f7911d5a369e.js`. Anchor: `price_include_gst:e.gst_bill?e.price_include_gst?"1":"0":""`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/settings/page-8e56f7911d5a369e.js`. Anchor: `label:"GST rate (in %)"`.

### Tailormate F180: Order number pattern

Source module: Shop settings. Evidence class: Code-defined.

Settings choose Random, Serial, or Custom order numbering using encoded values 1, 2, and 3. This page saves the selected pattern, while actual number generation is handled elsewhere.

Original role context: Signed-in shop user; client permissions and selected-shop context apply

Verification gap: Code-defined. This source review did not execute the action, verify a persisted result, or test backend authorization. Parent browser observations provide separate screen context.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F180` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/settings/page-8e56f7911d5a369e.js`. Anchor: `1:"Random",2:"Serial",3:"Custom"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/settings/page-8e56f7911d5a369e.js`. Anchor: `label:"Order number format"`.

### NoolTech F049: Multiple garments and quantity pricing

Source module: Tailor orders. Evidence class: Code-defined.

Adds/removes items with garment/custom item name, quantity, and per-item price; initial quantity is one and price may stay zero.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F049` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/CreateOrderPage-Cx7T-Y8K.js`. Anchor: `items:[{garmentType:"",quantity:1,pricePerItem:0}]`.

### NoolTech F051: Flat and percentage discounts

Source module: Tailor orders. Evidence class: Code-defined.

Computes subtotal, flat/rounded percentage discount, nonnegative total, advance, and balance.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F051` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/CreateOrderPage-Cx7T-Y8K.js`. Anchor: `discountType==="percentage"?Math.round`.

### NoolTech F053: Large-order amount confirmation

Source module: Tailor orders. Evidence class: Code-defined.

Orders with computed total at least ₹100,000 open an extra amount confirmation before saving.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F053` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/CreateOrderPage-Cx7T-Y8K.js`. Anchor: `D()>=1e5`.

### NoolTech F067: Price permission and final amount

Source module: Order details. Evidence class: Code-defined.

changePrices=false hides final amount changes. Marking a previously undelivered order delivered requires a positive final order amount.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F067` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/EditOrderPage-BEwyP7Ug.js`. Anchor: `permissions)==null?void 0:_.changePrices`.

### NoolTech F127: Sale discounts and GST

Source module: Boutique POS. Evidence class: Code-defined.

Flat/percentage discount, optional GST, bulk tiers, alteration fee, and loyalty redemption affect displayed total.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F127` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/CreateSalePage-Cj1oN_dA.js`. Anchor: `J=j?Math.round(Tt*N/100):0`.

### NoolTech F226: Invoice tax settings

Source module: Settings. Evidence class: Code-defined.

Enable GST invoices, set CGST/SGST rates, and display effective tax rate. Client requires GST number when GST is enabled; profile save includes invoiceSettings.

Original role context: Authenticated shop user

Verification gap: Client action, form, or service definition exists. Server execution, persistence, and access enforcement were not tested by this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F226` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/SettingsPage-BspbE0gu.js`. Anchor: `gstNumberRequired`.

## REQ-COLLECT: Receipts, receivables, refunds, and corrections

Target behavior and acceptance: [REQ-COLLECT](../product/requirements.md#req-collect-receipts-receivables-refunds-and-corrections).

### Tailorman F051: Advance and validation

Source module: Tailoring bill intake. Evidence class: Code-defined.

Save rejects missing or nonpositive-quantity garment lines, no valid items, missing customer/dates, and advance above the computed total. Initial bill status is pending and every line starts at Material Received with an actor/timestamp timeline entry.

Original role context: admin, cashier

Verification gap: Code-defined. This row does not establish a successful business write or server-side enforcement.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F051` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/new-bill.js`. Anchor: `if (!valid || itemsData.length === 0)`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/db.js`. Anchor: `export async function createBill(data)`.

### Tailorman F054: Advance-to-ledger entry

Source module: Tailoring bill intake. Evidence class: Code-defined.

If an advance was supplied, creates its payment and corresponding income entry after the bill save, using cash by default and notes Advance on order. A payment-ledger failure is logged while the bill remains saved.

Original role context: admin, cashier

Verification gap: Code-defined. Bill creation and subsequent advance-ledger writes are separate operations; the inspected path can retain a bill when its advance ledger write fails.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F054` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/db.js`. Anchor: `if (paidAmount > 0) {`.

### Tailorman F067: Individual payment capture

Source module: Tailoring bills. Evidence class: Code-defined.

Admin/cashier adds a positive payment up to outstanding balance, with cash, upi, card, bank, or other mode and notes. A Firestore batch records payment, income-ledger row, and updated paid/balance fields. Detail lists payment mode/time/actor.

Original role context: admin, cashier

Verification gap: Code-defined. This row does not establish a successful business write or server-side enforcement.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F067` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/bill.js`. Anchor: `function openAddPayment()`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/db.js`. Anchor: `export async function addPayment(billId, payment)`.

### Tailorman F073: Collect balance during delivery

Source module: Order status and delivery. Evidence class: Code-defined.

Delivery sheet defaults Collect balance now on for unpaid bills, prefills balance, allows partial amount and five payment modes, and clamps overtyped amount to the current balance. Payment saves before the status change. The toggle also allows delivery without collection.

Original role context: admin, cashier

Verification gap: Code-defined. This row does not establish a successful business write or server-side enforcement.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F073` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/bill-status.js`. Anchor: `function paymentHtml(bill)`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/bill-status.js`. Anchor: `if (result.collect) {`.

### Tailorman F116: Split payments and full-credit sales

Source module: Boutique sales and receipts. Evidence class: Code-defined.

Add multiple payment rows for cash, UPI, card, and bank. Only positive amounts are collected. Empty payment rows allow a fully unpaid sale. Store individual payment amounts and set the aggregate mode to mixed when more than one payment exists.

Original role context: Admin and cashier, boutiqueSales entitlement

Verification gap: Code-defined. No authenticated execution or persisted result was observed in this source review.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F116` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/sales.js`. Anchor: `function addPaymentLine(defaultMode = "cash")`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/db.js`. Anchor: `const mode = payments.length === 1 ?`.

### Tailorman F117: Receivable contact and overpayment validation

Source module: Boutique sales and receipts. Evidence class: Code-defined.

When a sale retains a balance, require a customer name or mobile number. Reject received payment above the calculated sale total. Fully paid walk-in sales can omit customer contact data.

Original role context: Admin and cashier, boutiqueSales entitlement

Verification gap: Code-defined. No authenticated execution or persisted result was observed in this source review.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F117` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/sales.js`. Anchor: `if (saleTotal - received > 0 && !custName && !custMobile)`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/sales.js`. Anchor: `if (received > saleTotal)`.

### Tailorman F121: Sale payment states

Source module: Boutique sales and receipts. Evidence class: Code-defined.

Set status paid when balance is zero or below, partial when money is received and balance remains, and credit when no money is received. Store total, received, balance, item count, quantity total, notes, and sold timestamp.

Original role context: Admin and cashier, boutiqueSales entitlement

Verification gap: Code-defined. No authenticated execution or persisted result was observed in this source review.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F121` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/db.js`. Anchor: `const status = balance <= 0 ? "paid"`.

### Tailorman F126: Collect outstanding sale payments

Source module: Boutique sales and receipts. Evidence class: Code-defined.

For a positive-balance sale, accept one or more payment methods and amounts. Reject no positive payment and payment larger than displayed balance. Append payments, recalculate received and balance, update status, and write payment ledger rows in a batch with the sale update.

Original role context: Admin and cashier, boutiqueSales entitlement

Verification gap: Code-defined. The live form was not submitted. Concurrent collections use a pre-batch read and were not tested.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F126` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/sale.js`. Anchor: `function bindCollectPayment(saleId, saleNode, balance)`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/db.js`. Anchor: `export async function collectBoutiquePayment(saleId, payments)`.

### Tailorman F160: Outstanding bill list and totals

Source module: Outstanding tailoring payments. Evidence class: Code-defined.

Query up to 300 non-deleted bills with positive balances, ordered by balance descending. Include already-delivered bills and mark them visibly. Display bills with balance, total outstanding, overdue bill count, and overdue amount.

Original role context: Admin and cashier, outstanding entitlement

Verification gap: Code-defined. No authenticated execution or persisted result was observed in this source review.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F160` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/outstanding.js`. Anchor: `async function load()`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/outstanding.js`. Anchor: `function renderKpis(bills)`.

### Tailorman F161: Receivable aging buckets

Source module: Outstanding tailoring payments. Evidence class: Code-defined.

Compute age against expectedDeliveryDate at local midnight. Group not-yet-due, 1-7 days, 8-30 days, and 31-plus days with count and balance totals. Missing delivery dates are treated as zero days and land in not-yet-due.

Original role context: Admin and cashier, outstanding entitlement

Verification gap: Code-defined. No authenticated execution or persisted result was observed in this source review.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F161` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/outstanding.js`. Anchor: `function ageDays(bill)`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/outstanding.js`. Anchor: `const BUCKETS = [`.

### Tailormate F061: Record a dated payment

Source module: Order payments and documents. Evidence class: Code-defined.

Receive Payment opens with the current balance and date, defaulting method to Cash. The form loads payment-method choices and posts amount, order ID, ISO payment date, selected method, and payment_type 1.

Original role context: Signed-in shop user with relevant page access; server authorization unverified.

Verification gap: Code-defined. This source review did not observe a successful write, populated record, payment, message, or server-side permission check.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F061` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/orders/%5Btype%5D/%5BorderId%5D/page-b6d17c0c752aa831.js`. Anchor: `children:"Receive Payment"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/orders/%5Btype%5D/%5BorderId%5D/page-b6d17c0c752aa831.js`. Anchor: `payment_type:"1"`.

### Tailormate F062: Inspect, edit, and deactivate past payments

Source module: Order payments and documents. Evidence class: Code-defined.

The Payments dialog lists payment date, method, and amount. Amount can be edited inline and saved. Delete asks for confirmation and posts status_id 0 with payment ID, amount, and type, then invalidates payment and order queries.

Original role context: Signed-in shop user with relevant page access; server authorization unverified.

Verification gap: Code-defined. This source review did not observe a successful write, populated record, payment, message, or server-side permission check.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F062` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/orders/%5Btype%5D/%5BorderId%5D/page-b6d17c0c752aa831.js`. Anchor: `children:"Past Payments"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/orders/%5Btype%5D/%5BorderId%5D/page-b6d17c0c752aa831.js`. Anchor: `Payment deleted successfully`.

### Tailormate F064: Payment form validation boundary

Source module: Order payments and documents. Evidence class: Code-defined.

The captured new-payment schema requires string amount and date, with an optional payment-method object. Edit-payment and discount handlers also forward their current amount strings. This module does not establish numeric positivity, an overpayment ceiling, or mandatory payment method.

Original role context: Signed-in shop user with relevant page access; server authorization unverified.

Verification gap: Static client boundary. No negative, blank, oversized, or otherwise invalid payment was submitted. Backend validation is unknown.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F064` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/orders/%5Btype%5D/%5BorderId%5D/page-b6d17c0c752aa831.js`. Anchor: `amount:ep.z.string(),date:ep.z.date()`.

### NoolTech F052: Advance payment capture

Source module: Tailor orders. Evidence class: Code-defined.

Wizard includes advanceAmount and shows resulting balance; initial advance is zero.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F052` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/CreateOrderPage-Cx7T-Y8K.js`. Anchor: `advanceAmount:i.advanceAmount`.

### NoolTech F076: Payment receipt attachments

Source module: Order details. Evidence class: Code-defined.

Each displayed payment supports upload/delete receipt files; client refuses upload when it already has three attachments.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F076` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/OrderDetailPage-B2ZYKSVH.js`. Anchor: `Maximum 3 attachments per payment`.

### NoolTech F077: Record payment

Source module: Order details. Evidence class: Code-defined.

Handler validates positive numeric amount then records orderId, amount, method, reference, and notes. It reloads payment history.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F077` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/OrderDetailPage-B2ZYKSVH.js`. Anchor: `B.recordPayment({orderId:p,amount:s,paymentMethod:P`.

### NoolTech F195: Order payment register

Source module: Payments. Evidence class: Code-defined.

Search orders; filter paid/partial/pending and date range; inspect order, customer, order value, paid amount, balance, and payment status. Summary shows revenue, pending total, collected total, and collection rate. Default order request is limited to 100.

Original role context: Authenticated shop user

Verification gap: Client action, form, or service definition exists. Server execution, persistence, and access enforcement were not tested by this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F195` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/PaymentsPage-USvk3Qc7.js`. Anchor: `getPaymentsSummary`.

### NoolTech F196: Export payment register

Source module: Payments. Evidence class: Code-defined.

Export visible filtered orders to CSV with order ID, customer, date, total, paid, balance, and status.

Original role context: Authenticated shop user

Verification gap: Client action, form, or service definition exists. Server execution, persistence, and access enforcement were not tested by this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F196` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/PaymentsPage-USvk3Qc7.js`. Anchor: `payments_report_`.

### NoolTech F197: Receipt view and print

Source module: Payments. Evidence class: Code-defined.

View an order receipt containing order ID, issue date, total, paid amount, and balance; print receipt. Record-payment picker searches pending-balance orders and navigates to order detail.

Original role context: Authenticated shop user

Verification gap: Client action, form, or service definition exists. Server execution, persistence, and access enforcement were not tested by this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F197` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/PaymentsPage-USvk3Qc7.js`. Anchor: `PAYMENT RECEIPT`.

### NoolTech F198: Customer balance-due list

Source module: Payments. Evidence class: Code-defined.

Aggregate unpaid balances by customer, display overdue age/order counts/oldest and latest order, search name/phone/email, and navigate into a customer's order details. Basic-or-higher copy is shown on the gate.

Original role context: Authenticated shop user

Verification gap: Client action, form, or service definition exists. Server execution, persistence, and access enforcement were not tested by this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F198` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/BalanceDuePage-Bmuuruop.js`. Anchor: `getBalanceDueByCustomer`.

### NoolTech F199: Payment and refund service actions

Source module: Payments. Evidence class: Code-defined.

Client definitions include record payment, record refund, list per-order/all payments, date/payment-method pagination filters, statistics, and delete payment.

Original role context: Authenticated shop user

Verification gap: These are service definitions. The root investigator verifies payment/refund dialogs separately; settlement, gateway processing, and permissions are not established here.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F199` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/dependencies/payment.service-B7Ek1Z-0.js`. Anchor: `recordRefund`.

### NoolTech F200: Payment receipt attachments

Source module: Payments. Evidence class: Code-defined.

Multipart upload, delete, and authenticated retrieval of attachments on a payment are defined.

Original role context: Authenticated shop user

Verification gap: Client action, form, or service definition exists. Server execution, persistence, and access enforcement were not tested by this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F200` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/dependencies/payment.service-B7Ek1Z-0.js`. Anchor: `addAttachment`.

## REQ-DOC: Invoices, receipts, payment advice, and order documents

Target behavior and acceptance: [REQ-DOC](../product/requirements.md#req-doc-invoices-receipts-payment-advice-and-order-documents).

### Tailorman F068: Printable receipt

Source module: Tailoring bills. Evidence class: Code-defined.

Builds A4 Work Order / Receipt with shop name, tagline, address, phone/email, GSTIN, customer, dates, item quantity/rate/amount, color/notes, up to four photos per line, totals, and amount in INR words. Print waits for images with a six-second cap.

Original role context: admin, cashier; print controls also rendered for workers

Verification gap: Code-defined. On-screen worker money blocks are hidden, but print/PDF controls and the receipt template are not guarded by canSeeMoney in this module.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F068` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/bill.js`. Anchor: `function renderPrint()`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/bill.js`. Anchor: `async function printReceipt()`.

### Tailorman F069: PDF receipt share or download

Source module: Tailoring bills. Evidence class: Code-defined.

Loads html2pdf.js on demand, generates portrait A4 PDF with images, shares a File through Web Share when supported, or downloads it. Filename uses the bill number.

Original role context: admin, cashier; controls also rendered for workers

Verification gap: Code-defined. This row does not establish a successful business write or server-side enforcement.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F069` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/bill.js`. Anchor: `async function sharePdf()`.

### Tailorman F071: Printable job-card QR

Source module: Tailoring bills. Evidence class: Code-defined.

Builds a QR and copyable link to job-card.html with tenant and bill IDs, using api.qrserver.com. A fabric-tag printout includes bill number, customer name, garment names, QR, and URL.

Original role context: admin, cashier, cutter, stitcher

Verification gap: Code-defined QR generation. Target page behavior is documented in the platform inventory.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F071` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/bill.js`. Anchor: `function openJobCardQr()`.

### Tailormate F057: Printable item, whole order, and QR outputs

Source module: Order detail. Evidence class: Code-defined.

The client requests printitem by order_dress_id, printorder by order_id, and printqrcode by order_dress_id. Returned file URLs are opened separately. QR has an image modal and browser print action.

Original role context: Signed-in shop user with relevant page access; server authorization unverified.

Verification gap: Code-defined. This source review did not observe a successful write, populated record, payment, message, or server-side permission check.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F057` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/2579-81f953d8d7798c4c.js`. Anchor: `"/printitem"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/2579-81f953d8d7798c4c.js`. Anchor: `"/printorder"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/2579-81f953d8d7798c4c.js`. Anchor: `"/printqrcode"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/orders/%5Btype%5D/%5BorderId%5D/page-b6d17c0c752aa831.js`. Anchor: `children:"QR Code"`.

### Tailormate F058: Share an item document through WhatsApp

Source module: Order detail. Evidence class: Code-defined.

An item share action requests its printable file URL, then opens a WhatsApp composer addressed to the customer with garment name, order number, and link. This does not confirm that a message is sent or delivered.

Original role context: Signed-in shop user with relevant page access; server authorization unverified.

Verification gap: Code-defined. This source review did not observe a successful write, populated record, payment, message, or server-side permission check.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F058` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/orders/%5Btype%5D/%5BorderId%5D/page-b6d17c0c752aa831.js`. Anchor: `Please click the link to view details of `.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/orders/%5Btype%5D/%5BorderId%5D/page-b6d17c0c752aa831.js`. Anchor: `window.open(i,"_blank","noopener,noreferrer")`.

### Tailormate F065: Bill and payment-advice viewer

Source module: Order payments and documents. Evidence class: Code-defined.

MANAGE_PAYMENTS opens server-generated Bill or Payment Advice via getorderinvoice. The dialog embeds invoice_url, offers Download or Print, and opens a WhatsApp composer containing that URL and order number.

Original role context: Signed-in shop user with relevant page access; server authorization unverified.

Verification gap: Code-defined. This source review did not observe a successful write, populated record, payment, message, or server-side permission check.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F065` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/orders/%5Btype%5D/page-bb03120fbc2dca9c.js`. Anchor: `g="bill"===m?"Bill":"Payment Advice"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/2579-81f953d8d7798c4c.js`. Anchor: `"/getorderinvoice"`.

### Tailormate F148: Custom bill terms

Source module: Bill terms. Evidence class: Code-defined.

List, create and edit description text for bill terms. The form uses a textarea and saves term_desc plus optional term_id and the current user_id through savebillterms.

Original role context: Signed-in shop user with access to this module. The parent inventory covers navigation permission checks. Backend authorization and other accounts were not tested.

Verification gap: Code-defined. No persisted business action or successful server result was exercised by this static review.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F148` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/admin/bill-terms/page-f8d4199a21976579.js`. Anchor: `term_desc:k.z.string()`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/admin/bill-terms/page-f8d4199a21976579.js`. Anchor: `"/savebillterms"`.

### Tailormate F149: Protect standard and deactivate custom terms

Source module: Bill terms. Evidence class: Code-defined.

Rows owned by user_id 0 have no edit or delete actions. Custom term removal confirms and saves term_id with is_active 0, then invalidates bill-term queries.

Original role context: Signed-in shop user with access to this module. The parent inventory covers navigation permission checks. Backend authorization and other accounts were not tested.

Verification gap: Code-defined. No persisted business action or successful server result was exercised by this static review.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F149` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/admin/bill-terms/page-f8d4199a21976579.js`. Anchor: `"0"===s.original.user_id?null:`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/admin/bill-terms/page-f8d4199a21976579.js`. Anchor: `is_active:"0",term_id:t`.

### Tailormate F182: Printed bill terms

Source module: Shop settings. Evidence class: Code-defined.

Customize terms on bill selects among three text clauses covering advance non-refund, no returns after sale, and no color guarantee with dry-cleaning advice. The page saves selected clause IDs as custom_bill_terms.

Original role context: Signed-in shop user; client permissions and selected-shop context apply

Verification gap: Code-defined. This source review did not execute the action, verify a persisted result, or test backend authorization. Parent browser observations provide separate screen context.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F182` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/settings/page-8e56f7911d5a369e.js`. Anchor: `label:"Customize terms on bill"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/settings/page-8e56f7911d5a369e.js`. Anchor: `Once confirmed, any advance amount paid`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/settings/page-8e56f7911d5a369e.js`. Anchor: `custom_bill_terms:e.custom_bill_terms?`.

### Tailormate F184: Invoice and order PDF templates

Source module: Shop settings. Evidence class: Code-defined.

Invoice Format and Order PDF Format load document-template sets for types 1 and 2. Pickers show each template thumbnail and name and save invoice_template_id and item_template_id.

Original role context: Signed-in shop user; client permissions and selected-shop context apply

Verification gap: Code-defined. This source review did not execute the action, verify a persisted result, or test backend authorization. Parent browser observations provide separate screen context.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F184` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/settings/page-8e56f7911d5a369e.js`. Anchor: `label:"Invoice Format"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/settings/page-8e56f7911d5a369e.js`. Anchor: `label:"Order PDF Format"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/settings/page-8e56f7911d5a369e.js`. Anchor: `get("/getdoctemplates",{params:{template_type_id:e}})`.

### NoolTech F085: Printable invoice page

Source module: Invoices. Evidence class: Code-defined.

Creates printable order invoice, opening a print window and falling back to window.print if popup fails.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F085` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/InvoicePage-BlA4Iwmd.js`. Anchor: `invoice-print-area`.

### NoolTech F086: Business branding and GST

Source module: Invoices. Evidence class: Code-defined.

Invoice derives shop name/address/contact, GST number/rates, tagline/footer/color; branded logo is gated.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F086` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/InvoicePage-BlA4Iwmd.js`. Anchor: `invoiceSettings`.

### NoolTech F087: Generate, download, resend invoice records

Source module: Invoices. Evidence class: Code-defined.

Order detail defines server invoice generation, PDF download, resend, and per-order invoice history.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F087` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/OrderDetailPage-B2ZYKSVH.js`. Anchor: `/api/invoices/${r}/resend`.

### NoolTech F088: Share invoice PDF with native share fallback

Source module: Invoices. Evidence class: Code-defined.

Generates then downloads PDF, uses navigator.share when files are supported, otherwise falls back to download.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F088` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/OrderDetailPage-B2ZYKSVH.js`. Anchor: `R.canShare`.

### NoolTech F089: Invoice prompt after status completion

Source module: Invoices. Evidence class: Code-defined.

Order completion/ready status can route to an invoice-share prompt using query/state information.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F089` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/EditOrderPage-BEwyP7Ug.js`. Anchor: `const t=(p==="delivered"||p==="completed")`.

## REQ-PRODUCTION: Item stages, assignments, and production board

Target behavior and acceptance: [REQ-PRODUCTION](../product/requirements.md#req-production-item-stages-assignments-and-production-board).

### Tailorman F062: Garment assignment and execution controls

Source module: Tailoring bills. Evidence class: Code-defined.

Admin/cashier assigns an active cutter/stitcher or admin to a line. Cutter/admin starts and completes cutting. Stitcher/admin starts and completes stitching. Admin/cashier can move completed stitching through available finishing states and deliver a Ready line.

Original role context: admin, cashier, cutter, stitcher

Verification gap: Code-defined. This row does not establish a successful business write or server-side enforcement.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F062` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/bill.js`. Anchor: `function itemCard(it, idx)`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/bill.js`. Anchor: `function openAssignDialog(itemId, kind)`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/db.js`. Anchor: `export async function assignItem(billId, itemId, role, employeeId, employeeName)`.

### Tailorman F063: Garment timeline and worker-paid indicators

Source module: Tailoring bills. Evidence class: Code-defined.

Line cards show chronological stage, time, actor name, progress percentage, assigned worker names, and a Paid marker when the line/worker-role key occurs in wage payments.

Original role context: admin, cashier, cutter, stitcher

Verification gap: Code-defined. This row does not establish a successful business write or server-side enforcement.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F063` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/bill.js`. Anchor: `const timelineHtml = (it.timeline || []).map`.

### Tailorman F077: Detailed production state model

Source module: Production. Evidence class: Code-defined.

Defines Material Received, Measurement Taken, Cutting Assigned, Cutting Started, Cutting Completed, Stitching Assigned, Stitching Started, Stitching Completed, Ironing, QC Check, Ready, and Delivered. Advancing an item appends timeline data and derives whole-bill delivered/ready/inProgress status.

Original role context: admin, cashier, cutter, stitcher

Verification gap: Code-defined. This row does not establish a successful business write or server-side enforcement.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F077` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/db.js`. Anchor: `export const STAGES = [`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/db.js`. Anchor: `export async function advanceItemStage(billId, itemId, newStage, extras = {})`.

### Tailorman F078: Configurable finishing workflow

Source module: Production. Evidence class: Code-defined.

Settings may skip Ironing, QC Check, or both. Bill detail offers every available finishing stage ahead of a completed-stitching line, permitting direct Ready. Board hides skipped columns only when no existing item occupies them.

Original role context: admin configures; admin/cashier execute

Verification gap: Code-defined. This row does not establish a successful business write or server-side enforcement.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F078` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/bill.js`. Anchor: `function finishingActions(it)`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/db.js`. Anchor: `export const OPTIONAL_STAGES = ["Ironing", "QC Check"];`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/production.js`. Anchor: `const occupied = new Set(allItems.map`.

### Tailorman F079: Admin production kanban

Source module: Production. Evidence class: Code-defined.

Plan-gated admin board groups garments into Intake, Cutting, Stitching, Ironing, QC Check, Ready, and Delivered Today. Loads up to 500 active bills and 200 recent bills from two days, merging by ID.

Original role context: admin

Verification gap: Code-defined. This row does not establish a successful business write or server-side enforcement.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F079` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/production.js`. Anchor: `const COLUMNS = [`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/production.js`. Anchor: `async function loadData()`.

### Tailorman F080: Production KPIs

Source module: Production. Evidence class: Code-defined.

Counts active item rows, overdue rows, due-today rows, Ready rows, and items delivered today. These KPI counts are line entries, unlike dashboard funnel quantities.

Original role context: admin

Verification gap: Code-defined. This row does not establish a successful business write or server-side enforcement.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F080` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/production.js`. Anchor: `function renderKpis()`.

### Tailorman F081: Urgency and employee filters

Source module: Production. Evidence class: Code-defined.

Filters board and bill list by All, Overdue, Due Today, within two days, or Comfortable and by assigned cutter/stitcher. Board sorts each bucket by promised date. Cards show garment quantity, bill/customer, assignee, color, date, urgency, and Express badge.

Original role context: admin

Verification gap: Code-defined. This row does not establish a successful business write or server-side enforcement.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F081` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/production.js`. Anchor: `function renderUrgencyFilter()`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/production.js`. Anchor: `function renderEmployeeFilter()`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/production.js`. Anchor: `function renderBoard()`.

### Tailorman F082: Drag-and-drop and one-tap progression

Source module: Production. Evidence class: Code-defined.

SortableJS moves garments between board columns, while an arrow advances to the next available column for phone users. Intake is not a drop target and delivered cards cannot be dragged out. Moving backward asks for confirmation. Target columns map to started/finishing stages.

Original role context: admin

Verification gap: Code-defined. This row does not establish a successful business write or server-side enforcement.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F082` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/production.js`. Anchor: `async function handleDrop(evt)`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/production.js`. Anchor: `async function onTapAdvance(btn)`.

### Tailorman F083: Final-item delivery balance flow

Source module: Production. Evidence class: Code-defined.

When moving the final remaining item to Delivered, board actions route through the whole-bill delivery sheet so payment and unfinished-item warnings apply. One-tap stage changes offer snapshot undo.

Original role context: admin

Verification gap: Code-defined. This row does not establish a successful business write or server-side enforcement.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F083` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/production.js`. Anchor: `function completesBillDelivery(bill, itemId, targetStage)`.

### Tailorman F084: Bill-level production details

Source module: Production. Evidence class: Code-defined.

An expandable list below the board shows derived status, bill/customer/mobile, delivery, balance, stage counts, line progress, notes, and worker assignment. The list prioritizes Express bills before urgency sorting.

Original role context: admin

Verification gap: Code-defined. This row does not establish a successful business write or server-side enforcement.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F084` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/production.js`. Anchor: `function getFilteredBills()`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/production.js`. Anchor: `function itemsDetailHtml(b)`.

### Tailorman F085: Manual and timed refresh

Source module: Production. Evidence class: Code-defined.

Refresh reloads board data and updates last-updated time. Optional auto-refresh runs every 60 seconds. Cache-first active-bill data can repaint when a fresh server result differs.

Original role context: admin

Verification gap: Code-defined. This row does not establish a successful business write or server-side enforcement.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F085` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/production.js`. Anchor: `document.getElementById("autoRefresh").addEventListener`.

### Tailorman F086: Role-specific work queue

Source module: Assignments. Evidence class: Code-defined.

Cutter/stitcher sees items assigned to their user, while admin can view active assigned items. Active tab selects assigned/started stages for that role. Done Today uses a matching completion event from the timeline.

Original role context: admin, cutter, stitcher

Verification gap: Code-defined. The Done Today branch chooses no completedStage for admin, so its exact admin behavior differs from worker tabs.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F086` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/assignments.js`. Anchor: `function render()`.

### Tailorman F087: Worker start and completion

Source module: Assignments. Evidence class: Code-defined.

Cutter can Start Cutting then Mark Done; stitcher can Start Stitching then Mark Done. Actions advance stage, show a result, and refresh the queue. A bill link opens garment details and measurements.

Original role context: cutter, stitcher

Verification gap: Code-defined. This row does not establish a successful business write or server-side enforcement.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F087` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/assignments.js`. Anchor: `node.querySelectorAll("button[data-action]")`.

### Tailorman F210: Optional Ironing and QC workflow stages

Source module: Shop settings. Evidence class: Code-defined.

Admin can turn tracking of Ironing and QC Check on or off. The saved skippedStages list is restricted to those two names, and active-stage helpers omit them without changing the underlying canonical stage order.

Original role context: Admin

Verification gap: Defined in captured client code. No successful authenticated action or server authorization behavior was tested for this entry.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F210` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/settings.js`. Anchor: `function bindWorkflowForm()`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/db.js`. Anchor: `export const OPTIONAL_STAGES = ["Ironing", "QC Check"];`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/db.js`. Anchor: `export function activeStages(skippedStages = [])`.

### NoolTech F074: Worker assignment with task and notes

Source module: Order details. Evidence class: Code-defined.

Assigns an active worker, role, and instructions to an order; supports adding a new worker in the same dialog.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F074` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/OrderDetailPage-B2ZYKSVH.js`. Anchor: `workerId:q,role:hr,notes:ur`.

### NoolTech F092: Simple status mode

Source module: Production. Evidence class: Code-defined.

Basic production mode shows pending/in-progress/completed grouping when visualKanban/productionWorkflow is unavailable but simpleOrderStatus is present.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F092` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/ProductionWorkflowPage-CPWTD8cT.js`. Anchor: `C("simpleOrderStatus")`.

### NoolTech F093: Seven-stage production board

Source module: Production. Evidence class: Code-defined.

Board uses New Orders, Measuring, Cutting, Stitching, Quality Check, Ready for Pickup, and Completed stages.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F093` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/ProductionWorkflowPage-CPWTD8cT.js`. Anchor: `stage:"quality_check"`.

### NoolTech F094: Drag-and-drop stage updates

Source module: Production. Evidence class: Code-defined.

Stage movement calls updateStage; advanced Kanban implementation imports drag/drop support.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F094` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/index-Dk-7hFgw.js`. Anchor: `async updateStage`.

### NoolTech F095: Search and delivery-priority indicators

Source module: Production. Evidence class: Code-defined.

Board filters name/order number and highlights urgent, overdue, today/tomorrow, or days remaining.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F095` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/index-Dk-7hFgw.js`. Anchor: `overdueByDays:"Overdue by {{count}} days"`.

### NoolTech F096: Bulk move selected orders

Source module: Production. Evidence class: Code-defined.

Bulk stage updates submit updates array to the Kanban bulk-update endpoint and report per-order failures.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F096` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/index-Dk-7hFgw.js`. Anchor: `/api/orders/kanban/bulk-update`.

### NoolTech F097: Bulk worker assignment

Source module: Production. Evidence class: Code-defined.

Assigns a chosen worker/task to selected orders and reports successful and failed counts.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F097` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/index-Dk-7hFgw.js`. Anchor: `assignWorkerToOrders:"Assign Worker to {{count}} Orders"`.

### NoolTech F098: Worker assignments and removal

Source module: Production. Evidence class: Code-defined.

Production drawer lists assignment status and removes an assignment by order and assignment ID. Removal controls disappear for completed/delivered work.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F098` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/ProductionWorkflowPage-CPWTD8cT.js`. Anchor: `t.status!=="completed"&&t.status!=="delivered"`.

### NoolTech F099: My work filter

Source module: Production. Evidence class: Code-defined.

Board has everyone/my-work view based on signed-in worker identity.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F099` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/ProductionWorkflowPage-CPWTD8cT.js`. Anchor: `My work`.

### NoolTech F100: Production CSV export

Source module: Production. Evidence class: Code-defined.

Selected orders can export order number, customer, delivery date, and total to CSV.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F100` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/ProductionWorkflowPage-CPWTD8cT.js`. Anchor: `Order Number`.

## REQ-TASK: Task planning, duration, execution, and cost allocation

Target behavior and acceptance: [REQ-TASK](../product/requirements.md#req-task-task-planning-duration-execution-and-cost-allocation).

### Tailormate F066: Garment expense allocation

Source module: Garment costs and task planning. Evidence class: Code-defined.

Add Expenses loads expense heads and the garment existing expenses. It supports adding rows, selecting a head and amount, and deleting only newly entered rows. Duplicate heads are rejected. Save sends active dress-expense records with garment ID and expense-head ID.

Original role context: Signed-in shop user with relevant page access; server authorization unverified.

Verification gap: Code-defined. This source review did not observe a successful write, populated record, payment, message, or server-side permission check.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F066` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/orders/%5Btype%5D/%5BorderId%5D/page-b6d17c0c752aa831.js`. Anchor: `"/saveorderdressexpenses"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/orders/%5Btype%5D/%5BorderId%5D/page-b6d17c0c752aa831.js`. Anchor: `message:"No duplicates allowed."`.

### Tailormate F067: Garment expense and profit preview

Source module: Garment costs and task planning. Evidence class: Code-defined.

The expense dialog sums entered amounts, shows item price, and displays Profit as the garment price minus those expenses, colored by whether it is nonnegative. It is a local item-cost preview rather than a complete profit statement.

Original role context: Signed-in shop user with relevant page access; server authorization unverified.

Verification gap: Code-defined. This source review did not observe a successful write, populated record, payment, message, or server-side permission check.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F067` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/orders/%5Btype%5D/%5BorderId%5D/page-b6d17c0c752aa831.js`. Anchor: `z("Total Expense",E)`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/orders/%5Btype%5D/%5BorderId%5D/page-b6d17c0c752aa831.js`. Anchor: `z("Profit",O,`.

### Tailormate F068: Task selection and individual assignment

Source module: Garment costs and task planning. Evidence class: Code-defined.

The task planner loads tasks for a garment, lets the user select tasks and assign staff per task, stores task-day estimates, and requires at least one selected task when the task array is nonempty. It posts selected active flags and unselected inactive flags.

Original role context: Signed-in shop user with relevant page access; server authorization unverified.

Verification gap: Code-defined. This source review did not observe a successful write, populated record, payment, message, or server-side permission check.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F068` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/orders/%5Btype%5D/%5BorderId%5D/page-b6d17c0c752aa831.js`. Anchor: `message:"At least one task should be selected"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/orders/%5Btype%5D/%5BorderId%5D/page-b6d17c0c752aa831.js`. Anchor: `task_assigned_to_user_id:e.user_id`.

### Tailormate F069: Plan a completion and start date

Source module: Garment costs and task planning. Evidence class: Code-defined.

The planner requires expected completion date and constrains the date picker between today and garment delivery. It sums days from selected tasks and subtracts them from completion to estimate Work Start Date, showing days remaining or days late.

Original role context: Signed-in shop user with relevant page access; server authorization unverified.

Verification gap: Code-defined. This source review did not observe a successful write, populated record, payment, message, or server-side permission check.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F069` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/orders/%5Btype%5D/%5BorderId%5D/page-b6d17c0c752aa831.js`. Anchor: `children:"Work Start Date: "`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/orders/%5Btype%5D/%5BorderId%5D/page-b6d17c0c752aa831.js`. Anchor: `maxDate:v()(n.expected_delivery_date).toDate()`.

### Tailormate F070: Task-plan lock after work starts

Source module: Garment costs and task planning. Evidence class: Code-defined.

If any loaded task has progressed beyond Not Started, the planner displays a warning and disables selection, staff controls, and day editing. The save handler still serializes task_status_id 1 for its submitted task rows, so server preservation rules require verification.

Original role context: Signed-in shop user with relevant page access; server authorization unverified.

Verification gap: Code-defined. This source review did not observe a successful write, populated record, payment, message, or server-side permission check.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F070` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/orders/%5Btype%5D/%5BorderId%5D/page-b6d17c0c752aa831.js`. Anchor: `Work has been started, You can not change task items`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/orders/%5Btype%5D/%5BorderId%5D/page-b6d17c0c752aa831.js`. Anchor: `task_status_id:"1"`.

### Tailormate F071: Task queues and local search

Source module: Tasks. Evidence class: Code-defined.

Tasks has Active, Delayed, Due Today, Due Tomorrow, and Completed tabs. Data requests include current user and shop. Search filters the current tab by garment name or order number.

Original role context: Signed-in shop user with relevant page access; server authorization unverified.

Verification gap: Code-defined. This source review did not observe a successful write, populated record, payment, message, or server-side permission check.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F071` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/tasks/page-a5ff38db688f16f6.js`. Anchor: `value:"tomorrows_tasks"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/tasks/page-a5ff38db688f16f6.js`. Anchor: `placeholder:"Search by dress name or order no..."`.

### Tailormate F072: Task summary rows and progress timeline

Source module: Tasks. Evidence class: Code-defined.

Rows show item image, order number, customer, garment, status badge, expected completion date, and a compact timeline. Timeline scheduling works backwards from expected completion using task-day estimates, while progressed tasks show recorded update dates.

Original role context: Signed-in shop user with relevant page access; server authorization unverified.

Verification gap: Code-defined. This source review did not observe a successful write, populated record, payment, message, or server-side permission check.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F072` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/tasks/page-a5ff38db688f16f6.js`. Anchor: `header:"Expected completion date"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/4486-d9bf3552840a4976.js`. Anchor: `title:"".concat(i,"Completion")`.

### Tailormate F073: Task status model

Source module: Tasks. Evidence class: Code-defined.

Status badges distinguish Completed, On Time, and Delayed with delayed-day counts. Workflow IDs are Not Started 1, In Progress 2, and Completed 3. The detail timeline exposes only the first unfinished task for progression.

Original role context: Signed-in shop user with relevant page access; server authorization unverified.

Verification gap: Code-defined. This source review did not observe a successful write, populated record, payment, message, or server-side permission check.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F073` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/4486-d9bf3552840a4976.js`. Anchor: `NOT_STARTED="1"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/tasks/%5BorderDressId%5D/page-a3f0226c050ee292.js`. Anchor: `pendingCount:T`.

### Tailormate F074: Start a task

Source module: Tasks. Evidence class: Code-defined.

Starting sends dress_task_id, current worker ID, current ISO start time, status 2, and current update timestamp to saveorderdresstasks. Cache invalidation refreshes task queries.

Original role context: Signed-in shop user with relevant page access; server authorization unverified.

Verification gap: Code-defined. This source review did not observe a successful write, populated record, payment, message, or server-side permission check.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F074` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/tasks/%5BorderDressId%5D/page-a3f0226c050ee292.js`. Anchor: `task_start_by_user_id:null==d?void 0:d.user_id`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/4486-d9bf3552840a4976.js`. Anchor: `"/saveorderdresstasks"`.

### Tailormate F075: Finish a task with comments

Source module: Tasks. Evidence class: Code-defined.

Finish opens a comments modal. Saving records finish comments, current worker ID, end timestamp, status 3, and update timestamp. The completed timeline can expand to show start actor, end actor, and comments.

Original role context: Signed-in shop user with relevant page access; server authorization unverified.

Verification gap: Code-defined. This source review did not observe a successful write, populated record, payment, message, or server-side permission check.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F075` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/tasks/%5BorderDressId%5D/page-a3f0226c050ee292.js`. Anchor: `children:"Finish comments"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/tasks/%5BorderDressId%5D/page-a3f0226c050ee292.js`. Anchor: `task_end_comments:null!==(t=`.

### Tailormate F076: Cancel a task start

Source module: Tasks. Evidence class: Code-defined.

Cancel on the active task resets its start time to the zero-date sentinel, status to 1, and status-update date to now. It does not delete the task.

Original role context: Signed-in shop user with relevant page access; server authorization unverified.

Verification gap: Code-defined. This source review did not observe a successful write, populated record, payment, message, or server-side permission check.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F076` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/tasks/%5BorderDressId%5D/page-a3f0226c050ee292.js`. Anchor: `task_start_time:f.Rt,task_status_id:"1"`.

### Tailormate F077: Task detail depends on list cache

Source module: Tasks. Evidence class: Code-defined.

The task detail query loads by order_dress_id, but its header row is retrieved from cached task-list data. It returns null when that row is unavailable. The cache helper includes active, completed, past-due and today lists, but omits tomorrow-only rows.

Original role context: Signed-in shop user with relevant page access; server authorization unverified.

Verification gap: Static reconstruction caveat. A browser direct reload or tomorrow-only task path was not exercised with real data.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F077` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/tasks/%5BorderDressId%5D/page-a3f0226c050ee292.js`. Anchor: `if(!O)return null`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/4486-d9bf3552840a4976.js`. Anchor: `y.todays_tasks`.

### Tailormate F134: Task master and duration

Source module: Administration tasks. Evidence class: Code-defined.

Define common jobs such as cutting or embroidery with name and days required. Names require three characters and days a nonempty string. Create/edit use shop_task_id as applicable; confirmed removal submits inactive state through the task helper.

Original role context: Signed-in shop user with access to this module. The parent inventory covers navigation permission checks. Backend authorization and other accounts were not tested.

Verification gap: Code-defined. No persisted business action or successful server result was exercised by this static review.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F134` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/admin/tasks/page-b00259c84aed8d14.js`. Anchor: `message:"Task name must be at least 3 characters."`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/admin/tasks/page-b00259c84aed8d14.js`. Anchor: `task_days:j.z.string().min(1,"Required")`.

### Tailormate F135: Task order callback

Source module: Administration tasks. Evidence class: Code-defined.

Task data is sorted by integer sort_order. A table reorder callback maps rows to shop_task_id, sort_order starting at 1, and user_id and sends the array to a mutation. The draggable state starts false and no enabling control was found in this component.

Original role context: Signed-in shop user with access to this module. The parent inventory covers navigation permission checks. Backend authorization and other accounts were not tested.

Verification gap: Code-defined callback only. Normal UI reachability of task dragging is unresolved because the inspected draggable flag starts false and no enabling action was observed.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F135` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/admin/tasks/page-b00259c84aed8d14.js`. Anchor: `sort_order:(t+1).toString(),user_id:e.user_id`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/admin/tasks/page-b00259c84aed8d14.js`. Anchor: `draggable:j`.

## REQ-CALENDAR: Workload, trials, quantity delivery, and capacity

Target behavior and acceptance: [REQ-CALENDAR](../product/requirements.md#req-calendar-workload-trials-quantity-delivery-and-capacity).

### Tailorman F072: Whole-bill Ready or Delivered confirmation

Source module: Order status and delivery. Evidence class: Code-defined.

Detail/list/delivery screens share a status dialog that warns about garments not yet stitched for Ready or not yet Ready for delivery. Confirming can move those items directly to the selected status. Marking a whole bill synchronizes eligible line stages and records actor/time.

Original role context: admin, cashier

Verification gap: Code-defined. This row does not establish a successful business write or server-side enforcement.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F072` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/bill-status.js`. Anchor: `export async function changeBillStatus(bill, status, opts = {})`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/db.js`. Anchor: `export async function setBillStatus(billId, status)`.

### Tailorman F074: Undo status with payment retained

Source module: Order status and delivery. Evidence class: Code-defined.

A success toast offers Undo using a pre-change status/items snapshot. Undo restores workflow state and clears deliveredAt when appropriate. A payment recorded during delivery is intentionally kept, with an explicit message.

Original role context: admin, cashier

Verification gap: Code-defined. This row does not establish a successful business write or server-side enforcement.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F074` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/bill-status.js`. Anchor: `Status reverted — the payment was kept.`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/db.js`. Anchor: `export async function restoreBillSnapshot(billId, snapshot)`.

### Tailorman F076: Bulk Ready and Delivered

Source module: Order status and delivery. Evidence class: Code-defined.

Bills register and delivery schedule allow selecting bills, seeing summed outstanding balance, and confirming bulk Ready/Delivered. Warns about incomplete garments and unpaid totals. Runs four bill updates concurrently, reports partial failures, and offers snapshot undo. Bulk mode never collects payment.

Original role context: admin, cashier

Verification gap: Code-defined. This row does not establish a successful business write or server-side enforcement.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F076` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/bill-status.js`. Anchor: `export async function changeBillStatusBulk(bills, status, opts = {})`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/db.js`. Anchor: `export async function bulkSetBillStatus(billIds, status, onProgress)`.

### Tailorman F088: Date-grouped delivery window

Source module: Delivery schedule. Evidence class: Code-defined.

Admin/cashier chooses 7, 14, or 30 days ahead, default 14, with active pending/inProgress/ready orders also included from the preceding 30 days. Rows group by promised date with Today/Overdue labels.

Original role context: admin, cashier

Verification gap: Code-defined. This row does not establish a successful business write or server-side enforcement.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F088` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/deliveries.js`. Anchor: `async function load()`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/deliveries.js`. Anchor: `function render(bills, now, future)`.

### Tailorman F089: Daily capacity indicator

Source module: Delivery schedule. Evidence class: Code-defined.

Each date group displays order count and a load bar against a fixed capacity of five bills. Colors change at three and five bills. It is a display indicator, with no booking-capacity enforcement in this module.

Original role context: admin, cashier

Verification gap: Code-defined. This row does not establish a successful business write or server-side enforcement.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F089` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/deliveries.js`. Anchor: `const CAPACITY = 5;`.

### Tailorman F090: Delivery-day actions

Source module: Delivery schedule. Evidence class: Code-defined.

Rows show bill/customer, Express marker, derived status, total, paid/balance, and quick Ready/Delivered actions. Individual and selected bulk actions use the shared status/payment/undo behavior.

Original role context: admin, cashier

Verification gap: Code-defined. This row does not establish a successful business write or server-side enforcement.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F090` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/deliveries.js`. Anchor: `function bindRowActions()`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/deliveries.js`. Anchor: `function renderSelectionBar()`.

### Tailormate F029: Delivery date and half-hour time choices

Source module: Stitching order entry. Evidence class: Code-defined.

Delivery date is required. Delivery time defaults to 17:00:00, and the time list contains 48 half-hour values across a day. Both delivery_date and expected_delivery_date are composed from the same selected date and optional time.

Original role context: Signed-in shop user with relevant page access; server authorization unverified.

Verification gap: Code-defined. This source review did not observe a successful write, populated record, payment, message, or server-side permission check.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F029` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/9491-bcd4f8939976b832.js`. Anchor: `length:48`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/9491-bcd4f8939976b832.js`. Anchor: `deliveryTime:null!==(e=t.deliveryTime)&&void 0!==e?e:"17:00:00"`.

### Tailormate F030: Function date and multiple trials

Source module: Stitching order entry. Evidence class: Code-defined.

An optional function date and repeatable trial-date/time rows are offered. Add Trial defaults a new row to 11:00:00. Only the first three trials are serialized as trial_date, trial_date2, and trial_date3; missing dates use a zero-date sentinel.

Original role context: Signed-in shop user with relevant page access; server authorization unverified.

Verification gap: Code-defined. This source review did not observe a successful write, populated record, payment, message, or server-side permission check.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F030` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/9491-bcd4f8939976b832.js`. Anchor: `children:"Add Trial"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/9491-bcd4f8939976b832.js`. Anchor: `trial_date3:`.

### Tailormate F040: Upcoming deliveries or trials

Source module: Order lists and search. Evidence class: Code-defined.

Upcoming Orders offers Deliveries and Trials modes. They map to upcoming and trial_date query tabs respectively.

Original role context: Signed-in shop user with relevant page access; server authorization unverified.

Verification gap: Code-defined. This source review did not observe a successful write, populated record, payment, message, or server-side permission check.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F040` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/orders/%5Btype%5D/page-bb03120fbc2dca9c.js`. Anchor: `label:"Trials",value:"trial_date"`.

### Tailormate F078: Four-month delivery workload view

Source module: Work calendar. Evidence class: Code-defined.

The calendar covers the current month and the next three months. Users switch through month buttons or previous/next controls within that fixed range. It lays out Sunday-first week rows and overlays loaded delivery counts and server-provided colors.

Original role context: Signed-in shop user with relevant page access; server authorization unverified.

Verification gap: Code-defined. This source review did not observe a successful write, populated record, payment, message, or server-side permission check.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F078` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/work-calendar/page-bb46a4fa83aa9a2f.js`. Anchor: `length:4`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/work-calendar/page-bb46a4fa83aa9a2f.js`. Anchor: `children:"Shop's Upcoming Delivery"`.

### Tailormate F079: Delivery-day drill-down

Source module: Work calendar. Evidence class: Code-defined.

A day with a positive number_of_orders links to advanced order search with delivery start and end both set to that date. Empty days are plain calendar cells.

Original role context: Signed-in shop user with relevant page access; server authorization unverified.

Verification gap: Code-defined. This source review did not observe a successful write, populated record, payment, message, or server-side permission check.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F079` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/work-calendar/page-bb46a4fa83aa9a2f.js`. Anchor: `"/orders/advance-search-list?mobile=&orderStartDate=&orderEndDate=&deliveryStartDate="`.

### Tailormate F080: Monthly workload summaries

Source module: Work calendar. Evidence class: Code-defined.

Show Total Orders, Avg Orders / Day to one decimal, Busiest Day, and Max Orders / Day from the selected month response.

Original role context: Signed-in shop user with relevant page access; server authorization unverified.

Verification gap: Code-defined. This source review did not observe a successful write, populated record, payment, message, or server-side permission check.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F080` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/work-calendar/page-bb46a4fa83aa9a2f.js`. Anchor: `text:"Avg Orders / Day"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/work-calendar/page-bb46a4fa83aa9a2f.js`. Anchor: `text:"Max Orders / Day"`.

### Tailormate F081: Editable workload color ranges

Source module: Work calendar. Evidence class: Code-defined.

Calendar settings are per shop. A modal edits From, To, and color rows, can append or remove ranges while keeping at least one, and posts work_calendar_settings. The last legend range displays start+. The captured schema checks nonempty strings, not numeric ordering, overlap, or range gaps.

Original role context: Signed-in shop user with relevant page access; server authorization unverified.

Verification gap: Code-defined. This source review did not observe a successful write, populated record, payment, message, or server-side permission check.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F081` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/work-calendar/page-bb46a4fa83aa9a2f.js`. Anchor: `message:"Add at least one range"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/work-calendar/page-bb46a4fa83aa9a2f.js`. Anchor: `work_calendar_settings:e.ranges`.

### NoolTech F069: Record partial item delivery

Source module: Order details. Evidence class: Code-defined.

Delivery dialog records increments per item and submits cumulative deliveredQty values for selected items.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F069` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/OrderDetailPage-B2ZYKSVH.js`. Anchor: `deliveredQty:(n.items[c].deliveredQty||0)+d`.

### NoolTech F090: Month/week calendar and delivery totals

Source module: Delivery calendar. Evidence class: Code-defined.

Fetches delivery records for visible start/end date range and delivery stats; UI includes today, this-week, and overdue summaries.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F090` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/DeliveryCalendarPage-eA3j1aGz.js`. Anchor: `getOrdersForCalendar`.

### NoolTech F091: Calendar day details

Source module: Delivery calendar. Evidence class: Code-defined.

Calendar supports date selection, daily order list, month/week switch, and opening order details.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F091` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/index-Dk-7hFgw.js`. Anchor: `noDeliveries:"No deliveries scheduled for this date"`.

## REQ-ALTER: Standalone alterations and rework

Target behavior and acceptance: [REQ-ALTER](../product/requirements.md#req-alter-standalone-alterations-and-rework).

### Tailorman F091: Alteration register and statuses

Source module: Alterations. Evidence class: Code-defined.

Admin/cashier sees up to 200 newest alterations, searchable by name or phone substring, with All and Pending/In Progress/Done/Delivered tabs and counts. Desktop table and phone cards show description, price/balance, and due date.

Original role context: admin, cashier

Verification gap: Code-defined. This row does not establish a successful business write or server-side enforcement.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F091` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/alterations.js`. Anchor: `async function load()`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/alterations.js`. Anchor: `function searched()`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/db.js`. Anchor: `export const ALTERATION_STATUSES = ["Pending", "In Progress", "Done", "Delivered"];`.

### Tailorman F092: Create and edit alteration

Source module: Alterations. Evidence class: Code-defined.

Saves customer name/mobile, optional linked customerId, free-text item type, required description, price, paid amount, due date, chosen status, and notes. Rejects paid amount above price. Defaults to Pending and honors another valid selected status on create.

Original role context: admin, cashier

Verification gap: Code-defined. This row does not establish a successful business write or server-side enforcement.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F092` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/alterations.js`. Anchor: `async function onSave()`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/db.js`. Anchor: `export async function createAlteration(data)`.

### Tailorman F093: Saved-customer lookup and walk-ins

Source module: Alterations. Evidence class: Code-defined.

Name/mobile inputs suggest up to eight saved matches from a one-time 500-customer load. Choosing one fills both fields and stores customerId; typing afterward clears the link. Walk-ins can remain unlinked. A customerId URL opens a linked prefilled form.

Original role context: admin, cashier

Verification gap: Code-defined. This row does not establish a successful business write or server-side enforcement.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F093` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/alterations.js`. Anchor: `function bindCustomerLookup()`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/alterations.js`. Anchor: `async function openForCustomerFromUrl()`.

### Tailorman F094: Soft deletion

Source module: Alterations. Evidence class: Code-defined.

Confirmed deletion marks the alteration deleted and starts ledger synchronization. It leaves normal lists while preserving the document.

Original role context: admin, cashier

Verification gap: Code-defined. This row does not establish a successful business write or server-side enforcement.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F094` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/alterations.js`. Anchor: `async function onDelete(item, btn)`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/db.js`. Anchor: `export async function deleteAlteration(id)`.

### Tailorman F095: Running-payment ledger sync

Source module: Alterations. Evidence class: Code-defined.

Maintains one income entry keyed by alteration ID with the current paid total, cash mode, customer, description, and original createdAt. Editing paid amount replaces that running total; setting zero or deleting zeroes/removes the income entry.

Original role context: admin, cashier

Verification gap: Code-defined. Alteration save and ledger sync are separate operations and synchronization errors only log warnings. The form does not record individual payment events.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F095` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/db.js`. Anchor: `async function syncAlterationLedger(id)`.

### NoolTech F073: Reopen for alteration

Source module: Order details. Evidence class: Code-defined.

Sets status to in-progress with optional new delivery date; UI describes returning an item for adjustment.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F073` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/OrderDetailPage-B2ZYKSVH.js`. Anchor: `z.update(p,{status:"in-progress"`.

## REQ-JOB: Workshop job cards and visual construction sheets

Target behavior and acceptance: [REQ-JOB](../product/requirements.md#req-job-workshop-job-cards-and-visual-construction-sheets).

### Tailorman F229: Authenticated garment reference sheet

Source module: Workshop job cards. Evidence class: Code-defined.

Any authenticated shop role can open a job card by bill ID. It reads the bill from the signed-in tenant context, shows bill number, customer name and phone, delivery date, express flag, notes and a bottleneck progress stepper. A missing ID or bill produces an error screen.

Original role context: Admin; cashier; cutter; stitcher

Verification gap: No authenticated job card was loaded. The URL tid is parsed but unused; the data helper uses the current signed-in tenant. Backend bill read permissions remain unverified.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F229` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/job-card.js`. Anchor: `const { user } = await requireAuth();`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/job-card.js`. Anchor: `const bill = await getBill(urlId);`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/job-card.js`. Anchor: `function render(bill, measCache)`.

### Tailorman F230: Garment instructions, measurements and images

Source module: Workshop job cards. Evidence class: Code-defined.

Each job-card item shows type, quantity, fabric color, instructions, assigned cutter and stitcher, detailed stage and progress percentage. Linked current measurement fields include units, member name and notes. Material photos and bill inspiration images open as full images. Price and payment fields are not rendered in the inspected page.

Original role context: Admin; cashier; cutter; stitcher

Verification gap: The page reads current measurement profiles by ID, not an independent historical snapshot. It performs one load and has no stage-advance controls in the captured module.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F230` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/job-card.js`. Anchor: `function renderItem(it, idx, measCache)`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/job-card.js`. Anchor: `const m = measCache.find((x) => x.id === it.measurementId);`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/job-card.js`. Anchor: `const imgs = bill.inspirationImages || [];`.

### NoolTech F101: Per-order-item job sheet

Source module: Job sheets. Evidence class: Code-defined.

Loads a job sheet by order and item ID for visual and technical editing.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F101` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/JobSheetModal-M_LEzfii.js`. Anchor: `/api/job-sheets/${$t}/items/${Ct}`.

### NoolTech F102: Garment construction configurator

Source module: Job sheets. Evidence class: Code-defined.

Visual configurations cover shirt, trouser, suit, blouse, tshirt, hoodie, kurti, lehenga, salwar, anarkali, gown, skirt, sharara, palazzo, kurta, pathani, sherwani, waistcoat, blazer, jeans, and chinos.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F102` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/JobSheetModal-M_LEzfii.js`. Anchor: `shirt:{tabs:`.

### NoolTech F103: Fabric appearance and garment components

Source module: Job sheets. Evidence class: Code-defined.

Configurator defines fabric colours/textures and garment-dependent collars, cuffs, pockets, back, vents, buttons, sleeves, fit, waist, flare, hems, and silhouettes.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F103` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/JobSheetModal-M_LEzfii.js`. Anchor: `Premium Linen`.

### NoolTech F104: Measurement snapshot and derived hints

Source module: Job sheets. Evidence class: Code-defined.

Loads stored measurement snapshot. Trouser hints derive rise from outseam minus inseam and estimate knee from thigh/bottom where data exists.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F104` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/JobSheetModal-M_LEzfii.js`. Anchor: `measurementsSnapshot`.

### NoolTech F105: Persist technical notes and material checklist

Source module: Job sheets. Evidence class: Code-defined.

Saves designConfig, garmentType, technicalNotes, component list, and changed positive dimensions as measurementsUpdate.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F105` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/JobSheetModal-M_LEzfii.js`. Anchor: `measurementsUpdate:et`.

### NoolTech F106: Completed job-sheet restriction

Source module: Job sheets. Evidence class: Code-defined.

Job sheet suppresses fetch/edit when orderStatus is completed or delivered.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F106` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/JobSheetModal-M_LEzfii.js`. Anchor: `Gt=St==="completed"||St==="delivered"`.

## REQ-GALLERY: Design gallery and reusable media

Target behavior and acceptance: [REQ-GALLERY](../product/requirements.md#req-gallery-design-gallery-and-reusable-media).

### Tailormate F082: Folder browse and search

Source module: Gallery. Evidence class: Code-defined.

Gallery loads user folders, shows cover-image tiles or a fallback image, and filters folder_name case-insensitively. Opening a tile goes to gallery/images with folder ID and name.

Original role context: Signed-in shop user with relevant page access; server authorization unverified.

Verification gap: Code-defined. This source review did not observe a successful write, populated record, payment, message, or server-side permission check.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F082` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/gallery/page-1e4b6c7f62136ea1.js`. Anchor: `"/getfolders"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/gallery/page-1e4b6c7f62136ea1.js`. Anchor: `pathname:"/gallery/images"`.

### Tailormate F083: Folder creation, rename, and deactivation

Source module: Gallery. Evidence class: Code-defined.

EDIT_GALLERY exposes Add folder, edit, and delete controls. Create and update attach current user ID. Delete confirmation calls updatefolder with status_id 0. Folder-name schema only requires a string, without a minimum length.

Original role context: Signed-in shop user with relevant page access; server authorization unverified.

Verification gap: Code-defined. This source review did not observe a successful write, populated record, payment, message, or server-side permission check.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F083` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/gallery/page-1e4b6c7f62136ea1.js`. Anchor: `folder_name:K.z.string()`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/gallery/page-1e4b6c7f62136ea1.js`. Anchor: `N=h("EDIT_GALLERY")`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/gallery/page-1e4b6c7f62136ea1.js`. Anchor: `folder_id:r,status_id:"0"`.

### Tailormate F084: Folder image browse and image-name search

Source module: Gallery. Evidence class: Code-defined.

The image page reads folder_id and folder_name query values, requests gallery images for that folder, displays thumbnails and names, and filters loaded image_name values locally.

Original role context: Signed-in shop user with relevant page access; server authorization unverified.

Verification gap: Code-defined. This source review did not observe a successful write, populated record, payment, message, or server-side permission check.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F084` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/gallery/images/page-86dd6d9a433a3664.js`. Anchor: `"/getgalleryimages"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/gallery/images/page-86dd6d9a433a3664.js`. Anchor: `placeholder:"Search image..."`.

### Tailormate F085: Favorite-image collection

Source module: Gallery. Evidence class: Code-defined.

Folder ID 0 selects the current user favorite-image endpoint. Any displayed image has a heart control that toggles is_favorite between string 1 and 0 through updategalleryimage. The favorite button is not nested under the EDIT_GALLERY condition.

Original role context: Signed-in shop user with relevant page access; server authorization unverified.

Verification gap: Code-defined. This source review did not observe a successful write, populated record, payment, message, or server-side permission check.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F085` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/gallery/images/page-86dd6d9a433a3664.js`. Anchor: `"/getfavotitegalleryimages"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/gallery/images/page-86dd6d9a433a3664.js`. Anchor: `is_favorite:(null==t?void 0:t.is_favorite)==="1"?"0":"1"`.

### Tailormate F086: Upload and name a gallery image

Source module: Gallery. Evidence class: Code-defined.

EDIT_GALLERY exposes Add images. The dialog accepts an optional image name and image uploader, generates uploaded-file metadata, and posts the first file ID with folder_id and the gallery image type.

Original role context: Signed-in shop user with relevant page access; server authorization unverified.

Verification gap: Code-defined. This source review did not observe a successful write, populated record, payment, message, or server-side permission check.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F086` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/gallery/images/page-86dd6d9a433a3664.js`. Anchor: `children:"Add image"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/gallery/images/page-86dd6d9a433a3664.js`. Anchor: `file_id:null==i?void 0:null===(t=i[0])`.

### Tailormate F087: Image deactivation and preview carousel

Source module: Gallery. Evidence class: Code-defined.

EDIT_GALLERY exposes delete confirmation, which posts gallery_id and status_id 0. Clicking a thumbnail opens the shared preview carousel at that image; previous/next controls and arrow keys navigate the loaded images.

Original role context: Signed-in shop user with relevant page access; server authorization unverified.

Verification gap: Code-defined. This source review did not observe a successful write, populated record, payment, message, or server-side permission check.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F087` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/gallery/images/page-86dd6d9a433a3664.js`. Anchor: `gallery_id:e,status_id:"0"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/gallery/images/page-86dd6d9a433a3664.js`. Anchor: `selectedImageIndex:A`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/gallery/images/page-86dd6d9a433a3664.js`. Anchor: `"ArrowLeft"===e.key`.

## REQ-PRODUCT: Retail catalog and stock master

Target behavior and acceptance: [REQ-PRODUCT](../product/requirements.md#req-product-retail-catalog-and-stock-master).

### Tailorman F102: Sellable item master

Source module: Boutique inventory and purchasing. Evidence class: Code-defined.

Create or edit name, category, unit, SKU, size, color, supplier, notes, low-stock threshold, cost price, and selling price. Name is required. New-item creation checks boutiqueItemLimit; edits preserve the current stock quantity and can add stock separately.

Original role context: Admin and cashier, boutiqueSales entitlement

Verification gap: Code-defined. No authenticated execution or persisted result was observed in this source review.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F102` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/boutique-inventory.js`. Anchor: `async function onSaveItem()`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/db.js`. Anchor: `export async function saveBoutiqueItem(id, data)`.

### Tailorman F103: Boutique categories and units

Source module: Boutique inventory and purchasing. Evidence class: Code-defined.

Fifteen categories cover Saree, Dress Material, Salwar Kameez, Kurti, Churidar, Wedding Suit, Gown, Ready-made Blouse, Leggings, Dupatta, Bangles, Rings, Jewelry, Accessories, and Other. Units are pieces, sets, pairs, boxes, metres, and grams.

Original role context: Admin and cashier, boutiqueSales entitlement

Verification gap: Code-defined. No authenticated execution or persisted result was observed in this source review.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F103` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/db.js`. Anchor: `export const BOUTIQUE_CATEGORIES = [`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/db.js`. Anchor: `export const BOUTIQUE_UNITS =`.

### Tailorman F104: Opening stock and stock added during edits

Source module: Boutique inventory and purchasing. Evidence class: Code-defined.

New boutique items start at zero. Positive opening stock is recorded as a stock-in transaction. On edit, the separate quantity is added to existing stock with a note describing the edit.

Original role context: Admin and cashier, boutiqueSales entitlement

Verification gap: Code-defined. No authenticated execution or persisted result was observed in this source review.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F104` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/boutique-inventory.js`. Anchor: `if (openingStock > 0)`.

### Tailorman F105: Search and inventory filters

Source module: Boutique inventory and purchasing. Evidence class: Code-defined.

Search name, category, SKU, size, color, and supplier. Combine category and low-stock-only filters. Results show item, variant, stock, cost, selling price, supplier, and updated date with desktop tables and mobile cards.

Original role context: Admin and cashier, boutiqueSales entitlement

Verification gap: Code-defined. No authenticated execution or persisted result was observed in this source review.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F105` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/boutique-inventory.js`. Anchor: `function getFilteredItems()`.

### Tailorman F106: Stock valuation and item counts

Source module: Boutique inventory and purchasing. Evidence class: Code-defined.

Display SKU count, low-stock count, total cost value as quantity times cost price, and retail value as quantity times selling price.

Original role context: Admin and cashier, boutiqueSales entitlement

Verification gap: Code-defined. No authenticated execution or persisted result was observed in this source review.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F106` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/boutique-inventory.js`. Anchor: `function renderKpis()`.

### Tailorman F107: Low-stock alerts and purchase shortcut

Source module: Boutique inventory and purchasing. Evidence class: Code-defined.

An item is low when threshold is positive and stock quantity is at or below it. Show alerts with item and remaining quantity, a Purchase shortcut, and a shared navigation badge.

Original role context: Admin and cashier, boutiqueSales entitlement

Verification gap: Code-defined. No authenticated execution or persisted result was observed in this source review.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F107` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/boutique-inventory.js`. Anchor: `function getLowStockItems()`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/boutique-inventory.js`. Anchor: `function renderLowStock()`.

### Tailorman F113: Delete sellable item

Source module: Boutique inventory and purchasing. Evidence class: Code-defined.

Confirm removal before deleting the boutique inventory document and reloading the list. The inspected handler does not expose an item archive or restore action.

Original role context: Admin and cashier, boutiqueSales entitlement

Verification gap: Code-defined. No authenticated execution or persisted result was observed in this source review.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F113` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/boutique-inventory.js`. Anchor: `async function onDelete(item, btn)`.

### Tailormate F095: Readymade catalog and size display

Source module: Readymade inventory. Evidence class: Code-defined.

Display image, readymade name and type, size badges, stock quantity, selling price and SKU, with stock-add, edit and delete row actions.

Original role context: Signed-in shop user with access to this module. The parent inventory covers navigation permission checks. Backend authorization and other accounts were not tested.

Verification gap: Code-defined. No persisted business action or successful server result was exercised by this static review.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F095` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/inventory/readymades/page-01a303d34371e3c1.js`. Anchor: `accessorKey:"stock_quantity"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/inventory/readymades/page-01a303d34371e3c1.js`. Anchor: `readymade_sizes`.

### Tailormate F096: Create and edit readymades

Source module: Readymade inventory. Evidence class: Code-defined.

Save name, type, SKU, current quantity, selling price, and one or more sizes. Required strings are name, SKU, quantity and price. At least one selected size is required. Selected sizes become readymade_sizes objects with readymade_size_id.

Original role context: Signed-in shop user with access to this module. The parent inventory covers navigation permission checks. Backend authorization and other accounts were not tested.

Verification gap: Code-defined. No persisted business action or successful server result was exercised by this static review.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F096` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/inventory/readymades/page-01a303d34371e3c1.js`. Anchor: `message:"Readymade size is required."`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/inventory/readymades/page-01a303d34371e3c1.js`. Anchor: `readymade_sizes:e.readymade_size.map(e=>({readymade_size_id:e.value}))`.

### Tailormate F097: Readymade photos

Source module: Readymade inventory. Evidence class: Code-defined.

Two image slots hold Main Image and Readymade Image. Editing restores saved images and generates a replacement payload keyed by readymade_image_id.

Original role context: Signed-in shop user with access to this module. The parent inventory covers navigation permission checks. Backend authorization and other accounts were not tested.

Verification gap: Code-defined. No persisted business action or successful server result was exercised by this static review.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F097` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/inventory/readymades/page-01a303d34371e3c1.js`. Anchor: `"readymade_image_id"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/inventory/readymades/page-01a303d34371e3c1.js`. Anchor: `title:"Readymade Image"`.

### Tailormate F099: Search readymades

Source module: Readymade inventory. Evidence class: Code-defined.

Filter readymade name, type and SKU with a case-insensitive search and distinguish no matching results from an empty catalog.

Original role context: Signed-in shop user with access to this module. The parent inventory covers navigation permission checks. Backend authorization and other accounts were not tested.

Verification gap: Code-defined. No persisted business action or successful server result was exercised by this static review.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F099` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/inventory/readymades/page-01a303d34371e3c1.js`. Anchor: `Search by name, type or SKU...`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/inventory/readymades/page-01a303d34371e3c1.js`. Anchor: `toLowerCase().includes`.

### NoolTech F107: Product directory and filters

Source module: Products. Evidence class: Code-defined.

Products load by optional branch, search name/SKU/category, and filter category and active/out-of-stock status.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F107` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/dependencies/boutique.service-CtJ4rBZS.js`. Anchor: `async getProducts`.

### NoolTech F108: Create and edit catalog products

Source module: Products. Evidence class: Code-defined.

Product fields include name/category/SKU, price, cost, stock, unit, brand, sizes, HSN, GST rate, low-stock threshold, description, and quantity-discount tiers.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F108` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/ProductsPage-D1kOIwvu.js`. Anchor: `lowStockThreshold:5`.

### NoolTech F109: Product validation and generated SKU

Source module: Products. Evidence class: Code-defined.

Requires trimmed name, price greater than zero, and nonnegative stock; missing SKU gets category-prefix plus random three-digit value.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F109` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/ProductsPage-D1kOIwvu.js`. Anchor: `Math.floor(Math.random()*900+100)`.

### NoolTech F110: Product image upload/delete API

Source module: Products. Evidence class: Code-defined.

Existing product image supports upload, deletion, and authenticated image URL.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F110` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/dependencies/boutique.service-CtJ4rBZS.js`. Anchor: `async uploadProductImage`.

### NoolTech F111: Archive products

Source module: Products. Evidence class: Code-defined.

Delete action calls archiveProduct, which invokes DELETE, then removes product from list.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F111` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/dependencies/boutique.service-CtJ4rBZS.js`. Anchor: `async archiveProduct`.

### NoolTech F113: Low-stock and catalog-value summaries

Source module: Products. Evidence class: Code-defined.

Catalog displays active product count, out-of-stock/low stock figures, and stock-times-selling-price valuation.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F113` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/index-Dk-7hFgw.js`. Anchor: `stockXPrice:"stock × price"`.

### NoolTech F114: Quantity discount tiers

Source module: Products. Evidence class: Code-defined.

Catalog saves sorted minimum-quantity/discount-percentage tiers. POS uses the highest qualifying minimum and rounds discounted unit price.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F114` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/CreateSalePage-Cj1oN_dA.js`. Anchor: `sort((d,u)=>u.minQty-d.minQty)`.

### NoolTech F115: CSV product import/export

Source module: Products. Evidence class: Code-defined.

CSV export and multipart import endpoints support catalog bulk maintenance. UI previews five rows, expects .csv, and displays row errors.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F115` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/ProductsPage-D1kOIwvu.js`. Anchor: `function it(r,t=5)`.

### NoolTech F116: CSV template fields

Source module: Products. Evidence class: Code-defined.

Template columns include SKU, Name, Category, Price, CostPrice, Stock, Unit, Brand, Sizes, HSNCode, GSTRate, LowStockThreshold, Description.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F116` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/ProductsPage-D1kOIwvu.js`. Anchor: `SKU,Name,Category,Price,CostPrice,Stock,Unit,Brand,Sizes,HSNCode,GSTRate,LowStockThreshold,Description`.

### NoolTech F120: Migrate legacy local product data

Source module: Products. Evidence class: Code-defined.

If server catalog is empty, attempts migration from local product storage and remembers boutique_migrated_v1.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F120` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/ProductsPage-D1kOIwvu.js`. Anchor: `migrateFromLocalStorage`.

## REQ-POS: Retail/material checkout, held carts, and loyalty

Target behavior and acceptance: [REQ-POS](../product/requirements.md#req-pos-retailmaterial-checkout-held-carts-and-loyalty).

### Tailorman F114: Stock selection and editable sale lines

Source module: Boutique sales and receipts. Evidence class: Code-defined.

Add and remove sale lines. Search the datalist by item name, size, or color, then populate item ID, selling rate, and available stock. Each line holds quantity, rate, and quantity-times-rate amount; at least one valid item is required.

Original role context: Admin and cashier, boutiqueSales entitlement

Verification gap: Code-defined. No authenticated execution or persisted result was observed in this source review.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F114` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/sales.js`. Anchor: `function syncLineItem(row)`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/sales.js`. Anchor: `function collectLines()`.

### Tailorman F115: Sale totals, discount, and tax

Source module: Boutique sales and receipts. Evidence class: Code-defined.

Calculate subtotal as summed line totals, then total as subtotal minus discountAmount plus taxAmount. Discount and tax are entered as currency amounts in this sale flow. Display received payment and balance; reject discount larger than item total.

Original role context: Admin and cashier, boutiqueSales entitlement

Verification gap: Code-defined. No authenticated execution or persisted result was observed in this source review.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F115` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/sales.js`. Anchor: `function renderSummary()`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/sales.js`. Anchor: `if (discountAmount > lineTotal)`.

### Tailorman F119: Sale numbering

Source module: Boutique sales and receipts. Evidence class: Code-defined.

Reserve a sequential counter in a transaction and format sale numbers as S plus two-digit year, a hyphen, and a five-digit sequence.

Original role context: Admin and cashier, boutiqueSales entitlement

Verification gap: Code-defined. No authenticated execution or persisted result was observed in this source review.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F119` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/db.js`. Anchor: `async function nextSaleNumber()`.

### Tailorman F120: Sale, stock, and receipt data persistence

Source module: Boutique sales and receipts. Evidence class: Code-defined.

Resolve current stock and product values for each line. Reject missing or insufficient-stock items. Snapshot names, category, SKU, variants, quantity, price, cost, and line total. The transaction writes sale data, stock deductions, item movements, and income ledger rows for initial payments.

Original role context: Admin and cashier, boutiqueSales entitlement

Verification gap: Code-defined. Multi-line transaction behavior, duplicate item lines, contention, and live persistence remain untested.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F120` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/db.js`. Anchor: `export async function createBoutiqueSale(data)`.

### Tailorman F122: Today sales indicators

Source module: Boutique sales and receipts. Evidence class: Code-defined.

Query up to 200 sales for today and display sale count, revenue, collected amount, and pending balance. Save refreshes both these indicators and product availability.

Original role context: Admin and cashier, boutiqueSales entitlement

Verification gap: Code-defined. No authenticated execution or persisted result was observed in this source review.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F122` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/sales.js`. Anchor: `async function loadKpis()`.

### Tailorman F123: Sales history date and client filters

Source module: Boutique sales and receipts. Evidence class: Code-defined.

Default to month start through today. Reject blank, invalid, or reversed date ranges. Load up to 500 sales and filter by paid/partial/credit status, aggregate payment mode, or a search over number, customer name, mobile, and notes.

Original role context: Admin and cashier, boutiqueSales entitlement

Verification gap: Code-defined. No authenticated execution or persisted result was observed in this source review.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F123` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/sales-history.js`. Anchor: `async function runFilters()`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/sales-history.js`. Anchor: `function applyClientFilters()`.

### Tailorman F124: Filtered sales totals and detail navigation

Source module: Boutique sales and receipts. Evidence class: Code-defined.

Recalculate filtered sale count, revenue, received, and balance. List sale number, customer, sold time, mode, status, total, received, and balance with links to the individual sale.

Original role context: Admin and cashier, boutiqueSales entitlement

Verification gap: Code-defined. No authenticated execution or persisted result was observed in this source review.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F124` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/sales-history.js`. Anchor: `function renderKpis()`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/sales-history.js`. Anchor: `function renderList()`.

### Tailorman F125: Sale detail and printable receipt

Source module: Boutique sales and receipts. Evidence class: Code-defined.

Open a sale by query-string ID, show missing/not-found errors, customer and notes, line item variants and quantities, total, received, balance, and split-payment display. Print uses the browser print dialog; print=1 invokes it after loading.

Original role context: Admin and cashier, boutiqueSales entitlement

Verification gap: Code-defined. No authenticated execution or persisted result was observed in this source review.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F125` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/sale.js`. Anchor: `async function renderSale(id, node)`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/sale.js`. Anchor: `const shouldPrint = params.get("print") === "1"`.

### Tailormate F034: Material and readymade sale pickers

Source module: Stock sale order entry. Evidence class: Code-defined.

Material and readymade branches show the complete loaded stock list with image, name, type, SKU, stock quantity, and editable quantity and sell price. Readymades additionally display size. Search matches name, type, and SKU.

Original role context: Signed-in shop user with relevant page access; server authorization unverified.

Verification gap: Code-defined. This source review did not observe a successful write, populated record, payment, message, or server-side permission check.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F034` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/9491-bcd4f8939976b832.js`. Anchor: `selectedMaterialItems:i.z.array(k)`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/9491-bcd4f8939976b832.js`. Anchor: `selectedReadymadeItems:i.z.array(k)`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/9491-bcd4f8939976b832.js`. Anchor: `placeholder:"Search by name, type or SKU..."`.

### Tailormate F035: Stock and sell-price validation

Source module: Stock sale order entry. Evidence class: Code-defined.

A sale needs at least one selected quantity greater than zero. For nonzero quantities, the form rejects quantities above displayed stock and empty, nonnumeric, or negative sell prices. Quantity is numerically preprocessed, with an empty or invalid value becoming zero.

Original role context: Signed-in shop user with relevant page access; server authorization unverified.

Verification gap: Code-defined. This source review did not observe a successful write, populated record, payment, message, or server-side permission check.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F035` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/9491-bcd4f8939976b832.js`. Anchor: `Select at least one material with quantity greater than 0`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/9491-bcd4f8939976b832.js`. Anchor: `Quantity entered is more than available stock`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/9491-bcd4f8939976b832.js`. Anchor: `Enter a valid sell price`.

### Tailormate F036: Editable selling-price increments

Source module: Stock sale order entry. Evidence class: Code-defined.

Sell Price is a decimal input. Arrow Up and Arrow Down are intercepted to add or subtract one, clamp the result to zero, and format it to two decimals.

Original role context: Signed-in shop user with relevant page access; server authorization unverified.

Verification gap: Code-defined. This source review did not observe a successful write, populated record, payment, message, or server-side permission check.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F036` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/9491-bcd4f8939976b832.js`. Anchor: `a.toFixed(2)`.

### Tailormate F037: Add, change, or remove sale lines

Source module: Stock sale order entry. Evidence class: Code-defined.

For an existing sale, a previously saved line with quantity zero becomes a status_id 0 removal request. Existing nonzero lines carry their order-line ID and updated quantity and price. New selected lines carry the current user identity.

Original role context: Signed-in shop user with relevant page access; server authorization unverified.

Verification gap: Code-defined. This source review did not observe a successful write, populated record, payment, message, or server-side permission check.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F037` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/9491-bcd4f8939976b832.js`. Anchor: `e.order_material_id&&!e.quantity`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/9491-bcd4f8939976b832.js`. Anchor: `e.order_readymade_id&&!e.quantity`.

### Tailormate F038: Shared order save workflow

Source module: Stock sale order entry. Evidence class: Code-defined.

Material and readymade sales submit material_items or readymade_items to the same new-order or update-order helpers used by tailoring. New requests carry customer name, customer ID, current user, shop ID, and current order date.

Original role context: Signed-in shop user with relevant page access; server authorization unverified.

Verification gap: Code-defined. This source review did not observe a successful write, populated record, payment, message, or server-side permission check.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F038` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/9491-bcd4f8939976b832.js`. Anchor: `material_items:L(e)`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/9491-bcd4f8939976b832.js`. Anchor: `readymade_items:L(e)`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/2579-81f953d8d7798c4c.js`. Anchor: `"/saveneworder"`.

### NoolTech F119: Loyalty programme settings

Source module: Products. Evidence class: Code-defined.

Loyalty enabled/earn-per-₹100/redeem-per-100-points settings persist locally in the browser.

Original role context: Admin, manager, or permitted staff

Verification gap: Configuration is client-local in this implementation; cross-device synchronization was not established.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F119` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/ProductsPage-D1kOIwvu.js`. Anchor: `localStorage.setItem(Se,JSON.stringify(i))`.

### NoolTech F121: Three-step sale flow

Source module: Boutique POS. Evidence class: Code-defined.

Customer, Products, Payment flow requires a selected customer and at least one cart product.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F121` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/CreateSalePage-Cj1oN_dA.js`. Anchor: `k===1?!!a:k===2?S.length>0`.

### NoolTech F122: Inline customer creation

Source module: Boutique POS. Evidence class: Code-defined.

POS creates customer using required trimmed first name, optional last name and optional phone, then selects the created record.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F122` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/CreateSalePage-Cj1oN_dA.js`. Anchor: `firstName:H.trim()`.

### NoolTech F123: Catalog search and category filter

Source module: Boutique POS. Evidence class: Code-defined.

POS loads active nonarchived products and filters by search text, category, and SKU, with grid/list presentation.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F123` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/CreateSalePage-Cj1oN_dA.js`. Anchor: `i.status==="active"`.

### NoolTech F124: Cart quantities and removal

Source module: Boutique POS. Evidence class: Code-defined.

Cart adds products, changes quantities, removes zero/negative quantities, and disables add controls once quantity reaches displayed product stock.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F124` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/CreateSalePage-Cj1oN_dA.js`. Anchor: `disabled:i>=t.stock`.

### NoolTech F125: Product size guide

Source module: Boutique POS. Evidence class: Code-defined.

Size-guide modal presents approximate Indian sizing for product categories and warns to take fresh measurements for custom fit.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F125` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/index-Dk-7hFgw.js`. Anchor: `Indian standard sizing`.

### NoolTech F126: Hold/resume/delete local carts

Source module: Boutique POS. Evidence class: Code-defined.

Stores held cart with customer metadata, pricing, tax, notes, and payment mode in localStorage; resume restores cart/settings and moves to Products step.

Original role context: Admin, manager, or permitted staff

Verification gap: Resume function does not restore selected customer although it saves customerId. Confirmation checks selected customer, so resumed checkout needs verification.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F126` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/CreateSalePage-Cj1oN_dA.js`. Anchor: `localStorage.setItem($e,JSON.stringify(i))`.

### NoolTech F128: Cash and change calculation

Source module: Boutique POS. Evidence class: Code-defined.

Cash input computes change for overpayment and balance for underpayment. Submitted advance is capped at sale total; blank/zero input defaults to total.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F128` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/CreateSalePage-Cj1oN_dA.js`. Anchor: `Math.min(z||m,m)`.

### NoolTech F129: UPI and card recording

Source module: Boutique POS. Evidence class: Code-defined.

UPI/card modes submit full sale total as advance and display confirmation hints. These modes record payment information rather than initiate a gateway charge in this code.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F129` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/CreateSalePage-Cj1oN_dA.js`. Anchor: `h==="upi"||h==="card"?m`.

### NoolTech F130: Split payment

Source module: Boutique POS. Evidence class: Code-defined.

Split records cash, UPI, and card inputs, sums them as advance, and persists splitDetails in boutiqueMetadata.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F130` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/CreateSalePage-Cj1oN_dA.js`. Anchor: `splitDetails:{cash:D,upi:q,card:O}`.

### NoolTech F131: Credit/Khata sale

Source module: Boutique POS. Evidence class: Code-defined.

Credit mode records zero advance and leaves full amount due for later collection.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F131` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/CreateSalePage-Cj1oN_dA.js`. Anchor: `h==="credit"?0`.

### NoolTech F132: Alteration or custom stitching

Source module: Boutique POS. Evidence class: Code-defined.

Sale can add tailoring description, charge, ready-by date, saved/new customer measurements, and an extra custom-stitching order line.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F132` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/CreateSalePage-Cj1oN_dA.js`. Anchor: `garmentType:"Custom Stitching / Alteration"`.

### NoolTech F133: Loyalty earn and redeem

Source module: Boutique POS. Evidence class: Code-defined.

Fetches customer points; redemption uses whole blocks of 100 points capped at order amount, and submits earned/redeemed point counts in metadata.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F133` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/CreateSalePage-Cj1oN_dA.js`. Anchor: `loyaltyPointsEarned:Ms,loyaltyPointsRedeemed:Ps`.

### NoolTech F134: Estimated sale margin

Source module: Boutique POS. Evidence class: Code-defined.

Computes displayed margin only for items with known costPrice using discounted unit selling price minus cost.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F134` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/CreateSalePage-Cj1oN_dA.js`. Anchor: `V(i)-i.product.costPrice`.

### NoolTech F135: Record sale as order

Source module: Boutique POS. Evidence class: Code-defined.

Submits productId-bearing items to order-create API, marks notes [Boutique Sale], and uses completed status unless alteration selected, which uses in-progress.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F135` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/CreateSalePage-Cj1oN_dA.js`. Anchor: `status:y?"in-progress":"completed"`.

### NoolTech F136: Sale metadata and branch

Source module: Boutique POS. Evidence class: Code-defined.

Sale payload carries paymentMode, split values, loyalty, alteration charge, bulk discount amount, staffName, and optional locationId.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F136` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/CreateSalePage-Cj1oN_dA.js`. Anchor: `boutiqueMetadata:{paymentMode:h`.

### NoolTech F137: WhatsApp receipt composition

Source module: Boutique POS. Evidence class: Code-defined.

Composes sale receipt from cart, totals, discounts, tax, and customer phone and opens wa.me. It does not establish that WhatsApp delivered it.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F137` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/CreateSalePage-Cj1oN_dA.js`. Anchor: `🛍️ *Sale Receipt*`.

### NoolTech F138: Apply exchange credit

Source module: Boutique POS. Evidence class: Code-defined.

POS accepts exchange source, returned-item text, and exchangeCredit in navigation state and applies credit as flat discount.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F138` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/CreateSalePage-Cj1oN_dA.js`. Anchor: `p.exchangeCredit>0`.

## REQ-RETURN: Retail returns, refunds, and exchanges

Target behavior and acceptance: [REQ-RETURN](../product/requirements.md#req-return-retail-returns-refunds-and-exchanges).

### NoolTech F082: Return selected quantities and refund

Source module: Boutique returns. Evidence class: Code-defined.

Return picker limits quantities to the original sold quantity, excludes stitching/alteration lines, and calculates refund from line price times returned quantity.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F082` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/OrderDetailPage-B2ZYKSVH.js`. Anchor: `Math.min(h.quantity,(A[u]||0)+1)`.

### NoolTech F083: Restore returned product stock

Source module: Boutique returns. Evidence class: Code-defined.

After recording a cash refund, attempts restoreStock for returned productId/qty pairs. Errors from stock restoration are swallowed.

Original role context: Admin, manager, or permitted staff

Verification gap: Refund and stock restoration are separate requests. A successful refund does not prove stock restored.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F083` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/OrderDetailPage-B2ZYKSVH.js`. Anchor: `await Ss.restoreStock(h)`.

### NoolTech F084: Start exchange with credit

Source module: Boutique returns. Evidence class: Code-defined.

Exchange collects returned item quantities and passes source order, customer, and computed return credit into a new POS sale.

Original role context: Admin, manager, or permitted staff

Verification gap: The exchange click handler starts a new sale with credit but does not itself call restoreStock. Inventory restoration and repeated-return rules are unverified.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F084` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/OrderDetailPage-B2ZYKSVH.js`. Anchor: `exchangeCredit`.

## REQ-MATERIAL: Material inventory, variants, reservations, and consumption

Target behavior and acceptance: [REQ-MATERIAL](../product/requirements.md#req-material-material-inventory-variants-reservations-and-consumption).

### Tailorman F064: Material consumption when cutting starts

Source module: Tailoring bills. Evidence class: Code-defined.

Start Cutting opens optional material rows with inventory choices, stock quantity/unit, and quantity used. Type-level material requirements suggest per-piece quantity × ordered quantity. Positive deductions generate bill-linked stock-out transactions after the stage update.

Original role context: admin, cutter

Verification gap: Code-defined. Stage advancement and each stock deduction are separate awaits; partial failure can leave the stage advanced with incomplete deductions.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F064` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/bill.js`. Anchor: `async function openCuttingMaterialsDialog(itemId)`.

### Tailorman F127: Material item master

Source module: Material inventory. Evidence class: Code-defined.

Create or edit material name, category, unit, low-stock threshold, cost per unit, supplier, and notes. Name is required. New item count is checked against inventoryItemLimit.

Original role context: Admin, inventory entitlement

Verification gap: Code-defined. No authenticated execution or persisted result was observed in this source review.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F127` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/inventory.js`. Anchor: `async function onSaveItem()`.

### Tailorman F128: Material categories and stock units

Source module: Material inventory. Evidence class: Code-defined.

Ten categories cover Fabric, Thread, Buttons & Fasteners, Lining, Interfacing, Trims & Notions, Elastic, Zippers, Labels, and Other. Thirteen units include meters, yards, feet, cm, kg, grams, pieces, spools, rolls, sets, pairs, boxes, and bundles.

Original role context: Admin, inventory entitlement

Verification gap: Code-defined. No authenticated execution or persisted result was observed in this source review.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F128` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/db.js`. Anchor: `export const INVENTORY_UNITS = [`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/db.js`. Anchor: `export const INVENTORY_CATEGORIES = [`.

### Tailorman F130: Material inventory filters and valuation

Source module: Material inventory. Evidence class: Code-defined.

Filter by material name, category, and low-stock-only. Show total items, distinct categories, low-stock count, and stock value calculated as quantity times cost per unit.

Original role context: Admin, inventory entitlement

Verification gap: Code-defined. No authenticated execution or persisted result was observed in this source review.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F130` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/inventory.js`. Anchor: `function getFilteredItems()`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/inventory.js`. Anchor: `function renderKpis()`.

### Tailorman F131: Material low-stock alerts

Source module: Material inventory. Evidence class: Code-defined.

Treat positive thresholds with quantity at or below threshold as low stock. Display current quantity, unit, threshold, and a Restock action; update the shared inventory badge.

Original role context: Admin, inventory entitlement

Verification gap: Code-defined. No authenticated execution or persisted result was observed in this source review.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F131` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/inventory.js`. Anchor: `function renderLowStock()`.

### Tailorman F135: Delete material item

Source module: Material inventory. Evidence class: Code-defined.

Confirm permanent removal, delete the material item document, and refresh the list.

Original role context: Admin, inventory entitlement

Verification gap: Code-defined. No authenticated execution or persisted result was observed in this source review.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F135` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/inventory.js`. Anchor: `async function onDelete(it, btn)`.

### Tailormate F088: Shop material catalog

Source module: Material inventory. Evidence class: Code-defined.

List the selected shop's materials with main image or No Image fallback, name, material type, quantity with unit code, selling price, and SKU. List reads include shop_id.

Original role context: Signed-in shop user with access to this module. The parent inventory covers navigation permission checks. Backend authorization and other accounts were not tested.

Verification gap: Code-defined. No persisted business action or successful server result was exercised by this static review.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F088` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/inventory/materials/page-7140a18374176234.js`. Anchor: `accessorKey:"stock_quantity"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/2869-5bf5afa4deeb80bb.js`. Anchor: `"/getmaterials"`.

### Tailormate F089: Search materials

Source module: Material inventory. Evidence class: Code-defined.

Case-insensitive client filtering matches material name, material type, or SKU. Empty inventory and no search results use distinct messages.

Original role context: Signed-in shop user with access to this module. The parent inventory covers navigation permission checks. Backend authorization and other accounts were not tested.

Verification gap: Code-defined. No persisted business action or successful server result was exercised by this static review.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F089` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/inventory/materials/page-7140a18374176234.js`. Anchor: `material_name)||void 0===a?void 0:a.toLowerCase().includes(t)`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/inventory/materials/page-7140a18374176234.js`. Anchor: `Search by name, type or SKU...`.

### Tailormate F090: Create and edit material details

Source module: Material inventory. Evidence class: Code-defined.

Create or edit material name, type, unit, SKU, current stock quantity, and selling price per unit. Name, SKU, quantity, and selling-price strings must be nonempty. Type and unit use searchable select objects. The schema does not establish positive numeric bounds on quantity or price.

Original role context: Signed-in shop user with access to this module. The parent inventory covers navigation permission checks. Backend authorization and other accounts were not tested.

Verification gap: Code-defined. No persisted business action or successful server result was exercised by this static review.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F090` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/inventory/materials/page-7140a18374176234.js`. Anchor: `material_name:h.z.string().min(1`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/inventory/materials/page-7140a18374176234.js`. Anchor: `material_type_id:e.material_type.value,material_unit_id:e.material_unit.value`.

### Tailormate F091: Material image pair

Source module: Material inventory. Evidence class: Code-defined.

The form has Main Image and Material Image slots, restores the first two saved images during editing, and builds an image-change payload using material_image_id.

Original role context: Signed-in shop user with access to this module. The parent inventory covers navigation permission checks. Backend authorization and other accounts were not tested.

Verification gap: Code-defined. No persisted business action or successful server result was exercised by this static review.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F091` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/inventory/materials/page-7140a18374176234.js`. Anchor: `"material_image_id"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/inventory/materials/page-7140a18374176234.js`. Anchor: `title:"Material Image"`.

### Tailormate F094: Deactivate material

Source module: Material inventory. Evidence class: Code-defined.

A row delete action opens confirmation and saves the material with is_active 0 and selected shop_id. This is client soft-deactivation intent, not evidence of physical deletion.

Original role context: Signed-in shop user with access to this module. The parent inventory covers navigation permission checks. Backend authorization and other accounts were not tested.

Verification gap: Code-defined. No persisted business action or successful server result was exercised by this static review.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F094` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/inventory/materials/page-7140a18374176234.js`. Anchor: `material_id:null==b?void 0:b.material_id`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/2869-5bf5afa4deeb80bb.js`. Anchor: `is_active:"0",shop_id:null==e?void 0:e.shop_id`.

### NoolTech F141: Inventory register and filters

Source module: Inventory. Evidence class: Code-defined.

Search by name or SKU; filter category, active/out_of_stock/discontinued status, location, and low-stock flag. Paginated register shows item, SKU, category, stock, cost, status, and actions. Client requests 20 items per page.

Original role context: Authenticated shop user

Verification gap: Client action, form, or service definition exists. Server execution, persistence, and access enforcement were not tested by this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F141` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/InventoryListPage-CHPeDHmS.js`. Anchor: `limit:20`.

### NoolTech F142: Inventory summary

Source module: Inventory. Evidence class: Code-defined.

Summary cards show item count, in-stock items, stock value using cost times quantity, low-stock items, and out-of-stock items. Summary requests can be scoped to a location.

Original role context: Authenticated shop user

Verification gap: Client action, form, or service definition exists. Server execution, persistence, and access enforcement were not tested by this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F142` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/InventoryListPage-CHPeDHmS.js`. Anchor: `inventory.costQty`.

### NoolTech F143: Create and edit inventory items

Source module: Inventory. Evidence class: Code-defined.

SKU, name, description, category, unit, current stock, reorder level, reorder quantity, cost price, optional selling price, preferred vendor, brand, color, material, storage location, notes, and barcode. Categories are fabric/thread/button/zipper/accessory/lining/interlining/other. Units are meter/yard/piece/spool/kg/gram/dozen/pair.

Original role context: Authenticated shop user

Verification gap: Client action, form, or service definition exists. Server execution, persistence, and access enforcement were not tested by this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F143` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/InventoryFormPage-CApyL_Vg.js`. Anchor: `preferredVendorName`.

### NoolTech F144: Inventory item images

Source module: Inventory. Evidence class: Code-defined.

Upload item image for an existing item; an authenticated image URL is used for previews. The service also defines image deletion.

Original role context: Authenticated shop user

Verification gap: Client action, form, or service definition exists. Server execution, persistence, and access enforcement were not tested by this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F144` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/InventoryFormPage-CApyL_Vg.js`. Anchor: `uploadImage`.

### NoolTech F145: Fabric roll attributes

Source module: Inventory. Evidence class: Code-defined.

Fabric-only fields include width, width unit, roll flag, roll number, and remaining meters. Non-fabric saves omit fabricAttributes.

Original role context: Authenticated shop user

Verification gap: Client action, form, or service definition exists. Server execution, persistence, and access enforcement were not tested by this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F145` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/InventoryFormPage-CApyL_Vg.js`. Anchor: `fabricAttributes`.

### NoolTech F147: Serialized stock flag

Source module: Inventory. Evidence class: Code-defined.

Item configuration exposes isSerialTracked with a serialized-tracking explanation.

Original role context: Authenticated shop user

Verification gap: The item flag is saved by the client. Individual serial-number stock lifecycle and server enforcement were not established.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F147` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/InventoryFormPage-CApyL_Vg.js`. Anchor: `isSerialTracked`.

### NoolTech F148: Inventory bundle definition

Source module: Inventory. Evidence class: Code-defined.

Define isBundle and bundleComponents with component inventoryItemId and quantity. The form searches component items and explains component consumption.

Original role context: Authenticated shop user

Verification gap: Client action, form, or service definition exists. Server execution, persistence, and access enforcement were not tested by this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F148` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/InventoryFormPage-CApyL_Vg.js`. Anchor: `bundleComponents`.

### NoolTech F149: Consume an inventory bundle

Source module: Inventory. Evidence class: Code-defined.

A client service defines POST /api/inventory/bundles/:id/consume with quantity, orderId, and orderNumber, and POST /api/inventory/bundles for creation.

Original role context: Authenticated shop user

Verification gap: Service method is present. A reachable bundle-consumption button and the resulting stock deductions were not verified.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F149` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/dependencies/inventory.service-COh38tHV.js`. Anchor: `consumeBundle`.

### NoolTech F150: Size and color variants

Source module: Inventory. Evidence class: Code-defined.

Expand an item's variants, inspect each variant's stock/reserved/available state, and create a variant with SKU, name, size, color, opening stock, and cost. Size/color compose variantAttributes. Name and SKU are required by the client.

Original role context: Authenticated shop user

Verification gap: Client action, form, or service definition exists. Server execution, persistence, and access enforcement were not tested by this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F150` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/InventoryItemPage-DMAMvDYp.js`. Anchor: `createVariant`.

### NoolTech F152: Reserved and available stock

Source module: Inventory. Evidence class: Code-defined.

Item detail shows currentStock, reservedStock, and availableStock. Services reserve stock for an order and release reservations by order ID.

Original role context: Authenticated shop user

Verification gap: Read fields and reservation methods exist. Reservation timing and over-allocation prevention were not tested.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F152` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/dependencies/inventory.service-COh38tHV.js`. Anchor: `reserveStock`.

### NoolTech F156: Inventory CSV import and export

Source module: Inventory. Evidence class: Code-defined.

Download full inventory CSV or a template; upload .csv, preview the first five detected rows, then import and show created/updated counts plus row errors. Export columns include SKU, Name, Description, Category, Unit, CurrentStock, ReorderLevel, CostPrice, SellingPrice, IsActive, CreatedAt, and UpdatedAt.

Original role context: Authenticated shop user

Verification gap: Client action, form, or service definition exists. Server execution, persistence, and access enforcement were not tested by this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F156` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/InventoryListPage-CHPeDHmS.js`. Anchor: `inventory-template.csv`.

### NoolTech F160: Inventory item deletion service

Source module: Inventory. Evidence class: Code-defined.

The inventory service defines DELETE /api/inventory/:id.

Original role context: Authenticated shop user

Verification gap: A client service method exists. A reachable inventory-delete control, record dependencies, and server-side deletion behavior were not established.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F160` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/dependencies/inventory.service-COh38tHV.js`. Anchor: `async delete(a)`.

## REQ-PURCHASE: Direct purchases, stock adjustments, and history

Target behavior and acceptance: [REQ-PURCHASE](../product/requirements.md#req-purchase-direct-purchases-stock-adjustments-and-history).

### Tailorman F108: Stock adjustments

Source module: Boutique inventory and purchasing. Evidence class: Code-defined.

Record positive stock-in or stock-out quantities with notes. Transactions change stock and write an in/out history entry together. Stock-out rejects quantities beyond available stock.

Original role context: Admin and cashier, boutiqueSales entitlement

Verification gap: Code-defined. No authenticated execution or persisted result was observed in this source review.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F108` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/boutique-inventory.js`. Anchor: `async function onSaveStock()`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/db.js`. Anchor: `export async function recordBoutiqueStockOut(`.

### Tailorman F109: Stock history

Source module: Boutique inventory and purchasing. Evidence class: Code-defined.

Show the latest 40 item transactions with direction, quantity, unit, created time, reason, and note. Adjustment, purchase, and sale transactions carry distinct reasons in the stored data.

Original role context: Admin and cashier, boutiqueSales entitlement

Verification gap: Code-defined. No authenticated execution or persisted result was observed in this source review.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F109` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/boutique-inventory.js`. Anchor: `async function openTxnModal(item)`.

### Tailorman F110: Supplier purchase entry

Source module: Boutique inventory and purchasing. Evidence class: Code-defined.

Select an existing boutique item and enter positive quantity, cost per unit, supplier, invoice number, payment mode, and notes. Show quantity times cost as the purchase total. Payment modes include cash, UPI, card, and bank.

Original role context: Admin and cashier, boutiqueSales entitlement

Verification gap: Code-defined. No authenticated execution or persisted result was observed in this source review.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F110` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/boutique-inventory.js`. Anchor: `async function onSavePurchase()`.

### Tailorman F111: Purchase stock and finance posting

Source module: Boutique inventory and purchasing. Evidence class: Code-defined.

A Firestore transaction increases item stock, stores purchase details, and creates the item stock movement. Supplier and last nonzero cost update the item. A following call writes a matching expense to accountEntries and emits purchase.boutique audit evidence.

Original role context: Admin and cashier, boutiqueSales entitlement

Verification gap: Code-defined. The purchase transaction and subsequent ledger write are separate; cross-record consistency was not tested.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F111` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/db.js`. Anchor: `export async function createBoutiquePurchase(data)`.

### Tailorman F112: Recent purchase history

Source module: Boutique inventory and purchasing. Evidence class: Code-defined.

Load the latest 25 purchases and show item, quantity, unit, supplier, purchase time, total, and invoice number or payment mode.

Original role context: Admin and cashier, boutiqueSales entitlement

Verification gap: Code-defined. No authenticated execution or persisted result was observed in this source review.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F112` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/boutique-inventory.js`. Anchor: `function renderPurchaseList()`.

### Tailorman F129: Opening stock entry

Source module: Material inventory. Evidence class: Code-defined.

The new-item form accepts initial stock and records an Initial stock stock-in movement. Existing-item edits leave stock unchanged. In the inspected client, a positive initial quantity is both stored in the item payload and added again by recordStockIn, a static defect detailed in the findings.

Original role context: Admin, inventory entitlement

Verification gap: Code-defined. Positive initial-stock double addition follows from these handlers but was not executed on a live item.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F129` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/inventory.js`. Anchor: `if (!id && stock !== "") data.stockQty = Number(stock)`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/inventory.js`. Anchor: `await recordStockIn(savedId, Number(stock), { note: "Initial stock" })`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/db.js`. Anchor: `export async function saveInventoryItem(id, data)`.

### Tailorman F132: Stock-in and material purchases

Source module: Material inventory. Evidence class: Code-defined.

Accept a positive quantity and note. For stock coming in, optionally enter cost per unit and supplier. The stock transaction increases quantity and stores cost, total cost, supplier, reason, actor, and time. A positive cost also updates latest unit cost and creates an expense ledger row.

Original role context: Admin, inventory entitlement

Verification gap: Code-defined. Stock and the following ledger write are separate operations; no live purchase was recorded.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F132` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/db.js`. Anchor: `export async function recordStockIn(itemId, qty`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/inventory.js`. Anchor: `async function onSaveStock()`.

### Tailorman F133: Stock-out with availability validation

Source module: Material inventory. Evidence class: Code-defined.

Issue a positive quantity with a note. Reject a missing item or a quantity beyond available stock, then decrement and write the outbound stock history inside a transaction. The data helper supports an optional linked bill ID.

Original role context: Admin, inventory entitlement

Verification gap: Code-defined. No authenticated execution or persisted result was observed in this source review.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F133` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/db.js`. Anchor: `export async function recordStockOut(itemId, qty`.

### Tailorman F134: Material transaction history

Source module: Material inventory. Evidence class: Code-defined.

Show the latest 40 item transactions with quantity, direction, timestamp, unit, and note. The data helper defaults to 50 and orders newest first.

Original role context: Admin, inventory entitlement

Verification gap: Code-defined. No authenticated execution or persisted result was observed in this source review.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F134` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/inventory.js`. Anchor: `async function openTxnModal(it)`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/db.js`. Anchor: `export async function listInventoryTxns(itemId, max = 50)`.

### Tailormate F092: Opening purchase fields

Source module: Material inventory. Evidence class: Code-defined.

New materials can carry purchase unit price and a supplier selection, defaulting to Select Supplier with ID 0. Those purchase-cost and supplier fields are hidden and omitted when editing an existing material.

Original role context: Signed-in shop user with access to this module. The parent inventory covers navigation permission checks. Backend authorization and other accounts were not tested.

Verification gap: Code-defined. No persisted business action or successful server result was exercised by this static review.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F092` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/inventory/materials/page-7140a18374176234.js`. Anchor: `purchase_unit_price:u?void 0:e.purchase_unit_price`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/inventory/materials/page-7140a18374176234.js`. Anchor: `supplier_id:u?void 0:`.

### Tailormate F093: Restock material from its row

Source module: Material inventory. Evidence class: Code-defined.

The row plus action opens the shared Add Stock Purchases dialog for the chosen material. Quantity and unit cost are required and the dialog passes material_id to the material-purchase endpoint.

Original role context: Signed-in shop user with access to this module. The parent inventory covers navigation permission checks. Backend authorization and other accounts were not tested.

Verification gap: Code-defined. No persisted business action or successful server result was exercised by this static review.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F093` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/inventory/materials/page-7140a18374176234.js`. Anchor: `onAddMaterialPurchase:e=>{w(e)}`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/2869-5bf5afa4deeb80bb.js`. Anchor: `material_purchase_id:null==b?void 0:b.purchase_id`.

### Tailormate F098: Opening stock purchase information

Source module: Readymade inventory. Evidence class: Code-defined.

Create forms include optional purchase unit price and supplier. Edit forms omit those fields while retaining the separate current-stock field. Supplier data comes from the shared supplier list.

Original role context: Signed-in shop user with access to this module. The parent inventory covers navigation permission checks. Backend authorization and other accounts were not tested.

Verification gap: Code-defined. No persisted business action or successful server result was exercised by this static review.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F098` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/inventory/readymades/page-01a303d34371e3c1.js`. Anchor: `purchase_unit_price:t?void 0:e.purchase_unit_price`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/inventory/readymades/page-01a303d34371e3c1.js`. Anchor: `supplier_id:t?void 0:`.

### Tailormate F100: Restock and deactivate readymades

Source module: Readymade inventory. Evidence class: Code-defined.

A plus action opens the shared readymade purchase modal. Delete saves is_active 0 with readymade_id and selected shop_id after confirmation.

Original role context: Signed-in shop user with access to this module. The parent inventory covers navigation permission checks. Backend authorization and other accounts were not tested.

Verification gap: Code-defined. No persisted business action or successful server result was exercised by this static review.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F100` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/inventory/readymades/page-01a303d34371e3c1.js`. Anchor: `onAddReadymadePurchase`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/2869-5bf5afa4deeb80bb.js`. Anchor: `"/savereadymadepurchase"`.

### Tailormate F101: Add stock purchase

Source module: Purchases. Evidence class: Code-defined.

One modal serves materials and readymades. It shows item name and SKU, requires purchase quantity and unit price, offers supplier selection, and posts is_active 1 with the corresponding item ID. Material and readymade purchases use separate endpoints.

Original role context: Signed-in shop user with access to this module. The parent inventory covers navigation permission checks. Backend authorization and other accounts were not tested.

Verification gap: Code-defined. No persisted business action or successful server result was exercised by this static review.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F101` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/2869-5bf5afa4deeb80bb.js`. Anchor: `required:"Purchase quantity is required"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/2869-5bf5afa4deeb80bb.js`. Anchor: `required:"Purchase unit price is required"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/2869-5bf5afa4deeb80bb.js`. Anchor: `"/savematerialpurchase"`.

### Tailormate F102: Edit an existing purchase

Source module: Purchases. Evidence class: Code-defined.

Purchase report rows open Edit Stock Purchases. The form restores date, quantity, cost, supplier, source name and SKU, and submits material_purchase_id or readymade_purchase_id along with the source item ID.

Original role context: Signed-in shop user with access to this module. The parent inventory covers navigation permission checks. Backend authorization and other accounts were not tested.

Verification gap: Code-defined. No persisted business action or successful server result was exercised by this static review.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F102` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/2869-5bf5afa4deeb80bb.js`. Anchor: `children:M?"Edit Stock (Purchases)":"Add Stock (Purchases)"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/inventory/purchases/page-7caaf1783110a7f4.js`. Anchor: `purchase:I,source:"M"===I.type?"material":"readymade"`.

### Tailormate F103: Purchase date handling

Source module: Purchases. Evidence class: Code-defined.

A new purchase starts with today's date. An edit restores its saved purchase_date. The date is rendered as formatted text in this shared dialog rather than as an editable date input.

Original role context: Signed-in shop user with access to this module. The parent inventory covers navigation permission checks. Backend authorization and other accounts were not tested.

Verification gap: Code-defined. No persisted business action or successful server result was exercised by this static review.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F103` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/2869-5bf5afa4deeb80bb.js`. Anchor: `purchase_date:u()().format(h.RI)`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/2869-5bf5afa4deeb80bb.js`. Anchor: `children:"Purchase Date"`.

### Tailormate F104: Purchase report filters

Source module: Purchases. Evidence class: Code-defined.

Default date range is the last 180 days. Filter Materials and Readymades together, Materials only, or Readymades only, plus a SKU field debounced by 500 ms. The report request uses fromdate, todate, purchase_type and optional sku.

Original role context: Signed-in shop user with access to this module. The parent inventory covers navigation permission checks. Backend authorization and other accounts were not tested.

Verification gap: Code-defined. No persisted business action or successful server result was exercised by this static review.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F104` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/inventory/purchases/page-7caaf1783110a7f4.js`. Anchor: `subtract(180,"days")`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/inventory/purchases/page-7caaf1783110a7f4.js`. Anchor: `purchase_type:u||void 0,sku:h||void 0`.

### Tailormate F105: Group purchase rows

Source module: Purchases. Evidence class: Code-defined.

Group returned purchases by purchase date or source item name. Rows show the alternate group dimension, material/readymade type marker, SKU, purchased quantity, unit price, and an edit action.

Original role context: Signed-in shop user with access to this module. The parent inventory covers navigation permission checks. Backend authorization and other accounts were not tested.

Verification gap: Code-defined. No persisted business action or successful server result was exercised by this static review.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F105` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/inventory/purchases/page-7caaf1783110a7f4.js`. Anchor: `ITEM_NAME="source_name"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/inventory/purchases/page-7caaf1783110a7f4.js`. Anchor: `children:"Unit Price"`.

### Tailormate F106: Purchase CSV export

Source module: Purchases. Evidence class: Code-defined.

Download a server-generated CSV using the current date, type and SKU filters, rep_format csv, and user_id. The response filename is downloaded through the shared file helper.

Original role context: Signed-in shop user with access to this module. The parent inventory covers navigation permission checks. Backend authorization and other accounts were not tested.

Verification gap: Code-defined. No persisted business action or successful server result was exercised by this static review.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F106` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/inventory/purchases/page-7caaf1783110a7f4.js`. Anchor: `rep_format:"csv"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/inventory/purchases/page-7caaf1783110a7f4.js`. Anchor: `l.filename`.

### NoolTech F112: Receive stock

Source module: Products. Evidence class: Code-defined.

Receive-stock action adds a positive quantity to existing stock and updates active/out-of-stock status.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F112` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/ProductsPage-D1kOIwvu.js`. Anchor: `const b=i.stock+H`.

### NoolTech F151: Stock adjustment and transaction history

Source module: Inventory. Evidence class: Code-defined.

Add or remove stock with quantity, reason, and optional notes. Addition reasons include purchase/return/adjustment; removal includes sale/waste/adjustment. History displays transaction type, previous/new stock, actor, date, and notes.

Original role context: Authenticated shop user

Verification gap: Client action, form, or service definition exists. Server execution, persistence, and access enforcement were not tested by this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F151` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/InventoryItemPage-DMAMvDYp.js`. Anchor: `adjustStock`.

## REQ-VENDOR: Vendor directory and supplier information

Target behavior and acceptance: [REQ-VENDOR](../product/requirements.md#req-vendor-vendor-directory-and-supplier-information).

### NoolTech F170: Vendor register and summary

Source module: Vendors. Evidence class: Code-defined.

Search vendors and show contact, category, payment terms, status, and actions. Summary includes total vendors, active purchase orders, and pending vendor payments.

Original role context: Authenticated shop user

Verification gap: Client action, form, or service definition exists. Server execution, persistence, and access enforcement were not tested by this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F170` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/VendorsPage-CcQIRt7-.js`. Anchor: `vendors.pendingPayments`.

### NoolTech F171: Create, edit, and delete vendors

Source module: Vendors. Evidence class: Code-defined.

Vendor business name, email, phone, headquarters/location, category, and Active/Inactive partnership status. Categories include Fabrics, Trims, Supplies, Machinery, Services, and Other. Delete has a confirmation.

Original role context: Authenticated shop user

Verification gap: Client action, form, or service definition exists. Server execution, persistence, and access enforcement were not tested by this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F171` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/VendorCreateForm-CHU0phRo.js`. Anchor: `Vendor Business Name`.

### NoolTech F172: Vendor payment terms

Source module: Vendors. Evidence class: Code-defined.

Choose Net 30/60/90, Advance, COD, or Custom days. Additional contacts have name, role, phone, email, and primary-contact flag. Contact roles include Primary, Sales, Accounts, Support, Logistics, and Other.

Original role context: Authenticated shop user

Verification gap: Client action, form, or service definition exists. Server execution, persistence, and access enforcement were not tested by this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F172` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/VendorCreateForm-CHU0phRo.js`. Anchor: `paymentTermsDays`.

### NoolTech F173: Vendor tax, documents, and bank details

Source module: Vendors. Evidence class: Code-defined.

Store GST/PAN numbers; other document type, label, and value/URL; account name/number, IFSC, and bank name. Document types include GST certificate, PAN card, bank details, contract, and other.

Original role context: Authenticated shop user

Verification gap: Client stores document metadata/value links. Uploading binary compliance documents is not established by this form.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F173` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/VendorCreateForm-CHU0phRo.js`. Anchor: `bankIfscCode`.

### NoolTech F174: Vendor CSV import

Source module: Vendors. Evidence class: Code-defined.

Select CSV, download an import template, parse client rows, import vendors, and show created/failed rows with errors.

Original role context: Authenticated shop user

Verification gap: Client action, form, or service definition exists. Server execution, persistence, and access enforcement were not tested by this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F174` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/VendorsPage-CcQIRt7-.js`. Anchor: `vendor_import_template.csv`.

### NoolTech F175: Vendor detail and performance

Source module: Vendors. Evidence class: Code-defined.

Overview, performance, reviews, and communications tabs. Performance includes total orders, pending orders, total spend, last order, delivery rate, average delivery time, and received/cancelled breakdown.

Original role context: Authenticated shop user

Verification gap: Client action, form, or service definition exists. Server execution, persistence, and access enforcement were not tested by this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F175` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/VendorDetailPage-CAFvfByQ.js`. Anchor: `vendorDetail.avgDeliveryTime`.

### NoolTech F176: Vendor reviews and communication log

Source module: Vendors. Evidence class: Code-defined.

Submit star rating and comment. Log communication type email/WhatsApp/call/meeting/note, inbound/outbound direction, and description; inspect timestamped histories.

Original role context: Authenticated shop user

Verification gap: This records a communication log. It does not establish that the application sends an email, WhatsApp message, or call from this form.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F176` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/VendorDetailPage-CAFvfByQ.js`. Anchor: `vendorDetail.logCommunication`.

## REQ-PO: Purchase orders, approval, and goods receiving

Target behavior and acceptance: [REQ-PO](../product/requirements.md#req-po-purchase-orders-approval-and-goods-receiving).

### NoolTech F146: Automatic purchase-order configuration

Source module: Inventory. Evidence class: Code-defined.

An item can enable autoPurchaseOrder and choose a separate autoPoVendorId or its preferred vendor. Reorder level and reorder quantity are supplied to the save request.

Original role context: Authenticated shop user

Verification gap: The configuration fields and save payload exist. Automatic order generation, trigger timing, deduplication, and notifications were not observed.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F146` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/InventoryFormPage-CApyL_Vg.js`. Anchor: `autoPurchaseOrder`.

### NoolTech F177: Purchase-order register and filters

Source module: Purchase orders. Evidence class: Code-defined.

Search order number/vendor, filter Draft/Approved/Ordered/PartiallyReceived/Received/Cancelled, inspect order number/vendor/date/items/payment/amount/actions, and see count/value/pending/received summaries.

Original role context: Authenticated shop user

Verification gap: Client action, form, or service definition exists. Server execution, persistence, and access enforcement were not tested by this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F177` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/PurchaseOrdersPage-BcSxYpKv.js`. Anchor: `PartiallyReceived`.

### NoolTech F178: Create and edit purchase order

Source module: Purchase orders. Evidence class: Code-defined.

Select vendor, add line descriptions/quantities/unit prices, calculate line and order totals, and add notes. Can link each line to stock, quick-create inventory, or quick-create a vendor. At least one described item with positive quantity and a vendor are required.

Original role context: Authenticated shop user

Verification gap: Client action, form, or service definition exists. Server execution, persistence, and access enforcement were not tested by this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F178` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/PurchaseOrdersPage-BcSxYpKv.js`. Anchor: `createPurchaseOrder`.

### NoolTech F179: Quick-create linked inventory from a purchase order

Source module: Purchase orders. Evidence class: Code-defined.

Quick-create stock item with generated INV- SKU, name, category, unit, cost, preferred vendor, zero opening stock, reorder level five, and reorder quantity twenty.

Original role context: Authenticated shop user

Verification gap: Client action, form, or service definition exists. Server execution, persistence, and access enforcement were not tested by this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F179` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/ViewPurchaseOrderModal-C06Az6In.js`. Anchor: `INV-`.

### NoolTech F180: Approve purchase order

Source module: Purchase orders. Evidence class: Code-defined.

Approval invokes /api/vendors/purchase-orders/:id/approve; detail can display approvedBy and approvedAt.

Original role context: Authenticated shop user

Verification gap: Client action, form, or service definition exists. Server execution, persistence, and access enforcement were not tested by this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F180` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/ViewPurchaseOrderModal-C06Az6In.js`. Anchor: `approvePurchaseOrder`.

### NoolTech F181: Receive full or partial goods

Source module: Purchase orders. Evidence class: Code-defined.

Enter receive-now quantities bounded between zero and each line's remaining ordered quantity, add receipt notes, and confirm receipt. Requires at least one positive receive quantity; response supplies a GRN and updated PO.

Original role context: Authenticated shop user

Verification gap: Client action, form, or service definition exists. Server execution, persistence, and access enforcement were not tested by this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F181` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/ViewPurchaseOrderModal-C06Az6In.js`. Anchor: `receiveItems`.

### NoolTech F182: Goods received note history

Source module: Purchase orders. Evidence class: Code-defined.

Inspect partial/full GRNs, receipt number, receiver, date, received value, item quantities, and notes.

Original role context: Authenticated shop user

Verification gap: Client action, form, or service definition exists. Server execution, persistence, and access enforcement were not tested by this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F182` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/ViewPurchaseOrderModal-C06Az6In.js`. Anchor: `Goods Received Notes (GRN History)`.

### NoolTech F183: Purchase payment and delivery state

Source module: Purchase orders. Evidence class: Code-defined.

Toggle payment between Pending/Paid. Show expected and actual delivery dates, overdue/late/on-time indicators, subtotal/GST/grand total when present, and notes. A legacy mark-received path is also defined.

Original role context: Authenticated shop user

Verification gap: Client action, form, or service definition exists. Server execution, persistence, and access enforcement were not tested by this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F183` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/ViewPurchaseOrderModal-C06Az6In.js`. Anchor: `paymentStatus`.

### NoolTech F184: Purchase-order analytics

Source module: Purchase orders. Evidence class: Code-defined.

Total spend, average order value, on-time delivery, order-status distribution, monthly spend, and top vendors.

Original role context: Authenticated shop user

Verification gap: Client action, form, or service definition exists. Server execution, persistence, and access enforcement were not tested by this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F184` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/PurchaseOrdersPage-BcSxYpKv.js`. Anchor: `getPOAnalytics`.

### NoolTech F185: Delete purchase order

Source module: Purchase orders. Evidence class: Code-defined.

Register defines deletePurchaseOrder with confirmation; its presentation checks platform_admin before relevant destructive controls.

Original role context: Platform admin in the client presentation

Verification gap: Role-conditional UI and delete call exist. Server authorization and deletion restrictions were not tested.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F185` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/PurchaseOrdersPage-BcSxYpKv.js`. Anchor: `deletePurchaseOrder`.

### NoolTech F186: Cancel purchase order

Source module: Purchase orders. Evidence class: Code-defined.

Platform-admin presentation defines Cancel Order with confirmation for orders not already cancelled. Saves status Cancelled and reloads the register. UI says cancelled orders are excluded from active metrics.

Original role context: Platform admin in the client presentation

Verification gap: Client cancellation action and explanatory copy exist. Server authorization, stock effects, and metric recalculation were not tested.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F186` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/PurchaseOrdersPage-BcSxYpKv.js`. Anchor: `This will exclude it from active metrics.`.

## REQ-TRANSFER: Inter-location stock transfers

Target behavior and acceptance: [REQ-TRANSFER](../product/requirements.md#req-transfer-inter-location-stock-transfers).

### NoolTech F154: Dispatch inter-branch stock transfer

Source module: Inventory. Evidence class: Code-defined.

Select source and destination branch, positive integer quantity no greater than current stock, and notes. The service receives itemId, quantity, fromLocationId, toLocationId, and notes. Different locations are required by client validation.

Original role context: Authenticated shop user

Verification gap: Client action, form, or service definition exists. Server execution, persistence, and access enforcement were not tested by this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F154` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/InventoryItemPage-DMAMvDYp.js`. Anchor: `initiateTransfer`.

### NoolTech F155: Receive or cancel stock transfer

Source module: Inventory. Evidence class: Code-defined.

Incoming transfer panel has in-transit and history tabs, refresh, mark-as-received, and cancellation with a reason. UI copy says cancellation returns stock to source. States shown are in_transit/completed/cancelled.

Original role context: Authenticated shop user

Verification gap: Actions and states exist. Physical receipt, stock movement atomicity, and reversal behavior were not executed.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F155` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/InventoryListPage-CHPeDHmS.js`. Anchor: `receiveTransfer`.

## REQ-COUNT: Physical stock reconciliation

Target behavior and acceptance: [REQ-COUNT](../product/requirements.md#req-count-physical-stock-reconciliation).

### NoolTech F161: Start or resume physical count

Source module: Stock reconciliation. Evidence class: Code-defined.

Start snapshots system stock. Opening the page resumes a draft with items, restoring saved physical counts. History lists date, performer, draft/posted status, and adjustment count.

Original role context: Authenticated shop user

Verification gap: Client action, form, or service definition exists. Server execution, persistence, and access enforcement were not tested by this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F161` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/InventoryReconciliationPage-KIJfuWDe.js`. Anchor: `startReconciliation`.

### NoolTech F162: Enter and save physical counts

Source module: Stock reconciliation. Evidence class: Code-defined.

Search by item name or SKU, enter non-negative physical counts, compare against system stock, and save counts. Variances derive as physicalCount minus systemStock.

Original role context: Authenticated shop user

Verification gap: Client action, form, or service definition exists. Server execution, persistence, and access enforcement were not tested by this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F162` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/InventoryReconciliationPage-KIJfuWDe.js`. Anchor: `updateReconciliationCounts`.

### NoolTech F163: Review and post stock adjustments

Source module: Stock reconciliation. Evidence class: Code-defined.

Three steps are Start Count, Count Items, Review & Post. Review shows counted items, variance count, additions, removals, net change, and estimated impact. Post permanently applies adjustments according to UI copy; prior sessions can be viewed.

Original role context: Authenticated shop user

Verification gap: Client action, form, or service definition exists. Server execution, persistence, and access enforcement were not tested by this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F163` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/InventoryReconciliationPage-KIJfuWDe.js`. Anchor: `postReconciliation`.

## REQ-LABEL: Barcode, QR, scanning, and label printing

Target behavior and acceptance: [REQ-LABEL](../product/requirements.md#req-label-barcode-qr-scanning-and-label-printing).

### NoolTech F117: Product barcode printing

Source module: Products. Evidence class: Code-defined.

Prints CODE128 labels for SKU with configurable copies, optional sequential serial, price/name/brand/sizes, and thermal or A4 layouts.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F117` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/ProductsPage-D1kOIwvu.js`. Anchor: `format:"CODE128"`.

### NoolTech F118: Thermal and A4 label formats

Source module: Products. Evidence class: Code-defined.

Supports 58 mm and 80 mm thermal, A4 2x5, A4 3x8, and full-page layout options.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F118` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/ProductsPage-D1kOIwvu.js`. Anchor: `a4_24:`.

### NoolTech F158: Camera and hardware barcode lookup

Source module: Inventory. Evidence class: Code-defined.

Look up stock from camera scans or keyboard input from USB/Bluetooth scanners. UI mentions Code128 and QR support. It handles denied camera permission, camera error, item-found state, view item, scan another item, and quick receive quantity.

Original role context: Authenticated shop user

Verification gap: Client action, form, or service definition exists. Server execution, persistence, and access enforcement were not tested by this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F158` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/InventoryListPage-CHPeDHmS.js`. Anchor: `USB / Bluetooth scanner?`.

### NoolTech F159: Item QR download and label print

Source module: Inventory. Evidence class: Code-defined.

Generate an item QR code, download its image, and print a product label from item detail.

Original role context: Authenticated shop user

Verification gap: Client action, form, or service definition exists. Server execution, persistence, and access enforcement were not tested by this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F159` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/InventoryItemPage-DMAMvDYp.js`. Anchor: `inventoryItem.downloadQR`.

### NoolTech F168: Batch barcode and QR label printing

Source module: Barcode labels. Evidence class: Code-defined.

Search/select items, select all, set per-item copies, preview labels, and print CODE128 labels with an item QR preview. Label sizes are 50x25, 40x20, and 30x15 millimeters. Copies input declares 1..9999.

Original role context: Authenticated shop user

Verification gap: Client action, form, or service definition exists. Server execution, persistence, and access enforcement were not tested by this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F168` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/BarcodeLabelsPage-DAxOMxZW.js`. Anchor: `CODE128`.

### NoolTech F169: Sequential label serial numbers

Source module: Barcode labels. Evidence class: Code-defined.

Toggle serial-number printing, select a starting serial, show the ending serial, reset to one, and remember the last serial in localStorage under barcode_serial_last.

Original role context: Authenticated shop user

Verification gap: These are print-label serial counters stored locally. They do not establish inventory serial identity or uniqueness enforcement.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F169` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/BarcodeLabelsPage-DAxOMxZW.js`. Anchor: `barcode_serial_last`.

## REQ-INVREPORT: Inventory and supplier analytics

Target behavior and acceptance: [REQ-INVREPORT](../product/requirements.md#req-invreport-inventory-and-supplier-analytics).

### NoolTech F153: Demand forecast and reorder suggestion

Source module: Inventory. Evidence class: Code-defined.

Item detail requests a 30-day demand forecast and displays average daily sales, suggested reorder, days until stockout, and actual/forecast chart series.

Original role context: Authenticated shop user

Verification gap: The forecast request and display exist. Model, accuracy, minimum history, and calculation implementation are server-side and unverified.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F153` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/InventoryItemPage-DMAMvDYp.js`. Anchor: `getDemandForecast`.

### NoolTech F157: Accounting software exports

Source module: Inventory. Evidence class: Code-defined.

Export inventory in Tally XML, QuickBooks IIF, or Zoho CSV format through /api/inventory/export/accounting?format=... .

Original role context: Authenticated shop user

Verification gap: Client action, form, or service definition exists. Server execution, persistence, and access enforcement were not tested by this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F157` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/InventoryListPage-CHPeDHmS.js`. Anchor: `QuickBooks IIF`.

### NoolTech F164: Stock turnover report

Source module: Inventory reports. Evidence class: Code-defined.

From/to dates; item/SKU/total sold/average stock/turnover-rate rows; top ten turnover chart; CSV export.

Original role context: Authenticated shop user

Verification gap: Client action, form, or service definition exists. Server execution, persistence, and access enforcement were not tested by this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F164` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/InventoryReportsPage-CcvOa6-f.js`. Anchor: `getTurnoverReport`.

### NoolTech F165: Slow-moving and aging stock report

Source module: Inventory reports. Evidence class: Code-defined.

Choose a no-movement day threshold, load stock with no movement, and export name, SKU, category, stock, and stock value.

Original role context: Authenticated shop user

Verification gap: Client action, form, or service definition exists. Server execution, persistence, and access enforcement were not tested by this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F165` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/InventoryReportsPage-CcvOa6-f.js`. Anchor: `getAgingReport`.

### NoolTech F166: Material consumption report

Source module: Inventory reports. Evidence class: Code-defined.

Date range; item, total consumed, and total cost; top ten consumption chart; CSV export.

Original role context: Authenticated shop user

Verification gap: Client action, form, or service definition exists. Server execution, persistence, and access enforcement were not tested by this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F166` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/InventoryReportsPage-CcvOa6-f.js`. Anchor: `getConsumptionReport`.

### NoolTech F167: Supplier performance report

Source module: Inventory reports. Evidence class: Code-defined.

Enter a vendor ID and optional from date to inspect total purchase orders, total items ordered, average lead time, and transaction history with item, quantity, and unit cost.

Original role context: Authenticated shop user

Verification gap: Client action, form, or service definition exists. Server execution, persistence, and access enforcement were not tested by this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F167` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/InventoryReportsPage-CcvOa6-f.js`. Anchor: `getSupplierPerformance`.

## REQ-WORKER: Worker records, staff linkage, and assignments

Target behavior and acceptance: [REQ-WORKER](../product/requirements.md#req-worker-worker-records-staff-linkage-and-assignments).

### Tailorman F163: Employee directory

Source module: Employees and staff access. Evidence class: Code-defined.

List name, email, admin/cashier/cutter/stitcher role, active status, and added date. Desktop tables and mobile cards open the same edit dialog.

Original role context: Admin

Verification gap: Code-defined. No authenticated execution or persisted result was observed in this source review.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F163` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/employees.js`. Anchor: `async function load()`.

### Tailorman F164: Create staff account

Source module: Employees and staff access. Evidence class: Code-defined.

Require name, email, and password of at least six characters, with a role. Use a secondary Firebase Auth app to keep the admin signed in, then create tenant user profile and userTenants index. Show a persistent hint to share sign-in details manually.

Original role context: Admin

Verification gap: Code-defined. Auth-account and profile creation are separate operations. No account was created.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F164` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/employees.js`. Anchor: `async function onAdd(e)`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/db.js`. Anchor: `export async function createEmployeeAccount(`.

### Tailorman F166: Edit staff details and roles

Source module: Employees and staff access. Evidence class: Code-defined.

Change name, role, and active status. The email input is disabled and the form instructs admins to replace an account with an incorrect email. Update the tenant profile and mirror a changed role into the global userTenants index.

Original role context: Admin

Verification gap: Code-defined. Active-state sign-out behavior belongs to authentication handling; this review did not execute deactivation or role changes.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F166` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/employees.js`. Anchor: `function openEditDialog(emp)`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/db.js`. Anchor: `export async function updateEmployeeProfile(`.

### Tailormate F054: Assign staff and piece rate to a garment

Source module: Order detail. Evidence class: Code-defined.

The Assign Staff dialog loads staff and the selected worker garment rate. It defaults the rate from the worker/dress mapping, permits editing it, and sends assign_to_user_id and assigned_to_user_rate with the garment ID.

Original role context: Signed-in shop user with relevant page access; server authorization unverified.

Verification gap: Code-defined. This source review did not observe a successful write, populated record, payment, message, or server-side permission check.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F054` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/orders/%5Btype%5D/%5BorderId%5D/page-b6d17c0c752aa831.js`. Anchor: `children:"Assign Staff"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/orders/%5Btype%5D/%5BorderId%5D/page-b6d17c0c752aa831.js`. Anchor: `assigned_to_user_rate:e.rate`.

### Tailormate F055: Assignment history display

Source module: Order detail. Evidence class: Code-defined.

The staff dialog lists assignment history with worker name, role, assigned rate, assigned date, and Assigned/Started/Completed status. Update Status selects only update a local status map in this module; no persistence action for that map was found.

Original role context: Signed-in shop user with relevant page access; server authorization unverified.

Verification gap: Static display and local-state controls only. A successful persisted assignment-history status change was not established.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F055` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/orders/%5Btype%5D/%5BorderId%5D/page-b6d17c0c752aa831.js`. Anchor: `children:"Work Assignment History"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/orders/%5Btype%5D/%5BorderId%5D/page-b6d17c0c752aa831.js`. Anchor: `1:"Assigned",2:"Started",3:"Completed"`.

### Tailormate F111: Shop worker directory

Source module: Workers. Evidence class: Code-defined.

List workers with full name and role together, country dial code and mobile number. Row actions edit, remove, and conditionally open piece-rate setup.

Original role context: Signed-in shop user with access to this module. The parent inventory covers navigation permission checks. Backend authorization and other accounts were not tested.

Verification gap: Code-defined. No persisted business action or successful server result was exercised by this static review.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F111` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/workers/worker-list/page-b8f30e109a1a06cf.js`. Anchor: `accessorKey:"user_full_name with role_name"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/workers/worker-list/page-b8f30e109a1a06cf.js`. Anchor: `header:"Phone"`.

### Tailormate F112: Create and edit shop users

Source module: Workers. Evidence class: Code-defined.

Create or edit user name, country-code mobile number, optional email, role and one or more shop locations. Name requires three characters, mobile is required, email is empty or syntactically valid, and at least one shop is required. The payload includes user_type 1 and a shop_roles entry for each selected location.

Original role context: Signed-in shop user with access to this module. The parent inventory covers navigation permission checks. Backend authorization and other accounts were not tested.

Verification gap: Code-defined. No persisted business action or successful server result was exercised by this static review.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F112` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/workers/worker-list/page-b8f30e109a1a06cf.js`. Anchor: `message:"User name must be at least 3 characters."`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/workers/worker-list/page-b8f30e109a1a06cf.js`. Anchor: `shop_ids:b.z.array(S.uf).min(1`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/workers/worker-list/page-b8f30e109a1a06cf.js`. Anchor: `user_type:"1"`.

### Tailormate F113: Multiple shop assignments

Source module: Workers. Evidence class: Code-defined.

Shop-location selection is a searchable multi-select. Save maps every shop ID to the selected role_id. Editing restores existing shop_roles as selected location options.

Original role context: Signed-in shop user with access to this module. The parent inventory covers navigation permission checks. Backend authorization and other accounts were not tested.

Verification gap: Code-defined. No persisted business action or successful server result was exercised by this static review.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F113` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/workers/worker-list/page-b8f30e109a1a06cf.js`. Anchor: `shop_roles:j()(null==e?void 0:e.shop_ids`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/workers/worker-list/page-b8f30e109a1a06cf.js`. Anchor: `label:"Select Shop Location"`.

### Tailormate F114: Immutable existing worker mobile

Source module: Workers. Evidence class: Code-defined.

When editing a user, the phone control is disabled. Tooltip guidance says to delete the existing user and create a new one to change the mobile number.

Original role context: Signed-in shop user with access to this module. The parent inventory covers navigation permission checks. Backend authorization and other accounts were not tested.

Verification gap: Code-defined. No persisted business action or successful server result was exercised by this static review.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F114` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/workers/worker-list/page-b8f30e109a1a06cf.js`. Anchor: `To update the mobile number, delete the existing user and create a new one.`.

### Tailormate F118: Remove a shop user

Source module: Workers. Evidence class: Code-defined.

Delete opens confirmation and invokes the worker save helper with the target user_id and is_active 0. The code requests directory deactivation, not proof that the authentication identity is deleted.

Original role context: Signed-in shop user with access to this module. The parent inventory covers navigation permission checks. Backend authorization and other accounts were not tested.

Verification gap: Code-defined. No persisted business action or successful server result was exercised by this static review.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F118` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/workers/worker-list/page-b8f30e109a1a06cf.js`. Anchor: `User removed successfully!`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/9491-bcd4f8939976b832.js`. Anchor: `"/saveuser"`.

### Tailormate F131: Task assignment summary

Source module: Worker assignments. Evidence class: Code-defined.

Task Assignments lists worker name, job role, task name and job count. Clicking a row queries assignments for that worker and task and opens a modal titled with the task and worker.

Original role context: Signed-in shop user with access to this module. The parent inventory covers navigation permission checks. Backend authorization and other accounts were not tested.

Verification gap: Code-defined. No persisted business action or successful server result was exercised by this static review.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F131` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/workers/task-assignments/page-577ad927534be0d2.js`. Anchor: `children:"Task Name"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/workers/task-assignments/page-577ad927534be0d2.js`. Anchor: `assigned_user_id:null!==(s=null==m?void 0:m.userId)`.

### Tailormate F132: Dress assignment summary

Source module: Worker assignments. Evidence class: Code-defined.

Dress Assignments groups active job counts by worker with worker name and role. Clicking a worker queries their dress-assignment list and opens Assigned Items with that name.

Original role context: Signed-in shop user with access to this module. The parent inventory covers navigation permission checks. Backend authorization and other accounts were not tested.

Verification gap: Code-defined. No persisted business action or successful server result was exercised by this static review.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F132` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/workers/dress-assignments/page-65843b034bce11c7.js`. Anchor: `children:"Jobs"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/workers/dress-assignments/page-65843b034bce11c7.js`. Anchor: `dialogTitle:"Assigned Items (".concat(x.name`.

### Tailormate F133: Assignment item detail

Source module: Worker assignments. Evidence class: Code-defined.

Assignment lists show garment thumbnail or fallback, garment name, order number, shop location and due date. Selecting an item loads its order and garment detail into a nested dialog. A VIEW_PRICE permission check determines whether that detail component receives price visibility.

Original role context: Signed-in shop user with access to this module. The parent inventory covers navigation permission checks. Backend authorization and other accounts were not tested.

Verification gap: Code-defined. No persisted business action or successful server result was exercised by this static review.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F133` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/1702-93fae2de0ab3bd23.js`. Anchor: `q=D("VIEW_PRICE")`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/1702-93fae2de0ab3bd23.js`. Anchor: `S(e.order_id,e.order_dress_id)`.

### NoolTech F187: Worker register and summary

Source module: Workers. Evidence class: Code-defined.

Search by worker name/role, inspect total team members, active assignments, completed orders, and per-worker activity.

Original role context: Authenticated shop user

Verification gap: Client action, form, or service definition exists. Server execution, persistence, and access enforcement were not tested by this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F187` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/WorkerPage-D64qXX_y.js`. Anchor: `workers.activeAssignmentCount`.

### NoolTech F188: Create, edit, and remove worker

Source module: Workers. Evidence class: Code-defined.

Name is required. Worker fields include role, phone, email, and notes. Role choices are Tailor, Master Cutter, Measuring, Cutting, Stitching, Finishing, Embroidery, Quality Check, Helper, and Other.

Original role context: Authenticated shop user

Verification gap: Client action, form, or service definition exists. Server execution, persistence, and access enforcement were not tested by this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F188` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/WorkerPage-D64qXX_y.js`. Anchor: `workers.roleQualityCheck`.

### NoolTech F189: Worker profile photo

Source module: Workers. Evidence class: Code-defined.

Upload a worker profile photo and resolve its protected URL. A delete-photo method also exists in the worker service.

Original role context: Authenticated shop user

Verification gap: Client action, form, or service definition exists. Server execution, persistence, and access enforcement were not tested by this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F189` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/dependencies/worker.service-DmuRcj22.js`. Anchor: `uploadPhoto`.

### NoolTech F190: Worker assignments

Source module: Workers. Evidence class: Code-defined.

View assigned order number/customer/task role/delivery date/item count/order amount. Assignment states shown are assigned, in-progress, and completed.

Original role context: Authenticated shop user

Verification gap: Client action, form, or service definition exists. Server execution, persistence, and access enforcement were not tested by this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F190` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/WorkerPage-D64qXX_y.js`. Anchor: `getAssignments`.

### NoolTech F191: Link worker to staff login

Source module: Workers. Evidence class: Code-defined.

An admin can choose a non-admin, non-suspended team member or unlink the login. UI says assigned orders then appear under My work on that login's production board.

Original role context: Shop admin

Verification gap: Client action, form, or service definition exists. Server execution, persistence, and access enforcement were not tested by this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F191` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/WorkerPage-D64qXX_y.js`. Anchor: `linkLogin`.

## REQ-ROLE: Granular permissions and location membership

Target behavior and acceptance: [REQ-ROLE](../product/requirements.md#req-role-granular-permissions-and-location-membership).

### Tailorman F187: Four shop roles and page guards

Source module: Identity and access. Evidence class: Code-defined.

Defines admin, cashier, cutter and stitcher roles. Page guards redirect unauthenticated users to login, super administrators to their console, mismatched roles to dashboard, and excluded plan features to dashboard after a notice. The sidebar and mobile navigation vary by role and plan flags.

Original role context: Admin; cashier; cutter; stitcher

Verification gap: Client guards and visibility rules were inspected. Firestore and Storage rules were not available, so server enforcement remains unverified.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F187` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/auth.js`. Anchor: `export const ROLES = ["admin", "cutter", "stitcher", "cashier"];`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/auth.js`. Anchor: `export function requireAuth(allowedRoles = null, { feature = null } = {})`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/ui.js`. Anchor: `const NAV_GROUPS = [`.

### Tailormate F115: Preview role permissions

Source module: Workers. Evidence class: Code-defined.

View Permissions opens a separate role selector and a disabled permission checkbox list populated from the role detail. This dialog previews permission choices rather than editing them.

Original role context: Signed-in shop user with access to this module. The parent inventory covers navigation permission checks. Backend authorization and other accounts were not tested.

Verification gap: Code-defined. No persisted business action or successful server result was exercised by this static review.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F115` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/workers/worker-list/page-b8f30e109a1a06cf.js`. Anchor: `"View Permissions"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/workers/worker-list/page-b8f30e109a1a06cf.js`. Anchor: `disabled:!0,control:i,name:"permissions"`.

### Tailormate F119: Role editor

Source module: Roles and permissions. Evidence class: Code-defined.

Create or edit a role name and selected permission IDs from the server permission catalog. Save converts IDs into permission_id objects and includes role_id on edits. The Zod object requires strings/array shapes but has no explicit nonempty role-name minimum in the inspected schema.

Original role context: Signed-in shop user with access to this module. The parent inventory covers navigation permission checks. Backend authorization and other accounts were not tested.

Verification gap: Code-defined. No persisted business action or successful server result was exercised by this static review.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F119` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/workers/roles-and-permissions/page-ff9ab0dbf4d64dbd.js`. Anchor: `permissions:v.z.array(v.z.string()),role_name:v.z.string()`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/workers/roles-and-permissions/page-ff9ab0dbf4d64dbd.js`. Anchor: `permissions:e.permissions.map(e=>({permission_id:e}))`.

### Tailormate F120: Existing role permissions

Source module: Roles and permissions. Evidence class: Code-defined.

Editing fetches the selected role details and resets selected permissions from its permission list. Permission checkbox labels use permission_desc while values use permission_id.

Original role context: Signed-in shop user with access to this module. The parent inventory covers navigation permission checks. Backend authorization and other accounts were not tested.

Verification gap: Code-defined. No persisted business action or successful server result was exercised by this static review.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F120` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/workers/roles-and-permissions/page-ff9ab0dbf4d64dbd.js`. Anchor: `label:e.permission_desc,value:e.permission_id`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/workers/roles-and-permissions/page-ff9ab0dbf4d64dbd.js`. Anchor: `role_name:n.role_name`.

### Tailormate F121: Built-in role protection

Source module: Roles and permissions. Evidence class: Code-defined.

Roles whose user_id is 0 have no edit/delete row actions. Custom roles expose both controls. This is a client display rule, not tested server enforcement.

Original role context: Signed-in shop user with access to this module. The parent inventory covers navigation permission checks. Backend authorization and other accounts were not tested.

Verification gap: Code-defined. No persisted business action or successful server result was exercised by this static review.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F121` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/workers/roles-and-permissions/page-ff9ab0dbf4d64dbd.js`. Anchor: `"0"===l.original.user_id?null:`.

### Tailormate F122: Deactivate a custom role

Source module: Roles and permissions. Evidence class: Code-defined.

Custom role removal confirms the action and calls the role mutation with role_id and inactive state through saverole, then invalidates role queries.

Original role context: Signed-in shop user with access to this module. The parent inventory covers navigation permission checks. Backend authorization and other accounts were not tested.

Verification gap: Code-defined. No persisted business action or successful server result was exercised by this static review.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F122` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/workers/roles-and-permissions/page-ff9ab0dbf4d64dbd.js`. Anchor: `Role removed successfully!`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/7970-0d13abf020d20796.js`. Anchor: `"/saverole"`.

### Tailormate F161: Initial shop and web-access admission

Source module: Workspace access and permissions. Evidence class: Code-defined.

The app loads per-shop user permissions and selects a shop whose permissions contain WEB_ACCESS. A user with no shop_id goes to first-store setup. When permissions exist but none include WEB_ACCESS, the client removes local auth state, clears queries, and returns to sign-in.

Original role context: Signed-in shop user; client permissions and selected-shop context apply

Verification gap: Code-defined. This source review did not execute the action, verify a persisted result, or test backend authorization. Parent browser observations provide separate screen context.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F161` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/layout-7a41b882bc0f5805.js`. Anchor: `return"WEB_ACCESS"===e`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/layout-7a41b882bc0f5805.js`. Anchor: `redirect)("/create-shop")`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/layout-7a41b882bc0f5805.js`. Anchor: `localStorage.removeItem(p.E.token)`.

### Tailormate F162: Granular navigation permissions

Source module: Workspace access and permissions. Evidence class: Code-defined.

Navigation derives visibility from VIEW_REPORTS, MANAGE_PAYMENTS, ADD_ORDER, VIEW_CUST, VIEW_GALLERY, VIEW_TASK, and ADMIN_CTRL. Metrics requires both reports and payment permission. Orders remains a group while Add Order has its own gate. Inventory and Work Calendar are not hidden by those menu flags in the inspected menu builder.

Original role context: Signed-in shop user; client permissions and selected-shop context apply

Verification gap: Code-defined menu behavior. Hidden navigation does not prove a server-side denial or that the same guard protects direct navigation.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F162` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/1892-b3ffd2b6cbf9e410.js`. Anchor: `let eU=e=>`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/1892-b3ffd2b6cbf9e410.js`. Anchor: `hidden:!o||!l,icon:eV.Z,title:"Metrics"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/1892-b3ffd2b6cbf9e410.js`. Anchor: `href:"/work-calendar"`.

### Tailormate F163: Per-shop permission lookup

Source module: Workspace access and permissions. Evidence class: Code-defined.

Permission queries use user_id and return user_permissions. Permission checks inspect the selected shop permission strings. A selected shop_id of -1 acts as an all-shops sentinel and returns true from the client permission helper.

Original role context: Signed-in shop user; client permissions and selected-shop context apply

Verification gap: Code-defined. The sentinel behavior is a client convenience, not evidence that an unauthorized server request is accepted.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F163` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/1892-b3ffd2b6cbf9e410.js`. Anchor: `get("/getuserpermissions",{params:{user_id:e}})`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/1892-b3ffd2b6cbf9e410.js`. Anchor: `isPermissionGranted:t=>(null==e?void 0:e.shop_id)===c.Md`.

### NoolTech F139: Financial visibility permission

Source module: Access and refresh. Evidence class: Code-defined.

Client treats seeShopMoney=false as restriction; absent permission defaults to allowed and affects financial navigation/prices.

Original role context: Admin, manager, or permitted staff

Verification gap: Client gating is code-defined; backend authorization enforcement is unverified.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F139` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/index-Dk-7hFgw.js`. Anchor: `l.seeShopMoney)!==!1`.

### NoolTech F233: Team invitations and lifecycle

Source module: Team access. Evidence class: Code-defined.

Invite with first/last name, email, optional phone, and tailor/staff/manager role; list usage, resend invitation, suspend/activate, or remove a member. Manager option is plan-gated.

Original role context: Shop admin or authorized team administrator

Verification gap: Client action, form, or service definition exists. Server execution, persistence, and access enforcement were not tested by this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F233` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/SettingsPage-BspbE0gu.js`. Anchor: `resendInvitation`.

### NoolTech F234: Manager, staff, and custom permissions

Source module: Team access. Evidence class: Code-defined.

Permission editor presets manager={seeShopMoney:true,changePrices:true}, staff={false,false}; custom combinations are allowed. Money covers Finances/Insights/reports/today's collection; price access covers final amount/discount/item prices. UI says everyone can see each order amount and take payments.

Original role context: Shop admin

Verification gap: Client permission definitions and PATCH /users/:id/access exist. Server enforcement and every gated screen were not tested.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F234` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/dependencies/user.service-CrehS6oa.js`. Anchor: `seeShopMoney`.

## REQ-WAGE: Earnings, salary, advances, and payouts

Target behavior and acceptance: [REQ-WAGE](../product/requirements.md#req-wage-earnings-salary-advances-and-payouts).

### Tailorman F168: Per-piece cutting and stitching rates

Source module: Wages and settlements. Evidence class: Code-defined.

Read separate numeric master rates for cutting and stitching. The wage screen shows both rates and a Settings shortcut when neither is configured; zero-rate groups cannot be marked paid.

Original role context: Admin, wages entitlement

Verification gap: Code-defined. No authenticated execution or persisted result was observed in this source review.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F168` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/wages.js`. Anchor: `function renderRateBanner()`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/db.js`. Anchor: `export async function getWageSettings()`.

### Tailorman F169: Calculate pending wages

Source module: Wages and settlements. Evidence class: Code-defined.

Scan up to 500 non-deleted bills and 2000 wage payments. Assigned cutters qualify once current stage reaches Cutting Completed, and stitchers at Stitching Completed. Exclude previously paid bill/item/role keys, group by worker and role, and multiply item quantity by the current master rate.

Original role context: Admin, wages entitlement

Verification gap: Code-defined. No authenticated execution or persisted result was observed in this source review.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F169` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/db.js`. Anchor: `export async function listPendingWages()`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/db.js`. Anchor: `function addWageItem(`.

### Tailorman F170: Pending worker breakdown

Source module: Wages and settlements. Evidence class: Code-defined.

Show worker name, role, pieces, rate, amount due, overall totals, and expandable item rows linked to bills with garment, quantity, customer, stage, and line wage.

Original role context: Admin, wages entitlement

Verification gap: Code-defined. No authenticated execution or persisted result was observed in this source review.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F170` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/wages.js`. Anchor: `function groupCard(g, idx)`.

### Tailorman F171: Settle selected completed items

Source module: Wages and settlements. Evidence class: Code-defined.

Open a payment dialog with all eligible items selected. Select or clear all, choose any nonempty subset, and update item count and payout amount. Unticked items remain pending. Add optional notes and confirm payment; this settles whole selected item rows rather than a freely entered partial monetary amount.

Original role context: Admin, wages entitlement

Verification gap: Code-defined. No authenticated execution or persisted result was observed in this source review.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F171` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/wages.js`. Anchor: `function onPay(idx)`.

### Tailorman F172: Wage payment, finance, and audit records

Source module: Wages and settlements. Evidence class: Code-defined.

Store employee, role, rate, amount, pieces, item snapshots, notes, paid timestamp, and paying actor. Then create a cash expense ledger entry linked to the wage payment and emit wage.paid.

Original role context: Admin, wages entitlement

Verification gap: Code-defined. Wage document and linked ledger write are separate operations; no payout or failure recovery was tested.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F172` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/db.js`. Anchor: `export async function payWages(`.

### Tailorman F173: Wage payment history

Source module: Wages and settlements. Evidence class: Code-defined.

Load the latest 100 payments, showing employee, role, pieces, rate, amount, paid time, payer, notes, and expandable bill/item details. Refresh invalidates the cached history.

Original role context: Admin, wages entitlement

Verification gap: Code-defined. No authenticated execution or persisted result was observed in this source review.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F173` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/wages.js`. Anchor: `async function loadHistory()`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/wages.js`. Anchor: `function paymentCard(p, idx)`.

### Tailorman F174: Void mistaken wage settlement

Source module: Wages and settlements. Evidence class: Code-defined.

After confirmation, delete wage payment and its account entry together in a batch. The paid-index no longer contains those items, so they return to pending on reload; emit wage.voided audit data.

Original role context: Admin, wages entitlement

Verification gap: Code-defined. No authenticated execution or persisted result was observed in this source review.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F174` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/wages.js`. Anchor: `async function onVoidPayment(paymentId)`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/db.js`. Anchor: `export async function voidWagePayment(paymentId)`.

### Tailorman F175: Worker pending wage view

Source module: Wages and settlements. Evidence class: Code-defined.

Show own rate, today-earned pending amount and pieces, all pending amount and older pieces, with expandable bill/item breakdown. Today uses the first matching completion-stage timeline timestamp. Unknown completion dates fall into earlier items.

Original role context: Cutter or stitcher, own dashboard

Verification gap: Code-defined. No authenticated execution or persisted result was observed in this source review.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F175` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/dashboard.js`. Anchor: `async function loadMyWages(uid, role, host)`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/db.js`. Anchor: `export async function listMyPendingWages(uid, role)`.

### Tailorman F176: Worker payout history and 30-day summary

Source module: Wages and settlements. Evidence class: Code-defined.

Read the worker's latest 30 wage payments for display, show last payment and a 30-day total filtered from those returned records, and expand individual payouts with rate, quantity, payer, date, and notes.

Original role context: Cutter or stitcher, own dashboard

Verification gap: Code-defined. No authenticated execution or persisted result was observed in this source review.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F176` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/dashboard.js`. Anchor: `const recentAmt = recent.reduce(`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/db.js`. Anchor: `export async function listMyWagePayments(uid, max = 50)`.

### Tailormate F116: Dress piece rates per worker

Source module: Workers. Evidence class: Code-defined.

The wallet action appears only when can_assign_order equals 1. It loads garment types and existing worker dress rates, shows one numeric rate per garment, and saves user_dress_rates with dress_id, worker user_id, rate, and optional user_rate_id.

Original role context: Signed-in shop user with access to this module. The parent inventory covers navigation permission checks. Backend authorization and other accounts were not tested.

Verification gap: Code-defined. No persisted business action or successful server result was exercised by this static review.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F116` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/workers/worker-list/page-b8f30e109a1a06cf.js`. Anchor: `"1"===a.original.can_assign_order`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/workers/worker-list/page-b8f30e109a1a06cf.js`. Anchor: `user_dress_rates:s,user_id:null==f?void 0:f.user_id`.

### Tailormate F117: Clear an existing piece rate

Source module: Workers. Evidence class: Code-defined.

Blank or zero values for an existing rate are submitted with status_id 1. New blank or zero rates are omitted. Existing nonzero entries retain user_rate_id; new nonzero entries are submitted without it. The actual server meaning of status_id is not independently established.

Original role context: Signed-in shop user with access to this module. The parent inventory covers navigation permission checks. Backend authorization and other accounts were not tested.

Verification gap: Code-defined. No persisted business action or successful server result was exercised by this static review.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F117` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/workers/worker-list/page-b8f30e109a1a06cf.js`. Anchor: `e.user_rate_id&&(!e.rate||""===e.rate||"0"===e.rate)`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/workers/worker-list/page-b8f30e109a1a06cf.js`. Anchor: `status_id:"1"`.

### Tailormate F123: Dues report date and paid filters

Source module: Worker dues. Evidence class: Code-defined.

Show the last 180 days by default. Select start/end dates, Unpaid, Paid, or Paid & Unpaid, and group by worker name or date. startDate, endDate, paid and groupBy are restored from and synchronized into the URL.

Original role context: Signed-in shop user with access to this module. The parent inventory covers navigation permission checks. Backend authorization and other accounts were not tested.

Verification gap: Code-defined. No persisted business action or successful server result was exercised by this static review.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F123` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/workers/worker-dues/page-9bc4685a002c8f5b.js`. Anchor: `label:"Paid & Unpaid",value:"2"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/workers/worker-dues/page-9bc4685a002c8f5b.js`. Anchor: `e.set("paid",S.value)`.

### Tailormate F124: Worker earning rows and order drilldown

Source module: Worker dues. Evidence class: Code-defined.

Rows show work date or worker, order number, Dress/Task type, task name, paid label and rate. Grouping uses worker_name or task_end_time. Clicking a row opens its /orders/active/{order_id}. Worker-name groups with unpaid rows expose Pay.

Original role context: Signed-in shop user with access to this module. The parent inventory covers navigation permission checks. Backend authorization and other accounts were not tested.

Verification gap: Code-defined. No persisted business action or successful server result was exercised by this static review.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F124` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/workers/worker-dues/page-9bc4685a002c8f5b.js`. Anchor: `children:"Dress/Task"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/workers/worker-dues/page-9bc4685a002c8f5b.js`. Anchor: `r.push("/orders/active/".concat(e.order_id))`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/workers/worker-dues/page-9bc4685a002c8f5b.js`. Anchor: `"name"===R.value&&V(n)`.

### Tailormate F125: Select whole earning rows for payment

Source module: Worker dues. Evidence class: Code-defined.

Pay Workers loads unpaid rows for the selected worker and date range. Every returned dress_task_id starts selected. Users toggle individual rows or all rows. Total Due is the sum of selected rate values.

Original role context: Signed-in shop user with access to this module. The parent inventory covers navigation permission checks. Backend authorization and other accounts were not tested.

Verification gap: Code-defined. No persisted business action or successful server result was exercised by this static review.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F125` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/workers/worker-dues/page-9bc4685a002c8f5b.js`. Anchor: `S(new Set(p.worker_payment.map`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/workers/worker-dues/page-9bc4685a002c8f5b.js`. Anchor: `children:"Total Due:"`.

### Tailormate F126: Record worker payment

Source module: Worker dues. Evidence class: Code-defined.

Choose a payment mode from getpaymentmethods. Mark as Paid requires a nonempty selection, mode and nonzero selected total. Save sends total payment_amount, payment_mode, worker_user_id, and worker_payments containing dress_or_task, source_id and paid 1.

Original role context: Signed-in shop user with access to this module. The parent inventory covers navigation permission checks. Backend authorization and other accounts were not tested.

Verification gap: Code-defined. No persisted business action or successful server result was exercised by this static review.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F126` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/workers/worker-dues/page-9bc4685a002c8f5b.js`. Anchor: `disabled:0===M.size||!Y||z||!Z`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/workers/worker-dues/page-9bc4685a002c8f5b.js`. Anchor: `payment_amount:Z.toString(),payment_mode:Y.value`.

### Tailormate F127: Dues CSV export

Source module: Worker dues. Evidence class: Code-defined.

The server report export uses current dates, paid status and grouping plus rep_format csv and user_id. A successful response filename is downloaded as a worker-payment report.

Original role context: Signed-in shop user with access to this module. The parent inventory covers navigation permission checks. Backend authorization and other accounts were not tested.

Verification gap: Code-defined. No persisted business action or successful server result was exercised by this static review.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F127` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/workers/worker-dues/page-9bc4685a002c8f5b.js`. Anchor: `rep_format:"csv"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/workers/worker-dues/page-9bc4685a002c8f5b.js`. Anchor: `worker_payment_report.csv`.

### Tailormate F128: Payout report filters

Source module: Worker payouts. Evidence class: Code-defined.

Default dates span 180 days. Filter all workers or one worker and group by worker name or payment date. Filters persist as startDate, endDate, groupBy and worker query parameters.

Original role context: Signed-in shop user with access to this module. The parent inventory covers navigation permission checks. Backend authorization and other accounts were not tested.

Verification gap: Code-defined. No persisted business action or successful server result was exercised by this static review.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F128` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/workers/worker-payouts/page-7b4bab8819be29f0.js`. Anchor: `label:"All Workers"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/workers/worker-payouts/page-7b4bab8819be29f0.js`. Anchor: `e.set("worker",E.value)`.

### Tailormate F129: Payout rows and group totals

Source module: Worker payouts. Evidence class: Code-defined.

Show worker name or payment date, payment method, and payment_amount. Each worker/date group has a subtotal summing payment_amount across that group. The captured component is a report rather than a payout-edit or void workflow.

Original role context: Signed-in shop user with access to this module. The parent inventory covers navigation permission checks. Backend authorization and other accounts were not tested.

Verification gap: Code-defined. No persisted business action or successful server result was exercised by this static review.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F129` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/workers/worker-payouts/page-7b4bab8819be29f0.js`. Anchor: `children:"Payment Method"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/workers/worker-payouts/page-7b4bab8819be29f0.js`. Anchor: `t.date_of_payment?l()(t.date_of_payment).format(m.BE)`.

### Tailormate F130: Payout CSV export

Source module: Worker payouts. Evidence class: Code-defined.

Download a server-generated worker payout report for the current dates, group and optional worker using rep_format csv. Export handles a returned filename on success.

Original role context: Signed-in shop user with access to this module. The parent inventory covers navigation permission checks. Backend authorization and other accounts were not tested.

Verification gap: Code-defined. No persisted business action or successful server result was exercised by this static review.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F130` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/workers/worker-payouts/page-7b4bab8819be29f0.js`. Anchor: `worker_payout_report.csv`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/1702-93fae2de0ab3bd23.js`. Anchor: `"/getworkerpayoutreport"`.

### NoolTech F192: Worker salary configuration

Source module: Payroll. Evidence class: Code-defined.

Salary modes are monthly, daily, and piece_rate. Store monthlySalary, dailyRate, or garmentType/ratePerPiece entries. Monthly/daily values must be positive; piece-rate setup requires at least one named garment with a positive rate.

Original role context: Authenticated shop user

Verification gap: Client action, form, or service definition exists. Server execution, persistence, and access enforcement were not tested by this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F192` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/WorkerPayDialog-O6DOikM1.js`. Anchor: `salaryType`.

### NoolTech F193: Record salary, advance, piece payment, or deduction

Source module: Payroll. Evidence class: Code-defined.

Payment type salary/advance/piece_payment/deduction, positive finite amount, paid-on date no later than today, and optional trimmed notes. Refreshes worker payment history after save.

Original role context: Authenticated shop user

Verification gap: Client action, form, or service definition exists. Server execution, persistence, and access enforcement were not tested by this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F193` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/WorkerPayDialog-O6DOikM1.js`. Anchor: `piece_payment`.

### NoolTech F194: Monthly payroll summary

Source module: Payroll. Evidence class: Code-defined.

Navigate previous/next month through month/year query parameters; display each worker's summarized payment data, net payable, and total payable. Shares workerManagement entitlement.

Original role context: Authenticated shop user

Verification gap: Client action, form, or service definition exists. Server execution, persistence, and access enforcement were not tested by this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F194` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/PayrollSummaryPage-DoAUrQBA.js`. Anchor: `netPayable`.

## REQ-EXPENSE: Categorized expenses and recurring schedules

Target behavior and acceptance: [REQ-EXPENSE](../product/requirements.md#req-expense-categorized-expenses-and-recurring-schedules).

### Tailorman F143: Expense date and category filters

Source module: Expenses. Evidence class: Code-defined.

Default to the current month, require a valid ordered date range, fetch up to 200 expenses by date, and optionally filter the loaded rows by category.

Original role context: Admin, expenses entitlement

Verification gap: Code-defined. No authenticated execution or persisted result was observed in this source review.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F143` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/expenses.js`. Anchor: `async function load()`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/expenses.js`. Anchor: `function filtered()`.

### Tailorman F144: Expense entry and editing

Source module: Expenses. Evidence class: Code-defined.

Create or edit description, positive amount, date, category, and notes. Description and amount are required, and date must be valid.

Original role context: Admin, expenses entitlement

Verification gap: Code-defined. No authenticated execution or persisted result was observed in this source review.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F144` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/expenses.js`. Anchor: `async function onSave()`.

### Tailorman F145: Expense categories

Source module: Expenses. Evidence class: Code-defined.

Categories are Rent, Electricity, Staff Salary, Material Purchase, Equipment, Maintenance, Marketing, Transport, and Miscellaneous.

Original role context: Admin, expenses entitlement

Verification gap: Code-defined. No authenticated execution or persisted result was observed in this source review.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F145` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/db.js`. Anchor: `export const EXPENSE_CATEGORIES = [`.

### Tailorman F146: Expense finance posting

Source module: Expenses. Evidence class: Code-defined.

Save the expense then upsert expense_ID ledger data, with cash mode and the expense date as occurredAt. An edit rewrites the linked entry; a newly created expense emits expense.added.

Original role context: Admin, expenses entitlement

Verification gap: Code-defined. Expense and ledger writes are sequential and no live failure recovery was tested.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F146` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/db.js`. Anchor: `export async function saveExpense(id, data)`.

### Tailorman F147: Expense summary

Source module: Expenses. Evidence class: Code-defined.

Display total expenses, transaction count, highest-spend category, rounded average entry, row-level notes, and a table total for the currently filtered rows.

Original role context: Admin, expenses entitlement

Verification gap: Code-defined. No authenticated execution or persisted result was observed in this source review.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F147` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/expenses.js`. Anchor: `function renderKpis(rows)`.

### Tailorman F148: Delete expense and linked ledger entry

Source module: Expenses. Evidence class: Code-defined.

Confirm deletion, remove the expense, attempt removal of its expense_ID ledger entry, and emit expense.deleted. Ledger-cleanup failures are swallowed by removeAccountEntry.

Original role context: Admin, expenses entitlement

Verification gap: Code-defined. Cleanup errors are ignored by the helper, so ledger consistency after a failed cleanup is unverified.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F148` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/db.js`. Anchor: `export async function deleteExpense(id)`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/db.js`. Anchor: `async function removeAccountEntry(id)`.

### Tailormate F143: Expense-head master and scope

Source module: Expense heads. Evidence class: Code-defined.

Create, edit, list and deactivate expense names. A scope radio select offers Shop Level Expense 1, Item Level Expense 2, or Shop & Item Level Expense 3. The master supplies categories for actual daily expenses and order-level expenses.

Original role context: Signed-in shop user with access to this module. The parent inventory covers navigation permission checks. Backend authorization and other accounts were not tested.

Verification gap: Code-defined. No persisted business action or successful server result was exercised by this static review.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F143` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/admin/expenses/page-4141e559a0672a08.js`. Anchor: `s.ShopAndItemLevel="3"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/admin/expenses/page-4141e559a0672a08.js`. Anchor: `shop_expense_id:null==r?void 0:r.shop_expense_id`.

### Tailormate F144: Shop expense list and search

Source module: Daily shop expenses. Evidence class: Code-defined.

List daily expense name, expense date and amount for the selected shop. Client search filters expense_name case-insensitively. Expense-head definitions remain separate from these recorded spending entries.

Original role context: Signed-in shop user with access to this module. The parent inventory covers navigation permission checks. Backend authorization and other accounts were not tested.

Verification gap: Code-defined. No persisted business action or successful server result was exercised by this static review.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F144` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/shop-expenses/page-2dd9d2c8b34c6803.js`. Anchor: `"/getdailyexpenses"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/shop-expenses/page-2dd9d2c8b34c6803.js`. Anchor: `placeholder:"Search expense..."`.

### Tailormate F145: Create and edit daily expense

Source module: Daily shop expenses. Evidence class: Code-defined.

Select an expense head, enter amount and date, and save through adddailyexpenses or updatedailyexpenses. Payload fields are amount, expense_date, shop_expense_id and optional daily_expense_id, wrapped in daily_expenses. The amount schema is a string without an explicit positive-number bound.

Original role context: Signed-in shop user with access to this module. The parent inventory covers navigation permission checks. Backend authorization and other accounts were not tested.

Verification gap: Code-defined. No persisted business action or successful server result was exercised by this static review.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F145` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/shop-expenses/page-2dd9d2c8b34c6803.js`. Anchor: `amount:F.z.string(),expenseDate:F.z.date()`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/shop-expenses/page-2dd9d2c8b34c6803.js`. Anchor: `daily_expenses:[{...e}]`.

### Tailormate F146: Expense date restriction

Source module: Daily shop expenses. Evidence class: Code-defined.

The date picker is disabled during edits. On creation its maxDate is yesterday, produced by adding minus one day to today. That client configuration excludes today and future days from the normal picker.

Original role context: Signed-in shop user with access to this module. The parent inventory covers navigation permission checks. Backend authorization and other accounts were not tested.

Verification gap: Code-defined. No persisted business action or successful server result was exercised by this static review.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F146` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/shop-expenses/page-2dd9d2c8b34c6803.js`. Anchor: `disabled:!!r,label:"Date",maxDate:q()().add(-1,"day").toDate()`.

### Tailormate F147: Deactivate a daily expense

Source module: Daily shop expenses. Evidence class: Code-defined.

Confirmed removal posts daily_expenses with daily_expense_id and is_active 0 to updatedailyexpenses and invalidates expense queries.

Original role context: Signed-in shop user with access to this module. The parent inventory covers navigation permission checks. Backend authorization and other accounts were not tested.

Verification gap: Code-defined. No persisted business action or successful server result was exercised by this static review.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F147` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/shop-expenses/page-2dd9d2c8b34c6803.js`. Anchor: `daily_expenses:[{daily_expense_id:e,is_active:"0"}]`.

### NoolTech F201: Create and edit business expense

Source module: Expenses. Evidence class: Code-defined.

Required category, amount, description, and expense date; amount must exceed zero. Additional fields are payment method cash/card/upi/bank_transfer/cheque, reference/invoice/PO number, vendor, recurring flag, and frequency. Creation can include the current location ID.

Original role context: Authenticated shop user

Verification gap: Client action, form, or service definition exists. Server execution, persistence, and access enforcement were not tested by this code review.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F201` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/ExpenseListPage-DvkJNniZ.js`. Anchor: `Amount must be greater than 0`.

### NoolTech F202: Recurring expense configuration

Source module: Expenses. Evidence class: Code-defined.

A recurring expense requires daily/weekly/monthly/quarterly/yearly frequency. The service also reads upcoming recurring expenses for a selected location.

Original role context: Authenticated shop user

Verification gap: Client action, form, or service definition exists. Server execution, persistence, and access enforcement were not tested by this code review.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F202` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/dependencies/expense.service-CCxZP6CW.js`. Anchor: `getUpcomingRecurring`.

### NoolTech F203: Expense receipt attachments

Source module: Expenses. Evidence class: Code-defined.

Existing expenses support upload/open/delete of receipts or photos, with a client maximum of three attachments. URLs are supplied by the expense service.

Original role context: Authenticated shop user

Verification gap: Client action, form, or service definition exists. Server execution, persistence, and access enforcement were not tested by this code review.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F203` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/ExpenseListPage-DvkJNniZ.js`. Anchor: `Maximum 3 attachments allowed`.

### NoolTech F204: Expense register, filters, and summary

Source module: Expenses. Evidence class: Code-defined.

Search description/vendor/reference, filter category and payment method, paginate, and inspect total expenses, transaction count, average expense, and recurring-expense count for a period.

Original role context: Authenticated shop user

Verification gap: Client action, form, or service definition exists. Server execution, persistence, and access enforcement were not tested by this code review.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F204` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/ExpenseListPage-DvkJNniZ.js`. Anchor: `finances.expAvgExpense`.

### NoolTech F205: Delete expense

Source module: Expenses. Evidence class: Code-defined.

Expense register prompts for confirmation before deleteExpense and refreshes the data.

Original role context: Authenticated shop user

Verification gap: Client action, form, or service definition exists. Server execution, persistence, and access enforcement were not tested by this code review.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F205` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/ExpenseListPage-DvkJNniZ.js`. Anchor: `deleteExpense`.

### NoolTech F206: Expense categories

Source module: Expenses. Evidence class: Code-defined.

Read expense categories and define create/delete category service actions. UI category filter has an expenseCategoriesPL entitlement and Pro upsell.

Original role context: Authenticated shop user

Verification gap: Category service operations exist. A dedicated reachable category editor was not established in this review.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F206` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/dependencies/expense.service-CCxZP6CW.js`. Anchor: `createCategory`.

## REQ-LEDGER: Daybook, cashflow, and source-linked finance

Target behavior and acceptance: [REQ-LEDGER](../product/requirements.md#req-ledger-daybook-cashflow-and-source-linked-finance).

### Tailorman F136: Date-range daybook

Source module: Accounts and cashflow. Evidence class: Code-defined.

Load ledger movements between validated From and To dates, defaulting to this month through today. Show time, source, title, party, mode, signed amount, and optional note. Up to 500 rows are loaded.

Original role context: Admin

Verification gap: Code-defined. No authenticated execution or persisted result was observed in this source review.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F136` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/accounts.js`. Anchor: `async function loadAccounts()`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/accounts.js`. Anchor: `function renderList()`.

### Tailorman F137: Cashflow and boutique totals

Source module: Accounts and cashflow. Evidence class: Code-defined.

Display ledger income, ledger expense, and net cashflow as income minus expense. Separate boutique figures show sales value, collected, and receivable for sales sold in the selected date range.

Original role context: Admin

Verification gap: Code-defined. No authenticated execution or persisted result was observed in this source review.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F137` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/db.js`. Anchor: `export async function getAccountOverview(`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/accounts.js`. Anchor: `function renderKpis(overview)`.

### Tailorman F138: Ledger source breakdown

Source module: Accounts and cashflow. Evidence class: Code-defined.

Group movements by sourceType and calculate income, expense, and net per source. Sort groups by net cashflow descending.

Original role context: Admin

Verification gap: Code-defined. No authenticated execution or persisted result was observed in this source review.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F138` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/accounts.js`. Anchor: `function renderSourceBreakdown()`.

### Tailorman F139: Manual money movements

Source module: Accounts and cashflow. Evidence class: Code-defined.

Record income or expense outside bills, sales, wages, and expenses. Require a title and positive amount, and accept cash/UPI/card/bank/other mode, date, party, and notes. The helper writes a manual-prefixed ID and an audit event.

Original role context: Admin

Verification gap: Code-defined. No authenticated execution or persisted result was observed in this source review.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F139` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/accounts.js`. Anchor: `function openEntryModal()`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/db.js`. Anchor: `export async function saveManualEntry(id, data)`.

### Tailorman F140: Delete manual ledger entry

Source module: Accounts and cashflow. Evidence class: Code-defined.

After confirmation, delete only manual-prefixed entries. Source-owned movements have no delete control in this daybook and the helper rejects non-manual IDs.

Original role context: Admin

Verification gap: Code-defined. No authenticated execution or persisted result was observed in this source review.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F140` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/db.js`. Anchor: `export async function deleteManualEntry(id)`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/accounts.js`. Anchor: `async function onDeleteEntry(id)`.

### Tailorman F141: Accounts CSV export

Source module: Accounts and cashflow. Evidence class: Code-defined.

Export the loaded range with When, Source, Title, Party, Mode, Type, and Amount. Quote commas, quotes, and newlines. The file is named accounts plus the current date.

Original role context: Admin

Verification gap: Code-defined. No authenticated execution or persisted result was observed in this source review.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F141` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/accounts.js`. Anchor: `function exportCsv()`.

### Tailorman F142: Source-linked ledger model

Source module: Accounts and cashflow. Evidence class: Code-defined.

Ledger documents carry title, income/expense type, sourceType, sourceId, amount, mode, partyName, notes, occurredAt, metadata, and audit stamps. List reads omit zero-amount tombstone rows left by undone source payments.

Original role context: Admin

Verification gap: Code-defined. No authenticated execution or persisted result was observed in this source review.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F142` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/db.js`. Anchor: `async function upsertAccountEntry(id, data)`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/db.js`. Anchor: `export async function listAccountEntries(`.

## REQ-REPORT: Standard reports and business insights

Target behavior and acceptance: [REQ-REPORT](../product/requirements.md#req-report-standard-reports-and-business-insights).

### Tailorman F149: Report date ranges and entitlement-aware tabs

Source module: Reports and analytics. Evidence class: Code-defined.

Choose this month, last month, last three calendar months, last twelve months, or validated custom dates. Overview and Bills use reportsBasic; Boutique & Finance requires boutique, and Productivity and Customers require reportsAdvanced. Excluded tab controls and panels are removed.

Original role context: Admin, reportsBasic entitlement; selected tabs need additional entitlements

Verification gap: Code-defined. No authenticated execution or persisted result was observed in this source review.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F149` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/reports.js`. Anchor: `function computePreset(preset)`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/reports.js`. Anchor: `const TAB_FEATURES = {`.

### Tailorman F150: Report data scope and load warnings

Source module: Reports and analytics. Evidence class: Code-defined.

Fetch non-deleted bills created in the range plus boutique sales by soldAt and ledger entries by occurredAt. Boutique and ledger reads cap at 500 each. Display a warning when a cap is reached and a separate load-failure banner when figures could not be loaded.

Original role context: Admin, reportsBasic entitlement; selected tabs need additional entitlements

Verification gap: Code-defined. No authenticated execution or persisted result was observed in this source review.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F150` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/reports.js`. Anchor: `async function loadAll()`.

### Tailorman F151: Combined revenue and collection overview

Source module: Reports and analytics. Evidence class: Code-defined.

Show tailoring billed, boutique revenue, period cash collected from all income ledger entries, business expenses from expense ledger entries, tailoring balance, and boutique receivable. The UI explains that billed and collected totals use different date bases.

Original role context: Admin, reportsBasic entitlement; selected tabs need additional entitlements

Verification gap: Code-defined. No authenticated execution or persisted result was observed in this source review.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F151` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/reports.js`. Anchor: `function renderOverview()`.

### Tailorman F152: Tailoring revenue chart

Source module: Reports and analytics. Evidence class: Code-defined.

Sum bill totalAmount by bill creation day for ranges up to 31 days, or by calendar month for longer ranges. Fill missing days or months with zero and render an SVG bar chart.

Original role context: Admin, reportsBasic entitlement; selected tabs need additional entitlements

Verification gap: Code-defined. No authenticated execution or persisted result was observed in this source review.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F152` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/reports.js`. Anchor: `function renderRevenueChart()`.

### Tailorman F153: Garment type revenue ranking

Source module: Reports and analytics. Evidence class: Code-defined.

Aggregate bill-item quantity times rate by itemType, show the top eight types, and calculate shares against the sum of those displayed top-eight values.

Original role context: Admin, reportsBasic entitlement; selected tabs need additional entitlements

Verification gap: Code-defined. No authenticated execution or persisted result was observed in this source review.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F153` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/reports.js`. Anchor: `function renderItemTypeChart()`.

### Tailorman F154: Boutique and finance analytics

Source module: Reports and analytics. Evidence class: Code-defined.

Show boutique sale count, revenue, collected, receivable, average sale, all ledger income, all ledger expense, and net cashflow. Group ledger sources with in/out/net values and show links to the latest 20 boutique sales.

Original role context: Admin, reportsBasic entitlement; selected tabs need additional entitlements

Verification gap: Code-defined. No authenticated execution or persisted result was observed in this source review.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F154` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/reports.js`. Anchor: `function renderBoutiqueFinance()`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/reports.js`. Anchor: `function renderBoutiqueBreakdown()`.

### Tailorman F155: Bill finance report

Source module: Reports and analytics. Evidence class: Code-defined.

List bill number, customer, creation/delivery dates, computed status, total, paid, and balance. Show bill count and summary totals; these bill-level paid totals concern bills created in the range rather than all collections during the range.

Original role context: Admin, reportsBasic entitlement; selected tabs need additional entitlements

Verification gap: Code-defined. No authenticated execution or persisted result was observed in this source review.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F155` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/reports.js`. Anchor: `function runBillsTab()`.

### Tailorman F156: Employee and stage throughput

Source module: Reports and analytics. Evidence class: Code-defined.

Count each item timeline entry carrying byName, group counts by actor name and stage, and rank them as horizontal bars. Scope is the timelines of bills created in the selected range, not independent completion timestamps.

Original role context: Admin, reportsBasic entitlement; selected tabs need additional entitlements

Verification gap: Code-defined. No authenticated execution or persisted result was observed in this source review.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F156` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/reports.js`. Anchor: `function renderProductivity()`.

### Tailorman F157: Express versus regular analytics

Source module: Reports and analytics. Evidence class: Code-defined.

Show count and total bill value for express and regular bills, plus express percentage of all bills in the selected creation-date range.

Original role context: Admin, reportsBasic entitlement; selected tabs need additional entitlements

Verification gap: Code-defined. No authenticated execution or persisted result was observed in this source review.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F157` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/reports.js`. Anchor: `let expressRevenue = 0, regularRevenue = 0`.

### Tailorman F158: Customer spend and repeat-order report

Source module: Reports and analytics. Evidence class: Code-defined.

Group selected-range bills by mobile, then name, then Unknown. Rank customers by billed value, show top ten, and classify customers with two or more bills in the range as repeat. Retention is repeat customers divided by customer groups in the range, not a lifetime cohort measure.

Original role context: Admin, reportsBasic entitlement; selected tabs need additional entitlements

Verification gap: Code-defined. No authenticated execution or persisted result was observed in this source review.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F158` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/reports.js`. Anchor: `function renderCustomers()`.

### Tailorman F159: Tab-specific CSV report export

Source module: Reports and analytics. Evidence class: Code-defined.

Export the active tab. Boutique exports ledger rows, Customers exports customer/mobile/order count/billed total, Productivity exports employee/stage count, and Overview or Bills exports bill finance rows including express flag. Filenames include the report name and date range.

Original role context: Admin, reportsBasic entitlement; selected tabs need additional entitlements

Verification gap: Code-defined. No authenticated execution or persisted result was observed in this source review.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F159` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/reports.js`. Anchor: `function buildExport(tab)`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/reports.js`. Anchor: `function exportCsv()`.

### Tailormate F196: Six report sections

Source module: Reporting and analytics. Evidence class: Code-defined.

The reporting layout provides Insights, Monthly, Sales, Payments, Dues, and Bills tabs and selects the active section from the path. The sidebar shows Metrics only when both VIEW_REPORTS and MANAGE_PAYMENTS are granted.

Original role context: Signed-in shop user; client permissions and selected-shop context apply

Verification gap: Code-defined navigation. The report layout itself does not repeat those permission checks in its inspected component; backend enforcement remains untested.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F196` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/reports/layout-70156b0beb63204c.js`. Anchor: `path:"/reports/insights"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/reports/layout-70156b0beb63204c.js`. Anchor: `path:"/reports/bills"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/1892-b3ffd2b6cbf9e410.js`. Anchor: `hidden:!o||!l,icon:eV.Z,title:"Metrics"`.

### Tailormate F197: Insights period and location filters

Source module: Reporting and analytics. Evidence class: Code-defined.

Insights defaults to Yearly and the current date. It offers Daily, Weekly, Monthly, and Yearly with matching date-picker modes, a specific or All location, and response refresh on selected-shop changes.

Original role context: Signed-in shop user; client permissions and selected-shop context apply

Verification gap: Code-defined. This source review did not execute the action, verify a persisted result, or test backend authorization. Parent browser observations provide separate screen context.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F197` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/reports/insights/page-f5333fb3e61f1536.js`. Anchor: `useState)("4")`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/reports/insights/page-f5333fb3e61f1536.js`. Anchor: `rep_start_date:(0,j._)(S,C)`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/2280-431fea3a652d0870.js`. Anchor: `getinsightsreport`.

### Tailormate F198: Top items and customers

Source module: Reporting and analytics. Evidence class: Code-defined.

Insights ranks top ordering items by dress_name and total_count and top-value customers by full_name and todays_sales. Rows show rank badges and API-provided ordering rather than deriving lifetime retention metrics.

Original role context: Signed-in shop user; client permissions and selected-shop context apply

Verification gap: Code-defined. This source review did not execute the action, verify a persisted result, or test backend authorization. Parent browser observations provide separate screen context.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F198` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/reports/insights/page-f5333fb3e61f1536.js`. Anchor: `children:"Top Ordering Items"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/reports/insights/page-f5333fb3e61f1536.js`. Anchor: `children:N(e.total_count)`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/reports/insights/page-f5333fb3e61f1536.js`. Anchor: `children:"Top Customers"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/reports/insights/page-f5333fb3e61f1536.js`. Anchor: `children:N(e.todays_sales)`.

### Tailormate F199: Revenue date and weekday rankings

Source module: Reporting and analytics. Evidence class: Code-defined.

Insights shows Top Revenue Dates and Top Performing Day of Week tables. They render server-provided rankings, dates/days, and amounts, with independent No data available states.

Original role context: Signed-in shop user; client permissions and selected-shop context apply

Verification gap: Code-defined. This source review did not execute the action, verify a persisted result, or test backend authorization. Parent browser observations provide separate screen context.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F199` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/reports/insights/page-f5333fb3e61f1536.js`. Anchor: `children:"Top Revenue Dates"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/reports/insights/page-f5333fb3e61f1536.js`. Anchor: `children:"Top Performing Day of Week"`.

### Tailormate F200: Monthly payments, sales, and orders

Source module: Reporting and analytics. Evidence class: Code-defined.

Monthly Report selects a month/year and a specific or All location, then queries /getmonthlyreports with period3. It shows three bar charts for monthly payments, sales, and orders. Points use returned month/year and amount or order count.

Original role context: Signed-in shop user; client permissions and selected-shop context apply

Verification gap: Code-defined. This source review did not execute the action, verify a persisted result, or test backend authorization. Parent browser observations provide separate screen context.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F200` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/reports/monthly/page-732ff557e4817d5a.js`. Anchor: `period:"3"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/reports/monthly/page-732ff557e4817d5a.js`. Anchor: `name:"Monthly Payments"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/reports/monthly/page-732ff557e4817d5a.js`. Anchor: `name:"Monthly Sales"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/reports/monthly/page-732ff557e4817d5a.js`. Anchor: `name:"Monthly Orders"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/2280-431fea3a652d0870.js`. Anchor: `get("/getmonthlyreports"`.

### Tailormate F201: Shared dated report filters

Source module: Reporting and analytics. Evidence class: Code-defined.

Sales, Payments, Dues, and Bills default to a date range covering the preceding90days through today. Their shared toolbar selects location and date range. Sales/Dues group by customer name or order date; Payments groups by customer name or payment date; Bills has no grouping choices.

Original role context: Signed-in shop user; client permissions and selected-shop context apply

Verification gap: Code-defined. This source review did not execute the action, verify a persisted result, or test backend authorization. Parent browser observations provide separate screen context.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F201` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/reports/sales/page-5a1c2bb33fd0fe72.js`. Anchor: `subtract(90,"days")`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/8852-96ea6dc9aa39cc2a.js`. Anchor: `children:"Date range"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/reports/sales/page-5a1c2bb33fd0fe72.js`. Anchor: `CUSTOMER_NAME="customer_name",n.DATE="order_date"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/reports/payments/page-0959d696a4303568.js`. Anchor: `CUSTOMER_NAME="customer_name",t.DATE="payment_date"`.

### Tailormate F202: Sales report grouping and order drilldown

Source module: Reporting and analytics. Evidence class: Code-defined.

Sales reads all_sales, groups by selected customer or date, sums each group price, and displays date/customer, order number, and amount. Clicking a row opens /orders/active/{order_id}. This is a sales value view, separate from payment receipts.

Original role context: Signed-in shop user; client permissions and selected-shop context apply

Verification gap: Code-defined. This source review did not execute the action, verify a persisted result, or test backend authorization. Parent browser observations provide separate screen context.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F202` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/reports/sales/page-5a1c2bb33fd0fe72.js`. Anchor: `e=u()(null==T?void 0:T.all_sales,t)`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/reports/sales/page-5a1c2bb33fd0fe72.js`. Anchor: `let{price:l}=e;return+(null!=l?l:0)`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/reports/sales/page-5a1c2bb33fd0fe72.js`. Anchor: `k.push("/orders/active/".concat(e.order_id))`.

### Tailormate F203: Payments report grouping

Source module: Reporting and analytics. Evidence class: Code-defined.

Payments reads all_payments and groups by customer or payment date. Group totals sum amount, and rows show payment date/customer, order number, and received amount with an order drilldown.

Original role context: Signed-in shop user; client permissions and selected-shop context apply

Verification gap: Code-defined. This source review did not execute the action, verify a persisted result, or test backend authorization. Parent browser observations provide separate screen context.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F203` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/reports/payments/page-0959d696a4303568.js`. Anchor: `e=u()(null==Z?void 0:Z.all_payments,n)`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/reports/payments/page-0959d696a4303568.js`. Anchor: `let{amount:l}=e;return+(null!=l?l:0)`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/reports/payments/page-0959d696a4303568.js`. Anchor: `i()(e.payment_date).format(C.Rg)`.

### Tailormate F204: Dues report

Source module: Reporting and analytics. Evidence class: Code-defined.

Dues reads all_dues, groups by customer or order date, sums the dues value per group, and displays both original amount and remaining dues for each order. Rows link to the order.

Original role context: Signed-in shop user; client permissions and selected-shop context apply

Verification gap: Code-defined. This source review did not execute the action, verify a persisted result, or test backend authorization. Parent browser observations provide separate screen context.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F204` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/reports/dues/page-618d96a2d0ed30d1.js`. Anchor: `e=u()(null==T?void 0:T.all_dues,t)`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/reports/dues/page-618d96a2d0ed30d1.js`. Anchor: `let{dues:l}=e;return+(null!=l?l:0)`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/reports/dues/page-618d96a2d0ed30d1.js`. Anchor: `children:"Dues"`.

### Tailormate F205: Bills register and document preview

Source module: Reporting and analytics. Evidence class: Code-defined.

Bills lists bill number, order number, bill date, and bill total. View Bill fetches the order invoice, embeds its invoice_url in a document dialog, and offers Download or Print plus a prefilled WhatsApp composer using customer country code and mobile.

Original role context: Signed-in shop user; client permissions and selected-shop context apply

Verification gap: Code-defined. No invoice was generated, file downloaded, printed output checked, or message sent in this static subtask.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F205` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/reports/bills/page-318e453ef48b8ea4.js`. Anchor: `accessorKey:"bill_no"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/reports/bills/page-318e453ef48b8ea4.js`. Anchor: `"View Bill"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/reports/bills/page-318e453ef48b8ea4.js`. Anchor: `"Download or Print"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/reports/bills/page-318e453ef48b8ea4.js`. Anchor: `"Share to Whatsapp"`.

### Tailormate F206: Excel report downloads

Source module: Reporting and analytics. Evidence class: Code-defined.

Sales, Payments, Dues, and Bills call their corresponding report endpoint again with rep_format xls and current dates, location, and user_id. They pass the returned file_url and file_name to the download helper. This is server-generated Excel export despite internal names referring to CSV.

Original role context: Signed-in shop user; client permissions and selected-shop context apply

Verification gap: Code-defined. Export file format, content, errors, and successful downloads were not verified.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F206` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/reports/sales/page-5a1c2bb33fd0fe72.js`. Anchor: `rep_format:"xls"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/reports/payments/page-0959d696a4303568.js`. Anchor: `rep_format:"xls"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/reports/dues/page-618d96a2d0ed30d1.js`. Anchor: `rep_format:"xls"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/reports/bills/page-318e453ef48b8ea4.js`. Anchor: `rep_format:"xls"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/8852-96ea6dc9aa39cc2a.js`. Anchor: `"Download Excel"`.

### NoolTech F207: Combined finance workspace

Source module: Finances. Evidence class: Code-defined.

Finances groups Payments, Expenses, and Day Report. /payments and /expenses route aliases resolve to the same workspace in the main route tree.

Original role context: Authenticated shop user

Verification gap: Client action, form, or service definition exists. Server execution, persistence, and access enforcement were not tested by this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F207` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/FinancesPage-DfQXJMXL.js`. Anchor: `finances.dayReport`.

### NoolTech F208: Boutique day, week, and month report

Source module: Finances. Evidence class: Code-defined.

Select date and day/week/month. Filter boutique orders by creation time, location, and reporting window; show total sales/count, cash/UPI/card/split/other breakdown, expenses, and cash after cash expenses.

Original role context: Authenticated shop user

Verification gap: Client action, form, or service definition exists. Server execution, persistence, and access enforcement were not tested by this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F208` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/FinancesPage-DfQXJMXL.js`. Anchor: `grossProfit`.

### NoolTech F209: Best sellers and staff sale totals

Source module: Finances. Evidence class: Code-defined.

Group boutique order lines by product to show top seven products by revenue, quantity, and sales. Parse Staff metadata from order notes to group order counts and sales per staff member.

Original role context: Authenticated shop user

Verification gap: Client action, form, or service definition exists. Server execution, persistence, and access enforcement were not tested by this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F209` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/FinancesPage-DfQXJMXL.js`. Anchor: `Staff:`.

### NoolTech F210: Export and print boutique sales report

Source module: Finances. Evidence class: Code-defined.

CSV includes Date, Order#, Customer, Items, Payment Mode, Amount, and Staff. Date-window-specific filenames and print support exist.

Original role context: Authenticated shop user

Verification gap: Client action, form, or service definition exists. Server execution, persistence, and access enforcement were not tested by this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F210` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/FinancesPage-DfQXJMXL.js`. Anchor: `boutique-sales-`.

### NoolTech F211: Client-derived gross profit estimate

Source module: Finances. Evidence class: Code-defined.

Day report looks up costPrice in localStorage boutique_products_v1 by case-insensitive product name and sums item sale price minus cost. Missing local cost data leaves profit unavailable for those items.

Original role context: Authenticated shop user

Verification gap: This is a client estimate based on local cached product costs, not a verified accounting valuation or historical cost ledger.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F211` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/FinancesPage-DfQXJMXL.js`. Anchor: `boutique_products_v1`.

### NoolTech F212: Overview metrics and receipt trend

Source module: Insights. Evidence class: Code-defined.

Overview distinguishes order value, money received after refunds, all open balances to collect, entered expenses, money received minus expenses, average booked order, new customers, and repeat customers. Chart shows received money by week or month.

Original role context: Authenticated shop user

Verification gap: Client action, form, or service definition exists. Server execution, persistence, and access enforcement were not tested by this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F212` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/InsightsPage-BGqupcs6.js`. Anchor: `after refunds`.

### NoolTech F213: Date-scoped analytics tabs

Source module: Insights. Evidence class: Code-defined.

Last 7/30/90 days, all time, and custom range; Overview, Financial, Performance, Expenses, and Reports tabs. Requests include location where supported and use separate data sources with partial-failure handling.

Original role context: Authenticated shop user

Verification gap: Client action, form, or service definition exists. Server execution, persistence, and access enforcement were not tested by this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F213` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/InsightsPage-BGqupcs6.js`. Anchor: `last7days`.

### NoolTech F214: Revenue, procurement, and product analysis

Source module: Insights. Evidence class: Code-defined.

Revenue versus procurement spend, revenue trend, sales/category distribution, best-selling products, and forecasting section.

Original role context: Authenticated shop user

Verification gap: Client action, form, or service definition exists. Server execution, persistence, and access enforcement were not tested by this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F214` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/InsightsPage-BGqupcs6.js`. Anchor: `insights.revenueVsSpend`.

### NoolTech F215: Profit and cash-flow analysis

Source module: Insights. Evidence class: Code-defined.

Profit and loss, operating expenses, net profit, profit margin, monthly profit, cash inflows/outflows/net cash flow, and cash trend are loaded through expense analysis endpoints.

Original role context: Authenticated shop user

Verification gap: Client action, form, or service definition exists. Server execution, persistence, and access enforcement were not tested by this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F215` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/dependencies/expense.service-CCxZP6CW.js`. Anchor: `getCashFlowAnalysis`.

### NoolTech F216: Customer retention and revenue forecasting

Source module: Insights. Evidence class: Code-defined.

Advanced analytics displays revenue by garment, projected revenue, average order value, six-month total revenue, repeat-customer rate, retention, average lifetime value, new customers, and top customers.

Original role context: Authenticated shop user

Verification gap: Displays and requests are defined. Forecasting/retention formulas and accuracy were not established from the client.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F216` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/InsightsPage-BGqupcs6.js`. Anchor: `insights.avgLifetimeValue`.

### NoolTech F217: Worker and team performance

Source module: Insights. Evidence class: Code-defined.

Completion time, on-time delivery, best performer, improvement indicator, and rankings by name/orders/revenue/average days/on-time rate; busiest days and month-on-month revenue growth.

Original role context: Authenticated shop user

Verification gap: Client action, form, or service definition exists. Server execution, persistence, and access enforcement were not tested by this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F217` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/InsightsPage-BGqupcs6.js`. Anchor: `insights.teamPerfRankings`.

### NoolTech F218: Expense breakdown and future recurring costs

Source module: Insights. Evidence class: Code-defined.

Category spending distribution, transaction counts, and upcoming recurring expenses.

Original role context: Authenticated shop user

Verification gap: Client action, form, or service definition exists. Server execution, persistence, and access enforcement were not tested by this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F218` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/InsightsPage-BGqupcs6.js`. Anchor: `insights.upcomingRecurring`.

## REQ-CUSTOMREPORT: Saved custom reports

Target behavior and acceptance: [REQ-CUSTOMREPORT](../product/requirements.md#req-customreport-saved-custom-reports).

### NoolTech F219: Saved report catalog

Source module: Custom reports. Evidence class: Code-defined.

Create, list, edit, delete with confirmation, run, and export saved reports. Catalog displays data source, columns, last-run timestamp, and run count. advancedReporting entitlement gates the builder, while legacy copy says Plus+.

Original role context: Authenticated shop user

Verification gap: Client action, form, or service definition exists. Server execution, persistence, and access enforcement were not tested by this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F219` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/ReportListPage-DtQ2dE7w.js`. Anchor: `deleteReport`.

### NoolTech F220: Configure report data source and columns

Source module: Custom reports. Evidence class: Code-defined.

Data sources are orders/customers/payments/inventory/vendors. Load available fields by source, add/remove columns without duplicates, and choose numeric sum/avg/min/max/count aggregations. Report name and at least one column are required.

Original role context: Authenticated shop user

Verification gap: Client action, form, or service definition exists. Server execution, persistence, and access enforcement were not tested by this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F220` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/ReportBuilderPage-BnAI60rK.js`. Anchor: `dataSource`.

### NoolTech F221: Report filters, grouping, and sorting

Source module: Custom reports. Evidence class: Code-defined.

Filters use eq/ne/gt/gte/lt/lte/contains/startsWith/endsWith; blank-value filters are omitted. Choose groupBy, sortBy, and ascending/descending order.

Original role context: Authenticated shop user

Verification gap: Client action, form, or service definition exists. Server execution, persistence, and access enforcement were not tested by this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F221` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/ReportBuilderPage-BnAI60rK.js`. Anchor: `startsWith`.

### NoolTech F222: Report chart configuration

Source module: Custom reports. Evidence class: Code-defined.

Optional none/bar/line/pie/area chart types and x/y axis field selection.

Original role context: Authenticated shop user

Verification gap: Client action, form, or service definition exists. Server execution, persistence, and access enforcement were not tested by this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F222` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/ReportBuilderPage-BnAI60rK.js`. Anchor: `chartConfig`.

### NoolTech F223: Run report and export PDF or CSV

Source module: Custom reports. Evidence class: Code-defined.

Run a report, inspect matched row count and execution timestamp, show configured chart, export CSV/PDF. UI warns that only first 1,000 rows are displayed and CSV contains the complete data. Service supports limit/offset.

Original role context: Authenticated shop user

Verification gap: Export and run requests exist. Actual exported files, chart rendering, and completeness beyond the server's response limits were not verified.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F223` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/ReportRunPage-DfCVZTvz.js`. Anchor: `Showing first 1,000 rows`.

## REQ-AUTH: Business sign-in, account security, and sessions

Target behavior and acceptance: [REQ-AUTH](../product/requirements.md#req-auth-business-sign-in-account-security-and-sessions).

### Tailorman F167: Set staff password

Source module: Employees and staff access. Evidence class: Code-defined.

Optionally set a password of at least six characters from the edit dialog via /api/employees/set-password. Report if an orphaned login was recreated. Save profile before the password request and explicitly report a password failure after profile success. No email is sent by the inspected UI flow.

Original role context: Admin

Verification gap: Code-defined. No authenticated execution or persisted result was observed in this source review.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F167` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/employees.js`. Anchor: `const res = await setEmployeePassword(emp.id, password)`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/db.js`. Anchor: `return postJson("/api/employees/set-password", { uid, password })`.

### Tailorman F180: Google sign-in

Source module: Identity and access. Evidence class: Code-defined.

Opens Google OAuth in a popup with account selection. The login page routes super administrators to their console, existing shop users to the dashboard, and verified users without a shop through shop creation and onboarding.

Original role context: Visitor; registered shop users; super administrator

Verification gap: Defined in captured client code. No successful authenticated action or server authorization behavior was tested for this entry.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F180` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/login.js`. Anchor: `await loginWithGoogle();`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/firebase.js`. Anchor: `googleProvider.setCustomParameters({ prompt: "select_account" });`.

### Tailorman F181: Email and password staff sign-in

Source module: Identity and access. Evidence class: Code-defined.

Accepts email and password through Firebase Authentication. Provides specific UI messages for invalid credentials, blocked popups, excessive attempts, cancelled sign-in, and network errors.

Original role context: Registered shop users

Verification gap: Defined in captured client code. No successful authenticated action or server authorization behavior was tested for this entry.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F181` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/login.js`. Anchor: `await login(email, password);`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/login.js`. Anchor: `function friendlyError(err)`.

### Tailorman F182: Password reset email

Source module: Identity and access. Evidence class: Code-defined.

Expands an inline reset section, prefills a typed sign-in email, requires an email, and calls Firebase password-reset email. A browser-local timestamp limits requests to one per 60 seconds.

Original role context: Registered shop users

Verification gap: No reset email was requested. The cooldown is client-side and does not establish a server rate limit.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F182` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/login.js`. Anchor: `const RESET_COOLDOWN_MS  = 60_000;`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/login.js`. Anchor: `await sendPasswordReset(email);`.

### Tailorman F183: Email signup with optional business details

Source module: Identity and access. Evidence class: Code-defined.

Collects shop name, full name, email, dial code, optional phone, password and confirmation. Requires at least eight password characters, matching passwords, and 6 to 15 phone digits when present. Stashes shop and phone locally until verification completes.

Original role context: New shop owner

Verification gap: Defined in captured client code. No successful authenticated action or server authorization behavior was tested for this entry.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F183` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/signup.js`. Anchor: `if (pw.length < 8)`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/signup.js`. Anchor: `function readPhone()`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/signup.js`. Anchor: `await createUserWithEmailAndPassword(auth, email, pw);`.

### Tailorman F184: Email verification before shop provisioning

Source module: Identity and access. Evidence class: Code-defined.

Sends a verification link after email signup. The verification panel reloads the Firebase user every four seconds and offers a manual continue check. A verified user receives a fresh ID token before the tenant is created.

Original role context: New email-signup owner

Verification gap: Defined in captured client code. No successful authenticated action or server authorization behavior was tested for this entry.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F184` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/signup.js`. Anchor: `await sendEmailVerification(cred.user, actionCodeSettings);`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/signup.js`. Anchor: `_pollTimer = setInterval(async () =>`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/tenant.js`. Anchor: `await auth.currentUser?.getIdToken(true);`.

### Tailorman F185: Resend verification and change signup email

Source module: Identity and access. Evidence class: Code-defined.

Supports resending the verification email after a browser-local 60-second cooldown. Switching email deletes the current unverified Auth account where possible, otherwise signs out, clears pending shop details, and returns to the signup form.

Original role context: Unverified signup user

Verification gap: Defined in captured client code. No successful authenticated action or server authorization behavior was tested for this entry.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F185` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/signup.js`. Anchor: `const RESEND_MS  = 60_000;`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/signup.js`. Anchor: `if (user && !user.emailVerified) await deleteUser(user);`.

### Tailorman F186: Google shop signup

Source module: Identity and access. Evidence class: Code-defined.

Creates a shop for a first-time Google account and reuses an existing shop mapping on later sign-ins. Carries a typed shop name from the public signup call to action and sends new owners to onboarding.

Original role context: New shop owner

Verification gap: Defined in captured client code. No successful authenticated action or server authorization behavior was tested for this entry.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F186` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/landing.js`. Anchor: `tenantId = await createTenantForOwner({`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/signup.js`. Anchor: `await signInWithPopup(auth, googleProvider, popupResolver);`.

### Tailorman F188: Inactive account and changed-role handling

Source module: Identity and access. Evidence class: Code-defined.

Rejects a missing or inactive shop profile, signs the user out, and shows an account notice. Background profile refresh signs out newly inactive users and reloads the page when the server role differs from the cached role.

Original role context: All shop users

Verification gap: Defined in captured client code. No successful authenticated action or server authorization behavior was tested for this entry.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F188` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/auth.js`. Anchor: `if (!server || server.active === false) { logout(); return; }`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/auth.js`. Anchor: `if (!profile || profile.active === false)`.

### Tailorman F189: Persistent login and logout

Source module: Identity and access. Evidence class: Code-defined.

Initializes Firebase login persistence with IndexedDB, local-storage and session-storage fallbacks. Logout clears the app context and role-specific shell hint, signs out, and returns to login.

Original role context: All authenticated users

Verification gap: Persistence setup was inspected statically. Cross-device and browser restart behavior were not tested.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F189` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/firebase.js`. Anchor: `persistence: [indexedDBLocalPersistence, browserLocalPersistence, browserSessionPersistence]`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/auth.js`. Anchor: `export async function logout()`.

### Tailorman F239: Firebase services and App Check headers

Source module: Client integrations. Evidence class: Code-defined.

The client uses Firebase Authentication, Firestore and Storage. Production host initialization configures reCAPTCHA v3 App Check, and authenticated API helpers attach Firebase bearer tokens plus App Check tokens when available. Local emulator use is opt-in on localhost.

Original role context: Authenticated app users

Verification gap: This records client integration mechanisms. Comments about enforcement do not independently prove deployed App Check policy, backend authorization or tenant isolation.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F239` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/firebase.js`. Anchor: `function setUpAppCheck(targetApp, autoRefresh = true)`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/api.js`. Anchor: `Authorization: "Bearer " + (await user.getIdToken()),`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/firebase.js`. Anchor: `export const USING_EMULATORS =`.

### Tailormate F154: Mobile sign-in

Source module: Authentication and registration. Evidence class: Code-defined.

Sign in with a country dial code and phone number. The login form defaults to India, requires a nonempty phone number, and submits country_code, mobile_number, device Web, a fixed device_id, and user_type 1 to POST /login. Successful status moves to OTP using the returned user_id.

Original role context: Public sign-in

Verification gap: Code-defined. This source review did not execute the action, verify a persisted result, or test backend authorization. Parent browser observations provide separate screen context.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F154` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/auth/login/page-d1f0bd00b22e23fb.js`. Anchor: `phoneNumber:A.z.string().min(1,"Phone number is required")`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/auth/login/page-d1f0bd00b22e23fb.js`. Anchor: `mobile_number:e.phone.phoneNumber,user_type:1`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/auth/login/page-d1f0bd00b22e23fb.js`. Anchor: `post("/login",e,r)`.

### Tailormate F155: Four-digit OTP entry and automatic validation

Source module: Authentication and registration. Evidence class: Code-defined.

Four single-character inputs accept numeric values, advance focus, support Backspace and left/right arrows, and automatically validate when all four are nonempty. POST /validateotp receives otp and user_id. Invalid responses show a message, clear the inputs, and focus the first box. The visible Validate button has no separate onClick handler in the inspected component.

Original role context: Public sign-in and signup

Verification gap: Code-defined. OTP delivery, expiry, retry limits, resend, and backend checks were not exercised. The entered code was not read or retained.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F155` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/auth/login/page-d1f0bd00b22e23fb.js`. Anchor: `otpLength:n=4`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/auth/login/page-d1f0bd00b22e23fb.js`. Anchor: `c&&t(l.join(""),`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/auth/login/page-d1f0bd00b22e23fb.js`. Anchor: `otp:e,user_id:n`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/auth/login/page-d1f0bd00b22e23fb.js`. Anchor: `children:m?"Loading...":"Validate"`.

### Tailormate F156: OTP success session storage

Source module: Authentication and registration. Evidence class: Code-defined.

A successful OTP response stores its returned token and serialized user in browser localStorage and updates the in-memory auth user. Subsequent app admission reads that user rather than a password form.

Original role context: Public sign-in and signup

Verification gap: Code-defined. This source review did not execute the action, verify a persisted result, or test backend authorization. Parent browser observations provide separate screen context.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F156` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/auth/login/page-d1f0bd00b22e23fb.js`. Anchor: `localStorage.setItem(u.E.token,`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/auth/login/page-d1f0bd00b22e23fb.js`. Anchor: `JSON.stringify(null==a?void 0:a.user)`.

### Tailormate F157: Signup identity and consent form

Source module: Authentication and registration. Evidence class: Code-defined.

Registration starts with name, email, and agreement to Terms of Service and Privacy policy. Name requires at least three characters, email must parse as an email, and consent must be true. Policy links open the published TailorMate documents.

Original role context: Public signup

Verification gap: Code-defined. This source review did not execute the action, verify a persisted result, or test backend authorization. Parent browser observations provide separate screen context.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F157` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/auth/register/page-32052fee7386c7b3.js`. Anchor: `name:u.z.string().min(3,`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/auth/register/page-32052fee7386c7b3.js`. Anchor: `terms:u.z.boolean().refine(e=>!!e,`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/auth/register/page-32052fee7386c7b3.js`. Anchor: `https://www.tailormateapp.com/terms_of_agreement.html`.

### Tailormate F158: Signup phone and OTP steps

Source module: Authentication and registration. Evidence class: Code-defined.

After identity details, registration collects a country dial code and phone number, submits them with email and user_full_name to POST /signup, then reuses the OTP component. Back returns to the preceding step. The state machine is identity step 0, phone step 1, OTP step 2.

Original role context: Public signup

Verification gap: Code-defined. This source review did not execute the action, verify a persisted result, or test backend authorization. Parent browser observations provide separate screen context.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F158` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/auth/register/page-32052fee7386c7b3.js`. Anchor: `user_full_name:n.name,user_type:1`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/auth/register/page-32052fee7386c7b3.js`. Anchor: `post("/signup",e,s)`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/auth/register/page-32052fee7386c7b3.js`. Anchor: `case 2:return(0,a.jsx)(o.Z`.

### Tailormate F159: Auth-route redirect for existing session

Source module: Authentication and registration. Evidence class: Code-defined.

The authentication layout sends an existing user to the application root. The first-shop layout requires a user, redirects unauthenticated visitors to login, and redirects a user with shop_id to the root.

Original role context: Public authentication routes

Verification gap: Code-defined. This source review did not execute the action, verify a persisted result, or test backend authorization. Parent browser observations provide separate screen context.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F159` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/auth/layout-9e6f4ab138058ee7.js`. Anchor: `redirect)("/")`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/create-shop/layout-e6c925b5a1b53d54.js`. Anchor: `r||(0,s.redirect)("/auth/login")`.

### Tailormate F160: Confirmed logout

Source module: Authentication and registration. Evidence class: Code-defined.

Logout opens a confirmation dialog. Confirmation removes the local token and user, clears the React Query cache, and clears the auth-context user. Cancelling closes the dialog without those actions.

Original role context: Signed-in shop user; client permissions and selected-shop context apply

Verification gap: Code-defined. This source review did not execute the action, verify a persisted result, or test backend authorization. Parent browser observations provide separate screen context.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F160` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/1892-b3ffd2b6cbf9e410.js`. Anchor: `title:"Are you sure, Do you want to logout?"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/1892-b3ffd2b6cbf9e410.js`. Anchor: `localStorage.removeItem(i.E.token),localStorage.removeItem(i.E.user),h.clear()`.

### Tailormate F165: Browser session restoration and bootstrap

Source module: Workspace access and permissions. Evidence class: Code-defined.

After mount, the auth provider restores its local token and user. It loads countries when a token exists and waits for Google Maps Places to load before rendering its children. Country results are cached with infinite stale time.

Original role context: Signed-in shop user; client permissions and selected-shop context apply

Verification gap: Code-defined. This dependency can affect startup when the Maps SDK cannot load. Offline access and failure recovery were not exercised.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F165` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/backup-data/page-77033a376f45b7ad.js`. Anchor: `localStorage.getItem(i.E.token)`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/backup-data/page-77033a376f45b7ad.js`. Anchor: `if(!a||x||!h)return`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/backup-data/page-77033a376f45b7ad.js`. Anchor: `staleTime:1/0`.

### Tailormate F166: Authenticated API client

Source module: Workspace access and permissions. Evidence class: Code-defined.

The common Axios client targets https://api.tailormateapp.com/v4. It adds the locally stored Bearer token when a caller has not supplied Authorization. For the -1 all-shops sentinel, it removes shop_id from GET params and object bodies for POST, PUT, and PATCH.

Original role context: Signed-in shop user; client permissions and selected-shop context apply

Verification gap: Code-defined. This source review did not execute the action, verify a persisted result, or test backend authorization. Parent browser observations provide separate screen context.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F166` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/5075-dc3f169160ed7450.js`. Anchor: `baseURL:"https://api.tailormateapp.com/v4"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/5075-dc3f169160ed7450.js`. Anchor: `r&&!e.headers.Authorization`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/5075-dc3f169160ed7450.js`. Anchor: `e.params.shop_id===n.Md`.

### Tailormate F167: Invalid-token cleanup

Source module: Workspace access and permissions. Evidence class: Code-defined.

When a successful HTTP response contains message Invalid Token, the client removes local token and user entries. Rejected HTTP requests are propagated as promise rejections. The interceptor does not itself clear the auth-context user or query cache in this branch.

Original role context: Signed-in shop user; client permissions and selected-shop context apply

Verification gap: Code-defined. The timing of redirects after invalidation and server expiry policy were not tested.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F167` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/5075-dc3f169160ed7450.js`. Anchor: `message)==="Invalid Token"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/5075-dc3f169160ed7450.js`. Anchor: `async e=>await Promise.reject(e)`.

### NoolTech F231: Password-change form

Source module: Settings. Evidence class: Code-defined.

Shows current/new/confirm-password fields for non-social accounts. Its inspected save branch checks matching new passwords, reports success, and clears fields without a password-update API call in that branch.

Original role context: Authenticated shop user

Verification gap: Potential incomplete functionality: this save branch does not demonstrate server persistence. Do not classify password change as working based on its success message.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F231` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/SettingsPage-BspbE0gu.js`. Anchor: `settings.passwordUpdated`.

### NoolTech F232: Two-factor authentication setup and removal

Source module: Settings. Evidence class: Code-defined.

Get 2FA status, generate QR/manual secret, verify a six-digit code, then display backup codes and saved-code acknowledgement. Disabling requires current password.

Original role context: Authenticated shop user

Verification gap: Setup/enable/disable client operations and backup-code UI exist. No 2FA state change or recovery login was executed.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F232` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/SettingsPage-BspbE0gu.js`. Anchor: `Setup Two-Factor Authentication`.

### NoolTech F254: Email and password sign-in

Source module: Business authentication. Evidence class: Code-defined.

POST /api/auth/login accepts email, password, and rememberMe. A pending_2fa response switches to code verification.

Original role context: Shop owner / staff

Verification gap: Defined in shipped client code; successful server operation and full runtime behavior were not tested in this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F254` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/index-Dk-7hFgw.js`. Anchor: `async login(u)`.

### NoolTech F255: Remember session option

Source module: Business authentication. Evidence class: Code-defined.

The login payload includes rememberMe; the visible option says remember me for 30 days. Server session duration is unverified.

Original role context: Shop owner / staff

Verification gap: Defined in shipped client code; successful server operation and full runtime behavior were not tested in this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F255` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/index-Dk-7hFgw.js`. Anchor: `Remember me for 30 days`.

### NoolTech F256: Google sign-in and role routing

Source module: Business authentication. Evidence class: Code-defined.

Business Google OAuth and callback lead to setup or a signed-in account. Platform administrator logins route to /platform/dashboard.

Original role context: Shop owner / staff

Verification gap: Defined in shipped client code; successful server operation and full runtime behavior were not tested in this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F256` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/index-Dk-7hFgw.js`. Anchor: `l.role==="platform_admin"`.

### NoolTech F257: Password reset link request

Source module: Business authentication. Evidence class: Code-defined.

POST /api/auth/forgot-password sends a normalized email; the confirmation avoids disclosing whether an account exists.

Original role context: Shop owner / staff

Verification gap: Defined in shipped client code; successful server operation and full runtime behavior were not tested in this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F257` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/index-Dk-7hFgw.js`. Anchor: `/api/auth/forgot-password`.

### NoolTech F258: Resend verification email

Source module: Business authentication. Evidence class: Code-defined.

POST /api/auth/resend-verification is offered after EMAIL_NOT_VERIFIED.

Original role context: Shop owner / staff

Verification gap: Defined in shipped client code; successful server operation and full runtime behavior were not tested in this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F258` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/index-Dk-7hFgw.js`. Anchor: `/api/auth/resend-verification`.

### NoolTech F259: Authenticator second factor

Source module: Business authentication. Evidence class: Code-defined.

Client defines setup/status, enable, disable, verify, and backup-code regeneration endpoints under /api/auth/2fa.

Original role context: Shop owner / staff

Verification gap: Defined in shipped client code; successful server operation and full runtime behavior were not tested in this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F259` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/index-Dk-7hFgw.js`. Anchor: `async get2FAStatus()`.

### NoolTech F260: Session refresh and sign-out

Source module: Business authentication. Evidence class: Code-defined.

Client refreshes access tokens and calls /api/auth/logout, then clears in-memory identity. This does not establish cookie attributes.

Original role context: Shop owner / staff

Verification gap: Defined in shipped client code; successful server operation and full runtime behavior were not tested in this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F260` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/index-Dk-7hFgw.js`. Anchor: `async logout(){await z.post("/api/auth/logout")`.

### NoolTech F270: Accept an emailed staff invitation

Source module: Staff activation. Evidence class: Code-defined.

Read invite token, require matching password confirmation with at least 8 characters, call /api/users/accept-invitation, and redirect to login.

Original role context: Invited staff

Verification gap: Defined in shipped client code; successful server operation and full runtime behavior were not tested in this code review.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F270` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/AcceptInvitationPage-BRFf4EAo.js`. Anchor: `Password must be at least 8 characters`.

## REQ-ONBOARD: Shop creation, setup, and first-use guidance

Target behavior and acceptance: [REQ-ONBOARD](../product/requirements.md#req-onboard-shop-creation-setup-and-first-use-guidance).

### Tailorman F190: Optional owner phone and shop setup

Source module: Shop onboarding. Evidence class: Code-defined.

Shows a greeting, prefilled shop name and country dial-code selector after tenant creation. Accepts an optional 6 to 15 digit phone, normalizes it with the dial code, and writes phone and shop details to tenant, shop settings and owner profile documents.

Original role context: New shop owner

Verification gap: Defined in captured client code. No successful authenticated action or server authorization behavior was tested for this entry.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F190` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/onboarding.js`. Anchor: `const fullPhone = rawNum ? dial + rawNum : null;`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/onboarding.js`. Anchor: `async function saveOnboarding(uid, tenantId, { phone, shopName })`.

### Tailorman F191: Skip or resume onboarding

Source module: Shop onboarding. Evidence class: Code-defined.

Skips onboarding if ownerPhone already exists, including an empty string. The Skip control records completion with an empty phone and navigates to dashboard. Missing authentication or tenant mappings send the user back to login or the public page.

Original role context: New shop owner

Verification gap: Defined in captured client code. No successful authenticated action or server authorization behavior was tested for this entry.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F191` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/onboarding.js`. Anchor: `if ("ownerPhone" in data)`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/onboarding.js`. Anchor: `tenantUpdate.ownerPhone = "";`.

### Tailorman F192: Automatic shop defaults

Source module: Shop onboarding. Evidence class: Code-defined.

Provisioning creates the tenant, user-to-tenant mapping, active owner admin profile and shop settings, then seeds default garment types and measurement fields. Shop name falls back to the owner's name plus Shop or My Tailor Shop.

Original role context: New shop owner

Verification gap: Defined in captured client code. No successful authenticated action or server authorization behavior was tested for this entry.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F192` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/tenant.js`. Anchor: `const resolvedShopName = shopName ||`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/tenant.js`. Anchor: `await seedDefaultItemTypes();`.

### Tailorman F212: Load sample shop records

Source module: Shop settings. Evidence class: Code-defined.

An admin can load a sample set into the current tenant for exploration. The source creates five customers, three saved measurement profiles, six bills across work and payment states, and three expenses, all marked with __sample. If sample customers or bills already exist, seeding returns without adding another set.

Original role context: Admin

Verification gap: No sample data was seeded. The sample-data path writes business records and was inspected only statically.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F212` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/settings.js`. Anchor: `await seedSampleData();`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/sample-data.js`. Anchor: `export async function seedSampleData()`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/sample-data.js`. Anchor: `if (existing.customers > 0 || existing.bills > 0)`.

### Tailorman F213: Remove sample records

Source module: Shop settings. Evidence class: Code-defined.

Shows sample customer and bill counts and a confirmation before deletion. Cleanup deletes flagged sample customers, every measurement beneath those customers, and flagged sample bills and expenses. Shared settings and counters are not modified by the inspected cleanup path.

Original role context: Admin

Verification gap: No cleanup was run. Measurements later added to a sample customer are included in that customer's cleanup, even when the measurement itself lacks the sample flag.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F213` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/settings.js`. Anchor: `title: "Remove sample data?"`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/sample-data.js`. Anchor: `export async function clearSampleData()`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/sample-data.js`. Anchor: `getDocs(tCol("customers", cDoc.id, "measurements"))`.

### Tailormate F168: First-store onboarding

Source module: Stores and shop setup. Evidence class: Code-defined.

A new authenticated account can create its first store through the shared shop wizard. Success merges returned shop_id into the local user object and updates auth context. The first store is submitted as the main store.

Original role context: Signed-in shop user; client permissions and selected-shop context apply

Verification gap: Code-defined. This source review did not execute the action, verify a persisted result, or test backend authorization. Parent browser observations provide separate screen context.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F168` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/create-shop/page-25f8c06f2c1a8147.js`. Anchor: `title:"Create your first store"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/create-shop/page-25f8c06f2c1a8147.js`. Anchor: `isFirstShop:!0`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/create-shop/page-25f8c06f2c1a8147.js`. Anchor: `shop_id:null==r?void 0:r.shop_id`.

### NoolTech F261: Create a shop account

Source module: Signup and onboarding. Evidence class: Code-defined.

Collect shopName, businessType, tailoring specialization, full name, email, phone, and password, then call register.

Original role context: Shop owner

Verification gap: Defined in shipped client code; successful server operation and full runtime behavior were not tested in this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F261` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/SignupPage-DcgW0U6K.js`. Anchor: `name:"shopName"`.

### NoolTech F262: Tailor and boutique specialization

Source module: Signup and onboarding. Evidence class: Code-defined.

Business setup distinguishes tailor, boutique, and both; tailoring specialization supports womens, mens, and unisex.

Original role context: Shop owner

Verification gap: Defined in shipped client code; successful server operation and full runtime behavior were not tested in this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F262` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/SignupPage-DcgW0U6K.js`. Anchor: `Women's Tailoring`.

### NoolTech F263: Signup password visibility and minimum length

Source module: Signup and onboarding. Evidence class: Code-defined.

Signup has a show/hide password button and HTML minLength 6. This differs from invited-staff activation requiring 8 characters.

Original role context: Shop owner

Verification gap: Defined in shipped client code; successful server operation and full runtime behavior were not tested in this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F263` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/SignupPage-DcgW0U6K.js`. Anchor: `minLength:6`.

### NoolTech F264: Email verification guidance

Source module: Signup and onboarding. Evidence class: Code-defined.

Successful registration shows Check Your Email and a return-to-sign-in link.

Original role context: Shop owner

Verification gap: Defined in shipped client code; successful server operation and full runtime behavior were not tested in this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F264` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/SignupPage-DcgW0U6K.js`. Anchor: `Check Your Email`.

### NoolTech F265: Referral and promotional code validation

Source module: Signup and onboarding. Evidence class: Code-defined.

Preload ref or promo query values; validate uppercase codes at /api/referral/validate/:code or /api/referral/validate-promo/:code.

Original role context: Shop owner

Verification gap: Defined in shipped client code; successful server operation and full runtime behavior were not tested in this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F265` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/SignupPage-DcgW0U6K.js`. Anchor: `/api/referral/validate-promo/`.

### NoolTech F266: Google account business setup

Source module: Signup and onboarding. Evidence class: Code-defined.

Complete Google setup with setupToken, trimmed shopName, business type, specialization, phone, subscriptionPlan, and optional paymentInfo or discount code.

Original role context: Shop owner

Verification gap: Defined in shipped client code; successful server operation and full runtime behavior were not tested in this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F266` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/SetupAccountPage-BN6SRHXV.js`. Anchor: `/api/auth/complete-google-setup`.

### NoolTech F267: Plan selection and trial setup

Source module: Signup and onboarding. Evidence class: Code-defined.

Google setup loads plan definitions and offers a free 90-day trial without a credit card.

Original role context: Shop owner

Verification gap: Defined in shipped client code; successful server operation and full runtime behavior were not tested in this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F267` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/SetupAccountPage-BN6SRHXV.js`. Anchor: `All features for 90 days`.

### NoolTech F269: Onboarding and tour persistence

Source module: Signup and onboarding. Evidence class: Code-defined.

Client defines update/complete onboarding steps and update/complete/reset tour operations.

Original role context: Shop owner / staff

Verification gap: Defined in shipped client code; successful server operation and full runtime behavior were not tested in this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F269` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/index-Dk-7hFgw.js`. Anchor: `async updateOnboardingStep(u)`.

## REQ-WORKSPACE: Tenant workspace, stores, and navigation

Target behavior and acceptance: [REQ-WORKSPACE](../product/requirements.md#req-workspace-tenant-workspace-stores-and-navigation).

### Tailorman F193: Tenant-scoped business records

Source module: Workspace and navigation. Evidence class: Code-defined.

Client path helpers place business collections under tenants/{tenantId}. A userTenants mapping resolves one shop per user. User profile and shop context load together before business pages are available.

Original role context: All shop users

Verification gap: This establishes the client data model, not tested isolation between shops or verified backend rules.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F193` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/tenant.js`. Anchor: `export function tCol(...segments)`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/tenant.js`. Anchor: `export async function getUserTenantId(uid)`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/auth.js`. Anchor: `const [tenant, planConfig, profile] = await Promise.all([`.

### Tailorman F194: Role-aware navigation and shell cache

Source module: Workspace and navigation. Evidence class: Code-defined.

Groups pages into Main, Orders, Workshop, Boutique, Finance, Settings and Help. Caches role-specific shell markup and a feature signature across page navigation, then rebuilds it when the role or allowed feature set changes. Mobile navigation exposes common role-specific tasks and a menu drawer.

Original role context: Admin; cashier; cutter; stitcher

Verification gap: Defined in captured client code. No successful authenticated action or server authorization behavior was tested for this entry.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F194` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/ui.js`. Anchor: `const NAV_GROUPS = [`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/ui.js`. Anchor: `function navFeatureSignature()`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/ui.js`. Anchor: `function buildBottomNav(role, activePage)`.

### Tailorman F196: Shop branding in app navigation

Source module: Workspace and navigation. Evidence class: Code-defined.

Loads the saved shop name to replace header branding and the business suffix in page titles. Uses the session hint for the first render and shop settings for later refresh.

Original role context: All shop users

Verification gap: Defined in captured client code. No successful authenticated action or server authorization behavior was tested for this entry.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F196` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/ui.js`. Anchor: `getShopSettings().then((s) =>`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/auth.js`. Anchor: `export function getCachedShopName()`.

### Tailormate F164: Shop selection in the header

Source module: Workspace access and permissions. Evidence class: Code-defined.

The header builds its location selector from shops containing WEB_ACCESS, displays shop_name and shop_location, updates selectedShop, and recognizes a selected -1 All locations sentinel when supplied among permission records. Dependent report views subscribe to selected-shop changes.

Original role context: Signed-in shop user; client permissions and selected-shop context apply

Verification gap: Code-defined. This source review did not execute the action, verify a persisted result, or test backend authorization. Parent browser observations provide separate screen context.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F164` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/1892-b3ffd2b6cbf9e410.js`. Anchor: `setSelectedShop:N`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/1892-b3ffd2b6cbf9e410.js`. Anchor: `return"WEB_ACCESS"===t`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/8852-96ea6dc9aa39cc2a.js`. Anchor: `l.Z.subscribe((e,t)=>`.

### Tailormate F169: Store directory and search

Source module: Stores and shop setup. Evidence class: Code-defined.

Manage stores lists logo, name, location, main-store marker, Outlet/Workshop badges, email, contact, and join date. Search filters loaded shop names without case sensitivity. EDIT_SHOP controls Add shop and row edit/remove controls.

Original role context: Signed-in shop user; client permissions and selected-shop context apply

Verification gap: Code-defined. This source review did not execute the action, verify a persisted result, or test backend authorization. Parent browser observations provide separate screen context.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F169` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/stores/page-b6432f9699257d78.js`. Anchor: `accessorKey:"shop_name"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/stores/page-b6432f9699257d78.js`. Anchor: `D=j("EDIT_SHOP")`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/stores/page-b6432f9699257d78.js`. Anchor: `includes(k.toLocaleLowerCase())`.

### Tailormate F170: Shop details wizard

Source module: Stores and shop setup. Evidence class: Code-defined.

The first step edits shop name, code, store type, stitching customer type, main-shop flag, contact phone, email, website, Instagram, WhatsApp, and Facebook. Shop name requires at least three characters. Email permits empty or valid email. Store types are Outlet, Workshop, Both; stitching types are Gents, Ladies, Both.

Original role context: Signed-in shop user; client permissions and selected-shop context apply

Verification gap: Code-defined. This source review did not execute the action, verify a persisted result, or test backend authorization. Parent browser observations provide separate screen context.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F170` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/9371-4f67be6f8c235cf7.js`. Anchor: `shop_name:N.z.string().min(3,`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/9371-4f67be6f8c235cf7.js`. Anchor: `title:"Stitching done for:"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/9371-4f67be6f8c235cf7.js`. Anchor: `"Whatsapp Number"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/create-shop/layout-e6c925b5a1b53d54.js`. Anchor: `1:"Outlet",2:"Workshop",3:"Both"`.

### Tailormate F171: Address and regional lookup

Source module: Stores and shop setup. Evidence class: Code-defined.

The second shop step accepts location label, address, city, country, state, and postal code. Selecting a country fetches its states and clears the old state selection. Existing store data is converted into these select values during editing.

Original role context: Signed-in shop user; client permissions and selected-shop context apply

Verification gap: Code-defined. This source review did not execute the action, verify a persisted result, or test backend authorization. Parent browser observations provide separate screen context.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F171` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/9371-4f67be6f8c235cf7.js`. Anchor: `shop_address1:N.z.string().optional()`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/9371-4f67be6f8c235cf7.js`. Anchor: `get("/getstates",{params:{country_id:e}})`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/9371-4f67be6f8c235cf7.js`. Anchor: `D("state_id",null)`.

### Tailormate F172: Map-based shop location

Source module: Stores and shop setup. Evidence class: Code-defined.

A map dialog searches Places with debounce and cached suggestions, geocodes a chosen address, previews a marker, and returns latitude, longitude, and address. The field can clear an existing selection. Save serializes coordinates as strings.

Original role context: Signed-in shop user; client permissions and selected-shop context apply

Verification gap: Code-defined. Maps lookup accuracy and persisted coordinates were not tested.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F172` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/9371-4f67be6f8c235cf7.js`. Anchor: `placeholder:"Search places"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/9371-4f67be6f8c235cf7.js`. Anchor: `cache:86400,debounce:300`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/9371-4f67be6f8c235cf7.js`. Anchor: `children:"Select Location"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/9371-4f67be6f8c235cf7.js`. Anchor: `latitude:null!==(v=`.

### Tailormate F173: Shop logo and photo

Source module: Stores and shop setup. Evidence class: Code-defined.

Shop setup supports one logo and one shop image. Before saving, the wizard builds the image payload from existing and selected images and submits it with the shop record.

Original role context: Signed-in shop user; client permissions and selected-shop context apply

Verification gap: Code-defined. This source review did not execute the action, verify a persisted result, or test backend authorization. Parent browser observations provide separate screen context.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F173` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/9371-4f67be6f8c235cf7.js`. Anchor: `name:"shop_logo",title:"Shop logo:"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/9371-4f67be6f8c235cf7.js`. Anchor: `name:"shop_photo",title:"Shop photo:"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/9371-4f67be6f8c235cf7.js`. Anchor: `let b=await S(`.

### Tailormate F174: Copy from main shop

Source module: Stores and shop setup. Evidence class: Code-defined.

When adding another shop, Copy from Main Shop can prefill the first-step shop and contact fields from the loaded main store. It does not copy the second-step address fields in the inspected handler.

Original role context: Signed-in shop user; client permissions and selected-shop context apply

Verification gap: Code-defined. This source review did not execute the action, verify a persisted result, or test backend authorization. Parent browser observations provide separate screen context.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F174` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/9371-4f67be6f8c235cf7.js`. Anchor: `children:"Copy from Main Shop"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/9371-4f67be6f8c235cf7.js`. Anchor: `R&&o&&e()`.

### Tailormate F175: Workshop selection constraint

Source module: Stores and shop setup. Evidence class: Code-defined.

When the loaded store set already contains a non-Outlet store, creation disables non-Outlet choices with Only one workshop is allowed. Editing the existing non-Outlet entry bypasses that disabling condition.

Original role context: Signed-in shop user; client permissions and selected-shop context apply

Verification gap: Code-defined UI constraint. Concurrent creation and backend enforcement were not tested.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F175` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/9371-4f67be6f8c235cf7.js`. Anchor: `tooltip:"1"!==e.value?"Only one workshop is allowed"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/9371-4f67be6f8c235cf7.js`. Anchor: `(null==t?void 0:t.store_type_id)!=="1"`.

### Tailormate F176: Edit and remove stores

Source module: Stores and shop setup. Evidence class: Code-defined.

Editing reuses the two-step wizard and submits shop_id. Removal requires confirmation and calls the same save helper with shop_id, shop_name, and status_id -1, followed by store-query invalidation. The generic confirmation copy speaks about account deletion even though this action targets a shop.

Original role context: Shop user with EDIT_SHOP according to client controls

Verification gap: Code-defined. This source review did not execute the action, verify a persisted result, or test backend authorization. Parent browser observations provide separate screen context.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F176` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/stores/page-b6432f9699257d78.js`. Anchor: `status_id:"-1"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/9371-4f67be6f8c235cf7.js`. Anchor: `shop_id:null==t?void 0:t.shop_id`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/2280-431fea3a652d0870.js`. Anchor: `post("/saveshop",e)`.

### NoolTech F045: Branch assignment

Source module: Tailor orders. Evidence class: Code-defined.

Order creation uses available locations and default location, then submits optional locationId.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F045` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/CreateOrderPage-Cx7T-Y8K.js`. Anchor: `locationId:W`.

### NoolTech F237: Branch management

Source module: Locations. Evidence class: Code-defined.

List, add, edit, remove with confirmation, or set default location. Fields are required name, street/city/state/pincode, phone, and email. multiLocation entitlement controls the tab.

Original role context: Authorized shop administrator

Verification gap: Client action, form, or service definition exists. Server execution, persistence, and access enforcement were not tested by this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F237` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/SettingsPage-BspbE0gu.js`. Anchor: `addLocation`.

## REQ-SETTINGS: Business, appearance, and document preferences

Target behavior and acceptance: [REQ-SETTINGS](../product/requirements.md#req-settings-business-appearance-and-document-preferences).

### Tailorman F207: Business and receipt profile

Source module: Shop settings. Evidence class: Code-defined.

Admin settings load and save shop name, tagline, address, phone, email and GSTIN. Values are trimmed in the data function and merged into settings/shop. Shows a warning when the shop name is blank because receipts would lack it.

Original role context: Admin

Verification gap: Defined in captured client code. No successful authenticated action or server authorization behavior was tested for this entry.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F207` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/settings.js`. Anchor: `function bindShopForm()`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/db.js`. Anchor: `export async function setShopSettings(data)`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/settings.js`. Anchor: `warn.classList.toggle("hidden", !!nameVal.trim())`.

### Tailorman F211: Default cutting and stitching wage rates

Source module: Shop settings. Evidence class: Code-defined.

Admin settings load and save non-negative numeric cutting and stitching rates. Settings changes generate an audit entry and become the default wage rates used by the wage data functions.

Original role context: Admin

Verification gap: Defined in captured client code. No successful authenticated action or server authorization behavior was tested for this entry.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F211` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/settings.js`. Anchor: `function bindRatesForm()`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/db.js`. Anchor: `export async function setWageSettings({ cuttingRate, stitchingRate })`.

### Tailormate F177: Measurement units and offered services

Source module: Shop settings. Evidence class: Code-defined.

Settings select measurement unit CMS or IN, displayed as Cms or Inch. Offered services are Stitching, Material, and Readymade, encoded 1, 2, and 3. At least one service is required. The submitted service list is comma-separated.

Original role context: Signed-in shop user; client permissions and selected-shop context apply

Verification gap: Code-defined. This source review did not execute the action, verify a persisted result, or test backend authorization. Parent browser observations provide separate screen context.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F177` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/settings/page-8e56f7911d5a369e.js`. Anchor: `CMS:"Cms",IN:"Inch"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/settings/page-8e56f7911d5a369e.js`. Anchor: `active_services_options:I.z.array(I.z.string()).refine(e=>e.length>0`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/settings/page-8e56f7911d5a369e.js`. Anchor: `active_services:`.

### Tailormate F178: Measurement and standard-master visibility

Source module: Shop settings. Evidence class: Code-defined.

Settings control hide measurements to customer, hide standard dress items, and hide standard services. Boolean form values are saved as string flags 1 or 0.

Original role context: Signed-in shop user; client permissions and selected-shop context apply

Verification gap: Code-defined settings. Their effect on every customer-facing document or mobile screen was not verified.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F178` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/settings/page-8e56f7911d5a369e.js`. Anchor: `label:"Hide measurements to customer"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/settings/page-8e56f7911d5a369e.js`. Anchor: `label:"Hide Standard Dress Items"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/settings/page-8e56f7911d5a369e.js`. Anchor: `label:"Hide Standard Services"`.

### Tailormate F183: Order-list date window

Source module: Shop settings. Evidence class: Code-defined.

Default No. of days to Show in Order List selects 1-10 days, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330, or 365 days. The form requires a selected option and saves its value as a string.

Original role context: Signed-in shop user; client permissions and selected-shop context apply

Verification gap: Code-defined. This source review did not execute the action, verify a persisted result, or test backend authorization. Parent browser observations provide separate screen context.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F183` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/settings/page-8e56f7911d5a369e.js`. Anchor: `label:"Default No. of days to Show in Order List"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/settings/page-8e56f7911d5a369e.js`. Anchor: `order_default_no_of_days:(0,T.YR)()`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/settings/page-8e56f7911d5a369e.js`. Anchor: `label:"1 Year",value:365`.

### Tailormate F185: Settings save and shared refresh

Source module: Shop settings. Evidence class: Code-defined.

Settings load from /getusersettings by user_id, normalize string flags and comma-separated choices into form values, and save through /saveusersettings. Success updates the local settings store and invalidates user-setting and stitch-type query groups.

Original role context: Signed-in shop user; client permissions and selected-shop context apply

Verification gap: Code-defined. This source review did not execute the action, verify a persisted result, or test backend authorization. Parent browser observations provide separate screen context.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F185` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/settings/page-8e56f7911d5a369e.js`. Anchor: `get("/getusersettings",{params:{user_id:e}})`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/settings/page-8e56f7911d5a369e.js`. Anchor: `post("/saveusersettings",e)`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/settings/page-8e56f7911d5a369e.js`. Anchor: `queryKey:c.rr.all`.

### Tailormate F209: Appearance and desktop display controls

Source module: Workspace access and permissions. Evidence class: Code-defined.

The active header offers Light and Dark theme choices, a desktop-only Full Screen action using the browser fullscreen API, and a responsive mobile menu control. Theme changes affect the shared shell and charts.

Original role context: Signed-in shop user; client permissions and selected-shop context apply

Verification gap: Code-defined. This source review did not execute the action, verify a persisted result, or test backend authorization. Parent browser observations provide separate screen context.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F209` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/1892-b3ffd2b6cbf9e410.js`. Anchor: `children:"Light"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/1892-b3ffd2b6cbf9e410.js`. Anchor: `children:"Dark"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/1892-b3ffd2b6cbf9e410.js`. Anchor: `children:"Full Screen"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/1892-b3ffd2b6cbf9e410.js`. Anchor: `onClick:()=>{t(!e)}`.

### NoolTech F224: Personal profile and avatar

Source module: Settings. Evidence class: Code-defined.

Edit display name and show fixed email. Saves first/last name through profile API. Avatar accepts image files up to 5 MB and is stored as data URL in localStorage user_avatar.

Original role context: Authenticated shop user

Verification gap: Profile update is server-backed in code. Avatar path shown here is local browser storage, so cross-device synchronization is not established.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F224` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/SettingsPage-BspbE0gu.js`. Anchor: `user_avatar`.

### NoolTech F225: Business profile and business mode

Source module: Settings. Evidence class: Code-defined.

Set tailor/boutique/both business type, shop name, male/female/unisex specialization, boutique/custom-tailoring/alterations/ethnic-wear category, description, GST number, business hours, social links, and full business address.

Original role context: Authenticated shop user

Verification gap: Client action, form, or service definition exists. Server execution, persistence, and access enforcement were not tested by this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F225` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/SettingsPage-BspbE0gu.js`. Anchor: `businessCategory`.

### NoolTech F227: Invoice branding

Source module: Settings. Evidence class: Code-defined.

Business tagline, logo URL, invoice footer, and brand primary color are saved in profile branding. Custom-branding UI references enterprise entitlement.

Original role context: Authenticated shop user

Verification gap: Client action, form, or service definition exists. Server execution, persistence, and access enforcement were not tested by this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F227` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/SettingsPage-BspbE0gu.js`. Anchor: `brandingInvoiceFooter`.

### NoolTech F229: Language and theme

Source module: Settings. Evidence class: Code-defined.

Select app language and light/dark/system appearance. Settings has distinct language and display tabs.

Original role context: Authenticated shop user

Verification gap: Client action, form, or service definition exists. Server execution, persistence, and access enforcement were not tested by this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F229` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/SettingsPage-BspbE0gu.js`. Anchor: `settings.themeSystem`.

## REQ-BACKUP: Scheduled business exports and recovery

Target behavior and acceptance: [REQ-BACKUP](../product/requirements.md#req-backup-scheduled-business-exports-and-recovery).

### Tailormate F186: Backup activation and frequency

Source module: Scheduled backups. Evidence class: Code-defined.

Backup data configures an active flag and Daily, Weekly, Monthly, or Yearly frequency. Loading uses /getuserbackupschedule for the user. Save sends frequency, delivery_type, optional id, user_id, and is_active as 1 or 0.

Original role context: Signed-in shop user; client permissions and selected-shop context apply

Verification gap: Code-defined scheduling form. No backup job, delivered file, scheduler execution, restoration, or delivery guarantee was observed.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F186` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/backup-data/page-77033a376f45b7ad.js`. Anchor: `l.WEEKLY="2",l.MONTHLY="3",l.YEARLY="4"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/backup-data/page-77033a376f45b7ad.js`. Anchor: `get("/getuserbackupschedule"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/backup-data/page-77033a376f45b7ad.js`. Anchor: `post("/saveuserbackupschedule",e)`.

### Tailormate F187: Backup delivery preference

Source module: Scheduled backups. Evidence class: Code-defined.

The page describes Excel backup as an email attachment or a cloud-upload download link. The actual delivery choices are code1 labelled Daily and code2 labelled Upload to cloud. The first label is inconsistent with the delivery description.

Original role context: Signed-in shop user; client permissions and selected-shop context apply

Verification gap: Code-defined. The code1 server delivery meaning and any configured email recipient were not established.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F187` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/backup-data/page-77033a376f45b7ad.js`. Anchor: `let L={1:"Daily",2:"Upload to cloud"}`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/backup-data/page-77033a376f45b7ad.js`. Anchor: `The app will take backup on regular intervals.`.

### Tailormate F188: Disable backup schedule

Source module: Scheduled backups. Evidence class: Code-defined.

Turning Activate off hides delivery and frequency controls. Saving an inactive schedule sends empty delivery_type and frequency rather than retaining their last values in that payload.

Original role context: Signed-in shop user; client permissions and selected-shop context apply

Verification gap: Code-defined. This source review did not execute the action, verify a persisted result, or test backend authorization. Parent browser observations provide separate screen context.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F188` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/backup-data/page-77033a376f45b7ad.js`. Anchor: `delivery_type:(null==e?void 0:e.is_active)?`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/backup-data/page-77033a376f45b7ad.js`. Anchor: `is_active:(null==e?void 0:e.is_active)?"1":"0"`.

## REQ-AUDIT: Business audit and change history

Target behavior and acceptance: [REQ-AUDIT](../product/requirements.md#req-audit-business-audit-and-change-history).

### Tailorman F177: Audit activity viewer and action filter

Source module: Audit history. Evidence class: Code-defined.

Load the latest 200 audit entries, refresh on request, and filter by exact action key. Show action label, details, actor name, time, and entity label. The generic entity link targets bill.html for every entity ID, even when the event concerns another entity type.

Original role context: Admin, auditLog entitlement

Verification gap: Code-defined. No authenticated execution or persisted result was observed in this source review.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F177` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/audit-log.js`. Anchor: `async function load()`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/audit-log.js`. Anchor: `function render()`.

### Tailorman F178: Audit event details

Source module: Audit history. Evidence class: Code-defined.

Present named events for bill creation/edit/status/reopen/void/undo, stage changes, payments, wages, expense add/delete, manual ledger add/delete, boutique sale/payment/purchase, customer deletion, staff updates, and settings changes. Format supported event amounts, fields, stages, and roles; fall back to the raw event key for unknown actions.

Original role context: Admin, auditLog entitlement

Verification gap: Code-defined. No authenticated execution or persisted result was observed in this source review.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F178` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/audit-log.js`. Anchor: `function actionMeta(action)`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/audit-log.js`. Anchor: `function formatDetails(action, d)`.

### Tailorman F179: Actor and timestamp capture

Source module: Audit history. Evidence class: Code-defined.

Audit creation writes action, entity ID and label, actor UID and name, detail payload, and server timestamp to tenant auditLog. Many business handlers issue this write with a caught error, so the inspected client does not prove every business mutation receives an audit entry or that stored audit data is immutable.

Original role context: Admin, auditLog entitlement

Verification gap: Code-defined. No authenticated execution or persisted result was observed in this source review.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F179` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/db.js`. Anchor: `export async function addAuditEntry(`.

### NoolTech F238: Activity and security log reference

Source module: Audit logs. Evidence class: Code-defined.

Read paginated logs with category/severity/limit/offset parameters; filter all/auth/security/data/admin/billing, inspect info/warning/critical severity, view summary statistics, export CSV, and define a security-events query. auditLogs entitlement controls navigation.

Original role context: Authenticated shop user

Verification gap: Log views and read endpoints exist. Event completeness, immutability, and retention were not established.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F238` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/SettingsPage-BspbE0gu.js`. Anchor: `/api/audit-logs/security`.

## REQ-PLAN: Plans, usage limits, trial, and account access

Target behavior and acceptance: [REQ-PLAN](../product/requirements.md#req-plan-plans-usage-limits-trial-and-account-access).

### Tailorman F052: Monthly bill-cap check

Source module: Tailoring bill intake. Evidence class: Code-defined.

Before saving, reads the plan's monthlyBillLimit and counts bills created this calendar month. Reaching the cap shows an upgrade error. A failed count is logged and billing proceeds.

Original role context: admin, cashier

Verification gap: Code-defined client check. This fail-open cap check does not establish server quota enforcement.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F052` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/new-bill.js`. Anchor: `const billLimit = getPlanLimit("monthlyBillLimit");`.

### Tailorman F118: Monthly sale limit

Source module: Boutique sales and receipts. Evidence class: Code-defined.

Before save, check boutiqueSalesLimit by querying the current month through today and rejecting another sale when the returned count reaches the limit.

Original role context: Admin and cashier, boutiqueSales entitlement

Verification gap: Code-defined. No authenticated execution or persisted result was observed in this source review.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F118` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/sales.js`. Anchor: `const salesLimit = getPlanLimit("boutiqueSalesLimit")`.

### Tailorman F165: Active-seat limit

Source module: Employees and staff access. Evidence class: Code-defined.

Count active employee profiles before adding staff and reject when seatLimit is reached. Inactive profiles do not count. If the count fails, the client logs a warning and allows account creation.

Original role context: Admin

Verification gap: Code-defined. No authenticated execution or persisted result was observed in this source review.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F165` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/employees.js`. Anchor: `const seatLimit = getPlanLimit("seatLimit")`.

### Tailorman F197: Three configurable plan tiers

Source module: Plans and subscription access. Evidence class: Code-defined.

Defines Free, Premium and Business with six numeric limits: monthly bills, customers, seats, stitching-inventory items, boutique items and boutique sales per month. Zero means unlimited. Fifteen feature flags cover GST, express, loyalty, delivery, alterations, outstanding, kanban, wages, inventory, boutique sales and reports, basic and advanced reports, expenses and audit log.

Original role context: Shop users; super administrator configures tiers

Verification gap: These are captured code defaults and config fields. The live Firestore overrides must be recorded separately and take precedence over fallback values.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F197` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/tenant.js`. Anchor: `export const PLAN_LIMITS = [`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/tenant.js`. Anchor: `export const PLAN_FEATURE_GROUPS = [`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/tenant.js`. Anchor: `export const DEFAULT_PLAN_CONFIG = {`.

### Tailorman F198: Live plan and pricing configuration

Source module: Plans and subscription access. Evidence class: Code-defined.

Reads superAdminSettings/plans, overlays saved tier limits and feature flags onto defaults, and merges saved currency, trial length, monthly pricing and annual monthly-equivalent pricing. Uses fallback defaults when the document is missing or cannot be read.

Original role context: Public visitors and authenticated users

Verification gap: Defined in captured client code. No successful authenticated action or server authorization behavior was tested for this entry.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F198` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/tenant.js`. Anchor: `export async function getPlanConfig()`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/tenant.js`. Anchor: `...(saved[tier]?.features || {})`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/tenant.js`. Anchor: `premium:  { ...DEFAULT_PRICING.premium`.

### Tailorman F199: Trial provisioning and effective entitlement

Source module: Plans and subscription access. Evidence class: Code-defined.

New shops start a trial whose duration comes from live pricing.trialDays, with a 30-day fallback. Trial calculations use an origin Date-header clock sync when available. Active trials use Premium limits and feature flags rather than Business flags.

Original role context: New shop owner; trial shop users

Verification gap: No new trial was created. 'All features' marketing copy is not proof that Business-only flags are enabled during trial.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F199` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/tenant.js`. Anchor: `const TRIAL_DAYS = 30;`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/tenant.js`. Anchor: `const days = saved?.pricing?.trialDays;`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/auth.js`. Anchor: `if (state === "trial") plan = "premium";`.

### Tailorman F200: Subscription lifecycle and grace

Source module: Plans and subscription access. Evidence class: Code-defined.

Computes trial, active, grace, expired and suspended states. Trials have no grace after trialEndsAt. Paid active subscriptions have three days after paidUntil. Active accounts without paidUntil are non-expiring according to the client calculation.

Original role context: All shop users

Verification gap: Lifecycle calculations are code-defined. Backend time checks and entitlement enforcement were not exercised.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F200` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/tenant.js`. Anchor: `const TRIAL_GRACE_DAYS = 0;`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/tenant.js`. Anchor: `const PAID_GRACE_DAYS = 3;`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/tenant.js`. Anchor: `export function computeTenantState(tenant, now = serverNow())`.

### Tailorman F201: Mid-session expiry and suspension checks

Source module: Plans and subscription access. Evidence class: Code-defined.

Checks local entitlement each minute, refreshes tenant state on returning to a visible tab no more often than five minutes, and probes shop-settings reads after permission denial. Locked-state handling hides the document, attempts to terminate Firestore and clear its IndexedDB cache within three seconds, then redirects to the subscription page.

Original role context: All shop users

Verification gap: No subscription was changed or lockout forced. Cache clearing is bounded by a timeout and should not be described as a verified guaranteed wipe.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F201` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/auth.js`. Anchor: `function startLockoutWatch()`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/auth.js`. Anchor: `async function probeServerLock()`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/auth.js`. Anchor: `async function lockDown()`.

### Tailorman F202: Trial and renewal reminders

Source module: Plans and subscription access. Evidence class: Code-defined.

Shows trial days left, a warning banner in the last seven days, and last-day expiry time. Paid subscriptions show an active-until chip and a persistent grace banner after expiry. Owners get renewal links while staff are told to ask the owner.

Original role context: All shop users; owner renewal controls

Verification gap: Defined in captured client code. No successful authenticated action or server authorization behavior was tested for this entry.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F202` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/ui.js`. Anchor: `function showTrialUiIfNeeded()`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/ui.js`. Anchor: `if (days <= 7) renderTrialBanner(tenant, days);`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/ui.js`. Anchor: `function renderGraceBanner(tenant, daysLeft)`.

### Tailorman F206: Owner account export after lockout

Source module: Subscription billing. Evidence class: Code-defined.

Offers customer, measurement and bill CSV exports on the expired-shop page. Downloads come from POST /api/account/export with the requested record type, Firebase ID token and optional App Check token, so the route is separate from direct Firestore reads.

Original role context: Expired or suspended shop owner

Verification gap: No export request was submitted. Owner authorization, export contents and availability after actual expiry remain unverified.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F206` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/billing.js`. Anchor: `export async function downloadAccountExport(type)`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/billing.js`. Anchor: `const res = await fetch("/api/account/export", {`.
- Archived evidence coordinate: `research_tailorman/evidence/pages/trial-expired.html`. Anchor: `data-export="measurements"`.

### Tailorman F234: Public plan comparison and billing-cycle toggle

Source module: Help and public website. Evidence class: Code-defined.

The landing page displays tier prices and feature groups from live configuration. Switching annual billing shows the monthly equivalent, annual total and savings. Trial-length copy updates from pricing config. Static FAQ and structured metadata can retain older default limits and prices.

Original role context: Public visitors

Verification gap: Live rendered values should be recorded by browser observation. Static fallback copy is not the effective plan configuration.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F234` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/landing.js`. Anchor: `function buildFeats(cfg)`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/landing.js`. Anchor: `function applyPricing(pr)`.
- Archived evidence coordinate: `research_tailorman/evidence/pages/root.html`. Anchor: `There is a permanent free plan with 1 seat`.

### NoolTech F081: Repeat/invoice/message feature gates

Source module: Order details. Evidence class: Code-defined.

Repeat order, branded invoice, and WhatsApp/SMS template actions depend on feature flags.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F081` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/OrderDetailPage-B2ZYKSVH.js`. Anchor: `canRepeatOrder:Tn,canViewBrandedInvoice:An,canSendWhatsApp:Nn`.

### NoolTech F140: Feature-plan gates

Source module: Access and refresh. Evidence class: Code-defined.

Feature context exposes gates for repeat order, calendar, balance due, measurement diff/charts, messaging, invoice, Kanban, product catalog, and bulk operations.

Original role context: Admin, manager, or permitted staff

Verification gap: Actual trial/tenant feature configuration can override static plan labels.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F140` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/index-Dk-7hFgw.js`. Anchor: `canViewMeasurementDiff:m.measurementDiff`.

### NoolTech F246: Plan selection and usage limits

Source module: Subscription. Evidence class: Code-defined.

Free/basic/pro/enterprise plans, trial days, usage progress, limit warnings at 80% and full limits, upgrade prompts, and prevention of downgrades where current usage exceeds proposed limits. Legacy plus aliases/copy also exist.

Original role context: Authenticated shop user

Verification gap: Client plan references and gates are defined. Current commercial entitlements depend on live plans/features responses; stale Plus/Plus+ copy must not override them.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F246` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/SettingsPage-BspbE0gu.js`. Anchor: `usageExceedsLimits`.

### NoolTech F253: Business-type and plan gates

Source module: Access and entitlements. Evidence class: Code-defined.

Tailor features depend on tailor/both mode; inventory/vendors/purchase orders on boutique/both. Runtime feature status is fetched. Static mapping places worker/vendor/purchasing/inventory/advanced reporting/analytics on pro and workload/worker analytics/multi-location/custom branding/audit logs on enterprise.

Original role context: Authenticated shop user

Verification gap: The static default plan map is recoverable, but the live /api/features/status response and backend authorization are authoritative and can differ.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F253` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/index-Dk-7hFgw.js`. Anchor: `workerManagement:"pro"`.

### NoolTech F271: Compare monthly and yearly plans

Source module: Pricing. Evidence class: Code-defined.

Display plan prices, annualized monthly equivalent, yearly savings, customer/order/user limits, feature lists, and a popular badge. Prices are returned by the plan service.

Original role context: Prospective shop owner

Verification gap: Defined in shipped client code; successful server operation and full runtime behavior were not tested in this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F271` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/PricingPage-kSgQ6KPJ.js`. Anchor: `See all features`.

### NoolTech F272: Open detailed plan benefits

Source module: Pricing. Evidence class: Code-defined.

Each plan opens a details modal containing its features and limits. Plan selection routes to /signup with plan and billing parameters.

Original role context: Prospective shop owner

Verification gap: Defined in shipped client code; successful server operation and full runtime behavior were not tested in this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F272` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/PricingPage-kSgQ6KPJ.js`. Anchor: `/signup?plan=`.

### NoolTech F273: Trial and pricing FAQs

Source module: Pricing. Evidence class: Code-defined.

Public page advertises a 90-day free trial and answers plan switching, limits, security, and custom-plan questions. Marketing claims are not verified server guarantees.

Original role context: Prospective shop owner

Verification gap: Defined in shipped client code; successful server operation and full runtime behavior were not tested in this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F273` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/PricingPage-kSgQ6KPJ.js`. Anchor: `Frequently asked questions`.

## REQ-BILLING: Subscription payment, invoices, and referral credits

Target behavior and acceptance: [REQ-BILLING](../product/requirements.md#req-billing-subscription-payment-invoices-and-referral-credits).

### Tailorman F203: Owner renewal and plan selection

Source module: Subscription billing. Evidence class: Code-defined.

The subscription page offers Premium and Business with monthly or annual billing, live prices, annual total and plan highlights. Non-owner users cannot see payment plans. Suspended shops cannot pay to lift suspension, while owners can still see data-export controls.

Original role context: Shop admin or owner

Verification gap: The renewal UI was inspected statically. No checkout or payment was initiated. No Free selection is present in this inspected renewal flow.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F203` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/trial-expired.js`. Anchor: `const PLANS = [`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/trial-expired.js`. Anchor: `if (!isOwner || state === "suspended")`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/trial-expired.js`. Anchor: `const yearly = perMonth * 12;`.

### Tailorman F204: Razorpay payment order and verification

Source module: Subscription billing. Evidence class: Code-defined.

Loads Razorpay checkout on demand, posts plan and cycle to /api/billing/order, opens the returned order in a payment modal, and posts Razorpay order ID, payment ID and signature to /api/billing/verify. Handles dismissal, failed payments and pending activation separately.

Original role context: Shop admin or owner

Verification gap: Client integration only. Backend price computation, signature validation, webhook handling and actual settlement are not available in captured sources and were not tested.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F204` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/billing.js`. Anchor: `const order = await postJson("/api/billing/order", { plan, cycle });`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/billing.js`. Anchor: `await postJson("/api/billing/verify", {`.

### Tailorman F205: Post-payment activation check

Source module: Subscription billing. Evidence class: Code-defined.

After the checkout success callback, reloads the tenant from the server up to six times at 1.5-second intervals. Navigates to dashboard when active or trial, otherwise reloads the payment page so pending activation can settle.

Original role context: Paying shop owner

Verification gap: Defined in captured client code. No successful authenticated action or server authorization behavior was tested for this entry.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F205` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/trial-expired.js`. Anchor: `async function goToDashboardWhenActive()`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/trial-expired.js`. Anchor: `for (let i = 0; i < 6; i++)`.

### NoolTech F247: Razorpay upgrade and renewal checkout

Source module: Subscription. Evidence class: Code-defined.

Monthly/yearly billing, mid-cycle unused-time credit, amount due, included features, payment order/subscription verification, success state, and optional Razorpay auto-renewal. UI supports reminder-based manual renewal as an alternative.

Original role context: Authenticated shop user

Verification gap: Checkout integration code exists. No charge, subscription, renewal, proration calculation, or webhook activation was executed.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F247` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/SettingsPage-BspbE0gu.js`. Anchor: `Mid-cycle Upgrade Credit`.

### NoolTech F248: Subscription billing and invoice history

Source module: Billing. Evidence class: Code-defined.

Read current subscription, plan, status, next billing, failed payment attempts, grace-period warning, and invoice history. Invoice amount is formatted from minor units; download action opens /api/billing/invoices/:id/download in a new tab.

Original role context: Authenticated shop user

Verification gap: Client action, form, or service definition exists. Server execution, persistence, and access enforcement were not tested by this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F248` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/BillingPage-yg0BBQBP.js`. Anchor: `/api/billing/invoices`.

### NoolTech F249: Referral program

Source module: Billing. Evidence class: Code-defined.

Fetch referral code and link, copy signup link, show referral count/earned/used/available credits and recent referrals, and apply a code within server-specified signup window for a first-subscription discount.

Original role context: Authenticated shop user

Verification gap: Referral configuration and ledgers are read from the server. Reward eligibility, credit application, and economic terms were not tested.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F249` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/BillingPage-yg0BBQBP.js`. Anchor: `/api/referral/apply-code`.

### NoolTech F268: Subscription checkout during setup

Source module: Signup and onboarding. Evidence class: Code-defined.

Load Razorpay config, create a subscription payment order, launch checkout, and verify the payment before completing setup.

Original role context: Shop owner

Verification gap: Defined in shipped client code; successful server operation and full runtime behavior were not tested in this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F268` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/SetupAccountPage-BN6SRHXV.js`. Anchor: `/api/subscriptions/verify-payment`.

## REQ-CACHE: Installable web access and offline boundaries

Target behavior and acceptance: [REQ-CACHE](../product/requirements.md#req-cache-installable-web-access-and-offline-boundaries).

### Tailorman F236: Installable web-app declaration and shortcuts

Source module: Device access and offline cache. Evidence class: Code-defined.

Manifest declares a standalone web app starting at dashboard.html, portrait-primary orientation, en-IN language, multiple app icons, screenshots, and shortcuts for New Bill, Customers and Production.

Original role context: Browser or installed web-app users

Verification gap: No installation, device-native app or home-screen shortcut was exercised. A manifest is an installation declaration, not proof of store distribution.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F236` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/pages/manifest.json`. Anchor: `"display": "standalone"`.
- Archived evidence coordinate: `research_tailorman/evidence/pages/manifest.json`. Anchor: `"shortcuts": [`.

### Tailorman F237: Service-worker shell and static asset caching

Source module: Device access and offline cache. Evidence class: Code-defined.

Pre-caches login, dashboard and shared scripts, CSS and icons. Same-origin GET handling uses cache-first images and voice clips, stale-while-revalidate scripts and CSS, and network-first HTML with cached fallback. An uncached failed request receives an offline retry screen or error response.

Original role context: Browser or installed web-app users

Verification gap: No offline scenario was executed. These caching strategies do not prove every form or transaction works offline.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F237` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/sw.js`. Anchor: `const PRECACHE_URLS = [`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/sw.js`. Anchor: `async function staleWhileRevalidate(request, event)`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/sw.js`. Anchor: `async function networkFirst(request)`.

### Tailorman F238: Shared Firestore local cache with memory fallback

Source module: Device access and offline cache. Evidence class: Code-defined.

Initializes Firestore with persistent multiple-tab IndexedDB caching, automatic long-polling detection, and in-memory fallback if persistent cache setup fails. Cache-first helper reads can paint a cached record while refreshing it in the background.

Original role context: All shop users

Verification gap: Persistence and cache refresh policies were inspected statically. Offline writes, queue recovery and cross-tab behavior were not tested.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F238` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/firebase.js`. Anchor: `tabManager: persistentMultipleTabManager()`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/firebase.js`. Anchor: `localCache: memoryLocalCache()`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/tenant.js`. Anchor: `export async function getDocFast(ref, onFresh)`.

### NoolTech F054: Local measurement draft recovery

Source module: Tailor orders. Evidence class: Code-defined.

Measurement draft stores customer, garment, values, custom fields, unit, notes, and timestamp; restores matching customer drafts younger than 24 hours.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F054` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/CreateOrderPage-Cx7T-Y8K.js`. Anchor: `Date.now()-n.timestamp<1440*60*1e3`.

### NoolTech F055: Offline measurement safeguards

Source module: Tailor orders. Evidence class: Code-defined.

Online/offline listeners update state, draft stays in local storage, and measurement save is blocked while navigator.onLine is false.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F055` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/CreateOrderPage-Cx7T-Y8K.js`. Anchor: `if(!navigator.onLine)`.

## REQ-PUBLIC: Public shop, showcase, and limited tracking

Target behavior and acceptance: [REQ-PUBLIC](../product/requirements.md#req-public-public-shop-showcase-and-limited-tracking).

### Tailorman F070: Share order tracker link

Source module: Tailoring bills. Evidence class: Code-defined.

Creates a text summary with bill, customer, items, promised date, total/balance, and bill-track.html tenant/bill link. Uses native sharing or clipboard fallback.

Original role context: admin, cashier, cutter, stitcher

Verification gap: Code-defined. The sharing action was not executed. Tracker behavior is documented separately.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F070` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/bill.js`. Anchor: `function shareBill()`.

### Tailorman F226: No-login tracker link

Source module: Public order tracking. Evidence class: Code-defined.

The order tracker reads tid and id from the URL and loads the indicated tenant bill document without invoking the shop authentication guard. Missing identifiers, missing records or read errors show an Order not found screen.

Original role context: Customer or anyone holding a permitted tracker link

Verification gap: No real customer bill was queried from the public page. Actual anonymous readability depends on backend rules, which were not captured.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F226` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/bill-track.js`. Anchor: `const tid = params.get("tid");`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/bill-track.js`. Anchor: `const snap = await getDoc(doc(db, "tenants", tid, "bills", id));`.

### Tailorman F227: Customer-visible order summary

Source module: Public order tracking. Evidence class: Code-defined.

Renders bill number, customer name, expected delivery date, balance due, overall status, item type, quantity, item description and shop name. It does not render payment history, measurements or staff identity in the inspected tracker template.

Original role context: Customer or tracker-link holder

Verification gap: Only displayed fields are described. The client reads a full bill document, so this is not evidence of a restricted server-side public response.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F227` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/bill-track.js`. Anchor: `document.getElementById("billNum").textContent`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/bill-track.js`. Anchor: `itemsEl.innerHTML = items.map((it) =>`.
- Archived evidence coordinate: `research_tailorman/evidence/pages/bill-track.html`. Anchor: `<div id="shopFooter"`.

### Tailorman F228: Bottleneck progress stepper

Source module: Public order tracking. Evidence class: Code-defined.

Maps detailed production stages into Received, Cutting, Stitching, Ironing, QC, Ready and Delivered. Overall progress uses the least-advanced item, with a floor for bill-level Ready or Delivered. All-ready accepts a mix of Ready and Delivered items.

Original role context: Customer or tracker-link holder

Verification gap: The tracker performs one read at page load. It does not subscribe to updates or load the shop's skipped-stage settings in the inspected module.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F228` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/bill-track.js`. Anchor: `const MACRO_STEPS = [`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/bill-track.js`. Anchor: `const macroIdx = Math.max(itemMacroIdx, statusFloor);`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/bill-track.js`. Anchor: `const allReady = items.length > 0 &&`.

### Tailorman F235: Public product pages, academy and contact entry points

Source module: Help and public website. Evidence class: Code-defined.

The public site links dedicated tailoring, boutique, measurement, billing, order-management, cloud and regional product pages plus academy guides, pricing, signup, sign-in, a guided demo, terms, privacy and contact channels.

Original role context: Public visitors

Verification gap: Navigation links establish entry points, not the implementation of every marketing claim or linked article.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F235` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/pages/root.html`. Anchor: `href="tailoring-software/"`.
- Archived evidence coordinate: `research_tailorman/evidence/pages/root.html`. Anchor: `href="academy/"`.
- Archived evidence coordinate: `research_tailorman/evidence/pages/root.html`. Anchor: `href="/demo/intro.html"`.

### NoolTech F243: Configure a public shop page

Source module: Shop page settings. Evidence class: Code-defined.

Admin can enable a /s/:slug page, edit slug/about/WhatsApp/Instagram, choose phone/order-count visibility, and set labeled garment starting prices. Copy or open public URL.

Original role context: Shop admin

Verification gap: Client action, form, or service definition exists. Server execution, persistence, and access enforcement were not tested by this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F243` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/SettingsPage-BspbE0gu.js`. Anchor: `/api/shop-page`.

### NoolTech F244: Shop photo and design showcase

Source module: Shop page settings. Evidence class: Code-defined.

Upload/delete shop photo. Add/update/delete customer-consented design image, title, and from-price; toggle shown designs and reorder them. Code caps stored designs at ten and uses a server-provided showcaseLimit with fallback three.

Original role context: Shop admin

Verification gap: Upload and showcase controls are defined. Actual public publishing, image validation, consent, and server limits were not exercised.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F244` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/SettingsPage-BspbE0gu.js`. Anchor: `showcaseLimit`.

### NoolTech F305: Shop identity and contact presentation

Source module: Public shop page. Evidence class: Code-defined.

Show shop name, logo or initial, tagline or city, about, working hours, address, and completed order milestone.

Original role context: Public visitor

Verification gap: Defined in shipped client code; successful server operation and full runtime behavior were not tested in this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F305` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/ShopPage-D_yutRey.js`. Anchor: `a.completedOrders`.

### NoolTech F306: Book visit and contact actions

Source module: Public shop page. Evidence class: Code-defined.

Link to bookingPath, WhatsApp with a prefilled greeting, telephone call, and Instagram when configured.

Original role context: Public visitor

Verification gap: Defined in shipped client code; successful server operation and full runtime behavior were not tested in this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F306` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/ShopPage-D_yutRey.js`. Anchor: `Book a visit`.

### NoolTech F307: Showcase and lookbook

Source module: Public shop page. Evidence class: Code-defined.

Render featured work with photos, titles, from-prices, and product-specific WhatsApp enquiry text. Fall back to a lookbook when showcase is absent.

Original role context: Public visitor

Verification gap: Defined in shipped client code; successful server operation and full runtime behavior were not tested in this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F307` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/ShopPage-D_yutRey.js`. Anchor: `Our best work`.

### NoolTech F308: Garment starting price list

Source module: Public shop page. Evidence class: Code-defined.

Display configured garment/service labels and from-prices, with a note that final price depends on fabric, design, and work.

Original role context: Public visitor

Verification gap: Defined in shipped client code; successful server operation and full runtime behavior were not tested in this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F308` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/ShopPage-D_yutRey.js`. Anchor: `Final price depends on fabric, design and work.`.

### NoolTech F309: Track an order using phone and order number

Source module: Public shop page. Evidence class: Code-defined.

POST /api/public/shop/:slug/track with orderNumber and phone. Show item count, delivery date, current production step, and balance due.

Original role context: Public visitor

Verification gap: Defined in shipped client code; successful server operation and full runtime behavior were not tested in this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F309` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/dependencies/shopPage.service-BBjlG5I8.js`. Anchor: `async trackOrder(t,a,s)`.

### NoolTech F310: Order stage mapping

Source module: Public shop page. Evidence class: Code-defined.

Public tracker displays received, cutting, stitching, checking, ready, and delivered; cancelled disables the progress steps. Measuring falls back to order received.

Original role context: Public visitor

Verification gap: Defined in shipped client code; successful server operation and full runtime behavior were not tested in this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F310` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/ShopPage-D_yutRey.js`. Anchor: `case"quality_check":return{label:"Final checks",step:3}`.

### NoolTech F311: Connect a customer in the mobile app

Source module: Public shop page. Evidence class: Code-defined.

Open nooltech://app/connect/:slug; explanatory copy says orders, payments, and measurements appear after shop approval. Link to Google Play is provided.

Original role context: Public visitor / customer

Verification gap: Defined in shipped client code; successful server operation and full runtime behavior were not tested in this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F311` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/ShopPage-D_yutRey.js`. Anchor: `nooltech://app/connect/`.

### NoolTech F312: Unavailable shop handling

Source module: Public shop page. Evidence class: Code-defined.

When public shop lookup fails, show that the link may be wrong or the shop page may be off.

Original role context: Public visitor

Verification gap: Defined in shipped client code; successful server operation and full runtime behavior were not tested in this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F312` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/ShopPage-D_yutRey.js`. Anchor: `This shop page is not available`.

## REQ-CUSTAUTH: Customer identity and linked-shop selection

Target behavior and acceptance: [REQ-CUSTAUTH](../product/requirements.md#req-custauth-customer-identity-and-linked-shop-selection).

### NoolTech F274: Shop-specific phone OTP login

Source module: Customer authentication. Evidence class: Code-defined.

Request and verify OTP with phone and tenantId; optional customer name is accepted. Form validation expects 10 to 15 digits and a 6-digit OTP.

Original role context: Customer

Verification gap: Defined in shipped client code; successful server operation and full runtime behavior were not tested in this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F274` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/PhoneOTPForm-CFStmPae.js`. Anchor: `OTP must be 6 digits`.

### NoolTech F275: Shop-specific email OTP login

Source module: Customer authentication. Evidence class: Code-defined.

Request and verify email OTP scoped to tenantId, with optional customer name. Offer resend OTP and change email.

Original role context: Customer

Verification gap: Defined in shipped client code; successful server operation and full runtime behavior were not tested in this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F275` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/CustomerLoginPage-C-LCEe6F.js`. Anchor: `requestEmailOTP`.

### NoolTech F276: Shop-specific Google login

Source module: Customer authentication. Evidence class: Code-defined.

Start Google authentication through /api/customer-auth/google/:tenantId. Invalid or missing tenant links show an invalid-portal state.

Original role context: Customer

Verification gap: Defined in shipped client code; successful server operation and full runtime behavior were not tested in this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F276` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/index-Dk-7hFgw.js`. Anchor: `initiateGoogleLogin(l)`.

### NoolTech F277: Global phone or email login

Source module: Customer authentication. Evidence class: Code-defined.

Global portal accepts phone/email, requests OTP, verifies login, then opens the unified /customer/dashboard.

Original role context: Customer

Verification gap: Defined in shipped client code; successful server operation and full runtime behavior were not tested in this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F277` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/GlobalCustomerLoginPage-B12AZ-h7.js`. Anchor: `loginGlobal(T(),i,b)`.

### NoolTech F278: Google identity completion

Source module: Customer authentication. Evidence class: Code-defined.

Global Google authentication can request a phone number using pendingToken and optional tenantId. The phone capture validates 7 to 15 digits.

Original role context: Customer

Verification gap: Defined in shipped client code; successful server operation and full runtime behavior were not tested in this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F278` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/GlobalCustomerLoginPage-B12AZ-h7.js`. Anchor: `Enter a valid phone number (7–15 digits)`.

### NoolTech F279: Linked shop selection

Source module: Customer authentication. Evidence class: Code-defined.

Look up a customer across shops and offer shop selection when multiple links are returned. Client methods include lookupCustomer, selectShop, and verifyGlobalOTP.

Original role context: Customer

Verification gap: Defined in shipped client code; successful server operation and full runtime behavior were not tested in this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F279` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/index-Dk-7hFgw.js`. Anchor: `async selectShop(l,m,c)`.

### NoolTech F280: OTP resend and back navigation

Source module: Customer authentication. Evidence class: Code-defined.

Global flow has identifier, otp, phone_capture, and shops steps, separate error states, 6-digit input, and resend OTP.

Original role context: Customer

Verification gap: Defined in shipped client code; successful server operation and full runtime behavior were not tested in this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F280` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/GlobalCustomerLoginPage-B12AZ-h7.js`. Anchor: `Didn't receive it? Resend OTP`.

### NoolTech F281: Customer session and profile identity

Source module: Customer authentication. Evidence class: Code-defined.

Customer sessions have independent me, refresh, logout, and profile endpoints under /api/customer-auth.

Original role context: Customer

Verification gap: Defined in shipped client code; successful server operation and full runtime behavior were not tested in this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F281` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/index-Dk-7hFgw.js`. Anchor: `async getCurrentCustomer()`.

## REQ-PORTAL: Customer orders, invoices, measurements, and profile

Target behavior and acceptance: [REQ-PORTAL](../product/requirements.md#req-portal-customer-orders-invoices-measurements-and-profile).

### NoolTech F228: Customer portal link sharing

Source module: Settings. Evidence class: Code-defined.

Copy/open the global customer login URL and open a prefilled WhatsApp share action from business settings.

Original role context: Authenticated shop user

Verification gap: Link generation and sharing affordances are present. No external message was sent during extraction.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F228` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/SettingsPage-BspbE0gu.js`. Anchor: `settings.customerPortalLink`.

### NoolTech F282: Unified and tenant-specific navigation

Source module: Customer portal. Evidence class: Code-defined.

Portal routes include dashboard, appointments, orders, measurements, invoices, and profile, under /customer or /:tenantId/customer.

Original role context: Customer

Verification gap: Defined in shipped client code; successful server operation and full runtime behavior were not tested in this code review.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F282` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/CustomerPortalLayout-BUJLLzxw.js`. Anchor: `path:"measurements"`.

### NoolTech F283: Dashboard counts and recent activity

Source module: Customer portal. Evidence class: Code-defined.

Dashboard calculates total, in-progress, and completed orders, sorts orders by creation date, shows recent orders and upcoming appointments.

Original role context: Customer

Verification gap: Defined in shipped client code; successful server operation and full runtime behavior were not tested in this code review.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F283` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/CustomerDashboard-jtCnvllS.js`. Anchor: `getMyAppointments(),G.getMyOrders()`.

### NoolTech F284: Appointment booking shortcut

Source module: Customer portal. Evidence class: Code-defined.

Dashboard and portal navigation link to appointment booking for the selected shop.

Original role context: Customer

Verification gap: Defined in shipped client code; successful server operation and full runtime behavior were not tested in this code review.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F284` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/CustomerDashboard-jtCnvllS.js`. Anchor: `Book Appointment`.

### NoolTech F285: Read order list and production progress

Source module: Customer portal. Evidence class: Code-defined.

List items, statuses, amounts, and a production stage tracker. Delivered and completed orders are grouped as completed; cancelled is separate.

Original role context: Customer

Verification gap: Defined in shipped client code; successful server operation and full runtime behavior were not tested in this code review.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F285` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/CustomerOrders-COjUQ9C_.js`. Anchor: `PRODUCTION STAGE`.

### NoolTech F286: Search and filter orders across shops

Source module: Customer portal. Evidence class: Code-defined.

Search order number, garment, status, or shop; filter all/active/completed/cancelled and all shops or one linked shop.

Original role context: Customer

Verification gap: Defined in shipped client code; successful server operation and full runtime behavior were not tested in this code review.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F286` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/CustomerOrders-COjUQ9C_.js`. Anchor: `Search by order ID, garment type or status`.

### NoolTech F287: Read appointment history

Source module: Customer portal. Evidence class: Code-defined.

Appointments show upcoming, past, and cancelled sections with type, date, time, worker, and shop information.

Original role context: Customer

Verification gap: Defined in shipped client code; successful server operation and full runtime behavior were not tested in this code review.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F287` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/CustomerAppointments-DogJdX0V.js`. Anchor: `No past appointments.`.

### NoolTech F288: Search appointments across shops

Source module: Customer portal. Evidence class: Code-defined.

Filter appointment list by linked shop and search title, type, tailor/worker, shop, and status.

Original role context: Customer

Verification gap: Defined in shipped client code; successful server operation and full runtime behavior were not tested in this code review.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F288` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/CustomerAppointments-DogJdX0V.js`. Anchor: `Search by type, tailor, or status`.

### NoolTech F289: Cancel an appointment

Source module: Customer portal. Evidence class: Code-defined.

Confirmation calls POST /api/customer-portal/appointments/:id/cancel and reloads appointments. UI states the slot will be released.

Original role context: Customer

Verification gap: Defined in shipped client code; successful server operation and full runtime behavior were not tested in this code review.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F289` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/CustomerAppointments-DogJdX0V.js`. Anchor: `This action cannot be undone. Your appointment slot will be released.`.

### NoolTech F290: Read measurements by garment and shop

Source module: Customer portal. Evidence class: Code-defined.

Display saved measurement values, units, measured date, notes/label, garment category, and shop groups; expand and collapse groups.

Original role context: Customer

Verification gap: Defined in shipped client code; successful server operation and full runtime behavior were not tested in this code review.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F290` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/CustomerMeasurements-_8beXKQG.js`. Anchor: `getMyMeasurements()`.

### NoolTech F291: Search and filter measurements

Source module: Customer portal. Evidence class: Code-defined.

Search garment, label, and notes; filter garment type and linked shop.

Original role context: Customer

Verification gap: Defined in shipped client code; successful server operation and full runtime behavior were not tested in this code review.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F291` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/CustomerMeasurements-_8beXKQG.js`. Anchor: `Search garment, label, notes`.

### NoolTech F292: Read invoices and tax breakdown

Source module: Customer portal. Evidence class: Code-defined.

Invoice rows and details show invoice number, date, status, amount, subtotal, CGST, and SGST.

Original role context: Customer

Verification gap: Defined in shipped client code; successful server operation and full runtime behavior were not tested in this code review.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F292` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/CustomerInvoices-DmQNwrpG.js`. Anchor: `CGST (`.

### NoolTech F293: Search invoices across shops

Source module: Customer portal. Evidence class: Code-defined.

Search invoice number, shop, or status, and select one shop or all linked shops.

Original role context: Customer

Verification gap: Defined in shipped client code; successful server operation and full runtime behavior were not tested in this code review.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F293` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/CustomerInvoices-DmQNwrpG.js`. Anchor: `Search by invoice number, shop or status`.

### NoolTech F294: Download customer invoice PDF

Source module: Customer portal. Evidence class: Code-defined.

Fetch /api/customer-portal/invoices/:id/download as a blob and trigger a local PDF download.

Original role context: Customer

Verification gap: Defined in shipped client code; successful server operation and full runtime behavior were not tested in this code review.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F294` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/dependencies/customerPortal.service-giWeHoXZ.js`. Anchor: `async downloadInvoicePdf(e)`.

### NoolTech F295: Share customer invoices

Source module: Customer portal. Evidence class: Code-defined.

Use Web Share API when available, with a WhatsApp fallback.

Original role context: Customer

Verification gap: Defined in shipped client code; successful server operation and full runtime behavior were not tested in this code review.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F295` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/CustomerInvoices-DmQNwrpG.js`. Anchor: `Share via WhatsApp`.

### NoolTech F296: Update customer display name

Source module: Customer portal. Evidence class: Code-defined.

Profile rejects an empty name, trims the value, and updates only name; phone/email and linked shops are displayed.

Original role context: Customer

Verification gap: Defined in shipped client code; successful server operation and full runtime behavior were not tested in this code review.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F296` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/CustomerProfile-BZPOno0L.js`. Anchor: `await g({name:t.trim()})`.

### NoolTech F297: Web push notification registration

Source module: Customer portal. Evidence class: Code-defined.

Register /sw.js, request notification permission, obtain VAPID public key, subscribe through PushManager, and send endpoint/key data to the portal API.

Original role context: Customer

Verification gap: Defined in shipped client code; successful server operation and full runtime behavior were not tested in this code review.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F297` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/CustomerPortalLayout-BUJLLzxw.js`. Anchor: `navigator.serviceWorker.register("/sw.js")`.

### NoolTech F298: Push subscription service operations

Source module: Customer portal. Evidence class: Code-defined.

Client defines get VAPID key, subscribe, and unsubscribe endpoints. An unsubscribe UI action was not established.

Original role context: Customer

Verification gap: Defined in shipped client code; successful server operation and full runtime behavior were not tested in this code review.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F298` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/dependencies/customerPortal.service-giWeHoXZ.js`. Anchor: `async unsubscribePush(e)`.

## REQ-BOOK: Public and customer appointment booking

Target behavior and acceptance: [REQ-BOOK](../product/requirements.md#req-book-public-and-customer-appointment-booking).

### NoolTech F299: Shop booking information

Source module: Public appointment booking. Evidence class: Code-defined.

GET /public/booking/:tenantId/info loads the shop name for a booking page.

Original role context: Public visitor / customer

Verification gap: Defined in shipped client code; successful server operation and full runtime behavior were not tested in this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F299` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/BookingPage-DP4wDZcY.js`. Anchor: `/public/booking/${e}/info`.

### NoolTech F300: Date and available slot selection

Source module: Public appointment booking. Evidence class: Code-defined.

Disable past dates, load available slots for a selected date, and convert start times into intervals using the requested 30-minute duration.

Original role context: Public visitor / customer

Verification gap: Defined in shipped client code; successful server operation and full runtime behavior were not tested in this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F300` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/BookingPage-DP4wDZcY.js`. Anchor: `disablePast:!0`.

### NoolTech F301: Worker-aware availability service

Source module: Public appointment booking. Evidence class: Code-defined.

Available-slots request accepts date, duration, and optional workerId. The current page requests 30-minute slots without a worker selector.

Original role context: Public visitor / customer

Verification gap: Defined in shipped client code; successful server operation and full runtime behavior were not tested in this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F301` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/BookingPage-DP4wDZcY.js`. Anchor: `h&&(f.workerId=h)`.

### NoolTech F302: Sign in before confirmation

Source module: Public appointment booking. Evidence class: Code-defined.

Opening a slot asks unauthenticated users to use the phone OTP form, then returns to confirmation.

Original role context: Public visitor / customer

Verification gap: Defined in shipped client code; successful server operation and full runtime behavior were not tested in this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F302` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/BookingPage-DP4wDZcY.js`. Anchor: `Sign in to Book`.

### NoolTech F303: Book appointment type and notes

Source module: Public appointment booking. Evidence class: Code-defined.

Confirm fitting, delivery, consultation, or alteration with date/start/end/duration/title/notes and optional workerId. Then reload available slots.

Original role context: Customer

Verification gap: Defined in shipped client code; successful server operation and full runtime behavior were not tested in this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F303` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/BookingPage-DP4wDZcY.js`. Anchor: `type:O,appointmentDate:n.format`.

### NoolTech F304: Booking success and empty states

Source module: Public appointment booking. Evidence class: Code-defined.

Show booking confirmation and email-confirmation copy, no-slots state, and shop/slot/booking error states. Email delivery was not tested.

Original role context: Customer

Verification gap: Defined in shipped client code; successful server operation and full runtime behavior were not tested in this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F304` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/BookingPage-DP4wDZcY.js`. Anchor: `Booking Confirmed!`.

## REQ-FIT: Shareable Fit Cards and reviewed measurement import

Target behavior and acceptance: [REQ-FIT](../product/requirements.md#req-fit-shareable-fit-cards-and-reviewed-measurement-import).

### NoolTech F313: Read a shared Fit Card

Source module: Fit Card. Evidence class: Code-defined.

Public token lookup shows customer name, expiration, garment/measurement labels, field values, unit, measuredAt, and shop/customer source attribution.

Original role context: Public visitor

Verification gap: Defined in shipped client code; successful server operation and full runtime behavior were not tested in this code review.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F313` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/FitCardPage-B6ZSmNUz.js`. Anchor: `/api/public/fit-card/`.

### NoolTech F314: Measurement provenance warning

Source module: Fit Card. Evidence class: Code-defined.

Shared Fit Card explicitly states measurements are customer-shared copies that must be checked before cutting.

Original role context: Public visitor / tailor

Verification gap: Defined in shipped client code; successful server operation and full runtime behavior were not tested in this code review.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F314` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/FitCardPage-B6ZSmNUz.js`. Anchor: `These are copies the customer shared.`.

### NoolTech F315: Open a Fit Card link or raw code

Source module: Fit Card. Evidence class: Code-defined.

Accept a /f/:token link or an alphanumeric/underscore/hyphen token of at least 20 characters; fetch it through authenticated /api/fit-card/:token.

Original role context: Shop owner / staff

Verification gap: Defined in shipped client code; successful server operation and full runtime behavior were not tested in this code review.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F315` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/dependencies/customerLinks.service-4RXT3vZR.js`. Anchor: `[A-Za-z0-9_-]{20,}`.

### NoolTech F316: Choose measurement entries to import

Source module: Fit Card. Evidence class: Code-defined.

Fit Card import can send selected entryIds and associate imported measurements with an existing customer.

Original role context: Shop owner / staff

Verification gap: Defined in shipped client code; successful server operation and full runtime behavior were not tested in this code review.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F316` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/dependencies/customerLinks.service-4RXT3vZR.js`. Anchor: `t.entryIds&&(r.entryIds=t.entryIds)`.

### NoolTech F317: Create a customer from a Fit Card

Source module: Fit Card. Evidence class: Code-defined.

Import flow can add a customer or save measurements to an existing customer; copies become editable shop-owned measurements.

Original role context: Shop owner / staff

Verification gap: Defined in shipped client code; successful server operation and full runtime behavior were not tested in this code review.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F317` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/FitCardImportDialog-BiI-ikQ8.js`. Anchor: `They are saved as your own measurements, which you can edit.`.

### NoolTech F318: Confirm cross-phone imports

Source module: Fit Card. Evidence class: Code-defined.

Service accepts confirmOtherNumber, and dialog has Save anyway for phone mismatch handling. Duplicate/already-added status is displayed.

Original role context: Shop owner / staff

Verification gap: Defined in shipped client code; successful server operation and full runtime behavior were not tested in this code review.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F318` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/dependencies/customerLinks.service-4RXT3vZR.js`. Anchor: `t.confirmOtherNumber&&(r.confirmOtherNumber=!0)`.

## REQ-CONNECT: Customer app invitations and connection approvals

Target behavior and acceptance: [REQ-CONNECT](../product/requirements.md#req-connect-customer-app-invitations-and-connection-approvals).

### NoolTech F018: Customer app connection status

Source module: Customer CRM. Evidence class: Code-defined.

Profile reads connection state, connected date, and whether a customer already has portal access.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F018` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/dependencies/customerLinks.service-4RXT3vZR.js`. Anchor: `async connection`.

### NoolTech F019: Create customer app invitation

Source module: Customer CRM. Evidence class: Code-defined.

Creates invitation optionally tied to an order or in-person use. Profile renders shareable link and QR.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F019` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/dependencies/customerLinks.service-4RXT3vZR.js`. Anchor: `async createInvite`.

### NoolTech F020: Share or copy app invitation

Source module: Customer CRM. Evidence class: Code-defined.

Customer profile can copy invitation URL and use native share or a WhatsApp link.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F020` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/CustomerProfilePage-DWeCcTMZ.js`. Anchor: `navigator.clipboard.writeText(S.url)`.

### NoolTech F021: Disconnect customer app

Source module: Customer CRM. Evidence class: Code-defined.

Profile disconnect action calls the customer-link disconnect endpoint.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F021` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/dependencies/customerLinks.service-4RXT3vZR.js`. Anchor: `async disconnect`.

### NoolTech F319: Create a customer invite

Source module: Customer connections. Evidence class: Code-defined.

POST /api/customer-links/invites with customerId, optional orderId, and optional inPerson flag.

Original role context: Shop owner / staff

Verification gap: Defined in shipped client code; successful server operation and full runtime behavior were not tested in this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F319` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/dependencies/customerLinks.service-4RXT3vZR.js`. Anchor: `async createInvite(e,t={})`.

### NoolTech F320: Inspect and disconnect app connection

Source module: Customer connections. Evidence class: Code-defined.

Read customer link status at /api/customer-links/customers/:id and disconnect through its /disconnect action.

Original role context: Shop owner / staff

Verification gap: Defined in shipped client code; successful server operation and full runtime behavior were not tested in this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F320` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/dependencies/customerLinks.service-4RXT3vZR.js`. Anchor: `async disconnect(e)`.

### NoolTech F321: Review customer connection requests

Source module: Customer connections. Evidence class: Code-defined.

List pending requests and search existing customers to approve selected matches. Same mobile number can map to several family members.

Original role context: Shop owner / staff

Verification gap: Defined in shipped client code; successful server operation and full runtime behavior were not tested in this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F321` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/ConnectRequestsPage-DSvMGwEk.js`. Anchor: `Same mobile number. Tick everyone this person should see`.

### NoolTech F322: Approve selected or new customer connection

Source module: Customer connections. Evidence class: Code-defined.

Approve request with customerIds, choose another customer, or add request as a new customer.

Original role context: Shop owner / staff

Verification gap: Defined in shipped client code; successful server operation and full runtime behavior were not tested in this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F322` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/ConnectRequestsPage-DSvMGwEk.js`. Anchor: `Connect to selected`.

### NoolTech F323: Reject a connection request

Source module: Customer connections. Evidence class: Code-defined.

POST /api/customer-links/requests/:id/reject from the request review page.

Original role context: Shop owner / staff

Verification gap: Defined in shipped client code; successful server operation and full runtime behavior were not tested in this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F323` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/dependencies/customerLinks.service-4RXT3vZR.js`. Anchor: `async reject(e)`.

### NoolTech F324: Tokenized mobile invitation landing page

Source module: Customer connections. Evidence class: Code-defined.

Load /api/public/invite/:token, show usable/expired link states, open the mobile app, and offer Google Play installation guidance.

Original role context: Public visitor / customer

Verification gap: Defined in shipped client code; successful server operation and full runtime behavior were not tested in this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F324` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/ShopInvitePage-uS3zOk0X.js`. Anchor: `This link has expired.`.

## REQ-NOTIFY: Reminders, campaigns, messaging, and notification center

Target behavior and acceptance: [REQ-NOTIFY](../product/requirements.md#req-notify-reminders-campaigns-messaging-and-notification-center).

### Tailorman F075: Ready-for-pickup WhatsApp nudge

Source module: Order status and delivery. Evidence class: Code-defined.

After a whole bill becomes Ready, offers to open a composed WhatsApp pickup message using customer name, bill number, and shop name. Ten-digit numbers receive country code 91. Detail also renders a Notify link for ready orders.

Original role context: admin, cashier

Verification gap: Code-defined composer link. Opening WhatsApp is not evidence that a message was sent or delivered.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F075` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/bill-status.js`. Anchor: `async function offerNotify(bill)`.

### Tailorman F162: Payment follow-up via WhatsApp

Source module: Outstanding tailoring payments. Evidence class: Code-defined.

Rows link to bill detail and show contact, delivery, total, paid, and balance. A WhatsApp link pre-fills customer name, bill number, and outstanding amount and prefixes digits with country code 91. It opens the WhatsApp composer, not a confirmed message-delivery workflow.

Original role context: Admin and cashier, outstanding entitlement

Verification gap: Code-defined. No authenticated execution or persisted result was observed in this source review.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F162` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/outstanding.js`. Anchor: `function billRow(b)`.

### Tailormate F181: Customer notification status selection

Source module: Shop settings. Evidence class: Code-defined.

Customize when to notify customer reveals a checklist of order-status options loaded from the order-status API. Enabled choices are saved as comma-separated custom_sms IDs, otherwise as empty. This page does not send an SMS or WhatsApp message itself.

Original role context: Signed-in shop user; client permissions and selected-shop context apply

Verification gap: Code-defined. This source review did not execute the action, verify a persisted result, or test backend authorization. Parent browser observations provide separate screen context.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F181` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/settings/page-8e56f7911d5a369e.js`. Anchor: `label:"Customize when to notify customer`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/settings/page-8e56f7911d5a369e.js`. Anchor: `name:"custom_sms_options",options:s`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/settings/page-8e56f7911d5a369e.js`. Anchor: `custom_sms:e.custom_sms?`.

### NoolTech F022: Preview bulk customer messages

Source module: Customer CRM. Evidence class: Code-defined.

Selected customers receive template or custom-message previews with customer variables.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F022` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/CustomerListPage-BipWodA4.js`. Anchor: `prepareBulkMessages`.

### NoolTech F023: Launch bulk WhatsApp messages and log result

Source module: Customer CRM. Evidence class: Code-defined.

Bulk message workflow opens prepared customer messages and then calls sendBulkMessages. Opening a share app does not prove message delivery.

Original role context: Admin, manager, or permitted staff

Verification gap: External WhatsApp delivery and server message-log behavior were not exercised.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F023` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/CustomerListPage-BipWodA4.js`. Anchor: `sendBulkMessages`.

### NoolTech F024: Inactive customer preview

Source module: Customer recovery. Evidence class: Code-defined.

Inactive-customer tab previews customers for inactivity-days and a segment.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F024` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/CustomerListPage-BipWodA4.js`. Anchor: `previewInactiveCustomers`.

### NoolTech F025: Create recovery campaigns

Source module: Customer recovery. Evidence class: Code-defined.

Campaign form includes inactivity days, target segment, once/weekly/monthly frequency, optional discount, template/custom message, and scheduling.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F025` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/CustomerListPage-BipWodA4.js`. Anchor: `createCampaign(n)`.

### NoolTech F026: Campaign listing and execution

Source module: Customer recovery. Evidence class: Code-defined.

Lists paginated campaigns and exposes execute and delete actions.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F026` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/CustomerListPage-BipWodA4.js`. Anchor: `executeCampaign`.

### NoolTech F027: Campaign results

Source module: Customer recovery. Evidence class: Code-defined.

Fetches campaign results for sent/recovered/revenue/recovery-rate display.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F027` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/CustomerListPage-BipWodA4.js`. Anchor: `getCampaignResults`.

### NoolTech F079: WhatsApp order-update templates

Source module: Order details. Evidence class: Code-defined.

Substitutes customer/order/date/amount variables in received, in-progress, ready, delivered, and payment reminder messages; opens wa.me with text.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F079` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/OrderDetailPage-B2ZYKSVH.js`. Anchor: `const s=st||It(Fe[L].message)`.

### NoolTech F080: SMS update composer

Source module: Order details. Evidence class: Code-defined.

Opens sms: URL with sanitized customer phone and encoded message body in the default messaging app.

Original role context: Admin, manager, or permitted staff

Verification gap: Browser visibility and successful server persistence are separate checks.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F080` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/OrderDetailPage-B2ZYKSVH.js`. Anchor: `'sms:${t.phone.replace`.

### NoolTech F230: Notification preferences

Source module: Settings. Evidence class: Code-defined.

Email alerts, push notifications, monthly reports, order updates, payment reminders, low-stock alerts, and team activity preferences are read and saved to notification service. Visible settings page primarily presents email/push/monthly switches.

Original role context: Authenticated shop user

Verification gap: Client action, form, or service definition exists. Server execution, persistence, and access enforcement were not tested by this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F230` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/SettingsPage-BspbE0gu.js`. Anchor: `updatePreferences`.

### NoolTech F245: Opt in and monitor automated WhatsApp

Source module: Automatic WhatsApp. Evidence class: Code-defined.

Read enabled state, usage used/limit/resetDate, and trial/plan information. Enabling opens explicit consent confirmation; disabling calls save immediately. Update is through workspace auto-whatsapp API.

Original role context: Authenticated shop user

Verification gap: Opt-in and usage controls exist. Scheduling, delivery, template approval, actual recipients, and charges were not verified.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F245` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/SettingsPage-BspbE0gu.js`. Anchor: `auto-whatsapp-toggle`.

### NoolTech F252: Notification center

Source module: Notifications. Evidence class: Code-defined.

List all/unread notifications, display type order/payment/inventory/worker/customer, mark one read, mark all read, delete, and navigate through an attached action URL when present.

Original role context: Authenticated shop user

Verification gap: Client action, form, or service definition exists. Server execution, persistence, and access enforcement were not tested by this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F252` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/NotificationsPage-o81_zfqQ.js`. Anchor: `markAllAsRead`.

### NoolTech F332: Delivery, pickup, and payment queues

Source module: Daily reminders. Evidence class: Code-defined.

GET /api/reminders/today returns deliveriesTomorrow, readyForPickup, and balancesDue. Order details can be opened from each row.

Original role context: Shop owner / staff

Verification gap: Defined in shipped client code; successful server operation and full runtime behavior were not tested in this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F332` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/dependencies/todayReminders.service--VSB7tVl.js`. Anchor: `deliveriesTomorrow:t.deliveriesTomorrow??[]`.

### NoolTech F333: Prefilled WhatsApp reminder messages

Source module: Daily reminders. Evidence class: Code-defined.

Generate delivery-tomorrow, pickup-ready, or payment messages with customer, order, amount, and shop name. User opens WhatsApp to send them. Requires auto-reminder plan permission.

Original role context: Shop owner / staff

Verification gap: Defined in shipped client code; successful server operation and full runtime behavior were not tested in this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F333` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/RemindersPage-C3_QI3mR.js`. Anchor: `Click WhatsApp to send each message.`.

### NoolTech F334: Local sent marker

Source module: Daily reminders. Evidence class: Code-defined.

Clicking a reminder WhatsApp link stores its daily key in localStorage and displays Sent. It records the click, not confirmed message delivery.

Original role context: Shop owner / staff

Verification gap: Delivery is not observed. The UI marks a reminder sent when the WhatsApp link is clicked; marker is browser-local.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F334` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/dependencies/todayReminders.service--VSB7tVl.js`. Anchor: `reminders_sent_`.

## REQ-ENGAGE: Shop achievements and activation challenges

Target behavior and acceptance: [REQ-ENGAGE](../product/requirements.md#req-engage-shop-achievements-and-activation-challenges).

### NoolTech F325: Achievement levels and progress

Source module: Shop progress. Evidence class: Code-defined.

Levels use starter 0/0, bronze 3 customers/3 orders, silver 10/10, gold 25/30, platinum 50/75, ruby 150/250, diamond 300/500. Boutique progress uses sales.

Original role context: Shop owner / staff

Verification gap: Defined in shipped client code; successful server operation and full runtime behavior were not tested in this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F325` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/dependencies/shopProgress.service-DZ8jybaP.js`. Anchor: `id:"diamond",customers:300,orders:500`.

### NoolTech F326: Qualifying order and monthly activity guidance

Source module: Shop progress. Evidence class: Code-defined.

Level page says a noncancelled order counts with saved customer measurements, delivery date, and amount. It explains active-day monthly progress, default 8 days.

Original role context: Shop owner / staff

Verification gap: Defined in shipped client code; successful server operation and full runtime behavior were not tested in this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F326` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/MyLevelPage-D6U_B88u.js`. Anchor: `Levels never go down.`.

### NoolTech F327: Share achievement to WhatsApp

Source module: Shop progress. Evidence class: Code-defined.

My Level builds a WhatsApp share link from shop progress and current level.

Original role context: Shop owner / staff

Verification gap: Defined in shipped client code; successful server operation and full runtime behavior were not tested in this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F327` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/MyLevelPage-D6U_B88u.js`. Anchor: `Share on WhatsApp`.

### NoolTech F328: Unread level acknowledgement service

Source module: Shop progress. Evidence class: Code-defined.

POST /api/achievements/seen with level records that a level has been seen. Server persistence is unverified.

Original role context: Shop owner / staff

Verification gap: Defined in shipped client code; successful server operation and full runtime behavior were not tested in this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F328` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/dependencies/shopProgress.service-DZ8jybaP.js`. Anchor: `async markLevelSeen(e)`.

### NoolTech F329: Five-order or five-sale challenge

Source module: First orders challenge. Evidence class: Code-defined.

Read /api/rewards/challenge; show target, qualifying count, deadline, in_progress/completed/expired states, and bonus trial days returned by the API.

Original role context: Shop owner / staff

Verification gap: Defined in shipped client code; successful server operation and full runtime behavior were not tested in this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F329` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/ChallengePage-CpmT525i.js`. Anchor: `First 5 Orders Challenge`.

### NoolTech F330: Qualifying order rules

Source module: First orders challenge. Evidence class: Code-defined.

Tailor challenge lists saved measurements, delivery date, amount above zero, and at least 3 different customers. Boutique challenge counts each sale with amount above zero.

Original role context: Shop owner / staff

Verification gap: Defined in shipped client code; successful server operation and full runtime behavior were not tested in this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F330` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/ChallengePage-CpmT525i.js`. Anchor: `Orders for at least {{n}} different customers`.

### NoolTech F331: Next-step actions and incomplete order warnings

Source module: First orders challenge. Evidence class: Code-defined.

Deep-link to add customer, measurements, create order/sale, or billing. Show incomplete orders and remaining distinct customers.

Original role context: Shop owner / staff

Verification gap: Defined in shipped client code; successful server operation and full runtime behavior were not tested in this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F331` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/ChallengePage-CpmT525i.js`. Anchor: `a.incompleteOrders>0`.

## REQ-TOOLS: Tailoring calculators and advice

Target behavior and acceptance: [REQ-TOOLS](../product/requirements.md#req-tools-tailoring-calculators-and-advice).

### NoolTech F335: Explore tools entry point

Source module: Explore and tailoring tools. Evidence class: Code-defined.

Explore currently exposes a Tailoring Tips tile which routes to /tailoring-tips.

Original role context: Shop owner / staff

Verification gap: Defined in shipped client code; successful server operation and full runtime behavior were not tested in this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F335` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/ExplorePage-CpshNOtU.js`. Anchor: `tailoring-tips`.

### NoolTech F336: Bra-size bust calculator

Source module: Explore and tailoring tools. Evidence class: Code-defined.

Calculate under-bust, bust, and blouse bust estimates from selectable band and cup size. UI labels results as estimates.

Original role context: Shop owner / staff

Verification gap: Defined in shipped client code; successful server operation and full runtime behavior were not tested in this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F336` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/TailoringTipsPage-CKa0o4Yr.js`. Anchor: `testId:"calc-bra"`.

### NoolTech F337: Height/weight waist estimate

Source module: Explore and tailoring tools. Evidence class: Code-defined.

Estimate waist range using height 100 to 220 cm and weight 25 to 200 kg, with cm/inch output.

Original role context: Shop owner / staff

Verification gap: Defined in shipped client code; successful server operation and full runtime behavior were not tested in this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F337` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/TailoringTipsPage-CKa0o4Yr.js`. Anchor: `testId:"calc-waist"`.

### NoolTech F338: Flat garment to body measurement calculator

Source module: Explore and tailoring tools. Evidence class: Code-defined.

Blouse, kurta, shirt, and trouser calculators double flat measures and subtract garment-specific ease, with inch/cm selection.

Original role context: Shop owner / staff

Verification gap: Defined in shipped client code; successful server operation and full runtime behavior were not tested in this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F338` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/TailoringTipsPage-CKa0o4Yr.js`. Anchor: `testId:"calc-garment"`.

### NoolTech F339: Fabric requirement estimator

Source module: Explore and tailoring tools. Evidence class: Code-defined.

Choose garment and 36/44/58-inch fabric width; adjust for large size, eligible full sleeves, and print matching. Round up to garment-specific increments.

Original role context: Shop owner / staff

Verification gap: Defined in shipped client code; successful server operation and full runtime behavior were not tested in this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F339` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/TailoringTipsPage-CKa0o4Yr.js`. Anchor: `testId:"calc-fabric"`.

### NoolTech F340: Women and men size references

Source module: Explore and tailoring tools. Evidence class: Code-defined.

Toggle standard women bust/waist/hip and men chest/collar/waist size charts. These are reference values, not stored customer measurements.

Original role context: Shop owner / staff

Verification gap: Defined in shipped client code; successful server operation and full runtime behavior were not tested in this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F340` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/TailoringTipsPage-CKa0o4Yr.js`. Anchor: `testId:"size-chart"`.

### NoolTech F341: Centimeter and inch conversion

Source module: Explore and tailoring tools. Evidence class: Code-defined.

Two-way conversion uses 2.54 cm per inch.

Original role context: Shop owner / staff

Verification gap: Defined in shipped client code; successful server operation and full runtime behavior were not tested in this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F341` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/TailoringTipsPage-CKa0o4Yr.js`. Anchor: `testId:"calc-convert"`.

### NoolTech F342: Tailoring advice reference

Source module: Explore and tailoring tools. Evidence class: Code-defined.

Display prewash, ease, seam, grain, print, scrap, posture, remeasure, and delicate-fabric tips.

Original role context: Shop owner / staff

Verification gap: Defined in shipped client code; successful server operation and full runtime behavior were not tested in this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F342` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/TailoringTipsPage-CKa0o4Yr.js`. Anchor: `["prewash","ease","seam","grain","print","scrap","posture","remeasure","delicate"]`.

## REQ-SUPPORT: Help, tours, spoken guidance, and support tickets

Target behavior and acceptance: [REQ-SUPPORT](../product/requirements.md#req-support-help-tours-spoken-guidance-and-support-tickets).

### Tailorman F096: Localized spoken walkthroughs

Source module: Guided help. Evidence class: Code-defined.

Field-by-field guide definitions cover business screens and public tracker/help pages. English, Malayalam, Hindi, Tamil, Telugu, and Kannada control strings share the help language preference. Sequence highlights and scrolls to each target, opening collapsed details when needed.

Original role context: all supported roles, public pages where mounted

Verification gap: Code-defined. This row does not establish a successful business write or server-side enforcement.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F096` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/voice.js`. Anchor: `const S = {`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/voice.js`. Anchor: `function highlight(sel)`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/voice-steps.js`. Anchor: `export const VOICE_STEPS = {`.

### Tailorman F097: Audio source and visual fallback

Source module: Guided help. Evidence class: Code-defined.

Loads per-language/page text and an audio manifest. Uses a pre-generated clip when listed, falls back to a matching device speech voice, and permits a visual-only guide when no matching voice exists. The client does not substitute an unrelated-language voice.

Original role context: all supported roles, public pages where mounted

Verification gap: Code-defined. Available audio files, installed device voices, and actual pronunciation were not verified.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F097` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/voice.js`. Anchor: `async function prepare(lang)`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/voice.js`. Anchor: `function playCurrent()`.

### Tailorman F098: Guide controls and opt-in auto offer

Source module: Guided help. Evidence class: Code-defined.

Guide bar provides Previous, Next, Repeat, Pause/Play, and Stop. Auto preference persists on this device; it shows a Start/Not now banner per eligible page rather than playing audio without a gesture. Switching help language rebuilds the current sequence.

Original role context: all supported roles, public pages where mounted

Verification gap: Code-defined. This row does not establish a successful business write or server-side enforcement.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F098` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/voice.js`. Anchor: `export function maybeAutoStart(getLang)`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/voice.js`. Anchor: `function renderBar()`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/voice.js`. Anchor: `export function onLangChange(lang)`.

### Tailorman F099: Role-specific first-login tour

Source module: Product tours. Evidence class: Code-defined.

Dashboard tour filters illustrated steps for admin, cashier, cutter, and stitcher. Offers back/next/dot navigation and skip/finish. Completion persists in localStorage and attempts profile tourDone update.

Original role context: admin, cashier, cutter, stitcher

Verification gap: Code-defined. This row does not establish a successful business write or server-side enforcement.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F099` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/tour.js`. Anchor: `export async function initTour(user, profile)`.

### Tailorman F100: Getting Started checklist

Source module: Product tours. Evidence class: Code-defined.

Role-dependent checklist links first bill, customer, shop details, staff, garment configuration, wage rates, or production. Auto-detects some records, allows manual complete/incomplete, shows progress, and persists dismissal locally and to profile.

Original role context: admin, cashier, cutter, stitcher

Verification gap: Code-defined. Auto-completion checks tenant itemTypes collection while actual templates save under settings/itemTypes, so configuring garments may not automatically complete that item.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F100` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/tour.js`. Anchor: `function renderChecklist(profile)`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/tour.js`. Anchor: `async function getAutoCompletedItems(role)`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/item-types.js`. Anchor: `await setDoc(tDoc("settings", "itemTypes"),`.

### Tailorman F101: New Bill coach marks

Source module: Product tours. Evidence class: Code-defined.

A three-step spotlight introduces customer selection, garment/price entry, and saving. Missing targets are skipped. Skip or finish stores a device-local completion key, so it does not normally recur on that device.

Original role context: admin, cashier

Verification gap: Code-defined. This row does not establish a successful business write or server-side enforcement.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F101` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/newbill-tour.js`. Anchor: `export function runNewBillTour({ force = false } = {})`.

### Tailorman F231: Contextual help in five languages

Source module: Help and public website. Evidence class: Code-defined.

The floating help panel loads page-specific tips with a default fallback. Language choices are Malayalam, Hindi, Tamil, Telugu and Kannada, remembered in browser local storage. The panel supports closing with Escape and loads the separate voice guide lazily.

Original role context: Shop users

Verification gap: Panel handlers were inspected. Individual translated JSON content and voice playback are separate evidence scopes.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F231` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/help.js`. Anchor: `const LANGS = [`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/help.js`. Anchor: `const DEFAULT_LANG = "ml";`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/help.js`. Anchor: `const tips = data[page] || data["_default"] || [];`.

### Tailorman F232: Context-aware WhatsApp support

Source module: Help and public website. Evidence class: Code-defined.

The help panel opens a support chat with an app name and the current help-page identifier prefilled. Public footer also offers support email, WhatsApp and Instagram links.

Original role context: Shop users; public visitors

Verification gap: No support message was sent. External links do not establish support response behavior.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F232` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/help.js`. Anchor: `function buildSupportUrl()`.
- Archived evidence coordinate: `research_tailorman/evidence/pages/root.html`. Anchor: `mailto:support@tailorman.in`.

### Tailorman F233: Public searchable user manual

Source module: Help and public website. Evidence class: Code-defined.

The manual groups business and staff instructions into sections, filters sidebar entries by typed text, and highlights the section visible on screen. It documents roles, shop setup, customers, bills, production, job cards, inventory, wages, reports and FAQs.

Original role context: Public visitors and shop users

Verification gap: Manual instructions are documentation claims unless separately supported by captured handlers. The manual does not load the working-page voice widget.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F233` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/pages/manual.html`. Anchor: `function filterSidebar(q)`.
- Archived evidence coordinate: `research_tailorman/evidence/pages/manual.html`. Anchor: `const obs = new IntersectionObserver`.

### Tailormate F207: Remote FAQ accordion

Source module: Help and support. Evidence class: Code-defined.

Faqs loads /getfaqs?faq_type_id=1 and renders question and answer values in a single-item accordion with loading state. Content is supplied by the API rather than bundled fixed help articles.

Original role context: Signed-in shop user; client permissions and selected-shop context apply

Verification gap: Code-defined. This source review did not execute the action, verify a persisted result, or test backend authorization. Parent browser observations provide separate screen context.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F207` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/faqs/page-506107db4984b5d7.js`. Anchor: `get("/getfaqs?faq_type_id=1")`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/faqs/page-506107db4984b5d7.js`. Anchor: `type:"single"`.

### Tailormate F208: Support contact channels

Source module: Help and support. Evidence class: Code-defined.

Contact us offers a WhatsApp composer, mail link, and TailorMate website. It contains descriptive support text rather than a ticket submission form in the captured component.

Original role context: Signed-in shop user; client permissions and selected-shop context apply

Verification gap: Code-defined. This source review did not execute the action, verify a persisted result, or test backend authorization. Parent browser observations provide separate screen context.

Runtime boundary: Related screen context confirms a form, control, empty state, settings preview, or navigation. It does not establish every behavior in this entry or a successful business write.

Original record: `tailormate:F208` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/contact-us/page-63902e21d37cc978.js`. Anchor: `title:"Contact us for support"`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/contact-us/page-63902e21d37cc978.js`. Anchor: `mailto:tailormateapp@gmail.com`.
- Archived evidence coordinate: `research_tailormate/evidence/assets/_next/static/chunks/app/(apps)/contact-us/page-63902e21d37cc978.js`. Anchor: `https://wa.me/918281311391/?text=Hi`.

### NoolTech F250: User guide and FAQs

Source module: Support. Evidence class: Code-defined.

Built-in guides cover dashboard, orders/job tickets, customers/measurements, workers, inventory, billing, and settings. English, Tamil, and Kannada guide text is bundled.

Original role context: Authenticated shop user

Verification gap: Guide descriptions may describe intended behavior and contain legacy plan names. They are product claims, not independent workflow verification.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F250` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/HelpSupportPage-hwN8-IWU.js`. Anchor: `The Dashboard`.

### NoolTech F251: Submit and track support tickets

Source module: Support. Evidence class: Code-defined.

Create category billing/technical/feature_request/account/other, subject, description, and low/medium/high/urgent priority. List own tickets; states include open/in_progress/waiting_on_customer/resolved/closed. Detail shows author/replies/resolution and permits replies.

Original role context: Authenticated shop user

Verification gap: Client action, form, or service definition exists. Server execution, persistence, and access enforcement were not tested by this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F251` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/HelpSupportPage-hwN8-IWU.js`. Anchor: `submitTicket`.

## REQ-PRIVACY: Consent, sharing, personal exports, and deletion requests

Target behavior and acceptance: [REQ-PRIVACY](../product/requirements.md#req-privacy-consent-sharing-personal-exports-and-deletion-requests).

### NoolTech F239: Privacy rights reference and consent preferences

Source module: Privacy and data. Evidence class: Code-defined.

Read DPDP information and privacy settings. Update marketingEmails, productUpdates, analyticsTracking, and thirdPartySharing consent preferences.

Original role context: Authenticated shop user

Verification gap: Controls and API operations are defined. Actual regulatory compliance and all downstream consent effects were not audited.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F239` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/SettingsPage-BspbE0gu.js`. Anchor: `consentPreferences`.

### NoolTech F240: Nominee management

Source module: Privacy and data. Evidence class: Code-defined.

Add/update/remove a nominee with name, email, phone, and relationship. Initial relationship is Family Member.

Original role context: Authenticated shop user

Verification gap: Client action, form, or service definition exists. Server execution, persistence, and access enforcement were not tested by this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F240` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/SettingsPage-BspbE0gu.js`. Anchor: `updateNominee`.

### NoolTech F241: Request and download personal-data exports

Source module: Privacy and data. Evidence class: Code-defined.

Request export, list prior exports, show status/data size, and download a prepared export by ID as a blob.

Original role context: Authenticated shop user

Verification gap: Client action, form, or service definition exists. Server execution, persistence, and access enforcement were not tested by this code review.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F241` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/SettingsPage-BspbE0gu.js`. Anchor: `requestDataExport`.

### NoolTech F242: Account deletion request and cancellation

Source module: Privacy and data. Evidence class: Code-defined.

Submit account deletion with matching confirmation email and optional reason; show deletion-request state and allow cancellation.

Original role context: Authenticated shop user

Verification gap: Request/cancel endpoints exist. Deletion delay, actual removal scope, and completion were not tested.

Runtime boundary: Related screen or form inspected; this does not verify every capability in this entry.

Original record: `nooltech:F242` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/SettingsPage-BspbE0gu.js`. Anchor: `requestAccountDeletion`.

## REQ-OPS-TENANT: Tenant directory, lifecycle, overrides, and trials

Target behavior and acceptance: [REQ-OPS-TENANT](../product/requirements.md#req-ops-tenant-tenant-directory-lifecycle-overrides-and-trials).

### Tailorman F214: Separate super administrator console

Source module: Platform administration. Evidence class: Code-defined.

Google sign-in is checked against the superAdmins collection. An ordinary shop admin is not automatically a platform administrator. The console shows the signed-in identity and logs out unsupported accounts.

Original role context: Super administrator

Verification gap: No super-administrator login was performed. Server permission checks are outside captured client evidence.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F214` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/super-admin.js`. Anchor: `const ok = await isSuperAdmin(user.uid);`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/tenant.js`. Anchor: `export async function isSuperAdmin(uid)`.

### Tailorman F215: Tenant directory and search

Source module: Platform administration. Evidence class: Code-defined.

Lists shops newest first and searches shop name, owner email, owner name, owner phone and tenant ID. Rows show owner identity, trial or paid expiry, creation date, effective state and normalized plan.

Original role context: Super administrator

Verification gap: Defined in captured client code. No successful authenticated action or server authorization behavior was tested for this entry.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F215` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/tenant.js`. Anchor: `export async function listAllTenants()`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/super-admin.js`. Anchor: `return [t.shopName, t.ownerEmail, t.ownerName, t.ownerPhone, t.id]`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/super-admin.js`. Anchor: `function renderRow(t)`.

### Tailorman F216: Extend tenant trial

Source module: Platform administration. Evidence class: Code-defined.

The +30d control extends from the later of the current trial end or current device time and sets status back to trial. The underlying helper accepts a day count, while this console action passes 30.

Original role context: Super administrator

Verification gap: Defined in captured client code. No successful authenticated action or server authorization behavior was tested for this entry.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F216` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/super-admin.js`. Anchor: `await extendTrial(id, 30);`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/tenant.js`. Anchor: `export async function extendTrial(tenantId, days)`.

### Tailorman F217: Manually activate a tenant

Source module: Platform administration. Evidence class: Code-defined.

For a non-active tenant, selects Free, Premium or Business plus monthly or annual cycle and confirms activation. Sets active status and paidAt. A stale paidUntil is cleared so manual activation does not leave the tenant immediately expired.

Original role context: Super administrator

Verification gap: No tenant status was changed. The selected billing-cycle label does not prove a charge, because this is a manual activation path.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F217` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/super-admin.js`. Anchor: `await markTenantActive(id, plan, cycle);`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/tenant.js`. Anchor: `export async function markTenantActive(tenantId, plan = "premium", billingCycle = "monthly")`.

### Tailorman F218: Suspend and reactivate a tenant

Source module: Platform administration. Evidence class: Code-defined.

Suspension sets the shop's status to suspended after confirmation. Reactivation restores active when paidUntil exists or trial otherwise. Reactivating a shop with an already expired trial does not itself extend that trial.

Original role context: Super administrator

Verification gap: Defined in captured client code. No successful authenticated action or server authorization behavior was tested for this entry.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F218` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/super-admin.js`. Anchor: `title: "Suspend this tenant?"`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/tenant.js`. Anchor: `export async function suspendTenant(tenantId)`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/tenant.js`. Anchor: `export async function reactivateTenant(tenantId)`.

### Tailorman F221: WhatsApp shop welcome composer

Source module: Platform administration. Evidence class: Code-defined.

Builds a click-to-chat welcome link using the owner's stored phone, adding India country code for ten-digit numbers. The message includes setup guidance, demo and manual links. The sender must review and send in WhatsApp.

Original role context: Super administrator

Verification gap: No message was sent. This is a WhatsApp composer link, not an automated message-delivery service.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F221` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/super-admin.js`. Anchor: `function welcomeWaUrl(t)`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/super-admin.js`. Anchor: `return 'https://wa.me/${phone}?text=${encodeURIComponent(msg)}';`.

### Tailorman F222: Demo account access management

Source module: Platform administration. Evidence class: Code-defined.

Finds the designated demo tenant, displays enabled state from its owner profile, offers seed or re-seed links, and toggles profile access. Enable can repair a missing profile or stale user-to-tenant mapping using a write batch.

Original role context: Super administrator

Verification gap: No demo tenant was changed or seeded. Shipped demo credential values are deliberately omitted from this inventory. The legacy pro plan written by the enable handler requires separate verification.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F222` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/super-admin.js`. Anchor: `async function loadDemoPanel()`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/super-admin.js`. Anchor: `async function setDemoActive(active, demoTenant, btn)`.

### NoolTech F345: Tenant directory search, filters, and sort

Source module: Platform tenants. Evidence class: Code-defined.

Server pagination is 10 rows. Filter business type and subscription status, search name/email, and sort creation/name/expiry/orders/customers.

Original role context: Platform administrator

Verification gap: Requires a platform administrator session and a controlled action test.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F345` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/TenantListPage-CFiXOmmz.js`. Anchor: `getTenants({page:l,limit:10`.

### NoolTech F346: Create a tenant

Source module: Platform tenants. Evidence class: Code-defined.

Onboard shopName, ownerName, ownerEmail, subscriptionPlan, and optional initial password. Client labels include stale USD plan descriptions.

Original role context: Platform administrator

Verification gap: Requires a platform administrator session and a controlled action test.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F346` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/TenantListPage-CFiXOmmz.js`. Anchor: `Onboard New Tenant`.

### NoolTech F347: Export all tenants CSV

Source module: Platform tenants. Evidence class: Code-defined.

Download all tenant sign-up details and usage counts through /api/admin/tenants/export.

Original role context: Platform administrator

Verification gap: Requires a platform administrator session and a controlled action test.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F347` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/dependencies/admin.service-BmN5Wt02.js`. Anchor: `async downloadTenantsCsv()`.

### NoolTech F348: Activation funnel

Source module: Platform tenants. Evidence class: Code-defined.

View signup, email verification, first customer, and first order funnel for last 30, 90, or all-time periods, with Google/email and app/web breakdowns.

Original role context: Platform administrator

Verification gap: Requires a platform administrator session and a controlled action test.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F348` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/TenantListPage-CFiXOmmz.js`. Anchor: `New shop funnel`.

### NoolTech F349: Tenant profile and data usage

Source module: Platform tenants. Evidence class: Code-defined.

Detail includes business/owner information, recent orders, customers/orders/staff/storage/SMS usage, subscription dates, and activity logs.

Original role context: Platform administrator

Verification gap: Requires a platform administrator session and a controlled action test.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F349` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/TenantDetailPage-BO8hsVfT.js`. Anchor: `Data Overview`.

### NoolTech F350: Edit tenant and business type

Source module: Platform tenants. Evidence class: Code-defined.

PATCH tenant fields and a separate business-type action; switches between tailoring shop and boutique/retail.

Original role context: Platform administrator

Verification gap: Requires a platform administrator session and a controlled action test.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F350` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/dependencies/admin.service-BmN5Wt02.js`. Anchor: `async adminSetBusinessType(a,t)`.

### NoolTech F351: Suspend or activate tenant

Source module: Platform tenants. Evidence class: Code-defined.

Suspend takes a reason; activate restores access according to client messaging. UI confirms destructive access changes.

Original role context: Platform administrator

Verification gap: Requires a platform administrator session and a controlled action test.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F351` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/dependencies/admin.service-BmN5Wt02.js`. Anchor: `async suspendTenant(a,t)`.

### NoolTech F352: Reactivate 90-day trial

Source module: Platform tenants. Evidence class: Code-defined.

Tenant directory offers a fresh +90-day trial action through extendTrial.

Original role context: Platform administrator

Verification gap: Requires a platform administrator session and a controlled action test.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F352` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/TenantListPage-CFiXOmmz.js`. Anchor: `Reactivate Trial (+90d)`.

### NoolTech F353: Soft delete and restore tenant

Source module: Platform tenants. Evidence class: Code-defined.

Delete revokes owner/staff access; deleted shops are kept for 30 days and can be restored, then are described as permanently erased. Server deletion schedule is unverified.

Original role context: Platform administrator

Verification gap: Requires a platform administrator session and a controlled action test.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F353` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/TenantListPage-CFiXOmmz.js`. Anchor: `The shop is hidden now and can be restored for 30 days.`.

### NoolTech F354: Inspect account security and unlock

Source module: Platform tenants. Evidence class: Code-defined.

Read security information and reset failed-login attempts through unlockAccount.

Original role context: Platform administrator

Verification gap: Requires a platform administrator session and a controlled action test.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F354` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/TenantDetailPage-BO8hsVfT.js`. Anchor: `Unlock this account?`.

### NoolTech F355: Reset owner password

Source module: Platform tenants. Evidence class: Code-defined.

Supply a new password or request an autogenerated temporary password for the tenant owner.

Original role context: Platform administrator

Verification gap: Requires a platform administrator session and a controlled action test.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F355` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/TenantDetailPage-BO8hsVfT.js`. Anchor: `Leave empty to auto-generate`.

### NoolTech F356: Per-tenant resource overrides

Source module: Platform tenants. Evidence class: Code-defined.

Override customers, orders/month, users, SMS, vendors, and purchase orders; blank inherits, -1 means unlimited. Add internal notes.

Original role context: Platform administrator

Verification gap: Requires a platform administrator session and a controlled action test.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F356` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/TenantDetailPage-BO8hsVfT.js`. Anchor: `Max Orders/month`.

### NoolTech F357: Per-tenant feature overrides

Source module: Platform tenants. Evidence class: Code-defined.

Each feature supports plan default, force on, or force off. Clear all overrides to return to plan defaults.

Original role context: Platform administrator

Verification gap: Requires a platform administrator session and a controlled action test.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F357` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/TenantDetailPage-BO8hsVfT.js`. Anchor: `Force ON`.

### NoolTech F407: Monitor trial funnel and conversions

Source module: Platform trial management. Evidence class: Code-defined.

View active/expired counts, conversion rate, trials expiring within 14 days, expired trials, and last-30-day conversions.

Original role context: Platform administrator

Verification gap: Requires a platform administrator session and a controlled action test.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F407` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/TrialManagementPage-B48LlcQ-.js`. Anchor: `No trials expiring in the next 14 days`.

### NoolTech F408: Extend trial and run processor

Source module: Platform trial management. Evidence class: Code-defined.

Extend selected tenant trial by additional days and invoke processTrials to handle trial status transitions.

Original role context: Platform administrator

Verification gap: Requires a platform administrator session and a controlled action test.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F408` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/dependencies/admin.service-BmN5Wt02.js`. Anchor: `async processTrials()`.

## REQ-OPS-PLAN: Platform plans, subscriptions, and billing administration

Target behavior and acceptance: [REQ-OPS-PLAN](../product/requirements.md#req-ops-plan-platform-plans-subscriptions-and-billing-administration).

### Tailorman F219: Edit per-tier feature flags and usage limits

Source module: Platform administration. Evidence class: Code-defined.

Shows six non-negative limit fields and fifteen feature checkboxes for each of Free, Premium and Business. Saving persists the three-tier configuration with merge semantics so separate pricing settings are retained.

Original role context: Super administrator

Verification gap: Defined in captured client code. No successful authenticated action or server authorization behavior was tested for this entry.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F219` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/super-admin.js`. Anchor: `function renderPlanConfig()`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/super-admin.js`. Anchor: `await setPlanConfig(config);`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/tenant.js`. Anchor: `export async function setPlanConfig(config)`.

### Tailorman F220: Edit website prices and trial length

Source module: Platform administration. Evidence class: Code-defined.

Configures currency, trial days and Premium and Business monthly and annual monthly-equivalent prices. Calculates annual total and annual savings in the form, then saves only the pricing object so tier limits and features remain.

Original role context: Super administrator

Verification gap: Defined in captured client code. No successful authenticated action or server authorization behavior was tested for this entry.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F220` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/super-admin.js`. Anchor: `function updatePricingComputed()`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/super-admin.js`. Anchor: `await setPricing(pricing);`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/tenant.js`. Anchor: `export async function setPricing(pricing)`.

### NoolTech F358: Subscription overview and plan change

Source module: Platform subscriptions. Evidence class: Code-defined.

View monthly revenue, 6-month trend, plan distribution, and tenants by plan; change a tenant subscription plan.

Original role context: Platform administrator

Verification gap: Requires a platform administrator session and a controlled action test.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F358` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/SubscriptionsPage-CtV4ZW_j.js`. Anchor: `updateTenantSubscription`.

### NoolTech F359: Pause and resume subscription

Source module: Platform subscriptions. Evidence class: Code-defined.

Separate pause/resume actions display immediate loss/restoration of tenant access.

Original role context: Platform administrator

Verification gap: Requires a platform administrator session and a controlled action test.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F359` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/dependencies/admin.service-BmN5Wt02.js`. Anchor: `async pauseSubscription(a)`.

### NoolTech F360: Record manual subscription payment

Source module: Platform subscriptions. Evidence class: Code-defined.

Accept amount and payment notes for cash/bank transfer; UI says this creates an invoice and clears failed-payment flags.

Original role context: Platform administrator

Verification gap: Requires a platform administrator session and a controlled action test.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F360` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/TenantDetailPage-BO8hsVfT.js`. Anchor: `Record Manual Payment`.

### NoolTech F361: Extend grace period

Source module: Platform subscriptions. Evidence class: Code-defined.

Override grace period with additional days; detail form validates 1 to 90 days.

Original role context: Platform administrator

Verification gap: Requires a platform administrator session and a controlled action test.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F361` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/TenantDetailPage-BO8hsVfT.js`. Anchor: `Please enter days between 1 and 90`.

### NoolTech F362: Edit plan identity and prices

Source module: Platform plans. Evidence class: Code-defined.

Edit plan name, tagline, monthly/yearly INR prices, active state, popular badge, and theme color.

Original role context: Platform administrator

Verification gap: Requires a platform administrator session and a controlled action test.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F362` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/PlansManagementPage-C6IqQiiN.js`. Anchor: `Monthly Price (₹)`.

### NoolTech F363: Edit plan resource limits

Source module: Platform plans. Evidence class: Code-defined.

Plan limits cover customers, orders, users, vendors, purchase orders, storageGB, and smsPerMonth.

Original role context: Platform administrator

Verification gap: Requires a platform administrator session and a controlled action test.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F363` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/PlansManagementPage-C6IqQiiN.js`. Anchor: `storageGB:0,smsPerMonth:0`.

### NoolTech F364: Configure plan entitlements

Source module: Platform plans. Evidence class: Code-defined.

Plan editor contains flags for orders, CRM, measurements, invoices/printing/messages, retail/inventory/vendors/PO, production/workers, reports/analytics, multi-location, support/audit/API/branding, and recovery.

Original role context: Platform administrator

Verification gap: Requires a platform administrator session and a controlled action test.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F364` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/PlansManagementPage-C6IqQiiN.js`. Anchor: `basicOrderManagement:!0`.

### NoolTech F365: Synchronize and activate plans

Source module: Platform plans. Evidence class: Code-defined.

Toggle plan isActive and synchronize all plan features with /api/admin/plans/sync-features. UI states changes apply to onboarding, settings, and pricing.

Original role context: Platform administrator

Verification gap: Requires a platform administrator session and a controlled action test.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F365` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/PlansManagementPage-C6IqQiiN.js`. Anchor: `Sync All Plans`.

### NoolTech F366: Invoice and failed payment directory

Source module: Platform billing. Evidence class: Code-defined.

View billing stats, all invoices, failed payments, amounts, due/paid dates, billing periods, and tenant association.

Original role context: Platform administrator

Verification gap: Requires a platform administrator session and a controlled action test.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F366` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/BillingPage-D_mG1ZDk.js`. Anchor: `Failed Payments`.

### NoolTech F367: Download invoice and send reminder

Source module: Platform billing. Evidence class: Code-defined.

Invoice detail offers download and send-payment-reminder action at /api/admin/billing/invoices/:id/reminder.

Original role context: Platform administrator

Verification gap: Requires a platform administrator session and a controlled action test.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F367` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/BillingPage-D_mG1ZDk.js`. Anchor: `sendPaymentReminder`.

### NoolTech F368: Revenue and tenant analytics

Source module: Platform reporting. Evidence class: Code-defined.

Reports show MRR, annual run rate, total tenants, active subscriptions, revenue trend/by-plan, plan distribution, and tenant growth.

Original role context: Platform administrator

Verification gap: Requires a platform administrator session and a controlled action test.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F368` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/ReportsPage-dNiHBQW4.js`. Anchor: `Annual Run Rate`.

### NoolTech F369: Export platform report CSV

Source module: Platform reporting. Evidence class: Code-defined.

Assemble chart/stat data into CSV and trigger download.

Original role context: Platform administrator

Verification gap: Requires a platform administrator session and a controlled action test.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F369` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/ReportsPage-dNiHBQW4.js`. Anchor: `Export CSV`.

## REQ-OPS-SUPPORT: Platform support and shared messaging inbox

Target behavior and acceptance: [REQ-OPS-SUPPORT](../product/requirements.md#req-ops-support-platform-support-and-shared-messaging-inbox).

### NoolTech F375: Ticket directory and filters

Source module: Platform support. Evidence class: Code-defined.

Filter ticket status and priority; search ticket ID, subject, and tenant; display open/in-progress/urgent counts.

Original role context: Platform administrator

Verification gap: Requires a platform administrator session and a controlled action test.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F375` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/SupportTicketsPage-CF2LPTBZ.js`. Anchor: `waiting_on_customer`.

### NoolTech F376: Ticket details, status, and notes

Source module: Platform support. Evidence class: Code-defined.

Read a ticket, update status, and add public or internal notes. Internal notes are labelled invisible to tenant.

Original role context: Platform administrator

Verification gap: Requires a platform administrator session and a controlled action test.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F376` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/SupportTicketsPage-CF2LPTBZ.js`. Anchor: `Internal note (not visible to tenant)`.

### NoolTech F377: Central reply inbox

Source module: Platform WhatsApp inbox. Evidence class: Code-defined.

View replies to automated NoolTech notifications. UI explicitly says only platform admins see them and shops are not notified.

Original role context: Platform administrator

Verification gap: Requires a platform administrator session and a controlled action test.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F377` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/WhatsAppInboxPage-BTefKsvQ.js`. Anchor: `Only NoolTech admins can see these; shops are not notified.`.

### NoolTech F378: Conversation search and filters

Source module: Platform WhatsApp inbox. Evidence class: Code-defined.

Filters include all, unread, open, pending, resolved, assigned-to-me, and no verified shop; paginate and poll while visible every 15 seconds.

Original role context: Platform administrator

Verification gap: Requires a platform administrator session and a controlled action test.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F378` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/WhatsAppInboxPage-BTefKsvQ.js`. Anchor: `Needs review (no verified shop)`.

### NoolTech F379: Assignment, status, read state, and notes

Source module: Platform WhatsApp inbox. Evidence class: Code-defined.

Mark conversation read; update status/assignment and add internal notes. Show warnings for unclear or multiple shop associations.

Original role context: Platform administrator

Verification gap: Requires a platform administrator session and a controlled action test.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F379` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/index-Dk-7hFgw.js`. Anchor: `async markRead(u){await z.post('${qt}/conversations/${u}/read')}`.

### NoolTech F380: Text and media replies

Source module: Platform WhatsApp inbox. Evidence class: Code-defined.

Send text or attached image/PDF/audio/video with optional caption and clientMessageId; show delivery and failure state.

Original role context: Platform administrator

Verification gap: Requires a platform administrator session and a controlled action test.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F380` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/WhatsAppInboxPage-BTefKsvQ.js`. Anchor: `Attach a photo, PDF, audio or video`.

### NoolTech F381: Approved template replies outside 24-hour window

Source module: Platform WhatsApp inbox. Evidence class: Code-defined.

Show free-text reply availability until the provider window expires, then offer approved templates; warn when no approved templates exist.

Original role context: Platform administrator

Verification gap: Requires a platform administrator session and a controlled action test.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F381` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/WhatsAppInboxPage-BTefKsvQ.js`. Anchor: `More than 24 hours since the customer last wrote`.

### NoolTech F382: Inspect and retry failed webhook events

Source module: Platform WhatsApp inbox. Evidence class: Code-defined.

Show unprocessed event counts, receive time, attempts, and last error, then invoke retry on selected events.

Original role context: Platform administrator

Verification gap: Requires a platform administrator session and a controlled action test.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F382` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/index-Dk-7hFgw.js`. Anchor: `async retryEvent(u)`.

## REQ-OPS-COMMS: Announcements, campaigns, referrals, and templates

Target behavior and acceptance: [REQ-OPS-COMMS](../product/requirements.md#req-ops-comms-announcements-campaigns-referrals-and-templates).

### NoolTech F371: Create and edit announcements

Source module: Platform announcements. Evidence class: Code-defined.

Title and content are required; choose target plans, pinned state, optional expiry, and a supported in-app destination/button label.

Original role context: Platform administrator

Verification gap: Requires a platform administrator session and a controlled action test.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F371` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/AnnouncementsPage-kVdVkXqU.js`. Anchor: `Target Plans (empty = all plans)`.

### NoolTech F372: Publish toggle and delete announcement

Source module: Platform announcements. Evidence class: Code-defined.

Search existing announcements, toggle their enabled state, and delete with confirmation.

Original role context: Platform administrator

Verification gap: Requires a platform administrator session and a controlled action test.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F372` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/dependencies/admin.service-BmN5Wt02.js`. Anchor: `async toggleAnnouncement(a)`.

### NoolTech F373: Shop-page activation campaign

Source module: Platform announcements. Evidence class: Code-defined.

Count candidates with dryRun then enable default shop pages, preserving shops which deliberately switched their page off.

Original role context: Platform administrator

Verification gap: Requires a platform administrator session and a controlled action test.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F373` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/AnnouncementsPage-kVdVkXqU.js`. Anchor: `Switch on every shop's page`.

### NoolTech F374: Shop-page email campaign

Source module: Platform announcements. Evidence class: Code-defined.

Send one email per shop with their public page link or instructions for switching the page on; supports a dry-run request.

Original role context: Platform administrator

Verification gap: Requires a platform administrator session and a controlled action test.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F374` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/dependencies/admin.service-BmN5Wt02.js`. Anchor: `async shopPageEmail(a)`.

### NoolTech F392: Referral program configuration

Source module: Platform referral and promos. Evidence class: Code-defined.

Enable referrals and set referee discount, referrer reward, grace period, and maximum rewards. UI says existing pending rewards are unaffected.

Original role context: Platform administrator

Verification gap: Requires a platform administrator session and a controlled action test.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F392` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/SystemSettingsPage-BknBMPtL.js`. Anchor: `refereeDiscountPaise:1e4`.

### NoolTech F393: Promotional code CRUD

Source module: Platform referral and promos. Evidence class: Code-defined.

Create/edit/toggle/delete uppercase promo codes with flat or percent discount, optional cap, max uses, expiry, plan applicability, and internal description.

Original role context: Platform administrator

Verification gap: Requires a platform administrator session and a controlled action test.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F393` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/SystemSettingsPage-BknBMPtL.js`. Anchor: `maxDiscountPaise:0,maxUses:0,expiresAt:`.

### NoolTech F404: Create and edit transactional or marketing templates

Source module: Platform email templates. Evidence class: Code-defined.

Required name, key, and subject; edit category, description, HTML, and plain text body, with template variables.

Original role context: Platform administrator

Verification gap: Requires a platform administrator session and a controlled action test.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F404` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/EmailTemplatesPage-Mh38Rd5H.js`. Anchor: `htmlContent:"",textContent:""`.

### NoolTech F405: Preview and test an email template

Source module: Platform email templates. Evidence class: Code-defined.

Render an HTML preview iframe and invoke test-email action; show aggregate sent counts. The page calls sendTestEmail with only a template key.

Original role context: Platform administrator

Verification gap: Requires a platform administrator session and a controlled action test.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F405` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/EmailTemplatesPage-Mh38Rd5H.js`. Anchor: `Email template preview`.

### NoolTech F406: Template toggle/delete service operations

Source module: Platform email templates. Evidence class: Code-defined.

Client defines toggle and delete endpoints although corresponding controls were not established from the page.

Original role context: Platform administrator

Verification gap: Requires a platform administrator session and a controlled action test.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F406` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/dependencies/admin.service-BmN5Wt02.js`. Anchor: `async toggleEmailTemplate(a)`.

## REQ-OPS-FLAG: Rollout flags and guarded bulk actions

Target behavior and acceptance: [REQ-OPS-FLAG](../product/requirements.md#req-ops-flag-rollout-flags-and-guarded-bulk-actions).

### NoolTech F383: Create and edit rollout flags

Source module: Platform feature flags. Evidence class: Code-defined.

Require lowercase underscore key and name; configure description, category, target plans, global enabled state, and rollout percentage.

Original role context: Platform administrator

Verification gap: Requires a platform administrator session and a controlled action test.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F383` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/FeatureFlagsPage-DZLuZScu.js`. Anchor: `Key must be lowercase with underscores only`.

### NoolTech F384: Toggle and delete flags

Source module: Platform feature flags. Evidence class: Code-defined.

Search by key/name, filter category, toggle enabled state, and delete a selected flag.

Original role context: Platform administrator

Verification gap: Requires a platform administrator session and a controlled action test.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F384` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/dependencies/admin.service-BmN5Wt02.js`. Anchor: `async toggleFeature(a)`.

### NoolTech F385: Select and filter tenants for actions

Source module: Platform bulk operations. Evidence class: Code-defined.

Select a filtered set by plan/status/search, then show selected tenant count and operation results.

Original role context: Platform administrator

Verification gap: Requires a platform administrator session and a controlled action test.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F385` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/BulkOperationsPage-DoAb-g0u.js`. Anchor: `Please select at least one tenant`.

### NoolTech F386: Send bulk tenant email

Source module: Platform bulk operations. Evidence class: Code-defined.

Compose subject/body and call /api/admin/tenants/bulk-email with tenantIds.

Original role context: Platform administrator

Verification gap: Requires a platform administrator session and a controlled action test.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F386` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/dependencies/admin.service-BmN5Wt02.js`. Anchor: `async sendBulkEmail(a,t,n)`.

### NoolTech F387: Mass suspension, activation, plan upgrade, or deletion

Source module: Platform bulk operations. Evidence class: Code-defined.

Apply per-tenant actions to selection and display completion. Delete follows the stated 30-day recoverable shop lifecycle despite an older permanently-delete operation label.

Original role context: Platform administrator

Verification gap: Requires a platform administrator session and a controlled action test.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F387` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/BulkOperationsPage-DoAb-g0u.js`. Anchor: `Deleted shops are hidden and can be restored`.

## REQ-OPS-SYSTEM: Operator identity, policy, audit, and system settings

Target behavior and acceptance: [REQ-OPS-SYSTEM](../product/requirements.md#req-ops-system-operator-identity-policy-audit-and-system-settings).

### NoolTech F370: Search platform activity

Source module: Platform audit. Evidence class: Code-defined.

List activity events with action, tenant, user/email, time, and metadata; supports search and pagination.

Original role context: Platform administrator

Verification gap: Requires a platform administrator session and a controlled action test.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F370` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/ActivityLogsPage-Bebr15ju.js`. Anchor: `Search by action, tenant, or email`.

### NoolTech F388: Platform identity

Source module: Platform system settings. Evidence class: Code-defined.

Edit application name, support email/phone, and logo URL.

Original role context: Platform administrator

Verification gap: Requires a platform administrator session and a controlled action test.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F388` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/SystemSettingsPage-BknBMPtL.js`. Anchor: `Platform Identity`.

### NoolTech F389: Session and password policy

Source module: Platform system settings. Evidence class: Code-defined.

Configure session timeout, max login attempts, lockout duration, requireMFA, and password length/uppercase/numeric/special-character requirements.

Original role context: Platform administrator

Verification gap: Requires a platform administrator session and a controlled action test.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F389` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/SystemSettingsPage-BknBMPtL.js`. Anchor: `Session Timeout (minutes)`.

### NoolTech F390: SMTP and email defaults

Source module: Platform system settings. Evidence class: Code-defined.

Configure SMTP host, port, username, password, secure connection, and welcome/renewal/usage notification defaults. Test email configuration.

Original role context: Platform administrator

Verification gap: Requires a platform administrator session and a controlled action test.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F390` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/SystemSettingsPage-BknBMPtL.js`. Anchor: `SMTP Host`.

### NoolTech F391: Scheduled email job switches

Source module: Platform system settings. Evidence class: Code-defined.

Toggle trial reminders/expiry, deletion reminders/processing, low-stock alerts, and lost-customer recovery jobs. UI says changes apply next scheduled run.

Original role context: Platform administrator

Verification gap: Requires a platform administrator session and a controlled action test.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F391` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/SystemSettingsPage-BknBMPtL.js`. Anchor: `Scheduled Email Jobs`.

### NoolTech F394: Admin user directory and CRUD

Source module: Platform administrator roles. Evidence class: Code-defined.

List admin users, add with email/name/role, edit name/role, remove, and show last login, active-session/MFA counts.

Original role context: Platform administrator

Verification gap: Requires a platform administrator session and a controlled action test.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F394` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/AdminRolesPage-lZ49eiaX.js`. Anchor: `Admin Roles & Permissions`.

### NoolTech F395: Role and permission definitions

Source module: Platform administrator roles. Evidence class: Code-defined.

Role labels are super admin, finance admin, support admin, and read-only admin. Permission labels cover tenants, billing, support, system settings, flags, and admins. Enforcement is unverified.

Original role context: Platform administrator

Verification gap: Requires a platform administrator session and a controlled action test.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F395` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/AdminRolesPage-lZ49eiaX.js`. Anchor: `tenants.suspend`.

## REQ-OPS-HEALTH: Tenant health, platform metrics, and alerts

Target behavior and acceptance: [REQ-OPS-HEALTH](../product/requirements.md#req-ops-health-tenant-health-platform-metrics-and-alerts).

### Tailorman F223: Per-shop usage dashboard

Source module: Platform administration. Evidence class: Code-defined.

A separate super-admin usage screen loads all tenants, then progressively counts customers, bills, billed total, collected total and outstanding for each shop. Supports refresh, search by shop and owner details, and descending ranking by bill total.

Original role context: Super administrator

Verification gap: Defined in captured client code. No successful authenticated action or server authorization behavior was tested for this entry.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F223` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/super-admin-usage.js`. Anchor: `async function load()`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/super-admin-usage.js`. Anchor: `function visibleRows()`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/tenant.js`. Anchor: `export async function getTenantUsage(tenantId)`.

### Tailorman F224: Usage totals and approximate counts

Source module: Platform administration. Evidence class: Code-defined.

Usage uses server aggregate count and sum queries. Missing composite indexes trigger an unfiltered fallback that can include soft-deleted records and marks the result approximate. Platform KPI totals include successful usage rows across all shops, independent of the current search filter.

Original role context: Super administrator

Verification gap: No aggregate query was performed. Approximation behavior and totals come from the inspected client handlers.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F224` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/tenant.js`. Anchor: `async function aggregateOrUnfiltered(colRef, spec)`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/super-admin-usage.js`. Anchor: `function renderKpis()`.
- Archived evidence coordinate: `research_tailorman/evidence/assets/js/super-admin-usage.js`. Anchor: `const anyApprox = rows.some((r) => r.usage?.approx);`.

### Tailorman F225: Export visible shop usage to CSV

Source module: Platform administration. Evidence class: Code-defined.

Downloads the current filtered, ranked rows with rank, shop, owner email, phone, status, customer and bill counts, billed, collected, outstanding and tenant ID. Adds a UTF-8 BOM for spreadsheet compatibility, leaving unavailable usage fields empty.

Original role context: Super administrator

Verification gap: Defined in captured client code. No successful authenticated action or server authorization behavior was tested for this entry.

Runtime boundary: Related browser context confirms a screen, form, static demo, or plan restriction only. It does not establish successful writes or every behavior in this entry.

Original record: `tailorman:F225` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_tailorman/evidence/assets/js/super-admin-usage.js`. Anchor: `const header = ["Rank", "Shop", "Owner email", "Phone", "Status", "Customers", "Bills", "Total billed", "Collected", "Outstanding", "Tenant ID"];`.

### NoolTech F343: Platform KPI dashboard

Source module: Platform overview. Evidence class: Code-defined.

Read total tenants, active subscriptions, paid-invoice MRR, suspended/past-due tenants, and trials expiring in 7 days.

Original role context: Platform administrator

Verification gap: Requires a platform administrator session and a controlled action test.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F343` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/PlatformDashboard-4tO18k3Q.js`. Anchor: `Actual paid invoices`.

### NoolTech F344: Revenue and signup trend charts

Source module: Platform overview. Evidence class: Code-defined.

Fetch revenue trend, tenant growth, system metrics, and recent platform activity with load-more support.

Original role context: Platform administrator

Verification gap: Requires a platform administrator session and a controlled action test.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F344` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/PlatformDashboard-4tO18k3Q.js`. Anchor: `getRevenueTrend(),`.

### NoolTech F396: Tenant and system health dashboard

Source module: Platform tenant health. Evidence class: Code-defined.

Read tenant health and system metrics; show active users, DB docs, file/storage usage, last active time, and issue details.

Original role context: Platform administrator

Verification gap: Requires a platform administrator session and a controlled action test.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F396` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/TenantHealthPage-CDl-PO2g.js`. Anchor: `Tenant Health Dashboard`.

### NoolTech F397: Health issue classification

Source module: Platform tenant health. Evidence class: Code-defined.

UI handles inactive for 7+ days, no 24-hour activity, suspended account, storage near/reached limit, and no active users.

Original role context: Platform administrator

Verification gap: Requires a platform administrator session and a controlled action test.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F397` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/TenantHealthPage-CDl-PO2g.js`. Anchor: `Account inactive for 7+ days`.

### NoolTech F398: Create threshold alert rules

Source module: Platform alerts. Evidence class: Code-defined.

Configure name, description, type, metric, comparison operator, threshold, actions, recipients, and enabled state. Metrics cover billing, usage, security, tenant inactivity, CPU, memory, and response time.

Original role context: Platform administrator

Verification gap: Requires a platform administrator session and a controlled action test.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F398` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/AlertsPage-BkWGUYgu.js`. Anchor: `operator:">",threshold:0,actions:["email"]`.

### NoolTech F399: Toggle, edit, and delete alert rules

Source module: Platform alerts. Evidence class: Code-defined.

View active rules, trigger counts, critical counts; edit, toggle, and remove selected rules.

Original role context: Platform administrator

Verification gap: Requires a platform administrator session and a controlled action test.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F399` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/dependencies/admin.service-BmN5Wt02.js`. Anchor: `async toggleAlertRule(a)`.

### NoolTech F400: View and acknowledge alert events

Source module: Platform alerts. Evidence class: Code-defined.

Show alert history with event, tenant, severity, and time, then acknowledge an event.

Original role context: Platform administrator

Verification gap: Requires a platform administrator session and a controlled action test.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F400` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/dependencies/admin.service-BmN5Wt02.js`. Anchor: `async acknowledgeAlert(a)`.

## REQ-OPS-RETENTION: Privacy operations and retention processing

Target behavior and acceptance: [REQ-OPS-RETENTION](../product/requirements.md#req-ops-retention-privacy-operations-and-retention-processing).

### NoolTech F401: Review deletion and export requests

Source module: Platform data retention. Evidence class: Code-defined.

Show deletion requests, export requests, active policies, cleaned data, scheduled deletion, and export download availability/expiry.

Original role context: Platform administrator

Verification gap: Requires a platform administrator session and a controlled action test.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F401` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/DataRetentionPage-YfKWyUAv.js`. Anchor: `Deletion Requests`.

### NoolTech F402: Execute or cancel account deletion

Source module: Platform data retention. Evidence class: Code-defined.

Confirmation can execute deletion immediately or cancel the request. Page describes a 30-day grace period and audit logging.

Original role context: Platform administrator

Verification gap: Requires a platform administrator session and a controlled action test.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F402` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/dependencies/admin.service-BmN5Wt02.js`. Anchor: `async executeDeletion(a)`.

### NoolTech F403: Retention policy and export service definitions

Source module: Platform data retention. Evidence class: Code-defined.

Client additionally defines updateRetentionPolicy and requestExport. Their callable definitions do not establish an exposed UI control.

Original role context: Platform administrator

Verification gap: Requires a platform administrator session and a controlled action test.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F403` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/dependencies/admin.service-BmN5Wt02.js`. Anchor: `async updateRetentionPolicy(a,t)`.

## REQ-OPS-CONTENT: Public content and blog administration

Target behavior and acceptance: [REQ-OPS-CONTENT](../product/requirements.md#req-ops-content-public-content-and-blog-administration).

### NoolTech F409: Create and edit blog articles

Source module: Platform blog. Evidence class: Code-defined.

Manage title, description/excerpt, category, author, content, SEO keywords, and cover image for articles at nooltech.com/blog.

Original role context: Platform administrator

Verification gap: Requires a platform administrator session and a controlled action test.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F409` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/BlogManagementPage-WSnZswtZ.js`. Anchor: `SEO Keywords`.

### NoolTech F410: Draft, publish, and unpublish articles

Source module: Platform blog. Evidence class: Code-defined.

Save drafts, publish, unpublish, and delete posts; page lists published/draft status, date, and read time.

Original role context: Platform administrator

Verification gap: Requires a platform administrator session and a controlled action test.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F410` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/dependencies/admin.service-BmN5Wt02.js`. Anchor: `async unpublish(a)`.

### NoolTech F411: Upload and remove cover image

Source module: Platform blog. Evidence class: Code-defined.

Image upload can auto-save a draft first. UI accepts JPG/PNG and advertises a 5 MB limit.

Original role context: Platform administrator

Verification gap: Requires a platform administrator session and a controlled action test.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F411` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/assets/BlogManagementPage-WSnZswtZ.js`. Anchor: `Click to upload cover image (JPG/PNG, max 5 MB)`.

### NoolTech F412: Import sample posts

Source module: Platform blog. Evidence class: Code-defined.

Seed the three bundled starter articles through /api/admin/blog/seed.

Original role context: Platform administrator

Verification gap: Requires a platform administrator session and a controlled action test.

Runtime boundary: No related authenticated screen recorded.

Original record: `nooltech:F412` in [the frozen reference baseline](reference_baseline.json).

- Archived evidence coordinate: `research_nooltech/evidence/dependencies/admin.service-BmN5Wt02.js`. Anchor: `async seed(a)`.
