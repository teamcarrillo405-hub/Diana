# Phase 34 Summary - Social + Collaboration Features

## Status

COMPLETE on 2026-06-02.

## Delivered

- Added migration `0033_social_collaboration.sql` for invite-only study groups, members, shared sessions, shared flashcard decks/cards/installs, collaborative notes, peer explanations, and project tasks.
- Added RLS helper functions `is_study_group_member`, `is_study_group_owner`, invite join RPC `join_study_group`, and shared deck installer RPC `install_shared_deck_for_members`.
- Added `lib/social/collaboration.ts` with invite-code normalization, session latency budget, collaborative-note refresh budget, deck card normalization, neutral status labels, and ranking-copy guard.
- Added `/study-groups` route with create/join room flows, shared Pomodoro sessions, shared decks, collaborative notes, peer explanations, and project tasks.
- Added navigation entry for Groups.
- Updated Supabase types for the new tables and functions.

## Verification

- `npx vitest run lib/social/collaboration.test.ts`: 1 file / 6 tests passed.
- `npm run typecheck`: passed.
- `npx supabase db push --linked --yes`: applied `0033_social_collaboration.sql`.
- `npx supabase migration list --linked`: local and remote both show `0033`.
- `npm run test:run`: passed after Windows `spawn EPERM` rerun, 59 files / 407 tests.
- `npm run tone-audit`: passed with existing README `deadline` warning only.
- `npm run build`: passed; `/study-groups` is included in the route manifest.
- `git diff --check`: passed with CRLF warnings only.
- Local route smoke:
  - `GET /study-groups`: 307 to `/login?next=%2Fstudy-groups`

## Notes

- Shared deck creation calls the database installer so cards become real due `flashcards` rows for every current group member.
- Collaborative notes use optimistic version checks to avoid silent overwrites; the client refreshes every 500 ms while a group note is open.
- Phase 34 intentionally does not add public discovery, leaderboards, rankings, or default sharing.
