---
status: complete
created: '2026-07-13'
tags:
  - core
  - testing
  - ci
  - npm
priority: high
created_at: '2026-07-13T00:00:00+08:00'
---

# Core Test and Release Pipeline

> **Status**: complete · **Priority**: high · **Created**: 2026-07-13

## Overview

Add dependency-free core smoke tests and CI release guardrails before expanding the package with cloud or AI integrations.

## Design

- Run tests against the actual generated `dist/index.js` package output.
- Keep tests on Node built-ins to avoid adding another framework dependency.
- Verify typecheck, core tests, Demo build, and npm package contents on pushes and pull requests.
- Run core tests automatically through `prepublishOnly`.

## Plan

- [x] Add `typecheck`, `test`, `test:smoke`, and `prepublishOnly` scripts.
- [x] Add identity, diagnostics, merge, custom-source, and cache smoke tests.
- [x] Add GitHub Actions Core CI workflow.
- [x] Correct package repository metadata and mark package side-effect free.

## Test

- [x] `npm run typecheck` configured in CI.
- [x] `npm test` builds and tests the published entry point.
- [x] `npm run build:app` configured in CI.
- [x] `npm pack --dry-run` configured in CI.
