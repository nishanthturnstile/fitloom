# UI foundation: shadcn `base-vega` / `mist`

Status: direction proposed on 2026-11-02. Current mockup: [ui-foundation-mockup-v3.html](ui-foundation-mockup-v3.html), redesigned by GPT-6.1 Sol High on the applied preset.
Scope: shared shell and the garment-master flow. No API, database, domain-contract, or migration changes.

## Applied design system

The shadcn preset is now initialized under `apps/web`:

- Style `base-vega`, base colour `mist`, icon library Hugeicons.
- IBM Plex Sans for UI, Noto Sans for headings, supplementary IBM Plex Mono for rates, revisions, and measurement values.
- Light mist page surface, near-white sidebar, white cards with a subtle shadow and foreground ring, green primary, 10px base radius, pill badges, line tabs.
- Components live under `apps/web/src/components/ui/`.

The font variables were corrected after initialization: the next/font variables are `--font-ibm-plex` and `--font-noto-heading`, mapped to `--font-sans` and `--font-heading` in `globals.css`.

## Direction

A calm operational workspace rather than an editorial form. The shell should make the shop, location, catalog, and next action obvious at a glance. The current mockup keeps:

- A persistent light sidebar with workspace, work, catalog, and admin groups.
- A topbar with breadcrumbs and a command/search affordance.
- A home readiness screen: catalog counts, setup progress, recently edited garments, and a clearly labelled next-build panel.
- A garment register separate from the editor, with search, status/origin/applicability filters, table/card views, revisions, rates, and status.
- A garment editor with a sticky header and save bar, six steps (Identity, Measurements, Construction, Services & rates, Add-ons, Preview & history), a live form preview, and revision history.

Future modules are labelled as “next”, “phase 3”, and “phase 4” until they exist. The home must not imply that orders or production are already implemented.

## Responsive behavior

At 1024px and below the sidebar becomes a compact header with a menu trigger. At 720px page actions stack, tables and editor steps scroll horizontally, measurement rows wrap, and the preview/history rail stacks beneath the editor. Focus rings and reduced-motion handling are included.

## Implementation order

1. Replace the legacy shell styling with preset tokens and the new app shell.
2. Build the shared primitives and settings hub.
3. Build the garments register and the six-step editor; keep the existing master commands and projections.
4. Add the home readiness screen.
5. Run visual QA at 1440/1024/390, keyboard checks, and the existing dirty/conflict/retry scenarios.
6. Refresh UI evidence, then plan customers/measurements on the same shell.

## Open decisions

- Does the setup checklist treat service-rate completion as a separate readiness step?
- Should the live product keep preview and history side by side or expose them as tabs?
- Is the mobile navigation a menu-triggered drawer or a persistent compact bar?
- Should the home remain readiness-focused until phase 3, or add placeholder operational cards earlier?

## Boundaries

UI-only. The preset application and the mockup do not change master commands, SQL functions, projections, permissions, the migration set, or the saved schema format. Existing automated tests remain authoritative; UI evidence is regenerated after the restructure.
