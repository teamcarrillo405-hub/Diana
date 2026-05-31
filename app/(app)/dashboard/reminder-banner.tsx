"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { isQuietHours, isWeekend, shouldShowReminder } from "@/lib/reminders/reminder-rules";
import type { ReminderItem } from "./actions";

/**
 * F7 — In-app reminder banner. NO browser push.
 * Quiet hours + weekend gate is client-side (Pitfall 1 — server runs UTC).
 * Items still open beyond their due date bypass quiet hours and weekend (D-04 escalation).
 * Dismissal is per-session via useState Set (D-05 — mirrors EveningPlanning).
 */
export function ReminderBanner({ items }: { items: ReminderItem[] }) {
  const [now, setNow] = useState<Date | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    setNow(new Date());
  }, []);

  if (!now || items.length === 0) return null;

  const quiet = isQuietHours(now);
  const weekend = isWeekend(now);

  const visible = items
    .filter((i) => !dismissed.has(i.id))
    .filter((i) =>
      shouldShowReminder({
        dueAt: i.due_at,
        stillOpen: i.is_past_due,
        quietHours: quiet,
        weekend,
      }),
    );

  if (visible.length === 0) return null;

  function handleDismiss(id: string) {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }

  return (
    <section className="space-y-2" aria-label="Open reminders">
      <h2 className="text-xs font-medium uppercase tracking-wider text-muted">
        Reminders
      </h2>
      <ul className="space-y-2">
        {visible.map((i) => (
          <li
            key={i.id}
            className="flex items-start justify-between gap-3 rounded-xl border border-border bg-card p-4"
          >
            <Link href={`/assignments/${i.id}`} className="min-w-0 flex-1">
              {i.class_name && (
                <div className="mb-1 flex items-center gap-1.5">
                  {i.class_color && (
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ background: i.class_color }}
                    />
                  )}
                  <span className="text-xs text-muted">{i.class_name}</span>
                </div>
              )}
              <p className="text-sm font-medium">{i.title}</p>
              <p className="mt-0.5 text-xs text-muted">
                {i.is_past_due
                  ? "This is still open."
                  : i.hours_until_due != null && i.hours_until_due <= 1
                  ? "Due within the hour."
                  : `Due in ${i.hours_until_due} hours.`}
              </p>
            </Link>
            <button
              type="button"
              onClick={() => handleDismiss(i.id)}
              className="shrink-0 rounded-md border border-border bg-card px-2 py-1 text-xs text-muted hover:bg-border/30"
            >
              Dismiss
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
