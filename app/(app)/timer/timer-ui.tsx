"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { Eye, EyeOff, Pause, Play, Plus, RotateCcw } from "lucide-react";

import { adaptiveBreakMinutes, type SessionMood } from "@/lib/executive/session";
import type { TimerStatus } from "@/lib/timer/timer";
import { useTimer } from "@/lib/timer/use-timer";
import { finishFocusSession, startFocusSession } from "./actions";

type AmbientSound = "silence" | "rain" | "white-noise";
interface PersistedSettings {
  workMin: number;
  breakMin: number;
  ambient: AmbientSound;
  showCountdown: boolean;
  premackReward: string;
}
interface FocusAssignment {
  id: string;
  title: string;
  kind: string;
  estimatedMinutes: number | null;
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
  rain: "/sounds/rain.mp3",
  "white-noise": "/sounds/white-noise.mp3",
};

function loadSettings(): PersistedSettings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<PersistedSettings>) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

function saveSettings(settings: PersistedSettings) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // The timer remains usable when browser storage is unavailable.
  }
}

function formatMs(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(total / 60).toString().padStart(2, "0")}:${(total % 60).toString().padStart(2, "0")}`;
}

function statusLabel(state: ReturnType<typeof useTimer>["state"]): string {
  if (state.status === "idle") return "Ready when you are";
  if (state.status === "paused") return "Paused";
  if (state.status === "done") return "Session complete";
  return state.phase === "break" ? "Break time" : "Locked in";
}

export function TimerUi({
  assignment,
  roughMode = false,
  sessionMood = null,
  difficulty = null,
}: {
  assignment: FocusAssignment | null;
  roughMode?: boolean;
  sessionMood?: SessionMood;
  difficulty?: number | null;
}) {
  const { state, start, pause, resume, reset } = useTimer();
  const [settings, setSettings] = useState<PersistedSettings>(DEFAULTS);
  const [ritualCount, setRitualCount] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const loaded = loadSettings();
    setSettings(roughMode ? {
      ...loaded,
      workMin: Math.min(loaded.workMin, 10),
      breakMin: Math.max(loaded.breakMin, 5),
      showCountdown: false,
    } : loaded);
  }, [roughMode]);
  useEffect(() => saveSettings(settings), [settings]);
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (state.status === "running" && settings.ambient !== "silence") audio.play().catch(() => undefined);
    else audio.pause();
  }, [settings.ambient, state.status]);

  const adaptiveBreak = adaptiveBreakMinutes({
    workMinutes: settings.workMin,
    baseBreakMinutes: settings.breakMin,
    mood: roughMode ? "rough" : sessionMood,
    difficulty,
  });
  const totalPhaseMs = state.phase === "work"
    ? state.workMin * 60_000
    : state.phase === "break"
      ? state.breakMin * 60_000
      : settings.workMin * 60_000;
  const remainingMs = state.status === "idle" ? totalPhaseMs : state.remainingMs;
  const progress = totalPhaseMs > 0 ? 1 - remainingMs / totalPhaseMs : 0;
  const isIdleOrDone = state.status === "idle" || state.status === "done";

  function beginRitual() {
    if (!assignment || ritualCount !== null || pending) return;
    setMessage(null);
    startTransition(async () => {
      const result = await startFocusSession({ assignmentId: assignment.id });
      if (!result.ok) return setMessage(result.error);
      setRitualCount(3);
    });
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
    const timeout = window.setTimeout(() => {
      setRitualCount((value) => value === null ? null : value - 1);
    }, 800);
    return () => window.clearTimeout(timeout);
  }, [adaptiveBreak, ritualCount, settings.premackReward, settings.workMin, start]);

  function endSession() {
    if (!assignment || pending) return;
    setMessage(null);
    startTransition(async () => {
      const result = await finishFocusSession({ assignmentId: assignment.id });
      if (!result.ok) return setMessage(result.error);
      reset();
      setMessage("Session saved. Take a breath before the next block.");
    });
  }

  return (
    <div className="sd-focus-ui">
      <main className="sd-focus-scroll">
        <RingProgress progress={progress} status={state.status}>
          {settings.showCountdown && !isIdleOrDone ? <strong>{formatMs(state.remainingMs)}</strong> : null}
          <span>{statusLabel(state)}</span>
        </RingProgress>

        <section className="sd-focus-coach" aria-label="Session guidance">
          <div aria-hidden="true">{[0, 1, 2, 3, 4, 5].map((bar) => <i key={bar} />)}</div>
          <p>{state.phase === "break"
            ? "Let the last block settle. The next step can wait a moment."
            : "Maintain this pace. One clear step is enough for this block."}</p>
        </section>

        <section className="sd-focus-progress">
          <div><span>Task progress</span><strong>{assignment ? "Step 1 of 3" : "Choose a task"}</strong></div>
          <div aria-hidden="true"><i /><i /><i /></div>
          <h2>{assignment?.title ?? "No active task yet"}</h2>
          <p>{assignment ? `${assignment.kind} · ${assignment.estimatedMinutes ?? settings.workMin} min plan` : "Open Work to choose what this session supports."}</p>
        </section>

        {isIdleOrDone ? (
          <details className="sd-focus-settings">
            <summary>Session settings</summary>
            <label><span>Work block: {settings.workMin} min</span><input type="range" min={5} max={60} step={5} value={settings.workMin} onChange={(event) => setSettings({ ...settings, workMin: Number(event.target.value) })} /></label>
            <label><span>Preferred break: {settings.breakMin} min</span><input type="range" min={1} max={30} value={settings.breakMin} onChange={(event) => setSettings({ ...settings, breakMin: Number(event.target.value) })} /></label>
            <label><span>After this block</span><input type="text" maxLength={120} value={settings.premackReward} onChange={(event) => setSettings({ ...settings, premackReward: event.target.value })} placeholder="A calm reward" /></label>
            <label><span>Ambient sound</span><select value={settings.ambient} onChange={(event) => setSettings({ ...settings, ambient: event.target.value as AmbientSound })}><option value="silence">Silence</option><option value="rain">Rain</option><option value="white-noise">White noise</option></select></label>
            <label className="sd-focus-countdown-toggle"><input type="checkbox" checked={settings.showCountdown} onChange={(event) => setSettings({ ...settings, showCountdown: event.target.checked })} />{settings.showCountdown ? <Eye aria-hidden="true" /> : <EyeOff aria-hidden="true" />}Show countdown number</label>
            {adaptiveBreak !== settings.breakMin ? <small>Today&apos;s break is {adaptiveBreak} minutes based on the current check-in.</small> : null}
          </details>
        ) : null}
        <p className="sd-focus-status" role="status">{message}</p>
      </main>

      <button className="sd-focus-quick-add" type="button" aria-label="Quick capture"><Plus aria-hidden="true" /></button>
      <footer className="sd-focus-footer">
        {isIdleOrDone ? (
          <button type="button" className="sd-focus-primary" onClick={beginRitual} disabled={!assignment || pending}>
            <Play aria-hidden="true" />{pending ? "Starting session" : "Start focus session"}
          </button>
        ) : (
          <>
            <button type="button" onClick={state.status === "paused" ? resume : pause}>{state.status === "paused" ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}{state.status === "paused" ? "Resume" : "Pause"}</button>
            <button type="button" className="sd-focus-primary" onClick={endSession} disabled={pending}><RotateCcw aria-hidden="true" />{pending ? "Saving" : "End session"}</button>
          </>
        )}
      </footer>

      {settings.ambient !== "silence" ? <audio ref={audioRef} src={AUDIO_SRC[settings.ambient]} loop preload="none" aria-hidden="true" /> : null}
      {ritualCount !== null ? <div className="sd-focus-ritual" role="status" aria-live="polite"><span>Ready</span><strong>{ritualCount === 0 ? "Start" : ritualCount}</strong></div> : null}
    </div>
  );
}

function RingProgress({ progress, status, children }: { progress: number; status: TimerStatus; children: ReactNode }) {
  const circumference = 2 * Math.PI * 135;
  const safeProgress = Math.max(0, Math.min(1, progress));
  return (
    <div className="sd-focus-ring">
      <svg viewBox="0 0 288 288" role="img" aria-label={`Session progress ${Math.round(safeProgress * 100)}%`}>
        <defs><linearGradient id="sd-focus-gradient" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#ff79da" /><stop offset="100%" stopColor="#74c0ff" /></linearGradient></defs>
        <circle cx="144" cy="144" r="135" fill="none" stroke="currentColor" strokeOpacity="0.06" strokeWidth="10" />
        <circle cx="144" cy="144" r="135" fill="none" stroke="url(#sd-focus-gradient)" strokeWidth="14" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - safeProgress)} transform="rotate(-90 144 144)" />
      </svg>
      <div>{children}</div><span className="sr-only">{status}</span>
    </div>
  );
}
