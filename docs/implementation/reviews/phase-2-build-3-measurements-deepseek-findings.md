# Phase 2 Build Three measurements: independent review findings

Status: Independent documentation and source review completed 2026-11-03. Application implementation has not started. This is the authorized OpenCode Go DeepSeek V4.1 Flash (Max effort) retry, not a recheck of an actual prior DeepSeek review. The earlier provider attempt failed before producing findings.

Verdict: **revise before implementation**. Six high, eight medium, and three low findings. The core measurement design is sound; the import path and several cross-module contracts need correction before implementation.

Review baseline: working tree at `ed33045`, whose tree content matches the plan's stated `390690c` baseline. The working tree contains documentation-only changes for this planning task. No application, migration, dependency, configuration, database, fixture, or browser state was changed for this review.

Scope reviewed: the complete [Build Three plan](../plans/phase-2-build-3-measurements.md), [research plan](../research/build-three/research-plan.md), [technical findings](../research/build-three/technical-findings.md), the earlier [lead review](phase-2-build-3-measurements-review.md), canonical REQ-CRM/REQ-MEASURE/REQ-MASTER/REQ-ONBOARD and roadmap phase 2, the architecture overview, both build handoffs, and the relevant application, SQL, navigation, photo, file, customer, and master source. Section references below are to the Build Three plan unless stated otherwise.

## Summary

| Severity | Count | Finding IDs |
| --- | ---: | --- |
| High | 6 | DS-01 to DS-06 |
| Medium | 8 | DS-07 to DS-14 |
| Low | 3 | DS-15 to DS-17 |

The core measurement design is strong: immutable complete versions, explicit decimals and units, profile-scoped ownership, schema snapshots, narrow intake projection, lock ordering, actor-bound replay, private media ownership, and an authenticated revocable card resolver are all directionally correct and grounded in the existing system. The material weaknesses are concentrated in the import path and in several missing contracts where the plan relies on existing customer, schema, account, or file machinery that does not currently support the stated behavior.

The earlier lead audit's L01-L08 corrections are present in the plan and were not re-raised as defects. DS-05 extends L01 (claim binding does not yet define an import-safe key format), and DS-02 extends L05 (the customer import seam is named but not specified against the existing command-kind constraints).

## Findings

### DS-01 — High — Import preview duplicate checks exceed Build Two's limiter and review lifetime

**Plan location:** §11 "Preview and commit state", steps 3 and 6 (preview fingerprints; duplicate recheck and reuse), §14 M20/M21.

**Concrete failure:** A customer CSV may contain up to 200 rows. If preview validation reuses Build Two's interactive duplicate challenge for each phone-bearing row, the 31st distinct phone check in a minute fails with `FC006` because `customer_check_begin` permits 30 checks per principal/location per minute and only two active leases. A single preview also cannot hold 200 leases: leases last 15 seconds and the same budget allows two. The plan separately allows 30 minutes of preview readiness, but a Build Two duplicate review expires after 10 minutes, so even a preview that succeeds cannot retain its duplicate decisions for the promised readiness window. The result is either a preview that cannot validate every row (contradicting "Validate every row, not only the first preview page") or a second, unspecified review mechanism that is not actually the canonical Build Two challenge.

**Source evidence:** `packages/db/migrations/0036_customer_review_consistency.sql:20-34` enforces `b.checks>=30 OR active>=2` and 15-second leases. `packages/db/migrations/0035_customer_authority.sql:214-215` creates duplicate reviews with a 10-minute expiry. The plan's 200-row and 30-minute requirements are §11 "Preview and commit state", steps 1 and 4.

**Recommended correction:** Define an import-specific bulk duplicate matcher that shares Build Two's phone normalization, candidate query, candidate fingerprint algorithm, and phone-lock order but runs once per preview transaction rather than once per interactive check. Give import decisions their own reviewed expiry of at least the 30-minute preview lifetime. Account for the bulk matcher in the preview rate limit rather than the interactive 30-checks/two-lease budget. Add an acceptance fixture with more than 30 distinct phone rows in one preview and a second fixture with 200 rows.

### DS-02 — High — Customer import cannot reuse the existing customer mutation and review functions without an undeclared schema/function migration

