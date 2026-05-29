# Diana — Requirements

Sourced from `docs/spec/features.md` and `docs/review/slice-1-evidence-review.md`.  
Gap-closure requirements (GAP-xx) are from the evidence review §7 ranked fix list.

---

## Phase 2 Requirements: Evidence-Review Gap Closure

### GAP-01: Accessibility Profile (Pull Forward from Slice 6) — COMPLETE (02-03)

**Priority:** P0 — unblocks entire dyslexic user base  
**Effort:** ~1 day  
**Evidence:** Slice-1 evidence review §3, §7 #1

Font size, line height, dyslexia-leaning font (Lexend), TTS toggle, voice input on textareas, reduced motion, high contrast must all be configurable from user settings in Phase 2. These are mostly client-side CSS + browser API — zero AI cost.

**Acceptance criteria:**
- `profiles` table has: `font_size text`, `line_spacing text`, `dyslexia_font boolean`, `reduced_motion boolean`, `high_contrast boolean`, `tts_enabled boolean`
- Settings page has a dedicated Accessibility section with controls for each field
- CSS custom properties (`--font-size`, `--line-spacing`) driven by profile values, applied globally
- `dyslexia_font = true` loads Lexend (or at minimum sets `font-family: Lexend, sans-serif`)
- TTS toggle exposed; when enabled, a "Read aloud" button appears on assignment descriptions and checklist items using Web Speech API
- All changes persist to Supabase `profiles` row on save

---

### GAP-02: Onboarding Flow — COMPLETE (02-03)

**Priority:** P0 — drives all downstream personalization  
**Effort:** ~half day  
**Evidence:** Slice-1 evidence review §4, §7 #2

New users currently see email + password + DOB only. We can't personalize anything without knowing ADHD/dyslexia status, accommodations, and school year.

**Acceptance criteria:**
- After signup, a multi-step onboarding flow runs before the main dashboard
- Step 1: "How do you learn best?" — multi-select: ADHD / Dyslexia / Both / Neither / Not sure
- Step 2: Accommodations — multi-select: Extended time / Reduced quantity / Text-to-speech / Speech-to-text / Alternate format / None
- Step 3: School year — picker: 9th / 10th / 11th / 12th / Other
- Step 4: Estimated class load — "How many classes do you have?" (1–8 picker)
- All steps skippable; skipped means null values in `profiles`
- `profiles.onboarded_at` set on completion or skip
- `profiles.diagnoses text[]` and `profiles.accommodations text[]` and `profiles.school_year smallint` stored
- Onboarding only shown once; if `onboarded_at` is not null, redirect to dashboard

---

### GAP-03: Assignment Schema Extension

**Priority:** P1  
**Effort:** ~half day  
**Evidence:** Slice-1 evidence review §2 #2, #3, §6

`assignments` needs `kind`, `reading_load`, `writing_load`, and `last_thought` to enable per-kind checklists, dyslexia-aware scoring, and interrupt-recovery.

**Acceptance criteria:**
- Migration adds to `assignments`: `kind text` (default `'other'`, values: `'essay'|'lab'|'problem_set'|'presentation'|'test_prep'|'reading'|'other'`), `reading_load smallint` (0–5), `writing_load smallint` (0–5), `last_thought text`
- Assignment create/edit form has a "Type" selector for `kind`
- `reading_load` and `writing_load` default to null; editable by student
- `last_thought` is written when student transitions to `in_progress`; displayed on return to the assignment

---

### GAP-04: Per-Kind Checklist Templates — COMPLETE (02-03, custom add/remove)

**Priority:** P1  
**Effort:** ~1 day (static map + UI plumbing)  
**Evidence:** Slice-1 evidence review §2 #6

The six hardcoded generic checklist items in `actions.ts` need to become per-kind templates. A dyslexic student doing an essay needs different checklist items than a student doing a problem set.

**Acceptance criteria:**
- `lib/checklists/templates.ts` exports a `CHECKLIST_TEMPLATES` map keyed by `assignment.kind`
- Templates defined for: `essay`, `lab`, `problem_set`, `presentation`, `test_prep`, `reading`, `other`
- Each template is an array of `{ id, text, evidenceNote? }` items
- The essay template includes "Run spell-check AND read aloud to catch homophone errors" as a distinct step from autocorrect (dyslexia accommodation)
- Assignment detail page loads the template matching `assignment.kind` as the default checklist
- Student can add/remove items from the loaded template; customized state persists in `assignment_checklists` table
- `assignment_checklists` migration: `id uuid, assignment_id uuid, items jsonb, updated_at timestamptz`

