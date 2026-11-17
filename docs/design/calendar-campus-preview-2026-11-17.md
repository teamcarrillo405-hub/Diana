# Calendar campus redesign preview

November 17, 2026. Branch: `codex/calendar-campus-preview`.

Calendar now shares the approved campus identity with Lobby, Work and Classes. It uses an original 4K Higgsfield planning-room background, the student's school name and colors, athletic headings, readable body text and paintbrush selections. There are no points, streaks, rewards or competitive rankings.

This is a preview for approval. Main, production and the production database have not been changed.

## Screens and journeys

| Area | Result |
| --- | --- |
| Schedule | Separate due work and appointments; selected details beside the agenda on desktop and in a focused sheet on phone. Handed-in work is distinguished from actionable due counts. |
| Week | Compact phone day selection with the chosen day's agenda, plus desktop week columns. |
| Month | Date indicators and an agenda for the selected day. Narrow layouts keep date targets inside a dedicated scroller. |
| Add and Edit | Essential fields first, optional details in a disclosure, visible Save footer, explicit repeating-series wording and readable date/time inputs. |
| Event details | Location, provider, source time zone, overlaps, continuation across midnight, editing and device-calendar export. |
| Delete and Undo | Errors stay inside the open confirmation, repeating-series deletion is explicit, and Undo restores the series. |
| Study planning | Assignment-linked blocks use adjusted estimates. Students can save optional weekly availability. Missing estimates leave the total incomplete and suppress spare-capacity claims. |
| Check-in guidance | Optional shorter-block guidance uses today's latest check-in and applies only to planning today. Nothing is scheduled automatically. |
| Google Calendar | Campus connection card, last successful sync, imported range, correctly named reconnect action and visible consent outcomes. Incomplete provider reads preserve saved events. |
| Homework | Calendar date, view and selected item survive Workspace, Review, Hand-in, submitted receipt and saved-copy navigation. |

## Calendar correctness

- Nonexistent daylight-saving times are rejected, including later occurrences of a weekly series. Repeated autumn times use the first occurrence with an explanation.
- Timed events preserve actual start/end instants; all-day provider end dates remain exclusive. Travel, overnight events and overlaps occupy every affected day.
- Assignment links and all event/availability mutations are scoped to the signed-in owner.
- Google reconciliation applies a complete bounded snapshot atomically, isolates each owner and primary calendar, and prevents an older concurrent snapshot from replacing a newer one.
- Calendar downloads include complete timezone definitions, recurrence exceptions where elapsed durations change, alarms and safe Unicode folding. Private accommodation and check-in context are excluded.
- Malformed saved JSON returns a helpful 422 response for export rather than a server error.

## Verification

- Optimized production build passed. Final local build ID: `MhC3dIS3cwBRKj9siA9DR`.
- Final changed-area suite: **184 tests passed in 19 files**.
- Full repository run: **5,206 passed, four skipped, one failure**. The sole failure was the historical-release test registry missing the two new Calendar migration versions. The registry was updated; its eight tests pass on rerun and are included in the final 184-test suite. No additional failure appeared in the broad run.
- Full lint, type checking and calm-copy checks passed during implementation. Security audit reported zero unresolved high/critical findings with the existing reviewed dependency-source verification intact.
- Actual browser flows passed at 1440×900 and 390×844. Additional captures cover 768px tablet, 320px narrow phone, 1920px at double density, and enlarged text.
- Browser verification exercised save/edit/reload, recurring export, simulated deletion failure, successful retry, Undo, daylight-saving validation, linked study blocks, weekly availability save/clear, incomplete estimates and homework return paths.
- No browser exceptions, unexpected server errors or tutoring model requests occurred. Disposable accounts and their scoped backend fixtures were removed after each completed run.
- The new weekly table and reconciliation RPC were exercised against the exact migrations in an isolated PostgreSQL 16 cluster. Checks covered ownership, cross-owner denial, anonymous denial, constraints, rollback and concurrent snapshots.

The existing assignment and event journeys used temporary student-owned records in the configured backend. Weekly availability used the real new table in isolated PostgreSQL through a local test adapter. No production schema changes were required for the preview.

## Preview evidence

[Open the 47-screen gallery](C:/Users/glcar/.codex/visualizations/2026/11/14/01a1dbf8-b449-7132-803f-0b54b33d5bdb/calendar-campus-preview/index.html).

[Desktop Schedule](C:/Users/glcar/.codex/visualizations/2026/11/14/01a1dbf8-b449-7132-803f-0b54b33d5bdb/calendar-campus-preview/schedule-desktop.png) · [Phone Schedule](C:/Users/glcar/.codex/visualizations/2026/11/14/01a1dbf8-b449-7132-803f-0b54b33d5bdb/calendar-campus-preview/schedule-phone.png) · [Phone event editor](C:/Users/glcar/.codex/visualizations/2026/11/14/01a1dbf8-b449-7132-803f-0b54b33d5bdb/calendar-campus-preview/add-event-phone.png) · [Phone Week](C:/Users/glcar/.codex/visualizations/2026/11/14/01a1dbf8-b449-7132-803f-0b54b33d5bdb/calendar-campus-preview/week-phone.png) · [Verification receipt](C:/Users/glcar/.codex/visualizations/2026/11/14/01a1dbf8-b449-7132-803f-0b54b33d5bdb/calendar-campus-preview/verification.json).

## Before release

1. Obtain approval of the desktop and phone previews.
2. Apply `20261117183000_google_calendar_reconciliation.sql` and `20261117190000_calendar_week_plans.sql` to the deployment's database, then verify its generated schema.
3. Merge and publish the approved candidate, then verify the production alias and responsive journeys.
4. Google client ID and secret are absent from local configuration, so actual Google consent and provider reads remain unverified. Enable the intended Google configuration and validate a real connection before calling that integration live-ready.

Higgsfield generation provenance and responsive asset dimensions are recorded in `public/assets/calendar/README.md`. One Seedream 4.5 image was generated through the signed-in Unlimited website after checking the subscription, mode and final generation control.
