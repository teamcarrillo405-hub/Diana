import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  getSession: vi.fn(),
  updateUser: vi.fn(),
  signInWithPassword: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  getCookie: vi.fn(),
  setCookie: vi.fn()
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: mocks.getCookie,
    set: mocks.setCookie
  })
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: mocks
  })
}));
vi.mock("@/lib/public-site-url", () => ({
  resolvePublicSiteUrl: () => "https://diana.example.test"
}));
import { issueRecoveryState, RECOVERY_COOKIE } from "@/lib/auth/recovery-state";
import { requestPasswordReset, completePasswordReset, changeAccountPassword, getPasswordResetContext } from "./password-actions";
const secret = "test-secret-".repeat(5),
  password = "a new long phrase";
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("LMS_OAUTH_STATE_SECRET", secret);
  mocks.getUser.mockResolvedValue({
    data: {
      user: {
        id: "student-a",
        email: "student@example.test",
        updated_at: "revision-a"
      }
    },
    error: null
  });
  mocks.getSession.mockResolvedValue({
    data: {
      session: {
        access_token: "session-a"
      }
    },
    error: null
  });
  mocks.updateUser.mockResolvedValue({
    error: null
  });
  mocks.signInWithPassword.mockResolvedValue({
    data: {
      user: {
        id: "student-a"
      }
    },
    error: null
  });
  mocks.resetPasswordForEmail.mockResolvedValue({
    error: null
  });
});
afterEach(() => vi.unstubAllEnvs());
describe("request recovery", () => {
  it("uses the configured origin and a safe continue page", async () => {
    const result = await requestPasswordReset("Student@Example.test", "//other.example");
    expect(result.ok).toBe(true);
    const target = new URL(mocks.resetPasswordForEmail.mock.calls[0][1].redirectTo);
    expect(target.origin).toBe("https://diana.example.test");
    expect(target.searchParams.get("next")).toBe("/reset-password");
    expect(target.searchParams.get("return_to")).toBe("/dashboard");
  });
  it("returns the same sent response for existing, absent or rate-limited accounts", async () => {
    const first = await requestPasswordReset("one@example.test");
    mocks.resetPasswordForEmail.mockResolvedValue({
      error: {
        message: "do not disclose",
        status: 429
      }
    });
    expect(await requestPasswordReset("two@example.test")).toEqual(first);
  });
  it("does not send email when configuration is unavailable", async () => {
    vi.stubEnv("LMS_OAUTH_STATE_SECRET", "");
    expect((await requestPasswordReset("one@example.test")).ok).toBe(false);
    expect(mocks.resetPasswordForEmail).not.toHaveBeenCalled();
  });
  it("validates email and handles a paused connection", async () => {
    expect((await requestPasswordReset("no-email")).ok).toBe(false);
    mocks.resetPasswordForEmail.mockRejectedValue(new Error("private diagnostic"));
    const result = await requestPasswordReset("one@example.test");
    expect(result.ok).toBe(false);
    expect(result.message).not.toContain("private diagnostic");
  });
});
describe("save recovered password", () => {
  it("an ordinary signed-in session cannot reset a password", async () => {
    expect(await getPasswordResetContext()).toEqual({
      available: false
    });
    expect((await completePasswordReset(password, password)).ok).toBe(false);
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });
  it("requires proof for this user and this session", async () => {
    mocks.getCookie.mockReturnValue({
      value: issueRecoveryState({
        userId: "student-b",
      userRevision: "revision-a",
        accessToken: "session-a",
        secret
      })
    });
    expect((await completePasswordReset(password, password)).ok).toBe(false);
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });
  it("saves only with verified recovery proof, then clears it", async () => {
    mocks.getCookie.mockReturnValue({
      value: issueRecoveryState({
        userId: "student-a",
      userRevision: "revision-a",
        accessToken: "session-a",
        secret,
        next: "/calendar"
      })
    });
    expect(await completePasswordReset(password, password)).toMatchObject({
      ok: true,
      next: "/calendar"
    });
    expect(mocks.updateUser).toHaveBeenCalledWith({
      password
    });
    expect(mocks.setCookie).toHaveBeenCalledWith(RECOVERY_COOKIE, "", expect.objectContaining({
      maxAge: 0,
      httpOnly: true
    }));
  });
  it("rejects the saved proof after password update even with the same session token", async () => {
    mocks.getCookie.mockReturnValue({value:issueRecoveryState({userId:"student-a",userRevision:"revision-a",accessToken:"session-a",secret})});
    mocks.updateUser.mockImplementationOnce(async()=>{mocks.getUser.mockResolvedValue({data:{user:{id:"student-a",email:"student@example.test",updated_at:"revision-b"}},error:null});return {error:null};});
    expect((await completePasswordReset(password,password)).ok).toBe(true);
    expect(await getPasswordResetContext()).toEqual({available:false});
    expect((await completePasswordReset("another long phrase","another long phrase")).ok).toBe(false);
    expect(mocks.updateUser).toHaveBeenCalledTimes(1);
  });
  it("does not write a password on mismatch or backend rejection", async () => {
    expect((await completePasswordReset(password, "different phrase")).ok).toBe(false);
    expect(mocks.updateUser).not.toHaveBeenCalled();
    mocks.getUser.mockResolvedValue({
      data: {
        user: null
      },
      error: {
        message: "expired"
      }
    });
    expect((await completePasswordReset(password, password)).ok).toBe(false);
  });
});
describe("signed-in password change", () => {
  it("uses the verified user's email rather than client authority", async () => {
    expect((await changeAccountPassword("current phrase", password, password)).ok).toBe(true);
    expect(mocks.signInWithPassword).toHaveBeenCalledWith({
      email: "student@example.test",
      password: "current phrase"
    });
    expect(mocks.updateUser).toHaveBeenCalledWith({
      password
    });
  });
  it.each([{
    data: {
      user: null
    },
    error: {
      message: "bad current password"
    }
  }, {
    data: {
      user: {
        id: "student-b"
      }
    },
    error: null
  }])("requires reauthentication of the same account", async response => {
    mocks.signInWithPassword.mockResolvedValue(response);
    expect((await changeAccountPassword("current phrase", password, password)).ok).toBe(false);
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });
  it("does not expose transport or provider details", async () => {
    mocks.signInWithPassword.mockRejectedValue(new Error("private diagnostic"));
    const result = await changeAccountPassword("current phrase", password, password);
    expect(result.ok).toBe(false);
    expect(result.message).not.toContain("private diagnostic");
  });
});
