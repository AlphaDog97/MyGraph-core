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
- [ ] Browser visual, submenu interaction and narrow-screen QA unavailable:
  control-browser is absent in the managed environment. No screenshots claimed.

## Notes

No database, auth flow, graph data, canvas lifecycle or zoom changes. The existing
search component gains an optional placeholder, retaining its original default.
