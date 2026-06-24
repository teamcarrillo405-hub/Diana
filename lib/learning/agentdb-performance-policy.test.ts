import { describe, expect, it } from "vitest";
import {
  performanceSloStatus,
  studentHelperAgentDbPerformancePlan,
} from "./agentdb-performance-policy";

describe("agentdb performance policy", () => {
  it("keeps reviewed student-helper retrieval accuracy-oriented", () => {
    const plan = studentHelperAgentDbPerformancePlan({
      store: "review",
      vectorCount: 250_000,
    });

    expect(plan.quantizationType).toBe("scalar");
    expect(plan.hnswM).toBe(16);
    expect(plan.hnswEfSearch).toBe(150);
    expect(plan.optimizeMemory).toBe(false);
    expect(plan.retrieveK).toBe(8);
  });

  it("uses full precision for small accuracy-critical stores", () => {
    const plan = studentHelperAgentDbPerformancePlan({
      store: "shadow",
      vectorCount: 2_500,
      accuracyCritical: true,
    });

    expect(plan.quantizationType).toBe("none");
    expect(plan.cacheSize).toBe(500);
    expect(plan.latencyBudgetMs).toBe(120);
  });

  it("allows aggressive compression for large shadow-training stores", () => {
    const plan = studentHelperAgentDbPerformancePlan({
      store: "training",
      vectorCount: 500_000,
      accuracyCritical: false,
    });

    expect(plan.quantizationType).toBe("binary");
    expect(plan.cacheSize).toBe(2_000);
    expect(plan.hnswM).toBe(32);
    expect(plan.optimizeMemory).toBe(true);
  });

  it("classifies p95 latency against the budget", () => {
    expect(performanceSloStatus([10, 20, 30, 40], 50)).toBe("pass");
    expect(performanceSloStatus([60, 70, 71, 72], 50)).toBe("watch");
    expect(performanceSloStatus([90, 100, 110, 120], 50)).toBe("review");
    expect(performanceSloStatus([], 50)).toBe("watch");
  });
});
