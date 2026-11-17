import { resolveWorkedSolutionPermission, type WorkedSolutionDecision } from "./worked-solution-policy.ts";

type Result = { data: unknown; error: unknown };
type OwnershipQuery = {
  select(columns: string): OwnershipQuery;
  eq(column: string, value: string): OwnershipQuery;
  maybeSingle(): PromiseLike<Result>;
};
type OwnershipClient = { from(table: string): OwnershipQuery };
type EvidenceClient = { rpc(name: string, args: Record<string, unknown>): PromiseLike<Result> };

export type WorkedSolutionScope = {
  problemId: string;
  problemText: string;
  studentWork: string;
  attemptId: string;
  problemVersion: string;
  attemptDigest: string;
  attemptCount: number;
  stuckRequests: number;
  requiresSupport: boolean;
};

type EvidenceObservation = { decision: WorkedSolutionDecision; scope?: WorkedSolutionScope };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const HASH = /^[0-9a-f]{64}$/u;
const NO_VERIFIED_WORK: EvidenceObservation = {
  decision: { allowed: false, support: "hint", reason: "student_attempt_required" },
};
const HINT_ONLY: EvidenceObservation = {
  decision: { allowed: false, support: "hint", reason: "continue_guidance" },
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function validUuid(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

function validHash(value: unknown): value is string {
  return typeof value === "string" && HASH.test(value);
}

function validCount(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= 12;
}

function recordsExplicitStruggle(question: string): boolean {
  const normalized = question.trim().slice(0, 1_000).toLowerCase().replaceAll("’", "'");
  if (/\b(?:just tell me|give me (?:the )?answer|what is the answer|answer only|solve it for me)\b/u.test(normalized)) {
    return false;
  }
  return /(?:^|[.!?]\s+|\bbut\s+)(?:(?:i am|i'm|i was|i got)\s+(?:still\s+)?(?:stuck|confused|lost)|i\s+(?:still\s+)?(?:don't|do not)\s+(?:understand|get it)|i\s+(?:still\s+)?need\s+(?:more help|another explanation|a different explanation)|still stuck)\b/u.test(normalized);
}

/** The request contains one student's current question. Stored drafts and all
 * authorization counts are read and bound to the exact problem by the RPC. */
export async function observeWorkedSolutionEvidence(input: {
  userClient: unknown;
  serviceClient: unknown;
  ownerId: string;
  assignmentId?: string | null;
  problemId?: string | null;
  mode: unknown;
  question: string;
}): Promise<EvidenceObservation> {
  const { ownerId, assignmentId, problemId } = input;
  if (input.mode !== "guide" || !validUuid(ownerId) || !validUuid(assignmentId) || !validUuid(problemId)) return HINT_ONLY;
  try {
    const owned = await (input.userClient as OwnershipClient).from("assignment_problems")
      .select("id").eq("id", problemId).eq("assignment_id", assignmentId).eq("owner_id", ownerId).maybeSingle();
    if (owned.error || asRecord(owned.data)?.id !== problemId) return NO_VERIFIED_WORK;

    const result = await (input.serviceClient as EvidenceClient).rpc("observe_tutor_problem_effort", {
      p_owner: ownerId,
      p_assignment: assignmentId,
      p_problem: problemId,
      p_stuck: recordsExplicitStruggle(input.question),
    });
    const value = asRecord(result.data);
    if (result.error || !value || value.problemId !== problemId ||
      typeof value.problemText !== "string" || !value.problemText.trim() || value.problemText.length > 4_000 ||
      typeof value.studentWork !== "string" || !value.studentWork.trim() || value.studentWork.length > 5_100 ||
      !validUuid(value.attemptId) || !validHash(value.problemVersion) || !validHash(value.attemptDigest) ||
      !validCount(value.attemptCount) || !validCount(value.stuckRequests) || value.stuckRequests > value.attemptCount ||
      typeof value.hasAccommodation !== "boolean" || typeof value.lowEnergy !== "boolean" || typeof value.scatteredFocus !== "boolean") {
      return NO_VERIFIED_WORK;
    }
    const permission = {
      aiMode: "green",
      assessmentRestricted: false,
      hasStudentWork: true,
      evidence: {
        attemptCount: value.attemptCount,
        stuckRequests: value.stuckRequests,
        unsuccessfulAttempts: 0,
        directAnswerRequests: 0,
      },
      // The RPC resolves opt-in and freshness and returns fixed positive
      // indicators. Personal preferences and check-in details stay in storage.
      accommodations: value.hasAccommodation ? ["alternate_format"] : [],
      readiness: { body: value.lowEnergy ? "low" : undefined, focus: value.scatteredFocus ? "scattered" : undefined },
    };
    const decision = resolveWorkedSolutionPermission(permission);
    if (!decision.allowed) return { decision };
    return {
      decision,
      scope: {
        problemId,
        problemText: value.problemText,
        studentWork: value.studentWork,
        attemptId: value.attemptId,
        problemVersion: value.problemVersion,
        attemptDigest: value.attemptDigest,
        attemptCount: value.attemptCount,
        stuckRequests: value.stuckRequests,
        requiresSupport: !resolveWorkedSolutionPermission({ ...permission, accommodations: [], readiness: null }).allowed,
      },
    };
  } catch {
    return NO_VERIFIED_WORK;
  }
}

/** Recheck stored policy, freshness and exact draft before releasing the answer. */
export async function recordWorkedSolutionDelivery(input: {
  serviceClient: unknown;
  ownerId: string;
  assignmentId: string;
  scope: WorkedSolutionScope;
}): Promise<boolean> {
  const { ownerId, assignmentId, scope } = input;
  if (!validUuid(ownerId) || !validUuid(assignmentId) || !validUuid(scope.problemId) ||
    !validUuid(scope.attemptId) || !validHash(scope.problemVersion) || !validHash(scope.attemptDigest) ||
    !validCount(scope.attemptCount) || !validCount(scope.stuckRequests) || scope.stuckRequests > scope.attemptCount ||
    typeof scope.requiresSupport !== "boolean") return false;
  try {
    const result = await (input.serviceClient as EvidenceClient).rpc("record_tutor_worked_solution_delivery", {
      p_owner: ownerId,
      p_assignment: assignmentId,
      p_problem: scope.problemId,
      p_attempt: scope.attemptId,
      p_version: scope.problemVersion,
      p_digest: scope.attemptDigest,
      p_attempt_count: scope.attemptCount,
      p_stuck_count: scope.stuckRequests,
      p_requires_support: scope.requiresSupport,
    });
    return !result.error && result.data === true;
  } catch {
    return false;
  }
}
