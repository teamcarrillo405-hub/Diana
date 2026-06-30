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
    <section style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <h2
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "var(--text-11)",
          fontWeight: "var(--weight-700)",
          letterSpacing: "var(--tracking-20)",
          textTransform: "uppercase",
          color: "var(--gl-text-muted)",
        }}
      >
        Study
      </h2>
      <Link
        href={`/flashcards/${firstCardId}/review`}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "var(--space-6)",
          borderRadius: "var(--radius-card)",
          border: "1px solid var(--gl-cyan-22)",
          background: "var(--gl-cyan-08)",
          padding: "var(--space-13)",
          textDecoration: "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-6)" }}>
          <div style={{ borderRadius: "var(--radius-circle)", background: "var(--gl-cyan-14)", padding: "var(--space-4)", color: "var(--gl-cyan)", display: "flex" }}>
            <Brain size={18} />
          </div>
          <div>
            <p style={{ fontSize: "var(--text-14)", fontWeight: "var(--weight-600)", color: "var(--gl-text-primary)" }}>
              {count === 1
                ? "1 card to review today."
                : `${count} cards to review today.`}
            </p>
            <p style={{ marginTop: "2px", fontSize: "var(--text-12)", color: "var(--gl-text-muted)" }}>
              Whenever you have 5 minutes, no rush.
            </p>
          </div>
        </div>
        <span style={{ fontSize: "var(--text-12)", color: "var(--gl-cyan)" }}>Start →</span>
      </Link>
    </section>
  );
}
