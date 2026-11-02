# UI foundation v3 implementation plan

Status: In progress. Started on 2026-11-02. The foundation slice and increments 2–4 are locally verified. Increment 5 is implemented with passing host lint, types, and build; runtime acceptance remains open after interrupted validation and a worker receipt failure before the browser suite. Complete increment 5 verification before Home readiness in increment 6. See [implementation evidence](../evidence/ui-foundation-v3.md) for details and verification limits.

Implement the [v3 mockup](../design/ui-foundation-mockup-v3.html) as the working Fitloom workspace, garment register, and editor. Keep the existing garment-master behavior and provide a clear home for the workspace features already built.

Use the [UI foundation](../design/ui-foundation.md) for visual direction, the [Build One plan](phase-2-build-1-garment-masters.md) for business behavior, and the [final acceptance evidence](../evidence/phase-2-build-1-increment-6.md) for regression coverage. Product requirements and existing authorization contracts take precedence over illustrative mockup content.

## 1. Follow this delivery sequence

```text
Baseline and data mapping
          |
          v
Tokens and shared controls -> Workspace shell and settings
                                      |
                                      v
                         Catalog registers and navigation
                                      |
                                      v
                        Six-step editor and saved history
                                      |
                                      v
                           Home readiness and final QA
```

Deliver each increment with its own acceptance checks. Keep the application usable between increments. Complete the migration before starting customers and measurements on the new shell.

## 2. Establish the scope

### Included

- Apply the existing `base-vega` / `mist` preset to the actual workspace pages.
- Build a shared sidebar, topbar, breadcrumbs, workspace switcher, and mobile menu.
- Add a settings hub and retain shop profile, personal preferences, people/access, and private-file workflows.
- Separate the catalog register from the garment editor visually.
- Provide garment table and card views, supported filters, pagination, lifecycle actions, and ordering.
- Apply the same design to service and add-on registers, editors, and history.
- Build the six editor steps, live preview, revision inspection, and sticky save controls.
- Add a home screen backed by available catalog data.
- Verify responsive layouts, keyboard use, access restrictions, dirty navigation, conflicts, and operation replay.
- Refresh browser checks and retain new evidence without replacing the earlier Build One evidence.

### Excluded

- Database migrations, SQL changes, new domain commands, and changes to saved schema formats.
- Customer records, wearer measurement entry, orders, production, inventory, payments, and billing.
- Server draft storage, autosave, offline editing, and draft recovery after browser termination.
- A new authentication design, account-page redesign, or setup-flow redesign.
- A dark-mode switch, custom theme editor, unrestricted uploads, or new illustration system.
- Deployment, infrastructure changes, and production-readiness claims.

New page loaders may compose existing authorized services. They must not add a privileged read path to fill a mockup card. Any new aggregate endpoint or persistent completion field requires a separate scope decision.

## 3. Start from the actual implementation

The preset and component source are installed, but the workspace still uses legacy CSS. The redesign is a UI migration over completed local behavior.

| Existing area | Current implementation | Migration consequence |
| --- | --- | --- |
| Theme | `apps/web/components.json`, `apps/web/src/app/globals.css`, and `apps/web/src/components/ui/` | Reuse the configured Base UI components and Hugeicons. Do not initialize another preset. |
| Fonts | `apps/web/src/app/layout.tsx` loads IBM Plex Sans and Noto Sans | Add IBM Plex Mono for numeric UI. It is present in the mockup but is not loaded by the application root. |
| Workspace page | `apps/web/src/app/workspaces/[tenant]/[location]/page.tsx` and `workspace-panel.tsx` | Move the shared chrome out of the page. Retain profile, preferences, team, and files before replacing the root content with Home. |
| Master settings page | `apps/web/src/app/workspaces/[tenant]/[location]/settings/garments/page.tsx` | Preserve this public URL and its server authorization. Extend its loader for the initially selected catalog. |
| Catalog state and commands | `garment-settings.tsx` in the same directory | Keep one state owner while extracting register and editor views. Do not rebuild the command protocol during the visual migration. |
| Domain controls | `editor-controls.tsx`, `eligibility-editor.tsx`, and `garment-preview.tsx` | Reuse their identity, decimal, binding, preview, and ordering behavior. Replace presentation in small steps. |
| Catalog history and ordering | `catalog-editor.tsx` and `move-before-dialog.tsx` | Preserve current/exact-version distinctions, paged history, destination search, and focus restoration. |
| Server services | `apps/web/src/server/workspaces.ts` and `masters.ts` | Continue resolving identity and scope through these services. Keep Node/database imports out of browser modules. |
| Browser contracts | `packages/application/src/master-contracts.ts` and `garment-definition.ts` | Derive UI types and parse responses with the existing schemas. |
| Acceptance scripts | `packages/application/scripts/master-ui-checks.mjs`, `master-ui-browser-checks.mjs`, and `master-catalog-ui-checks.mjs` | Update selectors and navigation as markup changes. Retain the behavioral assertions. |

