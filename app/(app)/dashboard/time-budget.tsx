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
    <section className="rounded-2xl border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-5 py-4"
        aria-expanded={open}
      >
        <span className="text-sm font-medium">What&apos;s left tonight?</span>
        <span className={`text-sm font-semibold ${heavy ? "text-amber-600 dark:text-amber-400" : "text-accent"}`}>
          {items.length === 0 ? "—" : label}
        </span>
      </button>

      {open && (
        <div className="border-t border-border px-5 pb-5 pt-3 space-y-3">
          {items.length === 0 ? (
            <p className="text-sm text-muted">
              Nothing estimated. Add assignments with time estimates to see your budget.
            </p>
          ) : (
            <>
              {heavy && (
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  That&apos;s a lot for tonight — you might want to decide which to tackle first.
                </p>
              )}
              <ul className="divide-y divide-border">
                {items.map((item) => (
                  <li key={item.assignmentId} className="flex items-center justify-between py-2">
                    <span className="text-sm truncate">{item.title}</span>
                    <span className="ml-3 shrink-0 text-xs text-muted">~{item.effectiveMinutes} min</span>
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
