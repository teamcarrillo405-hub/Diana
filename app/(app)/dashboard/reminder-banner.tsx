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
    <section
      style={{
        maxWidth: "var(--layout-max-width)",
        margin: "0 auto",
        padding: "var(--space-8) var(--space-17)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-4)",
      }}
      aria-label="Open reminders"
    >
      <p
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "var(--text-11)",
          fontWeight: "var(--weight-700)",
          letterSpacing: "var(--tracking-20)",
          textTransform: "uppercase",
          color: "var(--gl-text-muted)",
        }}
      >
        Reminders
      </p>
      <ul style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)", listStyle: "none", padding: 0, margin: 0 }}>
        {visible.map((i) => (
          <li
            key={i.id}
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: "var(--space-8)",
              borderRadius: "var(--radius-card)",
              border: "1px solid var(--gl-gold-28)",
              background: "var(--gl-gold-12)",
              padding: "var(--space-10) var(--space-12)",
            }}
          >
            <Link
              href={`/assignments/${i.id}`}
              style={{ minWidth: 0, flex: 1, textDecoration: "none" }}
            >
              {i.class_name && (
                <div style={{ marginBottom: "var(--space-2)", display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                  {i.class_color && (
                    <span
                      style={{ display: "inline-block", width: 8, height: 8, borderRadius: "var(--radius-circle)", background: i.class_color }}
                    />
                  )}
                  <span style={{ fontSize: "var(--text-12)", color: "var(--gl-text-muted)" }}>{i.class_name}</span>
                </div>
              )}
              <p style={{ fontSize: "var(--text-14)", fontWeight: "var(--weight-600)", color: "var(--gl-text-secondary)" }}>
                {i.title}
              </p>
              <p style={{ marginTop: "var(--space-1)", fontSize: "var(--text-12)", color: "var(--gl-gold)" }}>
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
              style={{
                flexShrink: 0,
                borderRadius: "var(--radius-pill)",
                border: "1px solid var(--gl-border-neutral)",
                background: "var(--gl-bg-card)",
                padding: "var(--space-2) var(--space-6)",
                fontSize: "var(--text-12)",
                color: "var(--gl-text-muted)",
                cursor: "pointer",
              }}
            >
              Dismiss
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
