"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Eye } from "lucide-react";

import { StudentShell } from "@/components/student-shell/student-shell";
import styles from "@/components/student-shell/quiz.module.css";
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

import { rateCard } from "@/app/(app)/flashcards/[id]/actions";

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

function intervalLabel(
  card: QueueCard,
  rating: 1 | 2 | 3 | 4,
  nowIso: string,
): string {
  try {
    const now = new Date(nowIso);
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

export function RecallSession({
  queue,
  ttsProvider,
  ttsSpeed,
  ttsPitch,
  ttsVoice,
  nowIso,
}: {
  queue: QueueCard[];
  ttsProvider: TtsProvider;
  ttsSpeed: number;
  ttsPitch: number;
  ttsVoice: string;
  nowIso: string;
}) {
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
            RATINGS.map((rating) => [
              rating.value,
              intervalLabel(card, rating.value, nowIso),
            ]),
          )
        : {},
    [card, nowIso],
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

  if (!card) return <StudentShell active="More"><main id="main-content" className={styles.main}><Link className={styles.back} href="/study">Back to Quiz</Link><section className={styles.paper}><p>Recall</p><h1>Done for now</h1><p>{queue.length ? 'Your reviews are saved.' : 'No recall questions are due.'}</p><Link href="/study?view=saved">Saved practice</Link></section></main></StudentShell>;

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

  return <StudentShell active="More" className={styles.root} version="12"><main id="main-content" className={styles.main}>
    <Link className={styles.back} href="/study">Back to Quiz</Link><header className={styles.heading}><h1>Recall</h1><span>{idx+1} of {queue.length}</span></header>
    <div className={styles.results}><section className={styles.paper}>
      {showSupport ? <div className={styles.hint}><p>Try reading the question out loud or looking at one source line.</p><button onClick={()=>setShowSupport(false)}>Keep going</button></div> : null}
      <p className={styles.eyebrow}>{card.source_anchor || "Saved practice"}</p><h2>{card.front}</h2>
      <TtsButton text={flipped ? card.back : card.front} label={flipped ? "Read answer" : "Read question"} provider={ttsProvider} speed={ttsSpeed} pitch={ttsPitch} voice={ttsVoice} />
      {flipped ? <><div className={styles.answers}><article><h3>Answer</h3><p>{card.back}</p></article></div><fieldset className={styles.choices}><legend>How did that feel?</legend><div className={styles.actions}>{RATINGS.map(rating=><button key={rating.value} type="button" onClick={()=>handleRate(rating.value)} disabled={isRating} aria-label={`Rate ${rating.label}`}><strong>{rating.label}</strong><span> · {intervalLabels[rating.value] || "later"}</span></button>)}</div></fieldset></> : <div className={styles.actions}><button className={styles.primary} onClick={()=>{void hapticTap();setFlipped(true);}}><Eye size={16} aria-hidden="true" /> Reveal answer</button></div>}
      <p role="status" className={styles.quiet}>{statusMessage}</p>
    </section></div>
  </main></StudentShell>;
}
