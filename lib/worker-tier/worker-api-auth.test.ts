import { describe, expect, it } from "vitest";
import { hasValidWorkerBearer, workerBearerScope, workerMayAccessQueue, WINDOWS_WORKER_SMOKE_QUEUE } from "./worker-api-auth";

function request(authorization?: string) {
  return new Request("http://diana.test/api/workers/metrics", {
    headers: authorization ? { authorization } : {},
  });
}

describe("worker API bearer auth", () => {
  it('accepts a separate well-formed host credential without replacing the legacy token', () => {
    const token = 'a'.repeat(64);
    const env = { WORKER_API_TOKEN: 'legacy-secret', DIANA_WINDOWS_WORKER_API_TOKEN: token };
    expect(workerBearerScope(request(`Bearer ${token}`), env)).toBe('windows_host');
    expect(workerBearerScope(request('Bearer legacy-secret'), env)).toBe('legacy');
    expect(hasValidWorkerBearer(request(`Bearer ${token}`), { DIANA_WINDOWS_WORKER_API_TOKEN: token })).toBe(true);
    expect(workerMayAccessQueue(request(`Bearer ${token}`), WINDOWS_WORKER_SMOKE_QUEUE, env)).toBe(true);
    expect(workerMayAccessQueue(request(`Bearer ${token}`), 'student-ai-candidate', env)).toBe(false);
    expect(workerMayAccessQueue(request(`Bearer ${token}`), `${WINDOWS_WORKER_SMOKE_QUEUE}-other`, env)).toBe(false);
    expect(workerMayAccessQueue(request('Bearer legacy-secret'), 'student-ai-candidate', env)).toBe(true);
  });
  it('rejects absent, malformed, case-shifted and partially matching host credentials', () => {
    const token = 'a'.repeat(64);
    const env = { DIANA_WINDOWS_WORKER_API_TOKEN: token };
    for (const header of [undefined, `Bearer ${token.slice(1)}`, `Bearer ${token}b`, `bearer ${token}`, `Bearer ${token.toUpperCase()}`]) {
      expect(hasValidWorkerBearer(request(header), env)).toBe(false);
    }
    expect(hasValidWorkerBearer(request('Bearer short'), { DIANA_WINDOWS_WORKER_API_TOKEN: 'short' })).toBe(false);
    expect(hasValidWorkerBearer(request('Bearer anything'), {})).toBe(false);
    expect(workerMayAccessQueue(request(), WINDOWS_WORKER_SMOKE_QUEUE, env)).toBe(false);
  });
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
