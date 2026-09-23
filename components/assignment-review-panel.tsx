"use client";

import { Lightbulb, Send } from "lucide-react";
import { useState, useTransition } from "react";

import { requestAssignmentReview } from "@/app/(app)/assignments/[id]/ai-tools-actions";
import type { AssignmentReviewField, AssignmentReviewResult, AssignmentReviewTemplate } from "@/lib/assignment-review";

type Props = {
  assignmentId: string;
  template: AssignmentReviewTemplate;
  fields: AssignmentReviewField[];
  aiMode: "red" | "yellow" | "green";
};

const actions: Record<AssignmentReviewTemplate, { label: string; focus: string }[]> = {
  writing: [
    { label: "Check thesis", focus: "Check the thesis against the assignment prompt." },
    { label: "Review plan", focus: "Review the paragraph plan for a clear order and evidence." },
    { label: "Check draft", focus: "Review the current draft for a focused next improvement." },
  ],
  math: [{ label: "Review this problem", focus: "Review the current answer and work. Give one next step, not the final answer." }],
  worksheet: [{ label: "Check response", focus: "Check the question, reasoning, and response connection." }],
  research: [{ label: "Review evidence", focus: "Check whether the source notes support the research claim." }],
  history: [{ label: "Check DBQ", focus: "Check source analysis, evidence, and historical claim." }],
  lab: [
    { label: "Review hypothesis", focus: "Review the hypothesis and whether it is testable." },
    { label: "Check analysis", focus: "Review the data, analysis, and conclusion connection." },
  ],
  reading: [{ label: "Check response", focus: "Review the notes, evidence, and response connection." }],
  language: [{ label: "Review attempt", focus: "Review the student attempt and name one way to improve it." }],
  coding: [{ label: "Review plan", focus: "Review the task, plan, and test notes without writing the finished solution." }],
  art: [{ label: "Review concept", focus: "Review the brief, concept, process notes, and artist statement connection." }],
  project: [{ label: "Review plan", focus: "Review the project goal, deliverables, and build plan." }],
  handoff: [{ label: "Check response", focus: "Review the response or hand-in notes for what needs to happen next." }],
};

export function AssignmentReviewPanel({ assignmentId, template, fields, aiMode }: Props) {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<AssignmentReviewResult | null>(null);
  const [sourceAnchors, setSourceAnchors] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const hasWork = fields.some((field) => field.value.trim().length > 0);

  function review(focus: string) {
    if (aiMode !== "green") {
      setMessage("Diana review is not available for this class.");
      return;
    }
    if (!hasWork) {
      setMessage("Add a little of your own work first, then Diana can review it.");
      return;
    }
    setMessage("Diana is reviewing your current work...");
    startTransition(async () => {
      const response = await requestAssignmentReview({ assignmentId, template, focus, question, fields });
      if (!response.ok) {
        setMessage(response.error);
        return;
      }
      setResult(response.result);
      setSourceAnchors(response.sourceAnchors);
      setQuestion("");
      setMessage("Review ready");
    });
  }

  return (
    <aside className="sd-assignment-review-panel" aria-live="polite">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="m-0 font-display text-base font-extrabold uppercase">Ask Diana</p>
          <p className="mb-0 mt-1 text-sm">Diana reviews the work on this page. You do not need to paste it into chat.</p>
        </div>
        <Lightbulb className="text-cyan-700" size={22} aria-hidden="true" />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {actions[template].map((action) => (
          <button key={action.label} type="button" disabled={pending} onClick={() => review(action.focus)} className="min-h-10 border border-slate-950 bg-white px-3 font-display text-sm font-extrabold uppercase text-slate-950 disabled:opacity-50">
            {action.label}
          </button>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <input value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") review(question.trim() || "Answer the student's question using their current work."); }} placeholder="Ask a question about this work" className="min-h-10 min-w-0 flex-1 border border-slate-400 px-3 text-sm" />
        <button type="button" disabled={pending} onClick={() => review(question.trim() || "Answer the student's question using their current work.")} className="inline-flex min-h-10 items-center gap-2 border border-slate-950 bg-slate-950 px-3 font-display text-sm font-extrabold uppercase text-white disabled:opacity-50">
          <Send size={15} aria-hidden="true" /> Ask
        </button>
      </div>
      {message ? <p className="mb-0 mt-3 text-sm font-semibold">{pending ? "Reviewing..." : message}</p> : null}
      {result ? (
        <div className="mt-4 grid gap-3 border-t border-slate-300 pt-4 text-sm leading-6 md:grid-cols-3">
          <div><strong className="block font-display uppercase">What is working</strong><p className="mb-0 mt-1">{result.strength}</p></div>
          <div><strong className="block font-display uppercase">One improvement</strong><p className="mb-0 mt-1">{result.improvement}</p></div>
          <div><strong className="block font-display uppercase">Next move</strong><p className="mb-0 mt-1">{result.nextMove}</p><p className="mb-0 mt-2 font-semibold">{result.question}</p><p className="mb-0 mt-2 text-xs text-slate-600">Evidence used: {result.evidenceAnchor}</p></div>
        </div>
      ) : null}
      {sourceAnchors.length > 0 ? <p className="mb-0 mt-3 text-xs font-semibold text-slate-600">Sources checked: {sourceAnchors.join("; ")}</p> : null}
    </aside>
  );
}