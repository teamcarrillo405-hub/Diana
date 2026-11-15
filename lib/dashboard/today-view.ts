import type { Assignment, ScoredAssignment } from "@/lib/scoring/next-five-minutes";
import { normalizeDashboardAssignmentTitle } from "./lobby-view";
import { isAssignmentFocusDurationMilliseconds } from "@/lib/timer/assignment-focus-actions";

export const TODAY_COLORS = ["#9828ff", "#00bfff", "#00e99a", "#ffd42a", "#f242cf", "#ff9529"];
const FINISHED = new Set(["done", "exporting", "submitted", "graded"]);
const CLOSED = new Set(["submitted", "graded", "abandoned"]);
const DAY = 86_400_000;

export type TodayAssignment = Pick<Assignment, "id" | "title" | "due_at" | "status" | "estimated_minutes" | "classes"> & { submitted_at?: string | null };
export type TodayFocusLog = { id: number; started_at: string; target_ends_at: string | null; ended_at: string | null; elapsed_minutes: number | null; focus_state: string };
export type TodayTask = { id: string; title: string; subject: string; color: string; minutes: number; due: string; date: string; day: string; month: string; ready: boolean; href: string };
export type TodayData = ReturnType<typeof buildTodayView>;

export function formatMinutes(value: number) {
  const minutes = Math.max(0, Math.round(value));
  const hours = Math.floor(minutes / 60);
  return hours ? `${hours}h${minutes % 60 ? ` ${minutes % 60}m` : ""}` : `${minutes}m`;
}

function validZone(zone: string) {
  try { new Intl.DateTimeFormat("en-US", { timeZone: zone }).format(); return zone; }
  catch { return "UTC"; }
}

