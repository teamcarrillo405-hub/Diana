---
phase: 09-academic-engine-depth
plan: "07"
subsystem: ai-transparency
tags: [ai-literacy, authorship-log, tooltip, onboarding, transparency]
dependency_graph:
  requires:
    - supabase/migrations/0012_ai_interactions.sql
    - lib/ai/safety.ts
  provides:
    - components/ai-tooltip.tsx
    - components/ai-usage-log.tsx
    - AI-LITERACY-01
    - AI-LITERACY-02
  affects:
    - app/(app)/assignments/[id]/page.tsx
    - app/(app)/assignments/[id]/math-helper.tsx
    - app/(app)/assignments/[id]/writing-aid.tsx
    - app/(app)/assignments/[id]/citation-tool.tsx
    - app/onboarding/form.tsx
tech_stack:
  added:
    - "@testing-library/jest-dom ^6.x (devDep — jest-dom matchers for vitest)"
  patterns:
    - "Static feature-key descriptions (no API call) for inline AI transparency"
    - "tokensToWords: tokens/4 rounded to nearest 10 for calm word-count framing"
    - "step state machine in OnboardingForm: 'form' | 'literacy' — commit extracted to separate function"
key_files:
  created:
    - components/ai-tooltip.tsx
    - components/ai-tooltip.test.tsx
    - components/ai-usage-log.tsx
    - components/ai-usage-log.test.tsx
    - vitest.setup.ts
  modified:
    - app/(app)/assignments/[id]/page.tsx
    - app/(app)/assignments/[id]/math-helper.tsx
    - app/(app)/assignments/[id]/writing-aid.tsx
    - app/(app)/assignments/[id]/citation-tool.tsx
    - app/onboarding/form.tsx
    - vitest.config.ts
decisions:
  - "AiTooltip renders nothing for unknown feature keys (safe fallback) — no error state"
  - "AiTooltip conditionally shown only when AI output is visible (history.length>0, result!=null, example!=null) — tooltip at point of use only"
  - "vitest.setup.ts + @testing-library/jest-dom needed — toBeInTheDocument not available without it"
  - "afterEach(cleanup) added to component test files — prevents DOM pollution between tests"
  - "/// <reference types='@testing-library/jest-dom' /> added to test files — TypeScript knows about custom matchers"
  - "Onboarding commit() extracted from onSubmit() so literacy step can gate the actual save without duplicating the saveOnboarding call"
  - "Skip for now button bypasses literacy step — user-initiated skip is acceptable per plan spec"
metrics:
  duration: "~15 minutes"
  completed_date: "2026-05-30"
  tasks_completed: 4
  files_changed: 11
---

# Phase 09 Plan 07: AI Transparency Surfaces Summary

**One-liner:** Per-assignment AI authorship log + inline (i) tooltips + onboarding literacy step — all static/DB-only, zero new Claude API calls (AI-LITERACY-01 + AI-LITERACY-02).

## What Was Built

### Task 1: AiTooltip component + tests (commit ef1482e)
- `components/ai-tooltip.tsx` — `"use client"` component exposing `AiTooltip` + `AI_FEATURE_DESCRIPTIONS` export
- Small `(i)` button that toggles a one-line static description per feature key
- Returns `null` for unknown keys (safe fallback)
- `aria-label="About this AI help"` + `aria-expanded` for accessibility
- 7 feature keys: `task_breakdown`, `math_step`, `writing_aid`, `citation_gen`, `reading_scaffold`, `math_example`, `transcribe_note`
- `components/ai-tooltip.test.tsx` — 4 tests: correct desc per key, null for unknown, toggle visibility, aria-label
- Also set up `vitest.setup.ts` + `@testing-library/jest-dom` matchers (deviation — missing infrastructure)

### Task 2: AiUsageLog + DB wiring (commits c6bbf89, 70e33a1)
- `components/ai-usage-log.tsx` — collapsible per-assignment AI log
- `tokensToWords(tokens)` — `Math.round(tokens/4 / 10) * 10` — converts token counts to approximate word counts
- Empty state: "AI hasn't been used on this assignment yet" (calm, no shame)
- Non-empty state: "AI was used on this assignment N times" (never "You used AI")
- Expand button reveals per-interaction rows with feature label, model name, "About N words of AI help"
- `app/(app)/assignments/[id]/page.tsx` — server fetch of `ai_interactions WHERE assignment_id = id ORDER BY created_at DESC`, passes result as `<AiUsageLog interactions={aiLog ?? []} />`
- 6 tests all passing

