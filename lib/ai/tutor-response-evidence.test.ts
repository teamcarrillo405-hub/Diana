import { describe, expect, it } from "vitest";

import {
  canClaimTutorResponseVerified,
  createTutorResponseEvidence,
  parseTutorResponseEvidence,
  tutorResponseEvidenceLabel,
  tutorResponseNeedsMoreInformation,
  type TutorValidatedAnchor,
  type TutorVerifierResult,
} from "./tutor-response-evidence";

const anchor: TutorValidatedAnchor = {
  sourceId: "source-1",
  pageLabel: "Page 2",
  startOffset: 0,
  endOffset: 11,
  exactText: "stored text",
};

function verifier(
  status: TutorVerifierResult["status"],
): TutorVerifierResult {
  return {
    verifier: "numeric_equivalence",
    status,
    summary: "Numeric check recorded.",
    observations: [],
    limitations: ["The method is not checked."],
  };
}

describe("TutorResponseEvidence", () => {
  it("keeps a conclusive tool result and exposes only a passing result as verified", () => {
    const passing = createTutorResponseEvidence({
      verificationLevel: "tool_checked",
      confidence: 1.4,
      verifierResult: verifier("passed"),
    });
    const notPassing = createTutorResponseEvidence({
      verificationLevel: "tool_checked",
      confidence: 0.9,
      verifierResult: verifier("not_passed"),
    });

    expect(passing.verificationLevel).toBe("tool_checked");
    expect(passing.confidence).toBe(1);
    expect(canClaimTutorResponseVerified(passing)).toBe(false);
    expect(canClaimTutorResponseVerified(passing, {
      validateToolResult: (result) => result.summary === "Numeric check recorded.",
    })).toBe(true);
    expect(notPassing.verificationLevel).toBe("tool_checked");
    expect(canClaimTutorResponseVerified(notPassing, {
      validateToolResult: () => true,
    })).toBe(false);
  });

  it("downgrades an unrun tool claim to the strongest evidence actually present", () => {
    const sourceBacked = createTutorResponseEvidence({
      verificationLevel: "tool_checked",
      confidence: 0.99,
      validatedAnchors: [anchor],
      verifierResult: verifier("not_run"),
    });
    const guidanceOnly = createTutorResponseEvidence({
      verificationLevel: "tool_checked",
      confidence: 0.99,
      verifierResult: verifier("inconclusive"),
    });

    expect(sourceBacked.verificationLevel).toBe("source_checked");
    expect(sourceBacked.confidence).toBe(0.95);
    expect(sourceBacked.limitations.join(" ")).toContain("not labeled as tool checked");
    expect(guidanceOnly.verificationLevel).toBe("ai_guidance");
    expect(guidanceOnly.confidence).toBe(0.7);
  });

  it("does not allow source-checked labeling without an exact validated anchor", () => {
    const evidence = createTutorResponseEvidence({
      verificationLevel: "source_checked",
      confidence: 0.92,
      validatedAnchors: [{ ...anchor, endOffset: 12 }],
    });

    expect(evidence.verificationLevel).toBe("ai_guidance");
    expect(evidence.validatedAnchors).toEqual([]);
    expect(canClaimTutorResponseVerified(evidence)).toBe(false);
  });

  it("requires independent exact-span validation before a source claim is usable", () => {
    const evidence = createTutorResponseEvidence({
      verificationLevel: "source_checked",
      confidence: 0.9,
      validatedAnchors: [anchor],
    });

    expect(canClaimTutorResponseVerified(evidence)).toBe(false);
    expect(canClaimTutorResponseVerified(evidence, {
      validateSourceAnchor: (candidate) => candidate.exactText === "stored text",
    })).toBe(true);
  });

  it("requires an escalation reason and caps confidence when more information is needed", () => {
    const evidence = createTutorResponseEvidence({
      verificationLevel: "needs_more_information",
      confidence: 0.95,
      limitations: ["Source page is absent.", "Source page is absent."],
    });

    expect(tutorResponseNeedsMoreInformation(evidence)).toBe(true);
    expect(evidence.confidence).toBe(0.3);
    expect(evidence.escalationReason).toContain("More source or problem information");
    expect(evidence.limitations).toEqual(["Source page is absent."]);
  });

  it("parses a strict wire envelope without authorizing a verified claim", () => {
    const wireEnvelope = {
      verificationLevel: "source_checked",
      confidence: 0.9,
      validatedAnchors: [anchor],
      verifierResult: null,
      limitations: [],
      escalationReason: null,
    } as const;
    const parsed = parseTutorResponseEvidence(wireEnvelope);

    expect(parsed).toEqual(expect.objectContaining({ verificationLevel: "source_checked" }));
    expect(parsed ? tutorResponseEvidenceLabel(parsed) : null).toBe("Source checked: Page 2");
    expect(parsed && canClaimTutorResponseVerified(parsed)).toBe(false);
    expect(parsed && canClaimTutorResponseVerified(parsed, {
      validateSourceAnchor: (candidate) => candidate.sourceId === "source-1",
    })).toBe(true);
    expect(parseTutorResponseEvidence({
      verificationLevel: "ai_guidance",
      confidence: 0.6,
      validatedAnchors: [],
    })).toBeNull();
  });

  it("rejects wire envelopes that smuggle an unrecognized verification claim", () => {
    expect(parseTutorResponseEvidence({
      verificationLevel: "ai_guidance",
      confidence: 0.6,
      validatedAnchors: [],
      verifierResult: null,
      limitations: [],
      escalationReason: null,
      verified: true,
    })).toBeNull();
  });
});
