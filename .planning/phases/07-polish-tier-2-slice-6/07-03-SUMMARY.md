---
phase: 07-polish-tier-2-slice-6
plan: "03"
subsystem: ui
tags: [timer, body-doubling, adhd, accessibility, localStorage, SVG, CSS-animations, lucide-react]

# Dependency graph
requires:
  - phase: 07-01
    provides: useTimer hook + pure timer state machine (F13 foundations)
provides:
  - F13 timer UI route — ring progress SVG, Premack reward, work/break pickers, ambient sound, countdown hidden by default
  - T2-03 body-doubling route — calm clock, presence-pulse dot, honest copy, ambient sound
  - Dashboard quick-start button linking to /timer
  - Nav Timer item (mobile bottom nav + desktop side nav)
  - body-double-pulse CSS keyframe animation with prefers-reduced-motion gate
affects:
  - Phase 8 or future polish phases referencing F13/T2-03 routes
  - Any future nav changes (ITEMS array now has 6 entries)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - localStorage settings persistence (diana:timer:settings key) with SSR-safe hydration via useEffect
    - SVG ring progress visualization with calm accent-only color (no red states)
    - HTML5 Audio API ambient sound with silent catch for autoplay restriction
    - CSS @keyframes global utility class in globals.css (not CSS module) for one-off animation
    - Client clock with SSR-null hydration pattern (useState<Date|null>)

key-files:
  created:
    - app/(app)/timer/page.tsx
    - app/(app)/timer/timer-ui.tsx
    - app/(app)/body-double/page.tsx
    - app/(app)/body-double/body-double-ui.tsx
    - app/(app)/dashboard/start-session-button.tsx
    - public/sounds/.gitkeep
  modified:
    - app/(app)/dashboard/page.tsx
    - components/nav.tsx
    - app/globals.css

key-decisions:
  - "Countdown hidden by default (showCountdown=false) — time-blindness accommodation per F13 spec; toggle persists via localStorage"
  - "Ring progress uses rgb(var(--accent)) only — no red states at any progress level, calm invariant"
  - "Audio play wrapped in .catch(()=>{}) — browsers block autoplay without user gesture; first Start click is the gesture; silent degradation if missing"
  - "Audio placeholder files (.gitkeep only) — actual rain.mp3/white-noise.mp3 are manual follow-ups for project owner"
  - "body-double-pulse keyframe in globals.css (not CSS module) — single-use global utility, module overhead not warranted"
  - "prefers-reduced-motion gate on body-double-pulse — vestibular/motion sensitivity comorbid with ADHD; reduced-motion = static dot"
  - "Body-double copy 'No one else can see you' — explicit expectation management, no false networking promise"
  - "Timer between Study and Classes in nav — adjacent to work-mode items, before metadata items"
  - "statusLabel returns ONLY: Ready when you are / Working / Break time / Paused / Done — enjoy your reward; banned words excluded"

patterns-established:
  - "SSR-safe clock: useState<Date|null>(null) + useEffect setInterval — avoids hydration mismatch"
  - "Ambient sound pattern: conditional <audio> render + useEffect play/pause driven by state"
  - "localStorage settings: loadSettings() returns DEFAULTS on SSR or parse error, saveSettings() ignores quota errors"

requirements-completed:
  - F13
  - T2-03

# Metrics
duration: 12min
completed: "2026-05-29"
---

# Phase 07 Plan 03: F13 Timer UI + T2-03 Body-Doubling Summary

**Ring-progress timer UI with Premack reward, ambient sound, and countdown-off-by-default (F13) plus body-doubling calm-focus page with pulsing presence dot (T2-03) — Phase 7 fully delivered**

## Performance

- **Duration:** 12 min
- **Started:** 2026-05-29T18:15:48Z
- **Completed:** 2026-05-29T18:27:00Z
- **Tasks:** 3 (Task 3 auto-approved checkpoint)
- **Files modified:** 9

