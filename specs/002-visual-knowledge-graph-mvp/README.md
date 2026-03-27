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
- [x] Implement graph loading, validation, and Cytoscape transformation.
- [x] Implement search, node detail panel, and graph legend UI.
- [x] Keep editing/export flow local-only.

## Test

- [x] Manual inspection: `src/data/loader.ts` validates category and graph schema.
- [x] Manual inspection: `src/components/GraphSelector.tsx` and `src/App.tsx` wire category/graph switching.
- [x] Manual inspection: `src/components/NodeDetailPanel.tsx` exports updated JSON data.

## Notes

- Earlier cloud/Appwrite-related scope was extracted and later deprecated by
  the core-package direction in `specs/005-core-package-without-appwrite`.
