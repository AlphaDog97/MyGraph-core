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

Selected nodes expose four connection handles. Support handle-click then target-click and pointer drag to a target, with a point-to-point preview, target highlight and Escape/background cancellation. Handles follow node movement and canvas transforms. Open the existing relationship dialog with both endpoints prefilled; save only after confirmation. Node details move behind a nearby Details button to keep the canvas usable on mobile.

Keep connection state in a separate hook and overlay; forward current callbacks through refs without rebuilding Cytoscape. Preserve category graph focus and selector behavior. Connections stay within a graph; PATCH validates endpoints against the stored graph like POST. Persist source/target port sides on new edges and expose target handles while connecting. Anchored edges retain their chosen connection points. Orthogonal routing avoids node bounds and penalizes crossings and overlaps; legacy edges infer suitable connection sides automatically. Reconcile edge changes in the live Cytoscape instance when the node set is unchanged, preserving positions, selection, pan and zoom. Append nullable D1 columns with generated migration metadata. 3D retains its existing details interaction.

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


## Connection Refinement

- [x] Persist explicit endpoint sides through API, storage and graph adapters.
- [x] Snap previews and connections to target handles.
- [x] Update relations without rebuilding or rerunning layout for unchanged node sets.
- [x] Verify migration compatibility, CRUD persistence, viewport stability and browser interaction; publish Site version 17.

Refinement verification: 46 checks passed across lifecycle, connection interaction, real Cytoscape data patches, SQLite migration/CRUD/readback, focus and JSON import. TypeScript, production build and LeanSpec validation passed. Browser QA confirmed right-to-left and bottom-to-top connection points and unchanged positions/pan/zoom on repeated saves. The temporary synthetic QA route is removed; authenticated production CRUD was not browser-tested. Local D1 migrations and hosted publication succeeded.

## Routing and Sidebar Refinement

- [x] Route fixed ports with orthogonal bends, node clearance and crossing/overlap costs against previously routed edges. Preserve existing routes when adding an edge; reroute after node movement without relayout. Crossing avoidance is best effort for nonplanar or crowded graphs.
- [x] Replace the relation modal with a nonmodal right sidebar using the current theme; keep the canvas usable.
- [x] Offer exactly Concept, Description, Condition and Action in a dropdown; require an explicit selection for legacy unsupported types.
- [x] Verify routing fixtures, viewport stability, sidebar interactions, four options, TypeScript, regressions and build; publish Site version 18.

Routing/sidebar verification: seven routing checks cover node clearance, crossing detours, long connection endpoint obstacles, parallel lanes, coordinate conversion, preserved existing routes/viewport and a bounded dense fixture. All 53 regression checks and TypeScript passed. Browser QA verified a new connection detours around both a node and an existing line; creation and line editing open a right sidebar with aria-modal=false, four type options, saved Action selection, dark theme, background canvas panning and unchanged viewport on save. The temporary QA route was removed before production build.

Site version 18 deployed successfully. Routing uses bounded coordinate tracks and clearance/crossing/overlap costs; it does not promise a crossing-free embedding for nonplanar, overlapping or very dense graphs. Sidebar is contained within the canvas area so the toolbar stays available.

## Smooth Curve Refinement

- [x] Restore the original Bezier appearance while retaining automatic detours and fixed ports. Render smooth quadratic chains instead of visible orthogonal segments.
- [x] Sample smoothed routes against node bodies and tighten curves only when needed for clearance. Preserve existing color, width, arrows, sidebar, type dropdown and viewport stability.
- [x] Verify smooth routing, collision clearance, browser appearance, TypeScript and production build; publish Site version 19.

Smooth-curve verification: 31 targeted checks passed (nine routing/curve, five live data, ten lifecycle and seven focus); TypeScript, build and LeanSpec validation passed. The browser showed smooth Bezier detours around nodes and an existing connection with the original colors/width/arrows. Temporary QA route removed; version 19 deployed successfully.
