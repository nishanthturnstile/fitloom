# Architecture and consolidation decisions

## Recommendation and evidence boundary

Use a TypeScript modular monolith with server-owned business commands, PostgreSQL transactions, private filesystem-backed blob storage, and PostgreSQL-backed jobs. The selected technologies and single-server development setup are defined below. These are Fitloom decisions derived from the workflows and final review, not recovered server implementations or benchmark results.

The supplied client research shows three different shapes: Tailorman accesses Firebase services directly and has a small custom HTTP layer; Tailormate uses a shared HTTP service for shop workflows; NoolTech exposes more domain-oriented client services. Their server source and complete authorization or transaction behavior were not supplied. This recommendation combines domain separation with transaction boundaries across related business records.

## Production SaaS and continuous implementation

Fitloom is a production multi-tenant SaaS application. The tailor-first sequence builds retained modules within this architecture. Each phase extends the same application, transactional records, and integration contracts through the complete product scope. Production deployment timing is separate from development checkpoints. The selected environment is one OVHcloud VPS-3 with 6 vCores, 12 GB RAM, and 100 GB NVMe for development and testing. Builds, tests, web, worker, database, and private files share this server. Production capacity, high availability, continuous archiving, and recovery commitments are later prelaunch decisions.

Tenant provisioning, identity/membership, subscription lifecycle, effective entitlements, verified billing, operator access, audit, jobs, observability, and operational recovery belong to the foundation. Later phases expand their interfaces and business capabilities. Subscription trials are tenant account states, not a development experiment.

A business is a tenant, and its outlets/workshops are locations. Resolve tenant context from the authenticated principal's authorized membership. Validate every referenced record against that tenant and the applicable location grants. Carry the same authorized scope through database queries and relationships, private files, caches, search, exports, documents, and queued jobs. Platform-wide records and operator actions use separate explicit authority. Never infer unrestricted tenant access from an operator-facing screen.

Implement isolation for independent tenants and members with access to multiple tenants in the actual identity, query, command, job, file, and cache paths. Initial-location setup is per tenant; advanced branch workflows arrive later. Resolve access or concurrency defects within the owning implementation.

Resolve implementation issues with fixes or compatible workarounds within the owning module. Record limitations, affected contracts, and follow-up work. Preserve authorization, transactional consistency, historical snapshots, and retry safety. Continue independent work while an affected dependency is being resolved. Evolve retained production schemas through versioned migrations rather than resetting earlier phases.

## Module ownership

```text
Shop workspace      Worker workspace      Customer portal      Operator console
       \                   |                    |                    /
                    Authorized server commands and queries
                                  |
 Identity + tenants | Customers + measurements | Orders + pricing
 Production + tasks | Catalog + stock + purchasing | Finance + payroll
 Documents + messaging | Plans + support | Privacy + platform operations
                                  |
             Transactional records + private files + durable job queue
```

| Module | Owns | Public contract |
| --- | --- | --- |
| Identity and tenancy | Principals, memberships, roles, location grants, sessions | Authenticate principal, resolve authorized workspace, evaluate permission |
| Customer records | Shop customer, wearer, contact, preferences, global-customer link | Find customer, maintain shop record, approve or revoke link |
| Measurements | Garment schema versions, profile versions, units, photos, sharing grants | Save version, compare versions, capture order snapshot, import reviewed copy |
| Orders and pricing | Commercial lines, production-unit identities, price/charge snapshots, delivery quantities, amendments, cloth custody | Quote, create, amend, cancel, deliver, return/replacement link, repeat |
| Production and scheduling | Workflow configuration, unit-stage events, assignments, tasks, job sheets, working hours, leave, capacity, appointments | Plan, assign, complete/reopen, calculate availability, book/reschedule/cancel |
| Catalog and inventory | Product, material, variant, stock movement, reservation, count, transfer | Receive, reserve, consume, release, transfer, reconcile |
| Procurement | Vendor, purchase order, goods receipt, supplier payment state | Approve PO, receive quantities, cancel remaining quantities |
| Finance and payroll | Charge credits, receipts/allocations, refund/exchange-credit liabilities, balanced journal, costs, earnings, payouts | Post charge/credit, collect/refund, post expense, accrue/settle earning |
| Documents and communication | Document snapshot, export job, notification, delivery attempt | Generate document, export authorized data, enqueue notification |
| Subscription and platform | Plan versions, entitlements, usage counters, provider inbox, separate platform billing, support, operator actions | Admit usage, apply verified billing event, manage tenant lifecycle |
| Privacy and retention | Consent, sharing revocation, export and deletion requests, retention jobs | Request export, review deletion, execute eligible retention action |

Modules expose domain operations instead of permitting arbitrary writes to another module's records. A single deployed service can coordinate related records in one transaction. Split a module into a separate service only after measured scale or independent ownership justifies the distributed consistency cost.

## Entity relationships and invariants

- A tenant contains locations. Membership grants access to specific locations or an explicit tenant-wide scope. Every business record carries tenant identity. Location is required where stock, work, sales, or reporting needs a branch.
- A shop customer can contain multiple wearers. A global customer identity links to approved shop customers; matching a phone number alone does not grant access.
- A garment schema has versions and semantic field identifiers. A measurement profile has immutable versions, explicit units, measurement date, wearer, author, notes, and provenance. Existing order lines retain an immutable snapshot and source version ID.
- An order contains typed lines: custom tailoring, readymade product, material sale, or alteration service. A line has quantity/unit, frozen price/charge components, and promised date. Every tailoring piece has a stable production-unit ID and independent assignments/stage history. All pieces in one line share wearer, measurement, design, and price snapshots; differing pieces use separate lines. Delivery references quantities and applicable unit IDs.
- An order's commercial status, production progress, delivery quantities, and payment state remain separate. Aggregate views derive from those records through documented rules.
- Stock balance is derived from posted movements by item, variant, and location. Reservations affect availability. Opening stock is one movement. Edits do not silently replace stock history.
- A receipt contains payment-method components and source allocations. Charge credits reduce the collectible charge; refund obligations and their actual settlements are separate. Refunds reference original allocations. Reversals retain originals. Exchange credit is a separate liability. A balanced append-only journal separates shop accounting from platform subscription accounting.
- A worker can exist without a login. A staff membership can link to a worker. Phase 4 qualifying cutting/stitching completion creates an earning tied to a unique unit/assignment/completion and agreed rate snapshot. Phase 5 extends tasks, salary, and payouts. Settlement cannot pay an earning twice. Reopening or rework retains settled history and posts explicit adjustments.
- Operational job sheets and financial invoices have different authorized projections. Documents retain a versioned snapshot of the data and template used to generate them.

