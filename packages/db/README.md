# Fitloom database package

Read the [database package guide](../../docs/development/database.md) for implementation details and verification.

Project documentation, implementation status, and plans live in [docs](../../docs/README.md). Run project commands from the repository root as documented in the guide.

## Customer storage foundation

Migration 0034_customer_foundation creates private customer, wearer, and tag tables. Ownership is concrete tenant/location, with full parent references, generated search identities, scoped ordering/phone indexes, and pg_trgm GIN indexes. It adds forced RLS and no runtime table grants. Operation references, procedural validation helpers, and privilege changes remain in retained SQL; the Drizzle snapshot records the three new tables without changing existing table definitions.

The migration backfills CRM rights only to Owner presets and extends future Owner provisioning. SQL custom-role validation enforces customer and photo dependencies without granting CRM access to managers, staff, or unrelated custom roles.

Migration 0035_customer_authority adds private duplicate reviews, request budgets and safe activity, plus the restricted read/mutation protocol and actor-bound customer claims. Runtime access remains named-function-only. See [implementation evidence](../../docs/implementation/evidence/phase-2-build-2-increment-1.md).


The SQL protocol uses sorted scoped phone advisory locks before NOWAIT parent/child locks. Customer saves return opaque identities and versions; duplicate candidates remain in protected reviews. Current authority and actor ownership are checked again on replay. Profile no-ops preserve versions and omit customer activity. The worker can execute only the bounded expiry maintenance function; it cannot read these tables. The new snapshot adds only the three authority tables; retained SQL owns forced RLS, function grants and operation foreign keys.

Run customer storage checks through the existing application test command against guarded fitloom_test credentials. Clean upgrade/reapply and schema drift remain owned by the database suite and db:generate. Never reset fitloom_dev to validate this slice.


Migration 0036_customer_review_consistency fixes the reviewed protocol races without table changes. Duplicate fingerprint and summary projection share one materialized statement snapshot. Budget admission takes a principal/tenant/location mutex before capturing the minute, preventing invisible prior-bucket leases from exceeding the concurrent-check cap. CREATE OR REPLACE preserves the existing restricted function signatures/grants. The custom snapshot retains the same schema baseline.


Customer photo migrations 0037–0039 retain the legacy workspace-file purpose and add immutable CRM ownership, forced-RLS bindings, complete file/owner reference keys, purpose-specific functions, actor-bound photo replay and cleanup exclusion for live CRM bindings. `private_files` remains a retained SQL-owned foundation table; the new CRM relation and activity check are represented in the reviewed Drizzle snapshot. No prior migration is rewritten for development upgrade.

Fresh CRM binding is limited to unexpired staging and cannot attach cleanup-eligible objects. Existing current bindings and committed operation replay retain their no-op/recovery semantics.
