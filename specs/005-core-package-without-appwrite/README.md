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
- [x] Refresh dark/light mode toggle icons to a friendlier rounded style.
- [x] Align repository licensing from ISC to MIT (`package.json` + `LICENSE`).
- [x] Rework README structure for onboarding: project intro → why this library → quick start → application flow.
- [x] Migrate shared UI components to Chakra UI primitives for consistent styling contracts.
- [x] Replace toolbar dark/light toggle SVGs with React Icons `FaMoon` / `FaSun`.
- [ ] Add `.npmignore` or `files` review checklist to prevent accidental publish of non-package assets.
- [ ] Add `prepublishOnly` script to guarantee `build:lib` runs before publish.
- [x] Add repository metadata fields (`repository`, `homepage`, `bugs`, `keywords`) in `package.json`.
- [x] Verify LICENSE content matches `package.json` license identifier.
- [ ] Prepare automated release flow (versioning + changelog + npm token CI).

## Test

- [x] Static inspection: `package.json` exports map points to `dist/index.js` + `dist/lib.d.ts`.
- [x] Static inspection: `src/lib.ts` exports reusable domain/data modules.
- [x] Static inspection: `package.json` now includes author/keywords/repository/homepage/bugs metadata.
- [x] Static inspection: root `LICENSE` file now matches MIT license declaration.
- [x] Visual inspection: theme toggle uses updated moon/sun icon paths in toolbar.
- [x] Manual doc QA: README now follows intro → value proposition → quick start → AI-template usage flow.
- [x] `npm pack --dry-run` reviewed for publish payload.
- [x] `npm run build`
- [x] `npm run build:app` after Chakra UI + React Icons migration.
- [ ] Publish smoke test from fresh consumer project.
