# Build Two Increment 3: customer forms and duplicate decisions

Status: Complete locally. Customer forms and duplicate/recovery behavior pass Chrome acceptance, and the retained regression checks pass.

The [Increment 2 review](../reviews/phase-2-build-2-increment-2-review.md) found no confirmed runtime defect and corrected one stale acceptance paragraph.

## Customer workflow

Home and Customers expose Add customer only with current customer management access. Authorized new/edit routes share one controller. Creation asks for name, country, optional phone with an explicit No phone provided option, and a self-wearer checkbox enabled by default. The existing command creates that wearer atomically. Contact editing preserves independent wearer names and never creates another wearer.

Optional details cover email, address, tax country/GSTIN, manual segment, tags, notes and fit/fabric/design preferences. The shared schemas normalize and validate the intended payload. Errors retain input, expand details, link fields and focus the first invalid field. Tax-country changes explicitly confirm clearing an existing GSTIN. No draft is persisted to browser storage.

A convenience phone check is advisory. Save uses the existing authoritative duplicate protocol. Review shows active/archived candidates, an explicit existing-record exit, Back to edit, and distinct Keep separate or update-phone decisions. Permitted restore uses the existing versioned lifecycle command. Edits invalidate the local review. Expired/stale challenges offer a fresh check with a new key.

The exact serialized request, operation key, expected version and correlation ID remain in memory after network/HTML/malformed/temporary failures. Retry save reuses those bytes. Input is disabled until recovery or an explicit guarded exit. Known conflicts retain input and offer guarded reload. Permission/session denial stops further form requests. Successful saves open the saved profile and announce success.

Create/edit links carry only an opaque scoped return token. The register retains filters, view and page for a subsequent return. A saved profile shows contact, billing, tags, preferences and wearer identities. Richer wearer dialogs, lifecycle management and photos remain with increments 4 and 5.

## Focused verification

The existing optimized-app Chrome journey now covers create with atomic self wearer, edit, lost committed update response followed by identical-envelope retry, stable customer identity, independent wearer name, duplicate Back to edit/Keep separate, and a 390px form capture. It reuses the existing database/server/browser harness. No standalone test suite, additional Node test case, dependency, migration, or development customer seed was added.

Command results and inspected captures are recorded below.


## Validation record, 2026-11-03

The guarded `pnpm validate` run reports 12 database and 163 application entries, including parent entries, all passing. The turn was interrupted during subsequent tooling, so no successful aggregate exit is claimed. Its own leftover tools container was stopped before resuming the remaining checks; development services were retained.

Final-source `pnpm check` and `pnpm build` pass. Logs are `/tmp/fitloom-inc3-accepted-check.log` and `/tmp/fitloom-inc3-accepted-build.log`. Unit results are in `/tmp/fitloom-inc3-validate.log`. Generated-schema verification remains unchanged, with no new migration required.

The accepted browser command is:

```sh
MASTER_UI_CHECKS=1 FITLOOM_UI_ARTIFACTS=fitloom-customers-increment3-ui pnpm --filter @fitloom/application test:http
```

The customer scenario passes with populated synthetic fixtures. It verifies a committed update whose response is aborted, a locked uncertain form, byte-identical retry, the saved edit on the same customer identity, the independent wearer name, duplicate Back to edit and Keep separate, and narrow-screen overflow. The form uses the same guarded native navigation as the retained master/workspace scenarios. Existing backend fixtures retain maximal Unicode, save-time duplicate races, stale versions, permissions, archive/restore and rollback coverage.

Inspected captures are [desktop creation](screenshots/customers-forms/customer-new-1440.png) and [390px editing](screenshots/customers-forms/customer-edit-390.png). These use synthetic test records, not development customer data. Chrome acceptance does not claim Safari, screen-reader or physical-device acceptance. Richer wearer management and photos remain increments 4 and 5.


Final acceptance: the optional Chrome/HTTP command exits zero. Existing garment/editor/workspace/current-authority regressions pass, followed by private-storage/operator/outage/worker checks and stable 413/408 transport outcomes. The worker restart receipt recovered in 2867 ms; drain was observed at 56 ms with stale telemetry recovery in 4146 ms. The accepted log is `/tmp/fitloom-inc3-ui-accepted.log`. The first HTTP attempt failed its server-readiness check during overlapping build work; it is retained at `/tmp/fitloom-inc3-ui.log` as a failed diagnostic attempt. The accepted run started after the build finished.

`pnpm --filter @fitloom/db db:generate` reports no schema changes, recorded at `/tmp/fitloom-inc3-drift.log`. Final lint and `git diff --check` pass. All six development services remain healthy. No development customer was created. Build Two remains incomplete until increments 4 and 5 finish.