**Plan location:** §11 "Preview and commit state", steps 6-8, especially "Reuse Build Two's canonical duplicate challenge", "Extract a private transaction-local customer mutation routine", and "The import command owns the single executor claim".

**Concrete failure:** The existing customer write path is command-kind-bound. `customer_mutate` rejects any call where `command_name <> op.command_kind` or where the name is not one of the eight customer/wearer commands. It also expects the customer create/update payload shape (`profile`, `intent`) and calls `customer_review_decision`, which expects the same shape and stores `op.command_kind` in a table constrained to `customer.create` or `customer.update`. `customer_activity.kind` is likewise constrained to the eight customer/wearer command names. An import command named `domain-import.commit-row` therefore cannot call the existing routine with `customer.create` without impersonating a customer command kind, which §2 explicitly forbids. If the importer instead copies the routine, it violates "Do not copy its SQL"; if it records no customer activity/review, the stated reuse of the canonical duplicate challenge and customer-module history is not achieved. The plan mentions extraction and aggregate audit but does not specify the required check-constraint changes, import review kind, activity kind, payload adaptation, or whether import-created customers appear in customer activity/history.

**Source evidence:** `packages/db/migrations/0035_customer_authority.sql:14` (`customer_activity_kind`), `:33` (`customer_review_kind`), `:207-220` (`customer_review_decision`), `:272-276` (`customer_mutate` command-name and operation-kind checks), and `:304-308` (review call from the customer create/update path).

**Recommended correction:** Specify a new internal customer-import seam rather than assuming `customer_mutate` can be called. The seam should reuse `customer_validate_profile`, `customer_candidates`, the canonical phone advisory locks, and the customer/wearer apply routines, while writing import-specific review and audit state. Either extend the existing review/activity kind constraints through a forward migration and document the new kinds, or create import-specific review/activity tables. Define payload adaptation and who consumes the review decision. Add a migration/function test that creates a customer group through import, verifies the source map and audit, and then re-runs the existing customer create/edit/archive suites unchanged.

### DS-03 — High — Measurement import has no stable source profile or version identity

**Plan location:** §11 formats table (`fitloom-measurements-v1`), §11 "Preview and commit state", steps 3-7 (source maps and row outcomes), §14 M21.

**Concrete failure:** The measurement CSV has required `source_measurement_id`, `source_customer_id`, `source_wearer_id`, `profile_label`, `schema_key`, `measured_on`, and `values_json`, but no `source_profile_id` and no source version sequence. A supported source with two measurement dates for the same wearer and profile therefore has no stable key for "these rows are versions of one profile." The importer can either create two independent profiles (destroying version history, current-version selection, comparison defaults, and copy/revise semantics) or group by `profile_label`, which the plan explicitly says is not identity and may be duplicated. The `domain_import_sources` key includes `recordKind` and `sourceId`, but no profile-level mapping exists, so it cannot reconcile a second measurement row into an existing imported profile. This is a direct gap against the requirement to preserve immutable version history and to import supported measurement records.

**Source evidence:** Plan §4 states profiles belong permanently to one wearer, names are not unique identity, several named profiles are allowed, and versions have their own sequence. The measurement format is at plan §11 line 275. The source-map table is at §4 line 128 and §11 step 7.

**Recommended correction:** Add `source_profile_id` (and, if needed, `source_version_sequence` or source recorded-at) to `fitloom-measurements-v1`. Define one destination profile per `(source_customer_id, source_wearer_id, source_profile_id)` and one version per `source_measurement_id`. Add a profile-level source-map record kind and conflict rules for the same profile ID with different labels, schemas, or wearers. Add fixtures for two measurement rows under one source profile, duplicate profile labels that are genuinely distinct, and a changed source payload.

### DS-04 — High — One import command family cannot select the format-specific permission under the executor's static access check

**Plan location:** §3 initial command registry (`domain-import.preview`, `domain-import.decide`, `domain-import.commit-row`, `domain-import.cancel`), §5 permission matrix, §12 import route table ("Format selects the relevant import permission").

