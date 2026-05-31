"use client";
import { useState } from "react";

// Static, feature-keyed descriptions. NO AI call needed.
// Keep keys aligned with lib/ai/safety.ts LogParams.feature union.
export const AI_FEATURE_DESCRIPTIONS: Record<string, string> = {
  task_breakdown: "Claude suggested how to break this into smaller steps.",
  math_step: "Claude gave a hint without solving the problem.",
  writing_aid: "Claude explained a writing rule you could apply.",
  citation_gen: "Claude formatted a citation from the details you provided.",
  reading_scaffold: "Claude created comprehension questions for this reading.",
  math_example: "Claude showed a worked example of a similar problem — not yours.",
  transcribe_note: "Claude turned your voice note into text.",
};

export function AiTooltip({ feature }: { feature: string }) {
  const [open, setOpen] = useState(false);
  const desc = AI_FEATURE_DESCRIPTIONS[feature];
  if (!desc) return null;

  return (
    <span className="inline-flex items-center gap-1 align-middle">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="About this AI help"
        aria-expanded={open}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-border bg-card text-xs text-muted hover:bg-border/40"
      >
        i
      </button>
      {open && (
        <span className="rounded-md border border-border bg-card px-2 py-1 text-xs text-foreground">
          {desc}
        </span>
      )}
    </span>
  );
}
