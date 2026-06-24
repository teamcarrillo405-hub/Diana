import type { LearningMode } from "./next-move-policy";

export type AgentDbLearningStore = "training" | "shadow" | "review";
export type DianaVectorMetric = "cosine" | "weighted_state";

export type HybridLearningQuery = {
  surface: string;
  assignmentKind?: string | null;
  supportIntensity?: string | null;
  struggleState?: string | null;
  requestedMode: LearningMode;
  liveTeenValidationPassed: boolean;
  reviewerContext?: boolean;
  containsMinorData?: boolean;
  explicitQuicOptIn?: boolean;
};

export type AgentDbRetrievalPlan = {
  dbPath: string;
  store: AgentDbLearningStore;
  domain: "diana/next-move";
  allowedMode: LearningMode;
  metric: DianaVectorMetric;
  filters: Record<string, unknown>;
  hybridWeights: {
    vectorSimilarity: number;
    metadataScore: number;
  };
  useMMR: boolean;
  mmrLambda: number;
  synthesizeContext: boolean;
  enableQUICSync: boolean;
  canChangeStudentUi: boolean;
  reason: string;
};

const PROTECTED_SURFACE =
  /\b(accommodation|iep|504|diagnosis|privacy|safety|ai_policy|final_work|wellness)\b/i;

export function buildAgentDbRetrievalPlan(query: HybridLearningQuery): AgentDbRetrievalPlan {
  const protectedSurface = PROTECTED_SURFACE.test(query.surface);
  const allowedMode = allowedLearningMode(query);
  const store = storeForMode(allowedMode);

  return {
    dbPath: `.agentdb/diana-next-move-${store}.db`,
    store,
    domain: "diana/next-move",
    allowedMode,
    metric: "cosine",
    filters: buildHybridFilters(query, protectedSurface),
    hybridWeights: {
      vectorSimilarity: 0.68,
      metadataScore: 0.32,
    },
    useMMR: true,
    mmrLambda: 0.55,
    synthesizeContext: Boolean(query.reviewerContext) && allowedMode !== "assistive_rank",
    enableQUICSync: quicAllowedForDiana(query),
    canChangeStudentUi: allowedMode === "assistive_rank",
    reason: protectedSurface
      ? "Protected student surfaces stay in observe-only retrieval."
      : "Use hybrid AgentDB search with diversity controls before considering live UI influence.",
  };
}

export function weightedDianaStateDistance(
  left: readonly number[],
  right: readonly number[],
  weights: readonly number[] = [],
): number {
  if (left.length !== right.length) {
    throw new Error("State vectors must have the same dimension.");
  }

  let sum = 0;
  for (let index = 0; index < left.length; index += 1) {
    const weight = weights[index] ?? 1;
    const delta = left[index] - right[index];
    sum += weight * delta * delta;
  }
  return Math.sqrt(sum);
}

export function quicAllowedForDiana({
  containsMinorData = true,
  explicitQuicOptIn = false,
}: Pick<HybridLearningQuery, "containsMinorData" | "explicitQuicOptIn">): boolean {
  return !containsMinorData && explicitQuicOptIn;
}

function allowedLearningMode(query: HybridLearningQuery): LearningMode {
  if (PROTECTED_SURFACE.test(query.surface)) return "observe_only";
  if (query.requestedMode === "assistive_rank" && !query.liveTeenValidationPassed) {
    return "shadow_recommend";
  }
  return query.requestedMode;
}

function storeForMode(mode: LearningMode): AgentDbLearningStore {
  if (mode === "observe_only") return "training";
  if (mode === "shadow_recommend") return "shadow";
  return "review";
}

function buildHybridFilters(
  query: HybridLearningQuery,
  protectedSurface: boolean,
): Record<string, unknown> {
  return {
    domain: "diana/next-move",
    surface: query.surface.trim() || "unknown",
    protectedSurface,
    ...(query.assignmentKind ? { assignmentKind: query.assignmentKind } : {}),
    ...(query.supportIntensity ? { supportIntensity: query.supportIntensity } : {}),
    ...(query.struggleState ? { struggleState: query.struggleState } : {}),
  };
}
