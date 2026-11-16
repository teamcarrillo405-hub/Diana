import { describe, expect, it } from "vitest";
import { formatCampusName, normalizeSchoolName } from "./school-branding";

describe("student campus naming", () => {
  it.each([
    [null, "Diana Campus"],
    ["   ", "Diana Campus"],
    ["Tigard High School", "Tigard Campus"],
    ["  Arizona   State University ", "Arizona State Campus"],
    ["Rosewood Campus", "Rosewood Campus"],
    ["Rosewood Campus High School", "Rosewood Campus"],
    ["Campus", "Campus"],
    ["University of Texas", "University of Texas Campus"],
    ["A Very Long School Name Representing Several Communities High School", "A Very Long School Name Representing Several Communities Campus"],
  ])("formats %s as %s", (input, expected) => {
    expect(formatCampusName(input)).toBe(expected);
  });
  it("rejects control characters and names over 80 characters", () => {
    expect(normalizeSchoolName("A\u0000School")).toBeUndefined();
    expect(normalizeSchoolName("X".repeat(81))).toBeUndefined();
    expect(normalizeSchoolName("  Tigard   High School  ")).toBe("Tigard High School");
  });
});
