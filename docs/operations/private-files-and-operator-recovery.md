# Private files and minimum operator recovery

Day 6 uses self-hosted SeaweedFS 4.51, selected by the user in place of the planned filesystem backend. The application `BlobStore` interface has `put`, `open`, bounded batch `remove`, and a protected-status `probe` operation. PostgreSQL owns authorization, lifecycle, references, and audit. Browsers receive application streams rather than storage credentials or public object URLs. [Foundation operations](foundation-operations.md) records Day 7 review fixes and verification.

## Use private images

Open an authorized shop and find **Private files**. Owners can upload, download, and retire reference images. Existing and future Owner presets receive `files.read` and `files.manage`; other roles receive neither automatically. An access administrator can delegate these permissions only when they already hold them. File management alone does not grant reading.

The initial development allowlist is JPEG/PNG, at most 5 MiB input and output and 12 million decoded pixels. Sharp 0.35.5 validates decoded format, checks the declared media type, rejects detected multiple pages, normalizes orientation, and re-encodes without retaining input metadata. Other formats are rejected. Names, filesystem paths, object URLs, and client-selected storage keys are never accepted. Revisit supported business file types in their owning phases.

The workspace panel performs staging, upload, and attachment with separate visible busy/error states. A retry retains its staging and attachment operation keys. Downloads use generated names, attachment disposition, private/no-store caching, `nosniff`, and a restrictive content security policy. Retiring a file immediately removes new download access; physical collection follows the grace period. Copies already downloaded remain outside server revocation.

## Lifecycle and transaction boundaries

| Step | Durable behavior |
| --- | --- |
| Begin | A permission-checked `file.begin` command commits a generated UUID, principal owner, tenant/location, initial version, command result, and audit before storage is touched. |
| Validate/upload | Current uploader identity and `files.manage` are checked before body ingestion and again under the file-row lock. A staged intent accepts upload for one hour. The body has a 15-second deadline; two uploads run concurrently per process. Image processing has a five-second timeout. |
| Prepare/finalize | Before S3, a scoped transaction commits the normalized byte size, SHA-256, media type, and immutable content binding. Under a fresh row lock, the server writes `objects/v2/{UUID}/{SHA256}` and commits finalized state/version/event. Preparation and finalization replays accept only matching normalized content. Legacy layout-1 objects remain readable at `objects/{UUID}`. |
| Attach | A versioned `file.attach` command locks that row and records a tenant/location-qualified workspace attachment, result, and audit. A finalized object is private but unavailable for download until attached. |
| Download | Current session, principal, tenant, membership, location, `files.read`, and an active attachment are required. Authorization is rechecked after storage opens and before returning bytes. Streams enforce the recorded length and a 15-second deadline. |
| Retire | A versioned `file.retire` command retires the attachment and metadata atomically. The object remains during the cleanup grace period. |
| Collect | A daily service job locks up to 50 unreferenced staged/finalized/retired rows older than 24 hours, deletes at most 100 registered legacy/v2 references in one bounded S3 batch, and commits deletion metadata/events. Active references and recently updated rows are excluded. |

S3 requests use trusted server configuration, path-style addressing, bounded attempts, and six-second write/delete deadlines. The backend is unavailable on storage errors; responses never claim a successful upload after failed persistence. Storage and PostgreSQL cannot share a transaction: interrupted finalization leaves a registered orphan, and interruption after deletion leaves a missing object that an idempotent retry reconciles. Attachment/finalization and cleanup lock the same metadata row so cleanup cannot delete an object being attached. Successful cleanup batches continue until drained; three failures exhaust a batch cycle and require investigation/retry.

The older Day 5 local staging volume and `staged_file_cleanup` records remain isolated legacy cleanup inputs. New uploads use `private_files` and `file_attachments` with SeaweedFS. Neither backend scans arbitrary paths or deletes unregistered objects. All new application tables force RLS; web/worker roles get named function execution rather than direct table mutation. Domain modules can add their own tenant-qualified attachment references later; customer/order attachments are not implied by this workspace feature.

## File APIs

All routes require an authenticated current workspace. JSON mutations use the existing `{ operationKey, correlationId, payload }` envelope and trusted origin checks.

| Method and path | Input/result |
| --- | --- |
| `POST /api/workspaces/{tenant}/{location}/files` | Empty payload; returns committed command result `{ id, version: 0 }` |
| `PUT /api/workspaces/{tenant}/{location}/files/{id}` | Raw JPEG/PNG bytes with exact media type; returns `{ id, version: 1 }` after finalization |
| `POST .../actions/attach-file` | Payload `{ fileId, expectedVersion }`; increments version |
| `GET .../files?offset=0` | Attached files in pages of 50 with scoped total/next-offset headers, projected without storage keys or private account fields |
| `GET .../files/{id}` | Authorized bounded download stream |
| `POST .../actions/retire-file` | Payload `{ fileId, expectedVersion }`; retires attachment and increments version |

