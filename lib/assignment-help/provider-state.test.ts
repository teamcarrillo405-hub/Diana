import { describe, expect, it } from "vitest";

import { createTutorResponseEvidence } from "@/lib/ai/tutor-response-evidence";

import {
  applyTutorProviderStateToEvidence,
  parseVisibleTutorProviderState,
  resolveVisibleTutorProviderState,
} from "./provider-state";

describe("visible tutor provider state", () => {
  it("keeps the healthy provider state out of the visible warning surface", () => {
    const state = resolveVisibleTutorProviderState({ availability: "available" });

    expect(state.visible).toBe(false);
    expect(state.title).toBeNull();
    expect(state.message).toBeNull();
    expect(state.verificationLevelCap).toBe("tool_checked");
  });

  it("makes degraded verification visible and removes unsupported tool labeling", () => {
    const state = resolveVisibleTutorProviderState({
      availability: "degraded",
      reasonCode: "timeout",
      retryAfterSeconds: 90,
    });
    const originalEvidence = createTutorResponseEvidence({
      verificationLevel: "tool_checked",
      confidence: 0.98,
      verifierResult: {
        verifier: "numeric_equivalence",
        status: "passed",
        summary: "A prior check was recorded.",
        observations: [],
        limitations: [],
      },
    });
    const limitedEvidence = applyTutorProviderStateToEvidence(originalEvidence, state);

    expect(state).toEqual(expect.objectContaining({
      visible: true,
      availability: "degraded",
      retryable: true,
      retryAfterSeconds: 90,
      verificationLevelCap: "source_checked",
    }));
    expect(state.title).toContain("Verification is limited");
    expect(state.message).toContain("tool checking is temporarily unavailable");
    expect(limitedEvidence.verificationLevel).toBe("ai_guidance");
    expect(limitedEvidence.confidence).toBe(0.7);
    expect(limitedEvidence.limitations).toContain(state.message);
  });

  it("retains exact source evidence as the strongest degraded fallback", () => {
    const state = resolveVisibleTutorProviderState({ availability: "degraded" });
    const sourceEvidence = createTutorResponseEvidence({
      verificationLevel: "source_checked",
      confidence: 0.9,
      validatedAnchors: [{
        sourceId: "source-1",
        pageLabel: "Page 4",
        startOffset: 2,
        endOffset: 8,
        exactText: "anchor",
      }],
    });
    const limitedEvidence = applyTutorProviderStateToEvidence(sourceEvidence, state);

    expect(limitedEvidence.verificationLevel).toBe("source_checked");
    expect(limitedEvidence.validatedAnchors).toHaveLength(1);
    expect(limitedEvidence.confidence).toBe(0.7);
  });

  it("uses needs-more-information evidence when verification is unavailable", () => {
    const state = resolveVisibleTutorProviderState({
      availability: "unavailable",
      reasonCode: "maintenance",
    });
    const guidance = createTutorResponseEvidence({
      verificationLevel: "ai_guidance",
      confidence: 0.65,
    });
    const limitedEvidence = applyTutorProviderStateToEvidence(guidance, state);

    expect(state.visible).toBe(true);
    expect(state.retryable).toBe(false);
    expect(state.message).toContain("Your work is still here");
    expect(limitedEvidence.verificationLevel).toBe("needs_more_information");
    expect(limitedEvidence.escalationReason).toContain("later retry");
    expect(limitedEvidence.confidence).toBe(0.3);
  });

  it("rejects a wire state that would hide a visible degradation", () => {
    const degraded = resolveVisibleTutorProviderState({
      availability: "degraded",
      reasonCode: "timeout",
    });

    expect(parseVisibleTutorProviderState(degraded)).toEqual(degraded);
    expect(parseVisibleTutorProviderState({
      ...degraded,
      availability: "available",
    })).toBeNull();
  });
});
