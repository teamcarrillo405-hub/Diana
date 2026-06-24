"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, ClipboardList, TimerReset } from "lucide-react";

type Step = {
  id: string;
  action: string;
  minutes: number;
};

const EXAMPLE_TEXT =
  "Biology lab report: explain the hypothesis, summarize the data table, and write the conclusion using the rubric.";

export function BreakDownClient() {
  const [raw, setRaw] = useState(EXAMPLE_TEXT);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const steps = useMemo(() => buildLocalSteps(raw), [raw]);
  const doneCount = steps.filter((step) => checked[step.id]).length;
  const nextStep = steps.find((step) => !checked[step.id]) ?? steps[0];

  return (
    <div className="space-y-5">
      <section className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
        <div className="rounded-3xl border border-border bg-surface-raised p-4 shadow-sm sm:p-5">
          <div className="flex items-center gap-2">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-brand/10 text-brand">
              <ClipboardList size={18} />
            </span>
            <div>
              <h2 className="text-base font-semibold">Paste the assignment</h2>
              <p className="text-sm text-muted">Diana turns it into visible five-minute moves.</p>
            </div>
          </div>
          <textarea
            value={raw}
            onChange={(event) => setRaw(event.target.value)}
            rows={5}
            className="mt-4 w-full rounded-2xl border border-border bg-surface px-3 py-3 text-sm leading-6"
            placeholder="Paste the prompt, rubric, or what you remember."
          />
        </div>

        <div className="nexus-panel nexus-panel-dense flex min-h-full flex-col justify-between gap-6">
          <div className="space-y-3">
            <p className="nexus-kicker">Next move</p>
            <h2 className="max-w-2xl text-3xl font-semibold leading-tight">
              {nextStep?.action ?? "Add a prompt to start."}
            </h2>
            <p className="text-sm text-muted">One academic action first. More choices stay below.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-muted">
            <span className="nexus-chip rounded-full border px-3 py-1">{doneCount} of {steps.length} marked</span>
            <span className="nexus-chip rounded-full border px-3 py-1">{nextStep?.minutes ?? 2} min</span>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-surface-raised p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold">Your mini-plan</h2>
          <span className="rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted">
            {doneCount} of {steps.length} marked
          </span>
        </div>
        <ol className="mt-4 grid gap-2 md:grid-cols-2">
          {steps.map((step, index) => (
            <li key={step.id} className="flex min-h-24 gap-3 rounded-2xl border border-border bg-surface p-3">
              <button
                type="button"
                aria-label={`Mark step ${index + 1}`}
                onClick={() => setChecked((current) => ({ ...current, [step.id]: !current[step.id] }))}
                className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border ${
                  checked[step.id] ? "border-brand bg-brand text-white" : "border-border text-muted"
                }`}
              >
                <CheckCircle2 size={15} />
              </button>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{step.action}</p>
                <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted">
                  <TimerReset size={13} />
                  {step.minutes} min
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function buildLocalSteps(value: string): Step[] {
  const text = value.trim();
  if (!text) return [{ id: "read", action: "Paste or type the assignment prompt.", minutes: 2 }];

  const lower = text.toLowerCase();
  const steps: Step[] = [
    { id: "source", action: "Circle the deliverable: what has to be turned in?", minutes: 3 },
  ];

  if (lower.includes("rubric")) {
    steps.push({ id: "rubric", action: "Pull out the first rubric requirement and rewrite it in your words.", minutes: 5 });
  }
  if (lower.includes("essay") || lower.includes("paragraph") || lower.includes("claim")) {
    steps.push({ id: "claim", action: "Write one rough claim sentence using your own words.", minutes: 5 });
    steps.push({ id: "evidence", action: "Pick one piece of evidence that could support that claim.", minutes: 5 });
  }
  if (lower.includes("math") || lower.includes("equation") || lower.includes("problem")) {
    steps.push({ id: "known", action: "Write what is given and what you need to find.", minutes: 4 });
    steps.push({ id: "operation", action: "Choose the operation or formula that seems closest.", minutes: 4 });
  }
  if (lower.includes("lab") || lower.includes("hypothesis") || lower.includes("data")) {
    steps.push({ id: "hypothesis", action: "Write the hypothesis and point to the data row that matters first.", minutes: 5 });
    steps.push({ id: "pattern", action: "Describe the pattern in the data without explaining it yet.", minutes: 5 });
  }
  if (lower.includes("read") || lower.includes("chapter") || lower.includes("source")) {
    steps.push({ id: "paragraph", action: "Mark the paragraph or source section that seems most important.", minutes: 4 });
    steps.push({ id: "gist", action: "Write one sentence saying what that section is mostly about.", minutes: 5 });
  }

  steps.push(
    { id: "draft", action: "Create the first rough artifact: sentence, setup, outline, or marked source.", minutes: 5 },
    { id: "check", action: "Compare that first artifact to the prompt before doing the next part.", minutes: 3 },
  );

  return dedupe(steps).slice(0, 8);
}

function dedupe(steps: Step[]) {
  const seen = new Set<string>();
  return steps.filter((step) => {
    if (seen.has(step.id)) return false;
    seen.add(step.id);
    return true;
  });
}
