import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { STATUS_LABEL } from "@/lib/state-machine/assignment";
import { formatDueAt } from "@/lib/format";
import { KIND_LABEL } from "@/lib/checklists/templates";
import type { AssignmentStatus, AssignmentKind } from "@/lib/supabase/types";

export default async function AssignmentsPage() {
  const supabase = await createClient();
  const { data: assignments } = await supabase
    .from("assignments")
    .select("id, title, due_at, status, kind, classes(name, color)")
    .order("due_at", { ascending: true, nullsFirst: false });

  const groups: Record<string, typeof assignments> = {
    open: [],
    done: [],
  };
  (assignments ?? []).forEach((a) => {
    const isDone = a.status === "submitted" || a.status === "graded" || a.status === "abandoned";
    (isDone ? groups.done : groups.open)!.push(a);
  });

  return (
    <div className="space-y-8">
      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">Tasks</h1>
        <Link
          href="/assignments/new"
          className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white"
        >
          + New
        </Link>
      </header>

      <Section title="Open" items={groups.open ?? []} />
      <Section title="Done" items={groups.done ?? []} muted />
    </div>
  );
}

function Section({
  title,
  items,
  muted = false,
}: {
  title: string;
  items: Array<{ id: string; title: string; due_at: string | null; status: string; kind: AssignmentKind; classes: { name: string; color: string } | null }>;
  muted?: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <section className="space-y-2">
      <h2 className="text-xs font-medium uppercase tracking-wider text-muted">{title}</h2>
      <ul className="divide-y divide-border rounded-xl border border-border bg-card">
        {items.map((a) => (
          <li key={a.id}>
            <Link
              href={`/assignments/${a.id}`}
              className={`flex items-center gap-3 px-4 py-3 hover:bg-border/30 ${
                muted ? "opacity-60" : ""
              }`}
            >
              {a.classes && (
                <span className={`size-2 shrink-0 rounded-full bg-${a.classes.color}-500`} />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{a.title}</p>
                <p className="text-xs text-muted">
                  {a.classes?.name}
                  {" · "}
                  {KIND_LABEL[a.kind]}
                  {a.due_at && ` · ${formatDueAt(a.due_at)}`}
                </p>
              </div>
              <span className="text-xs text-muted">
                {STATUS_LABEL[a.status as AssignmentStatus] ?? a.status}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
