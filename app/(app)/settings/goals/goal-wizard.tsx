"use client";

import { useState, useTransition } from "react";
import { CalendarDays, CheckCircle2, Info, RotateCcw } from "lucide-react";

import { saveWellnessGoal } from "../../wellness/actions";

type GradeGoal = "A+" | "A" | "B+";
type SavedGoal = { title: string; targetText: string; nextStep: string | null };

export function GoalWizard({ latestGoal }: { latestGoal: SavedGoal | null }) {
  const [pending, startTransition] = useTransition();
  const [grade, setGrade] = useState<GradeGoal>("A+");
  const [examDate, setExamDate] = useState("2026-12-12");
  const [weeklyHours, setWeeklyHours] = useState(12);
  const [saved, setSaved] = useState<SavedGoal | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function saveGoal() {
    if (pending) return;
    setMessage(null);
    const title = `${grade} study objective`;
    const targetText = `Build steady progress toward the ${examDate} exam date with ${weeklyHours} available study hours each week.`;
    const nextStep = `Choose one focused block from the ${weeklyHours}-hour weekly plan.`;
    startTransition(async () => {
      const result = await saveWellnessGoal({ title, category: "consistency", targetText, nextStep });
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      setSaved({ title, targetText, nextStep });
      setMessage("Study goal saved. Your season plan is ready.");
    });
  }

  if (saved) {
    return (
      <main className="sd-goal-complete">
        <CheckCircle2 aria-hidden="true" />
        <span>Step 03 / 03</span>
        <h1>Season plan<br /><strong>saved</strong></h1>
        <p>{saved.targetText}</p>
        <small>{saved.nextStep}</small>
        <button type="button" onClick={() => { setSaved(null); setMessage(null); }}><RotateCcw aria-hidden="true" />Plan another goal</button>
        <p role="status">{message}</p>
      </main>
    );
  }

  return (
    <form
      className="sd-goal-form"
      onSubmit={(event) => {
        event.preventDefault();
        saveGoal();
      }}
    >
      <div className="sd-goal-progress">
        <div><span>Step 01 / 03</span><strong>Scouting phase</strong></div>
        <i aria-hidden="true"><b /></i>
      </div>
      <h1>Season<br /><span>Objectives</span></h1>

      <main className="sd-goal-scroll">
        <fieldset className="sd-goal-grade">
          <legend>Grade objective</legend>
          <div>
            {([
              ["A+", "Elite"],
              ["A", "Pro"],
              ["B+", "Varsity"],
            ] as const).map(([value, label]) => (
              <label key={value} data-selected={grade === value || undefined}>
                <input
                  type="radio"
                  name="grade"
                  value={value}
                  aria-label={`${value} grade objective`}
                  checked={grade === value}
                  onChange={() => setGrade(value)}
                />
                <strong>{value}</strong><span>{label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="sd-goal-date">
          <span>Target exam date</span>
          <div><i><CalendarDays aria-hidden="true" /></i><strong>Final exams week</strong><input type="date" value={examDate} onChange={(event) => setExamDate(event.target.value)} required /></div>
        </label>

        <label className="sd-goal-hours">
          <span>Weekly availability <strong>{weeklyHours} hrs</strong></span>
          <input type="range" min={5} max={40} value={weeklyHours} onChange={(event) => setWeeklyHours(Number(event.target.value))} />
          <small><span>Casual</span><span>All-pro intensity</span></small>
        </label>

        <aside className="sd-goal-review">
          <Info aria-hidden="true" />
          <p><strong>Plan review:</strong> {grade} target, exam date {examDate}, {weeklyHours} available hours. You can adjust every choice before saving.</p>
        </aside>

        {latestGoal ? <details className="sd-goal-latest"><summary>Current saved objective</summary><strong>{latestGoal.title}</strong><p>{latestGoal.targetText}</p></details> : null}
        <p className="sd-goal-message" role="status">{message}</p>
      </main>

      <footer>
        <button type="submit" aria-label="Save study goal" disabled={pending || !examDate}>{pending ? "Saving season plan" : "Generate season plan"}</button>
      </footer>
    </form>
  );
}
