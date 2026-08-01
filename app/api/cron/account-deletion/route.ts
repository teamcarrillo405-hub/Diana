export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

import { NextResponse } from "next/server";

import { runObservedCronJob, type CronRunOutcome } from "@/lib/operations/cron-run";
import {
  ACCOUNT_DELETION_BUCKETS,
  purgeOwnerStorage,
} from "@/lib/security/account-deletion-storage";
import { hasValidCronBearer } from "@/lib/security/cron-auth";
import { createServiceClient } from "@/lib/supabase/service";

const MAX_REQUESTS_PER_RUN = 25;
const DELETION_DELAY_DAYS = 30;
const ACTIVE_STATUSES = ["requested", "processing"];

type DeletionCandidate = { id: string };

type ClaimedDeletion = {
  request_id: string;
  owner_id: string;
  purge_phase: string;
  manifest_version: number;
  storage_buckets: string[];
  storage_objects_deleted: number | null;
  claim_token: string;
};

export async function GET(request: Request) {
  if (!hasValidCronBearer(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Authorization required." }, { status: 401 });
  }

  const supabase = createServiceClient();
  return runObservedCronJob({
    routeName: "/api/cron/account-deletion",
    jobName: "account-deletion",
    serviceClient: supabase,
    execute: () => runAccountDeletion(supabase),
    summarize: summarizeAccountDeletionRun,
  });
}

async function runAccountDeletion(supabase: ReturnType<typeof createServiceClient>) {
  if (!supabase) {
    return NextResponse.json({ error: "Account deletion service is not configured." }, { status: 503 });
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const cutoff = new Date(now.getTime() - DELETION_DELAY_DAYS * 24 * 60 * 60 * 1_000).toISOString();
  const store = supabase as any;
  const { data, error } = await store
    .from("data_deletion_requests")
    .select("id")
    .not("owner_id", "is", null)
    .in("status", ACTIVE_STATUSES)
    .lte("requested_at", cutoff)
    .order("requested_at", { ascending: true })
    .limit(MAX_REQUESTS_PER_RUN + 1);
  if (error) {
    return NextResponse.json({ error: "Deletion requests could not be loaded." }, { status: 503 });
  }

  const rows = (Array.isArray(data) ? data : []) as DeletionCandidate[];
  const backlog = rows.length > MAX_REQUESTS_PER_RUN;
  const selected = rows.slice(0, MAX_REQUESTS_PER_RUN);
  let storageVerified = 0;
  let storageObjectsDeleted = 0;
  let completed = 0;
  let failed = 0;

  for (const candidate of selected) {
    const claim = await rpcRow<ClaimedDeletion>(store, "claim_account_deletion_request", {
      p_request_id: candidate.id,
      p_now: nowIso,
    });
    if (!claim) {
      failed += 1;
      continue;
    }

    const isDatabaseRetry = claim.purge_phase === "storage_verified"
      || claim.purge_phase === "db_purge_failed";

    if (!isDatabaseRetry) {
      if (claim.purge_phase !== "claimed" || !matchesStorageManifest(claim.storage_buckets)) {
        await recordStorageFailure(
          store,
          claim,
          claim.purge_phase === "claimed" ? "storage_manifest_mismatch" : "invalid_claim_phase",
          0,
          nowIso,
        );
        failed += 1;
        continue;
      }

      const preflight = await rpcBoolean(store, "preflight_account_deletion_request", {
        p_request_id: claim.request_id,
        p_claim_token: claim.claim_token,
        p_now: nowIso,
      });
      if (!preflight) {
        failed += 1;
        continue;
      }

      const storageResult = await purgeOwnerStorage(supabase.storage, claim.owner_id);
      storageObjectsDeleted += storageResult.deleted;
      if (!storageResult.ok) {
        await recordStorageFailure(
          store,
          claim,
          `storage_${storageResult.reason}`,
          storageResult.deleted,
          nowIso,
        );
        failed += 1;
        continue;
      }

      const verified = await rpcBoolean(store, "verify_account_deletion_storage", {
        p_request_id: claim.request_id,
        p_claim_token: claim.claim_token,
        p_storage_objects_deleted: storageResult.deleted,
        p_now: nowIso,
      });
      if (!verified) {
        failed += 1;
        continue;
      }
      storageVerified += 1;
    }

    const purged = await rpcBoolean(store, "purge_account_deletion_request", {
      p_request_id: claim.request_id,
      p_claim_token: claim.claim_token,
      p_now: nowIso,
    });
    if (purged) completed += 1;
    else failed += 1;
  }

  return NextResponse.json(
    {
      ok: failed === 0,
      scanned: selected.length,
      storageVerified,
      storageObjectsDeleted,
      completed,
      failed,
      backlog,
    },
    { status: failed === 0 ? 200 : 503 },
  );
}

function summarizeAccountDeletionRun(response: Response, body: unknown): CronRunOutcome {
  const result = asRecord(body);
  const failed = Number(result.failed) || 0;
  return {
    processed: Number(result.scanned) || 0,
    succeeded: Number(result.completed) || 0,
    failed,
    retryCount: response.ok ? 0 : Math.max(1, failed),
    errorCode: response.ok ? null : "account_deletion_failed",
    errorSummary: response.ok ? null : "Account deletion processing did not complete successfully.",
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

async function rpcRow<T>(store: any, name: string, args: Record<string, unknown>): Promise<T | null> {
  const { data, error } = await store.rpc(name, args);
  if (error) return null;
  if (Array.isArray(data)) return (data[0] as T | undefined) ?? null;
  return data && typeof data === "object" ? data as T : null;
}

async function rpcBoolean(store: any, name: string, args: Record<string, unknown>): Promise<boolean> {
  const { data, error } = await store.rpc(name, args);
  return !error && data === true;
}

async function recordStorageFailure(
  store: any,
  claim: ClaimedDeletion,
  failureCode: string,
  deleted: number,
  nowIso: string,
): Promise<void> {
  await store.rpc("fail_account_deletion_storage_phase", {
    p_request_id: claim.request_id,
    p_claim_token: claim.claim_token,
    p_failure_code: failureCode,
    p_storage_objects_deleted: deleted,
    p_now: nowIso,
  });
}

function matchesStorageManifest(buckets: unknown): buckets is string[] {
  if (!Array.isArray(buckets) || buckets.some((bucket) => typeof bucket !== "string")) return false;
  const expected = [...ACCOUNT_DELETION_BUCKETS].sort();
  const actual = [...buckets].sort();
  return expected.length === actual.length
    && expected.every((bucket, index) => bucket === actual[index]);
}
