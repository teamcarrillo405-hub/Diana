import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(),
  verifyOtp: vi.fn()
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: mocks
  })
}));
import { GET } from "./route";
import { RECOVERY_COOKIE, verifyRecoveryState } from "@/lib/auth/recovery-state";
const secret = "test-secret-".repeat(5);
const session = {
  user: {
    id: "student-a",
    updated_at: "revision-a"
  },
  session: {
    access_token: "session-a"
  }
};
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("LMS_OAUTH_STATE_SECRET", secret);
  mocks.exchangeCodeForSession.mockResolvedValue({
    data: {
      ...session,
      redirectType: null
    },
    error: null
  });
  mocks.verifyOtp.mockResolvedValue({
    data: session,
    error: null
  });
});
afterEach(() => vi.unstubAllEnvs());
const callback = (query: string) => GET(new Request("https://diana.example.test/auth/callback?" + query));
describe("account link callback", () => {
  it("exchanges a normal confirmation and retains a safe destination", async () => {
    const response = await callback("code=synthetic&next=%2Fcalendar");
    expect(response.headers.get("location")).toBe("https://diana.example.test/calendar");
    expect(response.cookies.get(RECOVERY_COOKIE)?.value).toBe("");
  });
  it.each(["code=synthetic&next=%2Freset-password", "code=synthetic&type=recovery"])("normal confirmation cannot be upgraded by a query parameter %s", async query => {
    const response = await callback(query);
    expect(response.headers.get("location")).toContain("/auth/result?status=link-unavailable");
    expect(response.cookies.get(RECOVERY_COOKIE)?.value).toBe("");
  });
  it.each(["/..//evil.example", "/%2e%2e//evil.example", "/foo/..//evil.example", "/.//evil.example"])("does not redirect externally after dot-segment normalization %s", async next => {
    const response = await callback("code=x&next=" + encodeURIComponent(next));
    expect(response.headers.get("location")).toBe("https://diana.example.test/dashboard");
  });
  it("requires the exact recovery discriminator returned by the SDK", async () => {
    mocks.exchangeCodeForSession.mockResolvedValue({data:{...session,redirectType:{type:"recovery"}},error:null});
    const response=await callback("code=synthetic&next=%2Freset-password");
    expect(response.headers.get("location")).toContain("status=link-unavailable");
    expect(response.cookies.get(RECOVERY_COOKIE)?.value).toBe("");
  });
  it("recognizes SDK recovery PKCE rather than trusting the next parameter", async () => {
    mocks.exchangeCodeForSession.mockResolvedValue({
      data: {
        ...session,
        redirectType: "recovery"
      },
      error: null
    });
    const response = await callback("code=synthetic&return_to=%2Fcalendar");
    expect(response.headers.get("location")).toBe("https://diana.example.test/reset-password");
    expect(verifyRecoveryState({
      value: response.cookies.get(RECOVERY_COOKIE)?.value,
      userId: "student-a",
      userRevision: "revision-a",
      accessToken: "session-a",
      secret
    })).toEqual({
      next: "/calendar"
    });
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
  });
  it("supports recovery-specific token hash links from configured email templates", async () => {
    const response = await callback("token_hash=synthetic&type=recovery&return_to=%2Fsettings");
    expect(mocks.verifyOtp).toHaveBeenCalledWith({
      token_hash: "synthetic",
      type: "recovery"
    });
    expect(response.headers.get("location")).toContain("/reset-password");
    expect(response.cookies.get(RECOVERY_COOKIE)?.httpOnly).toBe(true);
  });
  it("requires the authoritative account revision before issuing recovery proof", async () => {
    mocks.verifyOtp.mockResolvedValue({data:{user:{id:"student-a"},session:{access_token:"session-a"}},error:null});
    const response=await callback("token_hash=synthetic&type=recovery");
    expect(response.headers.get("location")).toContain("status=recovery-unavailable");
    expect(response.cookies.get(RECOVERY_COOKIE)?.value).toBe("");
  });
  it("signup token hashes do not mint recovery authorization", async () => {
    const response = await callback("token_hash=synthetic&type=signup");
    expect(response.headers.get("location")).toBe("https://diana.example.test/dashboard");
    expect(response.cookies.get(RECOVERY_COOKIE)?.value).toBe("");
  });
  it.each(["", "code=x&token_hash=y&type=recovery", "error=private&error_description=private", "token_hash=x&type=invite"])("handles unusable links calmly %s", async query => {
    const response = await callback(query);
    expect(response.headers.get("location")).toBe("https://diana.example.test/auth/result?status=link-unavailable");
  });
  it("fails closed if recovery signing configuration is absent", async () => {
    vi.stubEnv("LMS_OAUTH_STATE_SECRET", "");
    const response = await callback("token_hash=synthetic&type=recovery");
    expect(response.headers.get("location")).toContain("status=recovery-unavailable");
    expect(response.cookies.get(RECOVERY_COOKIE)?.value).toBe("");
  });
  it("never forwards an external next or private provider diagnostic", async () => {
    expect((await callback("code=x&next=%2F%2Fevil.test")).headers.get("location")).toBe("https://diana.example.test/dashboard");
    mocks.exchangeCodeForSession.mockRejectedValue(new Error("secret diagnostic"));
    expect((await callback("code=x")).headers.get("location")).not.toContain("secret");
  });
});
