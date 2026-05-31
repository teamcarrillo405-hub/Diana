import { describe, it, expect } from "vitest";
import {
  tokenize,
  scoreClass,
  scoreClassMatch,
  MIN_SCORE,
  type ClassCandidate,
} from "./class-router";

describe("tokenize", () => {
  it("lowercases and splits AP US History", () => {
    expect(tokenize("AP US History")).toEqual(["ap", "us", "history"]);
  });
  it("strips punctuation and drops non-alpha tokens", () => {
    expect(tokenize("Chem-101: ionic bonds!")).toEqual(["chem", "ionic", "bonds"]);
  });
  it("removes common stop words", () => {
    expect(tokenize("The cat sat on the mat")).toEqual(["cat", "sat", "mat"]);
  });
  it("returns empty array for empty string", () => {
    expect(tokenize("")).toEqual([]);
  });
  it("removes the/a/an/of/and/to/in/on/at/for/is/was/were/be/this/that/it/i/we/they/you", () => {
    const allStops = "the a an of and or but to in on at for is was were be this that it i we they you";
    expect(tokenize(allStops)).toEqual([]);
  });
});

describe("scoreClass", () => {
  const chem: ClassCandidate = {
    id: "c1",
    name: "Chemistry",
    recentTitles: ["Ionic Bonds Lab", "Stoichiometry HW"],
  };

  it("scores 3 when name token appears in transcript (×3 weight)", () => {
    expect(scoreClass({ ...chem, recentTitles: [] }, "We covered ionic chemistry today")).toBe(3);
  });

  it("scores title hits at ×1 weight", () => {
    // name "Biology" does NOT appear; titles contribute "ionic" + "bonds"
    const transcript = "ionic bonds problem set";
    expect(scoreClass({ ...chem, name: "Biology" }, transcript)).toBe(2);
  });

  it("scores 0 when nothing matches", () => {
    expect(scoreClass(chem, "totally unrelated content here")).toBe(0);
  });

  it("uses set intersection, not bag-of-words count (each token counts at most once)", () => {
    // "ionic" appears 3× in transcript but only counts once
    expect(scoreClass({ ...chem, recentTitles: ["ionic stuff"] }, "ionic ionic ionic")).toBe(1);
  });
});

describe("scoreClassMatch", () => {
  it("returns null on empty candidate list", () => {
    expect(scoreClassMatch("anything", [])).toBeNull();
  });

  it("returns null when best score is below MIN_SCORE", () => {
    const candidates: ClassCandidate[] = [
      { id: "c1", name: "Chemistry", recentTitles: ["whatever"] },
    ];
    // "whatever" is a stop-word-adjacent low-signal token; transcript has only one weak hit
    expect(scoreClassMatch("totally unrelated text here", candidates)).toBeNull();
  });

  it("returns the class id when score >= MIN_SCORE", () => {
    const candidates: ClassCandidate[] = [
      { id: "c1", name: "Chemistry", recentTitles: [] },
    ];
    // "chemistry" name → score 3 ≥ 2 → returns c1
    expect(scoreClassMatch("today's chemistry lecture", candidates)).toBe("c1");
  });

  it("breaks ties by input order (stable)", () => {
    const candidates: ClassCandidate[] = [
      { id: "c1", name: "Chemistry", recentTitles: [] },
      { id: "c2", name: "Chemistry", recentTitles: [] },
    ];
    expect(scoreClassMatch("chemistry lecture", candidates)).toBe("c1");
  });

  it("returns highest-scoring class when scores differ", () => {
    const candidates: ClassCandidate[] = [
      { id: "c1", name: "Chemistry", recentTitles: [] },  // score 3
      { id: "c2", name: "History",   recentTitles: ["Civil War", "Reconstruction"] },  // hits: civil + war + reconstruction = 3
    ];
    expect(scoreClassMatch("civil war reconstruction primary source", candidates)).toBe("c2");
  });

  it("Pitfall 5: does NOT eagerly stem — 'chemical' does not match 'Chemistry'", () => {
    const candidates: ClassCandidate[] = [
      { id: "c1", name: "Chemistry", recentTitles: [] },
      { id: "c2", name: "English",   recentTitles: [] },
    ];
    // "chemical" is not "chemistry"; "english" hits once → score 3 for English
    // But the calm-safe expectation is that we either get c2 (English) or null.
    // Here English literally appears in transcript so c2 wins.
    expect(scoreClassMatch("the chemical equation is written in english", candidates)).toBe("c2");
  });
});

describe("MIN_SCORE", () => {
  it("equals 2", () => {
    expect(MIN_SCORE).toBe(2);
  });
});
