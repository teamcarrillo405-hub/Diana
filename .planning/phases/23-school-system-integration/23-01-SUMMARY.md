---
phase: 23-school-system-integration
plan: "01"
completed: "2026-06-01"
requirements_completed: [F96, F97, F98, F99, F100, F101, F102]
---

# Phase 23 Plan 01 Summary

Phase 23 is implemented and the database migration is applied to the linked Supabase project.

## What Changed

- Added migration `0024_school_system_integration.sql`:
  - `assignments.external_url`
  - `assignments.rubric_text`
  - `assignments.submission_synced_at`
  - `assignments.submission_sync_status`
  - Clever provider support in LMS constraints.
  - `iep_imports` audit table with owner RLS.
- Added Canvas OAuth routes:
  - `/api/lms/canvas-oauth/start`
  - `/api/lms/canvas-oauth/callback`
  - Callback saves the Canvas connection and attempts immediate assignment sync.
- Extended Canvas import:
  - Original assignment URL.
  - Rubric text normalization.
- Extended Google Classroom import:
  - Original assignment links.
  - Course announcements captured into `inbox_items`.
- Added background sync:
  - `/api/lms/sync-all`
  - Settings auto-runs it when non-Clever connections are missing a sync or older than six hours.
- Added IEP / 504 import:
  - `lib/iep/import.ts` extracts extra-time percentage and accommodation signals.
  - Settings panel uploads/pastes readable document text and applies profile preferences.
  - `iep_imports` records the extracted summary.
- Added external submission handoff:
  - Canvas/Classroom assignments show provider open/mark controls on assignment detail and submit checklist pages.
  - Diana records `opened_external`, `marked_submitted`, or `not_supported`.
- Added Diana due-date calendar export:
  - `/api/calendar.ics`
  - `lib/lms/export-ics.ts`
  - Settings link for export.

## Acceptance Evidence

- F96 Canvas OAuth:
  - OAuth start/callback routes are built and production build lists both dynamic routes.
  - Canvas import normalizes assignment URL and rubric text, covered by `lib/lms/canvas.test.ts`.
  - Runtime requires `CANVAS_CLIENT_ID` and `CANVAS_CLIENT_SECRET`.
- F97 Google Classroom:
  - Classroom sync imports coursework due dates and original links.
  - Announcements are captured as inbox text items.
  - Runtime still depends on Supabase Google `provider_token` with Classroom scopes.
- F98 Clever:
  - Clever provider is accepted in DB constraints and saved as a district provisioning marker.
  - Full Clever API SSO remains district-provisioned work outside this app-only phase.
- F99 IEP / 504 import:
  - Parser extracts time-and-a-half / 50%, TTS/read-aloud, quiet setting, reading disability, large print, and spacing signals.
  - Settings import applies profile accommodations and stores an audit row.
  - Uploaded PDFs must expose readable text through the browser or be pasted; scanned-PDF OCR is not added here.
- F100 Assignment auto-sync:
  - Settings runs `/api/lms/sync-all` for stale Canvas, Google Classroom, and ICS connections.
  - This is app-triggered background sync, not cron or service-worker sync.
- F101 Submission sync:
  - Canvas/Classroom imported assignments have an explicit provider handoff panel.
  - Diana records the handoff status without pretending to push files through provider APIs.
- F102 Calendar sync:
  - `/api/calendar.ics` exports due assignments as VEVENT rows for calendar clients.

## Verification

- `npx vitest run lib/lms/canvas.test.ts lib/lms/ics.test.ts lib/lms/export-ics.test.ts lib/iep/import.test.ts`: pass, 4 files / 17 tests
- `npm run typecheck`: pass
- `npm run test:run`: pass, 47 files / 345 tests
- `npm run tone-audit`: pass, 0 blocking violations, 1 existing README warning
- `git diff --check`: pass, only line-ending warnings
- `npx supabase db push --linked --yes`: pass, applied `0024_school_system_integration.sql`
- `npx supabase migration list --linked`: pass, local and remote both at `0024`
- `npm run build`: pass

## Notes

- No new Edge Function deploy was needed for Phase 23.
- Canvas OAuth import speed depends on the school Canvas instance and course count.
- Classroom OAuth is still tied to Google sign-in scope provisioning.
- The IEP parser is deterministic and conservative; human review of applied accommodations remains appropriate.
