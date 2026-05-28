import { formatDueAt } from "@/lib/format";
import { PastDueMicroTaskButton } from "./past-due-button";
import type { AssignmentStatus } from "@/lib/supabase/types";

/**
 * Visual representation of time-until-due.
 * Past-due branch differs by status:
 *   - todo / drafting: "Still possible — start with 5 minutes?" + micro-task button
 *   - checking / exporting: "Still open — want to take a next step?" (no button — they're close to done)
 */
export function TimeBar({
  dueAt,
  createdAt,
  status,
  assignmentId,
}: {
  dueAt: string;
  createdAt?: string;
  status?: AssignmentStatus;
  assignmentId?: string;
}) {
  const now = Date.now();
  const due = new Date(dueAt).getTime();
  const diffMs = due - now;
  const diffHours = diffMs / 36e5;

  if (diffHours < 0) {
    const inProgress = status === "todo" || status === "drafting";
    const message = inProgress
      ? "Still possible — start with 5 minutes?"
      : "Still open — want to take a next step?";
    return (
      <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-300">
        <p>{message}</p>
        {inProgress && assignmentId && (
          <PastDueMicroTaskButton assignmentId={assignmentId} />
        )}
      </div>
    );
  }

  let pct = 0;
  let tint = "bg-emerald-500";
  let label = formatDueAt(dueAt);

  if (createdAt) {
    const created = new Date(createdAt).getTime();
    const totalWindow = due - created;
    if (totalWindow >= 60 * 60 * 1000) {
      pct = Math.max(0, Math.min(100, (diffMs / totalWindow) * 100));
    } else {
      pct = Math.max(8, (diffHours / 168) * 100);
    }
  } else {
    pct = Math.max(8, Math.min(100, (diffHours / 168) * 100));
  }

  if (pct > 50) tint = "bg-emerald-500";
  else if (pct >= 25) tint = "bg-sky-500";
  else tint = "bg-amber-500";

  if (diffHours < 24) {
    label = `${Math.round(diffHours)} hours left · ${formatDueAt(dueAt)}`;
  }

  return (
    <div className="space-y-1">
      <div className="h-2 w-full overflow-hidden rounded-full bg-border/50">
        <div className={`h-full ${tint}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}