---

### GAP-05: Time-Blindness Visualization on Dashboard — COMPLETE (02-03)

**Priority:** P1  
**Evidence:** Slice-1 evidence review §2 #4, §7 #5

"Due in 3 days" is a string, not a felt duration. Visual time representations have evidence for ADHD.

**Acceptance criteria:**
- The top-priority task card on the dashboard shows a depleting progress bar (100% = now, 0% = due date/time)
- Bar color transitions: green (>50% time remaining) → amber (25–50%) → red (<25%)
- A "time remaining" label shows hours/days in human-friendly format: "3 h left", "2 days left"
- Bar is computed from `(due_at - now) / (due_at - created_at)` clamped to [0, 1]
- If `due_at` is null, bar is hidden (not shown as full or empty)

---

### GAP-06: Past-Due Reframe — COMPLETE (02-04)

**Priority:** P1  
**Evidence:** Slice-1 evidence review §2 #5, §7 #6

Past-due tasks currently show a "past due" pill. Shame-management should be a slice-1 invariant, not a later feature. Replace with an actionable reframe.

**Acceptance criteria:**
- Assignments in `done`-but-not-submitted past their `due_at` show: "Still open — want to take a next step?" (not "past due")
- Assignments in `captured`/`planned`/`in_progress` past their `due_at` show: "Still possible — start with 5 minutes?" with a one-tap "Create micro-task" button
- Tapping "Create micro-task" creates a new assignment: `title = "5-min start: [original title]"`, `estimated_minutes = 5`, `kind = 'other'`, linked to original via `parent_assignment_id` (new nullable FK on `assignments`)
- No red color used for past-due states (amber only, per F20 guidelines)
- The phrase "past due" does not appear in any UI string

---

### GAP-07: Interrupt-Recovery Breadcrumb — COMPLETE (02-04)

**Priority:** P2  
**Evidence:** Slice-1 evidence review §2 #3, §7 #7 — 10–25 min recovery cost per interruption (Mark, UC Irvine)

The state machine tracks `in_progress` but stores no "where was I?" breadcrumb. This is the highest-cost context-switch failure for ADHD students.

**Acceptance criteria:**
- When student transitions an assignment to `in_progress` (first time or after leaving), a modal prompts: "Where will you start?" (skippable, one-tap dismiss)
- Student's response (free text or voice) is saved to `assignments.last_thought`
- On returning to an assignment already in `in_progress`, if `last_thought` is not null, the assignment detail page shows a callout: "You left off here: [last_thought]" with a "Still accurate? Update" link
- A "Pivot" button on the assignment detail page allows transitioning from `in_progress` back to `planned` with a note prompt ("What changed?"), stored in a new `assignments.pivot_note text` column
- `pivot_note` migration included with `last_thought` migration (same migration file as GAP-03)

---

### GAP-08: Scorer Reads task_signals + Dyslexia-Aware Weighting — COMPLETE (02-02)

**Priority:** P2  
**Evidence:** Slice-1 evidence review §2 #8; scorer gives `+25` for `drafting`/`checking` but ignores `task_signals` rows and `reading_load`

**Acceptance criteria:**
- The dashboard scorer reads `task_signals` rows for recency: a task with a signal in the last 2 hours gets the momentum bump (`+25`); older signals decay
- If `profiles.diagnoses` contains `'dyslexia'`, the scorer multiplies the effective `estimated_minutes` for assignments with `reading_load >= 3` by 1.6× before scoring *(Note: 1.6× is used — more conservative than initial spec estimate of 1.5×; validated against existing scorer implementation.)*
- Scorer change is unit-tested in `lib/scoring/` with cases: dyslexic profile + reading-heavy task, non-dyslexic + same task, recent signal vs. old signal

---

## Phase 3 Requirements: Capture + Time Layer

