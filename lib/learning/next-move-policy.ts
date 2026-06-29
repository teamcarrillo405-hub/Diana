export type LearningMode = "observe_only" | "shadow_recommend" | "assistive_rank";

export type NextMovePolicyEvent = {
  eventName: string;
  feature?: string | null;
  route?: string | null;
  durationMs?: number | null;
  metadata?: Record<string, unknown> | null;
  createdAt?: string | null;
};

export type StudentSnapshotForLearning = {
  assignmentKind?: string | null;
  supportIntensity?: "steady" | "guided" | "scaffolded" | "one_move" | "recovery";
  struggleState?: "steady" | "productive" | "blocked" | "overload";
  nextStep?: string | null;
  readiness?: unknown;
  frictionSignals?: unknown;
  recallSignals?: unknown;
  masterySignals?: unknown;
};

export type NextMoveLearningExperience = {
  domain: "diana/next-move";
  state: {
    route: string;
    feature: string;
    assignmentKind: string | null;
    supportIntensity: string | null;
    struggleState: string | null;
    readiness: unknown;
    frictionSignals: unknown;
    recallSignals: unknown;
    masterySignals: unknown;
  };
  action: {
    eventName: string;
    nextStep: string | null;
  };
  reward: number;
  done: boolean;
  createdAt: string | null;
};

export type LearningPolicyDecision = {
  allowedMode: LearningMode;
  canChangeStudentUi: boolean;
  reason: string;
};

const SUCCESS_EVENTS = new Set([
  "assignment_started",
  "focus_started",
  "task_completed",
  "assignment_done",
  "submitted",
  "study_artifact_created",
]);

const FRICTION_EVENTS = new Set([
  "overwhelmed_opened",
  "help_abandoned",
  "route_error",
  "rage_click",
  "long_hesitation",
]);

const PROTECTED_SURFACE =
  /\b(accommodation|iep|504|diagnosis|privacy|safety|ai_policy|final_work|wellness)\b/i;

export function buildNextMoveExperience(
  event: NextMovePolicyEvent,
  snapshot: StudentSnapshotForLearning | null = null,
): NextMoveLearningExperience {
  const eventName = event.eventName.trim();
  return {
    domain: "diana/next-move",
    state: {
      route: event.route?.trim() || "unknown",
      feature: event.feature?.trim() || "unknown",
      assignmentKind: snapshot?.assignmentKind ?? null,
      supportIntensity: snapshot?.supportIntensity ?? null,
      struggleState: snapshot?.struggleState ?? null,
      readiness: snapshot?.readiness ?? null,
      frictionSignals: snapshot?.frictionSignals ?? null,
      recallSignals: snapshot?.recallSignals ?? null,
      masterySignals: snapshot?.masterySignals ?? null,
    },
    action: {
      eventName,
      nextStep: snapshot?.nextStep ?? null,
    },
    reward: rewardForEvent(event),
    done: isTerminalEvent(eventName),
    createdAt: event.createdAt ?? null,
  };
}

export function rewardForEvent(event: Pick<NextMovePolicyEvent, "eventName" | "durationMs">): number {
  const eventName = event.eventName.trim();
  if (SUCCESS_EVENTS.has(eventName)) return 1;
  if (FRICTION_EVENTS.has(eventName)) return -1;
  if (eventName === "first_action" && Number(event.durationMs ?? 0) <= 60_000) return 0.8;
  if (eventName === "first_action") return 0.35;
  if (eventName === "page_view" || eventName === "route_session") return 0;
  return 0.1;
}

export function learningPolicyDecision({
  requestedMode,
  surface,
  liveTeenValidationPassed,
}: {
  requestedMode: LearningMode;
  surface: string;
  liveTeenValidationPassed: boolean;
}): LearningPolicyDecision {
  if (PROTECTED_SURFACE.test(surface)) {
    return {
      allowedMode: "observe_only",
      canChangeStudentUi: false,
      reason: "Protected Diana surfaces can collect evidence but cannot be optimized by learning plugins.",
    };
  }

  if (requestedMode === "assistive_rank" && !liveTeenValidationPassed) {
    return {
      allowedMode: "shadow_recommend",
      canChangeStudentUi: false,
      reason: "Live teen validation is required before learned ranking can change the student UI.",
    };
  }

  return {
    allowedMode: requestedMode,
    canChangeStudentUi: requestedMode === "assistive_rank",
    reason: requestedMode === "observe_only"
      ? "Collecting offline learning evidence only."
      : "Learning output is limited to launch-safe UI surfaces.",
  };
}

function isTerminalEvent(eventName: string) {
  return eventName === "task_completed" ||
    eventName === "assignment_done" ||
    eventName === "submitted" ||
    eventName === "help_abandoned";
}
