# Work Game Menu: Review and Build Brief

Date: 2026-09-16
Status: signed-in visual review complete; proposed composition awaiting approval.
Update: the composition below is not approved. The user requested a Franchise-style
alternative to compare with an image carousel. See `work-concept-comparison.md`
and `/landing-3d/work-concept-review` before selecting an implementation direction.
Scope: Work collection first, assignment workspace in a later explicit slice.
No application implementation, production promotion, or asset generation in this review.

## Evidence Reviewed

- Authenticated `/assignments` at 1134 x 822, 834 x 1112, and 390 x 844.
- Expanded the assignment collection, opened the existing Nixon Source Notes
  workspace, inspected its loaded state, and returned to Work.
- Did not start the focus timer, send a message, use voice, edit student work,
  review an answer, or confirm a submission.
- Browser screenshots are evidence of the current composition, not evidence of
  the proposed design or physical-device usability.
- Source: `app/(app)/assignments/work-command-center.tsx`, its tests,
  `app/(app)/assignments/page.tsx`, and Work rules in `app/screendesign.css`.
- Approved visual reference: `/landing-3d/today-now-assets?character=relit`,
  not the older authenticated Today presentation. Reuse its typography,
  environment, selected-category paint texture, and color roles.

## Findings

1. The seven-pixel white outer frame, large pale featured panel, white assignment
   table, pale header, and yellow actions dominate the room. It reads as a web
   dashboard inside a decorative frame rather than the approved game menu.
2. The featured assignment repeats Today's priority function. Work needs a
   browsable collection with a stable selected assignment and deliberate launch.
3. The live collection contains 24 active items. Sixteen remaining items in its
   Today group are hidden behind a disclosure, including assignments due today.
   There is no search, subject filter, or user-controlled sort.
4. The At a glance sidebar is noninteractive. Its space is more useful for
   selected assignment details; status counts can sit beside category labels.
5. Phone rows truncate meaningful titles while preserving a separate subject
   column. Put subject metadata above or below a wrapping title on small screens.
6. Tablet uses the stacked phone composition and an excessively wide primary
   action. Do not squeeze three desktop columns into tablet width or stretch a
   command across the whole content area unnecessarily.
7. Date grouping labels are inaccurate: the current Today bucket includes dates
   before midnight seven days ahead, and This week covers the following week.
   The tests currently encode that behavior. Correct logic and tests together.
8. `checking` and `exporting` share Ready to turn in copy even though they open
   different destinations. Submitted and graded records are filtered out.
9. Past-due copy renders in a red-brown color. Use amber plus a date/status label,
   consistent with Diana's calm invariant.
10. The workspace and its loading screen retain the large white outer frame and
    pale surfaces. A later workspace pass is required for continuity. Its typing
    surface should remain readable and stable, not become a cinematic overlay.

## Product and Visual Direction

Today is the priority lobby. Work is the collection and assignment launch menu.
Borrow the select, inspect, then launch pattern of a game loadout/roster screen.
Do not copy military props, sports branding, premium-store clutter, invented XP,
rankings, or streak pressure. Do not rename ordinary homework into combat terms.

### Desktop Composition

- Shared dark global navigation, with Work active, aligned with the Today preview.
- Same Diana environment behind one continuous composition. Local readable
  surfaces are allowed; remove the outer frame and nested dashboard panels.
- Left: category rail with Active, Review, Ready to Submit, Submitted. Wrap the
  longer category deliberately; do not reduce it into illegible condensed text.
- Center: assignment collection, with one compact search/filter/sort toolbar.
  Entries show title, subject, due date, and explicit state. Small counts belong
  beside categories, not in a separate statistics card.
- Right: one selected assignment with full title, instructions when available,
  source/material information, truthful saved progress, and one primary action.
- Use the selected assignment as the main visual subject. Diana may remain
  peripheral but must not consume the detail area or cover controls. No new
  character render or paid background generation is required for the first slice.
- No dashboard charts, award panels, extra featured card, or decorative gauges.

### Graphic Language

- Saira Condensed for navigation and display headings, matching Today.
- Readable body font for instructions and metadata; letter spacing zero.
- Pink paint marker for the selected category. Selected assignment uses a quieter
  inset highlight/edge so two equally loud brush marks do not compete.
- Violet for the immediate action; mint for completion; amber for attention;
  neutral surfaces for ordinary metadata. Subject colors do not imitate actions.
- Consistent thin separators and icon weight. No thick enclosing frame.
- Use established Lucide icons for controls, with accessible names/tooltips.
- Title and button sizes stay stable across state changes. No viewport-scaled
  typography. Every action has distinct hover, pressed, focus, and loading states.

### Responsive Composition

