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
- [x] Make node detail Tags/Relations sections collapsible so large edit forms are easier to navigate.
- [x] Increase top-toolbar action button sizes to improve click/tap comfort.
- [x] Add collapsible Tags/Relations legends with persisted open state and mobile-friendly collapsed footprint.
- [x] Reorganize top toolbar into data selection, graph operations, and global groups with shared spacing/alignment utility classes.
- [x] Unify desktop toolbar control sizing across category/graph selectors, search input, and graph operation buttons.
- [x] Add responsive compact toolbar behavior that collapses secondary graph operations into a dropdown on narrow screens.
- [x] Audit `src/styles.css` and component class usage; remove legacy toolbar/legend/button style blocks no longer referenced by Ant Design-based UI.
- [x] Centralize Ant Design theme tokens (`colorPrimary`, radius, border/text colors) in `ConfigProvider` to avoid hard-coded per-component colors.
- [x] Replace reusable inline `style={{ ... }}` layout snippets with semantic CSS classes for drawer, legend, warning bar, error panel, and node-detail/edit UI.
- [x] Refactor node detail overlay from absolute card to responsive drawer/fixed side panel with a mobile full-width strategy.
- [x] Centralize app overlay stacking order (inline JSON drawer, legends, node detail drawer) with explicit z-index rules in `App.tsx`.
- [x] Introduce in-app page mode state (`single`/`overview3d`) with a toolbar "总览" entry, keeping `single` as default and preserving existing single-graph logic.
- [x] Hide `categoryId + graphId`-bound single-graph controls/canvas in `overview3d`, and render a dedicated `Overview3DCanvas` placeholder component.
- [x] Keep editing/export flow local-only.

## Test

- [x] Manual inspection: `src/data/loader.ts` validates category and graph schema.
- [x] Manual inspection: `src/components/GraphSelector.tsx` and `src/App.tsx` wire category/graph switching.
- [x] Manual inspection: `src/App.tsx` handles theme preference initialization, persistence, and root `data-theme` synchronization.
- [x] Manual inspection: `src/styles.css` defines light/dark CSS variables and applies them to major panels and inputs.
- [x] Manual inspection: `src/styles.css` and `src/components/GraphSelector.tsx` use shared CSS variables for react-select, menus, legends, and detail/edit panel neutrals under dark theme.
- [x] Manual inspection: `src/components/GraphSelector.tsx` applies explicit themed Chakra `Select` styling on toolbar dropdowns.
- [x] Manual inspection: `src/components/NodeDetailPanel.tsx`, `src/components/TagLegend.tsx`, `src/components/EdgeTypeLegend.tsx`, and `src/App.tsx` now use shared theme variables for panel/text readability in dark mode.
- [x] Manual inspection: `src/components/NodeDetailPanel.tsx` wraps Tags and Relations in collapsible sections while preserving edit/save behavior.
- [x] Manual inspection: `src/App.tsx` and `src/components/GraphManagementMenu.tsx` increase top toolbar button sizes from `small` to `middle`.
- [x] Manual inspection: `src/App.tsx`, `src/components/TagLegend.tsx`, and `src/components/EdgeTypeLegend.tsx` keep Tags/Relations legend collapse state synchronized with UI and `aria-expanded`.
- [x] Manual inspection: `src/styles.css` gives collapsed legends a smaller mobile width so they obstruct less graph area.
- [x] Manual inspection: `src/App.tsx` renders toolbar in three explicit groups and uses shared `Flex` alignment/gap config instead of per-control inline alignment styles.
- [x] Manual inspection: `src/styles.css`, `src/components/GraphSelector.tsx`, and `src/components/SearchBar.tsx` centralize toolbar sizing/layout classes (`top-toolbar`, `toolbar-group`, `graph-selector-item`, `toolbar-search`).
- [x] Manual inspection: `src/App.tsx` collapses JSON/Fit/Edit actions into a dropdown when the viewport is below the large (`lg`) Ant Design breakpoint.
- [x] Manual inspection: `src/components/GraphCanvas.tsx` adapts node/label colors by current app theme.
- [x] `npm run build:app`
- [x] Manual inspection: `src/components/NodeDetailPanel.tsx` exports updated JSON data.
- [x] Manual inspection: `src/App.tsx` and `src/components/*` now use Ant Design components instead of Chakra UI primitives.
- [x] `npm run build:app` after Ant Design migration.
- [x] Manual inspection: `src/styles.css` retains graph-canvas/layout essentials and removes obsolete legacy button/menu/legend theme blocks.
- [x] Manual inspection: `src/App.tsx` configures core Ant Design theme tokens via `ConfigProvider.theme.token`.
- [x] Manual inspection: `src/components/*` and `src/App.tsx` primarily rely on semantic class names instead of inline static styles.
- [x] Manual inspection: `src/components/NodeDetailPanel.tsx` preserves Label/Description/Tags/Relations/Save editing capabilities after drawer migration.
- [x] Manual inspection: `src/App.tsx` + `src/styles.css` allow inline JSON drawer, node detail drawer, and both legends to render together with deterministic layering.
- [x] Manual inspection: `src/App.tsx` keeps default mode as `single`, and toggles to `overview3d` via toolbar button without changing the existing single-mode data path.
- [x] Manual inspection: `src/components/GraphSelector.tsx` can hide graph selection in overview mode while retaining category selection control.
- [x] Manual inspection: `src/components/Overview3DCanvas.tsx` renders overview placeholder content when app mode is `overview3d`.

## Notes

- Earlier cloud/Appwrite-related scope was extracted and later deprecated by
  the core-package direction in `specs/005-core-package-without-appwrite`.
