import Link from "next/link";
import { ArrowRight, Clock3, ListChecks, Timer } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { loadProfile } from "@/lib/profile";
import { rankAssignments, type Assignment } from "@/lib/scoring/next-five-minutes";
import { KIND_LABEL } from "@/lib/checklists/templates";
import { formatDueAt } from "@/lib/format";
import { EmptyStateMark } from "@/components/empty-state-mark";

export default async function FocusPage() {
  const supabase = await createClient();
  const profile = await loadProfile();
  const now = new Date();

  const [{ data: assignments }, { data: signals }] = await Promise.all([
    supabase
      .from("assignments")
      .select("id, title, due_at, status, estimated_minutes, difficulty, class_id, kind, reading_load, writing_load, classes(name, color)")
      .neq("status", "submitted")
      .neq("status", "graded")
      .neq("status", "abandoned")
      .order("due_at", { ascending: true, nullsFirst: false }),
    supabase
      .from("task_signals")
      .select("assignment_id, occurred_at")
      .in("kind", ["started", "completed"])
      .gte("occurred_at", new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString())
      .order("occurred_at", { ascending: false }),
  ]);

  const ranked = rankAssignments(
    (assignments ?? []) as Assignment[],
    (signals ?? []).filter((signal): signal is { assignment_id: string; occurred_at: string } => signal.assignment_id !== null),
    now,
    "medium",
    {
      diagnoses: profile?.diagnoses ?? [],
      extra_time_pct: profile?.extra_time_pct ?? 0,
    },
    null,
  );
  const top = ranked[0];
  const rest = ranked.slice(1, 5);

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-strong dark:text-brand">Focus</p>
        <h1 className="text-display">One school move at a time</h1>
        <p className="max-w-2xl text-sm leading-6 text-muted">
          Diana uses due dates, workload, reading load, and recent starts to keep the next action visible.
        </p>
      </header>

      {!top ? (
        <section className="rounded-3xl border border-dashed border-border bg-surface-raised p-8 text-center">
          <EmptyStateMark />
          <p className="text-base font-semibold">No open assignments are in the queue.</p>
          <p className="mt-2 text-sm text-muted">Add one task or import due dates to start a focus plan.</p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link href="/assignments/new" className="touch-target rounded-2xl bg-brand px-4 py-3 text-sm font-semibold text-white">
              Add assignment
            </Link>
            <Link href="/imports" className="touch-target rounded-2xl border border-border bg-surface px-4 py-3 text-sm font-semibold">
              Connect imports
            </Link>
          </div>
        </section>
      ) : (
        <>
          <section className="focus-surface rounded-3xl border border-brand/25 p-5 shadow-sm">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-brand/20 bg-surface-raised/80 px-3 py-1 text-xs font-semibold text-brand-strong dark:text-brand">
                    Right now
                  </span>
                  <span className="rounded-full border border-border bg-surface-raised/80 px-3 py-1 text-xs text-muted">
                    {KIND_LABEL[top.kind]}
                  </span>
                  {top.due_at && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-raised/80 px-3 py-1 text-xs text-muted">
                      <Clock3 size={13} />
                      {formatDueAt(top.due_at)}
                    </span>
                  )}
                </div>
                <h2 className="mt-4 text-3xl font-bold leading-tight">{top.title}</h2>
                <p className="mt-2 text-sm text-muted">
                  {top.effective_minutes != null ? `About ${top.effective_minutes} minutes for you.` : "Diana will help find the first small move."}
                </p>
                {top.reasons.length > 0 && (
                  <ul className="mt-4 flex flex-wrap gap-2">
                    {top.reasons.map((reason) => (
                      <li key={reason} className="rounded-full border border-brand/20 bg-surface-raised/80 px-3 py-1 text-xs text-brand-strong dark:text-brand">
                        {reason}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="w-full shrink-0 space-y-2 lg:w-64">
                <Link
                  href={`/assignments/${top.id}`}
                  className="touch-target inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-4 py-3 text-sm font-semibold text-white"
                >
                  Open assignment
                  <ArrowRight size={17} />
                </Link>
                <Link
                  href={`/timer?mode=${profile?.session_mood === "rough" ? "rough" : "steady"}`}
                  className="touch-target inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-surface-raised px-4 py-3 text-sm font-semibold"
                >
                  <Timer size={17} />
                  Start timer
                </Link>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-border bg-surface-raised p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <ListChecks size={17} className="text-brand" />
              <h2 className="text-base font-semibold">Next in the queue</h2>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {rest.map((assignment) => (
                <Link
                  key={assignment.id}
                  href={`/assignments/${assignment.id}`}
                  className="rounded-2xl border border-border bg-surface p-3 hover:bg-surface-soft"
                >
                  <p className="text-sm font-semibold">{assignment.title}</p>
                  <p className="mt-1 text-xs text-muted">
                    {KIND_LABEL[assignment.kind]}
                    {assignment.effective_minutes != null && ` | ${assignment.effective_minutes} min`}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
