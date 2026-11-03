# Build Two increments 0–1 implementation review

Reviewed the working tree against the plan's baseline, 3cdd9cf. Two independent read-only reviews covered the completed increments. Planned increments 2–5 were excluded from missing-work findings.

## Standards

One confirmed P2 defect: request-budget admission locked the current minute's row while counting leases across two minute buckets. An uncommitted previous-minute admission could remain invisible to the new bucket. A rollback-only real PostgreSQL reproduction acquired two old-bucket tokens and a third new-bucket token, all distinct, before either transaction committed.

Migration 0036 adds a principal/tenant/location advisory mutex before capturing the minute and counting leases. Contention returns FC006/429. The existing budget scenario now holds that mutex on another connection and verifies rejection, then retains the two-lease and shared-counter checks. No new standalone integration case was added.

No additional confirmed authorization, tenant-isolation, replay-ownership or expiry-cleanup defect was found. Optional style refactors were not required.

## Spec

One confirmed P2 defect: duplicate review projection validated a candidate fingerprint, then read summaries in a separate READ COMMITTED statement. Concurrent edits could make the returned summaries disagree with the validated candidate state. Fresh mutation still rechecked the challenge, so this did not authorize an invalid save.

Migration 0036 computes the fingerprint and bounded summaries from one materialized statement snapshot. Existing fresh/stale review and duplicate-save checks pass through the replacement function. The migration changes functions only, preserving the previous retained migrations and runtime grants.

No further completed-increment gap was confirmed. The earlier local Chrome evidence establishes its stated browser scope; customer screens, return state and navigation were correctly assigned to later increments.

Standards: one P2 limiter defect, fixed. Spec: one P2 projection-consistency defect, fixed. See [Increment 2 evidence](../evidence/phase-2-build-2-increment-2.md) for subsequent validation and implementation.
