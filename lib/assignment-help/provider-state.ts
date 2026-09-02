import {
  createTutorResponseEvidence,
  type TutorResponseEvidence,
  type TutorResponseVerificationLevel,
} from "@/lib/ai/tutor-response-evidence";

export const TUTOR_PROVIDER_AVAILABILITY = [
  "available",
  "degraded",
  "unavailable",
] as const;

export type TutorProviderAvailability =
  (typeof TUTOR_PROVIDER_AVAILABILITY)[number];

export const TUTOR_PROVIDER_REASON_CODES = [
  "timeout",
  "rate_limited",
  "maintenance",
  "network",
  "unknown",
] as const;

export type TutorProviderReasonCode =
  (typeof TUTOR_PROVIDER_REASON_CODES)[number];

export type TutorProviderStateInput = {
  availability: TutorProviderAvailability;
  reasonCode?: TutorProviderReasonCode;
  retryable?: boolean;
  retryAfterSeconds?: number | null;
};

export type VisibleTutorProviderState = {
  availability: TutorProviderAvailability;
  visible: boolean;
  title: string | null;
  message: string | null;
  reasonCode: TutorProviderReasonCode | null;
  retryable: boolean;
  retryAfterSeconds: number | null;
  verificationLevelCap: TutorResponseVerificationLevel;
  confidenceCap: number;
  escalationReason: string | null;
};

export function resolveVisibleTutorProviderState(
  input: TutorProviderStateInput,
): VisibleTutorProviderState {
  if (input.availability === "available") {
    return {
      availability: "available",
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

  const reasonCode = TUTOR_PROVIDER_REASON_CODES.includes(input.reasonCode ?? "unknown")
    ? input.reasonCode ?? "unknown"
    : "unknown";
  const retryAfterSeconds = boundedRetryAfter(input.retryAfterSeconds);
  const retryable = input.retryable ?? reasonCode !== "maintenance";

  if (input.availability === "degraded") {
    return {
      availability: "degraded",
      visible: true,
      title: "Verification is limited right now",
      message: "Diana can still use exact source passages or offer clearly labeled guidance, but tool checking is temporarily unavailable.",
      reasonCode,
      retryable,
      retryAfterSeconds,
      verificationLevelCap: "source_checked",
      confidenceCap: 0.7,
      escalationReason: "The verification provider is degraded, so this response cannot rely on a new tool-checked result.",
    };
  }

  return {
    availability: "unavailable",
    visible: true,
    title: "Verification needs another try",
    message: "Diana needs the source or a working verification service before checking this response. Your work is still here.",
    reasonCode,
    retryable,
    retryAfterSeconds,
    verificationLevelCap: "needs_more_information",
    confidenceCap: 0.3,
    escalationReason: "The verification provider is unavailable, so more information or a later retry is required.",
  };
}

export function applyTutorProviderStateToEvidence(
  evidence: TutorResponseEvidence,
  providerState: VisibleTutorProviderState,
): TutorResponseEvidence {
  if (!providerState.visible) return evidence;

  const verificationLevel = providerState.availability === "unavailable"
    ? "needs_more_information"
    : evidence.validatedAnchors.length > 0
      ? "source_checked"
      : "ai_guidance";

  return createTutorResponseEvidence({
    verificationLevel,
    confidence: Math.min(evidence.confidence, providerState.confidenceCap),
    validatedAnchors: evidence.validatedAnchors,
    verifierResult: evidence.verifierResult,
    limitations: [
      ...evidence.limitations,
      providerState.message ?? "Verification availability is limited.",
    ],
    escalationReason: providerState.escalationReason ?? evidence.escalationReason,
  });
}

export function parseVisibleTutorProviderState(
  value: unknown,
): VisibleTutorProviderState | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  if (!TUTOR_PROVIDER_AVAILABILITY.includes(candidate.availability as TutorProviderAvailability)) {
    return null;
  }
  const reasonCode = TUTOR_PROVIDER_REASON_CODES.includes(candidate.reasonCode as TutorProviderReasonCode)
    ? candidate.reasonCode as TutorProviderReasonCode
    : undefined;
  const retryAfterSeconds = typeof candidate.retryAfterSeconds === "number"
    ? candidate.retryAfterSeconds
    : null;
  const providerState = resolveVisibleTutorProviderState({
    availability: candidate.availability as TutorProviderAvailability,
    reasonCode,
    retryable: typeof candidate.retryable === "boolean" ? candidate.retryable : undefined,
    retryAfterSeconds,
  });
  if (
    candidate.visible !== providerState.visible ||
    candidate.title !== providerState.title ||
    candidate.message !== providerState.message ||
    candidate.reasonCode !== providerState.reasonCode ||
    candidate.retryable !== providerState.retryable ||
    candidate.retryAfterSeconds !== providerState.retryAfterSeconds ||
    candidate.verificationLevelCap !== providerState.verificationLevelCap ||
    candidate.confidenceCap !== providerState.confidenceCap ||
    candidate.escalationReason !== providerState.escalationReason
  ) return null;
  return providerState;
}

function boundedRetryAfter(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.min(3_600, Math.floor(value))
    : null;
}
