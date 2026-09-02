export const TUTOR_RESPONSE_VERIFICATION_LEVELS = [
  "tool_checked",
  "source_checked",
  "ai_guidance",
  "needs_more_information",
] as const;

export type TutorResponseVerificationLevel =
  (typeof TUTOR_RESPONSE_VERIFICATION_LEVELS)[number];

export const TUTOR_VERIFIER_NAMES = [
  "numeric_equivalence",
  "units_and_significant_figures",
  "chemical_equation_balance",
  "code_test_result",
  "source_span",
  "linear_equation_step",
] as const;

export type TutorVerifierName = (typeof TUTOR_VERIFIER_NAMES)[number];

export const TUTOR_VERIFIER_STATUSES = [
  "passed",
  "not_passed",
  "inconclusive",
  "not_run",
] as const;

export type TutorVerifierStatus = (typeof TUTOR_VERIFIER_STATUSES)[number];

export type TutorValidatedAnchor = {
  sourceId: string;
  pageLabel: string;
  startOffset: number;
  endOffset: number;
  exactText: string;
};

export type TutorVerifierResult = {
  verifier: TutorVerifierName;
  status: TutorVerifierStatus;
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

export type TutorResponseEvidenceInput = {
  verificationLevel: TutorResponseVerificationLevel;
  confidence: number;
  validatedAnchors?: readonly TutorValidatedAnchor[];
  verifierResult?: TutorVerifierResult | null;
  limitations?: readonly string[];
  escalationReason?: string | null;
};

export type TutorResponseEvidenceClaimValidator = {
  readonly validateToolResult?: (result: TutorVerifierResult) => boolean;
  readonly validateSourceAnchor?: (anchor: TutorValidatedAnchor) => boolean;
};

const MAX_ANCHORS = 12;
const MAX_ANCHOR_TEXT_CHARS = 4_000;
const MAX_LIST_ITEMS = 12;
const MAX_LIST_ITEM_CHARS = 500;
const MAX_SUMMARY_CHARS = 600;

const CONFIDENCE_CAP: Record<TutorResponseVerificationLevel, number> = {
  tool_checked: 1,
  source_checked: 0.95,
  ai_guidance: 0.7,
  needs_more_information: 0.3,
};

export function createTutorResponseEvidence(
  input: TutorResponseEvidenceInput,
): TutorResponseEvidence {
  const validatedAnchors = normalizeAnchors(input.validatedAnchors ?? []);
  const verifierResult = normalizeVerifierResult(input.verifierResult ?? null);
  const limitations = cleanList([
    ...(input.limitations ?? []),
    ...(verifierResult?.limitations ?? []),
  ]);
  let verificationLevel = input.verificationLevel;
  let escalationReason = cleanNullableText(input.escalationReason, MAX_LIST_ITEM_CHARS);

  if (verificationLevel === "tool_checked" && !isConclusiveVerifierResult(verifierResult)) {
    verificationLevel = validatedAnchors.length > 0
      ? "source_checked"
      : escalationReason
        ? "needs_more_information"
        : "ai_guidance";
    limitations.push("A conclusive tool result is not available, so this response is not labeled as tool checked.");
  }

  if (verificationLevel === "source_checked" && validatedAnchors.length === 0) {
    verificationLevel = escalationReason ? "needs_more_information" : "ai_guidance";
    limitations.push("No exact stored source span was validated, so this response is not labeled as source checked.");
  }

  if (verificationLevel === "needs_more_information" && !escalationReason) {
    escalationReason = "More source or problem information is required before Diana can verify this response.";
  }

  const normalizedLimitations = cleanList(limitations);
  const confidence = Math.min(
    normalizeConfidence(input.confidence),
    CONFIDENCE_CAP[verificationLevel],
  );

  return {
    verificationLevel,
    confidence,
    validatedAnchors,
    verifierResult,
    limitations: normalizedLimitations,
    escalationReason,
  };
}

export function canClaimTutorResponseVerified(
  evidence: TutorResponseEvidence,
  validator: TutorResponseEvidenceClaimValidator = {},
): boolean {
  if (evidence.verificationLevel === "tool_checked") {
    return evidence.verifierResult?.status === "passed" &&
      safelyValidateToolResult(evidence.verifierResult, validator);
  }
  return evidence.verificationLevel === "source_checked" &&
    safelyValidateSourceAnchors(evidence.validatedAnchors, validator);
}

export function tutorResponseNeedsMoreInformation(
  evidence: TutorResponseEvidence,
): boolean {
  return evidence.verificationLevel === "needs_more_information";
}

export function parseTutorResponseEvidence(
  value: unknown,
): TutorResponseEvidence | null {
  if (!isRecord(value)) return null;
  if (!hasExactKeys(value, [
    "verificationLevel",
    "confidence",
    "validatedAnchors",
    "verifierResult",
    "limitations",
    "escalationReason",
  ])) return null;
  if (!TUTOR_RESPONSE_VERIFICATION_LEVELS.includes(value.verificationLevel as TutorResponseVerificationLevel)) {
    return null;
  }
  if (typeof value.confidence !== "number" || !Array.isArray(value.validatedAnchors)) return null;
  if (value.validatedAnchors.length > MAX_ANCHORS) return null;
  if (!Array.isArray(value.limitations) || !value.limitations.every((item) => typeof item === "string")) {
    return null;
  }
  if (
    value.limitations.length > MAX_LIST_ITEMS ||
    value.limitations.some((item) => item.length > MAX_LIST_ITEM_CHARS)
  ) return null;
  if (value.escalationReason !== null && typeof value.escalationReason !== "string") return null;
  if (typeof value.escalationReason === "string" && value.escalationReason.length > MAX_LIST_ITEM_CHARS) {
    return null;
  }

  const anchors: TutorValidatedAnchor[] = [];
  for (const candidate of value.validatedAnchors) {
    if (!isTutorValidatedAnchor(candidate)) return null;
    anchors.push(candidate);
  }
  const parsedVerifier = parseVerifierResult(value.verifierResult);
  if (value.verifierResult !== null && !parsedVerifier) return null;

  return createTutorResponseEvidence({
    verificationLevel: value.verificationLevel as TutorResponseVerificationLevel,
    confidence: value.confidence,
    validatedAnchors: anchors,
    verifierResult: parsedVerifier,
    limitations: value.limitations,
    escalationReason: value.escalationReason,
  });
}

export function tutorResponseEvidenceLabel(
  evidence: TutorResponseEvidence,
): string {
  if (evidence.verificationLevel === "tool_checked") return "Tool checked";
  if (evidence.verificationLevel === "source_checked") {
    const pageLabel = evidence.validatedAnchors[0]?.pageLabel;
    return pageLabel ? `Source checked: ${pageLabel}` : "Source checked";
  }
  if (evidence.verificationLevel === "needs_more_information") return "Needs more information";
  return "AI guidance";
}

function isConclusiveVerifierResult(
  result: TutorVerifierResult | null,
): result is TutorVerifierResult {
  return result?.status === "passed" || result?.status === "not_passed";
}

function normalizeVerifierResult(
  result: TutorVerifierResult | null,
): TutorVerifierResult | null {
  if (!result || !TUTOR_VERIFIER_NAMES.includes(result.verifier)) return null;
  if (!TUTOR_VERIFIER_STATUSES.includes(result.status)) return null;

  return {
    verifier: result.verifier,
    status: result.status,
    summary: cleanText(result.summary, MAX_SUMMARY_CHARS) || "Verification result recorded.",
    observations: cleanList(result.observations),
    limitations: cleanList(result.limitations),
  };
}

function parseVerifierResult(value: unknown): TutorVerifierResult | null {
  if (!isRecord(value)) return null;
  if (!hasExactKeys(value, [
    "verifier",
    "status",
    "summary",
    "observations",
    "limitations",
  ])) return null;
  if (!TUTOR_VERIFIER_NAMES.includes(value.verifier as TutorVerifierName)) return null;
  if (!TUTOR_VERIFIER_STATUSES.includes(value.status as TutorVerifierStatus)) return null;
  if (typeof value.summary !== "string") return null;
  if (value.summary.length > MAX_SUMMARY_CHARS) return null;
  if (!Array.isArray(value.observations) || !value.observations.every((item) => typeof item === "string")) {
    return null;
  }
  if (!Array.isArray(value.limitations) || !value.limitations.every((item) => typeof item === "string")) {
    return null;
  }
  if (
    value.observations.length > MAX_LIST_ITEMS ||
    value.limitations.length > MAX_LIST_ITEMS ||
    [...value.observations, ...value.limitations].some(
      (item) => item.length > MAX_LIST_ITEM_CHARS,
    )
  ) return null;
  return {
    verifier: value.verifier as TutorVerifierName,
    status: value.status as TutorVerifierStatus,
    summary: value.summary,
    observations: value.observations,
    limitations: value.limitations,
  };
}

function normalizeAnchors(
  anchors: readonly TutorValidatedAnchor[],
): TutorValidatedAnchor[] {
  const unique = new Map<string, TutorValidatedAnchor>();

  for (const anchor of anchors) {
    if (!isValidAnchor(anchor)) continue;
    const sourceId = anchor.sourceId.trim();
    const pageLabel = anchor.pageLabel.trim();
    const normalized = {
      sourceId,
      pageLabel,
      startOffset: anchor.startOffset,
      endOffset: anchor.endOffset,
      exactText: anchor.exactText,
    };
    const key = [sourceId, pageLabel, anchor.startOffset, anchor.endOffset, anchor.exactText].join("\u0000");
    unique.set(key, normalized);
    if (unique.size >= MAX_ANCHORS) break;
  }

  return [...unique.values()];
}

function isValidAnchor(anchor: TutorValidatedAnchor): boolean {
  return typeof anchor?.sourceId === "string" &&
    anchor.sourceId.trim().length > 0 &&
    typeof anchor.pageLabel === "string" &&
    anchor.pageLabel.trim().length > 0 &&
    Number.isInteger(anchor.startOffset) &&
    Number.isInteger(anchor.endOffset) &&
    anchor.startOffset >= 0 &&
    anchor.endOffset > anchor.startOffset &&
    typeof anchor.exactText === "string" &&
    anchor.exactText.length === anchor.endOffset - anchor.startOffset &&
    anchor.exactText.length <= MAX_ANCHOR_TEXT_CHARS;
}

function isTutorValidatedAnchor(value: unknown): value is TutorValidatedAnchor {
  return isRecord(value) &&
    hasExactKeys(value, [
      "sourceId",
      "pageLabel",
      "startOffset",
      "endOffset",
      "exactText",
    ]) &&
    isValidAnchor(value as TutorValidatedAnchor);
}

function safelyValidateToolResult(
  result: TutorVerifierResult,
  validator: TutorResponseEvidenceClaimValidator,
): boolean {
  if (!validator.validateToolResult) return false;
  try {
    return validator.validateToolResult(result) === true;
  } catch {
    return false;
  }
}

function safelyValidateSourceAnchors(
  anchors: readonly TutorValidatedAnchor[],
  validator: TutorResponseEvidenceClaimValidator,
): boolean {
  if (anchors.length === 0 || !validator.validateSourceAnchor) return false;
  try {
    return anchors.every(
      (anchor) => isValidAnchor(anchor) && validator.validateSourceAnchor!(anchor) === true,
    );
  } catch {
    return false;
  }
}

function normalizeConfidence(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function cleanList(values: readonly string[]): string[] {
  const unique = new Set<string>();
  for (const value of values) {
    const cleaned = cleanText(value, MAX_LIST_ITEM_CHARS);
    if (cleaned) unique.add(cleaned);
    if (unique.size >= MAX_LIST_ITEMS) break;
  }
  return [...unique];
}

function cleanNullableText(value: string | null | undefined, maxChars: number): string | null {
  const cleaned = cleanText(value ?? "", maxChars);
  return cleaned || null;
}

function cleanText(value: string, maxChars: number): string {
  return value.replace(/\s+/gu, " ").trim().slice(0, maxChars);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
): boolean {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length &&
    actual.every((key, index) => key === wanted[index]);
}
