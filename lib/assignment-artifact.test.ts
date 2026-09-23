import { describe, expect, it } from "vitest";
import {
  ASSIGNMENT_ARTIFACT_EXCLUDED_KEYS,
  ASSIGNMENT_ARTIFACT_FIELDS,
  ASSIGNMENT_ARTIFACT_SCHEMA_VERSION,
  buildAssignmentArtifact,
  assignmentProblemArtifactBlock,
  legacyArtifactBlocksForPatch,
  parseStoredAssignmentArtifactBlocks,
} from "./assignment-artifact";
import { WORKSPACE_MODES, type AssignmentWorkspaceMode } from "./assignment-workspace";

const MODE_SAMPLES: Record<
  Exclude<AssignmentWorkspaceMode, "math">,
  { key: string; value: string; label: string }
> = {
  worksheet: { key: "worksheetResponse", value: "The final response.", label: "Response" },
  writing: { key: "draft", value: "A complete essay draft.", label: "Your draft" },
  research: { key: "researchDraft", value: "A sourced research response.", label: "Draft" },
  history: { key: "historyResponse", value: "A document-based response.", label: "Response" },
  lab: { key: "labConclusion", value: "The evidence supports the hypothesis.", label: "Conclusion" },
  reading: { key: "readingResponse", value: "The passage develops the central idea.", label: "Your response" },
  language: { key: "languageAttempt", value: "Mi respuesta original.", label: "Your attempt" },
  coding: { key: "codeWork", value: "return input.map(transform);", label: "Code or pseudocode" },
  art: { key: "artStatement", value: "The contrast supports the focal point.", label: "Artist statement" },
  project: { key: "projectNotes", value: "Prototype complete; presentation next.", label: "Work notes" },
  handoff: { key: "handoffResponse", value: "I completed the attached response.", label: "Response or hand-in notes" },
};

describe("assignment artifact field registry", () => {
  it("covers every supported workspace mode", () => {
    expect(Object.keys(ASSIGNMENT_ARTIFACT_FIELDS)).toEqual([...WORKSPACE_MODES]);
  });

  it("does not register internal, scaffold, or delivery fields", () => {
    const registeredKeys = Object.values(ASSIGNMENT_ARTIFACT_FIELDS)
      .flat()
      .map((field) => field.key);

    for (const key of ASSIGNMENT_ARTIFACT_EXCLUDED_KEYS) {
      expect(registeredKeys).not.toContain(key);
    }
    expect(registeredKeys.some((key) => /scaffold|delivery|internal/iu.test(key))).toBe(false);
  });
});

