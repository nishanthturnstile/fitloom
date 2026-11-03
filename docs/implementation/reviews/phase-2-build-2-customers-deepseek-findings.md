# Build Two plan: DeepSeek review findings

Plan: [Phase 2, Build Two: customers and wearers](../plans/phase-2-build-2-customers.md).
Reviewer: DeepSeek V4.1 Flash through OpenCode Go.
Date: 2026-11-02. Plan baseline: commit `3cdd9cf`, checked against the current checkout.
Scope: planning artifact only. No customer application code, migration, UI, or test exists, so nothing below is evidence of runtime behavior. Claims in the plan were checked against the current source rather than accepted from the plan.

Verdict: **revise before implementation**. Three blockers, ten high findings, sixteen medium findings, and a separate set of optional preferences. The domain direction, the register/profile split, the command-reuse posture, and most acceptance scenarios are sound. The blockers are concentrated in the duplicate-review command outcome, replay authorization, and lock ordering; the high findings cover valid-input size, file-purpose isolation, search privacy, navigation data flow, archived-wearer selection, and HTTP error contracts.

Sources inspected:

- Plan sections 1–16 and [roadmap phase 2](../../product/roadmap.md#phase-2-build-the-customer-and-measurement-book).
- [REQ-CRM, REQ-MEASURE, and REQ-WORKSPACE](../../product/requirements.md#customer-and-measurement-requirements), plus the requirement ownership table.
- [Implementation status](../status.md), [UI v3 plan](../plans/ui-foundation-v3-implementation-plan.md), [UI v3 evidence](../evidence/ui-foundation-v3.md), and [Build One final acceptance](../evidence/phase-2-build-1-increment-6.md).
- `packages/application/src/commands.ts`, `files.ts`, `workspaces.ts`, `workspace-contracts.ts`, `master-contracts.ts`, and `masters.ts`.
- `packages/db/src/index.ts`, `packages/db/src/schema.ts`, and migrations `0003`, `0009`, `0018`, `0020`, `0022`, `0023`.
- `apps/web/src/components/workspace/workspace-navigation.tsx`, `workspace-topbar.tsx`, `workspace-switcher.tsx`, `navigation-guard.tsx`, `workspace-shell.tsx`, and `workspace-destinations.tsx`.
- `apps/web/src/app/workspaces/[tenant]/[location]/layout.tsx`, `page.tsx`, `settings/garments/page.tsx`, `settings/garments/master-client.ts`, and `apps/web/src/server/workspaces.ts`, `workspace-page-context.ts`, `masters.ts`, `files.ts`.
- `apps/web/src/app/api/workspaces/[tenant]/[location]/masters/[[...path]]/route.ts` and `files/route.ts`.

---

## Blockers

### B1. The review-required command result persists candidate PII where direct SQL can read it after revocation

Plan location: §5 “Duplicate decision” (lines 113–121), §7 `customer_duplicate_reviews` (line 170), §8 revocation claim (line 197), §11 HTTP contract (line 258).

Source evidence:

- `packages/application/src/commands.ts` lines 195–203 parse the command result, pass it to `app.finish_operation`, and the operation row stores it as `result jsonb`.
- `packages/db/migrations/0003_command_journal_contracts.sql` lines 17–35 define `command_operations.result`; lines 151–159 grant `SELECT` on `command_operations` to `fitloom_web` and `fitloom_worker`.
- `packages/db/migrations/0009_resumable_workspaces.sql` lines 242–245 replace `operation_read` with a policy that allows the **actor** or a holder of `audit.read` to read the operation row. It does not require `customers.read`.
- The plan proposes a `review-required(reviewId, boundedCandidates, expiresAt)` outcome and says to commit the review row **and its operation result** as a successful command outcome.

Concrete failure: the bounded candidate summary (names, formatted phones, active/archived labels, IDs) is a command result. It is written to `command_operations.result` and remains readable directly through the runtime role after the actor loses `customers.read`, and by any `audit.read` holder in the location. The plan's assertion that “SSR, API, image streaming, and direct SQL all enforce the boundary” (line 197) is then false. The same durable result also outlives the short-lived review row and is returned on replay, so the “short-lived challenge” does not bound the candidate PII lifetime.

Proposed fix:

1. Make the durable operation result non-PII: store only `{ reviewId, expiresAt, candidateCount }` (or a cached projection-free status). Keep candidate identities only in `customer_duplicate_reviews` (or a sibling table) with forced RLS, no `SELECT` grant to `fitloom_web`, and a bounded retention.
2. Project candidates at response time through a permission-checking function that requires current `customers.read` (and current location/customer scope). Do not let the generic operation replay path return them.
3. Add a direct-SQL regression: the actor can read the operation row after `customers.read` is revoked, and the row contains no customer names, phones, addresses, or candidate IDs. Add an `audit.read` actor case.
4. If a durable candidate summary is required for replay, store a hash/fingerprint, not the values, and re-fetch authorized candidates on each disclosure.

This is a blocker because it undermines the plan's central privacy boundary and the review-required outcome design.

### B2. Challenge replay and expiry rules are contradictory and can break lost-response recovery

Plan location: §5 lines 119–121 and §12 lines 269–271.

Source evidence:

- `packages/application/src/commands.ts` lines 63–64 state `authorize` “Runs on every attempt, including replay.”
- Lines 175–193 run `authorize` **before** `claim_operation`; if `claimed.result` is non-null, the executor returns it without calling `mutate`.
- The plan says “A refreshed review uses a new operation key; authorize challenge use and expiry before replay where applicable.”

Concrete failures:

- If “authorize challenge use and expiry before replay” is implemented in `command.authorize`, a lost-response retry of a **successful keep-separate create** after the challenge expiry is rejected even though the customer was already committed. The executor has the saved result but never reaches it because `authorize` throws first. This directly contradicts the §14 lost-response scenario (“retry exact envelope … inspect one durable mutation”).
- If it is implemented in `mutate`, it is not run on replay, which is correct for recovery, but the plan does not say so. An implementer following the pinned authority contract can choose either behavior.
- A review-required result is durable, but the challenge expires. Replaying the original create envelope after expiry returns the same expired `reviewId` forever; the plan does not define a typed `review-expired` outcome or a fresh challenge path. The UI cannot distinguish “expired, start again” from “valid review.”

Proposed fix:

- State explicitly: `authorize` rechecks only current principal, scope, and permissions on every attempt. Challenge **use**, expiry, candidate fingerprint, and payload-hash checks live inside `mutate` and therefore do not run on replay.
- For a **successful keep-separate** replay, return the saved customer even if the challenge has since expired or been consumed. Add an exact-key replay test after expiry and after another operation has consumed the same challenge.
- For a **review-required** replay after expiry, return a typed `review-expired` result (or project expiry at the HTTP read and require a new key), not the stale challenge. Add a test.
- Bind the challenge hash to the **full create/update command payload**, including the optional self-wearer, tags, and all duplicate-relevant fields, not just “customer fields.” Add a test that modifies the self-wearer or tags after the review and gets a new review.

This is a blocker because the plan's uncertain-operation recovery is a stated acceptance requirement.

### B3. The lock order is self-contradictory and the existing `lock_timeout` is not covered by the executor retry policy

Plan location: §7 lines 179–181, §5 line 135.

Source evidence:

- `packages/db/src/index.ts` lines 23–24 set `statement_timeout: 10000` and `lock_timeout: 2000`.
- `packages/application/src/commands.ts` lines 247–262 retry only SQLSTATE `40001` and `40P01`; `55P03` (lock not available) becomes a `temporary` command error (503).
- The plan says both “All customer writes lock the parent customer first” and “Phone-changing commands acquire affected phone locks before the parent lock.”

Concrete failures:

- The two sentences prescribe opposite total orders. A phone edit implemented literally as parent → phone, while a create locks phone → candidate parent row, can deadlock. A deadlock is retried, but the design should not rely on detection to hide a contradictory order.
- Even with a correct order, `pg_advisory_xact_lock` or `FOR UPDATE` waiting past two seconds raises `55P03`. The user gets a 503 rather than the required duplicate review/conflict, and the executor does not retry it. Three simultaneous creates or a phone edit competing with a create can lose the review flow under ordinary contention.
- The plan says “Preserve the existing executor's bounded retry behavior” but does not say how the new lock waits fit that behavior.

Proposed fix:

- Define one storage helper with a single total order: sorted phone advisory locks → parent customer row → wearer/file row. Phone-changing edits take phone locks first; archive/restore take only the parent; create takes the phone set then locks candidate customer rows. Document that the “parent first” sentence is subordinate to the phone-first rule whenever a phone changes.
- Use `SET LOCAL lock_timeout` for customer writes or a `pg_try_advisory_xact_lock` retry with a bounded wait. Map `55P03` to a retryable conflict or a specific “review busy, retry” outcome; do not surface it as a generic 503.
- Add tests with three concurrent creates, create-vs-phone-edit, archive-vs-edit, archive-vs-wearer-create, and restore-vs-archive. Assert one durable outcome and no 503 from ordinary lock contention.

This is a blocker because the plan's duplicate and archive-race acceptance depends on the order working.

---

## High findings

### H1. The duplicate gate will block ordinary edits when the phone is unchanged, and edit-phone “keep separate” is undefined

Plan location: §5 lines 113–121, §14 “Duplicate decision” and “Two-actor edits” (lines 298, 304).

Source evidence: the plan says to “lock and repeat the authoritative check for the normalized phone” at save and to exclude only the edited customer's own ID. It does not say to skip the check when the phone has not changed.

Concrete failures:

- Two customers are created with the same phone through an explicit “Keep separate.” Later, either customer's notes or preferences are edited without touching the phone. The authoritative check still finds the other customer, returns `review-required`, and forces a second duplicate decision for an edit that creates no new duplicate. The user may be unable to complete a routine profile edit without repeated review.
- For an **edit**, “Open existing customer” and “Keep separate” do not have a defined meaning. There is no second record to create. Does “Keep separate” mean “update this customer's phone to a number another customer already uses” or “abandon the phone change”? The plan's create-centric `CreateIntent` does not answer this.

Proposed fix:

- Run the authoritative duplicate gate on create and on an edit only when the normalized E.164 value (or the phone-cleared state) changes. A no-phone-change edit is not a duplicate event.
- Define a distinct update intent, for example `keep-duplicate-phone(reviewId)` with an explicit label such as “Use this phone for this customer anyway,” separate from create's “Keep separate.” Document and test both.
- Add scenarios: prior keep-separate then unrelated edit; edit changing A to B's phone; edit clearing the phone; two actors editing the same phone concurrently.

### H2. File-purpose isolation is not enumerated, and the existing generic file functions hard-code `files.*`

Plan location: §9 lines 201–209, §10 `customer-photos.ts` (line 233), §14 “Photo bypass” (line 310).

Source evidence:

- `packages/db/migrations/0018_private_files.sql` lines 58–124: `file_begin`, `file_upload_target`, `file_finalize`, `file_change`, `file_read`, and `file_list` all check `files.manage` or `files.read`; `file_change` can attach/retire any finalized/attached file in the same scope; `file_read` serves any attached file; `file_list` lists any attached file.
- `packages/db/migrations/0020_immutable_private_objects.sql` lines 6–54: `file_upload_target`, `file_prepare`, `file_finalize`, `file_read`, and `file_list` remain permission-only and have no purpose argument.
- `packages/db/migrations/0022_bounded_foundation_lists.sql` lines 38–45: `file_list_page` has no purpose filter.
- `packages/db/migrations/0018_private_files.sql` lines 109–125: `file_cleanup_candidates` checks only `file_attachments`, not a domain binding.
- `packages/application/src/files.ts` lines 52–122 and 178–301 call those functions unchanged.

Concrete failures:

- A user holding `customers.photos.manage` but not `files.manage` cannot complete a CRM upload if the implementation reuses `file_prepare`/`file_finalize`, because those functions require `files.manage`.
- A user holding `files.manage` can call `file.attach`, `file.retire`, `file.upload_target`, or `file.finalize` on a `customer-photo` file unless every generic function explicitly filters `purpose='workspace'`. A purpose column alone is insufficient.
- `file_list_page` and `file_read` will expose, stream, or list a customer photo if the purpose filter is missed on either path.
- Cleanup can delete a `customer-photo` file whose generic attachment was retired while a live `customer_photos` binding still references it.

Proposed fix:

- Add an immutable `purpose` column with `workspace` default and a `CHECK`; make every existing generic function reject non-`workspace` rows, including `file_begin`, `file_upload_target`, `file_prepare`, `file_finalize`, `file_change`, `file_read`, `file_list`, `file_list_page`, `file_cleanup_candidates`, and `file_cleanup_done`.
- Add explicit CRM functions (`customer_photo_begin`, `customer_photo_prepare`, `customer_photo_finalize`, `customer_photo_bind`, `customer_photo_read`, `customer_photo_remove`) with `customers.photos.*` checks and same-scope owner/target validation. Do not let `files.manage` alone call them.
- Extend cleanup to exclude any file with a live `customer_photos` binding; add a test that retires the generic attachment but leaves the domain binding and proves the object survives.
- Add a matrix test: files-only role cannot list/stream/attach/retire/finalize/complete a CRM photo; photo-only role can upload/read/bind/remove; workspace files still work for both.

### H3. The 16 KiB mutation budget cannot hold the documented maximum profile

Plan location: §11 line 261 (“Keep JSON mutations within the existing 16KiB default”), §6 field maxima (lines 141–152), §14 “Optional profile” (line 302).

Source evidence:

- `apps/web/src/server/workspaces.ts` lines 124–127 use 16 KiB for ordinary mutations and 128 KiB only for `master-definition`.
- Build One evidence line 49 records that HTTP admits a definition larger than 16 KiB and retains 16 KiB elsewhere.
- The plan allows customer/wearer notes up to 2000 characters, fit/fabric/design notes up to 1000 characters each where present, address fields up to 632 characters, 20 tags of 40 characters, plus names, email, phone, and JSON keys. The create command also carries the optional self-wearer.

Concrete failure: a profile that satisfies every documented per-field maximum can exceed 16 KiB, especially with Tamil or emoji text (four UTF-8 bytes per scalar). The plan acknowledges that “per-field maxima are not promises that all fields fit simultaneously” but then says to “return bounded field issues for aggregate overflow.” That makes a documented valid field value impossible to save and presents a transport/validation failure for a form the user filled correctly.

Proposed fix:

- Add a `bodyLimit: "customer-profile"` option (for example 128 KiB, matching the existing master-definition limit) for customer/wearer create and update, or lower the field maxima so the worst case fits 16 KiB. State the resolved aggregate budget in §6 and show it in the form if it remains.
- Add a maximal valid customer + self-wearer payload test with Tamil and emoji that saves successfully. Add a separate over-limit test that returns field issues before SQL.
- Keep photo bytes out of the JSON command path (already stated); the size fix is only for text profiles.

### H4. Search PII is sent in GET query strings despite the plan's “no raw PII in URLs” rule

Plan location: §4 line 86 (“No raw search PII enters URLs”), §10 line 226 (“Keep body fields out of generic query parsers and URLs”), §11 line 254 (`GET /` includes search).

Source evidence: the plan's own duplicate-check contract sends phone in bounded JSON “rather than URL” (line 258), but the register contract makes search a `GET` query. There is no query redaction in `apps/web/src/server/workspaces.ts`; the search term is part of the request URL.

Concrete failures:

- `GET /api/.../customers?search=<name-or-phone>` puts customer names and phone digits in the browser's network panel and can surface them in web-server access logs, reverse-proxy logs, error reporting, and trace tooling. That contradicts §7 line 183 (“Do not include phone numbers … in logs”) and the §4 promise.
- A native `<form method="get">` around the register search input would also put the query in the page URL and browser history even if the API is changed.
- The test matrix has no assertion that search text is absent from the URL or logs.

Proposed fix:

- Define a read-only `POST /search` (or `POST /customers/search`) that accepts `{search, status, segment, tags, offset, limit}` as bounded JSON, returns `{items,total,nextOffset}`, and is idempotent. Keep `GET /` for empty directory reads with no search text.
- If `GET` search is retained, explicitly scope the no-PII rule to page URLs and add redaction/masking to every access log and diagnostic; document the accepted residual exposure. The stronger fix is the POST.
- Ensure the register input is not inside a native GET form; prevent default and use fetch. Add a test that the page URL, request URL, and captured logs contain no search term.

### H5. The breadcrumb name and the safe workspace-switch destination have no data path

Plan location: §4 lines 83–85, §10 line 236 (`workspace-route-policy.ts`), §11 page routes.

Source evidence:

- `apps/web/src/app/workspaces/[tenant]/[location]/layout.tsx` lines 24–37 renders the shell and `WorkspaceTopbar` once, with only workspace identity, permissions, choices, and locale.
- `apps/web/src/server/workspace-page-context.ts` lines 40–47 returns the workspace view and choices; it has no child-page data.
- `apps/web/src/components/workspace/workspace-topbar.tsx` lines 38–50 derives a hard-coded label from `pathname` only.
- `packages/application/src/workspace-contracts.ts` lines 59–63 define `workspaceChoice` as tenant/location/names only; it has no permissions.
- `apps/web/src/components/workspace/workspace-switcher.tsx` lines 51–56 copies the current suffix and query; lines 68–76 render choices with no capability flags.

Concrete failures:

- The plan requires `Home / Customers / name / Edit` and “resolve customer display labels only from an authorized detail projection.” The topbar is in the layout and cannot receive the page's detail projection. It must either fetch the customer itself (forbidden by “do not put service reads into the route classifier”) or show no name. No page-to-shell metadata channel is specified.
- The plan requires a customer detail/new/edit switch to go to the target shop's customer register “if permitted, otherwise Home.” The switcher only knows the current workspace permissions. A target choice may have `workspace.read` but not `customers.read`; the switcher will navigate to a page that shows unavailable rather than Home, or it must guess. The same applies to preserving catalog root/kind for a target without `masters.read`.
- An unavailable customer must not leak a name; without a contract, a cached or URL-derived name can.

Proposed fix:

- Choose one explicit channel: (a) move the customer name breadcrumb into a page-level header/context provider set by the authorized page loader, or (b) add a server-authorized `WorkspacePageMetadata` context that the layout can read for the current request. Keep the route classifier pure and do not fetch customer details there.
- Add non-PII capability flags to `WorkspaceChoice` for the current principal (for example `canReadCustomers`, `canReadMasters`) or resolve the switch destination server-side in the preferences/switch endpoint. Do not broaden scope; these are guidance flags, not authority.
- Add direct-link, reload, browser-history, unavailable-record, and switch-to-target-without-customer-access tests.

### H6. Archived-customer wearers remain logically active; the effective-state rule is missing

Plan location: §5 lines 129–135, §15 line 330, §3 “Wearers” and “Measurement handoff.”

Source evidence: the proposed `app.customers` and `app.customer_wearers` rows each have “active/archive metadata,” and the plan says “Archive the customer header without rewriting individual wearer states.” No view, function, or query rule defines the effective active state of a wearer.

Concrete failure: Build Three, or a later order/intake query, reads `customer_wearers` filtered by `active` and selects an active wearer under an archived customer. That violates “Archived customers and wearers cannot be selected for new measurements/orders.” The same defect appears in the register's “active wearer count”: an archived customer with two active wearer rows can display “2 active wearers” even though neither is selectable.

Proposed fix:

- Define `effective_active = customer.active AND wearer.active` as the only selection predicate. Expose a restricted SQL view/function (for example `app.customer_wearer_active`) or require every wearer read to join the customer header; document the handoff contract for Build Three.
- Add a `CHECK`/state constraint that `archived_at` and the active flag cannot disagree for both customers and wearers.
- Test: archive a customer with two active wearers, confirm the wearers are not selectable and the register label is unambiguous; restore the customer and confirm only originally active wearers return; archive one wearer and restore.
- Use the same rule for photo reads and activity continuation if those are allowed on archived customers.

### H7. `CustomerError`, field issues, and the required 404 cannot flow through the existing HTTP helpers

Plan location: §7 line 121, §10 `apps/web/src/server/customers.ts` (line 235), §11 lines 262–263.

Source evidence:

- `apps/web/src/server/workspaces.ts` lines 48–108 `safeRoute` only serializes `issues` and a `correlationId` when `error instanceof MasterError` and `masterErrors` is true. A `CustomerError` would be reduced to `{message, category}` with no issues.
- `mutation` lines 109–137 has a `masterErrors` option and a `master-definition` body limit; there is no customer equivalent.
- `safeRoute` maps `access` to 403 and `temporary` to 503; it has no 404 category. The plan requires cross-scope/missing customer IDs to return a safe 404.
- `packages/application/src/master-contracts.ts` lines 410–427 defines the master error shape that the client parses; the plan says to add a `CustomerError` but not how the shared route helper recognizes it.

Concrete failure: a customer validation error with field paths is returned as a generic 403/503/400 message with no `issues`; the client cannot focus the first invalid field as §5 requires. A cross-scope customer ID returns 403 or 503 instead of the required 404, leaking a different failure category or showing the wrong retry state.

Proposed fix:

- Generalize `safeRoute`/`mutation` to accept a domain error adapter (or add a `customerErrors` option) that serializes `CustomerError.issues` with the same bounded schema and correlation ID. Do not duplicate the whole helper in the customer route.
- Add a `notFound` response helper or an `unavailable` category with an explicit 404 mapping. Malformed UUIDs remain 400; missing/cross-scope IDs remain 404; denied actions remain 403.
- Add tests for 400 field issues, 403, 404, 409 review-required, 503, 413, and 408 through the customer route and the browser client.

### H8. The 409 review-required response has no discriminated envelope for the client

Plan location: §5 line 121 (“translate that outcome to HTTP 409 outside the executor transaction”), §10 `SaveResult` union (lines 219–224), §11 line 263.

Source evidence:

- `apps/web/src/app/workspaces/[tenant]/[location]/settings/garments/master-client.ts` lines 11–33 implement `response()` as “parse JSON, then throw `ApiError` if `!result.ok`.” The customer client will need different behavior.
- `apps/web/src/server/workspaces.ts` lines 78–106 return error bodies shaped `{message, category}`. A 409 review body shaped as a `SaveResult` has no required `category` and no top-level discriminator.
- The plan's `SaveResult` is conceptual; it does not say whether the 409 body is `{result: ...}`, `{kind: "review-required", ...}`, or a `category` value.

Concrete failure: the client cannot reliably distinguish “409 duplicate review with a challenge” from “409 stale version” or a generic conflict. A generic parser may throw away the reviewId/candidates, forcing a fresh save and a new challenge; a naive parser may treat the candidate summary as a successful save.

Proposed fix:

- Define a response envelope for both success and review, for example `{ outcome: "saved", result: SaveResult } | { outcome: "review-required", review: ReviewResult }`, and a separate error envelope for other failures.
- Add a customer client that inspects the 409 body before throwing, and a browser test that renders the candidate list, preserves the draft, and uses the returned reviewId.
- Keep the HTTP status 409 but make the body self-describing; do not reuse the master `{message, category}` shape for a successful review outcome.

### H9. Search/return context cannot survive the app's native document navigation without a specified store

Plan location: §4 line 86 (“Keep name/phone search in session memory”), §12 line 267 (“drafts in memory”), §14 “Navigation chain” and “Workspace switch.”

Source evidence:

- `apps/web/src/components/workspace/navigation-guard.tsx` lines 44–47 commit navigation with `window.location.assign`, a full document navigation.
- `apps/web/src/components/workspace/workspace-switcher.tsx` lines 54–56 also use `commitNavigation`, not client routing.
- The application has no current `localStorage`/`sessionStorage` usage (grep of `apps/web/src`).

Concrete failure: if “session memory” is implemented as React state, the last search/filters/page are lost on the full navigation from the register to a profile and back. The return descriptor would restore filters but not the name/phone query, so the focused row and “same authorized register context” acceptance cannot pass. If the query is put in the URL instead, H4 returns.

Proposed fix:

- Specify `sessionStorage` (or an equivalent tab-scoped store) keyed by principal + tenant + location, holding only the last query and allowed filter/view/page state. Clear it on logout, principal change, shop/location change, and successful return navigation if appropriate.
- Carry only non-PII state and a validated return descriptor in the URL; validate the descriptor against the current workspace, known customer routes, and allowlisted keys. Reject absolute, protocol-relative, cross-tenant, cross-location, and unknown routes.
- Add a test that navigates register → profile → Back/return with a full document load and restores the query/focus, and that logout/switch clears it.

### H10. Operation keys are tenant-scoped; replay can return another actor's result

Plan location: §12 lines 267–271 (“Generate an operation key…”, “A successful replay still checks current permission”), §11 `POST /commands/{name}`.

Source evidence:

- `packages/db/migrations/0003_command_journal_contracts.sql` lines 76–107: `claim_operation` looks up `(owner_kind, owner_id, command_kind, operation_key)` and returns the stored `result`; it does not include or compare `actor_id`.
- The unique constraint is `UNIQUE(owner_kind,owner_id,command_kind,operation_key)` (same file, lines 17–35), so the key is shared across all actors in the tenant/location.
- `apps/web/src/server/workspaces.ts` `invocation` accepts any string 1–200; the current clients use `crypto.randomUUID()`, but the server does not require a UUID.

Concrete failure: a buggy client, a deterministic key, or a malicious actor who learns/reuses another actor's key and payload for the same command receives the stored result. For customer create that may be only an ID the actor can already authorize, but for a review-required result it can disclose candidate PII (B1) and for a photo command it can disclose a file identity. The plan says replay rechecks current permission but not that it is the same actor.

Proposed fix:

- Require UUIDv4 operation keys in the customer contracts and client, and verify `operation.actor_id` matches the current principal on replay. Extend `claim_operation` or add a customer wrapper that performs the actor check before returning a result.
- Add a two-actor test: same tenant/command/key/payload; the second actor must not receive the first actor's result. Add a challenge-actor test as well.
- Alternatively, make the operation identity include the actor for customer commands; document the migration and any replay compatibility.

---

## Medium findings

### M1. Search normalization does not define non-ASCII case folding or what “120 characters” counts

Plan location: §6 line 141.

Source evidence: Build One evidence line 17 documents the existing master policy as “NFC normalization plus ASCII case folding.” The plan says “NFC-normalized, trimmed, 1–120 Unicode characters” and “SQL owns deterministic search normalization” but does not define case folding, whitespace collapse, or whether 120 means code points, UTF-16 code units, or grapheme clusters. Zod `.max` and SQL `char_length` do not agree for astral characters.

Concrete failure: an uppercase accented customer name may not match a lowercase query; a 60-emoji name may pass one boundary and fail the other; the UI and SQL can disagree on “too long.”

Proposed fix: define one normalization function (NFC, case folding, whitespace collapse, preserve display spelling), use it in the SQL index and lookup, and count code points or grapheme clusters consistently in the client and SQL. Add fixtures for composed/decomposed accents, É/é, Tamil, emoji, and combining marks.

### M2. Phone validation says “parse” but not “valid”

Plan location: §6 line 142, §14 “International contact input” (line 301).

Concrete failure: `libphonenumber-js` can parse a number that is not valid for the region (for example a too-short national number). If the implementation checks only `parsePhoneNumberFromString`, the API accepts a number that the plan says should be rejected, and the UI may display a “valid” phone that cannot be dialled. The acceptance row says “invalid country/number” has a defined result but does not define parse vs valid.

Proposed fix: require `isValid()` for the selected region or a valid international prefix, with `extract: false`/whole-input behavior and no extension. Add fixtures for too short, too long, wrong country, leading zero, pasted text, and international/national equivalents. Document that validity is structural, not ownership or reachability.

### M3. The GSTIN India format check has no country condition or non-India behavior

Plan location: §6 line 148.

Concrete failure: if the check always applies the Indian 15-character pattern, a non-India customer with a different tax identifier cannot store it; if it never applies, an Indian GSTIN is not checked. The plan says “Apply an explicitly documented format check for India” but not when.

Proposed fix: define the condition (billing country = IN, or an explicit tax-ID country), the accepted non-India behavior (free text with a bound vs unsupported), and validation tests. Keep the statement that this is not registration verification.

### M4. The loyalty reference is scheduled for phase 7 by the roadmap but included in Build Two

Plan location: §3 line 67, §6 line 152; [roadmap requirement ownership](../../product/roadmap.md#requirement-coverage-and-completion-ownership) line 223 says REQ-CRM “7: loyalty references.”

Concrete failure: Build Two adds a `loyalty reference` field while the roadmap assigns loyalty references to phase 7. The plan calls it “retain an optional external/manual reference only,” but that is still a persisted CRM field and a UI surface beyond the stated phase-2 ownership.

Proposed fix: either defer the field to phase 7 or record an explicit scope exception and update the roadmap/requirement mapping. If it remains, define whether it is searchable, editable, displayed in the register, and whether it has any reporting meaning (the plan says no points/balance).

### M5. REQ-CRM lists birthday/gender/height/weight on the customer; the plan makes them wearer-only and asserts satisfaction

Plan location: §5 line 127; [REQ-CRM](../../product/requirements.md#req-crm-customer-register-profile-and-history) line 137.

Concrete failure: a contact-only customer (for example a parent or business contact who is not a wearer) has no place to store the optional birthday, gender, height, or weight that REQ-CRM lists. The plan says “The self wearer's physical details appear here, satisfying the customer-profile requirement without storing a second conflicting copy,” but that only covers customers who have a self-wearer. A contact-only customer is explicitly supported (line 111, “Unchecking creates only the contact record”).

Proposed fix: either store these optional person attributes on the customer when no self-wearer exists, or record an explicit requirement interpretation/modification, update the REQ-CRM mapping, and test the contact-only customer. Do not claim the requirement is satisfied for all customers without that decision.

### M6. Customer permission dependencies are not specified in the role contract

Plan location: §8 lines 187–195.

Source evidence: `packages/application/src/workspaces.ts` lines 157–208 enforce the master dependency in the browser contract; `packages/db/migrations/0023_garment_master_storage.sql` lines 154–167 enforce it in SQL. The plan says “update … role dependency validation” but does not state the customer rules.

Concrete failure: an owner can create a custom role with `customers.manage` but not `customers.read`, or `customers.photos.manage` without `customers.photos.read`. The UI and SQL disagree on what the permission means, and the command's single `access.permission` check may pass while the read projection is denied.

Proposed fix: add the same refinement and SQL check: `customers.manage` ⇒ `customers.read`; `customers.archive` ⇒ `customers.read`; `customers.photos.read` ⇒ `customers.read`; `customers.photos.manage` ⇒ `customers.manage` + `customers.photos.read`. Add labels in `workspacePermissionLabel`, add the enum values to `createRole`, and test creating a dependent-only role through both the UI and direct command. Check the role-count bound: current 13 permissions + 5 customers = 18, still within 20, but state that if more are added the bound changes.

### M7. The duplicate-check endpoint has no concrete abuse/resource limits

Plan location: §11 line 257 (“authorization and abuse/resource limits apply”).

Concrete failure: an authorized user can use exact-phone checks to enumerate phone numbers and names, or generate many review rows/challenges. The plan gives no per-actor/per-scope rate, minimum phone length, audit requirement, or concurrency bound. The `POST /duplicate-check` body is small, but the read/candidate query is not free.

Proposed fix: set a per-principal/per-location rate and a short minimum phone length, require `customers.read` (and manage for the decision flow), audit the check without phone digits, bound candidate summaries to a fixed count, and add a burst test plus a “no durable challenge from preflight” test.

### M8. Duplicate review rows have no cleanup/retention rule

Plan location: §5 line 119, §7 line 170.

Concrete failure: every review-required attempt writes a row containing the normalized phone, candidate fingerprint, actor, and expiry. The plan says “short-lived challenge” but does not define the TTL, cleanup job, index on expiry, or what happens to the row after use. The rows accumulate phone PII indefinitely.

Proposed fix: define a TTL (for example 10–15 minutes), an expiry index, a durable cleanup job or purge-on-read/use rule, and a retention statement. Ensure the operation result does not retain the phone (B1). Add an expired-challenge test and a cleanup test.

### M9. Photo streaming, EXIF removal, and current-photo uniqueness are under-specified

Plan location: §9 lines 205–209.

Concrete failures:

- `packages/application/src/files.ts` lines 291–299 set `Content-Disposition: attachment`. If the CRM stream copies this, an `<img>` preview will download the file instead of rendering it. The plan says “private preview” but not `inline`.
- The existing sharp path likely strips metadata, but the plan does not require EXIF/GPS removal explicitly. Body photos can contain location data.
- “One current customer avatar and one current face plus one current body photo per wearer” needs a partial unique constraint or a lock-enforced check; otherwise concurrent binds can create two current photos.

Proposed fix: define `Content-Disposition: inline` (or a separate inline mode), keep `nosniff`, `no-store`, and the CSP; explicitly strip EXIF/GPS and test it; add `UNIQUE(customer_id, role) WHERE current` and `UNIQUE(customer_id, wearer_id, role) WHERE current`, plus a concurrency test.

### M10. Tag filtering and repeated query keys need an explicit representation

Plan location: §11 line 254 (“search/status/segment/tag/offset/limit query”), §4 line 86 (“status/segment/tag/view/page state in allowlisted page parameters”).

Source evidence: `apps/web/src/app/api/workspaces/[tenant]/[location]/masters/[[...path]]/route.ts` lines 24–35 reject duplicate query keys. If the customer route copies that behavior, `?tag=a&tag=b` is a 400.

Concrete failure: a tag filter cannot express multiple tags without knowing whether the API expects a comma-separated value, JSON, or repeated keys. The plan says “tag filters” plural but does not define AND/OR semantics or the URL/page-parameter encoding.

Proposed fix: define `tags` as a comma-separated allowlisted list or a bounded JSON array in a POST search body; if repeated `tag` is used, explicitly exempt it from the duplicate-key rule. Define AND vs OR, tag normalization, and the maximum number of tags.

### M11. Canceling a workspace switch can leave the selector showing the target workspace

Plan location: §4 line 85 (“Canceled/failed switch keeps A's input intact”).

Source evidence: `apps/web/src/components/workspace/workspace-switcher.tsx` lines 30–35 call `guard.confirmLeave("switch")` and `return` without changing state. The `<select>` is controlled by `selected`, but no state update occurs on cancel, so React does not re-render and the DOM may keep the newly selected option.

Concrete failure: the user cancels the discard prompt; the page remains on shop A, but the switcher visually shows shop B. The next interaction is ambiguous, and the acceptance “canceled switch keeps A's input intact” does not explicitly cover the control state.

Proposed fix: reset `event.target.value = selected` (or force a controlled re-render) when the confirmation is canceled; add a browser test that asserts the select value and the page remain on A after cancel, and that a failed preference save also resets the control.

### M12. The Drizzle snapshot baseline is not a named deliverable

Plan location: §10 line 234 (`schema.ts`, next retained migrations), §14 line 320 (“generated-schema drift checks”).

Source evidence: Build One’s review found that `migrations/meta/` stopped at `0010` while `schema.ts` declared ten master tables; it added `0033_snapshot.json` and verified `db:generate` reports no changes ([Build One final acceptance](../evidence/phase-2-build-1-increment-6.md), lines 129–134).

Concrete failure: Build Two adds several tables to `schema.ts`. If the plan does not explicitly add a new reviewed `00XX_snapshot.json`, the next `db:generate` can replay duplicate customer DDL. “Generated-schema drift checks” in §14 may be read as optional verification rather than a required artifact.

Proposed fix: add the snapshot file to the module/deliverable table and to the migration increment; run `pnpm --filter @fitloom/db db:generate` and require “no schema changes” in the evidence. Record the actual next migration numbers from the journal.

### M13. The UI v3 baseline is both stale and still a dependency; two workstreams would edit the same shell

Plan location: §1 lines 17–30, §4 lines 74–91, §13 line 279.

Source evidence:

- [UI v3 evidence](../evidence/ui-foundation-v3.md) lines 245–250 say increment 5 runtime acceptance is incomplete; lines 255–258 then say the local stack is healthy and canonical account/sign-in/catalog return 200. The customer plan line 26 says sign-in returned 404 and “no authenticated customer or master workflow was freshly verified.”
- [UI v3 plan](../plans/ui-foundation-v3-implementation-plan.md) line 3 and lines 464–471 show increment 5 open and increments 6–7 unfinished.
- [Implementation status](../status.md) lines 15–16 keep UI v3 “In progress” and customers “Planned.”
- The current shell components (`workspace-navigation.tsx`, `workspace-topbar.tsx`, `workspace-switcher.tsx`, `navigation-guard.tsx`) are exactly the files Build Two §4 proposes to change, while UI v3 increments 6–7 also own Home/shell/QA changes.

Concrete failure: the plan's runtime prerequisite is based on a stale failure record that is contradicted by later evidence; a reader cannot tell whether sign-in is broken. Separately, Build Two Increment 2 edits the same shell files that the unfinished v3 owner still owns, so two plans can produce conflicting navigation/topbar/switcher changes. The customer plan says “repair a shared regression in its owner” but does not freeze the shell or assign the route-policy change to one owner.

Proposed fix: reconcile the runtime record in §1 with the latest UI evidence (state the actual current state and date), and make UI v3 increments 5–7 a named prerequisite with a shell/route-policy owner. Either (a) complete v3 increment 6/7 first and then have Build Two consume the shell, or (b) assign `workspace-route-policy.ts` and the shell edits to the v3 owner and have Build Two add only customer-specific extensions after the freeze. Do not start Increment 2 against an unfrozen shell.

### M14. The 404/409/field-error contract needs one shared customer error schema

Plan location: §7 line 121, §11 lines 262–263.

This overlaps H7/H8 but is distinct at the contract level: the plan names `CustomerError` without defining its Zod shape, HTTP envelope, issue paths, or how a review-required 409 differs from an error 409. The customer client cannot be written against the plan alone.

Proposed fix: add a `customerError` schema mirroring the bounded master error but with an explicit `kind`/`category` discriminator and a `review-required` variant; state the status mapping and the client parse order. Add contract tests.

### M15. No-op writes need an explicit result/activity rule

Plan location: §7 line 181 (“No-op writes retain versions and explicitly identify no change”), §8 activity.

Concrete failure: the plan says no-op writes “identify no change” but does not define the result field (`changed: false`?), whether an audit row is written, whether `customer_activity` gets an event, or whether a no-op photo replacement is a 200 or 409. The UI's “success” announcement could mislead.

Proposed fix: define a `changed` boolean in the mutation result, keep the version, write no activity for a true no-op, and still write the operation audit/result for replay. Add a no-op test for customer, wearer, archive/restore, and photo replacement.

### M16. Activity exposes an “actor display projection” without a permission decision

Plan location: §7 line 169.

Concrete failure: `app.principals` has no display name (`packages/db/migrations/0000_identity_tenancy.sql` lines 109–115); the display name comes from `public."user"`, as the team read does. The plan says any `customers.read` user sees “actor display projection” but does not decide whether a customer reader may see staff names, or whether the projection is a stable ID. This can disclose staff identity to a role that lacks `access.manage`.

Proposed fix: define the actor projection as either an opaque principal ID plus current authorized name resolution, or explicitly document that staff display names are visible with `customers.read`. Do not join raw owner contacts. Add a role-matrix check.

---

## Optional preferences (not correctness defects)

These are reasonable defaults that the plan already labels as proposed. They do not block implementation, but they should be recorded as preferences rather than silently treated as requirements.

- **Optional phone.** The plan makes phone optional to avoid inventing numbers, but exact-phone duplicate detection then has no signal for phone-less records. Consider a name + address advisory duplicate hint, and record that phase 3 credit sales must require at least one reachable contact method.
- **Self-wearer default on.** This is efficient for the common one-person customer, but it creates a wearer named after a company/business contact. Consider defaulting off when the customer is marked as a business/company, or keep the checkbox on but show a clear “this creates a person record” explanation.
- **Staff-assigned segments.** Keeping the enum manual is safer than computing from nonexistent orders. It is a preference; do not imply reporting segmentation in phase 2.
- **Owner-only initial grants.** This is conservative and consistent with the foundation. Managers and staff can receive delegated roles later; do not describe customer access as generally available to staff until a role is granted.
- **Concrete location ownership.** This is the right conservative default while phase 7 is undecided. Make the UI say “this location” rather than “shop-wide” so a multi-location owner is not misled.
- **Bounded substring search.** It is more useful than prefix-only search and the performance caveat is honest. Do not later claim constant-cost search for one-character terms.
- **In-memory drafts.** Fine for this build; the plan correctly refuses to promise recovery after browser termination.
- **Tags in return descriptors.** A tag can be sensitive (“VIP”, “debt”, a personal label). Prefer an opaque return token or keep tags in `sessionStorage` rather than a visible URL if the shop may use sensitive labels.
- **“Home” vs “Overview”.** Align with the v3 Home work; do not rename the transitional page before the readiness Home exists.
- **Photo consent for minors.** The plan correctly defers real-data jurisdiction/consent. Do not let the permission/provenance note read as legal consent in the UI.

---

## Sound decisions

The plan gets the following right and should not redesign them:

- A routable register/profile with one active editor, rather than one large mounted page.
- Strict Zod contracts on both sides, a fixed command map, `workspaceTarget`, the existing invocation envelope, operation identity, and current-authority checks.
- Atomic create of customer + optional self-wearer + tags + activity + command audit/result.
- A server-issued duplicate challenge rather than a hidden client boolean, with archived matches and an explicit keep-separate path.
- A conservative concrete-location customer policy while cross-location policy remains phase 7.
- Archive/restore rather than delete, with retained history and no automatic wearer rewrite.
- Separate customer/wearer identities, explicit active states, no reparenting, no merge, and no measurement transfer.
- A private-file purpose boundary instead of exposing the workspace library to CRM photos.
- Browser-safe contracts with a package subpath and transitive import-boundary check.
- Native document navigation and the existing guard instead of introducing a second router.
- No fake orders, balances, measurement links, or operational tabs before those modules exist.
- A test matrix that covers search completeness, duplicate concurrency, archive races, lost responses, role revocation, photo bypass, keyboard/mobile, and navigation.

---

## Verification gaps to add to §14

Add these rows so the fixes above are observable:

1. **Operation-result privacy:** after a review-required save, revoke `customers.read`; direct SQL as the actor and as an `audit.read` holder must show no candidate names/phones.
2. **Challenge replay:** drop the keep-separate response; retry the exact envelope after challenge expiry and after another operation consumed it; the committed customer must be returned, and a new attempt with the old challenge must fail.
3. **Lock contention:** three simultaneous creates and a create-vs-phone-edit vs archive; assert one durable outcome, no deadlock, and no 503 from ordinary lock waits.
4. **Unchanged-phone edit:** create two customers with the same phone via keep-separate; edit one's notes; no duplicate prompt. Then change the phone and assert the prompt.
5. **File-purpose matrix:** files-only role cannot list/stream/attach/retire/finalize/complete a CRM photo; photo-only role can upload/read/bind/remove; workspace files still work; cleanup preserves a domain-bound photo.
6. **Maximum profile:** save a maximal valid customer + self-wearer with Tamil and emoji; assert success, then an over-limit payload returns field issues before SQL.
7. **Search privacy:** search a name and phone; assert the page URL, API request URL, browser history, and captured server logs contain no search text.
8. **Breadcrumb/switch:** direct link, reload, unavailable record, and switch to a target without `customers.read` or `masters.read`; correct parent links, no name leak, correct Home/register destination.
9. **Archived wearer selection:** archive a customer with active wearers; Build Three-style selection finds none; restore re-enables only originally active wearers.
10. **HTTP contract:** 400 with issues, 403, 404 missing/cross-scope, 409 review-required with typed body, 409 stale version, 503, 413, 408 through the customer client.
11. **Search/return across native navigation:** register → profile → Back/return after a full document load restores the authorized view and focus; logout/switch clears the session memory.
12. **Role dependency:** creating a custom role with `customers.manage` but no `customers.read` (and the photo equivalents) fails in the browser contract and SQL.
13. **Canceled switch:** the selector and page remain on shop A after cancel; failed preference save also resets the control.
14. **Photo stream:** `<img>` renders the private photo inline, EXIF/GPS is absent, replacement/removal deny old reads, and concurrent binds leave one current photo.
15. **Drizzle drift:** `db:generate` reports no changes against the new reviewed snapshot.
16. **UI v3 baseline:** fresh sign-in → workspace → Home → catalog/settings on desktop and narrow, with the current UI evidence reconciled; record any remaining unrelated failure truthfully.

---

## Limit

This review inspected source and documentation only. It did not run the application, migrations, browser suite, or customer code (none exists). The findings are plan-design findings, not proof of a runtime defect. The strongest blockers are the operation-result PII, the replay/expiry contract, and the lock-order/lock-timeout interaction; those should be resolved before coding Increment 1. The remaining high and medium findings can be resolved during Increment 1 contract/storage design, but they should be recorded before the dependent UI increments start.
