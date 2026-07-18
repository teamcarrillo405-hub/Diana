import { createServerClient } from "@supabase/ssr";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { updateSession } from "./middleware";

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
  it("lets the read-only build identity route return public JSON", async () => {
    const response = await updateSession(requestFor("/api/build-info"));

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("lets the Diana voice status route return its own JSON auth response", async () => {
    const response = await updateSession(requestFor("/api/diana/voice-candidate/status?traceId=preflight"));

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("lets backend worker version route enforce bearer auth itself", async () => {
    const response = await updateSession(requestFor("/api/workers/version"));

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
