export type DianaHomeworkProductTier = "direct_to_student" | "school_tier";
export type DianaHomeworkAiMode = "red" | "yellow" | "green";

export type DianaTrustRuleId =
  | "student_owned_final"
  | "adaptive_help_level"
  | "source_grounded"
  | "minor_safety"
  | "privacy_screening"
  | "usage_budget"
  | "authorship_receipt";

export type DianaHomeworkTrustDecision = {
  productTier: DianaHomeworkProductTier;
  aiMode: DianaHomeworkAiMode;
  schoolPolicyDormant: boolean;
  allowed: boolean;
  rules: DianaTrustRuleId[];
  reason: string;
};

const TRUST_RULES: DianaTrustRuleId[] = [
  "student_owned_final",
  "adaptive_help_level",
  "source_grounded",
  "minor_safety",
  "privacy_screening",
  "usage_budget",
  "authorship_receipt",
];

export function resolveDianaHomeworkProductTier(
  value: unknown = process.env.DIANA_HOMEWORK_PRODUCT_TIER,
): DianaHomeworkProductTier {
  return value === "school_tier" ? "school_tier" : "direct_to_student";
}
export function normalizeDianaAiMode(value: unknown): DianaHomeworkAiMode | null {
  return value === "red" || value === "yellow" || value === "green" ? value : null;
}

export function resolveDianaHomeworkTrust(input: {
  productTier?: DianaHomeworkProductTier | null;
  classAiMode?: unknown;
  assignmentAiModeOverride?: unknown;
  studentAiConsent?: boolean | null;
} = {}): DianaHomeworkTrustDecision {
  const productTier = input.productTier ?? resolveDianaHomeworkProductTier();
  const classMode = normalizeDianaAiMode(input.classAiMode) ?? "green";
  const override = normalizeDianaAiMode(input.assignmentAiModeOverride);

  if (input.studentAiConsent === false) {
    return {
      productTier,
      aiMode: "red",
      schoolPolicyDormant: productTier === "direct_to_student",
      allowed: false,
      rules: TRUST_RULES,
      reason: "The student has not enabled Diana AI help.",
    };
  }

  if (productTier === "school_tier") {
    const aiMode = schoolTierAiMode(classMode, override);
    return {
      productTier,
      aiMode,
      schoolPolicyDormant: false,
      allowed: aiMode === "green",
      rules: TRUST_RULES,
      reason: aiMode === "green"
        ? "School-tier AI rules allow full homework help."
        : "School-tier AI rules limit this homework help.",
    };
  }

  return {
    productTier,
    aiMode: "green",
    schoolPolicyDormant: true,
    allowed: true,
    rules: TRUST_RULES,
    reason: "Direct-to-student homework uses Diana Trust Rules instead of school AI policy gates.",
  };
}

function schoolTierAiMode(classMode: DianaHomeworkAiMode, override: DianaHomeworkAiMode | null): DianaHomeworkAiMode {
  if (classMode === "red" || override === "red") return "red";
  if (classMode === "yellow" || override === "yellow") return "yellow";
  return override ?? classMode;
}

export function assertDianaHomeworkAllowed(decision: DianaHomeworkTrustDecision): { ok: true } | { ok: false; error: string } {
  return decision.allowed
    ? { ok: true }
    : { ok: false, error: decision.reason };
}
