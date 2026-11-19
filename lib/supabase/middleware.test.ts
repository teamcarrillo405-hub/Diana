import { createServerClient } from "@supabase/ssr";
import { NextRequest } from "next/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { updateSession } from "./middleware";
import { config as middlewareConfig, middleware } from "../../middleware";

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
  it.each(["/forgot-password", "/reset-password"])("serves the exact public recovery page %s without exposing nested paths", async (path) => {
    createServerClientMock.mockClear();
    expect((await updateSession(requestFor(path))).status).toBe(200);
    expect((await updateSession(requestFor(path + "/private"))).status).toBe(404);
  });
  it("serves the exact public Lobby specimen without creating an auth client", async () => {
    createServerClientMock.mockClear();
    const response = await updateSession(requestFor("/lobby-preview"));
    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
    expect(createServerClientMock).not.toHaveBeenCalled();
  });

  it("keeps the actual student Lobby behind authentication", async () => {
    const response = await updateSession(requestFor("/dashboard"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/login");
  });

  it("does not extend the public preview exception to child paths", async () => {
    const response = await updateSession(requestFor("/lobby-preview/private"));
    expect(response.status).toBe(404);
  });

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

  it("keeps public landing video files outside the session redirect", () => {
    const matcher = middlewareConfig.matcher.join("\n");

    expect(matcher).toContain("mp4");
    expect(matcher).toContain("webm");
  });

  it.each([
    "/assets/landing-cinematic-v3/style.css",
    "/assets/landing-cinematic-v3/main.js",
    "/assets/landing-cinematic-v3/media/notes-product-demo.mp4",
  ])("keeps cinematic landing asset %s public", async (path) => {
    const response = await updateSession(requestFor(path));

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("lets the read-only build identity route return public JSON", async () => {
    const response = await updateSession(requestFor("/api/build-info"));

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it.each([
    "worker.js", "worker.js.LEGAL.txt", "runtime-manifest.json",
    "ort-wasm-simd-threaded.mjs", "ort-wasm-simd-threaded.wasm",
    "ort-wasm-simd-threaded.jsep.mjs", "ort-wasm-simd-threaded.jsep.wasm",
  ])("serves public recognition runtime %s without a login redirect", async (asset) => {
    const response = await updateSession(requestFor(`/vendor/diana-recognition/${asset}`));
    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it.each(["/vendor/diana-recognition/private.json", "/api/learning/local-recognition", "/api/learning/course-practice"])(
    "does not make private or unknown recognition path %s public", async (path) => {
      const response = await updateSession(requestFor(path));
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/login");
    },
  );

  it.each(["/", "/how-it-works", "/student-control", "/trust", "/offline", "/robots.txt", "/sitemap.xml"])(
    "keeps public marketing route %s outside the login wall",
    async (path) => {
      const response = await updateSession(requestFor(path));

      expect(response.status).toBe(200);
      expect(response.headers.get("location")).toBeNull();
    },
  );

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

  it("returns a public 404 for an unknown top-level URL", async () => {
    const response = await updateSession(requestFor("/not-a-real-page"));

    expect(response.status).toBe(404);
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("x-middleware-rewrite")).toBe("http://diana.test/public-not-found");
  });

  it("uses a fresh matching nonce for each public recovery rewrite", async () => {
    const nonces = [];
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const request = new NextRequest("http://diana.test/not-a-real-page", {
        headers: {
          "x-nonce": "untrusted-incoming-nonce",
          "Content-Security-Policy": "script-src 'unsafe-inline'",
        },
      });
      const response = await middleware(request);
      const nonce = response.headers.get("x-middleware-request-x-nonce");
      const policy = response.headers.get("Content-Security-Policy");

      expect(response.status).toBe(404);
      expect(response.headers.get("location")).toBeNull();
      expect(nonce).toBeTruthy();
      expect(nonce).not.toBe("untrusted-incoming-nonce");
      expect(policy).toContain(`'nonce-${nonce}'`);
      const scriptPolicy = policy?.split(";").find((directive) => directive.trim().startsWith("script-src "));
      expect(scriptPolicy).not.toContain("'unsafe-inline'");
      expect(response.headers.get("x-middleware-request-content-security-policy")).toBe(policy);
      nonces.push(nonce);
    }
    expect(nonces[0]).not.toBe(nonces[1]);
  });
});
