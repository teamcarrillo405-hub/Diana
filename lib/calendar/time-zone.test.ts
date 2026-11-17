import { describe, expect, it } from "vitest";
import { calendarInstant, calendarLocalTime, calendarTimeChoices } from "./time-zone";

describe("calendar local clock resolution", () => {
  it("rejects a skipped spring clock time rather than moving it an hour", () => {
    expect(calendarTimeChoices("2027-03-14", "02:30", "America/Los_Angeles")).toEqual([]);
    expect(() => calendarInstant("2027-03-14", "02:30", "America/Los_Angeles")).toThrow("does not exist");
  });

  it("uses the first occurrence of a repeated autumn time deterministically", () => {
    const choices = calendarTimeChoices("2026-11-01", "01:30", "America/Los_Angeles");
    expect(choices.map(value => value.toISOString())).toEqual(["2026-11-01T08:30:00.000Z", "2026-11-01T09:30:00.000Z"]);
    expect(calendarInstant("2026-11-01", "01:30", "America/Los_Angeles")).toEqual(choices[0]);
    expect(choices.map(value => calendarLocalTime(value.toISOString(), "America/Los_Angeles"))).toEqual(["01:30", "01:30"]);
  });

  it("handles half-hour transitions and a skipped calendar date", () => {
    expect(calendarTimeChoices("2026-10-04", "02:15", "Australia/Lord_Howe")).toEqual([]);
    expect(calendarTimeChoices("2026-04-05", "01:45", "Australia/Lord_Howe").map(value => value.toISOString())).toEqual(["2026-04-04T14:45:00.000Z", "2026-04-04T15:15:00.000Z"]);
    expect(calendarTimeChoices("2011-12-30", "12:00", "Pacific/Apia")).toEqual([]);
  });

  it("does not normalize malformed dates or out-of-range clock times", () => {
    expect(calendarTimeChoices("2026-02-30", "16:00", "UTC")).toEqual([]);
    expect(calendarTimeChoices("2026-11-17", "24:00", "UTC")).toEqual([]);
    expect(calendarTimeChoices("2026-11-17", "16:99", "UTC")).toEqual([]);
  });
});
