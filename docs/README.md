# Fitloom development documents

Read the documents in this order:

| Document | Purpose |
| --- | --- |
| [Implementation status](../IN_PROGRESS.md) | High-level work areas, status, and next steps |
| [Product requirements](requirements.md) | Scope, workflows, acceptance criteria, shared guarantees, and remaining business decisions |
| [Architecture](architecture.md) | Selected stack/libraries, module ownership, data contracts, local development, and the external deployment boundary |
| [Implementation roadmap](roadmap.md) | Dependency order, phase deliverables, implementation steps, and requirement ownership |
| [Phase 1B implementation plan](phase-1b-implementation-plan.md) | Seven-day foundation sequence, implementation contracts, acceptance checks, dependencies, and official references |

Development and testing currently run on the local machine. The pnpm/Turborepo workspace and official Next.js scaffold are implemented. Continue with local application foundations, subscriptions, and business features. Linux setup, deployment platforms, host schedulers, server backups, and VPS migration are user-managed work outside this repository. Roadmap 1C records a deferred external handoff and does not block 1D or later application development.

Notify the user to plan the external environment after phase 3 works locally. Assess the first deployment candidate after phase 4 completes the locally verified tailoring workflow. Development can continue locally beyond that point. A future server needs its own deployment and recovery verification before remote or real-data use. See the [deployment readiness checkpoint](roadmap.md#deployment-readiness-and-external-handoff).

## Required references

| Reference | Why it stays |
| --- | --- |
| [Source feature details](references/source_feature_details.md) | Normative scope appendix with detailed source behavior mapped to the 64 canonical requirements |
| [Frozen reference baseline](references/reference_baseline.json) | Preserves 860 original entries, 17 configuration/schema/API references, and 15 reports/findings for traceability |

The canonical requirements and architecture resolve conflicting source behavior. The references preserve evidence and limitations; they do not establish successful writes, backend authorization, or implemented Fitloom capabilities.

## Archived work

Completed research plans, findings, the final review, and one-time verification records are archived outside the project. Their selected decisions and useful primary-source links are incorporated in the documents above. The complete pre-cleanup snapshot and SHA-256 manifest are at:

```text
/Users/nishanth/Archives/fitloom/predevelopment-cleanup-20261031-123004-194756
```

The archive also retains the earlier archive locations and provenance notes. It is optional historical material, not a development dependency. No application or infrastructure deployment is implied by these documents.
