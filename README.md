# Fitloom

Fitloom is an internal tailoring and shop management application. This repository currently contains the runnable project foundation. Business features follow the [implementation roadmap](docs/product/roadmap.md).

Track current work in [Implementation status](docs/implementation/status.md). Read [docs/README.md](docs/README.md) for requirements and architecture.

Development and testing currently run locally. Server infrastructure, deployment platforms, host schedulers, and server backup automation are managed separately by the user. They are not implementation work in this repository. Notify the user to plan that environment after phase 3 works locally; assess the first deployment candidate after phase 4. See the [deployment readiness checkpoint](docs/product/roadmap.md#deployment-readiness-and-external-handoff). Application development does not wait for a VPS.

## Run locally with Docker Compose

On the MacBook, start Docker Desktop and Tailscale, then run:

```sh
pnpm dev
```

The complete development stack runs in Docker Compose with fixed non-default ports, persistent volumes, health checks, and background hot reload. Node.js 26.13.0 and pnpm 12.16.1 drive the host startup command; application dependencies run inside the pinned Linux image.

Open [Fitloom](https://nishanths-macbook-pro.tail30fb6a.ts.net:24443/account) from Windows or the Mac. Development emails appear in [Mailpit](https://nishanths-macbook-pro.tail30fb6a.ts.net:24444/). Register, open the verification email, then sign in. Continue to `/workspaces` to resume setup or open an authorized shop.

| Command | Result |
| --- | --- |
| `pnpm dev` | Build, migrate, start Compose, configure Tailscale, and enable background Watch |
| `pnpm dev:status` | Check service health and the watcher |
| `pnpm dev:logs` | Follow web and worker logs |
| `pnpm dev:down` | Stop services and watcher while preserving data |
| `pnpm test` | Run database and application tests in the tools container |
| `pnpm validate` | Run all tests, lint, types, production build, and HTTP/Mailpit checks in tools |
| `pnpm db:migrate` | Apply current reviewed forward migrations |
| `pnpm dev:account` | Prepare the verified development demo owner |
| `pnpm verify:recovery` | Rehearse an isolated matched database/private-object restore |
| `pnpm verify:resources` | Record local container and connection observations |

See [local Compose setup](docs/operations/local-development.md) for every port, credentials, hot reload, data preservation, and recovery. [Identity policy](docs/architecture/authentication.md) and [workspace contracts](docs/architecture/workspaces.md) describe product behavior. Development and tests use Mailpit only; production uses Resend. See [durable workers and provider inbox](docs/architecture/jobs-and-inbox.md) for background processing and protected diagnostics, and [private files and operator recovery](docs/operations/private-files-and-operator-recovery.md) for SeaweedFS and administrative procedures.

Phase 1B is locally complete. [Foundation operations](docs/operations/foundation-operations.md) records protected status, limits, failure recovery, restore verification, and remaining provider/environment responsibilities. Phase 2 customers, garment masters and measurements are also complete locally; see [final acceptance](docs/implementation/evidence/phase-2-build-3-increment-8.md) and the [measurement capture/media handoff](docs/architecture/measurements.md). Continue with phase 3 orders, pricing, manually recorded payments and documents. Subscriptions, platform billing, and payment-provider integrations are deferred until explicitly reopened. Shop advances, partial collections, balances, receipts, refunds, and other business payments remain required and will be recorded manually in their owning phases.

## Workspace

| Directory | Owns |
| --- | --- |
| `apps/web` | Next.js routes and product interfaces |
| `apps/worker` | Node worker entry point and lifecycle |
| `packages/application` | Command execution, identity/MFA, workspace commands, mail, audit/outbox, decimal policies, and journal contracts |
| `packages/db` | Database schemas, migrations, runtime roles, and scoped transaction helpers |
| `docs` | Product requirements, architecture, and implementation roadmap |

Internal packages use `workspace:*` dependencies. Application and database server entry points export compiled Node modules. The application package also exposes browser-safe schemas through `@fitloom/application/workspace-contracts`. Turborepo builds dependencies before consumers. The root owns the lockfile, TypeScript defaults, and Biome rules.

Stable direct dependencies were checked against the npm registry on 2026-10-31. The scaffold uses Next.js 16.4.3, React 19.3.1, Tailwind CSS 4.3.3, TypeScript 7.0.2, Turborepo 2.11.10, Biome 2.6.4, and Pino 10.4.0. Exact versions and transitive resolutions live in the manifests and lockfile.

## Bootstrap references

The project was generated with the official CLIs, then adapted to the Fitloom structure:

```sh
pnpm dlx create-turbo@2.11.10 . --example with-shell-commands --package-manager pnpm --skip-install --no-git
pnpm dlx create-next-app@16.4.3 apps/web --typescript --tailwind --biome --app --src-dir --import-alias '@/*' --use-pnpm --skip-install --disable-git --no-agents-md --no-agent-feedback --no-react-compiler --no-cache-components --empty --yes
pnpm init --bare --init-type module --no-init-package-manager
pnpm exec biome init
pnpm exec tsc --init
```

`pnpm init` was run inside each worker/shared package directory. These commands record the initial generation; use the local setup commands above for this existing checkout.

Official references: [create-turbo](https://turborepo.dev/docs/reference/create-turbo), [Turborepo tasks](https://turborepo.dev/docs/crafting-your-repository/configuring-tasks), [pnpm workspaces](https://pnpm.io/workspaces), [create-next-app](https://nextjs.org/docs/app/api-reference/cli/create-next-app), [Tailwind CSS with Next.js](https://tailwindcss.com/docs/installation/framework-guides/nextjs), [Biome setup](https://biomejs.dev/installation/quick-start/), [TypeScript configuration](https://www.typescriptlang.org/tsconfig/), [Node.js TypeScript execution](https://nodejs.org/api/typescript.html), and [Pino API](https://github.com/pinojs/pino/blob/main/docs/api.md).
