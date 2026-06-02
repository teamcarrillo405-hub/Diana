"use client";

import { useEffect, useRef, useState } from "react";
import { useTimer } from "@/lib/timer/use-timer";
import { Play, Pause, RotateCcw, Volume2, VolumeX, Eye, EyeOff } from "lucide-react";
import type { TimerStatus } from "@/lib/timer/timer";
import { adaptiveBreakMinutes, type SessionMood } from "@/lib/executive/session";

type AmbientSound = "silence" | "rain" | "white-noise";

interface PersistedSettings {
  workMin: number;
  breakMin: number;
  ambient: AmbientSound;
  showCountdown: boolean;
  premackReward: string;
}

const STORAGE_KEY = "diana:timer:settings";

const DEFAULTS: PersistedSettings = {
  workMin: 25,
  breakMin: 5,
  ambient: "silence",
  showCountdown: false,
  premackReward: "",
};

const AUDIO_SRC: Record<Exclude<AmbientSound, "silence">, string> = {
  "rain": "/sounds/rain.mp3",
  "white-noise": "/sounds/white-noise.mp3",
};

function loadSettings(): PersistedSettings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<PersistedSettings>;
    return { ...DEFAULTS, ...parsed };
  } catch {
    return DEFAULTS;
  }
}

function saveSettings(s: PersistedSettings) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch { /* ignore quota errors */ }
}

/** Format ms as MM:SS — only used when showCountdown=true. */
function formatMs(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const mm = Math.floor(total / 60).toString().padStart(2, "0");
  const ss = (total % 60).toString().padStart(2, "0");
  return `${mm}:${ss}`;
}

/** Human label for current status — NEVER "failed" or "missed". */
function statusLabel(s: ReturnType<typeof useTimer>["state"]): string {
  if (s.status === "idle") return "Ready when you are";
  if (s.status === "paused") return "Paused";
  if (s.status === "done") return "Done — enjoy your reward";
  if (s.phase === "work") return "Working";
  return "Break time";
}