**Concrete failure:** The executor checks `command.access.permission` before calling the command's `authorize` hook. The permission is static per command object. A single `domain-import.preview` command cannot require `customers.import` for a customer CSV and `measurements.import` for a measurement CSV. If it requires `customers.import`, a measurement-import-only role is denied or overgranted. If it requires `measurements.import`, a customer-import-only role is denied or overgranted. Setting a broad permission such as `workspace.read` and enforcing the real permission in `authorize` weakens the declared access contract, makes the SQL admission/audit story inconsistent, and is not what "format selects the relevant import permission" says. The plan's escape hatch says internal format-specific commands may refine the registry, but the initial registry and route table present one family, so the implementation contract is contradictory.

**Source evidence:** `packages/application/src/commands.ts:152-166` resolves and checks the static command permission before `command.authorize` and before claim. The plan lists one import family at §3 and says "Format selects the relevant import permission" at §12.

**Recommended correction:** Make the initial registry format-specific, for example `customer-import.preview`/`decide`/`commit-row`/`cancel` and `measurement-import.*`, each with its own permission. Alternatively, add an explicit command access resolver that receives the parsed payload and returns the required permission and projection before claim, with aligned SQL admission, claim allowlist, audit, and route tests. Add role tests proving customer-import-only and measurement-import-only users each work without the other permission.

### DS-05 — High — Derived import operation keys conflict with `claim_operation`'s UUIDv4 allowlist

**Plan location:** §2 (extend the retained claim protocol to import commands), §11 steps 5-6 (operation key derived from batch ID, preview revision, and opaque logical-record UUID; replay and source uniqueness).

**Concrete failure:** If import commands are added to the same `claim_operation` allowlist that now protects customer and photo commands, the SQL function requires the operation key to match a UUIDv4 pattern. A key derived from `batchId + previewRevision + logicalRecordUuid` is not a UUIDv4; a UUIDv5 derived from those inputs has version nibble 5 and also fails the current regex. The first `commit-row` would fail with SQLSTATE 22023 ("Invalid customer operation") if the command is allowlisted, or would skip the actor/location binding if it is not. The plan requires both exact recovery and actor/location denial, so neither outcome satisfies it.

**Source evidence:** `packages/db/migrations/0037_customer_private_photos.sql:298-300` requires the UUIDv4 pattern and owner kind for allowlisted commands. `packages/application/src/customer-contracts.ts:24-27` shows the current UUIDv4 operation-key contract.

**Recommended correction:** Define the import key format before implementation. Options include a deterministic UUIDv4-compatible derivation (set the version/variant bits on a hash), a stored random UUIDv4 per logical record, or a bounded import-key pattern in SQL with the same actor/location checks. Update the claim allowlist, application schema, SQL validation, audit/result mapping, and cross-actor/cross-location tests together. Also state the key format for preview/decision/cancel (random UUIDv4 is simplest).

### DS-06 — High — Measured-on future check uses UTC instead of the shop's local date

**Plan location:** §6 values table, Measured-on row: "0001-01-01 through the current UTC date. Server rejects impossible/future dates."

**Concrete failure:** For a shop in Asia/Kolkata (UTC+5:30), local today is one calendar day ahead of UTC between 00:00 and 05:30. A user entering today's local date in that window is rejected as a future date. For a shop west of UTC, the server can accept a local future date by up to a day. The plan's own baseline already handles the same class of date check correctly for wearer birthdays by using the shop timezone.

**Source evidence:** `packages/db/migrations/0035_customer_authority.sql:236` computes `today` as `(clock_timestamp() AT TIME ZONE timezone)::date` from `app.shop_settings`; the plan chooses UTC for measured-on instead.

**Recommended correction:** Compute the maximum measured-on date from the tenant/location timezone, using the same shop-settings source as Build Two, or explicitly define a location timezone on the measurement request. Add acceptance around local midnight for a positive-offset shop (Asia/Kolkata) and a negative-offset shop, plus an impossible-date fixture. If UTC is intentionally retained, the UI must state it and the acceptance must prove users cannot enter a locally future date.

### DS-07 — Medium — Card projection omits immutable field and choice labels

