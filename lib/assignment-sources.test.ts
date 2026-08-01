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
});
