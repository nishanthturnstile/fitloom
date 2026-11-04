# Build Three increment 5: private measurement reference photos

Status: Complete locally on 2026-11-03. Aggregate validation, full and focused Chrome acceptance, schema alignment and development migration pass.

## Traced boundary and implementation sketch

The retained photo services use `private-image.ts` for bounded JPEG/PNG decoding, orientation correction, metadata stripping and a two-upload limit. They prepare immutable content metadata before object writes. `privateImageResponse` authorizes before object access and again before returning bytes. Generic and CRM SQL functions already require their specific file purpose. Measurement photos extend this boundary with a third purpose and a real reservation foreign key.

The reviewed plan selects separate immutable membership rows. Embedding photo IDs in the scalar document would expose them through existing price-free comparison and capture contracts, so media stays in a permission-filtered detail projection. An actor without measurement-photo read receives a restricted projection without IDs or notes. Scalar revisions can retain existing live references without receiving or submitting their IDs. Explicit removal, replacement or additions require measurement-photo management. New independent copies start without membership.

The caller reserves a profile/version intent before upload. `measurement-photo.begin` creates or reuses that one-hour reservation and stages one file, with at most five staged files per reservation. The existing full-page entry controller keeps the intent, upload recovery and dirty state in memory. `measurement.create` or `measurement.revise` locks the reservation after parent, schema and profile locks. It validates all references, inserts the real version and immutable membership, binds fresh files and consumes the reservation in one transaction. Failed saves roll back consumption. Changed schema or stale revision needs a new intent and new uploads.

The photo service owns begin, upload, exact-version bytes and irreversible revoke. `measurement-photo.revoke` requires a reason and works for archived owners. Removal creates a new version and preserves historical access. Revocation keeps membership tombstones but denies bytes everywhere. Cleanup retains every unrevoked historical binding and collects revoked or abandoned files under its existing lease, locks and 24-hour grace. Expired unconsumed reservation metadata remains as a foreign-key tombstone.

`private-image-limits.ts` now owns the shared 5 MiB, 12-million-pixel and two-upload constants. The normalizer, generic/CRM metadata readers and browser controls use those constants. PostgreSQL retains its independent byte constraints. The retained decoder and SeaweedFS backend handle these uploads.

The generated schema snapshot covers reservations and membership. SQL-owned private-file columns, privileged functions, immutable triggers and owner-qualified FKs are added in forward migration `0045_measurement_private_photos`. The development preflight confirms `fitloom_dev`, 45 applied migrations matching retained SQL, no waiting locks and 0/0/0/0 customers, wearers, measurement profiles and versions. After aggregate validation, `pnpm db:migrate` completes. Direct readback confirms all 46 retained migration hashes and timestamps match, the photo read function exists, and customer/wearer/profile/version/reservation/membership counts remain 0/0/0/0/0/0.

## Verification

The focused domain run passes 51 measurement tests. The real storage fixture includes five photo scenarios plus the retained measurement suite. Fixtures use only guarded `fitloom_test` and `fitloom-test` storage.

