import { describe, expect, it } from "vitest";
import { hasValidWorkerBearer } from "./worker-api-auth";

function request(authorization?: string) {
  return new Request("http://diana.test/api/workers/metrics", {
    headers: authorization ? { authorization } : {},
  });
}

describe("worker API bearer auth", () => {
  it("accepts the configured worker bearer token", () => {
    expect(hasValidWorkerBearer(request("Bearer worker-secret"), {
      ...process.env,
      WORKER_API_TOKEN: "worker-secret",
    })).toBe(true);
  });

  it("rejects missing or mismatched worker bearer tokens", () => {
    const env = { ...process.env, WORKER_API_TOKEN: "worker-secret" };

    expect(hasValidWorkerBearer(request(), env)).toBe(false);
    expect(hasValidWorkerBearer(request("Bearer other-secret"), env)).toBe(false);
    expect(hasValidWorkerBearer(request("worker-secret"), env)).toBe(false);
  });

  it("rejects all worker requests when the server token is not configured", () => {
    expect(hasValidWorkerBearer(request("Bearer worker-secret"), {
      ...process.env,
      WORKER_API_TOKEN: "",
    })).toBe(false);
  });
});
