"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Search, Sparkles } from "lucide-react";
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
    <section className="space-y-3 rounded-xl border border-border bg-card p-4" aria-label="Synthesize notes">
      <div className="flex items-center gap-2">
        <Sparkles size={16} className="text-accent" />
        <h2 className="text-sm font-semibold">Ask across notes</h2>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="min-w-0 flex-1">
          <span className="sr-only">Question for notes</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") runSynthesis();
            }}
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm"
            placeholder="What do my notes say about cells?"
          />
        </label>
        <button
          type="button"
          onClick={runSynthesis}
          disabled={pending}
          className="inline-flex items-center justify-center gap-1.5 rounded-md bg-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          <Search size={15} />
          {pending ? "Reading..." : "Synthesize"}
        </button>
      </div>

      {error && <p className="rounded-md bg-border/40 px-3 py-2 text-sm text-muted">{error}</p>}

      {result && (
        <div className="space-y-3 rounded-lg border border-border bg-bg p-4">
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
    </section>
  );
}