export function todayDateKey(value: Date | string, timeZone: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: validZone(timeZone), year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const part = (name: string) => parts.find(p => p.type === name)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function shiftDate(key: string, days: number) {
  return new Date(Date.parse(`${key}T12:00:00Z`) + days * DAY).toISOString().slice(0, 10);
}

// Resolve local midnight independently for each date so DST weeks are not assumed to be 168 hours.
function localMidnight(key: string, zone: string): number {
  const target = Date.parse(`${key}T00:00:00Z`);
  const formatter = new Intl.DateTimeFormat("en-US", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
  let instant = target;
  for (let i = 0; i < 4; i++) {
    const parts = formatter.formatToParts(new Date(instant));
    const n = (type: string) => Number(parts.find(p => p.type === type)?.value);
    const observed = Date.UTC(n("year"), n("month") - 1, n("day"), n("hour"), n("minute"), n("second"));
    const correction = target - observed;
    instant += correction;
    if (!correction) break;
  }
  return instant;
}

export function todayWeek(now: Date, timeZone: string) {
  const zone = validZone(timeZone);
  const today = todayDateKey(now, zone);
  const weekday = (new Date(`${today}T12:00:00Z`).getUTCDay() + 6) % 7;
  const startDate = shiftDate(today, -weekday);
  const dates = Array.from({ length: 8 }, (_, i) => shiftDate(startDate, i));
  const boundaries = dates.map(date => localMidnight(date, zone));
  return { today, zone, weekday, dates, boundaries, start: new Date(boundaries[0]).toISOString(), end: new Date(boundaries[7]).toISOString(), horizon: shiftDate(today, 7) };
}

export function buildTodayView(input: {
  now: Date; timeZone: string; ranked: readonly ScoredAssignment[];
  assignments: readonly TodayAssignment[] | null; weeklyAssignments: readonly TodayAssignment[] | null;
  submittedAssignments: readonly TodayAssignment[] | null; focusLogs: readonly TodayFocusLog[] | null;
}) {
  const week = todayWeek(input.now, input.timeZone);
  const weekly = [...new Map((input.weeklyAssignments ?? []).filter(a => a.status !== "abandoned" && a.due_at && todayDateKey(a.due_at, week.zone) >= week.dates[0] && todayDateKey(a.due_at, week.zone) < week.dates[7]).map(a => [a.id, a])).values()];
  const active = [...new Map((input.assignments ?? []).filter(a => !CLOSED.has(a.status)).map(a => [a.id, a])).values()];
  const subject = (a: TodayAssignment) => (Array.isArray(a.classes) ? a.classes[0] : a.classes)?.name?.trim() || "Independent work";
  const subjectNames = [...new Set([...weekly, ...active].map(subject))].sort();
  const color = (name: string) => TODAY_COLORS[subjectNames.indexOf(name) % TODAY_COLORS.length];
  const dateLabel = (value: string | Date, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-US", { ...options, timeZone: week.zone }).format(new Date(value));
  const task = (a: TodayAssignment, minutes = a.estimated_minutes ?? 0): TodayTask => {
    const key = a.due_at ? todayDateKey(a.due_at, week.zone) : "";
    const ready = a.status === "done" || a.status === "exporting";
    const due = !key ? "No due date" : key === week.today ? "Today" : key === shiftDate(week.today, 1) ? "Tomorrow" : key < week.today ? "From earlier" : dateLabel(a.due_at!, { weekday: "short", month: "short", day: "numeric" });
    return { id: a.id, title: normalizeDashboardAssignmentTitle(a.title), subject: subject(a), color: color(subject(a)), minutes: Math.max(0, Math.round(minutes)), due: ready ? "Ready to submit" : due, date: key ? dateLabel(a.due_at!, { month: "short", day: "numeric" }) : "No due date", day: key ? key.slice(-2).replace(/^0/, "") : "", month: key ? dateLabel(a.due_at!, { month: "short" }).toUpperCase() : "", ready, href: `/assignments/${encodeURIComponent(a.id)}${ready ? "/submit" : "?focus=next-step"}` };
  };
  const ranked = input.ranked.filter(a => !FINISHED.has(a.status) && !CLOSED.has(a.status));
  const priority = ranked[0];
  const todayAssignments = ranked.filter(a => a.id !== priority?.id && a.due_at && todayDateKey(a.due_at, week.zone) === week.today);
  const plan = (priority ? [priority, ...todayAssignments] : todayAssignments).map(a => task(a, a.effective_minutes ?? a.estimated_minutes ?? 0));
  const sorted = active.sort((a, b) => (Date.parse(a.due_at ?? "") || Infinity) - (Date.parse(b.due_at ?? "") || Infinity));
  const deadlines = sorted.filter(a => a.due_at && todayDateKey(a.due_at, week.zone) >= week.today && todayDateKey(a.due_at, week.zone) < week.horizon).map(a => task(a));
  const earlierWork = sorted.filter(a => a.due_at && todayDateKey(a.due_at, week.zone) < week.today).map(a => task(a));
  const otherReady = sorted.filter(a => (a.status === "done" || a.status === "exporting") && !deadlines.some(t => t.id === a.id) && !earlierWork.some(t => t.id === a.id)).map(a => task(a));
  const subjects = subjectNames.map(name => ({ name, color: color(name), minutes: weekly.filter(a => subject(a) === name).reduce((sum, a) => sum + Math.max(0, a.estimated_minutes ?? 0), 0) })).filter(s => s.minutes > 0).sort((a, b) => b.minutes - a.minutes);
  const planned = Array<number>(7).fill(0);
  const studied = Array<number>(7).fill(0);
  let sessions = 0;
  const addInterval = (values: number[], start: number, end: number, minutes: number) => {
    if (!(end > start) || !Number.isFinite(minutes) || minutes < 0) return;
    for (let i = 0; i < 7; i++) {
      const overlap = Math.max(0, Math.min(end, week.boundaries[i + 1]) - Math.max(start, week.boundaries[i]));
      values[i] += minutes * overlap / (end - start);
    }
  };
  for (const log of new Map((input.focusLogs ?? []).map(log => [log.id, log])).values()) {
    const start = Date.parse(log.started_at);
    const target = Date.parse(log.target_ends_at ?? "");
    if (!isAssignmentFocusDurationMilliseconds(target - start) || start > input.now.getTime()) continue;
    addInterval(planned, start, target, (target - start) / 60_000);
    const end = Date.parse(log.ended_at ?? "");
    if (log.focus_state !== "completed" || !(end > start) || end > input.now.getTime() || log.elapsed_minutes === null || !Number.isFinite(log.elapsed_minutes) || log.elapsed_minutes < 0) continue;
    addInterval(studied, start, end, log.elapsed_minutes);
    if (end >= week.boundaries[0] && end < week.boundaries[7]) sessions++;
  }
  const submitted = new Set((input.submittedAssignments ?? []).filter(a => ["submitted", "graded"].includes(a.status) && a.submitted_at && Date.parse(a.submitted_at) <= input.now.getTime() && todayDateKey(a.submitted_at, week.zone) >= week.dates[0] && todayDateKey(a.submitted_at, week.zone) < week.dates[7]).map(a => a.id)).size;
  return { plan, deadlines, earlierWork, otherReady, subjects, total: weekly.length, finished: weekly.filter(a => FINISHED.has(a.status)).length, submitted, sessions, planned: planned.map(Math.round), studied: studied.map(Math.round), currentDay: week.weekday, today: week.today, dateLabel: dateLabel(input.now, { weekday: "long", month: "short", day: "numeric" }), weekLabel: `${dateLabel(new Date(week.boundaries[0]), { month: "short", day: "numeric" })} - ${dateLabel(new Date(week.boundaries[7] - 1), { month: "short", day: "numeric" })}`, horizonLabel: dateLabel(new Date(localMidnight(week.horizon, week.zone) - 1), { weekday: "long", month: "short", day: "numeric" }), assignmentsUnavailable: input.assignments === null, weeklyUnavailable: input.weeklyAssignments === null, studyUnavailable: input.focusLogs === null, submissionsUnavailable: input.submittedAssignments === null };
}
