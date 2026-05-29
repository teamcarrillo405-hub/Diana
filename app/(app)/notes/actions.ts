"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const CreateInput = z.object({
  title: z.string().min(1).max(200).default("Untitled note"),
  assignmentId: z.string().uuid().nullable().optional(),
});

const SaveInput = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200),
  bodyText: z.string().max(50_000),
  audioStorageKey: z.string().optional().nullable(),
});

export async function createNote(
  input: z.infer<typeof CreateInput>,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const parsed = CreateInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data, error } = await supabase
    .from("notes")
    .insert({
      owner_id:      user.id,
      title:         parsed.data.title,
      assignment_id: parsed.data.assignmentId ?? null,
      body_text:     "",
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  revalidatePath("/notes");
  return { ok: true, id: data.id };
}

export async function saveNote(
  input: z.infer<typeof SaveInput>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = SaveInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { error } = await supabase
    .from("notes")
    .update({
      title:             parsed.data.title,
      body_text:         parsed.data.bodyText,
      audio_storage_key: parsed.data.audioStorageKey ?? null,
      updated_at:        new Date().toISOString(),
    })
    .eq("id", parsed.data.id)
    .eq("owner_id", user.id); // belt-and-suspenders alongside RLS

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function uploadNoteAudio(
  formData: FormData,
): Promise<{ ok: true; storageKey: string } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const file = formData.get("audio") as File | null;
  if (!file) return { ok: false, error: "No audio provided." };

  const ext = file.name.split(".").pop() ?? "webm";
  const storageKey = `${user.id}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from("note-audio")
    .upload(storageKey, file, { contentType: file.type });

  if (error) return { ok: false, error: error.message };
  return { ok: true, storageKey };
}
