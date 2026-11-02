# Garment masters increment 4 evidence

Verified locally on 2026-11-01. This records the garment register, schema editor, preview, and history increment of [Build One](../plans/phase-2-build-1-garment-masters.md). Services/rates/add-on editors, first-use starter controls, and final whole-build acceptance remain increments 5–6.

## Implemented artifacts

| Artifact | Responsibility |
| --- | --- |
| `apps/web/src/app/workspaces/[tenant]/[location]/settings/garments/page.tsx` | Dynamic, session/permission-protected settings page with authorized projections and the existing workspace selector |
| `garment-settings.tsx` in that directory | Bounded register/filter/paging, garment creation/editing, schema save, lifecycle/catalog order, history/copy, dirty navigation, safe errors and uncertain-response retry |
| `editor-controls.tsx` | Typed native section/field/group/choice controls, fresh meaning IDs, labelled errors, and focus-preserving reorder buttons |
| `garment-preview.tsx` | Shared pure-model renderer with guidance/images, required markers, all field/choice variants, and zero-field state |
| Existing workspace panel and `globals.css` | Permission-aware settings link and responsive paper/green layout, with scoped controls and a bounded register/preview pane |
| Browser-safe application helpers | Strict command response envelopes and guidance illustration data in the pure preview model |
| `master-ui-checks.mjs`, `master-ui-browser-checks.mjs` | Real Chrome/UI verification against the optimized app and guarded synthetic test data |

No new database migration, form library, drag library, icon library, or state library is introduced. The retained migration set remains at 34.

## Browser evidence

The browser run uses `MASTER_UI_CHECKS=1 pnpm --filter @fitloom/application test:http` after `pnpm build`, with the existing local `playwright-cli` and Chrome installation. It starts the actual optimized Next.js app, obtains a verified test session through the existing HTTP harness, installs that session into a separate browser context through a temporary private file, and uses real API/SQL operations throughout. The context is closed and temporary cookie/session artifacts are removed afterward.

The synthetic catalog contains more than 50 garments. The checks exercise:

- Next/previous register pages and cross-page move-before/move-to-end through a searched destination dialog.
- Custom garment creation, a zero-field preview, all five field kinds, ordered sections/fields/choices, and both construction selection variants.
- Keyboard activation of a reorder button, focus staying in the moved node, and the persisted schema order.
- Native discard dialogs for app navigation, workspace switching, catalog tabs, Cancel, and conflict reload. Dismissing retains the form; accepting reload replaces it with the saved version.
- Dirty-only unload-handler installation/removal using cancellable DOM events. Native browser/process shutdown protection is not guaranteed or claimed.
- Inline invalid-name errors retaining the entered value.
- A real `garment.save` committed through the server while the browser response is intentionally aborted. Retry uses the same operation key, returns `replayed: true`, and creates no additional revision.
- Exact historical reads, field retirement, local copy without pointer change, and a new field ID when the retired field is copied into a saved version. The old version keeps the old ID.
- Schema edits preserving a nonzero six-place base rate, explicit zero service override, currency, eligible services, and eligible add-ons.
- A concurrent API save followed by a UI conflict that retains local text. Keep editing retains it; explicit reload adopts the saved version and refreshes the stale register metadata.
- Deactivate/restore without changing the content revision.
- Read-only and denied permissions, disabled edit controls, no create/save controls, and absence of configured prices from the read-only page.
- Desktop at 1440×1000 and a 390×844 viewport, including an actual horizontal-overflow check. Screenshots are captured from the running application.

The first browser run exposed ambiguous implicit select labels containing option text. Explicit accessible labels fix the problem. The CLI harness handles native dialogs in separate steps because a pending browser dialog yields its current tool call. Final visual inspection also caught stale register metadata after reloading a remote edit; the load path now refreshes that register snapshot.

## Verification

The final browser run after the register-refresh correction exits 0. The final tools-container `pnpm validate` run also exits 0.

| Command/check | Observed result |
| --- | --- |
| `pnpm build` | All 4 workspace build tasks pass; optimized Next.js route table includes the protected garment settings page |
| `MASTER_UI_CHECKS=1 pnpm --filter @fitloom/application test:http` | Chrome editor/history/copy, register paging/order, lifecycle, keyboard/focus, native discard decisions, lost-response replay, conflicts, read-only/denied roles, and desktop/narrow layout checks pass |
| `pnpm validate`: database suite | 12 reported tests pass; retained set remains 34 migrations, with clean/upgrade/repeat checks |
| `pnpm validate`: application suite | 144 reported tests pass, 0 fail |
| `pnpm validate`: lint/types/build | Biome checks 134 files; all 6 type-check/dependency tasks and all 4 build tasks pass |
| `pnpm validate`: optimized HTTP | Master API/SSR and existing account/workspace/files/operator/worker/outage checks pass; repeated 413 and stalled-stream 408 checks pass |

Browser checks are an additional local run and are not counted as new Node application tests. The default tools-container run does not require the optional host Playwright CLI. Final full output is `/tmp/fitloom-increment4-final-validate.log`; final host build output is `/tmp/fitloom-increment4-build-final.log`.

Local browser output is `/tmp/fitloom-increment4-ui-final.log`. Desktop and narrow screenshots are written under the host temporary directory's `fitloom-increment4-ui/` directory. In this session they are:

- [Desktop capture](/var/folders/62/6b9pc1_s5h19n0zds2k79pn00000gn/T/fitloom-increment4-ui/desktop.png)
- [Narrow capture](/var/folders/62/6b9pc1_s5h19n0zds2k79pn00000gn/T/fitloom-increment4-ui/narrow.png)

## Remaining boundaries

Services and Add-ons are read-only registers here. Their creation/edit/history controls, eligibility/rate editors, visibility settings, and starter setup UI remain increment 5 work. Existing garment saves preserve their complete current rate/binding data; they never substitute empty bindings or hidden-price nulls for an existing definition.

Drafts are kept in browser memory. Discard/refresh prompts do not promise recovery after a browser crash or process termination. The tests run in Chrome on the local desktop; other browser/assistive-technology combinations are not claimed tested.

The full Build One acceptance matrix is not complete. No real shop, wearer values, customer records, order, inventory, uploaded image, or deployment is used to produce UI evidence. The test fixtures and original starter illustrations remain development aids.
