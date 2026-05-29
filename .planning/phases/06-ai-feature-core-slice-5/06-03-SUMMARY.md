---
phase: 06-ai-feature-core-slice-5
plan: "03"
subsystem: api
tags: [edge-functions, deno, anthropic, haiku, sonnet, ai-safety, token-budget, citations]

requires:
  - phase: 06-01
    provides: "migration 0012 ai_feature_core schema, _shared/safety.ts, _shared/system-prompts.ts"

provides:
  - "F09 math-step Edge Function: Haiku 4.5, Socratic-only, red+yellow block"
  - "F10 writing-aid Edge Function: Sonnet 4.6, explain-rule-not-fix, red+yellow block"
  - "F11 citation-gen Edge Function: Haiku 4.5, MLA 9/APA 7/Chicago, red-only block"
  - "All three: resetBudgetIfNewDay + checkTokenBudget + 429 + fire-and-forget log"

affects:
  - 06-04
  - plan-06-04-server-actions
  - plan-06-04-client-components

tech-stack:
  added: []
  patterns:
    - "Fire-and-forget side effects: Promise.resolve().then(async() => {...}).catch() — never blocks response"
    - "aiMode traffic-light guard: red blocks all; yellow blocks math+writing; yellow allows citations"
    - "composeSystemPrompt wraps feature-specific prompt with CALM_TONE + optional F17/F18/MINOR_SAFETY"
    - "Deno Edge Function with jsr:@supabase/supabase-js@2 service-role client for DB writes"

key-files:
  created:
    - supabase/functions/math-step/index.ts
    - supabase/functions/writing-aid/index.ts
    - supabase/functions/citation-gen/index.ts
  modified: []

key-decisions:
  - "math-step uses Haiku 4.5 (400 tokens) — Socratic hints are low-complexity; budget stretches further per student"
  - "writing-aid uses Sonnet 4.6 (500 tokens) — grammar/style nuance requires higher model; F10 spec explicitly names Sonnet"
  - "citation-gen uses Haiku 4.5 (600 tokens) — pure text-transform, no reasoning needed; three format output fits in budget"
  - "Yellow aiMode allows citations (F16 semantics: yellow = citation-help only); blocks math + writing"
  - "citation-gen gets MINOR_SAFETY only — no F17/F18 (citations are not Socratic; formatting metadata is not doing work for student)"
  - "History capped at 6 turns for math-step: cost + frustration detection window; writing-aid has no history (per-sentence)"
  - "Fire-and-forget side effects via Promise.resolve().then() — AI-SAFETY-01 constraint: side effects must never block response"

patterns-established:
  - "Pattern: All new AI Edge Functions must import from ../_shared/safety.ts and ../_shared/system-prompts.ts"
  - "Pattern: Budget guard order = resetBudgetIfNewDay → checkTokenBudget → 429 if exhausted"
  - "Pattern: aiMode check happens BEFORE budget check (cheaper to fail fast on mode)"

requirements-completed: [F09, F10, F11, F17, F18, AI-SAFETY-01]

duration: 15min
completed: "2026-05-29"
---

# Phase 6 Plan 03: AI Edge Functions (math-step, writing-aid, citation-gen) Summary

**Three Deno Edge Functions deliver F09/F10/F11 AI features with Socratic guards, token-budget enforcement, and fire-and-forget interaction logging via the shared safety layer from 06-01**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-05-29T14:57:24Z
- **Completed:** 2026-05-29T15:12:00Z
- **Tasks:** 3 of 3
- **Files modified:** 3 created

## Accomplishments

- `math-step` (Haiku 4.5): Socratic math tutor that never reveals the answer; blocks red and yellow aiMode; 6-turn history cap with frustration detection via F18
- `writing-aid` (Sonnet 4.6): Writing coach that explains one rule per request without ever editing or rewriting the student's text; blocks red and yellow
- `citation-gen` (Haiku 4.5): Formats MLA 9, APA 7, and Chicago citations as a parseable JSON object; blocks only red (yellow allowed — F16 traffic-light)
- All three import from `../_shared/safety.ts` and `../_shared/system-prompts.ts`, enforce the per-user token budget, and log to `ai_interactions` fire-and-forget

## Task Commits

1. **Task 1: math-step Edge Function** - `ca500c9` (feat)
2. **Task 2: writing-aid Edge Function** - `6f1fdf6` (feat)
3. **Task 3: citation-gen Edge Function** - `e71af21` (feat)

## Edge Function Request/Response Shapes

### math-step

**Request:**
```json
{ "ownerId": "uuid", "assignmentId": "uuid|null", "history": [{"role":"user","content":"..."}], "prompt": "string", "aiMode": "green|yellow|red" }
```
**Response (200):**
```json
{ "content": "Socratic hint text" }
```
**Error responses:** 400 (bad body), 403 (red/yellow mode), 429 (budget exhausted), 502 (Anthropic error), 500 (internal)

