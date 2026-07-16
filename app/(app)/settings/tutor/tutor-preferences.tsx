"use client";

import {
  ArrowRight,
  Brain,
  CheckCircle2,
  ChevronLeft,
  HeartHandshake,
  HelpCircle,
  Info,
  Target,
} from "lucide-react";
import { useState, useTransition } from "react";

import { DianaWordmark } from "@/components/screen-design/primitives";
import { SourceMedia } from "@/components/screen-design/source-media";
import { StudentBottomNav } from "@/components/screen-design/student-bottom-nav";
import type { ScreenDesignAssetId } from "@/lib/screendesign/assets";
import { saveTutorPreferences } from "./actions";

type Persona = "diana" | "xavier" | "maya";
type TutorStyle = "socratic" | "supportive" | "direct";
type Complexity = "simple" | "balanced" | "advanced";
type TutorView = "gallery" | "personalization";

const TUTORS: ReadonlyArray<Readonly<{
  id: Persona;
  name: string;
  specialty: string;
  description: string;
  assetId: ScreenDesignAssetId;
}>> = [
  {
    id: "diana",
    name: "Coach Diana",
    specialty: "All-subject guide",
    description: "Calm, source-first guidance that keeps the work and decisions yours.",
    assetId: "diana-mascot",
  },
  {
    id: "xavier",
    name: "Tutor Xavier",
    specialty: "Mathematics expert",
    description: "Analytical sessions for calculus, statistics, and problem setup.",
    assetId: "tutor-math-expert",
  },
  {
    id: "maya",
    name: "Tutor Maya",
    specialty: "STEM specialist",
    description: "Structured support for biology, chemistry, and concept mapping.",
    assetId: "tutor-science-expert",
  },
];

const STYLES = [
  {
    id: "socratic",
    name: "Socratic Method",
    description: "Questions lead you toward the next step and deeper conceptual learning.",
    Icon: HelpCircle,
  },
  {
    id: "supportive",
    name: "Supportive Coach",
    description: "More encouragement and confidence checks while the work stays yours.",
    Icon: HeartHandshake,
  },
  {
    id: "direct",
    name: "Direct",
    description: "Brief explanations and concrete next actions for a focused review.",
    Icon: Target,
  },
] as const;

const COMPLEXITIES: readonly Complexity[] = ["simple", "balanced", "advanced"];
const COMPLEXITY_LABELS: Record<Complexity, string> = {
  simple: "Varsity level",
  balanced: "Starter level",
  advanced: "All-pro level",
};

