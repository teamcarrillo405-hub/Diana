import { describe, expect, it } from "vitest";

import { summarizeWeeklyWellness } from "./weekly-summary";

describe("summarizeWeeklyWellness", () => {
  it("summarizes logged sleep and movement without treating blank sleep as zero", () => {
    expect(
      summarizeWeeklyWellness(
        [
          { sleep_date: "2026-07-20", sleep_hours: 7, movement_20_min: true },
          { sleep_date: "2026-07-19", sleep_hours: null, movement_20_min: false },
          { sleep_date: "2026-07-18", sleep_hours: 7.5, movement_20_min: null },
        ],
        [
          { logged_for: "2026-07-18", duration_minutes: 20 },
          { logged_for: "2026-07-18", duration_minutes: 35 },
          { logged_for: "2026-07-17", duration_minutes: 19 },
        ],
      ),
    ).toEqual({
      averageSleepHours: 7.25,
      checkInDays: 3,
      movementDays: 2,
      hasEntries: true,
    });
  });

  it("keeps the empty state quiet when there is no weekly data", () => {
    expect(summarizeWeeklyWellness([], [])).toEqual({
      averageSleepHours: null,
      checkInDays: 0,
      movementDays: 0,
      hasEntries: false,
    });
  });
});
