# Fitloom web

Next.js App Router application for the shop, worker, customer, public, and operator interfaces. The scaffold currently renders the Fitloom heading.

Run `pnpm dev:web` from the repository root. See the [root README](../../README.md) for setup and commands.

Keep credentials and server commands out of client components. Server commands belong in `@fitloom/application`; database ownership belongs in `@fitloom/db`.
