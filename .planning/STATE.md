---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: The Complete Academic Platform
status: Milestone v2.0 COMPLETE - Phase 35 COMPLETE
stopped_at: "Completed Phase 35: COPPA retention enforcement, launch audit, launch readiness docs, critical-path coverage gate, migration 0034, and final static gates. Milestone v2.0 complete."
last_updated: "2026-06-02T12:47:04.0000000-07:00"
progress:
  total_phases: 35
  completed_phases: 35
  total_plans: 63
  completed_plans: 63
---

# Diana — Project State

**Last updated:** 2026-06-01
**Current branch:** `claude/adhd-app-jxpn9`  
**Active phase:** Phase 35 COMPLETE - v2.0 launch hardening delivered
**Last session:** 2026-06-02T12:47:04.0000000-07:00
**Stopped at:** Completed Phase 35 with final v2.0 verification; milestone v2.0 is complete

---

## What is built (Phase 1 COMPLETE)

- Next.js 15 App Router + TypeScript project scaffold
- Supabase integration (client + server + service role)
- Auth: email/password + Google OAuth, DOB age gate, COPPA consent gating
- PWA shell: `next-pwa`/`serwist`, manifest, offline shell
- F1: Class creation, rubric substrate, class documents (no AI rubric summary yet)
- F2: Assignment state machine (`captured → planned → in_progress → done → submitted → graded`), submission checklist (generic, hardcoded), "done ≠ submitted" enforcement
- F3: "Your next 5 minutes" dashboard — single top task, scoring function (deadline × estimated time × energy × momentum), energy picker (low/ok/high)
- `task_signals` table — signals inserted on state change but scorer does NOT yet read them
- Calm visual language: no red, no exclamations, amber for caution
- Basic RLS on all tables

## Key gaps (from docs/review/slice-1-evidence-review.md)

- **Zero dyslexia accommodation** — no TTS, no font controls, no STT
- No onboarding — diagnoses/accommodations/school year never captured
- `assignments` missing `kind`, `reading_load`, `writing_load`, `last_thought`
- `profiles` missing `diagnoses`, `accommodations`, `school_year`, `font_size`, `line_spacing`, `dyslexia_font`, `reduced_motion`, `high_contrast`, `tts_enabled`, `onboarded_at`
- Time blindness not mitigated — "Due in 3 days" string only, no visual
- Checklist is 6 hardcoded generic items
- No interrupt-recovery breadcrumb
- `task_signals` rows inserted but scorer ignores them
- Shame-management stubbed (slice 4) — should be slice-1 invariant

## Phase 11 decisions (11-03)

- Migration history repair via `supabase migration repair --status applied` needed when remote uses timestamp-format names but local uses sequential (0001-0019); this is the standard CLI workaround
- Bucket and RLS policies created via `npx supabase --experimental db query --linked` — only path available when local Postgres stack is not running
- types.ts doc_storage_key manually annotated (Row required, Insert/Update optional) — same pattern as class_id in 10-03; regen deferred until supabase gen types works cleanly against linked project
- ANTHROPIC_API_KEY confirmed present via indirect evidence: 4 deployed ACTIVE functions (classify-inbox, math-step, reading-scaffold, transcribe-note) all use the same secret

## Phase 12 decisions (12-01)

- `profiles.interests`, `profiles.mastery_signals`, and `profiles.session_mood` added in migration 0020 as the v2 identity substrate; Phase 15 can replace/extend `mastery_signals` with concept tables.
- Interest IDs are stored as stable lowercase ids; labels live in `lib/student-identity/interests.ts`.
- `buildPersonalizationPrompt` is mirrored in Next.js and Deno prompt helpers so subject engines can inject interests without weakening calm/safety fragments.
- `math-step` now loads `profiles.interests` and `session_mood` server-side before composing the prompt; this proves F23 on the highest-priority subject engine first.
- The notes editor has a dedicated Lecture tab. It uses the existing speech capture component and creates notes with `source="lecture"`.
- `transcribe-note` now returns `actionItems`; for lecture notes only, those are mirrored into `inbox_items` with `source_note_id` for student review.
- Migration 0020 is applied remotely and `math-step` + `transcribe-note` are ACTIVE after deploy on 2026-06-01.

## Phase 13 decisions (13-01)

- `profiles.bionic_reading`, `visual_pacing`, `line_focus`, `reading_letter_spacing`, and `reading_word_spacing` added in migration 0021 as persistent reading accessibility preferences.
- `profiles.tts_speed`, `tts_pitch`, and `tts_voice` added in migration 0021; `profiles_tts_provider_check` now allows `browser`, `openai`, and `elevenlabs`.
- Bionic reading uses a deterministic local word-splitting helper in `lib/accessibility/reading-tools.ts`; it approximates first syllable without AI calls.
- `AccessibleReadingText` is the reusable reading renderer for assignment descriptions, reading panels, note bodies, and cleaned transcripts.
- Visual pacing uses keyboard-reachable next/previous controls with arrow-key support; line focus dims non-current logical lines.
- Browser TTS supports saved speed and pitch. Remote TTS uses saved provider, voice, and speed.
- `tts-generate` now supports OpenAI and ElevenLabs. ElevenLabs requires `ELEVENLABS_API_KEY` in Supabase Edge Function secrets; local `.env.local` does not contain an ElevenLabs key.
- The `danger` token is amber, including high-contrast variants, so existing error UI remains calm without changing every call site.
- Migration 0021 is applied remotely and `tts-generate` is ACTIVE after deploy on 2026-06-01.

## Phase 14 decisions (14-01)

- `notes.tags`, `notes.ai_suggested_tags`, and generated `notes.search_vector` added in migration 0022; search/tag GIN indexes are in place.
- `/notes` now has a synthesis panel backed by the `note-synthesis` Edge Function; responses include source-note citations that link back to note detail.
- `/notes` full-text search uses `textSearch("search_vector", ...)` and local `snippetForQuery` previews.
- Related notes are computed at render time with deterministic text/tag/class overlap in `lib/notes/related.ts`; no embedding/vector dependency yet.
- Note detail tags are student-controlled; AI suggestions are stored separately in `ai_suggested_tags` and require a student tap to accept.
- `note-tags` uses Claude Haiku 4.5 and stores short tags only; server action falls back to deterministic tags if the function is unavailable.
- Highlight-to-flashcard verifies the highlighted text belongs to the note body/transcript, then inserts a new FSRS flashcard with `source_note_id`.
- The existing generated outline section is the Phase 14 outline view surface.
- Migration 0022 is applied remotely; `note-synthesis` and `note-tags` are ACTIVE after deploy on 2026-06-01.

## Phase 15 decisions (15-01)

