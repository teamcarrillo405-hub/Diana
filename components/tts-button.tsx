"use client";

import { useEffect, useRef, useState } from "react";
import { Square, Volume2 } from "lucide-react";
import type { TtsProvider } from "@/lib/supabase/types";

export function TtsButton({
  text,
  label = "Read aloud",
  className = "",
  provider = "browser",
  speed = 1,
  pitch = 1,
  voice = "nova",
}: {
  text: string;
  label?: string;
  className?: string;
  provider?: TtsProvider;
  speed?: number;
  pitch?: number;
  voice?: string;
}) {
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (provider === "browser") {
      setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
    } else {
      setSupported(typeof window !== "undefined" && "Audio" in window);
    }
    return () => {
      if (provider === "browser" && typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      if (provider !== "browser" && audioRef.current) {
        audioRef.current.pause();
        if (audioRef.current.src) URL.revokeObjectURL(audioRef.current.src);
      }
    };
  }, [provider]);

  if (!supported) return null;

  async function playRemote() {
    setSpeaking(true);
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
      const anonKey =
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
        "";

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
        console.error("tts-generate fetch error:", res.status);
        setSpeaking(false);
        return;
      }

      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const audio = new Audio(objectUrl);
      audioRef.current = audio;

      audio.onended = () => {
        setSpeaking(false);
        URL.revokeObjectURL(objectUrl);
      };
      audio.onerror = () => {
        setSpeaking(false);
        URL.revokeObjectURL(objectUrl);
      };

      await audio.play().catch(() => setSpeaking(false));
    } catch (err) {
      console.error("TTS playback error:", err);
      setSpeaking(false);
    }
  }

  function stopRemote() {
    if (audioRef.current) {
      audioRef.current.pause();
      if (audioRef.current.src) URL.revokeObjectURL(audioRef.current.src);
      audioRef.current = null;
    }
    setSpeaking(false);
  }

  function playBrowser() {
    const synth = window.speechSynthesis;
    synth.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = speed;
    utter.pitch = pitch;
    utter.onend = () => setSpeaking(false);
    utter.onerror = () => setSpeaking(false);
    setSpeaking(true);
    synth.speak(utter);
  }

  function stopBrowser() {
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }

  function handleClick() {
    if (speaking) {
      if (provider === "browser") stopBrowser();
      else stopRemote();
    } else if (provider === "browser") {
      playBrowser();
    } else {
      void playRemote();
    }
  }

  return (
    <button
      type="button"
      aria-label={speaking ? "Stop reading" : label}
      onClick={handleClick}
      className={`inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-xs text-muted hover:bg-border/30 ${className}`}
    >
      {speaking ? <Square size={12} /> : <Volume2 size={12} />}
      {speaking ? "Stop" : label}
    </button>
  );
}
