import { describe, expect, it } from "vitest";
import { bionicWordParts, clampReadingIndex, splitIntoReadingLines } from "./reading-tools";

describe("bionicWordParts", () => {
  it("keeps short words fully bolded", () => {
    expect(bionicWordParts("to")).toEqual({ prefix: "to", rest: "" });
  });

  it("bolds a leading chunk and preserves punctuation", () => {
    expect(bionicWordParts("reading,")).toEqual({ prefix: "rea", rest: "ding," });
  });

  it("preserves leading punctuation", () => {
    expect(bionicWordParts('"focus')).toEqual({ prefix: '"fo', rest: "cus" });
  });
});

describe("splitIntoReadingLines", () => {
  it("splits long text into stable logical lines", () => {
    const lines = splitIntoReadingLines("One two three four five six seven eight.", 4);
    expect(lines.map((line) => line.text)).toEqual([
      "One two three four",
      "five six seven eight.",
    ]);
  });

  it("skips empty paragraphs", () => {
    expect(splitIntoReadingLines("\n\nKeep this.\n\n")).toHaveLength(1);
  });
});

describe("clampReadingIndex", () => {
  it("keeps indexes inside bounds", () => {
    expect(clampReadingIndex(-2, 3)).toBe(0);
    expect(clampReadingIndex(8, 3)).toBe(2);
    expect(clampReadingIndex(1, 3)).toBe(1);
  });
});