The current render path is page loader -> identity -> authorized workspace view -> permitted service reads -> browser-safe props -> client controller. Mutations go through the existing scoped API, strict parsing, command executor, and database authorization. Keep that path intact.

One CSS hazard needs explicit treatment: the legacy `.account-shell, .workspace-shell` rules define `--muted` as a text color. The preset uses `--muted` as a background token. Isolate or rename the legacy variable before rendering preset components inside those wrappers.

## 4. Resolve mockup assumptions before building

Use these defaults for the plan. They are proposed implementation choices, not a record of user approval.

| Question | Planned choice | Acceptance rule |
| --- | --- | --- |
| Mobile navigation | A menu-triggered side sheet at widths of 1024px and below | The sheet has a title, keyboard dismissal, focus containment, and focus restoration. |
| Preview and history | One desktop side rail with Preview and History tabs; stack it below the form at narrow widths | Keep the selected tab and unsaved draft when changing editor steps. Step 6 exposes the full inspection view. |
| Home purpose | Catalog readiness until operational modules exist | Show no order, revenue, production, or customer totals. |
| Rate readiness | A separate recommended action without an automatic completion score | Do not claim that all service rates are complete based on a base rate or one page of garments. |
| Measurement review | A recommended action without persisted completion | Opening Preview must not mark a form reviewed or ready for cutting. |
| Catalog search shortcut | Route to or focus the actual garment-register search | `Ctrl/Cmd+K` must perform a useful action and pass through the navigation guard. A global command palette is outside this pass. |
| Editor URL | Keep the editor inside the existing catalog page for this migration | Avoid introducing routable unsaved drafts or a second draft owner. |
| Future navigation | Show future modules as clearly unavailable text or omit them | Do not create links to unimplemented destinations. |

### Map visible information to available data

The mockup demonstrates appearance and interaction. Several displayed values are not available in current register projections.

| Mockup detail | Available contract | Implementation |
| --- | --- | --- |
| Garment, service, and add-on counts | Register responses have `total` independently of `items.length` | Read bounded pages and use `total`. Label the counts as active, available records under the current visibility settings. |
| Starter/custom counts | `origin` filter and authoritative filtered `total` | Query each displayed total explicitly. Never count origins from only the current page. |
| Draft status/filter | Saved headers have only `active`; drafts are local memory | Use Active, Inactive, and All filters. Display Unsaved only within the editor. |
| Category filter and column | Category exists in full garment definitions, but not register summaries or query keys | Keep category editing in Identity. Use the supported applicability filter in the register. Omit the category column in the first migration. |
| Measurement count in every register row | Full definitions contain fields; register summaries do not | Omit the count from table/card summaries. Show it after opening the editor. Avoid one detail request per row. |
| Saved-revision total across the catalog | Each row has a current revision; history is paged per record | Replace this home tile with starter-library status. Do not sum current revisions or fetch every record's history. |
| Recently edited | Register order is catalog order; register summaries have no edit timestamp | Label this section Garments in your catalog and show the first bounded selection in catalog order. |
| Starter installation | Catalog exposes supported bundle, installed bundle, and template keys | Derive library status from these fields and the shared manifest. Keep installation an explicit action. |
| Shop-wide rates complete | Current projections do not provide a catalog-wide completion aggregate | Offer Review service rates as an action. Show Unset and explicit zero correctly in the editor. |
| Default measurement-unit selector | Length fields have their own `displayUnit`; there is no saved garment-wide default-unit field | Keep field-level unit editing. Do not imply conversion of bounds or wearer measurements through a global selector. |
| INR amounts | Current priced projections use decimal strings and INR | Retain decimal strings through editing and save. Formatting must preserve the distinction between unset and zero. |

If exact category filtering, catalog-wide recent activity, or completion analytics become mandatory, record the required contract work separately before expanding this UI-only plan.

## 5. Define routes and ownership

### Keep current links and add destinations for existing features

