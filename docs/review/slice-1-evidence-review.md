# Slice 1 evidence review

Date: 2026-05-28
Reviewer: in-session analysis
Scope: the working code in slice 1 (F1/F2/F3 + foundations) plus the planned slices 2–6 surface.

This review is deliberately critical. The goal is to identify what's evidence-backed, what's incomplete, and what's missing — specifically for **high-school students with ADHD and/or dyslexia**, where the two often co-occur (≈25–40% comorbidity).

---

## 1. What is well-grounded in the current build

| Design choice | Evidence base |
| --- | --- |
| One task on screen at a time (F3 dashboard) | Reducing working-memory load is a core ADHD intervention principle (Barkley). |
| State machine externalizes task progress (F2) | Externalizing executive function is the most robust ADHD accommodation in the research. |
| Mandatory pre-submit checklist (F2) | Counters the impulsive-submit failure mode at the moment of highest risk; aligns with Gollwitzer's implementation-intentions work. |
| Deadline + momentum + energy ranking (F3) | Maps to present-bias and future-discounting findings in ADHD. |
| DOB age gate before AI features | COPPA-aligned, ethically correct for under-13. |
| Calm visual language (no red, no exclamations) | Aligns with shame-reduction practice; preserves agency. |
| Quiet hours / weekend silence (F7, planned) | Right principle. Not yet built. |

## 2. Where the logic is incomplete or wrong

1. **The energy picker is too coarse.** Three buttons (low / ok / high) flatten at least three independent dimensions: arousal/focus state, medication timing window, and rejection-sensitive dysphoria (RSD) state. A low-energy student in an RSD spiral needs a different next-task suggestion than a low-energy student who's just tired. The slice-1 scorer cannot distinguish them.
2. **Reading load is invisible to the scorer.** A 30-minute reading-heavy task and a 30-minute math task get identical scores, but for a dyslexic student the reading task may take 90+ minutes and cost 3× the cognitive effort. We need `reading_load` and `writing_load` attributes on assignments, not just `estimated_minutes`.
3. **No interrupt-recovery affordance.** Context-switching is the single highest-cost event in ADHD work. The state machine tracks that you're `drafting` but stores no breadcrumb of *what you were thinking*. The "where was I?" failure costs ADHD students 10–25 minutes per interruption (Mark, UC Irvine).
4. **Time blindness isn't actually mitigated.** "Due in 3 days" is a string, not a felt duration. Visual time representations (analog clock face, depleting bar, calendar-density heatmap) have evidence behind them for ADHD.
5. **Shame management is stubbed (F11, slice 4) but should be a slice-1 invariant**, not a feature. Currently, a past-due task surfaces "past due" in a muted pill — that's good — but there's no positive-action reframe ("smallest next step here?") and no built-in "I'm avoiding this" recovery flow.
6. **The submission checklist is generic and hardcoded.** Six items in `actions.ts` for every assignment. Real use needs the checklist to be (a) per-class — driven by the rubric, (b) per-assignment-kind — lab ≠ essay ≠ problem set, and (c) per-accommodation profile — a dyslexic student needs "spell-check by a human, not just autocorrect" because autocorrect substitutes real words for phonetic misspellings.
7. **No pivot transition.** ADHD students often realize 20 minutes into a task that they're working on the wrong assignment. The state machine has no "pivot" affordance.
8. **The "started" signal is recorded but unused.** `task_signals` rows are inserted but the scorer doesn't yet read them — meaning the "momentum bump" exists in code (`+25` for `drafting`/`checking`) but ignores recency, duration, or rebound after a switch.

## 3. Dyslexia gaps (the largest hole in slice 1)

Slice 1 contains essentially zero dyslexia accommodation. Concrete missing pieces:

- **No text-to-speech anywhere.** Rubrics, descriptions, checklist items all render as walls of plain text. TTS is the single highest-impact, lowest-cost dyslexia accommodation. The Web Speech API is browser-native, no server cost.
- **No font / spacing controls.** F20 (Accessibility profile) is stubbed for slice 6. A dyslexia-leaning typeface (Lexend, or at least 1.5× line height + 16px+ + off-white background) should ship in slice 1.
- **No speech-to-text input.** Description fields, the rubric paste box, and the upcoming study-buddy chat all assume keyboard input.
- **No structured rubric view.** Pasted rubric is stored as raw text and displayed verbatim. A dyslexic student can't parse a continuous-prose rubric. Even before AI parsing, a numbered + bulleted + color-banded display would help.
- **Spell-check awareness in the submission checklist.** Autocorrect-only is a known dyslexia failure mode (it substitutes a real word that's not the intended one — *"defiantly"* for *"definitely"*).
- **No color-overlay / reading-ruler.** Well-evidenced for the visual-stress (Meares-Irlen) subset.

ADHD + dyslexia co-occur in ≈25–40% of cases. Treating them as separable populations is wrong; the comorbid student is the modal user, not the edge case.

## 4. High-school-specific gaps

- **Multiple teachers, conflicting deadlines, conflicting feedback styles.** No model for cross-class load balancing or detection of "Sunday-night cliff" weeks.
- **Exam vs. assignment cadence.** A calc test (study-over-time) and a 4-week essay (drafts-over-time) can't share the same state machine without modification.
- **AP / honors workload reality.** `estimated_minutes` caps at 600; some real assignments are 20+ hours over weeks and need a sub-task model.
- **IEP / 504 accommodation modeling.** Extended time, reduced-quantity, alternate-format. Not represented in the schema. Should be on `profiles`.
- **Parent visibility tension.** Teen autonomy vs. parent need to see progress. F13 (parent share) is stubbed, but the *consent UI for a 13–17 user* is non-trivial and needs design before code.
- **Medication windows.** Many HS students on stimulants have a 4-hour peak focus window; an opt-in input that lets the scorer prefer harder tasks during it would be high-leverage. Sensitive — must be opt-in, never inferred.
- **Onboarding currently asks nothing.** Email + password + DOB only. No way to personalize anything in slice 1 because we don't know if the user has ADHD, dyslexia, both, or neither.

## 5. AI incorporation: gaps in the plan

The ai-ethics doc states the values clearly. The architecture for *how* to enforce them is missing.

- **No model-selection policy.** Should default to Claude Haiku 4.5 for routine work (rubric parse, checklist generation, task breakdown). Sonnet 4.6 only for harder reasoning (study buddy). Currently undefined.
- **No per-user cost ceiling.** `ai_calls.cost_micros` is in the schema but nothing enforces a daily / monthly cap. Needed before launch — runaway tool-loops happen.
- **No content safety layer for minors.** Study-buddy chat (F5) needs a safety filter and self-harm / eating-disorder detection before it ships to 13–17 users.
- **AI feedback modality is asserted but not specified.** "Socratic Q&A that won't write your essay" is the right principle, but no spec for *how* the model is constrained. Concrete proposal: three response modes only — (a) ask a clarifying or Socratic question, (b) show a worked example on an unrelated problem, (c) flag a knowledge gap. Never produce essay prose.
- **No prompt-caching strategy.** Per-user rubric + accommodation context will dominate token cost. Should be cached.
- **No audit-trail UI.** The `ai_calls` table exists; nothing surfaces it to the user (or, for 13–17 accounts, to the parent if shared).

## 6. Schema gaps implied by everything above

```sql
-- profiles (additions)
onboarded_at timestamptz
diagnoses text[]                    -- ['adhd','dyslexia',...]
accommodations text[]               -- ['extended_time',...]
school_year smallint                -- 9..13
extra_time_pct smallint             -- 0..100
font_size text                      -- 'small'|'normal'|'large'|'xlarge'
line_spacing text                   -- 'compact'|'normal'|'loose'
dyslexia_font boolean
reduced_motion boolean
high_contrast boolean
tts_enabled boolean

-- assignments (additions)
kind text                           -- 'essay'|'lab'|'problem_set'|...
reading_load smallint               -- 0..5
writing_load smallint               -- 0..5
last_thought text                   -- breadcrumb for interrupt-recovery
```

## 7. Recommendations, ranked by leverage

1. **Pull accessibility profile forward to slice 1** (don't wait for slice 6). Font size, line height, dyslexia font, TTS toggle, voice input on textareas. Mostly client-side, zero AI cost, unblocks the entire dyslexic user base. ETA: 1 day.
2. **Add onboarding flow** that asks for diagnoses, accommodations, school year, class load. Drives all downstream personalization. ETA: half a day.
3. **Extend assignment schema** with `kind`, `reading_load`, `writing_load`, `last_thought`. Update the create form, the detail page, and the scorer to factor reading load against dyslexia profile. ETA: half a day.
4. **Per-kind checklist templates** (essay vs. lab vs. problem set vs. presentation vs. test prep vs. generic). Static map in `lib/checklists/templates.ts`; can be AI-parsed from rubric in slice 2.
5. **Time-blindness visualization** on the dashboard (a depleting bar for the top task; analog-style countdown).
6. **Past-due reframe**: replace the "past due" pill with a "smallest next step?" prompt that creates a 5-minute micro-task.
7. **Pivot transition** + **breadcrumb prompt on `started`** ("where will you start?") — captured into `last_thought`, displayed on return.
8. **Then** slice 2 AI work, with the budget cap + audit trail wired from day 1.

## 8. What this means for the answer to the headline questions

- **"Is the logic sound and grounded in best scientific practices?"** Partially. The pieces that exist are well-chosen and evidence-backed for ADHD specifically. The gap is on dyslexia (essentially nothing implemented) and on high-school context (no accommodation model, no multi-class load balancing, no exam handling).
- **"Does it identify specific solutions, not just barriers?"** Where it acts, yes — the state machine, checklist, and one-task-at-a-time framing all *are* the solutions. Where it doesn't act yet (dyslexia, shame-reframe, interrupt-recovery, time-blindness), there are no solutions in code.
- **"Do all the processes work?"** Yes — F1, F2, F3 work end-to-end against a live database with RLS. The PWA shell, auth gating, and DOB age gate all work.
- **"Have we identified all the gaps for the HS learner?"** This document is the attempt. The gaps above are real and addressable; recommendations §7 prioritize them.