**Plan location:** §10 card projection: included fields are "profile/garment label, wearer display label, measured-on date, units, selected typed values, a short source-kind label, and Verify before cutting."

**Concrete failure:** The card selects up to 30 scalar fields per version by field ID. Without the saved field label, the printed card shows numbers or choice IDs without saying what they measure. Resolving labels from the current schema would let a later relabel or schema change alter an existing card, violating the fixed projection guarantee. For select fields, the saved choice ID is not enough; the card needs the saved choice label. Custom fields need their per-version labels too.

**Source evidence:** Existing `measurementField` carries `label` and select `choices` with labels (`packages/application/src/master-contracts.ts:88-124`). A version snapshot preserves those labels; the card projection list should explicitly include them.

**Recommended correction:** Store or return the immutable saved field label, basis, unit, and for selects the saved choice label as part of `projectionVersion=1`. Include custom field labels. Add a print fixture that selects a standard field, a custom field, and a select choice, then relabels or retires the source schema and proves the card still renders its saved labels.

### DS-08 — Medium — Measurement CSV value grammar and external field-key source are undefined

**Plan location:** §11 formats table, especially `values_json` ("a bounded typed array using that mapped schema's field IDs") and `custom_fields_json` ("an explicitly documented optional column").

**Concrete failure:** The plan does not define the exact JSON shape of `values_json` or `custom_fields_json`: property names, whether `kind` is required, how absence differs from false/zero, how length units are represented, how select choice IDs are represented, how custom field definitions reference their values, or how an external producer obtains the local schema node UUIDs. A generic template cannot contain a mapped schema's internal field IDs before the mapping exists, and a schema-specific template is not described. Different implementations can parse the same nominal format differently, and a legitimate external file cannot be authored without internal identifiers. The customer CSV's `phone_country`/`phone` format and per-column lengths are also undefined, so phone normalization and duplicate grouping are ambiguous.

**Source evidence:** Existing `measurementField` requires type-specific attributes (`displayUnit`, `displayPrecision`, `decimalPlaces`, `maxLength`, choices) at `packages/application/src/master-contracts.ts:97-124`. The plan's format table is at §11 line 275.

**Recommended correction:** Publish exact JSON Schemas and examples for `values_json` and `custom_fields_json`, including all five kinds, missing/false/zero, units, and custom definitions. Define whether external field keys are stable semantic IDs, documented aliases, or schema-specific templates generated after the schema mapping is chosen. Define `phone_country` as ISO alpha-2 (or whatever is chosen), the accepted phone spelling, per-column max lengths, and normalization/grouping rules. Add conformance fixtures for a template round-trip, unknown field IDs, choice spoofing, and malformed JSON.

### DS-09 — Medium — Import cancellation and failed-row completion semantics are incomplete

**Plan location:** §11 "Preview and commit state", step 8 (reconciliation and completion), §14 M23.

**Concrete failure:** The totals are `total, created, reused, already-imported, skipped, needs-review, failed, pending`; there is no `cancelled` or in-progress state. Cancellation "prevents new work but retains successful outcomes," but the plan does not say what happens to pending or needs-review rows. If they remain pending, "A batch is complete only when no pending/needs-review rows remain" can never become true after cancellation. If cancellation changes them, the new state is not in the totals and the UI cannot partition records. Separately, "A batch is complete only when no pending/needs-review rows remain" ignores failed rows, so a batch can be marked complete while a row failed and was never imported. The plan also says retrying failed rows creates a reviewed revision, which implies failed is not terminal, but the completion rule does not say how failed rows affect completion.

**Source evidence:** Plan §11 step 8 and M23. The row outcome model is also constrained by §11 step 7 ("Successful rows are immutable terminal outcomes") without defining terminal failure/cancellation.

**Recommended correction:** Define the full row state machine: pending, reserved/in-progress (if visible), created/reused/already-imported/skipped/needs-review/failed/cancelled. State whether failed rows block completion or are terminal-unresolved, and require a retry/skip decision before a batch is complete. On cancellation, move all non-terminal rows to a terminal cancelled/skipped state while retaining successes. Add the counts to the partition and M23 fixtures for cancel-with-pending, failed-with-successes, and retry-after-failure.

