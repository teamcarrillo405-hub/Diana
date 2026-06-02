# Phase 31 Summary - Platform Intelligence + Analytics

## Status

COMPLETE on 2026-06-01.

## Delivered

- Added migration `0031_platform_intelligence_analytics.sql`:
  - `feature_flags`
  - `analytics_events`
  - `error_events`
  - `performance_events`
  - `experiments`
  - owner RLS, indexes, rollout constraints, and protected-surface experiment guard.
- Added typed platform helpers in `lib/platform/analytics.ts`:
  - daily AI cost grouping
  - feature usage/session aggregation
  - assignment completion rate
  - anonymized diagnosis tags
  - Core Web Vital budget checks
  - UI experiment surface guard.
- Replaced `/insights` stub with a live dashboard:
  - AI token totals by feature for today
  - 7-day feature usage and route session data
  - assignment completion rate
  - active flag/experiment counts
  - app monitor reports
  - web vital budget alerts
  - rollout controls for feature flags and UI experiments.
- Added authenticated monitoring routes:
  - `/api/monitoring/event`
  - `/api/monitoring/error`
  - `/api/monitoring/vitals`
- Added authenticated layout telemetry:
  - page views
  - route duration
  - Core Web Vitals.
- Added Insights to app navigation and marked F17 live in `lib/features.ts`.

## Acceptance Evidence

- Admin can see daily AI cost breakdown by feature:
  - `/insights` reads `ai_interactions` and renders token totals grouped by feature for the current day.
- Feature flags can be toggled without deploy:
  - `upsertFeatureFlag` writes `feature_flags` with owner-scoped `enabled`, `rollout_pct`, and `audience`.
- Error monitoring tags by anonymized diagnosis category:
  - `/api/monitoring/error` reads `profiles.diagnoses`, maps to categories via `anonymizedDiagnosisTags`, and stores only category tags.
- UI experiments only:
  - `upsertExperiment`, helper tests, and DB check constraints reject protected surfaces.

## Verification

- `npx vitest run lib/platform/analytics.test.ts`: 1 file / 6 tests passed.
- `npm run typecheck`: passed.
- `npx supabase db push --linked --yes`: applied `0031_platform_intelligence_analytics.sql`.
- `npx supabase migration list --linked`: local and remote both through `0031`.
- `npm run test:run`: passed after Windows `spawn EPERM` rerun, 56 files / 392 tests.
- `npm run tone-audit`: passed with existing README `deadline` warning only.
- `npm run build`: passed.
- `git diff --check`: passed with CRLF warnings only.
- Local route smoke:
  - dev server ready at `http://127.0.0.1:3000`
  - unauthenticated `/insights` returns expected `307` redirect to `/login?next=%2Finsights`.

## Notes

- Phase 31 uses a local Sentry-compatible monitoring sink instead of adding a new external SDK dependency.
- Telemetry is authenticated and owner-scoped; unauthenticated monitoring writes are rejected.
