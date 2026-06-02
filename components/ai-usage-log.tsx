"use client";
import { useState } from "react";
import { AI_FEATURE_DESCRIPTIONS } from "./ai-tooltip";

export type AiInteractionRow = {
  feature: string;
  model: string;
  tokens_used: number;
  created_at: string;
};

// tokens / 4 ≈ words, rounded to nearest 10.
export function tokensToWords(tokens: number): number {
  const raw = tokens / 4;
  return Math.round(raw / 10) * 10;
}

const FEATURE_LABEL: Record<string, string> = {
  task_breakdown: "Task breakdown",
  math_step: "Math hint",
  math_example: "Worked example",
  writing_aid: "Writing aid",
  citation_gen: "Citation help",
  reading_scaffold: "Reading scaffold",
  reading_level: "Reading level",
  vocab_hover: "Vocabulary definition",
  transcribe_note: "Voice-to-text",
};

function labelFor(feature: string): string {
  return FEATURE_LABEL[feature] ?? feature.replace(/_/g, " ");
}

export function AiUsageLog({ interactions }: { interactions: AiInteractionRow[] }) {
  const [open, setOpen] = useState(false);
  const n = interactions.length;

  if (n === 0) {
    return (
      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">AI used on this assignment</h2>
        <p className="mt-1 text-sm text-muted">
          AI hasn&apos;t been used on this assignment yet.
        </p>
      </section>
    );
  }

  const summary = `AI was used on this assignment ${n} ${n === 1 ? "time" : "times"}`;

  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">AI used on this assignment</h2>
          <p className="mt-1 text-sm text-muted">{summary}.</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? "Hide details" : "Show details"}
          className="rounded-md border border-border bg-transparent px-3 py-1.5 text-xs hover:bg-border/30"
        >
          {open ? "Hide details" : "Show details"}
        </button>
      </div>

      {open && (
        <ul className="mt-3 space-y-2">
          {interactions.map((row, i) => {
            const words = tokensToWords(row.tokens_used);
            const desc = AI_FEATURE_DESCRIPTIONS[row.feature];
            return (
              <li
                key={i}
                className="rounded-md border border-border bg-background/40 p-3 text-sm"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-medium">{labelFor(row.feature)}</span>
                  <span className="text-xs text-muted">{row.model}</span>
                </div>
                {desc && (
                  <p className="mt-1 text-xs text-muted">{desc}</p>
                )}
                <p className="mt-1 text-xs text-muted">
                  About {words} words of AI help
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
