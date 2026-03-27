---
status: archived
created: '2026-03-24'
tags:
  - frontend
  - auth
  - appwrite
priority: high
created_at: '2026-03-24T00:00:00+00:00'
---

# Appwrite Authentication Integration (Archived)

> **Status**: archived · **Priority**: high · **Created**: 2026-03-24

## Overview

This spec is archived. Appwrite auth integration is no longer part of current
repository scope after the core-package decoupling.

## Design

- Superseded by local-first core package architecture.
- Runtime code under `src/` no longer depends on Appwrite auth modules.

## Plan

- [x] Mark this spec archived to reflect current product direction.

## Test

- [x] Static inspection: repository has no active `src/auth/` module.
- [x] Static inspection: package exports in `src/lib.ts` are Appwrite-free.
