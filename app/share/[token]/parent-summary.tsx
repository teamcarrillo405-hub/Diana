import type { ParentSummary } from "@/lib/sharing/types";

export function ParentSummaryView({ summary }: { summary: ParentSummary }) {
  const expiresDate = new Date(summary.expiresAt);
  const expiresLabel = expiresDate.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const weekStartDate = new Date(summary.weekStartIso);
  const weekStartLabel = weekStartDate.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

  return (
    <main className="mx-auto max-w-xl space-y-6 p-6 sm:p-8">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-wider text-muted">Weekly summary</p>
        <h1 className="text-xl font-semibold">This week so far</h1>
        <p className="text-xs text-muted">Since {weekStartLabel}</p>
      </header>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          label="Assignments finished this week"
          value={summary.completedThisWeek}
        />
        <StatCard
          label="Upcoming in the next 7 days"
          value={summary.upcomingNext7Days}
        />
        <StatCard
          label="Minutes spent studying this week"
          value={summary.studyMinutesThisWeek}
        />
      </section>

      <section className="rounded-xl border border-border bg-card p-4 text-sm text-muted">
        <p>
          This is a calm snapshot of effort and upcoming work. It does not show
          grades, assignment names, or any private notes. The student can revoke
          this link at any time.
        </p>
      </section>

      <footer className="text-xs text-muted">
        This link works until {expiresLabel}.
      </footer>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-3xl font-semibold tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-muted">{label}</p>
    </div>
  );
}
