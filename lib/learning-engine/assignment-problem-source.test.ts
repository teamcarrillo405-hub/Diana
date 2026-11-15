import { describe, expect, it } from "vitest";
import { assignmentProblemSourceState } from "./assignment-problem-source";

describe("assignment problem source confirmation", () => {
  it("trusts only student-entered or explicitly confirmed imported text", () => {
    expect(assignmentProblemSourceState("manual").interpretation).toBe("original");
    expect(assignmentProblemSourceState("student_confirmed_source").interpretation).toBe("confirmed");
    for (const source of ["assignment_source", "photo_scan", "unknown"])
      expect(assignmentProblemSourceState(source).interpretation).toBe("model_extraction");
    expect(assignmentProblemSourceState("assignment_source", "source").description).toContain("generated work step");
    expect(assignmentProblemSourceState("student_confirmed_source", "source").interpretation).toBe("model_extraction");
  });
});
