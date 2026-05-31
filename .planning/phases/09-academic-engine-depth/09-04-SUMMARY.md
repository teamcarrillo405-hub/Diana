---
phase: 09-academic-engine-depth
plan: "04"
subsystem: math-tools
tags: [formulas, math-example, edge-function, haiku, accordion, F6]
dependency_graph:
  requires: [09-01]
  provides: [lib/math/formulas.ts, supabase/functions/math-example, formula-accordion, worked-example-button]
  affects: [app/(app)/assignments/[id]/math-helper.tsx, app/(app)/assignments/[id]/ai-tools-actions.ts, lib/ai/safety.ts, supabase/functions/_shared/safety.ts]
tech_stack:
  added: []
  patterns: [static-data-no-ai, tdd-red-green, deno-mirror-sync, fire-and-forget-log]
key_files:
  created:
    - lib/math/formulas.ts
    - lib/math/formulas.test.ts
    - supabase/functions/math-example/index.ts
  modified:
    - lib/ai/safety.ts
    - supabase/functions/_shared/safety.ts
    - app/(app)/assignments/[id]/ai-tools-actions.ts
    - app/(app)/assignments/[id]/math-helper.tsx
decisions:
  - "Static formula data in lib/math/formulas.ts — plain text Unicode, no KaTeX, no AI cost (D-01, D-02)"
  - "math-example is a separate Edge Function from math-step — analogous problem only, never student's actual problem (D-03, D-04)"
  - "Formula accordion renders on yellow aiMode; worked-example button requires green (D-07)"
  - "Red aiMode returns null entirely; yellow renders formulas only; green renders full math tools"
  - "math_example added to LogParams.feature union in both lib/ai/safety.ts AND supabase/functions/_shared/safety.ts (Pitfall 4 Deno mirror)"
metrics:
  duration: "~10 minutes"
  completed: "2026-05-30"
  tasks_completed: 3
  files_created: 3
  files_modified: 4
---

# Phase 09 Plan 04: AP Math Depth (Formula Reference + Worked Example) Summary

AP Math depth delivered: static formula reference panel (38 entries, no AI cost) and worked-example Edge Function (Haiku 4.5, analogous problems only) integrated into the existing MathHelper component.

## Tasks Completed

| # | Name | Commit | Key Files |
|---|------|--------|-----------|
| 1 | Static formula reference data + invariant tests | 81175d3 | lib/math/formulas.ts, lib/math/formulas.test.ts |
| 2 | math-example Edge Function + LogParams sync | 3eb51fb | supabase/functions/math-example/index.ts, lib/ai/safety.ts, supabase/functions/_shared/safety.ts |
| 3 | requestMathExample action + accordion + worked example button | 48cdd18 | app/(app)/assignments/[id]/ai-tools-actions.ts, app/(app)/assignments/[id]/math-helper.tsx |

## What Was Built

### lib/math/formulas.ts

38 formula entries across three subjects — plain text Unicode (∫, d/dx, √, Δ, π, θ, ², ³), no KaTeX dependency (saves ~300KB bundle):

- **CALC_FORMULAS** (13 entries): Power rule through Mean value theorem — derivatives, integrals, Fundamental theorem
- **PHYSICS_FORMULAS** (13 entries): Newton's second law through Coulomb's law — kinematics, energy, electricity
- **ALGEBRA_FORMULAS** (12 entries): Quadratic formula through Change of base — factoring, lines, logarithms

### lib/math/formulas.test.ts

10 invariant tests — TDD RED→GREEN cycle:
- Count thresholds (≥8 per subject)
- Shape: every entry has non-empty name + formula
- No HTML/JSX angle brackets in any formula (plain text enforcement)
- Calm-invariant: no banned words (wrong, behind, missed, failed, you must) in any field
- Domain spot-checks: derivative/d/dx in Calculus, force/F= in Physics, quadratic/ax² in Algebra

### supabase/functions/math-example/index.ts

Edge Function mirroring math-step structure:
- **Model**: claude-haiku-4-5, max_tokens: 500 (D-06)
- **Gate**: returns 403 on aiMode red OR yellow (same gate as math-step)
- **System prompt**: ANALOGOUS BUT DIFFERENT problem invariant — different numbers, different context, same technique
- **One-shot**: no history; worked example is stateless per request
- **Fire-and-forget**: logInteraction + incrementTokens after response (AI-SAFETY-01)
- **`composeSystemPrompt`** with `includeRefuseRedirect: true`, `includeFrustration: false` (worked example IS the F18 redirect), `includeMinorSafety: true`

### LogParams sync — both mirrors

`"math_example"` added to LogParams.feature union in:
1. `lib/ai/safety.ts` (TypeScript / Next.js side)
2. `supabase/functions/_shared/safety.ts` (Deno mirror — Pitfall 4 prevention)

### MathHelper component — extended

Split single early-return into two separate gates per D-07:

1. **`if (classAiMode === "red") return null;`** — entire component hidden
2. **`if (classAiMode === "yellow")`** — formula accordion only (three sections: Calculus, Physics, Algebra; zero AI cost)
3. **Green mode** — full math tools: existing Socratic chat + new worked-example section + formula accordion

**New green additions**:
- Subject selector (Calculus / Physics / Algebra toggle)
- "Show example" button → calls `requestMathExample` server action → invokes `math-example` Edge Function
- Copy: "Diana solves a similar problem so you can see the pattern. Yours stays yours." (Socratic invariant signal)
- Formula reference accordion (same three sections) available below the worked-example section

**Preserved unchanged**: chat history rendering, textarea, "Get a hint" button, `requestMathStep` call path.

### requestMathExample server action

Added to `ai-tools-actions.ts` after existing task-breakdown section:
- Validates input via Zod (`MathExampleInput`)
- Calls `supabase.functions.invoke("math-example", ...)`
- Uses shared `calmError()` helper for Edge Function error normalization

## Invariants Preserved

- **Socratic invariant (math-step)**: untouched — still never gives answers, hints only
- **math-example**: never solves student's actual problem — ANALOGOUS problem only (D-03)
- **No KaTeX**: zero new bundle weight — plain text Unicode throughout (D-02)
- **Calm invariant**: no banned words in any formula, system prompt, or UI copy
- **Tone audit**: exits 0 — no violations in new code
- **Yellow mode access**: formula accordion available to students on yellow-policy classes (library reference ≠ AI content generation)

## Deviations from Plan

None — plan executed exactly as written. All D-01 through D-07 design decisions honored.

## Verification Results

- `npx vitest run lib/math/formulas.test.ts` — 10/10 passed
- `npm run typecheck` — clean (0 errors)
- `npm run tone-audit` — exits 0 (2 pre-existing warnings in lib/features.ts + README.md, not new)
- `npm run test:run` — 170/170 passed (18 test files)

## Self-Check: PASSED
