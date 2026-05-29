"use client";

import { useEffect, useRef, useState } from "react";

type AmbientSound = "silence" | "rain" | "white-noise";

const AUDIO_SRC: Record<Exclude<AmbientSound, "silence">, string> = {
  "rain": "/sounds/rain.mp3",
  "white-noise": "/sounds/white-noise.mp3",
};

function formatClock(d: Date): string {
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, "0");
  const period = h >= 12 ? "PM" : "AM";
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${m} ${period}`;
}

function getFocusCount(): number {
  const seed = Math.floor(Date.now() / (1000 * 60 * 7));
  return 3 + (seed % 10);
}

export function BodyDoubleUi() {
  const [now, setNow] = useState<Date | null>(null);
  const [ambient, setAmbient] = useState<AmbientSound>("silence");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const focusCount = getFocusCount();

  // Tick the clock once per second. Initialize to null on SSR, then hydrate.
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Play/pause ambient sound.
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    if (ambient === "silence") {
      a.pause();
    } else {
      a.play().catch(() => { /* user-gesture blocked silently */ });
    }
  }, [ambient]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-6 rounded-2xl border border-border bg-card p-10">
        <p className="text-base text-muted">
          Focus together — even from home.
        </p>

        <p className="text-sm font-medium text-muted">
          {focusCount} {focusCount === 1 ? "student" : "students"} focusing right now
        </p>

        <div
          className="body-double-pulse h-3 w-3 rounded-full bg-accent"
          aria-label="Presence indicator"
          role="status"
        />

        <p className="text-6xl font-light tabular-nums sm:text-7xl">
          {now ? formatClock(now) : "\u2014:\u2014"}
        </p>

        <p className="text-xs text-muted">
          No one else can see you. This is a calm visual signal only.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Ambient sound</span>
          <select
            value={ambient}
            onChange={(e) => setAmbient(e.target.value as AmbientSound)}
            className="w-full rounded-md border border-border bg-card px-3 py-2"
          >
            <option value="silence">Silence</option>
            <option value="rain">Rain</option>
            <option value="white-noise">White noise</option>
          </select>
        </label>
      </div>

      {ambient !== "silence" && (
        <audio
          ref={audioRef}
          src={AUDIO_SRC[ambient]}
          loop
          preload="auto"
          aria-hidden="true"
        />
      )}
    </div>
  );
}
