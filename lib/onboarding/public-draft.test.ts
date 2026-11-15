import { describe, expect, it, vi } from "vitest";

import {
  PUBLIC_ONBOARDING_DRAFT_KEY,
  PUBLIC_ONBOARDING_DRAFT_MAX_BYTES,
  clearPublicOnboardingDraft,
  readPublicOnboardingDraft,
  writePublicOnboardingDraft,
  type PublicOnboardingDraftStorage,
} from "./public-draft";

function createStorage(
  initialValue: string | null = null,
): PublicOnboardingDraftStorage & {
  readonly getItem: ReturnType<typeof vi.fn>;
  readonly setItem: ReturnType<typeof vi.fn>;
  readonly removeItem: ReturnType<typeof vi.fn>;
} {
  let value = initialValue;
  return {
    getItem: vi.fn(() => value),
    setItem: vi.fn((_key: string, nextValue: string) => {
      value = nextValue;
    }),
    removeItem: vi.fn(() => {
      value = null;
    }),
  };
}

describe("public onboarding draft", () => {
  it("writes and restores only the canonical quiz selections", () => {
    const storage = createStorage();
    const answers = {
      learningHurdle: "complex_concepts",
      studySchedulePreference: "late_night",
    } as const;

    expect(writePublicOnboardingDraft(storage, answers)).toBe(true);
    expect(storage.setItem).toHaveBeenCalledOnce();
    expect(storage.setItem).toHaveBeenCalledWith(
      PUBLIC_ONBOARDING_DRAFT_KEY,
      JSON.stringify({ version: 1, answers }),
    );
    expect(readPublicOnboardingDraft(storage)).toEqual(answers);
  });

  it.each([
    ["malformed JSON", "not-json"],
    [
      "partial answers",
      JSON.stringify({
        version: 1,
        answers: { learningHurdle: "exam_stress" },
      }),
    ],
    [
      "unknown version",
      JSON.stringify({
        version: 2,
        answers: {
          learningHurdle: "exam_stress",
          studySchedulePreference: "morning",
        },
      }),
    ],
    [
      "unknown values",
      JSON.stringify({
        version: 1,
        answers: {
          learningHurdle: "invented",
          studySchedulePreference: "whenever",
        },
      }),
    ],
    [
      "extra identity data",
      JSON.stringify({
        version: 1,
        answers: {
          learningHurdle: "exam_stress",
          studySchedulePreference: "morning",
        },
        email: "student@example.com",
      }),
    ],
    ["oversized data", "x".repeat(PUBLIC_ONBOARDING_DRAFT_MAX_BYTES + 1)],
  ])("rejects and clears %s", (_label, storedValue) => {
    const storage = createStorage(storedValue);

    expect(readPublicOnboardingDraft(storage)).toBeNull();
    expect(storage.removeItem).toHaveBeenCalledWith(
      PUBLIC_ONBOARDING_DRAFT_KEY,
    );
  });

  it("does not serialize invalid or identity-bearing input", () => {
    const storage = createStorage();

    expect(
      writePublicOnboardingDraft(storage, {
        learningHurdle: "exam_stress",
        studySchedulePreference: "morning",
        email: "student@example.com",
      }),
    ).toBe(false);
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("fails closed when session storage is unavailable", () => {
    const storage: PublicOnboardingDraftStorage = {
      getItem: () => {
        throw new Error("storage unavailable");
      },
      setItem: () => {
        throw new Error("storage unavailable");
      },
      removeItem: () => {
        throw new Error("storage unavailable");
      },
    };

    expect(readPublicOnboardingDraft(storage)).toBeNull();
    expect(
      writePublicOnboardingDraft(storage, {
        learningHurdle: "staying_consistent",
        studySchedulePreference: "after_practice",
      }),
    ).toBe(false);
    expect(() => clearPublicOnboardingDraft(storage)).not.toThrow();
  });

  it("clears the versioned draft explicitly", () => {
    const storage = createStorage(
      JSON.stringify({
        version: 1,
        answers: {
          learningHurdle: "time_management",
          studySchedulePreference: "morning",
        },
      }),
    );

    clearPublicOnboardingDraft(storage);

    expect(storage.removeItem).toHaveBeenCalledWith(
      PUBLIC_ONBOARDING_DRAFT_KEY,
    );
    expect(readPublicOnboardingDraft(storage)).toBeNull();
  });
});
