---
status: complete
created: '2026-03-20'
tags:
  - frontend
  - visualization
  - knowledge-graph
priority: high
created_at: '2026-03-20T01:10:15+00:00'
---

# Visual Knowledge Graph MVP

> **Status**: complete · **Priority**: high · **Created**: 2026-03-20

## Overview

Build a static knowledge-graph web app that reads category graph data from
`graph-data/<category>/graph.json`, allows users to select category/graph,
and renders an interactive Cytoscape graph with search and node details.

## Design

- Runtime is fully static and file-based (works without backend).
- Navigation is driven by `graph-data/manifest.json`.
- Category file format:
  - root object with `categoryId` and `graphs[]`
  - each graph has `graphId`, `graphLabel`, `nodes[]`
- Node schema is validated in `src/domain/types.ts` / `src/data/loader.ts`.
- Tag colors are stored in localStorage via `src/data/tagStorage.ts`.
- Node edits are exported via JSON download flow (no server-side mutation).

## Plan

- [x] Implement manifest-driven category + graph selector.
- [x] Replace native category/graph `<select>` controls with a React component library dropdown for consistent UI styling.
- [x] Migrate all app and component UI primitives from Chakra UI to Ant Design components while preserving existing graph interactions and edit flows.
- [x] Implement graph loading, validation, and Cytoscape transformation.
- [x] Implement search, node detail panel, and graph legend UI.
- [x] Add persistent light/dark theme support with toolbar toggle and CSS variable-based styling.
- [x] Refine dark-theme neutral palette for dropdowns, menus, legends, and detail/edit panels to reduce glare and improve contrast consistency.
- [x] Fix top toolbar category/graph dropdown styling to ensure Chakra-based controls visibly use app theme tokens instead of appearing as default browser selects.
- [x] Audit dark/light theme text and panel contrast for overlay components (node detail panel, inline loader drawer, legends, warnings, and graph canvas labels).
- [x] Keep editing/export flow local-only.

## Test

- [x] Manual inspection: `src/data/loader.ts` validates category and graph schema.
- [x] Manual inspection: `src/components/GraphSelector.tsx` and `src/App.tsx` wire category/graph switching.
- [x] Manual inspection: `src/App.tsx` handles theme preference initialization, persistence, and root `data-theme` synchronization.
- [x] Manual inspection: `src/styles.css` defines light/dark CSS variables and applies them to major panels and inputs.
- [x] Manual inspection: `src/styles.css` and `src/components/GraphSelector.tsx` use shared CSS variables for react-select, menus, legends, and detail/edit panel neutrals under dark theme.
- [x] Manual inspection: `src/components/GraphSelector.tsx` applies explicit themed Chakra `Select` styling on toolbar dropdowns.
- [x] Manual inspection: `src/components/NodeDetailPanel.tsx`, `src/components/TagLegend.tsx`, `src/components/EdgeTypeLegend.tsx`, and `src/App.tsx` now use shared theme variables for panel/text readability in dark mode.
- [x] Manual inspection: `src/components/GraphCanvas.tsx` adapts node/label colors by current app theme.
- [x] `npm run build:app`
- [x] Manual inspection: `src/components/NodeDetailPanel.tsx` exports updated JSON data.
- [x] Manual inspection: `src/App.tsx` and `src/components/*` now use Ant Design components instead of Chakra UI primitives.
- [x] `npm run build:app` after Ant Design migration.

## Notes

- Earlier cloud/Appwrite-related scope was extracted and later deprecated by
  the core-package direction in `specs/005-core-package-without-appwrite`.
