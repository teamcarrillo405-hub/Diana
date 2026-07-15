import { AlertTriangle, CheckCircle2, CircleDot, Clock3, ShieldCheck } from "lucide-react";

export type StatusPillTone = "ready" | "in-progress" | "submitted" | "attention" | "graded" | "current" | "muted";

const ICONS = {
  ready: ShieldCheck,
  "in-progress": Clock3,
  submitted: CheckCircle2,
  attention: AlertTriangle,
  graded: CheckCircle2,
  current: CircleDot,
  muted: ShieldCheck,
} satisfies Record<StatusPillTone, typeof ShieldCheck>;

export function StatusPill({
  label,
  tone = "muted",
  showIcon = true,
  className = "",
}: {
  label: string;
  tone?: StatusPillTone;
  showIcon?: boolean;
  className?: string;
}) {
  const Icon = ICONS[tone];
  return (
    <span className={`ds-status-pill ds-status-pill--${tone} ${className}`.trim()}>
      {showIcon && <Icon size={12} aria-hidden="true" />}
      {label}
    </span>
  );
}

export function assignmentStatusTone(status: string): StatusPillTone {
  if (status === "graded") return "graded";
  if (status === "submitted") return "submitted";
  if (status === "done") return "attention";
  if (status === "in_progress") return "in-progress";
  if (status === "captured" || status === "planned") return "ready";
  return "muted";
}
