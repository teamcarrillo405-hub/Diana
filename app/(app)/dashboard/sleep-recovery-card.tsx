import Link from "next/link";

export function SleepRecoveryCard({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <section
      style={{
        borderRadius: "var(--radius-card)",
        border: "1px solid var(--gl-border-neutral)",
        background: "var(--gl-bg-card)",
        backdropFilter: "var(--blur-card)",
        WebkitBackdropFilter: "var(--blur-card)",
        padding: "var(--space-12)",
      }}
    >
      <p style={{ fontFamily: "var(--font-display)", fontWeight: "var(--weight-800)", fontSize: "var(--text-13)", letterSpacing: "var(--tracking-14)", textTransform: "uppercase", color: "var(--gl-text-primary)" }}>
        Sleep + recovery
      </p>
      <p style={{ marginTop: "var(--space-3)", fontSize: "var(--text-14)", color: "var(--gl-text-muted)" }}>{message}</p>
      <Link href="/wellness" style={{ marginTop: "var(--space-5)", display: "inline-block", fontSize: "var(--text-14)", fontWeight: "var(--weight-600)", color: "var(--gl-cyan)", textDecoration: "none" }}>
        Update sleep log →
      </Link>
    </section>
  );
}
