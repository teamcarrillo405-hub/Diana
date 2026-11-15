"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { saveWellnessGoal } from "../wellness/actions";

export type GoalView = {
  id: string;
  title: string;
  category: string;
  targetText: string;
  nextStep: string | null;
};

const GOAL_CATEGORIES = [
  { value: "skill", label: "Skill" },
  { value: "consistency", label: "Consistency" },
  { value: "recovery", label: "Recovery" },
] as const;

export function GoalsPanel({ goals }: { goals: readonly GoalView[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<(typeof GOAL_CATEGORIES)[number]["value"]>("skill");
  const [targetText, setTargetText] = useState("");
  const [nextStep, setNextStep] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  function saveGoal() {
    if (pending) return;
    setMessage(null);
    startTransition(async () => {
      const result = await saveWellnessGoal({ title, category, targetText, nextStep });
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      setTitle("");
      setTargetText("");
      setNextStep("");
      setMessage("Goal saved.");
      router.refresh();
    });
  }

  return (
    <div className="sd-goals-board">
      <section className="sd-goals-summary" aria-labelledby="current-goals-heading">
        <div>
          <p id="current-goals-heading">Current goals</p>
          <strong>{goals.length === 0 ? "No goals yet" : `${goals.length} active`}</strong>
        </div>
        <span>{goals.length === 0 ? "Choose one small direction for this week." : "Keep the next action visible and workable."}</span>
      </section>

      {goals.length > 0 ? (
        <div className="sd-goals-list" aria-label="Current goals">
          {goals.map((goal) => (
            <article className="sd-goal-item" key={goal.id}>
              <p>{goal.category}</p>
              <h2>{goal.title}</h2>
              <span>{goal.targetText}</span>
              {goal.nextStep ? <strong>Next: {goal.nextStep}</strong> : null}
            </article>
          ))}
        </div>
      ) : null}

      <form
        className="sd-goals-form"
        onSubmit={(event) => {
          event.preventDefault();
          saveGoal();
        }}
      >
        <div className="sd-goals-form-head">
          <div>
            <h2>Set a goal</h2>
            <p>Keep it specific enough to make the first step easy to choose.</p>
          </div>
        </div>

        <div className="sd-goals-fields">
          <label className="sd-goals-title-field">
            <span>Goal</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Finish my science lab notes" maxLength={120} />
          </label>
          <label>
            <span>Focus area</span>
            <select value={category} onChange={(event) => setCategory(event.target.value as typeof category)}>
              {GOAL_CATEGORIES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label>
            <span>What does progress look like?</span>
            <textarea value={targetText} onChange={(event) => setTargetText(event.target.value)} placeholder="Complete the observations and conclusion by Friday." maxLength={400} rows={3} />
          </label>
          <label>
            <span>First action</span>
            <textarea value={nextStep} onChange={(event) => setNextStep(event.target.value)} placeholder="Open the lab sheet and write the first observation." maxLength={300} rows={3} />
          </label>
        </div>
        <div className="sd-goals-form-actions">
          <button type="submit" disabled={pending || !title.trim() || !targetText.trim() || !nextStep.trim()}>
            {pending ? "Saving" : "Save goal"}
          </button>
        </div>
        <p className="sd-goals-message" role="status">{message}</p>
      </form>
    </div>
  );
}
