# Work Concept Comparison

Date: 2026-09-16
Status: First Calendar draft transferred to the Franchise hub preview. Production integration is not part of this pass.
Route: `/landing-3d/work-concept-review`

## What Is Being Compared

Both concepts share seven synthetic assignments, filters, status groups, selected
assignment, existing subject imagery, typography, environment, and color roles.
Switch concepts using the A/B control above Work. Neither concept replaces the
live Work tab. Launch actions open an explicitly labeled sample dialog; no student
work, session, or submission is changed.

### A: Franchise Hub

The user's Madden Objectives screenshot supplies the structural reference:
left activities, a dominant selected matchup, right goals, and supporting stats.
The first adaptation omitted the Calendar date ribbon. Following the user's
correction, Work now uses the original Calendar composition directly:

- A full-width seven-day ribbon with week navigation and per-day assignment counts.
- A left rail containing only the selected day's assignments, with pink brush selection.
- The original central artwork/title proportions, with a short brief underneath.
- A right-hand details column containing the deadline, estimated work, saved section
  progress, and the matching Start/Resume/review/submission action.
- A compact requirements/materials disclosure and weekly totals along the bottom.

One 260ms reveal coordinates the artwork and details. Reduced motion removes it.
Tablet stacks details below the image. Phone keeps the seven-day ribbon, followed
by a horizontally scrollable assignment rail, artwork, brief, and details/action.
Date tabs and assignment tabs have separate, correctly labeled tab panels.

The layout reuses `calendar-concept-review.module.css` without modifying it;
Work-only controls are styled in `work-calendar.module.css`. The abandoned
`work-franchise.module.css` adaptation was removed. Shared Work base styles,
Classes, and the current time-led Calendar are unchanged. The alternate carousel
keeps the same filters, selection, and saved progress. Filtering finds matches
across all fixture dates and moves the ribbon to the selected assignment's date.
Empty days retain date navigation and an action to the next matching date.

The synthetic Work week is fixed to September 14-20, 2026, with September 16 as
the preview's Today date. This is not a live calendar or current student schedule.

This is an interpretation of a Franchise-style hub, not an official Madden
design or a claim of equivalent production quality. EA's Franchise deep dive
also describes weekly strategy choices and contextual matchup information:
https://www.ea.com/games/madden-nfl/madden-nfl-26/news/madden-26-gridiron-notes-franchise-deep-dive

Best fit: inspect one assignment, understand the brief, and resume it.
Tradeoff: visual comparison across many assignments is less immediate.

### B: Card Carousel

Image-led assignment cards keep the subject, title, status, due date, and time
visible. The selected card drives the detail and launch area. Previous/next,
keyboard navigation, horizontal scrolling, and an optional grid are functional.

Best fit: browse and visually recognize a collection.
Tradeoff: some assignments are offscreen; a large collection needs grid/search.

## Integration After Selection

1. Keep the selected composition and bind it to the existing authorized Work data.
2. Preserve real lifecycle destinations; completion must not imply submission.
3. Correct the date grouping and status issues identified in the Work brief.
4. Use reusable subject artwork with stable fallbacks; never require paid image
   generation for each homework assignment.
5. Test long titles, unknown dates, empty collections, and at least 24 assignments.
6. Wire the existing workspace launch. The workspace itself remains a later scope.

Do not promote these synthetic requirements or section counts into real student
records. Display only requirements and progress the application actually knows.

## Visual Materials

- Existing Diana signature studio background and pink selection brush.
- Existing chemistry, biology, history, and math subject WebP files.
- No new generated art, Higgsfield calls, or credit usage.
- These are composition prototypes using existing photography, not final
  bespoke game artwork. Changing imagery remains a separate art-direction step.

## Verification

- Browser inspected both concepts at 1440 x 1000, 834 x 1112, and 390 x 844.
- Checked phone overflow and loaded image dimensions; no broken images found.
- Checked date and assignment keyboard navigation, selected state, and actual focus.
- Checked sample dialog opening, Escape closing, and return focus to Resume.
- Checked phone horizontal assignment selection and requirements disclosure.
- Checked search across dates and preserved selection when comparing concepts.
- Reduced-motion emulation reported no active content animations/transitions.
- 51 tests passed across Work, Calendar, Classes, and the local review guard.
- Fifteen Work tests cover date and assignment selection/focus, filters, empty
  days, week/month boundaries, composition switching, progress, panel contents,
  lifecycle-specific actions, resource disclosure, and dialog focus return.
- TypeScript and scoped ESLint passed.

The revised Franchise composition was inspected at 1440 x 1000, 834 x 1112,
and 390 x 844. No horizontal page overflow or missing artwork was observed.
Phone assignment selection, keyboard End selection, sample dialog opening,
Escape dismissal, and focus restoration were checked. Reduced-motion switching
reported zero content animations. The live `/assignments` page is unchanged.

These checks cover this local comparison, not production integration or physical
device testing. No AAA certification, Madden parity, or user acceptance is claimed.
