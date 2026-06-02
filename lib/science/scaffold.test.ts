import { describe, expect, it } from "vitest";
import { fallbackScienceScaffold, parseScienceScaffoldResponse } from "./scaffold";

describe("parseScienceScaffoldResponse", () => {
  it("parses structured science cards", () => {
    const result = parseScienceScaffoldResponse(
      '{"title":"Lab","cards":[{"label":"Question","prompt":"What changes?","exampleFrame":"I notice..."}],"formulaContext":[{"variable":"v","meaning":"velocity","unit":"m/s"}],"mermaid":"flowchart TD\\nA-->B","checkPrompt":"Check data."}',
      "lab_report",
    );
    expect(result.cards[0]?.label).toBe("Question");
    expect(result.formulaContext[0]?.unit).toBe("m/s");
    expect(result.mermaid).toContain("flowchart");
  });

  it("falls back for non-json", () => {
    const result = parseScienceScaffoldResponse("start with a prediction", "hypothesis");
    expect(result.cards[0]?.label).toBe("Predict");
  });
});

describe("fallbackScienceScaffold", () => {
  it("uses CER cards for FRQ mode", () => {
    const result = fallbackScienceScaffold("frq");
    expect(result.cards.map((card) => card.label)).toEqual(["Claim", "Evidence", "Reasoning"]);
  });
});
