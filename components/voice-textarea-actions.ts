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
  const result = await invokeVoiceTranscription(supabase, uploadResult.storageKey);

  return result.ok
    ? { ok: true, storageKey: uploadResult.storageKey, text: result.text }
    : { ok: false, storageKey: uploadResult.storageKey, error: result.error };
}

export async function detectWakePhraseBlob(
  formData: FormData,
): Promise<{ ok: true; heard: boolean; text: string } | { ok: false; error: string }> {
  const uploadResult = await uploadVoiceBlob(formData);
  if (!uploadResult.ok) return uploadResult;

  const supabase = await createClient();
  try {
    const result = await invokeVoiceTranscription(supabase, uploadResult.storageKey);
    if (!result.ok) return { ok: false, error: result.error };

    return {
      ok: true,
      heard: containsWakePhrase(result.text),
      text: result.text,
    };
  } finally {
    void supabase.storage.from("note-audio").remove([uploadResult.storageKey]);
  }
}

async function invokeVoiceTranscription(
  supabase: Awaited<ReturnType<typeof createClient>>,
  storageKey: string,
): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  const { data, error } = await supabase.functions.invoke("transcribe-voice", {
    body: { audioStorageKey: storageKey, bucket: "note-audio" },
  });

  if (error) {
    console.error("Voice transcription function unavailable:", error);
    return {
      ok: false,
      error: "Diana recorded the audio, but transcription is not connected right now. Check the transcribe-voice Edge Function deployment and secrets.",
    };
  }

  if (data?.ok === false) {
    const message = typeof data.error === "string" ? data.error : "Transcription did not finish.";
    const detail = typeof data.detail === "string" ? ` ${data.detail}` : "";
    return {
      ok: false,
      error: `${message}${detail}`.trim(),
    };
  }

  if (!data?.ok || typeof data.text !== "string" || !data.text.trim()) {
    return {
      ok: false,
      error: "Diana recorded the audio, but no transcript came back. Try again or use the typed fallback.",
    };
  }

  return {
    ok: true,
    text: data.text.trim(),
  };
}

function containsWakePhrase(value: string) {
  return /\b(hey|hi|okay|ok)\s+diana\b/i.test(value);
}
