"use client";

import { useEffect, useState, useTransition } from "react";
import { saveWeeklyReflection, skipWeeklyReflection } from "./actions";
import { shouldShowWeeklyReflection } from "@/lib/emotional/session";

type Mood = "good" | "meh" | "rough";

export function WeeklyReflection({
  lastReflectedAt,
  mood,
}: {
  lastReflectedAt: string | null;
  mood: string | null;
}) {
  const [visible, setVisible] = useState(false);
  const [body, setBody] = useState("");
  const [reflection, setReflection] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setVisible(shouldShowWeeklyReflection({ lastReflectedAt, now: new Date() }));
  }, [lastReflectedAt]);

  if (!visible) return null;

  function save() {
    setMessage(null);
    startTransition(async () => {
      const result = await saveWeeklyReflection({
        body,
        mood: mood === "good" || mood === "meh" || mood === "rough" ? (mood as Mood) : null,
      });
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      setReflection(result.reflection);
    });
  }

  function skip() {
    startTransition(async () => {
      const result = await skipWeeklyReflection();
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      setVisible(false);
    });
  }

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-5">
      <div>
        <h2 className="text-sm font-medium uppercase tracking-wider text-muted">Weekly reflection</h2>
        <p className="mt-1 text-sm text-muted">What clicked this week? What still feels foggy?</p>
      </div>
      {reflection ? (
        <div className="space-y-3">
          <p className="rounded-md border border-border bg-background px-3 py-2 text-sm text-muted">
            {reflection}
          </p>
          <button
            type="button"
            onClick={() => setVisible(false)}
            className="rounded-md border border-border px-3 py-2 text-sm hover:bg-border/30"
          >
            Done
          </button>
        </div>
      ) : (
        <>
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={3}
            maxLength={1500}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            placeholder="A few words is enough."
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={save}
              disabled={pending || body.trim().length < 2}
              className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Save reflection
            </button>
            <button
              type="button"
              onClick={skip}
              disabled={pending}
              className="rounded-md border border-border px-3 py-2 text-sm text-muted hover:bg-border/30 disabled:opacity-50"
            >
              Skip this week
            </button>
          </div>
          {message && <p className="text-sm text-muted">{message}</p>}
        </>
      )}
    </section>
  );
}
