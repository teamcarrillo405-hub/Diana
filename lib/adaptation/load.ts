import { createClient } from "@/lib/supabase/server";
import { outcomeEvents, type FeedbackEvent } from "./effectiveness";

/**
 * All effectiveness events for the signed-in student: explicit taps plus
 * automatic outcome signals (assignment completed within the window after
 * AI help). Used by every surface that consults the learned policy so they
 * agree on what Diana has learned.
 */
export async function loadEffectivenessEvents(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<FeedbackEvent[]> {
  const [{ data: taps }, { data: interactions }, { data: completions }] = await Promise.all([
    supabase
      .from("ai_help_feedback")
      .select("feature, helpful, created_at")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("ai_interactions")
      .select("feature, assignment_id, created_at")
      .not("assignment_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(300),
    supabase
      .from("task_signals")
      .select("assignment_id, occurred_at")
      .eq("kind", "completed")
      .not("assignment_id", "is", null)
      .order("occurred_at", { ascending: false })
      .limit(300),
  ]);

  const explicit: FeedbackEvent[] = (taps ?? []).map((row) => ({
    feature: row.feature as string,
    helpful: Boolean(row.helpful),
    createdAt: String(row.created_at),
  }));

  const inferred = outcomeEvents({
    interactions: (interactions ?? []).map((row) => ({
      feature: row.feature as string,
      assignmentId: row.assignment_id as string | null,
      createdAt: String(row.created_at),
    })),
    completions: (completions ?? []).map((row) => ({
      assignmentId: row.assignment_id as string,
      occurredAt: String(row.occurred_at),
    })),
  });

  return [...explicit, ...inferred];
}
