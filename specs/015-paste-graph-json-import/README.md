---
status: complete
created: '2026-10-15'
tags: [sites, import, json]
priority: medium
---

# Paste JSON Graph Import

## Overview

Restore paste-to-import for AI-generated graph JSON in the database-backed Site.
Keep category aggregation and original graph styling; imported data must survive reloads.

## Design

- Toolbar opens a bounded dialog with a category selector, fallback graph name,
  JSON input, sample and copyable AI prompt.
- Accept legacy node arrays, a single `{graphLabel,nodes}` document, and the
  original `{categoryId,graphs:[{graphId,graphLabel,nodes}]}` category bundle.
  Accept a surrounding JSON Markdown fence. Destination always comes from the
  user's selected existing category, not the JSON categoryId.
- A shared parser validates previews and server input independently, checks
  duplicate IDs, field types and graph-local link targets, then shows counts.
- Imports always create new graph/node/edge IDs. Repeated names never overwrite.
- The existing API session guard runs before input parsing. Bound streamed body
  size to 1 MiB, JSON to 200k characters and total imported records to 400.
- One D1 batch saves all records atomically. No schema or auth changes.
- Refresh category data after import; focus the new graph for single imports.
  If refresh fails after saving, report saved state instead of offering to retry.
- Keep parser, database persistence, API handler, dialog and examples separate.

## Plan

- [x] Add preview/validation, sample and copyable AI prompt.
- [x] Add authenticated bulk import with atomic writes and fresh IDs.
- [x] Connect category refresh and viewport focus after successful import.
- [x] Check parser, SQLite writes, rollback, API rejection and production build.

## Test

- [x] `node scripts/test-graph-import.cjs`: 10 cases cover formats, invalid fields,
  duplicate IDs, dangling links, limits, persisted nodes/edges, copies, rollback,
  nonexistent categories, auth rejection and API success.
- [x] `node scripts/test-graph-canvas-lifecycle.cjs`: existing 5 cases pass.
- [x] TypeScript `--noEmit --incremental false` passes.
- [ ] Browser interaction: not run because the managed environment lacks the
  required control-browser skill. SQLite integration uses actual migrations and
  application SQL with a transactional D1 adapter; authentication is stubbed.

## Notes

No production sample data is imported during validation. Native deployment and
GitHub handoff are recorded in the completion message.
