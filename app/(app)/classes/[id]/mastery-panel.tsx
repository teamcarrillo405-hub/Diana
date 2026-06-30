"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { FileDown, Radar } from "lucide-react";
import { recordAiQuizMasteryResult, updateConceptConfidence } from "./mastery-actions";

export type MasteryConceptView = {
  id: string;
  name: string;
  mastery_level: number;
  self_confidence: number | null;
};

const feelOptions = [
  { value: 0, label: "Not yet" },
  { value: 1, label: "Shaky" },
  { value: 2, label: "Some" },
  { value: 3, label: "Steady" },
  { value: 4, label: "Own it" },
] as const;

const practiceOptions = [
  { value: 0, label: "Retry" },
  { value: 1, label: "Hint" },
  { value: 2, label: "Close" },
  { value: 3, label: "Good" },
  { value: 4, label: "Strong" },
] as const;

export function MasteryPanel({
  classId,
  concepts,
  reviewNext,
  bridge,
}: {
  classId: string;
  concepts: MasteryConceptView[];
  reviewNext: MasteryConceptView | null;
  bridge: string;
}) {
  const reviewLabel = reviewNext ? displayConceptName(reviewNext.name) : "";
  return (
    <section className="class-mastery-section">
      <div className="class-section-head">
        <p className="nexus-kicker nexus-tone-pink">
          <Radar size={14} />
          Mastery map
        </p>
        <Link
          href={`/classes/${classId}/mastery/export`}
          className="nexus-button nexus-button-secondary"
        >
          <FileDown size={13} />
          Export PDF
        </Link>
      </div>

      {reviewNext && (
        <section className="class-review-next nexus-panel nexus-tone-pink nexus-panel-default">
          <span>Review next</span>
          <strong>{reviewLabel}</strong>
          <p>{bridge}</p>
        </section>
      )}

      <div className="class-concept-grid">
        {concepts.map((concept) => (
          <ConceptCard key={concept.id} classId={classId} concept={concept} />
        ))}
      </div>
    </section>
  );
}

function ConceptCard({ classId, concept }: { classId: string; concept: MasteryConceptView }) {
  const [confidence, setConfidence] = useState(concept.self_confidence);
  const [masteryLevel, setMasteryLevel] = useState(Number(concept.mastery_level ?? 0));
  const [pending, startTransition] = useTransition();
  const level = Math.max(0, Math.min(4, masteryLevel));
  const conceptLabel = displayConceptName(concept.name);
  const steadyLabel = confidence == null ? "Not set" : feelOptions[confidence]?.label ?? `${confidence}/4`;

  return (
    <div className="class-concept-card">
      <div className="class-concept-top">
        <div>
          <strong>{conceptLabel}</strong>
          <span>Mastery {level.toFixed(0)} of 4</span>
        </div>
        <div className="class-mastery-bars" aria-label={`${concept.name} mastery level`}>
          {[0, 1, 2, 3].map((idx) => (
            <span
              key={idx}
              className={idx < level ? "is-on" : undefined}
            />
          ))}
        </div>
      </div>

      <p className="class-concept-why">Helps with: {conceptHelpText(concept.name)}</p>

      <div className="class-concept-controls">
        <div className="class-concept-control">
          <div className="class-control-heading">
            <p>How steady?</p>
            <span>{steadyLabel}</span>
          </div>
          <div className="class-segment-control" role="group" aria-label={`${conceptLabel} confidence check`}>
            {feelOptions.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                aria-pressed={confidence === value}
                disabled={pending}
                onClick={() => {
                  setConfidence(value);
                  startTransition(async () => {
                    await updateConceptConfidence({ conceptId: concept.id, classId, confidence: value as 0 | 1 | 2 | 3 | 4 });
                  });
                }}
                className={confidence === value ? "is-active" : undefined}
              >
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="class-concept-control class-concept-control-secondary">
          <div className="class-control-heading">
            <p>Practice</p>
            <span>Updates mastery</span>
          </div>
          <div className="class-segment-control class-segment-control-compact" role="group" aria-label={`${conceptLabel} practice check`}>
            {practiceOptions.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                disabled={pending}
                onClick={() => {
                  startTransition(async () => {
                    const result = await recordAiQuizMasteryResult({
                      conceptId: concept.id,
                      classId,
                      rating: value as 0 | 1 | 2 | 3 | 4,
                    });
                    if (result.ok) setMasteryLevel(result.masteryLevel);
                  });
                }}
                className="disabled:opacity-60"
              >
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function displayConceptName(name: string) {
  const lowerCaseWords = new Set(["and", "or", "of", "the", "to", "in", "for", "with"]);
  return name
    .trim()
    .split(/\s+/)
    .map((word, index) => {
      const lower = word.toLowerCase();
      if (index > 0 && lowerCaseWords.has(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

function conceptHelpText(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes("evidence")) return "proof, diagrams, lab conclusions";
  if (lower.includes("reasoning")) return "explaining what the evidence shows";
  if (lower.includes("structure") || lower.includes("function")) return "matching parts to what they do";
  if (lower.includes("organelle")) return "cell diagrams and quiz labels";
  if (lower.includes("citation")) return "source credit and paragraph proof";
  if (lower.includes("slope") || lower.includes("equation")) return "homework problems and quiz checks";
  if (lower.includes("map") || lower.includes("timeline")) return "history quizzes and source notes";
  if (lower.includes("verb") || lower.includes("pronunciation")) return "speaking checks and practice";
  return "homework, quizzes, and class proof";
}
