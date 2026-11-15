import { describe, expect, it } from "vitest";

import { PREP_FIXTURES, PREP_MODES, scoreLabel } from "./fixtures";

describe("test-prep review fixtures", () => {
  it("has five pre-game preparation modes", () => {
    expect(PREP_MODES).toEqual(["Event", "Scouting", "Training", "Playbook", "Review"]);
  });

  it("keeps sample focus, practice, and plan data available for each fixture", () => {
    for (const fixture of Object.values(PREP_FIXTURES)) {
      expect(fixture.topics.length).toBeGreaterThan(0);
      expect(fixture.topics.some(topic => topic.status === "priority")).toBe(true);
      expect(fixture.plan).toHaveLength(4);
      expect(fixture.sample.answers).toHaveLength(4);
      expect(fixture.records.length).toBeGreaterThan(0);
    }
  });

  it("accepts valid student-entered practice counts only", () => {
    expect(scoreLabel("9", "12")).toBe("9 / 12");
    expect(scoreLabel("0", "1")).toBe("0 / 1");
    for (const pair of [["12", "9"], ["-1", "9"], ["", "9"], ["2.5", "9"], ["4", "0"]]) {
      expect(scoreLabel(pair[0], pair[1])).toBeNull();
    }
  });
});
