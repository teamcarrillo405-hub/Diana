"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowRight, Atom, Brain, CheckCircle2, HeartHandshake, Sigma, Target } from "lucide-react";

import { saveTutorPreferences } from "./actions";

const TUTORS = [
  { id: "diana", name: "Coach Diana", specialty: "All-subject guide", description: "Calm, source-first help that keeps the work yours.", Icon: Brain },
  { id: "xavier", name: "Tutor Xavier", specialty: "Mathematics", description: "Analytical walkthroughs for math, statistics, and problem setup.", Icon: Sigma },
  { id: "maya", name: "Tutor Maya", specialty: "Science", description: "Concept maps and evidence checks for biology, chemistry, and physics.", Icon: Atom },
] as const;

const STYLES = [
  { id: "socratic", name: "Socratic", description: "Questions lead you toward the next step.", Icon: Brain },
  { id: "supportive", name: "Supportive", description: "More encouragement and confidence checks.", Icon: HeartHandshake },
  { id: "direct", name: "Direct", description: "Brief explanations and concrete next actions.", Icon: Target },
] as const;

export function TutorPreferences({ initial }: { initial: { persona: "diana" | "xavier" | "maya"; style: "socratic" | "supportive" | "direct"; complexity: "simple" | "balanced" | "advanced" } }) {
  const [persona, setPersona] = useState(initial.persona);
  const [style, setStyle] = useState(initial.style);
  const [complexity, setComplexity] = useState(initial.complexity);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function save() {
    setMessage(null);
    startTransition(async () => {
      const result = await saveTutorPreferences({ persona, style, complexity });
      setMessage(result.ok ? "Tutor preferences saved." : result.error);
    });
  }

  return (
    <div className="sd-grid">
      <section className="sd-grid">
        <div className="sd-section-head"><h2 className="sd-section-title">Choose your tutor</h2><span className="sd-chip">Presentation preference</span></div>
        <div className="sd-grid sd-grid-3">
          {TUTORS.map((tutor) => <button type="button" key={tutor.id} className={`sd-panel sd-tutor-card ${persona === tutor.id ? "is-selected" : ""}`} onClick={() => setPersona(tutor.id)} aria-pressed={persona === tutor.id}><tutor.Icon size={28} aria-hidden="true" /><span className="sd-kicker">{tutor.specialty}</span><strong>{tutor.name}</strong><small>{tutor.description}</small>{persona === tutor.id ? <CheckCircle2 size={18} aria-hidden="true" /> : null}</button>)}
        </div>
      </section>

      <section className="sd-grid">
        <h2 className="sd-section-title">Teaching playbook</h2>
        <div className="sd-grid sd-grid-3">
          {STYLES.map((item) => <button type="button" key={item.id} className={`sd-panel sd-tutor-style ${style === item.id ? "is-selected" : ""}`} onClick={() => setStyle(item.id)} aria-pressed={style === item.id}><item.Icon size={20} aria-hidden="true" /><strong>{item.name}</strong><small>{item.description}</small></button>)}
        </div>
      </section>

      <section className="sd-panel sd-panel-pad sd-grid">
        <div className="sd-section-head"><h2 className="sd-section-title">Preferred complexity</h2><span className="sd-chip">{complexity}</span></div>
        <input type="range" min={0} max={2} step={1} value={["simple", "balanced", "advanced"].indexOf(complexity)} onChange={(event) => setComplexity((["simple", "balanced", "advanced"] as const)[Number(event.target.value)])} aria-label="Preferred explanation complexity" />
        <div className="sd-section-head"><small>Simple</small><small>Balanced</small><small>Advanced</small></div>
      </section>

      <div className="sd-section-head">
        <button type="button" onClick={save} disabled={pending} className="sd-button sd-button-primary">{pending ? "Saving..." : "Save preferences"}</button>
        <Link href="/study-buddy" className="sd-button">Open tutor <ArrowRight size={16} aria-hidden="true" /></Link>
      </div>
      {message ? <p role="status" className="sd-subtitle">{message}</p> : null}
    </div>
  );
}
