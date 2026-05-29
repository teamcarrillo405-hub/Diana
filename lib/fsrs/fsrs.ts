// lib/fsrs/fsrs.ts
// FSRS-5 spaced repetition scheduler — pure functions, no DB, no clock-of-the-system except inputs.
// Reference: https://github.com/open-spaced-repetition/fsrs4anki/wiki/ABC-of-FSRS (v5 defaults)
// Spec: F12 — target retention 0.9, four ratings (Again/Hard/Good/Easy), no streaks, no guilt copy.
import type { FsrsState, Rating as RatingT } from "@/lib/notes/types";

/** Rating values — public mirror of the type literal (1..4). */
export const Rating = {
  Again: 1 as const,
  Hard:  2 as const,
  Good:  3 as const,
  Easy:  4 as const,
};

/** Card state we feed into schedule() — the persisted fields that affect scheduling. */
export interface FsrsCard {
  state: FsrsState;
  stability: number;      // memory stability in days
  difficulty: number;     // 1..10 (FSRS scale)
  dueAt: string;          // ISO 8601
  reps: number;
  lapses: number;
  lastReviewAt: string | null;
}

/** Output of schedule() — the next persisted card state + bookkeeping for review-log row. */
export interface ScheduleResult {
  card: FsrsCard;
  log: {
    rating: RatingT;
    scheduledFor: string;     // ISO 8601 — when this review was due
    reviewedAt: string;       // ISO 8601 — when the student actually reviewed
    elapsedDays: number;
    scheduledDays: number;    // days until next review
    stability: number;
    difficulty: number;
    reps: number;
    lapses: number;
    state: FsrsState;
  };
}

// FSRS-5 default weights (Anki v5 release).
const W = [
  0.4072, 1.1829, 3.1262, 15.4722, 7.2102, 0.5316, 1.0651,
  0.0234, 1.616, 0.1544, 1.0824, 1.9813, 0.0953, 0.2975,
  2.2042, 0.2407, 2.9466, 0.5034, 0.6567,
] as const;

const TARGET_RETENTION = 0.9;
const FACTOR = 19 / 81;
const DECAY = -0.5;
const MIN_STABILITY = 0.01;
const MIN_DIFFICULTY = 1;
const MAX_DIFFICULTY = 10;

// Learning step in minutes for new + relearning cards (Anki-default cadence).
const LEARNING_STEPS_MIN = [1, 10];
const RELEARNING_STEP_MIN = 10;

function clampDifficulty(d: number): number {
  if (!Number.isFinite(d)) return MIN_DIFFICULTY;
  return Math.min(MAX_DIFFICULTY, Math.max(MIN_DIFFICULTY, d));
}

function initialStability(rating: RatingT): number {
  // W[0..3] are initial stability per rating (Again, Hard, Good, Easy)
  return Math.max(MIN_STABILITY, W[rating - 1]);
}

function initialDifficulty(rating: RatingT): number {
  // FSRS-5: D0 = W[4] - exp(W[5] * (rating - 1)) + 1
  return clampDifficulty(W[4] - Math.exp(W[5] * (rating - 1)) + 1);
}

function nextDifficulty(d: number, rating: RatingT): number {
  // ΔD = -W[6] * (rating - 3); meanReversion target = initialDifficulty(Easy)
  const delta = -W[6] * (rating - 3);
  const dPrime = d + delta * (10 - d) / 9; // linear damping near 10
  const meanRevTarget = initialDifficulty(Rating.Easy);
  const dNext = W[7] * meanRevTarget + (1 - W[7]) * dPrime;
  return clampDifficulty(dNext);
}

function recallStability(d: number, s: number, r: number, rating: RatingT): number {
  // S' = S * (1 + exp(W[8]) * (11 - D) * S^-W[9] * (exp(W[10] * (1-R)) - 1) * hardPenalty * easyBonus)
  const hardPenalty = rating === Rating.Hard ? W[15] : 1;
  const easyBonus = rating === Rating.Easy ? W[16] : 1;
  const factor =
    Math.exp(W[8]) *
    (11 - d) *
    Math.pow(s, -W[9]) *
    (Math.exp(W[10] * (1 - r)) - 1) *
    hardPenalty *
    easyBonus;
  return Math.max(MIN_STABILITY, s * (1 + factor));
}

function lapseStability(d: number, s: number, r: number): number {
  // S after Again on a review card
  const sLapse =
    W[11] *
    Math.pow(d, -W[12]) *
    (Math.pow(s + 1, W[13]) - 1) *
    Math.exp(W[14] * (1 - r));
  return Math.max(MIN_STABILITY, sLapse);
}

