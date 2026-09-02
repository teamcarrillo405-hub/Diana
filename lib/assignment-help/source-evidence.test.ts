import { describe, expect, it } from "vitest";

import {
  SOURCE_RETRIEVAL_BOUNDS,
  exactCitationForChunk,
  retrievePageLabelledSourceChunks,
  validateExactStoredSpanCitation,
  validateExactStoredSpanCitations,
  type StoredPageLabelledSource,
} from "./source-evidence";

const sources: StoredPageLabelledSource[] = [
  {
    sourceId: "biology-notes",
    title: "Biology packet",
    pageLabel: "Page 1",
    text: "The opening page defines cells and introduces organelles. ".repeat(12),
  },
  {
    sourceId: "biology-notes",
    title: "Biology packet",
    pageLabel: "Page 2",
    text: [
      "Photosynthesis converts light energy into chemical energy.",
      "Inside the chloroplast, chlorophyll absorbs light during the light-dependent reactions.",
      "The stored passage keeps its punctuation and spacing exactly.",
    ].join("\n"),
  },
];

describe("bounded page-labelled source retrieval", () => {
  it("ranks matching pages and preserves exact stored offsets", () => {
    const chunks = retrievePageLabelledSourceChunks({
      sources,
      query: "chloroplast light energy",
      maxChunks: 2,
      maxChunkChars: 120,
      maxTotalChars: 180,
    });

    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0]).toEqual(expect.objectContaining({
      sourceId: "biology-notes",
      pageLabel: "Page 2",
      citationLabel: "Biology packet, Page 2",
    }));
    expect(chunks.reduce((total, chunk) => total + chunk.text.length, 0)).toBeLessThanOrEqual(180);
    for (const chunk of chunks) {
      const page = sources.find((source) =>
        source.sourceId === chunk.sourceId && source.pageLabel === chunk.pageLabel
      );
      expect(chunk.text.length).toBeLessThanOrEqual(120);
      expect(page?.text.slice(chunk.startOffset, chunk.endOffset)).toBe(chunk.text);
    }
  });

  it("enforces hard output bounds even when larger limits are requested", () => {
    const manyPages = Array.from({ length: 30 }, (_, index) => ({
      sourceId: "packet",
      pageLabel: `Page ${index + 1}`,
      text: `Target concept on page ${index + 1}. ${"supporting detail ".repeat(150)}`,
    }));
    const chunks = retrievePageLabelledSourceChunks({
      sources: manyPages,
      query: "target concept",
      maxChunks: 1_000,
      maxChunkChars: 100_000,
      maxTotalChars: 100_000,
    });

    expect(chunks.length).toBeLessThanOrEqual(SOURCE_RETRIEVAL_BOUNDS.maxChunks);
    expect(chunks.every((chunk) => chunk.text.length <= SOURCE_RETRIEVAL_BOUNDS.maxChunkChars)).toBe(true);
    expect(chunks.reduce((total, chunk) => total + chunk.text.length, 0)).toBeLessThanOrEqual(
      SOURCE_RETRIEVAL_BOUNDS.maxTotalChars,
    );
  });

  it("returns no unrelated source chunk for a non-empty query with no match", () => {
    expect(retrievePageLabelledSourceChunks({
      sources,
      query: "mitochondrial fission",
    })).toEqual([]);
  });
});

describe("exact stored-span citation validation", () => {
  it("validates a retrieved chunk without normalizing the stored text", () => {
    const [chunk] = retrievePageLabelledSourceChunks({
      sources,
      query: "chlorophyll absorbs",
      maxChunks: 1,
      maxChunkChars: 100,
    });
    const validation = validateExactStoredSpanCitation(
      exactCitationForChunk(chunk),
      sources,
    );

    expect(validation.valid).toBe(true);
    expect(validation.anchor).toEqual(exactCitationForChunk(chunk));
    expect(validation.verifierResult.status).toBe("passed");
  });

  it("rejects altered text and shifted offsets even when the passage exists nearby", () => {
    const page = sources[1];
    const exactText = "chlorophyll absorbs light";
    const startOffset = page.text.indexOf(exactText);
    const citation = {
      sourceId: page.sourceId,
      pageLabel: page.pageLabel,
      startOffset,
      endOffset: startOffset + exactText.length,
      exactText,
    };

    expect(validateExactStoredSpanCitation({
      ...citation,
      exactText: "chlorophyll absorbs Light",
    }, sources).reason).toBe("text_mismatch");
    expect(validateExactStoredSpanCitation({
      ...citation,
      startOffset: startOffset + 1,
      endOffset: citation.endOffset + 1,
    }, sources).reason).toBe("text_mismatch");
  });

  it("treats duplicate page identities as ambiguous and bounds batch validation", () => {
    const duplicateSources = [...sources, { ...sources[1] }];
    const citation = {
      sourceId: "biology-notes",
      pageLabel: "Page 2",
      startOffset: 0,
      endOffset: 14,
      exactText: sources[1].text.slice(0, 14),
    };

    expect(validateExactStoredSpanCitation(citation, duplicateSources).reason).toBe("ambiguous_page");
    expect(validateExactStoredSpanCitations(
      Array.from({ length: 25 }, () => citation),
      sources,
    )).toHaveLength(20);
  });
});
