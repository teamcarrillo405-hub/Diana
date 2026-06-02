import { describe, expect, it } from "vitest";
import {
  buildColorOutline,
  buildFallbackVisualTool,
  extractKeyTerms,
  parseDiagramAnnotationResponse,
  parseVisualToolResponse,
} from "./tools";

describe("extractKeyTerms", () => {
  it("returns stable high-signal terms", () => {
    expect(extractKeyTerms("Cells use mitochondria for energy. Cells need energy.", 3))
      .toContain("cells");
  });
});

describe("buildFallbackVisualTool", () => {
  it("builds a connected mind map", () => {
    const result = buildFallbackVisualTool("mind_map", "Biology", "cells mitochondria membrane energy");
    expect(result.nodes.length).toBeGreaterThan(1);
    expect(result.edges.length).toBeGreaterThan(0);
  });

  it("extracts timeline years", () => {
    const result = buildFallbackVisualTool("timeline", "History", "In 1776 the declaration was signed.");
    expect(result.events[0]?.date).toBe("1776");
  });
});

describe("parseVisualToolResponse", () => {
  it("parses graph JSON", () => {
    const result = parseVisualToolResponse(
      '{"title":"Cell graph","nodes":[{"id":"cell","label":"Cell"}],"edges":[],"events":[],"columns":[],"rows":[]}',
      "concept_graph",
      "Cells",
      "cell membrane",
    );
    expect(result.nodes[0]?.label).toBe("Cell");
  });
});

describe("parseDiagramAnnotationResponse", () => {
  it("clamps annotation coordinates", () => {
    const result = parseDiagramAnnotationResponse(
      '{"title":"Cell","annotations":[{"label":"Nucleus","x":120,"y":-10,"prompt":"What does it store?"}],"quizPrompt":"Label it."}',
    );
    expect(result.annotations[0]?.x).toBe(100);
    expect(result.annotations[0]?.y).toBe(0);
  });
});

describe("buildColorOutline", () => {
  it("assigns color classes to outline bands", () => {
    const bands = buildColorOutline([{ heading: "A", bullets: ["one"] }]);
    expect(bands[0]?.color).toContain("border-");
  });
});
