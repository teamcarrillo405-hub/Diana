"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, CheckCheck, Pause, Play, RotateCcw } from "lucide-react";
import { createTimer, pauseTimer, resumeTimer, startTimer, tickTimer, type TimerState } from "@/lib/timer/timer";
import type { PreviewTask } from "./preview-data";
import styles from "./today-lobby-review.module.css";
import feedbackStyles from "./today-session-feedback.module.css";
import { containDialogTab } from "./dialog-keyboard";

type RecordingAttempt = {
  controller: AbortController;
  labelTimeout: ReturnType<typeof setTimeout>;
  recordingTimeout: ReturnType<typeof setTimeout>;
};
export type SessionRecordingReceipt = { recorded: true };

function clearAttemptTimers(attempt: RecordingAttempt) {
  clearTimeout(attempt.labelTimeout);
  clearTimeout(attempt.recordingTimeout);
}

function initialTimer(workMin: number, snapshot?: TimerState): TimerState {
  const now = Date.now();
  const fresh = startTimer(createTimer(), { workMin, breakMin: 5, premackReward: null, now });
  if (!snapshot || snapshot.phase !== "work" || !["paused", "running"].includes(snapshot.status)
    || !Number.isFinite(snapshot.workMin) || snapshot.workMin < 5 || snapshot.workMin > 60
    || !Number.isFinite(snapshot.remainingMs) || snapshot.remainingMs < 0
    || snapshot.remainingMs > snapshot.workMin * 60_000) return fresh;

  // A snapshot carries remaining work, not an old wall-clock deadline.
  const paused: TimerState = { ...fresh, workMin: snapshot.workMin, remainingMs: snapshot.remainingMs, status: "paused", endsAt: null };
  return paused.remainingMs === 0 ? paused : resumeTimer(paused, { now });
}

function clock(seconds: number) {
  return `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${Math.floor(seconds % 60).toString().padStart(2, "0")}`;
}

function validFocusTarget(target: Element | null): target is HTMLElement {
  if (!(target instanceof HTMLElement) || !target.isConnected
    || target.matches(":disabled, [aria-disabled='true']")
    || target.closest("[hidden], [inert], [aria-hidden='true']")) return false;
  for (let element: HTMLElement | null = target; element; element = element.parentElement) {
    const style = getComputedStyle(element);
    if (style.display === "none" || style.visibility === "hidden" || style.visibility === "collapse"
      || style.contentVisibility === "hidden") return false;
  }
  return true;
}

