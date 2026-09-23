"use client";

import { Pause, Play, RotateCcw } from "lucide-react";
import { useState, useTransition, type CSSProperties } from "react";

import { finishFocusSession, startFocusSession } from "@/app/(app)/timer/actions";
import { useTimer } from "@/lib/timer/use-timer";

type AssignmentFocusClockProps = {
  assignmentId: string;
  title: string;
  estimatedMinutes: number | null;
};

function formatTime(milliseconds: number) {
  const seconds = Math.max(0, Math.round(milliseconds / 1000));
  return `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
}

export function AssignmentFocusClock({
  assignmentId,
  title,
  estimatedMinutes,
}: AssignmentFocusClockProps) {
  const { state, start, pause, resume, reset } = useTimer();
  const [sessionOpen, setSessionOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const blockMinutes = Math.min(45, Math.max(10, estimatedMinutes ?? 25));
  const active = state.status === "running" || state.status === "paused";
  const totalMilliseconds = (state.status === "idle" || state.status === "done")
    ? blockMinutes * 60_000
    : state.phase === "break"
      ? state.breakMin * 60_000
      : state.workMin * 60_000;
  const remainingMilliseconds = state.status === "idle"
    ? totalMilliseconds
    : state.remainingMs;
  const progress = Math.max(0, Math.min(1, 1 - remainingMilliseconds / totalMilliseconds));

  function begin() {
    if (pending) return;
    setMessage("");
    startTransition(async () => {
      const result = await startFocusSession({ assignmentId });
      if (!result.ok) return setMessage(result.error);
      start({ workMin: blockMinutes, breakMin: 5, premackReward: null });
      setSessionOpen(true);
      setMessage("Focus block started");
    });
  }

  function end() {
    if (pending) return;
    setMessage("");
    startTransition(async () => {
      const result = await finishFocusSession({ assignmentId });
      if (!result.ok) return setMessage(result.error);
      reset();
      setSessionOpen(false);
      setMessage("Focus block saved");
    });
  }

  const clockStatus = state.status === "done"
    ? "Complete"
    : state.phase === "break"
      ? "Break"
      : active
        ? "Focused"
        : "Focus";

  return (
    <section className="sd-assignment-focus-clock" aria-label={`Focus clock for ${title}`}>
      <div className="sd-assignment-focus-clock-ring" style={{ "--focus-progress": progress } as CSSProperties}>
        <div>
          <span>{clockStatus}</span>
          <strong>{formatTime(remainingMilliseconds)}</strong>
        </div>
      </div>
      <div className="sd-assignment-focus-clock-copy">
        <p>Focus clock</p>
        <strong>{sessionOpen ? "Stay with the current move." : `A ${blockMinutes}-minute block for this assignment.`}</strong>
        <small aria-live="polite">{message}</small>
      </div>
      <div className="sd-assignment-focus-clock-actions">
        {!sessionOpen ? (
          <button type="button" onClick={begin} disabled={pending}>
            <Play size={16} fill="currentColor" aria-hidden="true" />
            {pending ? "Starting" : "Start focus"}
          </button>
        ) : (
          <>
            {active ? (
              <button type="button" onClick={state.status === "paused" ? resume : pause}>
                {state.status === "paused" ? <Play size={16} fill="currentColor" aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />}
                {state.status === "paused" ? "Resume" : "Pause"}
              </button>
            ) : null}
            <button type="button" className="sd-assignment-focus-clock-end" onClick={end} disabled={pending}>
              <RotateCcw size={16} aria-hidden="true" />
              {pending ? "Saving" : "End focus"}
            </button>
          </>
        )}
      </div>
    </section>
  );
}