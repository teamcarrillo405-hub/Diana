import { randomUUID } from "node:crypto";

const MAX_ERROR_CODE_LENGTH = 64;
const MAX_ERROR_SUMMARY_LENGTH = 240;
const MAX_COUNT = Number.MAX_SAFE_INTEGER;

type LedgerResult = { error?: unknown } | null | undefined;

export type CronLedgerClient = {
  from: (table: string) => {
    insert: (values: Record<string, unknown>) => PromiseLike<LedgerResult>;
    update: (values: Record<string, unknown>) => {
      eq: (column: string, value: unknown) => {
        eq: (column: string, value: unknown) => {
          select: (columns: string) => {
            maybeSingle: () => PromiseLike<LedgerResult & { data?: { run_id?: unknown } | null }>;
          };
        };
      };
    };
  };
};

export type CronRunOutcome = {
  processed?: number;
  succeeded?: number;
  failed?: number;
  retryCount?: number;
  deadLetterCount?: number;
  errorCode?: string | null;
  errorSummary?: string | null;
};

type CronRunStatus = "succeeded" | "partial" | "failed";

type ObserveCronRunOptions = {
  routeName: string;
  jobName: string;
  serviceClient: unknown;
  execute: () => Promise<Response>;
  summarize: (response: Response, body: unknown) => CronRunOutcome;
  now?: () => Date;
  createRunId?: () => string;
};

type SafeCronError = {
  code: string;
  summary: string;
};

export async function runObservedCronJob({
  routeName,
  jobName,
  serviceClient,
  execute,
  summarize,
  now = () => new Date(),
  createRunId = randomUUID,
}: ObserveCronRunOptions): Promise<Response> {
  const runId = createRunId();
  const startedAt = now().toISOString();
  const ledger = asLedgerClient(serviceClient);
  let runStarted = false;

  if (!ledger) {
    reportLedgerFailure("service_client", routeName, jobName, runId);
  } else {
    runStarted = await writeLedgerStart(ledger, {
      run_id: runId,
      correlation_id: runId,
      route_name: routeName,
      job_name: jobName,
      started_at: startedAt,
      status: "running",
    }, routeName, jobName, runId);
  }

  try {
    const response = await execute();
    const body = await readResponseBody(response);
    const outcome = safeSummary(summarize, response, body);
    const counts = normalizeCounts(outcome, response.ok);
    const status = deriveStatus(response.ok, counts.succeeded, counts.failed);
    const safeError = status === "succeeded"
      ? null
      : sanitizeCronError({
        code: outcome.errorCode ?? (status === "partial" ? "job_partial_failure" : `http_${response.status}`),
        summary: outcome.errorSummary ?? (
          status === "partial"
            ? "Scheduled job completed with partial failures."
            : `Scheduled job returned HTTP ${response.status}.`
        ),
      });
    const completion = {
      completed_at: now().toISOString(),
      status,
      processed_count: counts.processed,
      succeeded_count: counts.succeeded,
      failed_count: counts.failed,
      retry_signaled: counts.retryCount > 0,
      retry_count: counts.retryCount,
      dead_letter_signaled: counts.deadLetterCount > 0,
      dead_letter_count: counts.deadLetterCount,
      error_code: safeError?.code ?? null,
      error_summary: safeError?.summary ?? null,
    };

    const completionStored = ledger && runStarted
      ? await writeLedgerCompletion(ledger, runId, completion, routeName, jobName)
      : false;
    if (!completionStored) {
      reportFallbackRun(routeName, jobName, runId, startedAt, completion);
    }

    return response;
  } catch (error) {
    const safeError = sanitizeCronError(error);
    const completion = {
      completed_at: now().toISOString(),
      status: "failed" as const,
      processed_count: 0,
      succeeded_count: 0,
      failed_count: 1,
      retry_signaled: true,
      retry_count: 1,
      dead_letter_signaled: false,
      dead_letter_count: 0,
      error_code: safeError.code,
      error_summary: safeError.summary,
    };
    const completionStored = ledger && runStarted
      ? await writeLedgerCompletion(ledger, runId, completion, routeName, jobName)
      : false;
    if (!completionStored) {
      reportFallbackRun(routeName, jobName, runId, startedAt, completion);
    }
    throw error;
  }
}

