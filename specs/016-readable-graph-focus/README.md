---
status: complete
created: '2026-10-15'
tags: [sites, graph, viewport]
priority: medium
---

# Readable Graph Focus Zoom

## Overview

Selecting a graph previously fitted its entire bounds, making labels too small
on large graphs. Prioritize legibility when focusing a specific graph while
preserving category aggregation and the full-category overview.

## Design

- Extract viewport behavior into graphCanvasViewport.ts, reducing GraphCanvas size.
- Fit selected nodes and internal edges with 64px padding, then constrain focus
  zoom to 1.5–2 within the core's permitted zoom range.
- At 1.5 zoom the existing 12.5px node and 9.5px edge labels render around 19px
  and 14px. Large graphs may extend outside the viewport at this readable scale.
- For graphs too large to fit, center on a root nearest the graph's center;
  for cyclic graphs use the nearest actual node to avoid centering empty space.
- Compute identical zoom/pan for animated and instant/reduced-motion focus.
- Clear previous animation queues when choosing another graph.
- Preserve full-category fit, initial category view, styles, search and layout.

## Plan

- [x] Implement readable focus with real-node anchoring for large graphs.
- [x] Connect normal and initial focus paths without changing renderer ownership.
- [x] Check small/large/mobile graphs, overview, invalid targets and rapid switches.

## Test

- [x] test-graph-focus.cjs: 6 real headless Cytoscape cases pass, including
  rendered font sizes and root positions, mobile scale, bounded small-graph zoom,
  category overview, unknown targets/hidden containers and animation target parity.
- [x] Existing 5 GraphCanvas lifecycle cases pass; the extracted viewport is
  mocked there and exercised with real Cytoscape in the new test file.
- [x] TypeScript no-emit check passes.
- [ ] Browser pixel/interaction QA unavailable because control-browser is absent.
  Headless checks cover viewport math and real core behavior, not visual screenshots.

## Notes

The existing stylesheet emits warnings about unsupported shadow/font weight
properties in headless Cytoscape; this change preserves that stylesheet.
