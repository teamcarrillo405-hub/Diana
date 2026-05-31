import { describe, it, expect } from "vitest";
import {
  isQuietHours,
  isWeekend,
  isPastDue,
  hoursUntilDue,
  shouldShowReminder,
  QUIET_HOURS_START,
  QUIET_HOURS_END,
  DUE_SOON_HOURS,
} from "./reminder-rules";

/**
 * F7 — Smart reminders rule tests.
 * All time checks use local Date methods (getHours, getDay).
 * Tests use deterministic dates to avoid flaky weekday/weekend ambiguity.
 */

/** Creates a Date at a specific local hour on Wed May 27 2026 (weekday). */
function atHour(h: number): Date {
  // new Date(year, monthIndex, day, hour) — local time
  return new Date(2026, 4, 27, h, 0, 0); // May 27, 2026 = Wednesday
}

/** Creates a Date at noon on a specific day-of-week.
 *  0=Sunday, 1=Monday, ..., 6=Saturday
 *  Base date: Mon May 25 2026 (getDay()=1).
 *  Sunday=0 → May 31 2026; Saturday=6 → May 30 2026.
 */
function atDay(dayIndex: number): Date {
  // Monday May 25 2026 → dayIndex 1
  const base = new Date(2026, 4, 25, 12, 0, 0);
  // offset from Monday(1): dayIndex - 1 days
  const offset = ((dayIndex - 1) + 7) % 7;
  const d = new Date(base);
  d.setDate(base.getDate() + offset);
  return d;
}

// ---- Constants ----

describe("QUIET_HOURS constants", () => {
  it("QUIET_HOURS_START is 20", () => {
    expect(QUIET_HOURS_START).toBe(20);
  });
  it("QUIET_HOURS_END is 7", () => {
    expect(QUIET_HOURS_END).toBe(7);
  });
  it("DUE_SOON_HOURS is 48", () => {
    expect(DUE_SOON_HOURS).toBe(48);
  });
});

// ---- isQuietHours ----

describe("isQuietHours", () => {
  it("hour=21 is quiet", () => {
    expect(isQuietHours(atHour(21))).toBe(true);
  });
  it("hour=23 is quiet", () => {
    expect(isQuietHours(atHour(23))).toBe(true);
  });
  it("hour=0 (midnight) is quiet", () => {
    expect(isQuietHours(atHour(0))).toBe(true);
  });
  it("hour=6 is quiet (still before 07:00)", () => {
    expect(isQuietHours(atHour(6))).toBe(true);
  });
  it("hour=7 is NOT quiet (waking starts at 07:00)", () => {
    expect(isQuietHours(atHour(7))).toBe(false);
  });
  it("hour=12 is NOT quiet", () => {
    expect(isQuietHours(atHour(12))).toBe(false);
  });
  it("hour=19 is NOT quiet", () => {
    expect(isQuietHours(atHour(19))).toBe(false);
  });
  it("hour=20 IS quiet (quiet starts at 20:00)", () => {
    expect(isQuietHours(atHour(20))).toBe(true);
  });
});

// ---- isWeekend ----

describe("isWeekend", () => {
  it("Saturday (day=6) is a weekend", () => {
    const sat = atDay(6);
    expect(sat.getDay()).toBe(6); // guard
    expect(isWeekend(sat)).toBe(true);
  });
  it("Sunday (day=0) is a weekend", () => {
    const sun = atDay(0);
    expect(sun.getDay()).toBe(0); // guard
    expect(isWeekend(sun)).toBe(true);
  });
  it("Monday (day=1) is NOT a weekend", () => {
    const mon = atDay(1);
    expect(mon.getDay()).toBe(1); // guard
    expect(isWeekend(mon)).toBe(false);
  });
  it("Friday (day=5) is NOT a weekend", () => {
    const fri = atDay(5);
    expect(fri.getDay()).toBe(5); // guard
    expect(isWeekend(fri)).toBe(false);
  });
});

// ---- isPastDue ----

describe("isPastDue", () => {
  const now = new Date("2026-06-01T12:00:00Z");

  it("null dueAt → false", () => {
    expect(isPastDue(null, now)).toBe(false);
  });

  it("past ISO string → true", () => {
    expect(isPastDue("2026-01-01T00:00:00Z", now)).toBe(true);
  });

  it("future ISO string → false", () => {
    expect(isPastDue("2026-12-31T00:00:00Z", now)).toBe(false);
  });

  it("same-day but already passed → true", () => {
    const earlier = new Date(now.getTime() - 1); // 1 ms before now
    expect(isPastDue(earlier.toISOString(), now)).toBe(true);
  });
});

// ---- hoursUntilDue ----

describe("hoursUntilDue", () => {
  const now = new Date("2026-06-01T12:00:00Z");

  it("null dueAt → null", () => {
    expect(hoursUntilDue(null, now)).toBeNull();
  });

  it("past due → null (past-due → undefined window)", () => {
    expect(hoursUntilDue("2026-05-01T00:00:00Z", now)).toBeNull();
  });

  it("due 24 hours from now → 24", () => {
    const dueAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    expect(hoursUntilDue(dueAt, now)).toBe(24);
  });

  it("due 1.5 hours from now → floors to 1", () => {
    const dueAt = new Date(now.getTime() + 90 * 60 * 1000).toISOString();
    expect(hoursUntilDue(dueAt, now)).toBe(1);
  });
});

// ---- shouldShowReminder ----

describe("shouldShowReminder", () => {
  it("past-due during quiet hours → true (D-04 escalation)", () => {
    expect(
      shouldShowReminder({
        dueAt: "2026-05-01T00:00:00Z",
        pastDue: true,
        quietHours: true,
        weekend: false,
      }),
    ).toBe(true);
  });

  it("past-due during weekend → true (D-04 escalation)", () => {
    expect(
      shouldShowReminder({
        dueAt: "2026-05-01T00:00:00Z",
        pastDue: true,
        quietHours: false,
        weekend: true,
      }),
    ).toBe(true);
  });

  it("past-due during quiet weekend → true (D-04 escalation bypasses both)", () => {
    expect(
      shouldShowReminder({
        dueAt: "2026-05-01T00:00:00Z",
        pastDue: true,
        quietHours: true,
        weekend: true,
      }),
    ).toBe(true);
  });

  it("due soon during quiet hours → false", () => {
    expect(
      shouldShowReminder({
        dueAt: "2026-06-02T00:00:00Z",
        pastDue: false,
        quietHours: true,
        weekend: false,
      }),
    ).toBe(false);
  });

  it("due soon during weekend → false", () => {
    expect(
      shouldShowReminder({
        dueAt: "2026-06-02T00:00:00Z",
        pastDue: false,
        quietHours: false,
        weekend: true,
      }),
    ).toBe(false);
  });

  it("due soon during waking weekday → true", () => {
    expect(
      shouldShowReminder({
        dueAt: "2026-06-02T00:00:00Z",
        pastDue: false,
        quietHours: false,
        weekend: false,
      }),
    ).toBe(true);
  });

  it("no dueAt → false", () => {
    expect(
      shouldShowReminder({
        dueAt: null,
        pastDue: false,
        quietHours: false,
        weekend: false,
      }),
    ).toBe(false);
  });

  it("no dueAt during waking weekday → false (nothing to show)", () => {
    expect(
      shouldShowReminder({
        dueAt: null,
        pastDue: false,
        quietHours: false,
        weekend: false,
      }),
    ).toBe(false);
  });
});
