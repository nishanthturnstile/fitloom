# Build Two Increment 5: private photos and handoff

Status: Complete locally on 2026-11-03. Increments 0–5 close Build Two acceptance. Measurement entry remains Build Three.

## Review repairs

The [Increment 4 review](../reviews/phase-2-build-2-increment-4-review.md) found two distinct P2 defects. Nested wearer preference errors now reach the correct focus target, error link and aria-invalid control. No-op customer/wearer saves announce No changes to save. Both are checked within the existing wearer journey.

## Storage and privacy boundary

Forward migrations 0037–0039 add customer photo bindings and immutable purpose/owner metadata to the retained SQL-owned private_files table. Existing files default to workspace. CRM files retain customer, optional wearer and photo role at staging; an immutable trigger prevents rebinding those fields. Complete scoped customer/wearer/file reference keys, current-binding partial uniqueness, forced RLS and named-function-only grants enforce ownership. The existing command claim's actor/location replay protection includes the three fixed photo commands.

Every retained workspace file path is enumerated in 0037: begin, upload target, prepare, finalize, change, read, list and paginated list. They accept only workspace purpose. CRM routes require current customer and photo permissions and work without generic files.read/manage. Staging belongs to its actor. Writes lock parent, optional wearer, then sorted files; historical photo reads remain allowed after archive under current read authority. New binding/removal is blocked on archived owners.

Replacement retires the old binding/file and attaches the new file in one command transaction after upload finalization. The current photo remains until that succeeds. Removal immediately denies new reads. Repeated current binding/removal is a no-op. Durable results and general audit contain opaque IDs, versions and action names, never the provenance note or image bytes. Safe CRM activity includes photo actions.

Cleanup claims and finish continuation use the same live-workspace-attachment and live-CRM-binding exclusion. The existing worker job/payload and lease/fence are reused. Abandoned and retired CRM objects remain eligible; live bindings survive cleanup. No public bucket, object key or bearer image link is introduced.

## Service and UI

The shared private-image module owns the two-upload bound, bounded JPEG/PNG decoding, orientation normalization, metadata stripping and streamed response headers. Workspace and CRM services keep separate authorized SQL entry points. CRM reads authorize before opening the object and again before returning bytes, with inline disposition, private no-store, nosniff and the restrictive image CSP.

The profile controller remains the single NavigationGuard owner. Customer avatar and wearer face/body controls open a labelled sheet, gated by photo capability. Its editor reports dirty, saving and uncertain state to that owner. Local previews use object URLs revoked on change/unmount. Permission/provenance notes are explicit and bounded. Saved images use direct authenticated requests with Next image optimization disabled. Failed replacements preserve the current image and input. Exact begin/upload/bind/remove steps survive uncertain responses in memory; retry reuses their operation bytes or immutable upload identity. No editable draft, image or session credential enters browser storage.

## Focused evidence

One new real PostgreSQL/SeaweedFS scenario reuses the existing private-file fixture. It verifies generic-purpose bypass denial, same-owner and staged-actor restrictions, actor-bound replay, original metadata removal, no generic-file-grant dependency, lock contention, no-op/replay, replacement/removal, current permission revocation, historical archived reads, and orphan/live-object cleanup. One Chrome photo journey reuses the authenticated browser/server. It exercises keyboard close/discard, local preview, a committed bind with a lost response, failed replacement recovery, removal, mobile layout and independent face/body slots.

## Search plans

The [retained 10,000-customer EXPLAIN/BUFFERS record](customer-search-10000-plans.json) includes actual customer_page calls and the function's verbatim inner SELECT expanded with bound locals. `scripts/verify-customer-search-plans.mjs` uses guarded fitloom_test credentials, serial fixture access, one synthetic scope, and rolls back the 10,000-row seed/ANALYZE transaction. Empty, phone, substring, tag, count-bearing and late-page requests are measured. The initial cold directory call was 4085 ms; exact-phone and substring were 7.7 ms and 5.9 ms. All measured actual calls remained below the 10-second database and 15-second HTTP bounds. No timing assertion or universal performance guarantee is added.

The retained captures use synthetic test customers. The desktop duplicate decision, linked preference error, mobile profile, mobile photo editor and failed replacement were inspected visually:

- [Duplicate decision at 1440px](screenshots/customers-photos/customer-duplicate-1440.png)
- [Preference validation at 1440px](screenshots/customers-photos/wearer-preference-error-1440.png)
- [Profile at 390px](screenshots/customers-photos/customer-profile-390.png)
- [Photo editor at 390px](screenshots/customers-photos/customer-photo-390.png)
- [Failed replacement at 1440px](screenshots/customers-photos/photo-replacement-error-1440.png)

The browser is Google Chrome 156.0.8078.80. Existing register/form/wearer evidence retains the other viewport and keyboard scenarios.

## Measurement build handoff

Build Three receives stable customer/wearer IDs and concrete tenant/location scope. Customers and wearers keep independent names, preferences and archive states. A contact may have no wearer. Explicit wearer selection is required when several are available. New work must join parent and child and require both archivedAt values to be null; historical records retain their original owner IDs. New measurement commands must recheck that predicate under the customer/wearer locks before writing; page flags are advisory.

