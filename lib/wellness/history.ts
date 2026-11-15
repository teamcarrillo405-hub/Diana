export type WellnessMood = "good" | "meh" | "rough";

export type WellnessSleepRecord = {
  sleep_date: string;
  sleep_hours: number | null;
};

export type WellnessActivityRecord = {
  logged_for: string;
  duration_minutes: number;
};

export type WellnessMoodRecord = {
  occurred_at: string;
  value: unknown;
};

export type WellnessYearArchive = {
  logged_for: string;
  check_in_completed: boolean;
  energy_total: number;
  energy_samples: number;
  sleep_total: number;
  sleep_samples: number;
  movement_minutes: number;
};

export type WellnessDayRecord = {
  date: string;
  energy: WellnessMood | null;
  energyLevel: number | null;
  sleepHours: number | null;
  movementMinutes: number;
  checkedIn: boolean;
};

export type WellnessDashboardSummary = {
  monthlyCheckInPercent: number;
  monthlyCheckInDays: number;
  monthlyDayCount: number;
  averageEnergy: number | null;
  averageSleepHours: number | null;
  averageMovementMinutes: number | null;
  dailyRecords: WellnessDayRecord[];
};

type WellnessHistoryInput = {
  today: string;
  sleepLogs: WellnessSleepRecord[];
  activityLogs: WellnessActivityRecord[];
  moodLogs: WellnessMoodRecord[];
  archivedDays?: WellnessYearArchive[];
};

type WellnessTotals = {
  checkInDays: number;
  energyTotal: number;
  energySamples: number;
  sleepTotal: number;
  sleepSamples: number;
  movementMinutes: number;
};

export function buildWellnessDashboardSummary(input: WellnessHistoryInput): WellnessDashboardSummary {
  const dailyRecords = buildDailyWellnessRecords(input);
  const monthPrefix = input.today.slice(0, 7);
  const daysElapsed = daysInCurrentMonthThrough(input.today);
  const monthlyCheckInDays = dailyRecords.filter(
    (record) => record.date.startsWith(monthPrefix) && record.checkedIn,
  ).length;
  const currentTotals = dailyRecords.reduce<WellnessTotals>(
    (totals, record) => ({
      checkInDays: totals.checkInDays + (record.checkedIn ? 1 : 0),
      energyTotal: totals.energyTotal + (record.energyLevel ?? 0),
      energySamples: totals.energySamples + (record.energyLevel === null ? 0 : 1),
      sleepTotal: totals.sleepTotal + (record.sleepHours ?? 0),
      sleepSamples: totals.sleepSamples + (record.sleepHours === null ? 0 : 1),
      movementMinutes: totals.movementMinutes + record.movementMinutes,
    }),
    emptyTotals(),
  );
  const archivedTotals = (input.archivedDays ?? []).reduce<WellnessTotals>(
    (totals, record) => ({
      checkInDays: totals.checkInDays + (record.check_in_completed ? 1 : 0),
      energyTotal: totals.energyTotal + record.energy_total,
      energySamples: totals.energySamples + record.energy_samples,
      sleepTotal: totals.sleepTotal + record.sleep_total,
      sleepSamples: totals.sleepSamples + record.sleep_samples,
      movementMinutes: totals.movementMinutes + record.movement_minutes,
    }),
    emptyTotals(),
  );
  const yearTotals = addTotals(currentTotals, archivedTotals);

  return {
    monthlyCheckInPercent: daysElapsed === 0
      ? 0
      : Math.round((monthlyCheckInDays / daysElapsed) * 100),
    monthlyCheckInDays,
    monthlyDayCount: daysElapsed,
    averageEnergy: average(yearTotals.energyTotal, yearTotals.energySamples),
    averageSleepHours: average(yearTotals.sleepTotal, yearTotals.sleepSamples),
    averageMovementMinutes: average(yearTotals.movementMinutes, yearTotals.checkInDays),
    dailyRecords,
  };
}

