import { describe, expect, it } from "vitest";
import { parseAssignmentReviewResponse } from "./assignment-review";

describe("parseAssignmentReviewResponse", () => {
  it("returns the structured review from the assignment agent", () => {
    const result = parseAssignmentReviewResponse(
      '{"title":"Draft review","strength":"The claim is specific.","improvement":"Connect the quote to the claim.","nextMove":"Add one explanation sentence.","question":"What does the quote show?","evidenceAnchor":"Rubric","visualAid":{"kind":"none","title":"","description":"","steps":[]}}',
      "writing",
    );

    expect(result.strength).toBe("The claim is specific.");
    expect(result.nextMove).toBe("Add one explanation sentence.");
    expect(result.evidenceAnchor).toBe("Rubric");
  });

  it("uses a subject-appropriate fallback for malformed content", () => {
    const result = parseAssignmentReviewResponse("not json", "math");
    expect(result.nextMove).toContain("operation");
  });
  it("parses model-provided visual aids for math", () => {
    const result = parseAssignmentReviewResponse(
      '{"title":"Math review","strength":"You started with an equation.","improvement":"Keep both sides balanced.","nextMove":"Use the inverse operation on both sides.","question":"What operation undoes adding 4?","evidenceAnchor":"Student work","visualAid":{"kind":"balance","title":"Equation balance","description":"Picture the two sides staying equal while you choose one operation.","steps":["Name what is attached to x.","Apply the inverse operation to both sides."]}}',
      "math",
    );

    expect(result.visualAid.kind).toBe("balance");
    expect(result.visualAid.steps).toHaveLength(2);
  });
});
