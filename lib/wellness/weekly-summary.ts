export type WeeklySleepLog = {
  sleep_date: string;
  sleep_hours: number | null;
  movement_20_min: boolean | null;
};

export type WeeklyActivityLog = {
  logged_for: string;
  duration_minutes: number;
};

export type WeeklyWellnessSummary = {
  averageSleepHours: number | null;
  checkInDays: number;
  movementDays: number;
  hasEntries: boolean;
};

export function summarizeWeeklyWellness(
  sleepLogs: WeeklySleepLog[],
  activityLogs: WeeklyActivityLog[],
): WeeklyWellnessSummary {
  const recordedSleep = sleepLogs
    .map((log) => log.sleep_hours)
    .filter((hours): hours is number => typeof hours === "number" && hours > 0);
  const averageSleepHours = recordedSleep.length > 0
    ? recordedSleep.reduce((total, hours) => total + hours, 0) / recordedSleep.length
    : null;
  const movementDays = new Set([
    ...sleepLogs
      .filter((log) => log.movement_20_min === true)
      .map((log) => log.sleep_date),
    ...activityLogs
      .filter((log) => log.duration_minutes >= 20)
      .map((log) => log.logged_for),
  ]).size;

  return {
    averageSleepHours,
    checkInDays: sleepLogs.length,
    movementDays,
    hasEntries: sleepLogs.length > 0 || activityLogs.length > 0,
  };
}
