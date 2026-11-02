# Fitloom UI foundation v2

## Direction

Light `base-vega` workspace: mist page surface, near-white sidebar with a border, white rounded cards, subtle shadow and foreground ring, and green primary actions. IBM Plex Sans carries UI and measurements; Noto Sans is reserved for headings. IBM Plex Mono is supplementary for rates, revisions and measurement ranges so numeric values scan consistently.

## Tokens and screens

The standalone mockup mirrors the applied mist tokens, 10px base radius, component radii, muted surfaces, green primary and sidebar colors. It keeps one persistent workspace shell across Home, Garments and Editor. Home reports setup and catalog readiness rather than operational totals; Garments is a searchable/filterable register; the editor keeps the six-step flow, measurements, live form preview, revision history and save bar.

## Responsive behavior

At 1024px and below, the sidebar becomes a light header with a horizontal navigation row. At 720px, page actions stack, tables scroll horizontally, editor steps scroll horizontally, fields wrap and the preview/history rail stacks beneath the editor. Focus rings and reduced-motion handling are included.

## Open decisions

- Confirm whether the setup checklist should treat service-rate completion as a separate readiness step.
- Confirm the eventual mobile navigation pattern: horizontal row or a menu-triggered drawer.
- Confirm whether the live product should keep preview and history visible together or expose them as tabs.
