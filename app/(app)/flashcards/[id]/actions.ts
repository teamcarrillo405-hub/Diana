"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { schedule, type FsrsCard } from "@/lib/fsrs/fsrs";
import type { FsrsState } from "@/lib/notes/types";

const RateInput = z.object({
  id:     z.string().uuid(),
  rating: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
});

export async function rateCard(
  input: z.infer<typeof RateInput>,
): Promise<
  | { ok: true; nextDueAt: string; state: FsrsState }
  | { ok: false; error: string }
> {
  const parsed = RateInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  // 1. Load current FSRS state for this card
  const { data: row, error: loadError } = await supabase
    .from("flashcards")
    .select("id, state, stability, difficulty, due_at, reps, lapses, last_review_at")
    .eq("id", parsed.data.id)
    .eq("owner_id", user.id)
    .single();

  if (loadError || !row) return { ok: false, error: "Card not found." };

  const card: FsrsCard = {
    state:        row.state as FsrsState,
    stability:    Number(row.stability),
    difficulty:   Number(row.difficulty),
    dueAt:        row.due_at,
    reps:         row.reps,
    lapses:       row.lapses,
    lastReviewAt: row.last_review_at,
  };

  // 2. Apply FSRS scheduling
  const result = schedule(card, parsed.data.rating, new Date());

  // 3. Persist updated card state
  const { error: updateError } = await supabase
    .from("flashcards")
    .update({
      state:          result.card.state,
      stability:      result.card.stability,
      difficulty:     result.card.difficulty,
      due_at:         result.card.dueAt,
      reps:           result.card.reps,
      lapses:         result.card.lapses,
      last_review_at: result.card.lastReviewAt,
      updated_at:     new Date().toISOString(),
    })
    .eq("id", parsed.data.id)
    .eq("owner_id", user.id);

  if (updateError) return { ok: false, error: updateError.message };

  // 4. Append review-log row (history is sacred — never delete)
  const { error: logError } = await supabase
    .from("flashcard_reviews")
    .insert({
      card_id:        parsed.data.id,
      owner_id:       user.id,
      rating:         parsed.data.rating,
      scheduled_for:  result.log.scheduledFor,
      reviewed_at:    result.log.reviewedAt,
      stability:      result.log.stability,
      difficulty:     result.log.difficulty,
      elapsed_days:   result.log.elapsedDays,
      scheduled_days: result.log.scheduledDays,
      reps:           result.log.reps,
      lapses:         result.log.lapses,
      state:          result.log.state,
    });

  if (logError) return { ok: false, error: logError.message };

  revalidatePath("/flashcards");
  revalidatePath("/dashboard");
  return { ok: true, nextDueAt: result.card.dueAt, state: result.card.state };
}
