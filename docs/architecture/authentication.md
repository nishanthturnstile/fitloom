# Identity, email, and operator MFA

Day 3 provides verified email/password identity, database sessions, account recovery, and operator MFA admission. Development and tests use Mailpit only. Production configuration requires Resend SMTP. No production email has been sent or verified by this implementation.

## Run the local flow

Start the complete development stack on the Mac with `pnpm dev`. Read [local Compose development](../operations/local-development.md) for setup, fixed ports, Tailscale access, credentials, and checks.

Open [the account page](https://nishanths-macbook-pro.tail30fb6a.ts.net:24443/account) from Windows or the Mac. After registration, open the message in [development Mailpit](https://nishanths-macbook-pro.tail30fb6a.ts.net:24444/) and follow its verification link. Mailpit does not forward messages to real inboxes. Verification does not sign the user in automatically.

Registration and unverified sign-in show a verification step, resend, and a development-only inbox link. Successful verification returns a confirmation message. The return-page query flag controls that message only; protected access still requires the current verified database identity. Reset links open `/account/reset`; password reset requires signing in again. Links created before the Compose port change need a fresh resend.

Compose separates development and test databases, runtime credentials, signing/encryption keys, SMTP ports, and inboxes. Only the development UI and inbox receive Tailscale HTTPS proxies. The database and SMTP listeners bind to Mac loopback and the private Compose network. Production pages do not expose Mailpit.

## HTTP and server interfaces

| Entry point | Contract |
| --- | --- |
| `/account` | Registration, sign-in, resend, recovery, authenticator enrollment/challenge, backup-code login, and logout |
| `/account/reset` | Password reset from the emailed token |
| `/api/auth/[...all]` | Allowlisted Better Auth routes, wrapped by application admission and an auth transaction |
| `/api/session` | Current principal, name, email, and verification projection. No session token or credentials. |
| `/api/operator/session` | Requires the explicit `operator.access` grant and current session-bound MFA proof |
| `createIdentityService().identity(headers)` | Resolves a current verified database session and an active application principal |
| `requireOperator(headers, permission)` | Adds explicit platform permission, enrolled MFA, session freshness, and recent challenge checks |

The application service does not export Better Auth's unguarded `auth.api` object. Internal session reads use it behind the service. Public auth calls go through `handle`, which enforces origin, callback, body-size, and persistent rate admission. Future protected routes and command resolvers must call the identity service on every request.

Registration maps the auth user uniquely to a principal inside the auth transaction. A missing mapping is repaired idempotently from a current authenticated user, preserving an existing principal's disabled status. A disabled principal cannot use protected identity or operator paths. No registration endpoint grants platform authority.

Shop provisioning still uses the shared command executor and checks current verified status. Day 4 supplies [resumable setup and verified staff invitations](workspaces.md). Day 6 owns operator bootstrap and recovery commands; there is no default operator account or password.

## Transaction and email guarantees

`withDatabaseTransaction` acquires one client, installs a connection-error listener, and gives the auth adapter a real Drizzle transaction. The adapter's nested transactions therefore use savepoints on that client. Auth changes, principal mapping, verification/reset token state, and encrypted email intent use the same transaction. A failed email callback sets an explicit failure flag because the installed library can otherwise catch callback failures. The wrapper rejects the request and rolls back. A final SQL statement rejects an aborted transaction before commit.

Real PostgreSQL tests inject failures into email-intent insertion. Registration then leaves no auth user or principal, and password-reset requests leave no new reset token. This is an atomic local contract, not a claim based on a separate enqueue in a lifecycle hook. No asynchronous background-task hook is configured for these callbacks.

Better Auth 1.7.14 uses signed JWTs for email verification. Fitloom retains a SHA-256 token hash and expiry, locks the corresponding record before verification, and consumes it once after success. Unknown, expired, or reused verification links fail. Password-reset tokens use the installed adapter's transactional consume mechanism. Consuming or deleting a recovery token also clears any queued recovery payload.

Mail intents contain AES-256-GCM encrypted recipient/link data, using a purpose-derived key from `MAIL_ENCRYPTION_KEY`. The worker receives that key and its own database login, never `AUTH_SECRET` or migration credentials. Payloads are removed after SMTP acceptance, terminal failure, expiry, or consumption. Audit records and logs contain no links, tokens, passwords, MFA secrets, or SMTP diagnostics. Auth routes set `no-store` and `no-referrer`; Next.js incoming-request logging is disabled to keep link query strings out of logs. External access logs must follow the same rule when hosting is configured.

The minimal worker claims one intent at a time with `FOR UPDATE SKIP LOCKED`, persists an attempt before sending, and records safe outcomes. SMTP failures retry at most five times with delays of 5, 10, 20, and 40 seconds. A running attempt abandoned for two minutes becomes recoverable; an abandoned fifth attempt becomes failed. Expired/consumed work is discarded. Delivery attempts and terminal error categories remain queryable:

```sh
pnpm --filter @fitloom/application mail:status
```

That diagnostic prints bounded IDs, kind, state, attempt count, safe error category, and creation time. It excludes recipient and token material. A terminal failure requires a fresh verification/recovery request to generate fresh work.

A provider acceptance followed by a worker crash can cause an uncertain outcome. Stable Message-ID and `Resend-Idempotency-Key` values accompany retries. SMTP acceptance is not proof of recipient delivery, and generic SMTP does not provide exactly-once delivery. Day 5 adds broader durable-job dispatch, recovery, and outcomes; it does not need runtime DDL for this worker.

## Session and security policy

| Control | Current policy |
| --- | --- |
| Password length | 12–128 characters |
| Session lifetime | 8 hours |
| Session refresh interval | 1 hour |
| Sensitive session freshness | 15 minutes |
| Operator challenge freshness | 5 minutes, bound to the exact database session |
| Verification/reset link lifetime | 1 hour |
| Session cookie cache | Disabled |
| Cookies | HttpOnly, SameSite=Lax, Secure when the configured base URL uses HTTPS |
| Public JSON body limit | 16 KiB, enforced while reading the stream |
| Public POST origin | Must match a configured origin |
| Callback paths | `/`, `/account`, `/account/reset` on configured origins only |
| Ordinary endpoint admission | 30 requests per network/route and 5 per subject/route in a 60-second fixed window |
| MFA account lockout | 5 failed challenges, locked for 15 minutes, including across fresh challenges |

Both password reset and password change revoke all sessions. The change-password wrapper forces other-session revocation and deletes the replacement session too, requiring a fresh sign-in. Logout and explicit revocation affect the next protected request. Operator admission checks current grants and current principal status rather than caching them.

Persistent endpoint admission uses an atomic PostgreSQL counter. The installed Better Auth release's custom `consume` storage interface uses that same function, avoiding a concurrent first-insert race observed in its default database storage. The wrapper also applies subject budgets before invoking auth, so failed requests cannot roll back their admission cost. Budget keys are HMACs rather than email addresses or cookie values.

Forwarded client-address headers are ignored by default. Local requests share the loopback network budget. `AUTH_PROXY_HEADER` can name one header only when a configured trusted proxy replaces it and direct untrusted access is prevented. A single syntactically valid IP is accepted; comma-separated chains are not trusted. This does not configure the proxy itself.

`AUTH_BASE_URL` is the canonical link origin. `AUTH_TRUSTED_ORIGINS` is a comma-separated explicit allowlist. To use the documented Tailscale endpoint, configure its exact HTTPS origin. Next.js development-origin configuration alone does not authorize auth callbacks. Production mode rejects HTTP origins.

## Operator MFA policy

Operators need an explicit grant, active verified identity, enrolled/verified authenticator, a session created within fifteen minutes, and a challenge completed within five minutes. The challenge record is keyed to the session. An MFA-enabled flag alone grants nothing. Deleting or revoking that session removes its proof through a foreign key.

Successful TOTP or backup-code verification records proof only after resolving the actual session cookie produced by the auth endpoint. Enrollment requires verification. Backup codes are consumed once; concurrent submissions cannot both succeed. Failed challenges retain account lockout state. Trusted-device requests are rejected and trust cookies are stripped, so password-only remembered-device login cannot substitute for a challenge.

An operator cannot disable MFA through the ordinary endpoint. Existing operator factor replacement, secret retrieval, and backup-code regeneration require recent proof first. Re-enrollment invalidates prior challenge records. Administrative recovery remains restricted Day 6 work; password-reset email alone does not remove an operator's MFA requirement.

## Configure production mail

Production web configuration requires `FITLOOM_ENV=production`, `MAIL_PROVIDER=resend`, explicit HTTPS auth origins, `AUTH_DATABASE_URL`, `AUTH_SECRET`, and `MAIL_ENCRYPTION_KEY`. Secrets remain server-only. The web service queues intents and does not need the Resend key.

The worker requires `FITLOOM_ENV=production`, `MAIL_PROVIDER=resend`, `WORKER_DATABASE_URL`, the same `MAIL_ENCRYPTION_KEY`, `MAIL_FROM` on a Resend-verified domain, and a privately supplied `RESEND_API_KEY`. Nodemailer connects to `smtp.resend.com:465` over TLS with username `resend`. Production mode rejects Mailpit; development and test modes reject Resend. `FITLOOM_ENV` is separate from Next.js's build mode so a local optimized build can still use the local Mailpit environment.

Resend credentials, verified sender-domain setup, and recipient-side delivery verification are external dependencies for production acceptance. No production integration is claimed complete merely because SMTP configuration exists.

## Verification

```sh
pnpm test
pnpm lint
pnpm typecheck
pnpm build
pnpm --filter @fitloom/application test:http
```

Database and application suites use real PostgreSQL credentials, isolated test Mailpit, and a shared database advisory lock. Tests cover command/reversal review fixes, signup mapping, verification/resend/expiry/replay, recovery, password-change invalidation, logout/revocation, current principal/grant checks, TOTP enrollment and freshness, concurrent backup-code use, MFA lockout, persistent rate admission, SMTP retries/terminal failure, and transactional failure injection. Resend is never contacted by local tests.

References: [Better Auth email/password](https://better-auth.com/docs/authentication/email-password), [sessions](https://better-auth.com/docs/concepts/session-management), [two-factor authentication](https://better-auth.com/docs/plugins/2fa), [Mailpit Docker](https://mailpit.axllent.org/docs/install/docker/), [Resend SMTP](https://resend.com/docs/send-with-smtp), and [Nodemailer SMTP](https://nodemailer.com/smtp).

Verification recorded on 2026-11-01: nine clean/repeatable migrations, twelve reported database tests and twenty-five reported application tests pass. The optimized Next.js/actual-worker/Mailpit HTTP smoke, frozen install, lint, typecheck, production build, and diff checks pass. Package-specific Turborepo runtime inputs exclude auth signing/database credentials from the worker. Test credentials and captured mail stay isolated from development records.

Day 4 review fixed admission subjects for MFA: arbitrary email fields and unrelated cookies cannot rotate a user or challenge bucket. Existing-session step-up failures now use the same persistent account lock as sign-in challenges. Recovery screens display the reset form even when another account session exists. Real identity tests and the optimized-app HTTP check cover these regressions.