## Accomplishments
- F13 timer UI: 220px SVG ring progress, Premack reward input, work/break sliders (5-60/1-30 min), ambient sound dropdown, countdown hidden by default (F13 time-blindness spec), localStorage persistence for all settings
- T2-03 body-doubling: calm clock, body-double-pulse CSS animation with reduced-motion gate, honest "No one else can see you" copy, ambient sound
- Dashboard quick-start button + nav Timer item close the F13/T2-03 discoverability loop

## Task Commits

1. **Task 1: F13 timer UI with ring progress + ambient sound + localStorage** - `948e8f9` (feat)
2. **Task 2: T2-03 body-double UI + dashboard quick-start + nav Timer item** - `0027946` (feat)
3. **Task 3: Smoke test checkpoint** - auto-approved (no commit — verification only)

**Plan metadata:** (this SUMMARY commit)

## Files Created/Modified
- `app/(app)/timer/page.tsx` - Server shell rendering TimerUi
- `app/(app)/timer/timer-ui.tsx` - Ring SVG, Premack input, work/break pickers, ambient sound, localStorage
- `app/(app)/body-double/page.tsx` - Server shell rendering BodyDoubleUi
- `app/(app)/body-double/body-double-ui.tsx` - Clock, body-double-pulse dot, ambient sound, calm copy
- `app/(app)/dashboard/start-session-button.tsx` - Quick-start Link to /timer with Timer icon
- `app/(app)/dashboard/page.tsx` - Added StartSessionButton import + render in flex row with Add-assignment
- `components/nav.tsx` - Added Timer import + ITEMS entry between Study and Classes
- `app/globals.css` - Appended @keyframes body-double-pulse + .body-double-pulse + reduced-motion gate
- `public/sounds/.gitkeep` - Placeholder for ambient audio directory

## Decisions Made
- Countdown hidden by default — F13 spec: countdown numbers increase anxiety for time-blind students; toggle is opt-in and persists
- Audio CDN-free placeholder approach — public/sounds/ directory committed empty; actual .mp3 assets are manual follow-up (freesound.org/pixabay royalty-free)
- SVG ring uses accent color only — no red at any fill level; calm invariant maintained throughout timer lifecycle
- Body-double presence dot uses CSS @keyframes only (no WebSocket, no Supabase realtime) — T2-03 spec explicitly prohibits false networking promises
- statusLabel function returns ONLY calm strings — "Working", "Break time", "Done — enjoy your reward", "Paused", "Ready when you are"

## Deviations from Plan

None - plan executed exactly as written. One minor adaptation: the plan's `RingProgress` component used `ReturnType<typeof useTimer>["state"]["status"]` inline; the implementation imports `TimerStatus` directly from `@/lib/timer/timer` for cleaner typing — functionally equivalent.

## Issues Encountered
None — typecheck and tone-audit passed on first run for both tasks. All 18 Vitest tests pass.

## User Setup Required
**Audio assets are NOT bundled.** The creator should drop royalty-free .mp3 files into `public/sounds/`:
- `public/sounds/rain.mp3` — rain ambient loop
- `public/sounds/white-noise.mp3` — white noise loop

Suggested free sources: freesound.org (CC0 license), pixabay.com/music. Until files are added, the ambient selector works but plays silence — expected degradation, no errors shown to student.

## Next Phase Readiness
- Phase 7 is COMPLETE: F13 + F20 + T2-01 + T2-02 + T2-03 all delivered
- v1.0 milestone ready for `/gsd:verify-work` against project goal: "Ship a fully evidence-backed, accessible PWA that works for Maya, Devon, and Sam from day one"
- Remaining open items (TTS provider, STT provider, OCR, math parser, rich text editor) are tracked in STATE.md and deferred to Phase 8+

---
*Phase: 07-polish-tier-2-slice-6*
*Completed: 2026-05-29*
