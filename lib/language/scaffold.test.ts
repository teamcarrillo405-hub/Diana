import { describe, expect, it } from "vitest";
import { fallbackLanguageScaffold, parseLanguageScaffoldResponse } from "./scaffold";

describe("parseLanguageScaffoldResponse", () => {
  it("parses vocabulary cards with cognate and interest sentence", () => {
    const result = parseLanguageScaffoldResponse(
      '{"title":"Vocab","targetLanguage":"Spanish","vocabularyCards":[{"term":"familia","meaning":"family","cognateHint":"looks like familiar","interestSentence":"Mi familia juega fútbol.","pronunciation":"fa-MI-lia"}],"checkPrompt":"Say it."}',
      "vocabulary",
      "Spanish",
    );
    expect(result.vocabularyCards[0]).toMatchObject({
      term: "familia",
      cognateHint: "looks like familiar",
    });
    expect(result.checkPrompt).toBe("Say it.");
  });

  it("falls back to conjugation rows", () => {
    const result = parseLanguageScaffoldResponse("make a table", "conjugation", "French");
    expect(result.conjugationRows.length).toBeGreaterThan(2);
    expect(result.title).toContain("French");
  });
});

describe("fallbackLanguageScaffold", () => {
  it("creates speaking prompts without grades", () => {
    const result = fallbackLanguageScaffold("speaking", "German");
    expect(result.speakingPrompts[0]?.feedbackPrompt).toContain("word");
  });
});
