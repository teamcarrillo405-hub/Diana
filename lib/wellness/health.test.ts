import { describe, expect, it } from "vitest";
import {
  fallbackHealthScaffold,
  firstAidStudyCards,
  goalTextIsAllowed,
  parseHealthScaffold,
  sleepRecoveryAdjustment,
} from "./health";

describe("wellness health helpers", () => {
  it("lowers default energy after rough sleep", () => {
    const result = sleepRecoveryAdjustment(
      { sleep_date: "2026-06-01", sleep_quality: "rough", sleep_hours: 7 },
      new Date("2026-06-01T15:00:00.000Z"),
    );
    expect(result.energyOverride).toBe("low");
    expect(result.show).toBe(true);
  });

  it("lowers default energy after short sleep", () => {
    const result = sleepRecoveryAdjustment(
      { sleep_date: "2026-06-01", sleep_quality: "ok", sleep_hours: 5.5 },
      new Date("2026-06-01T15:00:00.000Z"),
    );
    expect(result.energyOverride).toBe("low");
  });

  it("ignores older sleep logs", () => {
    const result = sleepRecoveryAdjustment(
      { sleep_date: "2026-05-29", sleep_quality: "rough", sleep_hours: 4 },
      new Date("2026-06-01T15:00:00.000Z"),
    );
    expect(result.show).toBe(false);
  });

  it("rejects appearance-based goal wording", () => {
    expect(goalTextIsAllowed("Run a mile", "Add two intervals")).toBe(true);
    expect(goalTextIsAllowed("Change weight", "Track pounds")).toBe(false);
  });

  it("returns CPR and first aid study cards", () => {
    const cards = firstAidStudyCards();
    expect(cards.length).toBeGreaterThanOrEqual(5);
    expect(cards[0].front).toContain("CPR");
  });

  it("parses scaffold JSON with fallback mode", () => {
    const parsed = parseHealthScaffold(
      JSON.stringify({
        prompts: ["What does the class handout say?"],
        cards: [{ title: "Ask", body: "Use class vocabulary.", action: "Write one term." }],
        checklist: ["Vocabulary"],
      }),
      "health_question",
    );
    expect(parsed.prompts[0]).toContain("handout");
  });

  it("falls back on malformed scaffold output", () => {
    expect(parseHealthScaffold("not-json", "sleep_recovery")).toEqual(fallbackHealthScaffold("sleep_recovery"));
  });
});
