# Calendar Event Hub Preview

Local route: `/landing-3d/calendar-concept-review`.

## Composition

The default is a personal schedule, not a second assignment hub. A seven-day
ribbon controls the selected date. The broad left column separates assignment
deadlines from a chronological, time-first agenda. A narrower right column shows
the selected event's supporting photo, start/end time, location, notes, source,
and action. Sports practice and a school play sit alongside study and class work.
The existing Diana environment, pink brush selection, violet actions, and
condensed typography remain consistent with the Work and Classes previews.

The first Calendar draft was subsequently approved for the Work preview:
full-width date ribbon, selected-day assignment rail, dominant artwork/title,
brief below the artwork, and right-hand details/progress/action column. Work
reuses that draft's layout styles directly. This does not change this time-led Calendar.

Week and Month are secondary calendar views. Selecting an item or date returns
to the Schedule presentation. The week view separates deadlines from scheduled
time; estimated assignment duration never creates a time block.

## Boundaries

- All records are synthetic and labeled sample data. The fixture week follows
  today's date in America/Los_Angeles, shown as Pacific Time in the interface.
- No authenticated queries, provider imports/writes, assignment transitions,
  submissions, real reminders, or real session launches occur.
- Personal events can be added, edited, and deleted in React state only. Reload
  resets them. Both the review banner and event form disclose this boundary.
- Imported sample items open read-only dialogs. They are not editable personal
  events. Nothing is written to Google.
- Event fields: title, category, date, same-day start/end or all-day, optional
  location/notes/photo, optional weekly recurrence and end date, reminder preference.
- Weekly recurrence is bounded to one year. Editing/deleting affects the entire
  series and is disclosed. Deletion requires confirmation.
- Reminder preferences are displayed but do not trigger notifications.
- Photos accept JPG, PNG, or WebP up to 3 MB and remain in memory as data URLs.
- The existing `/calendar` remains untouched. No new paid media is generated.
- Local-only, noindex route uses the existing review-route host/environment guard.

## Interaction and Responsive Requirements

- Day, item, and view tab lists support arrows, Home, End, roving tab stops,
  active tab-panel labeling, and visible focus.
- Day/month/week navigation uses date-fns calendar arithmetic, including year
  boundaries. Today returns to the actual current date, not old unfinished work.
- Selection does not reset when toggling calendar views. Opening an item from
  Week or a date from Month transfers focus to its Schedule control.
- Empty days and weeks retain working navigation and an honest empty state.
- Narrow layouts retain the seven-day ribbon and vertical timeline, followed by
  the selected event's artwork and details. There is no horizontal agenda carousel.
- Overlapping timed events receive a neutral amber notice. Deadlines, all-day
  items, and intervals that merely touch are not treated as time conflicts.
- One 240ms event arrival coordinates art and details; reduced motion removes
  animation and transitions. No autoplay audio or decorative animation.

## Image Sources

No paid media generations were used. Existing Diana imagery remains unchanged.
These two reference photographs are local assets for the concept review:

- Basketball court: Mattia Graziani on Unsplash,
  https://unsplash.com/photos/empty-indoor-basketball-court-with-wooden-floor-tJ6GF320Y64
  (the source page identifies the Unsplash License).
- Theater: discovered through https://unsplash.com/s/photos/theatre-stage;
  source image https://images.unsplash.com/photo-1565798846807-2af22c843402 .
  Photographer and dedicated photo-page provenance still need confirmation before
  promoting this reference asset into a released product.

## Verification

Focused tests cover selection/focus, view and date navigation, empty states,
dialog return focus, ready versus submitted, deadline versus study time, and
month/year boundary handling. Visual review covers desktop, tablet, phone,
secondary views, loaded artwork, focus treatment, and reduced motion.

Completed checks on September 16, 2026:

- 43 tests passed across Calendar, Work, Classes, and the local review guard.
- TypeScript and scoped ESLint passed.
- Rendered Schedule at 1440x1000, 834x1112, and 390x844. No horizontal page
  overflow; basketball and theater images loaded.
- Created a performance event in the browser and verified the selected details.
- Checked Add Event on phone, title-field focus, native dialog Escape dismissal,
  and focus return to Add Event. Fixed inherited checkbox and selected-hover styles.
- Tests cover event create/edit/cancel/delete, repeating-series deletion, validation,
  all-day timing, overlaps, photo rejection, view preservation, and reload reset.
- Reduced-motion date switching produced zero active content animations.
