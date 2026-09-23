import { ChevronRight } from "lucide-react";
import Link from "next/link";

import type { LobbyAttentionCard } from "@/lib/dashboard/lobby-view";

export function NeedsAttention({
  categories,
}: {
  categories: readonly LobbyAttentionCard[];
}) {
  const assignmentCategories = categories
    .filter((category) => category.key !== "feedback")
    .slice(0, 3);

  return (
    <section className="sd-lobby-attention" aria-labelledby="needs-attention-title">
      <h2 id="needs-attention-title" className="sd-lobby-kicker">
        Needs attention
      </h2>
      <div className="sd-lobby-attention-stack">
        {assignmentCategories.map((category) => (
          <Link
            key={category.key}
            href={category.href}
            className="sd-lobby-attention-card"
            data-tone={category.tone}
            aria-label={category.label + ": " + category.description}
          >
            <span className="sd-lobby-attention-heading">
              <strong>{category.label}</strong>
              <span className="sd-lobby-attention-count" aria-hidden="true">
                {category.count}
              </span>
            </span>
            <span className="sd-lobby-attention-description">
              {category.description}
            </span>
            <span className="sd-lobby-attention-link">
              View list
              <ChevronRight size={13} strokeWidth={2.4} aria-hidden="true" />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
