---
phase: 19-science-scaffold-engine
plan: "01"
completed: "2026-06-01"
requirements_completed: [F68, F69, F70, F71, F72, F73, F74]
---

# Phase 19 Plan 01 Summary

Phase 19 is implemented and deployed to the linked Supabase project.

## What Changed

- Added `science-scaffold` Edge Function:
  - Hypothesis mode.
  - Lab report mode.
  - Scientific method mode.
  - Formula context mode.
  - Chemistry balancing mode.
  - Diagram mode with Mermaid source output.
  - FRQ mode for AP-style constructed responses.
  - Red/yellow AI mode blocks for content-generating science help.
  - `science_scaffold` logging through the shared AI safety layer.
- Added `lib/science/scaffold.ts`:
  - Typed science scaffold result model.
  - JSON parsing and deterministic fallback guidance.
  - Formula context and Mermaid source normalization.
- Added Science Helper to assignment detail:
  - Renders for lab assignments and science-like class names.
  - Mode controls for hypothesis, lab report, method, formula, chemistry balance, diagram, and FRQ.
  - Class-note context loader for science prompts.
  - Card renderer, formula context panel, Mermaid source panel, and check prompt.
- Added `science_scaffold` to AI feature unions and tooltip descriptions.

## Acceptance Evidence

- F68 hypothesis scaffold:
  - `science-scaffold` mode `hypothesis`.
  - Prompts ask for prediction and reasoning before explanation.
- F69 lab report builder:
  - `science-scaffold` mode `lab_report`.
  - Science Helper renders procedure, data, analysis, and conclusion cards from structured output.
- F70 scientific method coach:
  - `science-scaffold` mode `method`.
  - Output identifies the current step and next move.
- F71 formula context engine:
  - `science-scaffold` mode `formula`.
  - `formulaContext` explains variables and units without final-answer reveal.
- F72 diagram generation:
  - `science-scaffold` mode `diagram`.
  - `mermaid` source is returned and shown in the helper. Client-side Mermaid rendering is deferred to avoid a new dependency in this phase.
- F73 chemistry equation balancer:
  - `science-scaffold` mode `chemistry_balance`.
  - Guidance focuses on atom counts, coefficients, and checks.
- F74 AP Science FRQ scaffold:
  - `science-scaffold` mode `frq`.
  - Output provides claim, evidence, reasoning, and unit/diagram reminders.

## Verification

- `npx vitest run lib/science/scaffold.test.ts`: pass, 1 file / 3 tests
- `npm run typecheck`: pass
- `npm run test:run`: pass, 40 files / 321 tests
- `npm run tone-audit`: pass, 0 blocking violations, 1 README warning
- `git diff --check`: pass, only line-ending warnings
- `npm run build`: pass
- `npx supabase functions deploy science-scaffold`: pass
- `npx supabase functions list`: pass, `science-scaffold` ACTIVE, updated 2026-06-01T18:54:12Z

## Notes

- No database migration was needed for Phase 19.
- Mermaid output is generated as source text in the UI; live Mermaid rendering can be added later if needed.
