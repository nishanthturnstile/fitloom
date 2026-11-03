# Fitloom documentation

Start with the [implementation status](implementation/status.md), then read the [roadmap](product/roadmap.md). Phase 1B and phase 2 Build One garment masters and Build Two customers are complete locally. Next is Build Three measurements. Phase 3 adds orders and manually recorded shop payments. Subscriptions, platform billing, and payment-provider integrations are deferred until explicitly reopened.

The first phase 2 build is specified in the [garment masters implementation plan](implementation/plans/phase-2-build-1-garment-masters.md), with its [research evidence](implementation/research/build-one/technical-findings.md), [plan review record](implementation/reviews/phase-2-build-1-garment-masters-review.md), [implementation review record](implementation/reviews/phase-2-build-1-implementation-review.md), and [final acceptance evidence](implementation/evidence/phase-2-build-1-increment-6.md).

## Folder structure

```text
docs/
  README.md
  product/
  architecture/
  implementation/
    status.md
    plans/
  operations/
  development/
  references/
```

| Folder | Contents |
| --- | --- |
| `product/` | Product requirements, scope decisions, and the implementation roadmap |
| `architecture/` | System design, ownership, authentication, workspace, and background-work contracts |
| `implementation/` | Current status, implementation plans, reviews, and phase verification records |
| `operations/` | Local setup, runtime limits, diagnostics, recovery, and operating procedures |
| `development/` | Guides for the web app, worker, shared application package, and database package |
| `references/` | Extracted source evidence and the frozen reference baseline |

## Product and architecture

| Document | Purpose |
| --- | --- |
| [Product requirements](product/requirements.md) | Canonical scope, workflows, acceptance criteria, and remaining business decisions |
| [Implementation roadmap](product/roadmap.md) | Dependency order, phase deliverables, and requirement ownership |
| [Architecture](architecture/overview.md) | Selected stack, module ownership, data contracts, and deployment boundary |
| [Identity, email, and operator MFA](architecture/authentication.md) | Identity policy, local Mailpit, production Resend configuration, and sessions |
| [Setup and authorized workspaces](architecture/workspaces.md) | Resumable setup, roles, delegation, invitations, projections, and access wiring |
| [Durable workers and provider inbox](architecture/jobs-and-inbox.md) | Transactional dispatch, leases, retries, cancellation, and signed fixtures |

## Implementation

| Document | Purpose |
| --- | --- |
| [Implementation status](implementation/status.md) | Work areas, completion evidence, current scope decisions, and next steps |
| [Phase 1B implementation plan](implementation/plans/phase-1b-implementation-plan.md) | Retained seven-day foundation plan, acceptance checks, and completion criteria |
| [UI foundation v3 implementation plan](implementation/plans/ui-foundation-v3-implementation-plan.md) | Planned redesign increments, route and component ownership, mockup data mapping, and acceptance checks |
| [Phase 2 Build Two customer implementation plan](implementation/plans/phase-2-build-2-customers.md) | Customer and wearer scope, progressive screens, navigation repairs, storage/permission contracts, implementation increments, and full workflow validation |
| [Build Two increment 0 evidence](implementation/evidence/phase-2-build-2-increment-0.md) | Home readiness, runtime baseline checks, regression results, and remaining customer increments |
| [Build Two increment 1 authority](implementation/evidence/phase-2-build-2-increment-1.md) | Runtime recovery, customer contracts, restricted reads, atomic saves, duplicate/replay protocol, bounded activity and acceptance |
| [Build Two increment 2 register/navigation](implementation/evidence/phase-2-build-2-increment-2.md) | Search/count/paging, read-only profile entry, private return state, safe switching, forward migration, and Chrome acceptance |
| [Build Two increments 0 and 1 implementation review](implementation/reviews/phase-2-build-2-increments-0-1-review.md) | Confirmed limiter/projection defects, fixes, and verification |
| [Build Two increment 3 customer forms](implementation/evidence/phase-2-build-2-increment-3.md) | Shared create/edit controller, atomic self wearer, duplicate decisions, exact-envelope retry, and acceptance results |
| [Build Two increment 2 review](implementation/reviews/phase-2-build-2-increment-2-review.md) | Standards/spec review before customer forms and stale-status correction |
| [Build Two increment 4 wearers/lifecycle](implementation/evidence/phase-2-build-2-increment-4.md) | Profile sections, wearer sheets, lifecycle invariants, continuation and runtime evidence |
| [Build Two increment 3 review](implementation/reviews/phase-2-build-2-increment-3-review.md) | Typed whitespace, unresolved replay retention and advisory-denial fixes |
| [Build Two increment 5 photos/handoff](implementation/evidence/phase-2-build-2-increment-5.md) | Private file purposes, avatar/face/body workflows, security/cleanup, full acceptance and measurement handoff |
| [Build Two increment 4 review](implementation/reviews/phase-2-build-2-increment-4-review.md) | Nested preference errors and no-op announcement fixes |
| [Build Two customer plan review](implementation/reviews/phase-2-build-2-customers-review.md) | DeepSeek 4.1 Flash review dispositions, links to original findings, and planning verification limits |

