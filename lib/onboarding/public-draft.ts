import { z } from "zod";

import {
  ScreenDesignOnboardingAnswersSchema,
  type ScreenDesignOnboardingAnswers,
} from "./screendesign";

export const PUBLIC_ONBOARDING_DRAFT_KEY =
  "diana:public-onboarding-draft";
export const PUBLIC_ONBOARDING_DRAFT_MAX_BYTES = 512;
const PUBLIC_ONBOARDING_DRAFT_VERSION = 1;

const PublicOnboardingDraftSchema = z
  .object({
    version: z.literal(PUBLIC_ONBOARDING_DRAFT_VERSION),
    answers: ScreenDesignOnboardingAnswersSchema.strict(),
  })
  .strict();

export interface PublicOnboardingDraftStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function readPublicOnboardingDraft(
  storage: PublicOnboardingDraftStorage,
): ScreenDesignOnboardingAnswers | null {
  let storedValue: string | null;
  try {
    storedValue = storage.getItem(PUBLIC_ONBOARDING_DRAFT_KEY);
  } catch {
    return null;
  }

  if (storedValue === null) return null;
  if (byteLength(storedValue) > PUBLIC_ONBOARDING_DRAFT_MAX_BYTES) {
    clearPublicOnboardingDraft(storage);
    return null;
  }

  try {
    const parsed = PublicOnboardingDraftSchema.safeParse(
      JSON.parse(storedValue) as unknown,
    );
    if (!parsed.success) {
      clearPublicOnboardingDraft(storage);
      return null;
    }
    return parsed.data.answers;
  } catch {
    clearPublicOnboardingDraft(storage);
    return null;
  }
}

export function writePublicOnboardingDraft(
  storage: PublicOnboardingDraftStorage,
  input: unknown,
): boolean {
  const answers = ScreenDesignOnboardingAnswersSchema.strict().safeParse(input);
  if (!answers.success) return false;

  const serialized = JSON.stringify({
    version: PUBLIC_ONBOARDING_DRAFT_VERSION,
    answers: answers.data,
  });
  if (byteLength(serialized) > PUBLIC_ONBOARDING_DRAFT_MAX_BYTES) return false;

  try {
    storage.setItem(PUBLIC_ONBOARDING_DRAFT_KEY, serialized);
    return true;
  } catch {
    return false;
  }
}

export function clearPublicOnboardingDraft(
  storage: PublicOnboardingDraftStorage,
): void {
  try {
    storage.removeItem(PUBLIC_ONBOARDING_DRAFT_KEY);
  } catch {
    // Storage can be unavailable in privacy modes. Signup must remain usable.
  }
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}
