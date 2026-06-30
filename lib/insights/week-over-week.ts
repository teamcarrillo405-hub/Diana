// This-week vs last-week comparison from a list of activity timestamps.
// Monday-based, UTC (consistent with the parent digest + calendar week math).

export type WeekOverWeek = {
  thisWeek: number;
  lastWeek: number;
  delta: number;
  direction: "up" | "down" | "steady";
  /** Calm one-liner; never shaming. */
  label: string;
};

function mondayUtc(now: Date): Date {
  const day = now.getUTCDay();
  const daysFromMonday = (day + 6) % 7;
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysFromMonday),
  );
}

export function weekOverWeek(dates: string[], now: Date): WeekOverWeek {
  const startOfThisWeek = mondayUtc(now).getTime();
  const startOfLastWeek = startOfThisWeek - 7 * 86_400_000;

  let thisWeek = 0;
  let lastWeek = 0;
  for (const iso of dates) {
    const t = new Date(iso).getTime();
    if (Number.isNaN(t)) continue;
    if (t >= startOfThisWeek) thisWeek += 1;
    else if (t >= startOfLastWeek) lastWeek += 1;
  }

  const delta = thisWeek - lastWeek;
  const direction = delta > 0 ? "up" : delta < 0 ? "down" : "steady";

  let label: string;
  if (lastWeek === 0 && thisWeek === 0) label = "A fresh week — start when you're ready.";
  else if (direction === "up") label = `Up ${delta} from last week.`;
  else if (direction === "down") label = "A quieter week so far — that's okay.";
  else label = "Holding steady with last week.";

  return { thisWeek, lastWeek, delta, direction, label };
}