export function buildDailyWellnessRecords(input: Omit<WellnessHistoryInput, "archivedDays">): WellnessDayRecord[] {
  const records = new Map<string, WellnessDayRecord>();
  const ensureRecord = (date: string): WellnessDayRecord => {
    const existing = records.get(date);
    if (existing) return existing;
    const next: WellnessDayRecord = {
      date,
      energy: null,
      energyLevel: null,
      sleepHours: null,
      movementMinutes: 0,
      checkedIn: false,
    };
    records.set(date, next);
    return next;
  };

  for (const sleep of input.sleepLogs) {
    if (!isIsoDate(sleep.sleep_date)) continue;
    const record = ensureRecord(sleep.sleep_date);
    record.sleepHours = finiteNumberOrNull(sleep.sleep_hours);
    record.checkedIn = true;
  }

  for (const activity of input.activityLogs) {
    if (!isIsoDate(activity.logged_for)) continue;
    const record = ensureRecord(activity.logged_for);
    record.movementMinutes += Math.max(0, Math.round(activity.duration_minutes));
  }

  const moodsByDate = new Map<string, { occurredAt: string; mood: WellnessMood; level: number }>();
  for (const moodLog of input.moodLogs) {
    const parsed = parseMoodSignal(moodLog);
    if (!parsed) continue;
    const existing = moodsByDate.get(parsed.date);
    if (!existing || parsed.occurredAt > existing.occurredAt) {
      moodsByDate.set(parsed.date, parsed);
    }
  }

  for (const [date, mood] of moodsByDate) {
    const record = ensureRecord(date);
    record.energy = mood.mood;
    record.energyLevel = mood.level;
    record.checkedIn = true;
  }

  return [...records.values()].sort((left, right) => right.date.localeCompare(left.date));
}

export function getWellnessDetailStart(today: string): string {
  const date = parseIsoDate(today);
  date.setUTCMonth(date.getUTCMonth() - 3);
  return toIsoDate(date);
}

export function getWellnessWindow(
  today: string,
  mode: "week" | "month",
  anchorDate: string,
): { start: string; end: string; label: string } {
  const anchor = parseIsoDate(anchorDate);
  if (mode === "week") {
    const day = anchor.getUTCDay() || 7;
    anchor.setUTCDate(anchor.getUTCDate() - day + 1);
    const end = new Date(anchor);
    end.setUTCDate(end.getUTCDate() + 6);
    return {
      start: toIsoDate(anchor),
      end: toIsoDate(end),
      label: `${formatMonthDay(anchor)} - ${formatMonthDay(end)}`,
    };
  }

  const start = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), 1));
  const end = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, 0));
  return {
    start: toIsoDate(start),
    end: toIsoDate(end),
    label: start.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" }),
  };
}

export function getWellnessWindowDates(start: string, end: string): string[] {
  const current = parseIsoDate(start);
  const final = parseIsoDate(end);
  const dates: string[] = [];
  while (current <= final) {
    dates.push(toIsoDate(current));
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates;
}

export function shiftWellnessWindow(anchorDate: string, mode: "week" | "month", direction: -1 | 1): string {
  const anchor = parseIsoDate(anchorDate);
  if (mode === "week") anchor.setUTCDate(anchor.getUTCDate() + direction * 7);
  else anchor.setUTCMonth(anchor.getUTCMonth() + direction);
  return toIsoDate(anchor);
}

function parseMoodSignal(log: WellnessMoodRecord): { date: string; occurredAt: string; mood: WellnessMood; level: number } | null {
  if (!log.value || typeof log.value !== "object" || Array.isArray(log.value)) return null;
  const value = log.value as Record<string, unknown>;
  const mood = normalizeMood(value.energy) ?? normalizeMood(value.mood);
  if (!mood) return null;
  const valueDate = typeof value.sleepDate === "string" && isIsoDate(value.sleepDate)
    ? value.sleepDate
    : dateFromTimestamp(log.occurred_at);
  if (!valueDate) return null;
  return { date: valueDate, occurredAt: log.occurred_at, mood, level: moodToLevel(mood) };
}

function normalizeMood(value: unknown): WellnessMood | null {
  if (value === "good" || value === "ready") return "good";
  if (value === "meh" || value === "okay" || value === "ok") return "meh";
  if (value === "rough" || value === "low") return "rough";
  return null;
}

function moodToLevel(mood: WellnessMood): number {
  if (mood === "good") return 3;
  if (mood === "meh") return 2;
  return 1;
}

function daysInCurrentMonthThrough(today: string): number {
  return parseIsoDate(today).getUTCDate();
}

function average(total: number, count: number): number | null {
  if (count === 0) return null;
  return Math.round((total / count) * 10) / 10;
}

function emptyTotals(): WellnessTotals {
  return { checkInDays: 0, energyTotal: 0, energySamples: 0, sleepTotal: 0, sleepSamples: 0, movementMinutes: 0 };
}

function addTotals(left: WellnessTotals, right: WellnessTotals): WellnessTotals {
  return {
    checkInDays: left.checkInDays + right.checkInDays,
    energyTotal: left.energyTotal + right.energyTotal,
    energySamples: left.energySamples + right.energySamples,
    sleepTotal: left.sleepTotal + right.sleepTotal,
    sleepSamples: left.sleepSamples + right.sleepSamples,
    movementMinutes: left.movementMinutes + right.movementMinutes,
  };
}

function finiteNumberOrNull(value: number | null): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function parseIsoDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function dateFromTimestamp(value: string): string | null {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return toIsoDate(parsed);
}

function formatMonthDay(value: Date): string {
  return value.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}
