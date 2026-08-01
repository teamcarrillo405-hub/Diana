"use client";

import { Check, Loader2, Plus, Sparkles } from "lucide-react";
import { useState, useTransition } from "react";

import {
  acceptTaskBreakdown,
  requestTaskBreakdown,
  toggleStepDone,
} from "@/app/(app)/assignments/[id]/ai-tools-actions";
import type { BreakdownStep } from "@/lib/task-breakdown/types";

type AssignmentPlanPanelProps = {
  assignmentId: string;
  title: string;
  description: string;
  kind: string;
  estimatedMinutes: number | null;
  aiMode: "red" | "yellow" | "green";
  initialSteps: BreakdownStep[];
  initiallyOpen?: boolean;
  onStepsChange(steps: BreakdownStep[]): void;
};

export function AssignmentPlanPanel({
  assignmentId,
  title,
  description,
  kind,
  estimatedMinutes,
  aiMode,
  initialSteps,
  initiallyOpen = false,
  onStepsChange,
}: AssignmentPlanPanelProps) {
  const [open, setOpen] = useState(initiallyOpen);
  const [steps, setSteps] = useState(initialSteps);
  const [draftStep, setDraftStep] = useState("");
  const [accepted, setAccepted] = useState(initialSteps.length > 0);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  function updateSteps(next: BreakdownStep[]) {
    setSteps(next);
    onStepsChange(next);
  }

  function addStep() {
    const action = draftStep.trim();
    if (!action) return;
    const next = [...steps, { step: steps.length + 1, action, minutes: 10, done: false }];
    setDraftStep("");
    setAccepted(false);
    updateSteps(next);
  }

  function suggestSteps() {
    setMessage("");
    startTransition(async () => {
      const result = await requestTaskBreakdown({ assignmentId, aiMode, title, description, kind, estimatedMinutes: estimatedMinutes ?? undefined });
      if ("error" in result) return setMessage(result.error);
      setAccepted(false);
      updateSteps(result.steps);
    });
  }

  function savePlan() {
    if (!steps.length) return;
    setMessage("");
    startTransition(async () => {
      const result = await acceptTaskBreakdown({ assignmentId, steps });
      if ("error" in result) return setMessage(result.error);
      setAccepted(true);
      setMessage("Steps saved");
    });
  }

  function markStep(index: number) {
    if (!accepted) return;
    const done = !steps[index].done;
    const next = steps.map((step, stepIndex) => stepIndex === index ? { ...step, done } : step);
    updateSteps(next);
    startTransition(async () => {
      const result = await toggleStepDone({ assignmentId, stepIndex: index, done });
      if ("error" in result) {
        updateSteps(steps);
        setMessage(result.error);
      }
    });
  }

  return (
    <section className="sd-assignment-plan-panel" aria-label="Optional assignment steps">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="m-0 font-display text-sm font-extrabold uppercase">Break it into steps</p>
          <p className="mb-0 mt-1 text-sm">Optional. Work directly or make a short plan first.</p>
        </div>
        <button type="button" onClick={() => setOpen((value) => !value)} className="min-h-10 border border-slate-950 bg-slate-950 px-4 font-display text-sm font-extrabold uppercase text-white">
          {open ? "Hide steps" : steps.length ? "View steps" : "Plan assignment"}
        </button>
      </div>
      {open ? <div className="mt-4 border-t border-slate-300 pt-4">
        {steps.length ? <ol className="grid gap-2 pl-5">
          {steps.map((step, index) => <li key={`${step.step}-${step.action}`} className="flex items-center gap-3 text-sm">
            <button type="button" onClick={() => markStep(index)} disabled={pending || !accepted} aria-label={`${step.done ? "Unmark" : "Mark"} ${step.action}`} className="grid size-7 shrink-0 place-items-center border border-slate-950 bg-white disabled:opacity-40">
              {step.done ? <Check size={16} strokeWidth={3} /> : null}
            </button>
            <span className={step.done ? "line-through opacity-60" : ""}>{step.action}</span>
            <span className="ml-auto text-xs font-bold uppercase text-slate-600">{step.minutes} min</span>
          </li>)}
        </ol> : <p className="m-0 text-sm">Add your own first move, or use a suggested plan when AI is available for this class.</p>}
        {!accepted ? <div className="mt-4 flex flex-wrap gap-2">
          <input value={draftStep} onChange={(event) => setDraftStep(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addStep(); } }} placeholder="Add a first move" className="min-h-10 flex-1 border border-slate-400 px-3 text-sm" />
          <button type="button" onClick={addStep} disabled={!draftStep.trim()} className="inline-flex min-h-10 items-center gap-2 border border-slate-950 bg-white px-3 font-display text-sm font-extrabold uppercase disabled:opacity-40"><Plus size={16} /> Add</button>
          {aiMode === "green" ? <button type="button" onClick={suggestSteps} disabled={pending} className="inline-flex min-h-10 items-center gap-2 border border-cyan-700 bg-cyan-300 px-3 font-display text-sm font-extrabold uppercase text-slate-950 disabled:opacity-40">{pending ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />} Suggest steps</button> : null}
          {steps.length ? <button type="button" onClick={savePlan} disabled={pending} className="min-h-10 border border-slate-950 bg-slate-950 px-3 font-display text-sm font-extrabold uppercase text-white disabled:opacity-40">Save plan</button> : null}
        </div> : null}
        {message ? <p role="status" className="mb-0 mt-3 text-sm">{message}</p> : null}
      </div> : null}
    </section>
  );
}
