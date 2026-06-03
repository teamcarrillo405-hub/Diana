import { describe, it, expect } from "vitest";
import { isFrustrationDetected, FRUSTRATION_REDIRECT } from "./frustration";

describe("isFrustrationDetected", () => {
  it("returns true for 3 identical requests", () => {
    expect(
      isFrustrationDetected(["solve this", "solve this", "solve this"])
    ).toBe(true);
  });

  it("returns true when history contains 'ugh'", () => {
    expect(isFrustrationDetected(["help", "ugh"])).toBe(true);
  });

  it("returns true for 'I give up'", () => {
    expect(isFrustrationDetected(["I give up"])).toBe(true);
  });

  it("returns false for generic difficulty expression", () => {
    expect(isFrustrationDetected(["this is hard"])).toBe(false);
  });

  it("returns false for empty history", () => {
    expect(isFrustrationDetected([])).toBe(false);
  });

  it("FRUSTRATION_REDIRECT includes a next academic move and a talk-through option", () => {
    expect(FRUSTRATION_REDIRECT).toContain("next academic move");
    expect(FRUSTRATION_REDIRECT).toContain("talk through what");
  });
});