- `mastery_concepts` and `mastery_events` added in migration 0023 as the v2 adaptive mastery substrate; `flashcards.concept_id` links FSRS reviews to concepts.
- Class concept maps are seeded on class page render from notes, note tags, assignments, and rubrics. If class evidence is sparse, safe fallback concepts keep the map useful with at least five items.
- Flashcard mastery is intentionally conservative: every three correct concept-linked reviews increases mastery by one level, capped at 4.
- Self-confidence is stored separately from mastery and writes append-only `self_confidence` evidence without directly changing the mastery score.
- AI quiz results write append-only `ai_quiz` evidence and move mastery toward the quiz rating by at most one level upward or half a level downward.
- Review-next chooses the lowest-mastery concept and `gapBridgeSuggestion` connects it to the strongest concept when available.
- Teacher progress export is a class-scoped PDF containing assignment completion and concept confidence; no raw AI interaction content is exposed.
- Parent share summaries now include read-only concept confidence for the lowest-mastery concepts.
- Migration 0023 is applied remotely and remote schema checks confirm `mastery_concepts`, `mastery_events`, and `flashcards.concept_id` exist.

## Phase 16 decisions (16-01)

- `math-scaffold` is a new Edge Function instead of overloading `math-step`; the existing chat hint remains available while the new function returns structured whiteboard data.
- Photo extraction uses GPT-4o against images stored in the existing `note-docs` bucket; no new storage bucket or database migration was needed.
- `math-scaffold` then asks Claude Haiku 4.5 for JSON with steps, common check, unit tracker, and graph sketch guidance. The prompt forbids final-answer reveal.
- `lib/math/scaffold.ts` normalizes model JSON and provides local fallback steps, unit hints, and graph-sketch prompts so malformed model output still renders as a usable scaffold.
- The assignment Math Helper now exposes one surface for photo scan, step board, Socratic hint chat, formula reference, and analogous worked example.
- The photo upload path allows jpg/jpeg/png/webp/gif under 10 MB; HEIC conversion is not part of Phase 16 and remains handled in the notes document-upload flow.
- `math_scaffold` was added to both AI safety feature unions and the AI tooltip descriptions.
- `math-scaffold` is ACTIVE after deploy on 2026-06-01.

## Phase 17 decisions (17-01)

- Visual learning attaches to note detail because notes are the durable source material for mind maps, concept graphs, timelines, and comparison tables.
- `visual-tools` is one Edge Function with mode routing instead of four separate text functions; diagram annotation is included as an image mode.
- Class AI traffic-light is enforced in server actions before invoking `visual-tools`, and the Edge Function repeats the aiMode guard.
- `lib/visual-learning/tools.ts` provides typed parsing and deterministic fallbacks so malformed AI JSON still renders a useful visual.
- Color-coded outline uses existing `outline_json` locally and does not spend AI tokens.
- Diagram annotation reuses the `note-docs` bucket and stores no new database rows; annotations are ephemeral study aids on the note page.
- Phase 16's math step board is treated as the Phase 17 equation whiteboard surface rather than duplicating the same concept in notes.
- `visual_tool` was added to both AI safety feature unions and the AI tooltip descriptions.
- `visual-tools` is ACTIVE after deploy on 2026-06-01.

## Phase 18 decisions (18-01)

- The existing essay `WritingAid` surface was expanded into the Writing Studio instead of creating a separate writing route.
- `writing-cowrite` is a new Edge Function because co-author modes require different prompts and JSON structure from the original `writing-aid` rule explainer.
- The original `writing-aid` flow remains available as `Explain one rule`; this preserves Phase 6 behavior.
- Ghost text is short and only appended after explicit student acceptance; accepted ghost text increments local AI-character count for authorship percentage.
- Evidence finder pulls recent class notes for the assignment class in `loadWritingEvidenceContext`; it never invents evidence without note context.
- Citation formatting remains the existing `CitationTool`, which already supports MLA/APA/Chicago and yellow AI mode.
- Authorship percentage is local to the active draft; durable AI usage remains in `ai_interactions`.
- `writing_cowrite` was added to both AI safety feature unions and the AI tooltip descriptions.
- `writing-cowrite` is ACTIVE after deploy on 2026-06-01.

## Phase 19 decisions (19-01)

- The Science Helper renders on lab assignments and science-like class names instead of adding a separate subject route.
- `science-scaffold` is a new Edge Function so hypothesis-first science prompts stay separate from math and writing prompts.
- Mode routing covers hypothesis, lab report, scientific method, formula context, chemistry balancing, diagram generation, and AP-style FRQ scaffolds.
- Mermaid diagrams are generated as Mermaid source text in the helper; live client-side rendering is deferred to avoid a new dependency in Phase 19.
- Chemistry balancing guidance prompts atom counting and coefficient iteration without dumping a complete balanced equation.
- Science prompt context is loaded from recent class notes through `loadScienceClassContext`.
- `science_scaffold` was added to both AI safety feature unions and the AI tooltip descriptions.
- `science-scaffold` is ACTIVE after deploy on 2026-06-01.

## Phase 20 decisions (20-01)

- The History Helper renders on history/social-studies class names and history-specific prompt keywords instead of adding a separate subject route.
- `history-scaffold` is a new Edge Function so evidence-first history prompts stay separate from science, math, and writing prompts.
- Text mode routing covers primary source, cause/effect, HAPP, DBQ, compare/contrast, and current-events scaffolds with Claude Haiku 4.5.
- Map annotation is the image mode and uses GPT-4o against images stored in the existing `note-docs` bucket.
- Primary source upload in the helper uses browser `File.text()` for text-like files; PDF/DOCX extraction remains in the notes document-upload flow.
- DBQ scaffolding uses a six-part outline contract.
- History prompt context is loaded from recent class notes through `loadHistoryClassContext`.
- `history_scaffold` was added to both AI safety feature unions and the AI tooltip descriptions.
- `history-scaffold` is ACTIVE after deploy on 2026-06-01.

## Phase 21 decisions (21-01)

- The Coding Scaffold renders on computer-science class names and CS-specific assignment keywords instead of adding a separate subject route.
- JavaScript execution runs only in a disposable browser Worker with a 1.2 second timeout; no code is executed server-side.
- Python execution uses a local Python Lite runner for print, variables, arithmetic, and `for range(...)` loops; Pyodide was not bundled in Phase 21 to avoid adding a large dependency.
- Algorithm visualization is local deterministic logic for bubble sort, binary search, and linked-list traversal.
- `cs-scaffold` is a new Edge Function for error hints, pseudocode bridge, code review, debug log, and AP CSP / AP CSA project scaffolds.
- Error hint prompts require a guiding question first and forbid complete corrected-code dumps.
- CS prompt context is loaded from recent class notes through `loadCsClassContext`.
- `cs_scaffold` was added to both AI safety feature unions and the AI tooltip descriptions.
- `cs-scaffold` is ACTIVE after deploy on 2026-06-01.

## Phase 22 decisions (22-01)

- The Foreign Language Helper renders on language class names and language-specific prompt keywords instead of adding a separate subject route.
- `language-scaffold` is a new Edge Function for vocabulary, conjugation, reading, speaking, writing, and culture scaffolds.
- Vocabulary cards include cognate hints, interest-based sentences, and pronunciation text.
- Speaking practice uses target-language browser STT through `VoiceTextarea.speechLang`; feedback is based on the transcript, not acoustic scoring.
- Vocabulary card save reuses the existing FSRS `createFlashcard` action and schema.
- Flashcard review now exposes TTS buttons for front/back audio, using the saved provider; ElevenLabs works when selected and configured.
- Language prompt context is loaded from recent class notes through `loadLanguageClassContext`.
- `language_scaffold` was added to both AI safety feature unions and the AI tooltip descriptions.
- `language-scaffold` is ACTIVE after deploy on 2026-06-01.

