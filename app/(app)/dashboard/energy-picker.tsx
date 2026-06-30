"use client";

import Link from "next/link";
import type { DianaOrbState } from "@/components/signal/clarity-orb";
import { Battery, Cloud, Leaf, Sparkles, Zap } from "lucide-react";

const LEVELS = [
  { energy: "low", label: "Low", brain: "low", note: "start small", icon: Leaf },
  { energy: "medium", label: "Okay", brain: "okay", note: "steady", icon: Battery },
  { energy: "high", label: "On it", brain: "on-it", note: "more motion", icon: Zap },
  { energy: "low", label: "Overwhelmed", brain: "overwhelmed", note: "one breath", icon: Cloud },
  { energy: "high", label: "Creative", brain: "creative", note: "ideas moving", icon: Sparkles },
] as const;

export function EnergyPicker({ currentBrain }: { currentBrain: DianaOrbState }) {
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
      <p style={{ fontFamily: "var(--font-display)", fontWeight: "var(--weight-800)", fontSize: "var(--text-13)", letterSpacing: "var(--tracking-14)", textTransform: "uppercase", color: "var(--gl-purple-light)", marginBottom: "var(--space-8)" }}>
        Brain state
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "var(--space-4)" }}>
        {LEVELS.map(({ energy, label, brain, note, icon: Icon }) => {
          const active = brain === currentBrain;
          return (
            <Link
              key={brain}
              href={`/notes?energy=${energy}&brain=${brain}`}
              data-brain-state={brain}
              aria-current={active ? "true" : undefined}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-4)",
                borderRadius: "var(--radius-button)",
                border: active ? "1px solid var(--gl-purple-30)" : "1px solid var(--gl-border-neutral)",
                background: active ? "var(--gl-purple-14)" : "var(--gl-bg-energy-btn)",
                padding: "var(--space-5) var(--space-6)",
                textDecoration: "none",
                color: active ? "var(--gl-purple-light)" : "var(--gl-text-secondary)",
              }}
            >
              <span style={{ display: "flex", flexShrink: 0 }}>
                <Icon size={15} />
              </span>
              <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
                <span style={{ fontSize: "var(--text-13)", fontWeight: "var(--weight-600)" }}>{label}</span>
                <small style={{ fontSize: "var(--text-11)", color: "var(--gl-text-dim)" }}>{note}</small>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
