# Diana — Project Roadmap

**Project:** Diana — ADHD + dyslexia homework assistant for high-school students  
**Goal:** Ship a fully evidence-backed, accessible PWA that works for Maya (ADHD), Devon (ADHD + dyslexia), and Sam (undiagnosed) from day one.

---

## Phase 1: Slice 1 Foundations — COMPLETE

**Goal:** Working end-to-end assignment tracker with F1/F2/F3 + auth + PWA shell.

**What it delivers:**
- F1: Class + rubric substrate
- F2: "Done ≠ Submitted" state machine
- F3: "Your next 5 minutes" dashboard
- Supabase auth (email + Google OAuth), DOB age gate
- PWA shell, basic navigation
- Calm visual language (no red, no exclamations)

**Status:** COMPLETE (branch `claude/adhd-app-jxpn9`)

---

## Phase 2: Evidence-Review Gap Closure

**Goal:** Close every genuine gap from the slice-1 evidence review — 7 targeted fixes that bring the codebase to full acceptance criteria for GAP-01 through GAP-08. The comorbid ADHD + dyslexia student is the modal user; Phase 1 already has substantial infrastructure (migration 0005, scorer, checklist templates, accessibility prefs, breadcrumb, onboarding) but seven specific acceptance-criteria misses remain.

**What it delivers:**
- Lexend font actually loaded via `next/font/google` (GAP-01)
- 4th onboarding step: class-count picker + `class_count_hint` column (GAP-02)
- `pivot_note` + `parent_assignment_id` columns on assignments (migration 0006) (GAP-03 + GAP-06/07)
- `task_signals` recency index + scorer reads signals with 2h/8h decay (migration 0007 + GAP-08)
- Vitest setup with 4 GAP-08 unit tests covering dyslexia weighting and signal recency
- TimeBar formula corrected to `(due - now) / (due - created)` with 1h fallback floor (GAP-05)
- Custom add/remove checklist items on submit page (GAP-04)
- Past-due reframe with "Create a 5-min task" button + `createMicroTask` action (GAP-06)
- Pivot transition with inline form + `pivotAssignment` action + auto-focus on Breadcrumb after todo→drafting (GAP-07)

**Requirement IDs:** GAP-01, GAP-02, GAP-03, GAP-04, GAP-05, GAP-06, GAP-07, GAP-08

**Evidence basis:** `docs/review/slice-1-evidence-review.md` §3–§7, `02-RESEARCH.md` codebase-direct verification.

**Plans:** 4 plans in 4 waves (wave 2 + wave 3 run in parallel)
- [x] 02-01-PLAN.md — Schema migrations (0006 + 0007), Vitest setup, types.ts sync
- [x] 02-02-PLAN.md — Scorer extension: RecentSignal type + signal-recency decay + 4 unit tests + dashboard wiring
- [x] 02-03-PLAN.md — Low-risk UI: Lexend font load, onboarding class-count step (+0008 migration), TimeBar formula fix, custom checklist add/remove
- [x] 02-04-PLAN.md — New UI logic: createMicroTask + past-due button, pivotAssignment + PivotForm, breadcrumb auto-focus + "You left off here" callout

**Phase 2 STATUS: COMPLETE** — All 8 GAPs closed. Run `/gsd:verify-work` before starting Phase 3.

---

## Phase 3: Capture + Time Layer (Slice 2)

**Goal:** Zero-friction task capture and time-blindness core features.

**What it delivers:**
- F4: Universal capture inbox (voice, photo, text; offline queue)
- F5: Time-blindness aids (calibrated estimates, "what's left tonight" budget view)
- F14: Implementation-intention prompts on task creation

**Requirement IDs:** F04, F05, F14

**Plans:** 4/4 plans complete
- [x] 03-01-PLAN.md — Schema migration 0009 + lib/inbox types + offline queue + time-budget compute + calibration libs (with 13 unit tests)
- [x] 03-02-PLAN.md — Capture inbox UI: /quick-add CaptureForm (voice/photo/text tabs + offline drain), /inbox list + detail, classify-inbox Edge Function
- [x] 03-03-PLAN.md — Time budget: TimeBudget dashboard section, time_log open/close in transitionAssignment, calibration hint in NewAssignmentForm
- [x] 03-04-PLAN.md — Implementation-intention prompt: IntentionPrompt component, saveIntention action, ?intent=new redirect from form

---

## Phase 4: Dyslexia Reading Layer (Slice 3) — COMPLETE

**Goal:** Full TTS + comprehension scaffolds + reading typography.

**What it delivers:**
- F6: TTS everywhere with sync word highlighting
- F7: Reading comprehension scaffolds (pre/mid/post)
- F19: Evidence-backed reading typography defaults (Atkinson Hyperlegible, line height, spacing)

**Requirement IDs:** F06, F07, F19

