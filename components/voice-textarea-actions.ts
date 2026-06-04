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

export async function transcribeVoiceBlob(
  formData: FormData,
): Promise<{ ok: true; text: string; storageKey: string } | { ok: false; error: string; storageKey?: string }> {
  const uploadResult = await uploadVoiceBlob(formData);
  if (!uploadResult.ok) return uploadResult;

  const supabase = await createClient();
  const { data, error } = await supabase.functions.invoke("transcribe-voice", {
    body: { audioStorageKey: uploadResult.storageKey, bucket: "note-audio" },
  });

  if (error) {
    console.error("Voice transcription function unavailable:", error);
    return {
      ok: false,
      storageKey: uploadResult.storageKey,
      error: "Diana recorded the audio, but transcription is not connected right now. Check the transcribe-voice Edge Function deployment and secrets.",
    };
  }

  if (!data?.ok || typeof data.text !== "string" || !data.text.trim()) {
    return {
      ok: false,
      storageKey: uploadResult.storageKey,
      error: "Diana recorded the audio, but no transcript came back. Try again or use the typed fallback.",
    };
  }

  return {
    ok: true,
    storageKey: uploadResult.storageKey,
    text: data.text.trim(),
  };
}
