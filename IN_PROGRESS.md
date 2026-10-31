# Fitloom implementation status

Update this table when work starts, changes status, or finishes. Keep one row per high-level work area.

Statuses: Planned, In progress, Blocked, Deferred, Done. Deferred work is intentionally outside the current development sequence.

| Work area | Status | Next step |
| --- | --- | --- |
| Workspace and project structure | Done | Start local database, identity, and SaaS foundations in roadmap 1B |
| Database, identity, and SaaS foundations | Planned | Detailed 1B plan ready; implement and verify locally next |
| External infrastructure, deployment, and host backups | Deferred | User owns separate setup. Remind after locally verified phase 3; assess first deployment readiness after phase 4 |
| Subscriptions and billing | Planned | Follow local application foundations, roadmap 1D; deployment is not a prerequisite |
| Customers and measurements | Planned | Roadmap phase 2 |
| Orders, pricing, collections, and documents | Planned | Roadmap phase 3 |
| Production, trials, delivery, and daily control | Planned | Roadmap phase 4 |
| Workshop and workforce finance | Planned | Roadmap phase 5 |
| Materials, stock, and procurement | Planned | Roadmap phase 6 |
| Boutique retail and multiple locations | Planned | Roadmap phase 7 |
| Customer portal, booking, and sharing | Planned | Roadmap phase 8 |
| Insights, engagement, and operator tools | Planned | Roadmap phase 9 |

Detailed scope and dependencies stay in [the roadmap](docs/roadmap.md).

Decision recorded on 2026-10-31: develop and test on the local machine. Linux provisioning, deployment dashboards, host schedulers, server backup automation, and VPS migration belong to the user's separate infrastructure work. Fitloom retains application jobs, business scheduling, runtime configuration, migrations, and application recovery requirements. No infrastructure or deployment tooling is scheduled for implementation in this repository. The current documentation and plan are ready; 1B application implementation has not started.

After phase 3 works locally, notify the user to plan that external environment. After phase 4 completes the locally verified tailoring workflow, report a first deployment candidate. Continue local development until the user is ready. Before real users or remote deployment, verify the external environment, backups, and deployment-specific behavior together. These are milestone reminders, not configured scheduled notifications.

Workspace verified on 2026-10-31: frozen install, lint, types, build, development and production web startup, shared package imports, and worker shutdown.
