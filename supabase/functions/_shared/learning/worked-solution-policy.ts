export type WorkedSolutionEvidence = Readonly<{
  attemptCount: number;
  unsuccessfulAttempts: number;
  stuckRequests: number;
  directAnswerRequests: number;
}>;

export type WorkedSolutionInput = Readonly<{
  hasStudentWork: boolean;
  evidence: WorkedSolutionEvidence;
  accommodations: readonly string[];
  readiness: { body?: unknown; focus?: unknown } | null;
  aiMode: unknown;
  assessmentRestricted: boolean;
}>;

export type WorkedSolutionDecision =
  | { allowed: true; support: "worked_solution"; reason: "sustained_difficulty" }
  | {
      allowed: false;
      support: "hint" | "setup";
      reason: "class_policy" | "assessment_restricted" | "student_attempt_required" | "continue_guidance";
    };

const PRESENTATION_ACCOMMODATIONS = new Set([
  "extended_time", "reduced_quantity", "alternate_format", "reader", "scribe", "breaks", "quiet_setting",
]);

function safeCount(value: unknown): number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

/** Counts must come from authenticated, cumulative evidence for this specific
 * work unit. Pass no personalization fields unless consent covers their use.
 * This permission does not authorize an AI call or a change to class policy.
 */
export function resolveWorkedSolutionPermission(input: WorkedSolutionInput): WorkedSolutionDecision {
  if (input.aiMode !== "green") return { allowed: false, support: "hint", reason: "class_policy" };
  if (input.assessmentRestricted !== false) return { allowed: false, support: "hint", reason: "assessment_restricted" };

  const attempts = safeCount(input.evidence?.attemptCount);
  if (input.hasStudentWork !== true || attempts === 0) {
    return { allowed: false, support: "hint", reason: "student_attempt_required" };
  }

  const countedMisses = safeCount(input.evidence?.unsuccessfulAttempts);
  const misses = countedMisses <= attempts ? countedMisses : 0;
  const countedStuck = safeCount(input.evidence?.stuckRequests);
  const stuck = countedStuck <= attempts ? countedStuck : 0;
  const needsAccessiblePresentation = (Array.isArray(input.accommodations)
    && input.accommodations.some((item) => PRESENTATION_ACCOMMODATIONS.has(item)))
    || input.readiness?.body === "low" || input.readiness?.focus === "scattered";
  const sustainedDifficulty = attempts >= 3 && (misses >= 3 || stuck >= 2);
  const persistentWithAccessNeed = needsAccessiblePresentation && attempts >= 2 && (misses >= 2 || stuck >= 2);

  // Direct requests are not evidence of a student's attempts or difficulty.
  if (sustainedDifficulty || persistentWithAccessNeed) {
    return { allowed: true, support: "worked_solution", reason: "sustained_difficulty" };
  }

  return {
    allowed: false,
    support: attempts >= 2 || misses > 0 || stuck > 0 || needsAccessiblePresentation ? "setup" : "hint",
    reason: "continue_guidance",
  };
}
