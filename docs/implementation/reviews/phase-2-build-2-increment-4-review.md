# Build Two Increment 4 implementation review

Two independent read-only reviews checked the uncommitted Increment 4 implementation against baseline `3cdd9cf`, the customer plan and repository standards. Increment 5 features were excluded from missing-work findings.

## Standards

One P2 defect, fixed. Wearer preference errors retained paths such as `preferences.fit`, but the draft control is `wearer-fit`. Focus, summary links and inline error matching consequently missed the textarea. The controller now maps schema preference paths to draft/control keys before rendering errors or focusing them.

## Spec

Two P2 defects, fixed:

- The same preference-path defect violated preserved-input, linked-error and first-error focus requirements.
- No-op saves ignored `changed:false` and announced a changed save. Customer/wearer outcomes now distinguish No changes to save from Changes saved.

The existing wearer journey now submits an overlong preference and verifies focus/aria-invalid, then corrects it. It also saves an unchanged wearer and checks the no-op announcement. These assertions reuse the existing fixture and do not add a Node test case.

Standards: one P2 finding. Spec: two P2 findings, one shared with Standards. See [Increment 5 evidence](../evidence/phase-2-build-2-increment-5.md) for final runtime acceptance.
