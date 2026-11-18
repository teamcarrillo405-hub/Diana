import { describe, expect, it } from "vitest";
import { clockLabel, expandCalendarItem, type CalendarItem } from "./calendar-items";

const event: CalendarItem = { id: "google-event", title: "Campus trip", day: "2026-11-17", time: "23:30", kind: "event", subject: "Calendar", source: "Google Calendar", image: "", imageAlt: "", color: "#fff", brief: "" };

describe("calendar occupied dates", () => {
  it("splits an imported overnight event and retains its original real interval", () => {
    const slices = expandCalendarItem({ ...event, startsAt: "2026-11-18T07:30:00Z", endsAt: "2026-11-18T09:30:00Z" }, "America/Los_Angeles");
    expect(slices.map(value => [value.day, value.time, value.endTime])).toEqual([["2026-11-17", "23:30", "24:00"], ["2026-11-18", "00:00", "01:30"]]);
    expect(slices[0]).toMatchObject({ occurrenceId: event.id, startsAt: "2026-11-18T07:30:00.000Z", endsAt: "2026-11-18T09:30:00.000Z", endDay: "2026-11-18", continuesAfter: true });
    expect(slices[1]).toMatchObject({ continuesBefore: true, continuesAfter: false });
    expect(clockLabel(slices[0].endTime!)).toBe("Midnight");
  });

  it("includes only occupied dates for multi-day all-day events with an exclusive provider end", () => {
    const slices = expandCalendarItem({ ...event, allDay: true, endDay: "2026-11-20" }, "Pacific/Auckland");
    expect(slices.map(value => value.day)).toEqual(["2026-11-17", "2026-11-18", "2026-11-19"]);
    expect(new Set(slices.map(value => value.occurrenceId))).toEqual(new Set([event.id]));
    expect(slices.every(value => value.endTime === undefined)).toBe(true);
  });

  it("includes continuation when the requested window starts after the original event", () => {
    const slices = expandCalendarItem({ ...event, startsAt: "2026-11-18T07:30:00Z", endsAt: "2026-11-18T09:30:00Z" }, "America/Los_Angeles", "2026-11-18", "2026-11-18");
    expect(slices).toHaveLength(1);
    expect(slices[0]).toMatchObject({ day: "2026-11-18", time: "00:00", continuesBefore: true });
  });

  it("does not add the next date for an event ending exactly at midnight", () => {
    const slices = expandCalendarItem({ ...event, startsAt: "2026-11-18T07:30:00Z", endsAt: "2026-11-18T08:00:00Z" }, "America/Los_Angeles");
    expect(slices).toHaveLength(1);
    expect(slices[0]).toMatchObject({ day: "2026-11-17", endTime: "24:00", continuesAfter: false });
  });

  it("keeps deadlines as due-time points and supports imported events with no end", () => {
    expect(expandCalendarItem({ ...event, kind: "deadline" }, "UTC")).toEqual([{ ...event, kind: "deadline" }]);
    expect(expandCalendarItem({ ...event, startsAt: "2026-11-18T02:30:00Z" }, "America/Los_Angeles")[0]).toMatchObject({ day: "2026-11-17", time: "18:30", endTime: undefined });
  });
});
