// Real XP / level / streak, derived from actual student activity.
//
// No new tables: XP is computed from existing signals (completed task_signals,
// study time-log days, flashcard reviews, notes). Calm-by-design — points reward
// showing up, never punish absence, and there is no leaderboard.

export type XpActivity = {
  /** ISO timestamps of completed task_signals. */
  completionDates: string[];
  /** Distinct YYYY-MM-DD day keys with study activity. */
  studyDayKeys: string[];
  flashcardReviews: number;
  notesCreated: number;
};

export type XpSummary = {
  totalXp: number;
  level: number;
  /** XP earned inside the current level. */
  xpIntoLevel: number;
  /** XP needed to reach the next level from the current one. */
  xpForNextLevel: number;
  pctToNext: number;
  streakDays: number;
};

const XP_PER = {
  completion: 20,
  studyDay: 12,
  review: 3,
  note: 6,
} as const;

function dayKeyFromIso(iso: string): string {
  return iso.slice(0, 10);
}

function isoDayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Level curve: each level costs a bit more than the last (100, 150, 200, …). */
export function levelForXp(totalXp: number): { level: number; intoLevel: number; forNext: number } {
  let level = 1;
  let remaining = Math.max(0, Math.floor(totalXp));
  let cost = 100;
  while (remaining >= cost) {
    remaining -= cost;
    level += 1;
    cost = 100 + (level - 1) * 50;
  }
  return { level, intoLevel: remaining, forNext: cost };
}

/**
 * Consecutive active days ending today (or yesterday, so the streak doesn't
 * "break" just because today's work hasn't happened yet).
 */
export function computeStreak(activeDayKeys: Set<string>, now: Date): number {
  const dayMs = 86_400_000;
  let cursor = new Date(now);
  if (!activeDayKeys.has(isoDayKey(cursor))) {
    cursor = new Date(now.getTime() - dayMs);
    if (!activeDayKeys.has(isoDayKey(cursor))) return 0;
  }
  let streak = 0;
  while (activeDayKeys.has(isoDayKey(cursor))) {
    streak += 1;
    cursor = new Date(cursor.getTime() - dayMs);
  }
  return streak;
}

export function computeXp(activity: XpActivity, now: Date): XpSummary {
  const studyDays = new Set(activity.studyDayKeys);
  const totalXp =
    activity.completionDates.length * XP_PER.completion +
    studyDays.size * XP_PER.studyDay +
    Math.max(0, activity.flashcardReviews) * XP_PER.review +
    Math.max(0, activity.notesCreated) * XP_PER.note;

  const { level, intoLevel, forNext } = levelForXp(totalXp);

  const activeDays = new Set<string>(studyDays);
  for (const iso of activity.completionDates) activeDays.add(dayKeyFromIso(iso));

  return {
    totalXp,
    level,
    xpIntoLevel: intoLevel,
    xpForNextLevel: forNext,
    pctToNext: forNext > 0 ? Math.round((intoLevel / forNext) * 100) : 0,
    streakDays: computeStreak(activeDays, now),
  };
}
