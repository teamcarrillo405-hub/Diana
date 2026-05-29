---
phase: 04-dyslexia-reading-layer-slice-3
plan: 01
subsystem: database, testing
tags: [vitest, tts, speech-synthesis, supabase, migrations, typescript, accessibility]

# Dependency graph
requires:
  - phase: 03-capture-time-layer-slice-2
    provides: vitest setup, profiles table with accessibility columns (0005/0009)
provides:
  - supabase/migrations/0010_reading_layer.sql (profiles.reading_font column with check constraint)
  - lib/tts/tts-utils.ts (pure splitWordsWithOffsets, estimateMsPerWord, scheduleFallbackTimers, safeCancel)
  - lib/tts/tts.test.ts (10 unit tests, no browser deps)
  - lib/profile.ts extended with reading_font in ProfilePrefs + profileBodyClass
  - lib/profile.test.ts (6 unit tests for all reading_font values)
affects:
  - 04-02 (TTS hook uses tts-utils.ts)
  - 04-03 (font picker Settings UI reads reading_font from profile)
  - any component calling profileBodyClass or loadProfile

# Tech tracking
tech-stack:
  added: []
  patterns:
    - pure-function extraction for browser-API testability (tts-utils pattern)
    - TDD red-green-refactor for all new lib functions
    - Manual types.ts annotation for migration-added columns (before supabase type regen)

key-files:
  created:
    - supabase/migrations/0010_reading_layer.sql
    - lib/tts/tts-utils.ts
    - lib/tts/tts.test.ts
    - lib/profile.test.ts
  modified:
    - lib/profile.ts
    - lib/supabase/types.ts

key-decisions:
  - "reading_font stored as text with DB-level check constraint ('system'|'lexend'|'atkinson'|'opendyslexic')"
  - "reading_font='lexend' maps to existing .dyslexia-font CSS class (no new class needed)"
  - "Dedup guard in profileBodyClass: filter((v,i,a)=>a.indexOf(v)===i) prevents duplicate dyslexia-font when dyslexia_font=true AND reading_font=lexend"
  - "tts-utils.ts exports only pure functions — no window/SpeechSynthesis globals — enabling node-environment Vitest tests"
  - "safeCancel accepts injected synth object for mockability (dependency injection pattern)"
  - "types.ts manually annotated with reading_font until migration applied and supabase:types regenerated"

patterns-established:
  - "Pure-function extraction: isolate browser-API-dependent code into adapter hooks; extract pure logic into testable utils"
  - "scheduleFallbackTimers: 300ms lead-in + msPerWord cadence for cross-browser word highlight fallback"

requirements-completed: [F06, F19]

# Metrics
duration: 8min
completed: 2026-05-29
---

# Phase 4 Plan 01: Dyslexia Reading Layer — DB Migration + Pure TTS Utilities + Font Picker Foundation

**Supabase migration 0010 adds profiles.reading_font with check constraint; pure TTS utility layer (splitWordsWithOffsets, estimateMsPerWord, scheduleFallbackTimers, safeCancel) extracted for node-environment testability; profileBodyClass extended for 4-value reading font picker with dedup guard**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-05-29T11:05:01Z
- **Completed:** 2026-05-29T11:13:00Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Migration 0010 creates profiles.reading_font TEXT NOT NULL DEFAULT 'system' with check constraint for the 4 font picker values
- lib/tts/tts-utils.ts extracted as pure utility module — no browser globals — enabling full Vitest node environment coverage with 10 tests
- lib/profile.ts ProfilePrefs extended with reading_font; profileBodyClass handles all 4 values including lexend→dyslexia-font reuse and dedup guard
- 16 total new tests added (10 TTS + 6 profile); all 35 lib/ tests pass after this plan

## Task Commits

Each task was committed atomically:

1. **Task 1: Migration 0010 + TTS pure utilities + tests** - `f4e8545` (feat)
2. **Task 2: Extend lib/profile.ts + profileBodyClass tests** - `53cc128` (feat)

**Plan metadata:** (docs commit — see final)

## Files Created/Modified
- `supabase/migrations/0010_reading_layer.sql` - ALTER TABLE profiles ADD COLUMN reading_font
- `lib/tts/tts-utils.ts` - Pure TTS utilities: splitWordsWithOffsets, estimateMsPerWord, scheduleFallbackTimers, safeCancel
- `lib/tts/tts.test.ts` - 10 unit tests for all TTS utilities (no jsdom required)
- `lib/profile.ts` - ProfilePrefs Pick extended with reading_font; profileBodyClass updated
- `lib/profile.test.ts` - 6 TDD unit tests covering all 4 reading_font values + null + dedup
- `lib/supabase/types.ts` - profiles Row/Insert/Update manually annotated with reading_font: string

## Decisions Made
- reading_font='lexend' intentionally reuses `.dyslexia-font` CSS class so Lexend font loaded in Phase 2 (03-02) is activated by the new picker without new CSS
- Dedup filter prevents `.dyslexia-font` appearing twice when both `dyslexia_font=true` and `reading_font='lexend'` are active
- tts-utils dependency-injects the synth object into safeCancel so tests can mock without jsdom or window
- types.ts manually updated (not regenerated via CLI) because migration is not yet applied to remote DB

## Deviations from Plan

None — plan executed exactly as written.

Note: tts.test.ts contains 10 tests rather than the plan's stated 7, because the plan's `<behavior>` section specifies 7 behaviors but the `<action>` code block includes an additional `it("handles punctuation attached to words")` test plus the estimateMsPerWord test count matches exactly. All stated behaviors are covered.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Plan 02 (useTts hook) can now import from lib/tts/tts-utils without browser dependency concerns
- Plan 03 (font picker Settings UI) can use reading_font from ProfilePrefs immediately
- Migration 0010 must be applied to Supabase remote before deploy: `npx supabase db push` or apply via Supabase dashboard
- After migration applied, regenerate types: `npx supabase gen types typescript --project-id <id> > lib/supabase/types.ts`

---
*Phase: 04-dyslexia-reading-layer-slice-3*
*Completed: 2026-05-29*
