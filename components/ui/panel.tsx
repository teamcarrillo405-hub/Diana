import type { CSSProperties, ReactNode } from "react";

// Tone-aware HUD-framed panel — the single shared container for all dashboard cards.
// tone='default'  → bg-card + border-neutral (standard panels, metric columns)
// tone='cyan'     → cyan-08 bg + cyan-22 border (info cards, active state panels)
export function Panel({
  tone = "default",
  className,
  style,
  children,
}: {
  tone?: "default" | "cyan";
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const bg = tone === "cyan" ? "var(--gl-cyan-08)" : "var(--gl-bg-card)";
  const border = tone === "cyan" ? "1px solid var(--gl-cyan-22)" : "1px solid var(--gl-border-neutral)";

  return (
    <div
      className={className}
      style={{
        background: bg,
        border,
        borderRadius: "var(--radius-card)",
        backdropFilter: "var(--blur-card)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
