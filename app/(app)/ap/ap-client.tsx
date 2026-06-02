"use client";

import { useMemo, useState, useTransition } from "react";
import {
  AP_SUBJECTS,
  apMilestonePlan,
  apSubjectById,
  daysUntilExam,
  fallbackApScaffold,
  scoreBand,
  type ApSubjectId,
} from "@/lib/ap/command";
import { saveApPlan, saveApPractice } from "./actions";

type PlanRow = {
  id: string;
  subject: string;
  exam_date: string;
  goal_band: string | null;
  current_focus: string | null;
};

type AttemptRow = {
  id: string;
  plan_id: string | null;
  subject: string;
  practice_type: string;
  correct_count: number | null;
  total_count: number | null;
  score_band: string | null;
  notes: string | null;
  practiced_at: string;
};

export function ApClient({
  defaultExamDate,
  plans,
  attempts,
}: {
  defaultExamDate: string;
  plans: PlanRow[];
  attempts: AttemptRow[];
}) {
  const [subject, setSubject] = useState<ApSubjectId>("us_history");
  const [examDate, setExamDate] = useState(defaultExamDate);
  const [goalBand, setGoalBand] = useState("3-4");
  const [currentFocus, setCurrentFocus] = useState("");
  const [planId, setPlanId] = useState<string | null>(plans[0]?.id ?? null);
  const [practiceType, setPracticeType] = useState<"mcq" | "frq" | "mixed">("mcq");
  const [correctCount, setCorrectCount] = useState("");
  const [totalCount, setTotalCount] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const selectedPlan = plans.find((plan) => plan.id === planId) ?? null;
  const activeSubject = (selectedPlan?.subject as ApSubjectId | undefined) ?? subject;
  const activeExamDate = selectedPlan?.exam_date ?? examDate;
  const activeMeta = apSubjectById(activeSubject);
  const localOutline = fallbackApScaffold(activeSubject, "frq_outline");
  const localMilestones = useMemo(
    () => apMilestonePlan(activeSubject, activeExamDate),
    [activeSubject, activeExamDate],
  );
  const localScore = correctCount && totalCount ? scoreBand(Number(correctCount), Number(totalCount)).message : null;

  function run(action: () => Promise<{ ok: true; message?: string } | { ok: false; error: string }>, success: string) {
    setStatus(null);
    startTransition(async () => {
      const result = await action();
      setStatus(result.ok ? result.message ?? success : result.error);
    });
  }

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">AP command center</h1>
        <p className="text-muted">Exam plans, FRQ format, MCQ explanations, and score bands.</p>
      </header>

      {status && (
        <div className="rounded-md border border-border bg-card px-3 py-2 text-sm text-muted" role="status">
          {status}
        </div>
      )}

      <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <form
          className="space-y-4 rounded-xl border border-border bg-card p-5"
          onSubmit={(event) => {
            event.preventDefault();
            run(
              () => saveApPlan({ subject, examDate, goalBand, currentFocus }),
              "AP plan saved.",
            );
          }}
        >
          <div>
            <h2 className="text-lg font-semibold">Exam plan</h2>
            <p className="text-sm text-muted">Pick the subject and exam date. Diana turns it into calm milestones.</p>
          </div>
          <label className="space-y-1 text-sm">
            <span className="font-medium">Subject</span>
            <select value={subject} onChange={(e) => setSubject(e.target.value as ApSubjectId)} className="w-full rounded-md border border-border bg-background px-3 py-2">
              {AP_SUBJECTS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="font-medium">Exam date</span>
              <input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} className="w-full rounded-md border border-border bg-background px-3 py-2" />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium">Goal band</span>
              <input value={goalBand} onChange={(e) => setGoalBand(e.target.value)} className="w-full rounded-md border border-border bg-background px-3 py-2" />
            </label>
          </div>
          <textarea value={currentFocus} onChange={(e) => setCurrentFocus(e.target.value)} rows={3} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" placeholder="Current focus, unit, or skill." />
          <button disabled={pending} className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-50">Save AP plan</button>
        </form>

        <section className="space-y-4 rounded-xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">{activeMeta.label}</h2>
              <p className="text-sm text-muted">{daysUntilExam(activeExamDate)} days to the saved exam date.</p>
            </div>
            <span className="rounded-full bg-accent/10 px-3 py-1 text-xs text-accent">{activeMeta.format.replace(/_/g, " ")}</span>
          </div>
          <ol className="space-y-2 text-sm">
            {localMilestones.map((item) => <li key={item} className="rounded-md border border-border bg-background p-3">{item}</li>)}
          </ol>
        </section>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4 rounded-xl border border-border bg-card p-5">
          <div>
            <h2 className="text-lg font-semibold">FRQ format</h2>
            <p className="text-sm text-muted">Structured outline for the selected AP subject.</p>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {localOutline.outline.map((step) => (
              <article key={step.label} className="rounded-md border border-border bg-background p-3 text-sm">
                <h3 className="font-medium">{step.label}</h3>
                <p className="mt-1 text-muted">{step.prompt}</p>
                <p className="mt-2 text-xs text-accent">{step.evidence}</p>
              </article>
            ))}
          </div>
        </div>

        <form
          className="space-y-4 rounded-xl border border-border bg-card p-5"
          onSubmit={(event) => {
            event.preventDefault();
            run(
              () => saveApPractice({
                planId,
                subject: activeSubject,
                practiceType,
                correctCount: correctCount ? Number(correctCount) : null,
                totalCount: totalCount ? Number(totalCount) : null,
                notes,
              }),
              "Practice saved.",
            );
          }}
        >
          <div>
            <h2 className="text-lg font-semibold">Practice result</h2>
            <p className="text-sm text-muted">Add MCQ counts for a score-band estimate.</p>
          </div>
          <label className="space-y-1 text-sm">
            <span className="font-medium">Plan</span>
            <select value={planId ?? ""} onChange={(e) => setPlanId(e.target.value || null)} className="w-full rounded-md border border-border bg-background px-3 py-2">
              <option value="">Use selected subject</option>
              {plans.map((plan) => <option key={plan.id} value={plan.id}>{apSubjectById(plan.subject).label} - {plan.exam_date}</option>)}
            </select>
          </label>
          <select value={practiceType} onChange={(e) => setPracticeType(e.target.value as "mcq" | "frq" | "mixed")} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
            <option value="mcq">MCQ</option>
            <option value="frq">FRQ</option>
            <option value="mixed">Mixed</option>
          </select>
          <div className="grid gap-3 sm:grid-cols-2">
            <input type="number" min={0} value={correctCount} onChange={(e) => setCorrectCount(e.target.value)} className="rounded-md border border-border bg-background px-3 py-2 text-sm" placeholder="Best-fit count" />
            <input type="number" min={1} value={totalCount} onChange={(e) => setTotalCount(e.target.value)} className="rounded-md border border-border bg-background px-3 py-2 text-sm" placeholder="Total questions" />
          </div>
          {localScore && <p className="rounded-md border border-border bg-background px-3 py-2 text-sm text-muted">{localScore}</p>}
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" placeholder="What should the next review focus on?" />
          <button disabled={pending} className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-50">Save practice</button>
        </form>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <RecentPlans plans={plans} onSelect={setPlanId} />
        <RecentAttempts attempts={attempts} />
      </section>
    </div>
  );
}

