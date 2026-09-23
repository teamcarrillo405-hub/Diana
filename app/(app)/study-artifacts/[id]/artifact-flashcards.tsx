"use client";

import { BookOpen, Save } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";

import { saveArtifactFlashcards } from "@/app/(app)/study-artifacts/actions";
import type { StudyArtifactCard } from "@/lib/study-helper/artifacts";

export function ArtifactFlashcards({
  artifactId,
  cards,
}: {
  artifactId: string;
  cards: StudyArtifactCard[];
}) {
  const [drafts, setDrafts] = useState(cards);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ count: number } | { error: string } | null>(null);

  function updateCard(index: number, field: "front" | "back", value: string) {
    setDrafts((current) =>
      current.map((card, cardIndex) =>
        cardIndex === index ? { ...card, [field]: value } : card,
      ),
    );
  }

  function save() {
    setResult(null);
    startTransition(async () => {
      const response = await saveArtifactFlashcards({ artifactId, cards: drafts });
      setResult(response.ok ? { count: response.count } : { error: response.error });
    });
  }

  return (
    <section className="sd-artifact-detail-sections" aria-label="Flashcard drafts">
      {drafts.map((card, index) => (
        <article key={`${index}-${card.sourceAnchor}`}>
          <span>Card {index + 1}</span>
          <label>
            <span>Front</span>
            <input
              aria-label={`Card ${index + 1} front`}
              value={card.front}
              onChange={(event) => updateCard(index, "front", event.target.value)}
            />
          </label>
          <label>
            <span>Back</span>
            <textarea
              aria-label={`Card ${index + 1} back`}
              value={card.back}
              rows={3}
              onChange={(event) => updateCard(index, "back", event.target.value)}
            />
          </label>
          {card.sourceAnchor ? <small>Source: {card.sourceAnchor}</small> : null}
        </article>
      ))}

      <div className="sd-artifact-card-save">
        <button type="button" disabled={pending || drafts.length === 0} onClick={save}>
          <Save size={16} aria-hidden="true" />
          {pending ? "Saving..." : "Save to Flashcards"}
        </button>
        {result && "count" in result ? (
          <p role="status">
            {result.count} cards are ready. <Link href="/flashcards"><BookOpen size={14} aria-hidden="true" /> Review cards</Link>
          </p>
        ) : null}
        {result && "error" in result ? <p role="status">{result.error}</p> : null}
      </div>
    </section>
  );
}
