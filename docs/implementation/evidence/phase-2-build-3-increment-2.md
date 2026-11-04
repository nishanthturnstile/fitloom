# Build Three increment 2: wearer measurement book and entry

Status: Complete locally on 2026-11-03. Aggregate validation, schema alignment, development migration and Chrome regression pass. Increment 3 revision/rebase and full custom-field editing remain open.

## Delivered flow

The customer profile now exposes Measurements only with measurement-read capability. Every link names an explicit wearer. Contacts with no wearers get an explanation rather than an inferred self wearer. Wearer rows also link to their own book, with Add available only for effective active owners and measurement management.

The wearer book supports body/garment filtering, profile-label search, active/archive status, count-bearing pagination and current-version links. Saved detail and exact-version routes show the saved schema, original decimal/unit spelling, body/garment basis, missing values, date, notes, source attribution and recording staff. Staff names are a current allowlisted display label; the immutable recording principal remains the authoritative stored identity. Historical reads survive parent/profile archive and schema retirement. History uses sequence continuation.

New entry starts with the published body bundle, so an empty garment catalog does not block measuring. Active garment choices come from a paginated price-free discovery function under measurement authority. The form pins its schema, uses all five existing field controls, records date/notes/source and permits up to 20 custom length dimensions. A garment with no sections or fields can accept a custom dimension. Save uses the existing complete-version command and opens the resulting exact version.

Entry values stay in memory. One NavigationGuard registration owns dirty/uncertain protection. Display-unit changes retain the original entered quantity until the user edits the displayed input. An uncertain save keeps the exact serialized command envelope and disables conflicting edits; retry recovers the committed result without a new version. Denied reads remove private content. Read failures remain errors instead of successful empty lists.

The selected garment control renders its human label. The narrow save/status row stays in normal form flow; the desktop row remains sticky. Existing typography, semantic colors, Field/Input/Select/ToggleGroup/Card/Empty/Skeleton primitives and original illustration assets are reused. No global shell redesign or new raster artwork was introduced.

## Scoped contracts and SQL

`0042_measurement_intake_reads` appends to the 42 retained migrations. It adds only narrow SQL read functions and forward updates to measurement-owned projections/validation; no new table or Drizzle schema is needed.

- `measurement_context` authorizes the exact customer/wearer and returns labels, parent lifecycle, capabilities, shop-local today and the current body reference. Entry requests additionally require measurement management, active parents and valid timezone configuration.
- `measurement_garments` returns only active garment IDs/current version IDs, labels and field counts, with bounded prefix-independent search/count/paging. It does not load a master-management DTO or grant master/rate access.
- Empty standard schemas get a fixed reserved custom-dimension section in the validation wrapper. The exact saved standard sections/fields remain empty; the existing master definition is never rewritten. Custom IDs/meanings still use the retained profile identity registry.
- Detail reads allowlist a recording staff display name, retaining the original principal ID and immutable version document.

The SQL helpers retain empty privileged search paths and named web-only grants. The read protocol uses the existing scope/identity pool and validates every database projection with browser-safe Zod contracts.

## HTTP boundary

The namespace is `/api/workspaces/[tenant]/[location]/measurements`. All responses are private/no-store. GET requests reject query parameters. POST requests retain same-origin JSON ingestion, bounded decoding and the existing read/body deadlines. Measurement commands alone receive the planned 128 KiB transport allowance; unrelated routes retain their previous limits.

| Route below the namespace | Method and payload |
| --- | --- |
| `/:customerId/:wearerId` | GET authorized owner context |
| `/:customerId/:wearerId/book` | POST strict bounded filters; private search stays out of URLs |
| `/:customerId/:wearerId/garments` | POST strict bounded garment-discovery filters |
| `/:customerId/:wearerId/intake` | POST pinned schema reference after owner authorization |
| `/:customerId/:wearerId/entry` | POST bounded context request, requiring active entry authority |
| `/:customerId/:wearerId/:profileId` | GET current exact detail |
| `/:customerId/:wearerId/:profileId/versions/:versionId` | GET selected exact detail |
| `/:customerId/:wearerId/:profileId/history` | POST bounded history continuation |
| `/commands/:command` | POST exact invocation of the four implemented command kinds |

Errors distinguish authentication, permission, unavailable records, validation, conflicts, body limits/timeouts and temporary/configuration failures. They return bounded safe issues and correlation IDs rather than driver details.

## Navigation and private return state

Measurement child paths classify before generic customer profiles. Customers stays selected; structural breadcrumbs label Measurements/Add measurements/Measurement version without unauthorized owner names. The book's shortcut focuses its own search. Other paths preserve customer search behavior. Switching uses the retained Customers/Home destination contract, dropping source owner IDs and filters.

Back navigation carries only a UUIDv4 return token. Its scoped, expiring descriptor stores bounded book filters and focused profile ID under the existing customer-return prefix. The shared scope-change/logout clearing mechanism therefore clears it too. Measurement values, notes, photos, editable drafts and credentials never enter these descriptors. Native termination cannot recover an unsaved editor.

