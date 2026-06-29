# Diana — Student Dashboard: Placement Plan

> **Read this first — file roles & authority**
>
> | File | Role |
> |---|---|
> | `Student Lobby.dc.html` | **Pixel source of truth.** The locked landing page (hero + class grid). Match it exactly. |
> | `Dashboard Plan.md` (this file) | **Authoritative written plan.** Where the 19 unplaced components go. Build from this. |
> | `Dashboard Plan (visual reference).dc.html` | **Visual companion for humans.** A clickable, lower-fidelity mock of the plan — illustration only, never the pixel source. |
>
> “Grayson” / “G-Money” is the sample student in mock data. The product/page is **Student Lobby**.

## What this is

A distribution plan for the **19 built-but-unplaced** dashboard components. Today, `app/(app)/dashboard/page.tsx` renders only `LobbyHero` + `ClassesGrid`. The other 19 components exist and compile in `app/(app)/dashboard/` but are never imported — so a student sees none of them.

This handoff answers: **where does each one go**, without turning the landing page into a 21-feature scroll.

**Visual companion:** `Dashboard Plan (visual reference).dc.html` — open it and click the nav tabs (PLAN · TODAY · WORK · THINK · PROOF · FUTURE). Each tab is mocked in the locked Student Lobby system. It is illustration for humans — this `.md` is the spec to build from.

## The core decision

**The landing page (TODAY) stays calm: hero + classes + one quiet alert slot.** Everything else is distributed across four existing nav tabs. The reasoning:

1. **One question per screen.** TODAY answers "what do I do now?" Each tab answers exactly one follow-up.
2. **Nothing duplicated.** The Student Lobby hero already covers next-move, energy, and workload — so `FocusHeroCard`, `MoodCheckIn`, `EnergyPicker`, and `TimeBudget` are *not* re-added to the landing as cards. They live on the tab where their full version belongs.
3. **Quiet by default.** Conditional alerts share one slot — empty most days, one calm strip when something needs attention.

---

## Distribution map

### TODAY — the calm landing (unchanged + 1 addition)
| Component | Status | Notes |
|---|---|---|
| `lobby-hero.tsx` | EXISTING | The one next move, energy check, workload gauge |
| **Alert slot** | **NEW** | One shared, dismissible strip — see spec below |
| `classes-grid.tsx` | EXISTING | The 6 class cards |

### WORK — do the work
| Component | Condition | Notes |
|---|---|---|
| `focus-hero-card.tsx` | always | Full focus surface for the top-ranked assignment |
| `time-bar.tsx` | always | Due countdown; past-due branch swaps to a red micro-task button |
| `start-session-button.tsx` | always | Launches the timer |
| `time-budget.tsx` | always | "What's left tonight" — collapsible, amber cue > 180 min |
| `due-cards.tsx` | count > 0 | Flashcard review count |
| `reading-load-toggle.tsx` | always | Reading-load view + badge (clamps 0–5) |

