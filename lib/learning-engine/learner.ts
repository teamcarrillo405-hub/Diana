import { LEARNER_VERSION, type AssessmentResult, type LearningAttempt } from "./contracts";
import {policyAction,DEFAULT_SUPPORT_POLICY,type SupportPolicy} from "./support-policy";

export type AssessedAttempt = { attempt: LearningAttempt; assessment: AssessmentResult; recordedAt: string };
export type SkillEstimate = {
  version: typeof LEARNER_VERSION;
  skillId: string;
  independentCount: number;
  supportedCount: number;
  estimate: number;
  confidence: "insufficient" | "developing" | "established";
};

/** Deduplicate retries and use only the first revision of each independently attempted problem. */
export function estimateSkill(skillId: string, events: AssessedAttempt[]): SkillEstimate {
  const first = new Map<string, AssessedAttempt>();
  for (const event of [...events].sort((a, b) => a.attempt.revision - b.attempt.revision || a.recordedAt.localeCompare(b.recordedAt))) {
    if (event.attempt.skillId !== skillId) continue;
    const key = event.attempt.assignmentId + ":" + event.attempt.problemId;
    if (!first.has(key)) first.set(key, event);
  }
  const eligible = [...first.values()].filter(({ attempt, assessment }) =>
    attempt.assistance === "independent" && attempt.confirmed && assessment.eligibleForKnowledge
    && assessment.status === "supported" && assessment.outcome !== "unknown");
  const count = eligible.length;
  const successes = eligible.filter((event) => event.assessment.outcome === "supported").length;
  return { version: LEARNER_VERSION, skillId, independentCount: count, supportedCount: successes,
    estimate: (successes + 1) / (count + 2), confidence: count < 5 ? "insufficient" : count < 15 ? "developing" : "established" };
}

export type SupportDecision = {
  version: typeof LEARNER_VERSION;
  action: "clarify" | "orient" | "hint" | "related_example" | "independent_attempt";
  reason: string;
};
export function chooseSupport(input: {
  confirmed: boolean; hasEvidence: boolean; assessment: AssessmentResult | null; priorSupport: number;
},policy:SupportPolicy=DEFAULT_SUPPORT_POLICY): SupportDecision {
  const decision = (action: SupportDecision["action"], reason: string): SupportDecision => ({ version: LEARNER_VERSION, action, reason });
  const action=policyAction({confirmed:input.confirmed,hasEvidence:input.hasEvidence,supported:input.assessment?.outcome==="supported",hasAssessment:!!input.assessment,priorSupport:input.priorSupport},policy);
  if (action==="clarify") return decision("clarify", "Confirm the problem and its source before giving targeted help.");
  if (input.assessment?.outcome === "supported") return decision("independent_attempt", "Offer a new independent problem to check transfer.");
  if (action==="orient") return decision("orient", "Identify the goal and relevant information.");
  if (action==="hint") return decision("hint", "Offer one next step while keeping the student's answer open.");
  if (action==="related_example") return decision("related_example", "Use a different example, then return to the original problem.");
  return decision("independent_attempt", "Pause the support ladder for a fresh attempt or clarification.");
}
