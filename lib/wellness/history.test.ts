import { describe, expect, it } from "vitest";

import {
  buildWellnessDashboardSummary,
  getWellnessDetailStart,
  getWellnessWindow,
  getWellnessWindowDates,
} from "./history";

describe("buildWellnessDashboardSummary", () => {
  it("keeps detailed records separate from year-to-date aggregate history", () => {
    const summary = buildWellnessDashboardSummary({
      today: "2026-08-29",
      sleepLogs: [
        { sleep_date: "2026-08-29", sleep_hours: 8 },
        { sleep_date: "2026-08-28", sleep_hours: 7 },
      ],
      activityLogs: [
        { logged_for: "2026-08-29", duration_minutes: 30 },
        { logged_for: "2026-08-29", duration_minutes: 15 },
        { logged_for: "2026-08-28", duration_minutes: 20 },
      ],
      moodLogs: [
        { occurred_at: "2026-08-29T15:00:00.000Z", value: { energy: "good", sleepDate: "2026-08-29" } },
        { occurred_at: "2026-08-28T15:00:00.000Z", value: { mood: "meh", sleepDate: "2026-08-28" } },
      ],
      archivedDays: [
        {
          logged_for: "2026-01-15",
          check_in_completed: true,
          energy_total: 1,
          energy_samples: 1,
          sleep_total: 6,
          sleep_samples: 1,
          movement_minutes: 12,
        },
      ],
    });

    expect(summary.monthlyCheckInDays).toBe(2);
    expect(summary.monthlyDayCount).toBe(29);
    expect(summary.monthlyCheckInPercent).toBe(7);
    expect(summary.averageEnergy).toBe(2);
    expect(summary.averageSleepHours).toBe(7);
    expect(summary.averageMovementMinutes).toBe(25.7);
    expect(summary.dailyRecords).toEqual([
      expect.objectContaining({ date: "2026-08-29", energy: "good", sleepHours: 8, movementMinutes: 45, checkedIn: true }),
      expect.objectContaining({ date: "2026-08-28", energy: "meh", sleepHours: 7, movementMinutes: 20, checkedIn: true }),
    ]);
  });

  it("uses the latest mood signal for a day and does not treat movement alone as a completed check-in", () => {
    const summary = buildWellnessDashboardSummary({
      today: "2026-08-03",
      sleepLogs: [],
      activityLogs: [{ logged_for: "2026-08-03", duration_minutes: 20 }],
      moodLogs: [
        { occurred_at: "2026-08-02T18:00:00.000Z", value: { mood: "rough" } },
        { occurred_at: "2026-08-02T20:00:00.000Z", value: { mood: "good" } },
      ],
    });

    expect(summary.monthlyCheckInDays).toBe(1);
    expect(summary.dailyRecords).toEqual([
      expect.objectContaining({ date: "2026-08-03", checkedIn: false, movementMinutes: 20 }),
      expect.objectContaining({ date: "2026-08-02", energy: "good", checkedIn: true }),
    ]);
  });
});

describe("wellness history windows", () => {
  it("keeps a rolling three-month detailed boundary and supports a calendar-style weekly window", () => {
    expect(getWellnessDetailStart("2026-08-29")).toBe("2026-05-29");
    expect(getWellnessWindow("2026-08-29", "week", "2026-08-29")).toEqual({
      start: "2026-08-24",
      end: "2026-08-30",
      label: "Aug 24 - Aug 30",
    });
    expect(getWellnessWindowDates("2026-08-24", "2026-08-30")).toHaveLength(7);
  });
});
