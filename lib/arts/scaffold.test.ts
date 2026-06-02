import { describe, expect, it } from "vitest";
import { fallbackArtsScaffold, parseArtsScaffold } from "./scaffold";

describe("arts scaffold parsing", () => {
  it("keeps art reflection prompts before AI comments", () => {
    const result = fallbackArtsScaffold("art_reflection");
    expect(result.prompts[0]).toMatch(/What did you make/);
    expect(result.cards[0].title).toBe("Process");
  });

  it("covers major/minor scale and triad concepts in music fallback", () => {
    const result = fallbackArtsScaffold("music_theory");
    expect(result.cards.map((card) => card.body).join(" ")).toMatch(/Major/);
    expect(result.cards.map((card) => card.body).join(" ")).toMatch(/triad/i);
  });

  it("parses valid model JSON with fallbacks", () => {
    const result = parseArtsScaffold(JSON.stringify({
      prompts: ["What material did you choose?"],
      cards: [{ title: "Look", body: "Observe before judging.", action: "List three details." }],
      checklist: ["Observe"],
    }), "art_history");
    expect(result.mode).toBe("art_history");
    expect(result.prompts).toEqual(["What material did you choose?"]);
    expect(result.cards[0].title).toBe("Look");
  });
});
