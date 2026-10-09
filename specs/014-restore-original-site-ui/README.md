---
status: in-progress
created: '2026-10-09'
tags: [sites, ui, regression]
priority: high
---

# Restore Original Site UI and Reliable Canvas Startup

## Overview

Keep the original category-wide graph workspace, including search and graph
viewport navigation. Correct blank startup after login without requiring a theme
toggle. Synchronize the previously uncommitted original-ui Site source into GitHub.

## Design

The workspace controller returns a new object on each render. Its selection
callback depended on that object, causing GraphCanvas to destroy/recreate
Cytoscape on unrelated parent updates while its independent ResizeObserver
remained bound to the destroyed instance. Hook-level regression checks reproduced
this lifecycle mismatch; authenticated visual reproduction remains outstanding.

- Keep renderer creation and size observation in one effect; clean up their own instance.
- Read selection handlers from a ref rather than rebuilding on callback changes.
- Wait for nonzero canvas dimensions and rerun preference/search effects when ready.
- Use an explicit viewport height instead of inherited percentage height.
- Restore device preferences after hydration, before mounting the canvas.
- Preserve graph aggregation, original styling, server authentication and CRUD.

## Plan

- [x] Restore the original UI snapshot and Site data adapter in the repository.
- [x] Fix startup sizing, renderer ownership and hydration preference ordering.
- [x] Add bounded lifecycle regression checks and validate the production build.
- [ ] Confirm the user's actual post-login blank-screen symptom no longer occurs.

## Test

- [x] `node scripts/test-graph-canvas-lifecycle.cjs` in the hosted source: 5 cases pass.
  Before the patch, callback/parent-render retention, theme retention, zero-size
  startup and deferred-init cleanup checks failed; graph replacement passed.
- [x] `node node_modules/typescript/bin/tsc --noEmit --incremental false`.
- [x] Production build via the Sites build helper; all app/auth/API routes built.
- [x] Sites v10 deployment succeeded at the existing URL, preserving public access.
- [ ] Authenticated browser QA: login without toggling the theme, reload in both
  themes, search, select a graph, resize and verify nodes plus relationship lines.

## Notes

The managed environment lacks the required control-browser skill, so no browser
QA was attempted through an alternate control path. Hook mocks verify lifecycle
ownership, not pixel output or the complete login flow. Keep this spec in progress
until the real login scenario is confirmed.

Validated Site source commit: `01306235429d70550870334fc9ee1a7669a6d514` (v10).