Let `W` mean `/workspaces/[tenant]/[location]` in the table below.

| Route | Result | Authority and behavior |
| --- | --- | --- |
| `W` | Home readiness | Any authorized workspace user. Catalog sections require `masters.read`. |
| `W/settings` | Settings hub | Show only applicable destinations. Include personal preferences and current access. |
| `W/settings/shop` | Shop profile and location information | Retain the current profile projection, `workspace.manage` editing, and `locations.all` behavior. |
| `W/settings/access` | People, roles, invitations, and location grants | Retain `access.manage`, current delegation limits, and bounded continuation. |
| `W/settings/garments` | Garment register and editor | Retain `masters.read` and existing write prerequisites. This existing route stays valid. |
| `W/settings/garments?kind=service` | Initially selected Services catalog | Reuse the same controller and existing services API. |
| `W/settings/garments?kind=addon` | Initially selected Add-ons catalog | Reuse the same controller and existing add-ons API. |
| `W/files` | Existing private-file workflow | Retain `files.read`, `files.manage`, pagination, upload retry, and private downloads. |
| `/workspaces`, `/account`, `/setup`, `/invitations/[id]` | Existing entry flows | Preserve behavior and links. These pages are outside the scoped workspace layout. |

The `kind` selector is a page parameter, not a new API query parameter. Parse its allowlisted values in the page loader and load the matching register schema. Keep existing in-page catalog tabs guarded. Do not forward `kind` into the strict master API query.

If the search shortcut needs a focus parameter, treat it as another allowlisted UI-only parameter. It must not become a master API filter.

### Put the shell around page content

The intended caller shape is a workspace layout that renders the shell around its page children. Catalog pages supply their authorized initial data to `GarmentSettings`. Register and editor views consume that controller's state and actions.

```text
Workspace layout
  Workspace shell
    Sidebar / mobile sheet
    Topbar / workspace switcher
    Navigation guard
    Page content
      Home | Settings | Shop | Access | Files | Master settings
                                                   |
                                          GarmentSettings
                                           /           \
                                      Register        Editor
                                                     /     \
                                                Step form  Preview/history
```

Compare two possible designs before implementation:

| Design | Consequence | Decision |
| --- | --- | --- |
| Shared shell with a page-owned catalog controller | Retains command envelopes, dirty drafts, and recovery in one mounted owner while the views change | Use for this migration. |
| Separate routes for every record, step, and history view | Requires URL/draft restoration rules and coordination across controller remounts | Defer until routable editors are a separate requirement. |

Keep draft state, pending operation bytes, retry callbacks, selected saved headers, and concurrency tokens in `GarmentSettings` during extraction. Presentation components must not create their own saved-record copies or issue duplicate mutations.

Use a shell-level navigation guard only to coordinate leaving the active page. The catalog controller supplies its dirty/uncertain state and leave decision. It remains responsible for command recovery. Do not put garment definitions, file contents, team data, or rates into a global workspace store.

### Use these module boundaries

All entries below are proposed files unless described as existing. Paths are relative to `apps/web/src/`.

| Location | Responsibility |
| --- | --- |
| `app/workspaces/[tenant]/[location]/layout.tsx` | Load authorized shell context and wrap workspace pages. Avoid loading team, files, or catalog data for every page. |
| `server/workspace-page-context.ts` | Share request-scoped identity, workspace, choices, and preference loading. No process-wide cache of authorization or private data. |
| `components/workspace/workspace-shell.tsx` | Shell structure and page slot. |
| `components/workspace/workspace-navigation.tsx` | Sidebar/mobile navigation, permission-aware destinations, active states, and future-module labels. |
| `components/workspace/workspace-topbar.tsx` | Breadcrumbs and useful catalog-search action. |
| `components/workspace/workspace-switcher.tsx` | Authorized choices, preference mutation, guarded switching, and failed-switch feedback. |
| `components/workspace/navigation-guard.tsx` | Coordinate app navigation, native unload handling, and controller registration/cleanup. |
| `components/workspace/page-header.tsx` | Repeated workspace heading and action layout. Use existing UI components for alerts, badges, cards, and empty states. |
| `app/workspaces/[tenant]/[location]/settings/page.tsx` | Settings hub, current access, and the existing personal preferences form. |
| `app/workspaces/[tenant]/[location]/settings/shop/` | Shop loader and extracted profile UI. |
| `app/workspaces/[tenant]/[location]/settings/access/` | Access loader and extracted team UI. |
| `app/workspaces/[tenant]/[location]/files/page.tsx` | Authorized initial file page. Reuse the existing `private-files.tsx` controller. |
| Existing `settings/garments/garment-settings.tsx` | Catalog and editor state, commands, recovery, and composing child views. |
| `settings/garments/master-register.tsx` | Search/filter controls, table/card presentations, pagination, and row actions. |
| `settings/garments/garment-editor.tsx` | Six-step composition, header, side rail, and selected step. |
| `settings/garments/editor-steps/` | Identity, Measurements, Construction, Services & rates, Add-ons, and Preview & history content. Reuse existing domain controls. |
| `settings/garments/editor-save-bar.tsx` | Save, Cancel, dirty state, limits, and recovery actions supplied by the controller. |
| `settings/garments/revision-history.tsx` | Metadata history, exact-version selection, pagination, and guarded copy/reload actions. |
| `settings/garments/starter-library.tsx` | Starter status, install action, visibility controls, and installation outcomes. |
| `app/workspaces/[tenant]/[location]/home-readiness.tsx` | Render the authorized home data and recommended actions. Keep interactive logic small. |
| Existing `components/ui/` | Preset controls. Add only components required by delivered screens. |