function RecentPlans({ plans, onSelect }: { plans: PlanRow[]; onSelect: (id: string) => void }) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium uppercase tracking-wider text-muted">Saved plans</h2>
      {plans.length === 0 ? (
        <p className="rounded-md border border-border bg-card p-3 text-sm text-muted">No AP plans saved yet.</p>
      ) : (
        <ul className="space-y-2">
          {plans.map((plan) => (
            <li key={plan.id} className="rounded-md border border-border bg-card p-3 text-sm">
              <button type="button" onClick={() => onSelect(plan.id)} className="text-left font-medium text-accent">
                {apSubjectById(plan.subject).label}
              </button>
              <p className="text-muted">{plan.exam_date}{plan.goal_band ? ` - goal ${plan.goal_band}` : ""}</p>
              {plan.current_focus && <p className="mt-1 text-muted">{plan.current_focus}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function RecentAttempts({ attempts }: { attempts: AttemptRow[] }) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium uppercase tracking-wider text-muted">Recent practice</h2>
      {attempts.length === 0 ? (
        <p className="rounded-md border border-border bg-card p-3 text-sm text-muted">No practice saved yet.</p>
      ) : (
        <ul className="space-y-2">
          {attempts.map((attempt) => (
            <li key={attempt.id} className="rounded-md border border-border bg-card p-3 text-sm">
              <p className="font-medium">{apSubjectById(attempt.subject).label} - {attempt.practice_type.toUpperCase()}</p>
              <p className="text-muted">
                {attempt.correct_count != null && attempt.total_count != null
                  ? `${attempt.correct_count}/${attempt.total_count}`
                  : "Practice noted"}
                {attempt.score_band ? ` - ${attempt.score_band} range` : ""}
              </p>
              {attempt.notes && <p className="mt-1 text-muted">{attempt.notes}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
