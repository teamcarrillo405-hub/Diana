import type { SupabaseClient } from "@supabase/supabase-js";

export type CalibrationStats = {
  mean: number;
  n: number;
};

/**
 * Returns a factual hint string when 3+ data points exist and the user's
 * current estimate differs by more than 20% from their historical mean.
 * Never shaming — tone: "Your last N took about X minutes on average."
 */
export function getCalibrationHint(
  stats: CalibrationStats,
  userEstimate: number | null,
): string | null {
  if (stats.n < 3) return null;
  if (userEstimate === null) return null;

  const diff = Math.abs(userEstimate - stats.mean);
  const pctDiff = diff / stats.mean;
  if (pctDiff <= 0.2) return null;

  return `Your last ${stats.n} took about ${Math.round(stats.mean)} minutes on average.`;
}

/**
 * Closes the open assignment_time_log row and atomically upserts the
 * running mean estimate for that kind via the upsert_type_estimate RPC.
 * Uses atomic SQL upsert to avoid race condition (Pitfall 7).
 */
export async function recordElapsedTime(
  supabase: SupabaseClient,
  ownerId: string,
  assignmentId: string,
  kind: string,
  elapsedMinutes: number,
): Promise<void> {
  // Close the open time_log row
  await supabase
    .from("assignment_time_log")
    .update({
      ended_at:        new Date().toISOString(),
      elapsed_minutes: elapsedMinutes,
    })
    .eq("assignment_id", assignmentId)
    .is("ended_at", null);

  // Atomically upsert running mean via Postgres function (Pitfall 7 guard)
  await supabase.rpc("upsert_type_estimate", {
    p_owner_id: ownerId,
    p_kind:     kind,
    p_elapsed:  elapsedMinutes,
  });
}

/**
 * Opens a new assignment_time_log row (started_at = now, ended_at = null).
 * Called when student transitions to 'drafting'.
 */
export async function openTimeLog(
  supabase: SupabaseClient,
  ownerId: string,
  assignmentId: string,
): Promise<void> {
  await supabase.from("assignment_time_log").insert({
    owner_id:      ownerId,
    assignment_id: assignmentId,
    started_at:    new Date().toISOString(),
  });
}
