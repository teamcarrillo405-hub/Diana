import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  fetchCanvasGrades: vi.fn(),
  getValidCanvasToken: vi.fn(),
  hydrateLmsConnectionForRuntime: vi.fn(),
  persistLmsTokenRefreshForRuntime: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/lms/canvas", () => ({
  fetchCanvasGrades: mocks.fetchCanvasGrades,
  getValidCanvasToken: mocks.getValidCanvasToken,
}));
vi.mock("@/lib/lms/credential-policy", () => ({
  hydrateLmsConnectionForRuntime: mocks.hydrateLmsConnectionForRuntime,
  persistLmsTokenRefreshForRuntime: mocks.persistLmsTokenRefreshForRuntime,
}));

import { GradeMoveCard } from "./grade-move-card";
import {
  LmsCredentialVaultUnavailableError,
  LmsReconnectRequiredError,
} from "@/lib/lms/errors";

function connectionQuery() {
  const builder = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(async () => ({
      data: [{ id: "connection-a", provider: "canvas", config: {} }],
      error: null,
    })),
  };
  builder.select.mockReturnValue(builder);
  builder.eq.mockReturnValue(builder);
  builder.order.mockReturnValue(builder);
  return builder;
}

describe("dashboard Canvas credential policy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("DIANA_LMS_CANVAS_IMPORT_ENABLED", "true");
    mocks.createClient.mockResolvedValue({
      auth: { getUser: vi.fn(async () => ({ data: { user: { id: "owner-a" } } })) },
      from: vi.fn(() => connectionQuery()),
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("shows a reconnect state for missing or stale Canvas credentials", async () => {
    mocks.hydrateLmsConnectionForRuntime.mockRejectedValue(new LmsReconnectRequiredError("canvas"));

    const result = await GradeMoveCard();

    expect(result).not.toBeNull();
    expect((result as { props: { href: string } }).props.href).toBe("/settings?canvas=reconnect_required");
    expect(mocks.fetchCanvasGrades).not.toHaveBeenCalled();
  });

  it("does not read credentials when Canvas import is disabled", async () => {
    vi.stubEnv("DIANA_LMS_CANVAS_IMPORT_ENABLED", "false");

    await expect(GradeMoveCard()).resolves.toBeNull();
    expect(mocks.createClient).not.toHaveBeenCalled();
    expect(mocks.hydrateLmsConnectionForRuntime).not.toHaveBeenCalled();
  });

  it("fails closed when a refreshed token cannot be persisted", async () => {
    mocks.hydrateLmsConnectionForRuntime.mockResolvedValue({
      id: "connection-a",
      provider: "canvas",
      config: {
        institution_id: "school-a",
        base_url: "https://canvas.example",
        token: "stale",
        refresh_token: "refresh-a",
        oauth: true,
      },
    });
    mocks.getValidCanvasToken.mockResolvedValue({
      token: "fresh",
      refreshed: { token: "fresh", expires_at: "2026-08-30T01:00:00.000Z" },
    });
    mocks.persistLmsTokenRefreshForRuntime.mockRejectedValue(new LmsCredentialVaultUnavailableError());

    await expect(GradeMoveCard()).resolves.toBeNull();
    expect(mocks.fetchCanvasGrades).not.toHaveBeenCalled();
  });
});
