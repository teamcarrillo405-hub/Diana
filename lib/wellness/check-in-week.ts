import { lobbyCheckInDayKey, type LobbyEnergy } from "@/lib/dashboard/lobby-check-in";
import { getWellnessWindowDates, type WellnessActivityRecord, type WellnessSleepRecord } from "./history";

export type CheckInWeekDay = {
  date: string;
  energy: LobbyEnergy | null;
  sleepHours: number | null;
  activityMinutes: number | null;
};

export type CheckInWeek = { days: CheckInWeekDay[]; unavailable?: boolean };

export function checkInWeekRange(today: string) {
  const start = new Date(`${today}T00:00:00Z`);
  start.setUTCDate(start.getUTCDate() - 6);
  const firstDay = start.toISOString().slice(0, 10);
  // Include the preceding UTC day so the first local day is complete in every time zone.
  start.setUTCDate(start.getUTCDate() - 1);
  return { firstDay, lastDay: today, energySince: start.toISOString() };
}

type EnergyRecord = { occurred_at: string; energy: unknown };

export function buildCheckInWeek({ firstDay, lastDay, timeZone, energyLogs, sleepLogs, activityLogs }: {
  firstDay: string;
  lastDay: string;
  timeZone: string;
  energyLogs: readonly EnergyRecord[] | null;
  sleepLogs: readonly WellnessSleepRecord[] | null;
  activityLogs: readonly WellnessActivityRecord[] | null;
}): CheckInWeek {
  const days = getWellnessWindowDates(firstDay, lastDay).map<CheckInWeekDay>(date => ({
    date, energy: null, sleepHours: null, activityMinutes: null,
  }));
  const byDate = new Map(days.map(day => [day.date, day]));
  const energyTimes = new Map<string, number>();

  for (const log of energyLogs ?? []) {
    const { energy } = log;
    if (energy !== "low" && energy !== "okay" && energy !== "good") continue;
    const instant = new Date(log.occurred_at);
    const time = instant.getTime();
    if (!Number.isFinite(time)) continue;
    const date = lobbyCheckInDayKey(instant, timeZone);
    const day = byDate.get(date);
    // For equal timestamps, the query returns the newest signal ID first.
    if (!day || time <= (energyTimes.get(date) ?? -Infinity)) continue;
    day.energy = energy;
    energyTimes.set(date, time);
  }

  for (const log of sleepLogs ?? []) {
    const day = byDate.get(log.sleep_date);
    if (day && log.sleep_hours !== null && Number.isFinite(log.sleep_hours)) day.sleepHours = log.sleep_hours;
  }

  for (const log of activityLogs ?? []) {
    const day = byDate.get(log.logged_for);
    if (day && Number.isFinite(log.duration_minutes)) {
      day.activityMinutes = (day.activityMinutes ?? 0) + log.duration_minutes;
    }
  }

  return { days, unavailable: energyLogs === null || sleepLogs === null || activityLogs === null };
}
