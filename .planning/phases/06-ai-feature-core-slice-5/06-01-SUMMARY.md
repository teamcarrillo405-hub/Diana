---
phase: 06-ai-feature-core-slice-5
plan: "01"
subsystem: ai-safety-layer
tags: [migration, ai-safety, token-budget, refuse-redirect, frustration-detection, deno-mirror]
dependency_graph:
  requires: [Phase 5 notes+flashcards foundation (0011)]
  provides: [ai_interactions table, classes.ai_mode, profiles token budget, lib/ai safety API, _shared Deno mirrors]
  affects: [Plans 06-02 and 06-03 (cannot ship without this schema + shared layer)]
tech_stack:
  added: []
  patterns: [fire-and-forget logInteraction, SupabaseLike interface for Deno, composable system-prompt fragments, verbatim Deno mirror convention]
key_files:
  created:
    - supabase/migrations/0012_ai_feature_core.sql
    - lib/ai/safety.ts
    - lib/ai/safety.test.ts
    - lib/ai/refuse-redirect.ts
    - lib/ai/refuse-redirect.test.ts
    - lib/ai/frustration.ts
    - lib/ai/frustration.test.ts
    - lib/ai/system-prompts.ts
    - supabase/functions/_shared/safety.ts
    - supabase/functions/_shared/system-prompts.ts
  modified:
    - lib/supabase/types.ts
decisions:
  - "ai_interactions is SEPARATE from ai_calls: ai_calls=cost/security audit; ai_interactions=student-facing authorship log keyed by assignment_id"
  - "UTC daily reset boundary (todayIsoDate): consistent for v1; per-user TZ-aware reset deferred to Phase 7+"
  - "daily_token_budget default 50000 on profiles (not a separate usage_daily table): simpler, atomic UPDATE, no JOIN per request"
  - "F18 divergence: FRUSTRATION_REDIRECT offers 5-min break + talk-through instead of worked example (lower cognitive load for ADHD/dyslexia)"
  - "Deno mirror convention: duplicate-with-discipline rather than shared package (overkill for ~150 lines of strings)"
metrics:
  duration_minutes: 24
  completed_date: "2026-05-29"
  tasks_completed: 3
  files_created: 10
  files_modified: 1
  tests_added: 23
---

# Phase 6 Plan 1: AI Feature Core — Schema + Safety Layer Summary

JWT-less AI safety foundation: migration 0012 adds F15/F16/AI-SAFETY-01 schema, lib/ai delivers tested budget/refusal/frustration helpers, and Deno mirrors wire up for Plan 06-03 Edge Functions.

## What Was Built

### Task 1: Migration 0012 + types.ts sync (commit 480d068)

`supabase/migrations/0012_ai_feature_core.sql` introduces three schema additions:

- **F16** `classes.ai_mode text not null default 'green' check (ai_mode in ('green','yellow','red'))` — teacher-controlled traffic-light per class.
- **F15** `public.ai_interactions` table: per-assignment authorship log with `owner_id`, `assignment_id`, `feature`, `model`, `prompt_summary` (<=200 chars), `tokens_used`, `created_at`. RLS: owner-only full access. Two indexes: `(owner_id, created_at desc)` for dashboard query, `(assignment_id) where assignment_id is not null` for per-assignment CSV export.
- **AI-SAFETY-01** three columns on `profiles`: `daily_token_budget integer not null default 50000`, `tokens_used_today integer not null default 0`, `token_reset_date date not null default current_date`.

`lib/supabase/types.ts` hand-edited to add the `ai_interactions` table type, `classes.ai_mode` field, and `profiles` token columns. `npm run typecheck` passes.

**Schema decisions:**
- `ai_interactions` is NOT `ai_calls`. `ai_calls` = cost/security audit (kept per privacy policy). `ai_interactions` = student-facing authorship log (exportable, per-assignment, per F15).
- `tokens_used` is `integer` not `bigint` — no single call exceeds 2B tokens.
- `token_reset_date` is `date` not `timestamptz` — daily reset is a day-boundary concern; UTC-consistent for v1.
- Budget counter lives directly on `profiles` (not a separate `usage_daily` table): atomic single UPDATE, no JOIN per request, matches spec wording "stored in profiles.daily_token_budget".

### Task 2: lib/ai modules + 23 unit tests (commit cdc6b04)

Four TypeScript modules in `lib/ai/`:

**`safety.ts`** — `checkTokenBudget(userId, supabase): BudgetCheck`, `resetBudgetIfNewDay(userId, supabase): void`, `logInteraction(params, supabase): void`, `todayIsoDate(d?): string`. `logInteraction` is fire-and-forget: wraps insert in try/catch, `console.warn` on failure, never throws. 9 unit tests passing.

**`refuse-redirect.ts`** — `REFUSE_PATTERNS: RegExp[]` (7 patterns covering "write this essay", "give me the answer", etc.), `REDIRECT_PROMPT` (F17 system prompt fragment with specific pivots per domain), `isRefusalNeeded(text): boolean`. 8 unit tests passing.