## Phase 23 decisions (23-01)

- `0024_school_system_integration.sql` extends the existing Phase 15 LMS substrate instead of creating separate provider-specific assignment tables.
- Canvas OAuth saves into `lms_connections.config` using the same shape as manual Canvas connections, with `oauth: true`, optional refresh metadata, and immediate best-effort assignment sync on callback.
- Canvas assignment import now stores original assignment URLs and normalized rubric text on `assignments` for detail-page visibility.
- Google Classroom sync continues to rely on Supabase `session.provider_token`; Classroom scopes must be granted during Google sign-in provisioning.
- Google Classroom announcements are captured into `inbox_items` as text for student review instead of becoming assignments.
- Clever support is a district-provisioning marker row in Phase 23; full Clever API SSO requires district IT credentials and is not simulated locally.
- IEP/504 import is deterministic text extraction and paste flow. Uploaded PDFs only work when the browser exposes readable text; scanned-PDF OCR remains outside Phase 23.
- Imported accommodations update `profiles.extra_time_pct`, `tts_enabled`, `dyslexia_font`, `font_size`, `line_spacing`, and `accommodations`, and store an `iep_imports` audit row.
- Background sync is app-triggered from Settings when non-Clever connections are unsynced or older than six hours; no cron, service worker, or push background job was added.
- Submission sync is an explicit student handoff: open Canvas/Classroom, submit there, then record `opened_external` or `marked_submitted` in Diana.
- `/api/calendar.ics` exports Diana due dates as VEVENT rows for calendar clients; it is an authenticated, no-store calendar export route.
- Migration 0024 is applied remotely and `npx supabase migration list --linked` shows local and remote both at `0024`.

## Phase 24 decisions (24-01)

- `0025_emotional_intelligence_session_adaptation.sql` adds mood cadence fields to `profiles` and a student-owned `student_reflections` table with RLS.
- Dashboard is the session-start surface for mood check-in, rough/light adaptation, reset cue, and Sunday-evening weekly reflection.
- Mood check-in stores the latest `profiles.session_mood`, daily check-in timestamp, optional permanent disable, and a 24-hour `rough_mode_until` when the student chooses rough.
- Rough mode sets low-energy ranking, fewer secondary tasks, and a `/timer?mode=rough` path with shorter work blocks.
- The global overwhelmed button lives in the authenticated app layout so it appears across app surfaces; on assignment detail routes it creates a 5-minute child assignment linked to the current assignment.
- Flashcard review is the first concrete F105 repeated-attempt surface. Three `Again` ratings in one session trigger a neutral different-path prompt.
- `weekly-reflection` is a new Edge Function using Claude Haiku 4.5 with token-budget checks, minor safety, calm tone, and `ai_interactions` logging.
- Weekly reflection falls back to deterministic local reflection text if the Edge Function is unavailable, so saving never depends entirely on AI availability.
- Wins quiet milestones are private and text-only: no confetti, streaks, ranking, or public celebration.
- Burnout/reset cue is advisory only and uses daily time logs, open session time, rough mood, and overwhelmed signals; it never forces a break.
- Migration 0025 is applied remotely and `weekly-reflection` is ACTIVE after deploy on 2026-06-01.

## Phase 25 decisions (25-01)

- `0026_portfolios_and_electives.sql` adds student-owned `portfolios` and `portfolio_items` with RLS and indexes; files reuse the existing private `note-docs` bucket.
- Portfolio uploads store files under `portfolio/{studentId}/...`; image items render through short-lived signed URLs alongside reflection text and metadata.
- The Portfolio route is the first dedicated arts project surface and is reachable from the authenticated navigation.
- The Arts Helper renders on arts/electives class names and assignment keywords instead of adding a separate subject route.
- Art reflection prompts are deterministic and visible before the AI action; the student process remains first.
- Music theory scale, triad, and interval helpers are local deterministic logic so major/minor scale and chord triad support does not depend on an AI call.
- `arts-scaffold` is a new Edge Function for art reflection, music theory, drama/speech, AP Art History, and storyboard scaffolds.
- AP Art History support is a formal-analysis scaffold for image context and student observation; automatic image-vision annotation is not part of Phase 25.
- `arts_scaffold` was added to both AI safety feature unions.
- Migration 0026 is applied remotely and `arts-scaffold` is ACTIVE after deploy on 2026-06-01.

## Phase 26 decisions (26-01)

- `0027_health_wellness_engine.sql` adds student-owned `wellness_activity_logs`, `wellness_goals`, and `sleep_logs` with RLS and indexes.
- The same migration extends the `task_signals.kind` constraint for `overwhelmed`, `mood_checkin`, `activity_log`, and `sleep_log`; this repairs the Phase24 signal insert path as well as enabling Phase26 signals.
- No body weight, BMI, or calorie columns were added; movement logs track activity type, duration, how it felt, and notes.
- Wellness goals are limited to skill, endurance, strength, flexibility, consistency, and recovery categories, with a server-side guard against appearance/body-metric goal text.
- `/wellness` is the dedicated student surface for activity logs, personal goals, sleep logs, and CPR / first aid FSRS card creation.
- CPR / first aid support seeds the existing `flashcards` table instead of creating a separate study system.
- Dashboard reads the latest sleep log and uses `sleepRecoveryAdjustment` to lower the default energy after rough/short sleep; explicit student energy selection still wins.
- The Health Helper renders on PE/health assignment names and prompt keywords instead of adding a separate subject route.
- `health-scaffold` is a new Edge Function for health questions, movement goals, CPR / first aid, and sleep recovery scaffolds with factual, age-appropriate guardrails.
- `health_scaffold` was added to both AI safety feature unions.
- Migration 0027 is applied remotely and `health-scaffold` is ACTIVE after deploy on 2026-06-01.

## Phase 27 decisions (27-01)

- `0028_ap_command_center.sql` adds student-owned `ap_exam_plans` and `ap_practice_attempts` with RLS and indexes.
- `/ap` is the dedicated command center for AP exam plans, countdowns, FRQ format reminders, practice attempts, and score-band estimates.
- AP subject coverage is centralized in `AP_SUBJECTS`, including US History, World History, English Language, English Literature, Biology, Chemistry, Physics, Calculus AB/BC, Statistics, Computer Science A/CSP, Spanish, French, Art History, Psychology, Micro/Macro Economics, and Government.
- FRQ scaffolds are deterministic by AP format first; the Edge Function can refine them from assignment context but the UI always has a local format outline.
- MCQ parsing requires explanations for every answer choice; UI copy uses best-fit / less-supported language.
- Score prediction uses broad bands such as `3-4`, never pass/fail framing.
- AP milestone plans change by days until exam and stay advisory.
- The AP Helper renders on AP class names, AP prompt keywords, and test-prep assignments instead of adding a separate assignment route.
- `ap-scaffold` is a new Edge Function for FRQ outlines, MCQ practice, and study plans.
- `ap_scaffold` was added to both AI safety feature unions.
- Migration 0028 is applied remotely and `ap-scaffold` is ACTIVE after deploy on 2026-06-01.

