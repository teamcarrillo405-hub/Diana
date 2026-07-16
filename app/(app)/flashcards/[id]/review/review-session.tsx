"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition, type CSSProperties } from "react";
import { ChevronLeft, Eye, Plus } from "lucide-react";
import { useRouter } from "next/navigation";

import { DianaMascotMark } from "@/components/screen-design/primitives";
import { ScreenDesignViewport } from "@/components/screen-design/screen-design-viewport";
import { TtsButton } from "@/components/tts-button";
import { schedule, type FsrsCard } from "@/lib/fsrs/fsrs";
import { hapticTap } from "@/lib/native/haptics";
import {
  cacheOfflineFlashcards,
  queueOfflineFlashcardReview,
  registerOfflineSync,
} from "@/lib/offline/store";
import { shouldOfferDifferentApproach } from "@/lib/emotional/session";
import type { FsrsState } from "@/lib/notes/types";
import type { TtsProvider } from "@/lib/supabase/types";

import { rateCard } from "../actions";

export type QueueCard = {
  id: string;
  front: string;
  back: string;
  state: string;
  stability: number;
  difficulty: number;
  due_at: string;
  reps: number;
  lapses: number;
  last_review_at: string | null;
  source_anchor: string | null;
  student_required_action: string | null;
};

const RATINGS = [
  { value: 1 as const, label: "Again", tone: "amber" },
  { value: 2 as const, label: "Hard", tone: "orange" },
  { value: 3 as const, label: "Good", tone: "blue" },
  { value: 4 as const, label: "Easy", tone: "teal" },
] as const;

