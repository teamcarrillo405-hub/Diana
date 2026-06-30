import Link from "next/link";
import { Timer } from "lucide-react";

export function StartSessionButton({ roughMode = false, difficulty = null }: { roughMode?: boolean; difficulty?: number | null }) {
  const params = new URLSearchParams();
  if (roughMode) params.set("mode", "rough");
  if (difficulty !== null) params.set("difficulty", String(difficulty));
  const href = `/timer${params.size > 0 ? `?${params.toString()}` : ""}`;
  return (
    <Link
      href={href}
      style={{
        display: "inline-flex",
        width: "100%",
        alignItems: "center",
        justifyContent: "center",
        gap: "var(--space-4)",
        borderRadius: "var(--radius-hero)",
        border: "1px solid var(--gl-cyan-28)",
        background: "var(--gl-cyan)",
        padding: "var(--space-9) var(--space-10)",
        fontFamily: "var(--font-display)",
        fontWeight: "var(--weight-800)",
        fontStyle: "italic",
        fontSize: "var(--text-18)",
        letterSpacing: "var(--tracking-05)",
        textTransform: "uppercase",
        color: "var(--gl-text-on-cyan)",
        textDecoration: "none",
        boxShadow: "var(--shadow-hero-cta)",
      }}
    >
      <Timer size={16} />
      Start a work session
    </Link>
  );
}