Profile height/weight preserve original decimal strings and units and are not confirmed cutting measurements. Build Three owns new measurement permissions, date/author/schema-version/value/unit/provenance records, and a price-free garment intake projection. Measuring staff must not need master-management or rate access. Existing immutable garment identities/versions and customer photo ownership are available; photo bytes remain accessible only through the domain service. Order confirmation freezes measurement/design/price snapshots in phase 3. No measurement/order actions, balances or fabricated history are added by Build Two.


## Acceptance matrix ownership

| Behavior | Observed evidence |
| --- | --- |
| Home/register/search/profile/create/edit/return and scoped switching | Existing customer HTTP and Chrome journeys, including >500-row lookup, actual counts, tags, stale reads, opaque return context, keyboard focus, canceled switches and restricted destinations |
| Contact-only and family flow, independent names/preferences, lifecycle and activity continuation | Wearer Chrome journey and retained CRM service/storage fixture; real version conflict, parent lock/archived-create rejection and both continuation directions |
| Duplicate checks, archived matches, update semantics, replay ownership, expiry, limits and rollback | Retained customer storage/service/HTTP fixture plus duplicate Chrome decisions and denied exact-envelope recovery |
| Private photo purpose, same-owner/staged actor, generic bypass, current permissions, normalization and cleanup | New scenario inside the retained real PostgreSQL/SeaweedFS file fixture; legacy file scenarios remain passing |
| Photo preview, lost bind response, failed replacement, remove, mobile, face/body and archived historical reads | Customer photo Chrome journey; keyboard Escape/discard checked in the same sheet |
| No catalog or generic-file permission prerequisite | Customer-only navigation/HTTP fixture and real CRM create/photo replacement with master/file grants removed |
| Shared application behavior | Existing master/editor/workspace/authority Chrome suite and foundation HTTP/worker/private-file/operator/outage/413/408 checks |
| 10,000-row search/count/late-page plans | Retained JSON plans and owning benchmark command; no brittle timing assertion |

Safari, physical mobile devices and VoiceOver are not claimed by the Chrome evidence. Measurement entry, orders, cross-location customer sharing, merges and privacy self-service retain their later owners.


## Final validation corrections

The database/storage check caught an ambiguous wearer-owner column in the new photo function. The new migration was corrected before development application and retested through the guarded clean-upgrade/reapply suite. A final forward migration, 0039, rejects fresh binds after the one-hour upload lifetime or once cleanup-eligible. Committed replay and already-current no-ops remain recoverable. The same storage scenario verifies expired finalized staging is rejected.

The browser harness now uses canonical temp paths for uploaded fixtures and distinguishes the page h1 from the legitimate same-named self wearer. Profile actions stay disabled until client hydration is ready, so an early click after a committed reload cannot be lost. Captures include duplicate decisions, linked preference errors, profile layout and photo failures in addition to the existing responsive coverage.

## Validation commands and limits

Run commands sequentially because they share the guarded test database and private test bucket. The final photo work adds one Node subtest to the existing file fixture and one browser journey to the existing harness. The reported Node totals include parent tests.

| Command | Observed result |
| --- | --- |
| `pnpm validate` | Passed after the final expiry/hydration fixes: 12 database tests, 164 application tests, lint, types, production build and HTTP/worker/operator/storage/transport regressions |
| `pnpm --filter @fitloom/db test` | 12 passed, including clean installation and repeated invocation of all 40 retained migrations |
| `pnpm --filter @fitloom/application exec node --env-file-if-exists=../db/.env --test test/files.test.mjs` | 8 passed, including the CRM photo chain and expired staging rejection |
| `MASTER_UI_CHECKS=1 FITLOOM_UI_ARTIFACTS=fitloom-customers-increment5-ui pnpm --filter @fitloom/application test:http` | Passed customer/register/wearer/photo, garment/catalog/authority/workspace Chrome journeys and existing HTTP, worker, operator, storage and 413/408 checks |
| `node --env-file=packages/db/.env scripts/verify-customer-search-plans.mjs` | Six actual and expanded SQL plans retained for the rolled-back 10,000-row scope |
| `pnpm --filter @fitloom/db db:generate` | No schema changes after migration 0039 |
| `pnpm db:migrate` | Development forward upgrade passed; journal advanced from 37 to 40 migrations |
| `node scripts/verify-customer-foundation-ui.mjs <playwright-module>` | Live development Chrome sign-in, CRM permission dependencies, Home/register/search focus and photo-route availability passed at 1440/390px; no role/customer was saved |
| `pnpm lint`, `node --check scripts/verify-customer-search-plans.mjs`, `git diff --check` | Final delivery checks passed with no lint warnings or formatting errors |

The live check uses an installed Playwright module or the optional module path argument. It reads the local validation account privately and signs out its own browser session. Before/after development counts were customers 0/0, wearers 0/0, private files 8/8 and workspace attachments 5/5. The development database was never reset, and no development customer or photo fixture was created. PostgreSQL, SeaweedFS, both Mailpit services, web and worker were healthy after validation.

An earlier aggregate run failed once during the existing MFA-enrollment test. A fresh host run and a subsequent aggregate run passed without authentication changes. Browser harness corrections and the final hydration/expiry fixes were then rechecked with the complete Chrome journey and focused database/file suites. Safari, VoiceOver and physical devices were not run. Production deployment, backups, legal provenance verification and later measurement/order work are outside this local acceptance.
