// Per-student FSRS calibration — conservative by design.
//
// The published FSRS-5 weights fit the average learner. Once a student has
// real review history, we compare what the forgetting curve predicted with
// what actually happened and nudge future intervals by a clamped multiplier:
// forget more than predicted → slightly shorter intervals; remember more →
// slightly longer. This is deliberately NOT the full 19-parameter optimizer:
// one interpretable knob, hard-clamped, requiring 50+ samples.

export type ReviewSample = {
  rating: number;        // 1=Again … 4=Easy
  elapsed_days: number;  // days since the prior review
  stability: number;     // stability at the moment of review
};

export const MIN_SAMPLES_FOR_CALIBRATION = 50;
const CLAMP_MIN = 0.8;
const CLAMP_MAX = 1.25;

// FSRS-5 forgetting curve: R(t) = (1 + F·t/S)^DECAY
const DECAY = -0.5;
const FACTOR = 19 / 81;

export function predictedRecall(elapsedDays: number, stability: number): number {
  if (stability <= 0) return 0;
  return Math.pow(1 + (FACTOR * elapsedDays) / stability, DECAY);
}

/**
 * Interval multiplier from this student's history, 1.0 until there is enough
 * signal. Uses the ratio of observed recall odds to predicted recall odds,
 * square-rooted to damp it, then clamped — a student can never be pushed
 * more than ±20-25% off the published schedule.
 */
export function intervalMultiplier(samples: ReviewSample[]): number {
  const usable = samples.filter(
    (s) => s.elapsed_days > 0 && s.stability > 0 && s.rating >= 1 && s.rating <= 4,
  );
  if (usable.length < MIN_SAMPLES_FOR_CALIBRATION) return 1;

  const observed = usable.filter((s) => s.rating >= 2).length / usable.length;
  const predicted =
    usable.reduce((sum, s) => sum + predictedRecall(s.elapsed_days, s.stability), 0) /
    usable.length;

  if (predicted <= 0.01 || predicted >= 0.999) return 1;

  const odds = (p: number) => p / (1 - p);
  const cappedObserved = Math.min(Math.max(observed, 0.05), 0.99);
  const ratio = odds(cappedObserved) / odds(predicted);
  const damped = Math.sqrt(ratio);
  return Math.min(CLAMP_MAX, Math.max(CLAMP_MIN, damped));
}

/** Apply the multiplier to a scheduled due date (review intervals only). */
export function adjustDueDate(now: Date, dueAt: string, multiplier: number): string {
  if (multiplier === 1) return dueAt;
  const intervalMs = new Date(dueAt).getTime() - now.getTime();
  if (intervalMs < 24 * 60 * 60 * 1000) return dueAt; // learning steps untouched
  return new Date(now.getTime() + intervalMs * multiplier).toISOString();
}
