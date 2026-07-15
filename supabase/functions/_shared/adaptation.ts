// Deno mirror of lib/adaptation/effectiveness.ts (scoring core only), per the
// Deno-mirror convention. Reads the student's "helped / not really" events
// and returns one calm learned-context line for system prompts — or null.
// Failure-proof by design: any error means no learned context, never a
// broken AI response.

type SupabaseLike = {
  // deno-lint-ignore no-explicit-any
  from: (table: string) => any;
};

const MIN_SAMPLES = 3;
const LEAN_IN_SCORE = 0.6;
const EASE_OFF_SCORE = 0.35;

const HUMAN: Record<string, string> = {
  "subject:math": "the math helper",
  "subject:science": "the science helper",
  "subject:history": "the history helper",
  "subject:writing": "the writing studio",
  "subject:reading": "the reading scaffold",
  "subject:ap": "the AP helper",
  "study_mode:guided_steps": "step-by-step guidance",
  "study_mode:visual_breakdown": "visual breakdowns",
  "study_mode:retrieval_quiz": "quiz-style recall",
  "study_mode:flashcard_builder": "card building",
};

export async function adaptationLineForOwner(
  ownerId: string,
  supabase: SupabaseLike,
): Promise<string | null> {
  try {
    const { data } = await supabase
      .from("ai_help_feedback")
      .select("feature, helpful")
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: false })
      .limit(200);
    const rows = (data ?? []) as Array<{ feature?: unknown; helpful?: unknown }>;

    const byFeature = new Map<string, { helpful: number; total: number }>();
    for (const row of rows) {
      if (typeof row.feature !== "string") continue;
      const bucket = byFeature.get(row.feature) ?? { helpful: 0, total: 0 };
      bucket.total += 1;
      if (row.helpful === true) bucket.helpful += 1;
      byFeature.set(row.feature, bucket);
    }

    const leanIn: string[] = [];
    const easeOff: string[] = [];
    for (const [feature, { helpful, total }] of byFeature) {
      if (total < MIN_SAMPLES) continue;
      const score = (helpful + 1) / (total + 2);
      if (score >= LEAN_IN_SCORE) leanIn.push(HUMAN[feature] ?? feature);
      else if (score <= EASE_OFF_SCORE) easeOff.push(HUMAN[feature] ?? feature);
    }

    const parts: string[] = [];
    if (leanIn.length > 0) {
      parts.push(
        `${leanIn.slice(0, 2).join(" and ")} ${leanIn.length === 1 ? "has" : "have"} landed well for this student — lead with that shape when natural`,
      );
    }
    if (easeOff.length > 0) {
      parts.push(`${easeOff[0]} has not been landing — try a different shape first`);
    }
    return parts.length > 0 ? `Learned context: ${parts.join("; ")}.` : null;
  } catch {
    return null;
  }
}
