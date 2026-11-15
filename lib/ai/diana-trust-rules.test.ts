import { describe, expect, it } from "vitest";

import {
  assertDianaHomeworkAllowed,
  resolveDianaHomeworkTrust,
} from "./diana-trust-rules";

describe("Diana Trust Rules", () => {
  it("reads school tier from environment when no tier is passed", () => {
    const previous = process.env.DIANA_HOMEWORK_PRODUCT_TIER;
    process.env.DIANA_HOMEWORK_PRODUCT_TIER = "school_tier";
    try {
      const decision = resolveDianaHomeworkTrust({ classAiMode: "red" });
      expect(decision.productTier).toBe("school_tier");
      expect(decision.allowed).toBe(false);
    } finally {
      if (previous === undefined) delete process.env.DIANA_HOMEWORK_PRODUCT_TIER;
      else process.env.DIANA_HOMEWORK_PRODUCT_TIER = previous;
    }
  });

  it("does not let class AI policy block direct-to-student homework", () => {
    const decision = resolveDianaHomeworkTrust({
      classAiMode: "red",
      assignmentAiModeOverride: "red",
    });

    expect(decision.allowed).toBe(true);
    expect(decision.aiMode).toBe("green");
    expect(decision.schoolPolicyDormant).toBe(true);
    expect(decision.rules).toContain("student_owned_final");
    expect(decision.rules).toContain("minor_safety");
  });

  it("can still enforce school-tier rules later", () => {
    const decision = resolveDianaHomeworkTrust({
      productTier: "school_tier",
      classAiMode: "yellow",
    });

    expect(decision.allowed).toBe(false);
    expect(decision.aiMode).toBe("yellow");
    expect(decision.schoolPolicyDormant).toBe(false);
  });

  it("honors student consent before policy tier", () => {
    const decision = resolveDianaHomeworkTrust({
      classAiMode: "green",
      studentAiConsent: false,
    });

    expect(assertDianaHomeworkAllowed(decision)).toEqual({
      ok: false,
      error: "The student has not enabled Diana AI help.",
    });
  });
});