PUT identity is the committed staging UUID, with the normalized content digest as its semantic input. Once preparation commits, even an upload whose finalization fails cannot change content. Different digests use disjoint keys, preventing a timed-out delayed write from overwriting a successful retry. Shared command identities handle begin/attach/retire replays; current authority is checked before returning saved results. A retired or expired staging identity cannot be used to overwrite an object. Drain old writers before upgrading another environment and verify legacy checksums; see [the upgrade/recovery contract](foundation-operations.md#recover-known-failures).

## SeaweedFS in Compose

`seaweedfs` runs the pinned multiarchitecture 4.51 image with persistent `fitloom_seaweed-data`. Its embedded filer metadata is persisted alongside volume/master data under `/data`. `storage-init` creates the `fitloom-dev` and `fitloom-test` buckets using a private bootstrap identity and verifies a real write/read/delete in each before exiting zero. Readiness probes use the reserved `checks/readiness` key. No anonymous identity is configured; embedded IAM mutation is disabled.

| Listener | Port and exposure |
| --- | --- |
| S3 | `24453`, published only on Mac loopback for host tools; applications use `http://seaweedfs:24453` |
| Master, volume, filer HTTP | `24450`, `24451`, `24452`, container network only |
| Corresponding gRPC | `34450`–`34453`, container network only |
| Iceberg/Lance catalogs | Disabled |

Local master configuration grows one volume at a time, with a bounded maximum of sixteen 256-MiB volumes and no eager preallocation. This avoids the default seven-volume growth consuming the single-node slot budget before both environment buckets can write. Allocation deferral is disabled for this single-node local stack; actual S3 probes still gate startup. These are local settings, not production cluster sizing.

No storage port is forwarded through Tailscale. The application remains at the existing HTTPS address. There is no separate public storage login.

Compose generates credentials privately and preserves them across startups. Web identities can read/write only their environment bucket. Worker identities can write/delete only that bucket and cannot read objects. A dedicated test reset identity can list/delete only `fitloom-test`; it is never passed to web/worker. Bootstrap credentials reach only SeaweedFS configuration and the one-shot initializer. `.local/seaweed-s3.json`, service environment files, and `packages/db/.env` stay outside Git and images.

Both runtime services consume `STORAGE_ENDPOINT`, `STORAGE_BUCKET`, `STORAGE_ACCESS_KEY`, and `STORAGE_SECRET_KEY`; each receives its own key. Runtime code does not create buckets or modify IAM. After changing generated storage identities or `config/seaweedfs/master.toml`, restart SeaweedFS to reload its configuration. `pnpm dev` applies Compose/environment changes. `pnpm dev:down` preserves storage; `down --volumes` removes Compose-owned private data. Production recovery must preserve PostgreSQL, filer metadata, volume data, configuration, and keys together. Host backup automation and production cluster provisioning remain external work.

## Operator authority and commands

Ordinary owners have no platform grant. Operator admission requires a verified active identity, a database session, verified authenticator enrollment, a challenge within five minutes, a session created within fifteen minutes, and the action's explicit grant. SQL rechecks that actual user/session before every action and every replay. An expired challenge or removed grant cannot retrieve a prior privileged result.

| API/action | Required grant |
| --- | --- |
| `GET /api/operator/tenants?query=...&offset=0` | `tenants.read`; pages of 50 tenant ID/name/lifecycle/location count and bounded owner principal IDs with `ownerCount`; no passwords, tokens, or owner email |
| `tenant.suspend`, `tenant.restore` | `tenants.manage`; changes security admission only |
| `sessions.revoke` | `sessions.revoke`; revoke all sessions of the specified principal after checking its membership in the specified tenant |
| `owner.recover` | `owners.recover`; initiate a fresh supported password reset for the tenant's current active verified owner |
| Service job status/retry/cancel | `jobs.manage`; existing protected job endpoints |

`POST /api/operator/commands` accepts a strict action object, `operationKey`, `correlationId`, and a nonempty reason (up to 500 characters):

```json
{
  "action": "tenant.suspend",
  "tenantId": "UUID",
  "operationKey": "unique caller key",
  "correlationId": "UUID",
  "reason": "Verified security incident reference"
}
```

Restore uses the same target shape. Session revocation and owner recovery also require `principalId`; job actions use `jobId` instead of tenant/principal. Responses contain `{ operationId, replayed, result: { accepted: true } }`. Principal/action-scoped operation keys, canonical request hashes, saved results, target IDs, reasons, and correlation IDs are durable. Concurrent same-input replays share one operation. Changed input conflicts. Current admission precedes replay. Operator operations are append-only to runtime roles.

Suspension immediately blocks ordinary requests and actor-authorized delayed work through current tenant admission. Restoration changes security admission only. The internal product has no platform subscription; commercial entitlements and billing are deferred. Revoking a principal's sessions affects that identity across shops and is a separate explicit action.

Owner recovery uses Better Auth's supported reset API on the same transaction connection as the operator result/audit and encrypted mail intent. Failed mail persistence rolls all of them back. Replays do not issue another token. A target is limited to five new operator recovery requests per hour. The API returns only acceptance; it never returns a password or reset link. The owner receives the normal Mailpit email locally, completes the single-use reset, and all prior sessions are revoked. Resetting an operator owner's password does not bypass MFA.

The Day 5 `POST /api/operator/jobs` route now also requires `operationKey` and `correlationId`, alongside job ID/action/reason, and uses this durable contract. Read-only status stays unchanged. The old raw service-job mutation helper is no longer executable by the auth runtime.

## Bootstrap and restricted operator MFA recovery

Use the migration credential only from a restricted administrative environment. Public registration and runtime endpoints cannot grant operator permissions, bootstrap an operator, or remove MFA. Do not expose the following commands as HTTP handlers.

1. Identify the intended person independently and verify that the exact account email is already verified in Fitloom.
2. Record the identity-check/ticket reference without passwords, MFA material, or recovery links.
3. From the Mac checkout with prepared private configuration and Docker available, run the container-based administrative command:

```sh
pnpm operator:bootstrap --email known-verified@example.test --reason "Approved initial operator" --evidence ticket:identity-check-123
```

The SQL procedure binds to one known verified active principal, installs the fixed foundation grants, and records the administrator login, subject, reason, reference, and timestamp. Repeating bootstrap preserves the same grants and adds no duplicate bootstrap audit when nothing changes. It never creates an identity or chooses a password. The person must enroll an authenticator and complete a real challenge before normal operator admission.

Both administrative wrappers build and run the current code through the migration service with its private credential; a host application build is unnecessary. They do not use the web/worker runtime identity.

For a lost authenticator, verify the person's identity through the restricted process before running:

```sh
pnpm operator:recover-mfa --email known-verified@example.test --reason "Lost authenticator; identity verified" --evidence ticket:recovery-check-456
```

This revokes every session, deletes the old factor/backup codes, disables enrollment, and records a restricted administrative audit. Existing operator grants remain, but they do not admit a password-only session. The person signs in, enrolls a replacement authenticator, and proves it before operator commands work again. It does not reveal or replace a password; use supported password recovery separately when needed. Checking the evidence reference is an administrative responsibility; the database validates a known verified account and requires a reference, not the truth of an external identity check.

## Verification

`pnpm validate` resets only guarded `fitloom_test` schemas and synthetic `fitloom-test` objects, then runs database/application checks, lint, types, production build, and optimized-app HTTP tests. The storage reset identity has no access to development objects. Application test files run sequentially because they share one test database; each still exercises meaningful concurrent commands and races internally.

Checks use real PostgreSQL roles, SeaweedFS, Mailpit, and TOTP. They cover invalid/type-mismatched/oversized images, decoded-pixel limits, cross-tenant and location access, revoked permissions, safe headers, staging replay, storage credential isolation, orphan cleanup after injected finalization failure, attachment/cleanup locks, retirement, operator authority/idempotency/audit, owner reset delivery/use, rollback on failed mail persistence, and restricted CLI bootstrap/MFA recovery. HTTP checks exercise the same file and operator routes used by clients. Day 5 regressions verify request deadlines/disconnects and replay freshness after body ingestion. `node scripts/verify-private-files.mjs` validates the existing local demo account through Tailscale HTTPS and retains one reusable reference image in `Fitloom Demo`; rerun it after a SeaweedFS restart to compare the persisted digest. It refuses other workspaces and does not grant the demo owner operator access.

Official references: [SeaweedFS 4.51 release](https://github.com/seaweedfs/seaweedfs/releases/tag/4.51), [pinned server flags](https://github.com/seaweedfs/seaweedfs/blob/4.51/weed/command/server.go), [S3 credentials and bucket-scoped actions](https://github.com/seaweedfs/seaweedfs/blob/4.51/weed/command/s3.go), [AWS JavaScript S3 operations](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/javascript_s3_code_examples.html), and [Sharp input limits](https://sharp.pixelplumbing.com/api-constructor/).

Day 6 verification on 2026-11-01 passed 20 migrations, 12 database and 60 application tests, lint, types, build, and HTTP flows. Day 7 expands this to 23 migrations and 65 application tests, including real delayed S3 writes, buffered-stream deadlines, and bounded-page authority checks. HTTP operator checks use actual TOTP. The live Tailscale legacy demo image retains its digest. Run `node scripts/verify-private-files-browser.mjs /path/to/playwright/index.mjs` with the existing Playwright/Chrome installation to repeat the browser regression; it checks the demo fixture's lost attachment response, replay, download, retirement, and mobile layout. See [current complete evidence](foundation-operations.md#verification-recorded-on-2026-11-01).
