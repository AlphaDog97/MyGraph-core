---
status: in-progress
created: '2026-03-27'
tags:
  - core
  - packaging
  - cleanup
  - npm
priority: high
created_at: '2026-03-27T00:00:00+00:00'
---

# Core Package without Appwrite

> **Status**: in-progress · **Priority**: high · **Created**: 2026-03-27

## Overview

Turn this repository into a reusable core package by removing Appwrite-specific
runtime dependencies and exposing reusable graph-domain/data modules through an
npm package entry, then complete npm publish readiness checks.

## Design

- Runtime and exports remain Appwrite-free.
- Package entry is `src/lib.ts`, build output in `dist/`.
- Keep demo app for local verification while ensuring npm consumers can import
  from `@mygraph/core` with stable typings.
- Add release-readiness guardrails for npm publication.

## Plan

- [x] Remove Appwrite-dependent UI/data/auth runtime wiring.
- [x] Add npm packaging outputs and exports for core modules.
- [x] Update docs to reflect new core-package direction.
- [ ] Add `.npmignore` or `files` review checklist to prevent accidental publish of non-package assets.
- [ ] Add `prepublishOnly` script to guarantee `build:lib` runs before publish.
- [x] Add repository metadata fields (`repository`, `homepage`, `bugs`, `keywords`) in `package.json`.
- [x] Verify LICENSE content matches `package.json` license identifier.
- [ ] Prepare automated release flow (versioning + changelog + npm token CI).

## Test

- [x] Static inspection: `package.json` exports map points to `dist/index.js` + `dist/lib.d.ts`.
- [x] Static inspection: `src/lib.ts` exports reusable domain/data modules.
- [x] Static inspection: `package.json` now includes author/keywords/repository/homepage/bugs metadata.
- [x] Static inspection: root `LICENSE` file now matches ISC license declaration.
- [x] `npm pack --dry-run` reviewed for publish payload.
- [ ] Publish smoke test from fresh consumer project.
