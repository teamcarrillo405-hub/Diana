import { describe, expect, it } from "vitest";

import { buildSourcePacket } from "@/lib/assignment-sources";
import { resolveAssignmentProfile } from "@/lib/assignment-profile";
import { buildWorkspaceSourceSeed } from "@/lib/assignment-source-workspace";

describe("buildWorkspaceSourceSeed", () => {
  it("creates DBQ source cards, checklist, and history field hints", () => {
    const profile = resolveAssignmentProfile({ kind: "other", title: "History DBQ Nixon source analysis" });
    const packet = buildSourcePacket(
      { description: "Write a DBQ. Include two documents and explain historical context.", rubric_text: "Evidence: 10 points" },
      [{
        id: "doc-a",
        source_type: "upload",
        title: "Document A",
        source_location: "page 1",
        import_status: "imported",
        extracted_text: "Nixon address excerpt. Analyze the author's purpose and use one quote.",
      }],
    );

    const seed = buildWorkspaceSourceSeed(profile, packet);

    expect(seed.subjectDomain).toBe("social_studies");
    expect(seed.cards).toEqual([expect.objectContaining({ label: "Document A", citation: "Document A, page 1" })]);
    expect(seed.checklist).toEqual(expect.arrayContaining([
      expect.objectContaining({ text: expect.stringContaining("Include two documents") }),
      expect.objectContaining({ text: "Evidence: 10 points" }),
    ]));
    expect(seed.fieldHints.historyEvidence).toContain("Pull exact evidence");
  });

  it("maps science and coding profiles to subject-specific workspace hints", () => {
    const labPacket = buildSourcePacket(
      { description: "Record data and explain the relationship between temperature and reaction rate.", rubric_text: null },
      [],
    );
    const labSeed = buildWorkspaceSourceSeed(resolveAssignmentProfile({ kind: "lab", title: "Chemistry lab" }), labPacket);
    expect(labSeed.fieldHints.labData).toContain("measurements");

    const codePacket = buildSourcePacket(
      { description: "Write Python code. Include tests for sample input and output.", rubric_text: null },
      [],
    );
    const codeSeed = buildWorkspaceSourceSeed(resolveAssignmentProfile({ kind: "other", title: "Computer Science Python" }), codePacket);
    expect(codeSeed.fieldHints.codeTests).toContain("expected and actual results");
  });

  it("marks low-confidence extracted sources for student confirmation", () => {
    const profile = resolveAssignmentProfile({ kind: "other", title: "CAD dimensioned sketch and STL model" });
    const packet = buildSourcePacket(
      { description: "Design a bracket and include dimensions.", rubric_text: null },
      [{
        id: "cad-brief",
        source_type: "upload",
        title: "CAD brief",
        import_status: "partial",
        extracted_text: "Build a dimensioned sketch and submit an STL file.",
      }],
    );

    const seed = buildWorkspaceSourceSeed(profile, packet);

    expect(seed.confidence).toBe(0.45);
    expect(seed.needsConfirmation).toBe(true);
    expect(seed.fieldHints.projectGoal).toContain("dimensions");
  });
});
