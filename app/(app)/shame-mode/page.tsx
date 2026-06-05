import Link from "next/link";
import { ArrowRight, HeartHandshake, ListChecks } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatDueAt } from "@/lib/format";

export default async function Page() {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();
  const { data: open } = await supabase
    .from("assignments")
    .select("id, title, due_at, status, estimated_minutes")
    .neq("status", "submitted")
    .neq("status", "graded")
    .neq("status", "abandoned")
    .order("due_at", { ascending: true, nullsFirst: false })
    .limit(8);
  const timeSensitive = (open ?? []).filter((assignment) => assignment.due_at && assignment.due_at < nowIso);
  const visible = timeSensitive.length > 0 ? timeSensitive : open ?? [];

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-strong dark:text-brand">Reset mode</p>
        <h1 className="text-2xl font-bold">A calm restart for open work</h1>
        <p className="max-w-2xl text-sm leading-6 text-muted">
          Diana keeps the next academic move visible without pressure language or red states.
        </p>
      </header>

      <section className="rounded-3xl border border-brand/20 bg-brand/10 p-4">
        <div className="flex items-center gap-2">
          <HeartHandshake size={18} className="text-brand" />
          <h2 className="text-base font-semibold">Reset rule</h2>
        </div>
        <p className="mt-2 text-sm text-muted">
          Pick one open assignment, do one visible academic move, then decide whether to ask Diana for the next step.
        </p>
      </section>

      <section className="rounded-3xl border border-border bg-surface-raised p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <ListChecks size={17} className="text-brand" />
          <h2 className="text-base font-semibold">Open work</h2>
        </div>
        <div className="mt-4 space-y-2">
          {visible.length === 0 ? (
            <p className="text-sm text-muted">No open assignments are waiting here.</p>
          ) : (
            visible.map((assignment) => (
              <Link
                key={assignment.id}
                href={`/assignments/${assignment.id}?focus=next-step`}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-3 hover:bg-surface-soft"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{assignment.title}</p>
                  <p className="mt-1 text-xs text-muted">{assignment.due_at ? formatDueAt(assignment.due_at) : "No due date set"}</p>
                </div>
                <ArrowRight size={16} className="shrink-0 text-brand" />
              </Link>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