- Wide desktop: category rail, assignment list, selected detail.
- Tablet: compact horizontal categories over a list/detail arrangement only where
  both remain readable; otherwise use the phone drill-in pattern. Decide the
  breakpoint from tested content widths, not device names.
- Phone: categories and searchable list first; selecting an item opens its detail
  with a clear Back action. Back restores the list, filters, scroll, and focus.
- Keep bottom navigation, safe-area spacing, full accessible titles, and usable
  touch targets. No horizontal page scroll or hover-only information.

## State and Action Contract

| Category | Current stored states | Primary action |
| --- | --- | --- |
| Active | `todo`, `drafting` | Start or Resume; Practice for applicable test preparation |
| Review | `checking` | Review work in the existing workspace |
| Ready to Submit | `exporting` | Review submission at the existing submit route |
| Submitted | `submitted`, `graded` | View existing work or receipt, subject to route audit |

- Preserve existing priority scoring, ownership checks, accessibility time
  adjustments, and assignment/workspace contracts.
- Default Active to current ranked order and select its first item. Offer Due date
  and Recently worked on only when the underlying fields support those sorts.
- Submitted requires a separate deliberate data path; do not accidentally feed
  submitted records back into active-priority recommendations.
- Selection is not launch. Arrow navigation must not start a timer or session.
- Do not infer percentage complete from elapsed time or assignment status.
- Show available source steps as factual counts only when stored data supports
  them. Do not manufacture instructions, materials, next steps, or completion.
- Distinguish no assignments, no results for filters, loading, and a load error.
  A load error must never be presented as Caught up.
- Calendar-day labels must use the student's intended timezone and documented
  ranges, tested across midnight and daylight-saving boundaries.

## Build Slices and Exit Gates

### 1. Complete Selection-Menu Composition

Build one complete, scoped preview rather than isolated styled controls. Use
representative synthetic fixtures, not copies of private student content. Include
short/long titles, varied subjects, active work, review, ready-to-submit, submitted,
missing dates/materials, and an empty collection. The same component should be
capable of receiving real data later; do not create a throwaway parallel design.

Before showing it: compare with the approved Today screenshot, inspect wide
desktop, 1134px desktop, 834px tablet, and 390px phone. Check title wrapping,
background legibility, selected states, stable primary-action placement, and
bottom navigation. All preview controls must behave or be clearly non-live.

Exit: user approval of this full composition. No production route replacement.

### 2. Real Collection Behavior

Connect real data, categories, search, subject filtering, sorting, and selection.
Correct date grouping and state labels. Preserve selected work and browsing state
when returning from a workspace. Do not include private content in visual fixtures.

Exit: tests for status mapping, ranking preservation, timezone boundaries,
submitted records, search/filter combinations, keyboard behavior, empty/error
states, and real record routes. Browser proof with a larger collection.

### 3. Launch and Return

Reuse the existing Start/Resume/Practice/Review destinations. Coordinate selection
feedback, detail arrival, and launch using Today's established timing language.
Do not delay routing just to finish an animation. Cancel stale transitions on
rapid selection. Sound is opt-in; reduced motion switches immediately.

Exit: verify every destination, Back restoration, double-activation protection,
loading/retry, no accidental state transitions, and explicit submission consent.

### 4. Assignment Workspace Continuity

Only after the collection is approved, restyle the workspace shell and source-step
rail to belong to the same world. Preserve a quiet, readable writing surface.
Place the timer in a stable utility location instead of floating over content.
Keep voice, handwriting, typing, source imports, review, and saved work intact.
Include loading/error surfaces in this scope so navigation does not flash the
previous design. Do not redesign editor behavior in the collection pass.

Exit: workflow regression tests and rendered proof for typing, touch/pen input,
timer, voice controls, source navigation, review, and responsive layouts.

## Approval and Quality Rules

- Define each slice's whole composition, data, interactions, and edge cases before
  implementation. Do not present partial decoration as the finished slice.
- Passing tests establish behavior, not visual acceptance or an AAA rating.
- Compare screenshots with Today and the supplied game references before handoff.
- Check text contrast, focus visibility, 44px touch targets, keyboard traversal,
  reduced motion, rapid input, loading, long content, and missing data.
- Fix observed composition problems before asking the user to discover them.
- Physical-device performance and student preference require separate evidence.
- Reuse existing assets first. Any paid Higgsfield final requires approval of
  that exact model, resolution, inputs, output count, and total credit cost.

## Current Checkpoint

- Complete: authenticated desktop, emulated tablet/phone, and workspace-entry review.
- Complete: implementation/state review and proposed first-build brief.
- Pending: composition approval and first preview implementation.
- Not performed: production changes, new generation, automated regression suite,
  physical-device testing, or final gamer-quality acceptance.
