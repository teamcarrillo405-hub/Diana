"use client";

import { useState, useTransition } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import { saveWellnessGoal } from "../../wellness/actions";

export function GoalWizard() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <form
      className="sd-panel sd-panel-pad sd-grid"
      action={(formData) => {
        setMessage(null);
        startTransition(async () => {
          const result = await saveWellnessGoal({
            title: String(formData.get("title") ?? ""),
            category: String(formData.get("category") ?? "skill") as "skill" | "consistency" | "recovery",
            targetText: String(formData.get("targetText") ?? ""),
            nextStep: String(formData.get("nextStep") ?? ""),
          });
          setMessage(result.ok ? "Goal saved. Your plan is ready." : result.error);
        });
      }}
    >
      <label className="sd-grid">
        <span className="sd-kicker">Objective</span>
        <input className="sd-input" name="title" maxLength={120} required placeholder="Example: Feel ready for the biology unit test" />
      </label>
      <label className="sd-grid">
        <span className="sd-kicker">Goal type</span>
        <select className="sd-input" name="category" defaultValue="skill">
          <option value="skill">Build a skill</option>
          <option value="consistency">Create a steady routine</option>
          <option value="recovery">Protect recovery time</option>
        </select>
      </label>
      <label className="sd-grid">
        <span className="sd-kicker">What would progress look like?</span>
        <textarea className="sd-input" name="targetText" maxLength={400} rows={3} required placeholder="Describe something observable and realistic." />
      </label>
      <label className="sd-grid">
        <span className="sd-kicker">First small step</span>
        <input className="sd-input" name="nextStep" maxLength={300} placeholder="Example: Review one concept for 10 minutes" />
      </label>
      <button className="sd-button sd-button-primary" disabled={pending} type="submit">
        {pending ? "Saving..." : "Save objective"}
        <ArrowRight size={16} aria-hidden="true" />
      </button>
      {message ? <p role="status" className="sd-subtitle"><CheckCircle2 size={16} aria-hidden="true" /> {message}</p> : null}
    </form>
  );
}
