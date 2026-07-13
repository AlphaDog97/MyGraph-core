---
status: complete
created: '2026-07-13'
tags:
  - core
  - adapters
  - loading
priority: high
created_at: '2026-07-13T00:00:00+08:00'
---

# Graph Source Adapters

> **Status**: complete · **Priority**: high · **Created**: 2026-07-13

## Overview

Decouple reusable loading APIs from Vite-specific paths and make HTTP, memory, Appwrite, GitHub, or other storage implementations interchangeable.

## Design

- Introduce `GraphSource.loadManifest` and `GraphSource.loadCategory`.
- Introduce injectable `KeyValueStorage` with browser and memory implementations.
- Preserve existing loader signatures by using a default HTTP source.
- Resolve relative browser URLs from `document.baseURI`, without `import.meta.env` in core data modules.
- Cache manifest/category promises and remove failed entries from cache.
- Load each category once when constructing the all-graph overview.

## Plan

- [x] Add `GraphSource`, `HttpGraphSource`, and `MemoryGraphSource`.
- [x] Replace direct localStorage access with an injectable storage adapter.
- [x] Remove Vite environment access from `src/data/loader.ts`.
- [x] Add optional source and abort-signal parameters without breaking existing calls.
- [x] Optimize overview loading at category granularity.

## Test

- [x] Smoke test: repeated category reads issue one HTTP request.
- [x] Smoke test: custom source can build an overview graph.
