import { formatDueAt } from "@/lib/format";

/**
 * Visual representation of time-until-due. Externalizes the "felt sense"
 * of a deadline for students with time blindness.
 *
 * - >7 days: shows a calm full bar
 * - 1-7 days: bar fills proportionally, warm color
 * - <24h: orange, no animation (calm urgency)
 * - past due: replaced with a "smallest next step" reframe
 */
export function TimeBar({ dueAt }: { dueAt: string }) {
  const now = Date.now();
  const due = new Date(dueAt).getTime();
  const diffMs = due - now;
  const diffHours = diffMs / 36e5;
  const diffDays = diffHours / 24;

  if (diffHours < 0) {
    return (
      <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-2 text-xs text-amber-700 dark:text-amber-300">
        Past the due date. Smallest next step you can do in 5 min?
      </div>
    );
  }

  let pct = 0;
  let tint = "bg-emerald-500";
  let label = formatDueAt(dueAt);
  if (diffDays >= 7) {
    pct = 100;
    tint = "bg-emerald-500";
  } else if (diffDays >= 1) {
    pct = (diffDays / 7) * 100;
    tint = "bg-sky-500";
  } else {
    pct = Math.max(8, (diffHours / 24) * 100);
    tint = "bg-amber-500";
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
