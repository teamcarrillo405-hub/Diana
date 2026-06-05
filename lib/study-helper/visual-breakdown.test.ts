import { describe, expect, it } from "vitest";
import { buildVisualBreakdown } from "./visual-breakdown";

describe("visual breakdown", () => {
  it("builds subject-native boards with source anchors", () => {
    const board = buildVisualBreakdown({
      assignmentKind: "problem_set",
      sourceAnchors: [{ label: "Assignment prompt sentence 1", sourceType: "assignment", detail: "Solve for x." }],
    });
    expect(board.kind).toBe("math_step_board");
    expect(board.sourceAnchored).toBe(true);
    expect(board.blocks.map((block) => block.label)).toEqual(["Known", "Needed", "Rule", "Check"]);
    expect(board.storyboard.format).toBe("board");
    expect(board.storyboard.altText).toContain("source anchor");
    expect(board.storyboard.interactionPrompt).toContain("known value");
  });

  it("uses AP mode for test prep", () => {
    const board = buildVisualBreakdown({ assignmentKind: "test_prep", className: "AP Biology" });
    expect(board.kind).toBe("ap_exam_board");
    expect(board.storyboard.format).toBe("compare_table");
  });
});
