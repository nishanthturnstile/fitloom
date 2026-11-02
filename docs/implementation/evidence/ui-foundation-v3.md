# UI foundation v3 implementation evidence

Status: In progress. Foundation slice and increments 2–4 locally verified on 2026-11-02. Increment 5 is implemented; its runtime verification is incomplete. This record does not close the redesign acceptance checklist.

## Foundation slice

The catalog route keeps its existing controller, commands, permission checks, and native navigation guards. Its heading and workspace selector now sit outside the legacy CSS wrapper, with a shared responsive `PageHeader`, Noto Sans heading, IBM Plex Sans controls, and preset semantic colors. The editor remains inside a compatibility wrapper until its later migration.

IBM Plex Mono is loaded through `next/font` and mapped to the mono theme token. Decimal inputs and ordering positions use tabular mono text. Legacy text colors now use `--legacy-muted`, leaving the preset `--muted` background token available inside every wrapper. Account and setup styles retain their existing values.

Added preset Base UI Field, Sheet, Alert, Empty, Skeleton, Toggle, and ToggleGroup components. Existing Button, Label, Separator, and other installed components were preserved. New components were inspected and formatted against repository rules. Field error keys use unique messages; the toggle spacing style has a checked type; the sheet uses Hugeicons. Sheet transitions and skeleton animation respect reduced motion. These additions prepare the next increments; the mobile menu and view toggle are not implemented yet.

## Baseline

Baseline revision: `9317c14ee1fbab1c0bc027c7669e3f290c4e9d1e`, plus the pre-existing staged Build One and design work. The starting checkout already contained substantial changes. Local snapshots preserve that distinction:

- `/tmp/fitloom-v3-baseline-status.txt`
- `/tmp/fitloom-v3-baseline-staged.patch`
- `/tmp/fitloom-v3-baseline-unstaged.patch`

Before refactoring, lint, type checks, production build, and the optional real Chrome master suite passed. The existing harness supplies synthetic empty/starter catalogs, more than 50 garments, inactive references, and roles with restricted rate permissions. The HTTP checks cover workspace profile, access, preferences, files, and direct-route authorization. Contract mapping remains as specified in the plan: register totals are authoritative, saved status is active/inactive, and category and measurement counts are absent from register summaries.

Retained baseline screenshots from the optimized test server, using synthetic owner fixtures:

- [Garment desktop, 1440 × 1000](screenshots/ui-foundation-v3/baseline/desktop.png)
- [Garment narrow, 390 × 844](screenshots/ui-foundation-v3/baseline/narrow.png)
- [Catalog desktop](screenshots/ui-foundation-v3/baseline/catalog-desktop.png)
- [Catalog narrow](screenshots/ui-foundation-v3/baseline/catalog-narrow.png)
- [Empty shop and starter setup](screenshots/ui-foundation-v3/baseline/starter-setup.png)

The baseline does not yet include separate workspace-root or restricted-role screenshots. Restricted-role behavior passes the harness. Complete those visual captures when the shared shell and settings destinations are migrated.

## Verification

Baseline logs: `/tmp/fitloom-v3-baseline-build.log` and `/tmp/fitloom-v3-baseline-ui.log`.

The browser suite checks the actual rendered heading size and font, control font, loaded Mono variable, header separation from legacy wrappers, and distinct semantic/legacy muted tokens. All assertions pass.

| Check | Result |
| --- | --- |
| `pnpm lint` | Pass, 163 files |
| `pnpm typecheck` | Pass, all 6 tasks |
| `pnpm build` | Pass, all 4 tasks |
| `MASTER_UI_CHECKS=1 pnpm --filter @fitloom/application test:http` | Pass, real Chrome master checks, HTTP smoke, and 413/408 transport checks |
| `pnpm validate` | Pass, exit 0: 12 database and 146 application tests, lint, types, production build, HTTP/worker/storage checks, and 413/408 transport checks |
| `git diff --check` | Pass |

Post-change logs: `/tmp/fitloom-v3-foundation-build.log`, `/tmp/fitloom-v3-foundation-ui.log`, and `/tmp/fitloom-v3-foundation-validate.log`.

Retained post-change captures use synthetic owner fixtures on the optimized test server:

- [Garment desktop, 1440 × 1000](screenshots/ui-foundation-v3/foundation/desktop.png)
- [Garment editor narrow, 390 × 844](screenshots/ui-foundation-v3/foundation/narrow.png)
- [Catalog desktop](screenshots/ui-foundation-v3/foundation/catalog-desktop.png)
- [Catalog editor narrow](screenshots/ui-foundation-v3/foundation/catalog-narrow.png)
- [Starter setup](screenshots/ui-foundation-v3/foundation/starter-setup.png)

The garment desktop and narrow captures were visually inspected. The desktop shows the new compact header and workspace selector above the retained editor. The narrow capture is scrolled to the editor; automated page-width checks include the header and pass. The full 320/1024 breakpoint and keyboard matrix, separate restricted-role captures, and the shared controls in their future shell/register flows remain pending.

## Remaining work after the foundation slice

At the end of the foundation slice, increment 2 was next. Its implementation and evidence follow below. Registers, six editor steps, readiness Home, and the full responsive/keyboard matrix remain pending. The legacy editor styles are intentionally retained for those increments. No database migration, domain-contract change, dependency change, deployment, or development-database reset is part of this slice.

## Increment 2: shared shell and settings destinations

Implemented and locally verified on 2026-11-02. The scoped layout now renders a single sidebar, topbar, workspace selector, breadcrumbs, skip link, and accessible Base UI mobile sheet. The sidebar is replaced by the menu at 1024px and below. All navigation uses native document links so the existing unload protections also apply to reload and document history traversal.

`workspace-page-context.ts` uses React request-scoped caching for identity, workspace authority, bounded authorized choices, and locale. It does not fetch team, files, or catalog data. Each destination retains server-side workspace and leaf-permission checks. The selected workspace is added to the bounded choice list if absent; the complete authorized selector remains linked. Failed preference writes preserve the selected workspace and local draft and show an error.

The catalog controller registers dirty, uncertain, and mutation-lock state with the shell guard. It retains definitions, pending operation bytes, retry callbacks, concurrency tokens, and command recovery. Beforeunload protection now includes uncertain operations even when the local draft comparison is clean. Returned browser-cache pages reload authorized projections before further interaction.

Delivered route structure:

| Destination | Content |
| --- | --- |
| Workspace root | Transitional overview with actual authorized tool links |
| `/settings` | Settings destinations, current access, personal language preference |
| `/settings/shop` | Existing shop profile, owner contact, and all-location behavior |
| `/settings/access` | Existing team, roles, invitations, location grants, and bounded continuation |
| `/files` | Existing private-file controller, preserving pending upload and retirement keys |
| `/settings/garments` | Existing catalog controller inside shared shell |
| `/settings/garments?kind=service` or `?kind=addon` | Matching initial catalog through the existing service/schema |

The `kind` parameter was brought forward from increment 3 to make shell catalog links useful immediately. `kind` and the allowlisted `focus=search` parameter remain UI-only and never enter master API queries. The search button and Ctrl/Cmd+K focus the current register input or navigate through the guard to its real search input.

The existing profile, preference, and team command forms are extracted into section-specific rendering in `WorkspacePanel`. Those forms and private files retain compatibility styling while their controllers stay intact. Home readiness and the redesigned registers/editor remain later increments.

Verification:

| Check | Result |
| --- | --- |
| `pnpm lint` | Pass, 178 files |
| `pnpm typecheck` | Pass, 6 tasks |
| Final host `pnpm build` | Pass, 4 tasks |
| `pnpm validate` | Pass, exit 0: 12 database and 146 application tests, lint, types, build, HTTP, worker/storage, and transport checks |
| Final `MASTER_UI_CHECKS=1 pnpm --filter @fitloom/application test:http` | Pass, exit 0: Chrome shell, route, catalog, recovery, and role checks, HTTP smoke, and 413/408 transport checks |
| `git diff --check` | Pass |

The extended existing Chrome harness verifies failed and canceled workspace switches, successful switches with the catalog destination retained, mobile focus containment, Escape/focus restoration, canceled sidebar navigation with retained drafts, real register search, and no overflow at 320, 390, 1024, 1025, and 1440px. Native Back and reload are canceled through the actual beforeunload dialog while dirty. Clean Back/Forward navigation and preference/profile writes use actual document navigation and server reads.

