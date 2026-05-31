"use client";
import { useState } from "react";
import { Sparkles } from "lucide-react";
import { requestTaskBreakdown, toggleStepDone } from "./ai-tools-actions";
import type { BreakdownStep } from "@/lib/task-breakdown/parse";

interface TaskBreakdownProps {
  assignmentId: string;
  classAiMode: "red" | "yellow" | "green";
  assignmentTitle: string;
  assignmentDescription: string | null;
  assignmentKind: string;
  estimatedMinutes: number | null;
  initialSteps: BreakdownStep[];
}

export function TaskBreakdown({
  assignmentId,
  classAiMode,
  assignmentTitle,
  assignmentDescription,
  assignmentKind,
  estimatedMinutes,
  initialSteps,
}: TaskBreakdownProps) {
  const [steps, setSteps] = useState<BreakdownStep[]>(initialSteps);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Hidden when AI is fully off for this class
  if (classAiMode === "red") return null;

  async function generate() {
    setLoading(true);
    setErrorMsg(null);
    const res = await requestTaskBreakdown({
      assignmentId,
      aiMode: classAiMode,
      title: assignmentTitle,
      description: assignmentDescription ?? undefined,
      kind: assignmentKind,
      estimatedMinutes: estimatedMinutes ?? undefined,
    });
    if ("error" in res) {
      setErrorMsg(res.error);
    } else {
      setSteps(res.steps);
    }
    setLoading(false);
  }

  async function handleToggle(index: number) {
    const current = steps[index];
    if (!current) return;
    // Optimistic local update first (Pitfall 5 pattern — stays calm even if server write fails)
    const updated = steps.map((s, i) =>
      i === index ? { ...s, done: !s.done } : s,
    );
    setSteps(updated);
    // Fire-and-forget server update
    void toggleStepDone({
      assignmentId,
      stepIndex: index,
      done: !current.done,
    });
  }

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-muted">
          Break it down
        </p>
      </div>

      {errorMsg && (
        <p className="rounded border border-amber-500/40 bg-amber-50 px-2 py-1.5 text-xs text-amber-900">
          {errorMsg}
        </p>
      )}

      {steps.length === 0 ? (
        <button
          type="button"
          onClick={generate}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-card disabled:opacity-50"
        >
          <Sparkles size={14} />
          {loading ? "Breaking it down..." : "Break this down"}
        </button>
      ) : (
        <>
          <ol className="space-y-2">
            {steps.map((step, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id={`step-${assignmentId}-${i}`}
                  checked={step.done}
                  onChange={() => handleToggle(i)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-border accent-accent"
                  aria-label={`Mark step ${step.step} as complete`}
                />
                <label
                  htmlFor={`step-${assignmentId}-${i}`}
                  className={`flex-1 cursor-pointer text-sm leading-snug ${step.done ? "line-through text-muted" : ""}`}
                >
                  <span className="font-medium">{step.step}.</span>{" "}
                  {step.action}
                  <span className="ml-1.5 text-xs text-muted">~{step.minutes} min</span>
                </label>
              </li>
            ))}
          </ol>
          <button
            type="button"
            onClick={generate}
            disabled={loading}
            className="text-xs text-muted hover:text-foreground disabled:opacity-50"
          >
            {loading ? "Breaking it down..." : "Regenerate"}
          </button>
        </>
      )}
    </section>
  );
}
