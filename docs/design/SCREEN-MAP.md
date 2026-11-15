# ScreenDesign production map

This map is the human-readable mirror of `SCREEN_DESIGN_SCREENS` in `lib/screendesign/screens.ts`. Its 25 rows are ordered identically to the registry and use the same stable id, canonical source, route/state owner, and primary action contract.

## Source precedence

The canonical set is exactly 25 states: 24 non-dashboard HTML files from `C:\Users\glcar\Downloads\ai-tutor-app-html-2026-07-14-15-18`, plus `C:\Users\glcar\Downloads\dashboard_personalized (1).html` as source 3. The retired `inbox_triage.html` export and the export folder's conflicting `dashboard_personalized.html` are excluded. Neither may own a canonical ScreenDesign state or be counted as an additional screen.

Every source targets a 393 by 852 mobile viewport. The exports are untrusted design inputs: production code may read their metadata, but must not import, execute, inject, or remotely host their HTML.

| # | Registry id | Canonical source | Production route/state | Primary action and real data owner |
|---:|---|---|---|---|
| 1 | `ai-writing-coach` | `ai_writing_coach.html` | `/assignments/[id]`, `writing-coach`; also `/notes/[id]` | Request writing guidance through the effective AI policy and append authorship evidence. |
| 2 | `assignment-detail` | `assignment_detail.html` | `/assignments/[id]`, `detail` | Start or resume the assignment through its lifecycle and `assignment_time_log`. |
| 3 | `dashboard-personalized` | `C:\Users\glcar\Downloads\dashboard_personalized (1).html` | `/dashboard` | Open the first real ranked assignment using profile, assignment, signal, class, and time-log data. |
| 4 | `external-scout-view` | `external_scout_view.html` | `/share/[token]`, `portfolio` | Open only portfolio evidence included by the exact, unexpired, unrevoked share token. |
| 5 | `library-empty-state` | `library_empty_state.html` | `/classes`, `empty` | Open the supported class creation flow only when the classes result is empty. |
| 6 | `lms-sync-center` | `lms_sync_center.html` | `/settings`, `connections` | Begin a supported `lms_connections` provider flow or real sync action. |
| 7 | `milestone-celebration` | `milestone_celebration.html` | `/proof`, `celebrate=latest` | Dismiss the real latest-proof celebration and return to the proof gallery. |
| 8 | `mission-board` | `mission_board.html` | `/assignments` | Open an owner-scoped ranked assignment and retain lifecycle actions. |
| 9 | `notes-surface` | `notes_surface.html` | `/notes/[id]` | Persist the owner-scoped note and connect its tags, flashcards, and artifacts. |
| 10 | `onboarding-welcome` | `onboarding_welcome.html` | `/onboarding`, `welcome` | Advance the authenticated profile gate to the educational state. |
| 11 | `onboarding-educational` | `onboarding_educational.html` | `/onboarding`, `education` | Continue to challenge selection without prematurely completing onboarding. |
| 12 | `onboarding-quiz-challenge` | `onboarding_quiz_challenge.html` | `/onboarding`, `challenge=1/4` | Validate and persist the dedicated `profiles.learning_hurdle` selection. |
| 13 | `onboarding-quiz-schedule` | `onboarding_quiz_schedule.html` | `/onboarding`, `schedule=2/4` | Validate and persist `profiles.study_schedule_preference`, then complete the locked flow. |
| 14 | `practice-test-session` | `practice_test_session.html` | `/study-artifacts/[id]`, `practice` | Persist a practice response without inventing an unsupported score. |
| 15 | `quick-add` | `quick_add.html` | `/quick-add` | Validate and insert a real `inbox_items` capture. |
| 16 | `review-submit-checkpoint` | `review_submit_checkpoint.html` | `/assignments/[id]/submit` | Require student confirmation before the explicit `done` to `submitted` transition. |
| 17 | `rubric-scout` | `rubric_scout.html` | `/classes/[id]`, `rubric` | Open the owning class or assignment from its real rubric data. |
| 18 | `scout-share-view` | `scout_share_view.html` | `/share/[token]`, `report` | Open only report fields authorized by the exact, unexpired, unrevoked share token. |
| 19 | `settings-profile-center` | `settings_profile_center.html` | `/settings`, `profile`; also `/me` | Validate and persist owner-scoped profile, accessibility, privacy, and personalization values. |
| 20 | `smart-loading` | `smart_loading.html` | `/(app)`, shared `loading.tsx` | Resolve from the owning route's real request without a fabricated delay. |
| 21 | `smart-search` | `smart_search.html` | `/search` | Query RLS-scoped notes, assignments, classes, and concepts and route every result. |
| 22 | `study-artifacts-hub` | `study_artifacts_hub.html` | `/study-artifacts` | Use the existing AI-policy-gated artifact generation and authorship action. |
| 23 | `study-calendar` | `study_calendar.html` | `/calendar` | Open a real assignment from its accommodation-aware calendar item. |
| 24 | `subject-library` | `subject_library.html` | `/classes`, `populated` | Open an owner-scoped class with its real work and study progress. |
| 25 | `wellness-recovery-log` | `wellness_recovery_log.html` | `/wellness` | Validate and persist private owner-scoped wellness, goal, or sleep state. |

## Security substitutions

The visual references do not override Diana's trust boundaries:

1. `external-scout-view` and `scout-share-view` use exact token lookup, expiry, revocation, and owner-derived scope. They never expose a general student profile or accept an owner id from the viewer.
2. AI actions remain authenticated Supabase Edge Function flows with server-side traffic-light, budget, safety, interaction, and authorship enforcement.
3. `review-submit-checkpoint` preserves the explicit distinction between work marked `done` and a student-confirmed `submitted` transition.

## Completion rule

A row is not complete merely because its route renders. Completion requires both of the following evidence under D-12:

1. A reviewed visual comparison against its canonical source at 393 by 852, followed by responsive-safety checks at larger viewports.
2. A passing primary-action check proving the navigation, selection, mutation, search, system state, or submission contract in this map works against its real owner.

Every internal destination must be a real App Router route or supported state. Export links are reference behavior only, and no card or primary action may remain a dead prototype interaction.
