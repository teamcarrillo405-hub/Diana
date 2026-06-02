---
phase: 26-pe-health-wellness-engine
plan: "01"
completed: "2026-06-01"
requirements_completed: [F116, F117, F118, F119, F120]
---

# Phase 26 Plan 01 Summary

Phase 26 is implemented, the database migration is applied to the linked Supabase project, and `health-scaffold` is deployed.

## What Changed

- Added migration `0027_health_wellness_engine.sql`:
  - `wellness_activity_logs` table.
  - `wellness_goals` table.
  - `sleep_logs` table.
  - Owner RLS policies and indexes.
  - `task_signals.kind` constraint extension for Phase24 and Phase26 signals.
- Added `/wellness`:
  - Activity log.
  - Personal goal form.
  - Sleep + recovery log.
  - CPR / first aid card creation.
  - Recent activity, goals, and sleep notes.
- Added deterministic wellness helpers:
  - Sleep-to-energy adjustment.
  - Goal text guard.
  - CPR / first aid starter cards.
  - Health scaffold fallback and parser.
- Added dashboard sleep recovery link:
  - Latest sleep log can lower the default task energy to `low`.
  - Student-selected energy still wins.
- Added Health Helper to assignment detail:
  - Health questions.
  - Movement goals.
  - CPR / first aid.
  - Sleep + recovery.
- Added `health-scaffold` Edge Function:
  - Claude Haiku 4.5.
  - Minor safety, calm tone, token budget, logging.
  - Health class safety constraints for factual, age-appropriate support.

## Acceptance Evidence

- F116 activity log:
  - `/wellness` writes `activity_type`, `duration_minutes`, `felt`, and optional notes.
  - No body weight, BMI, or calorie columns were added.
- F117 personal goal setting:
  - Goal categories are skill, endurance, strength, flexibility, consistency, and recovery.
  - `goalTextIsAllowed` rejects appearance/body-metric goal wording.
- F118 health class scaffold:
  - `health-scaffold` requires calm, factual, age-appropriate support and redirects urgent/personal health needs to in-person support.
  - `HealthHelper` renders on health/PE assignment routes.
- F119 CPR / first aid:
  - `/wellness` can add a starter CPR / first aid card set to the existing FSRS `flashcards` table.
- F120 sleep + recovery:
  - `sleep_logs` stores sleep quality and optional hours.
  - Dashboard uses `sleepRecoveryAdjustment` to favor smaller tasks the next day after rough/short sleep.

## Verification

- `npx vitest run lib/wellness/health.test.ts`: pass, 1 file / 7 tests
- `npm run typecheck`: pass
- `npm run test:run`: pass, 51 files / 367 tests
- `npm run tone-audit`: pass, 0 blocking violations, 1 existing README warning
- `git diff --check`: pass, only line-ending warnings
- `npx supabase db push --linked --yes`: pass, applied `0027_health_wellness_engine.sql`
- `npx supabase functions deploy health-scaffold`: pass, function deployed ACTIVE
- `npx supabase migration list --linked`: pass, local and remote both at `0027`
- `npx supabase functions list`: pass, `health-scaffold` ACTIVE, updated 2026-06-01T21:01:09Z
- `npm run build`: pass

## Notes

- Sleep adjustment is a default-energy hint, not a forced mode.
- CPR / first aid cards are study prompts and defer to certified course protocols.
- The Phase26 migration also fixes the task signal check constraint for Phase24's `mood_checkin` and `overwhelmed` rows.