Retain `master-client.ts` as the browser response-parsing helper. Retain the existing definition and rate models. Derive register rows from the shared schemas and keep new/saved drafts as discriminated unions. Add no generic CRUD framework or additional form/state dependency for this redesign.

The shell receives only the fields it displays. Do not serialize the full workspace owner contact projection into every shell. Keep sensitive profile fields in their authorized page.

Each page and API still checks current authority. A previously rendered sidebar or long-lived layout is not proof of present access. Clear page-local drafts and cached display data when principal or workspace changes.

## 6. Implement in eight increments

### Increment 0. Capture the baseline and freeze behavior

Dependencies: none.

1. Record the existing working-tree state so the redesign remains distinguishable from the already completed Build One work.
2. Capture the current workspace, garment/service/add-on registers, editor, starter setup, and restricted-role states.
3. Inventory current controls, labels, page sections, permission checks, commands, and navigation prompts against the Build One evidence.
4. Confirm the information mapping in section 4 against the current schemas. Keep unavailable aggregates out of the implementation task list.
5. Run the existing checks before refactoring. Record failures that already exist separately from redesign regressions.
6. Create synthetic fixtures for an empty catalog, installed starters, a catalog larger than one page, inactive references, and roles with different rate permissions.

Acceptance:

- Every existing workspace feature has a destination in the route map.
- The baseline includes both editable and schema-only views.
- Screenshots and logs identify the revision, runtime mode, viewport, and fixture role without retaining credentials.
- No production data, development database reset, or schema change is required.

### Increment 1. Establish tokens, typography, and shared controls

Dependencies: increment 0.

1. Audit `globals.css` for legacy workspace selectors, shared account selectors, raw colors, font overrides, and token-name collisions.
2. Keep account/setup styling scoped while removing legacy overrides from migrated workspace content. Do not delete shared `.account-card` rules while workspace compatibility panels still use them.
3. Use the preset semantic colors, 10px base radius, light sidebar, white cards, green actions, pill badges, and line-tab treatment.
4. Load IBM Plex Mono through the same application font system and map a mono token. Keep Sans for controls and Noto Sans for headings.
5. Inventory installed components before adding anything. The required additions include form fields, accessible sheet/navigation pieces, alert/empty/loading states, and view toggles as needed by the next increment.
6. Read the component documentation for the configured Base UI implementation before composing triggers, selects, overlays, or tabs. Keep Hugeicons consistent and avoid importing a second icon set.
7. Build the repeated page header and use existing Button, Card, Badge, Table, and form components. Use labelled fields, linked descriptions/errors, and native form semantics.

Acceptance:

- A migrated workspace section renders with the intended fonts and tokens without legacy specificity overrides.
- Account, password reset, setup, invitation, and workspace-selection screens retain their behavior and remain readable.
- Invalid, disabled, loading, selected, and keyboard-focus states remain distinguishable.
- No preset reinitialization or broad component overwrite is part of this increment.

### Increment 2. Add the workspace shell and settings destinations

Dependencies: increment 1.

