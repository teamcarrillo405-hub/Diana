# Diana — System Self-Assessment & Design Direction (2026-06-09)

The question this answers: what's missing, what isn't working, what we can take from
competitors for free, and how the logic gets strong enough to wow parents, students,
and teachers — for teens with learning differences specifically.

---

## 1. UI/UX self-assessment — what's missing and what isn't working

### Fixed this session
| Was broken | Now |
|---|---|
| Rubrics were a text blob students couldn't act on | Structured rubric engine: assignment-overrides-class resolution, criteria with points, private self-check with a "highest-value criterion next" pointer (`lib/rubric/`, `RubricPanel`) |
| Grades were never read at all — Canvas sync imported due dates only | Read-only Canvas grade pull + insight engine: per-class snapshot, calm trend words (rising / steady / settling), top-3 recovery moves ranked by points recoverable (`lib/grades/`, `/grades`) |
| Onboarding was one long 5-section form | Step-by-step wizard: one question per screen, progress bar, required core (brain profile + year), gentle skips elsewhere, AI-literacy step retained |
| Onboarding theme picker silently did nothing | Fixed last session; done page now also offers accent personalization |

### Still missing / not working (honest)
1. **No first-week journey.** After onboarding the student lands on an empty dashboard.
   "Nothing on deck" + two buttons is calm but cold. Missing: a guided first run —
   connect Canvas → watch assignments appear → see your first "next 5 minutes."
   The wow moment for all three audiences is *imported work becoming one clear move*;
   today the student has to assemble that themselves.
2. **Parents have a read-only page, not a story.** `/parent-share` shows status; it doesn't
   show *growth* ("3 weeks of on-time turn-ins", "reading stamina up"). Parents are wowed
   by trajectory, not snapshots.
3. **Teachers can't see the system working.** The authorship log exists but a teacher-facing
   "how this student used AI on this assignment" receipt (opt-in, student-controlled) is the
   single feature most likely to win teacher trust — it's built (authorship data) but not packaged.
4. **The rubric self-check doesn't yet talk to the AI helpers.** Checking "Thesis statement"
   should offer "want to look at your thesis against this criterion?" → study-buddy prefilled
   with that criterion as the source anchor. The data is now structured; the bridge isn't built.
5. **Grade insights aren't on the dashboard.** `/grades` exists, but the "one recovery move"
   belongs inside the next-5-minutes ranking (a missing 50-pt essay should outrank a 5-pt worksheet).
6. **No native mobile feel yet** — PWA is solid but teens live on phones; haptics, share-sheet
   capture, and widget-style glanceability are the gap to "feels like a real app."

## 2. Free from competitors / open ecosystems — adopt in the backend

Already in: **FSRS-5** (the published Anki algorithm — better than Quizlet's SM-2 lineage),
**LanguageTool** (open-source grammar), local algorithm visualizers, Mermaid-source diagrams.

Worth adopting next (all free):
- **Canvas REST API** (open spec) — now used for grades/submissions; also exposes
  `rubric_settings` + full criterion/rating JSON (richer than the flattened text we import — next step is storing `rubrics.parsed` jsonb, the column already exists).
- **OpenStax** (CC-licensed textbooks) — free aligned reading passages per subject for the
  reading scaffold, instead of AI-generating explainer text (cheaper + citable).
- **Khan Academy's published pedagogy** (mastery learning, "struggle is good" prompts) and
  **ChatGPT Study Mode's published system-prompt patterns** — both are public; our Socratic
  prompts can borrow their best moves at zero cost.
- **UDL Guidelines (CAST, free)** — map every accommodation feature to a UDL checkpoint;
  this is the credibility language IEP teams and districts speak. Doc-level work, high wow for schools.
- **Pyodide** (real Python in the browser, MIT) — upgrade the Python-lite runner.
- **Evidence-based learning science** (free, public): retrieval practice, spacing, interleaving
  (already implemented), worked-example effect, dual coding — cite them in teacher/parent-facing
  docs so the methodology is legible, not just present.

## 3. The methodology — stronger logic for LD teens + original thought

The spine (each stage now has real machinery):
1. **Capture** without friction (voice, photo, share-sheet, quick capture).
2. **One move** at a time (next-5-minutes scorer; energy/mood-aware; dyslexia 1.6× reading
   weight; interleaving).
3. **Scaffold, never substitute** (Socratic-only helpers; final-work refusal; ghost text
   only on explicit acceptance; authorship receipts).
4. **Check against the target** (NEW: rubric self-check — the student compares *their own work*
   to the teacher's criteria; Diana points at the highest-value criterion, never grades).
5. **Close the loop** (NEW: grade insights — scores become recovery moves, trends stay calm).
6. **Remember** (FSRS spaced repetition seeded from the student's own notes/sources).

Original-thought protection is structural, not a prompt nicety: source anchors force AI help
to ground in the student's materials; the ownership meter and authorship log make the ratio
visible; rubric self-check keeps judgment with the student. The next strengthening move:
**idea-first drafting** — before any writing help, Diana asks for the student's one-sentence
take and anchors all subsequent help to it.

## 4. Rubric logic (built this session) — how it resolves
```
assignment.rubric_text  (teacher-set or Canvas import)   ← wins
  else assignment.rubric_id → rubrics.raw_text           (linked class rubric doc)
  else newest rubrics.raw_text for the class             (class default)
  else no panel (never an empty scold)
```
Criteria parse from Canvas lines, bullets, numbered lists, prose lines; points extracted when
present; coverage is points-weighted when every criterion is weighted. The self-check is
private (browser-local) by design — a rubric is a mirror, not surveillance.

## 5. Canvas vs Canva (clarification)
Built now: **Canvas LMS** deepening (grades, submissions, course scores — read-only).
If **Canva (design tool)** is also wanted: the right shape is Canva Connect API (OAuth) —
"Turn these notes into a presentation draft" (Diana outline → Canva design) and pulling a
student's Canva designs into the Portfolio. Real wow for visual learners; needs a Canva
developer app + keys. Say the word and it goes on the roadmap as its own phase.

## 6. Wow map
- **Student**: capture → one clear move → helper that talks like a peer → visible proof the
  work is theirs. (Core loop shipped; first-week journey is the gap.)
- **Parent**: growth story + privacy guarantees + "AI that can't do the work for them."
  (Data exists; narrative page is the gap.)
- **Teacher**: rubric-aligned effort + authorship receipts + aggregate class signals without
  surveillance. (Authorship data exists; teacher packaging is the gap.)

## 7. Recommended build order (next sessions)
1. First-week guided journey (connect → import → first move) — biggest wow per effort.
2. Grade recovery moves into the dashboard scorer (points-weighted urgency).
3. Rubric criterion → study-buddy bridge (criterion as source anchor).
4. Parent growth story page; teacher authorship receipt page (both from existing data).
5. Structured Canvas rubric JSON into `rubrics.parsed` (column already exists).
6. Pyodide + OpenStax adoption; UDL mapping doc.
7. Canva Connect integration (pending the call above).
8. Live teen testing — still the only honest scoreboard for "wow."
