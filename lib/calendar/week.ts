import { addDays, format, isSameDay, parseISO, startOfWeek } from "date-fns";
import type { Assignment } from "@/lib/scoring/next-five-minutes";

/**
 * Returns 7 consecutive Date objects starting on the Monday of the week
 * containing `anchor` (Mon-Sun). Uses date-fns startOfWeek with
 * weekStartsOn: 1 (Monday) which matches school-week conventions.
 */
export function buildWeek(anchor: Date): Date[] {
  const monday = startOfWeek(anchor, { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

/**
 * Buckets assignments into a Map keyed by ISO date string (YYYY-MM-DD).
 * Timezone note: due_at is stored as UTC in Postgres. We compare in UTC
 * to stay consistent with the rest of the app's storage convention.
 * (A midnight-UTC due date will appear on its UTC calendar day, which for
 * US students may differ from local time — documented design decision.)
 */
export function groupByDay(
  assignments: Assignment[],
  week: Date[],
): Map<string, Assignment[]> {
  const buckets = new Map<string, Assignment[]>();
  for (const day of week) {
    buckets.set(format(day, "yyyy-MM-dd"), []);
  }
  for (const a of assignments) {
    if (!a.due_at) continue;
    const due = parseISO(a.due_at);
    const match = week.find((d) => isSameDay(d, due));
    if (!match) continue;
    const key = format(match, "yyyy-MM-dd");
    buckets.get(key)!.push(a);
  }
  return buckets;
}

export type WorkloadTier = "light" | "moderate" | "heavy" | "overloaded";

/**
 * Overload tiers from F9 research:
 * 0–90 min: light, 91–150: moderate, 151–240: heavy, 241+: overloaded.
 * Calm invariant: overloaded uses violet (calming), never red.
 */
export function workloadTier(totalMinutes: number): WorkloadTier {
  if (totalMinutes <= 90) return "light";
  if (totalMinutes <= 150) return "moderate";
  if (totalMinutes <= 240) return "heavy";
  return "overloaded";
}

export function workloadBarClass(tier: WorkloadTier): string {
  switch (tier) {
    case "light":
      return "bg-emerald-100 text-slate-950";
    case "moderate":
      return "bg-amber-100 text-slate-950";
    case "heavy":
      return "bg-amber-300 text-slate-950";
    case "overloaded":
      return "bg-violet-200 text-slate-950";
  }
}
