"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  createTimer,
  startTimer,
  pauseTimer,
  resumeTimer,
  tickTimer,
  resetTimer,
  type TimerState,
} from "./timer";

export interface UseTimerApi {
  state: TimerState;
  start: (opts: { workMin: number; breakMin: number; premackReward: string | null }) => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
}

/**
 * React hook for F13 timer. Wraps the pure state machine with a 1-second tick.
 * The hook does NOT decide what UI to render — it only manages state.
 * Plan 07-03 consumes this hook from `app/(app)/timer/timer-ui.tsx`.
 */
export function useTimer(): UseTimerApi {
  const [state, setState] = useState<TimerState>(createTimer);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Tick every second while running. Stop ticking otherwise.
  useEffect(() => {
    if (state.status !== "running") {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    intervalRef.current = setInterval(() => {
      setState((prev) => tickTimer(prev, { now: Date.now() }));
    }, 1000);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [state.status]);

  const start = useCallback(
    (opts: { workMin: number; breakMin: number; premackReward: string | null }) => {
      setState((prev) => startTimer(prev, { ...opts, now: Date.now() }));
    },
    [],
  );

  const pause = useCallback(() => {
    setState((prev) => pauseTimer(prev, { now: Date.now() }));
  }, []);

  const resume = useCallback(() => {
    setState((prev) => resumeTimer(prev, { now: Date.now() }));
  }, []);

  const reset = useCallback(() => {
    setState((prev) => resetTimer(prev));
  }, []);

  return { state, start, pause, resume, reset };
}
