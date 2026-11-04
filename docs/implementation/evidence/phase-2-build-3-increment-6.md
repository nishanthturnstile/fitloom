# Build Three increment 6: revocable staff QR cards

Status: Complete locally on 2026-11-03. Aggregate validation, full and focused Chrome acceptance, schema alignment and development migration pass.

## Stored projection and current authority

Cards contain fixed selections of one to ten exact versions of one wearer, with one to thirty explicit scalar fields per version. Forward migration `0046_measurement_staff_cards` stores an immutable header and append-only selection projections. SQL derives labels, basis, units, typed values and saved choice labels only from immutable version documents. Missing values remain missing, while false and zero remain values. Profile edits and master retirement leave the saved projection unchanged.

The public projection is closed at version 1. It contains the wearer label fixed at issuance, selected profile/schema labels, measured dates, source-kind labels, scalar values and the Verify before cutting warning. Selection positions are human ordinals. It excludes contact data, private notes, free-text source attribution, pricing, photos and raw field/choice identities. Each stored selection has a 256 KiB defensive bound, above the retained source-document limit.

A protected resolver starts from authenticated principal scope and derives shop scope from the stored grant. It checks current reader membership and measurement read, current issuer membership and card-management authority, expiry, revocation and parent/profile lifecycle. Unknown, expired, revoked and inaccessible cards share an unavailable response. Issuers retaining measurement read can revoke their own cards after losing issuance authority. Current card managers can revoke and reissue under their own identity.

Customer, wearer and profile archive triggers permanently revoke affected cards in the archive transaction. Restoration never reactivates them. Header update triggers allow only irreversible, versioned revocation with actor, reason and operation identity. Selection changes and expiry extensions fail even through privileged writes.

Development preflight confirms `fitloom_dev`, 46 applied migrations matching retained SQL, no waiting locks and zero customer, wearer, profile, version, reservation and membership rows. After validation, `pnpm db:migrate` applies `0046_measurement_staff_cards`. Direct readback confirms all 47 retained migration hashes and timestamps match. The resolver, command and lifecycle functions exist. The six prior counts remain zero, and card, selection and admission tables are empty. Development data was not reset or seeded. Migration 0046 is now applied and frozen.

## Routes, QR and management

The existing account page accepts a validated card UUID and constructs the only card-return path. It never accepts an arbitrary return URL. Existing verification and authenticator flows keep that destination. Card pages and PNG endpoints return private no-store and no-referrer headers. The card page is a standalone protected print document with locally rendered CSS and a nonce-protected print action.

