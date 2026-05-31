---
phase: 09-academic-engine-depth
plan: "08"
subsystem: sharing
tags: [F13, F14, share-links, public-route, parent-summary, teacher-snapshot, service-role]
dependency_graph:
  requires: [09-01, 09-02]
  provides: [F13-parent-share, F14-teacher-snapshot]
  affects: [app/share, lib/sharing, app/(app)/settings]
tech_stack:
  added: []
  patterns:
    - service-role Supabase client for public unauthenticated routes
    - server actions with cookie-based client for authenticated mutations
    - public Next.js route outside (app)/ auth gate
key_files:
  created:
    - supabase/migrations/0017_share_links.sql
    - lib/sharing/types.ts
    - lib/sharing/actions.ts
    - lib/sharing/actions.test.ts
    - lib/supabase/service.ts
    - app/share/[token]/page.tsx
    - app/share/[token]/parent-summary.tsx
    - app/share/[token]/teacher-snapshot.tsx
    - app/(app)/settings/sharing-section.tsx
  modified:
    - lib/supabase/types.ts
    - app/(app)/settings/page.tsx
decisions:
  - "Migration 0017 used (not 0016 — already taken by lms_connections from 09-05)"
  - "profiles.diagnoses used instead of disability_flags (correct column per actual schema)"
  - "assignment_time_log used for study time (not time_logs — does not exist); columns started_at/ended_at"
  - "task_signals.occurred_at used (not created_at — correct column per migration 0001)"
  - "profiles.user_id used as FK column (not profiles.id — matches actual schema)"
metrics:
  duration_minutes: 15
  completed_date: "2026-05-30"
  tasks_completed: 3
  files_created: 9
  files_modified: 2
---

# Phase 09 Plan 08: F13/F14 Parent Share + Teacher Snapshot Summary

**One-liner:** Student-generated 7-day share links for parent effort-view and teacher accommodation-snapshot, using service-role client for unauthenticated public access, with full owner_id scoping and calm copy invariants throughout.

## What Was Built

F13 (parent share) and F14 (teacher snapshot) delivered as student-initiated read-only public views.

- **Migration 0017**: `share_links` table with `token`, `owner_id`, `share_type`, `expires_at`, `revoked_at`. RLS enables owner-manage-only policy. No public read policy — public route uses service-role client.
- **lib/supabase/service.ts**: `createServiceClient()` factory using `SUPABASE_SERVICE_ROLE_KEY`. Returns `null` if env missing (D-15 calm fallback).
- **lib/sharing/types.ts**: `ShareLink`, `ShareType`, `ParentSummary`, `TeacherClassRow`, `TeacherSnapshot` types.
- **lib/sharing/actions.ts**: `createShareLink`, `revokeShareLink`, `listActiveShareLinks` server actions (cookie-based client + RLS).
- **lib/sharing/actions.test.ts**: 6 unit tests covering create (success, insert call, invalid type, no user) and revoke (call shape, ok return).
- **app/share/[token]/page.tsx**: Public Server Component. Looks up token with 3-condition check (`eq token`, `is revoked_at null`, `gt expires_at now`). Routes to parent or teacher view. Calm "no longer active" fallback for all failures.
- **app/share/[token]/parent-summary.tsx**: Three stat cards — assignments finished this week, upcoming next 7 days, study minutes.
- **app/share/[token]/teacher-snapshot.tsx**: Per-class AI mode list, reading font, "May benefit from extended reading time" (only when dyslexia diagnosed), calibrated time estimate.
- **app/(app)/settings/sharing-section.tsx**: Client component with create/copy/revoke UI. Uses `useTransition`. Error displayed in amber (not red).
- **app/(app)/settings/page.tsx**: `SharingSection` mounted after AI history, before Account.

## Security Invariants Enforced

- Public route is at `app/share/[token]/` — OUTSIDE `app/(app)/` so auth gate never fires.
- Service-role client bypasses RLS for token lookup only.
- `owner_id` read from token row only — never from query params or headers (D-07).
- Token lookup enforces all three conditions: token match + revoked_at IS NULL + expires_at > now.
- Parent view exposes counts only (no assignment titles, grades, or private content).
- Teacher view exposes accommodation labels only (no diagnosis codes, no AI prompt content).

## Deployment Notes

- Migration `0017_share_links.sql` written locally. Run `supabase db push` to deploy to remote.
- `SUPABASE_SERVICE_ROLE_KEY` env var required for the public `/share/[token]` route. If missing, route returns calm fallback (D-15).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Correct migration number**
- **Found during:** Task 1
- **Issue:** Plan says migration 0016 but key_context warned 0016 is taken by lms_connections (09-05)
- **Fix:** Used 0017_share_links.sql
- **Files modified:** supabase/migrations/0017_share_links.sql

**2. [Rule 1 - Bug] Correct DB column names for study time**
- **Found during:** Task 2
- **Issue:** Plan references `time_logs` table with `opened_at`/`closed_at` — table does not exist in the project. Actual table is `assignment_time_log` with `started_at`/`ended_at`.
- **Fix:** Used `assignment_time_log.started_at/ended_at` for study minutes calculation
- **Files modified:** app/share/[token]/page.tsx

**3. [Rule 1 - Bug] Correct task_signals timestamp column**
- **Found during:** Task 2
- **Issue:** Plan uses `task_signals.created_at` but actual column is `occurred_at` (per migration 0001)
- **Fix:** Used `.gte("occurred_at", weekStartIso)` in the completed-count query
- **Files modified:** app/share/[token]/page.tsx

**4. [Rule 1 - Bug] Correct profiles FK column**
- **Found during:** Task 2
- **Issue:** Plan uses `.eq("id", ownerId)` for profiles but actual column is `user_id`
- **Fix:** Used `.eq("user_id", ownerId)` in buildTeacherSnapshot
- **Files modified:** app/share/[token]/page.tsx

**5. [Rule 1 - Bug] disability_flags → diagnoses**
- **Found during:** Task 2
- **Issue:** Plan references `profiles.disability_flags` which doesn't exist in the type or schema. Actual field is `profiles.diagnoses: string[]` containing "dyslexia".
- **Fix:** Query `diagnoses` and check `.includes("dyslexia")`
- **Files modified:** app/share/[token]/page.tsx

## Test Results

```
Test Files  24 passed (24)
      Tests 209 passed (209)
```

- `lib/sharing/actions.test.ts`: 6 passing tests (createShareLink ×4, revokeShareLink ×2)
- No regressions to prior 203-test baseline

## Self-Check: PASSED

Files confirmed present:
- supabase/migrations/0017_share_links.sql: FOUND
- lib/sharing/types.ts: FOUND
- lib/sharing/actions.ts: FOUND
- lib/sharing/actions.test.ts: FOUND
- lib/supabase/service.ts: FOUND
- app/share/[token]/page.tsx: FOUND
- app/share/[token]/parent-summary.tsx: FOUND
- app/share/[token]/teacher-snapshot.tsx: FOUND
- app/(app)/settings/sharing-section.tsx: FOUND

Commits confirmed:
- 7294c3c: feat(09-08): F13/F14 schema + lib/sharing types and actions
- d11cb36: feat(09-08): F13/F14 public /share/[token] route — parent summary + teacher snapshot
- f0294d2: feat(09-08): F13/F14 Settings Sharing section — create + copy + revoke
