import Link from "next/link";
import { Brain } from "lucide-react";

export function DueCards({
  count,
  firstCardId,
}: {
  count: number;
  firstCardId: string | null;
}) {
  if (count <= 0 || !firstCardId) return null;

  return (
    <section className="space-y-2">
      <h2 className="text-xs font-medium uppercase tracking-wider text-muted">
        Study
      </h2>
      <Link
        href={`/flashcards/${firstCardId}/review`}
        className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-5 hover:bg-border/30"
      >
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-accent/10 p-2 text-accent">
            <Brain size={18} />
          </div>
          <div>
            <p className="text-sm font-medium">
              {count === 1
                ? "1 card to review today."
                : `${count} cards to review today.`}
            </p>
            <p className="mt-0.5 text-xs text-muted">
              Whenever you have 5 minutes — no rush.
            </p>
          </div>
        </div>
        <span className="text-xs text-muted">Start →</span>
      </Link>
    </section>
  );
}