### DS-10 — Medium — Customer CSV grouping and phone format are ambiguous

**Plan location:** §11 customer format table and §11 step 3 (decisions).

**Concrete failure:** The plan says multiple rows may describe one customer and different named wearers "only when customer columns match exactly," but it does not define the customer columns, whether matching is textual or normalized, or what happens when the same `source_customer_id` appears with different names, phones, emails, or notes. A contact-only row and a wearer row for the same source customer can be read as two records or one record with a wearer; the plan does not say. `phone_country`/`phone` appear together, but the country format (ISO alpha-2 vs dialing prefix), phone spelling (national vs E.164), and canonicalization rules are not stated. These ambiguities directly affect duplicate grouping, source-map identity, and whether a file imports one customer or several. The plan also does not define whether the source map's accepted payload hash is over normalized canonical data or raw cells, so a formatting-only re-export can look like a changed payload.

**Source evidence:** Existing phone handling requires a country code and canonical e.164/digits (`packages/application/src/customer-phone.ts`), and customer names are NFC/trimmed (`packages/application/src/customer-contracts.ts:44-57`). The import table is at §11 line 274.

**Recommended correction:** Define the canonical customer grouping key after normalization, the allowed column set for "customer columns match," and conflict outcomes for same-source/different-column rows. Define contact-only plus wearer-row merging, or reject it explicitly. Specify phone country and number formats, normalization, per-column lengths, and the canonical source-map payload hash. Add fixtures for same source ID with a different name, contact-only plus wearer, formatted vs unformatted phone, an archived duplicate, and a formatting-only re-export that must be already-imported.

### DS-11 — Medium — Body schema publication lacks a current-version/rebase contract and concrete presentation metadata

**Plan location:** §4 Body schema and §4 Garment schema and drift.

**Concrete failure:** The plan publishes `body-core-v1`, says older bundles remain readable, and says v1 bytes never change, but it does not define which body bundle a new profile uses, how a revised body profile behaves when a newer bundle exists, or whether body profiles ever rebase. Unlike garment profiles, there is no "active/current body bundle" pointer or schema-stale rule. The concrete body field definitions are also not enumerated: stable field IDs, default `displayUnit`, `displayPrecision`, whether min/max are null or bounded, section/guidance, and illustration IDs. A bundle without `displayUnit` and `displayPrecision` is not a valid length-field schema, and a later v2 can silently change or fail to change existing body profiles.

**Source evidence:** `measurementField` length requires `displayUnit` and `displayPrecision` and permits min/max (`packages/application/src/master-contracts.ts:97-105`); the body description is plan §4 lines 103-107. The garment drift rules are §4 lines 109-115.

**Recommended correction:** Add a concrete `body-core-v1` table with stable field IDs, semantics, labels, body basis, default unit, display precision, bounds, and illustration IDs. Define a current body bundle pointer or a rule that new profiles pin the latest published bundle, and mirror the garment stale/rebase policy for body revisions. Add a v2 fixture that proves v1 values render unchanged and a revised body profile either stays pinned or explicitly rebases with review.

### DS-12 — Medium — Reserved measurement-photo IDs conflict with the immutable-file and foreign-key design unless modeled explicitly

**Plan location:** §9 measurement photos ("reserved profile/version IDs", "begin operation may reserve an ID for a not-yet-created header/version"), §4 storage map (`measurement_version_photos`, immutable file purpose/owner).

**Concrete failure:** A measurement photo begin happens before the header/version exists. If the `private_files` row or a new measurement-purpose table stores `profile_id`/`version_id` with immediate foreign keys to `measurement_profiles`/`measurement_versions`, the begin insert fails because the target row does not exist. If those columns have no foreign key, a file can carry an arbitrary reserved ID until save; the plan says the final Save "proves uniqueness and exact ownership" but does not define the reservation table/columns, validation point, or trigger. Existing private-file owner fields are immutable, so correcting a wrong reservation later is not possible.

**Source evidence:** `packages/db/migrations/0037_customer_private_photos.sql:33-44` shows the current immutable purpose/owner shape and the immediate customer/wearer foreign keys; `packages/db/migrations/0018_private_files.sql:1-10` shows the file row. The plan's reservation rule is §9 lines 244-248.

