import { describe, expect, it } from "vitest";
import { itemTime } from "./fixtures";
import { chronological, expandPersonalEvents, newPersonalEvent, overlappingEvents, validatePersonalEvent } from "./personal-events";

const event = { ...newPersonalEvent("2026-12-30"), id: "practice", title: "Practice" };

describe("Personal calendar preview events", () => {
  it("validates the title, date, same-day interval, and weekly end boundary", () => {
    expect(validatePersonalEvent({ ...event, title: " " })).toMatch(/title/);
    expect(validatePersonalEvent({ ...event, day: "2026-02-30" })).toMatch(/date/);
    expect(validatePersonalEvent({ ...event, time: "25:00" })).toMatch(/start and end/);
    expect(validatePersonalEvent({ ...event, endTime: "15:00" })).toMatch(/end time after/);
    expect(validatePersonalEvent({ ...event, repeat: "weekly", repeatUntil: "2026-12-29" })).toMatch(/on or after/);
    expect(validatePersonalEvent({ ...event, repeat: "weekly", repeatUntil: "2028-01-10" })).toMatch(/one year/);
    expect(validatePersonalEvent(event)).toBeNull();
  });
  it("expands a weekly series across year and month boundaries with stable identities", () => {
    const instances = expandPersonalEvents([{ ...event, repeat: "weekly", repeatUntil: "2027-01-20" }], "2027-01-01", "2027-01-31");
    expect(instances.map(item => item.day)).toEqual(["2027-01-06", "2027-01-13", "2027-01-20"]);
    expect(instances[0].id).toBe("practice@2027-01-06");
    expect(instances.every(item => item.personalId === "practice")).toBe(true);
    expect(expandPersonalEvents([event], "2027-01-01", "2027-01-31")).toEqual([]);
  });
  it("keeps all-day events distinct from timed commitments and sorts them first", () => {
    const instances = expandPersonalEvents([event, { ...event, id: "all", allDay: true, title: "School holiday", time: "", endTime: "" }], event.day, event.day);
    expect(itemTime(instances[1])).toBe("All day");
    expect(instances[1].endTime).toBeUndefined();
    expect(chronological(instances)[0].id).toBe(`all@${event.day}`);
    expect(overlappingEvents(instances[1], instances)).toEqual([]);
  });
  it("identifies actual time overlaps but not deadlines, other dates, or touching intervals", () => {
    const first = expandPersonalEvents([event], event.day, event.day)[0];
    const second = { ...first, id: "overlap", time: "16:30", endTime: "18:00" };
    const touching = { ...first, id: "touch", time: "17:00", endTime: "18:00" };
    expect(overlappingEvents(first, [first, second, touching, { ...second, id: "due", kind: "deadline" }, { ...second, id: "other", day: "2026-12-31" }])).toEqual([second]);
  });
  it("carries event ownership, category, reminder, notes, and optional photo without an assignment status", () => {
    const item = expandPersonalEvents([{ ...event, category: "Performance", location: "Auditorium", notes: "Doors at six.", reminder: "60", photo: "data:image/png;base64,example" }], event.day, event.day)[0];
    expect(item).toMatchObject({ source: "Diana", category: "Performance", location: "Auditorium", brief: "Doors at six.", reminder: "60", image: "data:image/png;base64,example" });
    expect(item.status).toBeUndefined();
  });
});
