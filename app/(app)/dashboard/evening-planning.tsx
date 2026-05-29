"use client";

import { useEffect, useState } from "react";
import { markIntentionFired, type EveningIntention } from "./actions";

/**
 * F14 — Evening planning surface. Renders between 17:00 and 20:00 local time
 * when there are unfired event-based intentions. Client-only time gate because
 * the server runs in UTC and we need student's local clock.
 *
 * Pitfall 4: never gate on time in the server component.
 * Pitfall 5: optimistic dismiss so UI stays calm even if the server call hiccups.
 * Pitfall 7: copy is intentionally neutral — no "you said you would", no urgency.
 */
export function EveningPlanning({
  intentions,
}: {
  intentions: EveningIntention[];
}) {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    const h = new Date().getHours();
    setShow(h >= 17 && h < 20);
  }, []);

  if (!show || intentions.length === 0) return null;

  const visible = intentions.filter((i) => !dismissed.has(i.id));
  if (visible.length === 0) return null;

  async function handleDismiss(id: string) {
    // Optimistic local dismiss first (Pitfall 5).
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    // Background server write; if it fails, the item reappears next session.
    try {
      await markIntentionFired({ intentionId: id });
    } catch {
      // Silent — the local dismiss already happened.
    }
  }

  return (
    <section className="space-y-2" aria-label="Your evening plan">
      <h2 className="text-xs font-medium uppercase tracking-wider text-muted">
        Your evening plan
      </h2>
      <ul className="space-y-2">
        {visible.map((i) => (
          <li
            key={i.id}
            className="flex items-start justify-between gap-3 rounded-xl border border-border bg-card p-4"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium">{i.assignment_title}</p>
              <p className="mt-0.5 text-xs text-muted">{i.cue_text}</p>
            </div>
            <button
              type="button"
              onClick={() => handleDismiss(i.id)}
              className="shrink-0 rounded-md border border-border bg-card px-2 py-1 text-xs text-muted hover:bg-border/30"
            >
              Mark done
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
