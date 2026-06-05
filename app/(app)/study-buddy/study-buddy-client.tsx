"use client";

import { useMemo, useState } from "react";
import { Brain, CheckCircle2, ShieldCheck } from "lucide-react";
import { isRefusalNeeded } from "@/lib/ai/refuse-redirect";

type Mode = "guide" | "hint" | "quiz";

const MODES: Array<{ id: Mode; label: string }> = [
  { id: "guide", label: "Guide me" },
  { id: "hint", label: "Hint ladder" },
  { id: "quiz", label: "Quiz me" },
];

export function StudyBuddyClient() {
  const [source, setSource] = useState("Rubric: use one quote, explain the evidence, and connect it to the claim.");
  const [question, setQuestion] = useState("I have evidence but do not know how to start the paragraph.");
  const [mode, setMode] = useState<Mode>("guide");
  const response = useMemo(() => buildResponse({ source, question, mode }), [source, question, mode]);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
      <section className="rounded-3xl border border-border bg-surface-raised p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="flex size-10 items-center justify-center rounded-2xl bg-brand/10 text-brand">
            <Brain size={18} />
          </span>
          <div>
            <h2 className="text-base font-semibold">Bring your source</h2>
            <p className="text-sm text-muted">The helper works best with a prompt, rubric, note, or passage.</p>
          </div>
        </div>
        <label className="mt-4 block text-sm font-medium">
          Source or class material
          <textarea
            value={source}
            onChange={(event) => setSource(event.target.value)}
            rows={4}
            className="mt-1 w-full rounded-2xl border border-border bg-surface px-3 py-3 text-sm leading-6"
          />
        </label>
        <label className="mt-4 block text-sm font-medium">
          What do you want help with?
          <textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            rows={4}
            className="mt-1 w-full rounded-2xl border border-border bg-surface px-3 py-3 text-sm leading-6"
          />
        </label>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {MODES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setMode(item.id)}
              aria-pressed={mode === item.id}
              className={`touch-target rounded-2xl border px-3 py-2 text-sm font-semibold ${
                mode === item.id
                  ? "border-brand bg-brand text-white"
                  : "border-border bg-surface text-muted hover:bg-surface-soft"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      <aside className="rounded-3xl border border-border bg-surface-raised p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <ShieldCheck size={17} className="text-brand" />
          <h2 className="text-base font-semibold">Diana response</h2>
        </div>
        <div className="mt-4 rounded-2xl border border-brand/20 bg-brand/10 p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-strong dark:text-brand">
            {response.title}
          </p>
          <p className="mt-2 text-sm font-medium">{response.main}</p>
          <p className="mt-2 text-sm text-muted">{response.reason}</p>
        </div>
        <div className="mt-4 space-y-2">
          {response.steps.map((step) => (
            <div key={step} className="flex gap-2 rounded-2xl border border-border bg-surface p-3 text-sm">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-brand" />
              <span>{step}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-2xl border border-border bg-surface p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Source anchor</p>
          <p className="mt-1 text-sm text-muted">{response.anchor}</p>
        </div>
      </aside>
    </div>
  );
}

function buildResponse({ source, question, mode }: { source: string; question: string; mode: Mode }) {
  const trimmedSource = source.trim();
  const directAnswer = isRefusalNeeded(question);
  const anchor = trimmedSource
    ? `This help is anchored to: ${trimmedSource.slice(0, 120)}${trimmedSource.length > 120 ? "..." : ""}`
    : "Add a source so Diana can anchor the next move.";

  if (directAnswer) {
    return {
      title: "Help boundary",
      main: "I can help you build the next part, but the final work stays yours.",
      reason: "That protects authorship and keeps the learning move visible.",
      anchor,
      steps: [
        "Name the part you want to create first.",
        "Draft one rough sentence or setup line.",
        "Ask Diana to check structure, evidence, or reasoning.",
      ],
    };
  }

  if (mode === "hint") {
    return {
      title: "Hint ladder",
      main: "Start with the smallest clue from the source before asking for more.",
      reason: "Hints stay useful when they point back to class material.",
      anchor,
      steps: [
        "Hint 1: underline the key noun or verb in the prompt.",
        "Hint 2: match that word to one line in your source.",
        "Hint 3: write a sentence starter, then fill in your own evidence.",
      ],
    };
  }

  if (mode === "quiz") {
    return {
      title: "Quick check",
      main: "Answer one question before moving on.",
      reason: "A short recall check shows whether the next step is ready.",
      anchor,
      steps: [
        "What is the assignment asking you to produce?",
        "Which source detail supports that move?",
        "What would you write first if it only had to be rough?",
      ],
    };
  }

  return {
    title: "Guided step",
    main: "What is the first thing your source asks you to use or explain?",
    reason: "Answer that first, then Diana can help you choose the next structure.",
    anchor,
    steps: [
      "Point to one phrase in the source.",
      "Say what that phrase means in your words.",
      "Turn that into the first rough line of work.",
    ],
  };
}
