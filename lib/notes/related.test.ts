import { describe, expect, it } from "vitest";
import { findRelatedNotes, scoreRelatedNote, snippetForQuery, type RelatedNoteCandidate } from "./related";

const base: RelatedNoteCandidate = {
  id: "n1",
  title: "Cell respiration",
  body_text: "Cells make ATP in mitochondria using glucose and oxygen.",
  transcript_text: null,
  class_id: "bio",
  tags: ["biology", "cells"],
  ai_suggested_tags: [],
  updated_at: "2026-06-01T00:00:00Z",
};

describe("scoreRelatedNote", () => {
  it("scores overlap from text, tags, and shared class", () => {
    const candidate = {
      ...base,
      id: "n2",
      title: "Mitochondria",
      body_text: "ATP and oxygen show up in cell energy notes.",
      tags: ["cells"],
    };

    expect(scoreRelatedNote(base, candidate)).toBeGreaterThan(4);
  });

  it("does not relate the same note to itself", () => {
    expect(scoreRelatedNote(base, base)).toBe(0);
  });
});

describe("findRelatedNotes", () => {
  it("returns highest scoring related notes first", () => {
    const notes = findRelatedNotes(base, [
      { ...base, id: "n2", title: "French vocab", body_text: "bonjour merci", class_id: "fr", tags: [] },
      { ...base, id: "n3", title: "ATP review", body_text: "cells glucose oxygen ATP", tags: ["biology"] },
    ]);

    expect(notes[0].id).toBe("n3");
  });
});

describe("snippetForQuery", () => {
  it("anchors snippets near query terms", () => {
    const snippet = snippetForQuery("Start ".repeat(20) + "mitochondria makes ATP " + "end ".repeat(20), "ATP");
    expect(snippet).toContain("ATP");
  });
});
