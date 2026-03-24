---
status: complete
created: '2026-03-24'
tags:
  - backend
  - appwrite
  - sync
  - migration
priority: high
created_at: '2026-03-24T00:00:00+00:00'
---

# Multi-table Cloud Repository & Legacy Migration

> **Status**: complete · **Priority**: high · **Created**: 2026-03-24

## Overview

Replace the deprecated single-table Appwrite model (`VITE_APPWRITE_TABLE_ID`) with
normalized multi-table storage. Add a repository abstraction for graph
load/save/list and provide a one-time migration script from legacy rows.

## Design

### Canonical tables

- `graphs`
- `nodes`
- `edges`
- `tags`
- `node_tags`
- `user_preferences`

### Repository interface

- `loadGraph(categoryId, graphId, ownerId?)`
- `saveGraph(graphMeta, nodes, edges, tags)`
- `listGraphs(ownerId | visibility)`

### Save transaction strategy (logical transaction)

1. Upsert `graphs`
2. Diff + upsert `nodes`
3. Rebuild `edges` for the graph (full refresh)
4. Rebuild `tags` and `node_tags`

### Query strategy

1. Query `graphs` to resolve `graph_key`
2. Batch query `nodes` / `edges` / `node_tags` (+ `tags`) by `graph_key`
3. Recompose to front-end `KnowledgeGraph`

### Permission policy

- Anonymous users: read `public` graphs only.
- Authenticated users: write only rows where `owner_user_id` equals current user.
- Unauthenticated cloud writes are blocked.

## Plan

- [x] Replace single-table env usage with per-table env IDs.
- [x] Implement repository interface + cloud wrappers used by UI.
- [x] Enforce read/write policy checks in client repository logic.
- [x] Add one-time offline migration script for legacy rows.
- [x] Update docs and app wiring to the new repository.

## Test

- [x] `npm run build`
- [x] `node scripts/migrate-single-table-to-multi-table.mjs --dry-run` (fails fast without env, confirming guardrails)
- [x] Manual review of repository methods against required APIs.
