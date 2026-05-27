import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatDueAt } from "@/lib/format";
import { STATUS_LABEL, STATUS_HINT, nextStatesFor } from "@/lib/state-machine/assignment";
import { StatusButtons } from "./status-buttons";
import type { AssignmentStatus } from "@/lib/supabase/types";

export default async function AssignmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: a } = await supabase
    .from("assignments")
    .select("id, title, description, due_at, status, estimated_minutes, difficulty, classes(id, name, color), rubric_id")
    .eq("id", id)
    .single();
  if (!a) notFound();

  const status = a.status as AssignmentStatus;
  const nexts = nextStatesFor(status);

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <Link
          href={a.classes ? `/classes/${a.classes.id}` : "/assignments"}
          className="text-xs text-muted hover:underline"
        >
          ← {a.classes?.name ?? "Tasks"}
        </Link>
        <h1 className="text-2xl font-bold">{a.title}</h1>
        {a.due_at && <p className="text-sm text-muted">{formatDueAt(a.due_at)}</p>}
        {a.description && (
          <p className="whitespace-pre-wrap rounded-lg border border-border bg-card p-3 text-sm">
            {a.description}
          </p>
        )}
      </header>

      <section className="space-y-3 rounded-2xl border border-border bg-card p-5">
        <div className="flex items-baseline justify-between">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">
            Where are you?
          </p>
          <p className="text-xs text-muted">{STATUS_HINT[status]}</p>
        </div>
        <p className="text-lg font-semibold">{STATUS_LABEL[status]}</p>
        <StatusButtons assignmentId={id} from={status} options={nexts} />
      </section>

      {status === "exporting" && (
        <div className="rounded-xl border border-accent bg-accent/5 p-4">
          <p className="font-medium">Run through your submission checklist first.</p>
          <p className="mt-1 text-sm text-muted">
            Diana will hold you here until you tick the required boxes.
          </p>
          <Link
            href={`/assignments/${id}/submit`}
            className="mt-3 inline-block rounded-md bg-accent px-4 py-2 text-sm font-medium text-white"
          >
            Open the checklist
          </Link>
        </div>
      )}
    </div>
  );
}
