# Diana Design System

This is the implementation contract for Diana's shared interface kit. New product surfaces must use these components and the tokens in `app/globals.css` before introducing page-specific styles.

## Foundations

| Layer | Source | Purpose |
|---|---|---|
| Primitive tokens | `app/globals.css` | Color, type, spacing, radius, shadow, blur, and layout values |
| Component tokens | `--ds-*` variables in `app/globals.css` | Shared card, focus, disabled, and interaction behavior |
| Components | `components/ui/` | Reusable structure, variants, and accessible states |
| Product composition | `app/(app)/` | Page data and product-specific content |

Rules:

1. Use `var(--gl-*)` or `var(--ds-*)` for colors and shared effects. Do not add raw color values to product components.
2. Use Saira Condensed through `var(--font-display)` for display headings and strong actions. Use Barlow Semi Condensed through `var(--font-body)` for body copy and labels.
3. Attention states use the gold token family. Do not use red for due work, validation, or ordinary errors.
4. Every interactive component needs a visible keyboard focus state, a disabled or waiting state when applicable, and a useful accessible name.
5. Empty states are calm, brief, and actionable. They never imply blame.

## Shared Components

### Panel

- File: `components/ui/panel.tsx`
- Props: `tone?: "default" | "cyan"`, `className?`, `style?`, `children`
- Use: shared card and dashboard container.
- Accessibility: add a landmark role only when the panel has a real semantic role.

### HUD Corners

- File: `components/ui/hud-corners.tsx`
- Props: `color?`, `size?`
- Use: decorative corner treatment within a positioned parent.
- Accessibility: decorative spans are hidden from assistive technology.

### Dashboard Tab Shell and Tab Heading

- Files: `components/ui/dashboard-tab-shell.tsx`, `components/ui/tab-heading.tsx`
- Use: shared page width, background, padding, kicker, title, and subtitle structure.
- Accessibility: `TabHeading` provides the page's single `h1`.

### Status Pill

- File: `components/ui/status-pill.tsx`
- Props: `label`, `tone?`, `showIcon?`, `className?`
- Tones: `ready`, `in-progress`, `submitted`, `attention`, `graded`, `current`, `muted`
- Helper: `assignmentStatusTone(status)` maps assignment lifecycle values to calm visual tones.
- Accessibility: icons are decorative because the label carries the meaning. Color is never the only status signal.

### Hero CTA Button

- File: `components/ui/hero-cta-button.tsx`
- Props: `href`, `children`, `icon?`, `trailingIcon?`, `compact?`, `className?`
- Use: the strongest page action, with cyan fill, display type, and a consistent focus state.
- States: default, hover, active, focus-visible, compact.

### Metric Tile

- File: `components/ui/metric-tile.tsx`
- Props: `label`, `value`, `detail`, `tone`
- Tones: `cyan`, `pink`, `gold`, `blue`, `purple`
- Use: short dashboard metrics with a tone bar and large value.

### Assignment Lane

- File: `components/ui/assignment-lane.tsx`
- Props: `eyebrow`, `title`, `count`, `tone`, `children`
- Use: a lane heading, item count, and responsive two-column card grid.
- Accessibility: renders a semantic section with an `h2`.

### Mission Card and Mission Progress

- File: `components/ui/mission-card.tsx`
- Mission Card props: `href`, `tone`, `children`
- Mission Progress props: `percent`
- Use: tokenized assignment cards and bounded progress from 0 to 100.
- Accessibility: the whole card is one link. Progress includes an accessible percentage label.

### Class Card

- File: `components/ui/class-card.tsx`
- Props: `card: ClassCardModel`
- CTA variants: `cyanFilled`, `goldFilled`, `cyanOutline`, `dark`
- Use: the shared My Classes card, including current class, event, task, progress, action, and optional study controls.
- Accessibility: headings and links remain semantic. Status and progress have text labels.

### Empty State

- File: `components/ui/empty-state.tsx`
- Props: `title`, `description`, `action?`, `compact?`
- Use: calm empty and first-run states with one optional action.

### Alert Strip

- File: `components/ui/alert-strip.tsx`
- Props: `tone?`, `children`, `trailing?`, `onClick?`, `expanded?`, `label?`, `className?`
- Tones: `info`, `warning`, `success`
- Behavior: renders a button when clickable and a non-interactive container otherwise.
- Accessibility: clickable strips expose `aria-expanded` and accept an explicit label.

### Slanted Action Button

- File: `components/ui/slanted-action-button.tsx`
- Modes: link through `href`, or native button props.
- Props: `children`, `compact?`, `className?`, plus link or button props.
- Use: the lime Diana action convention.
- States: default, hover, active, focus-visible, disabled or waiting.

## Navigation Components

- Desktop and wide-screen navigation: `app/(app)/app-top-nav.tsx`
- Phone navigation: `app/(app)/mobile-tab-bar.tsx`
- Shared drawer: `app/(app)/more-menu.tsx`
- Locked destinations: Today, Work, Classes, Calendar, More.

The old side navigation is retired. Do not introduce another primary navigation pattern.

## Verification

- Component contract tests: `components/ui/design-system.test.tsx`
- Class composition tests: `app/(app)/classes/my-classes-grid.test.tsx`
- Copy invariant: `npm run tone-audit`
- Type safety: `npm run typecheck`
- Full test suite: `npm run test:run`

The shared kit is implemented and used by the Assignments page, My Classes grid, dashboard reminder, and dashboard audio-note action. Broader page migration remains incremental, but new work must start from this kit.