**Plans:** 3/3 plans complete
- [x] 04-01-PLAN.md — Migration 0010 (reading_font column) + pure TTS utility functions (tts-utils.ts) + profileBodyClass extension + 13 unit tests
- [x] 04-02-PLAN.md — Font loading (Atkinson Hyperlegible Next + OpenDyslexic in layout.tsx) + reading-view CSS typography + useTtsHighlight hook + TtsHighlightButton component
- [x] 04-03-PLAN.md — ReadingPanel component + reading-scaffold Edge Function + assignment detail wiring + Settings font picker

**Phase 4 STATUS: COMPLETE** — F06/F07/F19 delivered. Verified 2026-05-29.

---

## Phase 5: Notes + Study Layer (Slice 4) — COMPLETE

**Goal:** In-class note-taking and spaced repetition.

**What it delivers:**
- F8: Note-taking with audio + AI transcript + outline scaffold
- F12: FSRS-5 spaced repetition flashcards

**Requirement IDs:** F08, F12

**Plans:** 3/3 plans complete
- [x] 05-01-PLAN.md — Migration 0011 (notes + flashcards + flashcard_reviews) + Supabase types sync + lib/fsrs (FSRS-5 algorithm with 10 unit tests) + lib/notes/types + useAutoSaveNote hook (30 s debounce, 6 unit tests)
- [x] 05-02-PLAN.md — Notes UI: /notes list, /notes/new editor (VoiceTextarea + 30 s auto-save), /notes/[id] detail (TTS playback of transcript + outline), transcribe-note Edge Function (Sonnet 4.6)
- [x] 05-03-PLAN.md — Flashcards UI: /flashcards deck (due today + coming up), /flashcards/new manual card form, /flashcards/[id]/review session (flip + Again/Hard/Good/Easy → schedule + flashcard_reviews log), dashboard DueCards tile + Study nav item

**Phase 5 STATUS: COMPLETE** — F08/F12 delivered. Verified 2026-05-29.

---

## Phase 6: AI Feature Core (Slice 5) — COMPLETE

**Goal:** Full AI feature suite with integrity safeguards.

**What it delivers:**
- F9: Math step organizer (Socratic, no answer-giving)
- F10: Writing aids — explain the rule, don't fix it
- F11: Citation generator
- F15: Authorship log
- F16: Per-class AI traffic-light
- F17: Refuse-with-redirect
- F18: Frustration escape valve (intentional spec divergence — break + talk-through instead of worked example; see 06-01 objective)
- Per-user AI cost ceiling (daily token budget)
- Content safety layer for minors in study-buddy chat

**Requirement IDs:** F09, F10, F11, F15, F16, F17, F18, AI-SAFETY-01

**Plans:** 4/4 plans executed — COMPLETE
- [x] 06-01-PLAN.md (wave 1) — Migration 0012 (classes.ai_mode, ai_interactions, profiles token budget) + lib/ai/{safety,refuse-redirect,frustration,system-prompts} + supabase/functions/_shared/ Deno mirrors (23 unit tests) + F18 spec-divergence decision note
- [x] 06-02-PLAN.md (wave 2, parallel with 06-03) — F16 per-class AI mode settings page + un-hardcode assignment detail + F15 /settings/ai-history with CSV export + amber TokenBudgetBanner on dashboard
- [x] 06-03-PLAN.md (wave 2, parallel with 06-02) — F09 math-step (Haiku 4.5) + F10 writing-aid (Sonnet 4.6) + F11 citation-gen (Haiku 4.5) Edge Functions ONLY (F17 + F18 system prompts injected via shared module)
- [x] 06-04-PLAN.md (wave 3, depends on 06-01 + 06-02 + 06-03) — ai-tools-actions.ts (three server actions) + math-helper.tsx / writing-aid.tsx / citation-tool.tsx client components + assignment detail conditional rendering with single classAiMode binding + manual smoke-test checkpoint

**Phase 6 STATUS: COMPLETE** — F09/F10/F11/F15/F16/F17/F18/AI-SAFETY-01 delivered. Verified 2026-05-29.

---

## Phase 7: Polish + Tier 2 (Slice 6)

**Goal:** Timer, tone polish, and Tier 2 stretch features.

**What it delivers:**
- F13: Configurable timer with Premack rewards
- F20: Tone and copy audit (full codebase scan against banned patterns)
- Tier 2 stretch: subject-specific templates (DBQ, CER, 5-para), reading-load view, body-doubling mode

**Requirement IDs:** F13, F20, T2-01, T2-02, T2-03

**Plans:** 3/3 plans executed — COMPLETE
- [x] 07-01-PLAN.md — F20 tone audit script + F13 pure timer state machine + React hook
- [x] 07-02-PLAN.md — T2-01 assignment templates (migration 0013 + DBQ/CER/5-para seeds + /assignments/new picker) + T2-02 reading-load dashboard toggle
- [x] 07-03-PLAN.md — F13 timer UI (ring progress, Premack reward, ambient sound, localStorage) + T2-03 body-doubling mode + dashboard quick-start + nav update

