import { describe, expect, it } from "vitest";

import {
  DIANA_CONTENT_LEVELS,
  hasCurrentTeenGuardianPermission,
  learnerAccessForAgeBracket,
  TEEN_GUARDIAN_PERMISSION_POLICY_VERSION,
} from "./learner-access-policy";

const CURRENT_PERMISSION = {
  teen_guardian_permission_attested_at: "2026-08-01T12:00:00.000Z",
  teen_guardian_permission_policy_version: TEEN_GUARDIAN_PERMISSION_POLICY_VERSION,
  teen_guardian_permission_source: "profile_center_attestation",
  teen_guardian_permission_withdrawn_at: null,
} as const;

describe("learner access policy", () => {
  it("supports middle-school through advanced content independently of account age", () => {
    expect(DIANA_CONTENT_LEVELS).toEqual([
      "middle_school",
      "high_school",
      "college",
      "advanced_independent_study",
    ]);
    expect(learnerAccessForAgeBracket("under_13").contentCoverage).toBe("supported");
  });

  it("requires a verified guardian workflow before under-13 account or AI access", () => {
    expect(learnerAccessForAgeBracket("under_13")).toEqual(expect.objectContaining({
      accountAccess: "requires_verified_guardian_workflow",
      directAiAccess: "requires_verified_guardian_workflow",
    }));
    expect(learnerAccessForAgeBracket("13_to_17").accountAccess).toBe("allowed");
    expect(learnerAccessForAgeBracket("13_to_17").directAiAccess)
      .toBe("requires_parent_guardian_permission");
    expect(learnerAccessForAgeBracket("adult").directAiAccess).toBe("allowed");
  });

  it("recognizes only a current, active, versioned teen permission attestation", () => {
    const now = new Date("2026-08-30T12:00:00.000Z");
    expect(hasCurrentTeenGuardianPermission(CURRENT_PERMISSION, now)).toBe(true);
    expect(hasCurrentTeenGuardianPermission({
      ...CURRENT_PERMISSION,
      teen_guardian_permission_policy_version: "teen_openai_beta_v0",
    }, now)).toBe(false);
    expect(hasCurrentTeenGuardianPermission({
      ...CURRENT_PERMISSION,
      teen_guardian_permission_withdrawn_at: "2026-08-20T12:00:00.000Z",
    }, now)).toBe(false);
    expect(hasCurrentTeenGuardianPermission({
      ...CURRENT_PERMISSION,
      teen_guardian_permission_attested_at: "2026-09-01T12:00:00.000Z",
    }, now)).toBe(false);
    expect(hasCurrentTeenGuardianPermission({
      ...CURRENT_PERMISSION,
      teen_guardian_permission_source: "guardian_vpc",
    }, now)).toBe(false);
  });
});
