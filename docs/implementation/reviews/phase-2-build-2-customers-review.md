# Build Two customer plan review and dispositions

Plan: [Customers and wearers](../plans/phase-2-build-2-customers.md).
Original review: [DeepSeek findings](phase-2-build-2-customers-deepseek-findings.md).
Date: 2026-11-02.

Status: The requested independent review completed. The primary agent checked the findings against repository source and revised the planning artifact. The revised plan has not received a second independent review. Customers remain Planned; no application implementation or runtime acceptance is claimed.

## Reviewer and scope

The delegate used provider `opencode`, model `opencode-go/deepseek-v4.1-flash`, and the returned option `effort=max`, matching the user's requested DeepSeek 4.1 Flash at maximum effort. The reviewer inspected the full plan and relevant requirements, UI/navigation, command executor, SQL, files, role contracts, and existing evidence. It wrote the original findings without editing the plan or product code.

Initial verdict: revise before implementation. The review contains 3 blockers, 10 high findings, and 16 medium findings. Counts are the reviewer's classifications, not runtime failures or test counts.

## Resolve blockers

| Finding | Disposition and plan location |
| --- | --- |
| B1. Candidate PII in durable operation results | Accepted. Sections 5, 7, 10, and 12 persist only opaque review identity, expiry, count, or saved resource/version metadata. Candidate summaries are fetched afresh through current CRM read/manage authority. Review tables have no runtime SELECT grant and expire. Section 14 checks operation rows directly as the actor and an audit-only reader after CRM revocation. |
| B2. Challenge authorization versus replay/expiry | Accepted. Section 5 limits authorize to current identity/scope/permission checks and SQL claim to actor ownership. Fresh challenge/version/state checks live in mutate. Committed save replay survives challenge expiry, consumption, and purge. Replayed review outcomes project typed expired/stale states and a new-key check-first path. The draft hash covers the entire intended payload except the decision/token. |
| B3. Conflicting lock order and timeout | Accepted with a smaller explicit contention contract. Section 7 defines sorted phone locks → customer → wearer/file, forbids parent-to-phone upgrades, and uses nonblocking domain locks. Customer-specific busy and 55P03 errors become typed 409 busy through a narrow command error adapter, preserving existing shared retry behavior. Explicit same-envelope retry is safe after rollback. Tests cover three creates and create/edit/archive/restore races; ordinary domain contention is not labelled a 503 outage. |

## Resolve high findings

| Finding | Disposition and plan location |
| --- | --- |
| H1. Unchanged-phone edits and update decision | Accepted. Section 5 gates only creation and a change to another non-null normalized phone. Unrelated edits and clearing the phone do not require review. Update uses a distinct keep-duplicate-phone intent and explicit wording; it never creates a replacement record. |
| H2. Incomplete file-purpose integration | Accepted and enumerated in section 9. Every generic begin/upload/prepare/finalize/change/read/list path is workspace-only. CRM receives separate purpose-bound functions that work without files permissions. Service cleanup intentionally handles both purposes, excludes live generic and CRM bindings, and updates continuation consistently; blindly skipping CRM files would leak abandoned objects. Section 14 tests both role directions and cleanup. |
| H3. Maximum profile exceeds 16KiB | Accepted. Sections 6 and 11 add an explicit 128KiB customer-profile limit only to customer/wearer create/update. Maximal valid Unicode profiles must save; raw overflow and domain validation remain distinct. Other routes retain their limits. |
| H4. Search PII in GET URLs | Accepted. Sections 4, 5, and 11 use read-only POST search bodies, avoid native GET forms, and disable body logging. GET directory reads contain no search/tag text. Section 14 checks URLs, history, and captured logs. |
| H5. Breadcrumb and switch data paths | Accepted with reduced layout coupling. The topbar uses structural route labels; authorized page headers own customer names. A new authenticated server switch resolver reads target permissions, uses the existing preference command, and returns an allowlisted destination. No target permission guesses or child-to-layout customer fetch are needed. |
| H6. Effective wearer state under archive | Accepted. Section 5 defines effectiveActive from both nullable archive timestamps. All selection projections join the parent. Archived profiles show saved wearer counts and zero selectable wearers. Historical photo/activity reads remain permitted under current rights, while new writes are blocked. |
| H7. Shared HTTP helper lacks customer adaptation | Accepted. Sections 10–11 explicitly extend shared helpers with a domain adapter, profile body option, safe unavailable 404, session 401, bounded issues, and correlation IDs. Legacy/master contracts remain regression requirements. |
| H8. Ambiguous 409 review response | Accepted. Section 11 defines separate saved, review-required, expired/stale, and error variants. The client parses the discriminator before generic response.ok failure handling. Authorized candidate projection is distinct from the durable result. |
| H9. Return context lost on native navigation | Accepted. Section 4 specifies tab-scoped sessionStorage with opaque return tokens, TTL, bounds, principal/scope checks, logout/login/switch clearing, and a storage-unavailable fallback. Editable drafts remain in memory. |
| H10. Cross-actor operation replay | Accepted. Section 12 requires random UUIDv4 keys and an atomic actor check within claim_operation for the fixed CRM command allowlist. A second actor cannot retrieve the first actor's result. This is a named forward foundation change with non-CRM replay regressions, not a pre-read workaround. |

## Resolve medium findings

