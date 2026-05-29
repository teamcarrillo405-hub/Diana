import { describe, it, expect } from "vitest";
import { getCalibrationHint } from "./calibration";

describe("getCalibrationHint", () => {
  it("returns hint when n >= 3 and user estimate differs by > 20%", () => {
    // 30 estimated vs 65 mean → diff is 35, which is 54% of 65 → hint fires
    const hint = getCalibrationHint({ mean: 65, n: 3 }, 30);
    expect(hint).not.toBeNull();
    expect(hint).toContain("65");
  });

  it("returns null when n < 3", () => {
    const hint = getCalibrationHint({ mean: 65, n: 2 }, 30);
    expect(hint).toBeNull();
  });

  it("returns null when difference is <= 20% of mean", () => {
    // 35 estimated vs 30 mean → diff is 5, which is 17% of 30 → no hint
    const hint = getCalibrationHint({ mean: 30, n: 5 }, 35);
    expect(hint).toBeNull();
  });

  it("returns null when userEstimate is null", () => {
    const hint = getCalibrationHint({ mean: 65, n: 5 }, null);
    expect(hint).toBeNull();
  });
});