**Phase 7 STATUS: COMPLETE** — F13 + F20 + T2-01 + T2-02 + T2-03 all delivered. v1.0 milestone complete. Verified 2026-05-29 — 5/5 must-haves verified, 92 tests pass, TypeScript clean. v1.0 milestone ACHIEVED.

### Phase 8: Provider Wiring + Scorer Interleaving + Intentions Evening Trigger

**Goal:** [To be planned]
**Requirements**: TBD
**Depends on:** Phase 7
**Plans:** 3/3 plans complete

Plans:
- [x] TBD (run /gsd:plan-phase 8 to break down) (completed 2026-05-29)

---

## Phase 9: Perfect Score Initiative — Academic Engine + AI Transparency + LMS + Ecosystem

**Goal:** Achieve 90+/100 on the product scorecard by delivering all remaining high-impact features in one consolidated phase: task breakdown, smart reminders, wins feed, AP Math depth, LMS integration, calendar view, AI transparency, parent/teacher sharing, and final polish.

**What it delivers:**

*Wave 1–2 (Academic Engine):*
- F6: AI task breakdown — splits any assignment into ≤15-min atomic steps via Claude Haiku
- F7: Smart reminders — in-app dashboard banner; quiet-hours-aware, no-weekend rule
- F8: Wins feed — calm, shame-free log backed by existing task_signals; no streak language
- AP Math depth: formula reference panel + worked-example Edge Function

*Wave 3 (LMS + Calendar):*
- F15: Calendar imports — Google Classroom OAuth, Canvas API token, .ics URL; due dates land in assignments automatically
- F9: Calendar/week view — 7-day grid with workload-weight bars; highlights overloaded days

*Wave 4 (AI Transparency):*
- Authorship log surfaced to student — visible on every assignment detail
- AI-explained tooltip on AI-generated outputs — one-tap explanation
- AI literacy onboarding step — 30-second explainer in onboarding flow

*Wave 5 (Ecosystem + Polish):*
- F13: Parent share — student-initiated weekly read-only summary; explicit consent toggle
- F14: Teacher snapshot — one-page IEP/504 status doc; student-controlled share link
- Dark mode toggle surfaced in onboarding and Settings
- Vocabulary hover — plain-language word definition (Claude Haiku, respects AI traffic light)

**Requirement IDs:** F6, F7, F8, F9, F13, F14, F15, AI-LITERACY-01, AI-LITERACY-02, F20-POLISH

**Depends on:** Phase 8

**Plans:** 3/9 plans executed
- [x] 09-01-PLAN.md — F6 AI task breakdown (wave 1)
- [x] 09-02-PLAN.md — F7 reminder banner (wave 1)
- [x] 09-03-PLAN.md — F8 wins feed (wave 1)
- [ ] 09-04-PLAN.md — AP Math depth (wave 2, after 09-01)
- [ ] 09-05-PLAN.md — F15 LMS import: Google Classroom + Canvas + .ics (wave 3)
- [ ] 09-06-PLAN.md — F9 calendar week view (wave 3, parallel with 09-05)
- [ ] 09-07-PLAN.md — AI Transparency: authorship log UI + AI-explained tooltip + literacy onboarding (wave 4)
- [ ] 09-08-PLAN.md — F13 parent share + F14 teacher snapshot (wave 4, parallel with 09-07)
- [ ] 09-09-PLAN.md — Final polish: dark mode onboarding + vocabulary hover (wave 5)

---

*Roadmap bootstrapped from `docs/spec/features.md` and `docs/review/slice-1-evidence-review.md` on 2026-05-28.*
*Phase 2 plans expanded 2026-05-28.*
*Phase 3 plans created 2026-05-29.*
*Phase 4 plans created 2026-05-29.*
*Phase 4 verified complete 2026-05-29.*
*Phase 5 plans created 2026-05-29.*
*Phase 5 verified complete 2026-05-29.*
*Phase 6 plans created 2026-05-29.*
*Phase 6 plans revised 2026-05-29 — split 06-03 into 06-03 (Edge Functions) + 06-04 (UI/actions/page wiring) to resolve scope/dependency blockers; added F18 decision note.*
*Phase 6 verified complete 2026-05-29 — 8/8 must-haves verified, 74 tests pass, TypeScript clean.*
*Phase 7 plans created 2026-05-29.*
*Phase 7 verified complete 2026-05-29 — 5/5 must-haves verified, 92 tests pass, TypeScript clean. v1.0 milestone ACHIEVED.
*Phase 9 plans created 2026-05-29 — 4 plans in 2 waves (09-01/02/03 parallel; 09-04 sequenced after 09-01 to avoid LogParams.feature union merge collision).*
