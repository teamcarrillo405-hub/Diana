import type { IngestionSession } from "./ingestion-session";

export type IngestionPassResult = { status: string; steps: number };
export type IngestionSupervisorOptions = {
  maxDurationMs: number; intervalMs: number; maxBackoffMs: number; maxPasses: number;
  load: () => Promise<IngestionSession>;
  pass: (session: IngestionSession, signal: AbortSignal) => Promise<IngestionPassResult>;
  signal?: AbortSignal;
  now?: () => number;
  wait?: (ms: number, signal: AbortSignal) => Promise<void>;
  report?: (event: { passes: number; status: string; steps?: number }) => void;
};

export function waitForIngestion(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise(resolve => {
    if (signal.aborted) { resolve(); return; }
    const finish = () => { clearTimeout(timer); signal.removeEventListener("abort", finish); resolve(); };
    const timer = setTimeout(finish, ms);
    signal.addEventListener("abort", finish, { once: true });
  });
}

/** Await each pass before reloading credentials. No interval callback can overlap a pass. */
export async function superviseIngestion(options: IngestionSupervisorOptions) {
  const { maxDurationMs, intervalMs, maxBackoffMs, maxPasses } = options;
  if (![maxDurationMs, intervalMs, maxBackoffMs, maxPasses].every(Number.isSafeInteger) ||
      maxDurationMs < 1000 || maxDurationMs > 86_400_000 || intervalMs < 1000 || intervalMs > 300_000 ||
      maxBackoffMs < intervalMs || maxBackoffMs > 300_000 || maxPasses < 1 || maxPasses > 1000) throw new Error("ingestion_supervisor_bound");
  const clock = options.now ?? Date.now, start = clock(), controller = new AbortController();
  const stop = () => controller.abort();
  options.signal?.addEventListener("abort", stop, { once: true });
  if (options.signal?.aborted) stop();
  const deadline = setTimeout(stop, maxDurationMs);
  let passes = 0, errors = 0;
  try {
    while (!controller.signal.aborted && clock() - start < maxDurationMs && passes < maxPasses) {
      let session: IngestionSession;
      try { session = await options.load(); }
      catch { return { status: "session_unavailable", passes }; }
      if (controller.signal.aborted || clock() - start >= maxDurationMs) break;
      let status: string;
      passes++;
      try {
        const result = await options.pass(session, controller.signal);
        status = result.status;
        options.report?.({ passes, status, steps: result.steps });
        if (controller.signal.aborted) break;
        if (status === "authorization_unavailable") return { status, passes };
        errors = 0;
      } catch {
        if (controller.signal.aborted) break;
        status = "pass_unavailable";
        errors++;
        options.report?.({ passes, status });
        if (errors >= 5) return { status, passes };
      }
      if (controller.signal.aborted || passes >= maxPasses) break;
      const remaining = maxDurationMs - (clock() - start);
      if (remaining <= 0) break;
      await (options.wait ?? waitForIngestion)(Math.min(remaining, maxBackoffMs, intervalMs * 2 ** errors), controller.signal);
    }
    return { status: options.signal?.aborted ? "stopped" : "bounded_supervisor_complete", passes };
  } finally {
    clearTimeout(deadline);
    options.signal?.removeEventListener("abort", stop);
  }
}
