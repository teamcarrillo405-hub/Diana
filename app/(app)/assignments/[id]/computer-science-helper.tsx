"use client";

import { useMemo, useState } from "react";
import { Binary, Bot, Bug, Code2, FileCode2, ListTree, Play, RotateCcw, StepForward } from "lucide-react";
import { AiTooltip } from "@/components/ai-tooltip";
import {
  buildAlgorithmSteps,
  parseNumberList,
  type AlgorithmMode,
} from "@/lib/computer-science/algorithms";
import { runPythonLite, type CodeLanguage, type CodeRunResult } from "@/lib/computer-science/sandbox";
import type { CsScaffoldMode, CsScaffoldResult } from "@/lib/computer-science/scaffold";
import { requestCsScaffold } from "./ai-tools-actions";

const SCAFFOLD_MODES: Array<{ mode: CsScaffoldMode; label: string; icon: typeof Bug }> = [
  { mode: "error_hint", label: "Hint", icon: Bug },
  { mode: "pseudocode_bridge", label: "Pseudocode", icon: ListTree },
  { mode: "code_review", label: "Review", icon: Code2 },
  { mode: "debug_log", label: "Debug", icon: Bot },
  { mode: "project_scaffold", label: "Project", icon: FileCode2 },
];

const ALGORITHM_LABELS: Record<AlgorithmMode, string> = {
  bubble_sort: "Bubble sort",
  binary_search: "Binary search",
  linked_list: "Linked list",
};

