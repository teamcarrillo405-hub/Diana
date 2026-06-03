"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TtsButton } from "@/components/tts-button";
import { shouldOfferDifferentApproach } from "@/lib/emotional/session";
import type { TtsProvider } from "@/lib/supabase/types";
import {
  cacheOfflineFlashcards,
  queueOfflineFlashcardReview,
  registerOfflineSync,
} from "@/lib/offline/store";
import { rateCard } from "../actions";

export type QueueCard = {
  id:    string;
  front: string;
  back:  string;
  state: string;
  stability: number;
  difficulty: number;
  due_at: string;
  reps: number;
  lapses: number;
  last_review_at: string | null;
};

const RATINGS = [
  { value: 1 as const, label: "Again",  hint: "Forgot it" },
  { value: 2 as const, label: "Hard",   hint: "Took a while" },
  { value: 3 as const, label: "Good",   hint: "Got it" },
  { value: 4 as const, label: "Easy",   hint: "Knew it cold" },
];

export function ReviewSession({
  queue,
  ttsProvider,
  ttsSpeed,
  ttsPitch,
  ttsVoice,
}: {
  queue: QueueCard[];
  ttsProvider: TtsProvider;
  ttsSpeed: number;
  ttsPitch: number;
  ttsVoice: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [rating, setRating] = useState(false);
  const [needsSupportCount, setNeedsSupportCount] = useState(0);
  const [showSupport, setShowSupport] = useState(false);

  const card = queue[idx];

  useEffect(() => {
    void cacheOfflineFlashcards(
      "due",
      queue.map((item) => ({
        id: item.id,
        front: item.front,
        back: item.back,
        state: item.state,
        stability: Number(item.stability),
        difficulty: Number(item.difficulty),
        dueAt: item.due_at,
        reps: item.reps,
        lapses: item.lapses,
        lastReviewAt: item.last_review_at,
      })),
    );
  }, [queue]);

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
    const nextNeedsSupport = value === 1 ? needsSupportCount + 1 : needsSupportCount;
    setNeedsSupportCount(nextNeedsSupport);
    if (shouldOfferDifferentApproach({ needsSupportCount: nextNeedsSupport })) {
      setShowSupport(true);
    }
    startTransition(async () => {
      try {
        const result = await rateCard({ id: card.id, rating: value });
        if (!result.ok && !navigator.onLine) {
          await queueOfflineFlashcardReview({
            tempId: `${card.id}-${Date.now()}`,
            cardId: card.id,
            rating: value,
            queuedAt: new Date().toISOString(),
          });
          await registerOfflineSync();
        }
      } catch {
        if (!navigator.onLine) {
          await queueOfflineFlashcardReview({
            tempId: `${card.id}-${Date.now()}`,
            cardId: card.id,
            rating: value,
            queuedAt: new Date().toISOString(),
          });
          await registerOfflineSync();
        }
      }
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

      {showSupport && (
        <section className="rounded-xl border border-amber-400/40 bg-amber-50 p-4 text-amber-950 dark:bg-amber-950/30 dark:text-amber-100">
          <p className="text-sm font-medium">Try a different path?</p>
          <p className="mt-1 text-sm">
            Switch to audio, look at one note line, or say the answer out loud before the next card.
          </p>
          <button
            type="button"
            onClick={() => setShowSupport(false)}
            className="mt-3 rounded-md border border-amber-500/40 px-3 py-2 text-sm hover:bg-amber-100/60 dark:hover:bg-amber-900/40"
          >
            Keep reviewing
          </button>
        </section>
      )}

      {/* Front + (optional) back */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">
            Front
          </p>
          <TtsButton
            text={card.front}
            label="Audio"
            provider={ttsProvider}
            speed={ttsSpeed}
            pitch={ttsPitch}
            voice={ttsVoice}
          />
        </div>
        <p className="mt-2 whitespace-pre-wrap text-base">{card.front}</p>

        {flipped && (
          <>
            <hr className="my-4 border-border" />
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium uppercase tracking-wider text-muted">
                Back
              </p>
              <TtsButton
                text={card.back}
                label="Audio"
                provider={ttsProvider}
                speed={ttsSpeed}
                pitch={ttsPitch}
                voice={ttsVoice}
              />
            </div>
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