## Phase 28 decisions (28-01)

- No new migration was needed; Phase 28 reuses `assignment_steps`, `inbox_items`, `assignment_time_log`, `assignment_type_estimates`, and browser-local recovery state.
- `task-breakdown` now uses a five-minute contract across the Edge Function prompt, `MAX_MINUTES_PER_STEP`, parser validation, and tests.
- The timer start action now runs through a three-second `Ready.` ritual before a focus session begins.
- Adaptive Pomodoro breaks are deterministic in `lib/executive/session.ts` and account for session mood, task difficulty, and long work blocks.
- Body-doubling v2 remains local/deterministic in this phase and splits the focus count into Math, Reading, Writing, and Review categories.
- Global `QuickCapture` lives in the authenticated layout and inserts unclassified text captures into `inbox_items` without leaving the current route.
- Assignment task-breakdown recovery persists the current step and scroll position under `diana:assignment-recovery:{assignmentId}` and restores focus when the student continues.
- The task-switch cue is browser-local and compares the prior assignment context to the current assignment before showing the 15-minute warm-up message.
- F134 time estimate calibration remains on the existing `assignment_time_log` and `assignment_type_estimates` path surfaced by the new assignment form.
- `task-breakdown` is ACTIVE after redeploy on 2026-06-01.

## Phase 29 decisions (29-01)

- `0029_vocabulary_reading_scaffold.sql` adds student-owned `vocabulary_terms` and `reading_annotations` with RLS; vocabulary review still uses the existing FSRS `flashcards` table.
- `reading_annotations` requires exactly one source (`note_id` or `assignment_id`) so annotation mode stays tied to a concrete text surface.
- `AccessibleReadingText` now emits `data-vocab-word` spans; this makes existing note, transcript, assignment, and reading-panel text vocabulary-aware without duplicating renderers.
- `VocabHoverProvider` opens a local context-clue and phonics popover on first hover; definitions are fetched on request or after the word has been seen once.
- `vocab-hover` now returns structured definition/context/phonics JSON and loads `profiles.interests` for light student-context personalization.
- `reading-level` is a new Edge Function for simpler and more-detail text adaptation with red/yellow AI policy gating, token-budget checks, and `reading_level` interaction logging.
- `ReadingLevelAdapter`, `ReadingAnnotationControl`, and `AssignmentReadingBlock` are reusable client surfaces for notes and assignments.
- Hover vocabulary card saves create both a new FSRS flashcard and a linked `vocabulary_terms` row; note-sourced vocabulary cards keep `source_note_id`.
- `vocab_hover` and `reading_level` have AI transparency labels in assignment usage logs and settings AI history.
- Migration 0029 is applied remotely, `vocab-hover` is ACTIVE, and `reading-level` is ACTIVE after deploy on 2026-06-01.

## Phase 30 decisions (30-01)

- `0030_teacher_parent_portal.sql` adds `assignments.ai_mode_override`, `class_roster_members`, `teacher_progress_notes`, and `accommodation_confirmations` with owner RLS.
- Assignment-level AI policy is nullable: null means use class policy, otherwise `green`, `yellow`, or `red` overrides the class for that assignment.
- Assignment detail computes effective AI mode server-side with `effectiveAiMode(classMode, aiModeOverride)` before rendering AI tool surfaces.
- `/teacher-share` is the student-controlled teacher portal for teacher-created assignments, class contacts, class analytics, progress notes, accommodation confirmation, and IEP / 504 import.
- Teacher-created assignments write directly to `assignments` and can include `rubric_text` plus `ai_mode_override`.
- Class analytics are aggregate per class only; no roster member ranking or individual comparison is shown.
- `teacher_progress_notes.visible_to_parent` controls whether a note appears in `/parent-share` and public parent summary links.
- `/parent-share` is a read-only parent-dashboard preview plus existing share-link creation/revocation.
- Public parent summary links continue to omit assignment names, grades, private notes, and AI interaction details.
- Migration 0030 is applied remotely; Phase 30 adds no new Edge Functions.

## Phase 31 decisions (31-01)

- `0031_platform_intelligence_analytics.sql` adds owner-scoped `feature_flags`, `analytics_events`, `error_events`, `performance_events`, and `experiments` with RLS and indexes.
- `/insights` is the operational dashboard for daily AI token totals, feature usage, route session length, assignment completion rate, app monitor reports, web vital budgets, flags, and UI experiments.
- `PlatformAnalyticsTracker` runs only inside the authenticated app layout and writes page views, route duration, and Core Web Vitals through first-party monitoring routes.
- App monitor reports are Sentry-compatible but local-first in Phase 31; no external SDK was added.
- Diagnosis context is stored only as anonymous categories from `anonymizedDiagnosisTags`, never raw profile diagnosis values.
- UI experiment safety is enforced in both `isExperimentSurfaceAllowed` and the database surface check; content, AI, privacy, safety, IEP, and accommodation surfaces are rejected.
- Feature flags and experiments are per owner and can be toggled without deploy through `/insights`.
- Migration 0031 is applied remotely; Phase 31 adds no Edge Functions.

## Phase 32 decisions (32-01)

- Phase 32 adds no database migration; offline durability is browser-local through IndexedDB and the service worker cache.
- `public/sw.js` is a first-party service worker rather than adding `next-pwa` or Serwist; it handles route cache, `/offline` fallback, sync messages, and notification clicks.
- Offline writes are queued in `lib/offline/store.ts` with separate prefixes for note saves, assignment status changes, flashcard reviews, and cached due-card snapshots.
- `PwaRuntime` is mounted only in the authenticated layout and drains queues on mount, reconnect, and the `diana-offline-sync` service worker message.
- Note editor autosave queues drafts when the server path is unavailable, including new notes that do not yet have a database id.
- Assignment status buttons queue status transitions when offline; replay uses the existing `transitionAssignment` action so state-machine and time-log behavior remain centralized.
- Flashcard review caches due-card snapshots and queues rating events; replay uses the existing `rateCard` action so FSRS scheduling remains server-authoritative.
- `/api/share-target` is the manifest share target; authenticated shares create a note and upload shared files to `note-docs`.
- Optional reminders are local/browser-permission gated through Settings and `/api/pwa/reminders`; no external push vendor was added.

## Phase 33 decisions (33-01)

- `0032_personalization_settings_v2.sql` adds durable profile JSON for AI style, notification preferences, and privacy preferences, plus owner-scoped `session_handoffs` and `data_deletion_requests`.
- `/export` is the student-owned data and privacy center for inventory, AI context, JSON/PDF export, per-class AI style, notification toggles, backup, handoff, category clearing, and deletion request.
- Data export reads profile, classes, assignments, notes, flashcards, AI interactions, mastery concepts, and share links directly through RLS-scoped Supabase queries.
- Account deletion is a request workflow: Diana disables AI immediately on profile/classes/assignments and records the 30-day COPPA purge request in `data_deletion_requests`.
- Profile backup encryption is browser-local PBKDF2 + AES-GCM; the passphrase is never posted to server actions.
- `SessionHandoffTracker` runs only inside the authenticated layout and upserts the latest route through `/api/profile/handoff`.
- Privacy category clearing is scoped to student-owned Diana data categories; it does not delete the Supabase auth identity directly.
- Migration 0032 is applied remotely; Phase 33 adds no Edge Functions.