export function ComputerScienceHelper({
  assignmentId,
  classAiMode,
  initialPrompt,
}: {
  assignmentId: string;
  classAiMode: "red" | "yellow" | "green";
  initialPrompt: string;
}) {
  const [open, setOpen] = useState(false);
  const [language, setLanguage] = useState<CodeLanguage>("javascript");
  const [code, setCode] = useState('console.log("hello")');
  const [runResult, setRunResult] = useState<CodeRunResult | null>(null);
  const [scaffold, setScaffold] = useState<CsScaffoldResult | null>(null);
  const [activeMode, setActiveMode] = useState<CsScaffoldMode>("error_hint");
  const [loading, setLoading] = useState(false);
  const [algorithmMode, setAlgorithmMode] = useState<AlgorithmMode>("bubble_sort");
  const [algorithmInput, setAlgorithmInput] = useState("5, 1, 4, 2, 8");
  const [target, setTarget] = useState("4");
  const [stepIndex, setStepIndex] = useState(0);

  const values = useMemo(() => parseNumberList(algorithmInput), [algorithmInput]);
  const algorithmSteps = useMemo(
    () => buildAlgorithmSteps(algorithmMode, values, Number(target)),
    [algorithmMode, values, target],
  );
  const activeStep = algorithmSteps[Math.min(stepIndex, Math.max(0, algorithmSteps.length - 1))];

  if (classAiMode === "red" || classAiMode === "yellow") return null;

  function switchLanguage(next: CodeLanguage) {
    setLanguage(next);
    setCode(next === "python" ? 'print("hello")' : 'console.log("hello")');
    setRunResult(null);
  }

  async function runCode() {
    setLoading(true);
    if (language === "python") {
      setRunResult(runPythonLite(code));
      setLoading(false);
      return;
    }
    setRunResult(await runJavaScriptSandbox(code));
    setLoading(false);
  }

  async function runScaffold(mode: CsScaffoldMode) {
    setActiveMode(mode);
    setLoading(true);
    const res = await requestCsScaffold({
      assignmentId,
      aiMode: classAiMode,
      mode,
      language,
      code,
      runtimeError: runResult?.error ?? "",
      prompt: initialPrompt,
    });
    if (res.ok) setScaffold(res.result);
    else {
      setScaffold({
        mode,
        title: "CS scaffold",
        cards: [{ label: "Try", prompt: res.error, studentAction: "Run one small check." }],
        pseudocodeSteps: [],
        reviewQuestions: [],
        debugLog: [],
        milestones: [],
        checkPrompt: "Try one small test case.",
      });
    }
    setLoading(false);
  }

  function resetVisualizer(nextMode: AlgorithmMode) {
    setAlgorithmMode(nextMode);
    setStepIndex(0);
  }

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-5">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-foreground"
        >
          <Code2 size={13} />
          Open coding scaffold
        </button>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium uppercase tracking-wider text-muted">Coding scaffold</p>
              {scaffold && <AiTooltip feature="cs_scaffold" />}
            </div>
            <div className="flex rounded-md border border-border p-0.5">
              {(["javascript", "python"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => switchLanguage(option)}
                  aria-pressed={language === option}
                  className={`rounded px-2 py-1 text-xs ${
                    language === option ? "bg-accent text-white" : "text-muted hover:bg-border/30"
                  }`}
                >
                  {option === "javascript" ? "JS" : "Python"}
                </button>
              ))}
            </div>
          </div>

          <textarea
            value={code}
            onChange={(event) => setCode(event.target.value)}
            spellCheck={false}
            rows={8}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm"
          />

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={runCode}
              disabled={loading || !code.trim()}
              className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
            >
              <Play size={13} />
              Run
            </button>
            {SCAFFOLD_MODES.map(({ mode, label, icon: Icon }) => (
              <button
                key={mode}
                type="button"
                onClick={() => runScaffold(mode)}
                aria-pressed={activeMode === mode}
                disabled={loading || (!code.trim() && !initialPrompt.trim())}
                className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs ${
                  activeMode === mode
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border text-muted hover:bg-border/30"
                } disabled:opacity-50`}
              >
                <Icon size={13} />
                {label}
              </button>
            ))}
          </div>

          {runResult && (
            <div className="rounded-md border border-border bg-background p-3">
              <p className="text-xs font-medium uppercase tracking-wider text-muted">Output</p>
              <pre className="mt-2 min-h-12 whitespace-pre-wrap font-mono text-xs">
                {runResult.output.length > 0 ? runResult.output.join("\n") : "(no output)"}
              </pre>
              {runResult.error && (
                <p className="mt-2 rounded border border-amber-500/40 bg-amber-50 px-2 py-1 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
                  {runResult.error}
                </p>
              )}
            </div>
          )}

          {scaffold && <CsScaffoldView result={scaffold} />}

          <div className="space-y-3 rounded-lg border border-border bg-background p-3">
            <div className="flex flex-wrap items-center gap-2">
              <Binary size={14} className="text-muted" />
              {(["bubble_sort", "binary_search", "linked_list"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => resetVisualizer(mode)}
                  aria-pressed={algorithmMode === mode}
                  className={`rounded-md border px-2 py-1 text-xs ${
                    algorithmMode === mode
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-border text-muted hover:bg-border/30"
                  }`}
                >
                  {ALGORITHM_LABELS[mode]}
                </button>
              ))}
            </div>

            <div className="grid gap-2 md:grid-cols-[1fr_8rem]">
              <input
                value={algorithmInput}
                onChange={(event) => {
                  setAlgorithmInput(event.target.value);
                  setStepIndex(0);
                }}
                className="rounded-md border border-border bg-card px-3 py-2 text-sm"
              />
              <input
                value={target}
                onChange={(event) => {
                  setTarget(event.target.value);
                  setStepIndex(0);
                }}
                disabled={algorithmMode !== "binary_search"}
                className="rounded-md border border-border bg-card px-3 py-2 text-sm disabled:opacity-50"
                aria-label="Binary search target"
              />
            </div>

            {activeStep && (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {activeStep.values.map((value, index) => (
                    <span
                      key={`${index}-${value}`}
                      className={`inline-flex h-10 min-w-10 items-center justify-center rounded-md border px-2 text-sm font-medium ${
                        activeStep.activeIndices.includes(index)
                          ? "border-accent bg-accent/10 text-accent"
                          : "border-border bg-card"
                      }`}
                    >
                      {value}
                    </span>
                  ))}
                </div>
                <div className="rounded-md border border-border bg-card p-3">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted">{activeStep.label}</p>
                  <p className="mt-1 text-sm">{activeStep.note}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setStepIndex((value) => Math.max(0, value - 1))}
                    className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted hover:bg-border/30"
                  >
                    <RotateCcw size={13} />
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setStepIndex((value) => Math.min(algorithmSteps.length - 1, value + 1))}
                    className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted hover:bg-border/30"
                  >
                    <StepForward size={13} />
                    Next
                  </button>
                  <p className="text-xs text-muted">
                    {Math.min(stepIndex + 1, algorithmSteps.length)} / {algorithmSteps.length}
                  </p>
                </div>
              </div>
            )}
          </div>

          {loading && <p className="text-sm text-muted">Thinking...</p>}
        </>
      )}
    </section>
  );
}

function CsScaffoldView({ result }: { result: CsScaffoldResult }) {
  return (
    <div className="space-y-3 rounded-xl border border-border bg-card/60 p-4">
      <p className="text-sm font-medium">{result.title}</p>
      <div className="grid gap-2 md:grid-cols-2">
        {result.cards.map((card) => (
          <div key={`${card.label}-${card.prompt}`} className="rounded-md border border-border bg-background p-3">
            <p className="text-xs font-medium uppercase tracking-wider text-muted">{card.label}</p>
            <p className="mt-1 text-sm">{card.prompt}</p>
            {card.studentAction && <p className="mt-2 text-xs text-muted">{card.studentAction}</p>}
          </div>
        ))}
      </div>

      {result.pseudocodeSteps.length > 0 && (
        <ol className="space-y-1 text-sm text-muted">
          {result.pseudocodeSteps.map((step, index) => (
            <li key={`${index}-${step}`}>{index + 1}. {step}</li>
          ))}
        </ol>
      )}

      {result.reviewQuestions.length > 0 && (
        <ul className="grid gap-1 text-sm text-muted md:grid-cols-2">
          {result.reviewQuestions.map((question) => (
            <li key={question}>{question}</li>
          ))}
        </ul>
      )}

      {result.debugLog.length > 0 && (
        <div className="grid gap-2 md:grid-cols-3">
          {result.debugLog.map((item) => (
            <div key={`${item.label}-${item.prompt}`} className="rounded-md border border-border bg-background p-3">
              <p className="text-xs font-medium uppercase tracking-wider text-muted">{item.label}</p>
              <p className="mt-1 text-sm">{item.prompt}</p>
            </div>
          ))}
        </div>
      )}

      {result.milestones.length > 0 && (
        <div className="grid gap-2 md:grid-cols-3">
          {result.milestones.map((milestone) => (
            <div key={`${milestone.label}-${milestone.goal}`} className="rounded-md border border-border bg-background p-3">
              <p className="text-xs font-medium uppercase tracking-wider text-muted">{milestone.label}</p>
              <p className="mt-1 text-sm">{milestone.goal}</p>
              <p className="mt-2 text-xs text-muted">{milestone.check}</p>
            </div>
          ))}
        </div>
      )}

      <p className="rounded-md border border-border bg-background px-3 py-2 text-sm">{result.checkPrompt}</p>
    </div>
  );
}

function runJavaScriptSandbox(code: string): Promise<CodeRunResult> {
  return new Promise((resolve) => {
    const workerSource = `
self.onmessage = (event) => {
  const logs = [];
  const safeConsole = {
    log: (...args) => logs.push(args.map((value) => {
      if (typeof value === "object") {
        try { return JSON.stringify(value); } catch { return String(value); }
      }
      return String(value);
    }).join(" "))
  };
  try {
    const fn = new Function("console", "fetch", "XMLHttpRequest", "WebSocket", "importScripts", "\\"use strict\\";\\n" + event.data);
    const result = fn(safeConsole, undefined, undefined, undefined, undefined);
    if (result !== undefined) logs.push(String(result));
    self.postMessage({ ok: true, output: logs, error: null });
  } catch (err) {
    self.postMessage({ ok: false, output: logs, error: err && err.message ? err.message : String(err) });
  }
};`;
    const blob = new Blob([workerSource], { type: "application/javascript" });
    const url = URL.createObjectURL(blob);
    const worker = new Worker(url);
    const timeout = window.setTimeout(() => {
      worker.terminate();
      URL.revokeObjectURL(url);
      resolve({ ok: false, output: [], error: "Stopped after 1.2 seconds. Try a smaller loop." });
    }, 1200);

    worker.onmessage = (event: MessageEvent<CodeRunResult>) => {
      window.clearTimeout(timeout);
      worker.terminate();
      URL.revokeObjectURL(url);
      resolve(event.data);
    };
    worker.postMessage(code);
  });
}
