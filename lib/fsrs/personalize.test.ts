import { describe, it, expect } from "vitest";
import {
  adjustDueDate,
  intervalMultiplier,
  predictedRecall,
  MIN_SAMPLES_FOR_CALIBRATION,
  type ReviewSample,
} from "./personalize";

function samples(n: number, rating: number, elapsed = 5, stability = 10): ReviewSample[] {
  return Array.from({ length: n }, () => ({ rating, elapsed_days: elapsed, stability }));
}

describe("intervalMultiplier", () => {
  it("stays at 1.0 below the sample minimum", () => {
    expect(intervalMultiplier(samples(MIN_SAMPLES_FOR_CALIBRATION - 1, 3))).toBe(1);
    expect(intervalMultiplier([])).toBe(1);
  });

  it("shortens intervals for a student who forgets more than predicted", () => {
    // elapsed=5, stability=10 → predicted ≈ 0.95, but 40% Again
    const mixed = [...samples(30, 1), ...samples(45, 3)];
    const m = intervalMultiplier(mixed);
    expect(m).toBeLessThan(1);
    expect(m).toBeGreaterThanOrEqual(0.8); // clamp floor
  });

  it("lengthens (mildly, clamped) for a student who remembers everything", () => {
    // perfect recall at long elapsed vs lower predicted
    const strong = samples(80, 3, 30, 10); // predicted ≈ 0.66, observed 1.0
    const m = intervalMultiplier(strong);
    expect(m).toBeGreaterThan(1);
    expect(m).toBeLessThanOrEqual(1.25); // clamp ceiling
  });

  it("ignores malformed rows", () => {
    const junk = samples(60, 3).map((s, i) => (i % 2 ? { ...s, elapsed_days: 0 } : s));
    // only 30 usable → below minimum → 1.0
    expect(intervalMultiplier(junk)).toBe(1);
  });
});

describe("predictedRecall", () => {
  it("decays with elapsed time and grows with stability", () => {
    expect(predictedRecall(0, 10)).toBe(1);
    expect(predictedRecall(10, 10)).toBeLessThan(predictedRecall(5, 10));
    expect(predictedRecall(10, 20)).toBeGreaterThan(predictedRecall(10, 10));
  });
});

describe("adjustDueDate", () => {
  const now = new Date("2026-06-10T12:00:00Z");

  it("scales review intervals by the multiplier", () => {
    const tenDays = new Date(now.getTime() + 10 * 86_400_000).toISOString();
    const adjusted = adjustDueDate(now, tenDays, 0.8);
    const days = (new Date(adjusted).getTime() - now.getTime()) / 86_400_000;
    expect(days).toBeCloseTo(8, 1);
  });

  it("never touches sub-day learning steps or the 1.0 case", () => {
    const tenMinutes = new Date(now.getTime() + 10 * 60_000).toISOString();
    expect(adjustDueDate(now, tenMinutes, 0.8)).toBe(tenMinutes);
    const tenDays = new Date(now.getTime() + 10 * 86_400_000).toISOString();
    expect(adjustDueDate(now, tenDays, 1)).toBe(tenDays);
  });
});
