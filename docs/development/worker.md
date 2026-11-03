# Fitloom worker

This guide covers `apps/worker/`. Run project commands from the repository root unless a command specifies another directory.

The Node worker delivers encrypted identity/invitation mail, dispatches committed command intents, processes signed inbox fixtures, and removes abandoned staging files. Development/test mail goes only to Mailpit; production requires Resend SMTP. No billing provider is installed.

Run `pnpm dev` from the repository root. Compose starts the stack and background source synchronization. The worker uses its own database role, a private staging volume, and the shared mail encryption key. It receives no auth signing secret, inbox verification secret, or migration credential.

One mail and one foundation handler run concurrently. Persistent attempts, bounded retries, safe errors, 60-second fenced foundation leases, crash recovery, and protected retry APIs live in the application/database packages. Runtime queue access uses migration-owned narrow SQL functions against the pinned pg-boss storage; the SDK worker/supervisor is not started. SIGINT/SIGTERM stop new iterations and drain for at most 25 seconds. A heartbeat advances after successful processing.

See [worker/inbox contracts and verification](../architecture/jobs-and-inbox.md), [local Compose operations](../operations/local-development.md), and [identity policy](../architecture/authentication.md).

Day 6 extends cleanup to unreferenced SeaweedFS objects under PostgreSQL metadata locks. The worker has bucket-scoped write/delete credentials and cannot read private objects. Legacy local staging remains separate. [File lifecycle and cleanup](../operations/private-files-and-operator-recovery.md) covers grace periods, references, atomicity, and storage recovery boundaries.

Day 7 persists a database observation after successful iterations, throttled to five seconds. Status becomes stale after thirty seconds without an observation. Job/mail logs retain safe identities, elapsed time, attempts, outcomes, and categories. SMTP acceptance followed by uncertain settlement is explicit. The drain deadline remains active through pool shutdown. See [foundation operations](../operations/foundation-operations.md).
