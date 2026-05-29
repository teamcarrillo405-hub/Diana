"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createCard } from "@/lib/fsrs/fsrs";

const CreateInput = z.object({
  front:           z.string().min(1).max(2000),
  back:            z.string().min(1).max(4000),
  sourceNoteId:    z.string().uuid().nullable().optional(),
  imageStorageKey: z.string().optional().nullable(),
});

const DeleteInput = z.object({ id: z.string().uuid() });

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

  const { data, error } = await supabase
    .from("flashcards")
    .insert({
      owner_id:          user.id,
      front:             parsed.data.front,
      back:              parsed.data.back,
      source_note_id:    parsed.data.sourceNoteId ?? null,
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

export async function deleteFlashcard(
  input: z.infer<typeof DeleteInput>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = DeleteInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { error } = await supabase
    .from("flashcards")
    .delete()
    .eq("id", parsed.data.id)
    .eq("owner_id", user.id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/flashcards");
  revalidatePath("/dashboard");
  return { ok: true };
}
