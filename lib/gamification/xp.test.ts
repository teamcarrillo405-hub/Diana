import { describe, expect, it } from "vitest";

import { computeRecentActiveDays, computeXp } from "./xp";

describe("computeRecentActiveDays", () => {
  const now = new Date("2026-07-14T18:00:00.000Z");

  it("counts activity across the last seven days without requiring a chain", () => {
    const days = new Set(["2026-07-14", "2026-07-12", "2026-07-09"]);
    expect(computeRecentActiveDays(days, now)).toBe(3);
  });

  it("does not count activity outside the seven-day window", () => {
    const days = new Set(["2026-07-08", "2026-07-07"]);
    expect(computeRecentActiveDays(days, now)).toBe(1);
  });
});

describe("computeXp", () => {
  it("exposes the neutral recent activity count", () => {
    const summary = computeXp(
      {
        completionDates: ["2026-07-14T12:00:00.000Z", "2026-07-12T12:00:00.000Z"],
        studyDayKeys: ["2026-07-11"],
        flashcardReviews: 0,
        notesCreated: 0,
      },
      new Date("2026-07-14T18:00:00.000Z"),
    );

    expect(summary.recentActiveDays).toBe(3);
  });
});
