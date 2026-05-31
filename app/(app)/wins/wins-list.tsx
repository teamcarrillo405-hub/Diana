"use client";

import { useState, useEffect } from "react";
import type { DayGroup } from "@/lib/wins/group-by-day";

const KIND_LABEL: Record<string, string> = {
  reading: "Reading",
  essay: "Essay",
  problem_set: "Problem set",
  test_prep: "Test prep",
  project: "Project",
  lab: "Lab",
  other: "Task",
};

/**
 * Renders local time after mount to avoid hydration mismatch.
 * Pattern from evening-planning.tsx: useState("") initial value matches
 * server HTML, then useEffect populates with client local time.
 */
function WinsItemTime({ iso }: { iso: string }) {
  const [display, setDisplay] = useState("");
  useEffect(() => {
    setDisplay(
      new Date(iso).toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      }),
    );
  }, [iso]);
  return <p className="shrink-0 text-xs text-muted">{display}</p>;
}

export function WinsList({ groups }: { groups: DayGroup[] }) {
  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <section key={g.day_iso} className="space-y-2">
          <h2 className="text-xs font-medium uppercase tracking-wider text-muted">
            {g.day_label}
          </h2>
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">
            {g.items.map((item) => (
              <li
                key={item.id}
                className="flex items-start justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  {item.class_name && (
                    <div className="mb-1 flex items-center gap-1.5">
                      {item.class_color && (
                        <span
                          className="inline-block h-2 w-2 rounded-full"
                          style={{ background: item.class_color }}
                        />
                      )}
                      <span className="text-xs text-muted">{item.class_name}</span>
                    </div>
                  )}
                  <p className="truncate text-sm font-medium">
                    {item.assignment_title ?? "Task"}
                  </p>
                  {item.assignment_kind && (
                    <p className="text-xs text-muted">
                      {KIND_LABEL[item.assignment_kind] ?? "Task"} · done
                    </p>
                  )}
                </div>
                <WinsItemTime iso={item.occurred_at} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
