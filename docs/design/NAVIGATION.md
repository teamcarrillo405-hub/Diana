# Diana — Navigation Architecture (locked decision)

This is the settled answer to "what format are the tabs" so it does not get re-litigated or quietly drift. Read this before changing any navigation in this app.

## The format

One navigation system, app-wide. The lobby HUD top bar (full-bleed, cyan underline active state) is the only nav. The left sidebar is retired on every page, not just the dashboard.

## The labels (already consistent, do not change)

TODAY · WORK · THINK · PROOF · FUTURE · MORE

## The destinations (one layer, no curated middle page)

Each top tab points directly at the real, fully-built page once that page has been redesigned in the `--gl-*` token system. There is no separate curated summary page sitting in front of it.

| Tab | Destination | Status |
|---|---|---|
| TODAY | `/dashboard` | Done — lobby hero + classes |
| WORK | `/assignments` (Mission Board) | In progress |
| THINK | `/notes` | Not started |
| PROOF | `/proof` | Not started |
| FUTURE | `/future-path` | Not started |
| MORE | Overlay drawer — same grouped list as the old SideNav More drawer | Carries over as-is |

## Transition state (expected, not a bug)

Until every destination page is rebuilt, some tabs will point at an unstyled old-system page while others point at a finished new-system page. That mismatch is expected during the transition. Do not "fix" it by reintroducing a curated middle page — finish the real page instead.

## What happens to `/dashboard/work`, `/dashboard/think`, `/dashboard/proof`, `/dashboard/future`

These four curated tab pages (built earlier in this project) are retired once their matching real page is rebuilt and the top tab is repointed. They are not deleted immediately — they go away as each real page reaches parity.

The 19 components currently homed inside them (MoodCheckIn, TimeBudget, DueCards, GradeMoveCard, SessionAdaptationCard, SleepRecoveryCard, EnergyPicker, WeeklyReflection, EveningPlanning, QuestCarousel, ReminderBanner, TokenBudgetBanner, BurnoutCue, DoneToday, FocusHeroCard, TimeBar, StartSessionButton, ReadingLoadToggle, PastDueMicroTaskButton) need new homes inside the real redesigned pages. Decide this per-page, at the time that page is redesigned — not all at once.

Likely homes (to confirm at build time, not now):
- Assignments (`/assignments`): FocusHeroCard, TimeBar, TimeBudget, DueCards, ReadingLoadToggle, StartSessionButton, PastDueMicroTaskButton
- Notes (`/notes`): MoodCheckIn, SessionAdaptationCard, SleepRecoveryCard, EnergyPicker, WeeklyReflection
- Proof (`/proof`): GradeMoveCard, DoneToday
- Future Path (`/future-path`): EveningPlanning, QuestCarousel
- Shared alert slot (likely lives on `/dashboard` per the original Dashboard Plan): ReminderBanner, BurnoutCue, TokenBudgetBanner

## Rule going forward

Before redesigning any new page, check this file first. When that page reaches parity with the `--gl-*` system, repoint its top-bar destination here and update the status column. Do not build a new curated middle layer for any future page — this file exists specifically to prevent that pattern from coming back.

## AI agent placement (locked decision)

Only `/voice` calls the real Diana AI model today. `/study-buddy` and `/break-down` are template and heuristic based, not real model calls. Confirmed direction, these two should eventually be upgraded to call the real AI model the same way voice does. This is a separate backend engineering task, not a design task. Do not start this work until it is explicitly scoped as its own project.

## Voice entry point (locked decision)

`/voice` gets a prominent, persistent entry point on the redesigned Work page (Mission Board), placed alongside the Start Now panel. This is a general purpose AI agent, not tied to any single assignment, so it deserves visible placement on Work rather than staying buried in the More drawer. Implement this as part of the current Mission Board build.
