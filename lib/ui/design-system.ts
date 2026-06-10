// Quiet Command — the design language as importable truth.
// Spec: .planning/DESIGN_MASTERPLAN.md. Tailwind theme mirrors these values;
// this module exists so logic (and tests) can reference the system instead
// of magic numbers, and so a designer can retune the language in one place.

/** Optical type scale, 1.2 ratio. Tailwind classes: text-caption … text-hero. */
export const TYPE_SCALE = {
  caption: "0.8125rem",
  body: "1rem",
  emphasis: "1.1875rem",
  title: "1.4375rem",
  display: "1.75rem",
  hero: "2.125rem",
} as const;

/** The three named gaps. Tailwind: gap-tight / gap-group / gap-section etc. */
export const GAPS = { tight: 8, group: 16, section: 28 } as const;

/** Radius set. Tailwind: rounded-control / rounded-card / rounded-panel. */
export const RADII = { control: 12, card: 16, panel: 24, pill: 9999 } as const;

/**
 * Motion verbs — the only four ways anything moves.
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

/** One saturated hue per viewport besides brand — review heuristic. */
export const SATURATION_RULE = "max one subject color per viewport beyond brand";