### Task 3: AiTooltip wired to output components (commit e23c1ad)
- `math-helper.tsx` — `<AiTooltip feature="math_step" />` shown when `history.length > 0`; `<AiTooltip feature="math_example" />` shown when `example` is non-null
- `writing-aid.tsx` — `<AiTooltip feature="writing_aid" />` shown when `result` is non-null
- `citation-tool.tsx` — `<AiTooltip feature="citation_gen" />` shown when `result` is non-null
- All three tooltips appear only when AI output is visible — tooltip at point of use

### Task 4: AI literacy step in onboarding (commit 4e1b457)
- `app/onboarding/form.tsx` — new `step` state (`"form" | "literacy"`)
- `onSubmit` now advances to `"literacy"` instead of saving directly
- `commit()` function extracted — handles actual `saveOnboarding` call + router push
- Literacy step renders: headline "A quick word about the AI", body "Diana uses Claude to help — not to do your work.", 3 bullet points (no essay writing, questions to think, (i) indicator)
- CTA: "Got it" — calls `commit()`, saves and routes to `/onboarding/done`
- "Back" button returns to form; "Skip for now" still bypasses the literacy step (user-initiated, intentional)

## Verification Results

- `npm run typecheck` — clean (0 errors)
- `npm run tone-audit` — exits 0 (2 pre-existing warnings in lib/features.ts and README.md, not from this plan)
- `npm run test:run` — 209 tests passed (24 test files)
- `grep -r "You used AI"` — zero results in production code (calm framing invariant held)
- `grep -r "AiTooltip" app/(app)/assignments/[id]/` — returns math-helper, writing-aid, citation-tool

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Infrastructure] Added @testing-library/jest-dom setup**
- **Found during:** Task 1
- **Issue:** `toBeInTheDocument` not available without jest-dom matchers. `vitest.config.ts` had no setup file. `@testing-library/jest-dom` was not installed.
- **Fix:** Installed `@testing-library/jest-dom`, created `vitest.setup.ts` importing matchers, updated `vitest.config.ts` to reference setup file, added `/// <reference types="@testing-library/jest-dom" />` to test files for TypeScript.
- **Files modified:** `vitest.config.ts`, `vitest.setup.ts` (new), `components/ai-tooltip.test.tsx`, `components/ai-usage-log.test.tsx`
- **Commit:** ef1482e

**2. [Rule 2 - Missing test hygiene] afterEach(cleanup) added to component tests**
- **Found during:** Task 1
- **Issue:** DOM pollution between tests caused `getByRole("button")` to find multiple elements from previous test iterations.
- **Fix:** Added `afterEach(() => cleanup())` to both component test files.
- **Files modified:** `components/ai-tooltip.test.tsx`, `components/ai-usage-log.test.tsx`
- **Commit:** ef1482e

## Known Deferred Items

**BreakdownPanel (task_breakdown feature):** `AI_FEATURE_DESCRIPTIONS["task_breakdown"]` is defined and ready. No `breakdown-panel.tsx` exists yet in `app/(app)/assignments/[id]/`. Wire `<AiTooltip feature="task_breakdown" />` there when that component ships.

## Confirmations

- **No DB migration required** — `ai_interactions` table from migration `0012_ai_interactions.sql` powers the log.
- **No new Claude API calls** — `AiTooltip` is pure static text; `AiUsageLog` is a Supabase DB query only.
- **Calm invariant maintained** — no "You used AI", no red errors, no shame framing in any new copy.

## Self-Check: PASSED

Files verified:
- FOUND: components/ai-tooltip.tsx
- FOUND: components/ai-usage-log.tsx
- FOUND: vitest.setup.ts

Commits verified:
- ef1482e: feat(09-07): AiTooltip component + tests (AI-LITERACY-01)
- 70e33a1: feat(09-07): AiUsageLog on assignments/[id] (AI-LITERACY-01)
- e23c1ad: feat(09-07): inline AiTooltip on math/writing/citation outputs (AI-LITERACY-01)
- 4e1b457: feat(09-07): AI literacy step in onboarding (AI-LITERACY-02)
