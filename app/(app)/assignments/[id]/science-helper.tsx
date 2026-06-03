"use client";

import { useState } from "react";
import { Atom, Beaker, FlaskConical, GitBranch, NotebookText, Sigma } from "lucide-react";
import { AiTooltip } from "@/components/ai-tooltip";
import { SubjectToolShell } from "@/components/subject-tool-shell";
import { requestScienceScaffold } from "./ai-tools-actions";
import type { ScienceScaffoldMode, ScienceScaffoldResult } from "@/lib/science/scaffold";
import type { StudyHelperShellContext } from "@/lib/study-helper/modes";

const MODES: Array<{ mode: ScienceScaffoldMode; label: string; icon: typeof FlaskConical }> = [
  { mode: "hypothesis", label: "Hypothesis", icon: FlaskConical },
  { mode: "lab_report", label: "Lab report", icon: NotebookText },
  { mode: "method", label: "Method", icon: GitBranch },
  { mode: "formula", label: "Formula", icon: Sigma },
  { mode: "chemistry_balance", label: "Balance", icon: Atom },
  { mode: "diagram", label: "Diagram", icon: GitBranch },
  { mode: "frq", label: "FRQ", icon: Beaker },
];

export function ScienceHelper({
  assignmentId,
  classAiMode,
  initialPrompt,
  studyContext,
}: {
  assignmentId: string;
  classAiMode: "red" | "yellow" | "green";
  initialPrompt: string;
  studyContext?: StudyHelperShellContext;
}) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState(initialPrompt);
  const [activeMode, setActiveMode] = useState<ScienceScaffoldMode>("hypothesis");
  const [result, setResult] = useState<ScienceScaffoldResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (classAiMode === "red" || classAiMode === "yellow") return null;

  async function runMode(mode: ScienceScaffoldMode) {
    if (!prompt.trim()) return;
    setActiveMode(mode);
    setLoading(true);
    setErrorMsg(null);
    const res = await requestScienceScaffold({
      assignmentId,
      aiMode: classAiMode,
      mode,
      prompt,
    });
    if (res.ok) setResult(res.result);
    else setErrorMsg(res.error);
    setLoading(false);
  }

  return (
    <SubjectToolShell
      theme="science"
      eyebrow="Science lab"
      title={open ? "Hypothesis cards" : "Open science lab"}
      subtitle={open ? "Predict, test, explain, and check the model." : "Turn prompts into lab-ready thinking cards."}
      icon={FlaskConical}
      studyContext={studyContext}
    >
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="touch-target inline-flex w-full items-center justify-center gap-2 rounded-xl border border-subject-science/25 bg-surface-raised px-4 py-2 text-sm font-medium text-teal-700 hover:bg-subject-science/10 dark:text-teal-300"
        >
          <FlaskConical size={13} />
          Open hypothesis cards
        </button>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium uppercase tracking-wider text-muted">Science scaffold</p>
              {result && <AiTooltip feature="science_scaffold" />}
            </div>
            <p className="text-xs text-muted">Predict first, then explain.</p>
          </div>

          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Paste the lab prompt, formula problem, or science question."
            rows={5}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />

          <div className="flex flex-wrap gap-2">
            {MODES.map(({ mode, label, icon: Icon }) => (
              <button
                key={mode}
                type="button"
                onClick={() => runMode(mode)}
                aria-pressed={activeMode === mode}
                disabled={loading || !prompt.trim()}
                className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs ${
                  activeMode === mode
                    ? "border-subject-science bg-subject-science/10 text-teal-700 dark:text-teal-300"
                    : "border-border text-muted hover:bg-border/30"
                } disabled:opacity-50`}
              >
                <Icon size={13} />
                {label}
              </button>
            ))}
          </div>

          {errorMsg && (
            <p className="rounded border border-amber-500/40 bg-amber-50 px-2 py-1.5 text-xs text-amber-900">
              {errorMsg}
            </p>
          )}
          {loading && <p className="text-sm text-muted">Thinking...</p>}

          {result && (
            <div className="space-y-3 rounded-xl border border-border bg-card/60 p-4">
              <p className="text-sm font-medium">{result.title}</p>
              <div className="grid gap-2 md:grid-cols-2">
                {result.cards.map((card) => (
                  <div key={`${card.label}-${card.prompt}`} className="rounded-md border border-border bg-background p-3">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted">{card.label}</p>
                    <p className="mt-1 text-sm">{card.prompt}</p>
                    {card.exampleFrame && <p className="mt-2 text-xs text-muted">{card.exampleFrame}</p>}
                  </div>
                ))}
              </div>

              {result.formulaContext.length > 0 && (
                <div className="rounded-md border border-border bg-background p-3">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted">Formula context</p>
                  <ul className="mt-2 space-y-1 text-sm text-muted">
                    {result.formulaContext.map((item) => (
                      <li key={`${item.variable}-${item.meaning}`}>
                        <span className="font-medium text-foreground">{item.variable}</span>: {item.meaning}
                        {item.unit ? ` (${item.unit})` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.mermaid && (
                <div className="rounded-md border border-border bg-background p-3">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted">Mermaid diagram</p>
                  <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs">{result.mermaid}</pre>
                </div>
              )}

              <p className="rounded-md border border-border bg-background px-3 py-2 text-sm">
                {result.checkPrompt}
              </p>
            </div>
          )}
        </>
      )}
    </SubjectToolShell>
  );
}
