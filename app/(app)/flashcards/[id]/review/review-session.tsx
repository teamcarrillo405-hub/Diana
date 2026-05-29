"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { rateCard } from "../actions";

export type QueueCard = {
  id:    string;
  front: string;
  back:  string;
  state: string;
};

const RATINGS = [
  { value: 1 as const, label: "Again",  hint: "Forgot it" },
  { value: 2 as const, label: "Hard",   hint: "Took a while" },
  { value: 3 as const, label: "Good",   hint: "Got it" },
  { value: 4 as const, label: "Easy",   hint: "Knew it cold" },
];

export function ReviewSession({ queue }: { queue: QueueCard[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [rating, setRating] = useState(false);

  const card = queue[idx];

  if (!card) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
        <p className="text-lg font-medium">Done for now.</p>
        <p className="mt-1 text-sm text-muted">
          Nice work. The next batch will be ready when it&apos;s ready.
        </p>
        <button
          type="button"
          onClick={() => router.push("/flashcards")}
          className="mt-4 rounded-md bg-accent px-4 py-2 text-sm text-white"
        >
          Back to Study
        </button>
      </div>
    );
  }

  function handleRate(value: 1 | 2 | 3 | 4) {
    setRating(true);
    startTransition(async () => {
      await rateCard({ id: card.id, rating: value });
      // Advance to next card; reset flip state.
      setFlipped(false);
      setRating(false);
      setIdx((i) => i + 1);
    });
  }

  return (
    <div className="space-y-6">
      <p className="text-xs text-muted">
        Card {idx + 1} of {queue.length}
      </p>

      {/* Front + (optional) back */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <p className="text-xs font-medium uppercase tracking-wider text-muted">
          Front
        </p>
        <p className="mt-2 whitespace-pre-wrap text-base">{card.front}</p>

        {flipped && (
          <>
            <hr className="my-4 border-border" />
            <p className="text-xs font-medium uppercase tracking-wider text-muted">
              Back
            </p>
            <p className="mt-2 whitespace-pre-wrap text-base">{card.back}</p>
          </>
        )}
      </div>

      {!flipped ? (
        <button
          type="button"
          onClick={() => setFlipped(true)}
          className="w-full rounded-lg bg-accent px-4 py-3 text-sm font-medium text-white"
        >
          Show answer
        </button>
      ) : (
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {RATINGS.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => handleRate(r.value)}
              disabled={rating}
              className="rounded-lg border border-border bg-card px-3 py-3 text-sm hover:bg-border/30 disabled:opacity-50"
            >
              <span className="block font-medium">{r.label}</span>
              <span className="block text-xs text-muted">{r.hint}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
