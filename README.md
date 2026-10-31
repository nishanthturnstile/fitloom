# Fitloom

Fitloom is a tailoring and shop management application. This repository currently contains the runnable project foundation. Business features follow the [implementation roadmap](docs/roadmap.md).

Track current work in [IN_PROGRESS.md](IN_PROGRESS.md). Read [docs/README.md](docs/README.md) for requirements and architecture.

## Run locally

Use Node.js 26.13.0 and pnpm 12.16.1. `.node-version` and `.nvmrc` pin Node; `package.json` pins pnpm. Install the pinned pnpm version with `npm install --global pnpm@12.16.1` if needed.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open http://localhost:3000. The worker logs its startup and waits for shutdown. Job handlers and database connections arrive in roadmap 1B.

To use the pinned tools without changing an older global installation, prefix commands with `npx --yes --package=node@26.13.0 --package=pnpm@12.16.1 --`. For example:

```sh
npx --yes --package=node@26.13.0 --package=pnpm@12.16.1 -- pnpm dev
```

Optional worker configuration goes in `apps/worker/.env.local`, copied from its `.env.example`. Next.js reads web configuration from `apps/web/.env.local`. No credentials are required for the scaffold.

| Command | Result |
| --- | --- |
| `pnpm dev` | Run the web app, worker, and shared package watchers |
| `pnpm dev:web` | Run the web app after building its shared dependencies |
| `pnpm dev:worker` | Run the worker after building its shared dependencies |
| `pnpm build` | Build packages in dependency order, then both applications |
| `pnpm start` | Build as needed, then start the production web app and worker |
| `pnpm lint` | Check formatting, imports, and lint rules across code and configuration |
| `pnpm format` | Format code and configuration |
| `pnpm format:check` | Check formatting without writing files |
| `pnpm typecheck` | Generate Next.js route types and check every package |
| `pnpm check` | Run lint and type checks |

The single-app development commands build shared packages once. Use `pnpm dev` when editing shared code so their compiler watchers also run. Press Ctrl+C to stop the processes.

## Access over Tailscale

With `pnpm dev` running on this Mac, connected tailnet devices can open [Fitloom over HTTPS](https://nishanths-macbook-pro.tail30fb6a.ts.net:9443/). The Next.js development configuration allows this hostname.

The dedicated proxy runs in the background:

```sh
tailscale serve --bg --https=9443 http://127.0.0.1:3000
```

To remove this endpoint, run `tailscale serve --https=9443 off`. Existing Tailscale endpoints on other ports have their own configuration. See the [official Tailscale Serve reference](https://tailscale.com/docs/reference/tailscale-cli/serve).

## Workspace

| Directory | Owns |
| --- | --- |
| `apps/web` | Next.js routes and product interfaces |
| `apps/worker` | Node worker entry point and lifecycle |
| `packages/application` | Shared server commands and queries, currently an empty module |
| `packages/db` | Database schemas, migrations, and transaction helpers, currently an empty module |
| `docs` | Product requirements, architecture, and implementation roadmap |

Internal packages use `workspace:*` dependencies. Application and database packages export compiled Node modules; they have no browser runtime export. Turborepo builds dependencies before consumers. The root owns the lockfile, TypeScript defaults, and Biome rules.

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
