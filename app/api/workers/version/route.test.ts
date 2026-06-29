import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

function request(token = "worker-secret") {
  return new Request("http://diana.test/api/workers/version", {
    headers: {
      authorization: `Bearer ${token}`,
    },
  });
}

describe("worker version route", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("requires worker bearer authorization", async () => {
    vi.stubEnv("WORKER_API_TOKEN", "worker-secret");

    const response = await GET(new Request("http://diana.test/api/workers/version"));

    expect(response.status).toBe(401);
  });

  it("returns the explicit Diana app build SHA when configured", async () => {
    vi.stubEnv("WORKER_API_TOKEN", "worker-secret");
    vi.stubEnv("DIANA_APP_BUILD_SHA", "app-sha-a");
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "vercel-sha-b");
    vi.stubEnv("VERCEL_ENV", "production");

    const response = await GET(request());
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toMatchObject({
      ok: true,
      app: {
        sha: "app-sha-a",
        source: "DIANA_APP_BUILD_SHA",
        environment: "production",
      },
    });
  });

  it("falls back to Vercel's commit SHA", async () => {
    vi.stubEnv("WORKER_API_TOKEN", "worker-secret");
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "vercel-sha-b");

    const response = await GET(request());
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.app).toMatchObject({
      sha: "vercel-sha-b",
      source: "VERCEL_GIT_COMMIT_SHA",
    });
  });
});