## Operations

| Document | Purpose |
| --- | --- |
| [Local Docker Compose development](operations/local-development.md) | Fixed ports, Tailscale access, hot reload, persistent data, and validation |
| [Foundation operations and verification](operations/foundation-operations.md) | Status, diagnostics, limits, pagination, recovery evidence, and remaining dependencies |
| [Private files and operator recovery](operations/private-files-and-operator-recovery.md) | SeaweedFS lifecycle, file permissions, operator commands, bootstrap, and MFA recovery |

## Development guides

| Document | Owner |
| --- | --- |
| [Web application](development/web.md) | `apps/web/` |
| [Worker](development/worker.md) | `apps/worker/` |
| [Shared application package](development/application.md) | `packages/application/` |
| [Database package](development/database.md) | `packages/db/` |

## References

| Document | Purpose |
| --- | --- |
| [Source feature details](references/source_feature_details.md) | Normative scope appendix mapping extracted source behavior to 64 canonical requirements |
| [Frozen reference baseline](references/reference_baseline.json) | Original 860 entries, 17 configuration/schema/API references, and 15 reports/findings |

Canonical requirements and architecture resolve conflicts with source behavior. Reference mappings preserve provenance; they do not establish implemented capabilities or override explicitly deferred scope. Preserve the frozen baseline when changing current product decisions.

## Place new documents

Keep project documentation inside `docs/`. Put each document in the folder matching its purpose. Add a link to this index when creating a document.

- Put implementation plans in `implementation/plans/`, for example `phase-2-implementation-plan.md`.
- Update `implementation/status.md` as work starts, changes scope, or finishes.
- Put phase review and verification records under `implementation/`. Keep reusable operating procedures in `operations/`.
- Keep detailed module documentation in `development/`. Root and package READMEs remain entry points linking to the central documentation.
- Use relative Markdown links and update incoming links when moving a document.
- Keep source code, migrations, tests, and runnable scripts in their owning application/package directories.

Development and testing run locally. External infrastructure, deployment, host scheduling, and server backups belong to the user's separate environment work. Notify the user after locally verified phase 3 and assess the first deployment candidate after phase 4. Neither the external handoff nor deferred subscription work blocks internal business development. See the [deployment readiness checkpoint](product/roadmap.md#deployment-readiness-and-external-handoff).

## Historical archive

Completed research plans, findings, the final review, and one-time records archived before development remain outside the project. Their selected decisions and primary-source links are incorporated above. The pre-cleanup snapshot and SHA-256 manifest are at:

```text
/Users/nishanth/Archives/fitloom/predevelopment-cleanup-20261031-123004-194756
```

That archive is optional historical material, not a development dependency. New implementation documentation belongs in the structure above.
