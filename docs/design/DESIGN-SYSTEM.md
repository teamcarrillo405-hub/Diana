# Diana Design System

This document is the Phase 1c deliverable from the master BUILD-PLAN.md. It lists every component in the kit, its variants, states, tokens, and accessibility notes. If a component is not documented here, it does not exist — the next page must not reinvent it.

**Sources of truth:**
- Token values: `tokens.css` (--gl-* aliases)
- Visual reference: `Student Lobby.dc.html`
- Written plan: `Dashboard Plan.md`

---

## Visual System Quick Reference

| Element | Value |
|---|---|
| Page base | `var(--gl-bg-base)` — `#04060f` |
| Hero zone | `var(--gl-bg-hero)` — `#0a1024` |
| Top nav | `var(--gl-bg-nav)` — `rgba(2,5,14,.72)` + `var(--blur-nav)` |
| Primary accent | `var(--gl-cyan)` — `#29d0ff` |
| Display font | `var(--font-display)` — Saira Condensed |
| Body font | `var(--font-body)` — Barlow Semi Condensed |
| Card surface | `var(--gl-bg-card)` + `var(--blur-card)` + `var(--gl-border-neutral)` + `var(--radius-card)` |

**Never invent new colors. Never use raw hex values. All values must resolve to a `var(--gl-*)` token.**

---

## Component Catalogue

### 1. Panel

**File:** `components/ui/panel.tsx`
**Props:** `tone?: 'default' | 'cyan'`, `className?`, `style?`, `children`

The single shared container for all dashboard cards. 46 occurrences across 13 files collapsed to one import.

| Tone | Background | Border |
|---|---|---|
| `default` | `var(--gl-bg-card)` | `1px solid var(--gl-border-neutral)` |
| `cyan` | `var(--gl-cyan-08)` | `1px solid var(--gl-cyan-22)` |

Both tones use `borderRadius: var(--radius-card)` and `backdropFilter: var(--blur-card)`.

**Accessibility:** Panel is a layout container. Screen-reader meaning comes from its contents, not the panel itself. Do not add `role` unless the panel is a dialog or landmark.

---

### 2. HUD Corner Brackets

**File:** `components/ui/hud-corners.tsx`
**Props:** `color?: string` (default `var(--gl-cyan-85)`), `size?: number` (default 16)

The named corner-bracket motif from the design system. Four absolute-positioned L-shaped spans at TL/TR/BL/BR. Parent must be `position: relative` with `overflow: visible`.

```tsx
<div style={{ position: "relative" }}>
  <HudCorners />
  {/* panel content */}
</div>
```

For a custom color (e.g. gold accent panel): `<HudCorners color="var(--gl-gold-85)" />`

**Accessibility:** All four spans carry `aria-hidden="true"` — purely decorative.

---

### 3. Dashboard Tab Shell

**File:** `components/ui/dashboard-tab-shell.tsx`
**Props:** `children`

Shared outer wrapper for all WORK / THINK / PROOF / FUTURE tab pages. Provides the `bg-base` full-height background and the `max-width` centered inner container with standard padding.

```tsx
export default function WorkPage() {
  return (
    <DashboardTabShell>
      <DashboardTabs />
      <TabHeading ... />
      {/* page content */}
    </DashboardTabShell>
  );
}
```

**Do not add padding or background to children** — the shell provides all layout context.

---

### 4. Tab Heading

**File:** `components/ui/tab-heading.tsx`
**Props:** `kicker: string`, `title: string`, `sub: string`, `accent?: string`

The kicker + H1 + subtitle heading block used on every dashboard tab page. The `accent` prop controls the kicker color token.

| Tab | accent value |
|---|---|
| WORK | `var(--gl-cyan)` |
| THINK | `var(--gl-purple-light)` |
| PROOF | `var(--gl-green)` |
| FUTURE | `var(--gl-gold)` |

**Accessibility:** Renders a semantic `<header>` with an `<h1>`. Each tab page must have exactly one `<h1>`.

---

### 5. AppTopNav

**File:** `app/(app)/app-top-nav.tsx`

The shared top navigation bar. Already the model component. Present on every authenticated page. Contains: left icon buttons (note, voice), center tab links (TODAY / WORK / THINK / PROOF / FUTURE), right Capture button + avatar.

**States:** Active tab shows cyan underline bar. Inactive tabs use `var(--gl-text-nav-inactive)`.

**Token note:** The nav currently has some raw hex values that should be updated to `--gl-*` aliases. This does not affect behavior but creates drift risk. File a cleanup pass when touching the nav.

---

### 6. Status Badge / Pill

**Not yet extracted.** 6 ad-hoc implementations across 4 files. Build target for Phase 1b continuation.

Variants needed:
- `ready` — neutral (muted bg + muted text)
- `in-progress` — cyan tint
- `submitted` — green tint
- `past-due` — amber tint (NOT red — calm invariant)
- `graded` — green
- `current` — cyan solid

**Rule:** Past-due uses amber (`var(--gl-gold)` family), never red. Red is reserved for recording and critical system errors.

