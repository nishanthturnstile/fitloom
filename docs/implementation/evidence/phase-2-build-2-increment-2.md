# Build Two increment 2: customer register and navigation

Status: Complete locally. The review fixes, register/navigation, guarded validation, and Chrome regressions pass. This record does not close the full Build Two customer workflow.

## Review and forward migration

The [Increment 0–1 review](../reviews/phase-2-build-2-increments-0-1-review.md) found two P2 defects. Migration 0036 serializes check admission across minute buckets and projects duplicate fingerprints/summaries from one statement snapshot. The prior migrations remain unchanged. The reviewed custom snapshot preserves the current table baseline; the journal now has 37 entries.

The existing customer storage fixture remains nine Node entries including its parent. Its budget scenario adds a deterministic held-mutex assertion. The real-DB fixture passes lifecycle, rollback, stale reviews, duplicate races, replay, actor/scope isolation and current permission checks.

## Register and read-only detail

The Customers route uses the existing authorized customer service within the concrete tenant/location. SSR reads the first bounded page. Client search uses POST JSON, a 250ms debounce, cancellation, generation checks and a 15-second read bound. Search/tag text stays out of page/API URLs. Explicit refresh cancels pending debounce/read work. Failed queries clear the displayed results/count and show an error rather than inventing an empty register.

Status, manual segment and up to five AND tag filters share one result page/count. Default page size is 25. Desktop offers table/cards; narrow screens prioritize cards. Names, formatted phones or No phone, lifecycle state and active/saved wearer totals come from authorized projections. Initials provide the no-photo fallback. No catalog or price permission is required.

Rows open a small authorized read-only profile with page-owned names and a scoped Back link. This keeps Increment 2 navigation usable. Create/edit and lifecycle controls remain in their owning later increments; no dead Add customer or Edit link is exposed. The richer profile/wearer/photo workflows are not claimed complete.

## Shared navigation and private return state

The pure route policy classifies customer path segments, including future new/edit routes, without matching customers-elsewhere. Navigation adds Customers under Work. Breadcrumbs use Home/Customers/Profile without fetching customer names in the shell. The shortcut prefers customer search on Home/general settings, retains contextual catalog search, and uses the existing dirty/uncertain guard.

The switch endpoint accepts a strict destination family, loads current target permissions, saves preferences through the existing command and returns an allowlisted relative destination. Customer detail context resolves to the target register or Home. Catalog retention requires target master access. IDs, search, tags and return context are not copied. Cancel/failure explicitly reset the DOM selector; successful switching clears private return entries. Existing preferences callers keep their original contract.

Versioned sessionStorage descriptors retain only bounded register filters/view/page and a focused-row ID, scoped to principal/tenant/location. Opaque random return tokens expire after 15 minutes, with at most ten entries per tab. Invalid/cross-scope/expired tokens fall back to a fresh register. Login/logout/scope changes clear entries; a non-PII BroadcastChannel signal clears other tabs. No customer record, photo, editable draft or session credential is stored.

## Focused verification

One route-policy contract case checks customer path boundaries, contextual shortcuts, target permissions and rejection of arbitrary destinations. One customer protocol path extends the existing optimized HTTP fixture with 502 seeded rows plus its original customer: 503 total, 502 active. It checks a name/phone beyond row 500, real totals/pagination, literal wildcard characters, AND tags and target authorization. Fixtures are synthetic and isolated to fitloom_test.

The customer browser scenario reuses the existing Chrome session and test server. It checks table/cards, later-page search, archived/segment/tag filters, opaque return restoration/focus, cross-tab clearing, rejected stale responses, HTML read failure/retry, customer-only navigation and safe cross-permission switching. Existing master/workspace scenarios retain failed/canceled switches, dirty and uncertain exits, roles, recovery and private files. No separate browser/server test infrastructure was added.

Guarded validation reports 12 database and 163 application Node entries with no failures, plus lint, types, build and optimized HTTP/worker/storage/operator checks. Logs are `/tmp/fitloom-increment2-validate.log`, `/tmp/fitloom-increment2-final-ui.log`, `/tmp/fitloom-increment2-unit.log`, and `/tmp/fitloom-increment2-review-fixes.log`. The final UI log is the accepted browser run; earlier attempts are diagnostic records, not passing evidence.


## Final acceptance, 2026-11-02

The accepted commands are:

```sh
pnpm validate
MASTER_UI_CHECKS=1 FITLOOM_UI_ARTIFACTS=fitloom-customers-increment2-ui pnpm --filter @fitloom/application test:http
pnpm check
pnpm build
pnpm --filter @fitloom/db db:generate
```

All passed. The generation command reports no schema changes. Node counts include parent entries: 12 database and 163 application. The optional UI command passes the customer scenario and existing master/editor/workspace/authority regressions, followed by the worker, private-storage, operator, outage, and body-limit checks. Forced BroadcastChannel constructor failure also leaves switching usable. The final lint/types/build logs are `/tmp/fitloom-increment2-delivery-check.log` and `/tmp/fitloom-increment2-delivery-build.log`.

The browser scenario found a real restoration defect: focus was consumed before the restored query returned. Focus now waits for the accepted restored page. The repeated run verifies the returned filtered row receives focus. Screenshot deadlines were increased to 30 seconds for full-page captures, and the existing CLI VM uses Playwright's wait helper because it does not expose the global timer function. These harness repairs do not change product behavior.

Inspected synthetic captures show the 502-active-customer table at 1440px and the filtered customer card at 390px with no horizontal overflow:

- [Desktop register](screenshots/customers-register/customers-1440.png)
- [Narrow register with return focus](screenshots/customers-register/customers-390.png)

Chrome keyboard and responsive checks are local acceptance evidence. Safari, screen-reader acceptance, real-device checks, photos, and the 10,000-customer EXPLAIN record are not claimed here. Increment 5 owns complete workflow acceptance. Increment 3 is next.


## Development upgrade

`pnpm db:migrate` exits zero and applies the forward migration to the existing development database. A guarded direct read against `fitloom_dev` confirms 37 retained migrations, zero customers, and zero wearers. The six long-running Compose services remain healthy. No database, volume, credential, customer, or role was reset. The migration log is `/tmp/fitloom-increment2-development-migration.log`.


The live canonical HTTPS check also passes:

```sh
node scripts/verify-customer-foundation-ui.mjs /Users/nishanth/Library/pnpm/global/5/.pnpm/playwright@1.59.0-alpha-1771104257000/node_modules/playwright/index.mjs
```

It signs in with the existing private validation fixture, checks CRM role dependencies without saving a role, opens Home → Find a customer, verifies the Customers document title and search focus, reads the authorized directory, and checks 1440/390px layouts. It signs out its own session and closes Chrome. No customer is created. Log: `/tmp/fitloom-increment2-live-ui.log`. Inspected empty-state captures are [desktop](screenshots/customers-foundation/register-1440.png) and [390px](screenshots/customers-foundation/register-390.png). Synthetic populated-register evidence remains separate above.
