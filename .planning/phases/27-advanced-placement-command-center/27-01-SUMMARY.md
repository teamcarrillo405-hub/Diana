---
phase: 27-advanced-placement-command-center
plan: "01"
completed: "2026-06-01"
requirements_completed: [F121, F122, F123, F124, F125, F126]
---

# Phase 27 Plan 01 Summary

Phase 27 is implemented, the database migration is applied to the linked Supabase project, and `ap-scaffold` is deployed.

## What Changed

- Added migration `0028_ap_command_center.sql`:
  - `ap_exam_plans` table.
  - `ap_practice_attempts` table.
  - Owner RLS policies and indexes.
- Added `/ap` command center:
  - AP subject/exam-date plan creation.
  - Countdown in days.
  - Milestone plan.
  - FRQ format outline.
  - Practice attempt logging.
  - Score-band estimate.
- Added deterministic AP helpers:
  - Full planned subject list.
  - Subject-to-format mapping.
  - FRQ outline fallback per AP format.
  - MCQ question parser requiring explanations for every choice.
  - Score-band predictor.
- Added assignment AP Helper:
  - FRQ outline.
  - MCQ practice.
  - Study plan.
  - AP subject selector.
- Added `ap-scaffold` Edge Function:
  - Claude Haiku 4.5.
  - Minor safety, calm tone, token budget, logging.
  - AP/College Board format prompt constraints.

## Acceptance Evidence

- F121 AP exam countdown:
  - `/ap` shows days until the saved exam date and calm milestone steps.
- F122 FRQ scaffold:
  - `fallbackApScaffold` produces structured outlines for DBQ, synthesis, literary analysis, science, math, statistics, CS, language, art history, and social-science formats.
- F123 MCQ practice:
  - `parseApScaffold` accepts MCQ output only when every choice includes an explanation.
- F124 score predictor:
  - `scoreBand(34, 50)` returns "You're in the 3-4 range based on this practice set."
- F125 study plan:
  - `apMilestonePlan` changes based on time until exam.
- F126 format alignment:
  - `AP_SUBJECTS` covers US History, World History, English Language, English Literature, Biology, Chemistry, Physics, Calculus AB/BC, Statistics, Computer Science A/CSP, Spanish, French, Art History, Psychology, Micro/Macro Economics, and Government.

## Verification

- `npx vitest run lib/ap/command.test.ts`: pass, 1 file / 6 tests
- `npm run typecheck`: pass
- `npm run test:run`: pass, 52 files / 373 tests
- `npm run tone-audit`: pass, 0 blocking violations, 1 existing README warning
- `git diff --check`: pass, only line-ending warnings
- `npx supabase db push --linked --yes`: pass, applied `0028_ap_command_center.sql`
- `npx supabase functions deploy ap-scaffold`: pass, function deployed ACTIVE
- `npx supabase migration list --linked`: pass, local and remote both at `0028`
- `npx supabase functions list`: pass, `ap-scaffold` ACTIVE, updated 2026-06-01T21:11:18Z
- `npm run build`: pass

## Notes

- Score prediction is intentionally a band estimate, not a promise.
- MCQ explanations are framed as best-fit / less-supported reasoning in UI copy.
- The AP helper renders on AP class names, AP prompt keywords, and test-prep assignments.