---

### 7. Hero CTA Button

**Not yet extracted.** 4 ad-hoc implementations. Build target for Phase 1b continuation.

Pattern: solid cyan fill, Saira Condensed italic uppercase, ArrowRight or Timer icon, `var(--shadow-hero-cta)` box-shadow.

The `start-session-button.tsx` is a near-complete implementation — extract it to `components/ui/hero-cta-button.tsx` with a `href`, `label`, and optional `icon` prop.

---

### 8. Lane (header + card grid)

**Not yet extracted.** Present in assignments page. Build target for Phase 3.

A section eyebrow label + title + count badge + card grid below. The BUILD-PLAN section on Phase 1b lists this as an extraction target.

---

### 9. Empty State

**Not yet extracted.** Several one-off implementations. Build target for Phase 3.

Calm framing: no broken-icon imagery, no red. Short copy, one optional action.

---

### 10. Alert Strip

**Partially implemented.** `reminder-banner.tsx` exists but uses Tailwind classes instead of `--gl-*` tokens — must be reconciled before wiring into the alert slot. `time-bar.tsx` implements a red-border past-due variant (should use amber). Unify under one `<AlertStrip>` component with `tone: 'info' | 'warning'`.

**Do not use red for past-due alerts.** Amber (`var(--gl-gold)` family) is the attention color.

---

### 11. Slanted Action Button (Talk to Diana)

**Not yet extracted.** Currently exists only in `lobby-audio-note.tsx`. Pattern: lime background (`var(--gl-lime)`), `skewX(-8deg)` transform, inner label counter-skewed `skewX(8deg)`.

---

## Token Quick Reference (most-used)

```css
/* Backgrounds */
var(--gl-bg-base)         /* #04060f — page */
var(--gl-bg-hero)         /* #0a1024 — hero zone */
var(--gl-bg-card)         /* rgba(4,8,20,.72) — cards */
var(--gl-bg-nav)          /* rgba(2,5,14,.72) — top nav */
var(--gl-bg-overlay)      /* rgba(4,8,20,.40) — upload/photo overlays */

/* Cyan family (primary accent) */
var(--gl-cyan)            /* #29d0ff — CTAs, active states */
var(--gl-cyan-85)         /* .85 opacity — HUD bracket color */
var(--gl-cyan-22)         /* .22 opacity — standard borders */
var(--gl-cyan-08)         /* .08 opacity — info card background */
var(--gl-text-on-cyan)    /* #04080f — text on cyan buttons */

/* Status colors */
var(--gl-green)           /* success / submitted */
var(--gl-gold)            /* warning / past-due / not-submitted */
var(--gl-red)             /* overdue dot / recording only */
var(--gl-purple)          /* overwhelmed / focus-mode */

/* Text */
var(--gl-text-primary)    /* #ffffff */
var(--gl-text-secondary)  /* #cdd6f2 */
var(--gl-text-muted)      /* #aab8e0 */
var(--gl-text-dim)        /* #7d88ad */
var(--gl-text-nav-inactive) /* #8b96bd */

/* Shadows */
var(--shadow-hero-cta)    /* cyan glow + black lift — hero CTA buttons */
var(--shadow-cta-green)   /* green glow — success CTAs */

/* Radii */
var(--radius-card)        /* 14px — cards and panels */
var(--radius-pill)        /* 20px — chips and pills */
var(--radius-hero)        /* 12px — hero CTA buttons */

/* Layout */
var(--layout-max-width)   /* 1760px — all pages */
var(--layout-work-rail)   /* 380px — WORK tab sidebar */
```

---

## Subject Accent Colors

These are the locked values from `tokens.css` section 8. Use these, not inline hex values.

| Subject | Token | Value |
|---|---|---|
| Math | `var(--gl-subject-math)` | `#ff6a3d` |
| English | `var(--gl-subject-english)` | `#29d0ff` |
| Science | `var(--gl-subject-science)` | `#36e07a` |
| History | `var(--gl-subject-history)` | `#ffd24a` |
| Athletics | `var(--gl-subject-athletics)` | `#7e5cff` |
| Art | `var(--gl-subject-art)` | `#f25fb0` |

**Note:** `classTheme()` in `dashboard/page.tsx` has gradient values that diverge from the token doc comments. These need reconciliation in a follow-up pass before the Class Card component is built.

---

## Invariants (enforced across every page)

1. **Calm framing** — No red on due dates or status. Past-due = amber. Red = recording/critical only.
2. **Token-only colors** — All color values via `var(--gl-*)`. No raw hex.
3. **Font system** — Display (Saira Condensed) for headings and CTAs; Body (Barlow Semi Condensed) for labels and text.
4. **HUD motif** — Corner brackets are always `<HudCorners />` from `components/ui/hud-corners.tsx`. Never 4 raw spans.
5. **Single top bar** — `AppTopNav` on every authenticated page. The old sidebar is fully retired.
6. **Empty + populated states** — Every component must handle both. No half-built empty states.
