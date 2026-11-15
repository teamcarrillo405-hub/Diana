import { describe, expect, it } from "vitest";
import { newPersonalEvent, expandPersonalEvents, overlappingEvents, validatePersonalEvent } from "./personal-events";
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
});
