# ScreenDesign production map

This is the implementation and verification contract for the 47 ScreenDesign exports. A screen can be a route, a responsive state, a modal, or a post-action state. The visual source is the matching HTML file in `C:\Users\glcar\Downloads\ai-tutor-app-html-2026-07-14-15-18`. Production code must preserve Diana's calm-language, accessibility, authorship, privacy, and server-side AI rules even when the visual reference does not.

| # | ScreenDesign source | Production destination | Real data or action contract |
|---:|---|---|---|
| 1 | `ai_history_log.html` | `/settings/ai-history` | `ai_interactions`, `authorship_log`, delete-history action |
| 2 | `ai_writing_coach.html` | assignment and note writing surfaces | `writing-aid` Edge Function, citations, authorship logging |
| 3 | `ap_command_center.html` | `/ap` | `ap_exam_plans`, `ap_practice_attempts`, AP actions |
| 4 | `assignment_detail.html` | `/assignments/[id]` | assignment, checklist, timer, AI policy, state machine |
| 5 | `concept_deep_dive.html` | `/concepts/[id]` | `mastery_concepts`, `mastery_events`, class sources |
| 6 | `dashboard_personalized.html` | `/dashboard` | ranked assignments, classes, focus logs, reminders |
| 7 | `external_scout_view.html` | `/share/[token]` portfolio state | scoped share link and RLS-safe student evidence |
| 8 | `flashcards_review.html` | `/flashcards/[id]/review` | FSRS review action, mastery event |
| 9 | `focus_session_immersive.html` | `/timer` | `assignment_time_log`, timer state machine |
| 10 | `global_leaderboard.html` | `/study-groups?view=community` | opt-in group activity only, no public minor ranking |
| 11 | `inbox_triage.html` | `/inbox` and `/inbox/[id]` | `inbox_items`, classify-inbox Edge Function, confirmation action |
| 12 | `knowledge_graph.html` | `/knowledge-graph` | `mastery_concepts` grouped by class |
| 13 | `library_empty_state.html` | `/classes` empty state | classes insert action |
| 14 | `lms_sync_center.html` | `/settings#connections` | `lms_connections`, OAuth, and sync routes |
| 15 | `mastery_tracker.html` | `/grades` and `/classes/[id]` mastery state | Canvas grade reads, `mastery_concepts` |
| 16 | `mastery_transcript_view.html` | `/grades/transcript` | Canvas course and submission reads |
| 17 | `milestone_celebration.html` | `/proof?celebrate=latest` | completed work and authorship evidence |
| 18 | `mission_board.html` | `/assignments` | ranked assignment board and assignment lifecycle actions |
| 19 | `notes_surface.html` | `/notes/[id]` | notes, tags, flashcards, study artifacts |
| 20 | `notification_center.html` | `/notifications` | due-work and LMS connection events, calm labels |
| 21 | `onboarding_educational.html` | `/onboarding` educational state | profile onboarding action |
| 22 | `onboarding_quiz_challenge.html` | `/onboarding` support-needs state | profile diagnoses/support preferences |
| 23 | `onboarding_quiz_schedule.html` | `/onboarding` schedule state | profile timezone and availability |
| 24 | `onboarding_welcome.html` | `/onboarding` welcome state | authenticated profile gate |
| 25 | `paywall_social_proof.html` | `/upgrade?view=community` | subscription capability gate, no fake checkout |
| 26 | `paywall_standard.html` | `/upgrade` | subscription capability gate, no fake checkout |
| 27 | `portfolio_gallery.html` | `/portfolio` | `portfolios`, `portfolio_items`, Canva connection |
| 28 | `practice_test_session.html` | `/study-artifacts/[id]` practice-test state | `study_artifacts.payload`, practice responses |
| 29 | `privacy_export_hub.html` | `/export` | export action and deletion request |
| 30 | `progress_insights.html` | `/insights` | assignments, time logs, analytics events |
| 31 | `quick_add.html` | `/quick-add` | capture action to `inbox_items` |
| 32 | `review_submit_checkpoint.html` | `/assignments/[id]/submit` | submission checklist and explicit submit transition |
| 33 | `rubric_scout.html` | `/classes/[id]` rubric state | `rubrics`, syllabus and rubric actions |
| 34 | `scout_share_view.html` | `/share/[token]` report state | token-scoped parent or teacher report |
| 35 | `settings_profile_center.html` | `/settings` and `/me` | profile, accessibility, theme, LMS, privacy actions |
| 36 | `smart_loading.html` | route `loading.tsx` states | Suspense and real request state |
| 37 | `smart_search.html` | `/search` | RLS-scoped notes, assignments, classes, concepts |
| 38 | `study_artifacts_hub.html` | `/study-artifacts` | `study_artifacts`, generation Edge Function |
| 39 | `study_calendar.html` | `/calendar` | assignments and accommodation-aware time |
| 40 | `study_goal_wizard.html` | `/settings/goals` | student-owned study goals |
| 41 | `study_room_social.html` | `/study-groups` | groups, members, sessions, shared decks and notes |
| 42 | `subject_library.html` | `/classes` | classes, open work, study progress |
| 43 | `task_breakdown_modal.html` | `/break-down` | task-breakdown Edge Function and assignment steps |
| 44 | `tutor_chat.html` | `/study-buddy` | authenticated study-buddy API and AI policy |
| 45 | `tutor_gallery.html` | `/settings/tutor` gallery state | tutor presentation preferences stored on the student profile |
| 46 | `tutor_personalization.html` | `/settings/tutor` teaching-style state | profile learning preferences stored on the student profile |
| 47 | `wellness_recovery_log.html` | `/wellness` | sleep logs, wellness activity and goals |

## Connection rules

1. Today, Work, Classes, Calendar, and More are the only primary destinations.
2. Every internal action returns to a real route in this table. No card is a dead prototype link.
3. AI work stays in authenticated Supabase Edge Functions and records interaction and authorship evidence.
4. Public share screens only read through scoped share tokens. They never expose a general student profile.
5. The global-ranking reference is implemented as opt-in study-group activity because public ranking of minors conflicts with Diana's privacy and calm-product rules.
6. Subscription screens may only expose checkout after a real billing provider and webhook contract are configured. Until then they render a truthful capability state, not a fake purchase flow.
