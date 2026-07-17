import type { ScreenDesignOnboardingAnswers } from "./screendesign";

export const PUBLIC_ONBOARDING_DRAFT_KEY =
  "diana:public-onboarding-draft";
export const PUBLIC_ONBOARDING_DRAFT_MAX_BYTES = 512;

export interface PublicOnboardingDraftStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function readPublicOnboardingDraft(
  _storage: PublicOnboardingDraftStorage,
): ScreenDesignOnboardingAnswers | null {
  return null;
}

export function writePublicOnboardingDraft(
  _storage: PublicOnboardingDraftStorage,
  _input: unknown,
): boolean {
  return false;
}

export function clearPublicOnboardingDraft(
  _storage: PublicOnboardingDraftStorage,
): void {}
