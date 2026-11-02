# Garment masters increment 5 evidence

Verified locally on 2026-11-01. This records the services, add-ons, rates, eligibility, visibility, and starter setup increment of [Build One](../plans/phase-2-build-1-garment-masters.md). Increment 6 remains the final whole-build acceptance and regression review.

## Implemented artifacts

| Artifact | Responsibility |
| --- | --- |
| `garment-settings.tsx` in the web garment settings directory | Service/add-on commands, lifecycle/order controls, current header/version checks, dirty navigation, conflicts, exact-key retry, visibility, and explicit starter installation |
| `catalog-editor.tsx` | Service creation/renaming, add-on name/price editing, read-only projections, immutable history, reload, and paged history |
| `eligibility-editor.tsx` | Nullable base/override controls, decimal INR input, bounded active-choice search/paging, current labels/prices, retired-reference notices and removal |
| `master-client.ts` | Shared strict response parsing, safe API errors, bounded page projections, resource paths, and decimal display |
| `globals.css` | Responsive catalog editor, eligibility controls, and library setup styles using the existing paper/green design |
| `master-catalog-ui-checks.mjs`, `master-ui-checks.mjs` | Real Chrome checks for catalog configuration, first-use installation, lost-response replay, conflicts, and schema-only roles |

The UI uses the existing application commands and SQL functions. This increment adds no migration, API endpoint, runtime dependency, or onboarding requirement. The retained migration set remains at 34 through `0033_master_page_bounds.sql`.

Garment drafts now include editable rates and eligibility. Dirty detection includes these values, and complete saves preserve the distinction between null and canonical decimal zero. A service override replaces the base rate. Add-on prices remain separate, with no quote total.

Current eligible choices resolve stable IDs to current names and authorized add-on prices. Historical garment views continue to show their saved labels and permitted garment rates, without historical add-on amounts. Inactive bindings can be removed or carried through an unrelated edit with their saved labels and overrides locked. Historical copy continues to preserve the latest saved rates and eligibility.

Service and add-on editing checks the current immutable version against a freshly read register header before selecting the concurrency token. All three registers support lifecycle and ordering operations. Validation, conflict, and access failures preserve local input. Interrupted mutations keep the original envelope for replay and lock further edits.

Library setup exposes an explicit starter install and the two standard-visibility flags. It reports name-collision issues, first installation, already-installed no-op, and recovered operation replay. No-op detection compares catalog tokens because the installation result returns existing as well as newly installed IDs. Visibility controls update immediately and restore their previous state on known failures.

## Browser evidence

The host command is `MASTER_UI_CHECKS=1 pnpm --filter @fitloom/application test:http` after `pnpm build`. It uses the installed Playwright CLI and Chrome against the actual optimized app. The existing guarded `fitloom_test` fixture supplies a verified session through a temporary private cookie file. The harness closes its browser and removes temporary session files afterward.

The increment 4 garment scenarios continue to run, including more than 50 register rows, all field variants, focus/order, dirty navigation, immutable history/copy, conflicts, and role checks. The added scenarios verify:

- Service creation and rename, add-on creation with explicit zero, six-place add-on price editing, and exact historical label/price inspection.
- A committed service save whose response is deliberately aborted. Edits lock, retry uses the same key, and the API returns the original result with `replayed: true`.
- A concurrent service save causing a UI conflict without erasing local text. Explicit reload reads the current header and revision.
- Active eligibility selection through searched API pages, nonzero base rate, explicit zero override, null override fallback, explicit zero base, and null base.
- A service rename and add-on price edit appearing in current garment choices. The exact original garment detail remains byte-for-byte equal after JSON serialization, and historical garment eligibility contains no current add-on amount.
- Retiring both references, locking the inactive override, carrying the references through an unrelated garment edit, and removing them in another version.
- Service/add-on ordering and deactivate/restore, standard visibility persistence, repeated installation, and committed-install response loss followed by same-key replay.
- A separate synthetic shop created through the existing setup API, starting with catalog version zero. A custom `Shirt` blocks installation with a visible collision issue. The catalog token stays unchanged and no starter services are left behind. Renaming the custom record allows installation of three garments and two services with unset rates; the edited custom garment remains at revision 2. Reinstallation is a no-op.
- Read-only service/add-on fields, absent Save/install controls, disabled visibility controls, and absent prices from both current and historical schema-only pages. Missing `masters.read` denies the settings page.
- Desktop and 390-pixel narrow layouts, an actual horizontal-overflow assertion, and no browser runtime errors in the catalog workflow.

The first browser passes exposed a delayed checkbox state and an incorrect assumption that a no-op install returns empty ID arrays. Both were corrected before the final passing run.

## Verification

| Command/check | Observed result |
| --- | --- |
| `pnpm build` | All 4 workspace build tasks pass |
| `pnpm validate`: database | 12 reported tests pass; clean/upgrade/repeat migrations and isolation checks pass |
| `pnpm validate`: application | 144 reported tests pass, 0 fail |
| `pnpm validate`: lint/types/build | Biome checks 138 files; all 6 type/dependency tasks and 4 build tasks pass |
| `pnpm validate`: optimized HTTP | Masters and existing account/workspace/operator/files/worker/outage checks pass; stable 413 and stalled-stream 408 checks pass |
| Host Chrome/UI harness | Garment and catalog scenarios, first-use collision rollback, replay, conflicts, schema-only/denied roles, and responsive checks pass |
| `git diff --check` | Passes |

Browser scenarios are additional checks, not additional Node application test counts. The default tools-container validation does not require the host Playwright CLI.

Local logs are `/tmp/fitloom-increment5-build-final.log`, `/tmp/fitloom-increment5-final-validate.log`, and `/tmp/fitloom-increment5-ui-final.log`. Actual application screenshots are under the host temporary directory's `fitloom-increment5-ui/` directory:

- [Catalog desktop](/var/folders/62/6b9pc1_s5h19n0zds2k79pn00000gn/T/fitloom-increment5-ui/catalog-desktop.png)
- [Catalog narrow](/var/folders/62/6b9pc1_s5h19n0zds2k79pn00000gn/T/fitloom-increment5-ui/catalog-narrow.png)
- [Starter setup](/var/folders/62/6b9pc1_s5h19n0zds2k79pn00000gn/T/fitloom-increment5-ui/starter-setup.png)

## Remaining boundaries

Build One remains in progress until increment 6 completes the acceptance matrix and final regression review. This increment does not implement customers, wearer measurements, order confirmation, inventory, upload changes, or deployment.

Drafts remain in browser memory. Discard/unload prompts do not promise recovery after a browser crash. Chrome desktop and narrow viewport checks do not establish coverage for other browsers or assistive technologies. Verification uses synthetic test data and does not reset or migrate `fitloom_dev`.
