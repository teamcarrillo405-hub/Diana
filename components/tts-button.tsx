"use client";

import { useEffect, useState } from "react";
import { Volume2, Square } from "lucide-react";

/**
 * Read-aloud button. Uses the browser Web Speech API — no server cost,
 * works offline, no PII leaves the device. Falls back to a no-op when
 * the browser doesn't support it (older Safari, some mobile webviews).
 *
 * Mount anywhere there's text a dyslexic student might want read.
 */
export function TtsButton({
  text,
  label = "Read aloud",
  className = "",
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setSupported(
      typeof window !== "undefined" && "speechSynthesis" in window,
    );
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  if (!supported) return null;

  function play() {
    const synth = window.speechSynthesis;
    synth.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 0.95;
    utter.pitch = 1.0;
    utter.onend = () => setSpeaking(false);
    utter.onerror = () => setSpeaking(false);
    setSpeaking(true);
    synth.speak(utter);
  }

  function stop() {
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }

  return (
    <button
      type="button"
      aria-label={speaking ? "Stop reading" : label}
      onClick={speaking ? stop : play}
      className={`inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-xs text-muted hover:bg-border/30 ${className}`}
    >
      {speaking ? <Square size={12} /> : <Volume2 size={12} />}
      {speaking ? "Stop" : label}
    </button>
  );
}
