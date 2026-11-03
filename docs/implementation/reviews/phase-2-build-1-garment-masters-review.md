# Build One plan review record

Plan: [Phase 2, Build One: garment masters](../plans/phase-2-build-1-garment-masters.md).
Requested reviewer: DeepSeek V4.1 Flash through OpenCode.
Date: 2026-11-01.

Status: Full-file DeepSeek V4.1 Flash review completed. The primary agent revised the plan and recorded dispositions below. The revised plan has not received a second independent review.

## Attempt and result

The OpenCode capability catalog listed opencode/deepseek-v4.1-flash as DeepSeek V4.1 Flash and reported that child tasks were supported. The primary agent submitted a full-file review task to that exact provider/model with the complete plan path, relevant repository contracts, and instructions to return actionable findings. The delegate returned failed immediately:

    Model unavailable: opencode/deepseek-v4.1-flash

A capability refresh after the failure still listed the model. A catalog entry therefore did not establish that the provider could execute it. Additional failure notifications in the conversation named opencode/deepseek-v4-pro, opencode/deepseek-v4.1-flash, and opencode-go/deepseek-v4.1-flash. None supplied a completed review.

Those failed attempts produced no reviewer findings or verdict. Do not treat local document checks or the research subagent's findings as a replacement for the requested DeepSeek review. No different model was selected by the primary agent.

## Connection repair on 2026-11-01

Two independent failures were reproduced. T3's running OpenCode v2.2.5 server listed only a free DeepSeek model, while the normal CLI listed the subscribed Go models. Reloading that server's configuration restored opencode-go/deepseek-v4.1-flash. A real inference request then identified a separate credential failure: HTTP 401 with api_key_expired.

The user supplied a replacement key through secure input. It was installed with OpenCode's supported integration login, the runtime configuration was reloaded, and the legacy Go credential was synchronized for the separately installed v1 CLI. Other provider credentials were retained. The temporary secure-input file was removed after installation.

A real DeepSeek V4.1 Flash request through T3's running OpenCode server returned the exact expected OPENCODE_GO_OK response with exit zero. A new full-file review was submitted through delegate_task with provider opencode and model opencode-go/deepseek-v4.1-flash. The model itself has not changed; this is the user's subscribed Go route.

## Checks completed on the planning artifact

The primary agent traced the repository contracts, read the written plan, checked relative documentation links and the diff, and clarified schema identity lineage, binding immutability, first-write catalog locking, and expected-version checks after operation replay. These are plan preparation checks, not an independent review or evidence that application features work.

## Completed review and dispositions

The exact model opencode-go/deepseek-v4.1-flash completed the full-file review through delegate_task. Its [original findings](phase-2-build-1-deepseek-findings.md) remain unchanged. The initial verdict was revise before implementation, with three findings labelled blockers, five high, and six medium. The primary agent inspected the actual findings and applied the following decisions to the plan.

| Finding | Disposition |
| --- | --- |
| B1: structural/byte limits | Clarified rather than accepting that every structural maximum must fit simultaneously. All limits apply together. The single authoritative definition budget now measures SQL JSONB text, with an aggregate validation issue, browser estimate, transport distinction, and boundary fixtures. This removes the app-versus-SQL serialization ambiguity without raising the resource limit. |
| B2: catalog versions | Accepted the concurrency concern. Catalog version is now an order/settings token, not a content-change token. Content uses existing header/revision versions, avoiding an unnecessary second catalog content counter. Lifecycle semantics and catalogVersion in every result are explicit. |
| B3: increment dependencies | Clarified the schema-first Increment 4 result and the later eligibility/rate controls. Complete authorized values must be preserved before those controls are editable. |
| H1: applicability filtering | Accepted. Extract/index current applicability in the header under the save transaction. |
| H2: catalog state read | Accepted. Added GET /masters/catalog with flags, order version, bundle metadata, and bounded installed keys, including the empty state. |
| H3: semantic signatures | Accepted. Added exact immutable versus editable attributes for every node kind, including number unit and option ownership. |
| H4: inactive carry-forward | Accepted. Derive carry-forward from the locked current version, retain inactive binding values, and expose bindingState for the editor. |
| H5: price erasure | Reinforced the existing permission decision with explicit current checks for all three permissions in service and SQL, required nullable rate keys, and a denied-save/replay scenario after revocation. No schema-only rate-bearing save is allowed. |
| M1: historical add-on prices | Kept the deliberate independent add-on lifecycle. Historical schema views show saved labels without historical add-on amounts or totals; a separately labelled current-price panel may show current amounts. |
| M2: name normalization | Accepted. SQL is authoritative for NFC, trim, and deterministic ASCII case folding in uniqueness and search; added Unicode fixtures. |
| M3: catalog audit entity | Defined master_catalog with entityId = tenant UUID, which already identifies the catalog row. Added record/catalog/no-op version semantics rather than another surrogate ID. |
| M4: units and semantic fields | Accepted. Added displayUnit to length and nullable, kind-compatible semanticId to every field variant. |
| M5: relational constraints | Accepted. Made currency/add-on amount nullability, INR/finite/nonnegative checks, inherited override currency, and tenant-qualified creation location explicit. |
| M6: documentation/migrations | Accepted doc updates in the owning increments, with 0023 as the next baseline migration number subject to checking the actual retained journal. |

Optional comments were resolved where useful: option namespaces derive from ownership, zero overrides use null-coalescing, negative-zero rate spelling is rejected, visibility predicates are explicit, preview uses a pure renderer, and standalone-service pricing/intake permissions have explicit later handoffs. The proposed /commands route is retained as a deliberate fixed domain command allowlist. No routine trigger-disabling procedure is introduced: published mistakes are corrected by appending a version, and exceptional historical data repairs require a separately reviewed migration.

New acceptance rows cover catalog tokens/state, filter totals, semantic signatures, inactive-reference races, revoked rate access, audit identities, Unicode names, and aggregate byte budgets. These are planned checks, not claims of implemented behavior.

Verification of this revision consists of inspecting the edited plan and original review, checking documentation links and whitespace, and confirming that changes remain planning-only. No second delegate was started and no second independent approval is implied.

## OpenCode v1 removal and final verification

At the user's request, the Homebrew OpenCode 1.18.2 installation and the old pnpm OpenCode 1.2.26 installation were removed. Stale pnpm 1.2.21 package directories, v1 launchers, and OpenCode entries in the legacy global package metadata were also removed. The seven unrelated packages in that global directory were retained.

The retained executable is OpenCode v2.2.5 in ~/.opencode/bin. The /usr/local/bin/opencode entry points to that same executable so noninteractive shells also resolve v2. Login shells tested from the home directory, /tmp, and the Fitloom repository all reported v2.2.5, as did an interactive shell. Homebrew reports no installed OpenCode formula, and no old pnpm OpenCode package or launcher remains.

A real request to opencode-go/deepseek-v4.1-flash through the retained v2 CLI completed with exit zero and an assistant response. Shared configuration, sessions, and the repaired Go connection remain available. The completed DeepSeek review and all fourteen finding dispositions were checked against the revised plan; no duplicate review was needed.
