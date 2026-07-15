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
  const daysToExam = daysUntilExam(activeExamDate);
  const formatLabel = activeMeta.format.replace(/_/g, " ");
  const localScore = correctCount && totalCount ? scoreBand(Number(correctCount), Number(totalCount)).message : null;

  function run(action: () => Promise<{ ok: true; message?: string } | { ok: false; error: string }>, success: string) {
    setStatus(null);
    startTransition(async () => {
      const result = await action();
      setStatus(result.ok ? result.message ?? success : result.error);
    });
  }

  return (
    <div className="ap-command-page">
      <header className="ap-command-hero diana-panel diana-panel-hero">
        <div className="ap-command-hero-copy">
          <p className="diana-kicker">AP command</p>
          <h1>One exam. One next review.</h1>
          <p>Keep the page light: save the target, read the next milestones, log one practice result.</p>
        </div>
        <div className="ap-hero-metrics" aria-label="Current AP plan status">
          <div>
            <span>Exam clock</span>
            <strong>{daysToExam}</strong>
            <small>days</small>
          </div>
          <div>
            <span>Subject</span>
            <strong>{activeMeta.label}</strong>
            <small>{formatLabel}</small>
          </div>
          <div>
            <span>Goal</span>
            <strong>{selectedPlan?.goal_band ?? goalBand}</strong>
            <small>{plans.length} saved plans</small>
          </div>
        </div>
      </header>

      {status && (
        <div className="ap-status" role="status">
          {status}
        </div>
      )}

      <section className="ap-command-grid">
        <form
          className="ap-panel ap-plan-console"
          onSubmit={(event) => {
            event.preventDefault();
            run(
              () => saveApPlan({ subject, examDate, goalBand, currentFocus }),
              "AP plan saved.",
            );
          }}
        >
          <div className="ap-panel-head">
            <div>
              <p>01 Input</p>
              <h2>Set the target.</h2>
              <span>Subject, date, and band only.</span>
            </div>
          </div>
          <label className="ap-field">
            <span>Subject</span>
            <select value={subject} onChange={(e) => setSubject(e.target.value as ApSubjectId)}>
              {AP_SUBJECTS.map((item) => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
          </label>
          <div className="ap-field-grid">
            <label className="ap-field">
              <span>Exam date</span>
              <input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
            </label>
            <label className="ap-field">
              <span>Goal band</span>
              <input value={goalBand} onChange={(e) => setGoalBand(e.target.value)} />
            </label>
          </div>
          <label className="ap-field">
            <span>Current focus</span>
            <textarea value={currentFocus} onChange={(e) => setCurrentFocus(e.target.value)} rows={3} placeholder="Unit, skill, or format." />
          </label>
          <button disabled={pending} className="diana-button diana-button-primary">Save AP plan</button>
        </form>

        <section className="ap-panel ap-milestone-console">
          <div className="ap-panel-head">
            <div>
              <p>02 Output</p>
              <h2>{activeMeta.label}</h2>
              <span>{daysToExam} days to the saved exam date.</span>
            </div>
            <small>{formatLabel}</small>
          </div>
          <ol className="ap-milestone-list">
            {localMilestones.map((item, index) => (
              <li key={item}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <p>{item}</p>
              </li>
            ))}
          </ol>
        </section>
      </section>

      <section className="ap-secondary-grid">
        <div className="ap-panel ap-frq-panel">
          <div className="ap-panel-head">
            <div>
              <p>03 Format</p>
              <h2>FRQ shape.</h2>
              <span>Use this as the short outline before writing.</span>
            </div>
          </div>
          <div className="ap-frq-grid">
            {localOutline.outline.map((step) => (
              <article key={step.label}>
                <h3>{step.label}</h3>
                <p>{step.prompt}</p>
                <small>{step.evidence}</small>
              </article>
            ))}
          </div>
        </div>

        <form
          className="ap-panel ap-practice-console"
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
          <div className="ap-panel-head">
            <div>
              <p>04 Practice</p>
              <h2>Log one result.</h2>
              <span>Counts, format, and the next review focus.</span>
            </div>
          </div>
          <label className="ap-field">
            <span>Plan</span>
            <select value={planId ?? ""} onChange={(e) => setPlanId(e.target.value || null)}>
              <option value="">Use selected subject</option>
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>{apSubjectById(plan.subject).label} - {plan.exam_date}</option>
              ))}
            </select>
          </label>
          <label className="ap-field">
            <span>Practice type</span>
            <select value={practiceType} onChange={(e) => setPracticeType(e.target.value as "mcq" | "frq" | "mixed")}>
              <option value="mcq">MCQ</option>
              <option value="frq">FRQ</option>
              <option value="mixed">Mixed</option>
            </select>
          </label>
          <div className="ap-field-grid">
            <label className="ap-field">
              <span>Best-fit count</span>
              <input type="number" min={0} value={correctCount} onChange={(e) => setCorrectCount(e.target.value)} />
            </label>
            <label className="ap-field">
              <span>Total questions</span>
              <input type="number" min={1} value={totalCount} onChange={(e) => setTotalCount(e.target.value)} />
            </label>
          </div>
          {localScore && <p className="ap-score-note">{localScore}</p>}
          <label className="ap-field">
            <span>Next review focus</span>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </label>
          <button disabled={pending} className="diana-button diana-button-primary">Save practice</button>
        </form>
      </section>

      <section className="ap-history-grid">
        <RecentPlans plans={plans} onSelect={setPlanId} />
        <RecentAttempts attempts={attempts} />
      </section>
    </div>
  );
}

function RecentPlans({ plans, onSelect }: { plans: PlanRow[]; onSelect: (id: string) => void }) {
  return (
    <section className="ap-history-panel">
      <h2>Saved plans</h2>
      {plans.length === 0 ? (
        <p className="ap-empty-row">No AP plans saved yet.</p>
      ) : (
        <ul className="ap-history-list">
          {plans.map((plan) => (
            <li key={plan.id}>
              <button type="button" onClick={() => onSelect(plan.id)}>
                {apSubjectById(plan.subject).label}
              </button>
              <p>{plan.exam_date}{plan.goal_band ? ` - goal ${plan.goal_band}` : ""}</p>
              {plan.current_focus && <small>{plan.current_focus}</small>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function RecentAttempts({ attempts }: { attempts: AttemptRow[] }) {
  return (
    <section className="ap-history-panel">
      <h2>Recent practice</h2>
      {attempts.length === 0 ? (
        <p className="ap-empty-row">No practice saved yet.</p>
      ) : (
        <ul className="ap-history-list">
          {attempts.map((attempt) => (
            <li key={attempt.id}>
              <strong>{apSubjectById(attempt.subject).label} - {attempt.practice_type.toUpperCase()}</strong>
              <p>
                {attempt.correct_count != null && attempt.total_count != null
                  ? `${attempt.correct_count}/${attempt.total_count}`
                  : "Practice noted"}
                {attempt.score_band ? ` - ${attempt.score_band} range` : ""}
              </p>
              {attempt.notes && <small>{attempt.notes}</small>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
