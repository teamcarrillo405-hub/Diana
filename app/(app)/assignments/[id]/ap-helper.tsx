"use client";

import { useState, useTransition } from "react";
import { GraduationCap } from "lucide-react";
import { SubjectToolShell } from "@/components/subject-tool-shell";
import { requestApScaffold } from "./ai-tools-actions";
import {
  AP_SUBJECTS,
  fallbackApScaffold,
  type ApScaffoldMode,
  type ApScaffoldResult,
  type ApSubjectId,
} from "@/lib/ap/command";
import type { StudyHelperShellContext } from "@/lib/study-helper/modes";

const MODES: Array<{ value: ApScaffoldMode; label: string }> = [
  { value: "frq_outline", label: "FRQ outline" },
  { value: "mcq_practice", label: "MCQ practice" },
  { value: "study_plan", label: "Study plan" },
];

export function ApHelper({
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
  const [subject, setSubject] = useState<ApSubjectId>("us_history");
  const [mode, setMode] = useState<ApScaffoldMode>("frq_outline");
  const [prompt, setPrompt] = useState(initialPrompt);
  const [result, setResult] = useState<ApScaffoldResult>(fallbackApScaffold("us_history", "frq_outline"));
  const [status, setStatus] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function refreshLocal(nextSubject = subject, nextMode = mode) {
    setResult(fallbackApScaffold(nextSubject, nextMode));
  }

  function run() {
    setStatus(null);
    startTransition(async () => {
      const res = await requestApScaffold({
        assignmentId,
        aiMode: classAiMode,
        subject,
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
    <SubjectToolShell
      theme="ap"
      eyebrow="AP practice"
      title="Exam practice plan"
      subtitle="Match the prompt to FRQ, MCQ, or a study plan before adding practice."
      icon={GraduationCap}
      studyContext={studyContext}
    >
      <div className="grid gap-3 md:grid-cols-[1.2fr_0.8fr]">
        <label className="space-y-1 text-sm">
          <span className="font-medium">Subject</span>
          <select
            value={subject}
            onChange={(event) => {
              const next = event.target.value as ApSubjectId;
              setSubject(next);
              refreshLocal(next, mode);
            }}
            className="w-full rounded-md border border-border bg-background px-3 py-2"
          >
            {AP_SUBJECTS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </label>
        <div className="space-y-1 text-sm">
          <span className="font-medium">Mode</span>
          <div className="grid grid-cols-3 gap-2">
            {MODES.map((item) => {
              const active = item.value === mode;
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => {
                    setMode(item.value);
                    refreshLocal(subject, item.value);
                  }}
                  aria-pressed={active}
                  className={`touch-target rounded-xl border px-2 py-2 text-xs font-medium ${
                    active
                      ? "border-subject-ap bg-subject-ap/10 text-indigo-700 dark:text-indigo-300"
                      : "border-border bg-surface-raised text-muted hover:bg-surface-soft"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <textarea
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
        rows={5}
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        placeholder="Paste the AP prompt, passage summary, practice topic, or unit focus."
      />

      <button
        type="button"
        onClick={run}
        disabled={pending || classAiMode !== "green" || prompt.trim().length < 2}
        className="touch-target rounded-xl bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-strong disabled:opacity-50"
      >
        Build AP scaffold
      </button>
      {classAiMode !== "green" && <p className="text-sm text-muted">AI help is off for this class.</p>}
      {status && <p className="text-sm text-muted">{status}</p>}

      <div className="space-y-3 rounded-xl border border-subject-ap/25 bg-surface-raised p-3">
        <h3 className="text-sm font-medium">{result.title}</h3>
        {result.outline.length > 0 && (
          <div className="grid gap-2 md:grid-cols-2">
            {result.outline.map((step) => (
              <article key={step.label} className="rounded-md border border-border bg-background p-3 text-sm">
                <p className="font-medium">{step.label}</p>
                <p className="mt-1 text-muted">{step.prompt}</p>
                <p className="mt-2 text-xs text-accent">{step.evidence}</p>
              </article>
            ))}
          </div>
        )}
        {result.questions.map((question) => (
          <article key={question.stem} className="rounded-md border border-border bg-background p-3 text-sm">
            <p className="font-medium">{question.stem}</p>
            <p className="mt-1 text-xs text-muted">Skill: {question.skill} | Best fit: {question.bestChoice}</p>
            <ul className="mt-2 space-y-1">
              {question.choices.map((choice) => (
                <li key={choice.label}>
                  <span className="font-medium">{choice.label}.</span> {choice.text}
                  <span className="block text-muted">{choice.explanation}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
        {result.plan.length > 0 && (
          <ol className="space-y-1 text-sm text-muted">
            {result.plan.map((item) => <li key={item}>- {item}</li>)}
          </ol>
        )}
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted">Checklist</p>
          <ul className="mt-2 space-y-1 text-sm">
            {result.checklist.map((item) => <li key={item}>- {item}</li>)}
          </ul>
        </div>
      </div>
    </SubjectToolShell>
  );
}