**`frustration.ts`** — `FRUSTRATION_MARKERS: RegExp[]` (ugh, i give up, this is impossible, etc.), `FRUSTRATION_REDIRECT` (F18 system prompt fragment — see F18 divergence decision below), `isFrustrationDetected(history): boolean` (marker match OR 3+ identical normalized messages). 6 unit tests passing.

**`system-prompts.ts`** — `CALM_TONE`, `SOCRATIC_GUARD`, `MINOR_SAFETY` (includes verbatim 988 crisis line), `composeSystemPrompt(featurePrompt, opts)`. Re-exports `REDIRECT_PROMPT` and `FRUSTRATION_REDIRECT` for downstream convenience.

**Downstream import pattern:**
```typescript
import { checkTokenBudget, logInteraction } from '@/lib/ai/safety';
import { isRefusalNeeded } from '@/lib/ai/refuse-redirect';
import { isFrustrationDetected } from '@/lib/ai/frustration';
import { composeSystemPrompt, MINOR_SAFETY, CALM_TONE } from '@/lib/ai/system-prompts';
```

### Task 3: supabase/functions/_shared/ Deno mirrors (commit 3f3ccba)

Two Deno-native files that Edge Functions (Plans 06-03+) import via relative path `../_shared/`:

**`_shared/safety.ts`** — uses a hand-rolled `SupabaseLike` interface (no `@supabase/supabase-js` npm import needed). Exports `checkTokenBudget`, `resetBudgetIfNewDay`, `incrementTokens` (soft SELECT+UPDATE for token counter), `logInteraction`.

**`_shared/system-prompts.ts`** — verbatim copies of all five prompt constants plus `composeSystemPrompt`. Contains `I can help you plan this` (REDIRECT_PROMPT parity), `5-minute break` (FRUSTRATION_REDIRECT parity), `988` (MINOR_SAFETY self-harm line). Zero `@/lib` imports.

**Why duplicate?** Deno cannot resolve Next.js `paths` aliases. A shared package is overkill for ~150 lines of strings. Duplicate-with-discipline: grep parity checks catch drift.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test mock for resetBudgetIfNewDay update verification**
- **Found during:** Task 2 (GREEN phase)
- **Issue:** The original `makeMockSupabase` helper reused the same `from()` mock object for both select and update calls, making it impossible to assert that `update` was called (both calls returned the same mock result, and the mock.results lookup by `r.value && r.value.update` returned the first result which always had `update` on it but was never invoked for the update path).
- **Fix:** Replaced the shared `makeMockSupabase` approach for `resetBudgetIfNewDay` tests with inline mocks that use a dedicated `updateMock = vi.fn()`, making the assertion straightforward and unambiguous.
- **Files modified:** `lib/ai/safety.test.ts`
- **Commit:** `cdc6b04` (included in same task commit)

**2. [Rule 1 - Bug] Plan parity verification script targets wrong source file**
- **Found during:** Task 3 verify step
- **Issue:** The plan's `<verify>` script checks `lib/ai/system-prompts.ts` for `I can help you plan this`, but that string lives in `lib/ai/refuse-redirect.ts` (system-prompts.ts re-exports it via import, not as a literal). The script always fails for this reason.
- **Fix:** Verified parity directly against the correct source file (`lib/ai/refuse-redirect.ts`) and confirmed `supabase/functions/_shared/system-prompts.ts` contains the string literally. All acceptance criteria grep checks pass. The plan's script is noted as misdirected; downstream CI should check `lib/ai/refuse-redirect.ts` for parity.
- **Impact:** All acceptance criteria pass; parity is real and verified.

## F18 Spec Divergence (Intentional)

`FRUSTRATION_REDIRECT` offers:
1. A 5-minute Pomodoro break
2. A talk-through invitation ("Want to talk through what's confusing — even just one piece of it?")

This diverges from REQUIREMENTS.md which suggested surfacing a worked example. The break+talk-through approach is lower cognitive load for the ADHD+dyslexia student (Devon) — being handed another worked problem while frustrated can read as "you still don't get it." The worked-example path is deferred to Phase 7+ behind a per-user preference.

## Known Stubs

None — all exported functions are fully implemented.

## Self-Check

Files created/verified:
- supabase/migrations/0012_ai_feature_core.sql: EXISTS
- lib/ai/safety.ts: EXISTS
- lib/ai/refuse-redirect.ts: EXISTS
- lib/ai/frustration.ts: EXISTS
- lib/ai/system-prompts.ts: EXISTS
- supabase/functions/_shared/safety.ts: EXISTS
- supabase/functions/_shared/system-prompts.ts: EXISTS

Commits:
- 480d068: feat(06-01): migration 0012 ai_feature_core + types.ts sync
- cdc6b04: feat(06-01): lib/ai safety modules + unit tests (23 passing)
- 3f3ccba: feat(06-01): Deno mirrors _shared/safety.ts + _shared/system-prompts.ts

Test results: 23/23 passing (npx vitest run lib/ai/)

## Self-Check: PASSED
