---
status: complete
created: '2026-07-13'
tags:
  - core
  - identity
  - visualization
priority: high
created_at: '2026-07-13T00:00:00+08:00'
---

# Graph Identity and Provenance

> **Status**: complete · **Priority**: high · **Created**: 2026-07-13

## Overview

Prevent unrelated nodes with the same graph-local ID from being merged in the cross-graph overview, while preserving an explicit opt-in path for true shared concepts.

## Design

- Keep `KnowledgeNodeFile.id` graph-local for backward compatibility.
- Generate overview IDs from `categoryId + graphId + localNodeId`.
- Merge nodes only when they declare the same non-empty `globalConceptId`.
- Attach source category, graph, graph label, and local node ID as provenance.
- Treat scoped/shared overview nodes as read-only in the existing detail drawer.

## Plan

- [x] Add scoped identity and provenance types.
- [x] Rewrite overview aggregation to avoid accidental local-ID merging.
- [x] Support explicit `globalConceptId` merging.
- [x] Display provenance and disable unsafe overview editing.

## Test

- [x] Smoke test: equal local IDs in different graphs remain separate.
- [x] Smoke test: equal `globalConceptId` values merge and retain both sources.
- [x] Static inspection: single-graph IDs and export behavior remain unchanged.
