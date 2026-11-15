# Classes Roster Preview

Date: 2026-09-16
Status: local concept preview, not a production replacement.
Route: `/landing-3d/classes-concept-review`

## Direction

The user chose the Work Franchise hub but explicitly deferred live integration.
This Classes preview applies the proposed roster/profile approach separately.
The class lineup remains visible on desktop; the selected course has its own
subject artwork, identity, concise record, and four sections. A compact native
class selector replaces the lineup on phones.

The structural reference is roster selection plus a detailed profile, described
in EA's Franchise documentation. It is an original Diana adaptation, not a copied
Madden screen or a claim of equivalent production quality.
https://www.ea.com/games/madden-nfl/madden-nfl-27/news/madden-27-franchise-mode

## Content and Behavior

- Overview shows active work and a recent material.
- Assignments filters in-progress, ready-to-submit, and submitted work separately.
- Notes & Materials provides type/search filters and a readable sample document dialog.
- Practice opens a local two-question sample set with explanations and replay.
- Arrow/Home/End navigation supports both class and section tabs.
- Course sections remain mounted, preserving filters between section visits.
- Changing class keeps the selected section and resets its class-specific filters.
- Dialogs use native modality and restore focus to their opener on close.
- Reduced-motion users receive instant class switching.

## Boundaries

All six courses, teacher names, grades, dates, materials, and assignments are
synthetic. Neither preview queries or changes student records. Assignment actions
open sample details; they do not create sessions or submit work. Sample practice
does not call AI, award credit, or persist a result.

The route uses the existing loopback/development QA guard and noindex metadata.
Live `/classes`, individual class pages, and `/assignments` were not changed.
Only the Work concept's Classes link now points to this concept; both have
explicit links back to the live application.

## Visual Materials

Reuses the approved Work concept's header styling, type, Diana studio background,
and realistic pink selection brush. New CSS is locally scoped to avoid legacy
global styles affecting the preview. Subject images are existing WebP assets in
`public/assets/landing-10k/subjects`; no media generation or credits were used.
Grade data is labeled recorded, never converted to a made-up player rating.

## Verification

- TypeScript and scoped ESLint passed.
- Ten Classes tests plus seven Work tests and two local guard tests passed.
- Rendered review at 1440 x 1000, 834 x 1112, and 390 x 844.
- Checked tab changes, material reader, Escape close and return focus.
- Checked sample practice answer feedback and focus on the next question.
- Checked mobile class selection, no-grade/no-active-work states and page overflow.
- Reduced-motion emulation confirmed no animated main content; desktop and tablet
  had no page-width overflow, and all inspected subject images loaded.

The concept is ready for visual review, not a production migration. Production
integration must preserve source-backed grades, materials, AI policies and actual
workspace destinations instead of promoting any fixture content.
