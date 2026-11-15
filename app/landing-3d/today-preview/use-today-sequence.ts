"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import type { MenuAudioCue } from "./use-menu-audio";

export const TODAY_TIMING = {
  selection: 80,
  content: 180,
  character: 300,
  settle: 460,
  launch: 180,
  session: 180,
  waiting: 500,
  return: 180,
} as const;

type Phase = "idle" | "selection" | "content" | "character" | "launch" | "session" | "detail" | "return";

/** One interruptible timeline owns attention; sound is only emitted at a user action. */
export function useTodaySequence(enabled: boolean, play: (cue: MenuAudioCue) => void) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [reduced, setReduced] = useState(true);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const generation = useRef(0);
  const playRef = useRef(play);
  playRef.current = play;

  const cancel = useCallback(() => {
    generation.current += 1;
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);
  const reset = useCallback(() => { cancel(); setPhase("idle"); }, [cancel]);

  useEffect(() => {
    const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const sync = () => { setReduced(media?.matches ?? true); reset(); };
    const visibility = () => { if (document.visibilityState !== "visible") reset(); };
    sync();
    media?.addEventListener("change", sync);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      cancel();
      media?.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [cancel, reset]);

  function later(after: number, next: Phase) {
    const version = generation.current;
    timers.current.push(setTimeout(() => {
      if (generation.current === version) setPhase(next);
    }, after));
  }

  function begin(next: Phase, cue?: MenuAudioCue) {
    cancel();
    if (cue) playRef.current(cue);
    setPhase(enabled && !reduced ? next : "idle");
    return enabled && !reduced;
  }

  function select() {
    if (!begin("selection", "select")) return;
    later(TODAY_TIMING.selection, "content");
    later(TODAY_TIMING.character, "character");
    later(TODAY_TIMING.settle, "idle");
  }

  function returned() {
    if (!begin("return", "return")) return;
    later(TODAY_TIMING.return, "character");
    later(TODAY_TIMING.character, "idle");
  }

  const style = {
    "--menu-selection-ms": `${TODAY_TIMING.selection}ms`,
    "--menu-content-ms": `${TODAY_TIMING.content}ms`,
    "--menu-launch-ms": `${TODAY_TIMING.launch}ms`,
    "--menu-session-ms": `${TODAY_TIMING.session}ms`,
    "--menu-return-ms": `${TODAY_TIMING.return}ms`,
  } as CSSProperties;

  return {
    phase, reduced, style, reset, select, returned,
    holdCharacter: enabled && ["selection", "content", "launch", "session", "detail", "return"].includes(phase),
    launch: () => begin("launch", "launch"),
    sessionOpened: () => begin("session"),
    detail: () => begin("detail", "confirm"),
    feedback: (cue: MenuAudioCue) => playRef.current(cue),
  };
}
