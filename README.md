# MyGraph

## LeanSpec

This repository uses LeanSpec to capture non-trivial work as lightweight specs.

### Included project files

- `.lean-spec/config.json` - LeanSpec project configuration
- `specs/` - versioned specifications
- `AGENTS.md` - repository rules for AI agents
- `.cursor/skills/leanspec-sdd/SKILL.md` - project-local Cursor skill for spec-driven work

### Quick start

```bash
# List existing specs
lean-spec list

# Create a new spec
lean-spec create feature-name --title "Feature Name"

# Validate spec structure
lean-spec validate
```

### When to create or update a spec

Create or update a spec when the work:

- changes behavior
- spans multiple files
- needs design notes before implementation
- introduces a new feature, workflow, or integration

Small copy edits or trivial one-line changes can usually skip a spec.