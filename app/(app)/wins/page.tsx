import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  groupCompletionsByDay,
  countToday,
  countThisWeek,
  type Completion,
} from "@/lib/wins/group-by-day";
import { quietMilestone } from "@/lib/emotional/session";
import { WinsList } from "./wins-list";

export default async function WinsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl py-8">
        <p className="text-sm text-muted">Sign in to see your wins.</p>
      </div>
    );
  }

  const { data } = await supabase
    .from("task_signals")
    .select(
      "id, occurred_at, assignment_id, assignments(title, kind, classes(name, color))",
    )
    .eq("owner_id", user.id)
    .eq("kind", "completed")
    .order("occurred_at", { ascending: false })
    .limit(100);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (data ?? []) as unknown as Array<{
    id: string;
    occurred_at: string;
    assignment_id: string | null;
    assignments: {
      title: string;
      kind: string;
      classes: { name: string; color: string } | null;
    } | null;
  }>;

  const completions: Completion[] = rows.map((r) => ({
    id: r.id,
    occurred_at: r.occurred_at,
    assignment_id: r.assignment_id,
    assignment_title: r.assignments?.title ?? null,
    assignment_kind: r.assignments?.kind ?? null,
    class_name: r.assignments?.classes?.name ?? null,
    class_color: r.assignments?.classes?.color ?? null,
  }));

  const now = new Date();
  const today = countToday(completions, now);
  const week = countThisWeek(completions, now);
  const groups = groupCompletionsByDay(completions, now);
  const milestone = quietMilestone(week);

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-6">
      <header className="space-y-2">
        <h1 className="text-display">Wins</h1>
        <p className="text-sm text-muted">Things you finished. Private, neutral progress.</p>
      </header>

      <section className="flex gap-4">
        <div className="flex-1 rounded-xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wider text-muted">Today</p>
          <p className="mt-1 text-2xl font-bold text-ok">
            {today === 1 ? "1 thing done." : `${today} things done.`}
          </p>
        </div>
        <div className="flex-1 rounded-xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wider text-muted">This week</p>
          <p className="mt-1 text-2xl font-bold text-ok">
            {week === 1 ? "1 thing done." : `${week} things done.`}
          </p>
        </div>
      </section>

      {milestone && (
        <section className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wider text-muted">Quiet milestone</p>
          <p className="mt-1 text-sm font-medium">{milestone}</p>
        </section>
      )}

      {groups.length === 0 ? (
        <section className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
          <p className="text-sm font-medium">Nothing here yet.</p>
          <p className="mt-1 text-sm text-muted">
            When you submit something, it lands here.
          </p>
          <Link
            href="/assignments"
            className="mt-4 inline-block rounded-md border border-border px-4 py-2 text-sm hover:bg-border/30"
          >
            Open assignments
          </Link>
        </section>
      ) : (
        <WinsList groups={groups} />
      )}
    </div>
  );
}
