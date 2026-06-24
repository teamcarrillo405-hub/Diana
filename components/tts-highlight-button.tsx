"use client";

import { useEffect, useRef, useState } from "react";
import { PauseCircle, PlayCircle, Square, Volume2 } from "lucide-react";
import { useTtsHighlight } from "@/lib/tts/use-tts-highlight";
import type { TtsProvider } from "@/lib/supabase/types";

export function TtsHighlightButton({
  text,
  provider = "browser",
  speed = 1,
  pitch = 1,
  voice = "nova",
}: {
  text: string;
  provider?: TtsProvider;
  speed?: number;
  pitch?: number;
  voice?: string;
}) {
  const browserTts = useTtsHighlight(text, { initialRate: speed, pitch });
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [remoteState, setRemoteState] = useState<"idle" | "playing" | "paused">("idle");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (provider !== "browser") {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const anonKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
      "";

    async function speakRemote() {
      setRemoteState("playing");
      try {
        const res = await fetch(`${supabaseUrl}/functions/v1/tts-generate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: anonKey,
            Authorization: `Bearer ${anonKey}`,
          },
          body: JSON.stringify({ text, provider, voice, speed }),
        });

        if (!res.ok) {
          console.error("tts-generate error:", res.status);
          setRemoteState("idle");
          return;
        }

        const blob = await res.blob();
        const objectUrl = URL.createObjectURL(blob);
        const audio = new Audio(objectUrl);
        audioRef.current = audio;

        audio.onended = () => {
          setRemoteState("idle");
          URL.revokeObjectURL(objectUrl);
        };
        audio.onerror = () => {
          setRemoteState("idle");
          URL.revokeObjectURL(objectUrl);
        };

        await audio.play().catch(() => setRemoteState("idle"));
      } catch (err) {
        console.error("TTS playback error:", err);
        setRemoteState("idle");
      }
    }

    function pauseRemote() {
      audioRef.current?.pause();
      setRemoteState("paused");
    }

    function resumeRemote() {
      audioRef.current?.play().catch(() => setRemoteState("idle"));
      setRemoteState("playing");
    }

    function stopRemote() {
      if (audioRef.current) {
        audioRef.current.pause();
        if (audioRef.current.src) URL.revokeObjectURL(audioRef.current.src);
        audioRef.current = null;
      }
      setRemoteState("idle");
    }

    return (
      <div className="space-y-3">
        <RemoteControls
          state={remoteState}
          onSpeak={() => void speakRemote()}
          onPause={pauseRemote}
          onResume={resumeRemote}
          onStop={stopRemote}
        />
      </div>
    );
  }

  const { state, highlightedWordIdx, words, rate, setRate, speak, stop, pause, resume, supported } = browserTts;
  if (!mounted) return null;
  if (!supported) return null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {state === "idle" && (
          <ControlButton onClick={speak} label="Read aloud" icon={<Volume2 size={14} />} />
        )}
        {state === "playing" && (
          <>
            <ControlButton onClick={pause} label="Pause" ariaLabel="Pause reading" icon={<PauseCircle size={14} />} />
            <ControlButton onClick={stop} label="Stop" ariaLabel="Stop reading" icon={<Square size={14} />} />
          </>
        )}
        {state === "paused" && (
          <>
            <ControlButton onClick={resume} label="Resume" ariaLabel="Resume reading" icon={<PlayCircle size={14} />} accent />
            <ControlButton onClick={stop} label="Stop" ariaLabel="Stop reading" icon={<Square size={14} />} />
          </>
        )}

        {state !== "idle" && (
          <label className="inline-flex items-center gap-1.5 text-xs text-muted">
            Speed
            <select
              value={rate}
              onChange={(e) => setRate(Number(e.target.value))}
              className="rounded border border-border bg-card px-1 py-0.5 text-xs"
            >
              <option value={0.75}>0.75x</option>
              <option value={1}>1x</option>
              <option value={1.15}>1.15x</option>
              <option value={1.25}>1.25x</option>
            </select>
          </label>
        )}
      </div>

      {state !== "idle" && (
        <p aria-live="polite" aria-label="Text being read aloud" className="text-sm leading-relaxed">
          {words.map((w, i) => (
            <span key={i} className={i === highlightedWordIdx ? "tts-word-active" : ""}>
              {w.word}{" "}
            </span>
          ))}
        </p>
      )}
    </div>
  );
}

function RemoteControls({
  state,
  onSpeak,
  onPause,
  onResume,
  onStop,
}: {
  state: "idle" | "playing" | "paused";
  onSpeak: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {state === "idle" && (
        <ControlButton onClick={onSpeak} label="Read aloud" icon={<Volume2 size={14} />} />
      )}
      {state === "playing" && (
        <>
          <ControlButton onClick={onPause} label="Pause" ariaLabel="Pause reading" icon={<PauseCircle size={14} />} />
          <ControlButton onClick={onStop} label="Stop" ariaLabel="Stop reading" icon={<Square size={14} />} />
        </>
      )}
      {state === "paused" && (
        <>
          <ControlButton onClick={onResume} label="Resume" ariaLabel="Resume reading" icon={<PlayCircle size={14} />} accent />
          <ControlButton onClick={onStop} label="Stop" ariaLabel="Stop reading" icon={<Square size={14} />} />
        </>
      )}
    </div>
  );
}

function ControlButton({
  onClick,
  label,
  ariaLabel,
  icon,
  accent = false,
}: {
  onClick: () => void;
  label: string;
  ariaLabel?: string;
  icon: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel ?? label}
      className={`inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm transition-colors ${
        accent
          ? "bg-accent/10 text-accent hover:bg-accent/20"
          : "bg-card hover:bg-border/30"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
