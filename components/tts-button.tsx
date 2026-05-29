"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2, Square } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/**
 * Read-aloud button.
 *
 * provider='browser' (default): uses browser Web Speech API — no server cost, works offline.
 * provider='openai': invokes tts-generate Edge Function, plays returned audio/mpeg via HTMLAudioElement.
 *
 * Falls back to a no-op when provider='browser' and the browser doesn't support speechSynthesis.
 * OpenAI mode is always "supported" in modern browsers (Audio in window).
 */
export function TtsButton({
  text,
  label = "Read aloud",
  className = "",
  provider = "browser",
}: {
  text: string;
  label?: string;
  className?: string;
  provider?: "browser" | "openai";
}) {
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (provider === "openai") {
      setSupported(typeof window !== "undefined" && "Audio" in window);
    } else {
      setSupported(
        typeof window !== "undefined" && "speechSynthesis" in window,
      );
    }
    return () => {
      if (provider === "browser" && typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      if (provider === "openai" && audioRef.current) {
        audioRef.current.pause();
        if (audioRef.current.src) URL.revokeObjectURL(audioRef.current.src);
      }
    };
  }, [provider]);

  if (!supported) return null;

  async function playOpenAI() {
    setSpeaking(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.functions.invoke("tts-generate", {
        body: { text },
      });

      if (error || !data) {
        console.error("tts-generate error:", error);
        setSpeaking(false);
        return;
      }

      // data from invoke is already parsed — for binary, we need to handle as blob
      // Use fetch directly since invoke may not return raw binary correctly
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

      // Fetch the TTS audio as a blob
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
      console.error("OpenAI TTS playback error:", err);
      setSpeaking(false);
    }
  }

  function stopOpenAI() {
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
    utter.rate = 0.95;
    utter.pitch = 1.0;
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
      if (provider === "openai") stopOpenAI();
      else stopBrowser();
    } else {
      if (provider === "openai") void playOpenAI();
      else playBrowser();
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
