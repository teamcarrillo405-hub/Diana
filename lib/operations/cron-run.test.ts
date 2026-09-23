import { describe, expect, it, vi } from "vitest";

import { runObservedCronJob, sanitizeCronError } from "./cron-run";

const RUN_ID = "11111111-1111-4111-8111-111111111111";

describe("cron run observability", () => {
  it("records deterministic start and successful completion counts", async () => {
    const ledger = createLedger();
    const now = sequenceClock(
      "2026-07-31T10:00:00.000Z",
      "2026-07-31T10:00:02.000Z",
    );

    const response = await runObservedCronJob({
      routeName: "/api/cron/example",
      jobName: "example",
      serviceClient: ledger.client,
      createRunId: () => RUN_ID,
      now,
      execute: async () => Response.json({ ok: true, processed: 3 }),
      summarize: () => ({ processed: 3, succeeded: 3, failed: 0 }),
    });

    expect(response.status).toBe(200);
    expect(ledger.insert).toHaveBeenCalledWith({
      run_id: RUN_ID,
      correlation_id: RUN_ID,
      route_name: "/api/cron/example",
      job_name: "example",
      started_at: "2026-07-31T10:00:00.000Z",
      status: "running",
    });
    expect(ledger.update).toHaveBeenCalledWith(expect.objectContaining({
      completed_at: "2026-07-31T10:00:02.000Z",
      status: "succeeded",
      processed_count: 3,
      succeeded_count: 3,
      failed_count: 0,
      retry_signaled: false,
      dead_letter_signaled: false,
      error_code: null,
      error_summary: null,
    }));
    expect(ledger.firstEq).toHaveBeenCalledWith("run_id", RUN_ID);
    expect(ledger.secondEq).toHaveBeenCalledWith("status", "running");
    expect(ledger.select).toHaveBeenCalledWith("run_id");
  });

  it("records partial failure, retry, and dead-letter signals without student payload", async () => {
    const ledger = createLedger();

    const response = await runObservedCronJob({
      routeName: "/api/cron/example",
      jobName: "example",
      serviceClient: ledger.client,
      createRunId: () => RUN_ID,
      now: sequenceClock("2026-07-31T10:00:00.000Z", "2026-07-31T10:00:03.000Z"),
      execute: async () => Response.json({ ok: false }, { status: 503 }),
      summarize: () => ({
        processed: 3,
        succeeded: 1,
        failed: 2,
        retryCount: 2,
        deadLetterCount: 1,
        errorCode: "Delivery Failed",
        errorSummary: "student@example.com Bearer private-token",
      }),
    });

    expect(response.status).toBe(503);
    const completion = ledger.update.mock.calls[0][0];
    expect(completion).toMatchObject({
      status: "partial",
      processed_count: 3,
      succeeded_count: 1,
      failed_count: 2,
      retry_signaled: true,
      retry_count: 2,
      dead_letter_signaled: true,
      dead_letter_count: 1,
      error_code: "delivery_failed",
      error_summary: "Scheduled job execution failed.",
    });
    expect(JSON.stringify(completion)).not.toContain("student@example.com");
    expect(JSON.stringify(completion)).not.toContain("private-token");
  });

  it("does not expose arbitrary thrown error messages", () => {
    const error = sanitizeCronError(new Error("Alex payload: private assignment text"));

    expect(error).toEqual({
      code: "job_execution_failed",
      summary: "Scheduled job execution failed.",
    });
  });

  it("keeps successful work successful when completion storage fails", async () => {
    const ledger = createLedger({ completionError: { message: "database unavailable" } });
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await runObservedCronJob({
      routeName: "/api/cron/example",
      jobName: "example",
      serviceClient: ledger.client,
      createRunId: () => RUN_ID,
      execute: async () => Response.json({ ok: true, value: "preserved" }),
      summarize: () => ({ processed: 1, succeeded: 1 }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, value: "preserved" });
    expect(consoleError).toHaveBeenCalledWith(expect.stringContaining("cron_run_ledger_unavailable"));
    consoleError.mockRestore();
  });

  it("keeps successful work successful when start storage fails", async () => {
    const ledger = createLedger({ startError: { message: "database unavailable" } });
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await runObservedCronJob({
      routeName: "/api/cron/example",
      jobName: "example",
      serviceClient: ledger.client,
      createRunId: () => RUN_ID,
      execute: async () => Response.json({ ok: true, value: "preserved" }),
      summarize: () => ({ processed: 1, succeeded: 1 }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, value: "preserved" });
    expect(ledger.update).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('"phase":"start"'));
    expect(consoleError).toHaveBeenCalledWith(expect.stringContaining("cron_run_ledger_fallback"));
    consoleError.mockRestore();
  });

  it("reports a missing service client and still executes the job", async () => {
    const execute = vi.fn(async () => Response.json({ ok: true }));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await runObservedCronJob({
      routeName: "/api/cron/example",
      jobName: "example",
      serviceClient: null,
      createRunId: () => RUN_ID,
      execute,
      summarize: () => ({ processed: 0, succeeded: 0, failed: 0 }),
    });

    expect(response.status).toBe(200);
    expect(execute).toHaveBeenCalledOnce();
    expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('"phase":"service_client"'));
    consoleError.mockRestore();
  });

  it("finalizes a thrown execution as failed and rethrows it", async () => {
    const ledger = createLedger();
    const studentError = new Error("student@example.com private payload");

    await expect(runObservedCronJob({
      routeName: "/api/cron/example",
      jobName: "example",
      serviceClient: ledger.client,
      createRunId: () => RUN_ID,
      execute: async () => { throw studentError; },
      summarize: () => ({}),
    })).rejects.toBe(studentError);

    expect(ledger.update).toHaveBeenCalledWith(expect.objectContaining({
      status: "failed",
      failed_count: 1,
      retry_signaled: true,
      error_code: "job_execution_failed",
      error_summary: "Scheduled job execution failed.",
    }));
    expect(JSON.stringify(ledger.update.mock.calls[0][0])).not.toContain("student@example.com");
  });
});

function createLedger(options: { startError?: unknown; completionError?: unknown } = {}) {
  const insert = vi.fn((_values: Record<string, unknown>) => Promise.resolve({
    data: null,
    error: options.startError ?? null,
  }));
  const maybeSingle = vi.fn(() => Promise.resolve({
    data: options.completionError ? null : { run_id: RUN_ID },
    error: options.completionError ?? null,
  }));
  const select = vi.fn((_columns: string) => ({ maybeSingle }));
  const secondEq = vi.fn((_column: string, _value: unknown) => ({ select }));
  const firstEq = vi.fn((_column: string, _value: unknown) => ({ eq: secondEq }));
  const update = vi.fn((_values: Record<string, unknown>) => ({ eq: firstEq }));
  return {
    client: { from: vi.fn(() => ({ insert, update })) },
    insert,
    update,
    firstEq,
    secondEq,
    select,
    maybeSingle,
  };
}

function sequenceClock(...values: string[]) {
  let index = 0;
  return () => new Date(values[Math.min(index++, values.length - 1)]);
}
