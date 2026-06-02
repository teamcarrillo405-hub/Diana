"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Search, Sparkles } from "lucide-react";
import { SubjectToolShell } from "@/components/subject-tool-shell";
import { synthesizeNotes, type NoteSynthesisResult } from "./actions";

export function NoteSynthesisPanel() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<NoteSynthesisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function runSynthesis() {
    setError(null);
    const trimmed = query.trim();
    if (trimmed.length < 3) {
      setError("Enter a note question.");
      return;
    }
    startTransition(async () => {
      const res = await synthesizeNotes({ query: trimmed });
      if (res.ok) {
        setResult(res.result);
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <SubjectToolShell
      theme="notes"
      eyebrow="Notes studio"
      title="Ask across notes"
      subtitle="Pull a calm summary from the notes you already captured."
      icon={Sparkles}
    >
      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="min-w-0 flex-1">
          <span className="sr-only">Question for notes</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") runSynthesis();
            }}
            className="touch-target w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            placeholder="What do my notes say about cells?"
          />
        </label>
        <button
          type="button"
          onClick={runSynthesis}
          disabled={pending}
          className="touch-target inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-strong disabled:opacity-50"
        >
          <Search size={15} />
          {pending ? "Reading..." : "Synthesize"}
        </button>
      </div>

      {error && <p className="rounded-md bg-border/40 px-3 py-2 text-sm text-muted">{error}</p>}

      {result && (
        <div className="space-y-3 rounded-xl border border-border bg-surface-raised p-4">
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{result.summary}</p>
          {result.citations.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wider text-muted">Source notes</p>
              <ul className="space-y-1 text-sm">
                {result.citations.map((citation) => (
                  <li key={`${citation.label}-${citation.noteId}`}>
                    <Link href={`/notes/${citation.noteId}`} className="text-accent underline-offset-2 hover:underline">
                      {citation.label ? `[${citation.label}] ` : ""}
                      {citation.title}
                    </Link>
                    {citation.reason && <span className="text-muted"> - {citation.reason}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </SubjectToolShell>
  );
}
