// Deno-importable mirror of lib/ai/safety.ts for Edge Functions.
// Kept in sync with lib/ai/safety.ts by convention — if you change one, change both.

interface SupabaseLike {
  from(table: string): {
    select(cols: string): {
      eq(col: string, val: string): {
        single(): Promise<{ data: Record<string, unknown> | null; error: unknown }>;
      };
    };
    update(payload: Record<string, unknown>): {
      eq(col: string, val: string): Promise<{ error: unknown }>;
    };
    insert(payload: Record<string, unknown>): Promise<{ error: unknown }>;
  };
}

export interface BudgetCheck { allowed: boolean; remaining: number; }
export interface LogParams {
  ownerId: string;
  assignmentId?: string | null;
  feature: "math_step" | "writing_aid" | "citation_gen" | "reading_scaffold" | "transcribe_note" | "stt_transcribe" | "tts_generate";
  model: string;
  promptSummary: string;
  tokensUsed: number;
}

function todayIsoDate(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export async function checkTokenBudget(
  userId: string,
  supabase: SupabaseLike,
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

export async function resetBudgetIfNewDay(
  userId: string,
  supabase: SupabaseLike,
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

export async function incrementTokens(
  userId: string,
  delta: number,
  supabase: SupabaseLike,
): Promise<void> {
  // Best-effort increment via SELECT + UPDATE. Race-acceptable: small over/under
  // is fine; soft budget enforcement.
  const { data } = await supabase
    .from("profiles")
    .select("tokens_used_today")
    .eq("user_id", userId)
    .single();
  if (!data) return;
  const next = Number(data.tokens_used_today ?? 0) + delta;
  await supabase
    .from("profiles")
    .update({ tokens_used_today: next })
    .eq("user_id", userId);
}

export async function logInteraction(
  params: LogParams,
  supabase: SupabaseLike,
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
