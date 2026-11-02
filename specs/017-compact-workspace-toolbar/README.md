---
status: complete
created: '2026-10-20'
tags: [sites, ui, toolbar]
priority: medium
---

# Compact Workspace Toolbar

## Overview

Reduce clutter in the existing MyGraph header without losing graph navigation,
search, JSON import, editing, theme controls or account access.

## Design

- Extract a 72-line WorkspaceToolbar from the shell; retain the original glass
  surfaces and shared theme tokens.
- Keep category/graph selectors and a flexible, localized search input together.
- Show a compact 2D/3D segmented control, an accessible fit-all icon, a single
  Operations menu, theme switch and account avatar.
- Combine JSON import, node/graph/category creation and tag colors in Operations;
  nest existing edit/delete actions under Manage current content. Deletions still
  use the existing confirmation dialog and creation availability follows context.
- Move the GitHub link into the account menu, alongside the existing signout.
- Use deterministic grid areas: a desktop row, a second search row on tablets,
  and separate location/search rows on phones. Prevent search-focus width growth.
- Hide category-specific search/reset/graph selection in 3D, keeping the mode
  control visible. Import from 3D switches back to category mode.
- Follow-up: tag palette rows follow the selected graph. Selecting all graphs
  uses current-category tags; 3D uses the displayed overview tags. Missing or
  untagged graphs show an empty palette instead of falling back to unrelated tags.
  Show the scope name and tag count; preserve existing saved colors.

## Plan

- [x] Consolidate controls and extract a short, readable toolbar component.
- [x] Preserve action handlers, confirmation dialogs and empty-selection guards.
- [x] Add scoped responsive CSS without changing canvas layout or viewport logic.

## Test

- [x] TypeScript no-emit check and git diff whitespace check pass.
- [x] In-memory checks exercised import/colors/node callbacks; new category/graph
  payloads; edit/delete targets; empty-state disabled flags; GitHub/signout access.
- [x] Actual React/Ant Design server rendering verified 2D controls and localized
  search, plus the absence of category-only controls in 3D.
- [x] Palette checks cover two graph selections, category fallback, deduplication,
  missing/empty graphs, unchanged source tags and scope title/count.
- [ ] Browser visual, submenu interaction and narrow-screen QA unavailable:
  control-browser is absent in the managed environment. No screenshots claimed.

## Notes

No database, auth flow, graph data, canvas lifecycle or zoom changes. The existing
search component gains an optional placeholder, retaining its original default.

## Control Alignment Refinement

- [x] Center the theme switch handle and both icons within its existing track; verify neighboring button and account-avatar centers. Keep the change scoped to the workspace toolbar.
- [x] Verify checked/unchecked controls and shared vertical centers in desktop/mobile layouts and both themes, then build and publish.

Alignment verification: the original small switch handle was four pixels above the track center. Browser measurements after the scoped CSS change show exact vertical centers for the track, handle, active moon/sun icon and neighboring controls in both states: desktop y=105 and 390px iframe y=99. Theme toggles and Operations-menu opening worked. The temporary synthetic toolbar fixture was removed before the production build.

TypeScript, production build, whitespace checks and LeanSpec validation passed. Published Site version 22. No authentication, graph, viewport or data changes.
