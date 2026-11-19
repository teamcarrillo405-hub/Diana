import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ loadProfile: vi.fn(), redirect: vi.fn() }));
vi.mock("@/lib/profile", () => ({ loadProfile: mocks.loadProfile }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("./form", () => ({ OnboardingForm: () => null }));
import OnboardingPage from "./page";

const completedProfile = { user_id: "student-one", onboarded_at: "2026-11-19T12:00:00Z" };
beforeEach(() => {
  vi.clearAllMocks();
  mocks.loadProfile.mockResolvedValue(completedProfile);
  mocks.redirect.mockImplementation((destination: string) => { throw new Error("Redirect: " + destination); });
});

describe("onboarding route after saving preferences", () => {
  it("keeps the optional connection screen reachable after completion and reload", async () => {
    for (const sdState of ["connect", "connect=2/2", "connect=3/4"]) {
      const page = await OnboardingPage({ searchParams: Promise.resolve({ sdState }) });
      expect(page.props.initialStep).toBe("connect");
      expect(page.props.initial).toBe(completedProfile);
    }
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("continues to redirect completed profiles away from the first step", async () => {
    for (const sdState of [undefined, "personalize", "invalid", ["connect"]]) {
      await expect(OnboardingPage({ searchParams: Promise.resolve({ sdState }) })).rejects.toThrow("Redirect: /dashboard");
    }
  });

  it("still requires an authenticated profile for the optional step", async () => {
    mocks.loadProfile.mockResolvedValue(null);
    await expect(OnboardingPage({ searchParams: Promise.resolve({ sdState: "connect" }) })).rejects.toThrow("Redirect: /login");
  });

  it("keeps under-13 profiles out of the optional provider connection screen", async () => {
    for (const onboarded_at of [completedProfile.onboarded_at, null]) {
      mocks.loadProfile.mockResolvedValue({ ...completedProfile, onboarded_at, age_bracket: "under_13" });
      await expect(OnboardingPage({ searchParams: Promise.resolve({ sdState: "connect" }) })).rejects.toThrow("Redirect: /");
      expect(mocks.redirect).toHaveBeenLastCalledWith("/");
    }
  });

  it("starts an unfinished profile on personalization", async () => {
    mocks.loadProfile.mockResolvedValue({ ...completedProfile, onboarded_at: null });
    const page = await OnboardingPage({});
    expect(page.props.initialStep).toBe("personalize");
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});
