// Nexus Diana Arcade -- the design language as importable truth.
// Derived from the supplied Nexus Arcade design source and adapted for
// Diana's calm invariant.

/** Optical type scale, tuned for dense arcade dashboards and calm reading. */
export const TYPE_SCALE = {
  caption: "0.75rem",
  body: "1rem",
  emphasis: "1.125rem",
  title: "1.375rem",
  display: "2rem",
  hero: "clamp(3rem, 7vw, 6.5rem)",
} as const;

/** Eight-pixel arcade grid. Tailwind: gap-tight / gap-group / gap-section. */
export const GAPS = { tight: 8, group: 16, section: 32 } as const;

/** Sharp Nexus geometry; circles are reserved for orbit/status cores. */
export const RADII = { control: 2, card: 2, panel: 2, pill: 2, orbit: 9999 } as const;

export const NEXUS_COLORS = {
  background: "#02030A",
  surface: "#100A24",
  surface2: "#171032",
  text: "#F8F3FF",
  muted: "#A9A1B8",
  cyan: "#35DDF2",
  pink: "#F45BA8",
  gold: "#E8B85D",
  blue: "#5E8CFF",
  purple: "#A477FF",
} as const;

/**
 * Motion verbs -- the only four ways anything moves.
 * Settle: content entering. Respond: press/toggle feedback.
 * Carry: screen-to-screen continuity. Breathe: ambient, never on text.
 * Rules: nothing bounces, nothing travels >12px, everything interruptible,
 * reduced-motion collapses every verb to opacity (globals.css enforces).
 */
export const MOTION = {
  settle: { durationMs: 240, distancePx: 8 },
  respond: { durationMs: 120, scale: 0.97 },
  carry: { durationMs: 280 },
  breathe: { minDurationMs: 2000, maxDeltaPct: 6 },
} as const;

/** One saturated hue per viewport besides brand -- review heuristic. */
export const SATURATION_RULE = "max one subject color per viewport beyond brand";

/** Diana Nexus primitives. Tailwind/CSS class names mirror these. */
export const SIGNAL_SURFACES = {
  stage: "signal-stage",
  field: "signal-stage-dark",
  device: "diana-device",
  poster: "student-signal-poster",
  rightNow: "right-now-signal",
  commandDock: "mobile-command-dock-base",
  nexusShell: "nexus-page-shell",
  nexusPanel: "nexus-panel",
} as const;

/** Screenshot-worthy acceptance heuristic for primary surfaces. */
export const SCREENSHOT_WORTHY = {
  desktopPrimaryWidthRatio: 0.52,
  mobilePrimaryWidthRatio: 0.82,
  requiredRoutes: ["/", "/login", "/signup", "/onboarding", "/dashboard"] as const,
} as const;
