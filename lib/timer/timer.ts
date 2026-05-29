/**
 * F13 — Pure timer state machine.
 * No browser globals. Time is passed in via `now: number` (ms epoch).
 * States: idle | running | paused | break | done.
 * NO 'failed' or 'missed' state — calm invariant. Completion is always 'done'.
 */

export type TimerStatus = "idle" | "running" | "paused" | "break" | "done";
export type TimerPhase = "work" | "break";

export interface TimerState {
  status: TimerStatus;
  phase: TimerPhase | null;     // null when idle/done
  workMin: number;              // configured work interval, minutes
  breakMin: number;             // configured break interval, minutes
  endsAt: number | null;        // ms epoch when current phase ends; null when paused/idle/done
  remainingMs: number;          // ms remaining in current phase (or paused snapshot)
  premackReward: string | null; // F13: "after this 25 min block I get to..."
}

export interface StartOpts {
  workMin: number;
  breakMin: number;
  premackReward: string | null;
  now: number;                  // ms epoch
}

export interface TickOpts { now: number; }

/** Initial idle state. */
export function createTimer(): TimerState {
  return {
    status: "idle",
    phase: null,
    workMin: 0,
    breakMin: 0,
    endsAt: null,
    remainingMs: 0,
    premackReward: null,
  };
}

/** Transition idle/done -> running (work phase). */
export function startTimer(_prev: TimerState, opts: StartOpts): TimerState {
  const work = clamp(opts.workMin, 5, 60);
  const brk  = clamp(opts.breakMin, 1, 30);
  const endsAt = opts.now + work * 60_000;
  return {
    status: "running",
    phase: "work",
    workMin: work,
    breakMin: brk,
    endsAt,
    remainingMs: work * 60_000,
    premackReward: opts.premackReward,
  };
}

/** Capture remaining time, hold for resume. */
export function pauseTimer(prev: TimerState, opts: TickOpts): TimerState {
  if (prev.status !== "running" || prev.endsAt === null) return prev;
  const remainingMs = Math.max(0, prev.endsAt - opts.now);
  return { ...prev, status: "paused", endsAt: null, remainingMs };
}

/** Resume from paused snapshot. */
export function resumeTimer(prev: TimerState, opts: TickOpts): TimerState {
  if (prev.status !== "paused") return prev;
  const endsAt = opts.now + prev.remainingMs;
  return { ...prev, status: "running", endsAt };
}

/**
 * Advance time. Two transition rules:
 *  - work phase elapsed -> running/break (start break countdown)
 *  - break phase elapsed -> done
 * Otherwise just recompute remainingMs.
 */
export function tickTimer(prev: TimerState, opts: TickOpts): TimerState {
  if (prev.status !== "running" || prev.endsAt === null) return prev;
  const remainingMs = prev.endsAt - opts.now;
  if (remainingMs > 0) return { ...prev, remainingMs };

  if (prev.phase === "work") {
    const breakEndsAt = opts.now + prev.breakMin * 60_000;
    return {
      ...prev,
      phase: "break",
      endsAt: breakEndsAt,
      remainingMs: prev.breakMin * 60_000,
    };
  }
  // phase === 'break' -> done
  return {
    ...prev,
    status: "done",
    phase: null,
    endsAt: null,
    remainingMs: 0,
  };
}

/** Reset to idle without losing the configured intervals (helpful for "Start another"). */
export function resetTimer(prev: TimerState): TimerState {
  return {
    ...createTimer(),
    workMin: prev.workMin,
    breakMin: prev.breakMin,
  };
}

function clamp(n: number, lo: number, hi: number): number {
  if (Number.isNaN(n)) return lo;
  return Math.min(hi, Math.max(lo, Math.round(n)));
}
