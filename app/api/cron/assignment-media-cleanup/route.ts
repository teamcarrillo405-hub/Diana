export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { runObservedCronJob, type CronRunOutcome } from "@/lib/operations/cron-run";
import { hasValidCronBearer } from "@/lib/security/cron-auth";
import { hasAssignmentStoragePrefix } from "@/lib/security/upload-validation";
import { removeAndConfirmStorageObjectAbsent } from "@/lib/storage/object-absence";
import { createServiceClient } from "@/lib/supabase/service";

const MAX_ROWS_PER_RUN = 50;
const MAX_CLEANUP_ATTEMPTS = 12;

type CleanupCandidate = {
  id: string;
  assignment_id: string;
  owner_id: string;
  storage_key: string;
};

type CandidateCleanupLease = {
  upload_id: string;
  assignment_id: string;
  owner_id: string;
  claim_token: string;
  claim_epoch: number;
  storage_key: string;
  cleanup_token: string;
  cleanup_expires_at: string;
};

type CleanupPlan = {
  state: "absent" | "busy" | "stale" | "cleanup" | "finalized";
  temporary_storage_key?: string;
  durable_storage_key?: string;
};

export async function GET(request: Request) {
  if (!hasValidCronBearer(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Authorization required." }, { status: 401 });
  }

  const service = createServiceClient();
  return runObservedCronJob({
    routeName: "/api/cron/assignment-media-cleanup",
    jobName: "assignment-media-cleanup",
    serviceClient: service,
    execute: () => runAssignmentMediaCleanup(service),
    summarize: summarizeAssignmentMediaCleanupRun,
  });
}

async function runAssignmentMediaCleanup(service: ReturnType<typeof createServiceClient>) {
  if (!service) {
    return NextResponse.json({ error: "Assignment media cleanup is not configured." }, { status: 503 });
  }

  const nowIso = new Date().toISOString();
  const store = service as any;
  const cleanupToken = randomUUID();
  const candidateClaim = await store.rpc("claim_due_assignment_media_candidate_cleanups", {
    p_cleanup_token: cleanupToken,
    p_limit: MAX_ROWS_PER_RUN,
    p_now: nowIso,
  });
  if (candidateClaim.error || !Array.isArray(candidateClaim.data)) {
    return NextResponse.json(
      { error: "Assignment media candidate cleanup rows could not be claimed." },
      { status: 503 },
    );
  }

  const candidateLeases = candidateClaim.data as unknown[];
  if (candidateLeases.length > MAX_ROWS_PER_RUN) {
    return NextResponse.json(
      { error: "Assignment media candidate cleanup exceeded its global row budget." },
      { status: 503 },
    );
  }
  let candidateDeleted = 0;
  let candidateRetried = 0;
  let candidateQuiescing = 0;
  let candidateDeadLettered = 0;
  let candidateProtected = 0;
  let candidateFailed = 0;
  let objectsRemoved = 0;
  const bucket = service.storage.from("assignment-media");

  for (const value of candidateLeases) {
    if (!isCandidateCleanupLease(value) || value.cleanup_token !== cleanupToken) {
      candidateFailed += 1;
      continue;
    }

    const validPath =
      hasAssignmentStoragePrefix(value.owner_id, value.assignment_id, value.storage_key)
      && value.storage_key.includes(`/${value.assignment_id}/durable-e${value.claim_epoch}-`);
    const removal = validPath
      ? await removeAndConfirmStorageObjectAbsent(bucket, value.storage_key)
      : { removed: false, absenceConfirmed: false };
    const failureCode = validPath
      ? (removal.absenceConfirmed ? null : "candidate_absence_unconfirmed")
      : "candidate_path_mismatch";
    if (removal.removed) objectsRemoved += 1;

    const completion = await store.rpc("complete_claimed_assignment_media_candidate_cleanup", {
      p_upload_id: value.upload_id,
      p_assignment_id: value.assignment_id,
      p_owner_id: value.owner_id,
      p_claim_token: value.claim_token,
      p_claim_epoch: value.claim_epoch,
      p_candidate_storage_key: value.storage_key,
      p_cleanup_token: value.cleanup_token,
      p_removed: removal.removed,
      p_absence_confirmed: removal.absenceConfirmed,
      p_failure_code: failureCode,
      p_now: nowIso,
    });
    const state = completion.data?.state;
    if (completion.error || !isCandidateCompletionState(state)) {
      candidateFailed += 1;
    } else if (state === "closed" || state === "absent") {
      candidateDeleted += 1;
    } else if (state === "quiescing") {
      candidateQuiescing += 1;
    } else if (state === "retry") {
      candidateRetried += 1;
      candidateFailed += 1;
    } else if (state === "dead_lettered") {
      candidateDeadLettered += 1;
      candidateFailed += 1;
    } else {
      candidateProtected += 1;
      candidateFailed += 1;
    }
  }

  const tombstoneBudget = MAX_ROWS_PER_RUN - candidateLeases.length;
  let rows: CleanupCandidate[] = [];
  let backlog = candidateLeases.length === MAX_ROWS_PER_RUN;
  if (tombstoneBudget > 0) {
    const { data, error } = await store
      .from("assignment_media_uploads")
      .select("id, assignment_id, owner_id, storage_key")
      .in("cleanup_state", ["pending", "retry"])
      .lt("cleanup_attempts", MAX_CLEANUP_ATTEMPTS)
      .lte("cleanup_next_attempt_at", nowIso)
      .or(`finalized_at.not.is.null,discarded_at.not.is.null,expires_at.lte.${nowIso},claim_expires_at.lte.${nowIso}`)
      .order("cleanup_next_attempt_at", { ascending: true })
      .limit(tombstoneBudget);
    if (error) {
      return NextResponse.json({ error: "Assignment media cleanup rows could not be loaded." }, { status: 503 });
    }

    rows = (Array.isArray(data) ? data : []) as CleanupCandidate[];
    backlog = backlog || rows.length === tombstoneBudget;
  }

  const selected = rows.slice(0, tombstoneBudget);
  let deleted = 0;
  let retained = 0;
  let busy = 0;
  let deadLettered = 0;
  let failed = candidateFailed;

  for (const candidate of selected) {
    const requestResult = await store.rpc("discard_assignment_media_upload", {
      p_upload_id: candidate.id,
      p_assignment_id: candidate.assignment_id,
      p_owner_id: candidate.owner_id,
      p_claim_token: null,
    });
    if (requestResult.error || !isCleanupPlan(requestResult.data)) {
      failed += 1;
      continue;
    }

    const plan = requestResult.data;
    if (plan.state === "busy") {
      busy += 1;
      continue;
    }
    if (plan.state === "absent") {
      deleted += 1;
      continue;
    }
    if (plan.state === "stale") {
      failed += 1;
      continue;
    }

    const failures: string[] = [];
    let temporaryRemoval = { removed: false, absenceConfirmed: false };
    let durableRemoval = { removed: false, absenceConfirmed: false };
    const temporaryKey = plan.temporary_storage_key;
    if (
      temporaryKey !== candidate.storage_key
      || !hasAssignmentStoragePrefix(candidate.owner_id, candidate.assignment_id, temporaryKey)
    ) {
      failures.push("temporary_path_mismatch");
    } else {
      temporaryRemoval = await removeAndConfirmStorageObjectAbsent(bucket, temporaryKey);
      if (temporaryRemoval.removed) objectsRemoved += 1;
      if (!temporaryRemoval.absenceConfirmed) failures.push("temporary_absence_unconfirmed");
    }

    const durableKey = plan.state === "cleanup" ? plan.durable_storage_key : undefined;
    if (durableKey) {
      if (
        durableKey === temporaryKey
        || !hasAssignmentStoragePrefix(candidate.owner_id, candidate.assignment_id, durableKey)
        || !durableKey.includes(`/${candidate.assignment_id}/durable-`)
      ) {
        failures.push("durable_path_mismatch");
      } else {
        durableRemoval = await removeAndConfirmStorageObjectAbsent(bucket, durableKey);
        if (durableRemoval.removed) objectsRemoved += 1;
        if (!durableRemoval.absenceConfirmed) failures.push("durable_absence_unconfirmed");
      }
    }

    const completion = await store.rpc("complete_assignment_media_upload_cleanup", {
      p_upload_id: candidate.id,
      p_assignment_id: candidate.assignment_id,
      p_owner_id: candidate.owner_id,
      p_claim_token: null,
      p_temporary_removed: temporaryRemoval.removed,
      p_durable_removed: durableRemoval.removed,
      p_temporary_absence_confirmed: temporaryRemoval.absenceConfirmed,
      p_durable_absence_confirmed: durableRemoval.absenceConfirmed,
      p_failure_code: failures.length > 0 ? failures.join(",") : null,
      p_now: nowIso,
    });
    const completionState = completion.data?.state;
    if (
      completion.error
      || !["deleted", "completed", "retained", "busy", "stale", "dead_lettered"].includes(completionState)
    ) {
      failed += 1;
      continue;
    }
    if (completionState === "busy") {
      busy += 1;
      continue;
    }
    if (completionState === "stale" || failures.length > 0) {
      if (completionState === "dead_lettered") deadLettered += 1;
      failed += 1;
      continue;
    }
    if (completionState === "dead_lettered") {
      deadLettered += 1;
      failed += 1;
      continue;
    }
    if (completionState === "deleted") deleted += 1;
    else retained += 1;
  }

  const monitoringResult = await store.rpc("get_assignment_media_upload_cleanup_monitoring", {
    p_now: nowIso,
  });
  const monitoring = parseCleanupMonitoring(monitoringResult.data);
  if (monitoringResult.error || !monitoring) failed += 1;
  const deadLetterCount = monitoring?.deadLetterCount ?? null;
  const candidateDeadLetterCount = monitoring?.candidateDeadLetterCount ?? null;
  const healthy = failed === 0
    && deadLetterCount === 0
    && candidateDeadLetterCount === 0;

  return NextResponse.json(
    {
      ok: healthy,
      processedRows: candidateLeases.length + selected.length,
      scanned: selected.length,
      deleted,
      retained,
      busy,
      deadLettered,
      deadLetterCount,
      candidateDeadLetterCount,
      candidateOldestDeadLetterAgeSeconds: monitoring?.candidateOldestDeadLetterAgeSeconds ?? null,
      failed,
      objectsRemoved,
      candidateScanned: candidateLeases.length,
      candidateDeleted,
      candidateQuiescing,
      candidateRetried,
      candidateDeadLettered,
      candidateProtected,
      candidateFailed,
      monitoring,
      backlog,
    },
    { status: healthy ? 200 : 503 },
  );
}

function summarizeAssignmentMediaCleanupRun(response: Response, body: unknown): CronRunOutcome {
  const result = asRecord(body);
  const monitoring = asRecord(result.monitoring);
  const failed = Number(result.failed) || 0;
  const deadLetterCount = Math.max(
    Number(result.deadLettered) || 0,
    Number(result.deadLetterCount) || 0,
    Number(result.candidateDeadLettered) || 0,
    Number(result.candidateDeadLetterCount) || 0,
  );
  return {
    processed: Number(result.processedRows) || 0,
    succeeded: (Number(result.deleted) || 0)
      + (Number(result.retained) || 0)
      + (Number(result.candidateDeleted) || 0),
    failed,
    retryCount: Math.max(
      Number(result.candidateRetried) || 0,
      Number(monitoring.retryCount) || 0,
      response.ok ? 0 : Math.max(1, failed),
    ),
    deadLetterCount,
    errorCode: response.ok ? null : "assignment_media_cleanup_failed",
    errorSummary: response.ok ? null : "Assignment media cleanup did not complete successfully.",
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function parseCleanupMonitoring(value: unknown): {
  deadLetterCount: number;
  oldestDeadLetterAgeSeconds: number | null;
  retryCount: number;
  dueCount: number;
  candidateDeadLetterCount: number;
  candidateOldestDeadLetterAgeSeconds: number | null;
} | null {
  if (!value || typeof value !== "object") return null;
  const monitoring = value as Record<string, unknown>;
  const deadLetterCount = Number(monitoring.dead_letter_count);
  const retryCount = Number(monitoring.retry_count);
  const dueCount = Number(monitoring.due_count);
  const candidateDeadLetterCount = Number(monitoring.candidate_dead_letter_count);
  const oldestDeadLetterAge = monitoring.oldest_dead_letter_age_seconds;
  const candidateOldestDeadLetterAge = monitoring.candidate_oldest_dead_letter_age_seconds;
  if (
    !Number.isSafeInteger(deadLetterCount) || deadLetterCount < 0
    || !Number.isSafeInteger(retryCount) || retryCount < 0
    || !Number.isSafeInteger(dueCount) || dueCount < 0
    || !Number.isSafeInteger(candidateDeadLetterCount) || candidateDeadLetterCount < 0
    || !isNullableNonnegativeInteger(oldestDeadLetterAge)
    || !isNullableNonnegativeInteger(candidateOldestDeadLetterAge)
  ) return null;
  return {
    deadLetterCount,
    oldestDeadLetterAgeSeconds: oldestDeadLetterAge === null ? null : Number(oldestDeadLetterAge),
    retryCount,
    dueCount,
    candidateDeadLetterCount,
    candidateOldestDeadLetterAgeSeconds: candidateOldestDeadLetterAge === null
      ? null
      : Number(candidateOldestDeadLetterAge),
  };
}

function isNullableNonnegativeInteger(value: unknown): boolean {
  return value === null || (Number.isSafeInteger(Number(value)) && Number(value) >= 0);
}

function isCandidateCleanupLease(value: unknown): value is CandidateCleanupLease {
  if (!value || typeof value !== "object") return false;
  const lease = value as Record<string, unknown>;
  return typeof lease.upload_id === "string"
    && typeof lease.assignment_id === "string"
    && typeof lease.owner_id === "string"
    && typeof lease.claim_token === "string"
    && Number.isSafeInteger(lease.claim_epoch)
    && Number(lease.claim_epoch) > 0
    && typeof lease.storage_key === "string"
    && typeof lease.cleanup_token === "string"
    && typeof lease.cleanup_expires_at === "string";
}

function isCandidateCompletionState(value: unknown): value is string {
  return ["closed", "quiescing", "absent", "retry", "dead_lettered", "protected", "stale"].includes(String(value));
}

function isCleanupPlan(value: unknown): value is CleanupPlan {
  if (!value || typeof value !== "object") return false;
  const plan = value as Record<string, unknown>;
  if (!["absent", "busy", "stale", "cleanup", "finalized"].includes(String(plan.state))) return false;
  if (plan.state === "cleanup" || plan.state === "finalized") {
    return typeof plan.temporary_storage_key === "string";
  }
  return true;
}
