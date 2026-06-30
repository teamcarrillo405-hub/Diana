"use client";

import { useState } from "react";
import { Brain, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { isRefusalNeeded } from "@/lib/ai/refuse-redirect";

type Mode = "guide" | "hint" | "quiz";

type DianaResponse = {
  title: string;
  main: string;
  reason: string;
  steps: string[];
  anchor: string;
};

const MODES: Array<{ id: Mode; label: string }> = [
  { id: "guide", label: "Guide me" },
  { id: "hint", label: "Hint ladder" },
  { id: "quiz", label: "Quiz me" },
];

const BOUNDARY_RESPONSE: DianaResponse = {
  title: "Help boundary",
  main: "I can help you build the next part, but the final work stays yours.",
  reason: "That protects authorship and keeps the learning move visible.",
  anchor: "",
  steps: [
    "Name the part you want to create first.",
    "Draft one rough sentence or setup line.",
    "Ask Diana to check structure, evidence, or reasoning.",
  ],
};

export function StudyBuddyClient({
  initialSource,
  initialQuestion,
}: {
  initialSource?: string;
  initialQuestion?: string;
} = {}) {
  const [source, setSource] = useState(
    initialSource?.trim() || "Rubric: use one quote, explain the evidence, and connect it to the claim.",
  );
  const [question, setQuestion] = useState(
    initialQuestion?.trim() || "I have evidence but do not know how to start the paragraph.",
  );
  const [mode, setMode] = useState<Mode>("guide");
  const [response, setResponse] = useState<DianaResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAsk() {
    if (isRefusalNeeded(question)) {
      setResponse(BOUNDARY_RESPONSE);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/diana/study-buddy", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ source, question, mode }),
      });
      const data = (await res.json()) as { ok: boolean; response?: DianaResponse; error?: string };
      if (!data.ok || !data.response) {
        setError(data.error ?? "Diana study help is unavailable right now.");
      } else {
        setResponse(data.response);
      }
    } catch {
      setError("Could not reach Diana. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
      <section className="rounded-3xl border border-border bg-surface-raised p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="flex size-10 items-center justify-center rounded-2xl bg-brand/10 text-brand">
            <Brain size={18} />
          </span>
          <div>
            <h2 className="text-base font-semibold">Bring your source</h2>
            <p className="text-sm text-muted">The helper works best with a prompt, rubric, note, or passage.</p>
          </div>
        </div>
        <label className="mt-4 block text-sm font-medium">
          Source or class material
          <textarea
            value={source}
            onChange={(event) => setSource(event.target.value)}
            rows={4}
            className="mt-1 w-full rounded-2xl border border-border bg-surface px-3 py-3 text-sm leading-6"
          />
        </label>
        <label className="mt-4 block text-sm font-medium">
          What do you want help with?
          <textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            rows={4}
            className="mt-1 w-full rounded-2xl border border-border bg-surface px-3 py-3 text-sm leading-6"
          />
        </label>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {MODES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setMode(item.id)}
              aria-pressed={mode === item.id}
              className={`touch-target rounded-2xl border px-3 py-2 text-sm font-semibold ${
                mode === item.id
                  ? "border-brand bg-brand text-white"
                  : "border-border bg-surface text-muted hover:bg-surface-soft"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={handleAsk}
          disabled={loading || question.trim().length < 2}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : null}
          {loading ? "Asking Diana…" : "Ask Diana"}
        </button>
      </section>

      <aside className="rounded-3xl border border-border bg-surface-raised p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <ShieldCheck size={17} className="text-brand" />
          <h2 className="text-base font-semibold">Diana response</h2>
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-border bg-surface p-3">
            <p className="text-sm text-muted">{error}</p>
          </div>
        ) : loading ? (
          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-brand/20 bg-brand/10 p-3">
            <Loader2 size={15} className="animate-spin text-brand" />
            <p className="text-sm text-muted">Diana is thinking…</p>
          </div>
        ) : response ? (
          <>
            <div className="mt-4 rounded-2xl border border-brand/20 bg-brand/10 p-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-strong dark:text-brand">
                {response.title}
              </p>
              <p className="mt-2 text-sm font-medium">{response.main}</p>
              <p className="mt-2 text-sm text-muted">{response.reason}</p>
            </div>
            <div className="mt-4 space-y-2">
              {response.steps.map((step) => (
                <div key={step} className="flex gap-2 rounded-2xl border border-border bg-surface p-3 text-sm">
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-brand" />
                  <span>{step}</span>
                </div>
              ))}
            </div>
            {response.anchor ? (
              <div className="mt-4 rounded-2xl border border-border bg-surface p-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">Source anchor</p>
                <p className="mt-1 text-sm text-muted">{response.anchor}</p>
              </div>
            ) : null}
          </>
        ) : (
          <div className="mt-4 rounded-2xl border border-border bg-surface p-4">
            <p className="text-sm text-muted">
              Add your source and question, choose a mode, then click Ask Diana.
            </p>
          </div>
        )}
      </aside>
    </div>
  );
}
