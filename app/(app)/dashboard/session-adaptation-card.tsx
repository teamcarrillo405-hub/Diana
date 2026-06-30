import Link from "next/link";
import type { SessionAdaptation } from "@/lib/emotional/session";

export function SessionAdaptationCard({ adaptation }: { adaptation: SessionAdaptation }) {
  if (!adaptation.mood || adaptation.mood === "good") return null;

  return (
    <section
      style={{
        borderRadius: "var(--radius-card)",
        border: "1px solid var(--gl-purple-30)",
        background: "var(--gl-bg-card)",
        backdropFilter: "var(--blur-card)",
        WebkitBackdropFilter: "var(--blur-card)",
        padding: "var(--space-12)",
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "var(--space-6)" }}>
        <div>
          <h2 style={{ fontFamily: "var(--font-display)", fontWeight: "var(--weight-800)", fontSize: "var(--text-13)", letterSpacing: "var(--tracking-14)", textTransform: "uppercase", color: "var(--gl-purple-light)" }}>
            {adaptation.headline}
          </h2>
          <p style={{ marginTop: "var(--space-3)", fontSize: "var(--text-14)", color: "var(--gl-text-muted)" }}>{adaptation.nextStep}</p>
        </div>
        <Link
          href={adaptation.mood === "rough" ? "/timer?mode=rough" : "/timer"}
          style={{
            flexShrink: 0,
            borderRadius: "var(--radius-button)",
            border: "1px solid var(--gl-purple-30)",
            background: "var(--gl-purple-14)",
            padding: "var(--space-4) var(--space-8)",
            fontFamily: "var(--font-display)",
            fontWeight: "var(--weight-800)",
            fontSize: "var(--text-13)",
            letterSpacing: "var(--tracking-04)",
            textTransform: "uppercase",
            color: "var(--gl-purple-light)",
            textDecoration: "none",
          }}
        >
          {adaptation.workMinutes} min block
        </Link>
      </div>
    </section>
  );
}