| Acceptance | Observed evidence |
| --- | --- |
| M17 reservation and ownership | PostgreSQL begins before profile/version creation, keeps consumption null after a failed Save, verifies actor and planned version, rejects expired reservations, preserves exact command replay and binds one membership once |
| M17 bounds | Five real finalized uploads attach successfully. A sixth begin and six-reference Save fail. A direct SQL command independently rejects the oversized membership list |
| M17 normalization and recovery | Real JPEG upload rotates dimensions and removes EXIF/orientation. Changed normalized content conflicts. A storage-write interruption retains prepared identity and succeeds on an exact retry |
| M08/M09 photo authority | Generic workspace and CRM upload/read/prepare/finalize/attach/retire paths reject measurement files. An actor with scalar management sees no photo IDs or notes and can retain live references during a scalar revision |
| M08 current authority | A real object stream opens, the fixture revokes photo permission, and the second authorization check cancels the stream. Photo-bearing Save replay also requires current photo authority |
| M18 history and cleanup | Removing membership creates a new version and leaves old bytes readable. Leased cleanup preserves unrevoked historical binding even for otherwise collectable metadata. Revocation on an archived profile denies every referencing version. Cleanup deletes revoked and abandoned objects while retaining membership tombstones |
| M13 copy | An independent copy receives no photo membership |
| M10/M11 recovery | Chrome drops committed begin, upload, Save and revoke responses. Retries retain the exact envelopes or image bytes, create one saved version and one membership, and recover the revoked state |
| M16 draft protection | Chrome cancels a photo-only exit and retains its selected image. Pending photo work uses the full-page controller's guard. An uncertain Save disables conflicting photo changes |
| M24 HTTP and projections | Real routes check origin, malformed image content, staged-read denial, no-store/nosniff/CSP, restricted detail and SSR, purpose denial, media-free comparison/capture and archived-parent revocation |
| M25 migrations and grants | Clean/upgrade/repeated migrations pass. Catalog checks include both new forced-RLS tables, empty function search paths, web-only external entry points and denied runtime helper execution. Drizzle reports no schema drift |
| M27 UI | Chrome checks 1440/1024/390/320 widths without document overflow. A failed replacement retains the old saved image. Archived historical detail shows a labelled revoked fallback |

The first browser attempt selected the revision file input before hydration enabled it. The retained test now waits for that enabled state. It also waits for actual image decoding before asserting the loaded preview.

The final full Chrome command passes on the final source, including the photo-only leave check, photo-bearing replay authority and uncertain-Save protection. The prior photo-focused command also passes.

The six inspected captures use a solid synthetic JPEG fixture:

- [Draft controls at 1440px](screenshots/measurements-photos/measurement-photos-draft-1440.png)
- [Draft controls at 1024px](screenshots/measurements-photos/measurement-photos-draft-1024.png)
- [Draft controls at 390px](screenshots/measurements-photos/measurement-photos-draft-390.png)
- [Draft controls at 320px](screenshots/measurements-photos/measurement-photos-draft-320.png)
- [Failed upload and exact retry at 320px](screenshots/measurements-photos/measurement-photos-failed-replacement-320.png)
- [Archived revoked-photo fallback at 320px](screenshots/measurements-photos/measurement-photos-revoked-320.png)

Each capture establishes its viewport and scroll position. Real image-load, history and replay assertions accompany them. Safari, physical-device and screen-reader coverage are not claimed.

Aggregate validation passes 12 database and 215 application tests. Development data has not been reset or seeded.

| Final command or check | Observed result |
| --- | --- |
| `pnpm validate` | Exit 0. 12 database and 215 application tests, lint across 276 files, all workspace type checks, production build, customer/master/measurement/photo HTTP checks, auth/operator/private-storage/worker regressions and 413/408 transport checks |
| `MASTER_UI_CHECKS=1 FITLOOM_UI_ARTIFACTS=fitloom-build3-increment5-final pnpm --filter @fitloom/application test:http` | Exit 0 on the final source. Complete retained Chrome regression including photos, scalar entry/revision/rebase, mapping, comparison/charts, current authority and workspace/customer/master journeys, followed by HTTP/worker and transport checks |
| `MASTER_UI_CHECKS=1 MEASUREMENT_UI_ONLY=1 MEASUREMENT_PHOTOS_UI_ONLY=1 FITLOOM_UI_ARTIFACTS=fitloom-build3-increment5-focused pnpm --filter @fitloom/application test:http` | Exit 0. Focused photo recovery, immutable membership, removal/history, archived revoke and responsive image journey. The subsequent full command covers the final permission-replay refinement |
| `pnpm --filter @fitloom/db db:generate` | No schema changes after the retained snapshot |
| `pnpm db:migrate` and direct readback | Exit 0. All 46 retained migration hashes and timestamps match. New reservation and membership tables exist and remain empty with development customer/measurement data |
| Relative documentation file links and `git diff --check` | Passed after final status edits |

## Next scope

QR cards remain increment 6. Imports and complete phase 2 acceptance remain increments 7 and 8. Cards must continue to exclude photos and photo identifiers. Capture membership and later order-selection policy retain their later acceptance gates.