1. Add the scoped workspace layout and request-scoped server context helper. Keep authentication redirects outside broad error catches.
2. Build the sidebar, breadcrumbs, account link, workspace switcher, skip link, and mobile sheet.
3. Define navigation from actual routes and permissions. Show catalog entries only with `masters.read`, access management only with `access.manage`, and files only with `files.read`.
4. Add the settings hub and extract the current shop, personal-preference, current-access, and team sections into their assigned destinations.
5. Add the Files page around the current private-file component. Preserve its pending upload/attach keys, retirement keys, continuation, and download authorization.
6. Keep locale preference persistence and its existing statement that translations follow separately. Do not imply that saving a preference translates the app.
7. Preserve current workspace-choice behavior, including the selected workspace if absent from the initial choices. Retain the link to the complete authorized-workspace selector.
8. Move the current master editor's leave protection into the shared navigation coordination. Cover links, the switcher, search shortcut, mobile menu, and account/workspace exits.
9. Keep native document navigation for cross-page exits until equivalent guarded client navigation is demonstrated. Test Back, Forward, reload, and browser-restored pages explicitly.
10. On a failed workspace preference mutation, retain the current workspace and draft and show a retryable error. Do not navigate optimistically into an unauthorized destination.
11. Update affected SSR and browser assertions to find the same features on their new pages. Keep the workspace root usable until Home replaces its transitional content.

Acceptance:

- Shared chrome appears once on every scoped page, including leaf access/unavailable states where workspace context remains available.
- Direct visits still authorize the target workspace and leaf permission on the server.
- All existing shop/team/file/preferences operations remain reachable and pass their existing assertions.
- Canceling a leave prompt retains the draft, selected workspace, and current screen.
- An uncertain operation has the same leave protection even when the dirty-field comparison alone would be false.
- Mobile-sheet dismissal restores focus and does not erase the draft.
- A user without master access sees a useful workspace and settings page without catalog requests or catalog data.

### Increment 3. Build separate catalog registers

Dependencies: increment 2.

1. Extract register presentation from `garment-settings.tsx` without moving the pending-operation owner.
2. Keep the existing master URL and catalog tabs. Support the allowlisted initial `kind` page parameter so shell and settings links open the intended catalog directly.
3. Build the garment table with name, origin, applicability, permitted base rate, revision, status, and actions. Build a card view from the same rows and actions.
4. Use prefix search and the existing active, origin, applicability, and visibility filters. Explain prefix matching rather than implying unsupported fuzzy or substring search.
5. Reset pagination on filter changes. Use response totals and continuation offsets. Prevent stale, slower requests from replacing newer search results.
6. Keep separate empty states for an empty catalog, no filter matches, access denial, and a failed read. An outage must not display as a zero-item catalog.
7. Preserve deactivate/restore, move before, move to end, and destination search across hidden/inactive records and multiple pages.
8. Add the starter-library panel or dialog with install, already-installed, collision, no-op, replay, and uncertain-response outcomes. Preserve standard-visibility settings and catalog-version checks.
9. Apply the same register treatment to services and add-ons. Keep their supported filters and price projections distinct from garments.
10. Connect `Ctrl/Cmd+K` and the topbar search action to the real register input. Use the navigation guard when another page or dirty editor must be left.

Acceptance:

- Table and card views contain the same authorized items and invoke the same commands.
- Pagination and filters work with more than 50 records without fetching the entire catalog.
- No category filter, saved Draft status, measurement count, or fake recent ordering appears.
- Users without rate access receive no amount values or price controls in either presentation.
- Ordering remains keyboard accessible and restores focus to the moved item.
- Switching catalog, opening another record, or starting a new record respects dirty/uncertain state.

### Increment 4. Build the editor frame and configuration steps

Dependencies: increment 3.

1. Add a dedicated editor view with Back to garments, name, active state, origin, revision, Preview action, step navigation, and save bar.
2. Keep the draft mounted in the controller while changing steps. Step changes do not save, reset fields, or allocate new schema identities.
3. Implement Identity using the existing label, category, applicability, help, icon, and illustration fields. Keep illustration choices within the existing allowlist.
4. Retain the saved garment's active control as an immediate `garment.lifecycle` operation. Explain that status saves immediately. Update the header token while preserving unsaved definition/rate edits, and revert the control on known failure.
5. Implement Measurements with ordered sections and all five field kinds: length, number, text, boolean, and select.
6. Preserve required flags, semantic identities, basis, per-field units, precision, numeric bounds, text limits, guidance, choices, and section assignment.
7. Keep the current identity rules: cosmetic/reorder edits retain IDs; semantic changes allocate fresh IDs; removed IDs cannot be silently reused.
8. Keep keyboard add/remove/reorder operations and their announcements. Preserve focus after a move. Require moving or removing fields before removing their section.
9. Implement Construction with both single and multiple selection groups, ordered options, active states, guidance, and illustrations.
10. Add the Preview/History rail structure. Populate Preview from the current draft through the existing pure preview model.
11. Map validation issues to steps. A failed Save opens the first affected step, exposes an error summary, and focuses an invalid control without clearing input.

