import { describe, expect, it } from "vitest";

import { buildSourcePacket } from "./assignment-sources";

describe("buildSourcePacket", () => {
  it("keeps assignment fallback text while adding imported instructions, rubric, and material citations", () => {
    const packet = buildSourcePacket(
      { description: "Write a response.", rubric_text: "Use evidence." },
      [
        {
          source_type: "instructions",
          title: "Canvas instructions",
          extracted_text: "Use two sources.",
        },
        {
          source_type: "rubric",
          title: "Canvas rubric",
          extracted_text: "Explain your reasoning.",
        },
        {
          source_type: "attachment",
          title: "Primary source PDF",
          source_location: "page 2",
          extracted_text: "The evidence from the source.",
        },
      ],
    );

    expect(packet.directions).toContain("Write a response.");
    expect(packet.directions).toContain("Use two sources.");
    expect(packet.rubric).toContain("Use evidence.");
    expect(packet.rubric).toContain("Explain your reasoning.");
    expect(packet.materialText).toBe("The evidence from the source.");
    expect(packet.citations).toContain("Primary source PDF, page 2");
  });
  it("preserves anchored source items, requirements, rubric criteria, and confidence", () => {
    const packet = buildSourcePacket(
      {
        description: "Write a DBQ report. Include two pieces of evidence and cite the packet.",
        rubric_text: "Evidence: 10 points\nOrganization: 5 points",
      },
      [
        {
          id: "source-1",
          source_type: "upload",
          title: "Nixon DBQ packet",
          source_location: "page 1",
          import_status: "imported",
          extracted_text: "Document A. Analyze Nixon's address and use one quote in your report.",
        },
        {
          id: "source-2",
          source_type: "rubric",
          title: "Teacher rubric",
          import_status: "partial",
          extracted_text: "Source use: 10 points\nExplanation: 10 points",
        },
      ],
    );

    expect(packet.items).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: "source-1",
        title: "Nixon DBQ packet",
        location: "page 1",
        citation: "Nixon DBQ packet, page 1",
        confidence: 0.95,
      }),
      expect.objectContaining({ id: "source-2", importStatus: "partial", confidence: 0.45 }),
    ]));
    expect(packet.requirements).toEqual(expect.arrayContaining([
      expect.objectContaining({ text: expect.stringContaining("Include two pieces of evidence") }),
      expect.objectContaining({ text: expect.stringContaining("Analyze Nixon's address"), sourceCitation: "Nixon DBQ packet, page 1" }),
    ]));
    expect(packet.rubricCriteria).toEqual(expect.arrayContaining([
      expect.objectContaining({ text: "Evidence: 10 points" }),
      expect.objectContaining({ text: "Source use: 10 points", sourceCitation: "Teacher rubric" }),
    ]));
    expect(packet.importConfidence).toBe(0.45);
  });
  it("keeps unimported links as reference-only material without pretending content was read", () => {
    const packet = buildSourcePacket(
      { description: "Use the attached research link.", rubric_text: null },
      [
        {
          source_type: "link",
          title: "Nixon Library overview",
          url: "https://example.com/nixon-overview",
          import_status: "partial",
        },
      ],
    );

    expect(packet.materialText).toContain("Reference link: Nixon Library overview");
    expect(packet.materialText).toContain("https://example.com/nixon-overview");
    expect(packet.materialText).toContain("import status: partial");
    expect(packet.materialText).toContain("content not imported");
    expect(packet.citations).toContain("Nixon Library overview");
  });
});
