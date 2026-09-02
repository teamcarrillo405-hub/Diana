import { describe, expect, it } from "vitest";

import { resolveAssignmentProfile } from "@/lib/assignment-profile";
import {
  buildHomeworkMasteryReadiness,
  formatHomeworkMasteryReadiness,
} from "@/lib/mastery/homework-readiness";

describe("homework mastery readiness", () => {
  const profile = resolveAssignmentProfile({
    kind: "problem_set",
    className: "Algebra 1",
    title: "Solving linear equations",
    description: "Use inverse operations and check each answer.",
  });

  it("uses only stored matching mastery as a verified bridge", () => {
    const readiness = buildHomeworkMasteryReadiness({
      profile,
      className: "Algebra 1",
      assignmentParts: ["Solving linear equations", "Use inverse operations."],
      concepts: [
        { id: "weak", name: "inverse operations", mastery_level: 1.25 },
        { id: "steady", name: "answer checking", mastery_level: 3.25 },
        { id: "other", name: "cell organelles", mastery_level: 0 },
      ],
    });

    expect(readiness.status).toBe("mapped");
    expect(readiness.requiresBridge).toBe(true);
    expect(readiness.bridgeConcepts.map((concept) => concept.name)).toEqual(["inverse operations"]);
    expect(readiness.steadyConcepts.map((concept) => concept.name)).toEqual(["answer checking"]);
    expect(readiness.matchedConcepts.some((concept) => concept.name === "cell organelles")).toBe(false);
  });

  it("labels inferred concepts as unverified when no stored mastery matches", () => {
    const readiness = buildHomeworkMasteryReadiness({
      profile,
      className: "Algebra 1",
      assignmentParts: ["Solving linear equations"],
      concepts: [],
    });

    expect(readiness.status).toBe("unmapped");
    expect(readiness.requiresBridge).toBe(false);
    expect(formatHomeworkMasteryReadiness(readiness)).toContain("Do not claim a prerequisite gap");
  });
});
