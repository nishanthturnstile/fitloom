# Run Fitloom with Docker Compose

The development stack runs on the MacBook. Windows reaches the application and captured email over Tailscale HTTPS. Next.js serves both the UI and API; the worker has no inbound HTTP port.

## Start and stop

With Docker Desktop and Tailscale running, execute from this checkout on the Mac:

```sh
pnpm dev
```

The command prepares private configuration, builds the pinned Linux image, starts Compose, waits for healthy dependencies and completed migrations, configures Tailscale Serve, and installs a background Compose Watch login service on macOS. The terminal can close after startup. Repeating the command preserves records and credentials.

| Command | Behavior |
| --- | --- |
| `pnpm dev` or `pnpm dev:up` | Build, migrate, start, wait for health, and enable background Watch |
| `pnpm dev:status` | Show all Compose services and the macOS watcher |
| `pnpm dev:logs` | Follow web and worker logs |
| `pnpm dev:down` | Stop the watcher and containers, preserving data volumes |
| `pnpm dev:watch` | Run Compose Watch in the foreground, useful on non-macOS hosts |
| `pnpm db:migrate` | Build current migration code and apply reviewed forward migrations |
| `pnpm test` | Run database and application tests inside an isolated tools container |
| `pnpm validate` | Run tests, lint, types, production build, and HTTP/worker/Mailpit checks in tools |
| `pnpm dev:account` | Create or validate the development demo owner through the real email and command flows |
| `pnpm verify:recovery` | Restore the isolated test database and matched private objects; verify integrity, permissions, and replay |
| `pnpm verify:resources` | Capture baseline and two-client HTTP container/connection observations |
| `pnpm operator:bootstrap` / `pnpm operator:recover-mfa` | Run restricted, audited administration inside the migration container; exact arguments in the operator guide |

The host needs Docker Compose with `develop.watch.include` support, Node.js 26.13.0, pnpm 12.16.1, and Tailscale. This Mac uses Docker Compose 5.6.1. Application processes and their Linux dependencies run inside Docker. Docker Desktop is configured to start at login. The login service rebuilds from the current checkout before it starts Watch, including after login or Docker recovery. It retries through launchd if Docker is temporarily unavailable. The login service uses `caffeinate -s` to keep the Mac awake on AC power while Watch runs; display sleep is unaffected. Battery operation and closing the lid can still suspend the Mac. Windows access requires the Mac to remain connected.

## Addresses and fixed ports

The current MacBook DNS name is `nishanths-macbook-pro.tail30fb6a.ts.net`.

