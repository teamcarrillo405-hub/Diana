import { describe, expect, it } from "vitest";
import { assignmentStudySource } from "./assignment-source";

describe("assignment study source", () => {
  it("retains actual problems when long tutor metadata fills the source window", () => {
    const result = assignmentStudySource([
      { problem_number: 1, problem_text: "Solve 3x + 5 = 20." },
      { problem_number: 2, problem_text: "Solve 2x - 7 = 9." },
    ], "Metadata and directions. ".repeat(1000));
    expect(result).toContain("Problem 1: Solve 3x + 5 = 20.");
    expect(result).toContain("Problem 2: Solve 2x - 7 = 9.");
    expect(result.indexOf("Problem 1")).toBeLessThan(result.indexOf("Metadata"));
    expect(result.length).toBeLessThanOrEqual(10000);
  });
  it("keeps source-only assignments usable without inventing problems", () => {
    expect(assignmentStudySource([], "A primary source reading.")).toBe("A primary source reading.");
  });
});
