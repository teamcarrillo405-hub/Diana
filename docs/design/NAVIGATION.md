# Diana — Navigation Architecture (locked decision)

This is the settled answer to "what are the tabs and what lives where" so it does not get re-litigated or quietly drift. **Read this before changing any navigation, adding a page, or repointing a tab.**

Last restructured: 2026-06-30. Supersedes the earlier 6-tab (TODAY · WORK · THINK · PROOF · FUTURE · MORE) layout.

---

## 1. The format

One navigation system, app-wide: the lobby HUD top bar (full-bleed, cyan underline active state) is the only nav. No left sidebar on any page. No curated middle pages sitting in front of the real ones.

## 2. The tabs (5 top-level destinations)

```
TODAY · WORK · CLASSES · CALENDAR · MORE
```

| Tab | Destination | Active label | Role |
|---|---|---|---|
| TODAY | `/dashboard` | `Today` | At-a-glance: what's happening now |
| WORK | `/assignments` | `Work` | The cross-class "what do I do right now" Mission Board + study tools |
| CLASSES | `/classes` | `Classes` | Per-subject hub — notes, grades, rubrics, syllabus, assignments, mastery |
| CALENDAR | `/calendar` | `Calendar` | The "when" view — week of assignments + workload |
| MORE | overlay drawer | `More` | Everything secondary, grouped (see §4) |

The Capture button (📷 → `/quick-add`) and the Record note button stay in the nav bar's right cluster, outside the tab list. The settings gear also stays in the right cluster as a shortcut into MORE → Settings.

### Change from the previous layout
- **"THINK" is retired as a tab.** It was an abstract label for the Notes surface. Notes now live **inside each class** (matches CLAUDE.md: "within the classes should be the notes specific to the subject"). A global all-notes search may live within the Classes tab.
- **CLASSES is promoted to a top tab** — the class is the organizing unit of the product, so it earns primary placement rather than being buried under Work.
- **PROOF and FUTURE are no longer top tabs.** They move into the MORE drawer. They remain full real pages; they just aren't in the primary 5.
- **CALENDAR is promoted** from an orphaned page to a top tab.

### The class hub (`/classes/[id]`) contains
Per-subject, everything attached to one class:
- Notes specific to this subject (moved in from the old standalone `/notes`)
- Grades (Canvas course score + trend — already added)
- Rubrics / "rulebricks" (teacher rules → checkable moves)
- **Syllabus (NEW feature to build)** — upload/parse a syllabus, extract dates + policies. Does not exist today; rubrics are a separate concept and do not cover it.
- Assignments in this class
- Mastery map (concepts + confidence)
- Free sources (OpenStax)

---

## 3. What each tab contains

### TODAY — `/dashboard`
Home / glance view. Sections: LobbyHero (player photo + quest carousel + game day), ReminderBanner, ClassesGrid.

### WORK — `/assignments`
The schoolwork hub. Sections:
- Mission Board lanes (Start now, Due soon, Needs proof, Study/test prep, Later this week)
- Metrics tiles
- **Capture inbox** strip → `/inbox`
- Time budget + Due cards + Reading-load toggle
- **Talk to Diana** (voice) → `/voice` — prominent, persistent entry point (locked, see §7)
- **Classes** → `/classes` → `/classes/[id]` (subject lane: assignments, rubrics, grade, mastery, free sources, subject notes)
- **Study tools section** (new): Timer, Body-double, Flashcards, Templates, Break-down — surfaced as a visible row on Work, not buried

### THINK — `/notes`
Notes and thinking surface. Sections: note synthesis panel, metric tiles, mood/energy/sleep check-ins, latest capture, search, notes list. Study-buddy (Socratic helper) attaches here.

### CALENDAR — `/calendar`
Weekly view of assignments grouped by day with workload tiers (light/moderate/heavy), accommodation-aware. Absorbs the upcoming-assignments list formerly at `/reminders`.

### MORE — overlay drawer
Grouped list of every secondary destination. See §4.

---

## 4. The MORE drawer (grouped)

The drawer NAVIGATION.md has always promised is now real. It is the single home for everything not in the primary 5. Grouped:

**Evidence & growth**
- Proof — `/proof` (authorship trail, constellation, wins, study artifacts; grades + portfolio links)
- Grades — `/grades` (Canvas grade intelligence)
- Portfolio — `/portfolio`
- Future Path — `/future-path` (college prep, strengths, AP plans, evening planning)

**Profile & support**
- Me — `/me` (learning profile)
- Accessibility — `/accessibility` (reading controls)
- Wellness — `/wellness`
- Settings — `/settings`

**Connections & sharing**
- Imports — `/imports` (LMS: Canvas, Google Classroom, Clever, ICS)
- Export — `/export` (data export + privacy)
- Parent share — `/parent-share`
- Teacher share — `/teacher-share`
- Study groups — `/study-groups`

**Not in student nav**
- Insights — `/insights` is an **admin/internal** analytics surface (token usage, web vitals, error events, feature flags). It is NOT a student destination and must not appear in the student MORE drawer. Keep it reachable by direct URL / a separate admin entry only.

---

## 5. Merge / retire decisions (audit, 2026-06-30)

These pages were found to duplicate a primary surface. Resolve before/while rewiring nav.

