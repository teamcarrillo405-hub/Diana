# Lobby: Three-Section Preview

## Scope

Review route: `/landing-3d/today-now-assets?character=relit`.

The `lobbyReview` flag opts this route into the approved consolidation. Other
Today previews and the authenticated dashboard retain their existing behavior.
No student records, assignment ranking, submission logic, or generated assets
were changed. All values on this route remain preview data.

## Composition

- **Now:** one priority assignment, subject identity, due date, session length,
  and Start/Resume. No Next Step or Up Next queue. Diana remains the visual anchor.
- **Check-in:** optional secondary action below Start. Opens the existing controls
  in a modal; never gates session launch. Unfinished values survive closing and
  switching sections. The modal is portaled outside panels so resizing cannot
  put its controls inside an inert or screen-reader-hidden section.
- **Progress:** one weekly results heading, a dominant assignments-completed
  count and mint completion track, and a matching study-time result. The seven-day
  activity chart and aligned By Class workload rows share the lower stage. Class
  rows show estimated workload, not recorded study time; they are not buttons.
  The former completion ring and Study Mix donut are removed in this preview.
  At narrower widths the class rows follow the activity chart.
- **Achievements:** the existing weekly Diana Award and lifetime badge collection
  use the full content stage. Existing milestone and submission semantics remain.

At 761px and above, the rail has Now, Progress, and Achievements. Arrow keys,
Home, and End move selection and focus together. Inactive panels stay mounted,
inert, and hidden from assistive technology. At phone widths the three panels are
visible in that reading order. Default entry remains Now, without persistence.

## Visual Direction

The sports-game influence comes from the short category rail, dominant assignment
title and launch action, persistent branded environment, and distinct statistics
and collection views. This is not a literal recreation of EA assets or an objective
AAA certification.

Existing pink brush selection, violet immediate actions, cyan/mint study graphics,
and individually colored badges remain. Progress and Achievements use a darker
environment scrim for text contrast; Now's environment is unchanged. Diana pauses
and leaves the visual foreground in the statistics and collection views. No new
decorative cards or imagery were added.

## Verification

- TypeScript and scoped ESLint checks passed.
- 15 consolidation tests cover section mapping, keyboard focus, legacy preview
  isolation, independent chart selection, persistent check-in values, dialog focus,
  session Start/Resume, launch cancellation, responsive focus, reduced-motion timing,
  typical/empty/complete/unavailable/busy fixtures, and session time updates that
  do not falsely mark assignments complete or change estimated class workload.
- 8 Progress tests cover unified results, workload-share calculations, interactive
  day selection, unavailable/empty data, over-goal values, zero-minute classes,
  and a longer class list using the shared subject symbols.
- The full focused Today suite passes with 505 tests across 29 files.
- Rendered checks: 1920x1080, 1440x1000, 834x1112, 390x844, and 320x900. No horizontal
  overflow at those widths; phone panels remain readable and in order.
- Browser checks exercised achievement details, check-in reopening with retained
  values, saving, direct Start, session notes retained after Resume, keyboard rail
  navigation, and reduced motion. Reduced-motion Progress reported zero running
  interface animations.

This is a checked local design preview. Promotion to live data and final visual
acceptance are separate steps.
