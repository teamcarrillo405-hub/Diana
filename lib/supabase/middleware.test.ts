import { createServerClient } from "@supabase/ssr";
import { NextRequest } from "next/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { updateSession } from "./middleware";
import { config as middlewareConfig } from "../../middleware";

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(),
}));

const createServerClientMock = vi.mocked(createServerClient);

function requestFor(path: string) {
  return new NextRequest(new URL(path, "http://diana.test"));
}

beforeEach(() => {
  createServerClientMock.mockReturnValue({
    auth: {
      getUser: vi.fn(async () => ({ data: { user: null } })),
    },
  } as unknown as ReturnType<typeof createServerClient>);
});

describe("Supabase middleware", () => {
  it("excludes bearer-authenticated cron routes from session redirects", () => {
    const matcher = middlewareConfig.matcher.join("\n");
    const schedules = JSON.parse(
      readFileSync(join(process.cwd(), "vercel.json"), "utf8"),
    ) as { crons: Array<{ path: string }> };

    for (const { path } of schedules.crons) {
      const route = path.replace(/^\//, "");
      const routePrefix = route.slice(0, route.lastIndexOf("/") + 1);
      expect(
        matcher.includes(route) || matcher.includes(routePrefix),
        `Expected middleware matcher to bypass scheduled route ${path}`,
      ).toBe(true);
    }
  });

  it("lets the read-only build identity route return public JSON", async () => {
    const response = await updateSession(requestFor("/api/build-info"));

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it.each(["/api/health", "/api/readiness"])(
    "lets the deployment probe %s return public JSON",
    async (path) => {
      const response = await updateSession(requestFor(path));

      expect(response.status).toBe(200);
      expect(response.headers.get("location")).toBeNull();
    },
  );

  it("lets the Diana voice status route return its own JSON auth response", async () => {
    const response = await updateSession(requestFor("/api/diana/voice-candidate/status?traceId=preflight"));

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it.each(["/api/workers/version", "/api/operations/metrics/prometheus"])(
    "lets backend route %s enforce bearer auth itself",
    async (path) => {
      const response = await updateSession(requestFor(path));

      expect(response.status).toBe(200);
      expect(response.headers.get("location")).toBeNull();
    },
  );

  it("lets the gated QA session route perform its own environment check", async () => {
    const response = await updateSession(requestFor("/qa-session?account=student"));

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("redirects unauthenticated private API routes to login", async () => {
    const response = await updateSession(requestFor("/api/private-preflight"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/login");
    expect(response.headers.get("location")).toContain("next=%2Fapi%2Fprivate-preflight");
  });

  it("keeps unauthenticated private pages behind the login wall", async () => {
    const response = await updateSession(requestFor("/settings"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/login");
    expect(response.headers.get("location")).toContain("next=%2Fsettings");
  });
});
