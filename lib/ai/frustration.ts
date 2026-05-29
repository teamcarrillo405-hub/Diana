// F18: Frustration escape valve. Detect signs of struggle without judgment.
//
// NOTE: This implementation INTENTIONALLY DIVERGES from the REQUIREMENTS.md spec.
// Spec suggests offering a worked example on frustration; we instead offer a
// 5-min break or a talk-through (lower cognitive load for ADHD/dyslexia students).
// See Plan 06-01 objective DECISION NOTE.

export const FRUSTRATION_MARKERS: RegExp[] = [
  /\bugh\b/i,
  /\bi give up\b/i,
  /\bthis is impossible\b/i,
  /\bi hate this\b/i,
  /\bidk\b/i, // repeated "idk" pattern handled by repetition check
];

export const FRUSTRATION_REDIRECT = `If the student shows frustration (repeated \
identical questions, "ugh", "I give up"), do NOT push harder on the problem. \
Acknowledge it calmly and offer two off-ramps:
1. "Take a 5-minute break? I can start a Pomodoro for you."
2. "Want to talk through what's confusing — even just one piece of it?"
Never say "that's wrong" or "you're close" — both can land as shame in this state.`;

export function isFrustrationDetected(history: string[]): boolean {
  if (history.length === 0) return false;
  // Marker match in any message
  if (history.some((m) => FRUSTRATION_MARKERS.some((re) => re.test(m))))
    return true;
  // 3+ repeated identical (normalized) requests
  const norm = history.map((m) => m.trim().toLowerCase());
  const counts = new Map<string, number>();
  for (const m of norm) counts.set(m, (counts.get(m) ?? 0) + 1);
  return [...counts.values()].some((c) => c >= 3);
}
