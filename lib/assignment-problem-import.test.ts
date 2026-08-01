import { describe, expect, it } from "vitest";
import { parseImportedProblems } from "./assignment-problem-import";

describe("parseImportedProblems", () => {
  it("extracts an ordered queue from numbered worksheet text", () => {
    expect(parseImportedProblems("1. Solve 2x + 3 = 9\n2. Graph y = 2x\n3. Explain the slope")).toEqual([
      { number: 1, text: "Solve 2x + 3 = 9" },
      { number: 2, text: "Graph y = 2x" },
      { number: 3, text: "Explain the slope" },
    ]);
  });

  it("keeps ambiguous unnumbered material out of the queue", () => {
    expect(parseImportedProblems("Read the article, then write a response.")).toEqual([]);
  });
});