**Recommended correction:** Explicitly choose either (a) a separate staging-reservation table that owns the reserved profile/version IDs and is validated/consumed by the Save transaction, or (b) unconstrained reservation columns with a final-save trigger/function that proves the IDs exist, belong to the same owner, and are unique to that operation. Add tests for begin-before-create, failed save, stale reservation, attach to a different version, and cleanup of an abandoned reservation.

### DS-13 — Medium — Card selection rows are not explicitly immutable

**Plan location:** §4 storage map (`measurement_cards` and card selection rows), §10 fixed projection and revocation.

**Concrete failure:** The plan requires immutable content versions and attachment memberships, but it does not explicitly require immutable card selection rows. A bug or privileged write could update a card's version/field selection after issuance, expanding what a printed QR resolves. That violates "future code cannot silently expand an existing grant" and "source edits never broaden a saved card." Revocation/revision belongs on the card header; the selected version/field rows should be append-only.

**Source evidence:** The plan's immutability statement at §4 line 101 covers content versions and attachment memberships, not card selections. Card selection is described at §4 line 126 and §10 line 258.

**Recommended correction:** Add immutable triggers or a deny-UPDATE/DELETE policy for card selection rows, with the card header allowed only the reviewed revocation/revision transition. Restrict grants and add M19 evidence that a direct update/delete of a selection row fails while revoke still works.

### DS-14 — Medium — Import exact recovery can be blocked by the chunk limiter or batch lease

**Plan location:** §11 deadline and rate-limit paragraphs: "Never throttle exact recovery of an already committed row result", "commit chunks to 10/minute with at most one in-flight chunk per batch."

**Concrete failure:** A lost-response retry of `commit-row` normally passes through the same chunk endpoint and rate limiter. If the limiter or batch lease rejects the request before checking the existing operation key, the client receives 429/busy even though the row already committed. The plan says exact recovery must not be throttled but does not define a recovery path that bypasses the limiter, or a pre-limiter operation lookup. The same issue applies to a retry when another tab holds the batch lease: the committed row should return its saved result, not wait for the lease.

**Source evidence:** The plan's rate-limit and recovery statements are both in the §11 deadline and rate-limit paragraphs; the executor's replay path is in `packages/application/src/commands.ts:184-195`, after permission and admission checks. There is no separate operation-status endpoint in the current source.

**Recommended correction:** Provide a recovery/status read keyed by operation identity that is not subject to the commit rate limiter, or perform an exact operation lookup before the limiter/lease for the same envelope. Add a test that exhausts the chunk limiter or holds the batch lease, then retries a committed row and receives the saved result without a second write.

### DS-15 — Low — Existing tenant owner roles are not explicitly backfilled with the new permissions

**Plan location:** §5 permission matrix and "Owners/managers receive the new phase-appropriate permissions through the existing preset mechanism."

**Concrete failure:** Existing tenants received the current permission set through migration 0034 and `install_role_presets`. Updating the preset function for future tenants does not grant new permissions to existing owner roles. If the forward migration only changes the catalog and preset installation, existing owners cannot open measurements after upgrade while new tenants can. The plan says "replace the magic bound" and "check old roles remain valid" but does not explicitly require a backfill of existing preset roles.

**Source evidence:** `packages/db/migrations/0034_customer_foundation.sql:185-190` grants the current owner preset set and creates manager/staff presets; `:193-205` is the current custom-role validator. The plan's permission addition is §5 lines 138-153.

**Recommended correction:** Add a forward migration that grants the reviewed new permissions to existing owner roles (and any explicitly chosen preset roles), preserves custom-role grants, and leaves unrelated roles unchanged. Add an upgrade test from the current `0039` baseline with an existing owner and an existing custom role.

### DS-16 — Low — Length value range is narrower than existing garment schema bounds

**Plan location:** §6 values table, Length row: "at most 12 integer and 6 fractional digits."

