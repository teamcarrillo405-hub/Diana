"use client";

import {
  Activity,
  Moon,
  Plus,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { DianaWordmark } from "@/components/screen-design/primitives";
import { wellnessRecoveryCopy } from "@/lib/screendesign/support-screens";
import {
  logActivity,
  saveWellnessCheckIn,
  saveWellnessGoal,
} from "./actions";

type SessionMood = "good" | "meh" | "rough";
type SleepQuality = "rested" | "ok" | "rough";

type ActivityRow = {
  id: string;
  logged_for: string;
  activity_type: string;
  duration_minutes: number;
  felt: string;
  notes: string | null;
};

type GoalRow = {
  id: string;
  title: string;
  category: string;
  target_text: string;
  next_step: string | null;
};

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
  activityLogs,
  goals,
  sleepLogs,
}: {
  today: string;
  initialMood: SessionMood | null;
  activityLogs: ActivityRow[];
  goals: GoalRow[];
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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<"activity" | "goal">("activity");
  const [activityType, setActivityType] = useState("walk");
  const [durationMinutes, setDurationMinutes] = useState(20);
  const [felt, setFelt] = useState("steady");
  const [activityNotes, setActivityNotes] = useState("");
  const [goalTitle, setGoalTitle] = useState("");
  const [goalCategory, setGoalCategory] = useState("recovery");
  const [goalTarget, setGoalTarget] = useState("");
  const [goalStep, setGoalStep] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const recovery = useMemo(
    () => wellnessRecoveryCopy(mood, sleepQuality),
    [mood, sleepQuality],
  );
  const sleepFill = `${Math.round((sleepHours / 12) * 100)}%`;

  function runAction(
    action: () => Promise<{ ok: true } | { ok: false; error: string }>,
    success: string,
    closeDrawer = false,
  ) {
    setStatus(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setStatus(result.error);
        return;
      }
      setStatus(success);
      if (closeDrawer) setDrawerOpen(false);
      router.refresh();
    });
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
        <p>Study energy check-in</p>
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

        <section className="sd-wellness-forecast" aria-live="polite">
          <div className="sd-wellness-forecast-head">
            <span className="sd-wellness-forecast-icon"><Sparkles size={19} aria-hidden="true" /></span>
            <h2>Recovery plan</h2>
          </div>
          <h3>{recovery.title}</h3>
          <p>{recovery.body}</p>
        </section>

        <section className="sd-wellness-private-log" aria-label="Private wellness log">
          <h2>Private log</h2>
          <div className="sd-wellness-private-items">
            {activityLogs[0] ? (
              <div className="sd-wellness-private-item">
                <strong>{ACTIVITY_LABELS[activityLogs[0].activity_type] ?? "Activity"}</strong>
                <small>{activityLogs[0].duration_minutes} min · {activityLogs[0].logged_for}</small>
              </div>
            ) : null}
            {goals[0] ? (
              <div className="sd-wellness-private-item">
                <strong>{goals[0].title}</strong>
                <small>{goals[0].category} goal</small>
              </div>
            ) : null}
            {latestSleep ? (
              <div className="sd-wellness-private-item">
                <strong>{labelize(latestSleep.sleep_quality)} sleep</strong>
                <small>{latestSleep.sleep_hours ?? "Hours open"} · {latestSleep.sleep_date}</small>
              </div>
            ) : null}
          </div>
        </section>

        {status ? <p className="sd-wellness-status" role="status">{status}</p> : null}
      </main>

      <button
        type="button"
        className="sd-wellness-quick"
        aria-label="Add activity or goal"
        aria-expanded={drawerOpen}
        disabled={pending}
        onClick={() => setDrawerOpen(true)}
      >
        <Plus size={30} aria-hidden="true" />
      </button>

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

      {drawerOpen ? (
        <>
          <button className="sd-wellness-drawer-backdrop" type="button" aria-label="Close quick log" onClick={() => setDrawerOpen(false)} />
          <section className="sd-wellness-drawer" role="dialog" aria-modal="true" aria-labelledby="wellness-drawer-title">
            <div className="sd-wellness-drawer-head">
              <h2 id="wellness-drawer-title">Quick log</h2>
              <button className="sd-wellness-drawer-close" type="button" aria-label="Close quick log" onClick={() => setDrawerOpen(false)}><X size={17} aria-hidden="true" /></button>
            </div>
            <div className="sd-wellness-drawer-tabs" aria-label="Quick log type">
              <button type="button" aria-pressed={drawerTab === "activity"} onClick={() => setDrawerTab("activity")}>Activity</button>
              <button type="button" aria-pressed={drawerTab === "goal"} onClick={() => setDrawerTab("goal")}>Goal</button>
            </div>
            {drawerTab === "activity" ? (
              <form className="sd-wellness-form" onSubmit={(event) => {
                event.preventDefault();
                runAction(
                  () => logActivity({
                    activityType: activityType as "walk",
                    durationMinutes,
                    felt: felt as "steady",
                    notes: activityNotes,
                    loggedFor: today,
                  }),
                  "Activity saved privately.",
                  true,
                );
              }}>
                <label>Activity<select value={activityType} onChange={(event) => setActivityType(event.target.value)}>{Object.entries(ACTIVITY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                <label>Minutes<input type="number" min="1" max="720" value={durationMinutes} onChange={(event) => setDurationMinutes(Number(event.target.value))} /></label>
                <label>How it felt<select value={felt} onChange={(event) => setFelt(event.target.value)}><option value="steady">Steady</option><option value="tired">Tired</option><option value="energized">Energized</option><option value="sore">Sore</option><option value="proud">Proud</option><option value="not_sure">Not sure</option></select></label>
                <label>Optional note<textarea maxLength={600} value={activityNotes} onChange={(event) => setActivityNotes(event.target.value)} /></label>
                <button type="submit" disabled={pending}><Activity size={14} aria-hidden="true" /> Save activity</button>
              </form>
            ) : (
              <form className="sd-wellness-form" onSubmit={(event) => {
                event.preventDefault();
                runAction(
                  () => saveWellnessGoal({
                    title: goalTitle,
                    category: goalCategory as "recovery",
                    targetText: goalTarget,
                    nextStep: goalStep,
                  }),
                  "Goal saved privately.",
                  true,
                );
              }}>
                <label>Goal title<input minLength={2} maxLength={120} required value={goalTitle} onChange={(event) => setGoalTitle(event.target.value)} /></label>
                <label>Category<select value={goalCategory} onChange={(event) => setGoalCategory(event.target.value)}><option value="skill">Skill</option><option value="endurance">Endurance</option><option value="strength">Strength</option><option value="flexibility">Flexibility</option><option value="consistency">Consistency</option><option value="recovery">Recovery</option></select></label>
                <label>What you are practicing<textarea minLength={2} maxLength={400} required value={goalTarget} onChange={(event) => setGoalTarget(event.target.value)} /></label>
                <label>Next small step<input maxLength={300} value={goalStep} onChange={(event) => setGoalStep(event.target.value)} /></label>
                <button type="submit" disabled={pending}>Save goal</button>
              </form>
            )}
          </section>
        </>
      ) : null}
    </>
  );
}

function isSleepQuality(value: unknown): value is SleepQuality {
  return value === "rested" || value === "ok" || value === "rough";
}

function labelize(value: string): string {
  return value.replaceAll("_", " ").replace(/\b\w/gu, (letter) => letter.toUpperCase());
}
