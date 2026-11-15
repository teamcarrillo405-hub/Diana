export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { runObservedCronJob, type CronRunOutcome } from "@/lib/operations/cron-run";
import {
  hasOwnedAssignmentMediaKey,
  isAuthorizedMediaRetentionRequest,
} from "@/lib/media-retention";
import { hasAssignmentStoragePrefix } from "@/lib/security/upload-validation";
import { removeAndConfirmStorageObjectAbsent } from "@/lib/storage/object-absence";
import { createServiceClient } from "@/lib/supabase/service";

const MAX_DELETIONS_PER_RUN = 50;

type MediaDeletionLease = {
  job_id: string;
  media_asset_id: string;
  assignment_id: string;
  owner_id: string;
  storage_key: string;
  upload_id: string | null;
  temporary_storage_key: string | null;
  claim_token: string;
  claim_expires_at: string;
};

export async function GET(request: Request) {
  if (!isAuthorizedMediaRetentionRequest(
    request.headers.get("authorization"),
    process.env.CRON_SECRET,
  )) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const service = createServiceClient();
  return runObservedCronJob({
    routeName: "/api/cron/media-retention",
    jobName: "media-retention",
    serviceClient: service,
    execute: () => runMediaRetention(service),
    summarize: summarizeMediaRetentionRun,
  });
}

async function runMediaRetention(service: ReturnType<typeof createServiceClient>) {
  if (!service) {
    return NextResponse.json(
      { error: "Service client not configured" },
      { status: 500 },
    );
  }

  const store = service as any;
  const nowIso = new Date().toISOString();
  const requestResult = await store.rpc("request_due_assignment_media_retention_deletions", {
    p_limit: MAX_DELETIONS_PER_RUN,
    p_now: nowIso,
  });
  const requested = parseRequestedResult(requestResult.data);
  if (requestResult.error || !requested) {
    return NextResponse.json(
      { error: "Expired recording deletion jobs could not be requested." },
      { status: 503 },
    );
  }

  const claimToken = randomUUID();
  const claimResult = await store.rpc("claim_due_assignment_media_deletions", {
    p_claim_token: claimToken,
    p_limit: MAX_DELETIONS_PER_RUN,
    p_now: nowIso,
  });
  if (claimResult.error || !Array.isArray(claimResult.data)) {
    return NextResponse.json(
      { error: "Recording deletion jobs could not be claimed." },
      { status: 503 },
    );
  }
  if (claimResult.data.length > MAX_DELETIONS_PER_RUN) {
    return NextResponse.json(
      { error: "Recording deletion jobs exceeded the run budget." },
      { status: 503 },
    );
  }

  const bucket = service.storage.from("assignment-media") as any;
  let purged = 0;
  let retried = 0;
  let deadLettered = 0;
  let stale = 0;
  let failed = 0;
  let objectsRemoved = 0;

  for (const value of claimResult.data as unknown[]) {
    if (!isMediaDeletionLease(value) || value.claim_token !== claimToken) {
      failed += 1;
      continue;
    }

    const validPath = hasOwnedAssignmentMediaKey({
      id: value.media_asset_id,
      owner_id: value.owner_id,
      assignment_id: value.assignment_id,
      storage_key: value.storage_key,
    });
    const failures: string[] = [];
    let uploadCleanupReady = value.upload_id === null;
    let temporaryRemoval = { removed: false, absenceConfirmed: value.upload_id === null };

    if (value.upload_id !== null && value.temporary_storage_key !== null) {
      const validTemporaryPath = value.temporary_storage_key !== value.storage_key
        && hasAssignmentStoragePrefix(
          value.owner_id,
          value.assignment_id,
          value.temporary_storage_key,
        );
      if (!validTemporaryPath) {
        failures.push("temporary_path_mismatch");
      } else {
        const cleanupPlan = await store.rpc("discard_assignment_media_upload", {
          p_upload_id: value.upload_id,
          p_assignment_id: value.assignment_id,
          p_owner_id: value.owner_id,
          p_claim_token: null,
        });
        if (
          cleanupPlan.error
          || cleanupPlan.data?.state !== "finalized"
          || cleanupPlan.data?.temporary_storage_key !== value.temporary_storage_key
        ) {
          failures.push("upload_cleanup_plan_mismatch");
        } else {
          temporaryRemoval = await removeAndConfirmStorageObjectAbsent(
            bucket,
            value.temporary_storage_key,
          );
          if (temporaryRemoval.removed) objectsRemoved += 1;
          const temporaryFailure = temporaryRemoval.absenceConfirmed
            ? null
            : "temporary_absence_unconfirmed";
          const uploadCompletion = await store.rpc("complete_assignment_media_upload_cleanup", {
            p_upload_id: value.upload_id,
            p_assignment_id: value.assignment_id,
            p_owner_id: value.owner_id,
            p_claim_token: null,
            p_temporary_removed: temporaryRemoval.removed,
            p_durable_removed: false,
            p_temporary_absence_confirmed: temporaryRemoval.absenceConfirmed,
            p_durable_absence_confirmed: false,
            p_failure_code: temporaryFailure,
            p_now: nowIso,
          });
          uploadCleanupReady = !uploadCompletion.error
            && uploadCompletion.data?.state === "completed";
          if (!uploadCleanupReady) {
            failures.push(
              uploadCompletion.error
                ? "upload_cleanup_completion_failed"
                : `upload_cleanup_${String(uploadCompletion.data?.state ?? "invalid")}`,
            );
          }
        }
      }
    }

    const removal = validPath
      ? await removeAndConfirmStorageObjectAbsent(bucket, value.storage_key)
      : { removed: false, absenceConfirmed: false };
    if (removal.removed) objectsRemoved += 1;
    if (!validPath) failures.push("storage_path_mismatch");
    else if (!removal.absenceConfirmed) failures.push("storage_absence_unconfirmed");

    const deletionReady = removal.absenceConfirmed && uploadCleanupReady;

    const completionResult = await store.rpc("complete_assignment_media_deletion", {
      p_job_id: value.job_id,
      p_media_asset_id: value.media_asset_id,
      p_assignment_id: value.assignment_id,
      p_owner_id: value.owner_id,
      p_storage_key: value.storage_key,
      p_claim_token: value.claim_token,
      p_storage_removed: removal.removed,
      p_storage_absence_confirmed: deletionReady,
      p_failure_code: deletionReady ? null : failures.join(",") || "media_deletion_not_ready",
      p_now: nowIso,
    });
    const completionState = completionResult.data?.state;
    if (completionResult.error || !isCompletionState(completionState)) {
      failed += 1;
    } else if (completionState === "completed" || completionState === "absent") {
      purged += 1;
    } else if (completionState === "retry") {
      retried += 1;
      failed += 1;
    } else if (completionState === "dead_lettered") {
      deadLettered += 1;
      failed += 1;
    } else {
      stale += 1;
      failed += 1;
    }
  }

  const monitoringResult = await store.rpc("get_assignment_media_deletion_monitoring", {
    p_now: nowIso,
  });
  const monitoring = parseDeletionMonitoring(monitoringResult.data);
  if (monitoringResult.error || !monitoring) failed += 1;
  const healthy = failed === 0 && monitoring?.deadLetterCount === 0;

  return NextResponse.json(
    {
      ok: healthy,
      requested: requested.requestedCount,
      processed: claimResult.data.length,
      purged,
      retried,
      deadLettered,
      stale,
      failed,
      objectsRemoved,
      backlog: requested.backlog || claimResult.data.length === MAX_DELETIONS_PER_RUN,
      monitoring,
    },
    { status: healthy ? 200 : 503 },
  );
}

