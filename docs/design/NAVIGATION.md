# Diana Navigation Architecture

This document is the current routing source of truth for student-facing navigation.

Last verified: 2026-11-14.

## Primary navigation

Diana uses five destinations across authenticated pages:

```text
TODAY | WORK | CLASSES | CALENDAR | MORE
```

The shared desktop and mobile navigation is defined by `lib/navigation.ts` and rendered by `components/screen-design/student-desktop-nav.tsx` and `components/screen-design/student-bottom-nav.tsx`.

| Destination | Route | Product role |
|---|---|---|
| Today | `/dashboard` | The student's immediate plan and next useful action |
| Work | `/assignments` | Assignment workspace, review, focus, submission, and captures |
| Classes | `/classes` | Subject-level assignments, notes, syllabus, rubrics, and mastery |
| Calendar | `/calendar` | Timing, workload, and planning context |
| More | `/more` | Search, record, wellness, and sharing tools |

The desktop Add menu links to `/quick-add` and `/notes/new`. Profile and settings controls link to `/me` and `/settings`.

## Supporting routes

These routes are part of the current product but are not primary destinations:

- `/assignments/captures/[id]` for reviewing a captured item
- `/notes`, `/notes/new`, and `/notes/[id]` for notes
- `/study` and `/study-artifacts` for study work and saved artifacts
- `/search` for finding classes, work, notes, and tools
- `/proof` for completed work and showcase records
- `/wellness` for student check-ins
- `/sharing` for the weekly parent digest
- `/settings` and `/me` for account, access, and personal controls

## Capture flow

```text
Quick add or note capture
  -> authenticated classification
  -> /assignments/captures/[id] review
  -> confirmed class or assignment destination
```

Students review and can change any suggested class, work type, or date before confirmation.

## Route ownership rule

Before adding or moving a feature, give it a current owning destination. Keep assignment-specific work inside Work, class-specific material inside Classes, and utility surfaces within More or Settings. Update this document and `lib/navigation.ts` in the same change when navigation changes.
