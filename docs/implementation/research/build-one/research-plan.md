# Build One research plan

Date: 2026-11-01.

Question: What must Fitloom implement for tenant-owned garment masters so later customers, measurements, and orders can use stable, versioned definitions?

## Investigation

1. Trace the existing workspace authority, command transaction, database isolation, decimal, private-file, and web-route contracts. Identify exact integration points and gaps.
2. Extract garment-master requirements and frozen reference evidence. Separate Build One behavior from later measurement, order, inventory, and portal work.
3. Verify technical constraints against current official PostgreSQL, Drizzle, Zod, and accessibility documentation. Record source URLs, constraints, and implications without upgrading the installed stack.

## Synthesis

Write one implementation plan in `docs/implementation/plans/phase-2-build-1-garment-masters.md`. Include scope, decisions and alternatives, data invariants, authorization, command and query contracts, screens, ordered implementation tasks, fixtures, and behavioral verification. Mark development assumptions and later product decisions explicitly.

Use a research subagent for official technical documentation. Keep source-code investigation and final plan ownership with the primary agent. Save research findings in this directory. After the complete plan exists, delegate a full-file review to the user-requested DeepSeek V4.1 Flash. Record findings and their dispositions beside the plan.
