# Fitloom development documents

Read the documents in this order:

| Document | Purpose |
| --- | --- |
| [Implementation status](../IN_PROGRESS.md) | High-level work areas, status, and next steps |
| [Product requirements](requirements.md) | Scope, workflows, acceptance criteria, shared guarantees, and remaining business decisions |
| [Architecture](architecture.md) | Selected stack/libraries, module ownership, data contracts, Linux setup, backups, and server migration |
| [Implementation roadmap](roadmap.md) | Dependency order, phase deliverables, implementation steps, and requirement ownership |

The current development/testing target is one OVHcloud VPS-3 with 6 vCores, 12 GB RAM, and 100 GB NVMe. Ansible configures Linux, SSH, firewall, Docker, and host tasks. Compose defines the application services, networks, ports, and storage. The pnpm/Turborepo workspace and official Next.js scaffold are implemented. Phase 1 continues with application foundations, then deployment. Each later phase extends that retained application. Resolve issues as they arise; no trial workspace or preliminary validation stage is planned. Production capacity and availability decisions come later.

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
