export type SessionMood = "good" | "meh" | "rough" | null | undefined;

export function adaptiveBreakMinutes({
  workMinutes,
  baseBreakMinutes,
  mood,
  difficulty,
}: {
  workMinutes: number;
  baseBreakMinutes: number;
  mood?: SessionMood;
  difficulty?: number | null;
}): number {
  const work = clampInt(workMinutes, 5, 60);
  const base = clampInt(baseBreakMinutes, 1, 30);
  let next = base;

  if (mood === "rough") next += 3;
  else if (mood === "meh") next += 1;

  if ((difficulty ?? 3) >= 4) next += 2;
  if (work >= 40) next += 2;

  return clampInt(next, 1, 30);
}

export function bodyDoubleBreakdown(seedDate: Date = new Date()): Array<{ label: string; count: number }> {
  const seed = Math.floor(seedDate.getTime() / (1000 * 60 * 7));
  return [
    { label: "Math", count: 1 + (seed % 4) },
    { label: "Reading", count: 1 + ((seed + 2) % 3) },
    { label: "Writing", count: 1 + ((seed + 4) % 3) },
    { label: "Review", count: 1 + ((seed + 1) % 4) },
  ];
}

export function taskSwitchMessage(previousTitle: string | null, nextTitle: string): string | null {
  if (!previousTitle || previousTitle === nextTitle) return null;
  return "Switching tasks has a 15-min warm-up cost. Stay here or switch?";
}

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.round(value)));
}
