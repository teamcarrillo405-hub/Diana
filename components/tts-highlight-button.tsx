// components/tts-highlight-button.tsx
// Full TTS button with word-level highlight and speed controls.
// Use for long-form reading (ReadingPanel). For short text (titles, descriptions),
// the existing TtsButton remains — this component has higher DOM overhead.
//
// Pitfall 3: word spans rendered ONLY while playing; at idle, plain text shows.
// aria-live="polite" on highlight container only — not on individual spans.
//
// Phase 8: OpenAI TTS word-highlight uses estimator — boundary events unavailable per OpenAI TTS 1 API.
// When provider='openai', this component renders a simplified Audio-element variant without word highlight.
"use client";
import { useRef, useState } from "react";
import { Volume2, Square, PauseCircle, PlayCircle } from "lucide-react";
import { useTtsHighlight } from "@/lib/tts/use-tts-highlight";

export function TtsHighlightButton({
  text,
  provider = "browser",
}: {
  text: string;
  provider?: "browser" | "openai";
}) {
  // Browser path: full hook with word-level highlights
  const browserTts = useTtsHighlight(text);

  // OpenAI path: simplified Audio-element variant (no word highlight — boundary events unavailable)
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [openAiState, setOpenAiState] = useState<"idle" | "playing" | "paused">("idle");

  if (provider === "openai") {
    // OpenAI TTS via tts-generate Edge Function
    // tts-generate is invoked here — no word-level boundary events from OpenAI TTS 1 API
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

    async function speakOpenAI() {
      setOpenAiState("playing");
      try {
        const res = await fetch(`${supabaseUrl}/functions/v1/tts-generate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": anonKey,
            "Authorization": `Bearer ${anonKey}`,
          },
          body: JSON.stringify({ text }),
        });

        if (!res.ok) {
          console.error("tts-generate error:", res.status);
          setOpenAiState("idle");
          return;
        }

        const blob = await res.blob();
        const objectUrl = URL.createObjectURL(blob);
        const audio = new Audio(objectUrl);
        audioRef.current = audio;

        audio.onended = () => {
          setOpenAiState("idle");
          URL.revokeObjectURL(objectUrl);
        };
        audio.onerror = () => {
          setOpenAiState("idle");
          URL.revokeObjectURL(objectUrl);
        };

        await audio.play().catch(() => setOpenAiState("idle"));
      } catch (err) {
        console.error("OpenAI TTS playback error:", err);
        setOpenAiState("idle");
      }
    }

    function pauseOpenAI() {
      audioRef.current?.pause();
      setOpenAiState("paused");
    }

    function resumeOpenAI() {
      audioRef.current?.play().catch(() => setOpenAiState("idle"));
      setOpenAiState("playing");
    }

    function stopOpenAI() {
      if (audioRef.current) {
        audioRef.current.pause();
        if (audioRef.current.src) URL.revokeObjectURL(audioRef.current.src);
        audioRef.current = null;
      }
      setOpenAiState("idle");
    }

    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {openAiState === "idle" && (
            <button
              type="button"
              onClick={() => void speakOpenAI()}
              aria-label="Read aloud"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm hover:bg-border/30 transition-colors"
            >
              <Volume2 size={14} />
              Read aloud
            </button>
          )}
          {openAiState === "playing" && (
            <>
              <button
                type="button"
                onClick={pauseOpenAI}
                aria-label="Pause reading"
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm hover:bg-border/30 transition-colors"
              >
                <PauseCircle size={14} />
                Pause
              </button>
              <button
                type="button"
                onClick={stopOpenAI}
                aria-label="Stop reading"
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm hover:bg-border/30 transition-colors"
              >
                <Square size={14} />
                Stop
              </button>
            </>
          )}
          {openAiState === "paused" && (
            <>
              <button
                type="button"
                onClick={resumeOpenAI}
                aria-label="Resume reading"
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-accent/10 px-3 py-1.5 text-sm text-accent hover:bg-accent/20 transition-colors"
              >
                <PlayCircle size={14} />
                Resume
              </button>
              <button
                type="button"
                onClick={stopOpenAI}
                aria-label="Stop reading"
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm hover:bg-border/30 transition-colors"
              >
                <Square size={14} />
                Stop
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // Browser path: full word-level highlight
  const { state, highlightedWordIdx, words, rate, setRate, speak, stop, pause, resume, supported } = browserTts;

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
