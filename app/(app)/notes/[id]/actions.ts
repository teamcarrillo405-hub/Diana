"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const IdInput = z.object({ id: z.string().uuid() });

export async function deleteNote(
  input: z.infer<typeof IdInput>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = IdInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { error } = await supabase
    .from("notes")
    .delete()
    .eq("id", parsed.data.id)
    .eq("owner_id", user.id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/notes");
  return { ok: true };
}

/**
 * Fire-and-forget: invoke the transcribe-note Edge Function. We do NOT await the
 * AI result here — the function writes transcript_text + outline_json directly
 * on the notes row and the next page load picks it up. Same pattern as
 * triggerClassification in inbox/[id]/actions.ts.
 */
export async function triggerTranscript(
  input: z.infer<typeof IdInput>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = IdInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  // Fire-and-forget. We invoke but do not await the AI body.
  void supabase.functions.invoke("transcribe-note", {
    body: { noteId: parsed.data.id },
  });

  return { ok: true };
}
