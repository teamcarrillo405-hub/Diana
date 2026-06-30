# Diana — Per-Tab Deep-Dive Spec

Companion to `NAVIGATION.md`. That file locks *what the tabs are*; this file specs *what each tab is for, what's inside it, and what the AI agent needs to do its job there*.

Tabs: **TODAY · WORK · CLASSES · CALENDAR · MORE**

Each tab below follows the same shape:
- **Purpose** — the one job
- **The moment** — when/why a student opens it
- **Routes** — pages under this tab
- **Sections** — what's on the page
- **Data sources** — tables/queries behind it
- **AI agent role** — what Diana reads, does, and produces here; the content she needs
- **Gaps / net-new** — what's missing today

A cross-cutting rule appears throughout: **per-class AI mode** (`classes.ai_mode` = green / yellow / red) gates what the agent may do. Green = full help, Yellow = citations only, Red = AI off. Every agent surface must read this before acting.

---

## TODAY — `/dashboard`

**Purpose.** The glance. "What is happening right now and what's my one next move." Lowest-effort entry; a student should get value in 5 seconds without scrolling.

**The moment.** Opening the app cold. Morning check, between classes, or "I have 10 minutes."

**Routes.** `/dashboard` only. No sub-pages — it's a launcher into the other tabs.

**Sections.**
- LobbyHero — player photo cutout, weekly XP bar, energy-check entry, (game-day banner — currently mock)
- ReminderBanner — overdue / due-soon nudge (calm, never shaming)
- ClassesGrid — the class cards (entry into the Classes tab hub)

**Data sources.** `assignments` + `task_signals` (completions this week, started signals), latest `mood_checkin` signal, `classes` (+ per-class needs-attention counts), `profiles` (photo, accommodations).

**AI agent role.**
- *Reads:* ranked assignment list (`rankAssignments`), recent signals, energy/mood, reminder rules.
- *Produces:* the single "next move" surfaced in the hero, and the reminder nudge copy.
- *Content it needs:* current energy level, accommodations (extra-time, reduced quantity), due windows. Ranking is **heuristic** (`lib/scoring/next-five-minutes.ts`), not a model call — that's fine for a glance.
- Today is **read-only for the agent** — no capture, no generation. It summarizes; it doesn't act.

**Gaps / net-new.**
- Weekly XP is a relabeled completion ratio; "game day" is hardcoded mock. Decide: build a real progress/streak model, or drop the game-day tile.
- Energy tile in the hero is static display; the live picker lives on the Notes/Classes surface — reconcile so the hero tile actually opens the picker.

---

## WORK — `/assignments`

**Purpose.** The cross-class "do it now" board. Not about browsing subjects — about turning a pile of work into one startable action, then the next.

**The moment.** "I need to get something done." Sitting down to a work session.

**Routes.**
- `/assignments` (Mission Board)
- `/assignments/new` (add — folds in `/templates` as starting structures)
- `/assignments/[id]` (detail: checklist, break-down, submit)
- `/assignments/[id]/submit`
- `/voice` (Talk to Diana — general agent, prominent here)
- `/inbox` + `/inbox/[id]` (capture triage — reachable from here and the Capture button)
- **Study tools section** (new on this page): `/timer`, `/body-double`, `/flashcards`, `/break-down`

**Sections.** Start-now panel · metrics tiles · capture-inbox strip · time budget + due cards + reading-load toggle · Talk-to-Diana CTA · priority lanes (Due soon / Needs proof / Study-test-prep / Later) · study-tools row.

**Data sources.** `assignments` (+ `classes` join), `task_signals` (recent started/completed), `flashcards` (due cards), `profiles` (accommodations for time budget), `inbox_items`.

**AI agent role.**
- *Break-down* (`/api/diana/break-down`): takes an assignment prompt → Socratic, visible next moves. **Needs:** the assignment's full prompt/description, the class rubric, and the per-class AI mode (Red = refuse).
- *Voice* (`/api/diana/voice-candidate`): general agent; turns spoken input into a suggested next move / capture. **Needs:** current open work + class list to ground suggestions.
- *Ranking/time-budget:* heuristic, energy- and accommodation-aware.
- *Content the agent needs here:* assignment text, rubric, due date, estimated minutes, energy, accommodations, and AI mode gating.

