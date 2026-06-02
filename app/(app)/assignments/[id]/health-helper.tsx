"use client";

import { useState, useTransition } from "react";
import { requestHealthScaffold } from "./ai-tools-actions";
import { fallbackHealthScaffold, type HealthMode, type HealthScaffoldResult } from "@/lib/wellness/health";

const MODES: Array<{ value: HealthMode; label: string }> = [
  { value: "health_question", label: "Health question" },
  { value: "movement_goal", label: "Movement goal" },
  { value: "cpr_first_aid", label: "CPR / first aid" },
  { value: "sleep_recovery", label: "Sleep + recovery" },
];

export function HealthHelper({
  assignmentId,
  classAiMode,
  initialPrompt,
}: {
  assignmentId: string;
  classAiMode: "red" | "yellow" | "green";
  initialPrompt: string;
}) {
  const [mode, setMode] = useState<HealthMode>("health_question");
  const [prompt, setPrompt] = useState(initialPrompt);
  const [result, setResult] = useState<HealthScaffoldResult>(fallbackHealthScaffold("health_question"));
  const [status, setStatus] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function changeMode(nextMode: HealthMode) {
    setMode(nextMode);
    setResult(fallbackHealthScaffold(nextMode));
  }

  function run() {
    setStatus(null);
    startTransition(async () => {
      const res = await requestHealthScaffold({
        assignmentId,
        aiMode: classAiMode,
        mode,
        prompt,
      });
      if (!res.ok) {
        setStatus(res.error);
        return;
      }
      setResult(res.result);
    });
  }

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
      <div className="space-y-1">
        <h2 className="text-sm font-medium uppercase tracking-wider text-muted">Health & wellness helper</h2>
        <p className="text-sm text-muted">Use class materials first, then build a calm scaffold.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {MODES.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => changeMode(item.value)}
            className={`rounded-md border px-3 py-2 text-sm ${
              mode === item.value ? "border-accent bg-accent/10 text-accent" : "border-border bg-background"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-background p-3">
        <p className="text-xs font-medium uppercase tracking-wider text-muted">Start here</p>
        <ul className="mt-2 space-y-1 text-sm">
          {result.prompts.map((item) => (
            <li key={item}>- {item}</li>
          ))}
        </ul>
      </div>

      <textarea
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
        rows={5}
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        placeholder="Paste the health question, PE goal, CPR prompt, or sleep reflection."
      />

      <button
        type="button"
        onClick={run}
        disabled={pending || classAiMode !== "green" || prompt.trim().length < 2}
        className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        Build scaffold
      </button>
      {classAiMode !== "green" && <p className="text-sm text-muted">AI help is off for this class.</p>}
      {status && <p className="text-sm text-muted">{status}</p>}

      <div className="grid gap-3 md:grid-cols-2">
        {result.cards.map((card) => (
          <article key={`${card.title}-${card.action}`} className="rounded-xl border border-border bg-background p-3">
            <h3 className="text-sm font-medium">{card.title}</h3>
            <p className="mt-1 text-sm text-muted">{card.body}</p>
            <p className="mt-2 text-xs text-accent">{card.action}</p>
          </article>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-background p-3">
        <p className="text-xs font-medium uppercase tracking-wider text-muted">Checklist</p>
        <ul className="mt-2 space-y-1 text-sm">
          {result.checklist.map((item) => (
            <li key={item}>- {item}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
