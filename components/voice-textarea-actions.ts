"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Upload a recorded voice blob to Supabase Storage (note-audio bucket).
 * Returns the storage key so VoiceTextarea can pass it to transcribe-voice.
 */
export async function uploadVoiceBlob(
  formData: FormData,
): Promise<{ ok: true; storageKey: string } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const file = formData.get("audio") as File | null;
  if (!file) return { ok: false, error: "No audio file provided." };

  const storageKey = `${user.id}/voice-${Date.now()}.webm`;

  const { error } = await supabase.storage
    .from("note-audio")
    .upload(storageKey, file, { contentType: file.type || "audio/webm" });

  if (error) return { ok: false, error: error.message };
  return { ok: true, storageKey };
}
