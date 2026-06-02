# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Next.js dev server (Turbopack)
npm run build        # Production build
npm run typecheck    # TypeScript check (tsc --noEmit)
npm run test:run     # Run all tests once (CI mode)
npm run test         # Watch mode
npm run tone-audit   # Scan UI copy for banned shame/scolding language (exits 1 on violations)
npm run lint         # ESLint
```

Single test file: `npx vitest run lib/scoring/next-five-minutes.test.ts`

Vitest picks up `lib/**/*.test.ts` and `components/**/*.test.ts`. Per-file environment override: add `// @vitest-environment jsdom` at the top for component tests.

## Architecture

**Stack**: Next.js 15 App Router + TypeScript + Tailwind + shadcn/ui, Supabase (Postgres + Auth + Storage + Edge Functions), deployed on Vercel.

**Path alias**: `@/` maps to the repo root (not `src/`).

### Directory layout

- `app/(app)/` — authenticated routes (layout enforces auth + onboarding redirect)
- `app/(auth)/` — login/signup pages
- `app/onboarding/` — first-run flow
- `lib/` — pure business logic (no React, no DB calls except Supabase client helpers)
- `lib/scoring/` — "next 5 minutes" priority scorer (`rankAssignments`)
- `lib/fsrs/` — FSRS-5 spaced repetition scheduler (pure functions, no IO)
- `lib/timer/` — Pomodoro + Premack timer state machine (pure functions)
- `lib/ai/` — token budget, interaction logging, system-prompt composition helpers
- `lib/state-machine/` — assignment lifecycle (`captured → planned → in_progress → done → submitted → graded`)
- `supabase/functions/` — Deno Edge Functions for all Claude API calls
- `supabase/migrations/` — numbered SQL migrations (`0001_init.sql` … `0013_…`)
- `scripts/tone-audit.ts` — F20 copy compliance scanner

### Supabase client pattern

Three clients, never mixed:
- `lib/supabase/server.ts` — Server Components, Route Handlers, Server Actions (uses cookies)
- `lib/supabase/client.ts` — Client Components only
- Service-role key only inside Edge Functions (`SUPABASE_SERVICE_ROLE_KEY`)

### AI calls — Edge Functions only

**All Claude API calls live in `supabase/functions/`**. Never call `api.anthropic.com` from Next.js server actions or the browser. Each function:

1. Validates `aiMode` — returns 403 on `red` or `yellow` for content-generating features
2. Calls `resetBudgetIfNewDay` + `checkTokenBudget` before the Claude call
3. Calls `composeSystemPrompt(featurePrompt, opts)` which always injects `CALM_TONE`, `REDIRECT_PROMPT`, `FRUSTRATION_REDIRECT`, and `MINOR_SAFETY`
4. Fire-and-forgets `logInteraction` + `incrementTokens` after responding (never blocks the response)

Model selection: Haiku 4.5 for cheap/fast ops (classify-inbox, math-step hints, citation-gen), Sonnet 4.6 for quality ops (writing-aid, reading-scaffold, transcribe-note).

### Calm invariant — enforced everywhere

This is the product's non-negotiable design constraint:

- **No red color for errors** — use amber
- **No shame/scolding words** — `npm run tone-audit` scans for `wrong`, `incorrect`, `you missed`, `behind`, `failed`, etc. in UI copy
- **No streak language** — neutral counters only
- **Timer never has `failed` or `missed` states** — only `idle | running | paused | break | done`
- **FSRS never shows a guilt-trip for missed days** — accumulated cards, no multiplier

The tone-audit script skips: `docs/`, `supabase/functions/`, `lib/ai/`, test files, and comment lines — those may reference banned words analytically.

### Key design decisions

- **`done ≠ submitted`**: Assignment state machine has 6 states; `done → submitted` transition is always explicit and student-confirmed.
- **Dyslexia 1.6× multiplier**: Applied to `reading_load >= 3` tasks in both the priority scorer and the nightly time-budget calculator. Must stay consistent between the two.
- **`effective_minutes`**: The scorer computes the student's *real* expected time (with IEP extra-time % + dyslexia multiplier), separate from the teacher's estimated minutes.
- **AI traffic light** (`red/yellow/green`): Stored on `classes.ai_policy` with per-assignment override. Enforced server-side in every Edge Function — not just the client.
- **FSRS-5 weights**: The `W` array in `lib/fsrs/fsrs.ts` uses the published Anki v5 default weights. Do not change these without understanding the FSRS spec.
- **Authorship log**: Every AI interaction writes to `ai_interactions` (cost/audit) and the student-facing `authorship_log` table. The fire-and-forget pattern means a log failure must never break the AI response.

### Adding a new AI feature

1. Create a new Edge Function in `supabase/functions/<feature-name>/index.ts`
2. Call `composeSystemPrompt` with `includeRefuseRedirect: true`, `includeFrustration: true`, `includeMinorSafety: true`
3. Gate on `aiMode` before the Claude call
4. Add the feature name to the `feature` union in `lib/ai/safety.ts` → `LogParams`
5. Fire-and-forget log + token increment after returning the response
