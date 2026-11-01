# Fitloom web

This guide covers `apps/web/`. Run project commands from the repository root unless a command specifies another directory.

Next.js App Router application. `/account` provides registration, verified email sign-in, resend, recovery/reset, authenticator enrollment/challenges, backup-code login, and logout. Protected session and operator-admission endpoints use the shared identity service.

Run `pnpm dev` from the repository root. Compose starts web, worker, PostgreSQL, and isolated development/test Mailpit services. Open [Fitloom](https://nishanths-macbook-pro.tail30fb6a.ts.net:24443/account) and [development Mailpit](https://nishanths-macbook-pro.tail30fb6a.ts.net:24444/) from Windows or the Mac. See [local Compose development](../operations/local-development.md) for hot reload and every port.

See [identity and mail configuration](../architecture/authentication.md) for local setup, session/MFA policy, trusted origins, Resend production configuration, and exact verification commands. See [setup and workspace contracts](../architecture/workspaces.md) for `/setup`, authorized shop/location selection, profiles, role administration, and verified staff invitations.

Server configuration and credentials stay in `src/server/` and the shared Node application package. Client components import only browser-safe workspace schemas and types. `WEB_DATABASE_URL` belongs to the web runtime and is separate from `AUTH_DATABASE_URL`. Request logging is disabled because verification and reset URLs carry secret tokens.

[Durable workers and provider inbox](../architecture/jobs-and-inbox.md) documents protected workspace/operator job endpoints and the development-only signed fixture endpoint. Operator access requires an explicit grant and recent MFA; ordinary owners cannot access global service jobs.

Day 6 adds the authorized **Private files** workspace panel, JPEG/PNG staging/attachment/retirement, private download streams, and strict operator tenant/command APIs. [SeaweedFS and operator recovery](../operations/private-files-and-operator-recovery.md) documents limits, authority, replay, and restricted administrative CLI procedures.

Day 7 adds recent-MFA `jobs.manage` status at `/api/operator/status`, safe command/operator diagnostics controlled by `LOG_LEVEL`, and scoped pagination with continuation in workspace/team/file interfaces. [Foundation operations](../operations/foundation-operations.md) defines truthful outage responses and the limits of observation.
