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
    <div className="brain-state-panel">
      <p className="brain-state-title">
        Brain state
      </p>
      <div className="brain-state-grid">
        {LEVELS.map(({ energy, label, brain, note, icon: Icon }) => {
          const active = brain === currentBrain;
          return (
            <Link
              key={brain}
              href={`/dashboard?energy=${energy}&brain=${brain}`}
              className={`brain-state-button touch-target ${active ? "is-active" : ""}`}
              data-brain-state={brain}
              aria-current={active ? "true" : undefined}
            >
              <span className="brain-state-swatch">
                <Icon size={15} />
              </span>
              <span className="brain-state-copy">
                <span>{label}</span>
                <small>{note}</small>
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
