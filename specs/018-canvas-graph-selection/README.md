---
status: complete
created: '2026-10-21'
tags: [sites, graph, selection]
priority: medium
---

# Canvas Graph Selection and Scoped Tag Legend

## Overview

While viewing all category graphs, clicking a graph must focus it at readable
scale and update the graph selector. Show tag legends only for a selected graph.

## Design

- Add optional onGraphFocus to GraphCanvas, stored in a ref so new handlers do
  not rebuild Cytoscape or detach the existing resize observer.
- First tap on another graph's node or edge requests its owning graph through
  the same workspace focus action as the selector; this clears previous search
  and node selection. A subsequent node tap opens normal node details.
- An overview background tap inside exactly one cluster's padded node bounds
  selects it. Ignore gaps and overlapping/ambiguous bounds. Prefer current graph
  membership for nodes with multiple provenance entries.
- Workspace focus state drives the selector, existing readable viewport effect,
  palette and scoped tag legend. Keep all category graphs loaded/rendered.
- Hide tag legends when no graph is selected; retain relationship-type legend.
  Show all/reset clears focus and therefore hides the tag legend again.
- Callers without onGraphFocus retain the original immediate node-detail action.

## Plan

- [x] Wire canvas node/edge/cluster taps into workspace graph focus.
- [x] Gate tag legend on graph selection and use current-graph palette tags.
- [x] Check event callbacks, real cluster geometry, focus state and legend JSX.

## Test

- [x] test-graph-canvas-lifecycle.cjs: 9 cases cover node first/second tap, edge
  selection, cluster background selection, fresh callbacks, legacy callers,
  renderer stability, size readiness and cleanup.
- [x] test-graph-focus.cjs: 7 real headless Cytoscape cases cover cluster bounds,
  ambiguity, shared provenance and existing readable viewport math.
- [x] In-memory check of actual workspace hook proves focus/selector state sync,
  clearing previous search/node state, overview reset and category aggregation.
- [x] Actual tag-legend JSX evaluation covers overview hiding, selected tag props
  and reset; TypeScript and whitespace checks pass.
- [ ] Authenticated browser/touch interaction and screenshot QA not performed.
  Tests verify state, callback wiring and viewport math, not rendered pixels.

## Notes

No graph data, auth, persistence, styles or 3D interaction changes. Existing
Cytoscape style warnings are unchanged. Script transpilation targets ES2022 to
match application support for Map/Set iteration.
