import { formatDueAt } from "@/lib/format";

/**
 * Visual representation of time-until-due. Externalizes the "felt sense"
 * of a deadline for students with time blindness.
 *
 * Formula (per GAP-05 spec):
 *   pct = (dueAt - now) / (dueAt - createdAt), clamped to [0, 100]
 *
 * Fallback when createdAt is missing or window is < 1 hour: 7-day sliding
 * window (legacy behaviour) so very short-notice tasks don't show as empty.
 *
 * Past-due: replaced with a "smallest next step" reframe. The actual
 * "Create micro-task" button is added in wave 4 (02-04).
 */
export function TimeBar({
  dueAt,
  createdAt,
}: {
  dueAt: string;
  createdAt?: string;
}) {
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

  if (createdAt) {
    const created = new Date(createdAt).getTime();
    const totalWindow = due - created;
    // Fallback if the window is too small to be meaningful (< 1h).
    if (totalWindow >= 60 * 60 * 1000) {
      pct = Math.max(0, Math.min(100, (diffMs / totalWindow) * 100));
    } else {
      pct = Math.max(8, (diffHours / 168) * 100); // fall to 7-day window
    }
  } else {
    // No createdAt: use legacy 7-day sliding window.
    pct = Math.max(8, Math.min(100, (diffHours / 168) * 100));
  }

  // Color bands (no red — F20 constraint). Green > 50%, sky 25-50%, amber < 25%.
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
