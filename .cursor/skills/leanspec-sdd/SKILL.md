---
name: leanspec-sdd
description: Use LeanSpec to plan and track non-trivial work in this repository. Trigger when a task changes behavior, spans multiple files, needs design notes, or benefits from a written verification plan.
---

# LeanSpec Spec-Driven Development

This repository uses LeanSpec to keep implementation work aligned with a written spec.

## When to use this skill

Use LeanSpec when the task:

- introduces a feature or workflow
- changes runtime behavior
- spans multiple files or subsystems
- carries enough risk that a design and test plan should be written down

Trivial fixes and isolated copy edits can usually skip a spec.

## Workflow

1. Check existing specs with `lean-spec list`.
2. Reuse an existing spec if it already covers the work.
3. Otherwise create a new spec with:

   ```bash
   lean-spec create feature-name --title "Feature Name"
   ```

4. Keep these sections current while working:
   - `Overview`
   - `Design`
   - `Plan`
   - `Test`
5. Keep status aligned with the work: `planned`, `in-progress`, `complete`, or `archived`.
6. Validate the repository specs before closing the task:

   ```bash
   lean-spec validate
   ```

## Repository conventions

- `specs/001-adopt-leanspec/README.md` is the bootstrap example for this repository.
- Prefer concise specs with a clear plan and explicit verification steps.
- If new work extends an existing effort, update that spec instead of creating duplicates.
