# workspace

## LeanSpec workflow

This repository uses LeanSpec for spec-driven development.

### Default process

1. Review current specs with `lean-spec list`.
2. Create a new spec before non-trivial implementation work with `lean-spec create <slug> --title "<Title>"`.
3. Keep the spec's `Overview`, `Design`, `Plan`, and `Test` sections up to date as the work evolves.
4. Update the spec status to match reality: `planned`, `in-progress`, `complete`, or `archived`.
5. Run `lean-spec validate` before considering the work done.

### Starter example

- Use `specs/001-adopt-leanspec/README.md` as the first in-repo example of how we document work with LeanSpec.

## Project-specific rules

- Prefer updating an existing spec when continuing previously scoped work.
- Keep specs concise and action-oriented.
- Record verification steps in the spec's `Test` section, not only in chat or commit messages.
