---
status: complete
created: '2026-07-13'
tags:
  - core
  - schema
  - validation
priority: high
created_at: '2026-07-13T00:00:00+08:00'
---

# Versioned Schema and Diagnostics

> **Status**: complete · **Priority**: high · **Created**: 2026-07-13

## Overview

Add a backward-compatible schema version and structured graph diagnostics so applications can build reliable graph-health workflows instead of parsing warning strings.

## Design

- Current document version is `schemaVersion: 1`; a missing version is treated as v1.
- Reject unsupported versions and malformed manifest/category documents.
- Return diagnostics with severity, code, path, message, and optional suggestion.
- Detect invalid nodes, duplicate IDs, broken links, unknown relation types, duplicate edges, self-links, and isolated nodes.
- Keep `KnowledgeGraph.warnings` for the existing Demo UI.

## Plan

- [x] Add diagnostic types and graph-node analysis.
- [x] Tighten optional field validation.
- [x] Add schema-version and duplicate graph/category checks.
- [x] Update prompt and README documentation.

## Test

- [x] Smoke test: broken links produce `BROKEN_LINK`.
- [x] Smoke test: unknown types produce `UNKNOWN_EDGE_TYPE`.
- [x] Backward compatibility: current files without `schemaVersion` load as v1.