export function sanitizeCronError(error: unknown): SafeCronError {
  if (!isSafeCronError(error)) {
    return {
      code: "job_execution_failed",
      summary: "Scheduled job execution failed.",
    };
  }

  const code = normalizeErrorCode(error.code);
  const summary = normalizeErrorSummary(error.summary);
  if (!summary) {
    return { code, summary: "Scheduled job execution failed." };
  }
  return { code, summary };
}

function asLedgerClient(value: unknown): CronLedgerClient | null {
  if (!value || typeof value !== "object") return null;
  return typeof (value as { from?: unknown }).from === "function"
    ? value as CronLedgerClient
    : null;
}

async function writeLedgerStart(
  ledger: CronLedgerClient,
  values: Record<string, unknown>,
  routeName: string,
  jobName: string,
  runId: string,
): Promise<boolean> {
  try {
    const result = await ledger.from("cron_job_runs").insert(values);
    if (result?.error) throw new Error("ledger insert failed");
    return true;
  } catch {
    reportLedgerFailure("start", routeName, jobName, runId);
    return false;
  }
}

async function writeLedgerCompletion(
  ledger: CronLedgerClient,
  runId: string,
  values: Record<string, unknown>,
  routeName: string,
  jobName: string,
): Promise<boolean> {
  try {
    const result = await ledger
      .from("cron_job_runs")
      .update(values)
      .eq("run_id", runId)
      .eq("status", "running")
      .select("run_id")
      .maybeSingle();
    if (result?.error || result?.data?.run_id !== runId) throw new Error("ledger update failed");
    return true;
  } catch {
    reportLedgerFailure("completion", routeName, jobName, runId);
    return false;
  }
}

function reportLedgerFailure(
  phase: "service_client" | "start" | "completion",
  routeName: string,
  jobName: string,
  runId: string,
): void {
  console.error(JSON.stringify({
    event: "cron_run_ledger_unavailable",
    phase,
    routeName,
    jobName,
    runId,
  }));
}

function reportFallbackRun(
  routeName: string,
  jobName: string,
  runId: string,
  startedAt: string,
  completion: Record<string, unknown>,
): void {
  console.error(JSON.stringify({
    event: "cron_run_ledger_fallback",
    run_id: runId,
    correlation_id: runId,
    route_name: routeName,
    job_name: jobName,
    started_at: startedAt,
    ...completion,
  }));
}

async function readResponseBody(response: Response): Promise<unknown> {
  try {
    return await response.clone().json();
  } catch {
    return null;
  }
}

function safeSummary(
  summarize: ObserveCronRunOptions["summarize"],
  response: Response,
  body: unknown,
): CronRunOutcome {
  try {
    return summarize(response, body) ?? {};
  } catch {
    return {};
  }
}

function normalizeCounts(outcome: CronRunOutcome, responseOk: boolean) {
  const processed = normalizeCount(outcome.processed);
  const succeeded = Math.min(processed, normalizeCount(outcome.succeeded));
  let failed = normalizeCount(outcome.failed);
  if (!responseOk && failed === 0) failed = 1;
  return {
    processed,
    succeeded,
    failed,
    retryCount: normalizeCount(outcome.retryCount),
    deadLetterCount: normalizeCount(outcome.deadLetterCount),
  };
}

function normalizeCount(value: unknown): number {
  const count = Number(value);
  if (!Number.isFinite(count) || count <= 0) return 0;
  return Math.min(MAX_COUNT, Math.floor(count));
}

function deriveStatus(responseOk: boolean, succeeded: number, failed: number): CronRunStatus {
  if (responseOk && failed === 0) return "succeeded";
  if (succeeded > 0) return "partial";
  return "failed";
}

function isSafeCronError(value: unknown): value is SafeCronError {
  return Boolean(
    value
    && typeof value === "object"
    && typeof (value as SafeCronError).code === "string"
    && typeof (value as SafeCronError).summary === "string",
  );
}

function normalizeErrorCode(value: string): string {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, MAX_ERROR_CODE_LENGTH);
  return normalized || "job_execution_failed";
}

function normalizeErrorSummary(value: string): string {
  const containsSensitiveShape = /@|bearer\s|https?:\/\/|\b[0-9a-f]{8}-[0-9a-f-]{27,}\b|[{}\[\]\r\n]/i.test(value);
  if (containsSensitiveShape) return "Scheduled job execution failed.";
  return value.replace(/\s+/g, " ").trim().slice(0, MAX_ERROR_SUMMARY_LENGTH);
}
