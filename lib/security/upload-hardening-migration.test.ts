import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260731135000_upload_hardening.sql"),
  "utf8",
);
const workspacePage = readFileSync(
  join(process.cwd(), "app/(app)/assignments/[id]/workspace/page.tsx"),
  "utf8",
);

describe("upload hardening migration", () => {
  it("stages assignment media before a media asset can be created", () => {
    expect(migration).toContain("create table if not exists public.assignment_media_uploads");
    expect(migration).toContain("declared_mime_type");
    expect(migration).toContain("declared_size_bytes");
    expect(migration).toContain("signed_upload_expires_at timestamptz");
    expect(migration).toContain("token_issuance_failed_at timestamptz");
    expect(migration).toContain("cleanup_state text not null default 'pending'");
    expect(migration).toContain("cleanup_dead_lettered_at timestamptz");
    expect(migration).toContain("cleanup_dead_letter_error_code text");
    expect(migration).toContain("assignment_media_uploads_dead_letter_state_check");
    expect(migration).toContain("cleanup_attempts = 12");
    expect(migration).toContain("expires_at");
  });

  it("binds upload records and private file rows to owner-prefixed paths", () => {
    expect(migration).toContain("storage_key like auth.uid()::text || '/' || assignment_id::text || '/%'");
    expect(migration).toContain("storage_key like auth.uid()::text || '/%'");
    expect(migration).toContain("audio_storage_key is null or audio_storage_key like");
    expect(migration).toContain("photo_storage_key is null or photo_storage_key like");
  });

  it("denies authenticated clients a direct durable-media or intent write path", () => {
    expect(migration).toContain(
      "revoke insert, update, delete on table public.assignment_media_uploads from anon, authenticated",
    );
    expect(migration).toContain(
      "revoke insert, update, delete on table public.media_assets from anon, authenticated",
    );
    expect(migration).not.toContain("create policy media_assets_owner_all");
    expect(migration).not.toContain("on public.media_assets for insert to authenticated");
    expect(migration).not.toContain("create policy media_assets_owner_delete");
  });

  it("requires an exact active intent for every authenticated storage insert", () => {
    const policy = between(
      "create policy assignment_media_owner_insert",
      "create policy assignment_media_owner_select",
    );

    expect(policy).toContain("upload.storage_key = name");
    expect(policy).toContain("upload.owner_id = auth.uid()");
    expect(policy).toContain("upload.assignment_id::text = (storage.foldername(name))[2]");
    expect(policy).toContain("upload.expires_at > now()");
    expect(policy).toContain("upload.claimed_at is null");
    expect(policy).toContain("upload.finalized_at is null");
    expect(policy).toContain("upload.discarded_at is null");
    expect(migration).not.toContain("create policy assignment_media_owner_update");
  });

  it("blocks an authenticated durable-object delete attempt and limits deletion to unclaimed temporary keys", () => {
    const deletion = between(
      "create policy assignment_media_owner_delete",
      "create or replace function public.create_assignment_media_upload_intent",
    );

    expect(deletion).toContain("upload.storage_key = name");
    expect(deletion).toContain("upload.claimed_at is null");
    expect(deletion).toContain("upload.finalized_at is null");
    expect(deletion).not.toContain("from public.media_assets media");
    expect(deletion).not.toContain("media.storage_key = name");
  });

  it("persists an immutable claim-epoch candidate before returning its unique durable key", () => {
    const claim = functionBody("claim_assignment_media_upload");

    expect(migration).toContain("create table if not exists public.assignment_media_upload_candidates");
    expect(migration).toContain("primary key (upload_id, claim_epoch)");
    expect(migration).toContain("unique (upload_id, claim_token)");
    expect(migration).toContain("assignment_media_candidate_identity_immutable");
    expect(migration).toContain("quiescence_not_before timestamptz not null");
    expect(claim).toContain("for update;");
    expect(claim).toContain("claim_token = p_claim_token");
    expect(claim).toContain("claim_expires_at = now() + interval '15 minutes'");
    expect(claim).toContain("next_claim_epoch := upload.claim_epoch + 1");
    expect(claim).toContain("'/durable-e' || next_claim_epoch::text");
    expect(claim).toContain("insert into public.assignment_media_upload_candidates");
    expect(claim.indexOf("insert into public.assignment_media_upload_candidates")).toBeLessThan(
      claim.indexOf("update public.assignment_media_uploads"),
    );
    expect(claim).toContain("claim_epoch = next_claim_epoch");
    expect(claim).toContain("cleanup_requested_at = coalesce(cleanup_requested_at, clock_timestamp())");
    expect(claim).toContain("greatest(upload.signed_upload_expires_at, upload.expires_at) + interval '25 minutes'");
    expect(claim).not.toContain("p_durable_storage_key");
  });

  it("makes creation, claim replay, and cleanup completion idempotent", () => {
    const creation = functionBody("create_assignment_media_upload_intent");
    const tokenExpiry = functionBody("record_assignment_media_upload_token_expiry");
    const tokenFailure = functionBody("mark_assignment_media_upload_token_issuance_failed");
    const claim = functionBody("claim_assignment_media_upload");
    const completion = functionBody("complete_assignment_media_upload_cleanup");

    expect(creation).toContain("on conflict (id) do nothing");
    expect(creation).toContain("upload intent idempotency mismatch");
    expect(tokenExpiry).toContain("upload.signed_upload_expires_at = p_signed_upload_expires_at");
    expect(tokenExpiry).toContain("greatest(signed_upload_expires_at, p_signed_upload_expires_at)");
    expect(tokenFailure).toContain("coalesce(token_issuance_failed_at, clock_timestamp())");
    expect(claim).toContain("upload.claim_token = p_claim_token");
    expect(claim.indexOf("upload.claim_token = p_claim_token")).toBeLessThan(
      claim.indexOf("update public.assignment_media_uploads"),
    );
    expect(completion).toContain("cleanup_last_error = left(p_failure_code, 120)");
    expect(completion).toContain("upload.cleanup_next_attempt_at > p_now then upload.cleanup_attempts");
    expect(completion).toContain("return jsonb_build_object('state', 'deleted')");
  });

  it("atomically binds a conservative token expiry to the exact active intent", () => {
    const tokenExpiry = functionBody("record_assignment_media_upload_token_expiry");

    expect(tokenExpiry).toContain("security definer");
    expect(tokenExpiry).toContain("service role required");
    expect(tokenExpiry).toContain("id = p_upload_id");
    expect(tokenExpiry).toContain("assignment_id = p_assignment_id");
    expect(tokenExpiry).toContain("owner_id = p_owner_id");
    expect(tokenExpiry).toContain("storage_key = p_storage_key");
    expect(tokenExpiry).toContain("for update;");
    expect(tokenExpiry).toContain("upload.finalized_at is not null");
    expect(tokenExpiry).toContain("upload.discarded_at is not null");
    expect(tokenExpiry).toContain("upload.claimed_at is not null");
    expect(tokenExpiry).toContain("not isfinite(p_signed_upload_expires_at)");
    expect(tokenExpiry).toContain("interval '2 hours 5 minutes'");
    expect(tokenExpiry).toContain("p_signed_upload_expires_at < upload.signed_upload_expires_at");
    expect(tokenExpiry).toContain("signed upload expiry cannot be shortened");
  });

  it("serializes promotion and makes a retry return the one durable row", () => {
    const promotion = functionBody("finalize_assignment_media_upload");
    const revalidation = functionBody("revalidate_assignment_media_upload_claim");

    expect(migration).toContain("create unique index if not exists media_assets_upload_intent_idx");
    expect(promotion).toContain("for update;");
    expect(promotion.indexOf("from public.media_assets")).toBeLessThan(
      promotion.indexOf("insert into public.media_assets"),
    );
    expect(promotion).toContain("upload.claim_token is distinct from p_claim_token");
    expect(promotion).toContain("upload.claim_epoch <> p_claim_epoch");
    expect(promotion).toContain("upload.durable_storage_key <> candidate.storage_key");
    expect(promotion).toContain("upload.media_kind, candidate.storage_key");
    expect(promotion).toContain("candidate.promoted_at is not null");
    expect(promotion).toContain("set promoted_at = clock_timestamp()");
    expect(promotion).toContain("upload_intent_id");
    expect(promotion).toContain("set finalized_at = clock_timestamp()");
    expect(revalidation).toContain("claim_token = p_claim_token");
    expect(revalidation).toContain("claim_epoch = p_claim_epoch");
    expect(revalidation).toContain("storage_key = p_candidate_storage_key");
    expect(revalidation).toContain("candidate.cleanup_started_at is not null");
    expect(revalidation).toContain("upload.claim_expires_at <= now()");
    expect(revalidation).toContain("'state', 'active'");
  });

  it("locks discard against promotion and never authorizes deleting the durable object", () => {
    const discard = functionBody("discard_assignment_media_upload");

    expect(discard).toContain("for update;");
    expect(discard).toContain("from public.media_assets");
    expect(discard).toContain("'can_delete_object', false");
    expect(discard).toContain("'media', jsonb_build_object");
    expect(discard).toContain("upload.storage_key is distinct from media.storage_key");
    expect(discard).toContain("'temporary_storage_key', upload.storage_key");
    expect(discard).toContain("set discarded_at = coalesce(discarded_at, clock_timestamp())");
  });

  it("fences verifier rejection and makes ordinary cleanup busy while a claim is active", () => {
    const discard = functionBody("discard_assignment_media_upload");
    const copyCleanup = functionBody("cleanup_assignment_media_copy");
    const copyCompletion = functionBody("complete_assignment_media_candidate_cleanup");

    expect(discard).toContain("p_claim_token uuid default null");
    expect(discard).toContain("upload.claim_token is distinct from p_claim_token");
    expect(discard).toContain("upload.claim_expires_at <= now()");
    expect(discard).toContain("upload.claim_expires_at > now()");
    expect(discard).toContain("'state', 'stale'");
    expect(discard).toContain("'state', 'busy'");
    expect(copyCleanup).toContain("claim_epoch = p_claim_epoch");
    expect(copyCleanup).toContain("claim_token = p_claim_token");
    expect(copyCleanup).toContain("storage_key = p_candidate_storage_key");
    expect(copyCleanup).toContain("where storage_key = p_candidate_storage_key");
    expect(copyCleanup).toContain("candidate.promoted_at is not null");
    expect(copyCleanup).toContain("cleanup_started_at = coalesce(cleanup_started_at, clock_timestamp())");
    expect(copyCleanup).toContain("'storage_key', candidate.storage_key");
    expect(copyCompletion).toContain("where media.storage_key = candidate.storage_key");
  });

  it("claims due candidate cleanup through a bounded leased service protocol", () => {
    const claim = functionBody("claim_due_assignment_media_candidate_cleanups");

    expect(migration).toContain("cleanup_claim_token uuid");
    expect(migration).toContain("cleanup_claim_expires_at timestamptz");
    expect(migration).toContain("cleanup_dead_lettered_at timestamptz");
    expect(claim).toContain("least(greatest(coalesce(p_limit, 50), 1), 50)");
    expect(claim).toContain("for update of upload, candidate skip locked");
    expect(claim).toContain("candidate.cleanup_attempts < 12");
    expect(claim).toContain("candidate.cleanup_dead_lettered_at is null");
    expect(claim).toContain("candidate.closed_at is null");
    expect(claim).toContain("where media.storage_key = candidate.storage_key");
    expect(claim).toContain("upload.claim_token = candidate.claim_token");
    expect(claim).toContain("upload.claim_epoch = candidate.claim_epoch");
    expect(claim).toContain("upload.durable_storage_key = candidate.storage_key");
    expect(claim).toContain("cleanup_started_at = coalesce(candidate.cleanup_started_at, p_now)");
    expect(claim).toContain("cleanup_claim_expires_at = p_now + interval '5 minutes'");
  });

  it("completes an exact candidate lease with bounded retry and dead-letter state", () => {
    const completion = functionBody("complete_claimed_assignment_media_candidate_cleanup");
    const promotion = functionBody("finalize_assignment_media_upload");

    expect(completion).toContain("claim_epoch = p_claim_epoch");
    expect(completion).toContain("claim_token = p_claim_token");
    expect(completion).toContain("storage_key = p_candidate_storage_key");
    expect(completion).toContain("candidate.cleanup_claim_token is distinct from p_cleanup_token");
    expect(completion).toContain("p_absence_confirmed boolean default false");
    expect(completion).toContain("where media.storage_key = candidate.storage_key");
    expect(completion).toContain("least(candidate.cleanup_attempts + 1, 12)");
    expect(completion).toContain("interval '6 hours'");
    expect(completion).toContain("when next_attempts >= 12");
    expect(completion).toContain("'dead_lettered'");
    expect(completion).toContain("p_now >= quiescence_not_before");
    expect(completion).toContain("p_now + interval '10 minutes'");
    expect(completion).toContain("'quiescing'");
    expect(completion).toContain("'closed'");
    expect(promotion).toContain("candidate.cleanup_started_at is not null");
  });

  it("retains candidate identity and tombstone through the bounded quiescence horizon", () => {
    const completion = functionBody("complete_assignment_media_upload_cleanup");

    expect(migration).toContain("temporary_removed_at timestamptz");
    expect(migration).toContain("durable_removed_at timestamptz");
    expect(migration).toContain("cleanup_attempts integer not null default 0");
    expect(migration).toContain("cleanup_next_attempt_at timestamptz not null default now()");
    expect(migration).toContain("cleanup_quiescence_not_before timestamptz");
    expect(migration).toContain("cleanup_completed_at timestamptz");
    expect(migration).toContain("last_absence_confirmed_at timestamptz");
    expect(migration).toContain("closed_at timestamptz");
    expect(migration).toContain("verifier can execute for at most 15 minutes");
    expect(migration).toContain("10-minute margin");
    expect(completion).toContain("least(upload.cleanup_attempts + 1, 12)");
    expect(completion).toContain("interval '6 hours'");
    expect(completion).toContain("p_temporary_absence_confirmed");
    expect(completion).toContain("p_durable_absence_confirmed");
    expect(completion).toContain("p_now >= upload.cleanup_quiescence_not_before");
    expect(completion).toContain("upload.temporary_removed_at >= upload.cleanup_quiescence_not_before");
    expect(completion).toContain("signed_upload_expires_at is null");
    expect(completion).toContain("token_issuance_failed_at is null then p_now + interval '6 hours'");
    expect(completion).toContain("from public.assignment_media_upload_candidates candidate");
    expect(completion).toContain("candidate.promoted_at is null");
    expect(completion).toContain("candidate.closed_at is null");
    expect(completion).toContain("and not has_media");
    expect(completion).toContain("when upload.cleanup_state = 'completed' then 'completed'");
    expect(completion).toContain("candidate.promoted_at is null");
    expect(completion).toContain("candidate.closed_at is null");
    expect(completion.indexOf("delete from public.assignment_media_uploads")).toBeGreaterThan(
      completion.indexOf("candidate.closed_at is null"),
    );
  });

  it("keeps deployment duration within the encoded verifier and quiescence bounds", () => {
    const maxDurationSeconds = Number(
      workspacePage.match(/export const maxDuration = (\d+);/)?.[1],
    );
    const verifierBoundMinutes = Number(
      migration.match(/verifier can execute for at most (\d+) minutes/)?.[1],
    );
    const safetyMarginMinutes = Number(
      migration.match(/The (\d+)-minute margin covers scheduler delay/)?.[1],
    );
    const quiescenceMinutes = Number(
      migration.match(/identity therefore remain live for (\d+) minutes/)?.[1],
    );
    const encodedQuiescenceIntervals = [
      ...migration.matchAll(/interval '(\d+) minutes'/g),
    ].map((match) => Number(match[1])).filter((minutes) => minutes === quiescenceMinutes);

    expect(maxDurationSeconds).toBe(300);
    expect(maxDurationSeconds).toBeLessThanOrEqual(verifierBoundMinutes * 60);
    expect(quiescenceMinutes).toBe(verifierBoundMinutes + safetyMarginMinutes);
    expect(encodedQuiescenceIntervals).toHaveLength(6);
  });

  it("dead-letters tombstones explicitly and exposes service-only recovery and monitoring", () => {
    const completion = functionBody("complete_assignment_media_upload_cleanup");
    const recovery = functionBody("recover_assignment_media_upload_cleanup");
    const candidateRecovery = functionBody("recover_assignment_media_candidate_cleanup");
    const monitoring = functionBody("get_assignment_media_upload_cleanup_monitoring");

    expect(completion).toContain("when next_attempts >= 12 then 'dead_lettered'");
    expect(completion).toContain("cleanup_dead_lettered_at = case");
    expect(completion).toContain("cleanup_dead_letter_error_code = case");
    expect(completion).toContain("'cleanup_dead_letter_error_code', upload.cleanup_dead_letter_error_code");
    expect(recovery).toContain("upload.cleanup_state <> 'dead_lettered'");
    expect(recovery).toContain("cleanup_state = 'retry'");
    expect(recovery).toContain("cleanup_attempts = 0");
    expect(recovery).toContain("cleanup_dead_lettered_at = null");
    expect(candidateRecovery).toContain("claim_epoch = p_claim_epoch");
    expect(candidateRecovery).toContain("candidate.cleanup_dead_lettered_at is null");
    expect(candidateRecovery).toContain("candidate.promoted_at is not null");
    expect(candidateRecovery).toContain("cleanup_attempts = 0");
    expect(candidateRecovery).toContain("cleanup_dead_lettered_at = null");
    expect(monitoring).toContain("cleanup_state = 'dead_lettered'");
    expect(monitoring).toContain("cleanup_state in ('pending', 'retry')");
    expect(monitoring).toContain("'candidate_dead_letter_count'");
    expect(monitoring).toContain("'candidate_oldest_dead_letter_age_seconds'");
  });

  it("creates durable fenced media deletion jobs before storage work", () => {
    const request = functionBody("request_assignment_media_deletion");
    const retentionRequest = functionBody("request_due_assignment_media_retention_deletions");
    const exactClaim = functionBody("claim_assignment_media_deletion");
    const dueClaim = functionBody("claim_due_assignment_media_deletions");

    expect(migration).toContain("create table if not exists public.media_asset_deletion_jobs");
    expect(migration).toContain("media_asset_id uuid not null unique");
    expect(migration).toContain("storage_key text not null unique");
    expect(migration).toContain("upload_id uuid");
    expect(migration).toContain("temporary_storage_key text");
    expect(migration).toContain("check ((upload_id is null) = (temporary_storage_key is null))");
    expect(migration).toContain("set upload_id = media.upload_intent_id");
    expect(migration).toContain("state in ('requested', 'processing', 'retry', 'dead_lettered', 'completed')");
    expect(request).toContain("from public.media_assets");
    expect(request).toContain("for update;");
    expect(request).toContain("assignment ownership mismatch");
    expect(request).toContain("media deletion job identity mismatch");
    expect(request).toContain("media.upload_intent_id");
    expect(request).toContain("media deletion upload tombstone is missing");
    expect(request).toContain("cleanup_requested_at = coalesce(cleanup_requested_at, p_now)");
    expect(request).toContain("temporary_storage_key, reason");
    expect(retentionRequest).toContain("least(greatest(coalesce(p_limit, 50), 1), 50)");
    expect(retentionRequest).toContain("for update of media skip locked");
    expect(retentionRequest).toContain("insert into public.media_asset_deletion_jobs");
    expect(exactClaim).toContain("media_asset_id = p_media_asset_id");
    expect(exactClaim).toContain("assignment_id = p_assignment_id");
    expect(exactClaim).toContain("owner_id = p_owner_id");
    expect(exactClaim).toContain("claim_expires_at = p_now + interval '5 minutes'");
    expect(exactClaim).toContain("media deletion job lost its upload tombstone");
    expect(exactClaim).toContain("'temporary_storage_key', job.temporary_storage_key");
    expect(dueClaim).toContain("for update of job skip locked");
    expect(dueClaim).toContain("claimed.temporary_storage_key");
    expect(dueClaim).toContain("limit bounded_limit");
  });

  it("only finalizes media deletion after confirmed absence and keeps bounded recoverable failure state", () => {
    const completion = functionBody("complete_assignment_media_deletion");
    const recovery = functionBody("recover_assignment_media_deletion");
    const monitoring = functionBody("get_assignment_media_deletion_monitoring");

    expect(completion).toContain("p_storage_absence_confirmed");
    expect(completion).toContain("upload.cleanup_state = 'completed'");
    expect(completion).toContain("upload.temporary_removed_at >= upload.cleanup_quiescence_not_before");
    expect(completion).toContain("delete from public.media_assets");
    expect(completion).toContain("delete from public.assignment_media_uploads");
    expect(completion.indexOf("delete from public.media_assets")).toBeLessThan(
      completion.indexOf("set state = 'completed'"),
    );
    expect(completion).toContain("exception when others then");
    expect(completion).toContain("database_finalize_failed");
    expect(completion).toContain("least(job.attempts + 1, 12)");
    expect(completion).toContain("interval '6 hours'");
    expect(completion).toContain("when next_attempts >= 12 then 'dead_lettered'");
    expect(recovery).toContain("job.state <> 'dead_lettered'");
    expect(recovery).toContain("state = 'retry'");
    expect(recovery).toContain("attempts = 0");
    expect(monitoring).toContain("'dead_letter_count'");
    expect(monitoring).toContain("'oldest_dead_letter_age_seconds'");
  });

  it("exposes intent creation, promotion, and discard only to service role", () => {
    for (const rpc of [
      "create_assignment_media_upload_intent",
      "record_assignment_media_upload_token_expiry",
      "mark_assignment_media_upload_token_issuance_failed",
      "claim_assignment_media_upload",
      "revalidate_assignment_media_upload_claim",
      "finalize_assignment_media_upload",
      "cleanup_assignment_media_copy",
      "complete_assignment_media_candidate_cleanup",
      "claim_due_assignment_media_candidate_cleanups",
      "complete_claimed_assignment_media_candidate_cleanup",
      "recover_assignment_media_candidate_cleanup",
      "discard_assignment_media_upload",
      "complete_assignment_media_upload_cleanup",
      "recover_assignment_media_upload_cleanup",
      "get_assignment_media_upload_cleanup_monitoring",
      "request_assignment_media_deletion",
      "request_due_assignment_media_retention_deletions",
      "claim_assignment_media_deletion",
      "claim_due_assignment_media_deletions",
      "complete_assignment_media_deletion",
      "recover_assignment_media_deletion",
      "get_assignment_media_deletion_monitoring",
    ]) {
      const body = functionBody(rpc);
      expect(body).toContain("security definer");
      expect(body).toContain("set search_path = public, pg_temp");
      expect(body).toContain("service role required");
    }
    for (const rpc of [
      "claim_assignment_media_upload(uuid, uuid, uuid, uuid)",
      "revalidate_assignment_media_upload_claim(uuid, uuid, uuid, uuid, bigint, text)",
      "finalize_assignment_media_upload(uuid, uuid, uuid, uuid, bigint, text, text, bigint)",
      "cleanup_assignment_media_copy(uuid, uuid, uuid, uuid, bigint, text)",
      "complete_assignment_media_candidate_cleanup(uuid, uuid, uuid, uuid, bigint, text, boolean, text, timestamptz)",
      "claim_due_assignment_media_candidate_cleanups(uuid, integer, timestamptz)",
      "complete_claimed_assignment_media_candidate_cleanup(uuid, uuid, uuid, uuid, bigint, text, uuid, boolean, boolean, text, timestamptz)",
      "recover_assignment_media_candidate_cleanup(uuid, uuid, uuid, bigint, timestamptz)",
      "recover_assignment_media_upload_cleanup(uuid, uuid, uuid, timestamptz)",
      "get_assignment_media_upload_cleanup_monitoring(timestamptz)",
      "request_assignment_media_deletion(uuid, uuid, uuid, text, timestamptz)",
      "request_due_assignment_media_retention_deletions(integer, timestamptz)",
      "claim_assignment_media_deletion(uuid, uuid, uuid, uuid, uuid, timestamptz)",
      "claim_due_assignment_media_deletions(uuid, integer, timestamptz)",
      "complete_assignment_media_deletion(uuid, uuid, uuid, uuid, text, uuid, boolean, boolean, text, timestamptz)",
      "recover_assignment_media_deletion(uuid, uuid, uuid, uuid, timestamptz)",
      "get_assignment_media_deletion_monitoring(timestamptz)",
    ]) {
      expect(migration).toContain(`revoke execute on function public.${rpc}`);
      expect(migration).toContain(`grant execute on function public.${rpc}`);
    }
  });
});

function between(start: string, end: string) {
  const startIndex = migration.indexOf(start);
  const endIndex = migration.indexOf(end, startIndex + start.length);
  expect(startIndex).toBeGreaterThanOrEqual(0);
  expect(endIndex).toBeGreaterThan(startIndex);
  return migration.slice(startIndex, endIndex);
}

function functionBody(name: string) {
  const start = `create or replace function public.${name}`;
  const startIndex = migration.indexOf(start);
  const endIndex = migration.indexOf("\n$$;", startIndex);
  expect(startIndex).toBeGreaterThanOrEqual(0);
  expect(endIndex).toBeGreaterThan(startIndex);
  return migration.slice(startIndex, endIndex);
}
