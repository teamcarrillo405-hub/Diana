import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  loadProfile: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ auth: { getUser: mocks.getUser } })),
}));
vi.mock("@/lib/profile", () => ({
  loadProfile: mocks.loadProfile,
  profileBodyClass: vi.fn(() => ""),
}));
vi.mock("@/components/overwhelmed-button", () => ({ OverwhelmedButton: () => null }));
vi.mock("@/components/quick-capture", () => ({ QuickCapture: () => null }));
vi.mock("@/components/platform-analytics-tracker", () => ({
  PlatformAnalyticsTracker: () => null,
}));
vi.mock("@/components/pwa-runtime", () => ({ PwaRuntime: () => null }));
vi.mock("@/components/session-handoff-tracker", () => ({
  SessionHandoffTracker: () => null,
}));
vi.mock("@/components/agent-fab", () => ({ AgentFab: () => null }));

import AppLayout from "./layout";

describe("authenticated app age boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({ data: { user: { id: "student-1" } } });
    mocks.redirect.mockImplementation((destination: string) => {
      throw new Error(`redirect:${destination}`);
    });
  });

  it("blocks an existing authenticated under-13 profile before rendering the app", async () => {
    mocks.loadProfile.mockResolvedValue({
      age_bracket: "under_13",
      onboarded_at: "2026-08-01T00:00:00.000Z",
    });

    await expect(AppLayout({ children: null })).rejects.toThrow("redirect:/");
    expect(mocks.redirect).toHaveBeenCalledWith("/");
  });

  it("preserves authenticated access for an onboarded 13+ profile", async () => {
    mocks.loadProfile.mockResolvedValue({
      age_bracket: "13_to_17",
      onboarded_at: "2026-08-01T00:00:00.000Z",
    });

    const layout = await AppLayout({ children: "student-content" as ReactNode });

    expect(layout).toBeTruthy();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});
