import {
  Award,
  ChevronRight,
  Clock3,
  FileCheck2,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

import type {
  LobbyAttentionCard,
  LobbyAttentionKey,
} from "@/lib/dashboard/lobby-view";

const ICONS: Record<LobbyAttentionKey, LucideIcon> = {
  tests: Award,
  due_earlier: Clock3,
  not_submitted: FileCheck2,
};

export function NeedsAttention({
  categories,
}: {
  categories: readonly LobbyAttentionCard[];
}) {
  return (
    <section className="sd-lobby-attention" aria-labelledby="needs-attention-title">
      <h2 id="needs-attention-title" className="sd-lobby-kicker">
        Needs attention
      </h2>
      <div className="sd-lobby-attention-stack">
        {categories.map((category) => {
          const Icon = ICONS[category.key];
          return (
            <Link
              key={category.key}
              href={category.href}
              className="sd-lobby-attention-card"
              data-tone={category.tone}
              aria-label={`${category.label}: ${category.description}`}
            >
              <span className="sd-lobby-attention-icon" aria-hidden="true">
                <Icon size={24} strokeWidth={1.9} />
              </span>
              <span className="sd-lobby-attention-copy">
                <strong>{category.label}</strong>
                <small>{category.description}</small>
              </span>
              <span className="sd-lobby-attention-count" aria-hidden="true">
                {category.count}
              </span>
              <ChevronRight
                className="sd-lobby-attention-chevron"
                size={18}
                strokeWidth={2}
                aria-hidden="true"
              />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
