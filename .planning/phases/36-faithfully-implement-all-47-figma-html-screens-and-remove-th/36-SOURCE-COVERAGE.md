# Phase 36 Source-to-Plan Coverage

## Canonical Screen Matrix

The canonical set is 46 non-dashboard files from the export folder plus the separately attached dashboard. The folder's `dashboard_personalized.html` is intentionally excluded because D-02 gives the attached file precedence.

| # | Canonical source | Route or state | Plan |
|---:|---|---|---:|
| 1 | `ai_history_log.html` | `/settings/ai-history` | 36-18 |
| 2 | `ai_writing_coach.html` | assignment/note writing state | 36-12 |
| 3 | `ap_command_center.html` | `/ap` | 36-11 |
| 4 | `assignment_detail.html` | `/assignments/[id]` | 36-08 |
| 5 | `concept_deep_dive.html` | `/concepts/[id]` | 36-15 |
| 6 | `C:\Users\glcar\Downloads\dashboard_personalized (1).html` | `/dashboard` | 36-05 |
| 7 | `external_scout_view.html` | `/share/[token]` portfolio state | 36-17 |
| 8 | `flashcards_review.html` | `/flashcards/[id]/review` | 36-13 |
| 9 | `focus_session_immersive.html` | `/timer` | 36-14 |
| 10 | `global_leaderboard.html` | `/study-groups?view=community` | 36-20 |
| 11 | `inbox_triage.html` | `/inbox`, `/inbox/[id]` | 36-09 |
| 12 | `knowledge_graph.html` | `/knowledge-graph` | 36-15 |
| 13 | `library_empty_state.html` | `/classes` empty state | 36-10 |
| 14 | `lms_sync_center.html` | `/settings#connections` | 36-18 |
| 15 | `mastery_tracker.html` | `/grades`, class mastery state | 36-11 |
| 16 | `mastery_transcript_view.html` | `/grades/transcript` | 36-11 |
| 17 | `milestone_celebration.html` | `/proof?celebrate=latest` | 36-16 |
| 18 | `mission_board.html` | `/assignments` | 36-09 |
| 19 | `notes_surface.html` | `/notes/[id]` | 36-12 |
| 20 | `notification_center.html` | `/notifications` | 36-19 |
| 21 | `onboarding_welcome.html` | `/onboarding`, welcome | 36-07 |
| 22 | `onboarding_educational.html` | `/onboarding`, education | 36-07 |
| 23 | `onboarding_quiz_challenge.html` | `/onboarding`, challenge 1/4 | 36-07 |
| 24 | `onboarding_quiz_schedule.html` | `/onboarding`, schedule 2/4 | 36-07 |
| 25 | `paywall_social_proof.html` | `/upgrade?view=community` | 36-21 |
| 26 | `paywall_standard.html` | `/upgrade` | 36-21 |
| 27 | `portfolio_gallery.html` | `/portfolio` | 36-16 |
| 28 | `practice_test_session.html` | `/study-artifacts/[id]` practice state | 36-13 |
| 29 | `privacy_export_hub.html` | `/export` | 36-16 |
| 30 | `progress_insights.html` | `/insights` | 36-15 |
| 31 | `quick_add.html` | `/quick-add` | 36-09 |
| 32 | `review_submit_checkpoint.html` | `/assignments/[id]/submit` | 36-08 |
| 33 | `rubric_scout.html` | `/classes/[id]` rubric state | 36-10 |
| 34 | `scout_share_view.html` | `/share/[token]` report state | 36-17 |
| 35 | `settings_profile_center.html` | `/settings`, `/me` | 36-18 |
| 36 | `smart_loading.html` | shared `loading.tsx` state | 36-25 |
| 37 | `smart_search.html` | `/search` | 36-19 |
| 38 | `study_artifacts_hub.html` | `/study-artifacts` | 36-13 |
| 39 | `study_calendar.html` | `/calendar` | 36-14 |
| 40 | `study_goal_wizard.html` | `/settings/goals` | 36-14 |
| 41 | `study_room_social.html` | `/study-groups` | 36-20 |
| 42 | `subject_library.html` | `/classes` populated state | 36-10 |
| 43 | `task_breakdown_modal.html` | `/break-down`, assignment overlay | 36-08 |
| 44 | `tutor_chat.html` | `/study-buddy` | 36-12 |
| 45 | `tutor_gallery.html` | `/settings/tutor`, gallery | 36-20 |
| 46 | `tutor_personalization.html` | `/settings/tutor`, personalization | 36-20 |
| 47 | `wellness_recovery_log.html` | `/wellness` | 36-19 |

## Multi-Source Coverage Audit

