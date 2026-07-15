import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  action,
  compact = false,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={`ds-empty-state ${compact ? "ds-empty-state--compact" : ""}`.trim()}>
      <h2>{title}</h2>
      <p>{description}</p>
      {action && <div className="ds-empty-state__action">{action}</div>}
    </div>
  );
}
