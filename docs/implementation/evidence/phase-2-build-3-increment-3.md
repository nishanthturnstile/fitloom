# Build Three increment 3: typed entry and revision

Status: Complete locally on 2026-11-03. Final aggregate validation, full and focused Chrome acceptance, schema alignment and development migration pass.

## Controller and revision ownership

The retained `MeasurementEntry` controller owns creation and revision. The edit route authorizes active entry, loads the current exact measurement, and seeds its schema, custom definitions, original decimal/unit strings, label, measured date, notes and source attribution. Owner identity, profile identity, schema family and expected revision stay fixed. A revision uses `measurement.revise` with a new version ID and the pinned expected revision. It cannot overwrite saved history.

Custom-definition controls are controlled children of the same form. `MeasurementCustomField` supports length, number, text, boolean and select definitions for garment profiles. Body profiles retain the planned restriction to body-basis lengths. Labels, guidance, required state, bounds, precision, text limits and choices can change. Changing kind, length basis or number unit allocates a fresh field identity and clears its entered value. Choice IDs belong to their field and removed choices do not return. Untouched false and zero remain values.

The form compares draft content with its initial content to determine dirtiness. Display-unit changes are separate presentation state. Untouched quantities retain their original decimals and units, and converted presentation uses the pinned field precision with an approximation notice when needed. Existing illustrations and text guidance remain unchanged.

## Schema review and conflicts

A stale-schema response retains the draft. `Review new schema` reads the current schema in the same family under entry authority. `reviewMeasurementSchema` matches exact IDs first, then a unique compatible non-null semantic. It never matches labels or guesses a changed basis. Review rows identify retained, missing, incompatible and source-only fields. New bounds, required fields and choice rules still apply at Save.

The original form remains intact until the user applies the review. Applying makes an unsaved draft, retains custom field IDs and values, attaches custom fields to a valid current section, and keeps notes and measured date. The next save receives a new operation identity. A revision conflict retains local input and offers a separate current-version read or an explicitly confirmed reload. It never silently advances expected revision.

Forward migration `0043_measurement_rebase_read` adds one named, web-only read function. It checks the full owner and entry authority, resolves an active current body or garment reference, and returns only the existing price-free intake contract. It adds no table or Drizzle declaration and changes no retained migration. `/current-intake` uses strict same-origin POST, a closed schema-reference body, private/no-store responses and the existing read deadline.

## Save outcomes, errors and navigation

The client retains bounded server field issues and maps only allowlisted fields or safe form groups to controls. Local and server validation preserve input, link errors with `aria-describedby`, focus the first issue and announce the status. Definition errors expand their controls before focus. Required booleans retain an untouched choice separate from No.

An uncertain revision locks conflicting edits and retries the exact command bytes, expected revision, operation key and version ID. A successful no-op announces that no new version was created. After a committed save, the controller reads the exact saved version before navigating. A failed detail read reports `Saved; details unavailable` and retries only that read. It does not issue a second save.

The full-page controller retains the single `useLeaveProtection` registration. Cancel, ordinary links, search, browser reload/back and workspace switches use the existing shared guard. Definition details stay inside the form and have no separate draft or guard. No editable values, notes or review drafts enter URLs or browser storage.

## Verification

The focused domain run passed 32 measurement contract, draft/rebase and PostgreSQL tests. Final aggregate validation passes 12 database and 196 application tests. Schema generation reports no drift.

