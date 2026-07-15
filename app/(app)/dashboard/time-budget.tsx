"use client";

import { useState } from "react";
import type { BudgetItem } from "@/lib/time-budget/compute";

interface TimeBudgetProps {
  totalMinutes: number;
  items: BudgetItem[];
}

export function TimeBudget({ totalMinutes, items }: TimeBudgetProps) {
  const [open, setOpen] = useState(false);
  const hours = Math.floor(totalMinutes / 60);
  const mins  = totalMinutes % 60;
  const label = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  const heavy = totalMinutes > 180;

  return (
    <section style={{ borderRadius: "var(--radius-card)", border: "1px solid var(--gl-border-neutral)", background: "var(--gl-bg-card)", backdropFilter: "var(--blur-card)", WebkitBackdropFilter: "var(--blur-card)" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex",
          width: "100%",
          alignItems: "center",
          justifyContent: "space-between",
          background: "transparent",
          border: "none",
          padding: "var(--space-10) var(--space-13)",
          cursor: "pointer",
        }}
        aria-expanded={open}
      >
        <span style={{ fontSize: "var(--text-14)", fontWeight: "var(--weight-600)", color: "var(--gl-text-secondary)" }}>What&apos;s left tonight?</span>
        <span style={{ fontSize: "var(--text-14)", fontWeight: "var(--weight-700)", color: heavy ? "var(--gl-amber)" : "var(--gl-cyan)" }}>
          {items.length === 0 ? "-" : label}
        </span>
      </button>

      {open && (
        <div style={{ borderTop: "1px solid var(--gl-border-neutral)", padding: "var(--space-6) var(--space-13) var(--space-13)", display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
          {items.length === 0 ? (
            <p style={{ fontSize: "var(--text-14)", color: "var(--gl-text-muted)" }}>
              Nothing estimated. Add assignments with time estimates to see your budget.
            </p>
          ) : (
            <>
              {heavy && (
                <p style={{ fontSize: "var(--text-12)", color: "var(--gl-amber)" }}>
                  That&apos;s a lot for tonight: you might want to decide which to tackle first.
                </p>
              )}
              <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {items.map((item) => (
                  <li key={item.assignmentId} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "var(--space-2) 0", borderTop: "1px solid var(--gl-border-neutral-sm)" }}>
                    <span style={{ fontSize: "var(--text-14)", color: "var(--gl-text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title}</span>
                    <span style={{ marginLeft: "var(--space-8)", flexShrink: 0, fontSize: "var(--text-12)", color: "var(--gl-text-muted)" }}>~{item.effectiveMinutes} min</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </section>
  );
}
