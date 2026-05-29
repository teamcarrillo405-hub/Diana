// components/tts-highlight-button.tsx
// Full TTS button with word-level highlight and speed controls.
// Use for long-form reading (ReadingPanel). For short text (titles, descriptions),
// the existing TtsButton remains — this component has higher DOM overhead.
//
// Pitfall 3: word spans rendered ONLY while playing; at idle, plain text shows.
// aria-live="polite" on highlight container only — not on individual spans.
"use client";
import { Volume2, Square, PauseCircle, PlayCircle } from "lucide-react";
import { useTtsHighlight } from "@/lib/tts/use-tts-highlight";

export function TtsHighlightButton({ text }: { text: string }) {
  const { state, highlightedWordIdx, words, rate, setRate, speak, stop, pause, resume, supported } =
    useTtsHighlight(text);

  if (!supported) return null;

  return (
    <div className="space-y-3">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        {state === "idle" && (
          <button
            type="button"
            onClick={speak}
            aria-label="Read aloud"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm hover:bg-border/30 transition-colors"
          >
            <Volume2 size={14} />
            Read aloud
          </button>
        )}
        {state === "playing" && (
          <>
            <button
              type="button"
              onClick={pause}
              aria-label="Pause reading"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm hover:bg-border/30 transition-colors"
            >
              <PauseCircle size={14} />
              Pause
            </button>
            <button
              type="button"
              onClick={stop}
              aria-label="Stop reading"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm hover:bg-border/30 transition-colors"
            >
              <Square size={14} />
              Stop
            </button>
          </>
        )}
        {state === "paused" && (
          <>
            <button
              type="button"
              onClick={resume}
              aria-label="Resume reading"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-accent/10 px-3 py-1.5 text-sm text-accent hover:bg-accent/20 transition-colors"
            >
              <PlayCircle size={14} />
              Resume
            </button>
            <button
              type="button"
              onClick={stop}
              aria-label="Stop reading"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm hover:bg-border/30 transition-colors"
            >
              <Square size={14} />
              Stop
            </button>
          </>
        )}

        {/* Speed selector — visible whenever TTS is active */}
        {state !== "idle" && (
          <label className="inline-flex items-center gap-1.5 text-xs text-muted">
            Speed
            <select
              value={rate}
              onChange={(e) => setRate(Number(e.target.value))}
              className="rounded border border-border bg-card px-1 py-0.5 text-xs"
            >
              <option value={0.75}>0.75x</option>
              <option value={1.0}>1x</option>
              <option value={1.25}>1.25x</option>
              <option value={1.5}>1.5x</option>
            </select>
          </label>
        )}
      </div>

      {/* Word-highlighted text — ONLY rendered when playing or paused (Pitfall 3) */}
      {state !== "idle" && (
        <p
          aria-live="polite"
          aria-label="Text being read aloud"
          className="text-sm leading-relaxed"
        >
          {words.map((w, i) => (
            <span
              key={i}
              className={i === highlightedWordIdx ? "tts-word-active" : ""}
            >
              {w.word}{" "}
            </span>
          ))}
        </p>
      )}
    </div>
  );
}