## Phase 34 decisions (34-01)

- `0033_social_collaboration.sql` adds invite-only `study_groups`, membership rows, shared sessions, shared deck/card/install tables, collaborative notes, peer explanations, and group project tasks.
- RLS uses `is_study_group_member` and `is_study_group_owner` helper functions to avoid self-recursive member policies while keeping group data membership-scoped.
- Joining a room goes through the `join_study_group` security-definer RPC; there is no public group directory.
- Shared deck creation calls `install_shared_deck_for_members`, which creates real due `flashcards` rows for every current group member and records installs to avoid duplicate deck installs.
- Collaborative notes use optimistic version checks and the client refreshes at `COLLAB_NOTE_REFRESH_MS = 500` while a group note is open.
- The Groups route combines shared Pomodoro sessions, decks, notes, peer explanations, and project tasks in one opt-in workspace.
- No leaderboard, ranking, streak, public discovery, or default sharing surface was added.
- Migration 0033 is applied remotely; Phase 34 adds no Edge Functions.

## Phase 35 decisions (35-01)

- `0034_launch_hardening_retention.sql` adds `data_retention_runs` and service-role RPC `purge_due_deletion_requests` for 30-day COPPA deletion request purges.
- The purge RPC dynamically clears public tables with `owner_id`, deletes the profile row, marks the deletion request completed, and records each run.
- `npm run launch-audit` is the v2.0 readiness gate for required launch docs, performance budgets, and critical-path test coverage.
- Critical-path coverage gate is set at 80 percent; current launch audit reports 100 percent for the named critical paths.
- Launch docs cover accessibility, performance budgets, OWASP review mapping, data retention, mobile matrix, beta rollout, and operational launch gates.
- Phase 35 adds no Edge Functions; retention is a database RPC intended for a service-role scheduled job.
- Migration 0034 is applied remotely; final static gates are green.

## Phase 11 decisions (11-02)

- triggerDocExtraction awaits extract-note-doc and relays result only — Edge Function handles body_text write + transcribe-note fire-and-forget internally
- DocUploadTab props shape byte-identical to AudioUploadTabProps — NoteEditor wires both identically
- Tab key "upload" renamed to "audio" — string identity change only, AudioUploadTab behavior unchanged
- heicConverting status added to DocUploadTab state machine (not in AudioUploadTab) — guards Pitfall 1 (HEIC before Claude)
- Pitfall 6 fallback: catch around convertHeicToJpeg shows calm iPhone JPEG re-share guidance

## Phase 11 decisions (11-01)

- doc_extract added to LogParams.feature union in both safety.ts mirrors (Next.js + Deno) per Deno-mirror convention from Phase 9
- heic2any dynamic import in convertHeicToJpeg defers 200KB gzip bundle to runtime — only loaded when user picks HEIC file
- uint8ArrayToBase64 chunks at 8192 bytes to prevent btoa stack overflow on large files (Pitfall 2 guard)
- Extension routing in extract-note-doc Edge Function uses storageKey extension, never blob.type (Pitfall 4 guard)
- MIN_EXTRACT_CHARS=20 in Edge Function mirrors Phase 10 Pitfall 7 guard — < 20 chars returns tooShort:true without chaining transcribe-note
- HEIC/HEIF rejected at Edge Function boundary with calm error "Please share this photo as JPEG" — UI handles conversion before upload (Pitfall 1 guard)
- DOC_MAX_FILE_BYTES=20MB hard block keeps base64-encoded payload (26.6 MB) safely under Anthropic 32 MB request limit (Pitfall 3 guard)
- note-docs bucket creation deferred to Wave 3 (11-03) via Supabase MCP — SQL migrations cannot manage storage.buckets safely
- No @types/heic2any package exists (2026-05); type shape declared inline in heic-convert.ts

## Phase 10 decisions (10-03)

- types.ts manually annotated with notes.class_id (Row + Insert + Update + Relationship) — supabase gen types failed; regen deferred until migration 0018 is applied to linked project
- notes_class_id_fkey added to types.ts Relationships to resolve SelectQueryError from nested classes(id,name) select
- classId in saver/ensureNoteId — undefined and null both clear the class (no leave-unchanged sentinel, matches audioStorageKey semantics)
- classLabel prop name used in NoteDetail to avoid collision with React className

## Phase 10 decisions (10-02)

- Await Whisper (transcribe-voice), fire-and-forget Claude cleanup (transcribe-note) — body_text needed synchronously for class routing; outline is best-effort per page reload
- Pitfall 7 guard: text < 20 chars returns bodyTooShort:true without chaining Claude — prevents silence hallucination in outline
- classId state in NoteEditor but not yet persisted — 10-03 wires classId into saveNote + createNote payloads
- ensureNoteId extracted as useCallback in NoteEditor — creates note row on first audio pick, prevents orphan rows (Pitfall 4)
- Class dropdown visible on all tabs above title — student can pre-select class before typing or picking audio
- Manual smoke test deferred to 10-03: requires OPENAI_API_KEY secret + note-audio Storage bucket confirmed in Supabase dashboard

## Phase 10 decisions (10-01)

- getExtension uses lastIndexOf('.') on basename — handles storage key paths (e.g. 'user-id/file.m4a') and returns '' for no-extension files (split+pop returns whole string when no dot)
- MIN_SCORE=2 — single keyword match is too low-signal; two hits required before auto-routing to avoid false class assignment
- mimeByExt duplicated inline in transcribe-voice Edge Function — Deno cannot import lib/notes/mime.ts; mirrors safety.ts Deno-mirror pattern from Phase 6
- 25MB blocks at-or-above (file.size >= MAX_FILE_BYTES); 20MB warns at-or-above — matches Whisper hard cap behavior
- scoreClass uses set intersection (not bag-of-words count) — prevents repeated filler words from inflating scores

## Phase 9 decisions (09-09)

- ThemeProvider wraps children (unlike AccentProvider which is childless) — required because ThemePicker needs context access from within the layout subtree
- afterEach(cleanup) required in vocab-hover-provider tests — prevents stale DOM elements across test cases (matches ai-tooltip.test.tsx pattern)
- Dynamic import of supabase client in VocabHoverProvider — avoids module init errors in jsdom test environment; auth is best-effort
- vocab-hover Edge Function receives ownerId in request body (not from auth header) — consistent with math-step, writing-aid, citation-gen pattern
- suppressHydrationWarning on html tag — required when inline script mutates classList before React hydration
- Flash-prevention IIFE reads diana_theme from localStorage, falls back to window.matchMedia — synchronous script in head before first paint
- tailwind darkMode: 'class' + .dark CSS block + @media block both kept — class toggle for ThemePicker, media query as system-default fallback
- VocabHoverProvider uses dblclick + getSelection (deliberate trigger) — ADHD users need intentional triggers, not surprise overlays on hover
- Storage key: 'diana_theme', values: 'light' | 'dark' — ThemePicker labels "Light" / "Dark" (calm invariant)

