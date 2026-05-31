---
phase: 09-academic-engine-depth
plan: "05"
subsystem: lms-calendar-import
status: checkpoint-pending
tags: [f15, lms, canvas, ics, google-classroom, sync, settings-ui]
requires: [09-01, 09-02, 09-03, 09-04]
provides: [lms-connections-table, canvas-sync-endpoint, ics-sync-endpoint, classroom-sync-endpoint, connected-calendars-ui]
affects: [assignments-table, settings-page, lib-lms]
tech-stack:
  added: [node-ical@0.26.1]
  patterns: [route-handler-auth, shadow-class-upsert, link-header-pagination, tdd-red-green]
key-files:
  created:
    - supabase/migrations/0016_lms_connections.sql
    - lib/lms/types.ts
    - lib/lms/canvas.ts
    - lib/lms/canvas.test.ts
    - lib/lms/sync.ts
    - lib/lms/ics.ts
    - lib/lms/ics.test.ts
    - app/api/lms/canvas-sync/route.ts
    - app/api/lms/ics-sync/route.ts
    - app/api/lms/classroom-sync/route.ts
    - app/(app)/settings/lms-actions.ts
    - app/(app)/settings/lms-connections.tsx
  modified:
    - app/(app)/settings/page.tsx
    - lib/supabase/types.ts
    - app/(app)/calendar/page.tsx
decisions:
  - "Migration uses 0016 (not 0015 as plan specified) — 0015 was already used by assignment_steps from plan 09-01"
  - "lib/supabase/types.ts manually updated with lms_connections table + assignments external columns — no supabase gen types CLI available"
  - "calendar/page.tsx bug fixed: .eq('user_id') should be .eq('owner_id') on assignments table (Rule 1 auto-fix)"
metrics:
  duration_minutes: 28
  completed_date: "2026-05-30"
  tasks_completed: 5
  tasks_total: 6
  files_created: 13
  files_modified: 3
---

# Phase 9 Plan 05: F15 LMS Calendar Import Summary

**One-liner:** Canvas/ICS/Google Classroom import via token, .ics URL, and OAuth using paginated fetchers, shared upsert helper, and calm Settings UI.

## Status: Tasks 1–5 Complete — Task 6 Awaiting Human Verification

Tasks 1–5 (schema, Canvas, ICS, Google Classroom code, Settings UI) are complete and committed. Task 6 is a `checkpoint:human-verify` that requires real accounts and GCP OAuth configuration.

## Shipped Files

| File | Lines | Purpose |
|------|-------|---------|
| `supabase/migrations/0016_lms_connections.sql` | 52 | Schema: external columns on assignments + lms_connections table with RLS |
| `lib/lms/types.ts` | 27 | Shared types: LmsProvider, LmsConnection, NormalizedAssignment, SyncResult |
| `lib/lms/canvas.ts` | 78 | Canvas fetcher: pagination via Link rel=next, null due_at filter |
| `lib/lms/canvas.test.ts` | 82 | 6 vitest cases: pagination, filter, auth header, per_page, empty, shape |
| `lib/lms/sync.ts` | 70 | Shared upsert helper: shadow class, upsert on (owner_id, external_source, external_id) |
| `lib/lms/ics.ts` | 50 | ICS fetcher: node-ical, VEVENT only, DTSTART to UTC ISO, UID fallback |
| `lib/lms/ics.test.ts` | 75 | 5 vitest cases: VEVENT parse, VTODO filter, tz, missing start, UID fallback |
| `app/api/lms/canvas-sync/route.ts` | 57 | POST handler: auth, fetch Canvas, sync, update last_synced_at |
| `app/api/lms/ics-sync/route.ts` | 52 | POST handler: auth, fetch ICS, sync, update last_synced_at |
| `app/api/lms/classroom-sync/route.ts` | 103 | POST handler: provider_token from session, Classroom REST, due date reconstruct |
| `app/(app)/settings/lms-actions.ts` | 80 | Server actions: connectCanvas, connectIcs, connectClassroom, disconnectLms |
| `app/(app)/settings/lms-connections.tsx` | 170 | Client component: list connections, Sync now, Remove, calm amber banners |

## Commits

