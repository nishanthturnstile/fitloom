# Build Two Increment 4: wearers and lifecycle

Status: Complete locally. The customer/wearer Chrome journeys and retained validation pass. Build Two still requires Increment 5.

## Review fixes

The [Increment 3 review](../reviews/phase-2-build-2-increment-3-review.md) found three distinct P2 defects: controlled optional text erased typed whitespace, denied replay dropped the unresolved envelope, and advisory denial did not stop form requests. All are fixed, with focused extensions to the existing browser journey.

## Profile and wearer workflow

The authorized profile now has Overview, Wearers and Activity sections. Section navigation is local and makes no mutation. Page-owned names and structural shell breadcrumbs remain unchanged. The server computes today's calendar date in the shop timezone for birthday validation; the service independently validates it on mutation.

A labelled sheet creates or edits a named wearer. Name and optional relationship come first; optional details reveal birthday, self-described gender, original decimal height/weight with units, personal notes and independent fit/fabric/design preferences. Raw drafts stay in memory. Repeated names on the visible page warn without blocking; saved IDs retain identity. No wearer reparenting, automatic merge, inherited contact preferences or measurement snapshot is added.

One profile controller owns wearer/lifecycle edits and the NavigationGuard registration. Escape, close, backdrop, cancel, reload and navigation preserve the dirty/uncertain decision. Saving disables conflicting actions. Uncertain network/HTML/malformed/temporary outcomes retain the exact request bytes. An access-denied retry retains that envelope for explicit recovery. Known conflicts retain input and offer a guarded full reload, including on an unchanged URL/fragment.

Customer and wearer archive/restore use labelled confirmations with expected versions. Customer archive retains individual wearer states, denies further edits and labels zero selectable wearers. Customer restore leaves individually archived wearers archived. Wearer lifecycle changes require an active customer. History remains readable under current read permission.

Wearers and CRM activity use independent 25-row continuation pages, strict schemas, cancellation and 15-second read bounds. Failed reads remove stale results/counts; typed access denial pauses further reads and edits. Activity shows safe field names, actor labels, versions and timestamps rather than contact-value copies. No photos or future operational-history tabs/actions are exposed.

## Focused verification

The existing Chrome harness adds one family journey within its existing authenticated browser and isolated test scope. It covers contact-only creation, zero/one/two wearers, independent preferences and original units, rejected dirty-sheet exit, lifecycle interactions, and real continuation pages. Twenty-four additional synthetic wearers create one extra page for both wearer and activity reads. No new standalone Node test, dependency, database table, migration or development customer is added.

Commands, counts and inspected captures are recorded below. Complete photo/workflow handoff remains Increment 5.


## Verification corrections

The wearer journey found a successful command could remain in Saving when `location.assign` targeted the same profile URL/fragment. The shell guard now exposes an explicit committed reload, and successful wearer/lifecycle commands replace the safe section URL then reload the document under fresh authorization. This avoids relying on fragment navigation to refresh data. A denied profile command also latches read denial, so closing its sheet cannot re-enable mutations before fresh authorization.

The shared CLI browser intercepts native confirm dialogs before page event callbacks can handle them. Guard acceptance/rejection therefore uses the existing harness's temporary `window.confirm` pattern. The duplicate journey explicitly retries a bounded admission-busy result with the same operation. Earlier failed runs remain diagnostics, not acceptance evidence.


The conflict path is exercised with an actual concurrent wearer update. A stale save preserves its draft, explicit reload retrieves the newer version and server preference, and a subsequent edit preserves that independently saved preference. A failed conflict adds no CRM activity. The final family fixture therefore has 33 activity entries, bounded into pages of 25 and 8, and 26 wearers, bounded into pages of 25 and 1. Returning to the first page restores its records.


## Final acceptance, 2026-11-03

```sh
pnpm test:workspace
pnpm check
pnpm build
MASTER_UI_CHECKS=1 FITLOOM_UI_ARTIFACTS=fitloom-customers-increment4-ui pnpm --filter @fitloom/application test:http
pnpm --filter @fitloom/db db:generate
```

The retained unit/storage run passes 12 database and 163 application entries, including Node parent entries. No Node case was added. Logs are `/tmp/fitloom-inc4-tests.log`, `/tmp/fitloom-inc4-delivery-check.log`, and `/tmp/fitloom-inc4-delivery-build.log`. Schema generation reports no changes at `/tmp/fitloom-inc4-drift.log`. The final Chrome/HTTP log is `/tmp/fitloom-inc4-ui-delivery.log`; preceding UI logs are diagnostic attempts.

The customer workflow checks typed optional text, a lost committed update followed by denied and successful byte-identical replay, advisory denial, contact-only creation, family identities, repeated-name warning, raw profile precision/units, independent preferences, real version conflict/reload, individual and parent lifecycle, both directions of wearer/activity continuation, and denial after closing an editor. The existing master/editor/workspace/current-authority scenarios retain shared regression coverage.

Inspected synthetic captures are [desktop wearer sheet](screenshots/customers-wearers/wearer-sheet-1440.png), [390px wearer sheet](screenshots/customers-wearers/wearer-sheet-390.png), and [390px activity](screenshots/customers-wearers/customer-activity-390.png). The modal has its own vertical scroll; full-page captures also include the underlying bounded list. Chrome desktop/narrow acceptance does not claim Safari, screen-reader or physical-device coverage. Complete photo/workflow acceptance remains Increment 5.


The final Chrome/HTTP command exits zero. Customer and family journeys, existing master/editor/workspace/authority checks, HTTP foundation/private-files/operator/outage checks, and stable 413/408 transport outcomes pass. Worker receipt recovery was 2460 ms; drain was 31 ms with stale telemetry recovery in 2457 ms.

The retained customer storage scenario also holds the parent lock, verifies wearer creation returns busy, archives the parent, then verifies the identical child envelope is rejected by the archived-parent rule. The focused rerun passes all nine reported customer-storage entries, including its parent, at `/tmp/fitloom-inc4-locks.log`:

```sh
node --env-file=packages/db/.env --test packages/application/test/customer-storage.test.mjs
```

Final lint and `git diff --check` pass. All six long-running development services remain healthy. No development customer, database, volume or credential was reset.
