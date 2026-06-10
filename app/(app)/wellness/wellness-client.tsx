"use client";

import { useState, useTransition, type ReactNode } from "react";
import {
  createFirstAidStudyCards,
  logActivity,
  saveSleepLog,
  saveWellnessGoal,
} from "./actions";

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

const FELT_LABELS: Record<string, string> = {
  steady: "Steady",
  tired: "Tired",
  energized: "Energized",
  sore: "Sore",
  proud: "Proud",
  not_sure: "Not sure",
};

export function WellnessClient({
  today,
  activityLogs,
  goals,
  sleepLogs,
}: {
  today: string;
  activityLogs: ActivityRow[];
  goals: GoalRow[];
  sleepLogs: SleepRow[];
}) {
  const [activityType, setActivityType] = useState("walk");
  const [durationMinutes, setDurationMinutes] = useState(20);
  const [felt, setFelt] = useState("steady");
  const [activityNotes, setActivityNotes] = useState("");
  const [goalTitle, setGoalTitle] = useState("");
  const [goalCategory, setGoalCategory] = useState("skill");
  const [goalTarget, setGoalTarget] = useState("");
  const [goalStep, setGoalStep] = useState("");
  const [sleepDate, setSleepDate] = useState(today);
  const [sleepQuality, setSleepQuality] = useState("ok");
  const [sleepHours, setSleepHours] = useState("");
  const [focusNote, setFocusNote] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<{ ok: true; count?: number } | { ok: false; error: string }>, success: string) {
    setStatus(null);
    startTransition(async () => {
      const result = await action();
      setStatus(result.ok ? success.replace("{count}", String(result.count ?? "")) : result.error);
    });
  }

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-display">Wellness</h1>
        <p className="text-muted">Movement, goals, sleep, and health class study support.</p>
      </header>

      {status && (
        <div className="rounded-md border border-border bg-card px-3 py-2 text-sm text-muted" role="status">
          {status}
        </div>
      )}

      <section className="grid gap-4 lg:grid-cols-2">
        <form
          className="space-y-4 rounded-xl border border-border bg-card p-5"
          onSubmit={(event) => {
            event.preventDefault();
            run(
              () => logActivity({
                activityType: activityType as any,
                durationMinutes,
                felt: felt as any,
                notes: activityNotes,
                loggedFor: today,
              }),
              "Movement logged.",
            );
          }}
        >
          <div>
            <h2 className="text-lg font-semibold">Activity log</h2>
            <p className="text-sm text-muted">Track what you did and how it felt.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="font-medium">Type</span>
              <select value={activityType} onChange={(e) => setActivityType(e.target.value)} className="w-full rounded-md border border-border bg-background px-3 py-2">
                {Object.entries(ACTIVITY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium">Minutes</span>
              <input type="number" min={1} max={720} value={durationMinutes} onChange={(e) => setDurationMinutes(Number(e.target.value))} className="w-full rounded-md border border-border bg-background px-3 py-2" />
            </label>
          </div>
          <label className="space-y-1 text-sm">
            <span className="font-medium">How it felt</span>
            <select value={felt} onChange={(e) => setFelt(e.target.value)} className="w-full rounded-md border border-border bg-background px-3 py-2">
              {Object.entries(FELT_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <textarea value={activityNotes} onChange={(e) => setActivityNotes(e.target.value)} rows={3} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" placeholder="Optional note for class or yourself." />
          <button disabled={pending} className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-50">Save activity</button>
        </form>

        <form
          className="space-y-4 rounded-xl border border-border bg-card p-5"
          onSubmit={(event) => {
            event.preventDefault();
            run(
              () => saveSleepLog({
                sleepDate,
                sleepQuality: sleepQuality as any,
                sleepHours: sleepHours ? Number(sleepHours) : null,
                focusNote,
              }),
              "Sleep logged. Dashboard task sizing will use it.",
            );
          }}
        >
          <div>
            <h2 className="text-lg font-semibold">Sleep + recovery</h2>
            <p className="text-sm text-muted">Sleep can adjust the next task size on your dashboard.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="font-medium">Date</span>
              <input type="date" value={sleepDate} onChange={(e) => setSleepDate(e.target.value)} className="w-full rounded-md border border-border bg-background px-3 py-2" />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium">Quality</span>
              <select value={sleepQuality} onChange={(e) => setSleepQuality(e.target.value)} className="w-full rounded-md border border-border bg-background px-3 py-2">
                <option value="rested">Rested</option>
                <option value="ok">OK</option>
                <option value="rough">Rough</option>
              </select>
            </label>
          </div>
          <label className="space-y-1 text-sm">
            <span className="font-medium">Hours (optional)</span>
            <input type="number" min={0} max={18} step={0.5} value={sleepHours} onChange={(e) => setSleepHours(e.target.value)} className="w-full rounded-md border border-border bg-background px-3 py-2" />
          </label>
          <textarea value={focusNote} onChange={(e) => setFocusNote(e.target.value)} rows={3} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" placeholder="Optional focus note for tomorrow." />
          <button disabled={pending} className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-50">Save sleep</button>
        </form>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <form
          className="space-y-4 rounded-xl border border-border bg-card p-5"
          onSubmit={(event) => {
            event.preventDefault();
            run(
              () => saveWellnessGoal({
                title: goalTitle,
                category: goalCategory as any,
                targetText: goalTarget,
                nextStep: goalStep,
              }),
              "Goal saved.",
            );
          }}
        >
          <div>
            <h2 className="text-lg font-semibold">Personal goal</h2>
            <p className="text-sm text-muted">Set a goal around skill, consistency, strength, flexibility, endurance, or recovery.</p>
          </div>
          <input value={goalTitle} onChange={(e) => setGoalTitle(e.target.value)} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" placeholder="Goal title" />
          <select value={goalCategory} onChange={(e) => setGoalCategory(e.target.value)} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
            <option value="skill">Skill</option>
            <option value="endurance">Endurance</option>
            <option value="strength">Strength</option>
            <option value="flexibility">Flexibility</option>
            <option value="consistency">Consistency</option>
            <option value="recovery">Recovery</option>
          </select>
          <textarea value={goalTarget} onChange={(e) => setGoalTarget(e.target.value)} rows={3} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" placeholder="What are you practicing?" />
          <input value={goalStep} onChange={(e) => setGoalStep(e.target.value)} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" placeholder="Next small step" />
          <button disabled={pending} className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-50">Save goal</button>
        </form>

        <div className="space-y-4 rounded-xl border border-border bg-card p-5">
          <div>
            <h2 className="text-lg font-semibold">CPR / first aid study</h2>
            <p className="text-sm text-muted">Add a starter set to your spaced repetition deck.</p>
          </div>
          <button
            type="button"
            disabled={pending}
            onClick={() => run(createFirstAidStudyCards, "Added {count} study cards.")}
            className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Add study cards
          </button>
          <p className="text-xs text-muted">Use your class protocol for practice and certification steps.</p>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <RecentList title="Recent activity" empty="No activity logged yet.">
          {activityLogs.map((item) => (
            <li key={item.id} className="rounded-md border border-border bg-card p-3 text-sm">
              <p className="font-medium">{ACTIVITY_LABELS[item.activity_type] ?? item.activity_type} - {item.duration_minutes} min</p>
              <p className="text-muted">{FELT_LABELS[item.felt] ?? item.felt} - {item.logged_for}</p>
              {item.notes && <p className="mt-1 text-muted">{item.notes}</p>}
            </li>
          ))}
        </RecentList>
        <RecentList title="Active goals" empty="No active goals yet.">
          {goals.map((goal) => (
            <li key={goal.id} className="rounded-md border border-border bg-card p-3 text-sm">
              <p className="font-medium">{goal.title}</p>
              <p className="text-muted">{goal.target_text}</p>
              {goal.next_step && <p className="mt-1 text-accent">{goal.next_step}</p>}
            </li>
          ))}
        </RecentList>
        <RecentList title="Sleep notes" empty="No sleep logs yet.">
          {sleepLogs.map((sleep) => (
            <li key={sleep.id} className="rounded-md border border-border bg-card p-3 text-sm">
              <p className="font-medium">{sleep.sleep_date} - {sleep.sleep_quality}</p>
              <p className="text-muted">{sleep.sleep_hours ? `${sleep.sleep_hours} hours` : "Hours not added"}</p>
              {sleep.focus_note && <p className="mt-1 text-muted">{sleep.focus_note}</p>}
            </li>
          ))}
        </RecentList>
      </section>
    </div>
  );
}

function RecentList({ title, empty, children }: { title: string; empty: string; children: ReactNode }) {
  const hasItems = Array.isArray(children) ? children.some(Boolean) : Boolean(children);
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-medium uppercase tracking-wider text-muted">{title}</h2>
      {hasItems ? <ul className="space-y-2">{children}</ul> : <p className="rounded-md border border-border bg-card p-3 text-sm text-muted">{empty}</p>}
    </div>
  );
}