Acceptance:

- All existing configuration fields remain editable and save to the same definitions.
- Changing steps preserves the complete draft and field identities.
- Incompatible bounds preserve the invalid input and show the specific inline error.
- Preview handles zero fields and every field/construction variant without accepting wearer values.
- Sticky controls do not cover the focused field, error summary, last measurement row, or mobile keyboard interaction.
- Read-only users can inspect definitions without getting mutation controls.

### Increment 5. Finish rates, eligibility, history, and recovery

Dependencies: increment 4. Complete this increment before treating the editor as migrated.

1. Implement Services & rates and Add-ons as separate steps using the existing eligibility and rate logic.
2. Preserve bounded service/add-on discovery, current labels, active-reference selection, and inactive carry-forward/removal behavior.
3. Retain nullable base rates and overrides, explicit zero, six-place decimal input, INR labels, and override precedence. Keep add-on prices separate from garment rates.
4. Keep retired bindings and their saved overrides locked while unrelated edits carry them forward. Do not turn inactive current references into newly selectable options.
5. Populate History from bounded metadata pages and exact immutable versions. Keep current-label/current-price rendering separate from historical saved labels and permitted historical garment rates.
6. Implement guarded Copy from previous version using the latest header token, the existing identity-regeneration helper, and the current rates/eligibility policy.
7. Preserve service and add-on creation, renaming, lifecycle, pricing, saved history, and explicit reload in the redesigned catalog editor.
8. Keep the save bar's dirty state, estimated definition bytes, stored-definition limit, request-envelope limit, Save, Cancel, and retry/reload actions.
9. Preserve the exact command envelope on an uncertain response, including operation key and serialized payload. Lock conflicting mutations and offer Retry same operation.
10. Distinguish validation, conflict, access loss, temporary read failure, and uncertain write outcomes. Keep the local draft until a deliberate discard or successful replacement.
11. After a successful save, refresh current detail, history, and register through existing reads. Clear pending state only after the controller has reconciled the result.

Acceptance:

- Lost-response replay produces the original saved revision with no extra version.
- Stale saves preserve edits and offer reload/continued resolution without overwriting newer data.
- Revoked permissions prevent further writes and remove price-bearing views after authority is refreshed.
- Schema-only responses remain free of price properties across register, current, exact, and history paths.
- Copying historical content remains a local draft until Save and does not reuse retired identities.
- No screen calculates a quote, saves wearer measurements, or implies that a form is cut-ready.
- All existing garment/service/add-on acceptance scenarios pass on the new editor.

### Increment 6. Replace workspace content with Home readiness

Dependencies: increments 2, 3, and 5. Existing workspace tools must already have working destinations.

1. Replace the transitional root content with the v3 home composition.
2. Load active available garment/service/add-on totals through bounded existing reads. Load only the additional filtered totals that the screen actually displays.
3. Use starter-library status for the fourth summary tile. Keep installation actions inside the established guarded catalog workflow.
4. Show a short Garments in your catalog list from the first catalog page. Use catalog order and summary fields without per-row detail/history requests.
5. Show objectively verifiable catalog facts separately from recommended tasks. Use available garment/service totals for presence checks. Leave form review and rate review as actions without fabricated completion markers.
6. Include optional add-ons without making them a prerequisite for readiness.
7. Keep the customers/measurements panel labelled Next build and later order/production labels consistent with the roadmap. Use no operational sample records as real shop data.
8. If `masters.read` is absent, render workspace information and authorized settings links without querying masters. Show unavailable states for failed reads, not invented zeros or completion percentages.
9. Check request count and returned data size. Do not scan the full catalog to produce home cards or make shell navigation depend on successful catalog queries.

Acceptance:

- Counts match the total for the displayed scope, including catalogs larger than one page and hidden standards.
- Empty, partially configured, installed-starter, and restricted-role shops show truthful states.
- Home has no saved-revision aggregate, misleading Recently edited label, or inferred global rate-completion score.
- Every enabled CTA opens an implemented, authorized destination.
- Saving catalog changes and returning Home refreshes the displayed facts.

