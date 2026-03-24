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
load/save/list, provide a one-time migration script from legacy rows, and
version Appwrite table schema in-repo for repeatable environments.

## Design

### Canonical tables

- `graphs`
- `nodes`
- `edges`
- `tags`
- `node_tags`
- `user_preferences`

### Field model

#### `graphs`

- `graph_key` (string, required, unique lookup key)
- `category_id` (string, required)
- `graph_id` (string, required)
- `owner_user_id` (string, required)
- `visibility` (enum: `public|private`, required, default `private`)

#### `nodes`

- `graph_key` (string, required)
- `node_id` (string, required)
- `label` (string, required)
- `description` (string, optional)

#### `edges`

- `graph_key` (string, required)
- `edge_id` (string, required)
- `source_node_id` (string, required)
- `target_node_id` (string, required)
- `edge_type` (string, required)
- `edge_label` (string, optional)

#### `tags`

- `graph_key` (string, required)
- `tag` (string, required)

#### `node_tags`

- `graph_key` (string, required)
- `node_id` (string, required)
- `tag` (string, required)

#### `user_preferences`

- `user_id` (string, required)
- `preference_key` (string, required)
- `preference_json` (stringified JSON, required)

### Index strategy

- `graphs`: `graph_key` key index; composite indexes on
  `owner_user_id + visibility` and `category_id + graph_id`.
- `nodes`: key indexes on `graph_key` and `graph_key + node_id`.
- `edges`: key indexes on `graph_key`, `graph_key + edge_id`, and
  `graph_key + source_node_id + target_node_id`.
- `tags`: key indexes on `graph_key` and `graph_key + tag`.
- `node_tags`: key indexes on `graph_key`, `graph_key + node_id`, and unique
  index on `graph_key + node_id + tag`.
- `user_preferences`: key index on `user_id`; unique index on
  `user_id + preference_key`.

### Permission policy

- Anonymous users: read `public` graphs only.
- Authenticated users: write only rows where `owner_user_id` equals current user.
- `user_preferences` rows are user-scoped (read/write by authenticated users only).
- Unauthenticated cloud writes are blocked by client logic and table permissions.

### Save transaction strategy (logical transaction)

1. Upsert `graphs`
2. Diff + upsert `nodes`
3. Rebuild `edges` for the graph (full refresh)
4. Rebuild `tags` and `node_tags`

### Query strategy

1. Query `graphs` to resolve `graph_key`
2. Batch query `nodes` / `edges` / `node_tags` (+ `tags`) by `graph_key`
3. Recompose to front-end `KnowledgeGraph`

### Migration strategy

- Source: legacy single table where one row stores `nodes` JSON array.
- Script: `scripts/migrate-single-table-to-multi-table.mjs`.
- Mode:
  - `--dry-run`: validation-only, no writes.
  - without `--dry-run`: upsert into normalized tables.
- Idempotency:
  - deterministic row IDs (`<graph_key>--...`) enable safe re-runs.
- Rollout:
  1. Push schema (`appwrite push tables`)
  2. Run migration in dry-run
  3. Run migration for real
  4. Deploy frontend using multi-table env vars


### 2026-03-24 follow-up scope

- Bind `appwrite.json` to the target cloud environment:
  - endpoint: `https://sgp.cloud.appwrite.io/v1`
  - project: `69bd040e000949b8a413`
  - database: `69bd042e000bc22ca3f4`
- Add a non-interactive schema apply script that uses `APPWRITE_API_KEY`.
- Keep authentication explicitly email-only (no GitHub OAuth UI/service paths).

## Plan

- [x] Replace single-table env usage with per-table env IDs.
- [x] Implement repository interface + cloud wrappers used by UI.
- [x] Enforce read/write policy checks in client repository logic.
- [x] Add one-time offline migration script for legacy rows.
- [x] Add versioned Appwrite schema files in repository.
- [x] Update docs and app wiring to the new repository + table push flow.
- [x] Bind Appwrite project endpoint/database IDs in `appwrite.json`.
- [x] Add scripted schema push flow for the target cloud project.
- [x] Re-verify auth remains email-only with no OAuth login path.

## Test

- [x] `lean-spec list`
- [x] `lean-spec validate`
- [x] `npm run build`
- [x] `appwrite --version`
- [x] `./scripts/apply-appwrite-schema.sh` *(expected failure without `APPWRITE_API_KEY`; guardrail verified)*
- [x] Manual review: auth module exposes email login/register + guest mode only, and does not include GitHub OAuth actions.
- [x] Manual review: Appwrite schema file includes fields/indexes/permissions for all canonical tables.