## Phase 9 decisions (09-07)

- AiTooltip conditionally shown only when AI output is visible (history.length>0, result!=null, example!=null) — tooltip at point of use, never before request fires
- tokensToWords: tokens/4 rounded to nearest 10 — calm approximate word count ("About N words of AI help")
- "AI was used on this assignment N times" framing (never "You used AI") — calm peer-register invariant
- Onboarding literacy step uses step state ('form'|'literacy') — commit() extracted from onSubmit() to separate form validation from actual save
- Skip for now bypasses literacy step — user-initiated skip acceptable; literacy step is for new completions only
- @testing-library/jest-dom + vitest.setup.ts added — required for toBeInTheDocument matchers in jsdom component tests
- afterEach(cleanup) added to component test files — prevents DOM pollution between tests in same file
- BreakdownPanel AiTooltip deferred — AI_FEATURE_DESCRIPTIONS["task_breakdown"] ready; wire when component ships

## Phase 9 decisions (09-08)

- Migration 0017 used for share_links (0016 already used by lms_connections in 09-05)
- Service-role client (lib/supabase/service.ts) extends the 3-client pattern: used only for public /share/[token] route to bypass RLS for token lookup
- Public share route lives at app/share/[token]/ outside app/(app)/ so the auth+onboarding redirect never fires
- Study time query uses assignment_time_log.started_at/ended_at (time_logs table does not exist)
- task_signals.occurred_at is the correct timestamp column (not created_at) per migration 0001
- profiles.user_id is the FK column for profile lookup (not profiles.id)
- profiles.diagnoses (string array containing "dyslexia") used instead of disability_flags (does not exist)

## Phase 9 decisions (09-01)

- Edge Function returns raw content string — parsing deferred to server action so parseStepsFromContent is testable in vitest (node) instead of Deno
- task-breakdown gates only on aiMode=red (yellow allowed — task breakdown is pure planning, not content generation per F16 traffic-light spec)
- Upsert on assignment_id unique index — regenerating replaces previous steps cleanly without needing to DELETE first
- Optimistic toggleStepDone — local state updated before fire-and-forget server call (mirrors EveningPlanning Pitfall 5 pattern)
- task_breakdown added to LogParams.feature union in both lib/ai/safety.ts and supabase/functions/_shared/safety.ts per Deno mirror convention

## Phase 8 decisions (08-01)

- OpenAI provider path uses direct fetch for binary audio — supabase.functions.invoke parses JSON, losing binary blob from tts-generate; direct fetch to ${SUPABASE_URL}/functions/v1/tts-generate preserves audio/mpeg
- tts_provider defaults to 'browser' for all users — opt-in requires Settings UI (deferred); column + prop wiring is the foundation
- No logInteraction in transcribe-voice/tts-generate — non-Claude AI calls; Whisper/TTS usage auditable via OpenAI dashboard
- TtsHighlightButton OpenAI variant omits word-highlight — OpenAI TTS 1 API emits no word boundary events; estimator wiring deferred to follow-up
- stt_transcribe + tts_generate added to LogParams.feature union in both safety.ts mirrors — must stay in sync

## Phase 9 decisions (09-06)

- Calendar groups assignments by UTC date to match how due_at is stored in Postgres; midnight-UTC due date appears on UTC calendar day (documented design decision)
- Workload tier colors use calm palette: emerald-100 (light 0–90 min), amber-100 (moderate 91–150), amber-300 (heavy 151–240), violet-200 (overloaded 241+) — no red anywhere per calm invariant
- adjustForUser exported from lib/scoring/next-five-minutes.ts for reuse in calendar per-day workload math (consistent with scorer + nightly budget)
- Empty calendar day columns render no copy — no "Nothing due!" encouragement language (calm invariant)
- date-fns v4.1.0 already in package.json — no new install needed
- assignments table uses owner_id column (not user_id) — calendar query uses .eq("owner_id", user.id)
- lib/supabase/server.ts exports createClient (not createSupabaseServerClient) — import adjusted to match
- Calendar nav item inserted between /timer and /wins (after /timer as plan specified; /wins was in between in current nav)

## Phase 9 decisions (09-04)

- math_example added to LogParams.feature union in both lib/ai/safety.ts and supabase/functions/_shared/safety.ts (Deno mirror, Pitfall 4 pattern)
- Formula accordion renders on yellow aiMode (zero AI cost, D-07) — formula reference is library data, not AI content generation
- Red aiMode returns null entirely; yellow renders formulas only; green renders full math tools (Socratic chat + worked example + formula reference)
- math-example is a separate Edge Function from math-step — analogous problem only, never the student's actual problem (D-03, D-04)
- Static formula data (lib/math/formulas.ts) uses plain text Unicode — no KaTeX dependency, saves ~300KB bundle (D-02)
- Worked example uses Haiku 4.5 at max_tokens=500 — slightly higher than math-step's 400 because multi-step solution requires more output (D-06)
- composeSystemPrompt with includeFrustration=false for math-example — the worked example IS the F18 redirect; no need to layer frustration prompt on top

## Phase 9 decisions (09-02)

- shouldShowReminder uses 'stillOpen' property name instead of 'pastDue' — tone-audit bans `past[\s-]?due` regex including camelCase `pastDue`; calm invariant enforced; DB field `is_past_due` unaffected (underscore separator not matched)
- User-facing copy "still open beyond its due date" replaces "past due" in /reminders explanation page — same calm-invariant constraint
- Client-side time gate in ReminderBanner via `useEffect(() => setNow(new Date()), [])` — Pitfall 1: server runs UTC, student's local clock needed for quiet-hours check
- Per-session dismiss via `useState<Set<string>>` (not persisted) — D-05 mirrors EveningPlanning pattern from Phase 8-03
- No push infrastructure — D-01: in-app only for v1; no SW, no VAPID, no push_subscriptions table

## Phase 8 decisions (08-03)

- Client-side time gate for evening planning — Next.js server components run in UTC; student's local clock needed for 17–20h window; useEffect on client is the correct gate (Pitfall 4)
- Optimistic dismiss in EveningPlanning — local Set updated before markIntentionFired server call so UI stays calm even if server write fails (Pitfall 5)
- 17:00–20:00 hardcoded in v1; profiles.timezone column exists for future per-user TZ-aware personalization
- vitest include extended to app/**/*.test.tsx — test file co-located with component per plan spec; prior include only covered lib/ and components/
- findByText replaced with getByText in EVENING-02 — vi.useFakeTimers() intercepts Testing Library's internal setTimeout polling; synchronous getByText after act(runAllTimers) is the correct pattern

## Phase 8 decisions (08-02)

