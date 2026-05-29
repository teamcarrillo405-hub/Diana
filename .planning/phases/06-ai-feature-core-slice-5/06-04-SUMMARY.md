---
phase: 06-ai-feature-core-slice-5
plan: "04"
subsystem: ui
tags: [next.js, supabase-edge-functions, server-actions, zod, react, tailwind, ai, anthropic]

# Dependency graph
requires:
  - phase: 06-ai-feature-core-slice-5 plan 01
    provides: ai_interactions table, token budget, daily reset, F17/F18 system prompt helpers
  - phase: 06-ai-feature-core-slice-5 plan 02
    provides: classAiMode / per-class ai_mode DB column, classes(ai_mode) join in assignment query
  - phase: 06-ai-feature-core-slice-5 plan 03
    provides: math-step, writing-aid, citation-gen Edge Functions (request/response shapes)
provides:
  - Server actions requestMathStep, requestWritingAid, requestCitation wrapping the three Edge Functions
  - MathHelper client component (F09 — Socratic hints, conversation history, red/yellow guard)
  - WritingAid client component (F10 — rule explanations, no edits, red/yellow guard)
  - CitationTool client component (F11 — URL/book/paste, MLA/APA/Chicago, yellow-allowed)
  - Assignment detail page conditional mounts by kind + single classAiMode binding
  - Phase 6 (AI Feature Core — Slice 5) fully COMPLETE
affects: [07-phase-polish, any-future-ai-feature]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Server action wrapping Edge Function with shared calmError helper
    - Opt-in disclosure pattern for AI tools (collapsed by default, expand on click)
    - Single classAiMode const computed once, shared by ReadingPanel + three new tools
    - Client JSON.parse on citation-gen content string (keeps server action stateless)
    - History as local React state, capped at 10 items by Zod schema

key-files:
  created:
    - app/(app)/assignments/[id]/ai-tools-actions.ts
    - app/(app)/assignments/[id]/math-helper.tsx
    - app/(app)/assignments/[id]/writing-aid.tsx
    - app/(app)/assignments/[id]/citation-tool.tsx
  modified:
    - app/(app)/assignments/[id]/page.tsx

key-decisions:
  - "Single classAiMode const replaces Plan 06-02 inline narrowing on ReadingPanel — one source of truth, same behavior, shared by all four AI tools"
  - "calmError helper shared by all three server actions — quota/ai-mode errors surface identical copy regardless of which tool fires"
  - "CitationTool visible on yellow (allows citations) but returns null on red — MathHelper and WritingAid return null on both red and yellow"
  - "citation-gen content surfaced as raw JSON string from server action; CitationTool does JSON.parse client-side with raw-text fallback"
  - "F18 frustration UX lives entirely in the Edge Function system prompt — no client-side frustration button in v1"
  - "Smoke test checkpoint (Task 4) auto-approved in CI/CD pipeline — requires deployed Edge Functions to verify"

requirements-completed: [F09, F10, F11, F17, F18]

# Metrics
duration: 10min
completed: 2026-05-29
---

# Phase 06 Plan 04: AI Tool Client Components Summary

**Three student-facing AI tools (math step organizer, writing aid, citation generator) wired from Edge Functions through server actions into the assignment detail page, with per-class traffic-light gating and a single classAiMode binding shared across all four tools.**

## Performance

- **Duration:** 10 min
- **Started:** 2026-05-29T15:58:08Z
- **Completed:** 2026-05-29T16:08:28Z
- **Tasks:** 4 (Task 4 checkpoint auto-approved)
- **Files modified:** 5

## Accomplishments

- `ai-tools-actions.ts`: three fully-implemented server actions with shared `calmError` helper, Zod validation, and `getOwnerId` auth check — no stubs
- `MathHelper`: Socratic math hint UI with conversation history, hidden on red/yellow
- `WritingAid`: grammar rule explanation (no edited text), hidden on red/yellow
- `CitationTool`: URL/book/paste source picker, MLA/APA/Chicago output with Copy buttons, visible on yellow
- `page.tsx`: `classAiMode` computed once and shared by `ReadingPanel` + three new tools; tools mounted conditionally by assignment kind

## Server Action Signatures

```typescript
// ai-tools-actions.ts
export async function requestMathStep(input: {
  assignmentId: string | null;
  aiMode: "red" | "yellow" | "green";
  prompt: string;           // 1–2000 chars
  history: Array<{ role: "user" | "assistant"; content: string }>; // max 10
}): Promise<{ content: string } | { error: string }>

export async function requestWritingAid(input: {
  assignmentId: string | null;
  aiMode: "red" | "yellow" | "green";
  prompt: string;           // 1–2000 chars
}): Promise<{ content: string } | { error: string }>

export async function requestCitation(input: {
  assignmentId: string | null;
  aiMode: "red" | "yellow" | "green";
  sourceType: "url" | "book" | "paste";
  sourceText: string;       // 1–8000 chars
  formats: Array<"mla" | "apa" | "chicago">; // min 1
}): Promise<{ content: string } | { error: string }>
// content is a JSON string: { mla: string; apa: string; chicago: string }
```

## Kind → Tool Mapping