## Choices between reference approaches

All choices below are recommendations. The named sources establish the alternatives or defect, not proof that the proposed combined behavior already exists.

| Decision | Reference evidence | Adopted approach and reason |
| --- | --- | --- |
| One business record model with typed lines | Tailormate shares order workflows across stitching/material/readymade; Tailorman has separate boutique totals; NoolTech combines sources in order views | Share identity, collection, search, and history while retaining type-specific pricing, fulfillment, and inventory rules. A shared endpoint alone is insufficient. |
| Guided intake with advanced garment details | NoolTech four-step wizard; Tailormate trials, function dates, images, visual stitch choices; Tailorman progressive optional fields | Keep a short customer → items/measurements → dates/pricing → review path. Expand advanced fields per garment. Persist all entered trials as child records. |
| Immutable historical measurements | Tailorman F027 retains a live measurement reference; Tailormate F016 embeds order values; NoolTech measurement versions and job-sheet snapshots | Snapshot the selected measurement version at confirmation. Updating a profile cannot change historical cutting instructions. Corrections create an explicit order amendment. |
| Semantic measurements and units | Tailormate illustrated body/garment fields; NoolTech F032/F036 units and comparison; NoolTech chart mismatch finding | Give fields semantic IDs and schema versions, retain original unit, and convert only compatible dimensions. Unknown values remain missing rather than zero. |
| Explicit package price policy | Tailorman F039–F042 show headline price but copy component rates | Support component-priced packages or a fixed package total with a visible allocation. Freeze the selected policy and totals into order lines. |
| Detailed stages plus independent task plan | Tailorman detailed per-item stages; NoolTech simple/Kanban modes; Tailormate task duration, assignments and dates | Offer simple progress and detailed board views over the same item events. Tasks carry schedule and responsibility. Workflow templates define optional stages and permitted skips. |
| Quantity-aware delivery | NoolTech F069; Tailorman whole-bill overrides and part-delivery handling | Record delivery events against quantities. Whole-order actions validate remaining quantities and stage prerequisites, with authorized, audited overrides. |
| Stock movements as the accounting record | All three have stock/purchase flows; Tailorman opening-stock duplication warning; NoolTech reservations/transfers/counts | Post each stock effect once with a unique business operation ID. Derive balance and use concurrency checks to prevent overselling. |
| Consistent returns and refunds | NoolTech F082–F084 and separate refund/restock failure finding | Use an explicit return record, disposition, refund, stock movement, and exchange credit. Within the service, commit related records together. External payout failures remain retryable and visible. |
| Agreed rates and immutable earnings | Tailorman computes pending wages at current master rates; Tailormate assigns rates and pays selected rows; NoolTech supports salary/advance/deduction | Snapshot the agreed rate on assignment and accrue at qualifying completion. Configure daily/monthly salary separately. Rate changes cannot rewrite settled work. |
| Financial corrections retain history | Tailormate edits/deactivates receipts; Tailorman voiding, manual entries, and linked ledger | Posted corrections use reversal plus replacement, with reason and actor. Display the net effect and preserve the original documents. |
| Server-wide authorization | Tailormate permission vocabulary; Tailorman worker document masking warning; NoolTech staff and portal roles | Enforce tenant, location, role, entitlement, and field visibility on every API, export, document, file download, and background job. UI checks improve navigation only. |
| Durable shared drafts and communication status | NoolTech local held carts and local reminder Sent marker; Tailorman composer links | Local drafts can aid recovery. Shared held carts save the full customer and cart server-side. Composer opened, queued, accepted, delivered, and failed are distinct communication states. |
| Central entitlement policy | Tailorman live flags differ from fallback/pricing copy; NoolTech plan flags; Tailormate paid-plan matrix unknown | Resolve effective access from versioned plan, trial policy, overrides, and account state. Use the same policy for UI, server admission, pricing comparison, and usage limits. |
| Durable jobs with truthful completion | Tailormate backup schedule; NoolTech export, automated messaging, email and retention services | Queue jobs with idempotency, retry limits, status, and visible failures. A schedule configuration does not count as a completed backup or delivered message. |
| Responsive operational interfaces | Tailorman phone cards and work queues; Tailormate detailed garment editors; NoolTech guided POS and portal | Use fast mobile queues and one-tap work actions, richer expandable editors, and role-specific navigation. Desktop tables and mobile cards share search and pagination. |

Sources: the original Tailorman, Tailormate, and NoolTech reports retained in the `research_notes` sections of [the frozen reference baseline](references/reference_baseline.json). Individual feature anchors and evidence limits appear in the [source appendix](references/source_feature_details.md). The appendix retains historical coordinates for raw evidence archived outside this workspace.

## Command and integration contracts

These are proposed contracts, not copied vendor endpoints:

| Operation | Required input and result |
| --- | --- |
| Create order | Authorized tenant/location, customer, typed lines, versioned measurements, quote version, idempotency key → order ID, canonical totals, outstanding amount |
| Record collection | Order, amount, dated method components, reference, expected version, idempotency key → receipt and allocation IDs, resulting balance |
| Deliver quantities | Order, line quantities/unit IDs, date, actor, override reason, expected version, idempotency key → delivery events and remaining quantities |
| Complete task | Unit/assignment/task, completion data, expected version, idempotency key → completion event, production update, qualifying earning |
| Receive purchase | PO, receipt lines and quantities, destination, cost, idempotency key → goods receipt, stock movements, payable reference |
| Return items | Original sale, returned quantities, stock disposition, refund or exchange-credit choice, idempotency key → return, credit/refund, stock outcome |
| Import measurements | Authorized customer, selected shared entries, consent/provenance, reviewed units, idempotency key → independent shop-owned versions |
| Apply billing event | Raw signature-verified provider/account/event, subscription, amount/currency/environment → durable inbox event and idempotent entitlement revision |
| Book/reschedule | Authorized customer/staff, location/resource intervals, expected version, idempotency key → capacity-checked persisted appointment |
| Post charge credit/refund | Original charge/allocation, credited amount, disposition/settlement, expected version, idempotency key → charge credit, liability, journal, and settlement state |

Every mutation validates input on the server and returns a persisted result or a specific error. Version conflicts require reload or explicit merge. List queries use server pagination, stable ordering, authorized filters, and independent total counts. Reports state whether data is complete and include their filter scope.

A command commits its business changes, critical audit, idempotency result, and outbox/job row in the same PostgreSQL transaction on the same connection. Use the pg-boss transaction adapter with the Drizzle transaction, or a domain outbox inserted in that transaction. Only after commit does the worker generate PDFs or contact providers. A standalone enqueue after commit is not sufficient. Provider retries must not repeat collections, stock movement, earnings, or subscription activation. Credentials remain in restricted server-side secret files.

Authentication, database, jobs, private storage, and the Nodemailer SMTP transport are selected below. External SMTP, phone OTP, messaging, OCR, and payment accounts/providers remain phase-specific decisions. Razorpay is a candidate for confirmed India/INR subscription billing, not a mandatory dependency. Use sandbox events and explicit fixtures during development; missing credentials do not complete an integration. Accounting export formats, mobile deep links, and QR payloads require versioned contracts. No public developer API is inferred from a plan flag.

## Project structure and template