A lost-response catalog visibility command is exercised with no dirty draft. It retains beforeunload protection and the uncertain-save exit warning, then replays the exact operation key to recover the committed result. Existing garment/service/add-on history, pricing, starter, conflict, exact-key replay, and schema-only checks still pass. No-master users retain working Overview and Settings pages and receive an unavailable catalog page without catalog navigation. SSR assertions cover the assigned shop/access/files/preferences destinations, anonymous redirects, and omission of owner contact data from catalog HTML.

Logs: `/tmp/fitloom-v3-shell-types.log`, `/tmp/fitloom-v3-shell-final-build.log`, `/tmp/fitloom-v3-shell-final-ui.log`, and `/tmp/fitloom-v3-shell-validate.log`.

Retained synthetic-fixture captures on the optimized test server:

- [Overview](screenshots/ui-foundation-v3/increment-2/overview-desktop.png)
- [Settings hub](screenshots/ui-foundation-v3/increment-2/settings-desktop.png)
- [Shop profile](screenshots/ui-foundation-v3/increment-2/shop-desktop.png)
- [People and access](screenshots/ui-foundation-v3/increment-2/access-desktop.png)
- [Private files](screenshots/ui-foundation-v3/increment-2/files-desktop.png)
- [Desktop shell with failed-switch feedback](screenshots/ui-foundation-v3/increment-2/shell-1440.png)
- [1024px shell](screenshots/ui-foundation-v3/increment-2/shell-1024.png)
- [390px shell](screenshots/ui-foundation-v3/increment-2/shell-390.png)
- [320px shell](screenshots/ui-foundation-v3/increment-2/shell-320.png)
- [Mobile menu](screenshots/ui-foundation-v3/increment-2/mobile-menu.png)
- [Catalog recovery](screenshots/ui-foundation-v3/increment-2/catalog-recovery.png)
- [No-master overview](screenshots/ui-foundation-v3/increment-2/restricted-overview.png)
- [Denied catalog](screenshots/ui-foundation-v3/increment-2/restricted-catalog.png)

Desktop Settings, mobile menu, desktop shell, and 320px shell captures were visually inspected. These checks establish Chrome behavior on synthetic local fixtures. The full visual, zoom, long-content, keyboard, and assistive-technology matrix remains increment 7 work. Existing administrative forms and editor content retain compatibility styling. The redesign remains in progress; increment 3 is the separate catalog-register migration.

## Increment 3: catalog registers

Implemented and locally verified on 2026-11-02.

`MasterRegister` now renders the full-width catalog outside legacy editor styling. Table and cards consume the same bounded page and callbacks for open, lifecycle, ordering, and creation. Garments show name, origin, applicability, permitted base rate, revision, status, and actions. Services omit applicability and rates. Add-ons omit origin, applicability, and standard-visibility filters and show a price only through the permitted projection. No category column, measurement count, saved Draft filter, or inferred activity ordering is added.

`GarmentSettings` retains all draft state, selected saved headers, pending command bytes, retry callbacks, and concurrency tokens. The existing editor and history remain mounted below the register; deliberate open/create actions scroll to the editor. The six-step editor frame remains increment 4 work. View switches retain drafts and do not fetch record details.

Prefix and filter changes reset the offset and refresh after a 250ms delay. Explicit Refresh applies immediately and cancels the queued delayed read. Reads use cancellation, request generations, and a 15-second timeout. Superseded results cannot replace a newer page or report stale failures. Totals and continuation come from the API. Loading, no matches, an empty active/available scope, temporary failure, and access denial have distinct presentations. Failures hide rows rather than displaying zero records as a successful read.

Table and cards reuse the existing lifecycle and ordering commands. A completed ordering action restores focus to the moved record. If that record leaves the current page, a contextual record control provides the focus target and opens its current authorized detail. This preserves filters and the bounded page without scanning for its new position. Destination search and paging remain in the existing move-before dialog.

`StarterLibrary` extracts the installed-bundle status, explicit installation, and standard-visibility controls into preset cards. Collision, no-op, replay, uncertain-result, and known-failure rollback behavior remain in the controller. Schema-only roles receive no register price values or price columns and retain read-only definition/history inspection.

