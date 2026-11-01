# Setup and workspace contracts

Day 4 provides `/setup`, `/workspaces`, a workspace page for each authorized shop and location, and invitation acceptance. The shared application service owns commands and projections. PostgreSQL functions enforce the same permissions at persistence boundaries.

## Setup identity and profile

`saveSetupDraft` stores an own-principal draft with an expected version. Partial drafts can omit required profile values. Each successful save increments the version; another session reads the saved draft and version.

The Create shop action validates the form, saves its latest details when needed, and provisions with the returned draft version. Save progress remains available for partial drafts. Provisioning requires a verified active identity, current saved details, and the expected draft version. Required values are shop name, business mode (`tailoring`, `boutique`, or `mixed`), owner name and phone, first location name, address, timezone, and authority consent. The verified account supplies the owner email. Consent records retain `workspace-authority-v1` and the acceptance timestamp.

A locked provisioning identity creates the tenant, first location, owner membership, presets, permission grants, shared settings, private owner contact, security audit, command audit, and operation result in one transaction. Concurrent retries return one tenant. Failure after any insert rolls back the complete command. Existing foundation shops without settings resume profile completion under their original identity.

`beginAnotherSetup` requires the prior setup to be complete and an explicit `createAnother: true`. It rotates the durable provisioning identity and clears the draft. Repeating a completed command key returns its saved outcome. A second fresh start cannot discard an unfinished setup.

## Roles and delegation

The foundation presets have these permissions:

| Preset | Permissions |
| --- | --- |
| Owner | `workspace.read`, `workspace.manage`, `workspace.private.read`, `access.manage`, `locations.all`, `audit.read`, `files.read`, `files.manage` |
| Manager | `workspace.read`, `workspace.manage` |
| Staff | `workspace.read` |

Preset definitions have no runtime write path. `createRole` creates a tenant-qualified custom role with a required `workspace.read` permission. Every requested permission must already belong to the actor at the selected location. Financial permissions are explicit custom grants; presets do not receive accounting permissions.

`setMemberRole` requires current `access.manage`, delegation rights for the target role, and the target membership version. It replaces assignments at the concrete selected location or removes that location's grants. Actors cannot change their own assignments. Only owners can manage owner membership, and another active owner with an owner grant at an active location must remain. Tenant locking serializes changes with invitation acceptance. Every successful change emits command audit metadata without private field values.

## Staff invitations

Invitations expire after 48 hours and bind a tenant, location, role, inviter, and normalized recipient email. Acceptance requires the matching verified account. The invitation ID is a lookup reference; possession of its URL does not confer membership.

Creation checks the inviter's current delegation rights. Acceptance checks them again under the tenant lock, along with expiry, revocation, and recipient identity. Revoked, expired, or no-longer-delegable invitations cannot activate membership. Duplicate acceptance returns the same authorized workspace; replay after membership removal fails current authorization.

Creation stores an encrypted mail intent in the command transaction. The existing mail worker delivers invitations to Mailpit during development and tests. Production configuration uses Resend. Revocation and acceptance clear queued encrypted content; the worker discards invalid invitation work before delivery. Delivery retries use the existing bounded mail retry policy. An already delivered message can remain in a mailbox, but acceptance always checks current authority.

## Workspace projections and preferences

`choicePage()` returns names and IDs for current active memberships and readable locations, with a scoped total and next offset. The compatibility `choices()` method returns its first page. `view()` requires a concrete tenant and location and returns shared shop fields and current permissions. Owner contact appears only with `workspace.private.read`. `team(target, offset)` requires `access.manage` and independently bounds roles, members, and invitations at 50 each, with counts and continuation. Restricted workspace projections contain no private audit or financial fields.

Raw command audit reads require `audit.read`. Operation rows are visible to their actor or an authorized auditor. Journal readers retain their separate `journal.read` authorization.

