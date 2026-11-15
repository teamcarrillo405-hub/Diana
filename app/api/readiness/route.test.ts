import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

function stubProductionEnvironment() {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "do-not-leak-publishable");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "do-not-leak-service-role");
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://diana.app");
}

describe("readiness route", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("returns 200 when configuration and Supabase are ready", async () => {
    stubProductionEnvironment();
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 200 })));

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store, max-age=0");
    expect(await response.json()).toEqual({
      status: "ready",
      checks: {
        configuration: "ok",
        auth: "ok",
        database: "ok",
        storage: "ok",
      },
    });
  });

  it("returns 503 without calling dependencies when configuration is missing", async () => {
    stubProductionEnvironment();
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    const fetchImpl = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchImpl);

    const response = await GET();

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
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

  it("returns a redacted 503 when the dependency call fails", async () => {
    stubProductionEnvironment();
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockRejectedValue(
      new Error("do-not-leak-provider-error"),
    ));

    const response = await GET();
    const body = await response.text();

    expect(response.status).toBe(503);
    expect(body).toContain('"auth":"error"');
    expect(body).toContain('"database":"error"');
    expect(body).toContain('"storage":"error"');
    expect(body).not.toContain("do-not-leak");
    expect(body).not.toContain("project.supabase.co");
  });
});
