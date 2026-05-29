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

**Plans:** 3/4 plans executed
- [x] 03-01-PLAN.md — Schema migration 0009 + lib/inbox types + offline queue + time-budget compute + calibration libs (with 13 unit tests)
- [x] 03-02-PLAN.md — Capture inbox UI: /quick-add CaptureForm (voice/photo/text tabs + offline drain), /inbox list + detail, classify-inbox Edge Function
- [x] 03-03-PLAN.md — Time budget: TimeBudget dashboard section, time_log open/close in transitionAssignment, calibration hint in NewAssignmentForm
- [ ] 03-04-PLAN.md — Implementation-intention prompt: IntentionPrompt component, saveIntention action, ?intent=new redirect from form

---

## Phase 4: Dyslexia Reading Layer (Slice 3)

**Goal:** Full TTS + comprehension scaffolds + reading typography.

**What it delivers:**
- F6: TTS everywhere with sync word highlighting
- F7: Reading comprehension scaffolds (pre/mid/post)
- F19: Evidence-backed reading typography defaults (Atkinson Hyperlegible, line height, spacing)

**Requirement IDs:** F06, F07, F19

---

## Phase 5: Notes + Study Layer (Slice 4)

**Goal:** In-class note-taking and spaced repetition.

**What it delivers:**
- F8: Note-taking with audio + AI transcript + outline scaffold
- F12: FSRS-5 spaced repetition flashcards

**Requirement IDs:** F08, F12

---

## Phase 6: AI Feature Core (Slice 5)

**Goal:** Full AI feature suite with integrity safeguards.

**What it delivers:**
- F9: Math step organizer (Socratic, no answer-giving)
- F10: Writing aids — explain the rule, don't fix it
- F11: Citation generator
- F15: Authorship log
- F16: Per-class AI traffic-light
- F17: Refuse-with-redirect
- F18: Frustration escape valve
- Per-user AI cost ceiling (daily token budget)
- Content safety layer for minors in study-buddy chat

**Requirement IDs:** F09, F10, F11, F15, F16, F17, F18, AI-SAFETY-01

---

## Phase 7: Polish + Tier 2 (Slice 6)

**Goal:** Timer, tone polish, and Tier 2 stretch features.

**What it delivers:**
- F13: Configurable timer with Premack rewards
- F20: Tone and copy audit (full codebase scan against banned patterns)
- Tier 2 stretch: subject-specific templates (DBQ, CER, 5-para), reading-load view, body-doubling mode

**Requirement IDs:** F13, F20, T2-01, T2-02, T2-03

---

*Roadmap bootstrapped from `docs/spec/features.md` and `docs/review/slice-1-evidence-review.md` on 2026-05-28.*
*Phase 2 plans expanded 2026-05-28.*
*Phase 3 plans created 2026-05-29.*
