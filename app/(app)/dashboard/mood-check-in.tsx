"use client";

import { useState, useTransition } from "react";
import { saveMoodCheckIn } from "./actions";

type Mood = "good" | "meh" | "rough";

const MOODS: Array<{ value: Mood; label: string; detail: string }> = [
  { value: "good", label: "Good", detail: "Standard plan" },
  { value: "meh", label: "Meh", detail: "Lighter choices" },
  { value: "rough", label: "Rough", detail: "Smallest steps" },
];

export function MoodCheckIn({ visible }: { visible: boolean }) {
  const [shown, setShown] = useState(visible);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  if (!shown) return null;

  function save(mood: Mood | null, disable = false) {
    setMessage(null);
    startTransition(async () => {
      const result = await saveMoodCheckIn({ mood, disable });
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      setShown(false);
    });
  }

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-5">
      <div>
        <h2 className="text-sm font-medium uppercase tracking-wider text-muted">Session check-in</h2>
        <p className="mt-1 text-sm text-muted">How is today starting?</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {MOODS.map((mood) => (
          <button
            key={mood.value}
            type="button"
            disabled={pending}
            onClick={() => save(mood.value)}
            className="rounded-lg border border-border bg-background px-3 py-3 text-left hover:bg-border/30 disabled:opacity-50"
          >
            <span className="block text-sm font-medium">{mood.label}</span>
            <span className="block text-xs text-muted">{mood.detail}</span>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => save(null)}
          className="rounded-md border border-border px-3 py-2 text-sm text-muted hover:bg-border/30 disabled:opacity-50"
        >
          Skip today
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => save(null, true)}
          className="rounded-md border border-border px-3 py-2 text-sm text-muted hover:bg-border/30 disabled:opacity-50"
        >
          Do not ask again
        </button>
      </div>
      {message && <p className="text-sm text-muted">{message}</p>}
    </section>
  );
}
