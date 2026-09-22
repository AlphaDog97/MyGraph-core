---
status: in-progress
created: '2026-09-22'
tags:
  - sites
  - github
  - automation
  - auth
priority: high
created_at: '2026-09-22T02:46:52.303182108+00:00'
---

# Sites App and GitHub Deployment

> **Status**: in-progress · **Priority**: high · **Created**: 2026-09-22

## Overview

Move the existing MyGraph Sites application into the original
`AlphaDog97/MyGraph-core` repository under `site/` without changing the core
package or Vite demo. Establish a repeatable deployment path so merges to
`main` publish the nested app to the existing Sites project.

## Design

- Keep the root npm package, `src/`, `graph-data/`, and GitHub Pages workflow
  intact.
- Store the complete Sites source, migrations, lockfile, and hosting metadata
  under `site/`; exclude local environments, dependencies, build output, and
  tool/runtime state.
- Keep Supabase credentials in the Sites environment. Commit only
  `.env.example`.
- Build from `site/` with its pinned pnpm lockfile.
- Use a GitHub merged-PR webhook automation that verifies the PR targets
  `main`, then builds and deploys `site/` to the existing Sites project.

## Plan

<!-- Break down implementation into steps -->

<!-- 💡 TIP: If your plan has >6 phases or this spec approaches 
     400 lines, consider using sub-spec files:
     - IMPLEMENTATION.md for detailed implementation
     - See spec 012-sub-spec-files for guidance on splitting -->

- [x] Add the current Sites application under `site/`.
- [x] Document local development, authentication, and repository layout.
- [x] Verify the nested application production build.
- [ ] Push the change on a dedicated GitHub branch and open a Pull Request.
- [x] Create the merged-PR deployment automation.

## Test

- [x] `pnpm install --frozen-lockfile` in `site/`.
- [x] `pnpm build` in `site/` (all application, API, auth, and callback routes built successfully).
- [x] `npm run typecheck && npm test` at repository root.
- [x] `npx lean-spec validate` at repository root (all specs passed).
- [ ] Confirm the GitHub branch and Pull Request contain no secrets or generated
  dependency/build directories.
- [x] Confirm the deployment automation is enabled for merged Pull Requests and
  ignores merges whose base branch is not `main`.

## Notes

The repository's existing GitHub Pages workflow remains unchanged. It deploys
the Vite demo; the Sites automation deploys the independent app in `site/`.
