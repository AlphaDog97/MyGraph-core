---
status: complete
created: '2026-10-21'
tags: [sites, graph, editing]
priority: medium
created_at: '2026-10-21T06:00:31.817730824+00:00'
---

# Visual Edge Editing and Node Connection Handles

> **Status**: complete · **Priority**: medium · **Created**: 2026-10-21

## Overview

Create relationships visually in the existing 2D Site canvas and edit a relationship directly by clicking its line or label.

## Design

Selected nodes expose four connection handles. Support handle-click then target-click and pointer drag to a target, with a curved preview, target highlight and Escape/background cancellation. Handles follow node movement and canvas transforms. Open the existing relationship dialog with both endpoints prefilled; save only after confirmation. Node details move behind a nearby Details button to keep the canvas usable on mobile.

Keep connection state in a separate hook and overlay; forward current callbacks through refs without rebuilding Cytoscape. Preserve category graph focus and selector behavior. Connections stay within a graph; PATCH validates endpoints against the stored graph like POST. Existing lines retain automatic routing; handles do not store fixed anchors or bend points. 3D retains its existing details interaction.

## Plan

- [x] Add connection geometry, overlay and cancelable pointer interaction.
- [x] Connect independent edge editing, deletion and prefilled creation dialog.
- [x] Validate edited endpoints and retain renderer lifecycle behavior.
- [x] Validate and publish Site version 16; prepare a stacked GitHub PR.

## Test

- [x] Browser QA with temporary synthetic graph: click-connect, drag-connect, prefilled source/target, save form, edge editor, Escape, zoom, dark theme and node movement. Remove the fixture before production build. Authenticated production CRUD is covered with SQLite route tests, not a live signed-in browser session.
- [x] Connection hook regression checks: four handles, directional path, click/drag, self/cross-graph rejection, blank release, Escape, scope changes and listener cleanup.
- [x] SQLite route tests: login requirement, create, edit endpoints/type/label, reject cross-graph/missing targets, stale edge and delete.
- [x] 38 regression checks passed across canvas lifecycle, connections, SQLite edges, graph focus and JSON import; TypeScript and production build passed.
- [x] LeanSpec validation passed; version 16 deployed successfully. Temporary QA route is absent from the final source and production route list.

