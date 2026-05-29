---
phase: 06-ai-feature-core-slice-5
plan: 02
subsystem: ui
tags: [next.js, supabase, tailwind, server-actions, csv-export, token-budget]

# Dependency graph
requires:
  - phase: 06-01-ai-feature-core-slice-5
    provides: classes.ai_mode column, ai_interactions table, profiles token budget columns

provides:
  - F16: Per-class AI traffic-light settings page at /classes/[id]/settings with saveClassAiMode action
  - F15: AI authorship log at /settings/ai-history with CSV export
  - AI-SAFETY-01 (UI): Amber TokenBudgetBanner on dashboard at >=90% daily quota
  - Un-hardcoded classAiMode in assignment detail (reads live classes.ai_mode)
  - loadProfile() now includes daily_token_budget, tokens_used_today, token_reset_date

affects:
  - 06-03: Edge Functions can trust classes.ai_mode is populated and read from the join
  - 06-04: AI tool components can verify assignment detail wires classAiMode from live DB value

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Server action with zod enum validation + .eq("owner_id", user.id) RLS double-guard
    - CSV export via server action returning string + client Blob createObjectURL download
    - Amber-only cautionary banner (border-amber-500/40 bg-amber-50 text-amber-900) with null guard

key-files:
  created:
    - app/(app)/classes/[id]/settings/actions.ts
    - app/(app)/classes/[id]/settings/page.tsx
    - app/(app)/settings/ai-history/actions.ts
    - app/(app)/settings/ai-history/page.tsx
    - app/(app)/settings/ai-history/csv-export-button.tsx
    - app/(app)/dashboard/token-budget-banner.tsx
  modified:
    - app/(app)/classes/[id]/page.tsx
    - app/(app)/assignments/[id]/page.tsx
    - app/(app)/settings/page.tsx
    - app/(app)/dashboard/page.tsx
    - lib/profile.ts
    - lib/profile.test.ts

key-decisions:
  - "saveClassAiMode takes typed object {classId, aiMode} not FormData — zod enum is defense in depth above DB check constraint"
  - "Settings page is a route (not modal) — deep links and URL bar work; consistent with /classes/[id] pattern"
  - "CSV export: server action returns string, client builds Blob + triggers download via createObjectURL — avoids binary streaming from server actions"
  - "TokenBudgetBanner is server-rendered — no polling; refreshes on each dashboard navigation"
  - "Banner ratio < 0.9 returns null (no DOM); >= 0.9 and < 1.0 shows 'close' copy; >= 1.0 shows 'used' copy"
  - "classAiMode narrowed with (==='red' || ==='yellow') guard — handles string type from DB, defensive against unexpected values"
  - "token_reset_date added to ProfilePrefs and SELECT alongside budget fields for future TZ-aware reset logic"
  - "lib/profile.test.ts BASE fixture extended with new fields to keep typecheck green"

patterns-established:
  - "Amber cautionary banner: border-amber-500/40 bg-amber-50 text-amber-900, role=status, no red classes, no exclamation marks"
  - "Per-resource settings page: nested under resource route /classes/[id]/settings rather than global /settings"

requirements-completed: [F15, F16, AI-SAFETY-01]

# Metrics
duration: 25min
completed: 2026-05-29
---

# Phase 06 Plan 02: AI Feature Core — User-Facing Surfaces Summary

**Per-class AI traffic-light picker (/classes/[id]/settings), AI authorship log with CSV export (/settings/ai-history), amber token-budget banner on dashboard, and un-hardcoded classAiMode on assignment detail — all F15/F16/AI-SAFETY-01 user surfaces shipped**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-05-29T14:50:00Z
- **Completed:** 2026-05-29T15:15:00Z
- **Tasks:** 3
- **Files modified:** 11

## Accomplishments
- F16: Student can set per-class AI mode (green/yellow/red) at /classes/[id]/settings; changes persist and revalidate all assignment paths
- F15: Student can view their full AI interaction history at /settings/ai-history and download as CSV with one click
- AI-SAFETY-01: Amber TokenBudgetBanner appears on dashboard when daily token usage crosses 90% — calm copy, no red, no exclamation marks

## Task Commits

1. **Task 1: F16 per-class settings page + saveClassAiMode action + un-hardcode assignment** - `f2bc8df` (feat)
2. **Task 2: F15 /settings/ai-history page + CSV export + link from /settings** - `6c8aa77` (feat)
3. **Task 3: TokenBudgetBanner + dashboard mount + profile load extension** - `7d4db4f` (feat)