| Finding | Disposition and plan location |
| --- | --- |
| M1. Unicode normalization and length | Accepted. Section 6 defines code-point counts in Zod/SQL, NFC, ASCII whitespace collapse for names, and deterministic ASCII case folding for search. Non-ASCII case is preserved explicitly; É/é and combining-mark/emoji/Tamil fixtures make the limitation testable. No universal linguistic folding is promised. |
| M2. Parsing versus valid phone | Accepted. Section 6 selects libphonenumber-js/max, whole-input parsing, isValid, region/international rules, and extension rejection. Structural validity remains separate from ownership or reachability. |
| M3. Country condition for GSTIN | Accepted. Section 6 gives GSTIN an explicit India tax-country condition, requires an explicit clear before country changes remove it, and excludes a generic foreign tax-ID field. It makes no legal registration claim. |
| M4. Loyalty reference scope | Accepted by removal. Sections 3 and 6, the schema outline, and increment 3 no longer add loyalty references. Roadmap phase 7 remains the owner. |
| M5. Contact-only demographic profile | Accepted as an explicit requirement interpretation. Section 5 and the clarification next to REQ-CRM assign person attributes to a named wearer, including an explicit self wearer. A contact-only record has no automatic person profile. Tests cover that case. No duplicate demographic copy is added to contact storage. |
| M6. Role dependencies | Accepted. Section 8 states all implications, Zod and SQL enforcement, labels/UI behavior, and current 13 + 5 = 18 permission-count arithmetic within the 20 limit. The actual checkout must be rechecked before implementation. |
| M7. Duplicate-check resource limits | Accepted. Section 5 fixes a 30-per-minute principal/location budget, two concurrent checks, valid-input gate, five summaries, 429/Retry-After, PII-free counters, and no durable preflight review. Protected projection and issuance share the budget; saved-result replay recovery is exempt. |
| M8. Review-row retention | Accepted. Section 5 defines a ten-minute TTL, expiry index, bounded purge on reads/use/issuance, and a restricted worker maintenance call at most once a minute. Worker recovery purges expired rows; expiry denies access even during downtime. The operation result retains no private candidate payload. |
| M9. Inline photo, metadata, and uniqueness | Accepted. Section 9 requires inline no-store streams, metadata stripping with output inspection, current-role partial unique indexes, and concurrent replacement checks. Existing image byte/pixel/time bounds are explicit. |
| M10. Tag filter representation | Accepted. Section 11 uses up to five normalized strings in a POST JSON array with AND semantics. Session return descriptors carry tags outside URLs. Unknown/duplicate URL keys remain rejected. |
| M11. Canceled selector state | Accepted. Section 4 explicitly resets the select DOM value on canceled/failed switching and tests both the visible control and current page/draft. |
| M12. Drizzle snapshot deliverable | Accepted. Sections 10, 13, and 14 require the next reviewed snapshot alongside forward migrations and a no-change db:generate result. Applied migrations remain unchanged. |
| M13. Stale runtime record and shell ownership | Accepted. Section 1 preserves the earlier observed 404 and incorporates the later UI recovery evidence without claiming a fresh authenticated pass. UI v3 increments 5–7 finish before customer Increment 2; shell ownership hands off once, preventing concurrent conflicting edits. |
| M14. Shared customer error schema | Accepted together with H7/H8. Section 11 specifies the strict response union, codes/statuses, issue bounds, client parse order, and helper adapter. Section 14 covers real helper/client behavior. |
| M15. No-op behavior | Accepted. Section 7 specifies changed:false, unchanged versions, operation audit/result for replay, no domain activity, and accurate UI copy. Customer/wearer/lifecycle/photo no-op cases are in section 14. |
| M16. Staff identity in activity | Accepted with a smaller projection. Section 7 shows You or Shop staff and timestamps/event summaries. Other staff IDs/names and raw auth/owner contacts are omitted from the customers.read projection. |

## Retain intentional defaults

Optional phone, an explicit self-wearer checkbox defaulting on, manual segments, owner-only initial grants, concrete location ownership, and in-memory editable drafts remain proposed defaults. A business contact can uncheck the wearer action. There is no inferred customer login, sharing consent, or guardian authority. Customer screens identify the selected location and do not promise shop-wide customer search.

Sensitive tags stay in the bounded return store, not URLs. Home naming follows the completed v3 Home. The staff-entered photo permission/provenance note does not claim legal consent. Real-data privacy policies remain separate from local synthetic-fixture implementation. No credit-sale contact requirement, name/address matching algorithm, or other optional feature was silently added by this review.

## Verify the revised artifact

The primary agent inspected the actual plan and findings, compared relevant command, SQL, file, navigation, role, and UI evidence, checked local documentation links/anchors, checked all 29 finding IDs have dispositions, and ran whitespace/diff checks. The customer acceptance matrix now includes the review's operation privacy, challenge replay/expiry, lock contention, unchanged-phone update, file-purpose, maximum-profile, URL privacy, return-state, role-dependency, selector, photo-metadata, and schema-drift scenarios.

The final document check resolves 94 local links and supplied Markdown anchors across the plan, original review, dispositions, index, status, and requirements. All 29 original finding IDs match disposition rows. `git diff --check` passes. All changed/new files are Markdown. The original review SHA-256 is `8042827141bb233293fe790f993cfd8412401ec43f6338e9f46c7cb8d0334ea4`.

These checks validate the planning artifact. No application tests, database migrations, or customer browser suite ran for this revision because it changes documentation only. Existing dated runtime observations retain their limits. No second delegate review or independent approval is implied.
