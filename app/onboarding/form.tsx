"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveOnboarding } from "./actions";
import { AccentPicker } from "@/components/accent-picker";
import { FutureModeToggle } from "@/components/future-mode-toggle";
import { SparkConstellation } from "@/components/spark/spark-constellation";
import { ThemePicker } from "@/components/theme-picker";
import type { ProfilePrefs } from "@/lib/profile";
import type { Diagnosis, Accommodation } from "@/lib/supabase/types";
import { INTEREST_OPTIONS, normalizeInterestIds } from "@/lib/student-identity/interests";

const DIAGNOSES = [
  { value: "adhd",        label: "I get distracted easily" },
  { value: "dyslexia",    label: "Reading takes more effort" },
  { value: "dyscalculia", label: "Math is extra hard" },
  { value: "dysgraphia",  label: "Writing things out is tough" },
  { value: "asd",         label: "I prefer clear structure" },
  { value: "anxiety",     label: "I worry a lot" },
  { value: "other",       label: "Something else" },
  { value: "none",        label: "None of these" },
] as const;

const ACCOMMODATIONS = [
  { value: "extended_time", label: "Extended time on tests/assignments" },
  { value: "reduced_quantity", label: "Reduced quantity of work" },
  { value: "alternate_format", label: "Alternate format (audio, etc.)" },
  { value: "reader", label: "Reader / text-to-speech" },
  { value: "scribe", label: "Scribe / speech-to-text" },
  { value: "breaks", label: "Frequent breaks" },
  { value: "quiet_setting", label: "Quiet testing setting" },
  { value: "other", label: "Other accommodation" },
] as const;

const YEARS = [
  { value: 9, label: "9th: Freshman" },
  { value: 10, label: "10th: Sophomore" },
  { value: 11, label: "11th: Junior" },
  { value: 12, label: "12th: Senior" },
  { value: 13, label: "Gap year / other" },
] as const;

const CLASS_COUNTS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

// One question per screen. A long form is exactly the wall this product
// exists to remove — each step is one decision, with a visible "almost done."
const STEPS = ["welcome", "brain", "accommodations", "school", "interests", "literacy"] as const;
type Step = (typeof STEPS)[number];

