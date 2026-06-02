# Phase 33 Summary - Personalization Settings v2

## Status

COMPLETE on 2026-06-02.

## Delivered

- Added migration `0032_personalization_settings_v2.sql` for profile preference JSON, `session_handoffs`, and `data_deletion_requests`.
- Added privacy/export helpers in `lib/privacy/export.ts` for data inventory, notification preference normalization, per-class AI verbosity, PDF export bytes, deletion patching, and category labels.
- Replaced `/export` with a live data and privacy dashboard covering inventory, AI context, JSON/PDF exports, per-class AI style, notification preferences, encrypted profile backup/import, category-level clearing, device handoff, and account deletion request.
- Added server actions for preference saves, data exports, encrypted backup import, category clearing, and AI-disabling deletion requests.
- Added authenticated `/api/profile/handoff` and `SessionHandoffTracker` in the app layout for multi-device route handoff.
- Added Settings entrypoint for data/privacy controls and marked F19 live in `lib/features.ts`.
- Updated Supabase types and profile loading for the new preference fields.

## Verification

- `npx vitest run lib/privacy/export.test.ts`: 1 file / 6 tests passed.
- `npm run typecheck`: passed.
- `npx supabase db push --linked --yes`: applied `0032_personalization_settings_v2.sql`.
- `npx supabase migration list --linked`: local and remote both show `0032`.
- `npm run test:run`: passed after Windows `spawn EPERM` rerun, 58 files / 401 tests.
- `npm run tone-audit`: passed with existing README `deadline` warning only.
- `npm run build`: passed.
- `git diff --check`: passed with CRLF warnings only.
- Local route smoke:
  - `GET /export`: 307 to `/login?next=%2Fexport`
  - `GET /settings`: 307 to `/login?next=%2Fsettings`
  - `POST /api/profile/handoff`: 307 to `/login?next=%2Fapi%2Fprofile%2Fhandoff`

## Notes

- Account deletion is implemented as a student-facing request flow: AI is disabled immediately by profile/class/assignment policy changes, while the 30-day COPPA purge process is represented by `data_deletion_requests`.
- Profile backup encryption is browser-local using PBKDF2 + AES-GCM; the passphrase is never sent to the server.
- Privacy category clearing is intentionally scoped to student-owned Diana data categories and does not delete auth identity directly.
