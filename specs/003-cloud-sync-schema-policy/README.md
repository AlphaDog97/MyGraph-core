---
status: complete
created: '2026-03-24'
tags:
  - backend
  - database
  - auth
  - sync
priority: high
created_at: '2026-03-24T00:00:00+00:00'
---

# Cloud Sync Schema & Permission Policy

> **Status**: complete · **Priority**: high · **Created**: 2026-03-24

## Overview

Confirm the initial cloud data model naming and permission defaults so backend
setup can proceed without ambiguity.

## Design

### Table naming

Use the following table names as the canonical identifiers:

- `graphs`
- `nodes`
- `edges`
- `node_tags`
- `user_preferences`

### Permission policy

- Public graph read access for anonymous users: **enabled**.
- Unauthenticated cloud sync for edits: **disabled**.
  - Guest users may export/download JSON locally, but cannot write edits to
    cloud storage until authenticated.

## Plan

- [x] Confirm canonical table naming.
- [x] Confirm anonymous read policy for published graphs.
- [x] Confirm guest edit behavior is local-download only.

## Test

- [x] Policy decisions captured in a committed spec for implementation teams.
- [x] Table names are documented exactly once with canonical spelling.

