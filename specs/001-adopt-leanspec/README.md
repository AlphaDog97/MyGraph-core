---
status: complete
created: '2026-03-19'
tags:
  - tooling
  - workflow
priority: medium
created_at: '2026-03-19T09:19:23.829790665+00:00'
---

# Adopt LeanSpec

> **Status**: complete · **Priority**: medium · **Created**: 2026-03-19

## Overview

Bootstrap the repository with LeanSpec so future work can be planned, tracked,
and validated through lightweight specs instead of ad hoc chat history alone.

## Design

Initialize LeanSpec in the repository root, keep the generated `.lean-spec`
configuration and `specs/` directory under version control, and add repository
documentation that explains when and how to use specs.

Because the upstream `lean-spec init` flow attempted to install a non-working
`leanspec-sdd` skill in this non-interactive environment, the repository also
includes a local Cursor skill at `.cursor/skills/leanspec-sdd/SKILL.md` so the
workflow is self-contained and reproducible from git alone.

## Plan

- [x] Initialize LeanSpec in the repository root.
- [x] Add repository guidance for agents and humans.
- [x] Provide a local Cursor skill for spec-driven development.

## Test

- [x] `lean-spec list` shows the bootstrap spec.
- [x] `lean-spec validate` passes for the repository specs.
- [x] Repository contains committed LeanSpec config, docs, and starter skill.

## Notes

- `lean-spec init -y` completed successfully for project files but failed during
  optional skill installation because the CLI requested `leanspec-sdd` while
  the upstream skill catalog exposed a different skill name.
- A project-local skill avoids depending on local machine state and keeps the
  workflow available to any contributor cloning the repository.
