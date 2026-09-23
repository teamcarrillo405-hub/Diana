import { describe, expect, it } from "vitest";
import { parseAssignmentReviewResponse } from "./assignment-review";

describe("parseAssignmentReviewResponse", () => {
  it("returns the structured review from the assignment agent", () => {
    const result = parseAssignmentReviewResponse(
      '{"title":"Draft review","strength":"The claim is specific.","improvement":"Connect the quote to the claim.","nextMove":"Add one explanation sentence.","question":"What does the quote show?","evidenceAnchor":"Rubric"}',
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
});
