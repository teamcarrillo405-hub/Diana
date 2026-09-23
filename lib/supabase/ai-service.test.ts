import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createServiceClient: vi.fn(),
}));

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: mocks.createServiceClient,
}));

import { createAiServiceClient } from "./ai-service";

describe("AI service client boundary", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("delegates to the service-role client on the server", () => {
    const service = { rpc: vi.fn() };
    mocks.createServiceClient.mockReturnValue(service);

    expect(createAiServiceClient()).toBe(service);
  });

  it("fails closed in a browser runtime", () => {
    vi.stubGlobal("window", {});

    expect(() => createAiServiceClient()).toThrow("ai_service_client_server_only");
    expect(mocks.createServiceClient).not.toHaveBeenCalled();
  });
});
