# Official technical findings for Build One

Retrieved: 2026-11-01. Scope: technical constraints for tenant-owned garment masters. These findings do not prescribe the complete domain design or authorize a dependency upgrade.

## PostgreSQL 18

### Tenant isolation needs policies and relationships

Documentary facts: Enabling RLS without applicable policies denies normal row access. Superusers and `BYPASSRLS` roles bypass policies. Table owners normally bypass them unless forced. Referential-integrity checks bypass RLS. Policies distinguish visible rows from permitted new row values.

Planning implication: Keep the runtime role separate from ownership. Apply tenant-scoped read and write policies to every master-owned table. Couple RLS with tenant-qualified foreign keys and current permission checks. Test absent context, tenant switching, and direct SQL as the runtime role. Return safe errors for foreign-key or uniqueness failures.

Source: [PostgreSQL 18 row security policies](https://www.postgresql.org/docs/18/ddl-rowsecurity.html).

### Composite foreign keys protect identity relationships

Documentary facts: A foreign key can span multiple columns. Its referenced columns must have a primary key, unique constraint, or suitable non-partial unique index. PostgreSQL does not automatically index referencing columns. Cross-row assertions do not belong in `CHECK` constraints. `CHECK` accepts null results, so required values also need `NOT NULL`.

Planning implication: Give garment versions a tenant-qualified identity and reference the complete tenant-qualified key. Include garment identity where a selected version must belong to that garment. Use uniqueness for version numbers per garment. Index child references that serve lookups. Protect cross-row relationships with foreign keys or transactional commands rather than a check function that queries mutable rows.

Source: [PostgreSQL 18 constraints](https://www.postgresql.org/docs/18/ddl-constraints.html).

### JSONB does not enforce a garment schema

Documentary facts: JSONB validates JSON syntax, not a domain-specific document structure. It does not preserve object-key ordering or duplicate keys. Updating a JSON document locks its whole row. PostgreSQL recommends a predictable document structure and manageable document size.

Planning implication: A bounded, validated schema-version document can be reasonable when the complete schema changes atomically. Use arrays or explicit positions for field ordering. Validate semantic field identifiers and per-kind attributes at the command boundary. Store tenant and parent identity in relational columns. Do not assume JSONB alone validates dimension semantics or makes published content immutable.

Source: [PostgreSQL 18 JSON types](https://www.postgresql.org/docs/18/datatype-json.html).

### Exact decimals still require input validation

Documentary facts: `numeric` provides exact decimal storage. A declared scale rounds input with excess fractional digits. PostgreSQL also supports numeric special values, including `NaN`, and unconstrained numeric can hold infinity.

Planning implication: If rates require rejection of excess precision, validate before casting to a scaled database column. A post-cast check cannot detect discarded digits. Use decimal strings at JSON boundaries and the existing decimal policy. Reject non-finite values, exponents if unsupported by the boundary contract, negative defaults, and out-of-range values explicitly. Keep currency with each rate. A missing price and a deliberate zero price need separate product states.

Source: [PostgreSQL 18 numeric types](https://www.postgresql.org/docs/18/datatype-numeric.html).

### Serialize publication at the garment row

Documentary facts: `FOR UPDATE` blocks competing writers and lockers on the selected row until the transaction ends. Row locks do not block ordinary readers. Transactions that acquire locks in conflicting orders can deadlock.

Planning implication: Publication can lock a stable garment identity, verify its expected version, append the next immutable version, and update the current pointer in one transaction. Apply the same lock order to multi-record commands. Preserve bounded retry behavior and detect stale user edits separately from transient serialization failures.

Source: [PostgreSQL 18 explicit locking](https://www.postgresql.org/docs/18/explicit-locking.html).

## Drizzle migration compatibility

Documentary facts: Drizzle supports reviewed SQL migrations and empty custom migrations for database changes its generator does not express. Current documentation includes evolving API and migration-layout examples.

Planning implication: Keep installed `drizzle-orm` 0.45.4 and the repository migration runner. Verify exported helpers against installed declarations rather than copying newer online examples. Use reviewed SQL for RLS, grants, triggers, publication functions, and data backfills where needed. Retain the repository's journal and snapshot conventions. Do not replace the migration workflow with `push`.

Sources: [Drizzle migrations](https://orm.drizzle.team/docs/migrations), [Drizzle custom migrations](https://orm.drizzle.team/docs/kit-custom-migrations), and [Drizzle RLS](https://orm.drizzle.team/docs/rls).

## Zod boundary contracts

Documentary facts: `z.discriminatedUnion()` selects object variants by a shared literal discriminator. Default object schemas strip unknown keys. Strict object schemas reject them.

Planning implication: Model measurement fields as explicit variants such as length, decimal, choice, text, and boolean. Give each variant only its valid properties. Parse unknown command inputs once and derive TypeScript types from the schemas. Reject extra keys at write boundaries so incompatible field attributes do not disappear silently. Do not coerce decimal rate strings through JavaScript numbers.

Source: [Zod schema API](https://zod.dev/api?id=discriminated-unions).

## Accessible field ordering

Documentary facts: WCAG 2.2 SC 2.5.7 requires a single-pointer alternative to author-defined dragging where dragging is not essential. W3C gives stepwise arrow controls as an example.

Planning implication: Provide labeled Move up and Move down buttons for sections, fields, and choices. Support keyboard activation, keep focus on the moved item, and announce its new position. Dragging can be an optional enhancement. Prefer native controls over a custom listbox unless the complete listbox interaction model is implemented.

Sources: [WCAG 2.2 dragging movements](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html) and [W3C technique G219](https://w3c.github.io/wcag/techniques/general/G219).

## Limits of this research

No official technical source establishes correct tailoring dimensions, fit allowances, real garment prices, or body-to-garment mappings. Treat starter garment templates as development fixtures until a tailor validates their semantics and illustrations. Framework documentation also does not establish Fitloom's authorization or publication policy. Those decisions must be stated in the implementation plan and verified against repository contracts.
