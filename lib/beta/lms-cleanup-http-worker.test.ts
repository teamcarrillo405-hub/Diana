import { describe, expect, it, vi } from "vitest";

import {
  BETA_LMS_CLEANUP_ACK,
  type BetaLmsCleanupPlanAction,
} from "./lms-cleanup";
import { createBetaLmsCleanupHttpWorkers } from "./lms-cleanup-http-worker";

const action: BetaLmsCleanupPlanAction = {
  sequence: 1,
  provider: "canvas",
  origin: "https://canvas.test.example",
  providerResourceId: "course-1",
  kind: "course",
  resourceTag: "qa-beta-worker-001",
  parentResourceId: null,
  expectedBindingDigest: "a".repeat(64),
  writeRecordId: "c".repeat(64),
  writeRecordDigest: "d".repeat(64),
  disposable: true,
  idempotencyKey: "b".repeat(64),
};

function response(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("protected beta LMS cleanup HTTP worker", () => {
  it("uses the fixed HTTPS endpoint and never places the credential in the body", async () => {
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => response({
      state: "present",
      provider: "canvas",
      providerResourceId: action.providerResourceId,
      resourceTag: action.resourceTag,
      parentResourceId: null,
      bindingDigest: action.expectedBindingDigest,
    }));
    const workers = createBetaLmsCleanupHttpWorkers({
      endpoint: "https://cleanup.staging.example/v1/beta-lms-cleanup",
      token: "t".repeat(64),
      fetchImpl: fetchImpl as typeof fetch,
    });

    await expect(workers.canvas!.inspect(action)).resolves.toMatchObject({
      state: "present",
      provider: "canvas",
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(String(url)).toBe("https://cleanup.staging.example/v1/beta-lms-cleanup");
    expect(String(init?.body)).not.toContain("t".repeat(32));
    expect(new Headers(init?.headers).get("Authorization")).toBe(`Bearer ${"t".repeat(64)}`);
  });

  it("requires the exact acknowledgement before removal", async () => {
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => response({ outcome: "removed" }));
    const workers = createBetaLmsCleanupHttpWorkers({
      endpoint: "https://cleanup.staging.example/v1/beta-lms-cleanup",
      token: "t".repeat(64),
      fetchImpl: fetchImpl as typeof fetch,
    });

    await expect(workers.canvas!.remove(action, {
      idempotencyKey: action.idempotencyKey,
      acknowledgement: BETA_LMS_CLEANUP_ACK,
    })).resolves.toEqual({ outcome: "removed" });
    const body = JSON.parse(String(fetchImpl.mock.calls[0]![1]?.body)) as {
      operation: string;
      context: { acknowledgement: string };
    };
    expect(body.operation).toBe("remove");
    expect(body.context.acknowledgement).toBe(BETA_LMS_CLEANUP_ACK);
  });

  it("fails closed for unsafe endpoints, weak credentials, and malformed responses", async () => {
    expect(() => createBetaLmsCleanupHttpWorkers({
      endpoint: "http://127.0.0.1/v1/beta-lms-cleanup",
      token: "t".repeat(64),
    })).toThrow(/fixed HTTPS/iu);
    expect(() => createBetaLmsCleanupHttpWorkers({
      endpoint: "https://cleanup.staging.example/v1/beta-lms-cleanup",
      token: "short",
    })).toThrow(/credential/iu);

    const workers = createBetaLmsCleanupHttpWorkers({
      endpoint: "https://cleanup.staging.example/v1/beta-lms-cleanup",
      token: "t".repeat(64),
      fetchImpl: vi.fn(async () => response({ state: "present" })) as unknown as typeof fetch,
    });
    await expect(workers.canvas!.inspect(action)).rejects.toThrow(/invalid inspection/iu);
  });
});