function currentRetrievability(s: number, elapsedDays: number): number {
  return Math.pow(1 + FACTOR * elapsedDays / s, DECAY);
}

function nextIntervalDays(stability: number): number {
  // I = S/factor * (retention^(1/decay) - 1)
  return (stability / FACTOR) * (Math.pow(TARGET_RETENTION, 1 / DECAY) - 1);
}

/** Create a brand-new card. dueAt = now so it appears in due-today deck immediately. */
export function createCard(now: Date = new Date()): FsrsCard {
  return {
    state:      "new",
    stability:  0,
    difficulty: 0,
    dueAt:      now.toISOString(),
    reps:       0,
    lapses:     0,
    lastReviewAt: null,
  };
}

/**
 * Apply a review rating to a card and return the next state + a log entry.
 * Pure: same inputs always produce same outputs. No Math.random.
 */
export function schedule(
  card: FsrsCard,
  rating: RatingT,
  now: Date = new Date(),
): ScheduleResult {
  const reviewedAt = now;
  const scheduledForIso = card.dueAt;

  const elapsedMs = card.lastReviewAt
    ? Math.max(0, reviewedAt.getTime() - new Date(card.lastReviewAt).getTime())
    : 0;
  const elapsedDays = elapsedMs / (1000 * 60 * 60 * 24);

  let nextState: FsrsState = card.state;
  let stability = card.stability;
  let difficulty = card.difficulty;
  let lapses = card.lapses;
  let scheduledDays = 0;

  if (card.state === "new") {
    stability = initialStability(rating);
    difficulty = initialDifficulty(rating);
    if (rating === Rating.Again) {
      nextState = "learning";
      scheduledDays = LEARNING_STEPS_MIN[0] / (60 * 24);
    } else if (rating === Rating.Hard) {
      nextState = "learning";
      scheduledDays = LEARNING_STEPS_MIN[1] / (60 * 24);
    } else if (rating === Rating.Good) {
      nextState = "learning";
      scheduledDays = LEARNING_STEPS_MIN[1] / (60 * 24);
    } else {
      // Easy graduates immediately
      nextState = "review";
      scheduledDays = nextIntervalDays(stability);
    }
  } else if (card.state === "learning" || card.state === "relearning") {
    if (rating === Rating.Again) {
      stability = initialStability(rating);
      difficulty = nextDifficulty(difficulty || initialDifficulty(rating), rating);
      scheduledDays = (card.state === "relearning" ? RELEARNING_STEP_MIN : LEARNING_STEPS_MIN[0]) / (60 * 24);
    } else if (rating === Rating.Hard || rating === Rating.Good) {
      stability = stability || initialStability(rating);
      difficulty = nextDifficulty(difficulty || initialDifficulty(rating), rating);
      if (rating === Rating.Good) {
        nextState = "review";
        scheduledDays = nextIntervalDays(stability);
      } else {
        scheduledDays = LEARNING_STEPS_MIN[1] / (60 * 24);
      }
    } else {
      // Easy graduates from learning
      stability = stability || initialStability(rating);
      difficulty = nextDifficulty(difficulty || initialDifficulty(rating), rating);
      nextState = "review";
      scheduledDays = nextIntervalDays(stability);
    }
  } else {
    // state === "review"
    const r = currentRetrievability(stability, elapsedDays);
    difficulty = nextDifficulty(difficulty, rating);
    if (rating === Rating.Again) {
      stability = lapseStability(difficulty, stability, r);
      lapses = lapses + 1;
      nextState = "relearning";
      scheduledDays = RELEARNING_STEP_MIN / (60 * 24);
    } else {
      stability = recallStability(difficulty, stability, r, rating);
      nextState = "review";
      scheduledDays = nextIntervalDays(stability);
    }
  }

  const dueAt = new Date(reviewedAt.getTime() + scheduledDays * 24 * 60 * 60 * 1000);

  const nextCard: FsrsCard = {
    state:        nextState,
    stability,
    difficulty,
    dueAt:        dueAt.toISOString(),
    reps:         card.reps + 1,
    lapses,
    lastReviewAt: reviewedAt.toISOString(),
  };

  return {
    card: nextCard,
    log: {
      rating,
      scheduledFor:  scheduledForIso,
      reviewedAt:    reviewedAt.toISOString(),
      elapsedDays,
      scheduledDays,
      stability,
      difficulty,
      reps:          nextCard.reps,
      lapses:        nextCard.lapses,
      state:         nextState,
    },
  };
}
