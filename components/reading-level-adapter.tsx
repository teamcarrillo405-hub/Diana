"use client";

import { useState, useTransition } from "react";
import { SlidersHorizontal } from "lucide-react";
import { adaptReadingLevel } from "./reading-support-actions";

type Target = "original" | "simpler" | "more_detail";

export function ReadingLevelAdapter({
  text,
  aiMode,
}: {
  text: string;
  aiMode: "red" | "yellow" | "green";
}) {
  const [target, setTarget] = useState<Target>("original");
  const [adapted, setAdapted] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function choose(next: Target) {
    setTarget(next);
    setStatus(null);
    if (next === "original") {
      setAdapted(null);
      return;
    }
    startTransition(async () => {
      const result = await adaptReadingLevel({ text, target: next, aiMode });
      if (result.ok) {
        setAdapted(result.text);
        setStatus(result.fallback ? "Local version shown." : null);
      } else {
        setAdapted(null);
        setStatus(result.error);
      }
    });
  }

  return (
    <div className="space-y-2 rounded-lg border border-border bg-card/60 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted">
          <SlidersHorizontal size={13} />
          Reading level
        </p>
        <div className="inline-flex rounded-md border border-border bg-bg p-0.5">
          {[
            ["original", "Original"],
            ["simpler", "Simpler"],
            ["more_detail", "More detail"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => choose(value as Target)}
              aria-pressed={target === value}
              disabled={pending}
              className={`rounded px-2 py-1 text-xs transition-colors disabled:opacity-50 ${
                target === value ? "bg-accent text-white" : "text-muted hover:bg-border/30"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {pending && <p className="text-xs text-muted">Adapting text...</p>}
      {status && <p className="text-xs text-muted">{status}</p>}
      {adapted && !pending && (
        <div className="whitespace-pre-wrap rounded-md border border-border bg-bg p-3 text-sm leading-relaxed text-muted">
          {adapted}
        </div>
      )}
    </div>
  );
}