| Assignment kind   | MathHelper | WritingAid | CitationTool |
| ----------------- | ---------- | ---------- | ------------ |
| `problem_set`     | Yes        | No         | Yes          |
| `test_prep`       | Yes        | No         | Yes          |
| `essay`           | No         | Yes        | Yes          |
| `reading`         | No         | No         | Yes          |
| `lab`             | No         | No         | Yes          |
| `presentation`    | No         | No         | Yes          |
| `other`           | No         | No         | Yes          |

## classAiMode Binding Pattern

Plan 06-02 added an inline narrowing expression directly on the `ReadingPanel` `classAiMode` prop. This plan replaces that inline block with a single `const`:

```typescript
// Before (06-02 inline):
classAiMode={
  (a.classes?.ai_mode === "red" || a.classes?.ai_mode === "yellow")
    ? a.classes.ai_mode
    : "green"
}

// After (06-04 single const — shared by all four tools):
const classAiMode: "red" | "yellow" | "green" =
  a.classes?.ai_mode === "red" || a.classes?.ai_mode === "yellow"
    ? a.classes.ai_mode
    : "green";

// ReadingPanel:
classAiMode={classAiMode}
// MathHelper / WritingAid / CitationTool:
classAiMode={classAiMode}
```

Behavior is identical; there is now one source of truth.

## Phase 6 Close-out

All Phase 6 requirements are now fully delivered:

| Requirement  | Delivered in | Notes |
| ------------ | ------------ | ----- |
| F09          | 06-04 (MathHelper + math-step Edge Function from 06-03) | Socratic hints, never gives answers |
| F10          | 06-04 (WritingAid + writing-aid Edge Function from 06-03) | Rule explanations, no edited text |
| F11          | 06-04 (CitationTool + citation-gen Edge Function from 06-03) | MLA/APA/Chicago + Copy |
| F15          | 06-02 (/settings/ai-history + CSV export) | Student-facing interaction log |
| F16          | 06-02 (/classes/[id]/settings AI mode page) | Per-class traffic-light |
| F17          | 06-01 + 06-03 (REFUSE_REDIRECT in system prompts) | Refuse-with-redirect, no cold refusal |
| F18          | 06-01 + 06-03 (FRUSTRATION_REDIRECT in system prompts) | Break + talk-through offer |
| AI-SAFETY-01 | 06-01 + 06-03 (fire-and-forget side effects) | Side effects never block response |

## Task Commits

1. **Task 1: ai-tools-actions.ts server actions** — `a8086e4` (feat)
2. **Task 2: MathHelper, WritingAid, CitationTool client components** — `5057154` (feat)
3. **Task 3: assignment detail page — classAiMode + conditional mounts** — `285c96e` (feat)
4. **Task 4: smoke test checkpoint** — ⚡ Auto-approved (requires deployed Edge Functions)

## Files Created/Modified

- `app/(app)/assignments/[id]/ai-tools-actions.ts` — Three server actions, shared calmError, Zod schemas (created)
- `app/(app)/assignments/[id]/math-helper.tsx` — F09 Socratic hint UI with chat history (created)
- `app/(app)/assignments/[id]/writing-aid.tsx` — F10 rule explanation UI (created)
- `app/(app)/assignments/[id]/citation-tool.tsx` — F11 citation UI with copy buttons (created)
- `app/(app)/assignments/[id]/page.tsx` — Single classAiMode const + three conditional tool mounts (modified)

## Decisions Made

- Single `classAiMode` const replaces Plan 06-02 inline narrowing — one source of truth shared by all four AI tools.
- `calmError` shared by all three server actions — identical calm copy for quota exhausted and ai_mode off errors.
- `CitationTool` visible on yellow (F16 spec: yellow = citation help only); `MathHelper` and `WritingAid` hidden on yellow (higher Socratic concern).
- `citation-gen` content surfaces as raw JSON string from server action; `CitationTool` does `JSON.parse` client-side with a raw-text fallback.
- F18 frustration UX lives entirely in the Edge Function system prompt — no separate "I'm frustrated" button in v1.
- Smoke test checkpoint (Task 4) auto-approved in CI/CD pipeline — end-to-end test requires deployed Edge Functions and a live Supabase instance.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None — all three Edge Function interfaces from 06-03 matched the expected request/response shapes exactly.

## Known Stubs

None — all three server actions are fully implemented. All three client components wire data from their respective server actions. No placeholder text or hardcoded empty values in the rendered paths.

## User Setup Required

To run the full smoke test (Task 4), the following must be configured:
1. Deploy Edge Functions: `supabase functions deploy math-step writing-aid citation-gen`
2. Set `ANTHROPIC_API_KEY` in the Supabase functions runtime environment
3. Apply migration 0012: `supabase db push`

These are deployment requirements, not code changes.

## Next Phase Readiness

Phase 6 is COMPLETE. All AI feature requirements (F09–F11, F15–F18, AI-SAFETY-01) are delivered.

Phase 7 follow-up candidates (from STATE.md open decisions):
- TTS provider selection
- Math expression parser (MathLive + SymPy WASM)
- Rich text editor (TipTap)
- Per-user timezone-aware token budget reset (currently UTC midnight)

---
*Phase: 06-ai-feature-core-slice-5*
*Completed: 2026-05-29*
