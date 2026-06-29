import Link from "next/link";
import { CheckCircle2, Clock3, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatDueAt } from "@/lib/format";

export default async function Page() {
  const supabase = await createClient();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [{ data: completed }, { data: started }, { data: open }] = await Promise.all([
    supabase
      .from("task_signals")
      .select("id, occurred_at, assignments(id, title)")
      .eq("kind", "completed")
      .gte("occurred_at", todayStart.toISOString())
      .order("occurred_at", { ascending: false }),
    supabase
      .from("task_signals")
      .select("id, occurred_at, assignments(id, title)")
      .eq("kind", "started")
      .gte("occurred_at", todayStart.toISOString())
      .order("occurred_at", { ascending: false })
      .limit(5),
    supabase
      .from("assignments")
      .select("id, title, due_at, status")
      .neq("status", "submitted")
      .neq("status", "graded")
      .neq("status", "abandoned")
      .order("due_at", { ascending: true, nullsFirst: false })
      .limit(5),
  ]);

  return (
    <div className="diana-page space-y-6">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-strong dark:text-brand">Daily recap</p>
        <h1 className="text-display">Close the loop for today</h1>
        <p className="max-w-2xl text-sm leading-6 text-muted">
          A private summary of what moved, what is still open, and the first step for tomorrow.
        </p>
      </header>

      <section className="grid gap-3 md:grid-cols-3">
        <StatCard icon={CheckCircle2} label="Completed today" value={String(completed?.length ?? 0)} />
        <StatCard icon={Clock3} label="Started today" value={String(started?.length ?? 0)} />
        <StatCard icon={Sparkles} label="Next open items" value={String(open?.length ?? 0)} />
      </section>

      <section className="rounded-3xl border border-border bg-surface-raised p-4 shadow-sm">
        <h2 className="text-base font-semibold">Done today</h2>
        {completed && completed.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {completed.slice(0, 6).map((row) => {
              const assignment = Array.isArray(row.assignments) ? row.assignments[0] : row.assignments;
              return (
                <li key={row.id} className="rounded-2xl border border-border bg-surface p-3 text-sm">
                  {assignment?.title ?? "Completed item"}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted">Nothing marked complete yet today. Start with one visible move.</p>
        )}
      </section>

      <section className="rounded-3xl border border-brand/20 bg-brand/10 p-4">
        <h2 className="text-base font-semibold">Tomorrow pickup</h2>
        {open && open.length > 0 ? (
          <div className="mt-3 space-y-2">
            {open.slice(0, 3).map((assignment) => (
              <Link
                key={assignment.id}
                href={`/assignments/${assignment.id}`}
                className="block rounded-2xl border border-brand/20 bg-surface-raised/80 p-3 hover:bg-surface-soft"
              >
                <p className="text-sm font-semibold">{assignment.title}</p>
                <p className="mt-1 text-xs text-muted">{assignment.due_at ? formatDueAt(assignment.due_at) : "No due date set"}</p>
              </Link>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted">No open assignments are waiting in the queue.</p>
        )}
      </section>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CheckCircle2;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-3xl border border-border bg-surface-raised p-4 shadow-sm">
      <Icon size={18} className="text-brand" />
      <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-1 text-3xl font-bold">{value}</p>
    </div>
  );
}
