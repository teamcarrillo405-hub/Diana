import { describe, expect, it } from "vitest";
import {
  buildAgentDbRetrievalPlan,
  quicAllowedForDiana,
  weightedDianaStateDistance,
} from "./agentdb-advanced-policy";

describe("agentdb advanced learning policy", () => {
  it("builds a hybrid shadow retrieval plan with diversity controls", () => {
    const plan = buildAgentDbRetrievalPlan({
      surface: "dashboard",
      assignmentKind: "math",
      supportIntensity: "guided",
      struggleState: "productive",
      requestedMode: "assistive_rank",
      liveTeenValidationPassed: false,
      reviewerContext: true,
    });

    expect(plan).toMatchObject({
      dbPath: ".agentdb/diana-next-move-shadow.db",
      store: "shadow",
      domain: "diana/next-move",
      allowedMode: "shadow_recommend",
      metric: "cosine",
      useMMR: true,
      mmrLambda: 0.55,
      synthesizeContext: true,
      enableQUICSync: false,
      canChangeStudentUi: false,
    });
    expect(plan.filters).toMatchObject({
      surface: "dashboard",
      assignmentKind: "math",
      supportIntensity: "guided",
      struggleState: "productive",
      protectedSurface: false,
    });
  });

  it("keeps protected surfaces in the offline training store", () => {
    const plan = buildAgentDbRetrievalPlan({
      surface: "wellness",
      requestedMode: "assistive_rank",
      liveTeenValidationPassed: true,
      explicitQuicOptIn: true,
    });

    expect(plan.allowedMode).toBe("observe_only");
    expect(plan.store).toBe("training");
    expect(plan.canChangeStudentUi).toBe(false);
    expect(plan.filters).toMatchObject({ protectedSurface: true });
    expect(plan.enableQUICSync).toBe(false);
  });

  it("only allows QUIC when the payload has no minor data and opt-in is explicit", () => {
    expect(quicAllowedForDiana({ containsMinorData: true, explicitQuicOptIn: true })).toBe(false);
    expect(quicAllowedForDiana({ containsMinorData: false, explicitQuicOptIn: false })).toBe(false);
    expect(quicAllowedForDiana({ containsMinorData: false, explicitQuicOptIn: true })).toBe(true);
  });

  it("computes weighted student-state distance deterministically", () => {
    expect(weightedDianaStateDistance([0, 2, 4], [0, 1, 2], [1, 2, 0.5])).toBe(2);
    expect(() => weightedDianaStateDistance([1], [1, 2])).toThrow("same dimension");
  });
});