- INTERLEAVE_PENALTY=15: calibrated to de-promote non-urgent same-class tasks; typical non-urgent score range 10-30, so 15 is enough to rotate subjects without overriding urgency signals
- Urgency override: "due now" (+80) and "due today" (+60) assignments bypass the interleave penalty — Pitfall 6; urgency always wins
- Cookie over localStorage: diana_last_class cookie is readable by App Router server components on every request with zero latency; localStorage requires client-side hydration
- 12-hour maxAge: bounded session memory — natural overnight reset, no explicit "forget class" UI needed
- Silent de-promotion: no reason string added to scored assignment so the UI never shows "de-promoted by interleaving" (avoids self-fulfilling subject avoidance)
- Fire-and-forget void setLastShownClass(): cookie write never blocks dashboard render; graceful degradation if it fails

## Phase 7 decisions (07-02)

- assignment_checklists created in migration 0013 — was missing from all prior migrations despite being referenced as "existing" in Phase 3/4 plan interfaces
- Reading-load view shows 5 items vs 3 for normal view — students sorting by load want to see the full heavy-reading set
- Template picker placed BEFORE title field — student picks scaffold first, then adds assignment-specific title
- getTemplates and getTemplateById added to lib/templates/templates.ts as simple array wrappers (no extra DB calls) — required by success criteria
- inbox/[id]/actions.ts updated with templateId: null — all callers of createAssignment must include the new field

## Phase 7 decisions (07-03)

- Countdown hidden by default (showCountdown=false) — time-blindness accommodation per F13 spec; toggle persists via localStorage
- Ring progress uses rgb(var(--accent)) only — no red states at any progress level, calm invariant maintained
- Audio CDN-free placeholder approach — public/sounds/ directory committed empty; actual .mp3 assets are manual follow-up
- HTML5 Audio API play() wrapped in .catch(()=>{}) — browsers block autoplay; first Start click is user gesture; silent degradation if files missing
- body-double-pulse keyframe in globals.css (not CSS module) — single-use global utility, module overhead not warranted
- prefers-reduced-motion gate on body-double-pulse — vestibular/motion sensitivity comorbid with ADHD; reduced-motion = static dot
- Body-double copy 'No one else can see you' — explicit expectation management, no false networking promise (T2-03 spec)
- Timer between Study and Classes in nav — adjacent to work-mode items, before metadata items; nav now 6 items

## Phase 7 decisions (07-01)

- tone-audit uses tsx (not ts-node) — works cleanly with Next 15 ESM/CJS hybrid
- SKIP_LINE_PATTERNS excludes comment lines, console.error, imports, export declarations, DB enum comparisons — targets actual UI copy not code identifiers
- lib/ai/ and supabase/functions/ skipped in tone-audit — AI system prompts name banned words as anti-examples, server API responses are not student-facing
- docs/ skipped entirely — design/architecture docs reference banned words as anti-patterns being documented
- TimerStatus union is exactly 'idle'|'running'|'paused'|'break'|'done' — 'failed'/'missed' permanently excluded per calm invariant
- tickTimer work->break transition keeps status='running' and sets phase='break' — only break-end flips to 'done'; Premack reward surfaces at 'done' only
- useTimer uses setInterval(1000) not rAF — rAF throttled in background tabs, timer would stall

## Phase 6 decisions (06-04)

- Single classAiMode const replaces Plan 06-02 inline narrowing — one source of truth shared by ReadingPanel + three new tools
- calmError helper shared by all three server actions — identical calm copy for quota exhausted and ai_mode off errors
- CitationTool visible on yellow (F16 spec: yellow = citation help only); MathHelper + WritingAid hidden on yellow
- citation-gen content surfaces as raw JSON string from server action; CitationTool does JSON.parse client-side with raw-text fallback
- F18 frustration UX lives entirely in the Edge Function system prompt — no client-side frustration button in v1
- Phase 6 is COMPLETE: F09, F10, F11, F15, F16, F17, F18, AI-SAFETY-01 all delivered

## Phase 6 decisions (06-03)

- math-step uses Haiku 4.5 (400 max_tokens) — Socratic hints are low-complexity; budget stretches further; quality within tolerance for "what do you think comes next?" prompts
- writing-aid uses Sonnet 4.6 (500 max_tokens) — grammar/style nuance (homophones, comma splices, parallelism) requires higher model; F10 spec explicitly names Sonnet 4.6
- citation-gen uses Haiku 4.5 (600 max_tokens) — pure text-transform, no reasoning; three-format output fits within budget
- Yellow aiMode allows citations only (F16 traffic-light: yellow = citation-help); blocks math + writing (higher Socratic concern)
- citation-gen injects MINOR_SAFETY only, no F17/F18 — citations are not Socratic; formatting metadata is not doing work for student
- History capped at 6 turns for math-step: cost-efficient + frustration detector cares about last 3–5 turns only
- writing-aid has no history: each sentence review is independent; history would confuse "explain one rule" framing
- Fire-and-forget side effects: Promise.resolve().then(async()=>{}).catch() — AI-SAFETY-01 mandates side effects never block response

## Phase 6 decisions (06-01)

- ai_interactions is SEPARATE from ai_calls: ai_calls=cost/security audit (kept per privacy policy); ai_interactions=student-facing authorship log (exportable, per-assignment, per F15)
- UTC daily reset boundary for token budget (todayIsoDate): consistent for v1; per-user TZ-aware reset deferred to Phase 7+
- daily_token_budget default 50000 on profiles directly (not a separate usage_daily table): atomic single UPDATE, no JOIN per request, matches spec wording
- F18 divergence: FRUSTRATION_REDIRECT offers 5-min break + talk-through instead of worked example — lower cognitive load for ADHD/dyslexia student; worked-example path deferred to Phase 7+
- Deno mirror convention: duplicate lib/ai strings verbatim in _shared/ rather than shared package — overkill for ~150 lines of strings

## Phase 5 decisions (05-02)

- Create-on-first-save pattern: NoteEditor creates row on first auto-save (not page load) to avoid orphan draft rows in the database
- Dual-refresh strategy: setTimeout router.refresh() at 3s and 8s after triggerTranscript — surfaces AI result without a polling loop
- transcribe-note uses claude-sonnet-4-6 with max_tokens=1500 — reasoning quality needed for outline structuring per STATE.md model selection
- note-audio Storage bucket is a runtime dep (must be created in Supabase dashboard); same pattern as inbox-photos from Phase 3

## Phase 5 decisions (05-03)

- rateCard uses sequential await calls (load → update flashcards → insert flashcard_reviews) rather than a Postgres RPC — matches inbox classification pattern; atomicity is sufficient for FSRS correctness
- Flashcard-from-note link (/notes/[id] → /flashcards/new?note={id}) intentionally deferred: ?note= wiring and source_note_id FK exist; adding the link is a one-line follow-up in Phase 5 polish or Phase 6
- DueCards tile returns null when count=0 — no empty-state nagging for students who haven't created cards yet
- RATINGS array uses Anki-convention labels (Again/Hard/Good/Easy) — neutral, no shame, mirrors FSRS spec
- ReviewSession client component tracks idx in local state; revalidatePath('/flashcards') ensures server data is fresh on back-navigation

## Phase 5 decisions (05-01)

