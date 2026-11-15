import { afterEach, describe, expect, it, vi } from "vitest";

import { GET } from "./route";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("GET /api/diana/openai-status", () => {
  it("reports OpenAI connection metadata without exposing the key", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test-secret-value");
    vi.stubEnv("OPENAI_HOMEWORK_MODEL", "gpt-test-homework");
    vi.stubEnv("OPENAI_REALTIME_MODEL", "gpt-test-realtime");

    const response = GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(expect.objectContaining({
      ok: true,
      visible: true,
      connected: true,
      homeworkModel: "gpt-test-homework",
      realtimeModel: "gpt-test-realtime",
      fallback: "off",
    }));
    expect(JSON.stringify(body)).not.toContain("sk-test-secret-value");
  });

  it("marks fallback on when OpenAI is not configured", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");

    const response = GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.connected).toBe(false);
    expect(body.fallback).toBe("on");
  });
});