## Output Details (per plan spec)

### Per-class settings page URL pattern
`/classes/[id]/settings` — nested under class route; `id` is the UUID of the class row.

### loadProfile fields now returned
`daily_token_budget`, `tokens_used_today`, `token_reset_date` — added to `ProfilePrefs` Pick and `SELECT` string in `lib/profile.ts`.

### TokenBudgetBanner ratio thresholds
- `ratio < 0.9` → returns `null` (no render)
- `0.9 <= ratio < 1.0` → "You're close to your AI quota for today."
- `ratio >= 1.0` → "You've used your AI quota for today — resets at midnight."

### CSV column order
`created_at, feature, assignment_id, assignment_title, model, prompt_summary, tokens_used`

### Un-hardcoded ReadingPanel prop path
`app/(app)/assignments/[id]/page.tsx` — prop is now:
```tsx
classAiMode={
  (a.classes?.ai_mode === "red" || a.classes?.ai_mode === "yellow")
    ? a.classes.ai_mode
    : "green"
}
```
The `classes` join now includes `ai_mode`: `classes(id, name, color, ai_mode)`. Do NOT reintroduce `classAiMode="green"` literal.

## Files Created/Modified
- `app/(app)/classes/[id]/settings/actions.ts` — saveClassAiMode server action (zod enum + RLS)
- `app/(app)/classes/[id]/settings/page.tsx` — green/yellow/red radio picker with prose descriptions
- `app/(app)/classes/[id]/page.tsx` — added ai_mode to select + AI mode link in header
- `app/(app)/assignments/[id]/page.tsx` — classes join includes ai_mode; classAiMode un-hardcoded
- `app/(app)/settings/ai-history/actions.ts` — getAiHistory (100 cap) + exportAiHistoryCsv (10k cap)
- `app/(app)/settings/ai-history/page.tsx` — table with When/Feature/Assignment/Model/Tokens columns
- `app/(app)/settings/ai-history/csv-export-button.tsx` — client component Blob download
- `app/(app)/settings/page.tsx` — AI history section with Open AI history link
- `app/(app)/dashboard/token-budget-banner.tsx` — amber banner, null below 90%, two message variants
- `app/(app)/dashboard/page.tsx` — import + mount TokenBudgetBanner after header
- `lib/profile.ts` — ProfilePrefs Pick + SELECT extended with 3 token budget fields
- `lib/profile.test.ts` — BASE fixture updated with new required fields

## Decisions Made
- saveClassAiMode takes `{ classId, aiMode }` typed object, not raw FormData — zod enum validates server-side in addition to DB check constraint
- CSV export via server action returning `string` body + client Blob/createObjectURL — avoids binary streaming complications in Next.js 15 server actions
- TokenBudgetBanner server-rendered (no client polling) — refreshes on each dashboard navigation which is frequent enough for v1
- classAiMode narrowing uses `=== "red" || === "yellow"` guard rather than whitelist check — defensive against unexpected DB values, defaults to "green"

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Extended lib/profile.test.ts BASE fixture**
- **Found during:** Task 3 (TypeScript typecheck after adding new ProfilePrefs fields)
- **Issue:** BASE fixture in profile.test.ts was missing the three new fields, causing TS2739 error
- **Fix:** Added `daily_token_budget: 50000, tokens_used_today: 0, token_reset_date: "2026-05-29"` to BASE object
- **Files modified:** lib/profile.test.ts
- **Verification:** `npx tsc --noEmit` exits 0
- **Committed in:** `7d4db4f` (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - type error in test fixture)
**Impact on plan:** Necessary for typecheck to pass. No scope creep.

## Issues Encountered
None

## Known Stubs
None — all data is wired to live Supabase tables. `ai_interactions` table may be empty for new users (handled with "No AI history yet" empty state).

## Next Phase Readiness
- Plan 06-03 (Edge Functions) can read `classes.ai_mode` via the join — the column is populated and the student can set it
- Plan 06-03 can write to `ai_interactions` knowing the student sees those rows immediately at /settings/ai-history
- Plan 06-04 (UI components) can rely on the un-hardcoded `classAiMode` prop path in assignment detail

---
*Phase: 06-ai-feature-core-slice-5*
*Completed: 2026-05-29*
