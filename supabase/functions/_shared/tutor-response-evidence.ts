export type TutorResponseVerificationLevel =
  | "tool_checked"
  | "source_checked"
  | "ai_guidance"
  | "needs_more_information";

export type TutorValidatedAnchor = {
  sourceId: string;
  pageLabel: string;
  startOffset: number;
  endOffset: number;
  exactText: string;
};

export type TutorVerifierResult = {
  verifier:
    | "numeric_equivalence"
    | "units_and_significant_figures"
    | "chemical_equation_balance"
    | "code_test_result"
    | "source_span"
    | "linear_equation_step";
  status: "passed" | "not_passed" | "inconclusive" | "not_run";
  summary: string;
  observations: string[];
  limitations: string[];
};

export type TutorResponseEvidence = {
  verificationLevel: TutorResponseVerificationLevel;
  confidence: number;
  validatedAnchors: TutorValidatedAnchor[];
  verifierResult: TutorVerifierResult | null;
  limitations: string[];
  escalationReason: string | null;
};

export type TutorProviderState = {
  availability: "available" | "degraded" | "unavailable";
  visible: boolean;
  title: string | null;
  message: string | null;
  reasonCode: "timeout" | "rate_limited" | "maintenance" | "network" | "unknown" | null;
  retryable: boolean;
  retryAfterSeconds: number | null;
  verificationLevelCap: TutorResponseVerificationLevel;
  confidenceCap: number;
  escalationReason: string | null;
};

export function edgeAiGuidanceEvidence(
  limitations: string[] = [],
): TutorResponseEvidence {
  return {
    verificationLevel: "ai_guidance",
    confidence: 0.65,
    validatedAnchors: [],
    verifierResult: null,
    limitations: [...new Set([
      "This response is AI guidance and has not been independently tool checked.",
      ...limitations,
    ])].slice(0, 12),
    escalationReason: null,
  };
}

export function edgeNeedsMoreInformationEvidence(
  escalationReason: string,
  limitations: string[] = [],
): TutorResponseEvidence {
  return {
    verificationLevel: "needs_more_information",
    confidence: 0.2,
    validatedAnchors: [],
    verifierResult: null,
    limitations: [...new Set(limitations)].slice(0, 12),
    escalationReason,
  };
}

export function edgeTutorProviderState(
  availability: TutorProviderState["availability"],
  reasonCode: NonNullable<TutorProviderState["reasonCode"]> = "unknown",
): TutorProviderState {
  if (availability === "available") {
    return {
      availability,
      visible: false,
      title: null,
      message: null,
      reasonCode: null,
      retryable: false,
      retryAfterSeconds: null,
      verificationLevelCap: "tool_checked",
      confidenceCap: 1,
      escalationReason: null,
    };
  }
  if (availability === "degraded") {
    return {
      availability,
      visible: true,
      title: "Verification is limited right now",
      message: "Diana can still use exact source passages or offer clearly labeled guidance, but tool checking is temporarily unavailable.",
      reasonCode,
      retryable: reasonCode !== "maintenance",
      retryAfterSeconds: null,
      verificationLevelCap: "source_checked",
      confidenceCap: 0.7,
      escalationReason: "The verification provider is degraded, so this response cannot rely on a new tool-checked result.",
    };
  }
  return {
    availability,
    visible: true,
    title: "Verification needs another try",
    message: "Diana needs the source or a working verification service before checking this response. Your work is still here.",
    reasonCode,
    retryable: reasonCode !== "maintenance",
    retryAfterSeconds: null,
    verificationLevelCap: "needs_more_information",
    confidenceCap: 0.3,
    escalationReason: "The verification provider is unavailable, so more information or a later retry is required.",
  };
}

export function normalizeEdgeSourceAnchors(value: unknown): TutorValidatedAnchor[] {
  if (!Array.isArray(value)) return [];
  const anchors: TutorValidatedAnchor[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const candidate = item as Record<string, unknown>;
    const sourceId = typeof candidate.sourceId === "string" ? candidate.sourceId.trim() : "";
    const pageLabel = typeof candidate.pageLabel === "string" ? candidate.pageLabel.trim() : "";
    const exactText = typeof candidate.exactText === "string" ? candidate.exactText : "";
    const startOffset = candidate.startOffset;
    const endOffset = candidate.endOffset;
    if (
      !sourceId || !pageLabel || !exactText || exactText.length > 1_600 ||
      !Number.isInteger(startOffset) || !Number.isInteger(endOffset) ||
      Number(startOffset) < 0 || Number(endOffset) <= Number(startOffset) ||
      exactText.length !== Number(endOffset) - Number(startOffset)
    ) continue;
    anchors.push({
      sourceId,
      pageLabel,
      startOffset: Number(startOffset),
      endOffset: Number(endOffset),
      exactText,
    });
    if (anchors.length >= 4) break;
  }
  return anchors;
}
