"use client";

import Link from "next/link";

const LEVELS = [
  { value: "low", label: "Low", emoji: "🪫" },
  { value: "medium", label: "OK", emoji: "🔋" },
  { value: "high", label: "On it", emoji: "⚡" },
] as const;

export function EnergyPicker({ current }: { current: "low" | "medium" | "high" }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wider text-muted">
        How&apos;s your energy?
      </p>
      <div className="flex gap-2">
        {LEVELS.map((l) => {
          const active = l.value === current;
          return (
            <Link
              key={l.value}
              href={`/dashboard?energy=${l.value}`}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                active
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border bg-card hover:bg-border/30"
              }`}
            >
              <span aria-hidden>{l.emoji}</span>
              {l.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
