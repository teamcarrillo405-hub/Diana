import { type BreakdownStep, MAX_STEPS, MAX_MINUTES_PER_STEP } from "./types";

export type { BreakdownStep };

const FALLBACK_STEPS: BreakdownStep[] = [
  { step: 1, action: "Read the assignment description.", minutes: 5, done: false },
];

/**
 * Checks whether an unknown value looks like a valid step object.
 * Valid = has numeric step, non-empty action string, and minutes in [1, 5].
 */
export function isValidStep(
  x: unknown,
): x is { step: number; action: string; minutes: number } {
  if (x === null || typeof x !== "object") return false;
  const obj = x as Record<string, unknown>;
  if (typeof obj.step !== "number") return false;
  if (typeof obj.action !== "string" || obj.action.trim() === "") return false;
  if (typeof obj.minutes !== "number") return false;
  if (obj.minutes < 1 || obj.minutes > MAX_MINUTES_PER_STEP) return false;
  return true;
}

/**
 * Robustly extracts an array of BreakdownStep from Claude's raw text output.
 * Handles prose-wrapped JSON (Pitfall 3), clamps minutes, truncates to MAX_STEPS.
 * Never throws — returns fallback on any parse failure.
 */
export function parseStepsFromContent(content: string): BreakdownStep[] {
  if (!content || !content.trim()) return FALLBACK_STEPS;

  try {
    // Extract the first JSON array from the content (handles prose before/after)
    const match = content.match(/\[[\s\S]*\]/);
    if (!match) return FALLBACK_STEPS;

    const raw: unknown = JSON.parse(match[0]);
    if (!Array.isArray(raw)) return FALLBACK_STEPS;

    // Clamp minutes on every item before filtering
    const clamped = raw.map((item: unknown) => {
      if (item !== null && typeof item === "object") {
        const obj = item as Record<string, unknown>;
        if (typeof obj.minutes === "number") {
          return {
            ...obj,
            minutes: Math.min(Math.max(1, obj.minutes), MAX_MINUTES_PER_STEP),
          };
        }
      }
      return item;
    });

    // Filter out invalid steps (including those with empty actions)
    const valid = clamped.filter(isValidStep);
    if (valid.length === 0) return FALLBACK_STEPS;

    // Truncate to MAX_STEPS, renumber, and set done: false
    return valid.slice(0, MAX_STEPS).map((s, i) => ({
      step: i + 1,
      action: s.action,
      minutes: s.minutes,
      done: false,
    }));
  } catch {
    return FALLBACK_STEPS;
  }
}
