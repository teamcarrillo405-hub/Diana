import { describe, expect, it } from "vitest";
import { calendarPlanningSupport, validWeekPlan } from "./planning";

describe("optional weekly study capacity", () => {
  it("accepts zero capacity and clearing a valid Monday", () => {
    expect(validWeekPlan({ weekStart: "2026-11-16", availableMinutes: 0 })).toBe(true);
    expect(validWeekPlan({ weekStart: "2026-11-16", availableMinutes: null })).toBe(true);
  });
  it("rejects impossible dates, wrong weekdays, fractions and unbounded input", () => {
    for (const weekStart of ["2026-11-17", "2026-02-30", "2026-2-09", "x"]) expect(validWeekPlan({ weekStart, availableMinutes: 90 })).toBe(false);
    for (const availableMinutes of [-1, 1.5, Infinity, NaN, 10081]) expect(validWeekPlan({ weekStart: "2026-11-16", availableMinutes })).toBe(false);
  });
});
describe("check-in planning suggestion", () => {
  const now = new Date("2026-11-17T20:00:00Z");
  it("uses today’s latest optional check-in without carrying yesterday forward", () => {
    const old = { occurred_at: "2026-11-16T20:00:00Z", value: { body: "low", focus: "scattered" } };
    expect(calendarPlanningSupport([old], now, "America/Los_Angeles").suggestedBlockMinutes).toBeNull();
    expect(calendarPlanningSupport([{ ...old, occurred_at: "2026-11-17T19:00:00Z" }], now, "America/Los_Angeles").suggestedBlockMinutes).toBe(15);
    expect(calendarPlanningSupport([{ ...old, occurred_at: "2026-11-17T19:00:00Z" }, { occurred_at: "2026-11-17T19:30:00Z", value: { body: "ready", focus: "steady" } }], now, "America/Los_Angeles").suggestedBlockMinutes).toBeNull();
  });
  it("ignores future or malformed check-ins", () => {
    expect(calendarPlanningSupport([{ occurred_at: "2026-11-18T00:00:00Z", value: { body: "low", focus: "scattered" } }, { occurred_at: "invalid", value: {} }], now, "America/Los_Angeles").planningNote).toBeNull();
  });
});
