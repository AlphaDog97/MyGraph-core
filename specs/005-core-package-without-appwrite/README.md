---
status: complete
created: '2026-03-27'
tags:
  - core
  - packaging
  - cleanup
priority: high
created_at: '2026-03-27T00:00:00+00:00'
---

# Core Package without Appwrite

> **Status**: complete · **Priority**: high · **Created**: 2026-03-27

## Overview

Turn this repository into a reusable core package by removing Appwrite-specific
runtime dependencies and exposing reusable graph-domain/data modules through an
npm package entry.

## Design

- Remove Appwrite cloud persistence and auth integration from runtime UI flow.
- Keep local graph loading and graph editing download workflow unchanged.
- Add package export entry (`src/lib.ts`) for reusable domain/data APIs.
- Add dedicated library build configuration to emit JS bundle + `.d.ts` files.
- Remove the repository-local Cursor LeanSpec skill so workflow guidance is docs-first.

## Plan

- [x] Remove Appwrite-dependent UI/data/auth runtime wiring.
- [x] Remove Appwrite config and schema artifacts from repository root paths.
- [x] Add npm packaging outputs and exports for core modules.
- [x] Run project build and type checks for app + library targets.
- [x] Update docs to reflect new core-package direction.
- [x] Remove `.cursor/skills/leanspec-sdd` and update AGENTS guidance.

## Test

- [x] `npm run build`
- [x] `npm run build:lib`
- [ ] `lean-spec validate` *(blocked: CLI unavailable in container)*