| Hash | Description |
|------|-------------|
| `7b487bf` | feat(09-05): F15 migration 0016 + lms types + node-ical install |
| `acea288` | feat(09-05): F15 Canvas fetcher + sync helper + canvas-sync Route Handler |
| `691a344` | feat(09-05): F15 ICS fetcher + ics-sync Route Handler |
| `566b0f2` | feat(09-05): F15 Google Classroom sync Route Handler |
| `34795ea` | feat(09-05): F15 Connected calendars UI in Settings |

## Test Results

```
npx vitest run lib/lms/
  ✓ lib/lms/canvas.test.ts (6 tests)
  ✓ lib/lms/ics.test.ts (5 tests)
  Test Files: 2 passed (2)
  Tests: 11 passed (11)
```

## Deviations from Plan

### Migration Number Change (D-11 clarification)

**Found during:** Task 1
**Issue:** Plan frontmatter specified `0015_lms_connections.sql` but `0015_assignment_steps.sql` already existed from plan 09-01
**Fix:** Used `0016_lms_connections.sql` instead — correct sequential numbering
**Files modified:** `supabase/migrations/0016_lms_connections.sql`

### Rule 1 - Bug Fix: calendar/page.tsx wrong column name

**Found during:** Task 2 (typecheck revealed by types.ts update)
**Issue:** `app/(app)/calendar/page.tsx` line 71 used `.eq("user_id", user.id)` on the assignments table. The column is `owner_id`. This was a pre-existing bug made visible when types.ts was updated to include the correct column list.
**Fix:** Changed `user_id` to `owner_id` in the assignments query
**Files modified:** `app/(app)/calendar/page.tsx`
**Commit:** `acea288`

### Manual types.ts Update

**Found during:** Task 2
**Issue:** `lib/supabase/types.ts` is manually maintained (no `supabase gen types` CLI available in this environment). Added `lms_connections` table definition and `external_source`, `external_id`, `last_synced_at` columns to `assignments`.
**Impact:** TypeScript compilation now validates queries against the new tables/columns correctly.

## Design Decision Adherence

All LOCKED decisions (D-01 through D-11) followed exactly:

- **D-01** Ship order: Canvas → ICS → Classroom ✓
- **D-02** Canvas: personal access token only ✓
- **D-03** Canvas pagination: Link rel=next followed ✓ (6 tests confirm)
- **D-04** Null due_at filtered at fetcher layer ✓
- **D-05** Dedup key: (owner_id, external_source, external_id) partial index ✓
- **D-06** Google Classroom: session.provider_token, no OAuth library ✓
- **D-07** node-ical v0.26.1 ✓
- **D-08** All sync user-initiated only (button click → POST) ✓
- **D-09** Calm tone: "Imported N assignments from X", amber for warnings, no red ✓
- **D-10** Route Handlers (not Server Actions) for sync endpoints ✓
- **D-11** Migration number adjusted to 0016 (D-11 was a no-op note about types)

## OAuth Scope Configuration (Task 6 setup — human required)

Google Classroom OAuth requires these exact steps (documented for human verifier):

**GCP Console:**
- Enable: `Google Classroom API`
- OAuth consent screen scopes:
  - `https://www.googleapis.com/auth/classroom.courses.readonly`
  - `https://www.googleapis.com/auth/classroom.coursework.me.readonly`

**Supabase Dashboard → Authentication → Providers → Google → Additional Scopes:**
```
https://www.googleapis.com/auth/classroom.courses.readonly https://www.googleapis.com/auth/classroom.coursework.me.readonly
```

## Why This Plan is in Wave 3

Plan 09-05 sits in Wave 3 (parallel with 09-06) because it requires the assignments table foundation built in Waves 1–2 (09-01 through 09-04) but does not block the Wave 3 calendar work in 09-06 — both extend the assignments table in separate, non-conflicting directions.

## Known Stubs

None. All three sync paths are fully wired (Canvas pagination + null filter, ICS VEVENT parse, Classroom due-date reconstruction). The Google Classroom path cannot be integration-tested without GCP OAuth config, but the code is complete and correct per the Classroom REST API spec.

## Self-Check: PASSED

All 12 created files confirmed present. All 5 task commits confirmed in git log.
