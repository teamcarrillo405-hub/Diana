"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveOnboarding } from "./actions";
import type { ProfilePrefs } from "@/lib/profile";
import type { Diagnosis, Accommodation } from "@/lib/supabase/types";

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
  { value: 9, label: "9th — Freshman" },
  { value: 10, label: "10th — Sophomore" },
  { value: 11, label: "11th — Junior" },
  { value: 12, label: "12th — Senior" },
  { value: 13, label: "Gap year / other" },
] as const;

const CLASS_COUNTS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

export function OnboardingForm({ initial }: { initial: ProfilePrefs }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [diagnoses, setDiagnoses] = useState<string[]>(initial.diagnoses ?? []);
  const [accommodations, setAccommodations] = useState<string[]>(initial.accommodations ?? []);
  const [year, setYear] = useState<number | null>(initial.school_year);
  const [extraTime, setExtraTime] = useState<number>(initial.extra_time_pct ?? 0);
  const [classCount, setClassCount] = useState<number | null>(initial.class_count_hint ?? null);

  function toggle(list: string[], setter: (xs: string[]) => void, value: string) {
    setter(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await saveOnboarding({
        diagnoses: diagnoses as Diagnosis[],
        accommodations: accommodations as Accommodation[],
        school_year: year,
        extra_time_pct: extraTime,
        class_count_hint: classCount,
        // Smart defaults derived from diagnoses; the user can change in Settings.
        dyslexia_font: diagnoses.includes("dyslexia"),
        tts_enabled: diagnoses.includes("dyslexia"),
        line_spacing: diagnoses.includes("dyslexia") ? "loose" : "normal",
        font_size: diagnoses.includes("dyslexia") ? "large" : "normal",
      });
      if (result?.error) return setError(result.error);
      router.push("/onboarding/done");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <fieldset className="space-y-3 rounded-xl border border-border bg-card p-5">
        <legend className="px-1 text-sm font-semibold">
          1. How does your brain tend to work?
        </legend>
        <p className="text-xs text-muted">
          Pick anything that sounds like you. Diana uses this to adjust the UI and suggestions — for example, &quot;Reading takes more effort&quot; turns on a dyslexia-friendly font and read-aloud buttons.
        </p>
        <div className="grid grid-cols-2 gap-2 pt-2">
          {DIAGNOSES.map((d) => (
            <Chip
              key={d.value}
              label={d.label}
              active={diagnoses.includes(d.value)}
              onClick={() => toggle(diagnoses, setDiagnoses, d.value)}
            />
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-3 rounded-xl border border-border bg-card p-5">
        <legend className="px-1 text-sm font-semibold">
          2. Accommodations you have (IEP / 504 / informal)
        </legend>
        <p className="text-xs text-muted">
          Diana uses these to adjust time estimates and the submission checklist.
          None of this is shared with your school.
        </p>
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
            <label className="block text-sm font-medium">
              Extra time: {extraTime}%
            </label>
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
      </fieldset>

      <fieldset className="space-y-3 rounded-xl border border-border bg-card p-5">
        <legend className="px-1 text-sm font-semibold">3. What year are you in?</legend>
        <div className="grid grid-cols-2 gap-2 pt-2 sm:grid-cols-5">
          {YEARS.map((y) => (
            <Chip
              key={y.value}
              label={y.label}
              active={year === y.value}
              onClick={() => setYear(y.value)}
            />
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-3 rounded-xl border border-border bg-card p-5">
        <legend className="px-1 text-sm font-semibold">
          4. How many classes do you have?
        </legend>
        <p className="text-xs text-muted">
          Helps Diana know how heavy your day looks. Skip if it varies.
        </p>
        <div className="grid grid-cols-4 gap-2 pt-2 sm:grid-cols-8">
          {CLASS_COUNTS.map((n) => (
            <Chip
              key={n}
              label={String(n)}
              active={classCount === n}
              onClick={() => setClassCount(n)}
            />
          ))}
        </div>
      </fieldset>

      {error && (
        <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
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
              });
              router.push("/dashboard");
              router.refresh();
            });
          }}
          className="text-sm text-muted hover:underline"
        >
          Skip for now
        </button>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-accent px-5 py-2.5 font-medium text-white disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save and continue"}
        </button>
      </div>
    </form>
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
      className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
        active
          ? "border-accent bg-accent/10 text-accent"
          : "border-border bg-transparent hover:bg-border/30"
      }`}
    >
      {label}
    </button>
  );
}
