// lib/tts/use-tts-highlight.ts
// TTS hook with word-level boundary event sync + fallback estimator.
// Pitfall 1: boundary event not supported on Firefox or Chrome Android — fallback activates.
// Pitfall 2: safeCancel guards against Chrome pause-hang bug.
// Pitfall 3: word spans only rendered while playing (not idle) — screen reader safe.
"use client";
import { useState, useRef, useCallback } from "react";
import {
  splitWordsWithOffsets,
  scheduleFallbackTimers,
  safeCancel,
  type WordOffset,
} from "@/lib/tts/tts-utils";

export type TtsState = "idle" | "playing" | "paused";

export interface UseTtsHighlightReturn {
  state: TtsState;
  highlightedWordIdx: number;
  words: WordOffset[];
  rate: number;
  setRate: (r: number) => void;
  speak: () => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  supported: boolean;
}

export function useTtsHighlight(
  text: string,
  options: { initialRate?: number; pitch?: number } = {},
): UseTtsHighlightReturn {
  const [state, setState] = useState<TtsState>("idle");
  const [highlightedWordIdx, setHighlightedWordIdx] = useState<number>(-1);
  const [rate, setRate] = useState(options.initialRate ?? 1.0);
  const [supported] = useState(() =>
    typeof window !== "undefined" && "speechSynthesis" in window,
  );

  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);
  const fallbackTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const words = splitWordsWithOffsets(text);

  const clearFallbackTimers = useCallback(() => {
    fallbackTimersRef.current.forEach(clearTimeout);
    fallbackTimersRef.current = [];
  }, []);

  const stop = useCallback(() => {
    if (!supported) return;
    safeCancel(window.speechSynthesis);
    clearFallbackTimers();
    setState("idle");
    setHighlightedWordIdx(-1);
  }, [supported, clearFallbackTimers]);

  const speak = useCallback(() => {
    if (!supported) return;
    safeCancel(window.speechSynthesis);
    clearFallbackTimers();

    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = rate;
    utter.pitch = options.pitch ?? 1.0;
    utterRef.current = utter;
    setState("playing");

    let boundaryFired = false;

    utter.onboundary = (event: SpeechSynthesisEvent) => {
      if (event.name !== "word") return;
      boundaryFired = true;
      // Find word index by charIndex
      const idx = words.findIndex(
        (w) => w.start <= event.charIndex && event.charIndex < w.start + w.length,
      );
      if (idx >= 0) setHighlightedWordIdx(idx);
    };

    utter.onstart = () => {
      // Pitfall 1: if no boundary event fires within 500ms, activate fallback estimator
      setTimeout(() => {
        if (!boundaryFired) {
          scheduleFallbackTimers(words, rate, setHighlightedWordIdx, fallbackTimersRef);
        }
      }, 500);
    };

    utter.onend = () => {
      setState("idle");
      setHighlightedWordIdx(-1);
      clearFallbackTimers();
    };

    utter.onerror = () => {
      setState("idle");
      setHighlightedWordIdx(-1);
      clearFallbackTimers();
    };

    window.speechSynthesis.speak(utter);
  }, [text, rate, options.pitch, words, supported, clearFallbackTimers]);

  const pause = useCallback(() => {
    if (!supported || state !== "playing") return;
    window.speechSynthesis.pause();
    setState("paused");
  }, [supported, state]);

  const resume = useCallback(() => {
    if (!supported || state !== "paused") return;
    window.speechSynthesis.resume();
    setState("playing");
  }, [supported, state]);

  return {
    state,
    highlightedWordIdx,
    words,
    rate,
    setRate,
    speak,
    stop,
    pause,
    resume,
    supported,
  };
}