The extended existing Chrome harness now covers:

- Table/card ID parity for garments, services, and add-ons, with no per-record detail requests on view switches.
- Lifecycle changes from cards, ordering beyond the first 50 records, and focus on the moved record when it leaves the page.
- Automatic prefix filtering from a later page, offset reset, explicit refresh, and a delayed older response released after newer results render.
- Distinct 503 and 403 register states, successful retry, and a true no-match state.
- Origin/applicability filters, schema-only card/table inspection, and draft retention while switching views.
- Table overflow contained inside its table wrapper and card layouts at 320, 390, and 1024px.
- The retained shell, dirty/native navigation, history, price precision, inactive reference, starter, conflict, and exact-operation replay scenarios.

The test harness's CLI sandbox does not expose Node's `URL` constructor. A small isolated probe established that limitation; the delayed-read test now parses its query with JavaScript string operations. This required no application change.

Verification: lint checks 181 files, all 6 type-check tasks and 4 build tasks pass, and `pnpm validate` exits 0 with 12 database and 146 application tests plus lint, types, build, HTTP, worker/storage, and 413/408 checks. Local logs are `/tmp/fitloom-v3-register-types.log`, `/tmp/fitloom-v3-register-build.log`, `/tmp/fitloom-v3-register-ui.log`, `/tmp/fitloom-v3-register-final-ui.log`, and `/tmp/fitloom-v3-register-validate.log`.

The final `MASTER_UI_CHECKS=1 pnpm --filter @fitloom/application test:http` exits 0. It includes the additional origin/applicability checks, dirty draft retention across table/card switches, schema-only cards, narrow card captures, and the retained browser/HTTP/transport suite. `git diff --check` passes.

Retained captures from the optimized test server using synthetic owner and schema-only fixtures:

- [Garment table](screenshots/ui-foundation-v3/increment-3/register-table.png)
- [Garment cards](screenshots/ui-foundation-v3/increment-3/register-cards.png)
- [Service cards](screenshots/ui-foundation-v3/increment-3/register-service-cards.png)
- [Add-on cards](screenshots/ui-foundation-v3/increment-3/register-addon-cards.png)
- [320px cards](screenshots/ui-foundation-v3/increment-3/register-cards-320.png)
- [390px cards](screenshots/ui-foundation-v3/increment-3/register-cards-390.png)
- [1024px cards](screenshots/ui-foundation-v3/increment-3/register-cards-1024.png)
- [503 read failure](screenshots/ui-foundation-v3/increment-3/register-503.png)
- [403 read denial](screenshots/ui-foundation-v3/increment-3/register-403.png)
- [No matching garments](screenshots/ui-foundation-v3/increment-3/register-no-matches.png)
- [Schema-only cards](screenshots/ui-foundation-v3/increment-3/register-schema-only-cards.png)
- [Starter setup](screenshots/ui-foundation-v3/increment-3/starter-setup.png)
- [Retained editor integration](screenshots/ui-foundation-v3/increment-3/desktop.png)

The table, narrow cards, read failure, and schema-only captures were visually inspected. Next is increment 4, the editor frame and configuration steps. The complete responsive, keyboard, zoom, long-content, and assistive-technology matrix remains increment 7 work. No API, domain schema, database migration, dependency, deployment, or development-data reset was added.

## Increment 4: garment editor frame and configuration steps

Implemented and locally verified on 2026-11-02.

The garment editor now opens as a dedicated view inside the existing catalog page. Back to garments retains the mounted draft, selected step, rail tab, register filters, and table/card selection. Resume editing restores the editor. Back and catalog search focus the real register input after it becomes visible; opening or resuming the editor focuses its workbench. Cross-page exits, replacing a draft, and Cancel retain their dirty/uncertain protections. The move-before dialog stays outside the hidden editor wrapper so register ordering remains available.

`garment-editor.tsx` owns presentation only. `GarmentSettings` retains definitions, rates, saved headers, operation bytes, retry callbacks, and concurrency tokens. Identity, Measurements, and Construction were extracted into `editor-steps/` using the existing callbacks and helpers. Their panels remain mounted across step changes. The browser compares actual section, field, and construction-group semantic IDs through all six steps and Back/Resume, verifies the rail selection survives, and observes no command writes from navigation.

