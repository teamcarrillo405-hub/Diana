import { describe, expect, it } from "vitest";
import { fallbackCsScaffold, parseCsScaffoldResponse } from "./scaffold";

describe("parseCsScaffoldResponse", () => {
  it("parses pseudocode and review fields", () => {
    const result = parseCsScaffoldResponse(
      '{"title":"Bridge","cards":[{"label":"Input","prompt":"What goes in?","studentAction":"name it"}],"pseudocodeSteps":["Get input"],"reviewQuestions":["Where does it stop?"],"checkPrompt":"Try one case."}',
      "pseudocode_bridge",
    );
    expect(result.cards[0]?.label).toBe("Input");
    expect(result.pseudocodeSteps).toEqual(["Get input"]);
    expect(result.reviewQuestions[0]).toContain("stop");
  });

  it("falls back for non-json project mode", () => {
    const result = parseCsScaffoldResponse("start with a plan", "project_scaffold");
    expect(result.milestones.map((item) => item.label)).toContain("Plan");
  });
});

describe("fallbackCsScaffold", () => {
  it("starts error hints with a question-oriented read step", () => {
    const result = fallbackCsScaffold("error_hint");
    expect(result.cards[0]?.prompt).toContain("What exact line");
  });
});
