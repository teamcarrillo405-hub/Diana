import { describe, expect, it } from "vitest";
import { normalizeNoteTags, suggestTagsFromText } from "./tags";

describe("normalizeNoteTags", () => {
  it("normalizes case, spaces, hashes, and duplicates", () => {
    expect(normalizeNoteTags(["#Cell Biology", "cell biology", "DNA!"])).toEqual([
      "cell-biology",
      "dna",
    ]);
  });

  it("drops tiny and overlong tags", () => {
    expect(normalizeNoteTags(["a", "this-tag-name-is-way-too-long-for-the-ui"])).toEqual([]);
  });
});

describe("suggestTagsFromText", () => {
  it("returns frequent note terms in stable order", () => {
    expect(suggestTagsFromText("Cells use energy. Cells have membranes. Energy moves.", 3)).toEqual([
      "cells",
      "energy",
      "membranes",
    ]);
  });
});
