import Link from "next/link";
import { addDays, format, parseISO, subDays } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import {
  buildWeek,
  groupByDay,
  workloadTier,
  workloadBarClass,
} from "@/lib/calendar/week";
import {
  adjustForUser,
  type Assignment,
} from "@/lib/scoring/next-five-minutes";

// Calendar groups assignments by UTC date to stay consistent with how
// due_at is stored in Postgres. A midnight-UTC due date appears on its
// UTC calendar day, which may differ from the student's local day —
// documented design decision.

type PageProps = {
  searchParams: Promise<{ week?: string }>;
};

export default async function CalendarWeekPage({ searchParams }: PageProps) {
  const { week: weekParam } = await searchParams;
  const anchor = weekParam ? parseISO(weekParam) : new Date();
  const week = buildWeek(anchor);
  const weekStart = week[0];
  const weekEnd = week[6];

  const prevAnchor = format(subDays(weekStart, 7), "yyyy-MM-dd");
  const nextAnchor = format(addDays(weekStart, 7), "yyyy-MM-dd");
  const todayAnchor = format(new Date(), "yyyy-MM-dd");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let assignments: Assignment[] = [];
  let profile = { diagnoses: [] as string[], extra_time_pct: 0 };

  if (user) {
    // Window is [Mon 00:00 UTC, Sun 23:59 UTC]
    const windowStart = new Date(
      Date.UTC(
        weekStart.getUTCFullYear(),
        weekStart.getUTCMonth(),
        weekStart.getUTCDate(),
        0,
        0,
        0,
      ),
    ).toISOString();
    const windowEnd = new Date(
      Date.UTC(
        weekEnd.getUTCFullYear(),
        weekEnd.getUTCMonth(),
        weekEnd.getUTCDate(),
        23,
        59,
        59,
      ),
    ).toISOString();

    const { data: assignmentRows } = await supabase
      .from("assignments")
      .select(
        "id, title, due_at, status, estimated_minutes, difficulty, class_id, kind, reading_load, writing_load",
      )
      .eq("owner_id", user.id)
      .gte("due_at", windowStart)
      .lte("due_at", windowEnd)
      .not("status", "in", "(submitted,graded,abandoned)");

    assignments = (assignmentRows ?? []) as Assignment[];

    const { data: profileRow } = await supabase
      .from("profiles")
      .select("diagnoses, extra_time_pct")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileRow) {
      profile = {
        diagnoses: (profileRow.diagnoses as string[] | null) ?? [],
        extra_time_pct:
          (profileRow.extra_time_pct as number | null) ?? 0,
      };
    }
  }

  const buckets = groupByDay(assignments, week);

  // Per-day total effective minutes, using the same accommodations math
  // as the scorer + nightly time budget for consistency.
  const dayTotals = new Map<string, number>();
  for (const [key, dayAssignments] of buckets.entries()) {
    const total = dayAssignments.reduce((sum, a) => {
      const m = adjustForUser(a, profile);
      return sum + (m ?? 0);
    }, 0);
    dayTotals.set(key, total);
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-fg">Calendar</h1>
          <p className="text-sm text-muted">
            Week of {format(weekStart, "MMM d")} –{" "}
            {format(weekEnd, "MMM d, yyyy")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/calendar?week=${prevAnchor}`}
            className="rounded-md border border-border bg-card px-3 py-1.5 text-sm text-fg hover:bg-border/40"
          >
            Prev
          </Link>
          <Link
            href={`/calendar?week=${todayAnchor}`}
            className="rounded-md border border-border bg-card px-3 py-1.5 text-sm text-fg hover:bg-border/40"
          >
            This week
          </Link>
          <Link
            href={`/calendar?week=${nextAnchor}`}
            className="rounded-md border border-border bg-card px-3 py-1.5 text-sm text-fg hover:bg-border/40"
          >
            Next
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-7">
        {week.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayAssignments = buckets.get(key) ?? [];
          const total = dayTotals.get(key) ?? 0;
          const tier = workloadTier(total);
          const barClass = workloadBarClass(tier);
          const tierLabel =
            tier === "light"
              ? "Light"
              : tier === "moderate"
                ? "Moderate"
                : tier === "heavy"
                  ? "Heavy"
                  : "Heavy day";

          return (
            <section
              key={key}
              className="flex flex-col rounded-lg border border-border bg-card"
            >
              <header className="border-b border-border px-3 py-2">
                <div className="text-xs uppercase tracking-wide text-muted">
                  {format(day, "EEE")}
                </div>
                <div className="text-lg font-semibold text-fg">
                  {format(day, "MMM d")}
                </div>
              </header>
              <div
                className={`px-3 py-2 text-xs text-fg/80 ${barClass}`}
                aria-label={`Workload ${tierLabel}, ${total} minutes`}
              >
                {total > 0 ? (
                  <>
                    {tierLabel} · {total} min
                  </>
                ) : (
                  <span className="text-muted">&nbsp;</span>
                )}
              </div>
              <ul className="flex-1 space-y-1 px-3 py-2">
                {dayAssignments.map((a) => (
                  <li
                    key={a.id}
                    className="rounded-md border border-border/60 bg-bg px-2 py-1.5 text-sm text-fg"
                  >
                    <Link
                      href={`/assignments/${a.id}`}
                      className="block hover:text-accent"
                    >
                      {a.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </main>
  );
}