function summarizeMediaRetentionRun(response: Response, body: unknown): CronRunOutcome {
  const result = asRecord(body);
  const monitoring = asRecord(result.monitoring);
  const failed = Number(result.failed) || 0;
  const deadLetterCount = Math.max(
    Number(result.deadLettered) || 0,
    Number(monitoring.deadLetterCount) || 0,
  );
  return {
    processed: Number(result.processed) || 0,
    succeeded: Number(result.purged) || 0,
    failed,
    retryCount: Number(result.retried) || (response.ok ? 0 : Math.max(1, failed)),
    deadLetterCount,
    errorCode: response.ok ? null : "media_retention_failed",
    errorSummary: response.ok ? null : "Media retention cleanup did not complete successfully.",
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function parseRequestedResult(value: unknown): { requestedCount: number; backlog: boolean } | null {
  if (!value || typeof value !== "object") return null;
  const result = value as Record<string, unknown>;
  const requestedCount = Number(result.requested_count);
  if (
    !Number.isSafeInteger(requestedCount)
    || requestedCount < 0
    || requestedCount > MAX_DELETIONS_PER_RUN
    || typeof result.backlog !== "boolean"
  ) return null;
  return { requestedCount, backlog: result.backlog };
}

function parseDeletionMonitoring(value: unknown): {
  deadLetterCount: number;
  oldestDeadLetterAgeSeconds: number | null;
  retryCount: number;
  dueCount: number;
  processingCount: number;
} | null {
  if (!value || typeof value !== "object") return null;
  const result = value as Record<string, unknown>;
  const deadLetterCount = Number(result.dead_letter_count);
  const retryCount = Number(result.retry_count);
  const dueCount = Number(result.due_count);
  const processingCount = Number(result.processing_count);
  const oldest = result.oldest_dead_letter_age_seconds;
  if (
    ![deadLetterCount, retryCount, dueCount, processingCount].every(
      (count) => Number.isSafeInteger(count) && count >= 0,
    )
    || (oldest !== null && (!Number.isSafeInteger(Number(oldest)) || Number(oldest) < 0))
  ) return null;
  return {
    deadLetterCount,
    oldestDeadLetterAgeSeconds: oldest === null ? null : Number(oldest),
    retryCount,
    dueCount,
    processingCount,
  };
}

function isMediaDeletionLease(value: unknown): value is MediaDeletionLease {
  if (!value || typeof value !== "object") return false;
  const lease = value as Record<string, unknown>;
  return typeof lease.job_id === "string"
    && typeof lease.media_asset_id === "string"
    && typeof lease.assignment_id === "string"
    && typeof lease.owner_id === "string"
    && typeof lease.storage_key === "string"
    && (
      (lease.upload_id === null && lease.temporary_storage_key === null)
      || (typeof lease.upload_id === "string" && typeof lease.temporary_storage_key === "string")
    )
    && typeof lease.claim_token === "string"
    && typeof lease.claim_expires_at === "string";
}

function isCompletionState(value: unknown): boolean {
  return ["completed", "retry", "dead_lettered", "stale", "absent"].includes(String(value));
}
