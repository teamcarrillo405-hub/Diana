import Link from "next/link";

import type { LobbyAttentionCard } from "@/lib/dashboard/lobby-view";

const ATTENTION_ORDER: Record<LobbyAttentionCard["key"], number> = {
  due_earlier: 0,
  not_submitted: 1,
  tests: 2,
  feedback: 3,
};

function displayLabel(category: LobbyAttentionCard): string {
  if (category.key === "due_earlier") return "Late";
  if (category.key === "not_submitted") return "Ready to Turn In";
  return category.label;
}

export function NeedsAttention({
  categories,
}: {
  categories: readonly LobbyAttentionCard[];
}) {
  const assignmentCategories = categories
    .filter((category) => category.key !== "feedback")
    .sort((a, b) => ATTENTION_ORDER[a.key] - ATTENTION_ORDER[b.key])
    .slice(0, 3);
  const total = assignmentCategories.reduce((sum, category) => sum + category.count, 0);
  const totalLabel = total === 1 ? "item" : "items";

  return (
    <section className="sd-lobby-attention" aria-labelledby="needs-attention-title">
      <header className="today-attention-header">
        <h2 id="needs-attention-title" className="sd-lobby-kicker">Needs Attention</h2>
        <p className="sr-only">{total} {totalLabel} need attention</p>
      </header>
      {assignmentCategories.length > 0 ? (
        <div className="sd-lobby-attention-stack">
          {assignmentCategories.map((category) => {
            const label = displayLabel(category);
            const additionalLabel = category.additionalItemCount > 0
              ? `+${category.additionalItemCount} more`
              : null;
            const empty = category.count === 0;
            const context = `${category.className} · ${category.contextLabel}`;
            const accessibleLabel = !empty
              ? `${label}: ${category.assignmentTitle}, ${category.className}, ${category.contextLabel}. ${category.actionLabel}`
              : `${label}: nothing due`;
            if (empty) {
              return (
                <div
                  key={category.key}
                  className="sd-lobby-attention-card"
                  data-category={category.key}
                  data-state="empty"
                  role="status"
                  aria-label={`${label}: nothing due`}
                >
                  <span className="sd-lobby-attention-count" aria-hidden="true" />
                  <span className="sd-lobby-attention-copy">
                    <strong className="sd-lobby-attention-category">{label}</strong>
                  </span>
                </div>
              );
            }
            return (
              <Link
                key={category.key}
                href={category.href}
                className="sd-lobby-attention-card"
                data-tone={category.tone}
                data-category={category.key}
                data-state="active"
                aria-label={accessibleLabel}
              >
                <span className="sd-lobby-attention-count" aria-hidden="true">
                  <strong>{category.count}</strong>
                  <small>{category.count === 1 ? "item" : "items"}</small>
                </span>
                <span className="sd-lobby-attention-copy">
                  <strong className="sd-lobby-attention-category">{label}</strong>
                  <span className="sd-lobby-attention-description">{context}</span>
                  {additionalLabel ? (
                    <span className="sd-lobby-attention-more">{additionalLabel}</span>
                  ) : null}
                </span>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="sd-lobby-attention-empty" role="status">
          <strong>Nothing needs attention</strong>
          <span>Your active work is clear for now.</span>
        </div>
      )}
    </section>
  );
}
