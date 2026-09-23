"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check, Loader2, Plus, Sparkles, X } from "lucide-react";
import { DianaMascotMark } from "@/components/screen-design/primitives";
import { ScreenDesignViewport } from "@/components/screen-design/screen-design-viewport";
import type { BreakdownStep } from "@/lib/task-breakdown/types";
import {
  acceptTaskBreakdown,
  requestTaskBreakdown,
  toggleStepDone,
} from "../assignments/[id]/ai-tools-actions";

type BreakDownClientProps = {
  assignmentId: string;
  title: string;
  description: string;
  kind: string;
  estimatedMinutes?: number;
  aiMode: "red" | "yellow" | "green";
  initialSteps: BreakdownStep[];
  returnTo: string;
};

export function BreakDownClient({
  assignmentId,
  title,
  description,
  kind,
  estimatedMinutes,
  aiMode,
  initialSteps,
  returnTo,
}: BreakDownClientProps) {
  const router = useRouter();
  const [steps, setSteps] = useState(initialSteps);
  const [accepted, setAccepted] = useState(initialSteps.length > 0);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function generateSteps() {
    setError(null);
    startTransition(async () => {
      const result = await requestTaskBreakdown({
        assignmentId,
        aiMode,
        title,
        description,
        kind,
        estimatedMinutes,
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setSteps(result.steps);
      setAccepted(false);
    });
  }

  function acceptSteps() {
    setError(null);
    startTransition(async () => {
      const result = await acceptTaskBreakdown({ assignmentId, steps });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setAccepted(true);
      router.push(returnTo);
    });
  }

  function toggleStep(index: number) {
    if (!accepted) return;
    const next = !steps[index].done;
    setSteps((current) =>
      current.map((step, stepIndex) =>
        stepIndex === index ? { ...step, done: next } : step,
      ),
    );
    startTransition(async () => {
      const result = await toggleStepDone({ assignmentId, stepIndex: index, done: next });
      if ("error" in result) {
        setSteps((current) =>
          current.map((step, stepIndex) =>
            stepIndex === index ? { ...step, done: !next } : step,
          ),
        );
        setError(result.error);
      }
    });
  }

  return (
    <ScreenDesignViewport className="sd-breakdown-screen">
      <header className="sd-breakdown-header">
        <div>
          <h1>TASK BREAKDOWN</h1>
          <p>ACTION STEPS</p>
        </div>
        <Link href={returnTo} aria-label="Close task breakdown" className="sd-source-icon-button">
          <X size={20} aria-hidden="true" />
        </Link>
      </header>

      <main className="sd-breakdown-scroll">
        <section className="sd-breakdown-coach">
          <span className="sd-breakdown-mascot">
            <DianaMascotMark decorative />
          </span>
          <div className="sd-breakdown-bubble">
            <strong>COACH DIANA</strong>
            <p>
              {steps.length > 0
                ? `Here are ${steps.length} manageable moves for ${title}. Take one at a time.`
                : `I can turn ${title} into a short set of manageable moves.`}
            </p>
          </div>
        </section>

        {steps.length > 0 ? (
          <ol className="sd-breakdown-list" aria-label="Assignment action steps">
            {steps.map((step, index) => (
              <li key={`${step.step}-${step.action}`}>
                <button
                  type="button"
                  className="sd-breakdown-step"
                  data-checked={step.done}
                  onClick={() => toggleStep(index)}
                  disabled={pending || !accepted}
                  aria-label={`${step.done ? "Unmark" : "Mark"} step ${index + 1}: ${step.action}`}
                >
                  <span className="sd-breakdown-check" aria-hidden="true">
                    {step.done ? <Check size={18} strokeWidth={3} /> : null}
                  </span>
                  <span>
                    <strong>STEP {String(index + 1).padStart(2, "0")}</strong>
                    <small>{step.action}</small>
                  </span>
                  <em>{step.minutes}M</em>
                </button>
              </li>
            ))}
          </ol>
        ) : (
          <section className="sd-breakdown-empty">
            <Sparkles size={28} aria-hidden="true" />
            <h2>Ready when you are.</h2>
            <p>
              {aiMode === "green"
                ? "Diana will use the assignment prompt to make the first moves visible."
                : "AI steps are not available for this assignment. Your assignment is still ready to work on."}
            </p>
          </section>
        )}

        {error ? <p className="sd-source-calm-error" role="status">{error}</p> : null}
      </main>

      <Link href="/quick-add" className="sd-source-fab" aria-label="Add a quick task">
        <Plus size={30} aria-hidden="true" />
      </Link>

      <footer className="sd-breakdown-footer">
        {steps.length > 0 ? (
          <button
            type="button"
            className="sd-breakdown-primary"
            onClick={acceptSteps}
            disabled={pending}
            aria-label="Accept task breakdown"
          >
            {pending ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : null}
            {pending ? "SAVING STEPS" : "BEGIN STEPS"}
          </button>
        ) : (
          <button
            type="button"
            className="sd-breakdown-primary"
            onClick={generateSteps}
            disabled={pending || aiMode !== "green"}
            aria-label="Generate task breakdown"
          >
            {pending ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <Sparkles size={18} aria-hidden="true" />}
            {pending ? "BUILDING STEPS" : "BUILD MY STEPS"}
          </button>
        )}
      </footer>
    </ScreenDesignViewport>
  );
}
