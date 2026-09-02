import { describe, expect, it } from "vitest";

import { resolveVisibleTutorProviderState } from "@/lib/assignment-help/provider-state";

import {
  edgeAiGuidanceEvidence,
  edgeNeedsMoreInformationEvidence,
  edgeTutorProviderState,
  normalizeEdgeSourceAnchors,
} from "../../supabase/functions/_shared/tutor-response-evidence";

describe("Study Buddy Edge evidence wire contract", () => {
  it("keeps the Edge and Next provider-state wire values in parity", () => {
    expect(edgeTutorProviderState("available")).toEqual(
      resolveVisibleTutorProviderState({ availability: "available" }),
    );
    expect(edgeTutorProviderState("degraded", "timeout")).toEqual(
      resolveVisibleTutorProviderState({ availability: "degraded", reasonCode: "timeout" }),
    );
    expect(edgeTutorProviderState("unavailable", "maintenance")).toEqual(
      resolveVisibleTutorProviderState({ availability: "unavailable", reasonCode: "maintenance" }),
    );
  });

  it("keeps available output quiet and degraded output visibly labeled", () => {
    const available = edgeTutorProviderState("available");
    const degraded = edgeTutorProviderState("degraded", "timeout");

    expect(available).toEqual(expect.objectContaining({
      availability: "available",
      visible: false,
      verificationLevelCap: "tool_checked",
    }));
    expect(degraded).toEqual(expect.objectContaining({
      availability: "degraded",
      visible: true,
      title: "Verification is limited right now",
      reasonCode: "timeout",
      verificationLevelCap: "source_checked",
    }));
    expect(degraded.message).toContain("tool checking is temporarily unavailable");
  });

  it("never labels Edge model guidance or fallback output as verified", () => {
    expect(edgeAiGuidanceEvidence().verificationLevel).toBe("ai_guidance");
    expect(edgeNeedsMoreInformationEvidence("Retry required.")).toEqual(expect.objectContaining({
      verificationLevel: "needs_more_information",
      confidence: 0.2,
      escalationReason: "Retry required.",
    }));
  });

  it("bounds and validates exact source anchors before adding them to the provider prompt", () => {
    const anchors = normalizeEdgeSourceAnchors([
      {
        sourceId: "source-1",
        pageLabel: "Page 3",
        startOffset: 2,
        endOffset: 7,
        exactText: "alpha",
      },
      {
        sourceId: "source-2",
        pageLabel: "Page 4",
        startOffset: 0,
        endOffset: 5,
        exactText: "mismatch",
      },
    ]);

    expect(anchors).toEqual([{
      sourceId: "source-1",
      pageLabel: "Page 3",
      startOffset: 2,
      endOffset: 7,
      exactText: "alpha",
    }]);
  });
});
