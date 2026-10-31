# Fitloom worker

Node.js worker compiled with TypeScript for production. Development uses Node's built-in TypeScript support and watch mode.

Run `pnpm dev:worker` from the repository root. The scaffold logs startup, stays idle, and stops on SIGINT or SIGTERM. It does not connect to PostgreSQL or process jobs yet. Durable queue handlers arrive in roadmap 1B.

Copy `.env.example` to `.env.local` to set `LOG_LEVEL`. See the [root README](../../README.md) for workspace commands.
