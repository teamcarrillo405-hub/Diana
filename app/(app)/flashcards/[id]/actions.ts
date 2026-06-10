"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { schedule, type FsrsCard } from "@/lib/fsrs/fsrs";
import { adjustDueDate, intervalMultiplier, MIN_SAMPLES_FOR_CALIBRATION } from "@/lib/fsrs/personalize";
import { masteryLevelFromCorrectReviews } from "@/lib/mastery/concepts";
import { recordStudentStateSnapshot } from "@/lib/student-state/server";
import type { FsrsState } from "@/lib/notes/types";
import type { Json } from "@/lib/supabase/types";

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
    .select("id, state, stability, difficulty, due_at, reps, lapses, last_review_at, concept_id, source_assignment_id, source_artifact_id, source_anchor, student_required_action")
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
  const now = new Date();
  const result = schedule(card, parsed.data.rating, now);

  // 2b. Per-student calibration: with 50+ reviews of history, nudge the
  // interval by the clamped observed-vs-predicted multiplier. Learning
  // steps (sub-day) are never touched; absence of history means 1.0.
  const { data: historyRows } = await supabase
    .from("flashcard_reviews")
    .select("rating, elapsed_days, stability")
    .eq("owner_id", user.id)
    .order("reviewed_at", { ascending: false })
    .limit(Math.max(200, MIN_SAMPLES_FOR_CALIBRATION));
  const multiplier = intervalMultiplier(
    (historyRows ?? []).map((r) => ({
      rating: Number(r.rating),
      elapsed_days: Number(r.elapsed_days),
      stability: Number(r.stability),
    })),
  );
  result.card.dueAt = adjustDueDate(now, result.card.dueAt, multiplier);

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

  if (row.concept_id) {
    await updateConceptFromFlashcardReview({
      supabase,
      ownerId: user.id,
      conceptId: row.concept_id,
      rating: parsed.data.rating,
    });
  }

  await supabase.from("task_signals").insert({
    owner_id: user.id,
    assignment_id: row.source_assignment_id,
    kind: "recall_result",
    value: {
      cardId: row.id,
      artifactId: row.source_artifact_id,
      rating: parsed.data.rating,
      sourceAnchor: row.source_anchor,
      studentAction: row.student_required_action,
      state: result.card.state,
    } as Json,
  });

  if (row.source_artifact_id) {
    await supabase
      .from("study_artifacts")
      .update({
        loop_state: parsed.data.rating >= 3 ? "mastery_linked" : "reviewing",
        last_reviewed_at: result.log.reviewedAt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.source_artifact_id)
      .eq("owner_id", user.id);
  }

  await recordStudentStateSnapshot({
    supabase,
    ownerId: user.id,
    assignmentId: row.source_assignment_id,
    trigger: "flashcard_recall_result",
  });

  revalidatePath("/flashcards");
  revalidatePath("/dashboard");
  return { ok: true, nextDueAt: result.card.dueAt, state: result.card.state };
}

async function updateConceptFromFlashcardReview({
  supabase,
  ownerId,
  conceptId,
  rating,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  ownerId: string;
  conceptId: string;
  rating: 1 | 2 | 3 | 4;
}) {
  const { data: cards } = await supabase
    .from("flashcards")
    .select("id")
    .eq("owner_id", ownerId)
    .eq("concept_id", conceptId);
  const cardIds = (cards ?? []).map((card) => card.id);
  if (cardIds.length === 0) return;

  const { count: correctCount } = await supabase
    .from("flashcard_reviews")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", ownerId)
    .in("card_id", cardIds)
    .gte("rating", 3);

  const nextLevel = masteryLevelFromCorrectReviews(correctCount ?? 0);
  const { data: concept } = await supabase
    .from("mastery_concepts")
    .select("mastery_level")
    .eq("id", conceptId)
    .eq("owner_id", ownerId)
    .single();
  const currentLevel = Number(concept?.mastery_level ?? 0);
  const finalLevel = Math.max(currentLevel, nextLevel);

  await supabase
    .from("mastery_concepts")
    .update({
      mastery_level: finalLevel,
      last_practiced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", conceptId)
    .eq("owner_id", ownerId);

  await supabase.from("mastery_events").insert({
    owner_id: ownerId,
    concept_id: conceptId,
    source: "flashcard_review",
    rating,
    delta: finalLevel - currentLevel,
    evidence_text: "Flashcard review",
  });
}
