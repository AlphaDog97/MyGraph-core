---
status: complete
created: '2026-03-24'
tags:
  - frontend
  - auth
  - appwrite
priority: high
created_at: '2026-03-24T00:00:00+00:00'
---

# Appwrite Authentication Integration

> **Status**: complete · **Priority**: high · **Created**: 2026-03-24

## Overview

Add a reusable authentication module under `src/auth/` to integrate Appwrite
account capabilities (email sign-up, email sign-in, GitHub OAuth2, current
session/user retrieval, and sign-out), while preserving full graph browsing and
editing in guest mode.

## Design

- Introduce an auth service layer (`src/auth/service.ts`) to isolate Appwrite
  API calls from UI logic.
- Introduce `AuthProvider` and `useAuth` hook to centralize auth state:
  `user`, `session`, `authMode`, and `loading`.
- Keep guest mode first-class: graph features stay available regardless of auth
  status; auth controls are non-blocking.
- Handle OAuth callback at existing app entry via URL parameters (`auth_callback`)
  and refresh auth state immediately after redirect.
- Keep frontend security posture minimal and correct:
  - only public config via `VITE_APPWRITE_ENDPOINT` and
    `VITE_APPWRITE_PROJECT_ID`
  - no secret keys in frontend code
  - password/email policies enforced by Appwrite console, with only lightweight
    client-side format checks.

## Plan

- [x] Add auth module (`client`, `service`, `provider`, and UI controls).
- [x] Mount `AuthProvider` in application entry.
- [x] Add top-level auth controls for login/register/logout/guest mode.
- [x] Add OAuth callback parameter handling and post-callback refresh flow.
- [x] Update environment typing and styling for auth UI.

## Test

- [ ] `lean-spec list` *(blocked: CLI unavailable in container)*
- [ ] `lean-spec validate` *(blocked: CLI unavailable in container)*
- [x] `npm run build`
