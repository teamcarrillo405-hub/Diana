"use client";

import { useEffect, useRef, useState } from "react";
import type { PreviewTask } from "./preview-data";

export type PreviewSessionServices = {
  open?: (task: PreviewTask, signal: AbortSignal) => void | Promise<void>;
  record?: (task: PreviewTask, seconds: number, signal: AbortSignal) => void | Promise<void>;
};
type Launch = { task: PreviewTask; origin: HTMLElement | null; status: "preparing" | "waiting" | "error" };
type Attempt = { launch: Launch; controller: AbortController; delay?: ReturnType<typeof setTimeout>; reveal?: ReturnType<typeof setTimeout>; timeout?: ReturnType<typeof setTimeout>; ready?: () => void };

function stop(attempt: Attempt | null) {
  if (!attempt) return;
  clearTimeout(attempt.delay);
  clearTimeout(attempt.reveal);
  clearTimeout(attempt.timeout);
  attempt.controller.abort();
}

export function usePreviewLaunch(onReady: (task: PreviewTask, origin: HTMLElement | null) => void, open?: PreviewSessionServices["open"], { minimumMs = 0, waitingMs = 150 }: { minimumMs?: number; waitingMs?: number } = {}) {
  const [state, setState] = useState<Launch | null>(null);
  const current = useRef<Attempt | null>(null);
  useEffect(() => () => { stop(current.current); current.current = null; }, []);
  useEffect(() => {
    // A changed reduced-motion preference releases a ready session immediately.
    if (minimumMs === 0) current.current?.ready?.();
  }, [minimumMs]);

  function begin(task: PreviewTask, origin: HTMLElement | null) {
    if (current.current) return;
    const attempt: Attempt = { launch: { task, origin, status: "preparing" }, controller: new AbortController() };
    const deadline = Date.now() + 10000;
    const revealAt = Date.now() + minimumMs;
    current.current = attempt;
    const valid = () => current.current === attempt && !attempt.controller.signal.aborted;
    const complete = () => {
      if (!valid()) return;
      if (Date.now() >= deadline) { error(); return; }
      clearTimeout(attempt.delay);
      clearTimeout(attempt.reveal);
      clearTimeout(attempt.timeout);
      current.current = null;
      setState(null);
      onReady(task, origin);
    };
    const error = () => {
      if (!valid()) return;
      stop(attempt);
      attempt.launch = { ...attempt.launch, status: "error" };
      setState(attempt.launch);
    };
    const ready = () => {
      if (!valid()) return;
      attempt.ready = complete;
      const remaining = revealAt - Date.now();
      if (remaining <= 0) complete();
      else attempt.reveal = setTimeout(complete, remaining);
    };
    if (!open && minimumMs === 0) { complete(); return; }
    setState(attempt.launch);
    attempt.delay = setTimeout(() => { if (valid()) setState({ ...attempt.launch, status: "waiting" }); }, Math.max(waitingMs, minimumMs));
    attempt.timeout = setTimeout(error, 10000);
    if (!open) { ready(); return; }
    try { Promise.resolve(open(task, attempt.controller.signal)).then(ready, error); }
    catch { error(); }
  }

  function cancel() {
    stop(current.current);
    current.current = null;
    setState(null);
  }

  function retry() {
    const previous = current.current?.launch;
    cancel();
    if (previous) begin(previous.task, previous.origin);
  }

  return { state, begin, cancel, retry, isActive: () => current.current !== null };
}
