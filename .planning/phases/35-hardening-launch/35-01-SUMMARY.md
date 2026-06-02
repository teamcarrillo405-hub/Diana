# Phase 35 Summary - v2.0 Hardening + Launch

## Status

COMPLETE on 2026-06-02.

## Delivered

- Added migration `0034_launch_hardening_retention.sql` with `data_retention_runs` and service-role RPC `purge_due_deletion_requests`.
- Added launch readiness helpers in `lib/launch/readiness.ts` and tests in `lib/launch/readiness.test.ts`.
- Added `scripts/launch-audit.ts` and `npm run launch-audit`.
- Added launch documentation:
  - `docs/launch/LAUNCH_READINESS.md`
  - `docs/launch/SECURITY_AND_RETENTION.md`
  - `docs/launch/MOBILE_AND_BETA_MATRIX.md`
- Updated Supabase types for retention run records and purge RPC.

## Verification

- `npx vitest run lib/launch/readiness.test.ts`: 1 file / 4 tests passed.
- `npm run typecheck`: passed.
- `npx supabase db push --linked --yes`: applied `0034_launch_hardening_retention.sql`.
- `npm run launch-audit`: passed after Windows `spawn EPERM` rerun; critical-path coverage 100%, launch docs present, performance budgets ready.
- `npx supabase migration list --linked`: local and remote both show `0034`.
- `npm run test:run`: passed after Windows `spawn EPERM` rerun, 60 files / 411 tests.
- `npm run tone-audit`: passed with existing README `deadline` warning only.
- `npm run build`: passed.
- `git diff --check`: passed with CRLF warnings only.

## Notes

- `purge_due_deletion_requests` is intentionally granted to `service_role`, not browser-authenticated users.
- Manual beta, screen-reader, mobile-device, and load-test execution remain operational launch activities, but their matrix, exit criteria, and required evidence are now committed and launch-gated.
