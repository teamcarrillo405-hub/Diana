import { describe, expect, it } from "vitest";

// @ts-expect-error The executable verifier is an ESM script without a declaration file.
import {
  assertMigrationHistory,
  assertProfilesOnboardingSchema,
  assertProjectIdentity,
  parseSupabaseProjectRef,
} from "../scripts/verify-phase36-onboarding-schema.mjs";

const PROJECT_REF = "oitipayrriupcitgmzju";

const VALID_SCHEMA = `
CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "user_id" "uuid" NOT NULL,
    "diagnoses" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "learning_hurdle" "text",
    "study_schedule_preference" "text"
);

ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_learning_hurdle_check" CHECK (("learning_hurdle" = ANY (ARRAY['time_management'::"text", 'exam_stress'::"text", 'complex_concepts'::"text", 'staying_consistent'::"text"])));

ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_study_schedule_preference_check" CHECK (("study_schedule_preference" = ANY (ARRAY['morning'::"text", 'after_practice'::"text", 'late_night'::"text"])));
`;

describe("Phase 36 onboarding schema verifier", () => {
  it("extracts the project ref without retaining the URL", () => {
    expect(
      parseSupabaseProjectRef(`https://${PROJECT_REF}.supabase.co`),
    ).toBe(PROJECT_REF);
    expect(() => parseSupabaseProjectRef("https://example.com")).toThrow(
      /project ref/iu,
    );
  });

  it("requires linked, local app, and Vercel preview refs to match", () => {
    expect(
      assertProjectIdentity({
        linkedRef: PROJECT_REF,
        localAppRef: PROJECT_REF,
        previewAppRef: PROJECT_REF,
        cliLinkedRefs: [PROJECT_REF],
      }),
    ).toBe(PROJECT_REF);

    expect(() =>
      assertProjectIdentity({
        linkedRef: PROJECT_REF,
        localAppRef: PROJECT_REF,
        previewAppRef: "abcdefghijklmnopqrst",
        cliLinkedRefs: [PROJECT_REF],
      }),
    ).toThrow(/identity mismatch/iu);
  });

  it("requires the reviewed migration in linked history", () => {
    expect(
      assertMigrationHistory([
        { local: "20260715050000", remote: "20260715050000" },
      ]),
    ).toBe(true);
    expect(() =>
      assertMigrationHistory([
        { local: "20260715050000", remote: "" },
      ]),
    ).toThrow(/20260715050000/iu);
  });

  it("accepts only nullable text columns with the exact allowlists", () => {
    expect(assertProfilesOnboardingSchema(VALID_SCHEMA)).toEqual({
      learning_hurdle: [
        "complex_concepts",
        "exam_stress",
        "staying_consistent",
        "time_management",
      ],
      study_schedule_preference: [
        "after_practice",
        "late_night",
        "morning",
      ],
    });
  });

  it("rejects a non-null column or a widened constraint", () => {
    expect(() =>
      assertProfilesOnboardingSchema(
        VALID_SCHEMA.replace(
          '"learning_hurdle" "text",',
          '"learning_hurdle" "text" NOT NULL,',
        ),
      ),
    ).toThrow(/nullable/iu);

    expect(() =>
      assertProfilesOnboardingSchema(
        VALID_SCHEMA.replace(
          "'staying_consistent'::\"text\"",
          "'staying_consistent'::\"text\", 'other'::\"text\"",
        ),
      ),
    ).toThrow(/exact allowed values/iu);
  });
});
