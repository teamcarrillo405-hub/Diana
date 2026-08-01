import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(),
}));

import { createServiceClient } from "@/lib/supabase/service";
import {
  hydrateLmsConnectionCredentials,
  isCredentialVaultReady,
  publicLmsConfig,
  saveLmsConnectionWithCredential,
  TrustedCredentialContextError,
} from "./credential-vault";

const mockCreateServiceClient = vi.mocked(createServiceClient);

function credentialClient(result: {
  data: { access_token: string | null; refresh_token: string | null } | null;
  error: null | { code?: string; message?: string };
}) {
  const filters: Array<[string, string]> = [];
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn((column: string, value: string) => {
      filters.push([column, value]);
      return query;
    }),
    maybeSingle: vi.fn(async () => result),
  };
  return {
    client: { from: vi.fn(() => query) },
    filters,
  };
}

describe("integration credential vault", () => {
  beforeEach(() => {
    mockCreateServiceClient.mockReset();
  });

  it("requires a configured trusted server context before any secret read", async () => {
    mockCreateServiceClient.mockReturnValue(null);

    await expect(isCredentialVaultReady()).rejects.toBeInstanceOf(TrustedCredentialContextError);
  });

  it("scopes secret reads to the owner, provider, and connection key", async () => {
    const fake = credentialClient({
      data: { access_token: "server-access", refresh_token: "server-refresh" },
      error: null,
    });
    mockCreateServiceClient.mockReturnValue(fake.client as never);

    const hydrated = await hydrateLmsConnectionCredentials("owner-a", {
      id: "connection-a",
      provider: "canvas",
      config: { base_url: "https://school.instructure.com", oauth: true },
    });

    expect(fake.client.from).toHaveBeenCalledWith("integration_credentials");
    expect(fake.filters).toEqual([
      ["owner_id", "owner-a"],
      ["provider", "canvas"],
      ["credential_key", "connection-a"],
    ]);
    expect(hydrated.config).toMatchObject({
      base_url: "https://school.instructure.com",
      token: "server-access",
      refresh_token: "server-refresh",
    });
  });

  it("falls back to the legacy row when an old instance has not populated the vault yet", async () => {
    const fake = credentialClient({ data: null, error: null });
    mockCreateServiceClient.mockReturnValue(fake.client as never);

    const hydrated = await hydrateLmsConnectionCredentials("owner-a", {
      id: "connection-a",
      provider: "google_classroom",
      config: {
        access_token: "legacy-access",
        refresh_token: "legacy-refresh",
        expires_at: "2026-08-01T00:00:00.000Z",
      },
    });

    expect(hydrated.config).toEqual({
      access_token: "legacy-access",
      refresh_token: "legacy-refresh",
      expires_at: "2026-08-01T00:00:00.000Z",
    });
    expect(publicLmsConfig({ token: "x", access_token: "y", refresh_token: "z", scope: "read" }))
      .toEqual({ scope: "read" });
  });

  it("retries through the atomic RPC without creating another owner/provider row", async () => {
    const rpc = vi.fn(async () => ({ data: "connection-a", error: null }));
    mockCreateServiceClient.mockReturnValue({ rpc } as never);
    const userStore = { from: vi.fn(() => { throw new Error("legacy write should not run"); }) };
    const input = {
      ownerId: "owner-a",
      provider: "canvas" as const,
      config: { base_url: "https://school.instructure.com" },
      accessToken: "access-a",
    };

    const first = await saveLmsConnectionWithCredential(userStore, input);
    const retry = await saveLmsConnectionWithCredential(userStore, input);

    expect(first).toEqual({ id: "connection-a", atomic: true });
    expect(retry).toEqual(first);
    expect(rpc).toHaveBeenCalledTimes(2);
    expect(rpc.mock.calls[0]).toEqual(rpc.mock.calls[1]);
    expect(userStore.from).not.toHaveBeenCalled();
  });

  it("does not fall back to a split write when the atomic RPC fails", async () => {
    const rpc = vi.fn(async () => ({
      data: null,
      error: { code: "23514", message: "credential constraint" },
    }));
    mockCreateServiceClient.mockReturnValue({ rpc } as never);
    const userStore = { from: vi.fn() };

    await expect(saveLmsConnectionWithCredential(userStore, {
      ownerId: "owner-a",
      provider: "google_classroom",
      config: { oauth: true },
      accessToken: "access-a",
    })).rejects.toThrow("could not be saved atomically");
    expect(userStore.from).not.toHaveBeenCalled();
  });

  it("uses a limit-one maybeSingle legacy update before the RPC migration", async () => {
    const rpc = vi.fn(async () => ({
      data: null,
      error: { code: "PGRST202", message: "Could not find the function" },
    }));
    mockCreateServiceClient.mockReturnValue({ rpc } as never);

    const limit = vi.fn();
    const maybeSingle = vi.fn(async () => ({ data: { id: "legacy-id" }, error: null }));
    const update = vi.fn();
    const insert = vi.fn();
    const single = vi.fn(async () => ({ data: { id: "legacy-id" }, error: null }));
    const query: any = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      limit: limit.mockImplementation(() => query),
      maybeSingle,
      update: update.mockImplementation(() => query),
      insert: insert.mockImplementation(() => query),
      single,
    };
    const userStore = { from: vi.fn(() => query) };
    const input = {
      ownerId: "owner-a",
      provider: "canvas" as const,
      config: { base_url: "https://school.instructure.com" },
      accessToken: "access-a",
    };

    const first = await saveLmsConnectionWithCredential(userStore, input);
    const retry = await saveLmsConnectionWithCredential(userStore, input);

    expect(first).toEqual({ id: "legacy-id", atomic: false });
    expect(retry).toEqual(first);
    expect(limit).toHaveBeenCalledTimes(2);
    expect(limit).toHaveBeenCalledWith(1);
    expect(maybeSingle).toHaveBeenCalledTimes(2);
    expect(update).toHaveBeenCalledTimes(2);
    expect(insert).not.toHaveBeenCalled();
  });
});