**Gaps / net-new.**
- Confirm `/api/diana/break-down` is model-backed vs. template.
- Study-tools section doesn't exist yet (pages do).
- `/focus` and `/shame-mode` retire into this surface (Start-now panel already does focus's job; shame-mode could return as a calm "one thing" *toggle*).

---

## CLASSES — `/classes` → `/classes/[id]`

**Purpose.** The spine of the product. The *class* is the organizing unit; everything a student knows about a subject lives in its hub. Replaces the abstract "Think" tab.

**The moment.** "I'm working on Biology" / "what's going on in this class" / "where are my chem notes."

**Routes.**
- `/classes` (all class lanes overview)
- `/classes/[id]` (the subject hub)
- `/classes/[id]/settings` (per-class AI mode)
- `/classes/[id]/mastery/export` (mastery PDF)

**The class hub contains (per subject).**
- **Notes** — subject-specific (migrated in from the old standalone `/notes`; this is the home for `study-buddy` Socratic help too)
- **Grades** — Canvas course score + trend (already built)
- **Rubrics / rulebricks** — teacher rules parsed into checkable moves
- **Syllabus (NET-NEW)** — upload/parse → extract key dates, grading policy, late-work policy
- **Assignments** in this class
- **Mastery map** — concepts + confidence + review-next
- **Free sources** — OpenStax
- **AI mode control** — green / yellow / red

**Data sources.** `classes`, `assignments`, `rubrics`, `mastery_concepts`, `notes` (filtered by `class_id`), `lms_connections` + Canvas (grades), `mastery_concepts` seeds derived from notes/assignments/rubrics text.

**AI agent role.** This is the agent's richest surface.
- *Classify captures* into the right class (`classify-inbox`, Haiku vision) — **the photo/voice→class link.**
- *Parse rubrics* into checkable expectations.
- *Seed & update mastery concepts* (currently heuristic `deriveConceptSeeds`).
- *Note synthesis* — connect notes, surface citations.
- *Study-buddy* (`/api/diana/study-buddy`) — Socratic hints scoped to the subject.
- *Syllabus parsing* (net-new) — extract dates/policies into the class.
- **Content the agent needs:** the whole class context bundle — name, teacher, rubrics, syllabus, notes, assignments, mastery state — AND the per-class AI mode, which gates every one of the above (Yellow = citations only; Red = none).

**Gaps / net-new.**
- Notes are not yet moved inside the class hub (still a standalone surface).
- Syllabus feature does not exist — net-new (upload, parse, store, surface).
- Mastery seeding is heuristic; could be upgraded to a model call.
- A global "all notes across classes" search needs a home (proposed: inside the Classes tab).

---

## CALENDAR — `/calendar`

**Purpose.** The "when." See the week's workload shape and spot heavy days before they hit.

**The moment.** Planning ahead. "What's my week look like?" / "when is everything due?"

**Routes.** `/calendar` (absorbs the upcoming-list from the retired `/reminders`).

**Sections.** Weekly grid of assignments by day · workload tier per day (light / moderate / heavy, accommodation-aware) · links into assignment detail.

**Data sources.** `assignments` (by `due_at`), `profiles` (accommodations adjust workload tiers), `lib/calendar/week`.

**AI agent role.**
- *Workload balancing / evening planning* — "tomorrow is heavy, start X tonight." (EveningPlanning component, currently on Future.)
- *Content it needs:* assignments with estimates + due dates, accommodations, energy.
- Lighter agent surface — mostly arranging existing data, optional proactive nudges.

**Gaps / net-new.**
- `/reminders` quiet-hours **rules** move to Settings; the **list** merges here — not done yet.
- No true week-over-week comparison ("this week is heavier than last") — net-new if wanted.
- EveningPlanning/QuestCarousel could move here from Future.

---

## MORE — overlay drawer

**Purpose.** One reachable home for everything secondary, so nothing is orphaned. Not a page — an overlay grouped list.

**The moment.** "I need settings / my profile / to share with a parent / see my proof." Intentional, not frequent.

**Grouped contents.**
- **Evidence & growth:** Proof (`/proof`, absorbs `/wins` + `/recap`), Grades (`/grades`), Portfolio (`/portfolio`), Future Path (`/future-path`, absorbs `/ap`)
- **Profile & support:** Me (`/me`), Accessibility (`/accessibility`), Wellness (`/wellness`), Settings (`/settings`)
- **Connections & sharing:** Imports (`/imports`), Export (`/export`), Parent share (`/parent-share`), Teacher share (`/teacher-share`), Study groups (`/study-groups`)
- **Not student-facing:** Insights (`/insights`) = admin only, excluded from this drawer.

**AI agent role.**
- *Proof:* authorship trail / receipts (which AI features were used per assignment) — transparency surface.
- *Parent/Teacher share:* growth summaries (heuristic `lib/portal/growth.ts`), digest emails.
- *IEP import:* parse an IEP/504 → accommodations.
- *Content it needs:* profile, accommodations, authorship logs, completion history.

**Gaps / net-new.**
- The drawer overlay itself doesn't exist yet (More currently just links to `/settings`).
- Merges (wins/recap → Proof; ap → Future) not done.
- Onboarding-completion not enforced (a profile/support gap — see NAVIGATION.md §8).

---

## Cross-cutting: what every AI surface must respect

1. **Per-class AI mode** (`classes.ai_mode`): green/yellow/red. Check before any generation.
2. **Accommodations** (`profiles`): extra-time %, reduced quantity, reading load, dyslexia font — shape ranking, time budgets, and tone.
3. **Energy / readiness** (`task_signals` mood_checkin): low → quick wins; high → hard/long work.
4. **Authorship transparency:** every AI assist should be logged so Proof can show "what Diana helped with" — protects the student's ownership claim.
5. **Calm invariant:** no shame language anywhere — overdue/missing framed as recoverable next moves.

## Open product questions (for discussion)

- **Weekly XP:** build a real progress system (points/streaks/levels) or remove the game framing?
- **Syllabus:** scope of the net-new feature — just store/display, or parse dates into Calendar + policies into the class?
- **Week-over-week:** is this a wanted metric (it doesn't exist), and where would it show — Today, Calendar, or Proof?
- **Global notes search:** inside Classes tab, or a More entry?
- **Landing background:** is per-user background/theming on the public landing actually wanted, or was that an in-app theming question?
