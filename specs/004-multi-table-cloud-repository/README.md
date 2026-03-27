---
status: archived
created: '2026-03-24'
tags:
  - backend
  - appwrite
  - migration
priority: high
created_at: '2026-03-24T00:00:00+00:00'
---

# Multi-table Cloud Repository & Legacy Migration (Archived)

> **Status**: archived · **Priority**: high · **Created**: 2026-03-24

## Overview

This spec is archived. Multi-table Appwrite repository and migration work was
removed from active scope when the project was simplified into a reusable core
npm package.

## Design

- Cloud repository/migration pipeline is no longer a maintained runtime path.
- Repository now centers on `src/domain/*` and `src/data/*` local graph APIs.

## Plan

- [x] Archive legacy cloud repository spec.

## Test

- [x] Static inspection: exported package API in `src/lib.ts` contains only domain/data modules.
