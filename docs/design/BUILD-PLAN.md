# Diana Master Build Plan

This file records the live implementation path from the ScreenDesign reference to a launch-ready student app. `NAVIGATION.md` owns information architecture. `DESIGN-SYSTEM.md` owns reusable interface contracts. `docs/launch/LAUNCH_READINESS.md` owns release evidence and remaining gates.

## Product principles

1. Show the next useful action before explanation.
2. Build pages from a reusable system instead of hand styling each surface.
3. Keep the experience calm. Use amber for attention and ordinary errors. Never use shame, scolding, or streak pressure.
4. Preserve student authorship. Diana assists, prompts, and organizes but does not present generated work as the student's own.
5. Treat accessibility and minor safety as release requirements.

## Working rules

1. Current implementation branch: `codex/figma-47-screen-rebuild`.
2. Commit verified changes in coherent tranches.
3. Keep the service worker disabled during local development.
4. Run development and verification from `C:\Users\glcar\Diana`.
5. Do not remove or reset unrelated dirty worktrees. They may contain user work.
6. Do not merge the release pull request without explicit authorization.

## Current phase status

| Phase | Status | Evidence |
|---|---|---|
| 0. Environment stabilization | Complete for this branch | Development, build, test, Supabase, and Vercel workflows are established. |
| 1. Design system | Complete for the ScreenDesign rebuild | `app/screendesign.css`, the shared shell, authentication, onboarding, and mapped production routes implement the ScreenDesign language. The 47 source exports remain in Figma Make and the local HTML folder; the live Figma Design reference page is currently empty. |
| 2. Navigation structure | Complete | The five destinations are Today, Work, Classes, Calendar, and More on desktop and phone. |
| 3. Forty-seven-screen route and state pass | Complete on this branch | `SCREEN-MAP.md` maps all 47 exports to connected production routes, states, real Supabase data, server actions, LMS integrations, or truthful capability gates. |
| 4. Student AI routing | Complete for the current student features | Twelve Edge Functions use the shared provider adapter and authenticated production smoke passes. |
| 5. Hardening | Complete for automated release gates | Calm copy, type, tests, build, security, authenticated canary, and migration parity are verified. |
| 6. Human launch validation | Pending | Physical devices, five-student protocol, PR merge approval, and operational ownership require people. |

## Shared component kit

The following components are implemented and documented in `DESIGN-SYSTEM.md`:

- Panel and HUD Corners
- Status Pill
- Hero CTA Button
- Metric Tile
- Assignment Lane
- Mission Card and Mission Progress
- Class Card
- Empty State
- Alert Strip
- Slanted Action Button
- Dashboard Tab Shell and Tab Heading

The current extraction is used in:

- `app/(app)/assignments/page.tsx`
- `app/(app)/classes/my-classes-grid.tsx`
- `app/(app)/dashboard/reminder-banner.tsx`
- `app/(app)/dashboard/lobby-audio-note.tsx`

Future page work must reuse the kit. A page-specific component is acceptable when its product behavior is unique, but it should not duplicate a shared status, card, alert, button, lane, metric, or empty-state pattern.

The Figma design-to-code contract is recorded in `DESIGN-SYSTEM.md`. `SCREEN-MAP.md` is the route and data contract for the 47 ScreenDesign exports. Live Code Connect mappings are unavailable on the current Figma Professional plan, so the manual mapping remains authoritative until the account moves to Organization or Enterprise and the component library is published.

## Navigation state

The primary architecture is locked:

| Destination | Route | Purpose |
|---|---|---|
| Today | `/dashboard` | Immediate plan and current context |
| Work | `/assignments` | Cross-class mission board and study tools |
| Classes | `/classes` | Per-subject work, notes, grades, syllabus, and mastery |
| Calendar | `/calendar` | Due dates and workload by day |
| More | Drawer | Secondary product and account destinations |

The old side navigation and abstract Think, Proof, and Future primary tabs are retired. Notes remain available globally and inside class context, while Proof and Future Path live in More.

## Student AI state

The current student-facing Edge Functions use a shared provider adapter with OpenAI as the default and optional Anthropic support. Provider calls remain server-side. The implementation preserves:

- authenticated bearer checks
- student ownership checks
- traffic-light policy checks
- daily token budgets
- calm and minor-safe system prompts
- interaction and authorship logging
- bounded timeouts and token limits

The authenticated production smoke covers citation generation, inbox classification, math help, note tags, reading level, study artifacts, task breakdown, visual tools, vocabulary help, weekly reflection, writing help, and a cross-student ownership denial.

## Hardening checklist

| Item | Status |
|---|---|
| WCAG-focused automated accessibility checks | Complete |
| Keyboard and focus behavior in shared components | Complete for extracted components |
| Calm copy audit including em-dash rule | Complete |
| Responsive automated coverage | Complete |
| Assignment lifecycle tests | Complete |
| Supabase migration parity | Complete |
| Supabase security advisor review | Complete |
| Authenticated production AI smoke | Complete |
| Production browser canary | Complete on automated Chromium |
| iOS Safari, Android Chrome, managed Chromebook | Human gate |
| Five-student teen protocol | Human gate |

## Definition of done

The technical branch is ready for review when all repository gates pass, production migrations and Edge Functions are current, the production Vercel deployment is healthy, and the release evidence is recorded. The project is ready for a school launch only after the remaining human and operational gates in `docs/launch/LAUNCH_READINESS.md` are signed off.

Do not label the market experience fully validated until the real-student protocol is complete.