export function OnboardingForm({ initial }: { initial: ProfilePrefs }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("welcome");

  const [diagnoses, setDiagnoses] = useState<string[]>(initial.diagnoses ?? []);
  const [accommodations, setAccommodations] = useState<string[]>(initial.accommodations ?? []);
  const [year, setYear] = useState<number | null>(initial.school_year);
  const [extraTime, setExtraTime] = useState<number>(initial.extra_time_pct ?? 0);
  const [classCount, setClassCount] = useState<number | null>(initial.class_count_hint ?? null);
  const [interests, setInterests] = useState<string[]>(normalizeInterestIds(initial.interests));

  const stepIndex = STEPS.indexOf(step);
  const questionSteps = STEPS.length - 1; // welcome isn't a question

  function toggle(list: string[], setter: (xs: string[]) => void, value: string) {
    setter(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);
  }

  function toggleInterest(value: string) {
    setInterests((current) => {
      if (current.includes(value)) return current.filter((id) => id !== value);
      if (current.length >= 5) return current;
      return [...current, value];
    });
  }

  function next() {
    setError(null);
    setStep(STEPS[Math.min(stepIndex + 1, STEPS.length - 1)]);
  }

  function back() {
    setError(null);
    setStep(STEPS[Math.max(stepIndex - 1, 0)]);
  }

  function commit() {
    startTransition(async () => {
      const result = await saveOnboarding({
        diagnoses: (diagnoses.length > 0 ? diagnoses : ["none"]) as Diagnosis[],
        accommodations: accommodations as Accommodation[],
        school_year: year,
        extra_time_pct: extraTime,
        class_count_hint: classCount,
        interests,
        // Smart defaults derived from diagnoses; the user can change in Settings.
        dyslexia_font: diagnoses.includes("dyslexia"),
        tts_enabled: diagnoses.includes("dyslexia"),
        line_spacing: diagnoses.includes("dyslexia") ? "loose" : "normal",
        font_size: diagnoses.includes("dyslexia") ? "large" : "normal",
      });
      if (result?.error) {
        setError(result.error);
        return;
      }
      router.push("/onboarding/done");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {step !== "welcome" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>
              Step {stepIndex} of {questionSteps}
            </span>
            <span>{stepLabel(step)}</span>
          </div>
          <div className="nexus-status-meter-track h-1.5 overflow-hidden rounded-full bg-surface-soft">
            <div
              className="h-full rounded-full bg-brand transition-all"
              style={{ width: `${Math.round((stepIndex / questionSteps) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {step === "welcome" && (
        <div className="future-card relative overflow-hidden rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <SparkConstellation
            seed="onboarding-identity"
            stars={11}
            className="pointer-events-none absolute right-[-5rem] top-[-6rem] h-64 w-64 text-brand/30"
          />
          <div className="relative space-y-5 text-center">
            <span aria-hidden="true" className="nexus-logo-mark mx-auto flex size-12 items-center justify-center rounded-2xl bg-brand/10 text-brand">
              D
            </span>
            <div>
              <h2 className="text-title">Diana sets up around you.</h2>
              <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
                Five quick questions, about a minute. One decision at a time, and every answer changes
                how Diana works for you. You can adjust everything later in Settings.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-surface/70 p-3 text-left">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">How Diana should feel</p>
              <div className="space-y-4">
                <ThemePicker />
                <AccentPicker />
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface-raised p-3">
                  <div>
                    <p className="text-sm font-semibold">Diana OS preview</p>
                    <p className="text-xs text-muted">A darker visual field for voice, focus, and Future Path screens.</p>
                  </div>
                  <FutureModeToggle compact />
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={next}
              className="nexus-button nexus-button-primary press-scale touch-target rounded-2xl px-6 py-3 text-sm font-semibold"
            >
              Start setup
            </button>
            <button
              type="button"
              onClick={() => {
                startTransition(async () => {
                  await saveOnboarding({
                    diagnoses: ["none"],
                    accommodations: [],
                    school_year: null,
                    extra_time_pct: 0,
                    class_count_hint: null,
                    interests,
                  });
                  router.push("/dashboard");
                  router.refresh();
                });
              }}
              className="text-xs text-muted hover:underline"
            >
              Skip setup for now
            </button>
          </div>
        </div>
      )}

      {step === "brain" && (
        <StepCard
          title="How does your brain tend to work?"
          hint='Pick anything that sounds like you. "Reading takes more effort" turns on a dyslexia-friendly font and read-aloud buttons right away.'
        >
          <div className="grid grid-cols-1 gap-2 pt-2 sm:grid-cols-2">
            {DIAGNOSES.map((d) => (
              <Chip
                key={d.value}
                label={d.label}
                active={diagnoses.includes(d.value)}
                onClick={() => toggle(diagnoses, setDiagnoses, d.value)}
              />
            ))}
          </div>
          <StepNav
            onBack={back}
            onNext={next}
            nextDisabled={diagnoses.length === 0}
            nextHint={diagnoses.length === 0 ? 'Pick at least one: "None of these" counts.' : null}
          />
        </StepCard>
      )}

      {step === "accommodations" && (
        <StepCard
          title="Accommodations you have"
          hint="IEP, 504, or informal. Diana uses these to adjust time estimates and checklists. None of this is shared with your school. Skip ahead if none apply."
        >
          <div className="grid grid-cols-1 gap-2 pt-2 sm:grid-cols-2">
            {ACCOMMODATIONS.map((a) => (
              <Chip
                key={a.value}
                label={a.label}
                active={accommodations.includes(a.value)}
                onClick={() => toggle(accommodations, setAccommodations, a.value)}
              />
            ))}
          </div>
          {accommodations.includes("extended_time") && (
            <div className="pt-3">
              <label className="block text-sm font-medium">Extra time: {extraTime}%</label>
              <input
                type="range"
                min={0}
                max={100}
                step={10}
                value={extraTime}
                onChange={(e) => setExtraTime(Number(e.target.value))}
                className="w-full"
              />
              <p className="text-xs text-muted">
                Common values: 25%, 50%, 100% (time-and-a-half, double time).
              </p>
            </div>
          )}
          <StepNav onBack={back} onNext={next} />
        </StepCard>
      )}

      {step === "school" && (
        <StepCard title="Where are you in school?" hint="Helps Diana pace plans and pick the right scaffolds.">
          <p className="pt-1 text-xs font-medium uppercase tracking-wider text-muted">Year</p>
          <div className="grid grid-cols-2 gap-2 pt-1 sm:grid-cols-5">
            {YEARS.map((y) => (
              <Chip key={y.value} label={y.label} active={year === y.value} onClick={() => setYear(y.value)} />
            ))}
          </div>
          <p className="pt-3 text-xs font-medium uppercase tracking-wider text-muted">
            Classes this term (skip if it varies)
          </p>
          <div className="grid grid-cols-4 gap-2 pt-1 sm:grid-cols-8">
            {CLASS_COUNTS.map((n) => (
              <Chip key={n} label={String(n)} active={classCount === n} onClick={() => setClassCount(n)} />
            ))}
          </div>
          <StepNav
            onBack={back}
            onNext={next}
            nextDisabled={year === null}
            nextHint={year === null ? "Pick your year so plans fit your workload." : null}
          />
        </StepCard>
      )}

      {step === "interests" && (
        <StepCard
          title="Pick up to five interests"
          hint="When an analogy would help, Diana uses these: basketball for momentum, music for fractions."
        >
          <div className="grid grid-cols-2 gap-2 pt-2 sm:grid-cols-3">
            {INTEREST_OPTIONS.map((interest) => (
              <Chip
                key={interest.id}
                label={interest.label}
                active={interests.includes(interest.id)}
                onClick={() => toggleInterest(interest.id)}
              />
            ))}
          </div>
          <p className="text-xs text-muted">{interests.length}/5 selected</p>
          <StepNav onBack={back} onNext={next} />
        </StepCard>
      )}

      {step === "literacy" && (
        <StepCard title="A quick word about the AI" hint="">
          <p className="text-sm text-foreground">Diana uses Claude to help, not to do your work.</p>
          <ul className="space-y-2 pt-1 text-sm text-muted">
            <li>Diana starts from your thoughts before it organizes anything.</li>
            <li>It asks questions to help you think it through.</li>
            <li>Proof receipts show what you did and what Diana helped structure.</li>
          </ul>
          {error && (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
              {error}
            </div>
          )}
          <div className="flex items-center justify-between pt-2">
            <button type="button" onClick={back} className="text-sm text-muted hover:underline">
              Back
            </button>
            <button
              type="button"
              onClick={commit}
              disabled={pending}
              className="nexus-button nexus-button-primary press-scale touch-target rounded-2xl px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
            >
              {pending ? "Saving..." : "Finish setup"}
            </button>
          </div>
        </StepCard>
      )}
    </div>
  );
}

function stepLabel(step: Step): string {
  return (
    {
      welcome: "",
      brain: "Your brain",
      accommodations: "Accommodations",
      school: "School",
      interests: "Interests",
      literacy: "Authorship",
    } as Record<Step, string>
  )[step];
}

function StepCard({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="nexus-panel animate-slide-up space-y-3 rounded-2xl border border-border bg-card p-5">
      <h2 className="text-lg font-semibold">{title}</h2>
      {hint && <p className="text-xs text-muted">{hint}</p>}
      {children}
    </div>
  );
}

function StepNav({
  onBack,
  onNext,
  nextDisabled = false,
  nextHint = null,
}: {
  onBack: () => void;
  onNext: () => void;
  nextDisabled?: boolean;
  nextHint?: string | null;
}) {
  return (
    <div className="space-y-2 pt-3">
      {nextHint && <p className="text-xs text-muted">{nextHint}</p>}
      <div className="flex items-center justify-between">
        <button type="button" onClick={onBack} className="text-sm text-muted hover:underline">
          Back
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={nextDisabled}
          className="nexus-button nexus-button-primary press-scale touch-target rounded-2xl px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`nexus-chip rounded-lg border px-3 py-2 text-left text-sm transition ${
        active
          ? "border-accent bg-accent/10 text-accent"
          : "border-border bg-transparent hover:bg-border/30"
      }`}
    >
      {label}
    </button>
  );
}
