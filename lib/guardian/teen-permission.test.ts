import { describe, expect, it } from "vitest";

import {
  evaluateProfileEligibility,
} from "../../supabase/functions/_shared/auth-policy";
import {
  TEEN_GUARDIAN_PERMISSION_POLICY_VERSION,
} from "../learner-access-policy";
import {
  TEEN_PERMISSION_CONTROLLED_SURFACES,
  teenPermissionForSurface,
} from "./teen-permission";

const NOW = new Date("2026-08-31T12:00:00.000Z");
const CURRENT_TEEN = {
  age_bracket: "13_to_17",
  consent_ai: true,
  teen_guardian_permission_attested_at: "2026-08-30T12:00:00.000Z",
  teen_guardian_permission_policy_version: TEEN_GUARDIAN_PERMISSION_POLICY_VERSION,
  teen_guardian_permission_source: "synthetic_qa_fixture",
  teen_guardian_permission_withdrawn_at: null,
} as const;

describe("teen guardian permission surface contract", () => {
  it("requires a current permission record across every beta-plan minor surface", () => {
    for (const surface of TEEN_PERMISSION_CONTROLLED_SURFACES) {
      expect(teenPermissionForSurface(CURRENT_TEEN, surface, NOW)).toEqual({
        allowed: true,
        surface,
        reasonCode: "allowed",
      });
      expect(teenPermissionForSurface({
        ...CURRENT_TEEN,
        teen_guardian_permission_attested_at: null,
      }, surface, NOW)).toEqual({
        allowed: false,
        surface,
        reasonCode: "guardian_permission_required",
      });
      expect(teenPermissionForSurface({
        ...CURRENT_TEEN,
        teen_guardian_permission_withdrawn_at: "2026-08-31T10:00:00.000Z",
      }, surface, NOW)).toEqual({
        allowed: false,
        surface,
        reasonCode: "guardian_permission_required",
      });
    }
  });

  it("keeps AI consent separate from guardian permission", () => {
    const permissionWithoutAiConsent = {
      ...CURRENT_TEEN,
      consent_ai: false,
    };

    expect(teenPermissionForSurface(
      permissionWithoutAiConsent,
      "ai_assistance",
      NOW,
    )).toEqual({
      allowed: false,
      surface: "ai_assistance",
      reasonCode: "ai_consent_required",
    });
    expect(teenPermissionForSurface(
      permissionWithoutAiConsent,
      "file_uploads",
      NOW,
    )).toEqual({
      allowed: true,
      surface: "file_uploads",
      reasonCode: "allowed",
    });
  });

  it("blocks under-13 records and fails closed for an unknown age bracket", () => {
    expect(teenPermissionForSurface({
      ...CURRENT_TEEN,
      age_bracket: "under_13",
    }, "ai_assistance", NOW)).toEqual({
      allowed: false,
      surface: "ai_assistance",
      reasonCode: "under_13_disabled",
    });
    expect(teenPermissionForSurface({
      ...CURRENT_TEEN,
      age_bracket: undefined,
    }, "wellness", NOW)).toEqual({
      allowed: false,
      surface: "wellness",
      reasonCode: "age_bracket_invalid",
    });
  });

  it("matches the deployed Edge AI eligibility semantics for current and withdrawn permission", () => {
    expect(evaluateProfileEligibility(CURRENT_TEEN)).toEqual({ allowed: true });
    expect(evaluateProfileEligibility({
      ...CURRENT_TEEN,
      teen_guardian_permission_withdrawn_at: "2026-08-31T10:00:00.000Z",
    })).toEqual({
      allowed: false,
      code: "guardian_permission_required",
    });
  });
});
