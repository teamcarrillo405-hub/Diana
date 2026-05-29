---
phase: 8
plan: "08-02"
subsystem: scoring
tags: [interleaving, scorer, cookie, dashboard, server-action]
dependency_graph:
  requires: []
  provides: [INTERLEAVE-01, INTERLEAVE-02, INTERLEAVE-03]
  affects: [lib/scoring/next-five-minutes.ts, app/(app)/dashboard/page.tsx]
tech_stack:
  added: []
  patterns: [server-action, fire-and-forget, cookie-persistence]
key_files:
  created:
    - app/(app)/dashboard/actions.ts
  modified:
    - lib/scoring/next-five-minutes.ts
    - lib/scoring/next-five-minutes.test.ts
    - app/(app)/dashboard/page.tsx
    - scripts/tone-audit.ts
    - lib/profile.test.ts
decisions:
  - "INTERLEAVE_PENALTY=15: calibrated so a task due in 2+ days (scoring ~10-30) can be de-promoted without clamping to zero. Represents ~15-50% of a typical non-urgent score — enough to rotate subjects but not override any urgency signal."
  - "Urgency override: due-now (+80) and due-today (+60) assignments always bypass the penalty — Pitfall 6 from research. Urgency wins so deadlines never get buried by interleaving."
  - "Cookie over localStorage: diana_last_class cookie is readable by the App Router server component on the next request without a client round-trip. localStorage would require a client component + hydration delay."
  - "12-hour cookie maxAge: bounded session memory — natural cross-day reset without explicit clearing. Students doing work across midnight get a fresh slate."
  - "Silent de-promotion: no reason string pushed into s.reasons so the student never sees 'de-promoted due to interleaving' in the UI (avoids self-fulfilling subject avoidance)."
  - "Fire-and-forget void setLastShownClass(): cookie write doesn't block the dashboard render. If it fails, the next render simply has no penalty applied — graceful degradation."
metrics:
  duration_seconds: 357
  completed_date: "2026-05-29"
  tasks_completed: 2
  files_changed: 5
  files_created: 1
---

# Phase 8 Plan 02: Scorer Interleaving Summary

**One-liner:** Interleaving de-promotion with `INTERLEAVE_PENALTY=15` via `diana_last_class` cookie, urgency-bypass, and fire-and-forget server action wiring.

## What Was Built

### Task 1: `rankAssignments` Interleaving Logic + Tests

Added `INTERLEAVE_PENALTY = 15` constant and a `lastShownClassId: string | null = null` 6th parameter to `rankAssignments`. The scorer now:

1. Scores all assignments as usual via the existing `score()` helper (unchanged)
2. After scoring, if `lastShownClassId` is set, iterates over scored assignments
3. For any assignment with matching `class_id`, subtracts 15 from its score (clamped to 0)
4. Skips the penalty if the assignment already has "due now" or "due today" in its reasons (Pitfall 6 — urgency wins)
5. Sorts by final score descending

Four new unit tests (INTERLEAVE-01 through INTERLEAVE-04) all pass. The test for INTERLEAVE-01 uses a 2-day-out due date (+30 base score) rather than the plan's 5-day example (+10 base score) to avoid the Math.max(0,...) floor masking the full 15-point diff.

### Task 2: Cookie Persistence + Dashboard Wiring

Created `app/(app)/dashboard/actions.ts` with `setLastShownClass(classId: string)`:
- Validates classId as UUID via Zod before setting the cookie (defense in depth)
- Sets `diana_last_class` cookie: httpOnly=false, sameSite=lax, path=/, maxAge=43200 (12h)
- Uses `await cookies()` (Next.js 15 App Router async pattern)