export function TutorPreferences({
  initial,
  initialView,
}: {
  initial: { persona: Persona; style: TutorStyle; complexity: Complexity };
  initialView: TutorView;
}) {
  const [view, setView] = useState<TutorView>(initialView);
  const [persona, setPersona] = useState<Persona>(initial.persona);
  const [style, setStyle] = useState<TutorStyle>(initial.style);
  const [complexity, setComplexity] = useState<Complexity>(initial.complexity);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const persist = (onSuccess?: () => void) => {
    setMessage(null);
    startTransition(async () => {
      const result = await saveTutorPreferences({ persona, style, complexity });
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      setMessage("Tutor preferences saved.");
      onSuccess?.();
    });
  };

  if (view === "gallery") {
    return (
      <>
        <header className="sd-tutor-header">
          <div className="sd-tutor-header-row">
            <div>
              <DianaWordmark />
              <h1 aria-label="Select tutor">Select<br /><span>tutor</span></h1>
            </div>
            <button
              type="button"
              className="sd-tutor-icon-button"
              aria-label="About tutor presentation"
              title="Tutor selection changes presentation only."
            >
              <Info size={19} aria-hidden="true" />
            </button>
          </div>
          <p>Who is helping you study today?</p>
        </header>

        <main className="sd-tutor-scroll">
          {message ? <p className="sd-tutor-status" role="status">{message}</p> : null}
          <section className="sd-tutor-gallery" aria-label="Supported tutor presentations">
            {TUTORS.map((tutor) => (
              <button
                type="button"
                key={tutor.id}
                className="sd-tutor-portrait-card"
                data-persona={tutor.id}
                aria-label={`Select ${tutor.name}`}
                aria-pressed={persona === tutor.id}
                onClick={() => setPersona(tutor.id)}
              >
                <SourceMedia
                  assetId={tutor.assetId}
                  width={720}
                  height={420}
                  alt={`${tutor.name} tutor portrait`}
                  priority={tutor.id === "diana"}
                />
                {persona === tutor.id ? (
                  <span className="sd-tutor-selected"><CheckCircle2 size={11} aria-hidden="true" /> Selected</span>
                ) : null}
                <span className="sd-tutor-portrait-copy">
                  <strong>{tutor.name}</strong>
                  <em>{tutor.specialty}</em>
                  <small>{tutor.description}</small>
                </span>
              </button>
            ))}
          </section>
        </main>

        <div className="sd-tutor-primary-footer">
          <button
            type="button"
            className="sd-tutor-primary"
            disabled={pending}
            onClick={() => persist(() => setView("personalization"))}
          >
            {pending ? "Saving tutor" : "Choose tutor"} <ArrowRight size={15} aria-hidden="true" />
          </button>
        </div>
        <StudentBottomNav />
      </>
    );
  }

  const complexityIndex = COMPLEXITIES.indexOf(complexity);
  const complexityFill = `${complexityIndex * 50}%`;

  return (
    <>
      <header className="sd-tutor-header">
        <div className="sd-tutor-header-title">
          <button
            type="button"
            className="sd-tutor-icon-button"
            aria-label="Back to tutor gallery"
            onClick={() => setView("gallery")}
          >
            <ChevronLeft size={20} aria-hidden="true" />
          </button>
          <div>
            <DianaWordmark />
            <h1>Coach settings</h1>
          </div>
        </div>
      </header>

      <main className="sd-tutor-scroll">
        {message ? <p className="sd-tutor-status" role="status">{message}</p> : null}
        <section className="sd-tutor-playbook" aria-labelledby="teaching-playbook-title">
          <h2 className="sd-tutor-section-title" id="teaching-playbook-title">Teaching playbook</h2>
          <div className="sd-tutor-style-list">
            {STYLES.map((item) => (
              <button
                type="button"
                key={item.id}
                className="sd-tutor-style-card"
                aria-label={item.name}
                aria-pressed={style === item.id}
                onClick={() => setStyle(item.id)}
              >
                <span className="sd-tutor-style-icon"><item.Icon size={21} aria-hidden="true" /></span>
                <span className="sd-tutor-style-copy"><strong>{item.name}</strong><small>{item.description}</small></span>
                {style === item.id ? <CheckCircle2 className="sd-tutor-style-check" size={18} aria-hidden="true" /> : <span />}
              </button>
            ))}
          </div>
        </section>

        <section className="sd-tutor-complexity" aria-labelledby="complexity-title">
          <div className="sd-tutor-complexity-head">
            <h2 id="complexity-title">Preferred complexity</h2>
            <output htmlFor="tutor-complexity">{COMPLEXITY_LABELS[complexity]}</output>
          </div>
          <div className="sd-tutor-range" style={{ "--complexity-fill": complexityFill } as React.CSSProperties}>
            <div className="sd-tutor-range-track">
              <input
                id="tutor-complexity"
                type="range"
                min={0}
                max={2}
                step={1}
                value={complexityIndex}
                onChange={(event) => setComplexity(COMPLEXITIES[Number(event.target.value)])}
                aria-label="Preferred complexity"
              />
              <span className="sd-tutor-range-thumb" aria-hidden="true" />
            </div>
            <div className="sd-tutor-range-labels"><span>Simple</span><span>Balanced</span><span>Advanced</span></div>
          </div>
        </section>

        <p className="sd-tutor-safety">Class AI rules and authorship controls stay the same.</p>
      </main>

      <div className="sd-tutor-primary-footer">
        <button type="button" className="sd-tutor-primary" disabled={pending} onClick={() => persist()}>
          {pending ? "Saving style" : "Save tutor style"} <Brain size={15} aria-hidden="true" />
        </button>
      </div>
      <StudentBottomNav />
    </>
  );
}