### writing-aid

**Request:**
```json
{ "ownerId": "uuid", "assignmentId": "uuid|null", "prompt": "string (sentence/passage)", "aiMode": "green|yellow|red" }
```
**Response (200):**
```json
{ "content": "Rule explanation + parallel example + rewrite invitation" }
```
**Error responses:** 400, 403 (red or yellow), 429, 502, 500

### citation-gen

**Request:**
```json
{ "ownerId": "uuid", "assignmentId": "uuid|null", "aiMode": "green|yellow|red", "sourceType": "url|book|paste", "sourceText": "string", "formats": ["mla","apa","chicago"] }
```
**Response (200):**
```json
{ "citations": { "mla": "...", "apa": "...", "chicago": "..." } }
```
**Error responses:** 400, 403 (red only — yellow is allowed), 429, 502, 500

## Model + Token Budget per Function

| Function     | Model             | max_tokens | F17 Refuse | F18 Frustration | MINOR_SAFETY |
|--------------|-------------------|-----------|------------|-----------------|--------------|
| math-step    | claude-haiku-4-5  | 400       | Yes        | Yes             | Yes          |
| writing-aid  | claude-sonnet-4-6 | 500       | Yes        | Yes             | Yes          |
| citation-gen | claude-haiku-4-5  | 600       | No         | No              | Yes          |

## F17 + F18 Rationale

- **math-step + writing-aid** inject both `REDIRECT_PROMPT` (F17) and `FRUSTRATION_REDIRECT` (F18) because they are Socratic features where students may push for direct answers or show frustration
- **citation-gen** injects neither: citation formatting is a metadata task, not Socratic. The student is providing data to format — Diana is not "doing the work for them" in a pedagogical sense. F17 refuse-with-redirect is irrelevant. F18 frustration detection is irrelevant (no conversational loop)

## Local Dev / Deploy Notes

Deploy each function individually:
```bash
supabase functions deploy math-step
supabase functions deploy writing-aid
supabase functions deploy citation-gen
```

Required secrets (already set from 06-01):
- `ANTHROPIC_API_KEY`
- `SUPABASE_URL` (auto-injected by Supabase)
- `SUPABASE_SERVICE_ROLE_KEY` (auto-injected by Supabase)

Local test with `supabase functions serve` — all three use `jsr:` imports which resolve correctly in the Supabase CLI Deno runtime.

## Files Created/Modified

- `supabase/functions/math-step/index.ts` — F09: Haiku 4.5 Socratic tutor, never reveals answer, red+yellow guard
- `supabase/functions/writing-aid/index.ts` — F10: Sonnet 4.6 writing coach, never edits text, red+yellow guard
- `supabase/functions/citation-gen/index.ts` — F11: Haiku 4.5 citation formatter, MLA/APA/Chicago JSON, red-only guard

## Decisions Made

- **math-step Haiku 4.5:** Socratic hints are low-complexity prose; budget per student stretches further; quality is well within tolerance for "what do you think comes next?" prompts
- **writing-aid Sonnet 4.6:** Grammar/style nuance (homophones, comma splices, parallelism) requires Sonnet; F10 plan brief explicitly names Sonnet 4.6
- **citation-gen Haiku 4.5:** Pure text-transform with no reasoning; three-format output fits within 600 tokens on Haiku
- **Yellow blocks math + writing:** F16 traffic-light spec: yellow mode = citation-help only. Math and writing guidance are higher Socratic concern
- **No history for writing-aid:** Each sentence review is independent; conversational context would confuse "explain one rule" framing
- **6-turn history cap for math-step:** Cost-efficient on Haiku; frustration detector cares about recent 3–5 turns; most homework problems resolve in that window
- **Fire-and-forget pattern:** `Promise.resolve().then(async()=>{...}).catch()` — AI-SAFETY-01 mandates side effects (logInteraction, incrementTokens) must never block the response to the student

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None — all three functions were created cleanly following the math-step template.

## Known Stubs

None — all three Edge Functions are fully functional backend implementations. No hardcoded empty values, placeholder text, or unconnected data paths. Plan 06-04 (wave 3) will wire the client-side server actions and components that invoke these Edge Functions.

## User Setup Required

None — ANTHROPIC_API_KEY and Supabase service keys are already configured from Phase 06-01.

## Next Phase Readiness

Plan 06-04 (wave 3) depends on 06-01 + 06-02 + 06-03. All three backend functions are now available for 06-04 to wire:
- `supabase.functions.invoke("math-step", { body: {...} })`
- `supabase.functions.invoke("writing-aid", { body: {...} })`
- `supabase.functions.invoke("citation-gen", { body: {...} })`

---
*Phase: 06-ai-feature-core-slice-5*
*Completed: 2026-05-29*
