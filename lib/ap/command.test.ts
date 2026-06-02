import { describe, expect, it } from "vitest";
import {
  AP_SUBJECTS,
  apMilestonePlan,
  daysUntilExam,
  fallbackApScaffold,
  parseApScaffold,
  scoreBand,
} from "./command";

describe("AP command center helpers", () => {
  it("covers the planned AP subject list", () => {
    expect(AP_SUBJECTS.map((subject) => subject.id)).toEqual([
      "us_history",
      "world_history",
      "english_language",
      "english_literature",
      "biology",
      "chemistry",
      "physics",
      "calculus_ab",
      "calculus_bc",
      "statistics",
      "computer_science_a",
      "computer_science_principles",
      "spanish",
      "french",
      "art_history",
      "psychology",
      "microeconomics",
      "macroeconomics",
      "government",
    ]);
  });

  it("builds structured FRQ outline by subject format", () => {
    const history = fallbackApScaffold("us_history", "frq_outline");
    const science = fallbackApScaffold("biology", "frq_outline");
    expect(history.outline.some((step) => step.label === "Document groups")).toBe(true);
    expect(science.outline.map((step) => step.label)).toEqual(["Claim", "Evidence", "Reasoning"]);
  });

  it("requires MCQ explanations for every normalized choice", () => {
    const parsed = parseApScaffold(JSON.stringify({
      questions: [{
        stem: "Which option is best supported?",
        bestChoice: "B",
        skill: "evidence",
        choices: [
          { label: "A", text: "Broad claim", explanation: "Less supported." },
          { label: "B", text: "Evidence claim", explanation: "Best fit." },
        ],
      }],
    }), "english_language", "mcq_practice");
    expect(parsed.questions[0].choices.every((choice) => choice.explanation.length > 0)).toBe(true);
  });

  it("returns calm score bands", () => {
    expect(scoreBand(34, 50).message).toBe("You're in the 3-4 range based on this practice set.");
    expect(scoreBand(44, 50).band).toBe("4-5");
  });

  it("counts days until exam from UTC date", () => {
    expect(daysUntilExam("2026-05-05", new Date("2026-05-01T12:00:00.000Z"))).toBe(4);
  });

  it("changes milestone plan by time window", () => {
    expect(apMilestonePlan("statistics", "2026-05-05", new Date("2026-02-01T12:00:00.000Z"))[0]).toContain("foundation");
    expect(apMilestonePlan("statistics", "2026-05-05", new Date("2026-05-03T12:00:00.000Z"))[0]).toContain("light review");
  });
});