**Concrete failure:** Existing `measurementField` bounds accept up to 18 integer digits and 6 fractional digits. A garment schema can therefore publish a min/max that the measurement value parser cannot represent. A value that is valid under the field's schema bound is rejected by the global length rule, and a schema can define an unsatisfiable bound. The inconsistency is unlikely in real tailoring dimensions but is a concrete contract mismatch and complicates the "schema bound in the other unit" fixtures.

**Source evidence:** `packages/application/src/master-contracts.ts:82` defines `decimalBound` with `\d{0,17}` after the first digit, i.e. up to 18 integer digits; the plan's length rule is §6 line 175.

**Recommended correction:** Align the measurement decimal range with the schema's 18+6 range, or tighten the schema publication rule so garment and custom bounds cannot exceed the measurement parser's range. Add a maximum-scale/maximum-integer fixture that is valid in both layers.

### DS-17 — Low — Plan status overstates the external review record

**Plan location:** Plan status line 3: "External review and dispositions are recorded in the review record."

**Concrete failure:** The linked review record states that the requested external review failed before producing findings and that no DeepSeek findings document exists. The plan status can be read as claiming a completed external review. This is a documentation consistency issue, not an application defect, but it affects the evidence chain the plan relies on.

**Source evidence:** Plan line 3 and the earlier review record's "Requested external review" and "Verification and limits" sections.

**Recommended correction:** State "Lead audit completed; independent review pending" until this findings file is dispositioned, then update the status to name this review and its dispositions.

## Coverage and evidence limits

**Read and traced:** the complete plan; research plan and technical findings; earlier lead review; REQ-CRM, REQ-MEASURE, REQ-MASTER, REQ-ONBOARD, and roadmap phase 2; architecture overview; both build handoffs; `packages/application/src/commands.ts`, `customers.ts`, `customer-photos.ts`, `files.ts`, `workspace-contracts.ts`, `master-contracts.ts`, `garment-definition.ts`, `customer-contracts.ts`, `customer-phone.ts`, and `private-image.ts`; customer/photo routes and server adapters; `workspace-route-policy.ts`, `navigation-guard.tsx`, `workspace-switcher.tsx`, `workspace-topbar.tsx`, and the account destination flow; migrations `0018`, `0020`, `0023`, `0034`-`0039`; and the relevant SQL cleanup, claim, duplicate-review, customer-mutation, master-version, file-purpose, and role functions.

**Not run:** no application, database, migration, browser, accessibility, or performance suite was executed. No live PostgreSQL query plans or object storage were inspected. No fixture or development data was reset. `git diff --check` exits 0 on the working tree. The earlier review's 76-link check was not independently repeated; local documentation links were not exhaustively revalidated. The baseline tree content matches the plan's stated `390690c` baseline (`ed33045` is the branch commit; `390690c` is the merge with the same tree), but no runtime behavior was revalidated.

**Evidence limits:** This is a source-and-document review. It does not establish that the import formats are usable with a real vendor file, that the card print layout meets the shop's physical needs, that the body illustrations are adequate, or that the accessibility claims hold in a screen reader or Safari. No prior DeepSeek findings existed to disposition; this file is the first independent findings artifact.

## Acceptance coverage gaps

The matrix is broad, but passing it as written would not catch the High findings. Add at least these checks:

