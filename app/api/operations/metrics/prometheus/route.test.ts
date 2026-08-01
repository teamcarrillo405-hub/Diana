import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

vi.mock("@/lib/operations/operational-health", () => ({
  getOperationalHealthSnapshot: vi.fn().mockResolvedValue({ generatedAt: "2026-07-31T12:00:00.000Z" }),
  formatOperationalHealthPrometheus: vi.fn().mockReturnValue("diana_operational_readiness 1\n"),
}));

describe("operational prometheus metrics route", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("requires the backend worker bearer token", async () => {
    vi.stubEnv("WORKER_API_TOKEN", "operations-secret");

    const response = await GET(new Request("http://diana.test/api/operations/metrics/prometheus"));

    expect(response.status).toBe(401);
  });

  it("returns a no-store Prometheus scrape without operational payloads", async () => {
    vi.stubEnv("WORKER_API_TOKEN", "operations-secret");
    const response = await GET(new Request("http://diana.test/api/operations/metrics/prometheus", {
      headers: { authorization: "Bearer operations-secret" },
    }));

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store, max-age=0");
    expect(response.headers.get("content-type")).toContain("text/plain");
    expect(await response.text()).toBe("diana_operational_readiness 1\n");
  });
});
