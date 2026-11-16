import { describe, expect, it } from "vitest";
import { buildCheckInWeek, checkInWeekRange } from "./check-in-week";

describe("the dashboard check-in week", () => {
  it("keeps seven local dates and the newest explicit energy answer on each recorded day", () => {
    const range = checkInWeekRange("2026-11-04");
    const history = buildCheckInWeek({
      ...range,
      timeZone: "America/Los_Angeles",
      energyLogs: [
        { occurred_at: "2026-11-02T08:02:00Z", energy: "okay" },
        { occurred_at: "2026-11-02T08:02:00Z", energy: "low" },
        { occurred_at: "2026-11-02T08:00:30Z", energy: "good" },
        { occurred_at: "2026-11-02T02:30:00Z", energy: "low" },
        { occurred_at: "2026-11-02T21:00:00Z", energy: null },
        { occurred_at: "2026-10-30T00:15:00Z", energy: "low" },
        { occurred_at: "2026-10-29T00:15:00Z", energy: "good" },
      ],
      sleepLogs: [{ sleep_date: "2026-11-01", sleep_hours: 0 }],
      activityLogs: [
        { logged_for: "2026-11-01", duration_minutes: 25 },
        { logged_for: "2026-11-01", duration_minutes: 15 },
        { logged_for: "2026-10-28", duration_minutes: 110 },
      ],
    });

    expect(history).toEqual({
      unavailable: false,
      days: [
        { date: "2026-10-29", energy: "low", sleepHours: null, activityMinutes: null },
        { date: "2026-10-30", energy: null, sleepHours: null, activityMinutes: null },
        { date: "2026-10-31", energy: null, sleepHours: null, activityMinutes: null },
        { date: "2026-11-01", energy: "good", sleepHours: 0, activityMinutes: 40 },
        { date: "2026-11-02", energy: "okay", sleepHours: null, activityMinutes: null },
        { date: "2026-11-03", energy: null, sleepHours: null, activityMinutes: null },
        { date: "2026-11-04", energy: null, sleepHours: null, activityMinutes: null },
      ],
    });
  });

  it("marks missing sources as unavailable while returning records that loaded", () => {
    const history = buildCheckInWeek({
      ...checkInWeekRange("2026-01-03"),
      timeZone: "Pacific/Kiritimati",
      energyLogs: [{ occurred_at: "2025-12-27T15:00:00Z", energy: "good" }],
      activityLogs: null,
      sleepLogs: [],
    });

    expect(history.unavailable).toBe(true);
    expect(history.days).toHaveLength(7);
    expect(history.days[0]).toEqual({ date: "2025-12-28", energy: "good", sleepHours: null, activityMinutes: null });
  });
});
