# ScreenDesign production map

This map is the human-readable mirror of `SCREEN_DESIGN_SCREENS` in `lib/screendesign/screens.ts`. Its 47 rows are ordered identically to the registry and use the same stable id, canonical source, route/state owner, and primary action contract.

## Source precedence

The canonical set is exactly 47 states: 46 non-dashboard HTML files from `C:\Users\glcar\Downloads\ai-tutor-app-html-2026-07-14-15-18`, plus `C:\Users\glcar\Downloads\dashboard_personalized (1).html` as source 6. The export folder's conflicting `dashboard_personalized.html` is excluded. It must never own `/dashboard` or be counted as an additional screen.

Every source targets a 393 by 852 mobile viewport. The exports are untrusted design inputs: production code may read their metadata, but must not import, execute, inject, or remotely host their HTML.

| # | Registry id | Canonical source | Production route/state | Primary action and real data owner |
|---:|---|---|---|---|
| 1 | `ai-history-log` | `ai_history_log.html` | `/settings/ai-history` | Review a selected `ai_interactions` or `authorship_log` record. |
| 2 | `ai-writing-coach` | `ai_writing_coach.html` | `/assignments/[id]`, `writing-coach`; also `/notes/[id]` | Request writing guidance through the effective AI policy and append authorship evidence. |
| 3 | `ap-command-center` | `ap_command_center.html` | `/ap` | Open a real `ap_exam_plans` or `ap_practice_attempts` action. |
| 4 | `assignment-detail` | `assignment_detail.html` | `/assignments/[id]`, `detail` | Start or resume the assignment through its lifecycle and `assignment_time_log`. |
| 5 | `concept-deep-dive` | `concept_deep_dive.html` | `/concepts/[id]` | Start practice from owner-scoped `mastery_concepts` and `mastery_events`. |
| 6 | `dashboard-personalized` | `C:\Users\glcar\Downloads\dashboard_personalized (1).html` | `/dashboard` | Open the first real ranked assignment using profile, assignment, signal, class, and time-log data. |
| 7 | `external-scout-view` | `external_scout_view.html` | `/share/[token]`, `portfolio` | Open only portfolio evidence included by the exact, unexpired, unrevoked share token. |
| 8 | `flashcards-review` | `flashcards_review.html` | `/flashcards/[id]/review` | Persist an FSRS rating and advance through due `flashcards`. |
| 9 | `focus-session-immersive` | `focus_session_immersive.html` | `/timer` | Start the existing timer state machine and `assignment_time_log` session. |
| 10 | `global-leaderboard` | `global_leaderboard.html` | `/study-groups`, `view=community` | Open membership-scoped activity inside an opted-in study group. |
| 11 | `inbox-triage` | `inbox_triage.html` | `/inbox` | Classify or confirm a real `inbox_items` record. |
| 12 | `knowledge-graph` | `knowledge_graph.html` | `/knowledge-graph` | Navigate from a real `mastery_concepts` node to concept detail. |
| 13 | `library-empty-state` | `library_empty_state.html` | `/classes`, `empty` | Open the supported class creation flow only when the classes result is empty. |
| 14 | `lms-sync-center` | `lms_sync_center.html` | `/settings`, `connections` | Begin a supported `lms_connections` provider flow or real sync action. |
| 15 | `mastery-tracker` | `mastery_tracker.html` | `/grades` | Open class or concept detail derived from mastery and Canvas grade reads. |
| 16 | `mastery-transcript-view` | `mastery_transcript_view.html` | `/grades/transcript` | Use the supported owner-scoped transcript export or share flow. |
| 17 | `milestone-celebration` | `milestone_celebration.html` | `/proof`, `celebrate=latest` | Dismiss the real latest-proof celebration and return to the proof gallery. |
| 18 | `mission-board` | `mission_board.html` | `/assignments` | Open an owner-scoped ranked assignment and retain lifecycle actions. |
| 19 | `notes-surface` | `notes_surface.html` | `/notes/[id]` | Persist the owner-scoped note and connect its tags, flashcards, and artifacts. |
| 20 | `notification-center` | `notification_center.html` | `/notifications` | Mark a real due-work or LMS event read and follow its supported deep link. |
| 21 | `onboarding-welcome` | `onboarding_welcome.html` | `/onboarding`, `welcome` | Advance the authenticated profile gate to the educational state. |
| 22 | `onboarding-educational` | `onboarding_educational.html` | `/onboarding`, `education` | Continue to challenge selection without prematurely completing onboarding. |
| 23 | `onboarding-quiz-challenge` | `onboarding_quiz_challenge.html` | `/onboarding`, `challenge=1/4` | Validate and persist the dedicated `profiles.learning_hurdle` selection. |
| 24 | `onboarding-quiz-schedule` | `onboarding_quiz_schedule.html` | `/onboarding`, `schedule=2/4` | Validate and persist `profiles.study_schedule_preference`, then complete the locked flow. |
| 25 | `paywall-social-proof` | `paywall_social_proof.html` | `/upgrade`, `view=community` | Open checkout only when a real server-resolved billing capability exists. |
| 26 | `paywall-standard` | `paywall_standard.html` | `/upgrade`, `standard` | Open checkout only when a real server-resolved billing capability exists. |
| 27 | `portfolio-gallery` | `portfolio_gallery.html` | `/portfolio` | Open a real owner-scoped `portfolio_items` artifact or share action. |
| 28 | `practice-test-session` | `practice_test_session.html` | `/study-artifacts/[id]`, `practice` | Persist a practice response without inventing an unsupported score. |
| 29 | `privacy-export-hub` | `privacy_export_hub.html` | `/export` | Run an owner-scoped export or `data_deletion_requests` action. |
| 30 | `progress-insights` | `progress_insights.html` | `/insights` | Explain a trend derived from assignments, time logs, or analytics events. |
| 31 | `quick-add` | `quick_add.html` | `/quick-add` | Validate and insert a real `inbox_items` capture. |
| 32 | `review-submit-checkpoint` | `review_submit_checkpoint.html` | `/assignments/[id]`, `submit` | Require student confirmation before the explicit `done` to `submitted` transition. |
| 33 | `rubric-scout` | `rubric_scout.html` | `/classes/[id]`, `rubric` | Open the owning class or assignment from its real rubric data. |
| 34 | `scout-share-view` | `scout_share_view.html` | `/share/[token]`, `report` | Open only report fields authorized by the exact, unexpired, unrevoked share token. |
| 35 | `settings-profile-center` | `settings_profile_center.html` | `/settings`, `profile`; also `/me` | Validate and persist owner-scoped profile, accessibility, privacy, and personalization values. |
| 36 | `smart-loading` | `smart_loading.html` | `/(app)`, shared `loading.tsx` | Resolve from the owning route's real request without a fabricated delay. |
| 37 | `smart-search` | `smart_search.html` | `/search` | Query RLS-scoped notes, assignments, classes, and concepts and route every result. |
| 38 | `study-artifacts-hub` | `study_artifacts_hub.html` | `/study-artifacts` | Use the existing AI-policy-gated artifact generation and authorship action. |
| 39 | `study-calendar` | `study_calendar.html` | `/calendar` | Open a real assignment from its accommodation-aware calendar item. |
| 40 | `study-goal-wizard` | `study_goal_wizard.html` | `/settings/goals` | Validate and persist a student-owned study goal before showing success. |
| 41 | `study-room-social` | `study_room_social.html` | `/study-groups`, `room` | Join or open an invite-only membership-scoped group and its shared resources. |
| 42 | `subject-library` | `subject_library.html` | `/classes`, `populated` | Open an owner-scoped class with its real work and study progress. |
| 43 | `task-breakdown-modal` | `task_breakdown_modal.html` | `/break-down`, assignment overlay | Generate under the effective AI policy and persist accepted `assignment_steps`. |
| 44 | `tutor-chat` | `tutor_chat.html` | `/study-buddy` | Send through the authenticated backend with AI policy and authorship logging. |
| 45 | `tutor-gallery` | `tutor_gallery.html` | `/settings/tutor`, `gallery` | Persist a supported tutor persona on the student profile. |
| 46 | `tutor-personalization` | `tutor_personalization.html` | `/settings/tutor`, `personalization` | Persist supported tutor style and complexity preferences. |
| 47 | `wellness-recovery-log` | `wellness_recovery_log.html` | `/wellness` | Validate and persist private owner-scoped wellness, goal, or sleep state. |

## Security substitutions

The visual references do not override Diana's trust boundaries:

1. `external-scout-view` and `scout-share-view` use exact token lookup, expiry, revocation, and owner-derived scope. They never expose a general student profile or accept an owner id from the viewer.
2. `paywall-social-proof` and `paywall-standard` render a truthful unavailable state unless the server resolves a real checkout capability. Static export buttons never simulate purchase success or fabricated community proof.
3. `global-leaderboard` is implemented as authenticated, opt-in, membership-scoped study-group activity. Diana does not publish a global ranking of minors.
4. AI actions remain authenticated Supabase Edge Function flows with server-side traffic-light, budget, safety, interaction, and authorship enforcement.
5. `review-submit-checkpoint` preserves the explicit distinction between work marked `done` and a student-confirmed `submitted` transition.

## Completion rule

A row is not complete merely because its route renders. Completion requires both of the following evidence under D-12:

1. A reviewed visual comparison against its canonical source at 393 by 852, followed by responsive-safety checks at larger viewports.
2. A passing primary-action check proving the navigation, selection, mutation, search, system state, or submission contract in this map works against its real owner.

Every internal destination must be a real App Router route or supported state. Export links are reference behavior only, and no card or primary action may remain a dead prototype interaction.