The editor header shows the current name, actual origin, active state, saved revision, and dirty state. The active checkbox invokes the existing lifecycle command immediately, preserves draft edits, and uses the same read-only condition as the definition form. A separate regression supplies a price-free current projection after the page initially loaded owner permissions and verifies that status and full-save controls remain unavailable.

All five measurement kinds, section assignment, basis, units, precision, bounds, guidance, choices, illustrations, single/multiple construction groups, and add/remove/reorder behavior remain intact. Existing real-browser checks save and read these values through the actual API. Keyboard reordering retains focus; sections containing fields cannot be removed. The shared preview remains disabled and saves no wearer values.

The six-step frame exposes Identity, Measurements, Construction, Services & rates, Add-ons, and Preview & history. One existing eligibility controller is partitioned into services/add-ons views; its discovery state and bindings remain mounted. Preview and saved History share an accessible Base UI tab rail. Step 6 expands the inspection layout. Exact-version reads, historical copy, schema-only inspection, and operation recovery still use the existing controller and pass their retained checks. Full rates/eligibility/history presentation and the service/add-on editor migration remain increment 5 work.

Validation selects the first affected step and focuses its invalid control or the linked error summary. Incompatible bounds preserve the invalid value. The browser verifies the focused invalid control lies below the sticky header and above the save bar. Save uses native form submission with the existing schema validation and retains the definition/request budgets. The rail stacks at narrower widths; header/save controls join normal flow on small screens to avoid covering fields.

Verification:

| Check | Result |
| --- | --- |
| `pnpm lint` | Pass, 186 files |
| `pnpm typecheck` | Pass, 6 tasks |
| `pnpm build` | Pass, 4 tasks |
| `pnpm validate` | Pass, exit 0: 12 database and 146 application tests, lint, types, build, HTTP, worker/storage, and 413/408 checks |
| Real Chrome master suite | Pass, including all six steps, semantic-ID retention, disabled preview, step/rail retention, invalid-field focus, Back/Resume, lifecycle, history, pricing, conflicts, and replay |
| Final schema-only guard refinement | Host lint, types, build, and the complete Chrome/HTTP/transport suite pass again, including the cached-permission/current-projection regression |
| `git diff --check` | Pass |

The responsive checks exercise Identity, Measurements, and Construction at 320, 390, 1024, and 1440px without page overflow. Existing register, shell, role, starter, and native Back/reload checks still pass. These are local Chrome checks; the full zoom, long-content, assistive-technology, and physical mobile-keyboard matrix remains increment 7 work.

Logs: `/tmp/fitloom-v3-editor-types.log`, `/tmp/fitloom-v3-editor-build.log`, `/tmp/fitloom-v3-editor-final-ui.log`, `/tmp/fitloom-v3-editor-readonly-ui.log`, and `/tmp/fitloom-v3-editor-validate.log`.

Retained captures from the optimized test server with synthetic fixtures:

- [Identity](screenshots/ui-foundation-v3/increment-4/editor-identity.png)
- [Measurements](screenshots/ui-foundation-v3/increment-4/editor-measurements.png)
- [Construction](screenshots/ui-foundation-v3/increment-4/editor-construction.png)
- [Services and rates compatibility view](screenshots/ui-foundation-v3/increment-4/editor-services-rates.png)
- [Add-ons compatibility view](screenshots/ui-foundation-v3/increment-4/editor-add-ons.png)
- [Preview and history inspection](screenshots/ui-foundation-v3/increment-4/editor-preview-history.png)
- [1440px editor](screenshots/ui-foundation-v3/increment-4/editor-1440.png)
- [1024px editor](screenshots/ui-foundation-v3/increment-4/editor-1024.png)
- [390px editor](screenshots/ui-foundation-v3/increment-4/editor-390.png)
- [320px editor](screenshots/ui-foundation-v3/increment-4/editor-320.png)
- [Saved editor and preview](screenshots/ui-foundation-v3/increment-4/desktop.png)
- [Narrow saved editor](screenshots/ui-foundation-v3/increment-4/narrow.png)

