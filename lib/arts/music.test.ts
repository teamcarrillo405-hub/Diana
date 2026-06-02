import { describe, expect, it } from "vitest";
import { buildScale, buildTriad, intervalName } from "./music";

describe("music theory helpers", () => {
  it("builds major scales", () => {
    expect(buildScale("C", "major")).toEqual(["C", "D", "E", "F", "G", "A", "B"]);
  });

  it("builds natural minor scales", () => {
    expect(buildScale("A", "minor")).toEqual(["A", "B", "C", "D", "E", "F", "G"]);
  });

  it("builds major and minor triads", () => {
    expect(buildTriad("C", "major")).toEqual(["C", "E", "G"]);
    expect(buildTriad("A", "minor")).toEqual(["A", "C", "E"]);
  });

  it("names common intervals", () => {
    expect(intervalName(7)).toBe("perfect 5th");
  });
});
