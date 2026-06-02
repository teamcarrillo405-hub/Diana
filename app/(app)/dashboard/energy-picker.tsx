"use client";

import Link from "next/link";
import { Battery, Leaf, Zap } from "lucide-react";

const LEVELS = [
  { value: "low", label: "Low", icon: Leaf },
  { value: "medium", label: "OK", icon: Battery },
  { value: "high", label: "On it", icon: Zap },
] as const;

export function EnergyPicker({ current }: { current: "low" | "medium" | "high" }) {
  return (
    <div className="space-y-2 rounded-2xl border border-border bg-surface-raised p-3">
      <p className="text-xs font-medium uppercase tracking-wider text-muted">
        Energy mode
      </p>
      <div className="grid grid-cols-3 gap-2">
        {LEVELS.map(({ value, label, icon: Icon }) => {
          const active = value === current;
          return (
            <Link
              key={value}
              href={`/dashboard?energy=${value}`}
              className={`touch-target flex min-w-0 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm transition ${
                active
                  ? "border-brand/30 bg-brand/10 text-brand-strong dark:text-brand"
                  : "border-border bg-surface hover:bg-surface-soft"
              }`}
            >
              <Icon size={15} className="shrink-0" />
              <span className="min-w-0 truncate">{label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