export function TimerUi({
  roughMode = false,
  sessionMood = null,
  difficulty = null,
}: {
  roughMode?: boolean;
  sessionMood?: SessionMood;
  difficulty?: number | null;
}) {
  const { state, start, pause, resume, reset } = useTimer();
  const [settings, setSettings] = useState<PersistedSettings>(DEFAULTS);
  const [ritualCount, setRitualCount] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Hydrate from localStorage on mount.
  useEffect(() => {
    const loaded = loadSettings();
    setSettings(
      roughMode
        ? {
            ...loaded,
            workMin: Math.min(loaded.workMin, 10),
            breakMin: Math.max(loaded.breakMin, 5),
            showCountdown: false,
          }
        : loaded,
    );
  }, [roughMode]);

  // Persist on every settings change (after hydration).
  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  // Ambient sound — play during running, pause otherwise.
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const shouldPlay =
      (state.status === "running" || state.status === "paused") &&
      settings.ambient !== "silence";
    if (shouldPlay && state.status === "running") {
      a.play().catch(() => { /* user-gesture restrictions handled silently */ });
    } else {
      a.pause();
    }
  }, [state.status, settings.ambient]);

  const totalPhaseMs =
    state.phase === "work"
      ? state.workMin * 60_000
      : state.phase === "break"
      ? state.breakMin * 60_000
      : 0;
  const progress = totalPhaseMs > 0 ? 1 - state.remainingMs / totalPhaseMs : 0;
  // 0..1 — fraction COMPLETED of current phase.

  const isIdleOrDone = state.status === "idle" || state.status === "done";
  const adaptiveBreak = adaptiveBreakMinutes({
    workMinutes: settings.workMin,
    baseBreakMinutes: settings.breakMin,
    mood: roughMode ? "rough" : sessionMood,
    difficulty,
  });

  function startWithRitual() {
    if (ritualCount !== null) return;
    setRitualCount(3);
  }

  useEffect(() => {
    if (ritualCount === null) return;
    if (ritualCount === 0) {
      setRitualCount(null);
      start({
        workMin: settings.workMin,
        breakMin: adaptiveBreak,
        premackReward: settings.premackReward.trim() || null,
      });
      return;
    }
    const id = window.setTimeout(() => setRitualCount((value) => (value === null ? null : value - 1)), 800);
    return () => window.clearTimeout(id);
  }, [adaptiveBreak, ritualCount, settings.premackReward, settings.workMin, start]);

  return (
    <div className="space-y-6">
      {/* Ring progress visualization */}
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-6">
        <RingProgress progress={progress} status={state.status} />

        <p className="text-sm font-medium">{statusLabel(state)}</p>

        {state.premackReward && state.status === "done" && (
          <p className="rounded-full bg-accent/15 px-3 py-1 text-sm text-accent">
            You earned: {state.premackReward}
          </p>
        )}

        {settings.showCountdown && state.status !== "idle" && state.status !== "done" && (
          <p className="font-mono text-3xl tabular-nums">
            {formatMs(state.remainingMs)}
          </p>
        )}

        <div className="flex items-center gap-2">
          {state.status === "idle" || state.status === "done" ? (
            <button
              onClick={startWithRitual}
              className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white"
            >
              <Play size={16} />
              {ritualCount === null ? "Start session" : "Starting..."}
            </button>
          ) : state.status === "running" ? (
            <button
              onClick={pause}
              className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm"
            >
              <Pause size={16} />
              Pause
            </button>
          ) : (
            // paused
            <button
              onClick={resume}
              className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white"
            >
              <Play size={16} />
              Resume
            </button>
          )}

          {!isIdleOrDone && (
            <button
              onClick={reset}
              className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm text-muted"
            >
              <RotateCcw size={16} />
              End session
            </button>
          )}
        </div>
      </div>

      {/* Settings panel — visible when idle or done */}
      {isIdleOrDone && (
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <h2 className="text-sm font-medium uppercase tracking-wider text-muted">
            Session settings
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Work: {settings.workMin} min</span>
              <input
                type="range"
                min={5}
                max={60}
                step={5}
                value={settings.workMin}
                onChange={(e) => setSettings({ ...settings, workMin: Number(e.target.value) })}
                className="w-full"
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Break: {settings.breakMin} min</span>
              <input
                type="range"
                min={1}
                max={30}
                step={1}
                value={settings.breakMin}
                onChange={(e) => setSettings({ ...settings, breakMin: Number(e.target.value) })}
                className="w-full"
              />
            </label>
          </div>
          {adaptiveBreak !== settings.breakMin && (
            <p className="rounded-md border border-border bg-background px-3 py-2 text-sm text-muted">
              Diana will use a {adaptiveBreak}-minute break for this session.
            </p>
          )}

          <label className="block space-y-1 text-sm">
            <span className="font-medium">After this block I get to…</span>
            <input
              type="text"
              value={settings.premackReward}
              onChange={(e) => setSettings({ ...settings, premackReward: e.target.value })}
              className="w-full rounded-md border border-border bg-card px-3 py-2"
              placeholder="e.g. play guitar for 10 min"
              maxLength={120}
            />
          </label>

          <label className="block space-y-1 text-sm">
            <span className="font-medium">Ambient sound</span>
            <select
              value={settings.ambient}
              onChange={(e) =>
                setSettings({ ...settings, ambient: e.target.value as AmbientSound })
              }
              className="w-full rounded-md border border-border bg-card px-3 py-2"
            >
              <option value="silence">Silence</option>
              <option value="rain">Rain</option>
              <option value="white-noise">White noise</option>
            </select>
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings.showCountdown}
              onChange={(e) =>
                setSettings({ ...settings, showCountdown: e.target.checked })
              }
            />
            <span className="flex items-center gap-1">
              {settings.showCountdown ? <Eye size={14} /> : <EyeOff size={14} />}
              Show countdown number
            </span>
            <span className="ml-1 text-xs text-muted">
              (Off by default — fewer numbers = less anxiety.)
            </span>
          </label>
        </div>
      )}

      {/* Ambient audio element — hidden, controlled by useEffect */}
      {settings.ambient !== "silence" && (
        <audio
          ref={audioRef}
          src={AUDIO_SRC[settings.ambient]}
          loop
          preload="auto"
          aria-hidden="true"
        />
      )}

      {ritualCount !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="rounded-2xl border border-border bg-card px-10 py-8 text-center shadow-lg">
            <p className="text-sm text-muted">Ready.</p>
            <p className="mt-2 text-6xl font-bold tabular-nums">{ritualCount === 0 ? "Start" : ritualCount}</p>
          </div>
        </div>
      )}
    </div>
  );
}

/** SVG ring progress — 0..1. Calm color: accent only, never red. */
function RingProgress({
  progress,
  status,
}: {
  progress: number;
  status: TimerStatus;
}) {
  const size = 220;
  const stroke = 16;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const safeProgress = Math.max(0, Math.min(1, progress));
  const dashOffset = circumference * (1 - safeProgress);

  const isDone = status === "done";
  const indicatorIcon = status === "running" ? <Volume2 size={28} /> : <VolumeX size={28} />;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} role="img" aria-label={`Session progress ${Math.round(safeProgress * 100)}%`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeOpacity={0.12}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgb(var(--accent))"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 1s linear" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-accent">
        {isDone ? <span className="text-3xl">&#10003;</span> : indicatorIcon}
      </div>
    </div>
  );
}