| Page | Decision | Rationale |
|---|---|---|
| `/focus` | **Retire** | Duplicates the Mission Board "Start now" panel on `/assignments`. |
| `/shame-mode` | **Retire** | "One calm thing at a time" overlaps Work. May later return as a Work *mode toggle*, not a page. |
| `/wins` | **Merge → `/proof`** | Proof already renders a Wins list. Fold standalone in, then delete. |
| `/recap` | **Merge → `/proof`** | Daily completed/started/upcoming recap belongs with the evidence view. |
| `/reminders` | **Fold out** | Quiet-hours rules → `/settings`; upcoming list → `/calendar`. Then delete the page. |

**Still needing a home (orphans, no inbound nav):** `/templates`, `/parent-share`, `/teacher-share`, `/study-buddy`, `/break-down`, `/study-groups`, `/ap`, `/film` (unknown — investigate). Plus fragile near-orphans `/wellness`, `/accessibility`, `/me` (each one breakable link away from being stranded). Proposed homes: `/ap` → Future; sharing pages → More→Connections; `/templates` → merge into "new assignment"; study-buddy/break-down → see §7.

---

## 6. Implementation status (what still needs wiring)

The map above is the target. Current code reality as of this rewrite:

- `AppTopNav` (`app/(app)/app-top-nav.tsx`) still lists the old 6 tabs and points MORE at `/settings`. **Needs:** new 5-tab list + a real MORE drawer.
- MORE drawer overlay **does not exist yet** — must be built. Until it exists, ~13 pages are reachable only by typing the URL.
- `/classes` has **no inbound nav link** today — Work must link to it.
- Study-tools section on Work **not built yet**.
- Merges/retirements in §5 **not done yet**.

Track these as program-file tasks separate from this doc. This file is the spec; it is intentionally ahead of the code.

---

## 7. Locked sub-decisions (carried forward)

### AI agent placement
`/voice`, `/study-buddy`, and `/break-down` all hit real Diana API routes (`/api/diana/voice-candidate`, `/api/diana/study-buddy`, `/api/diana/break-down`). (Correction: an earlier version of this doc called study-buddy/break-down "heuristic" — they do make real API calls; whether the API itself is model-backed vs. heuristic should be confirmed per route.) `/voice` is the general-purpose agent surface. Confirm each route's backing before relying on it.

### Voice entry point
`/voice` gets a prominent, persistent entry point on the Work page (Mission Board), alongside the Start Now panel. It is a general-purpose AI agent, not tied to a single assignment, so it earns visible Work placement rather than living in the More drawer.

---

## 8. Known process gaps (logic audit, 2026-06-30)

End-to-end traces found several flows that are built but not connected. These are program-file bugs, not design choices.

| Flow | Status | The break | Fix location |
|---|---|---|---|
| **Image capture → classification** | 🔴 Broken mid-pipeline | Photo uploads to `inbox-photos` + creates an `inbox_items` row, but the AI vision classifier (`supabase/functions/classify-inbox`, real Claude Haiku vision) is **never triggered** — `triggerClassification()` has zero callers. Suggestions stay null forever; "Diana read" always empty. | Call `triggerClassification(id)` after `saveInboxItem` succeeds — `app/(app)/quick-add/actions.ts:37` |
| **Top-nav RECORD button** | 🔴 Stub | `LobbyAudioNote` transcribes via Web Speech but **discards the transcript** on save. | `app/(app)/dashboard/lobby-audio-note.tsx:58` (`// TODO: wire to saveQuickCapture`) |
| **`/quick-add` voice tab** | ✅ Complete | Records → OpenAI Whisper → real inbox row. | — |
| **Inbox → assignment confirm** | ✅ Complete | Works; only cosmetic dependency on the broken classifier (suggested defaults empty). | — |
| **Weekly XP** | ⚠️ Cosmetic | Not a points/streak/level engine — just `completed / due-this-week` relabeled "XP." "Game day" is hardcoded mock (`dashboard/page.tsx:640`). | Needs a real gamification model if desired |
| **Energy check** | ✅ Real (hero tile static) | Stored as `task_signals` mood_checkin; feeds ranking + support plan. Hero "ENERGY CHECK" tile is static display; real picker is on the Notes/Think surface. | — |
| **Overdue** | ✅ Real | Local `due_at < now` + status. | — |
| **Not turned in / missing** | ✅ Real, Canvas-only | From Canvas `missing` flag. No local missing-detection without an LMS. | Gap: no local fallback |
| **Week-over-week** | ⚠️ Partial | Only "recent vs earlier window" trend (grades, parent digest). No true this-week-vs-last-week comparison exists. | Needs new logic if desired |
| **Onboarding enforcement** | ⚠️ Gap | `profiles.onboarded_at` marks completion, but middleware does NOT force new users through `/onboarding` — signup lands straight on `/dashboard`. | `lib/supabase/middleware.ts` |
| **Landing background customization** | ❌ Absent | Theme (light/dark) + 5 accent colors exist (localStorage only, not DB-synced) and do NOT affect the landing page. No per-user background/wallpaper feature anywhere. | Net-new feature if desired |

## 9. Rule going forward

Before adding a page or changing nav: check this file first. When a page reaches parity with the `--gl-*` token system, confirm its placement here (primary tab vs. MORE drawer) and update §6. **Never** reintroduce a curated middle layer in front of a real page — this file exists specifically to prevent that pattern from returning.