The repository uses pnpm workspaces with Turborepo for development, builds, and type checking. The initial workspace was generated with the official `create-turbo` CLI and adapted to the structure below. Use the official `create-next-app` scaffold for `apps/web`, customized for the selected Next.js release, TypeScript, App Router, Tailwind, Biome, `src/`, and `@/*`. Keep the existing Git history and documents. Select scaffold options explicitly so saved/default CLI preferences do not add a second linter or change the package manager. [Official scaffold](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

The repository itself becomes the reusable project foundation. A third-party SaaS template, a separate template repository, or a starter comparison is not required. The official scaffold supplies framework setup; implement Fitloom's own identity, tenancy, billing, and domain modules on it.

Workspace structure:

```text
fitloom/
  package.json              root scripts and pinned packageManager
  pnpm-workspace.yaml       apps/* and packages/*
  pnpm-lock.yaml            one root lockfile
  turbo.json                dependency-ordered tasks and cached build outputs
  IN_PROGRESS.md            high-level work status
  tsconfig.base.json        shared compiler settings
  biome.json                shared formatting/lint rules
  apps/web/                 official Next.js scaffold and actual product UI
  apps/worker/              TypeScript worker compiled with tsc, run by Node
  packages/application/     commands shared by web and worker
  packages/db/              schemas, migrations, database transaction helpers
  infra/                    added with deployment in roadmap 1C
  docs/
```

Use `workspace:*` for local dependencies. The root owns workspace configuration and the lockfile; merge/remove nested scaffold workspace files and lockfiles. Use pnpm's ordinary isolated `node_modules` layout. Here, workspace means pnpm workspaces, not Yarn Plug'n'Play. Add package manifests/exports and scripts with the actual package code, and add shared UI/config packages only when reuse requires them. [pnpm workspaces](https://pnpm.io/workspaces).

Implement in this order: workspace/scaffold → database and transactions → identity/tenancy → jobs/files/audit → deployment of the retained app → subscriptions → the remaining business modules. All work remains in this product. Resolve problems where encountered and continue; there is no preliminary feature slice or separate validation deployment.

### Keep the initial stack small

The initial dependencies are Next.js/React/TypeScript on Node, pnpm, PostgreSQL/pg/Drizzle, Better Auth, Zod, Biome, Pino, decimal/date utilities, and pg-boss as its worker is implemented. Add React Hook Form and shadcn components with the first real forms/screens. Add image/PDF/scanner/chart/PWA libraries in the phases that use them. Nodemailer supplies the actual auth-email transport; a development SMTP capture tool is optional. Ansible/Compose/Caddy and backup tools arrive with the retained app's deployment, after the project and database structure exist.

Keep one web application, one worker, and one database. Root pnpm scripts use Turborepo to run development, build, start, and type-check tasks. Biome checks and formats the workspace from the root. Nx, extra backend frameworks, Redis, an external telemetry stack, and a separate starter repository are not selected for this implementation.

## Selected technology stack and libraries

The user selected OVHcloud VPS-3 for one shared development/testing machine. Use Ubuntu Server 24.04 LTS. Develop the full retained SaaS product on that machine. Deployment reliability targets and additional production services are decided before launch, without changing tenant or accounting correctness.

| Area | Selected technology/library | Use and constraint |
| --- | --- | --- |
| Language/runtime | TypeScript strict mode, Node.js 26 LTS | One supported Node baseline for web, jobs, and tooling. Use Node runtime for database/files/PDFs. |
| Repository | [pnpm workspaces](https://pnpm.io/workspaces), [Turborepo](https://turborepo.dev/docs), one committed lockfile | Web, worker, shared application modules, database, and UI. Pin pnpm and use frozen-lockfile installs. Turborepo orders package builds and caches outputs. |
| Web | Next.js 16 App Router, React 19 | One web application for shop, worker, customer, public, and operator interfaces. Route handlers and Server Actions call shared commands. Deploy standalone build output with required public/static/template/font assets. |
| Database | PostgreSQL 18, `pg`, stable `drizzle-orm`, `drizzle-kit` | Reviewed SQL migrations, tenant-qualified constraints, decimal columns, locks, and RLS. Use stable-compatible APIs or migration SQL when online docs describe prerelease helpers. |
| Authentication | Better Auth, its release-compatible Drizzle adapter, two-factor plugin | Database sessions, verified email/password, recovery, operator MFA. Add configured Google/phone/customer flows in their owning phases. Fitloom owns domain authorization. |
| Validation/forms | [Zod 4](https://zod.dev/), [React Hook Form](https://react-hook-form.com/), [resolvers](https://github.com/react-hook-form/resolvers) | Parse server-bound input; client validation supports the same structural schemas. |
| UI | Tailwind CSS 4, [shadcn/ui](https://ui.shadcn.com/docs) with Radix primitives, [Lucide](https://lucide.dev/) | Own component code and verify accessibility. Supported browser baseline must meet Tailwind's documented requirements. |
| Tables/data fetching | [TanStack Table](https://github.com/TanStack/table), [TanStack Query](https://tanstack.com/query/latest/docs/framework/react/overview) where needed | Server pagination and totals. Cache keys include principal projection, tenant, location, and filters; invalidate private state on context change. |
| Charts | [Recharts](https://github.com/recharts/recharts) | Charts consume authorized aggregated data. Forecasts retain their assumptions. |
| Money/quantities | [decimal.js](https://mikemcl.github.io/decimal.js/), PostgreSQL `numeric` | Decimal strings at JSON boundaries; explicit scales/rounding. Never derive authoritative money using binary floats. |
| Dates | `date-fns`, [@date-fns/tz](https://github.com/date-fns/tz), IANA timezone names | Separate date-only business fields from `timestamptz` instants. Use location timezone for schedules and period boundaries. |
| Jobs/outbox | `pg-boss`, Drizzle transaction adapter | Shared PostgreSQL, separate worker entry point, transaction-bound job creation, bounded retry and failed-job visibility. |
| Files/images | Private filesystem `BlobStore`, [sharp](https://sharp.pixelplumbing.com/) | Immutable opaque keys, metadata/ownership in PostgreSQL, authorized streaming, bounded image decoding/re-encoding. An S3 adapter can be added later without changing domain records. |
| Documents | [Playwright Chromium](https://playwright.dev/docs/api/class-page#page-pdf), versioned HTML/CSS templates, bundled fonts | Worker PDF generation and browser print layouts. Test A4/A5, 58/80 mm, and supported scripts. Limit browser concurrency and network access. |
| QR/barcodes | [qrcode](https://github.com/soldair/node-qrcode), [bwip-js](https://github.com/metafloor/bwip-js), [ZXing browser](https://github.com/zxing-js/browser) | Generate codes and labels; add camera decoding in inventory. Hardware keyboard scanners need no camera decoder. Codes do not grant authorization. |
| Email/phone | [Nodemailer SMTP](https://nodemailer.com/smtp/) adapter; `libphonenumber-js` for contact normalization | SMTP account and OTP provider are selected against delivery/abuse requirements. Optional Mailpit Compose profile captures development email locally; its UI is private. |
| PWA/drafts | Web App Manifest, a narrowly scoped service worker, IndexedDB through `idb` | Cache public shell assets and approved local drafts only. No general offline sync engine or private-response cache. |
| Logs | [Pino](https://github.com/pinojs/pino), rotated container logs, basic process/backup status | Add correlation and error reporting to actual commands/jobs. A separate telemetry SDK/backend is deferred until an operational requirement needs it. |
| Developer tooling | Biome and TypeScript compiler | Root formatting/type-check/build scripts support implementation. Vitest, browser-test runners, Testcontainers, and property-test frameworks are deferred; they are not foundation deliverables or a separate validation stage. |
| Linux automation | Ansible Core, pinned `community.general` and `community.docker` collections | Configure the host over SSH. Encrypt deployment secrets with Ansible Vault; keep the vault password outside the repository. |
| Service topology | Docker Engine, Compose v2, Caddy 2 | One Compose application and a reverse proxy. Explicit networks, published ports, storage, health checks, and restart policy. |
| Backup/move | PostgreSQL `pg_dump`/`pg_restore`, restic, rsync over OpenSSH, systemd timers | Matched development database/file/configuration backups and encrypted off-VPS copies. pgBackRest/WAL archiving is deferred until production recovery objectives require it. |
| Operator commands | GNU Make with small checked scripts/playbooks | One documented interface for setup, deploy, backup, restore, and verification. No cloud control plane is required. |

The workspace pins Node.js 26.13.0, pnpm 12.16.1, Turborepo 2.11.10, Next.js 16.4.3, React 19.3.1, TypeScript 7.0.2, Tailwind CSS 4.3.3, and Biome 2.6.4, checked on 2026-10-31. The worker uses Pino 10.4.0. Shared application/database modules currently have no business implementation. Pin stable package versions, collection versions, and container digests as their owning features are implemented. Add each later-phase library when implementing its owning feature. Resolve package, native-binary, Chromium, or browser incompatibilities in that implementation. Do not build a separate compatibility application or trial environment.

Official references: [Next.js self-hosting](https://nextjs.org/docs/app/guides/self-hosting), [Node releases](https://nodejs.org/en/about/previous-releases), [PostgreSQL support](https://www.postgresql.org/support/versioning/), [Drizzle releases](https://github.com/drizzle-team/drizzle-orm/releases), [Better Auth adapter](https://better-auth.com/docs/adapters/drizzle), [Tailwind browser support](https://tailwindcss.com/docs/compatibility), [pg-boss transaction adapters](https://pgboss.io/api/adapters).

Additional selected utilities are documented by [libphonenumber-js](https://github.com/catamphetamine/libphonenumber-js), [idb](https://github.com/jakearchibald/idb), [Mailpit](https://mailpit.axllent.org/docs/install/), [Ansible UFW](https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html), and [Ansible Compose v2](https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_compose_v2_module.html). These establish supported mechanisms, not the result of a Fitloom deployment test.

### Code ownership and HTTP boundaries

The workspace starts with `apps/web`, `apps/worker`, `packages/application`, and `packages/db`. Add `packages/ui` only when shared UI code exists. Application modules own their command/query contracts and orchestration. Database code owns schemas, migrations, and transaction helpers. UI code cannot import database credentials or server modules. Framework entry points parse external input and call the same commands that workers use.

Use validated JSON HTTP endpoints where a browser, provider, or later client needs them. Keep webhook routes explicit so they retain raw signed bytes. Do not add GraphQL, a second backend framework, Redis, Kubernetes, or Terraform to the initial setup. Those are future decisions only if a concrete need appears. The initial API is internal to the product, not a promised public developer API.

## Tenant data and transaction enforcement

Use one PostgreSQL database/schema for the business application. Business tables carry `tenant_id`, and location-owned rows carry `location_id`. Define unique parent keys such as `(tenant_id, id)` and foreign keys that include tenant identity, including parent/child lines, customer links, files, stock, and assignments. Tenant-local SKU/document uniqueness and indexes follow the authorized query scope.

Global principals and sessions, platform-owned billing, operator records, approved cross-shop links, and queue infrastructure are explicitly classified exceptions. They are not given tenant-wide access through a null tenant sentinel. Resolve the authenticated principal first, validate the requested membership/location, and set transaction-local tenant context on the same acquired database connection used by all business statements. Missing context denies tenant-owned access. Returning a pooled connection must not retain scope.

Apply RLS to tenant-owned business tables and retain application permission/field checks. The web runtime role is neither a table owner nor a superuser and lacks `BYPASSRLS`. Migrations have separate credentials. Workers have only the queue privileges they need and run each tenant job in an authorized transaction. Platform maintenance uses narrowly scoped, audited commands. RLS does not replace tenant-qualified relationships or protect every SQL operation; PostgreSQL documents its bypass and integrity-check boundaries. [PostgreSQL row security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html).

Each command accepts an operation identity and, where state can conflict, an expected version. Scope idempotency by accounting/business owner, command kind, and operation key. Store a canonical request hash and the result reference in the same transaction as the business records and job. The same key/input returns the original result; a different input under the same key fails. Retain operation identities with the durable source record rather than expiring them before a possible retry. Serialization/deadlock retry is bounded and preserves the same operation identity.

The worker receives committed jobs at least once. External acceptance followed by a worker crash leaves an uncertain provider outcome. Use provider idempotency/status lookup and reconciliation before repeating an irreversible effect. A durable inbox verifies raw signature bytes, binds provider/account/environment, persists event identity and processing state, then acknowledges receipt. Process duplicate or unordered events using state-aware commands and a separate business-effect uniqueness rule. This implements the [transactional outbox contract](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html), without assuming the queue makes external actions exactly once.

## Authentication and entitlement policy

Use Better Auth for identity and database-backed sessions. Fitloom membership/location grants are the authoritative business access model. A Better Auth organization integration, if enabled, must have a unique one-to-one tenant mapping; it must not create a competing membership store. Customer identities receive approved shop links, not staff membership. Operator authority has separate grants and admission. The same person can hold several authorities only through explicit authorization.

The initial methods are verified email/password, reset/verification email, and operator authenticator MFA. Google, phone OTP, and customer methods remain required in their assigned phases. Disable session cookie caching initially. Check current session validity, principal status, membership, and entitlements for every protected request. Revocation takes effect on the next protected request after commit; already downloaded copies remain outside that guarantee. [Better Auth session management](https://better-auth.com/docs/concepts/session-management).

| Decision order | Enforced rule |
| --- | --- |
| 1. Identity and security | Reject revoked sessions/inactive principals. Security suspension blocks ordinary tenant access regardless of plan or feature override. Restricted operators can review recovery and export requests through audited commands. |
| 2. Authority and location | Require explicit business membership/location grants, approved customer link, or platform authority. No role preset or subscription can grant a missing permission. |
| 3. Commercial account state | Trial, active, and grace use their versioned effective plan. Expired accounts stop protected operational mutations. Verified owners retain renewal and manual data export; ordinary subscription expiry does not erase records. |
| 4. Feature resolution | Resolve effective plan version and effective dates, then explicit commercial feature/limit overrides. Overrides cannot bypass security suspension, permissions, or scope. An extension/reactivation is its own audited lifecycle event. |
| 5. Usage admission | Check and increment the applicable quota atomically with the operation. Use an explicit unlimited value, not an overloaded zero or client sentinel. |

Usage rules identify resource, owner, period timezone, counting event, reversal policy, and reservation/release behavior. Count seats by active staff logins, not worker records without login. Count issued bill/sale operations within the tenant-local period and retain audit on void/reversal; do not reset usage by deleting history. Storage counts finalized live objects and reserved upload bytes, with cleanup reconciliation. Plan changes retain effective dates and do not rewrite historical usage.

Rate-limit login/OTP, recovery, invitations, public tracking, scans, and campaigns. Limit file size/decoded pixels, query duration, report/export size, queue backlog, and PDF concurrency. Protected Next.js pages, API responses, documents, and private downloads are not shared-cacheable. Delayed disclosure/deletion jobs recheck current grants, consent, suspension exceptions, and cancellation state.

Commercial expiry does not cancel an already owed refund or provider reconciliation. Such system work uses explicit service authority and the original obligation, independent of a former staff session. Security-suspended accounts require the restricted operational policy for financial recovery; they do not regain ordinary data disclosure or user mutation rights through a queued job.

## Domain records and policies

### Charges, settlement, and journal

Shop transactions and platform subscription transactions use separate accounting owners and journal accounts. A posting has a unique business operation, currency, source, debit/credit lines, actor, and reversal link. Debit and credit totals balance per owner/currency. Related source changes and postings are one local transaction. Each module supplies its posting matrix before its first transaction.

Store issued charge snapshots and separate credit adjustments. Effective charge equals charge minus charge credits. Net settlement equals receipt and credit-redemption allocations minus their reversals and settled refunds. Outstanding is `max(effective charge - net settlement, 0)`. An excess is customer/refund liability. Refund obligation, provider attempt, settled refund, and exchange-credit liability are distinct records. Tender/change is not an over-allocation. A ₹1,000 paid charge with a ₹400 credit and ₹400 settled refund leaves charge/settlement at ₹600 and zero outstanding.

The minimum posting matrix covers charge/receivable and tax, advance liability, receipt/cash allocation, charge credit, refund liability and settlement, exchange-credit issue/redemption, supplier payable/payment, valued stock/COGS, expenses, and wage accrual/payout. Transfers and reversals must not count the same cash or expense twice. The daybook is a view of cash movements, while billed sales, receivables, liabilities, costs, and estimated margin retain separate definitions. A tax/accounting policy decides recognition and legal documents before real use; the development journal is not a claim of statutory compliance.

Use at least six decimal places for stored unit prices, material quantities, and intermediate allocations where the unit requires them; posted monetary amounts use the selected currency scale. Reject precision beyond the declared field policy rather than silently truncating it. Development fixtures use INR and two monetary decimal places. Currency cannot be mixed within an order/journal posting.

The quote version records this order: establish quantity and component charges; expand packages and allocate any fixed package total; apply configured line discounts and express charges; allocate order discounts to eligible lines; compute inclusive/exclusive tax from those discounted lines; round posted amounts and allocate any remainder deterministically by stable line ID. Default currency rounding is half-up. A versioned policy must state which charges are discount/tax eligible. Fixed totals and minor-unit remainder allocations reconcile exactly. Advances affect settlement, not quote revenue. Partial returns/credits reuse original allocations. Confirm the real tax/rounding policy before relevant invoices are issued.

Document numbering is unique by accounting owner, document kind, and fiscal period, with an atomic sequence. Issued invoice numbers/dates and branding/data/template snapshots remain immutable. An order display reference can receive an audited correction; invoice corrections issue linked adjustment documents. A document-generation retry preserves version identity.

### Production, cloth custody, and earnings

Each garment piece has a production-unit ID, parent line, wearer/measurement/design snapshot, assignment/rate snapshot, stage events, and delivery references. Pieces sharing a line have the same commercial/snapshot definition, while progress and assignees can differ. Material sale quantities remain decimal measurements, not artificial garment pieces.

Development fixtures start with configurable shirt/blouse/trouser masters and a material received → measurement confirmed → cutting → stitching → QC → ready workflow. Ironing is optional. Pending measurements may be saved, but cutting requires a confirmed cutting snapshot. A manager-authorized skip or unpaid delivery needs a recorded reason; the actual shop policy is configured before operational use. Reopening completed work does not erase delivery, accrual, or historical instructions.

Minimal piece-rate accrual starts in phase 4. A unique eligible completion for a unit/assignment/role captures the agreed rate and posts the earning once. Task earnings in phase 5 extend the same ownership. Corrections to unpaid earnings compensate the original. A settled earning remains settled in history; any recovery/additional payment creates an explicit adjustment for approval. Salary, deduction, and advance rules are versioned before their commands are enabled.

Customer cloth custody records received/used/waste/remnant/returned quantities and accountable location/person. It is excluded from shop-owned inventory and valuation. A custody adjustment identifies its original event. Commercial returns do not reverse delivery events or automatically create a replacement. Replacement work has its own linked obligation and applicable financial policy.

### Stock cost, reservations, and loyalty

Select moving weighted average for shop-owned valued stock by tenant, location, item, and variant. Receipt and issue movements freeze cost/quantity/unit. Issue/COGS cost is historical; a later catalog edit cannot change it. Eligible returns restore the original attributable issue cost. Purchase corrections after consumption preserve prior cost history and post explicit valuation/payable adjustments. Transfers carry their cost through in-transit stock rather than creating profit.

Reject negative available stock initially. Availability subtracts active reservations; reserve/consume/release is concurrency-safe. Held carts alone do not reserve. Reservation expiry is disabled until configured; cancellation and authorized release always create events. PO tolerance defaults to zero excess until configured. Transfers initially receive the full outstanding dispatched quantity; partial receipt stays unavailable until its quantity/cancel model is implemented. Counts use a recorded movement cutoff and reconcile intervening events.

Loyalty uses an append-only points ledger with sale/rule version, earn, redeem, expiry, and correction events. Redemption is an explicitly allocated discount in the initial pricing policy, not received cash. Rules are disabled until earn/conversion/cap/expiry and return behavior are configured. Reverse original allocations on returns. If previously earned points were spent, record a points debt that blocks further redemption until resolved rather than silently charging cash or rewriting the sale.

### Schedule, media, sharing, and imports

Production/scheduling owns working hours, holidays, leave, service duration/buffers, staff/location capacity, and appointments. Add the primitives in phase 4 and exceptions in phase 5. Phase 8 availability checks all occupied intervals, including trials. Lock the affected resource/day rows in stable order before confirming or rescheduling, then validate intervals and capacity in the transaction. Development fixtures use 30-minute slots and capacity one per staff member; durations consume all required slots. Working-time edits do not silently reschedule confirmed appointments.

Private files have staged/finalized/retired lifecycle, tenant/owner, checksum, size, and type. Validate and finalize an immutable object before attaching committed metadata. Failed database attachment leaves a collectable orphan, not a public file. Downloads reauthorize through the web application. Retain referenced originals/templates/fonts and use an explicit orphan/deletion policy. Image/PDF processing must not fetch arbitrary private network URLs or execute uploaded HTML. Test allowed fonts, scripts, dimensions, and hardware/camera behavior before claiming compatibility.

Revocation blocks new server reads. Downloaded files and independent Fit Card imports remain held copies and require their own privacy policy. The initial service worker caches public shell assets only. IndexedDB drafts are principal/tenant scoped, use an allowlist of fields and lifetime, and are cleared on logout/context switch. Do not promise confirmed offline orders, stock, or payments. Before reactivating an older restore, reconcile eligible deletion/suppression records so revoked/deleted data is not silently republished.

Each supported import records format/version, source IDs, preview, duplicates, per-row outcome, operation identity, and reconciliation totals. Whole historical migration is not inferred from CSV catalog/customer import. Each advertised accounting export is tested against its target mapping/import contract. OCR provider selection requires a representative handwriting/language corpus, confidence/error checks, and explicit image retention/egress policy. Manual entry remains available.

## Single-server infrastructure as code

### Configuration ownership

Use Ansible over SSH for the Linux host and Docker Compose for the application. This gives one operator a small set of versioned files without a separate infrastructure state service. Ansible manages repeatable desired state; check mode is a useful preview, not proof that every task will succeed. [Ansible playbooks](https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_intro.html), [check mode](https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_checkmode.html), [Compose deployment](https://docs.docker.com/compose/how-tos/production/).

| Layer | Versioned configuration |
| --- | --- |
| Machine inputs | Inventory hostname/IP, initial SSH user, deployment user/key, allowed admin CIDRs, application domain, environment name, release/image digests, and data root. Default data root is `/srv/fitloom`. |
| Linux | Required packages, timezone/NTP, deploy account, SSH configuration, sudo rules, UFW rules, Docker repository/packages, daemon log rotation, reboot/startup behavior, file owners/modes, backup timers, and basic disk/process checks. |
| Container networking | One Compose bridge network for the app, service DNS names, allowed published ports, and outbound provider access. Publish only Caddy HTTP/HTTPS. PostgreSQL has no public host port; use SSH plus a temporary loopback binding if a developer needs it. |
| Application | Web/worker image and entry point, environment configuration, health/readiness, persistent mounts, secrets, restart policy, pool/concurrency limits, and the controlled migration job. Test runners and optional Mailpit are explicit profiles. |
| Data/recovery | Database role/bootstrap policy, private-file paths, daily/pre-change dump backup, restic repository, retention, restore verification, release manifests, and move/cutover procedure. |

The VPS purchase/region/size, assigned public IP, and domain/DNS account/delegation are external inputs. The initial design has no provider-specific private VPC, load balancer, or additional network appliance. After purchasing a compatible VPS, all guest-OS and application configuration is replayed from code. Record the DNS record and TTL in environment variables/runbook; updating public DNS remains one explicit cutover action until a DNS provider/API is selected. This boundary avoids claiming Ansible purchases a VPS or controls an unspecified DNS provider.

The planned phase 1 files are `infra/ansible/site.yml`, `infra/ansible/inventory.example.yml`, `infra/ansible/requirements.yml`, shared host/deploy variables, `infra/compose.yaml`, `infra/Caddyfile`, backup/restore scripts, and a top-level `Makefile`. One host playbook and one Compose file are sufficient initially. Add small task/template files only when they keep repeated settings in one place. The files and commands below are a delivery contract, not files already implemented by this documentation update.

The operator interface will expose `make infra-check`, `make provision`, `make deploy RELEASE=<version>`, `make backup`, `make restore BACKUP=<id>`, and `make status`. Restore/move operations also accept an explicit target inventory. The check target previews supported nonsecret changes. Secret-bearing tasks use `no_log` and disable diffs. Provisioning is repeatable and preserves data. Migrations and restoration are separate commands with explicit state checks; provisioning must never overwrite a populated database. Restore verifies the named backup/release and refuses nonempty destination data paths by default. Replacing existing data requires a deliberate separate recovery action and a protected pre-replacement copy.

### Secrets, firewall, and persistence

Use Ansible Vault-encrypted variable files with the vault password kept in the operator's password manager. Plaintext secrets never enter Git, images, logs, backups without encryption, or general settings responses. Render root/deploy-restricted secret files on the target and mount them only into required services. Keep a recoverable copy of vault/restic keys off the VPS. Ansible Vault protects data at rest; ordinary Compose secrets are mounted files, not a separate encrypted secret service. [Ansible Vault](https://docs.ansible.com/projects/ansible/latest/vault_guide/index.html), [Compose secrets](https://docs.docker.com/compose/how-tos/use-secrets/).

Manage host SSH access and UFW through Ansible. Allow SSH from configured administrator addresses and HTTP/HTTPS for the application. Apply equivalent IPv4/IPv6 policy. Establish and test deploy-user key access before disabling the bootstrap login method, and retain the provider console recovery procedure. Docker publishes ports through its own firewall rules and can bypass UFW rules; do not assume UFW hides a published database. Publish only intended ports and verify exposure from outside the host. Retain Docker's networking/firewall integration. [Docker firewall behavior](https://docs.docker.com/engine/network/packet-filtering-firewalls/).

Persist PostgreSQL under `/srv/fitloom/data/postgres`, blobs under `/srv/fitloom/data/blobs`, Caddy certificate/configuration state under `/srv/fitloom/data/caddy`, and backup staging under `/srv/fitloom/backups`. Ansible establishes ownership against the pinned images' actual UID/GID. PostgreSQL 18's container mount targets `/var/lib/postgresql`, with its version-specific data subdirectory. Never blindly copy a live PostgreSQL data directory or reuse a different major version's volume. [Official PostgreSQL image](https://hub.docker.com/_/postgres).

Web and worker share the blob mount with the same access policy. Caddy never serves that directory directly. Durable data stays outside container writable layers and outside source checkouts. Compose reset/prune routines must not delete persistent data. Use a stable environment/project name; changing it must not silently attach fresh volumes. Automated tests use a separate database/credentials and temporary paths, including when they run on the same VPS.

### Development resource and release defaults

Initially run one web instance, one worker, and one PostgreSQL instance behind Caddy. Begin with one build at a time, one PDF/browser-generation job, and add browser automation only when a concrete task calls for it. Set web and worker database pools initially to 10 and 5 respectively and record all other connections before tuning PostgreSQL's limit. These are development tuning defaults, not production SLAs. Reserve memory for the OS, database, builds, and actual feature work. Resolve resource bottlenecks as they appear; no preliminary synthetic tenant/load exercise is scheduled. Rotate logs and prune old release images through a retention rule that preserves the current/previous release.

Build the retained application image, apply its Compose configuration, take a pre-change backup for stateful changes, run one migration job, and start the actual web/worker processes. Fix runtime/deployment problems as part of this work. A development profile may use live reload. Additive migrations and recorded backfills preserve earlier phases. Reverting the image is a rollback only while the migrated schema remains compatible. Configure provider callbacks, OAuth origins, session cookies, fonts, worker adapters, and mounted files for the actual Caddy deployment.

## Backup, restore, and moving to another machine

Configuration replay and data recovery are separate operations. Ansible/Compose recreates the machine configuration; a matched backup restores PostgreSQL, private files, and required configuration. The initial development approach accepts a brief maintenance period and uses logical database dumps instead of continuous WAL archiving. PostgreSQL documents dump portability through `pg_dump` and `pg_restore`. [PostgreSQL SQL dumps](https://www.postgresql.org/docs/current/backup-dump.html).

A supervised daily timer and an explicit pre-change/pre-move command block new requests/uploads, stop application/worker writers and scheduled side effects, then create a custom-format database dump plus the matching blob/configuration/release manifest set. Always restore service availability on an ordinary backup success or failure and record the actual outcome; a final move backup deliberately leaves the source quiescent. Do not label a failed or local-only backup as protected. Include the checksums, database version, migration revision, image digests, required roles/grants, fonts/templates, data paths, and necessary encrypted secrets. Use a restricted backup credential able to capture all required tenant/global rows and verify its coverage under RLS; never use a tenant-filtered runtime dump as the platform backup. Roles/permissions are recreated through the versioned bootstrap/migration definitions, not guessed from one database dump.

Use restic encryption for the protected copy outside the VPS. Initially, the operator command pulls a completed backup set with rsync over SSH into restricted workstation staging, runs restic against that local set into an encrypted workstation repository, verifies success, and removes local staging. Restic is not assumed to read remote SSH source paths directly. Keep the latest seven completed daily sets and an explicit pre-move set until verification; prune staged data and old images to keep the 100 GB disk usable. Do not delete the only protected copy to recover space. Capture off-VPS backup success separately from VPS staging success. Offline workstation copies make the protected recovery point the latest successful pull; report that freshness honestly. Later automation can use a selected remote repository without changing the backup contract. [Restic backup behavior](https://restic.readthedocs.io/en/stable/040_backup.html).

Infrastructure configuration and the latest backup are sufficient to rebuild on another compatible Ubuntu/x86-64 VPS. The move procedure is:

1. Obtain the destination VPS and record its IP/SSH identity. Reuse the same domain and repository release where possible. Verify disk capacity for restored data and temporary backup files. The initial source can stay available while the empty target is provisioned.
2. Apply the same Ansible playbook with the destination inventory and encrypted configuration. Create storage/roles and validate Compose, firewall exposure, mount ownership, and image digests. Keep the target web/worker stopped or in maintenance with all external side effects disabled.
3. Lower DNS TTL ahead of a planned cutover when possible. Quiesce the source, finish or explicitly stop in-flight work, and take the final matched backup. Once this backup starts, the source remains read-only/stopped until the move succeeds or is explicitly rolled back.
4. Transfer and restore the backup on the target. Verify hashes, schema/release compatibility, referenced blobs, financial balances, tenant isolation, and pending jobs. Do not start a second side-effect worker while the source can still process jobs. A selective tenant recovery instead restores into isolation and imports reviewed records; it never overwrites other tenants in the live shared database.
5. Reconcile uncertain provider payment/refund/message outcomes and deletion/suppression state before enabling outbound work or restored disclosure. Restored old jobs may otherwise repeat effects already accepted outside the database. Use sandbox providers for development testing.
6. Verify the target through a temporary hostname or controlled host mapping/tunnel with the correct origins/TLS settings. Update DNS to the new IP, recheck certificates, cookie/OAuth/webhook URLs, and health. Start target writers only after the source is stopped; DNS propagation must not leave two writable copies.
7. Keep the old server stopped and its data intact until post-cutover verification passes. If the target has accepted new writes, do not simply reactivate stale source data. Quiesce the target and restore/reconcile its latest data first. Then retire the old server through a deliberate cleanup action.

Implement the backup/restore commands and retain this procedure for actual recovery or a host move. Do not create a clean-room VM, trial workspace, or upfront restore rehearsal as a prerequisite to development. Handle machine-specific issues when deploying or moving the retained application. Production RPO/RTO, retention, off-site automation, PITR, availability, and capacity are later release decisions.

## Decisions still needed

Product direction, the complete core stack, VPS-3 development/testing host, Ansible/Compose setup, private filesystem adapter, basic backup/move procedure, tenant enforcement, and financial/quantity contracts are selected. Real market/tax/invoice policy, payroll terms, privacy retention, external providers, subscription prices, and production capacity/recovery remain explicit owner decisions with deadlines in [the requirements](requirements.md#open-decisions). Resolve each before its affected real-data action or integration, while continuing independent development. The [roadmap](roadmap.md) sequences those dependencies.
