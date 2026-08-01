export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

import { NextResponse } from "next/server";

import { runObservedCronJob, type CronRunOutcome } from "@/lib/operations/cron-run";
import { hasValidCronBearer } from "@/lib/security/cron-auth";
import { createServiceClient } from "@/lib/supabase/service";

const MAX_JOBS_PER_RUN = 25;
const MAX_ATTEMPTS = 5;

type ReconciliationCandidate = { id: string; attempts: number };

type ReconciliationResult = {
  reconciliation_id: string;
  reconciliation_status: "pending" | "resolved" | "dead_letter" | "not_found";
};

type StaleReservationResult = {
  token_reservations: number;
  media_reservations: number;
};

export async function GET(request: Request) {
  if (!hasValidCronBearer(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Authorization required." }, { status: 401 });
  }

  const supabase = createServiceClient();
  return runObservedCronJob({
    routeName: "/api/cron/ai-budget-reconciliation",
    jobName: "ai-budget-reconciliation",
    serviceClient: supabase,
    execute: () => runAiBudgetReconciliation(supabase),
    summarize: summarizeAiBudgetRun,
  });
}

async function runAiBudgetReconciliation(supabase: ReturnType<typeof createServiceClient>) {
  if (!supabase) {
    return NextResponse.json({ error: "AI budget reconciliation is not configured." }, { status: 503 });
  }

  const nowIso = new Date().toISOString();
  const store = supabase as any;
  const { data, error } = await store
    .from("ai_budget_reconciliation_jobs")
    .select("id, attempts")
    .eq("status", "pending")
    .lte("next_attempt_at", nowIso)
    .order("next_attempt_at", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(MAX_JOBS_PER_RUN + 1);

  if (error) {
    return NextResponse.json({ error: "Reconciliation jobs could not be loaded." }, { status: 503 });
  }

  const rows = (Array.isArray(data) ? data : []) as ReconciliationCandidate[];
  const backlog = rows.length > MAX_JOBS_PER_RUN;
  const selected = rows.slice(0, MAX_JOBS_PER_RUN);
  const staleReservations = await rpcRowWithRetry<StaleReservationResult>(
    store,
    "reconcile_stale_started_ai_budget_reservations",
    { p_now: nowIso, p_limit: MAX_JOBS_PER_RUN },
  );
  if (!staleReservations) {
    return NextResponse.json(
      { error: "Stale AI reservations could not be reconciled." },
      { status: 503 },
    );
  }
  let resolved = 0;
  let pending = 0;
  let deadLetter = 0;
  let failed = 0;

  for (const candidate of selected) {
    const result = await rpcRow<ReconciliationResult>(store, "process_ai_budget_reconciliation", {
      p_job_id: candidate.id,
      p_now: nowIso,
      p_max_attempts: MAX_ATTEMPTS,
    });

    if (!result) {
      const fallbackStatus = await recordTransportFailure(store, candidate, nowIso);
      if (fallbackStatus === "pending") pending += 1;
      else if (fallbackStatus === "dead_letter") deadLetter += 1;
      else failed += 1;
    } else if (result.reconciliation_status === "resolved") {
      resolved += 1;
    } else if (result.reconciliation_status === "pending") {
      pending += 1;
    } else if (result.reconciliation_status === "dead_letter") {
      deadLetter += 1;
    } else {
      failed += 1;
    }
  }

  const ok = failed === 0 && deadLetter === 0;
  return NextResponse.json(
    {
      ok,
      scanned: selected.length,
      resolved,
      pending,
      deadLetter,
      failed,
      backlog,
      staleTokenSettled: Math.max(0, Number(staleReservations.token_reservations) || 0),
      staleMediaSettled: Math.max(0, Number(staleReservations.media_reservations) || 0),
    },
    { status: ok ? 200 : 503 },
  );
}

function summarizeAiBudgetRun(response: Response, body: unknown): CronRunOutcome {
  const result = asRecord(body);
  const failed = Number(result.failed) || 0;
  const deadLetterCount = Number(result.deadLetter) || 0;
  return {
    processed: Number(result.scanned) || 0,
    succeeded: Number(result.resolved) || 0,
    failed: failed + deadLetterCount,
    retryCount: Number(result.pending) || (response.ok ? 0 : Math.max(1, failed)),
    deadLetterCount,
    errorCode: response.ok ? null : "ai_budget_reconciliation_failed",
    errorSummary: response.ok ? null : "AI budget reconciliation did not complete successfully.",
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

async function recordTransportFailure(
  store: any,
  candidate: ReconciliationCandidate,
  nowIso: string,
): Promise<"pending" | "dead_letter" | "changed_or_unavailable"> {
  const priorAttempts = Math.max(0, Math.floor(Number(candidate.attempts) || 0));
  const attempts = priorAttempts + 1;
  const status = attempts >= MAX_ATTEMPTS ? "dead_letter" : "pending";
  const delaySeconds = Math.min(3600, 30 * (2 ** Math.min(attempts - 1, 7)));
  const nextAttemptAt = status === "dead_letter"
    ? nowIso
    : new Date(new Date(nowIso).getTime() + delaySeconds * 1000).toISOString();

  try {
    const { data, error } = await store
      .from("ai_budget_reconciliation_jobs")
      .update({
        status,
        attempts,
        last_error: "reconciliation_rpc_transport_error",
        next_attempt_at: nextAttemptAt,
        updated_at: nowIso,
      })
      .eq("id", candidate.id)
      .eq("status", "pending")
      .eq("attempts", priorAttempts)
      .select("id, status")
      .maybeSingle();
    if (error || data?.id !== candidate.id || data?.status !== status) {
      // The processor may have committed and only lost its response. The
      // compare-and-set intentionally refuses to mutate that changed row.
      return "changed_or_unavailable";
    }
    return status;
  } catch {
    return "changed_or_unavailable";
  }
}

async function rpcRow<T>(
  store: any,
  name: string,
  args: Record<string, unknown>,
): Promise<T | null> {
  try {
    const { data, error } = await store.rpc(name, args);
    if (error) return null;
    if (Array.isArray(data)) return (data[0] as T | undefined) ?? null;
    return data && typeof data === "object" ? data as T : null;
  } catch {
    return null;
  }
}

async function rpcRowWithRetry<T>(
  store: any,
  name: string,
  args: Record<string, unknown>,
): Promise<T | null> {
  return await rpcRow<T>(store, name, args) ?? await rpcRow<T>(store, name, args);
}