### Increment 7. Complete visual QA and retire workspace legacy CSS

Dependencies: increment 6 and passing focused behavior checks from earlier increments.

1. Compare actual running screens with v3 at 1440px, 1024px, and 390px. Also inspect just above/below navigation and editor breakpoints, plus a narrow 320px layout.
2. Inspect Home, settings hub, files, shop/access forms, each register, every editor step, preview/history, and key overlays.
3. Check long names, Tamil text, empty lists, many sections/options, long decimals, inline errors, conflicting edits, and unavailable services.
4. Run keyboard navigation across sidebar, sheet, filters, tables, dialogs, editor steps, reorder controls, and save/retry actions.
5. Check labels, landmarks, headings, active states, error announcements, contrast, reduced motion, zoom, and focus visibility. Disabled preview controls must remain understandable.
6. Confirm horizontal scrolling stays inside intended table/step containers. Check sticky header/save-bar offsets, content padding, and safe-area handling.
7. Remove legacy workspace/master CSS only after its last consumer migrates. Retain account/setup rules still in use. Replace temporary selector bridges rather than adding another specificity layer.
8. Update browser selectors that depend on legacy classes such as `.master-rows`. Prefer visible roles and labels, retaining behavioral coverage and native-dialog checks.
9. Run final validation, inspect the diff, and retain evidence under a new redesign-specific folder.
10. Update implementation status, design notes, and web-development documentation to describe the delivered routes and any accepted visual differences.

Acceptance:

- The new workspace screens use the preset consistently and match the chosen responsive behavior.
- No known permission, replay, conflict, history, file, or workspace regression remains.
- Every material visual difference from v3 has a recorded contract or accessibility reason.
- Earlier Build One evidence remains intact. Redesign evidence identifies its own fixtures and run.
- The completion record distinguishes local verification from remaining cross-browser, assistive-technology, and real-tailor validation limits.

## 7. Preserve these behaviors through every increment

| Area | Required invariant |
| --- | --- |
| Authorization | Server pages and API calls check current principal, tenant, location, and permissions. Hidden navigation never replaces authorization. |
| Scope | Garment definitions are shop-wide even though workspace selection is location-scoped. Keep that explanation visible in catalog settings. |
| Saving | `garment.save` appends a complete immutable version. Step navigation and preview do not save. |
| Lifecycle | Active-state commands advance header/catalog tokens as specified without rewriting historical definitions or discarding local edits. |
| Concurrency | Use the current expected header/catalog version for each operation. Do not substitute revision numbers for header tokens. |
| Replay | An uncertain write retains its exact original operation key and payload. A new click must not silently generate a new operation. |
| Dirty navigation | App exits, catalog switches, record changes, Cancel, reload, copy, workspace switching, and native unload retain explicit discard decisions. |
| Schema identities | Shared helpers own semantic changes, retired identities, and history-copy behavior. |
| Rates | Unset differs from zero. Decimal strings retain precision. Add-on prices do not become a garment quote. |
| Projections | Price-free responses remain price-free, including hidden tabs, card views, previews, and historical inspection. |
| History | Exact versions use saved content. Current catalog labels/prices must not rewrite historical views. |
| Catalog operations | Starter installation, visibility, ordering, lifecycle, and page totals retain their existing command and token semantics. |
| Files and access | Existing upload/attach/download/retirement, role delegation, invitation, scope, and continuation behavior survives relocation. |
| Failures | Keep denied, validation, conflict, temporary, and uncertain outcomes distinct. Never render an outage as successful empty data. |

## 8. Verify the implementation against real screens

Run focused checks while each area changes. Run the full set at the final gate. These are future acceptance commands, not results from preparing this plan.

```bash
pnpm lint
pnpm typecheck
pnpm build
pnpm validate
MASTER_UI_CHECKS=1 pnpm --filter @fitloom/application test:http
git diff --check
```

`pnpm validate` uses the guarded test environment. The optional UI run uses the existing Chrome/browser-driver setup after a current build. Follow the [local development guide](../../operations/local-development.md) and [web guide](../../development/web.md). Do not reset `fitloom_dev` or remove persistent volumes for the redesign.

Extend the existing scripts rather than starting a parallel acceptance suite:

| Existing check | Preserve and extend |
| --- | --- |
| `master-ui-checks.mjs` | New shell exits, mobile navigation, search shortcut, workspace switching, denied roles, beforeunload installation/cleanup, and uncertain operations. |
| `master-ui-browser-checks.mjs` | Table/card parity, paged filters, six-step retention, all field variants, inline errors, lifecycle, ordering focus, saved history, conflict, and exact-key retry. |
| `master-catalog-ui-checks.mjs` | Service/add-on routes and editors, pricing precision, retired references, visibility, starter collisions/no-op/replay, and read-only screens. |
| `web-smoke.mjs` | Existing workspace SSR, profile/access/files behavior at assigned routes, direct-route denial, account/setup, and worker/storage boundaries. |
| Contract/service/storage tests | Retain unchanged behavior and price-free projections. Add tests only if implementation exposes a concrete uncovered case. |

Use this minimum manual matrix alongside automated checks:

| Scenario | Required observation |
| --- | --- |
| New shop without starters | Truthful empty Home/register and explicit library installation. |
| Established shop with more than 50 records | Correct totals, bounded pages, stable filters, and ordering beyond the first page. |
| Full owner/manager access | All permitted configuration and existing administrative workflows remain available. |
| `masters.read` without rate access | Definitions remain inspectable; price data and full-save controls remain absent. |
| No master access | Home/settings still work; direct catalog access is denied. |
| Permission revoked while editing | Further requests fail truthfully, drafts remain local, and refreshed projections do not retain restricted prices. |
| Competing save or stale catalog token | Edits remain visible and the conflict path offers deliberate recovery. |
| Save committed but response lost | Retry returns the original version with no duplicate effect. |
| Dirty or uncertain editor exit | Cancel leaves the screen and workspace unchanged across every exit control. |
| Native Back/Forward and restored page | Draft-loss behavior is guarded where supported, and returned pages revalidate current authority/data before further actions. |
| Retired service or add-on | Saved references remain understandable and removable without silently changing history. |
| Narrow screen and zoom | No page-level overflow or inaccessible sticky controls; intended table/step scrolling remains usable. |

Capture Home, garment table/cards, service/add-on registers, representative editor steps, preview/history, the settings hub, and the mobile menu. Include error/retry and schema-only evidence, not just the successful owner view.

Store the final record in `docs/implementation/evidence/ui-foundation-v3.md` and screenshots under `docs/implementation/evidence/screenshots/ui-foundation-v3/`. These are proposed output paths. Include command results, actual screen observations, known limits, and links to retained screenshots.

## 9. Keep the migration reviewable and reversible

1. Keep increments in separate logical commits or reviewable diffs. Do not fold the existing Build One changes into a redesign rewrite.
2. Extract behavior before replacing its presentation. Keep a compatibility wrapper while an existing panel still needs legacy styling.
3. Remove duplicate headers and switchers only when their shared replacements work on both workspace and master pages.
4. Keep command helpers and browser contracts stable. A controller extraction that changes recovery semantics needs its own explicit review and checks.
5. If a screen migration fails, restore that increment's presentation while retaining completed, verified work elsewhere. No database rollback should be needed.
6. Do not add a persistent feature flag or parallel old/new app solely for this local migration.

The highest-risk changes are moving navigation away from the draft owner, splitting the large catalog component, replacing native controls, relocating existing workspace panels, and displaying mockup data without authoritative totals. Validate those changes as they land.

## 10. Close the redesign only when these conditions hold

- [x] Shared desktop/mobile shell is present on all scoped workspace pages.
- [x] Shop, current access, preferences, people/roles/invitations, and private files retain working destinations and authority checks.
- [x] Garment, service, and add-on registers retain supported filters, totals, pagination, lifecycle, and ordering.
- [ ] All six garment-editor steps preserve the existing definition, rate, eligibility, and identity rules.
- [ ] Preview, exact history, historical copy, and service/add-on history work through permitted projections.
- [ ] Dirty navigation, uncertain-operation replay, conflict recovery, and permission revocation pass on the actual screens.
- [ ] Home uses real bounded reads and clearly labels recommendations and future modules.
- [ ] Responsive and keyboard checks pass, with visual evidence retained.
- [ ] Lint, types, build, guarded validation, and the optional real-browser master suite pass on the final implementation.
- [ ] Legacy workspace CSS is retired where unused, and entry flows still work.
- [ ] Documentation records the delivered routes, evidence, deviations, and verification limits.

After these conditions pass, plan customers and wearer measurements against the shared shell and stable garment contracts as a separate build.
