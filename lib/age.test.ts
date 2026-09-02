import { describe, expect, it } from "vitest";

import {
  ageBracket,
  parseDateOnly,
  validateDateOfBirth,
  yearsBetween,
} from "./age";

const NOW = new Date("2026-09-01T12:00:00.000Z");

describe("age boundary", () => {
  it("uses exact UTC calendar dates at the 13-year boundary", () => {
    const turnsThirteenToday = parseDateOnly("2013-09-01");
    const turnsThirteenTomorrow = parseDateOnly("2013-09-02");

    expect(turnsThirteenToday).not.toBeNull();
    expect(turnsThirteenTomorrow).not.toBeNull();
    expect(yearsBetween(turnsThirteenToday!, NOW)).toBe(13);
    expect(yearsBetween(turnsThirteenTomorrow!, NOW)).toBe(12);
    expect(ageBracket(turnsThirteenToday!, NOW)).toBe("13_to_17");
    expect(ageBracket(turnsThirteenTomorrow!, NOW)).toBe("under_13");
  });

  it("rejects normalized, future, and implausible date inputs", () => {
    expect(validateDateOfBirth("2026-02-30", NOW)).toEqual({
      valid: false,
      reason: "invalid",
    });
    expect(validateDateOfBirth("2026-09-02", NOW)).toEqual({
      valid: false,
      reason: "future",
    });
    expect(validateDateOfBirth("1900-01-01", NOW)).toEqual({
      valid: false,
      reason: "implausible",
    });
  });

  it("fails closed for empty or non-date values", () => {
    expect(validateDateOfBirth("", NOW)).toEqual({
      valid: false,
      reason: "required",
    });
    expect(validateDateOfBirth("not-a-date", NOW)).toEqual({
      valid: false,
      reason: "invalid",
    });
  });
});
