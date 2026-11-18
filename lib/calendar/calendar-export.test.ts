import ical, { type VEvent } from "node-ical";
import { describe, expect, it } from "vitest";
import { personalEventCalendar } from "./calendar-export";
import { newPersonalEvent, validatePersonalEvent, type PersonalEvent } from "./personal-events";

function parsedEvent(text: string, id = "study"): VEvent {
  const event = ical.sync.parseICS(text)[`${id}@diana`];
  if (event?.type !== "VEVENT") throw new Error("The exported event did not parse.");
  return event;
}

describe("portable personal calendar exports", () => {
  it("includes bounded matching timezone observances and parses weekly local time across DST", () => {
    const text = personalEventCalendar({ ...newPersonalEvent("2026-10-26"), id: "study", title: "Study", repeat: "weekly", repeatUntil: "2026-11-09", reminder: "30" }, "America/Los_Angeles");
    expect(text).toContain("BEGIN:VTIMEZONE\r\nTZID:America/Los_Angeles");
    expect(text).toContain("DTSTART:20261101T020000\r\nTZOFFSETFROM:-0700\r\nTZOFFSETTO:-0800");
    expect(text.indexOf("END:VTIMEZONE")).toBeLessThan(text.indexOf("BEGIN:VEVENT"));
    expect(text.length).toBeLessThan(5000);
    const event = parsedEvent(text);
    const instances = ical.expandRecurringEvent(event, { from: new Date("2026-10-01Z"), to: new Date("2026-11-30Z") });
    expect(instances.map(value => [value.start.toISOString(), value.end.toISOString()])).toEqual([
      ["2026-10-26T23:00:00.000Z", "2026-10-27T00:00:00.000Z"],
      ["2026-11-03T00:00:00.000Z", "2026-11-03T01:00:00.000Z"],
      ["2026-11-10T00:00:00.000Z", "2026-11-10T01:00:00.000Z"],
    ]);
    expect(event.alarms?.[0]).toMatchObject({ action: "DISPLAY", trigger: "-PT30M" });
  });

  it("retains the local overnight end time on a week whose actual duration changes", () => {
    const text = personalEventCalendar({ ...newPersonalEvent("2026-10-24"), id: "study", title: "Campus event", time: "23:30", endTime: "02:30", endDay: "2026-10-25", repeat: "weekly", repeatUntil: "2026-11-07" }, "America/Los_Angeles");
    expect(text).toContain("RECURRENCE-ID;TZID=America/Los_Angeles:20261031T233000");
    const instances = ical.expandRecurringEvent(parsedEvent(text), { from: new Date("2026-10-01Z"), to: new Date("2026-11-30Z") });
    expect(instances.map(value => [value.start.toISOString(), value.end.toISOString()])).toEqual([
      ["2026-10-25T06:30:00.000Z", "2026-10-25T09:30:00.000Z"],
      ["2026-11-01T06:30:00.000Z", "2026-11-01T10:30:00.000Z"],
      ["2026-11-08T07:30:00.000Z", "2026-11-08T10:30:00.000Z"],
    ]);
  });

  it("includes half-hour daylight changes and parses southern-hemisphere recurrence", () => {
    const text = personalEventCalendar({ ...newPersonalEvent("2026-09-27"), id: "study", title: "Study", repeat: "weekly", repeatUntil: "2026-10-11" }, "Australia/Lord_Howe");
    expect(text).toContain("TZOFFSETFROM:+1030\r\nTZOFFSETTO:+1100");
    const instances = ical.expandRecurringEvent(parsedEvent(text), { from: new Date("2026-09-01Z"), to: new Date("2026-11-01Z") });
    expect(instances.map(value => value.start.toISOString())).toEqual(["2026-09-27T05:30:00.000Z", "2026-10-04T05:00:00.000Z", "2026-10-11T05:00:00.000Z"]);
  });

  it("includes fixed non-hour offsets and parses the matching named timezone", () => {
    const text = personalEventCalendar({ ...newPersonalEvent("2026-11-17"), id: "study", title: "Study" }, "Asia/Kathmandu");
    expect(text).toContain("TZOFFSETFROM:+0545\r\nTZOFFSETTO:+0545");
    expect(parsedEvent(text).start.toISOString()).toBe("2026-11-17T10:15:00.000Z");
    expect(parsedEvent(text).end?.toISOString()).toBe("2026-11-17T11:15:00.000Z");
  });

  it("folds Unicode content by UTF-8 bytes and round-trips notes and text escaping", () => {
    const title = "📘".repeat(50);
    const notes = `${"明".repeat(300)}\nBring pencils; paper, too.\\`;
    const text = personalEventCalendar({ ...newPersonalEvent("2026-11-17"), id: "study", title, notes, location: "Library; room, 2" }, "UTC");
    for (const line of text.split("\r\n")) expect(Buffer.byteLength(line, "utf8")).toBeLessThanOrEqual(75);
    expect(parsedEvent(text)).toMatchObject({ summary: title, description: notes, location: "Library; room, 2" });
  });

  it("keeps inclusive all-day dates and reminders without timezones or private metadata", () => {
    const event = { ...newPersonalEvent("2026-11-17"), id: "study", title: "Campus trip", allDay: true, endDay: "2026-11-19", reminder: "1440", diagnoses: ["private"], readiness: "private", assignmentId: "", category: "Study" as const };
    const text = personalEventCalendar(event, "America/Los_Angeles");
    expect(text).not.toContain("VTIMEZONE");
    expect(text).not.toContain("private");
    expect(parsedEvent(text).start.toISOString().slice(0, 10)).toBe("2026-11-17");
    expect(parsedEvent(text).end?.toISOString().slice(0, 10)).toBe("2026-11-20");
    expect(parsedEvent(text).alarms?.[0].trigger).toBe("-PT1440M");
  });
});

describe("stored event JSON validation", () => {
  it.each([
    { notes: { unexpected: "value" } }, { location: 99 }, { reminder: "NaN" },
    { reminder: "1\r\nEND:VALARM" }, { category: "Unknown" }, { repeat: "daily" },
    { allDay: "false" }, { time: null }, { endTime: [] }, { day: undefined },
    { endDay: {} }, { assignmentId: 0 }, { timeZone: {} }, { id: "id\r\nBEGIN:VEVENT" },
    { notes: "Contains\u0000control" },
  ])("rejects malformed stored details before export instead of throwing a TypeError: %j", patch => {
    const event = { ...newPersonalEvent("2026-11-17"), id: "study", title: "Study", ...patch } as unknown as PersonalEvent;
    expect(validatePersonalEvent(event, "UTC")).toEqual(expect.any(String));
    expect(() => personalEventCalendar(event, "UTC")).toThrow(RangeError);
  });

  it("handles missing or non-object legacy payloads and preserves the original supported shape", () => {
    for (const event of [null, undefined, [], "event"]) expect(validatePersonalEvent(event as unknown as PersonalEvent)).toEqual(expect.any(String));
    expect(validatePersonalEvent({ ...newPersonalEvent("2026-11-17"), title: "Study" })).toBeNull();
  });
});
