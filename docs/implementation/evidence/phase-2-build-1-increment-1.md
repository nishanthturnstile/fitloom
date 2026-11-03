# Garment masters increment 1 evidence

Verified locally on 2026-11-01. This records the increment 1 checkpoint; see [increment 2 evidence](phase-2-build-1-increment-2.md) for subsequent persistence work. At this checkpoint, only increment 1 was implemented; persistence, permissions, service execution, HTTP routes, and the settings interface remain planned.

## Implemented artifacts

- `packages/application/src/master-contracts.ts`: strict format 1 definitions; five field variants; sections and construction groups; branded UUIDs; explicit nullable rate inputs; command payloads and invocation envelopes; bounded pages, catalog metadata, results, errors, and separate schema-only/priced output schemas.
- `packages/application/src/master-manifest.ts`: allowed illustration IDs and the original body/garment length semantic registry. Semantic IDs express meaning and basis without asserting equivalence between measurements.
- `packages/application/src/garment-definition.ts`: immutable identity signatures, registry comparisons, historical-copy ID replacement, ordered preview model, UTF-8 estimates, request budget helper, and null-coalescing rate precedence.
- `packages/application/src/master-starters.ts`: `tailoring-core-v1` Shirt, Blouse, Trouser, New stitching, and Alteration fixtures. Callers supply fresh UUIDs. All initial garment rates and service overrides are unset.
- `apps/web/public/illustrations/garments/`: five original SVG development guides with titles and manifest text alternatives.
- `packages/application/test/master-contracts.test.mjs`: valid starters and all renderer kinds, malformed definitions, range and rate boundaries, duplicate IDs, semantic lineage, retired-parent copies, projection strictness, request estimates, browser dependency checks, and actual asset resolution.

The `@fitloom/application/master-contracts` and `@fitloom/application/garment-definition` exports are browser-safe. Their transitive external dependencies are `zod` and `decimal.js`. The Node entry exports `createStarterBundle` and `nonnegativeRateInput`.

## Verification

Commands ran from the repository root:

| Command | Observed result |
| --- | --- |
| `pnpm --filter @fitloom/application build` | TypeScript compilation passed |
| `node --test packages/application/test/master-contracts.test.mjs` | 51 tests passed, 0 failed |
| `pnpm lint` | Passed |
| `pnpm typecheck` | All 6 workspace tasks passed |
| `pnpm build` | All 4 workspace tasks passed; optimized Next.js build succeeded |

The focused test runs the compiled artifact, allocates independent starter bundles, parses complete save payloads, builds previews, compares schema identities, and reads every referenced SVG from disk. The new test file is included by the existing application test script's `test/*.test.mjs` glob.

## Remaining verification boundaries

No database migrations or runtime permission changes are included. No application/HTTP/SQL master behavior is claimed. The full database suite, optimized HTTP smoke suite, and `pnpm validate` were not run for this pure-contract increment. Existing developer shops and uploads were not mutated.

`estimatedDefinitionBytes` measures compact UTF-8 JSON for editor feedback. PostgreSQL must independently enforce the authoritative 64 KiB JSONB text budget in increment 2, including escaping and separator expansion. `masterRequestFits` accounts for the entire supplied invocation; HTTP enforcement of the 128 KiB cap belongs to increment 3. Existing route limits are unchanged.

`identityIssues` expects the registry already scoped to one tenant and garment. It does not authorize access or persist retirement markers. The restricted SQL publication path must independently validate lineage, active references, tenant ownership, and immutable versions. Output schemas reject unexpected price properties; the future service must choose the correct projection before fetching or returning data.

The preview is a pure rendering model with no React UI or wearer values. The original assets and starter dimensions require a tailor's confirmation before operational cutting use.
