# Diana Navigation Architecture

This is the routing source of truth. Check it before adding a page, changing primary navigation, or moving a feature.

Last verified: 2026-07-14.

## Primary navigation

Diana uses one five-destination navigation model across authenticated pages:

```text
TODAY | WORK | CLASSES | CALENDAR | MORE
```

Wide screens use `app/(app)/app-top-nav.tsx`. Phones use `app/(app)/mobile-tab-bar.tsx`. Both open the same `app/(app)/more-menu.tsx` drawer. The old side navigation is retired.

| Destination | Route | Product role |
|---|---|---|
| Today | `/dashboard` | The student's immediate plan, current class context, reminders, and fast capture |
| Work | `/assignments` | Cross-class mission board, study tools, and assignment actions |
| Classes | `/classes` | Per-subject assignments, notes, grades, syllabus, rubrics, and mastery |
| Calendar | `/calendar` | Assignment timing and accommodation-aware workload |
| More | Drawer | Evidence, growth, support, account, connection, and sharing destinations |

Quick capture, record, and Settings shortcuts may appear beside the destination list. They do not become additional primary tabs.

## Destination contents

### Today

Route: `/dashboard`

- Lobby hero and next useful action
- Reminder or attention strip
- Current class context
- Text or voice capture

### Work

Route: `/assignments`

- Start-now action
- Mission metrics
- Assignment lanes
- Study tools
- Voice entry point
- Inbox access

### Classes

Routes: `/classes`, `/classes/[id]`

The class is Diana's subject-level organizing unit. A class hub may contain:

- assignments for that class
- subject-specific notes and new-note action
- grades and feedback context
- syllabus information
- rubrics and teacher rules
- mastery information
- approved learning sources

`/notes` remains the cross-subject notes and search surface. It is not a primary Think tab.

### Calendar

Route: `/calendar`

- weekly assignment view
- daily workload grouping
- accommodation-aware time expectations

### More

Evidence and growth:

- Proof: `/proof`
- Grades: `/grades`
- Transcript: `/grades/transcript`
- Portfolio: `/portfolio`
- Future Path: `/future-path`
- AP exam prep: `/ap`

Learn and review:

- Search: `/search`
- Study artifacts: `/study-artifacts`
- Tutor: `/study-buddy`
- Knowledge graph: `/knowledge-graph`

Profile and support:

- Notifications: `/notifications`
- Tutor settings: `/settings/tutor`
- Study goals: `/settings/goals`
- Me: `/me`
- Wellness: `/wellness`
- Settings and accessibility controls: `/settings`

Connections and sharing:

- Export and privacy: `/export`
- Parent and teacher sharing: `/sharing`
- Study groups: `/study-groups`

`/insights` is an internal or administrative analytics surface. It must not appear in student navigation.

## Merged and retired routes

| Former route | Current home |
|---|---|
| `/focus` | Start-now and focus actions under Work |
| `/body-double` | `/timer?with=others` |
| `/shame-mode` | Retired |
| `/wins` | Proof |
| `/recap` | Proof |
| `/reminders` | Calendar and Settings |
| `/templates` | New assignment flow |
| `/parent-share` | `/sharing` redirect |
| `/teacher-share` | `/sharing` redirect |
| `/accessibility` | Settings |
| `/imports` | Settings |

Do not reintroduce a curated middle page in front of a real destination.

## AI placement

- `/voice` is the general Diana conversation and planning surface. Work provides a prominent entry point.
- `/study-buddy` supports guided learning and is reachable from study tools and class context.
- `/break-down` turns a task into smaller student-owned steps and is reachable from Work.
- Assignment-specific AI actions stay with the assignment rather than becoming primary navigation.

All student AI calls route through authenticated server or Edge Function boundaries. Client navigation never carries provider credentials.

## Capture flow

The connected capture path is:

```text
Quick add or record
  -> inbox row
  -> authenticated classification
  -> student review
  -> confirmed class or assignment destination
```

The classifier enforces row ownership. The student can review and change suggestions before confirming.

## Implementation status

- Five-destination desktop navigation: complete.
- Five-destination phone navigation: complete.
- Shared More drawer: complete.
- Old side navigation: removed.
- Notes in class context plus global notes: complete.
- Study tools on Work: complete.
- Capture and record persistence: complete.
- Inbox classification and ownership boundary: complete and production-smoke tested.
- Syllabus per class: complete and migrated.

## Rule going forward

Before adding or moving a feature, identify its owning destination here. If it does not justify a primary destination, place it within the relevant class, assignment, or More group. Update this file in the same change that updates navigation code.
