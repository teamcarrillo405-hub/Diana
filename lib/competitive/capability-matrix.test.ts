import { describe, expect, it } from "vitest";
import {
  COMPETITIVE_CAPABILITY_BARS,
  barsMissingProof,
  capabilityBar,
} from "./capability-matrix";

describe("competitive capability matrix", () => {
  it("defines all 10/10 product bars with pass criteria", () => {
    expect(COMPETITIVE_CAPABILITY_BARS.map((bar) => bar.id)).toEqual([
      "start_the_work",
      "step_by_step_learning",
      "guided_visual_learning",
      "socratic_trust",
      "study_artifacts",
      "student_state_adaptation",
      "teen_native_ux",
      "proof_and_outcomes",
      "distribution_content_readiness",
    ]);
    expect(COMPETITIVE_CAPABILITY_BARS.every((bar) => bar.passCriteria.length >= 2)).toBe(true);
  });

  it("returns a stable bar by id", () => {
    expect(capabilityBar("study_artifacts").competitorOwner).toBe("quizlet_ai_tools");
  });

  it("keeps proof gaps visible", () => {
    const missing = barsMissingProof(["artifact_generated", "artifact_edited", "cards_saved", "recall_result"]);
    expect(missing.map((bar) => bar.id)).toContain("proof_and_outcomes");
    expect(missing.map((bar) => bar.id)).not.toContain("study_artifacts");
  });
});
