import type { AgentDbLearningStore } from "./agentdb-advanced-policy";

export type AgentDbQuantization = "none" | "scalar" | "binary" | "product";

export type StudentHelperPerformancePlan = {
  quantizationType: AgentDbQuantization;
  cacheSize: number;
  hnswM: number;
  hnswEfSearch: number;
  batchInsertSize: number;
  retrieveK: number;
  latencyBudgetMs: number;
  optimizeMemory: boolean;
  reason: string;
};

export function studentHelperAgentDbPerformancePlan({
  store,
  vectorCount,
  accuracyCritical = true,
}: {
  store: AgentDbLearningStore;
  vectorCount: number;
  accuracyCritical?: boolean;
}): StudentHelperPerformancePlan {
  const normalizedCount = Math.max(0, Math.floor(vectorCount));

  if (store === "review" || accuracyCritical) {
    return {
      quantizationType: normalizedCount < 10_000 ? "none" : "scalar",
      cacheSize: normalizedCount < 10_000 ? 500 : 1_500,
      hnswM: normalizedCount < 10_000 ? 8 : 16,
      hnswEfSearch: 150,
      batchInsertSize: 100,
      retrieveK: 8,
      latencyBudgetMs: 120,
      optimizeMemory: false,
      reason: "Student helper retrieval favors answer quality and stable scaffolds over maximum compression.",
    };
  }

  if (normalizedCount >= 100_000) {
    return {
      quantizationType: "binary",
      cacheSize: 2_000,
      hnswM: 32,
      hnswEfSearch: 100,
      batchInsertSize: 250,
      retrieveK: 6,
      latencyBudgetMs: 90,
      optimizeMemory: true,
      reason: "Large shadow-training stores use binary quantization and memory optimization because they do not directly shape student UI.",
    };
  }

  return {
    quantizationType: "scalar",
    cacheSize: 1_000,
    hnswM: 16,
    hnswEfSearch: 100,
    batchInsertSize: 100,
    retrieveK: 6,
    latencyBudgetMs: 100,
    optimizeMemory: true,
    reason: "Shadow retrieval uses a balanced AgentDB profile for low latency with high recall.",
  };
}

export function performanceSloStatus(
  samplesMs: readonly number[],
  budgetMs: number,
): "pass" | "watch" | "review" {
  if (samplesMs.length === 0) return "watch";
  const sorted = [...samplesMs].sort((a, b) => a - b);
  const p95 = sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)];
  if (p95 <= budgetMs) return "pass";
  if (p95 <= budgetMs * 1.5) return "watch";
  return "review";
}
