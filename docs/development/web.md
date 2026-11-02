# Fitloom web

This guide covers `apps/web/`. Run project commands from the repository root unless a command specifies another directory.

Next.js App Router application. `/account` provides registration, verified email sign-in, resend, recovery/reset, authenticator enrollment/challenges, backup-code login, and logout. Protected session and operator-admission endpoints use the shared identity service.

Run `pnpm dev` from the repository root. Compose starts web, worker, PostgreSQL, and isolated development/test Mailpit services. Open [Fitloom](https://nishanths-macbook-pro.tail30fb6a.ts.net:24443/account) and [development Mailpit](https://nishanths-macbook-pro.tail30fb6a.ts.net:24444/) from Windows or the Mac. See [local Compose development](../operations/local-development.md) for hot reload and every port.

See [identity and mail configuration](../architecture/authentication.md) for local setup, session/MFA policy, trusted origins, Resend production configuration, and exact verification commands. See [setup and workspace contracts](../architecture/workspaces.md) for `/setup`, authorized shop/location selection, profiles, role administration, and verified staff invitations.

Server configuration and credentials stay in `src/server/` and the shared Node application package. Client components import only browser-safe workspace schemas and types. `WEB_DATABASE_URL` belongs to the web runtime and is separate from `AUTH_DATABASE_URL`. Request logging is disabled because verification and reset URLs carry secret tokens.

[Durable workers and provider inbox](../architecture/jobs-and-inbox.md) documents protected workspace/operator job endpoints and the development-only signed fixture endpoint. Operator access requires an explicit grant and recent MFA; ordinary owners cannot access global service jobs.

Day 6 adds the authorized **Private files** workspace panel, JPEG/PNG staging/attachment/retirement, private download streams, and strict operator tenant/command APIs. [SeaweedFS and operator recovery](../operations/private-files-and-operator-recovery.md) documents limits, authority, replay, and restricted administrative CLI procedures.

Day 7 adds recent-MFA `jobs.manage` status at `/api/operator/status`, safe command/operator diagnostics controlled by `LOG_LEVEL`, and scoped pagination with continuation in workspace/team/file interfaces. [Foundation operations](../operations/foundation-operations.md) defines truthful outage responses and the limits of observation.

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

The garment editor uses native, labelled controls for identity/guidance, ordered sections, all five field variants, and ordered single/multiple construction groups and choices. Section 1 also exposes the garment's active state: toggling it runs the lifecycle command, updates optimistically, and preserves unsaved schema/rate edits. The save bar shows the estimated definition size against the 64 KiB stored and 128 KiB request limits, and the client pre-checks both definition saves and starter installation before dispatch. Changing kind, basis, semantic identity, number unit, or construction selection meaning allocates fresh IDs. Cosmetic edits retain IDs. Section removal requires moving/removing its fields first. Reorder buttons preserve focus within the moved node and announce its new position.

`garment-preview.tsx` renders the shared pure preview model for unsaved and exact historical definitions. It supplies required markers, guidance, allowlisted original illustrations, label fallbacks, and an explicit zero-dimension state. Controls are disabled and never save wearer values. Historical inspection includes the saved service/add-on labels and permitted garment rates, with no historical add-on amounts or quote total.

Every successful garment Save appends a complete version through `garment.save`. The rate editor distinguishes nullable unset values from explicit zero, uses decimal text with up to six fractional digits, and labels all prices as INR. A service override replaces the garment base rate. Add-on prices remain separate; the editor does not calculate a quote. New garments start with unset rates and empty eligibility. Users without all management/read/rate permissions receive read-only controls and cannot publish.

`eligibility-editor.tsx` searches and pages active available services and add-ons. Existing bindings resolve stable IDs to current labels and permitted add-on prices. Exact garment history retains saved labels and garment rates without current add-on prices. Retired references show a notice and can be removed. Their saved labels and overrides remain locked while an unrelated schema edit carries them forward.

`catalog-editor.tsx` provides service creation/renaming and add-on creation/name/price editing, saved revisions, bounded history, and explicit reload. All catalogs support deactivate/restore and ordering. Current service/add-on headers are checked against their immutable version IDs before editing, so saves use the current concurrency token. Renaming or repricing a catalog record does not rewrite garment history.

Library setup installs `tailoring-core-v1` explicitly for a new or existing shop. It reports installation, already-installed no-op, name-collision issues, and operation replay. Existing copies and custom edits are preserved. The two standard-visibility checkboxes update through catalog-version commands; known failures restore the last saved checkbox state. An interrupted request locks further mutations until replay or explicit discard.

Copy from previous version is a local draft operation. It loads the latest header for concurrency, regenerates retired identities using the current schema identity set, records the source version, and preserves current rates/eligibility. It does not move the saved pointer until Save.

App links, workspace switching, catalog tabs, Cancel, and reload/copy decisions use explicit discard prompts while dirty. A `beforeunload` handler is installed only while dirty; browser/process termination remains subject to platform limits. Drafts live in memory and have no server autosave workflow. Validation and conflicts preserve input. Conflicts offer reload or continued local editing. An uncertain network response retains the exact operation key/payload, locks edits, and offers Retry same operation. Retrying a committed-but-lost response returns the original version.

The UI smoke path uses the existing verified-session fixture with `MASTER_UI_CHECKS=1 pnpm --filter @fitloom/application test:http` after `pnpm build`. It requires the available `playwright-cli` executable and an installed Chrome browser; no runtime browser/form/state dependency is added. The harness creates only synthetic `fitloom_test` data, uses an isolated browser context and a temporary private cookie file, and closes it afterward. Normal tools-container validation continues to run SSR/API/transport checks without requiring Playwright. See [increment 4 evidence](../implementation/evidence/phase-2-build-1-increment-4.md) and [increment 5 evidence](../implementation/evidence/phase-2-build-1-increment-5.md) for actual browser and regression results.

Build One's final local acceptance on 2026-11-02 passes the expanded HTTP projection/authority/lifecycle checks and a fresh Chrome run, including incompatible numeric bounds with retained input. Screenshots and the complete acceptance matrix are in [increment 6 evidence](../implementation/evidence/phase-2-build-1-increment-6.md). The [saved-schema consumption contract](application.md#consume-saved-garment-schemas) defines the handoff to later measurement entry.
