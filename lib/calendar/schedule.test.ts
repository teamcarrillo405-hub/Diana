import { describe, expect, it } from "vitest";

import { buildDaySchedule } from "./schedule";

const day = new Date("2026-08-31T12:00:00");

describe("buildDaySchedule", () => {
  it("separates all-day items and places timed items by hour", () => {
    const schedule = buildDaySchedule([
      { id: "later", startsAt: "2026-08-31T15:30:00", endsAt: "2026-08-31T16:15:00" },
      { id: "all-day", startsAt: "2026-08-31T00:00:00", allDay: true },
      { id: "first", startsAt: "2026-08-31T08:00:00" },
    ], day);

    expect(schedule.allDay.map((item) => item.id)).toEqual(["all-day"]);
    expect(schedule.timed.map((item) => item.item.id)).toEqual(["first", "later"]);
    expect(schedule.timed[0]).toMatchObject({ startMinute: 480, durationMinutes: 30 });
    expect(schedule.timed[1]).toMatchObject({ startMinute: 930, durationMinutes: 45 });
  });

  it("does not show items from another day and keeps late items in bounds", () => {
    const schedule = buildDaySchedule([
      { id: "other-day", startsAt: "2026-09-01T10:00:00" },
      { id: "late", startsAt: "2026-08-31T23:50:00", endsAt: "2026-09-01T01:00:00" },
    ], day);

    expect(schedule.allDay).toEqual([]);
    expect(schedule.timed).toHaveLength(1);
    expect(schedule.timed[0]).toMatchObject({ startMinute: 1430, durationMinutes: 30 });
  });
});
