"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { masteryLevelFromAiQuizResult } from "@/lib/mastery/concepts";
import { createClient } from "@/lib/supabase/server";

const ConfidenceInput = z.object({
  conceptId: z.string().uuid(),
  classId: z.string().uuid(),
  confidence: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
});

const QuizResultInput = z.object({
  conceptId: z.string().uuid(),
  classId: z.string().uuid(),
  rating: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  evidenceText: z.string().max(240).optional(),
});

export async function updateConceptConfidence(input: z.infer<typeof ConfidenceInput>) {
  const parsed = ConfidenceInput.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid input." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in." };

  const { error } = await supabase
    .from("mastery_concepts")
    .update({
      self_confidence: parsed.data.confidence,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.conceptId)
    .eq("owner_id", user.id);

  if (error) return { ok: false as const, error: error.message };

  await supabase.from("mastery_events").insert({
    owner_id: user.id,
    concept_id: parsed.data.conceptId,
    source: "self_confidence",
    rating: parsed.data.confidence,
    delta: 0,
    evidence_text: "Student confidence check-in",
  });

  revalidatePath(`/classes/${parsed.data.classId}`);
  return { ok: true as const };
}

export async function recordAiQuizMasteryResult(input: z.infer<typeof QuizResultInput>) {
  const parsed = QuizResultInput.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid input." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in." };

  const { data: concept, error: conceptError } = await supabase
    .from("mastery_concepts")
    .select("id, mastery_level")
    .eq("id", parsed.data.conceptId)
    .eq("class_id", parsed.data.classId)
    .eq("owner_id", user.id)
    .single();

  if (conceptError || !concept) {
    return { ok: false as const, error: conceptError?.message ?? "Concept not found." };
  }

  const previousLevel = Number(concept.mastery_level ?? 0);
  const nextLevel = masteryLevelFromAiQuizResult(previousLevel, parsed.data.rating);
  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("mastery_concepts")
    .update({
      mastery_level: nextLevel,
      last_practiced_at: now,
      updated_at: now,
    })
    .eq("id", parsed.data.conceptId)
    .eq("owner_id", user.id);

  if (updateError) return { ok: false as const, error: updateError.message };

  await supabase.from("mastery_events").insert({
    owner_id: user.id,
    concept_id: parsed.data.conceptId,
    source: "ai_quiz",
    rating: parsed.data.rating,
    delta: nextLevel - previousLevel,
    evidence_text: parsed.data.evidenceText ?? "AI quiz mastery check",
  });

  revalidatePath(`/classes/${parsed.data.classId}`);
  return { ok: true as const, masteryLevel: nextLevel };
}
