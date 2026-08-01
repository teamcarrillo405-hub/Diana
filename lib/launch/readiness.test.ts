import { describe, expect, it, vi } from "vitest";
import {
  launchReadinessPasses,
  runtimeReadiness,
  validateRuntimeEnvironment,
  type RuntimeEnvironment,
} from "./readiness";

function productionEnv(overrides: RuntimeEnvironment = {}): RuntimeEnvironment {
  return {
    NODE_ENV: "production",
    NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_public",
    SUPABASE_SERVICE_ROLE_KEY: "service-role-secret",
    NEXT_PUBLIC_APP_URL: "https://diana.app",
    ...overrides,
  };
}

describe("runtime environment validation", () => {
  it("accepts complete production configuration", () => {
    expect(validateRuntimeEnvironment(productionEnv())).toEqual({
      valid: true,
      missing: [],
      invalid: [],
    });
  });

  it("reports missing variables without their values", () => {
    const result = validateRuntimeEnvironment(productionEnv({ SUPABASE_SERVICE_ROLE_KEY: "" }));

    expect(result).toEqual({
      valid: false,
      missing: ["SUPABASE_SERVICE_ROLE_KEY"],
      invalid: [],
    });
  });

  it("rejects insecure and placeholder production values", () => {
    const result = validateRuntimeEnvironment(productionEnv({
      NEXT_PUBLIC_SUPABASE_URL: "https://placeholder.supabase.co",
      NEXT_PUBLIC_APP_URL: "http://diana.app",
      SUPABASE_SERVICE_ROLE_KEY: "replace-me",
    }));

    expect(result.valid).toBe(false);
    expect(result.invalid).toEqual([
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_APP_URL",
      "SUPABASE_SERVICE_ROLE_KEY",
    ]);
  });

  it("allows local HTTP origins outside production", () => {
    const result = validateRuntimeEnvironment({
      ...productionEnv(),
      NODE_ENV: "test",
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    });

    expect(result.valid).toBe(true);
  });
});

describe("runtime readiness", () => {
  it("uses bounded read-only Auth, database, and storage probes", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 200 }));
    const signal = new AbortController().signal;
    const timeoutSignal = vi.fn(() => signal);

    const result = await runtimeReadiness({
      env: productionEnv(),
      fetchImpl,
      timeoutMs: 1_500,
      timeoutSignal,
    });

    expect(result).toEqual({
      status: "ready",
      checks: {
        configuration: "ok",
        auth: "ok",
        database: "ok",
        storage: "ok",
      },
    });
    expect(timeoutSignal).toHaveBeenCalledTimes(3);
    expect(timeoutSignal).toHaveBeenCalledWith(1_500);
    expect(fetchImpl).toHaveBeenCalledWith(
      new URL("https://project.supabase.co/auth/v1/health"),
      expect.objectContaining({
        method: "GET",
        headers: { apikey: "sb_publishable_public" },
        cache: "no-store",
        redirect: "error",
        signal,
      }),
    );
    expect(fetchImpl).toHaveBeenCalledWith(
      new URL("https://project.supabase.co/rest/v1/profiles?select=user_id&limit=1"),
      expect.objectContaining({ method: "GET", signal }),
    );
    expect(fetchImpl).toHaveBeenCalledWith(
      new URL("https://project.supabase.co/storage/v1/bucket"),
      expect.objectContaining({ method: "GET", signal }),
    );
    expect(JSON.stringify(result)).not.toContain("service-role-secret");
  });

  it("skips dependency calls when configuration is incomplete", async () => {
    const fetchImpl = vi.fn<typeof fetch>();

    const result = await runtimeReadiness({
      env: productionEnv({ SUPABASE_SERVICE_ROLE_KEY: "" }),
      fetchImpl,
    });

    expect(result).toEqual({
      status: "not_ready",
      checks: {
        configuration: "error",
        auth: "skipped",
        database: "skipped",
        storage: "skipped",
      },
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it.each([
    ["non-2xx response", vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 503 }))],
    ["network error", vi.fn<typeof fetch>().mockRejectedValue(new Error("secret provider detail"))],
  ])("fails closed on a %s", async (_label, fetchImpl) => {
    const result = await runtimeReadiness({ env: productionEnv(), fetchImpl });

    expect(result).toEqual({
      status: "not_ready",
      checks: {
        configuration: "ok",
        auth: "error",
        database: "error",
        storage: "error",
      },
    });
  });

  it("reports the failing dependency without exposing response details", async () => {
    const fetchImpl = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(new Response("database secret", { status: 503 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));

    const result = await runtimeReadiness({ env: productionEnv(), fetchImpl });

    expect(result).toEqual({
      status: "not_ready",
      checks: {
        configuration: "ok",
        auth: "ok",
        database: "error",
        storage: "ok",
      },
    });
    expect(JSON.stringify(result)).not.toContain("database secret");
  });
});

describe("launch gate aggregation", () => {
  it("requires every executable gate to pass", () => {
    expect(launchReadinessPasses([
      { id: "critical-tests", passed: true },
      { id: "typecheck", passed: true },
    ])).toBe(true);
    expect(launchReadinessPasses([
      { id: "critical-tests", passed: true },
      { id: "typecheck", passed: false },
    ])).toBe(false);
    expect(launchReadinessPasses([])).toBe(false);
  });
});
