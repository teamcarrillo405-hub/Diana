"use client";

import {
  BookOpenCheck,
  CalendarDays,
  ClipboardCheck,
  Plus,
  Settings,
  Target,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";

import { DianaWordmark } from "@/components/screen-design/primitives";
import { ScreenDesignViewport } from "@/components/screen-design/screen-design-viewport";
import { StudentBottomNav } from "@/components/screen-design/student-bottom-nav";
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

const AP_STYLES = `
  .sd-ap-command {
    --ap-navy: #0f172a;
    --ap-pink: #ff79da;
    --ap-blue: #2dd4bf;
    display: flex;
    height: max(100dvh, 852px);
    max-height: max(100dvh, 852px);
    flex-direction: column;
    overflow: hidden;
    background: var(--ap-navy);
    color: #fff;
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  }
  .sd-ap-command * { box-sizing: border-box; }
  .sd-ap-command h1, .sd-ap-command h2, .sd-ap-command h3, .sd-ap-command p { font-family: inherit; }
  .sd-ap-orb {
    position: absolute;
    top: -128px;
    right: -128px;
    width: 256px;
    height: 256px;
    border-radius: 999px;
    background: rgb(45 212 191 / .11);
    filter: blur(70px);
    pointer-events: none;
  }
  .sd-ap-header {
    position: relative;
    z-index: 20;
    flex: none;
    padding: 54px 24px 16px;
    border-bottom: 1px solid rgb(255 255 255 / .05);
    background: rgb(15 23 42 / .84);
    backdrop-filter: blur(12px);
  }
  .sd-ap-header-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
  .sd-ap-wordmark { width: auto; height: 22px; margin-bottom: 8px; opacity: .92; }
  .sd-ap-title { margin: 0; font-size: 28px; font-style: italic; font-weight: 950; letter-spacing: -.05em; line-height: .9; text-transform: uppercase; }
  .sd-ap-title span { display: block; color: var(--ap-pink); }
  .sd-ap-settings { display: grid; width: 40px; height: 40px; place-items: center; border: 1px solid rgb(255 255 255 / .1); border-radius: 999px; background: rgb(255 255 255 / .05); color: #fff; text-decoration: none; }
  .sd-ap-eyebrow { margin: 10px 0 0; color: var(--ap-blue); font-size: 9px; font-weight: 900; letter-spacing: .2em; text-transform: uppercase; }
  .sd-ap-scroll { position: relative; z-index: 10; min-height: 0; flex: 1; overflow-y: auto; padding: 18px 24px 132px; scrollbar-width: none; }
  .sd-ap-scroll::-webkit-scrollbar { display: none; }
  .sd-ap-section { display: grid; gap: 12px; margin-bottom: 24px; }
  .sd-ap-section-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; }
  .sd-ap-section-head h2 { margin: 0; color: #94a3b8; font-size: 10px; font-style: italic; font-weight: 900; letter-spacing: .16em; text-transform: uppercase; }
  .sd-ap-section-head strong { color: var(--ap-pink); font-size: 21px; font-style: italic; font-weight: 950; }
  .sd-ap-progress { height: 14px; padding: 4px; overflow: hidden; border: 1px solid rgb(255 255 255 / .1); border-radius: 999px; background: rgb(255 255 255 / .05); }
  .sd-ap-progress span { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, var(--ap-blue), var(--ap-pink)); box-shadow: 0 0 10px rgb(45 212 191 / .35); }
  .sd-ap-progress-labels { display: flex; justify-content: space-between; color: #64748b; font-size: 8px; font-weight: 900; letter-spacing: .12em; text-transform: uppercase; }
  .sd-ap-card { border: 1px solid rgb(255 255 255 / .1); border-radius: 24px; background: rgb(255 255 255 / .05); padding: 18px; backdrop-filter: blur(8px); }
  .sd-ap-card-title { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
  .sd-ap-card-title h2 { margin: 0; color: var(--ap-blue); font-size: 10px; font-style: italic; font-weight: 950; letter-spacing: .16em; text-transform: uppercase; }
  .sd-ap-card-title svg { color: var(--ap-blue); }
  .sd-ap-plan-copy { display: grid; gap: 5px; }
  .sd-ap-plan-copy strong { font-size: 17px; font-style: italic; font-weight: 950; text-transform: uppercase; }
  .sd-ap-plan-copy span, .sd-ap-plan-copy small { color: #94a3b8; font-size: 10px; font-weight: 700; line-height: 1.35; }
  .sd-ap-plan-copy small { color: #64748b; text-transform: uppercase; }
  .sd-ap-action { display: flex; width: 100%; min-height: 44px; align-items: center; justify-content: center; gap: 8px; margin-top: 14px; border: 0; border-radius: 14px; background: #fff; color: var(--ap-navy); font-size: 10px; font-style: italic; font-weight: 950; letter-spacing: .1em; text-decoration: none; text-transform: uppercase; }
  .sd-ap-empty { margin: 0; color: #94a3b8; font-size: 11px; font-weight: 650; line-height: 1.5; }
  .sd-ap-attempt-list { display: grid; gap: 9px; }
  .sd-ap-attempt { display: grid; grid-template-columns: 34px 1fr auto; gap: 10px; align-items: center; border-top: 1px solid rgb(255 255 255 / .07); padding-top: 10px; }
  .sd-ap-attempt:first-child { border-top: 0; padding-top: 0; }
  .sd-ap-attempt-icon { display: grid; width: 34px; height: 34px; place-items: center; border-radius: 10px; background: rgb(45 212 191 / .12); color: var(--ap-blue); }
  .sd-ap-attempt strong, .sd-ap-attempt small { display: block; }
  .sd-ap-attempt strong { font-size: 10px; font-weight: 900; text-transform: uppercase; }
  .sd-ap-attempt small { margin-top: 3px; color: #64748b; font-size: 8px; font-weight: 800; text-transform: uppercase; }
  .sd-ap-attempt em { color: var(--ap-pink); font-size: 11px; font-style: italic; font-weight: 950; }
  .sd-ap-workbench { scroll-margin-top: 16px; }
  .sd-ap-workbench summary { cursor: pointer; color: var(--ap-blue); font-size: 10px; font-weight: 900; letter-spacing: .12em; text-transform: uppercase; }
  .sd-ap-form { display: grid; gap: 11px; margin-top: 16px; }
  .sd-ap-form + .sd-ap-form { margin-top: 22px; padding-top: 18px; border-top: 1px solid rgb(255 255 255 / .08); }
  .sd-ap-form h3 { margin: 0; font-size: 14px; font-style: italic; font-weight: 950; text-transform: uppercase; }
  .sd-ap-field { display: grid; gap: 5px; color: #94a3b8; font-size: 8px; font-weight: 900; letter-spacing: .1em; text-transform: uppercase; }
  .sd-ap-field input, .sd-ap-field select, .sd-ap-field textarea { width: 100%; border: 1px solid rgb(255 255 255 / .12); border-radius: 10px; background: rgb(15 23 42 / .82); padding: 9px 10px; color: #fff; font: inherit; font-size: 11px; letter-spacing: 0; text-transform: none; }
  .sd-ap-field textarea { resize: vertical; }
  .sd-ap-two { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; }
  .sd-ap-submit { min-height: 42px; border: 0; border-radius: 12px; background: linear-gradient(135deg, var(--ap-blue), var(--ap-pink)); color: var(--ap-navy); font-size: 10px; font-weight: 950; text-transform: uppercase; }
  .sd-ap-submit:disabled { opacity: .55; }
  .sd-ap-status { margin: 0; border-left: 3px solid var(--ap-blue); padding: 8px 10px; background: rgb(45 212 191 / .08); color: #cbd5e1; font-size: 10px; line-height: 1.4; }
  .sd-ap-milestones { display: grid; gap: 8px; margin: 14px 0 0; padding: 0; list-style: none; }
  .sd-ap-milestones li { display: grid; grid-template-columns: 22px 1fr; gap: 8px; color: #94a3b8; font-size: 9px; line-height: 1.35; }
  .sd-ap-milestones span { color: var(--ap-blue); font-weight: 900; }
  .sd-ap-capture { position: absolute; z-index: 50; right: 24px; bottom: 110px; display: grid; width: 62px; height: 62px; place-items: center; border-radius: 16px; background: linear-gradient(135deg, var(--ap-blue), var(--ap-pink)); box-shadow: 0 10px 30px rgb(45 212 191 / .28); color: var(--ap-navy); }
  .sd-ap-command > .sd-student-bottom-nav { position: relative; z-index: 60; min-height: 94px; flex: none; }
  .diana-app-shell:has(.sd-ap-command) .agent-fab-anchor, .app-command-frame:has(.sd-ap-command) .diana-mobile-command { display: none !important; }
  .app-command-frame:has(.sd-ap-command) { padding: 0 !important; }
  .diana-app:has(.sd-ap-command) nextjs-portal { display: none !important; }
  .diana-app:has(.sd-ap-command) .skip-link { transition: none; }
  .diana-app:has(.sd-ap-command) .skip-link:focus { transform: translateY(0) !important; }
  @media (prefers-reduced-motion: reduce) { .sd-ap-settings, .sd-ap-action, .sd-ap-capture { transition: none; } }
`;

export function ApClient({
  defaultExamDate,
  nowIso,
  plans,
  attempts,
}: {
  defaultExamDate: string;
  nowIso: string;
  plans: PlanRow[];
  attempts: AttemptRow[];
}) {
  const [subject, setSubject] = useState<ApSubjectId>(
    (plans[0]?.subject as ApSubjectId | undefined) ?? "us_history",
  );
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

  const selectedPlan = plans.find((plan) => plan.id === planId) ?? plans[0] ?? null;
  const activeSubject = (selectedPlan?.subject as ApSubjectId | undefined) ?? subject;
  const activeExamDate = selectedPlan?.exam_date ?? examDate;
  const activeMeta = apSubjectById(activeSubject);
  const activeAttempts = attempts.filter(
    (attempt) =>
      (selectedPlan && attempt.plan_id === selectedPlan.id) ||
      (!selectedPlan && attempt.subject === activeSubject),
  );
  const latestScored = activeAttempts.find(
    (attempt) =>
      attempt.correct_count !== null &&
      attempt.total_count !== null &&
      attempt.total_count > 0,
  );
  const practicePct = latestScored
    ? Math.round((latestScored.correct_count! / latestScored.total_count!) * 100)
    : null;
  const stableNow = useMemo(() => new Date(nowIso), [nowIso]);
  const localMilestones = useMemo(
    () => apMilestonePlan(activeSubject, activeExamDate, stableNow),
    [activeSubject, activeExamDate, stableNow],
  );
  const daysToExam = daysUntilExam(activeExamDate, stableNow);
  const localScore =
    correctCount && totalCount
      ? scoreBand(Number(correctCount), Number(totalCount)).message
      : null;

  function run(
    action: () => Promise<{ ok: true; message?: string } | { ok: false; error: string }>,
    success: string,
  ) {
    setStatus(null);
    startTransition(async () => {
      const result = await action();
      setStatus(result.ok ? result.message ?? success : result.error);
    });
  }

  return (
    <ScreenDesignViewport className="sd-ap-command" aria-label="AP Command Center">
      <style>{AP_STYLES}</style>
      <span className="sd-ap-orb" aria-hidden="true" />
      <header className="sd-ap-header">
        <div className="sd-ap-header-row">
          <div>
            <DianaWordmark className="sd-ap-wordmark" />
            <h1 className="sd-ap-title">
              Academic
              <span>Path</span>
            </h1>
          </div>
          <Link href="/settings" className="sd-ap-settings" aria-label="Open settings">
            <Settings size={20} aria-hidden="true" />
          </Link>
        </div>
        <p className="sd-ap-eyebrow">Curriculum overview</p>
      </header>

      <main className="sd-ap-scroll">
        <section className="sd-ap-section" aria-labelledby="ap-practice-evidence">
          <div className="sd-ap-section-head">
            <h2 id="ap-practice-evidence">Practice evidence</h2>
            {practicePct !== null ? <strong>{practicePct}%</strong> : null}
          </div>
          <div className="sd-ap-progress" aria-hidden="true">
            <span style={{ width: `${practicePct ?? 0}%` }} />
          </div>
          <div className="sd-ap-progress-labels">
            <span>{activeAttempts.length} saved {activeAttempts.length === 1 ? "attempt" : "attempts"}</span>
            <span>{practicePct === null ? "No scored set yet" : "Latest scored set"}</span>
          </div>
        </section>

        <section className="sd-ap-card" aria-labelledby="ap-plan-title">
          <div className="sd-ap-card-title">
            <h2 id="ap-plan-title">Mastery radar</h2>
            <Target size={18} aria-hidden="true" />
          </div>
          {selectedPlan ? (
            <>
              <div className="sd-ap-plan-copy">
                <strong>{activeMeta.label}</strong>
                <span>{selectedPlan.current_focus ?? "Choose the next review focus in the plan."}</span>
                <small>
                  {daysToExam} days to exam · Goal {selectedPlan.goal_band ?? "not set"}
                </small>
              </div>
              <Link
                href={`/ap?plan=${selectedPlan.id}#ap-plan-workbench`}
                className="sd-ap-action"
                aria-label="Open AP study plan"
              >
                <BookOpenCheck size={16} aria-hidden="true" />
                Open AP study plan
              </Link>
            </>
          ) : (
            <p className="sd-ap-empty">
              No AP plan is saved yet. Add a subject, exam date, and goal band to start an honest study path.
            </p>
          )}
        </section>

        <section className="sd-ap-card" style={{ marginTop: 16 }} aria-labelledby="recent-ap-practice">
          <div className="sd-ap-card-title">
            <h2 id="recent-ap-practice">Recent practice</h2>
            <ClipboardCheck size={18} aria-hidden="true" />
          </div>
          {attempts.length > 0 ? (
            <div className="sd-ap-attempt-list">
              {attempts.slice(0, 3).map((attempt) => {
                const pct =
                  attempt.correct_count !== null &&
                  attempt.total_count !== null &&
                  attempt.total_count > 0
                    ? Math.round((attempt.correct_count / attempt.total_count) * 100)
                    : null;
                return (
                  <div key={attempt.id} className="sd-ap-attempt">
                    <span className="sd-ap-attempt-icon"><CalendarDays size={16} aria-hidden="true" /></span>
                    <span>
                      <strong>{apSubjectById(attempt.subject).label}</strong>
                      <small>{attempt.practice_type} · {attempt.score_band ? `${attempt.score_band} band` : "No band claimed"}</small>
                    </span>
                    <em>{pct === null ? "Saved" : `${pct}%`}</em>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="sd-ap-empty">No practice is saved yet. The page will show only results you record.</p>
          )}
        </section>

        <details id="ap-plan-workbench" className="sd-ap-card sd-ap-workbench" style={{ marginTop: 16 }} open={!selectedPlan}>
          <summary>Plan and practice workbench</summary>
          {status ? <p className="sd-ap-status" role="status">{status}</p> : null}
          <form
            id="new-ap-plan"
            className="sd-ap-form"
            onSubmit={(event) => {
              event.preventDefault();
              run(() => saveApPlan({ subject, examDate, goalBand, currentFocus }), "AP plan saved.");
            }}
          >
            <h3>Set an AP target</h3>
            <label className="sd-ap-field">
              <span>Subject</span>
              <select value={subject} onChange={(event) => setSubject(event.target.value as ApSubjectId)}>
                {AP_SUBJECTS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
            </label>
            <div className="sd-ap-two">
              <label className="sd-ap-field"><span>Exam date</span><input type="date" value={examDate} onChange={(event) => setExamDate(event.target.value)} /></label>
              <label className="sd-ap-field"><span>Goal band</span><input value={goalBand} onChange={(event) => setGoalBand(event.target.value)} /></label>
            </div>
            <label className="sd-ap-field"><span>Current focus</span><textarea rows={2} value={currentFocus} onChange={(event) => setCurrentFocus(event.target.value)} /></label>
            <button type="submit" className="sd-ap-submit" disabled={pending}>Save AP plan</button>
          </form>

          <form
            className="sd-ap-form"
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
            <h3>Log practice evidence</h3>
            {plans.length > 0 ? (
              <label className="sd-ap-field">
                <span>Plan</span>
                <select value={planId ?? ""} onChange={(event) => setPlanId(event.target.value || null)}>
                  {plans.map((plan) => <option key={plan.id} value={plan.id}>{apSubjectById(plan.subject).label} · {plan.exam_date}</option>)}
                </select>
              </label>
            ) : null}
            <label className="sd-ap-field">
              <span>Practice type</span>
              <select value={practiceType} onChange={(event) => setPracticeType(event.target.value as "mcq" | "frq" | "mixed")}>
                <option value="mcq">MCQ</option><option value="frq">FRQ</option><option value="mixed">Mixed</option>
              </select>
            </label>
            <div className="sd-ap-two">
              <label className="sd-ap-field"><span>Supported count</span><input type="number" min={0} value={correctCount} onChange={(event) => setCorrectCount(event.target.value)} /></label>
              <label className="sd-ap-field"><span>Total questions</span><input type="number" min={1} value={totalCount} onChange={(event) => setTotalCount(event.target.value)} /></label>
            </div>
            {localScore ? <p className="sd-ap-status">{localScore}</p> : null}
            <label className="sd-ap-field"><span>Next review focus</span><textarea rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
            <button type="submit" className="sd-ap-submit" disabled={pending}>Save practice</button>
          </form>

          <ol className="sd-ap-milestones" aria-label={`${activeMeta.label} study plan`}>
            {localMilestones.map((item, index) => <li key={item}><span>{String(index + 1).padStart(2, "0")}</span><p>{item}</p></li>)}
          </ol>
          <span hidden>{fallbackApScaffold(activeSubject, "frq_outline").title}</span>
        </details>
      </main>

      <a href="#new-ap-plan" className="sd-ap-capture" aria-label="Add AP plan"><Plus size={30} aria-hidden="true" /></a>
      <StudentBottomNav />
    </ScreenDesignViewport>
  );
}
