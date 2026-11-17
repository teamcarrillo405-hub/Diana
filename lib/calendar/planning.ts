import { isValid, parseISO, format, getISODay } from "date-fns";
import { lobbyCheckInDayKey, lobbyCheckInFromSignalValue } from "@/lib/dashboard/lobby-check-in";
import { readinessFromSignalValue } from "@/lib/support/policy";

export type CalendarWeekPlan = { weekStart: string; availableMinutes: number };

export function validWeekPlan(input: { weekStart: string; availableMinutes: number | null }): boolean {
  if (!input || typeof input.weekStart !== "string" || (input.availableMinutes !== null && typeof input.availableMinutes !== "number")) return false;
  const day = parseISO(input.weekStart);
  return /^\d{4}-\d{2}-\d{2}$/.test(input.weekStart) && isValid(day)
    && format(day, "yyyy-MM-dd") === input.weekStart && getISODay(day) === 1
    && (input.availableMinutes === null || Number.isInteger(input.availableMinutes)
      && input.availableMinutes >= 0 && input.availableMinutes <= 7 * 24 * 60);
}

/** Only the student's latest check-in for today can suggest a gentler block. */
export function calendarPlanningSupport(signals: Array<{ value: unknown; occurred_at: string }>, now: Date, timeZone: string) {
  const today = lobbyCheckInDayKey(now, timeZone);
  const recent = signals.filter(signal => {
    const time = new Date(signal.occurred_at).getTime();
    return Number.isFinite(time) && time <= now.getTime() && lobbyCheckInDayKey(signal.occurred_at, timeZone) === today;
  }).sort((a, b) => b.occurred_at.localeCompare(a.occurred_at))[0];
  const checkIn = lobbyCheckInFromSignalValue(recent?.value);
  const readiness = readinessFromSignalValue(recent?.value);
  if (checkIn?.energy === "low" || readiness?.body === "low" || readiness?.focus === "scattered") {
    return { planningNote: "Based on today’s check-in, a 15-minute block with a break may feel more manageable. You choose what to plan.", suggestedBlockMinutes: 15 };
  }
  return { planningNote: null, suggestedBlockMinutes: null };
}

export function studyTimeLabel(minutes: number) {
  const rounded = Math.max(0, Math.round(minutes));
  const hours = Math.floor(rounded / 60);
  const rest = rounded % 60;
  return hours ? `${hours}h${rest ? ` ${rest}m` : ""}` : `${rest}m`;
}