| Acceptance | Observed evidence |
| --- | --- |
| M02/M03/M04 | Chrome creates body and garment profiles, saves all five custom kinds with mixed length bases, retains false/zero, validates numeric bounds and original unit spelling, and replaces custom identities on meaning changes |
| M05 | Real garment save changes the schema while a revision is open; stale save retains input, canceled review retains the original, applying review creates no saved version, required new fields block Save, and the eventual saved version pins the reviewed schema |
| M05 body publication | PostgreSQL v2 fixture rejects stale saves, resolves v2 through the new current-intake read and preserves exact v1 documents |
| M06/M07 | No-op announces no new version; committed revision keeps old document bytes; a competing API revision rejects stale local input; a wearer archive between load and save rejects the fresh revision |
| M08/M09 | Measuring-only HTTP reads return price-free current body and garment intake; revoked management rejects rebase while read access remains; revoked read denies all measurement reads |
| M10/M11 | Chrome commits then drops a revision response, verifies two identical envelopes and one new content sequence, then separately fails the post-commit detail read and recovers the exact version without another write |
| M16 | Real native beforeunload prompts appear on reload/back and are dismissed through CLI dialog commands; Cancel, search, canceled/failed switches retain input; successful switch drops owner IDs and returns through the customer destination |
| M24 | A real server date-validation response focuses the date control while retaining notes. Custom bound, definition and duplicate-label errors focus linked controls. At most 30 issues reach the summary |
| M27 | Real Chrome at 1440/1024/390/320 widths, long Tamil labels, visible custom definition controls and no horizontal document overflow. Six synthetic captures are retained below |
| M28 | The shared full Chrome run passes customer/register/wearer/photo, garment/catalog/authority and workspace journeys. A final focused run covers the final controller changes |
| Current revocation | Removing management from an already open revision causes the actual Save to return 403; private input disappears and the leave guard releases |
| M25 | Existing storage checks retain empty privileged search paths. New assertions verify web-only EXECUTE and no PUBLIC grant for the rebase read |

The native navigation commands can time out while the beforeunload dialog awaits a decision. The harness reads actual modal state before accepting that expected result, then explicitly dismisses the dialog and checks that the draft survived. Unexpected errors still fail the run.

The full Chrome command passed before the final denial-guard refinement. The subsequent focused measurement command passed on the final controller, including actual permission revocation. Both use the retained authenticated fixture, server, isolated database and browser environment.

The inspected captures contain only synthetic test records:

- [Custom definitions at 1440px](screenshots/measurements-revision/measurement-custom-1440.png)
- [Custom definitions at 1024px](screenshots/measurements-revision/measurement-custom-1024.png)
- [Custom definitions at 390px](screenshots/measurements-revision/measurement-custom-390.png)
- [Custom definitions at 320px](screenshots/measurements-revision/measurement-custom-320.png)
- [Applied rebase at 320px](screenshots/measurements-revision/measurement-rebase-320.png)
- [Retained conflict draft](screenshots/measurements-revision/measurement-conflict-1440.png)

The captures establish only their viewport and scroll position. They do not show every field or establish assistive-technology coverage.

Development preflight confirmed `fitloom_dev`, 43 applied migrations and no waiting locks. `pnpm db:migrate` completed. A read-only check confirmed all 44 retained hashes/timestamps match, the new function exists, and customers/wearers/measurement profiles/versions remain 0/0/0/0. No development reset or synthetic seed occurred.


| Final command or check | Observed result |
| --- | --- |
| `pnpm validate` | Exit 0: 12 database and 196 application tests, lint across 258 files, all workspace type checks, production build, customer/master/measurement HTTP checks, auth/operator/private-storage/worker regressions and 413/408 transport checks |
| `MASTER_UI_CHECKS=1 FITLOOM_UI_ARTIFACTS=fitloom-measurements-increment3-final pnpm --filter @fitloom/application test:http` | Exit 0: complete retained Chrome regression, including the new revision/custom/rebase journeys, followed by HTTP/worker and transport checks |
| `MASTER_UI_CHECKS=1 MEASUREMENT_UI_ONLY=1 FITLOOM_UI_ARTIFACTS=fitloom-measurements-increment3-final pnpm --filter @fitloom/application test:http` | Exit 0 on the final controller: measurement creation, revision, custom fields, rebase, native navigation, current permission revocation and recovery, followed by HTTP/worker and transport checks |
| `pnpm --filter @fitloom/db db:generate` | No schema changes |
| `pnpm db:migrate` and direct readback | Exit 0; 44 retained migration hashes/timestamps match and development customer/measurement data remains empty |
| Relative documentation file links and `git diff --check` | Passed |

## Remaining scope

Independent copies, cross-profile and body-to-garment mapping with explicit ease, comparisons/charts and lifecycle UI remain increment 4. Private measurement photos, cards, imports and complete phase 2 acceptance remain increments 5–8. No Safari, physical-device or assistive-technology coverage is claimed. The existing illustration guidance still requires operational tailor validation before real cutting.