The pinned `qr` 0.7.2 encoder renders an SVG locally, with a four-module quiet zone and quartile error correction. The retained Sharp library renders an opaque white PNG. Acceptance decodes the actual PNG. The [upstream source](https://github.com/paulmillr/qr/tree/0.7.2) and [release history](https://github.com/paulmillr/qr/releases/tag/0.7.2) identify the maintained library and its encoder/decoder interfaces.

A card management sheet opens from the wearer book or exact detail. Staff select exact versions and fields, review the authorized projection, set 1–30 expiry days, issue, revoke or reissue. Draft selections and exact uncertain operation envelopes remain in memory under one leave guard. Reissue first revokes the old grant, then issues under the current manager. A failed later step cannot reactivate the old grant.

A shared PostgreSQL admission row allows 30 resolutions per minute per principal, including failed resolutions. The existing HMAC network-admission boundary allows 60 card requests per minute using the configured trusted client-address source. Card IDs do not enter admission keys or new request analytics. Incoming Next.js request logging remains disabled. Browser history, printed links and external proxy logs retain their existing deployment limitations.

## Verification

Focused HTTP and Chrome acceptance pass. The browser checks the complete issue, sign-in, reissue and revoke path. It drops committed responses and verifies exact recovery without creating another grant or repeating a completed reissue step.

| Acceptance | Observed evidence |
| --- | --- |
| M19 fixed projection | PostgreSQL verifies all five value kinds, zero, false, saved choice labels and missing values. Source revision, label changes, master retirement and wearer rename leave the issued projection unchanged |
| M35 saved labels | Standard, custom and select labels, basis and original units come from the exact saved version. Renaming a current custom dimension or master field and retiring the master leave the issued labels and values unchanged |
| M19 current authority | A reader without card or photo management resolves a card. Foreign scope, revoked reader membership, disabled issuer and removed issuer authority deny reads. An issuer retaining measurement read can revoke their own card. Another manager reissues under their own identity |
| M19 lifecycle and expiry | Manual revoke and expiry deny resolution. Customer, wearer and profile archive permanently revoke grants in the archive transaction. Restore never reactivates them |
| M19 QR and print | Tests decode the actual opaque PNG and fetch its exact locator. Chrome loads the protected PNG, executes the nonce-protected print action and hides interactive controls under print media |
| M19 selection bounds | One to ten exact versions and one to thirty explicit fields per version pass. Eleven versions and thirty-one fields fail. More than twenty-five grants use bounded keyset continuation |
| M10 recovery | Chrome drops committed issue and revoke responses, then retries identical envelopes. Reissue resumes its uncertain create step after the old card has been revoked |
| M16 navigation | Canceling a dirty sheet close retains selection. Working or uncertain operations use the existing navigation guard. Closing the sheet returns focus to its registered trigger |
| M24 transport and diagnostics | Real routes verify signed-out redirect, allowlisted account return, JSON authentication, uniform unavailable responses, no-store and no-referrer headers. The final HTTP fixture also checks private HTML/JSON 429 responses with Retry-After. Card pages load no external resources and retain no card values or locator in browser storage |
| M24 admission | Concurrent PostgreSQL requests admit exactly thirty resolutions per principal per minute. Failed resolutions consume the same committed budget. The shared network budget survives service restart and ignores untrusted forwarded-address headers |
| M25 immutability and grants | Direct selection updates/deletes and header rewrites fail. Catalog checks cover forced RLS, absent runtime table grants, empty function search paths and web-only external entry points. Clean, upgrade and repeated migration tests pass |
| M27 widths | Chrome checks management previews and resolved cards at 1440, 1024, 390 and 320 pixels without horizontal overflow, plus the A4 print layout and revoked fallback |

The first focused browser attempts exposed two harness assumptions: the CLI sandbox has no global `URL`, and the account page contains a second email input inside collapsed verification controls. The retained script checks request origins as strings and selects the visible sign-in textbox by accessible role. A first full regression was discarded because a rebuild overlapped its running server. The final run uses a fixed production build. A desktop screenshot paint artifact prompted an additional focused capture. The retained script waits two animation frames after resizing and checks that the document has one main element.

Aggregate validation passes 12 database and 222 application tests. A subsequent focused measurement run passes 29 tests after adding explicit missing-value and custom-label assertions. That run also proves a foreign selection cannot reach another owner's locked profile row. The full Chrome command passes on the final application source, including existing customer, master, measurement, photo, identity, worker, file and operator behavior. The subsequent focused card run passes with the screenshot timing correction and the private HTML/JSON 429 assertions.

| Command or check | Observed result |
| --- | --- |
| `pnpm validate` | Exit 0. 12 database and 222 application tests, lint across 289 files, workspace type checks, production build, HTTP, worker, identity, operator and private-storage regression, plus 413/408 transport checks |
| `pnpm check` and `pnpm build` | Exit 0 on the final application source |
| `pnpm --filter @fitloom/application exec node --env-file-if-exists=../db/.env --test --test-concurrency=1 test/measurement-storage.test.mjs test/measurement-cards.test.mjs` | Exit 0 after guarded test-storage reset. 29 tests pass, including missing values, saved custom labels, foreign-lock isolation and actual PNG decoding |
| `MASTER_UI_CHECKS=1 FITLOOM_UI_ARTIFACTS=fitloom-build3-increment6-final pnpm --filter @fitloom/application test:http` | Exit 0. Complete retained Chrome regression on the final application source, then HTTP/worker and transport checks |
| `MASTER_UI_CHECKS=1 MEASUREMENT_UI_ONLY=1 MEASUREMENT_CARDS_UI_ONLY=1 FITLOOM_UI_ARTIFACTS=fitloom-build3-increment6-focused pnpm --filter @fitloom/application test:http` | Exit 0. Focused card issue, reissue, revoke, exact uncertain recovery, sign-in return, protected PNG, print and responsive layout, followed by HTTP/worker and transport checks |
| `pnpm --filter @fitloom/db db:generate` | No schema changes after the retained snapshot |
| `pnpm db:migrate` and direct readback | Exit 0. All 47 retained hashes and timestamps match. New card tables are empty and existing customer/measurement counts remain unchanged |
| Relative documentation links and `git diff --check` | Passed after final status edits |

The ten inspected captures come from passing full and focused Chrome checks. The refreshed 1440-pixel card capture replaces the screenshot with the paint artifact.

| Width or state | Management preview | Resolved card |
| --- | --- | --- |
| 1440 pixels | [Preview](screenshots/measurements-cards/measurement-card-preview-1440.png) | [Card](screenshots/measurements-cards/measurement-card-1440.png) |
| 1024 pixels | [Preview](screenshots/measurements-cards/measurement-card-preview-1024.png) | [Card](screenshots/measurements-cards/measurement-card-1024.png) |
| 390 pixels | [Preview](screenshots/measurements-cards/measurement-card-preview-390.png) | [Card](screenshots/measurements-cards/measurement-card-390.png) |
| 320 pixels | [Preview](screenshots/measurements-cards/measurement-card-preview-320.png) | [Card](screenshots/measurements-cards/measurement-card-320.png) |
| Print media at A4 dimensions | Not applicable | [Print layout](screenshots/measurements-cards/measurement-card-print-a4.png) |
| Revoked | Not applicable | [Unavailable response](screenshots/measurements-cards/measurement-card-revoked-794.png) |

These checks use synthetic staff and measurement data. Physical QR scanning, Safari, physical printing and screen-reader coverage are not claimed.

## Next scope

Supported imports remain increment 7. Complete phase 2 acceptance and the final capture/media handoff remain increment 8. Cards control subsequent reads. Printed and downloaded copies remain with their holder.
