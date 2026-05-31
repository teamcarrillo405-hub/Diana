// F8 — Wins feed: group completions by calendar day for /wins page.
// Pure functions only (no React, no DB). Testable in node env.

export type Completion = {
  id: string;
  occurred_at: string;     // ISO timestamp
  assignment_id: string | null;
  assignment_title: string | null;
  assignment_kind: string | null;
  class_name: string | null;
  class_color: string | null;
};

export type DayGroup = {
  day_iso: string;         // YYYY-MM-DD
  day_label: string;       // "Today" | "Yesterday" | "Wednesday, May 27"
  items: Completion[];
};

/** Returns a zero-padded YYYY-MM-DD string for a given Date using local time. */
function isoDay(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Returns "Today", "Yesterday", or a formatted string like "Wednesday, May 27"
 * for dates older than yesterday. Uses local calendar day from `now`.
 */
function dayLabel(targetIso: string, now: Date): string {
  const todayIso = isoDay(now);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yestIso = isoDay(yesterday);

  if (targetIso === todayIso) return "Today";
  if (targetIso === yestIso) return "Yesterday";

  // Parse the ISO string as a local date (no timezone shift)
  const [y, mo, d] = targetIso.split("-").map(Number);
  const dt = new Date(y, mo - 1, d);
  return dt.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

/**
 * Groups completions into DayGroup buckets keyed by local calendar day.
 *
 * - Groups sorted: most recent day first (day_iso descending)
 * - Items within each group: sorted by occurred_at descending
 */
export function groupCompletionsByDay(items: Completion[], now: Date): DayGroup[] {
  if (items.length === 0) return [];

  const buckets = new Map<string, Completion[]>();
  for (const item of items) {
    const iso = isoDay(new Date(item.occurred_at));
    const arr = buckets.get(iso) ?? [];
    arr.push(item);
    buckets.set(iso, arr);
  }

  const groups: DayGroup[] = [];
  for (const [day_iso, dayItems] of buckets) {
    dayItems.sort(
      (a, b) =>
        new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime(),
    );
    groups.push({ day_iso, day_label: dayLabel(day_iso, now), items: dayItems });
  }

  // Most recent day first
  groups.sort((a, b) => b.day_iso.localeCompare(a.day_iso));
  return groups;
}

/**
 * Returns the count of items whose occurred_at falls on the same local
 * calendar day as `now`.
 */
export function countToday(items: Completion[], now: Date): number {
  const today = isoDay(now);
  return items.filter((i) => isoDay(new Date(i.occurred_at)) === today).length;
}

/**
 * Returns the count of items in a rolling 7-day window ending at `now`
 * (inclusive at the 7-day boundary: getTime() >= now - 7d).
 */
export function countThisWeek(items: Completion[], now: Date): number {
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const cutoff = now.getTime() - sevenDaysMs;
  return items.filter((i) => new Date(i.occurred_at).getTime() >= cutoff).length;
}
