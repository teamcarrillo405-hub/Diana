import { beforeEach, describe, expect, it, vi } from "vitest";

const getSession = vi.fn();
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { getSession } }),
}));

import { requestRemoteSpeech } from "./remote-client";

describe("requestRemoteSpeech", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "publishable-key");
    vi.stubGlobal("fetch", vi.fn(async () => new Response("audio")));
  });

  it("authenticates the Edge request with the signed-in student JWT", async () => {
    getSession.mockResolvedValue({
      data: { session: { access_token: "student-jwt", user: { id: "student-1" } } },
    });

    await requestRemoteSpeech({
      text: "Read this",
      provider: "openai",
      voice: "nova",
      speed: 1,
    });

    expect(fetch).toHaveBeenCalledWith(
      "https://project.supabase.co/functions/v1/tts-generate",
      expect.objectContaining({
        headers: expect.objectContaining({
          apikey: "publishable-key",
          Authorization: "Bearer student-jwt",
        }),
      }),
    );
  });

  it("does not call the function without an authenticated session", async () => {
    getSession.mockResolvedValue({ data: { session: null } });

    await expect(
      requestRemoteSpeech({ text: "Read this", provider: "openai", voice: "nova", speed: 1 }),
    ).rejects.toThrow("Sign in");
    expect(fetch).not.toHaveBeenCalled();
  });
});