describe("buildAssignmentArtifact", () => {
  it.each(
    Object.entries(MODE_SAMPLES) as Array<
      [Exclude<AssignmentWorkspaceMode, "math">, (typeof MODE_SAMPLES)[Exclude<AssignmentWorkspaceMode, "math">]]
    >,
  )("builds a canonical %s artifact", (mode, sample) => {
    const artifact = buildAssignmentArtifact({
      mode,
      title: "  Unit assignment  ",
      savedWork: {
        [sample.key]: `  ${sample.value}  `,
        workspaceMode: mode,
        workProfile: mode,
        workProfileSource: "student_selected",
        delivery: "file_upload",
        scaffold: "teacher hint",
        labScaffold: "{\"answer\":\"internal\"}",
        internalDebugState: "do not expose",
        anotherModeField: "do not expose",
      },
    });

    expect(artifact).toEqual({
      schemaVersion: ASSIGNMENT_ARTIFACT_SCHEMA_VERSION,
      mode,
      artifactType: null,
      title: "Unit assignment",
      sections: [{ key: sample.key, label: sample.label, content: sample.value }],
      blocks: [{
        id: sample.key,
        key: sample.key,
        type: "rich_text",
        capability: "rich_text",
        label: sample.label,
        position: 0,
        content: { text: sample.value },
        plainText: sample.value,
        sourceAnchors: [],
      }],
      plainText: `Unit assignment\n\n${sample.label}\n${sample.value}`,
      isEmpty: false,
    });
    expect(JSON.stringify(artifact)).not.toMatch(/teacher hint|file_upload|internalDebugState|anotherModeField/iu);
  });

  it("keeps only non-empty string fields in registry order", () => {
    const artifact = buildAssignmentArtifact({
      mode: "writing",
      savedWork: {
        draft: "  Draft body  ",
        writingPlan: "  ",
        writingThesis: "  Main claim  ",
        extra: "not canonical",
      },
    });

    expect(artifact.sections).toEqual([
      { key: "writingThesis", label: "Thesis or main claim", content: "Main claim" },
      { key: "draft", label: "Your draft", content: "Draft body" },
    ]);
    expect(artifact.blocks).toHaveLength(2);
    expect(artifact.plainText).toBe(
      "Thesis or main claim\nMain claim\n\nYour draft\nDraft body",
    );
  });

  it("builds math artifacts from student work and excludes problem scaffolds", () => {
    const artifact = buildAssignmentArtifact({
      mode: "math",
      title: "Equations",
      savedWork: {
        workspaceMode: "math",
        delivery: "canvas_text",
      },
      problems: [
        {
          problemNumber: 2,
          problemText: "2x = 10",
          studentWork: { work: "Divide both sides by 2.", answer: "x = 5", hint: "ignore" },
          scaffold: { steps: [{ prompt: "Internal AI prompt" }] },
          delivery: "ignore",
        },
        {
          problemNumber: 1,
          problemText: "x + 3 = 7",
          studentWork: { answer: "x = 4" },
          scaffold: "ignore",
        },
      ],
    });

    expect(artifact.sections).toEqual([
      {
        key: "problem-1",
        label: "Problem 1",
        content: "Problem: x + 3 = 7\n\nAnswer:\nx = 4",
      },
      {
        key: "problem-2",
        label: "Problem 2",
        content: "Problem: 2x = 10\n\nWork:\nDivide both sides by 2.\n\nAnswer:\nx = 5",
      },
    ]);
    expect(artifact.blocks.every((block) => block.type === "equation")).toBe(true);
    expect(artifact.blocks.every((block) => block.capability === "equation_editor")).toBe(true);
    expect(JSON.stringify(artifact)).not.toMatch(/scaffold|internal ai prompt|canvas_text|delivery|hint/iu);
  });

  it("supports the compatibility positional signature", () => {
    const artifact = buildAssignmentArtifact("handoff", {
      handoffResponse: "Bring the signed form.",
      delivery: "physical",
    });

    expect(artifact.mode).toBe("handoff");
    expect(artifact.sections).toEqual([
      {
        key: "handoffResponse",
        label: "Response or hand-in notes",
        content: "Bring the signed form.",
      },
    ]);
  });

  it("returns an empty artifact for malformed or blank saved work", () => {
    expect(buildAssignmentArtifact({
      mode: "reading",
      title: " ",
      savedWork: {
        readingNotes: 42,
        readingEvidence: null,
        readingResponse: " ",
        delivery: "print",
      },
    })).toEqual({
      schemaVersion: 2,
      mode: "reading",
      artifactType: null,
      title: null,
      sections: [],
      blocks: [],
      plainText: "",
      isEmpty: true,
    });
  });

  it("exports every supplied typed capability block in stable order", () => {
    const artifact = buildAssignmentArtifact({
      mode: "project",
      artifactType: "engineering_design",
      title: "Bridge prototype",
      blocks: [
        {
          id: "notebook-1",
          type: "design_notebook",
          capability: "design_notebook",
          label: "Design notebook",
          content: { text: "Criteria, constraints, and revision notes." },
          sourceAnchors: [{ sourceId: "source-1", location: "Rubric item 2" }],
        },
        {
          key: "bom",
          type: "spreadsheet",
          capability: "spreadsheet",
          label: "Bill of materials",
          content: { rows: [["Wood", "4"], ["Glue", "1"]] },
          plainText: "Wood: 4\nGlue: 1",
        },
        {
          type: "cad",
          capability: "cad_workspace",
          label: "CAD model",
          content: { fileName: "bridge.gltf" },
        },
      ],
    });

    expect(artifact.schemaVersion).toBe(2);
    expect(artifact.artifactType).toBe("engineering_design");
    expect(artifact.blocks.map((block) => block.type)).toEqual([
      "design_notebook",
      "spreadsheet",
      "cad",
    ]);
    expect(artifact.blocks[0]?.sourceAnchors).toEqual([
      { sourceId: "source-1", location: "Rubric item 2" },
    ]);
    expect(artifact.blocks.map((block) => block.position)).toEqual([0, 1, 2]);
    expect(artifact.plainText).toBe(
      "Bridge prototype\n\nDesign notebook\nCriteria, constraints, and revision notes.\n\nBill of materials\nWood: 4\nGlue: 1",
    );
    expect(artifact.isEmpty).toBe(false);
  });

  it("keeps metadata-only capability blocks without treating them as completed work", () => {
    const artifact = buildAssignmentArtifact({
      mode: "art",
      artifactType: "music_score",
      blocks: [{
        type: "music_notation",
        capability: "music_notation",
        label: "Score",
        content: { fileName: "composition.musicxml" },
      }],
    });

    expect(artifact.blocks).toHaveLength(1);
    expect(artifact.plainText).toBe("");
    expect(artifact.isEmpty).toBe(true);
  });

  it("does not treat an imported math prompt as student-authored work", () => {
    const artifact = buildAssignmentArtifact({
      mode: "math",
      problems: [{ problemNumber: 1, problemText: "Solve 2x = 10", studentWork: {} }],
    });

    expect(artifact.blocks[0]?.plainText).toContain("Problem: Solve 2x = 10");
    expect(artifact.isEmpty).toBe(true);
  });

  it("rejects unsupported modes at the runtime boundary", () => {
    expect(() => buildAssignmentArtifact({
      mode: "unknown" as AssignmentWorkspaceMode,
      savedWork: {},
    })).toThrowError("Unsupported assignment workspace mode: unknown");
  });

  it("adapts legacy field and problem patches into typed blocks", () => {
    expect(legacyArtifactBlocksForPatch("writing", {
      writingThesis: "A supported claim",
      draft: "Student draft",
      delivery: "canvas_text",
    })).toEqual([
      expect.objectContaining({ key: "writingThesis", type: "rich_text", position: 0 }),
      expect.objectContaining({ key: "draft", type: "rich_text", position: 2 }),
    ]);

    expect(assignmentProblemArtifactBlock({
      problemNumber: 3,
      problemText: "2x = 10",
      studentWork: { work: "Divide by 2", answer: "x = 5" },
    })).toEqual(expect.objectContaining({
      key: "problem-3",
      type: "equation",
      position: 2,
      plainText: "Problem: 2x = 10\n\nWork:\nDivide by 2\n\nAnswer:\nx = 5",
    }));
  });

  it("validates and orders typed blocks loaded from storage", () => {
    expect(parseStoredAssignmentArtifactBlocks([
      {
        id: "two",
        block_key: "map",
        block_type: "map",
        capability: "map_workspace",
        label: "Evidence map",
        position: 2,
        content: { type: "FeatureCollection" },
        plain_text: "Map of watershed evidence",
        source_anchors: [{ sourceId: "source-2", location: "page 4" }],
      },
      {
        id: "one",
        block_key: "notes",
        block_type: "rich_text",
        capability: "rich_text",
        label: "Explanation",
        position: 1,
        content: { text: "Explanation" },
        plain_text: "Explanation",
        source_anchors: [],
      },
      {
        block_key: "unsafe",
        block_type: "unknown",
        capability: "code_runner",
        label: "Ignored",
      },
    ]).map((block) => block.key)).toEqual(["notes", "map"]);
  });
});