- FSRS-5 default weights (v5 Anki release) used; 19-parameter personalized optimization deferred to Phase 7+
- @testing-library/react installed as devDep — React 19 standalone renderHook/act not available in this environment
- useAutoSaveNote accepts saver as prop (not note body) — hook stays generic and testable without mocking server actions
- FsrsCard.difficulty=0 on new cards; initialDifficulty computed on first schedule() call to prevent clamping artifacts
- Good on new card → learning (not review) — mirrors Anki two-step graduation; Easy is the only direct-to-review rating

## Phase 4 decisions (04-03)

- classAiMode defaults to 'green' in assignment detail page; Phase 6 (F16) adds per-class traffic-light column
- Scaffold buttons opt-in behind "Help me with this reading" tap — not shown by default (Pitfall 5 guard)
- reading-scaffold Edge Function uses claude-sonnet-4-6 with 512 max_tokens; truncates to 1500 chars for pre, 4000 for mid/post
- server-side aiMode='red' guard in Edge Function returns 403 (defense in depth — client-side guard is not sufficient alone)
- reading_font field added to settings Prefs zod schema; existing supabase update call handles it without further changes

## Phase 4 decisions (04-02)

- Atkinson_Hyperlegible_Next loaded via next/font/google (not fontsource) for built-in Next.js font optimization + self-hosting
- OpenDyslexic loaded via @fontsource/opendyslexic (weight 400 only — no all.css, Pitfall 7 guard)
- .reading-view CSS scoped to blocks only (not global body) — prevents typography leaking into non-reading UI
- useTtsHighlight exposes pause/resume/stop separately — TtsHighlightButton drives 3-state UI
- Word spans rendered only when state !== 'idle' — Pitfall 3 guard for screen reader compatibility
- aria-live='polite' on paragraph container only — prevents excessive screen reader announcements per word

## Phase 4 decisions (04-01)

- reading_font stored as TEXT NOT NULL DEFAULT 'system' with DB check constraint ('system'|'lexend'|'atkinson'|'opendyslexic')
- reading_font='lexend' maps to existing .dyslexia-font CSS class (no new CSS needed; Lexend loaded Phase 2)
- Dedup guard in profileBodyClass prevents duplicate dyslexia-font class when dyslexia_font=true AND reading_font=lexend
- tts-utils.ts injects synth object into safeCancel for mockability — no window globals — enables node-environment Vitest
- types.ts manually annotated with reading_font until migration applied and supabase:types regenerated

## Phase 3 decisions (03-04)

- DB column is `cue_text` (not `cue_value`) in assignment_intentions — plan spec diverged from actual migration 0009 schema
- `action_text` column absent from assignment_intentions — removed from insert and zod schema
- `cueType` made optional in IntentionInput zod schema, defaults to "other" in server action body
- `?intent=new` URL param pattern: server page reads searchParams, client component cleans URL on mount via `router.replace(pathname)` (Pitfall 6 guard)
- `saveIntention` does not call `revalidatePath` — intention data never rendered server-side

## Phase 3 decisions (03-01)

- jsdom installed as devDependency for vitest jsdom environment (required by queue.test.ts @vitest-environment annotation)
- idb-keyval KEY_PREFIX "inbox-queue:" namespaces queue items from other IDB data
- Calibration n >= 3 gate before surfacing hint to prevent premature guidance
- Calibration 20% threshold ignores minor variance; surfaces hint only when student substantially underestimates
- upsert_type_estimate as atomic Postgres function to prevent client-side race condition (Pitfall 7)
- Dyslexia 1.6x multiplier applied in computeNightBudget only when reading_load >= 3 (consistent with scorer)

## Phase 2 decisions (02-04)

- PastDueMicroTaskButton extracted to its own client component — TimeBar stays a server component
- inProgress = todo || drafting only — checking/exporting are near-done, no micro-task escape hatch needed
- pivotAssignment race-guard: .eq("status","drafting") on update prevents concurrent pivot writes
- PivotForm copy: "Pause and revisit" / "Pause this" (not "Pivot") — pause framing per Pitfall 6
- Breadcrumb auto-focus via useSearchParams + useEffect; triggered by ?focus=breadcrumb URL param
- pivotSummary helper exported but rendering deferred to Phase 3 to keep plan scope contained

## Phase 2 decisions (02-02)

- signals parameter inserted second in rankAssignments (before now/energy/profile); default [] for backward compat
- Status-based momentum (drafting/checking → +25) fully removed; signals are the sole momentum source
- assignment_id nullable in task_signals — dashboard filters before passing to scorer
- 1.6x dyslexia reading_load multiplier codified in REQUIREMENTS.md (was 1.5x in spec); implementation matches, test verifies

## Phase 2 decisions (02-03)

- lexend.variable only (not lexend.className) — Lexend is opt-in via .dyslexia-font, not the global body font
- class_count_hint nullable, no default — null = skipped during onboarding
- TimeBar createdAt lookup by id from original Supabase array — no scorer type coupling
- TimeBar fallback to 7-day window when totalWindow < 1h (last-minute tasks)
- Custom checklist items required=false — never block submission
- deleteChecklistItem allows removing required items — student owns their checklist

## Phase 2 decisions (02-01)

- Vitest pinned to ^3.0.0 (current major); @vitejs/plugin-react included now for wave 4 component tests
- vitest environment: node default; component tests use per-file `@vitest-environment jsdom` override
- globals: false — explicit vitest imports preferred
- pivot_note and parent_assignment_id are nullable with no default (matches GAP-06/GAP-07 spec)
- parent_assignment_id FK: on delete set null — parent deletion must not cascade to micro-task children
- Migration 0008 is next available (02-03 will use it for class_count_hint)

## Architecture decisions locked

- Next.js 15 App Router + TypeScript + Tailwind + shadcn/ui
- Supabase (Postgres + Auth + Storage + Edge Functions)
- Vercel deploy; preview per branch
- All Claude calls via Supabase Edge Functions (never browser-direct)
- Model selection per task: Haiku 4.5 (cheap ops), Sonnet 4.6 (default), Opus 4.7 (hard reasoning)
- Prompt caching on class system prompt + reading text

## Open decisions (not yet resolved)

- TTS provider (needed Phase 4) — OpenAI / ElevenLabs / Azure / Polly
- STT provider (needed Phase 3) — Whisper / Deepgram / AssemblyAI
- OCR provider (needed Phase 3) — Claude vision vs. Cloud Vision
- Math expression parser (needed Phase 6) — MathLive + SymPy WASM
- Rich text editor (needed Phase 6) — TipTap
- Email service for parent verification — Resend or SendGrid

## Accumulated Context

### Roadmap Evolution

- Phase 8 added: Provider Wiring + Scorer Interleaving + Intentions Evening Trigger
- Phase 11 added: Photo and PDF upload to notes — Claude Vision/PDF extraction → transcribe-note cleanup pipeline + auto-class routing

## Repo pointers

- Feature spec: `docs/spec/features.md`
- Architecture: `docs/architecture.md`
- AI ethics: `docs/ai-ethics.md`
- Research findings: `docs/research/findings.md`
- Evidence review (gap analysis): `docs/review/slice-1-evidence-review.md`
