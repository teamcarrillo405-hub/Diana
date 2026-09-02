import { describe, expect, it, vi } from "vitest";
import {
  assertLmsCredentialVaultAvailable,
  credentialVaultRequired,
  hydrateLmsConnectionForRuntime,
  saveLmsConnectionForRuntime,
} from "./credential-policy";

const connection = {
  id: "connection-1",
  provider: "canvas",
  config: {
    base_url: "https://canvas.example",
    token: "legacy-token",
    refresh_token: "legacy-refresh",
  },
};

describe("LMS credential vault runtime policy", () => {
  it("requires the vault in every runtime except development", () => {
    expect(credentialVaultRequired({ NODE_ENV: "development" })).toBe(false);
    expect(credentialVaultRequired({ NODE_ENV: "test" })).toBe(true);
    expect(credentialVaultRequired({ NODE_ENV: "production" })).toBe(true);
    expect(credentialVaultRequired({})).toBe(true);
  });

  it("removes legacy secrets before strict hydration", async () => {
    const hydrate = vi.fn(async (_ownerId: string, input: typeof connection) => ({
      ...input,
      config: {
        ...input.config,
        token: "vault-token",
        refresh_token: "vault-refresh",
      },
    }));

    const hydrated = await hydrateLmsConnectionForRuntime("owner-1", connection, {
      env: { NODE_ENV: "production" },
      vaultReady: async () => true,
      hydrate: hydrate as never,
    });

    expect(hydrate).toHaveBeenCalledWith("owner-1", expect.objectContaining({
      config: { base_url: "https://canvas.example" },
    }));
    expect(hydrated.config.token).toBe("vault-token");
  });

  it("fails closed when the vault is unavailable", async () => {
    await expect(assertLmsCredentialVaultAvailable({
      env: { NODE_ENV: "production" },
      vaultReady: async () => false,
    })).rejects.toMatchObject({
      code: "credential_vault_unavailable",
      status: 503,
    });
  });

  it("requires reconnect when a strict vault has no connection credential", async () => {
    await expect(hydrateLmsConnectionForRuntime("owner-1", connection, {
      env: { NODE_ENV: "production" },
      vaultReady: async () => true,
      hydrate: (async (_ownerId: string, input: typeof connection) => input) as never,
    })).rejects.toMatchObject({
      code: "reconnect_required",
      provider: "canvas",
    });
  });

  it("accepts a refresh-only vault credential for token renewal", async () => {
    const hydrated = await hydrateLmsConnectionForRuntime("owner-1", connection, {
      env: { NODE_ENV: "production" },
      vaultReady: async () => true,
      hydrate: (async (_ownerId: string, input: typeof connection) => ({
        ...input,
        config: { base_url: "https://canvas.example", refresh_token: "vault-refresh" },
      })) as never,
    });

    expect(hydrated.config).toEqual({
      base_url: "https://canvas.example",
      refresh_token: "vault-refresh",
    });
  });

  it("uses only the atomic save path outside development", async () => {
    const atomicSave = vi.fn(async () => ({ id: "connection-1", atomic: true as const }));
    const userStore = { from: vi.fn(() => { throw new Error("legacy store must not be used"); }) };

    const result = await saveLmsConnectionForRuntime(userStore, {
      ownerId: "owner-1",
      provider: "canvas",
      config: { base_url: "https://canvas.example" },
      accessToken: "access-token",
      refreshToken: "refresh-token",
    }, {
      env: { NODE_ENV: "production" },
      atomicSave,
    });

    expect(result).toEqual({ id: "connection-1", atomic: true });
    expect(atomicSave).toHaveBeenCalledTimes(1);
    expect(userStore.from).not.toHaveBeenCalled();
  });
});
