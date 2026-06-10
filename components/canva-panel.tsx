"use client";

import { useState, useTransition } from "react";
import { Check, Copy, ExternalLink, Palette } from "lucide-react";
import { createCanvaDesignForAssignment, type CanvaDesignResult } from "./canva-actions";

/**
 * "Start this in Canva" for visual assignments. One tap creates a titled
 * draft in the student's Canva account and shows the design brief built from
 * their rubric and notes — structure from Diana, content from the student.
 */
export function CanvaPanel({
  assignmentId,
  connected,
}: {
  assignmentId: string;
  connected: boolean;
}) {
  const [result, setResult] = useState<CanvaDesignResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  function start() {
    startTransition(async () => {
      setResult(await createCanvaDesignForAssignment({ assignmentId }));
    });
  }

  function copyBrief() {
    if (result?.ok) {
      void navigator.clipboard?.writeText(result.briefText).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  }

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <span className="flex size-9 items-center justify-center rounded-2xl bg-brand/10 text-brand">
          <Palette size={16} />
        </span>
        <div>
          <h2 className="text-sm font-semibold">This looks like a design project</h2>
          <p className="text-xs text-muted">
            Diana can open a draft in your Canva account with a brief built from your rubric and notes —
            you fill it with your own work.
          </p>
        </div>
      </div>

      {!connected && (
        <p className="text-sm text-muted">
          Connect Canva in{" "}
          <a href="/settings" className="text-accent underline-offset-2 hover:underline">
            Settings
          </a>{" "}
          and this becomes one tap.
        </p>
      )}

      {connected && !result && (
        <button
          type="button"
          onClick={start}
          disabled={pending}
          className="press-scale touch-target inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-strong disabled:opacity-50"
        >
          <Palette size={15} />
          {pending ? "Setting up your draft…" : "Start this in Canva"}
        </button>
      )}

      {result && !result.ok && <p className="text-sm text-muted">{result.error}</p>}

      {result?.ok && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {result.editUrl && (
              <a
                href={result.editUrl}
                target="_blank"
                rel="noreferrer"
                className="press-scale touch-target inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-strong"
              >
                <ExternalLink size={15} /> Open your draft in Canva
              </a>
            )}
            <button
              type="button"
              onClick={copyBrief}
              className="touch-target inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm hover:bg-surface-soft"
            >
              {copied ? <Check size={15} className="text-ok" /> : <Copy size={15} />}
              {copied ? "Copied" : "Copy the brief"}
            </button>
          </div>
          <div className="space-y-2 rounded-xl border border-border bg-surface p-3">
            <p className="text-xs font-medium uppercase tracking-wider text-muted">
              Your design brief — one section per {result.brief.designType === "poster" ? "area" : "slide"}
            </p>
            <ul className="space-y-2">
              {result.brief.sections.map((section) => (
                <li key={section.heading} className="text-sm">
                  <p className="font-medium">{section.heading}</p>
                  <ul className="mt-0.5 list-inside list-disc text-xs text-muted">
                    {section.points.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}
