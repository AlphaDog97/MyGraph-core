---
status: complete
created: '2026-04-01'
tags:
  - frontend
  - ux
  - graph-loading
priority: medium
created_at: '2026-04-01T00:00:00+00:00'
---

# Inline Graph Loader

> **Status**: complete · **Priority**: medium · **Created**: 2026-04-01

## Overview

Add an inline toolbar UI for pasting `graph.json` node arrays and loading them
into the currently selected graph view without switching category/graph files.

## Design

- Create `InlineGraphLoader` with a textarea, load button, and in-place error
  messaging.
- Keep `onLoad(rawText: string)` as the component output contract.
- Keep loading/error/ready transitions centralized in `App.tsx` by handling
  parse + schema validation there.
- Reuse existing `buildGraphFromRaw` validation to avoid schema drift.
- Extend toolbar styling with dark/light variable-driven textarea and error UI.
- Keep the inline loader as a side drawer that can be moved by UX feedback
  without changing parsing/validation contracts.

## Plan

- [x] Add `InlineGraphLoader` component and accessibility attributes.
- [x] Wire loader into toolbar near `GraphSelector`.
- [x] Implement app-level inline load state (`loading | error | ready`).
- [x] Add stylesheet rules for textarea sizing, resize behavior, and error styles.
- [x] Reposition loader from toolbar into a toggleable left-side drawer overlay.
- [x] Keep inline parse/validation errors inside drawer UI to avoid full-page local dataset confusion.
- [x] Move the inline JSON drawer to the right side for better visual separation from legends.
- [x] Update prompt template hard rules to explicitly list the four supported relation types.

## Test

- [x] `npm run build:app`
- [x] Manual inspection: `InlineGraphLoader` exposes `onLoad(rawText: string)`.
- [x] Manual inspection: parse/schema errors are surfaced in component error area.
- [x] Manual inspection: textarea uses `aria-label="Paste graph.json"` and fixed
      height with vertical resize.
- [x] Manual inspection: toolbar has `JSON加载` button that toggles drawer open/closed.
- [x] Manual inspection: inline load errors render inside drawer error panel.
- [x] Manual inspection: inline loader drawer opens from the right side.
- [x] Manual inspection: `PROMPT_TEMPLATE.md` includes four allowed relation types (`Concept`, `Description`, `Condition`, `Action`).
- [x] Manual inspection: loading inline JSON no longer triggers a follow-up local bootstrap that can replace the view with `Category '...' has no graphs.`
- [ ] `lean-spec validate` (CLI unavailable in environment)
