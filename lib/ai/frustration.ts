// F18: Frustration escape valve. Detect signs of struggle without judgment.
//
// This intentionally offers a concrete academic next move before any pause.
// The student should feel supported, not sent away to recover alone.

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
1. "Let's do only the next academic move: name what the problem is asking for."
2. "Want to talk through what's confusing, even just one piece of it?"
Never say "that's wrong" or "you're close" because both can land as shame in this state.`;

export function isFrustrationDetected(history: string[]): boolean {
  if (history.length === 0) return false;
  if (history.some((message) => FRUSTRATION_MARKERS.some((pattern) => pattern.test(message)))) {
    return true;
  }

  const normalized = history.map((message) => message.trim().toLowerCase());
  const counts = new Map<string, number>();
  for (const message of normalized) {
    counts.set(message, (counts.get(message) ?? 0) + 1);
  }
  return [...counts.values()].some((count) => count >= 3);
}
