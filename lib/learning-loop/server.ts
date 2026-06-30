import { revalidatePath } from "next/cache";
import {
  computeLearnerProfile,
  defaultLearnerProfile,
  type LearnerProfile,
  type LearnerProfileSourceCounts,
} from "@/lib/learning-loop/profile";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const SNAPSHOT_MAX_AGE_MS = 6 * 60 * 60 * 1000;

export async function getLearnerProfile({
  supabase,
  ownerId,
  now = new Date(),
}: {
  supabase: SupabaseServerClient;
  ownerId: string;
  now?: Date;
}): Promise<LearnerProfile> {
  const control = await learningLoopControl(supabase, ownerId);
  if (control.paused) return defaultLearnerProfile(ownerId, now);

  const latest = await supabase
    .from("learner_profile_snapshots")
    .select("profile_json, computed_at, version")
    .eq("owner_id", ownerId)
    .order("computed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const snapshot = latest.data;
  if (
    snapshot &&
    (!control.resetAt || Date.parse(snapshot.computed_at) >= Date.parse(control.resetAt)) &&
    now.getTime() - Date.parse(snapshot.computed_at) <= SNAPSHOT_MAX_AGE_MS
  ) {
    return normalizeLearnerProfile(snapshot.profile_json, ownerId, now);
  }

  return refreshLearnerProfile({ supabase, ownerId, now, resetAt: control.resetAt });
}

export async function refreshLearnerProfile({
  supabase,
  ownerId,
  now = new Date(),
  resetAt,
}: {
  supabase: SupabaseServerClient;
  ownerId: string;
  now?: Date;
  resetAt?: string | null;
}): Promise<LearnerProfile> {
  const since = resetAt ?? new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { data: feedbackRows },
    { data: interactionRows },
    { data: signalRows },
    { data: snapshotRows },
    { data: masteryRows },
    { data: reviewRows },
  ] = await Promise.all([
    supabase
      .from("ai_help_feedback")
      .select("feature, helpful, created_at")
      .eq("owner_id", ownerId)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(300),
    supabase
      .from("ai_interactions")
      .select("feature, assignment_id, created_at")
      .eq("owner_id", ownerId)
      .gte("created_at", since)
      .not("assignment_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(400),
    supabase
      .from("task_signals")
      .select("kind, assignment_id, value, occurred_at")
      .eq("owner_id", ownerId)
      .gte("occurred_at", since)
      .order("occurred_at", { ascending: false })
      .limit(600),
    supabase
      .from("student_state_snapshots")
      .select("assignment_kind, support_intensity, struggle_state, friction_signals, created_at")
      .eq("owner_id", ownerId)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(120),
    supabase
      .from("mastery_concepts")
      .select("name, mastery_level")
      .eq("owner_id", ownerId)
      .order("mastery_level", { ascending: true })
      .limit(50),
    supabase
      .from("flashcard_reviews")
      .select("rating, elapsed_days, stability")
      .eq("owner_id", ownerId)
      .gte("reviewed_at", since)
      .order("reviewed_at", { ascending: false })
      .limit(250),
  ]);

  const completionSignals = (signalRows ?? [])
    .filter((row) => row.kind === "completed" && row.assignment_id)
    .map((row) => ({
      assignmentId: row.assignment_id as string,
      occurredAt: String(row.occurred_at),
    }));

  const { profile, sourceCounts } = computeLearnerProfile({
    ownerId,
    now,
    feedbackEvents: (feedbackRows ?? []).map((row) => ({
      feature: String(row.feature),
      helpful: Boolean(row.helpful),
      createdAt: String(row.created_at),
    })),
    helpInteractions: (interactionRows ?? []).map((row) => ({
      feature: String(row.feature),
      assignmentId: row.assignment_id as string | null,
      createdAt: String(row.created_at),
    })),
    completions: completionSignals,
    taskSignals: (signalRows ?? []).map((row) => ({
      kind: String(row.kind),
      assignmentId: row.assignment_id as string | null,
      value: row.value,
      occurredAt: String(row.occurred_at),
    })),
    studentStateSnapshots: (snapshotRows ?? []).map((row) => ({
      assignmentKind: row.assignment_kind,
      supportIntensity: row.support_intensity,
      struggleState: row.struggle_state,
      frictionSignals: row.friction_signals,
      createdAt: row.created_at,
    })),
    masteryConcepts: (masteryRows ?? []).map((row) => ({
      name: String(row.name),
      masteryLevel: Number(row.mastery_level ?? 0),
    })),
    flashcardReviews: (reviewRows ?? []).map((row) => ({
      rating: Number(row.rating),
      elapsed_days: Number(row.elapsed_days),
      stability: Number(row.stability),
    })),
  });

  await writeLearnerProfileSnapshot({ supabase, ownerId, profile, sourceCounts });
  return profile;
}

export async function resetLearnerProfile({
  supabase,
  ownerId,
  now = new Date(),
}: {
  supabase: SupabaseServerClient;
  ownerId: string;
  now?: Date;
}) {
  const resetAt = now.toISOString();
  await Promise.all([
    supabase
      .from("profiles")
      .update({ learning_loop_reset_at: resetAt })
      .eq("user_id", ownerId),
    supabase.from("learner_profile_snapshots").delete().eq("owner_id", ownerId),
    supabase.from("ai_help_feedback").delete().eq("owner_id", ownerId),
    supabase.from("learning_events").delete().eq("owner_id", ownerId),
    supabase.from("learning_rollup_jobs").delete().eq("owner_id", ownerId),
  ]);
  revalidatePath("/settings");
  revalidatePath("/export");
}

export async function setLearnerPersonalizationPaused({
  supabase,
  ownerId,
  paused,
}: {
  supabase: SupabaseServerClient;
  ownerId: string;
  paused: boolean;
}) {
  await supabase
    .from("profiles")
    .update({ learning_loop_paused: paused })
    .eq("user_id", ownerId);
  revalidatePath("/settings");
}

export async function recordLearningEvent({
  supabase,
  ownerId,
  eventName,
  assignmentId = null,
  feature = null,
  sourceTable = null,
  sourceId = null,
  payload = {},
  occurredAt = new Date().toISOString(),
}: {
  supabase: SupabaseServerClient;
  ownerId: string;
  eventName: string;
  assignmentId?: string | null;
  feature?: string | null;
  sourceTable?: string | null;
  sourceId?: string | null;
  payload?: Json;
  occurredAt?: string;
}): Promise<void> {
  const tenantId = personalTenantId(ownerId);
  await supabase.from("learning_events").insert({
    owner_id: ownerId,
    tenant_id: tenantId,
    event_name: eventName,
    source_table: sourceTable,
    source_id: sourceId,
    assignment_id: assignmentId,
    feature,
    payload,
    occurred_at: occurredAt,
  });

  await supabase.from("learning_rollup_jobs").insert({
    owner_id: ownerId,
    tenant_id: tenantId,
    reason: eventName,
  });
}

async function writeLearnerProfileSnapshot({
  supabase,
  ownerId,
  profile,
  sourceCounts,
}: {
  supabase: SupabaseServerClient;
  ownerId: string;
  profile: LearnerProfile;
  sourceCounts: LearnerProfileSourceCounts;
}) {
  await supabase.from("learner_profile_snapshots").insert({
    owner_id: ownerId,
    profile_json: profile as unknown as Json,
    confidence_json: profile.confidence as unknown as Json,
    source_counts_json: sourceCounts as unknown as Json,
    computed_at: profile.computedAt,
    version: profile.version,
  });
}

async function learningLoopControl(supabase: SupabaseServerClient, ownerId: string) {
  const { data } = await supabase
    .from("profiles")
    .select("learning_loop_paused, learning_loop_reset_at")
    .eq("user_id", ownerId)
    .maybeSingle();
  return {
    paused: Boolean(data?.learning_loop_paused),
    resetAt: data?.learning_loop_reset_at ?? null,
  };
}

function normalizeLearnerProfile(value: Json, ownerId: string, now: Date): LearnerProfile {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return defaultLearnerProfile(ownerId, now);
  }
  const parsed = value as unknown as LearnerProfile;
  return {
    ...defaultLearnerProfile(ownerId, now),
    ...parsed,
    ownerId,
  };
}

function personalTenantId(ownerId: string) {
  return `personal:${ownerId}`;
}
