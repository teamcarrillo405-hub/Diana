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
      <div
        style={{
          borderRadius: "var(--radius-button)",
          border: "1px solid var(--gl-red-28)",
          background: "var(--gl-red-14)",
          padding: "var(--space-6)",
          fontSize: "var(--text-12)",
          color: "var(--gl-red-text)",
        }}
      >
        <p>{message}</p>
        {inProgress && assignmentId && (
          <PastDueMicroTaskButton assignmentId={assignmentId} />
        )}
      </div>
    );
  }

  let pct = 0;
  let tint = "var(--gl-green)";
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

  if (pct > 50) tint = "var(--gl-green)";
  else if (pct >= 25) tint = "var(--gl-cyan)";
  else tint = "var(--gl-gold)";

  if (diffHours < 24) {
    label = `${Math.round(diffHours)} hours left · ${formatDueAt(dueAt)}`;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
      <div style={{ height: 8, width: "100%", overflow: "hidden", borderRadius: 999, background: "var(--gl-border-neutral)" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: tint, boxShadow: tint === "var(--gl-cyan)" ? "0 0 12px var(--gl-cyan-45)" : undefined }} />
      </div>
      <p style={{ fontSize: "var(--text-12)", color: "var(--gl-text-muted)" }}>{label}</p>
    </div>
  );
}
