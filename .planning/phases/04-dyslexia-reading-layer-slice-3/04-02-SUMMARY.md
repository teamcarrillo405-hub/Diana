---
phase: 04-dyslexia-reading-layer-slice-3
plan: 02
subsystem: ui, accessibility, tts
tags: [fonts, tts, word-highlight, speech-synthesis, css, accessibility, typescript]

# Dependency graph
requires:
  - phase: 04-dyslexia-reading-layer-slice-3
    plan: 01
    provides: lib/tts/tts-utils.ts (safeCancel, splitWordsWithOffsets, scheduleFallbackTimers)
provides:
  - app/layout.tsx (Atkinson_Hyperlegible_Next + OpenDyslexic loaded; --font-atkinson on <html>)
  - app/globals.css (.reading-view typography class + .reading-font-atkinson/.reading-font-opendyslexic + .tts-word-active)
  - lib/tts/use-tts-highlight.ts (useTtsHighlight hook + TtsState type)
  - components/tts-highlight-button.tsx (TtsHighlightButton component with word highlight + speed controls)
affects:
  - 04-03 (ReadingPanel uses TtsHighlightButton and .reading-view CSS class)
  - any component applying reading_font body classes (reads --font-atkinson via CSS variable)

# Tech tracking
tech-stack:
  added:
    - "@fontsource/opendyslexic ^0.1.x (weight 400 only, Pitfall 7 guard)"
  patterns:
    - "CSS variable font loading: --font-atkinson set on <html> via next/font variable prop"
    - "Scoped CSS: reading typography classes applied only inside .reading-view (not global body)"
    - "TTS boundary + fallback: boundary event used when available; 500ms timeout activates estimator fallback for Firefox/Chrome Android"
    - "Pitfall 3 guard: word spans rendered only when state !== 'idle' to preserve screen reader experience"

key-files:
  created:
    - lib/tts/use-tts-highlight.ts
    - components/tts-highlight-button.tsx
  modified:
    - app/layout.tsx
    - app/globals.css
    - package.json
    - package-lock.json

key-decisions:
  - "Atkinson Hyperlegible Next loaded via next/font/google (not fontsource) — benefits from Next.js font optimization + self-hosting"
  - "OpenDyslexic loaded via @fontsource/opendyslexic with single-weight import (400 only) to minimize payload"
  - "useTtsHighlight exposes pause/resume/stop as separate callbacks — TtsHighlightButton controls all three states"
  - "Speed selector only shown when state !== 'idle' — avoids clutter for users who never use TTS"
  - "aria-live='polite' placed on the word-highlight paragraph container, not on individual spans — prevents excessive screen reader announcements"

requirements-completed: [F06, F19]

# Metrics
duration: 6min
completed: 2026-05-29
---

# Phase 4 Plan 02: Dyslexia Reading Layer — Font Loading + Reading Typography CSS + TTS Word-Highlight Hook

**Atkinson Hyperlegible Next + OpenDyslexic loaded in layout.tsx; evidence-backed .reading-view typography CSS added to globals.css; useTtsHighlight hook with boundary-event sync and 500ms fallback estimator; TtsHighlightButton component with pause/resume/stop controls and word-level highlight**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-05-29T11:18:42Z
- **Completed:** 2026-05-29T11:24:42Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- `app/layout.tsx` now imports `Atkinson_Hyperlegible_Next` from `next/font/google` and `@fontsource/opendyslexic` (weight 400 only); both fonts available in the CSS cascade via `--font-atkinson` CSS variable and `OpenDyslexic` font-family name
- `app/globals.css` extended with `.reading-view` (background `#FAF8F3`, `line-height: 1.6`, `letter-spacing: 0.02em`), `.reading-content` (`max-width: 70ch`), `.reading-font-atkinson`, `.reading-font-opendyslexic`, `.tts-word-active`, and dark mode variant for `.reading-view`
- `lib/tts/use-tts-highlight.ts` — hook handles boundary event sync, 500ms fallback estimator for Firefox/Chrome Android, `safeCancel` for Chrome pause-hang (Pitfall 2), and clean teardown on stop/end/error
- `components/tts-highlight-button.tsx` — three-state UI (idle/playing/paused) with speed selector; word spans only rendered while active (Pitfall 3 screen-reader guard)
- All 35 existing tests continue to pass

## Task Commits

Each task was committed atomically:

1. **Task 1: Font loading + reading typography CSS** - `6e83d3b` (feat)
2. **Task 2: useTtsHighlight hook + TtsHighlightButton component** - `701d11c` (feat)

**Plan metadata:** (docs commit — see final)

## Files Created/Modified

- `app/layout.tsx` - Added Atkinson_Hyperlegible_Next + @fontsource/opendyslexic imports; atkinson.variable added to \<html\> className
- `app/globals.css` - .reading-view typography block, .reading-font-atkinson, .reading-font-opendyslexic, .tts-word-active
- `lib/tts/use-tts-highlight.ts` - useTtsHighlight hook exporting TtsState type and UseTtsHighlightReturn interface
- `components/tts-highlight-button.tsx` - TtsHighlightButton with word-level highlight, 3 TTS states, speed selector
- `package.json` / `package-lock.json` - @fontsource/opendyslexic added as dependency

## Decisions Made

- `Atkinson_Hyperlegible_Next` used via `next/font/google` (not fontsource) so Next.js handles font optimization and self-hosting automatically
- `@fontsource/opendyslexic` imported without specifying `/400` path since the default entry point is weight 400 (avoids large payload from `all.css`)
- `useTtsHighlight` computes `words` inline from `splitWordsWithOffsets(text)` — memoization deferred (text changes infrequently in reading context)
- Speed selector rendered only when `state !== 'idle'` to keep the button compact for users who never engage TTS

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all CSS classes and hook exports are fully implemented. ReadingPanel (Plan 03) will wire TtsHighlightButton to actual assignment reading content.

---
*Phase: 04-dyslexia-reading-layer-slice-3*
*Completed: 2026-05-29*
