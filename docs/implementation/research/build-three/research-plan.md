# Build Three research plan

Status: Research completed on 2026-11-03. The implementation plan remains proposed work.

## Question

What must Phase 2 Build Three implement to complete the customer and measurement book, using the completed garment and customer contracts without weakening historical records, authorization, or retry safety?

## Investigation work

| Topic | Questions | Evidence and output |
| --- | --- | --- |
| Scope and provenance | Which canonical behaviors remain in phase 2? Which reference behaviors are unsafe to copy? | Requirements, roadmap, frozen source appendix, Build One and Build Two handoffs. Produce a requirement-to-increment map. |
| Existing execution paths | Where do pages obtain authority? How do commands commit and replay? How are photos scoped and cleaned? | Trace web loaders and routes through application contracts, executor, restricted SQL, and private storage. Produce integration constraints and a file map. |
| Measurement design | How do body and garment profiles differ? How do units, schema evolution, copies, mapping, and comparisons preserve meaning? | Compare aggregate and event-log designs. Validate exact conversion against NIST. Produce data and interface sketches plus edge cases. |
| User journeys | How does staff move from a customer to a saved, reusable measurement? How do mobile entry, history, photos, cards, and imports behave on failure? | Existing shell and guard, customer screens, garment rendering and original illustrations, W3C accessibility guidance. Produce screen contracts and acceptance journeys. |
| Sharing, imports, and delivery | What does a QR authorize? Which imports can be honestly supported? How are races, stale previews, and partial outcomes handled? | PostgreSQL 18 documentation, RFC 4180, maintained parser and QR-generator documentation. Produce bounded protocols, migration steps, validation and review checklist. |

## Method and synthesis

Read the repository before selecting a design. Treat canonical requirements as authority over archived vendor behavior. Treat current source as implementation evidence and dated test reports as historical verification only. Consult primary external sources for technical contracts, with a small number of focused searches per topic.

Write findings to [technical-findings.md](technical-findings.md). Keep the implementation instructions in [the Build Three plan](../../plans/phase-2-build-3-measurements.md). Record rejected alternatives and explicit scope boundaries. A source link does not establish that Fitloom already implements the described capability.

After the complete plan exists, request the user-specified OpenCode DeepSeek V4.1 Flash review with `variant=max`. Give the reviewer the plan, findings, canonical requirements, handoffs, and relevant source paths. Preserve its original findings separately, disposition each finding, then verify the revised artifact and local links. Do not implement application features during this planning task. The first route failed for insufficient funds; the user authorized the OpenCode Go route, which completed. Its 17 findings and the lead's corrections are recorded in the [review record](../../reviews/phase-2-build-3-measurements-review.md).

## Skill application and limits

Use architecture and module-design guidance for caller-first interfaces and two distinct candidate designs. Use frontend design guidance within the established Fitloom visual system. Apply type-system, TypeScript, PostgreSQL, research, technical-writing, unslop, and artifact-verification rules.

The architect skill's auxiliary `arena` package and its configured runner models are not available in this session. Compare the two candidate structures directly and use the explicitly requested external reviewer. Do not claim an arena run. Context7 tools are absent from the available tool catalog, so use official framework and library documentation directly. No live browser, application, database, or device validation is part of research-only evidence.
