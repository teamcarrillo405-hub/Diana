import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

export interface BudgetCheck {
  allowed: boolean;
  remaining: number;
}

export interface LogParams {
  ownerId: string;
  assignmentId?: string | null;
  feature:
    | "math_step"
    | "writing_aid"
    | "citation_gen"
    | "reading_scaffold"
    | "transcribe_note"
    | "stt_transcribe"
    | "tts_generate"
    | "task_breakdown"
    | "math_example"
    | "vocab_hover";
  model: string;
  promptSummary: string;
  tokensUsed: number;
}

/** Returns 'YYYY-MM-DD' in UTC — daily reset boundary is UTC-consistent for v1. */
export function todayIsoDate(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Check whether the user has remaining token budget for today.
 * remaining = max(0, daily_token_budget - tokens_used_today).
 * allowed = remaining > 0.
 */
export async function checkTokenBudget(
  userId: string,
  supabase: SupabaseClient<Database>,
): Promise<BudgetCheck> {
  const { data } = await supabase
    .from("profiles")
    .select("daily_token_budget, tokens_used_today")
    .eq("user_id", userId)
    .single();
  if (!data) return { allowed: false, remaining: 0 };
  const budget = Number(data.daily_token_budget ?? 0);
  const used = Number(data.tokens_used_today ?? 0);
  const remaining = Math.max(0, budget - used);
  return { allowed: remaining > 0, remaining };
}

/**
 * Reset the daily token counter if today (UTC) differs from the stored reset date.
 * No-op when already reset today.
 */
export async function resetBudgetIfNewDay(
  userId: string,
  supabase: SupabaseClient<Database>,
): Promise<void> {
  const { data } = await supabase
    .from("profiles")
    .select("token_reset_date")
    .eq("user_id", userId)
    .single();
  if (!data) return;
  const today = todayIsoDate();
  if (data.token_reset_date !== today) {
    await supabase
      .from("profiles")
      .update({ tokens_used_today: 0, token_reset_date: today })
      .eq("user_id", userId);
  }
}

/**
 * Fire-and-forget insert into ai_interactions.
 * NEVER throws — a failed log must not break the user-facing AI response.
 */
export async function logInteraction(
  params: LogParams,
  supabase: SupabaseClient<Database>,
): Promise<void> {
  try {
    await supabase.from("ai_interactions").insert({
      owner_id: params.ownerId,
      assignment_id: params.assignmentId ?? null,
      feature: params.feature,
      model: params.model,
      prompt_summary: params.promptSummary.slice(0, 200),
      tokens_used: params.tokensUsed,
    });
  } catch (e) {
    console.warn("ai_interactions log failed", e);
  }
}