Measurements, desktop saved editor, and 390px captures were visually inspected. No saved-schema, API, database, dependency, deployment, or development-data reset change is included. Continue with increment 5 before treating the whole editor migration as complete.


## Increment 5: rates, eligibility, history, and recovery

Implemented on 2026-11-02. Runtime acceptance remains open.

Services & rates and Add-ons retain one mounted eligibility controller. The views now show selection limits, retained inactive-reference badges, rate-source hints, and a bounded current-choice retry. Decimal inputs preserve nullable unset values, explicit zero, six fractional places, INR, and service override precedence. Add-on prices remain separate. Inactive saved labels and overrides remain locked and removable.

Service and add-on editors use the preset editor frame, labelled Field controls, a shared save bar, and the same saved-history component as garments. Their register remains available above the editor for lifecycle and ordering commands. The editor focuses when opened. Save/reload retain the original header checks, append-only versions, and command payloads.

`master-history.tsx` presents bounded metadata pages, current/selected revision state, timestamps, and author/location IDs. Exact snapshots now belong to `GarmentSettings` for all three catalogs. Historical garment labels and permitted rates remain separate from current labels and add-on prices. Historical copy continues to use the existing latest-header check, identity regeneration, and current rates/eligibility policy.

`editor-save-bar.tsx` shares dirty state, Save, Cancel, and recovery controls. Garments retain estimated definition bytes and stored/request limits. Preset alerts distinguish validation/read failures, conflict, access loss, and uncertain write results. Read failures retain drafts and pending command bytes. A 403 hides prices and retains an unresolved envelope until reconciliation or deliberate discard.

Refresh access uses the existing scoped workspace read. It updates permissions, clears exact snapshots, hides price-bearing register/eligibility/catalog controls when rate access is absent, and keeps local drafts. Refreshing access during an uncertain operation leaves edits locked and offers the original retry after authority permits it.

Added browser checks compare the entire serialized retry body for garment and service saves, including access refresh during an unresolved service save. New authority scenarios revoke actual test-shop grants while add-on and garment editors are open, check retained dirty names and removed price views, distinguish a 503 history read from an uncertain write, and check 320/390/1024/1440px layouts. These new checks have not completed successfully yet.

Verification so far:

| Check | Result |
| --- | --- |
| `pnpm lint` | Pass, 189 files, no warnings |
| `pnpm typecheck` | Pass, 6 tasks |
| `pnpm build` | Pass, 4 tasks |
| `git diff --check` | Pass |
| `pnpm validate` | Incomplete after interruption; 12 database checks passed, application phase did not finish |
| Chrome/HTTP suite | Stopped before browser scenarios: worker restart did not apply its durable receipt within the existing deadline |

The interrupted validation left `fitloom-tools-run-71f7db8680db` running. Docker control requests subsequently timed out; a stop request was issued for that test container. Confirm it has stopped before rerunning either suite because they share isolated test fixtures. Do not run validation and browser checks concurrently.

Logs: `/tmp/fitloom-increment5-lint.log`, `/tmp/fitloom-increment5-types.log`, `/tmp/fitloom-increment5-build.log`, `/tmp/fitloom-increment5-validate.log`, and `/tmp/fitloom-increment5-ui.log`. No new screenshot is accepted as increment 5 evidence until the browser scenarios pass and the captures are inspected. Earlier screenshots remain intact.

Next: restore responsive local test services, run full validation and the real Chrome suite sequentially, inspect the generated captures, and close increment 5 acceptance before starting Home readiness. No API, saved schema, database migration, dependency, or deployment change is included.


### Follow-up: manual test app available

The local stack is healthy again. A byte comparison confirms that all 39 changed or new web source files match the running web container. The canonical Tailscale HTTPS account page returns 200; existing demo sign-in and the workspace list also return 200. The authenticated garment catalog returns 200 and renders the new Refresh access control and catalog register. This confirms the running app contains the current changes. Full increment 5 runtime acceptance remains pending.

Manual test entry: [Fitloom sign-in](https://nishanths-macbook-pro.tail30fb6a.ts.net:24443/account). After sign-in, select your shop and open Garments. The existing Fitloom Demo catalog is also available at its workspace settings route. No development data was reset for this check.
