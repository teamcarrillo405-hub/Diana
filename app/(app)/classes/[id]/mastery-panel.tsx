"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { FileDown } from "lucide-react";
import { recordAiQuizMasteryResult, updateConceptConfidence } from "./mastery-actions";

export type MasteryConceptView = {
  id: string;
  name: string;
  mastery_level: number;
  self_confidence: number | null;
};

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
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xs font-medium uppercase tracking-wider text-muted">
          Mastery map
        </h2>
        <Link
          href={`/classes/${classId}/mastery/export`}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs text-muted hover:bg-border/30"
        >
          <FileDown size={13} />
          Export PDF
        </Link>
      </div>

      {reviewNext && (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">Review next</p>
          <p className="mt-1 text-sm font-medium">{reviewNext.name}</p>
          <p className="mt-1 text-sm text-muted">{bridge}</p>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
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

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium capitalize">{concept.name}</p>
          <p className="text-xs text-muted">Mastery {level.toFixed(0)} of 4</p>
        </div>
        <div className="flex gap-1" aria-label={`${concept.name} mastery level`}>
          {[0, 1, 2, 3].map((idx) => (
            <span
              key={idx}
              className={`h-2 w-5 rounded-full ${idx < level ? "bg-accent" : "bg-border"}`}
            />
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-xs text-muted">Confidence check</p>
        <div className="flex flex-wrap gap-1">
          {[0, 1, 2, 3, 4].map((value) => (
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
              className={`rounded-md border px-2 py-1 text-xs ${
                confidence === value
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border text-muted hover:bg-border/30"
              }`}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-xs text-muted">AI quiz result</p>
        <div className="flex flex-wrap gap-1">
          {[0, 1, 2, 3, 4].map((value) => (
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
              className="rounded-md border border-border px-2 py-1 text-xs text-muted hover:bg-border/30 disabled:opacity-60"
            >
              {value}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