## Evidence and limits

The HTTP and Chrome journeys reuse the retained optimized server, authenticated session, guarded test database and browser harness. They add no second authentication or storage environment. All fixture records are synthetic test records; development data is not seeded or reset.

| Acceptance | Observed evidence |
| --- | --- |
| M01/M02/M09 | Explicit customer/wearer entry; body fields load with no active garment choices; measuring-only role reads context, garment choices and pinned fields without master/rate/file/customer-manage grants |
| M05/M06 | Exact first version still renders its saved label/schema/value after 51 later revisions; missing dimensions stay missing |
| M08/M24 | Current permission revocation denies access, inaccessible exact IDs fail, strict query/owner/origin checks and private no-store responses |
| M10/M16 | Chrome drops a successful create response, then verifies two identical request bodies, recovered result and one content sequence; canceled dirty exit retains input |
| M12 | HTTP traverses 52 profiles and 52 history versions across the 50-row bound with correct counts/continuations |
| M27 | Real Chrome at 1440/1024/390/320; long Tamil custom label, actual source/display-unit assertions and no horizontal document overflow |
| M28 | Existing customer/register/wearer/photo and garment/workspace journeys remain in the shared run; fixture assertions compare actual visible page counts and move-before adjacency after adding the extra garment fixture |
| M34 | Entry date comes from the authorized shop-local context, never a machine UTC fallback |
| Empty garment | Real HTTP and Chrome create from a zero-section/zero-field garment using a custom length; saved standard schema stays empty |
| Return privacy | Search returns through an opaque scoped token, URL omits the private label, browser storage omits entered dimensions and notes |

The full Chrome run passed the new measurement journey and the retained customer/register/wearer/photo, garment editor/catalog/authority and workspace navigation/switching journeys. A subsequent focused measurement run passed after the final native-fieldset layout and validation-association changes. `MEASUREMENT_UI_ONLY=1` selects that journey within the same harness; it creates no second browser/authentication environment.

The inspected original captures use only synthetic records:

- [Desktop body entry](screenshots/measurements-book/measurement-entry-1440.png)
- [Entry at 1024px](screenshots/measurements-book/measurement-entry-1024.png)
- [Custom entry at 390px](screenshots/measurements-book/measurement-entry-390.png)
- [Tamil custom label at 320px](screenshots/measurements-book/measurement-entry-320.png)
- [Book at 320px](screenshots/measurements-book/measurement-book-320.png)
- [Exact historical detail](screenshots/measurements-book/measurement-history-1440.png)
- [Uncertain-save recovery at 390px](screenshots/measurements-book/measurement-uncertain-390.png)

The development forward migration completed with `pnpm db:migrate` before the interrupted validation run. A read-only check after resuming confirmed all 43 journal entries match the retained SQL hashes and timestamps. Both new intake functions exist in `fitloom_dev`. Customers, wearers, measurement profiles and measurement versions remain at 0 each. No development reset or synthetic seed occurred.

`pnpm --filter @fitloom/db db:generate` reports no schema changes. The relative file links in this record, the measurement plan, implementation status and documentation index resolve.

| Final command or check | Observed result |
| --- | --- |
| `pnpm validate` | Passed after resuming: 12 database and 193 application tests, lint across 251 files, all workspace type checks, production build, measurement/customer/master HTTP checks, authentication/operator/private-storage/worker regressions, and 413/408 transport checks |
| `MASTER_UI_CHECKS=1 pnpm --filter @fitloom/application test:http` | Passed before the interruption: shared Chrome measurement, customer/photo, garment and workspace journeys |
| `MASTER_UI_CHECKS=1 MEASUREMENT_UI_ONLY=1 FITLOOM_UI_ARTIFACTS=fitloom-measurements-increment2-ui pnpm --filter @fitloom/application test:http` | Passed on the final controller/layout source before the interruption; retained captures listed above |
| `pnpm --filter @fitloom/db db:generate` | No schema changes |
| `pnpm db:migrate` and read-only development verification | Migration completed before interruption; resumed read confirms 43 matching retained migrations, intake functions and empty customer/measurement tables |
| Relative file links and `git diff --check` | Passed |

The interrupted turn left an aggregate-validation container running. It was stopped during the resumed run, before the new run reached HTTP checks. The replacement aggregate run completed with exit code 0. Chrome was not rerun after resuming because only the evidence and status documents changed.

Browser captures show only the exercised viewport and scroll position. They do not establish assistive-technology or physical-device coverage.

## Remaining increment 3 work

This closes the book, read/intake transport and initial creation flow. It does not close increment 3. The next controller work is revise-as-new-version UI, reviewed schema rebase, complete custom-field editing for every kind, full server-field issue focus/announcement coverage, and the broader native reload/back/scope-switch acceptance matrix. Copy/mapping/comparison/lifecycle UI, private references, QR cards, imports and capture retain increments 4–8. Illustrations still need operational tailor validation before real cutting.