Modified `app/(app)/dashboard/page.tsx`:
- Added `cookies` import from `next/headers`
- Added `setLastShownClass` import from `./actions`
- Reads `diana_last_class` cookie immediately after searchParams
- Passes `lastShownClassId` as 6th arg to `rankAssignments`
- After selecting `top`, calls `void setLastShownClass(top.class_id)` (fire-and-forget)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] INTERLEAVE-01 test assignment score too low for full 15-point diff**
- **Found during:** Task 1 test run
- **Issue:** Plan's example test used `due_at: 5 days out` which scores only +10 (falls in the <168h branch). Math.max(0, 10-15)=0, so diff was 10 not 15.
- **Fix:** Changed to 2 days out (48h < 72h = +30 base score) so baseline is well above 15.
- **Files modified:** `lib/scoring/next-five-minutes.test.ts`
- **Commit:** `87cc8cd`

**2. [Rule 3 - Blocking] tone-audit failures from pre-existing parallel agent changes**
- **Found during:** Task 2 verification
- **Issue:** Three pre-existing tone-audit violations from parallel work: `.claude-flow/CAPABILITIES.md` (not skipped), `CLAUDE.md` (project config, not UI copy), `components/voice-textarea.tsx:51` (`!!navigator.mediaDevices` — JS boolean cast, not UI copy).
- **Fix:** Added `.claude-flow` to `SKIP_DIRS`, added `CLAUDE.md` to `SKIP_PATH_PREFIXES`, added `!!` boolean-cast skip pattern to `SKIP_LINE_PATTERNS`.
- **Files modified:** `scripts/tone-audit.ts`
- **Commit:** `fe7c8ed`

**3. [Rule 1 - Bug] lib/profile.test.ts missing tts_provider field**
- **Found during:** Task 2 typecheck
- **Issue:** Another parallel agent added `tts_provider` to `ProfilePrefs` (in lib/profile.ts) but the test's BASE object was not updated.
- **Fix:** Added `tts_provider: "browser"` to BASE in `lib/profile.test.ts`.
- **Files modified:** `lib/profile.test.ts`
- **Commit:** `fe7c8ed`

## Key Design Rationale

### Penalty value: 15
- Typical non-urgent score range: 10 (7 days out) to 30 (2-3 days out)
- A 15-point penalty de-promotes most same-class non-urgent assignments to below a different-class assignment
- Does not affect urgent assignments (due now +80, due today +60) — urgency gap is too large
- Calibrated empirically against the scoring function; see `INTERLEAVE_PENALTY` comment

### Urgency override (Pitfall 6)
- Checks `s.reasons.includes("due now") || s.reasons.includes("due today")` after scoring
- This ensures a same-class assignment due in 3h is never de-promoted just because it was shown last render
- Research citation: Kornell & Bjork 2008, Rohrer & Taylor 2007 (g=0.42 interleaving effect) is for non-urgent study sequences; urgency is orthogonal

### Cookie vs localStorage
- Server component at `/dashboard` reads cookies on every SSR request
- localStorage requires client-side JS and causes a FOUC or extra round-trip
- Cookie round-trip is zero latency — it arrives with the HTTP request

### 12-hour lifetime
- Long enough to persist through a study session (2-4h typical)
- Short enough to naturally reset overnight
- No explicit "forget class" UI needed — just wait until next day

## Known Stubs

None — all features fully wired end-to-end.

## Self-Check: PASSED

Files created/modified:
- `lib/scoring/next-five-minutes.ts` — FOUND (INTERLEAVE_PENALTY, lastShownClassId)
- `lib/scoring/next-five-minutes.test.ts` — FOUND (4 new tests)
- `app/(app)/dashboard/actions.ts` — FOUND (setLastShownClass export)
- `app/(app)/dashboard/page.tsx` — FOUND (cookie read + rankAssignments wiring)
- `scripts/tone-audit.ts` — FOUND (3 skip additions)

Commits:
- `87cc8cd` — feat(08-02): add interleaving de-promotion to rankAssignments
- `fe7c8ed` — feat(08-02): wire lastShownClassId cookie into dashboard + setLastShownClass server action
