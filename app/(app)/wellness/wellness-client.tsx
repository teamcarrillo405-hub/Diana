"use client";

import {
  Moon,
  X,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { DianaWordmark } from "@/components/screen-design/primitives";
import {
  logActivity,
  saveWellnessCheckIn,
} from "./actions";

type SessionMood = "good" | "meh" | "rough";
type SleepQuality = "rested" | "ok" | "rough";
type ActivityFelt = "steady" | "tired" | "energized" | "sore" | "proud" | "not_sure";

type SleepRow = {
  id: string;
  sleep_date: string;
  sleep_quality: string;
  sleep_hours: number | null;
  focus_note: string | null;
};

const MOODS: ReadonlyArray<Readonly<{ value: SessionMood; label: string }>> = [
  { value: "good", label: "Ready" },
  { value: "meh", label: "In-between" },
  { value: "rough", label: "Rough" },
];

const SLEEP_QUALITIES: ReadonlyArray<Readonly<{ value: SleepQuality; label: string }>> = [
  { value: "rested", label: "Rested" },
  { value: "ok", label: "Okay" },
  { value: "rough", label: "Rough" },
];

const ACTIVITY_LABELS: Record<string, string> = {
  walk: "Walk",
  run: "Run",
  bike: "Bike",
  team_sport: "Team sport",
  strength: "Strength",
  stretch: "Stretch",
  dance: "Dance",
  other: "Other",
};

export function WellnessClient({
  today,
  initialMood,
  sleepLogs,
}: {
  today: string;
  initialMood: SessionMood | null;
  sleepLogs: SleepRow[];
}) {
  const router = useRouter();
  const latestSleep = sleepLogs[0];
  const [mood, setMood] = useState<SessionMood>(initialMood ?? "meh");
  const [sleepQuality, setSleepQuality] = useState<SleepQuality>(
    isSleepQuality(latestSleep?.sleep_quality) ? latestSleep.sleep_quality : "ok",
  );
  const [sleepHours, setSleepHours] = useState(
    typeof latestSleep?.sleep_hours === "number" ? latestSleep.sleep_hours : 7.5,
  );
  const [activityType, setActivityType] = useState("walk");
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [felt, setFelt] = useState<ActivityFelt | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const sleepFill = `${Math.round((sleepHours / 12) * 100)}%`;

  function runAction(
    action: () => Promise<{ ok: true } | { ok: false; error: string }>,
    success: string,
    afterSuccess?: () => void,
  ) {
    setStatus(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setStatus(result.error);
        return;
      }
      setStatus(success);
      afterSuccess?.();
      router.refresh();
    });
  }

  function logMovement() {
    if (!felt) return;
    runAction(
      () => logActivity({
        activityType: activityType as "walk",
        durationMinutes,
        felt,
        loggedFor: today,
      }),
      "Activity saved privately.",
      () => setFelt(null),
    );
  }

  return (
    <>
      <header className="sd-wellness-header">
        <div className="sd-wellness-header-row">
          <DianaWordmark />
          <Link className="sd-wellness-close" href="/dashboard" aria-label="Close wellness check-in">
            <X size={20} aria-hidden="true" />
          </Link>
        </div>
        <h1>Daily wellness</h1>
      </header>

      <main className="sd-wellness-scroll">
        <section className="sd-wellness-controls" aria-label="Private wellness check-in">
          <div className="sd-wellness-control">
            <div className="sd-wellness-control-head">
              <div className="sd-wellness-control-title"><Moon size={16} aria-hidden="true" /><h2>Sleep</h2></div>
              <output htmlFor="wellness-sleep-hours">{sleepHours.toFixed(1)} hrs</output>
            </div>
            <div className="sd-wellness-range-wrap" style={{ "--sleep-fill": sleepFill } as React.CSSProperties}>
              <input
                id="wellness-sleep-hours"
                type="range"
                min="0"
                max="12"
                step="0.5"
                value={sleepHours}
                onChange={(event) => setSleepHours(Number(event.target.value))}
                aria-label="Sleep hours"
              />
              <span className="sd-wellness-range-labels"><span>Low</span><span>High</span></span>
              <span className="sd-wellness-range-marker" aria-hidden="true" />
            </div>
            <div className="sd-wellness-quality" aria-label="Sleep quality">
              {SLEEP_QUALITIES.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  aria-pressed={sleepQuality === item.value}
                  onClick={() => setSleepQuality(item.value)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="sd-wellness-control" data-tone="pink">
            <div className="sd-wellness-control-head">
              <div className="sd-wellness-control-title"><Zap size={16} aria-hidden="true" /><h2>Study readiness</h2></div>
              <output>{MOODS.find((item) => item.value === mood)?.label}</output>
            </div>
            <div className="sd-wellness-segments" aria-label="Study readiness">
              {MOODS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  aria-pressed={mood === item.value}
                  onClick={() => setMood(item.value)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

        </section>

        <section className="sd-wellness-movement-panel" aria-labelledby="wellness-movement-title">
          <form className="sd-wellness-movement-form" onSubmit={(event) => { event.preventDefault(); logMovement(); }}>
            <h2 id="wellness-movement-title">Log movement</h2>
            <div className="sd-wellness-movement-types" aria-label="Activity type">
              {Object.entries(ACTIVITY_LABELS).map(([value, label]) => (
                <button key={value} type="button" aria-pressed={activityType === value} onClick={() => setActivityType(value)}>{label}</button>
              ))}
            </div>
            <label className="sd-wellness-minutes">
              <span>Minutes</span>
              <input type="range" min="5" max="180" step="5" value={durationMinutes} onChange={(event) => setDurationMinutes(Number(event.target.value))} />
              <output>{durationMinutes}m</output>
            </label>
            <div className="sd-wellness-felt" aria-label="How movement felt">
              {(["steady", "tired", "energized", "sore", "proud"] as const).map((value) => (
                <button key={value} type="button" aria-pressed={felt === value} onClick={() => setFelt(value)}>{formatActivityFelt(value)}</button>
              ))}
            </div>
            <button className="sd-wellness-movement-submit" type="submit" disabled={pending || !felt}>{felt ? "Log it" : "Choose how it felt"}</button>
          </form>
        </section>

        {status ? <p className="sd-wellness-status" role="status">{status}</p> : null}
      </main>

      <footer className="sd-wellness-footer">
        <button
          type="button"
          className="sd-wellness-submit"
          aria-label="Log recovery activity"
          disabled={pending}
          onClick={() => runAction(
            () => saveWellnessCheckIn({
              mood,
              sleepDate: today,
              sleepQuality,
              sleepHours,
              focusNote: "",
            }),
            "Wellness check-in saved privately.",
          )}
        >
          {pending ? "Saving wellness" : "Log wellness"}
        </button>
      </footer>

    </>
  );
}

function isSleepQuality(value: unknown): value is SleepQuality {
  return value === "rested" || value === "ok" || value === "rough";
}

function formatActivityFelt(value: ActivityFelt): string {
  return value === "not_sure" ? "Not sure" : value;
}
