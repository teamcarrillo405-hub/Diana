import { describe, expect, it } from "vitest";
import { calendarTimeChoiceNotice, newPersonalEvent, expandPersonalEvents, overlappingEvents, validatePersonalEvent } from "./personal-events";
import { personalEventCalendar } from "./calendar-export";
import { calendarDayKey, calendarInstant, calendarLocalTime } from "./time-zone";

describe("Saved personal schedules", () => {
  it("keeps weekly local time across daylight saving changes", () => {
    const event = { ...newPersonalEvent("2026-10-26"), id:"event", title:"Practice", repeat:"weekly" as const, repeatUntil:"2026-11-09", timeZone:"America/Los_Angeles" };
    const items = expandPersonalEvents([event], "2026-10-01", "2026-11-30", "UTC");
    expect(items.map(item => [item.day,item.time])).toEqual([["2026-10-26","23:00"],["2026-11-03","00:00"],["2026-11-10","00:00"]]);
    expect(calendarLocalTime(calendarInstant("2026-11-09","16:00","America/Los_Angeles").toISOString(),"America/Los_Angeles")).toBe("16:00");
    expect(calendarDayKey("2026-11-10T00:00:00Z","America/Los_Angeles")).toBe("2026-11-09");
  });
  it("validates dates and detects actual event overlaps without treating deadlines as meetings", () => {
    const event = { ...newPersonalEvent("2026-09-24"), id:"one", title:"Practice" };
    expect(validatePersonalEvent({...event,day:"2026-02-30"})).toContain("Choose a date");
    expect(validatePersonalEvent({...event,endTime:"15:00"})).toContain("after the start");
    const items = expandPersonalEvents([event,{...event,id:"two",time:"16:30",endTime:"17:30"}],event.day,event.day);
    expect(overlappingEvents(items[0],items)).toHaveLength(1);
    expect(overlappingEvents({...items[0],kind:"deadline"},items)).toHaveLength(0);
  });
  it("exports repeating events and reminders with safe calendar escaping", () => {
    const event = { ...newPersonalEvent("2026-09-24"), id:"event", title:"Team; meeting\nBEGIN:VEVENT", repeat:"weekly" as const, repeatUntil:"2026-10-08", reminder:"30" };
    const ics = personalEventCalendar(event,"America/Los_Angeles",new Date("2026-09-24T00:00:00Z"));
    expect(ics).toContain("DTSTART;TZID=America/Los_Angeles:20260924T160000");
    expect(ics).toContain("RRULE:FREQ=WEEKLY;COUNT=3");
    expect(ics).toContain("TRIGGER:-PT30M");
    expect(ics).toContain("SUMMARY:Team\\; meeting\\nBEGIN:VEVENT");
    expect(ics.match(/^BEGIN:VEVENT$/gm)).toHaveLength(1);
  });

  it("explains nonexistent times including a later weekly occurrence", () => {
    const event = { ...newPersonalEvent("2027-03-07"), title: "Study", time: "02:30", endTime: "03:30", repeat: "weekly" as const, repeatUntil: "2027-03-21" };
    expect(validatePersonalEvent(event, "America/Los_Angeles")).toContain("02:30 on 2027-03-14 does not exist");
    expect(validatePersonalEvent({ ...event, repeat: "none" }, "America/Los_Angeles")).toBeNull();
  });

  it("explains first-occurrence autumn timing and uses real elapsed study minutes", () => {
    const event = { ...newPersonalEvent("2026-11-01"), id: "study", title: "Study", time: "01:30", endTime: "02:30", category: "Study" as const, timeZone: "America/Los_Angeles" };
    expect(validatePersonalEvent(event)).toBeNull();
    expect(calendarTimeChoiceNotice(event, event.timeZone)).toContain("first occurrence");
    expect(expandPersonalEvents([event], event.day, event.day, event.timeZone)[0]).toMatchObject({ startsAt: "2026-11-01T08:30:00.000Z", endsAt: "2026-11-01T10:30:00.000Z", minutes: 120 });
  });

  it("preserves a linked study occurrence on both travel dates and detects next-day conflicts", () => {
    const event = { ...newPersonalEvent("2026-11-17"), id: "study", assignmentId: "a8f56bbe-fbd3-46e0-acab-882a83503628", title: "Study", time: "20:30", endTime: "22:30", category: "Study" as const, timeZone: "America/Los_Angeles" };
    const nextDay = { ...newPersonalEvent("2026-11-18"), id: "meeting", title: "Meeting", time: "00:00", endTime: "00:30", timeZone: "America/New_York" };
    const items = expandPersonalEvents([event, nextDay], "2026-11-17", "2026-11-18", "America/New_York");
    expect(items.map(value => [value.day, value.time, value.endTime])).toEqual([["2026-11-17", "23:30", "24:00"], ["2026-11-18", "00:00", "01:30"], ["2026-11-18", "00:00", "00:30"]]);
    expect(items[1]).toMatchObject({ assignmentId: event.assignmentId, occurrenceId: "study@2026-11-17", minutes: 120 });
    expect(overlappingEvents(items[1], items)).toEqual([items[2]]);
    expect(expandPersonalEvents([event], "2026-11-18", "2026-11-18", "America/New_York")).toHaveLength(1);
  });

  it("accepts explicit overnight dates and retains legacy same-day events", () => {
    const legacy = { ...newPersonalEvent("2026-11-17"), id: "legacy", title: "Study" };
    expect(validatePersonalEvent(legacy)).toBeNull();
    expect(expandPersonalEvents([legacy], legacy.day, legacy.day)).toHaveLength(1);
    const overnight = { ...legacy, time: "23:30", endDay: "2026-11-18", endTime: "01:00" };
    expect(validatePersonalEvent(overnight, "UTC")).toBeNull();
    expect(expandPersonalEvents([overnight], "2026-11-17", "2026-11-18", "UTC")).toHaveLength(2);
    expect(validatePersonalEvent({ ...overnight, endDay: "2026-11-16" })).toContain("end date");
  });

  it("exports overnight and inclusive all-day end dates without private study context", () => {
    const event = { ...newPersonalEvent("2026-11-17"), id: "event", title: "Study", time: "23:30", endDay: "2026-11-18", endTime: "01:00", category: "Study" as const, assignmentId: "a8f56bbe-fbd3-46e0-acab-882a83503628", diagnoses: ["private diagnosis"], checkin: "private health data" };
    const ics = personalEventCalendar(event, "America/Los_Angeles");
    expect(ics).toContain("DTEND;TZID=America/Los_Angeles:20261118T010000");
    expect(ics).not.toContain(event.assignmentId);
    expect(ics).not.toContain("private diagnosis");
    expect(ics).not.toContain("private health data");
    const allDay = personalEventCalendar({ ...event, allDay: true }, "America/Los_Angeles");
    expect(allDay).toContain("DTSTART;VALUE=DATE:20261117");
    expect(allDay).toContain("DTEND;VALUE=DATE:20261119");
    expect(expandPersonalEvents([{ ...event, allDay: true }], "2026-11-17", "2026-11-19", "America/Los_Angeles").map(value => value.day)).toEqual(["2026-11-17", "2026-11-18"]);
  });
});