| Service | Windows and Mac canonical address | Mac loopback / container port |
| --- | --- | --- |
| Fitloom UI and API | [Fitloom account](https://nishanths-macbook-pro.tail30fb6a.ts.net:24443/account) | `24410` |
| Development Mailpit UI and API | [Development Mailpit](https://nishanths-macbook-pro.tail30fb6a.ts.net:24444/) | `24420` |
| Development SMTP | Internal `mailpit:24421` | `24421` |
| Test Mailpit UI and API | Used by isolated test containers | `24422` |
| Test SMTP | Internal `mailpit-test:24423` | `24423` |
| SeaweedFS S3 | Mac loopback only; no Tailscale forward | `24453`; internal HTTP `24450`–`24452`, gRPC `34450`–`34453` |
| PostgreSQL | Internal `postgres:24430` | `24430` |
| Worker | No inbound port | None |
| Optimized-app test server | Inside tools only | `24411` |
| Isolated dependency-failure test server | Inside tools only | `24412` |

All Docker host ports bind to `127.0.0.1`. Tailscale Serve exposes only the application and development inbox to the tailnet. Database, SMTP, and test mail ports have no Tailscale forwards. Use the HTTPS application address on both machines to keep secure session cookies and email callbacks consistent. The loopback web URL is available for health checks; it is not a second login origin.

`pnpm dev` discovers the local Tailscale DNS name. On another host, it generates addresses from that host. `FITLOOM_APP_ORIGIN` and `FITLOOM_MAIL_ORIGIN` can override them when running startup. Auth origins, callbacks, secure cookies, allowed development origins, and the UI's Mailpit link derive from this configuration. These overrides belong to local development, not production policy.

The old Fitloom `:9443 -> :3000` forward and standalone host processes/containers were removed. Existing forwards for the coding application and other projects are outside Fitloom and remain available.

## Hot reload and rebuilds

Compose Watch syncs source into the web and worker containers. Container TypeScript watchers compile the shared database and application packages. Next.js Fast Refresh handles web changes; Node watch restarts the worker when its source or imported compiled modules change. Every consumer has its own Linux build outputs. Host `node_modules`, `dist`, `.next`, `.turbo`, environment files, credentials, and backups are excluded from the image and Watch.

Changing any workspace `package.json`, the lockfile, workspace dependency configuration, or `Dockerfile.dev` rebuilds and recreates the web and worker images. The pnpm store uses a BuildKit cache, and installation requires the frozen lockfile. Source edits do not reinstall dependencies. Dependency rebuilds briefly restart services.

After changing `compose.yaml` or generated environment configuration, run `pnpm dev` again. After adding a reviewed database migration, run `pnpm db:migrate`. Watch does not apply DDL while a migration file is being edited.

The macOS login service is `dev.fitloom.compose-watch`. Its generated plist is in `~/Library/LaunchAgents/`; logs are in `.local/watch.log`. `pnpm dev:down` unloads it. Restarting `pnpm dev` replaces the watcher, preventing duplicate synchronization processes. On non-macOS hosts, keep `pnpm dev:watch` running while editing.

## Data and credentials

Compose reuses these external named volumes:

- `fitloom-postgres-local`
- `fitloom-mailpit-local`
- `fitloom-mailpit-test`

The Compose-owned `fitloom_seaweed-data` volume persists private objects and embedded filer/master metadata. `fitloom_private-files` retains legacy local staging bytes; new uploads use SeaweedFS. Both persist across shutdown. Do not use `docker compose down --volumes` when retaining those bytes.

External volumes survive Compose shutdown. Existing development/test databases, verified accounts, settings, shops, and captured mail are retained. A private pre-conversion SQL backup is in `.local/backups/pre-compose.sql` on this Mac. This is a local migration snapshot, not a scheduled backup system.

`.local/` contains per-service environment files, the PostgreSQL password file, discovered addresses, watcher logs, and the validation-account credentials. Files use mode `0600`; the directory uses `0700`. Git and Docker builds exclude this directory. `packages/db/.env` retains host-side database URLs on the new fixed port and preserves existing random credentials and auth/mail secrets.

Bootstrap alone receives the cluster administrator credential. Migration receives the development migrator credential. Web receives separate web and auth credentials. Worker receives its runtime URL, mail configuration/encryption key, and private staging root, with no auth signing secret. Web alone receives a separate generated fixture verification key. Tools receives isolated test credentials. Runtime roles never initialize schemas or queue tables.

The demo account is an ordinary verified shop owner, with a `Fitloom Demo` workspace and no platform operator grant. `pnpm dev:account` prints its email and the private credential-file location. Its password is generated locally and preserved for repeated validation. It is development fixture data. Mailpit requires no separate login within the tailnet.

Existing verification links created before the port change point at the retired origin. Request a fresh verification or recovery email from the new account page. New messages link to the canonical HTTPS address and can be opened from Windows.

## Durable processing

The worker dispatches committed command intents, delivers mail, cleans registered abandoned staging files, and processes the signed development/test inbox fixture. Job state, fencing/recovery, protected diagnostics/retry APIs, fixture signing, queue retention, and Day 6 attachment boundaries are described in [durable workers and inbox](../architecture/jobs-and-inbox.md). Compose enables the fixture endpoint with a private generated key; production always disables it. No additional port is needed.

## Verify the running stack

Run `pnpm validate` for the complete container-based check. Tests reset only `fitloom_test` and synthetic objects in `fitloom-test`; development data remains separate. Test Mailpit and credentials are independent of the development inbox.

Run `node scripts/verify-hot-reload.mjs` on the Mac to check actual hot reload. The script temporarily changes web text, a shared application response, and worker source. It checks live HTTP responses and heartbeat process IDs, restores every file, and verifies that source synchronization did not recreate containers. Do not edit those files concurrently with this check. Successful image builds alone do not establish that live services loaded new code.

Container restart policies preserve service availability after crashes and Docker restarts. Each service has its own image tag, and tools runs use `--no-deps`, so validation cannot recreate live bootstrap/migration dependencies. Container logs rotate at 10 MiB with three files per service. Health checks cover PostgreSQL, both Mailpit instances, web plus its database connections, and a worker heartbeat written after successful queue processing. Bootstrap, migration, and storage initialization are successful one-shot services, so their normal status is `Exited (0)`.

This Compose file is for local development. External hosting, production backups, and Resend email delivery retain their roadmap requirements. Subscriptions, platform billing, and payment-provider integrations are deferred for the internal product. Shop payments remain manual business records. The existing production-mode workspace guard is unchanged by this documentation decision; internal deployment needs explicit internal-access wiring, not billing implementation.

## Official references

- [Docker Compose Watch](https://docs.docker.com/compose/how-tos/file-watch/) describes source sync, dependency rebuilds, and excluding host dependencies.
- [Compose Develop Specification](https://docs.docker.com/reference/compose-file/develop/) defines `initial_sync`, `include`, and watch actions.
- [Compose startup order](https://docs.docker.com/compose/how-tos/startup-order/) defines healthy and successfully completed dependencies.
- [pnpm with Docker](https://pnpm.io/docker) covers Linux dependency isolation and BuildKit cache mounts.
- [Next.js Fast Refresh](https://nextjs.org/docs/architecture/fast-refresh) describes application reload behavior.
- [Tailscale Serve](https://tailscale.com/docs/reference/tailscale-cli/serve) documents private HTTPS proxies and background persistence.
- [Mailpit runtime options](https://mailpit.axllent.org/docs/configuration/runtime-options/) define explicit SMTP and HTTP listeners.

Verified on 2026-11-01 with Docker Engine 29.9.2 and Compose 5.6.1. All five persistent services are healthy, bootstrap/migrations complete successfully, 12 database tests and 41 application tests pass, and lint, types, production build, HTTPS auth, and HTTP/Mailpit checks pass. Live source and dependency rebuild checks, automatic crash recovery, retained demo access after restart, and unchanged live service instances during tool validation were observed directly.

That paragraph records the original Compose conversion. Current Day 7 verification covers six persistent services, three successful one-shots, 23 migrations, 12 database and 65 application tests, and actual dependency-failure/worker-observation checks. [Foundation operations](foundation-operations.md) is the current runbook for status interpretation, runtime budgets, local restore rehearsal, resource evidence, and external responsibilities.

To run the setup browser regression on the Mac, prepare the demo account with `pnpm dev:account`, install the browser driver separately with `npm install --prefix /tmp/fitloom-browser-check playwright@1.64.1`, then run `node scripts/verify-setup.mjs /tmp/fitloom-browser-check/node_modules/playwright/index.mjs`. Google Chrome must be installed. The check uses only the demo account and creates a uniquely named test shop. It verifies visible actions, validation, partial-draft resume, recovery from a provisioning error, busy states, and creating directly from unsaved details.

Day 6 adds the `seaweedfs` service and successful one-shot `storage-init`, with a pinned image, private persistent data, separate environment/service credentials, and no storage forward through Tailscale. See [private files, operator commands, bootstrap, and recovery](private-files-and-operator-recovery.md). `pnpm validate` clears the guarded test bucket before resetting test schemas; it cannot delete development objects.

Storage readiness includes actual write/read/delete probes in both buckets before application startup. Local SeaweedFS grows one volume at a time; settings live in `config/seaweedfs/master.toml`. Restart SeaweedFS after changing that file or its generated credential configuration. `node scripts/verify-private-files.mjs` exercises the existing demo workspace through HTTPS and can be repeated after a storage restart to verify its image digest.