| Finding | Acceptance addition |
| --- | --- |
| DS-01 | Customer preview with more than 30 distinct phones and 200 rows; assert every row is classified without `FC006`, and duplicate decisions remain valid for the full 30-minute readiness window. |
| DS-02 | Import-created customer/wearer group appears in the chosen customer history/audit path; existing customer create/edit/archive suites still pass after the seam. |
| DS-03 | Two measurement rows under one `source_profile_id` create one profile with two immutable versions; duplicate profile labels remain distinct when source profile IDs differ. |
| DS-04 | Customer-import-only and measurement-import-only roles each complete only their format; cross-format attempts return 403 without overgrant. |
| DS-05 | Derived `commit-row` key is accepted by `claim_operation`; cross-actor and cross-location reuse is denied; exact retry replays. |
| DS-06 | Measured-on today passes around local midnight in Asia/Kolkata and a negative-offset shop; a local future date fails. |
| DS-07 | Card projection shows saved field/custom/choice labels after a source schema relabel or retirement; raw IDs never print. |
| DS-08 | A documented `values_json`/`custom_fields_json` round-trip, unknown field IDs, false/zero/missing, mixed units, and a schema-specific template. |
| DS-09 | Cancel a batch with pending rows; failed rows with successes; assert terminal counts, batch completion, and retry rules. |
| DS-10 | Same source customer with mismatched columns, contact-only plus wearer row, formatted vs unformatted phone, archived duplicate. |
| DS-11 | `body-core-v1` validates; a v2 publication leaves v1 profiles unchanged; body revision follows the documented current/rebase rule. |
| DS-12 | Begin a photo before the profile/version exists, save with exact ownership, reject a stale or different-version attachment, and clean up an abandoned reservation. |
| DS-13 | Direct UPDATE/DELETE of a card selection row is denied; revocation still works; card projection cannot expand after a source edit. |
| DS-14 | Exhaust the chunk limiter or hold the batch lease, retry a committed row, and receive the saved result without a second write. |
| DS-15 | Upgrade from `0039` with an existing owner and custom role; intended backfill occurs, custom grants are unchanged. |
| DS-16 | A schema bound at the documented maximum is representable and validates; an over-range value is rejected with the correct field path. |

Two additional checks are not finding-level defects but are missing from the matrix: add M19 checks for unauthenticated card sign-in return (allowlisted route, no open redirect), the 30-resolutions/minute limiter, and a reader with measurement read but no card manage; add M20 checks for downloadable template/format-version documentation and the 1 MiB/200-row/64 KiB rejections.

## Readiness judgment

The plan is **not ready to be treated as implementation-approved as written**. It is a strong design document for the core measurement book: the immutable-version model, exact value/unit rules, schema snapshots, lock ordering, replay semantics, private media ownership, and card authorization are materially better than a typical feature plan and are grounded in the existing source. Increments 1-6 can be prepared after DS-06, DS-11, DS-12, and DS-13 are corrected, with DS-07 and DS-16 resolved in the corresponding card/editor increments.

Increment 7 is the principal blocker. DS-01 through DS-05 and DS-08 through DS-10 and DS-14 must be resolved before import implementation. The current plan assumes a customer-import seam that does not exist, a duplicate-check budget that cannot cover a 200-row preview, one command family that cannot carry two permissions, an operation-key derivation that conflicts with the retained claim function, and a measurement format that cannot preserve profile/version identity. These are not stylistic preferences; each would cause a concrete failure or force an undeclared design change during implementation.

The 28-scenario matrix is broad, but it does not test the specific failure modes above. The plan should add those cases, correct the plan status line, and then re-run the document/link/diff checks. After disposition, the core measurement work can proceed; the import and card increments should remain gated until their contracts are explicit.

## Preferences and non-defects

These are not offered as defects:

- **Chart library:** §7 prefers a simple SVG chart unless measured needs justify a dependency, while the architecture selects Recharts. Either is workable; choose one before implementation and update the architecture or the plan so the dependency decision is unambiguous.
- **Card identifiers in URLs:** The plan correctly avoids raw customer IDs, analytics events, external resources, caching, and referrer leakage. A card ID in the printed URL will still appear in browser history, server/proxy access logs, and copied links. The ID grants no access alone, but an explicit log-redaction/retention decision would strengthen the privacy story.
- **Copy attachment wording:** §7 says a copy does not copy photo references "by default"; §9 says an independent copy has no attachments. Make the two statements identical to avoid an accidental optional-copy path.
- **Card issuer dependency:** Requiring the original issuer to remain an active `measurements.cards.manage` holder is a deliberate accountability policy, but it means a printed card becomes unusable when that staff member changes role. Document the operational consequence and the reissue path.
- **Body illustrations:** The available bundled artwork is a single `dimension` illustration. Using it for chest, bust, waist, hip, and shoulder satisfies a generic "illustrated field" bar but may be too weak for the product's "illustrated dimensions" intent. This is a product-quality choice, not a source defect.
- **Preset scope:** "Owners/managers receive the new phase-appropriate permissions" is directionally clear but underspecified. State exactly which presets receive which new permissions; the current manager preset is intentionally narrow.
