import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getValidGoogleToken: vi.fn(),
  hydrateLmsConnectionForRuntime: vi.fn(),
  persistLmsTokenRefreshForRuntime: vi.fn(),
  syncGoogleCalendarEvents: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/lms/google", () => ({ getValidGoogleToken: mocks.getValidGoogleToken }));
vi.mock("@/lib/lms/credential-policy", () => ({
  hydrateLmsConnectionForRuntime: mocks.hydrateLmsConnectionForRuntime,
  persistLmsTokenRefreshForRuntime: mocks.persistLmsTokenRefreshForRuntime,
}));
vi.mock("@/lib/lms/google-calendar", () => ({
  syncGoogleCalendarEvents: mocks.syncGoogleCalendarEvents,
}));

import { POST } from "./route";
import {
  LmsCredentialVaultUnavailableError,
  LmsReconnectRequiredError,
} from "@/lib/lms/errors";

const connection = {
  id: "connection-a",
  owner_id: "owner-a",
  provider: "google_classroom",
  config: { calendar_enabled: true },
  last_synced_at: null,
  created_at: "2026-08-30T00:00:00.000Z",
};

function query(value: unknown) {
  const builder = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(async () => ({ data: value, error: null })),
  };
  builder.select.mockReturnValue(builder);
  builder.eq.mockReturnValue(builder);
  return builder;
}

describe("Google Calendar LMS credential policy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DIANA_LMS_GOOGLE_IMPORT_ENABLED = "true";
    const store = {
      auth: { getUser: vi.fn(async () => ({ data: { user: { id: "owner-a" } } })) },
      from: vi.fn(() => query(connection)),
    };
    mocks.createClient.mockResolvedValue(store);
    mocks.hydrateLmsConnectionForRuntime.mockResolvedValue({
      ...connection,
      config: {
        calendar_enabled: true,
        access_token: "access-a",
        refresh_token: "refresh-a",
        expires_at: "2026-08-30T01:00:00.000Z",
      },
    });
    mocks.getValidGoogleToken.mockResolvedValue({
      token: "access-b",
      refreshed: { access_token: "access-b", expires_at: "2026-08-30T02:00:00.000Z" },
    });
    mocks.persistLmsTokenRefreshForRuntime.mockResolvedValue(undefined);
    mocks.syncGoogleCalendarEvents.mockResolvedValue({ imported: 2 });
  });

  afterEach(() => {
    delete process.env.DIANA_LMS_GOOGLE_IMPORT_ENABLED;
  });

  it("persists refreshes through the fail-closed runtime writer", async () => {
    const response = await POST();

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, imported: 2 });
    expect(mocks.persistLmsTokenRefreshForRuntime).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ ownerId: "owner-a", accessToken: "access-b" }),
    );
    expect(mocks.syncGoogleCalendarEvents).toHaveBeenCalledWith(
      expect.anything(),
      "owner-a",
      "access-b",
    );
  });

  it.each([
    [new LmsReconnectRequiredError("google_classroom"), 401, "reconnect_required"],
    [new LmsCredentialVaultUnavailableError(), 503, "credential_vault_unavailable"],
  ] as const)("maps credential policy failures without importing events", async (error, status, code) => {
    mocks.hydrateLmsConnectionForRuntime.mockRejectedValue(error);

    const response = await POST();

    expect(response.status).toBe(status);
    expect(await response.json()).toMatchObject({ code });
    expect(mocks.syncGoogleCalendarEvents).not.toHaveBeenCalled();
    expect(mocks.persistLmsTokenRefreshForRuntime).not.toHaveBeenCalled();
  });

  it("maps a revoked provider token to reconnect_required", async () => {
    mocks.getValidGoogleToken.mockResolvedValue({ token: "revoked" });
    mocks.syncGoogleCalendarEvents.mockRejectedValue(new Error("Google Calendar request returned 401"));

    const response = await POST();

    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ code: "reconnect_required" });
  });

  it("checks the Google import flag before reading the connection", async () => {
    process.env.DIANA_LMS_GOOGLE_IMPORT_ENABLED = "false";

    const response = await POST();

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ code: "provider_feature_disabled" });
    expect(mocks.hydrateLmsConnectionForRuntime).not.toHaveBeenCalled();
    expect(mocks.syncGoogleCalendarEvents).not.toHaveBeenCalled();
  });
});
