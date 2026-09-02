import { describe, expect, it } from "vitest";

import { createTutorResponseEvidence } from "@/lib/ai/tutor-response-evidence";
import type { AssignmentHomeworkKernel } from "@/lib/assignment-help/server-understanding";
import {
  addTrustedStudyBuddySourceEvidence,
  buildStudyBuddySourceEvidenceContext,
  linearEquationTutorEvidence,
  studyBuddySourceAnchorLabel,
} from "@/lib/assignment-help/study-buddy-evidence";

function kernel(): AssignmentHomeworkKernel {
  return {
    assignment: {
      id: "assignment-1",
      title: "Physics practice",
      description: "Use the stored reading before explaining the result.",
      rubric_text: "Cite the page used.",
      kind: "homework",
      class_id: "class-1",
      work_profile: null,
      assignment_profile: null,
    },
    sources: [
      {
        id: "source-1",
        source_type: "attachment",
        title: "Motion notes",
        extracted_text: "Momentum equals mass times velocity. Keep the units visible.",
        source_location: "Page 4",
        import_status: "imported",
      },
      {
        id: "source-2",
        source_type: "attachment",
        title: "Unusable notes",
        extracted_text: "This text must not become a trusted anchor.",
        source_location: "Page 8",
        import_status: "failed",
      },
    ],
  } as AssignmentHomeworkKernel;
}

describe("Study Buddy source evidence integration", () => {
  it("retrieves and exact-validates bounded spans from stored assignment sources", () => {
    const context = buildStudyBuddySourceEvidenceContext(kernel(), "How do I use momentum?");

    expect(context.chunks).toContainEqual(expect.objectContaining({
      sourceId: "source-1",
      pageLabel: "Page 4",
      text: "Momentum equals mass times velocity. Keep the units visible.",
    }));
    expect(context.validatedAnchors).toContainEqual({
      sourceId: "source-1",
      pageLabel: "Page 4",
      startOffset: 0,
      endOffset: "Momentum equals mass times velocity. Keep the units visible.".length,
      exactText: "Momentum equals mass times velocity. Keep the units visible.",
    });
    expect(JSON.stringify(context)).not.toContain("This text must not become a trusted anchor");
    expect(studyBuddySourceAnchorLabel(context)).toContain("Motion notes, Page 4");
  });

  it("attaches exact source context without falsely promoting AI guidance", () => {
    const guidance = createTutorResponseEvidence({
      verificationLevel: "ai_guidance",
      confidence: 0.6,
      limitations: ["Interpretation remains student-owned."],
    });

    const sourceContext = addTrustedStudyBuddySourceEvidence(
      guidance,
      buildStudyBuddySourceEvidenceContext(kernel(), "momentum"),
    );
    const ungrounded = addTrustedStudyBuddySourceEvidence(guidance, {
      storedSources: [],
      chunks: [],
      validatedAnchors: [],
    });

    expect(sourceContext.verificationLevel).toBe("ai_guidance");
    expect(sourceContext.validatedAnchors).toHaveLength(1);
    expect(sourceContext.limitations).toContain(
      "Exact stored spans were supplied as context, but the generated answer was not independently source checked.",
    );
    expect(ungrounded.verificationLevel).toBe("ai_guidance");
  });

  it("keeps the deterministic algebra verifier tool checked", () => {
    const evidence = linearEquationTutorEvidence(
      buildStudyBuddySourceEvidenceContext(kernel(), "momentum"),
    );

    expect(evidence.verificationLevel).toBe("tool_checked");
    expect(evidence.verifierResult).toEqual(expect.objectContaining({
      verifier: "linear_equation_step",
      status: "passed",
    }));
  });
});