### F04: Universal Capture Inbox
One-tap capture from PWA home screen. Voice / photo / text modes. Offline queue. AI classification with confirmation. Latency targets: ≤3s text/voice, ≤8s photo+OCR.

### F05: Time-Blindness Aids
Visual countdown on every assignment. Calibrated time estimates per type. "What's left tonight?" time-budget view. Calibration fires after 3+ data points — tone factual, never scolding.

### F14: Implementation-Intention Prompts
"When/where will you start?" prompt on assignment creation. Skippable. If filled, becomes notification trigger.

---

## Phase 4 Requirements: Dyslexia Reading Layer

### F06: TTS Everywhere
High-quality TTS with word-level sync highlighting. Speed controls. Reader view for any uploaded text. Comprehension prompts every N paragraphs.

### F07: Reading Comprehension Scaffolds
Pre-reading vocab preview. Mid-reading "what just happened?" prompts. Post-reading retrieval. Never assigns a numeric score. Traffic-light aware.

### F19: Evidence-Backed Typography Defaults
Atkinson Hyperlegible default. Line height 1.6. Letter spacing 0.02em. Max line length 70 chars. Off-white background #FAF8F3. Font picker (Lexend, OpenDyslexic, system).

---

## Phase 5 Requirements: Notes + Study Layer

### F08: Note-Taking
Audio + real-time transcript. Mark important / mark confused during recording. AI outline post-recording. Encrypted storage. Delete is one tap.

### F12: FSRS-5 Flashcards
FSRS-5 scheduling. Target retention 90%. Card types: basic, cloze, image, audio. No streaks. Missed-day queue = forgetting-curve picks, not guilt-multiplier.

---

## Phase 6 Requirements: AI Feature Core

### F09: Math Step Organizer — COMPLETE (06-03 + 06-04)
Socratic-only. Validate each step, never reveal next step. Hint ladder → worked example of a *different* problem. Step ledger PDF export.

### F10: Writing Aids — COMPLETE (06-03 + 06-04)
Rule-explain, never auto-correct. Mechanics / style / substance layers by traffic-light. "Read my draft to me" TTS. Authorship log.

### F11: Citation Generator — COMPLETE (06-03 + 06-04)
MLA 9 / APA 7 / Chicago. Rule explanations with each citation. Copy-to-clipboard. Stored per assignment.

### F15: Authorship Log — COMPLETE (06-02)
Every AI interaction logged. Student can view "what I did vs. what Diana did." Export to PDF. Parent/teacher access opt-in only.

### F16: Per-Class AI Traffic-Light — COMPLETE (06-02)
red / yellow / green per class; per-assignment override. Visible badge in class context. Not a security boundary — authorship log is.

### F17: Refuse-with-Redirect — COMPLETE (06-01 + 06-03)
Every refusal includes 2–4 concrete alternatives. Non-judgmental tone. Logged as positive signal.

### F18: Frustration Escape Valve — COMPLETE (06-01 + 06-03)
After 3 Socratic prompts with no progress, proactively offer worked example of an analogous different problem. Student-invokable at any time.
NOTE: spec divergence — offers break + talk-through (not worked example) per 06-01 decision note.

### AI-SAFETY-01: Cost Ceiling + Content Safety for Minors — COMPLETE (06-01 + 06-02)
Per-user daily token budget (`ai_usage_daily` table). Soft cap 200K input / 30K output. Hard cap 500K / 75K — features pause. Content safety filter on study-buddy chat. Self-harm / eating-disorder detection before study-buddy ships.

---

## Phase 7 Requirements: Polish + Tier 2

### F13: Configurable Timer with Premack Rewards
15/20/25/30 min sessions. Movement prompts on breaks. Premack reward chain configurable. No auto-restart, no block-failure penalty.

### F20: Tone and Copy Audit
Full codebase grep for banned copy patterns: "incorrect", "wrong", "you missed", "you forgot", red error colors, streak language, "you're behind". Every UI string passes the tone checklist from `docs/spec/features.md §F20`.

### T2-01: Subject-Specific Templates
DBQ 7-point checklist, CER lab report, 5-paragraph essay, FRQ tagger.

### T2-02: Reading-Load Awareness View
"You have 47 pages queued tonight." Dashboard panel.

### T2-03: Body-Doubling Mode
Silent peer-presence framing. Community, not surveillance.
