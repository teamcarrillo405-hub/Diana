"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createCard } from "@/lib/fsrs/fsrs";
import { normalizeConceptNames } from "@/lib/mastery/concepts";

const CreateInput = z.object({
  front:           z.string().min(1).max(2000),
  back:            z.string().min(1).max(4000),
  sourceNoteId:    z.string().uuid().nullable().optional(),
  imageStorageKey: z.string().optional().nullable(),
});


export async function createFlashcard(
  input: z.infer<typeof CreateInput>,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const parsed = CreateInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  // Initialize FSRS card state — new, due now, stability=0, difficulty=0.
  const fresh = createCard(new Date());
  const conceptId = parsed.data.sourceNoteId
    ? await resolveConceptForSourceNote({
        supabase,
        ownerId: user.id,
        sourceNoteId: parsed.data.sourceNoteId,
        fallbackName: parsed.data.front,
      })
    : null;

  const { data, error } = await supabase
    .from("flashcards")
    .insert({
      owner_id:          user.id,
      front:             parsed.data.front,
      back:              parsed.data.back,
      source_note_id:    parsed.data.sourceNoteId ?? null,
      concept_id:        conceptId,
      image_storage_key: parsed.data.imageStorageKey ?? null,
      state:             fresh.state,
      stability:         fresh.stability,
      difficulty:        fresh.difficulty,
      due_at:            fresh.dueAt,
      reps:              fresh.reps,
      lapses:            fresh.lapses,
      last_review_at:    fresh.lastReviewAt,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  revalidatePath("/flashcards");
  revalidatePath("/dashboard");
  return { ok: true, id: data.id };
}

async function resolveConceptForSourceNote({
  supabase,
  ownerId,
  sourceNoteId,
  fallbackName,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  ownerId: string;
  sourceNoteId: string;
  fallbackName: string;
}): Promise<string | null> {
  const { data: note } = await supabase
    .from("notes")
    .select("class_id, tags, ai_suggested_tags, title")
    .eq("id", sourceNoteId)
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (!note?.class_id) return null;

  const name = normalizeConceptNames([
    ...((note.tags ?? []) as string[]),
    ...((note.ai_suggested_tags ?? []) as string[]),
    note.title ?? "",
    fallbackName,
  ])[0];
  if (!name) return null;

  const { data: existing } = await supabase
    .from("mastery_concepts")
    .select("id")
    .eq("owner_id", ownerId)
    .eq("class_id", note.class_id)
    .eq("name", name)
    .maybeSingle();
  if (existing?.id) return existing.id;

  const { data } = await supabase
    .from("mastery_concepts")
    .insert({ owner_id: ownerId, class_id: note.class_id, name, source: "flashcard" })
    .select("id")
    .single();
  return data?.id ?? null;
}