`allLocationsPage()` requires `locations.all` at the selected location and every active location in the tenant before returning a count or page. The compatibility `allLocations()` returns its first page. A null location or client `all` sentinel never broadens transaction scope. Mutations always target a concrete location.

Personal preferences store language (`en`, `ta`, or `hi`) and a validated workspace hint. A hint loses its tenant and location projection when current access disappears. Selectors never use the hint as authority. Switching workspaces saves the hint and language, then performs a full navigation to discard private client state. Saving a language preference does not implement interface translations.

## Web boundaries

Protected pages and each route handler resolve the current database session. The server supplies the principal and route scope. Command payloads use strict schemas. Read projections have explicit field schemas. JSON mutations require an allowed origin and accept at most 16 KiB. Protected JSON responses use `Cache-Control: private, no-store`; pages render dynamically.

| Route | Behavior |
| --- | --- |
| `GET /api/setup`, `POST /api/setup` | Read and save own setup |
| `POST /api/setup/provision`, `POST /api/setup/begin` | Complete setup or deliberately start another |
| `POST /api/preferences` | Save personal language and validated selection |
| `GET /api/workspaces?offset=0` | Page authorized choices with scoped total/next-offset headers |
| `GET`, `PATCH /api/workspaces/[tenant]/[location]` | Read allowed shop fields or update the shared profile |
| `GET /api/workspaces/[tenant]/[location]?view=all&offset=0` | Explicitly authorized location page and count |
| `GET /api/workspaces/[tenant]/[location]/team?offset=0` | Bounded access-administration projection with counts/continuation |
| `POST /api/workspaces/[tenant]/[location]/actions/[action]` | Fixed `invite`, `role`, `member`, or `revoke` command |
| `POST /api/invitations/[id]` | Accept as the current verified recipient |

There are no Server Actions or arbitrary command dispatch endpoints.

Day 7 adds Previous/More workspace navigation, team Load more, scoped counts, and shared browser-safe team contracts. Offsets are integers 0–100000; each page rechecks authority and orders ties by UUID. The selector includes the current workspace even when it is outside the first page, with a link to browse all choices. [Foundation operations](../operations/foundation-operations.md) defines the common list/error contract and retained pagination checks.

## Commercial admission boundary

Subscriptions, platform billing, and payment-provider integrations are deferred for the internal product. `AdmissionPolicy` is an existing, unimplemented extension interface retained from 1B; it is not an instruction to build deferred commercial checks. The executor checks identity, security, membership, location, and permission before commercial and feature checks. It checks atomic usage admission after claiming a fresh operation. Authorized replay rechecks commercial and feature state and does not consume usage twice.

Current product wiring uses the explicit `development-unimplemented` policy and reports it in `X-Fitloom-Admission`. The current code blocks production-mode workspace admission through its development-only guard. A later internal deployment must replace that guard with explicit internal access policy while preserving security and permission checks. It must not require a subscription or introduce commercial plans. This documentation change does not alter runtime wiring. There is no simulated active subscription or implemented billing enforcement.

## Verification

Run `pnpm dev`, then `pnpm validate` for container-based tests, checks, production build, and HTTP validation. See [local Compose development](../operations/local-development.md).

The real PostgreSQL and Mailpit suites cover resumed drafts, saved-detail matching, profile rollback, concurrent provisioning, independent shops, deliberate additional shops, earlier profile completion, verified invitations, duplicate acceptance, delegation loss, expiry, revocation, role changes, final-owner protection, field projections, stale preferences, and explicit All Locations permission. The HTTP script uses isolated test credentials with the optimized app and actual worker. It checks account recovery with an existing session, setup, provisioning retries, workspace rendering, cache policy, target tampering, unauthenticated direct actions, and origin rejection.

Day 5 owns general outbox dispatch, queue handlers, and provider inbox processing. Day 6 owns operator bootstrap and recovery commands. Customer, order, manual business payments, financial dashboard, and translation workflows retain their roadmap owners. Subscription/platform billing and payment-provider integrations are deferred with no scheduled phase.
