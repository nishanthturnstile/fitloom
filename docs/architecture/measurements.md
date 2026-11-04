# Measurement snapshots and media handoff

The measurement module owns named wearer profiles, immutable content versions, source provenance, private photo membership and staff card grants. Phase 3 consumes an exact scalar capture for its future order snapshot. Current permissions and selection eligibility remain separate from that content.

## Exact scalar capture

`createMeasurementService({ pool, resolveIdentity, observe }).capture(target, selection)` accepts a concrete tenant/location target and `measurementCaptureQuery`: `customerId`, `wearerId`, `profileId`, and a required `versionId`. It never resolves a missing version to the current pointer. The protected GET route is `/api/workspaces/{tenant}/{location}/measurements/{customer}/{wearer}/{profile}/versions/{version}/capture`.

The browser-safe [contracts](../../packages/application/src/measurement-contracts.ts) define the strict response. [The service](../../packages/application/src/measurements.ts) validates the request and output. [Migration 0048](../../packages/db/migrations/0048_measurement_capture_handoff.sql) defines the narrow PostgreSQL projection.

| Response member | Meaning |
| --- | --- |
| `immutable.customerId`, `wearerId`, `profileId`, `versionId` | Exact owner and source identities within the authorized target |
| `immutable.sequence`, `priorVersionId` | Saved content history, independent of the mutable profile revision |
| `immutable.measuredOn`, `recordedAt`, `recordedBy` | Saved measurement date, recording instant and authoritative recording principal UUID |
| `immutable.schemaRef` | Exact body bundle or garment/schema version |
| `immutable.document` | Saved price-free schema, label, standard/custom definitions, original decimals/units, typed values, notes, source attribution and verified provenance |
| `eligibility.effectiveActive` | Customer, wearer and profile are currently active |
| `eligibility.currentVersion` | The selected version is the profile's current content version |
| `eligibility.schemaActive` | The garment remains active; published body bundles remain readable |
| `eligibility.currentSchema` | The selected schema reference equals the current body publication or garment schema version |

The immutable member excludes current staff/customer display labels, profile revision, archive flags, photo identities, private object data, rates, service/add-on configuration, prices and order numbers. Standard and custom labels inside the saved schema remain historical content. Imported provenance contains opaque batch/group IDs; raw source identities remain in protected import maps.

The SQL function reads the exact immutable version directly. It does not derive capture from the broader detail response or query photo/display-label projections. A revision, author rename, schema publication/retirement, profile archive or photo revoke cannot rewrite the scalar capture. Eligibility reflects the same statement's view of current state. All reads still require current measurement read, its dependencies, active principal/membership and the exact tenant/location/customer/wearer tuple. Archived history remains readable with current authority.

## Phase 3 confirmation boundary

The current service is a protected read, not a reservation or an order confirmation. Phase 3 must validate its own command authority and selection policy, acquire the established customer → wearer → schema → profile locks, and call `app.measurement_capture` within the confirmation transaction. A previously fetched eligibility object cannot authorize a later write.

Persist server-produced immutable content and owner-qualified source-version references together with the future order line. Do not accept browser-supplied dimensions as an authoritative capture, choose the current pointer silently, or recompute old cutting instructions from a live profile. A later correction needs the future order-amendment contract. Phase 3 decides pending-measurement and historical/new-selection policy explicitly; the measurement module supplies independent eligibility facts.

No order, pricing, charge, payment, receipt or numbering implementation is added by this handoff. The [phase 3 roadmap](../product/roadmap.md#phase-3-accept-an-order-and-account-for-its-money) owns that work and its real-document policy gate.

## Photo membership and current byte access

Photos stay outside scalar capture. Membership fixes `(tenant, location, customer, wearer, profile, version, file)`, position and caption. The exact detail read exposes `photos: {kind: "available", items: ...}` only with measurement-photo read. Other readers receive `{kind: "restricted"}` without file IDs or captions.

The measurement photo service reads an exact version/file through `/api/workspaces/{tenant}/{location}/measurements/{customer}/{wearer}/{profile}/versions/{version}/photos/{file}`. It authorizes before opening the object and again before returning bytes. Generic workspace or CRM photo access does not grant this purpose. There are no raw object URLs or reusable anonymous byte grants in a scalar capture.

Removing a photo in a new revision leaves historical membership intact. Revocation keeps membership tombstones and blocks new byte reads across all referencing versions, including archived owners. It does not alter scalar content. Independent profile copies receive no membership. Cards contain selected scalar projections and never include photo IDs or grant media access.

Phase 3 must use the exact source version and the separate media service when its future workflow needs reference images. Copying a file ID into another record cannot bypass current photo permission or revocation. Any future independent order-media ownership or retention rule needs an explicit design; this handoff does not silently duplicate blobs.

## Local recovery contract

`pnpm verify:recovery` rehearses a matched PostgreSQL/object restore using only guarded test storage and a disposable clone. It requires quiescent test writers. Snapshot manifests include all application-table counts, exact journal totals, migration hashes, source/lock fingerprints and content digests for the bounded private-object set.

The rehearsal selects workspace and measurement-photo subjects by their actual purpose. It deliberately removes both objects, restores their captured bytes, checks every digest, and reads the restored measurement through the measurement-photo service. It verifies exact scalar capture, foreign-scope and generic-purpose denial, then revokes the photo in the clone and proves that its scalar capture stays unchanged. The source test database is not mutated by the clone checks. No side-effect worker starts on the clone, and successful cleanup drops it and removes restricted artifacts.

This local rehearsal is not external backup scheduling or a production recovery objective. Before real restored access, the external recovery process must also reconcile any privacy suppression/revocation recorded after the captured snapshot. The [retention requirement](../product/requirements.md) and [operating contract](../operations/foundation-operations.md#rehearse-application-restore-locally) retain that responsibility.

## Retained bounds

A saved scalar document is at most 128 KiB, with up to 80 standard and 20 custom fields. A version has at most five photos. Each upload uses the shared 5 MiB, 12-million-pixel and two-concurrent-upload bounds. History and profile reads page at fifty records or fewer.

Supported imports retain their separate 1 MiB/200-row/64 KiB CSV bounds, twenty-member atomic groups, 512 KiB canonical history-group limit, reviewed source mappings and bounded chunks. [The import format reference](../implementation/plans/phase-2-build-3-import-formats.md) defines the grammar. [Final phase 2 evidence](../implementation/evidence/phase-2-build-3-increment-8.md) records the complete acceptance matrix and observed verification limits.

Standard garment length bounds use canonical centimetres from the master schema. Body-field and custom-dimension length bounds use their pinned display unit. Both application and SQL compare quantities exactly while preserving the original entered decimals and units.
