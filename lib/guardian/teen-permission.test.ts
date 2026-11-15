import { describe, expect, it } from "vitest";

import {
  evaluateProfileEligibility,
} from "../../supabase/functions/_shared/auth-policy";
import {
  TEEN_PERMISSION_CONTROLLED_SURFACES,
  teenPermissionForSurface,
} from "./teen-permission";

const NOW = new Date("2026-08-31T12:00:00.000Z");
const TEEN = {
  age_bracket: "13_to_17",
  consent_ai: true,
} as const;

describe("teen access surface contract", () => {
  it("allows a teen across every product surface without guardian permission", () => {
    for (const surface of TEEN_PERMISSION_CONTROLLED_SURFACES) {
      expect(teenPermissionForSurface(TEEN, surface, NOW)).toEqual({
        allowed: true,
        surface,
        reasonCode: "allowed",
      });
    }
  });

  it("keeps AI consent separate from general teen access", () => {
    const teenWithoutAiConsent = {
      ...TEEN,
      consent_ai: false,
    };

    expect(teenPermissionForSurface(
      teenWithoutAiConsent,
      "ai_assistance",
      NOW,
    )).toEqual({
      allowed: false,
      surface: "ai_assistance",
      reasonCode: "ai_consent_required",
    });
    expect(teenPermissionForSurface(
      teenWithoutAiConsent,
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
      ...TEEN,
      age_bracket: "under_13",
    }, "ai_assistance", NOW)).toEqual({
      allowed: false,
      surface: "ai_assistance",
      reasonCode: "under_13_disabled",
    });
    expect(teenPermissionForSurface({
      ...TEEN,
      age_bracket: undefined,
    }, "wellness", NOW)).toEqual({
      allowed: false,
      surface: "wellness",
      reasonCode: "age_bracket_invalid",
    });
  });

  it("matches the deployed Edge AI eligibility semantics", () => {
    expect(evaluateProfileEligibility(TEEN)).toEqual({ allowed: true });
  });
});