### THINK — how am I
| Component | Condition | Notes |
|---|---|---|
| `mood-check-in.tsx` | once/day | 2-step body energy + focus (richer than the hero's quick check) |
| `session-adaptation-card.tsx` | mood ≠ good | Hidden when mood is good |
| `sleep-recovery-card.tsx` | message exists | Links to `/wellness` |
| `energy-picker.tsx` | always | 5 brain-state re-pick |
| `weekly-reflection.tsx` | time-gated | Textarea + AI reflection, once per week |

### PROOF — what I've shown
| Component | Condition | Notes |
|---|---|---|
| `grade-move-card.tsx` | Canvas connected | 2.5s timeout, renders nothing if slow/absent |
| `done-today.tsx` | count > 0 | Neutral counter — no streaks, no shame language |

*(Also the eventual home of portfolio / mastery / submitted work — out of scope here.)*

### FUTURE — what's coming
| Component | Condition | Notes |
|---|---|---|
| `evening-planning.tsx` | 5–8 PM only | Event intentions; optimistic dismiss |
| `quest-carousel.tsx` | always | Auto-advancing, 5s interval |

*(Also the eventual home of upcoming tests / AP planning.)*

---

## The Alert Slot (the only new TODAY element)

A single shared region directly under the nav, above MY CLASSES. **Renders nothing when empty** (most days). When triggered, shows one strip at a time, priority order: **past-due reminder → burnout cue → token budget**.

**Container (active):**
- `border-radius: 12px`, `padding: 15px 18px`, full content width (1440 max, 34px gutters)
- HUD corner brackets: 4 corners, `12px`, `2px solid [accent]`, `border-radius: 2px`
- Icon tile `36×36px`, `border-radius: 9px`, alert-triangle SVG stroked in accent
- Label: `Saira Condensed 800 12px, letter-spacing .14em, uppercase, [accent]`
- Message: `15px / 600 / #eef2ff`; sub-line `12.5px / rgba(200,218,255,.55)`
- Optional CTA pill + dismiss `✕` (`30×30px`, `rgba(120,150,220,.1)`)

**Tones:**
| Alert | Component | Accent | Border | BG |
|---|---|---|---|---|
| Past due | `reminder-banner.tsx` | `#ff7070` | `rgba(255,85,85,.5)` | `rgba(255,55,55,.07)` |
| Reset cue | `burnout-cue.tsx` | `#ffd24a` | `rgba(255,210,74,.45)` | `rgba(255,210,74,.06)` |
| AI budget | `token-budget-banner.tsx` | `#ffb347` | `rgba(255,180,70,.4)` | `rgba(255,180,70,.06)` |

**Empty state** (for reference; in production renders `null`): dashed `rgba(120,150,220,.22)` border, green check, "Nothing needs attention."

> Token & burnout are **amber only, never red** (AI-safety + calm invariants). Past-due reminders may use red and bypass quiet-hours when still open.

---

## Tab layout specs

All tabs: max-width `1440px`, `34px` (≈`24px` in the ref) side gutters, `34px` top padding. Each opens with a heading block:
- Kicker: `Barlow Semi Condensed 700 13px, letter-spacing .3em, uppercase` (tab accent color)
- Title: `Saira Condensed 800 italic 40px, uppercase`
- Sub: `15px / rgba(200,218,255,.62)`

**Tab accent colors:** TODAY/WORK `#29d0ff` · THINK `#b09cff` · PROOF `#36e07a` · FUTURE `#ffd24a`

### WORK
- 2-column grid `1fr / 380px`, `20px` gap.
- **FocusHeroCard** (left): `border-radius: 18px`, `border: 1px rgba(41,208,255,.28)`, gradient bg, `16px` HUD corner brackets. Chips row → title (`Saira 800 italic 38px`) → meta line → **TimeBar** (8px bar, cyan fill + glow) → "Why this one" reason pills (`20px` radius, cyan).
- **Right rail**: Start Focus CTA (`#29d0ff`, `Saira 800 20px`, `0 0 28px rgba(41,208,255,.4)`) → TTS button (outline) → TimeBudget (collapsible) → DueCards (cyan-tinted).
- **Reading-load row** below, full width: segmented Standard / Reading-load toggle + 5-dot badge.

### THINK
- 2-column grid; MoodCheckIn + EnergyPicker + WeeklyReflection span both columns.
- **MoodCheckIn**: purple-bordered panel, two 3-button fieldsets (body / focus); active = `rgba(126,92,255,.16)` bg + `rgba(126,92,255,.6)` border; save disabled until both chosen. Confirmed state shows summary + Change.
- **SessionAdaptationCard** + **SleepRecoveryCard**: side-by-side `14px` cards.
- **EnergyPicker**: 5-up grid, icon + label + note.
- **WeeklyReflection**: textarea (`rgba(10,16,36,.8)` bg, purple border) + Save (disabled < 2 chars).

### PROOF
- Single column. **DoneToday** = green stat strip (`Saira 800 24px`). **GradeMoveCard** = cyan-tinted, target icon + move + reason + Open.

### FUTURE
- Single column. **EveningPlanning** = gold-bordered, intention rows (time + label + Set intention). **QuestCarousel** = 100%-width slide track, `translateX(-index*100%)`, dot indicators, 5s auto-advance.

---

## Design tokens (locked — from Student Lobby)

> All names below resolve in `tokens.css`: every `--color-*` is mirrored as a `--gl-*` alias (see the `--gl-* ALIASES FOR HANDOFF` section). `--gl-amber` maps to `--gl-gold`.

```
--gl-bg-base        #04060f      page background
--gl-bg-hero        #0a1024      hero container
--gl-bg-card        rgba(4,8,20,.72)   cards (+ backdrop-filter: blur(10px))
--gl-cyan           #29d0ff      primary accent, CTAs, active states
--gl-purple         #7e5cff / #b09cff   THINK / wellness, overwhelmed
--gl-green          #36e07a      success, PROOF, done
--gl-gold           #ffd24a      warning, FUTURE, not-turned-in
--gl-red            #ff5555 / #ff7070   overdue, past-due reminder
--gl-amber          → --gl-gold (#ffd24a)   token / burnout warnings (never red)
--gl-text-muted     rgba(200,218,255,.6)
--gl-border-neutral rgba(120,150,220,.18)

Display: 'Saira Condensed', 800 italic, uppercase
Body:    'Barlow Semi Condensed', 500–700
HUD bracket: 4 absolute corners, 12–16px, 2px solid rgba(41,208,255,.8), radius 2px
Card radius 14px · button 8–12px · max-width 1440px · gutters 34px
```

---

## Build notes for Claude Code

- **Logic is locked.** Per `LOGIC_MANIFEST.md`, only add imports + JSX to `page.tsx` and appearance-only changes to component files. No function bodies, conditions, or data flows.
- **New tabs need routes.** WORK / THINK / PROOF / FUTURE map to new route segments under `app/(app)/`. Wire `nav.tsx` (`DESKTOP_GROUPS` / `PRIMARY_MOBILE_ITEMS`) — appearance/labels only, not `isActivePath` or the guards.
- **Data fetching** for moved components (reminder items, token budget, mood state, grade moves, evening intentions) follows the existing parallel-query pattern in `page.tsx`. Reuse the `actions.ts` getters already listed in the manifest (`getReminderItems`, `getEventIntentions`, etc.).
- **Re-skin, don't rebuild.** The components currently use generic Tailwind (`bg-card`, `text-muted`, `rounded-2xl`). Map those to the Student Lobby tokens above. `focus-hero-card.tsx` is the closest existing pattern — match its structure.

---

## Files

| File | Description |
|---|---|
| `Dashboard Plan (visual reference).dc.html` | Interactive companion — PLAN map + all 5 tab mocks (for humans) |
| `Dashboard Plan.md` | This file — the authoritative plan |
| `Student Lobby.dc.html` | The locked **pixel source** (hero + classes) |
| `tokens.css` | Full `--gl-*` token extraction (in the repo root) |