function intervalLabel(card: QueueCard, rating: 1 | 2 | 3 | 4): string {
  try {
    const now = new Date();
    const result = schedule(
      {
        state: card.state as FsrsState,
        stability: Number(card.stability),
        difficulty: Number(card.difficulty),
        dueAt: card.due_at,
        reps: card.reps,
        lapses: card.lapses,
        lastReviewAt: card.last_review_at,
      } satisfies FsrsCard,
      rating,
      now,
    );
    const minutes = Math.max(
      1,
      Math.round((new Date(result.card.dueAt).getTime() - now.getTime()) / 60_000),
    );
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.round(minutes / 60);
    if (hours < 48) return `${hours}h`;
    return `${Math.round(hours / 24)}d`;
  } catch {
    return "later";
  }
}

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
  const [isRating, startTransition] = useTransition();
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [needsSupportCount, setNeedsSupportCount] = useState(0);
  const [showSupport, setShowSupport] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const card = queue[idx];
  const intervalLabels = useMemo(
    () =>
      card
        ? Object.fromEntries(
            RATINGS.map((rating) => [rating.value, intervalLabel(card, rating.value)]),
          )
        : {},
    [card],
  );

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
      <ScreenDesignViewport className="sd-flashcard-review sd-flashcard-review-complete">
        <DianaMascotMark decorative className="sd-flashcard-complete-mascot" />
        <p>Review session</p>
        <h1>Done for now.</h1>
        <span>Your next cards will appear when the scheduler brings them back.</span>
        <Link href="/flashcards">Back to study</Link>
      </ScreenDesignViewport>
    );
  }

  function advance() {
    setFlipped(false);
    setStatusMessage("");
    setIdx((current) => current + 1);
  }

  function handleRate(value: 1 | 2 | 3 | 4) {
    if (isRating) return;
    setStatusMessage("Saving your review…");
    const nextNeedsSupport = value === 1 ? needsSupportCount + 1 : needsSupportCount;
    setNeedsSupportCount(nextNeedsSupport);
    if (shouldOfferDifferentApproach({ needsSupportCount: nextNeedsSupport })) {
      setShowSupport(true);
    }

    startTransition(async () => {
      try {
        const result = await rateCard({ id: card.id, rating: value });
        if (result.ok) {
          advance();
          return;
        }
        if (navigator.onLine) {
          setStatusMessage(result.error || "Your card is still here. Try saving again.");
          return;
        }
        await queueOfflineFlashcardReview({
          tempId: `${card.id}-${Date.now()}`,
          cardId: card.id,
          rating: value,
          queuedAt: new Date().toISOString(),
        });
        await registerOfflineSync();
        advance();
      } catch {
        if (navigator.onLine) {
          setStatusMessage("Your card is still here. Try saving again.");
          return;
        }
        await queueOfflineFlashcardReview({
          tempId: `${card.id}-${Date.now()}`,
          cardId: card.id,
          rating: value,
          queuedAt: new Date().toISOString(),
        });
        await registerOfflineSync();
        advance();
      }
    });
  }

  const progress = Math.round(((idx + 1) / queue.length) * 100);

  return (
    <ScreenDesignViewport className="sd-flashcard-review">
      <header className="sd-flashcard-review-header">
        <Link href="/flashcards" aria-label="Back to study">
          <ChevronLeft aria-hidden="true" />
        </Link>
        <div>
          <h1>Review session</h1>
          <p>{card.source_anchor || "Your study deck"}</p>
        </div>
        <div
          className="sd-flashcard-progress"
          style={{ "--sd-review-progress": `${progress * 3.6}deg` } as CSSProperties}
          aria-label={`Card ${idx + 1} of ${queue.length}`}
        >
          <span>{idx + 1}/{queue.length}</span>
        </div>
      </header>

      <main className="sd-flashcard-review-main">
        {showSupport ? (
          <section className="sd-flashcard-support" aria-live="polite">
            <strong>Try a different path?</strong>
            <p>Use audio, look at one source line, or say the answer out loud.</p>
            <button type="button" onClick={() => setShowSupport(false)}>
              Keep reviewing
            </button>
          </section>
        ) : null}

        <article className="sd-flashcard-face" data-flipped={flipped}>
          <span className="sd-flashcard-face-letter" aria-hidden="true">
            {flipped ? "A" : "Q"}
          </span>
          <TtsButton
            text={flipped ? card.back : card.front}
            label={flipped ? "Read answer" : "Read question"}
            provider={ttsProvider}
            speed={ttsSpeed}
            pitch={ttsPitch}
            voice={ttsVoice}
            className="sd-flashcard-audio"
          />
          <h2>{flipped ? card.back : card.front}</h2>
          {card.student_required_action ? (
            <p className="sd-flashcard-source-action">{card.student_required_action}</p>
          ) : null}
          {!flipped ? (
            <button
              type="button"
              onClick={() => {
                void hapticTap();
                setFlipped(true);
              }}
              className="sd-flashcard-reveal"
            >
              <Eye aria-hidden="true" />
              Reveal answer
            </button>
          ) : (
            <button type="button" onClick={() => setFlipped(false)} className="sd-flashcard-reveal">
              Show question
            </button>
          )}
        </article>
      </main>

      <Link href="/capture" className="sd-flashcard-quick-add" aria-label="Quick add">
        <Plus aria-hidden="true" />
      </Link>

      <footer className="sd-flashcard-review-footer">
        <div className="sd-flashcard-tip">
          <div>
            <strong>Diana tip</strong>
            <p>{flipped ? "Choose the rating that matches your recall." : "Answer once before you reveal the back."}</p>
          </div>
          <DianaMascotMark decorative />
        </div>
        <div className="sd-flashcard-ratings" aria-label="Recall rating">
          {RATINGS.map((rating) => (
            <button
              key={rating.value}
              type="button"
              data-tone={rating.tone}
              onClick={() => handleRate(rating.value)}
              disabled={isRating}
              aria-label={rating.value === 3 ? "Rate this card" : `Rate ${rating.label}`}
            >
              <strong>{rating.label}</strong>
              <span>{intervalLabels[rating.value] || "later"}</span>
            </button>
          ))}
        </div>
        <p className="sd-flashcard-status" aria-live="polite">{statusMessage}</p>
      </footer>
    </ScreenDesignViewport>
  );
}
