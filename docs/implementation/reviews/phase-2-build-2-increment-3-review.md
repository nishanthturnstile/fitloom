# Build Two Increment 3 implementation review

Two independent read-only reviews checked the uncommitted Increment 3 implementation against baseline `3cdd9cf`, the customer plan and repository standards. Later increments were excluded from missing-work findings.

## Standards

Two P2 findings, fixed:

- Controlled optional fields trimmed on every change. Typing spaces or trailing newlines in address, notes and preferences removed them immediately. Drafts now preserve raw strings; save preparation normalizes optional blank values before schema validation.
- A denied retry replaced uncertain state with a blocked state that discarded its pending envelope. The denied retry did not establish whether the original request committed. Blocked state now retains the exact envelope and uncertain navigation protection; recovery requires an explicit retry after access is restored.

## Spec

Two P2 findings, fixed:

- The same optional-text typing defect violated input preservation and multiline-note behavior.
- Advisory phone checks silently ignored typed permission/session denials. They now block further form work and cancel advisory work. An existing unresolved operation remains recoverable.

Three distinct defects were fixed. The existing customer browser journey now types spaces/newlines character by character, loses a committed update response, denies its first retry, then checks recovery with the identical envelope. It also verifies an advisory denial disables the form. No standalone Node test or additional test server was added.

Standards: two P2 findings. Spec: two P2 findings, one shared with Standards. See [Increment 4 evidence](../evidence/phase-2-build-2-increment-4.md) for runtime acceptance.