| Source | ID | Requirement or constraint | Plans | Status |
|---|---|---|---|---|
| GOAL | Phase 36 | All canonical states replace the old presentation and remain operational | 36-01 through 36-30 | COVERED |
| REQ | P36-FIDELITY | Exact 47-screen visual composition and dashboard precedence | 36-01, 36-03 through 36-05, 36-07 through 36-21 | COVERED |
| REQ | P36-ASSETS | 24 ScreenDesign resources and four avatars are local | 36-02, 36-04, 36-23, 36-28 | COVERED |
| REQ | P36-OPERATIONS | Real loaders, actions, safety logic, route navigation, and action evidence | 36-01, 36-05 through 36-22, 36-25 through 36-27, 36-30 | COVERED |
| REQ | P36-ONBOARDING | Four locked screens and durable answers | 36-06, 36-07, 36-26 | COVERED |
| REQ | P36-QA | 393x852 goldens, primary actions, responsive and calm gates | 36-03, 36-05, 36-07 through 36-30 | COVERED |
| REQ | P36-REMOVAL | Remove obsolete visual code and prove launch readiness | 36-05, 36-23, 36-24, 36-29, 36-30 | COVERED |
| CONTEXT | D-01 | Export folder is visual source | 36-01 through 36-04, 36-07 through 36-21 | COVERED |
| CONTEXT | D-02 | Attached dashboard wins | 36-01, 36-05 | COVERED |
| CONTEXT | D-03 | Stadium Lobby, next move, attention stack, five nav | 36-05 | COVERED |
| CONTEXT | D-04 | Welcome, educational, challenge, schedule in order | 36-06, 36-07 | COVERED |
| CONTEXT | D-05 | Prohibited old presentation absent | 36-05, 36-23, 36-24 | COVERED |
| CONTEXT | D-06 | Full composition replacement, not a reskin | 36-04 through 36-21 | COVERED |
| CONTEXT | D-07 | Existing real product data feeds screens | 36-05 through 36-22 | COVERED |
| CONTEXT | D-08 | CTAs and navigation are operational | 36-05, 36-07 through 36-22 | COVERED |
| CONTEXT | D-09 | Design-host media copied locally | 36-02, 36-04, 36-23, 36-28 | COVERED |
| CONTEXT | D-10 | 393x852 first, safe larger layouts second | 36-03 through 36-05, 36-07 through 36-25, 36-28 | COVERED |
| CONTEXT | D-11 | Calm, done/submitted, and AI policy invariants remain | 36-03, 36-05 through 36-25, 36-27 | COVERED |
| CONTEXT | D-12 | Visual comparison and primary action required per screen | 36-03, 36-05, 36-07 through 36-25, 36-27 through 36-30 | COVERED |
| RESEARCH | Assets | Ordinary GET, checksums, dimensions, no export scripts | 36-02, 36-04, 36-28 | COVERED |
| RESEARCH | Architecture | Preserve Server Components, SSR auth, RLS, service-role boundaries | 36-05 through 36-22 | COVERED |
| RESEARCH | Public sharing | Exact token, expiry, revocation, owner-derived scope | 36-17 | COVERED |
| RESEARCH | Billing | Checkout only when configured | 36-21 | COVERED |
| RESEARCH | Validation | Manifest, adapters, typed fixtures, normalized sources, goldens, navigation, responsive, a11y, launch gates | 36-01, 36-03, 36-22 through 36-30 | COVERED |
| RESEARCH | Removal | Preserve stored data, clear stale bundles, verify deployed SHA | 36-23, 36-24 | COVERED |
| RESEARCH | Onboarding resolution | Dedicated nullable fields; optional legacy intake remains in Settings | 36-06, 36-07, 36-18, 36-26 | COVERED |
| RESEARCH | Honest state resolution | Empty/unavailable states replace fabricated product success | 36-05, 36-07 through 36-21, 36-25, 36-27 | COVERED |
| RESEARCH | Fixture resolution | Deterministic copy, typed per-screen records, and owner isolation | 36-03, 36-27 | COVERED |
| RESEARCH | Baseline resolution | Explicit tolerance/mask metadata and reviewed source/app/diff rows | 36-03, 36-24, 36-29, 36-30 | COVERED |
| RESEARCH | Source normalization | Strip export scripts, rewrite all 28 media references, repair dashboard CSS, zero remote requests | 36-03, 36-28 | COVERED |
| RESEARCH | Live schema | Linked migration apply, live column/constraint verification, owner-scoped persistence | 36-26 | COVERED |
| RESEARCH | Gallery production | Clean output, exactly 47 normalized source/app/diff/action artifacts, baseline metadata, hashes, run id, release SHA, and index | 36-03, 36-30 | COVERED |
| RESEARCH | Gallery independent validation | The actual producer output is accepted by a later plan and consumed unchanged by the release gate | 36-29, 36-24 | COVERED |
| RESEARCH | Release identity | Exactly 47 complete review rows and local/inspection/served SHA equality | 36-24, 36-30 | COVERED |

Deferred ideas in 36-CONTEXT.md are intentionally excluded from implementation plans.
