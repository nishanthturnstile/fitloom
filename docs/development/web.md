# Fitloom web

This guide covers `apps/web/`. Run project commands from the repository root unless a command specifies another directory.

Next.js App Router application. `/account` provides registration, verified email sign-in, resend, recovery/reset, authenticator enrollment/challenges, backup-code login, and logout. Protected session and operator-admission endpoints use the shared identity service.

Run `pnpm dev` from the repository root. Compose starts web, worker, PostgreSQL, and isolated development/test Mailpit services. Open [Fitloom](https://nishanths-macbook-pro.tail30fb6a.ts.net:24443/account) and [development Mailpit](https://nishanths-macbook-pro.tail30fb6a.ts.net:24444/) from Windows or the Mac. See [local Compose development](../operations/local-development.md) for hot reload and every port.

See [identity and mail configuration](../architecture/authentication.md) for local setup, session/MFA policy, trusted origins, Resend production configuration, and exact verification commands. See [setup and workspace contracts](../architecture/workspaces.md) for `/setup`, authorized shop/location selection, profiles, role administration, and verified staff invitations.

Server configuration and credentials stay in `src/server/` and the shared Node application package. Client components import only browser-safe workspace schemas and types. `WEB_DATABASE_URL` belongs to the web runtime and is separate from `AUTH_DATABASE_URL`. Request logging is disabled because verification and reset URLs carry secret tokens.

[Durable workers and provider inbox](../architecture/jobs-and-inbox.md) documents protected workspace/operator job endpoints and the development-only signed fixture endpoint. Operator access requires an explicit grant and recent MFA; ordinary owners cannot access global service jobs.

Day 6 adds the authorized **Private files** workspace panel, JPEG/PNG staging/attachment/retirement, private download streams, and strict operator tenant/command APIs. [SeaweedFS and operator recovery](../operations/private-files-and-operator-recovery.md) documents limits, authority, replay, and restricted administrative CLI procedures.

Day 7 adds recent-MFA `jobs.manage` status at `/api/operator/status`, safe command/operator diagnostics controlled by `LOG_LEVEL`, and scoped pagination with continuation in workspace/team/file interfaces. [Foundation operations](../operations/foundation-operations.md) defines truthful outage responses and the limits of observation.

## Workspace shell and settings

All `/workspaces/[tenant]/[location]` pages share the scoped layout and request-scoped `workspacePageContext`. The layout loads authorized workspace names, permissions, bounded workspace choices, and locale. Team, file, and catalog data load only at their permitted destinations. The shell and catalog props omit private owner contact data.

The workspace root provides links to the available tools while readiness Home remains pending. `/settings` contains personal preferences and current access. `/settings/shop` retains the shop profile and location controls. `/settings/access` requires `access.manage` and retains people, roles, invitations, and continuation. `/files` requires `files.read` and reuses the private-file controller.

The shared sidebar becomes a menu sheet at 1024px and below. Native document links, workspace switching, and cross-page catalog search use the shell navigation guard. The catalog controller registers dirty and uncertain state while retaining its own operation bytes and recovery callbacks. Browser-cache restores reload current authorized projections. A failed workspace preference mutation retains the current screen and draft.

The catalog page accepts allowlisted UI-only `kind=service`, `kind=addon`, and `focus=search` parameters. The `kind` selection loads the matching initial register; successful in-page tab changes replace the UI URL without moving draft ownership. Ctrl/Cmd+K and the topbar search action focus the actual register input. These parameters never enter the strict master API query. See [v3 implementation evidence](../implementation/evidence/ui-foundation-v3.md) for checks and retained screenshots.

## Master API transport

Build One increment 3 exposes `/api/workspaces/[tenant]/[location]/masters/`. A dynamic route handler matches a fixed set of resources and command actions; it does not accept SQL function names. `src/server/masters.ts` binds the current database-backed identity, the existing development-only workspace admission guard, the web pool, and safe diagnostic observations to `createMasterService`.

| Endpoint suffix | Behavior |
| --- | --- |
| `GET catalog` | Authoritative catalog settings, token, and installed template keys; empty reads do not write |
| `GET garments`, `GET services`, `GET addons` | Structured bounded register page |
| `GET garments/[id]`, `GET services/[id]`, `GET addons/[id]` | Current detail with the permitted projection |
| `GET [resource]/[id]/versions` | Bounded metadata history with optional offset |
| `GET [resource]/[id]/versions/[versionId]` | One exact immutable version |
| `POST commands/[action]` | One of the nine named actions in the [master service contract](application.md#execute-master-commands-and-queries) |

Register query keys are `search`, `active`, `origin`, `applicability`, `visibility`, `offset`, and `limit`. History accepts only `offset`. Catalog and detail endpoints accept no query keys. Unknown and duplicate keys fail validation, and inherited JavaScript names such as `toString` and `constructor` are rejected rather than mistaken for duplicate keys. Next strips a `__proto__` search parameter before the handler, so that name is ignored. Register JSON contains `items`, `total`, `nextOffset`, and `catalogVersion`, rather than the foundation routes' compatibility array headers.

POST JSON is `{ operationKey, correlationId, payload }`. Route parameters select the requested tenant/location, and the session-backed service authorizes that scope. Extra identity or scope keys fail strict parsing. Origin and JSON content-type guards remain shared with workspace mutations. Definition saves and starter installation accept at most 128 KiB for the entire request; other mutations retain 16 KiB. All body reads retain the five-second deadline. Transport overflow returns 413; a valid request whose stored JSONB exceeds 64 KiB returns a bounded definition validation issue with status 400.

The shared mutation helper accepts an explicit `bodyLimit: "master-definition"` option. Its default remains 16 KiB. `safeRoute` adds issues and correlation IDs only for opted-in master routes. Responses remain private/no-store, with access denial 403, validation 400, conflict 409, and temporary unavailability 503. Early body rejections add `Connection: close` so HTTP/1 clients do not reuse a socket containing unread request bytes. A stalled stream returns 408.

The optimized-app smoke suite exercises master creation, initialization/replay, current and exact history, service rename, add-on rates, conflicts, revoked-rate projections, hidden-standard discovery, reorder, origin/scope denial, and both body limits. A separate small HTTP harness repeats oversized requests and stalls a body to check actual 413/408 responses. No master settings page or editor is added in increment 3. See [implementation evidence](../implementation/evidence/phase-2-build-1-increment-3.md).

## Configure garment and service masters

Build One increments 4–5 add the protected dynamic page `/workspaces/[tenant]/[location]/settings/garments`. The workspace links to it only with `masters.read`. The server resolves the current session and workspace authority, then loads the bounded register, catalog header, authorized workspace choices, and locale. Client props contain the selected workspace names/permissions and authorized projections, without private owner contact data.

The settings page has Garments, Services, and Add-ons tabs. All three tabs provide current editing and saved-history views. The garment register supports prefix search, status/origin/applicability/visibility filters, bounded next/previous/first pages, deactivate/restore, and move-before/move-to-end operations. The move-before dialog searches and pages destinations through the API, including hidden/inactive definitions; it does not load the whole catalog into the browser.

UI foundation v3 increment 3 extracts `master-register.tsx` and `starter-library.tsx` from the controller. Registers render preset table/card views above the retained editor. They share authorized page rows and callbacks, and view switching retains the draft without detail requests. Prefix and filter changes reset pagination and refresh after 250ms; explicit Refresh applies immediately. Abort signals, request generations, and read timeouts prevent older reads from replacing current results. Read failures and denials have dedicated retry states instead of empty-success output. Off-page ordering retains a focused record control without changing filters or scanning the catalog. Price columns follow the permitted projection; service and add-on filters remain distinct.

UI foundation v3 increment 4 opens a dedicated in-page garment editor with six steps and a Preview/History rail. Back to garments retains the mounted draft and its selected step and rail; Resume editing restores the editor. The search shortcut returns to the register and focuses its real input without discarding the draft. Cross-page exits and replacement actions still use the existing dirty/uncertain guards.

Identity, Measurements, and Construction live under `editor-steps/` and call the existing definition/identity helpers. Step navigation retains mounted controls, creates no semantic identities, and performs no save. Validation opens the affected step and focuses its invalid control or the error summary. The active-status control saves immediately through `garment.lifecycle`, outside the definition form, and uses the form's read-only guard. The save bar retains byte budgets and existing save/cancel behavior. On narrow screens the preview rail stacks and sticky controls join normal flow to avoid covering inputs. Services & rates and Add-ons use separate views in one mounted eligibility controller. Increment 5 adds rate-source hints, retained-reference badges, current-choice retry, and the shared history/save controls.

The garment editor uses native, labelled controls for identity/guidance, ordered sections, all five field variants, and ordered single/multiple construction groups and choices. Section 1 also exposes the garment's active state: toggling it runs the lifecycle command, updates optimistically, and preserves unsaved schema/rate edits. The save bar shows the estimated definition size against the 64 KiB stored and 128 KiB request limits, and the client pre-checks both definition saves and starter installation before dispatch. Changing kind, basis, semantic identity, number unit, or construction selection meaning allocates fresh IDs. Cosmetic edits retain IDs. Section removal requires moving/removing its fields first. Reorder buttons preserve focus within the moved node and announce its new position.

`garment-preview.tsx` renders the shared pure preview model for unsaved and exact historical definitions. It supplies required markers, guidance, allowlisted original illustrations, label fallbacks, and an explicit zero-dimension state. Controls are disabled and never save wearer values. Historical inspection includes the saved service/add-on labels and permitted garment rates, with no historical add-on amounts or quote total.

Every successful garment Save appends a complete version through `garment.save`. The rate editor distinguishes nullable unset values from explicit zero, uses decimal text with up to six fractional digits, and labels all prices as INR. A service override replaces the garment base rate. Add-on prices remain separate; the editor does not calculate a quote. New garments start with unset rates and empty eligibility. Users without all management/read/rate permissions receive read-only controls and cannot publish.

`eligibility-editor.tsx` searches and pages active available services and add-ons. Existing bindings resolve stable IDs to current labels and permitted add-on prices. Exact garment history retains saved labels and garment rates without current add-on prices. Retired references show a notice and can be removed. Their saved labels and overrides remain locked while an unrelated schema edit carries them forward.

`catalog-editor.tsx` uses the same preset editor frame and save controls as the garment editor. It provides service creation/renaming and add-on creation/name/price editing, saved revisions, bounded history, and explicit reload. All catalogs support deactivate/restore and ordering. Current service/add-on headers are checked against their immutable version IDs before editing, so saves use the current concurrency token. Renaming or repricing a catalog record does not rewrite garment history.

`master-history.tsx` renders bounded revision metadata, the current marker, saved timestamps, author and location IDs, and exact-version inspection controls for all three editors. Exact snapshots, drafts, concurrency tokens, and pending commands remain in `GarmentSettings`. A failed history read keeps local input and does not become an uncertain write.

Refresh access reads the existing scoped workspace endpoint. It updates permissions, clears exact snapshots, and removes cached price controls and values from registers, eligibility, and catalog history when rate access is absent. A 403 also hides prices immediately. Local drafts remain in memory. Access loss and failed reads retain any unresolved command envelope; restoring access offers the same operation for reconciliation.

Library setup installs `tailoring-core-v1` explicitly for a new or existing shop. It reports installation, already-installed no-op, name-collision issues, and operation replay. Existing copies and custom edits are preserved. The two standard-visibility checkboxes update through catalog-version commands; known failures restore the last saved checkbox state. An interrupted request locks further mutations until replay or explicit discard.

Copy from previous version is a local draft operation. It loads the latest header for concurrency, regenerates retired identities using the current schema identity set, records the source version, and preserves current rates/eligibility. It does not move the saved pointer until Save.

App links, workspace switching, catalog tabs, Cancel, and reload/copy decisions use explicit discard prompts while dirty. A `beforeunload` handler is installed while dirty or while an operation outcome is uncertain; browser/process termination remains subject to platform limits. Drafts live in memory and have no server autosave workflow. Validation and conflicts preserve input. Conflicts offer reload or continued local editing. An uncertain network response retains the exact operation key/payload, locks edits, and offers Retry same operation. Retrying a committed-but-lost response returns the original version.

The UI smoke path uses the existing verified-session fixture with `MASTER_UI_CHECKS=1 pnpm --filter @fitloom/application test:http` after `pnpm build`. It requires the available `playwright-cli` executable and an installed Chrome browser; no runtime browser/form/state dependency is added. The harness creates only synthetic `fitloom_test` data, uses an isolated browser context and a temporary private cookie file, and closes it afterward. Normal tools-container validation continues to run SSR/API/transport checks without requiring Playwright. See [increment 4 evidence](../implementation/evidence/phase-2-build-1-increment-4.md) and [increment 5 evidence](../implementation/evidence/phase-2-build-1-increment-5.md) for actual browser and regression results.

Build One's final local acceptance on 2026-11-02 passes the expanded HTTP projection/authority/lifecycle checks and a fresh Chrome run, including incompatible numeric bounds with retained input. Screenshots and the complete acceptance matrix are in [increment 6 evidence](../implementation/evidence/phase-2-build-1-increment-6.md). The [saved-schema consumption contract](application.md#consume-saved-garment-schemas) defines the handoff to later measurement entry.


## Workspace Home

The workspace root is Home. With `masters.read`, its server loader composes four bounded existing service reads: garments with limit 5, services and add-ons with limit 1, and catalog status. Active/available totals come from each page's `total`, with shop-wide definition scope. It passes a price-free name/ID list to `WorkspaceHome` and makes no detail/history calls. Rate-review links require `masters.rates.read`. Users without catalog access retain authorized workspace tools; read failures show an unavailable summary instead of zero counts.

The existing `test:http` harness checks rendered Home totals before and after catalog writes and checks restricted-role Home. Its optional Chrome run adds empty and populated Home, larger-than-page counts, document history, and 320/390/720/1024/1440px layouts. Set `FITLOOM_UI_ARTIFACTS` to a directory name under the OS temporary directory to retain a separate screenshot run. See [Build Two baseline evidence](../implementation/evidence/phase-2-build-2-increment-0.md) for actual results and remaining work.

### CRM role dependencies and focused verification

The access form uses the shared changeRolePermission helper. Selecting customer photo management selects customer management, photo read, customer read, and workspace read. Removing a required read removes its dependent selections. It does not select master, financial, or generic file permissions. Server Zod parsing and SQL delegation checks independently enforce the same rules.

Run node scripts/verify-customer-foundation-ui.mjs with an installed Playwright index.mjs path as its argument. The script uses the existing private demo fixture and canonical origin, checks real sign-in, CRM checkbox dependencies, absence of implied catalog access, 1440/390px overflow, and Home. It does not submit a role or create customer records, and closes its browser and session. See [the foundation evidence](../implementation/evidence/phase-2-build-2-increment-1.md) for inspected captures.

The register and customer route are available in Increment 2. Increment 3 adds create/edit controllers and duplicate decisions. Increment 4 adds wearer management and lifecycle; Increment 5 adds private customer and wearer photos. The scoped customer API and save/duplicate-review protocol are available from Increment 1.


### Customer backend boundary

`/api/workspaces/{tenant}/{location}/customers` implements directory GET, private POST search, detail, bounded wearer/activity continuation, advisory duplicate checks, protected review reads and the eight fixed commands. Search/tag values belong in POST JSON, never query strings. Query parsers reject unknown, inherited and duplicate keys. The authorized Customers register and read-only profile now use this boundary.

Customer/wearer create/update commands opt into the 128KiB customer-profile body budget. Other JSON reads/mutations retain 16KiB; master-definition limits remain unchanged. The optional error adapter preserves existing shared-helper callers. Customer responses use the strict customerResponse/error union, private no-store, typed 409 review/busy/conflict outcomes, 401 session expiry, 404 unavailable records, 429 with Retry-After, and 413/408 transport errors. Reviews are projected after the operation commits.

`customer-http-checks.mjs` runs inside the existing optimized-app smoke fixture. It saves a fully populated Unicode customer/self-wearer, retries the operation, reads a typed duplicate response, uses private POST search, and verifies validation/session/body-size errors. The existing master and foundation HTTP scenarios continue to cover shared-helper regressions.


### Customer register and workspace navigation

The Customers page loads an authorized first page and uses POST search for subsequent name/phone/status/segment/tag/page requests. Desktop supports table/cards; narrow screens use cards. Results and totals come from one scoped service page. Debounce, cancellation and generation checks prevent old responses replacing newer filters. Failures remove stale rows/counts and retain the filters for retry. Customer names open an authorized profile. Increment 3 adds permission-aware create/edit actions.

`workspace-route-policy.ts` owns route-family selection, structural breadcrumbs, contextual search and switch requests. Customer detail/new/edit paths remain in the Customers group, with segment boundaries. Home/general settings prefer Customers when permitted; catalog routes retain catalog search. The existing native navigation guard remains the owner of dirty/uncertain exits.

`POST /api/workspaces/switch` accepts workspaceSwitchRequest and returns workspaceSwitchResponse. It resolves current target permissions through workspaceService.view, then saves preferences through the existing command. It accepts destination families, never source record URLs. The browser validates the returned relative destination and target prefix, resets the selector on cancellation/failure, and clears return state on success. `/api/preferences` retains its existing contract.

Customer return descriptors store only bounded filters, view, offset and focused-row identity under a versioned sessionStorage namespace. Principal/scope matching, 15-minute expiry, a ten-entry cap and strict parsing guard reads. An opaque UUID token connects register/profile/back URLs. A shared non-PII context-clear signal handles login, logout and successful switching across tabs. Storage/channel failures degrade safely and do not block authentication or navigation. Profile names remain in the authorized page header, not the shell or browser storage.

See [Increment 2 evidence](../implementation/evidence/phase-2-build-2-increment-2.md) for review fixes, retained captures, commands, counts and sequencing limits.


### Customer create/edit

`/workspaces/{tenant}/{location}/customers/new` and `/customers/{id}/edit` require current `customers.manage` and share `customer-form.tsx`. The controller uses the browser-safe customer/phone schemas, optional sections, atomic self-wearer intent, private advisory POST checks and authoritative command responses. Customer and wearer names stay independent after creation.

A lost or malformed save response retains the exact serialized envelope in memory. Retry save sends the same bytes. Duplicate decisions and corrected known validation failures use new operation keys. Version conflict offers guarded reload; permission/session denial blocks further form requests. The existing NavigationGuard owns dirty/uncertain exits. No form draft enters sessionStorage. Successful saves use native navigation to the profile; opaque return tokens retain only register context.


### Wearers, lifecycle and activity

Increment 4 adds the profile's Overview, Wearers and Activity sections. `customer-profile-panel.tsx` owns the single active wearer/lifecycle sheet and its NavigationGuard state. Wearer optional fields preserve raw drafts; schemas validate original decimal strings/units and the shop-local birthday bound. Successful commands perform an explicit guarded document reload of the profile, including when its URL and fragment are already unchanged. Uncertain or denied replay retains its exact envelope for explicit retry.

Customer archive/restore preserves individual wearer archive states. Wearer editing/lifecycle controls require an active parent and current capabilities. Every command independently checks current authority and versions. Both wearer and CRM activity reads use bounded continuation, cancellation and strict response schemas. Access denial pauses further reads and edits; failed lists do not retain a stale count.

The Increment 3 review also repaired per-keystroke trimming in optional customer fields, denial of advisory phone checks, and retained-envelope recovery after access loss. Normalization occurs at submission, and a denied replay retains uncertainty protection.


### Private customer/wearer photos

The profile's Customer photo and wearer Face photo/Body photo controls require `customers.photos.read`. Management requires the separate photo-management dependency chain and an active customer/wearer. `customer-photo-editor.tsx` reports protection to the profile controller; it does not register a second editor guard. Local previews are ephemeral object URLs. Saved images use unoptimized authenticated image requests to the scoped inline stream, preserving authorization and no-store behavior.

The photo route family is `/api/workspaces/{tenant}/{location}/customers/photos`: POST `slot` reads a strict owner body; POST `commands/begin`, `commands/bind`, and `commands/remove` use fixed invocation contracts; PUT `uploads/{fileId}` accepts bounded JPEG/PNG; GET `files/{fileId}` rechecks current photo authority. No caller chooses a generic permission/purpose mode. Generic workspace file routes reject CRM files.

The client retains each exact begin/upload/bind/remove step after an uncertain response. Upload retries keep the same file identity/content. A failed replacement retains the saved photo. Successful binding/removal uses the guarded document reload, including an unchanged profile fragment. No customer draft or image enters browser storage. No-op saves use the separate No changes to save announcement; nested wearer preference errors map to their real field controls.
