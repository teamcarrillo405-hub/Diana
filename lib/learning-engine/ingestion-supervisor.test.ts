import { describe, expect, it, vi } from "vitest";
import { superviseIngestion, waitForIngestion, type IngestionSupervisorOptions } from "./ingestion-supervisor";

const session = { url: "https://example.supabase.co", publicKey: "synthetic", accessToken: "synthetic" };
function harness(overrides: Partial<IngestionSupervisorOptions> = {}) {
  let now = 0;
  const waits: number[] = [];
  const options: IngestionSupervisorOptions = {
    maxDurationMs: 60_000, intervalMs: 1000, maxBackoffMs: 4000, maxPasses: 3,
    load: vi.fn(async () => session), pass: vi.fn(async () => ({ status: "idle", steps: 0 })),
    now: () => now, wait: async ms => { waits.push(ms); now += ms; }, ...overrides,
  };
  return { options, waits };
}

describe("bounded ingestion supervision", () => {
  it("reloads rotated sessions and never overlaps a pass", async () => {
    let active = 0, generation = 0; const seen: string[] = [];
    const { options } = harness({ load: async () => ({ ...session, accessToken: String(++generation) }), pass: async current => {
      expect(active++).toBe(0); await Promise.resolve(); seen.push(current.accessToken); active--; return { status: "idle", steps: 0 };
    } });
    expect(await superviseIngestion(options)).toEqual({ status: "bounded_supervisor_complete", passes: 3 });
    expect(seen).toEqual(["1", "2", "3"]);
  });
  it("terminates when credential reload rejects expiry, owner or endpoint changes", async () => {
    for (const reason of ["session_expired", "owner_changed", "endpoint_changed"]) {
      let loads = 0;
      const { options } = harness({ load: async () => { if (++loads > 1) throw new Error(reason); return session; } });
      expect(await superviseIngestion(options)).toEqual({ status: "session_unavailable", passes: 1 });
      expect(options.pass).toHaveBeenCalledTimes(1);
    }
  });
  it("stops immediately on revoked authorization without backoff", async () => {
    const { options, waits } = harness({ pass: async () => ({ status: "authorization_unavailable", steps: 0 }) });
    expect(await superviseIngestion(options)).toEqual({ status: "authorization_unavailable", passes: 1 });
    expect(waits).toEqual([]);
  });
  it("bounds repeated transient errors and caps exponential backoff", async () => {
    const { options, waits } = harness({ maxPasses: 20, pass: async () => { throw new Error("synthetic network interruption"); } });
    expect(await superviseIngestion(options)).toEqual({ status: "pass_unavailable", passes: 5 });
    expect(waits).toEqual([2000, 4000, 4000, 4000]);
  });
  it("honors shutdown before a pass and propagates shutdown during a pass", async () => {
    const before = new AbortController(); before.abort();
    const initial = harness({ signal: before.signal });
    expect(await superviseIngestion(initial.options)).toEqual({ status: "stopped", passes: 0 });
    expect(initial.options.load).not.toHaveBeenCalled();
    const controller = new AbortController();
    const running = harness({ signal: controller.signal, pass: async (_, signal) => {
      controller.abort(); expect(signal.aborted).toBe(true); return { status: "authorization_unavailable", steps: 0 };
    } });
    expect(await superviseIngestion(running.options)).toEqual({ status: "stopped", passes: 1 });
    expect(running.waits).toEqual([]);
  });
  it("wakes a sleeping supervisor on stop", async () => {
    const controller = new AbortController(), waiting = waitForIngestion(300_000, controller.signal);
    controller.abort(); await waiting;
  });
  it("stops loading when the duration expires and rejects unbounded settings", async () => {
    const { options } = harness({ maxDurationMs: 1000 });
    expect(await superviseIngestion(options)).toEqual({ status: "bounded_supervisor_complete", passes: 1 });
    await expect(superviseIngestion({ ...options, maxPasses: Infinity })).rejects.toThrow("supervisor_bound");
    await expect(superviseIngestion({ ...options, intervalMs: 0 })).rejects.toThrow("supervisor_bound");
  });
});