export function TodaySessionPreview({ task, notes, snapshot, returnFocus, onNotes, onFinish, onClose, authoredMotion = false, returnLabel = "Back to Today" }: {
  task: PreviewTask;
  notes: string;
  snapshot?: TimerState;
  returnFocus?: HTMLElement | null;
  authoredMotion?: boolean;
  returnLabel?: string;
  onNotes: (value: string) => void;
  onFinish: (seconds: number, signal: AbortSignal, expiresAt: number) => void | SessionRecordingReceipt | Promise<void | SessionRecordingReceipt>;
  onClose: (snapshot?: TimerState) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const retryButton = useRef<HTMLButtonElement>(null);
  const finished = useRef(false);
  const closed = useRef(false);
  const frozen = useRef<{ timer: TimerState; seconds: number } | null>(null);
  const activeAttempt = useRef<RecordingAttempt | null>(null);
  const [result, setResult] = useState<number | null>(null);
  const [recording, setRecording] = useState<"idle" | "pending" | "error">("idle");
  const [showPending, setShowPending] = useState(false);
  const [timer, setTimer] = useState(() => initialTimer(task.minutes, snapshot));
  useEffect(() => {
    closed.current = false;
    return () => { closed.current = true; abortRecording(); };
  }, []);
  useEffect(() => {
    const previous = returnFocus ?? document.activeElement as HTMLElement | null;
    const element = dialog.current;
    element?.showModal();
    title.current?.focus();
    return () => {
      element?.close();
      const target = validFocusTarget(previous) ? previous
        : Array.from(document.querySelectorAll('[role="tab"][aria-selected="true"]')).find(validFocusTarget)
          ?? Array.from(document.querySelectorAll("[data-now-start]")).find(validFocusTarget);
      target?.focus({ preventScroll: true });
      if (!authoredMotion && target && !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
        target.animate?.([{ boxShadow: "0 0 0 2px #f1f7f3" }, { boxShadow: "0 0 0 2px transparent" }], { duration: 480 });
      }
    };
  }, [returnFocus, authoredMotion]);
  useEffect(() => {
    if (timer.status !== "running" || result !== null) return;
    const interval = setInterval(() => setTimer(current => {
      if (frozen.current || closed.current) return current;
      const now = Date.now();
      // This preview ends at the work interval; entering a break is a separate choice.
      return current.endsAt !== null && now >= current.endsAt ? pauseTimer(current, { now }) : tickTimer(current, { now });
    }), 1000);
    return () => clearInterval(interval);
  }, [timer.status, result]);
  useEffect(() => { if (result !== null) title.current?.focus(); }, [result]);
  useEffect(() => {
    if (recording !== "error") return;
    const focused = document.activeElement;
    // Recover disabled/removed action focus without interrupting notes editing.
    if (!dialog.current?.contains(focused) || !validFocusTarget(focused)) retryButton.current?.focus({ preventScroll: true });
  }, [recording]);

  function finish() {
    if (frozen.current || closed.current) return;
    const stopped = pauseTimer(timer, { now: Date.now() });
    const elapsed = Math.floor((stopped.workMin * 60_000 - stopped.remainingMs) / 1000);
    frozen.current = { timer: stopped, seconds: elapsed };
    setTimer(stopped);
    if (elapsed === 0) {
      finished.current = true;
      setResult(0);
      return;
    }
    recordFrozenTime();
  }

  function abortRecording() {
    const attempt = activeAttempt.current;
    if (!attempt) return;
    activeAttempt.current = null;
    clearAttemptTimers(attempt);
    attempt.controller.abort();
  }

  function recordFrozenTime() {
    if (!frozen.current || finished.current || closed.current || activeAttempt.current) return;
    const { seconds } = frozen.current;
    const controller = new AbortController();
    const deadline = Date.now() + 10_000;
    setRecording("pending");
    setShowPending(false);

    const isCurrent = () => activeAttempt.current === attempt && !closed.current && !controller.signal.aborted;
    const settle = (outcome: "success" | "error") => {
      if (!isCurrent()) return;
      activeAttempt.current = null;
      clearAttemptTimers(attempt);
      setShowPending(false);
      if (outcome === "error") setRecording("error");
      else {
        finished.current = true;
        setResult(seconds);
      }
    };
    const timeout = () => {
      if (!isCurrent()) return;
      settle("error");
      controller.abort();
    };
    const attempt: RecordingAttempt = {
      controller,
      labelTimeout: setTimeout(() => { if (isCurrent()) setShowPending(true); }, 150),
      recordingTimeout: setTimeout(timeout, 10_000),
    };
    activeAttempt.current = attempt;

    try {
      Promise.resolve(onFinish(seconds, controller.signal, deadline)).then(receipt => {
        // A confirmed commit wins; an unconfirmed late completion still times out.
        if (!receipt?.recorded && Date.now() >= deadline) timeout();
        else settle("success");
      }, () => settle("error"));
    } catch {
      settle("error");
    }
  }

  function leave() {
    if (closed.current) return;
    closed.current = true;
    abortRecording();
    setShowPending(false);
    onClose(result === null ? frozen.current?.timer ?? pauseTimer(timer, { now: Date.now() }) : undefined);
  }

  return <dialog ref={dialog} className={styles.sessionDialog} data-authored-session={authoredMotion || undefined} data-session-result={result !== null} aria-labelledby="session-preview-title" onKeyDown={containDialogTab} onCancel={event => { event.preventDefault(); leave(); }}>
    <div className={styles.sessionBody} key={result === null ? "session" : "result"}>
      <header className={styles.sessionHeader}>
        <button type="button" onClick={leave} aria-label={returnLabel} title={returnLabel}><ArrowLeft size={21} /></button>
        <span>{result === null ? "Focus session" : result === 0 ? "Session ended" : "Session complete"}</span>
        <small>Preview only</small>
      </header>
      <p className={styles.sessionSubject}>{task.subject}</p>
      <h2 ref={title} tabIndex={-1} id="session-preview-title">{result === null ? task.title : result === 0 ? "No focus time recorded." : "Time well spent."}</h2>
      {result === null ? <div className={styles.sessionWorkspace}>
        <div className={styles.sessionNotes}>
          <label htmlFor="session-notes">Session notes</label>
          <textarea id="session-notes" value={notes} onChange={event => onNotes(event.target.value)} />
        </div>
        <div className={styles.sessionTimer}>
          <span>{timer.remainingMs === 0 ? "Time complete" : timer.status === "paused" ? "Paused" : "Focus time"}</span>
          <output role="timer" aria-live="off" aria-label="Time remaining">{clock(Math.ceil(timer.remainingMs / 1000))}</output>
          <span className={styles.statusOnly} role="status">{timer.remainingMs === 0 ? "Focus time complete." : ""}</span>
          <button type="button" className={styles.timerPause} disabled={timer.remainingMs === 0 || recording !== "idle"} aria-label={timer.status === "paused" ? "Resume session" : "Pause session"} title={timer.status === "paused" ? "Resume session" : "Pause session"} onClick={() => {
            if (frozen.current || closed.current) return;
            setTimer(current => current.status === "paused" ? resumeTimer(current, { now: Date.now() }) : pauseTimer(current, { now: Date.now() }));
          }}>{timer.status === "paused" ? <Play size={20} /> : <Pause size={20} />}</button>
          <button type="button" className={styles.finishSession} disabled={recording !== "idle"} aria-busy={recording === "pending"} onClick={finish}><CheckCheck size={18} />{showPending ? "Recording..." : "Finish session"}</button>
          <span className={styles.statusOnly} role="status">{showPending ? "Recording session." : ""}</span>
          {recording === "error" && <div className={feedbackStyles.recordingError}>
            <div role="alert">We couldn&apos;t record this session. Your notes and time are kept here.</div>
            <div className={feedbackStyles.actions}>
              <button ref={retryButton} type="button" onClick={recordFrozenTime}><RotateCcw size={16} />Retry</button>
              <button type="button" onClick={leave}><ArrowLeft size={16} />Back</button>
            </div>
          </div>}
        </div>
      </div> : <div className={styles.sessionResult}>
        <div><strong>{clock(result)}</strong><span>focused this session</span></div>
        <p>{task.title}</p>
        <p className={styles.resultNote}>{result === 0 ? "No session was recorded." : "One sample session recorded."} Your assignment is not marked complete or submitted.</p>
        <button type="button" className={styles.finishSession} onClick={leave}>{returnLabel}</button>
      </div>}
      <footer className={styles.sessionFooter}>Sample assignment. Notes and progress stay in this preview.</footer>
    </div>
  </dialog>;
}
