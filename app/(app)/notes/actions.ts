"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const CreateInput = z.object({
  title:        z.string().min(1).max(200).default("Untitled note"),
  assignmentId: z.string().uuid().nullable().optional(),
  classId:      z.string().uuid().nullable().optional(),
});

const SaveInput = z.object({
  id:              z.string().uuid(),
  title:           z.string().min(1).max(200),
  bodyText:        z.string().max(50_000),
  audioStorageKey: z.string().optional().nullable(),
  classId:         z.string().uuid().nullable().optional(),
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
      class_id:      parsed.data.classId ?? null,
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
      class_id:          parsed.data.classId ?? null,
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

const TriggerAudioInput = z.object({
  noteId:     z.string().uuid(),
  storageKey: z.string().min(1),
});

const MIN_TRANSCRIPT_CHARS = 20;

/**
 * Phase 10 orchestrator. Chains Whisper STT (awaited — need text to write body)
 * → notes.body_text write → fire-and-forget transcribe-note (Claude cleanup).
 *
 * Why not merge into saveNote: separation of concerns. saveNote is the auto-save
 * happy path; this is the upload-specific, two-step audio pipeline.
 *
 * Why await Whisper but fire-and-forget Claude:
 *   - Whisper text is needed RIGHT NOW to populate the body and run class routing.
 *   - Claude cleanup (outline + cleaned prose) is best-effort; page reload picks
 *     up transcript_text + outline_json when it lands. Matches Phase 5 pattern.
 *
 * Pitfall 7 (research): Whisper hallucinates on near-empty audio. We refuse to
 * call Claude cleanup when text length < 20 chars and surface a calm message.
 */
export async function triggerAudioTranscription(
  input: z.infer<typeof TriggerAudioInput>,
): Promise<
  | { ok: true; text: string; bodyTooShort?: false }
  | { ok: true; text: ""; bodyTooShort: true }
  | { ok: false; error: string }
> {
  const parsed = TriggerAudioInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  // Belt-and-suspenders: confirm the note belongs to the caller before we
  // burn Whisper tokens on it.
  const { data: note, error: noteErr } = await supabase
    .from("notes")
    .select("id, owner_id")
    .eq("id", parsed.data.noteId)
    .single();
  if (noteErr || !note || note.owner_id !== user.id) {
    return { ok: false, error: "Note not found." };
  }

  // Step 1 — Whisper STT (AWAITED). Pitfall 3 confirmed: invoke() works for
  // JSON-returning Edge Functions; only tts-generate needs direct fetch.
  const { data, error } = await supabase.functions.invoke("transcribe-voice", {
    body: {
      audioStorageKey: parsed.data.storageKey,
      bucket:          "note-audio",
    },
  });

  if (error || !data?.ok || typeof data.text !== "string") {
    return { ok: false, error: "We couldn't process your recording. Try again, or paste text." };
  }

  const text = data.text.trim();

  // Pitfall 7 — Whisper hallucinates on silence. Refuse to chain Claude.
  if (text.length < MIN_TRANSCRIPT_CHARS) {
    // Still save the storage key + any tiny text so the student isn't surprised.
    await supabase
      .from("notes")
      .update({
        body_text:         text,
        audio_storage_key: parsed.data.storageKey,
        updated_at:        new Date().toISOString(),
      })
      .eq("id", parsed.data.noteId)
      .eq("owner_id", user.id);
    return { ok: true, text: "", bodyTooShort: true };
  }

  // Step 2 — write the raw transcript as body_text + persist audio_storage_key.
  const { error: updErr } = await supabase
    .from("notes")
    .update({
      body_text:         text,
      audio_storage_key: parsed.data.storageKey,
      updated_at:        new Date().toISOString(),
    })
    .eq("id", parsed.data.noteId)
    .eq("owner_id", user.id);

  if (updErr) return { ok: false, error: updErr.message };

  // Step 3 — fire-and-forget Claude cleanup. Same pattern as Phase 5.
  // Never await — never block the response. Failures are logged server-side.
  void supabase.functions
    .invoke("transcribe-note", { body: { noteId: parsed.data.noteId } })
    .catch((e) => console.warn("transcribe-note kickoff", e));

  revalidatePath("/notes");
  revalidatePath(`/notes/${parsed.data.noteId}`);

  return { ok: true, text };
}

/**
 * Phase 11: F04-PHOTO / F08-NOTE — photo & PDF upload to Supabase Storage.
 * Mirrors uploadNoteAudio but uses the note-docs bucket and accepts the
 * "doc" FormData field (image or PDF; HEIC is already converted to JPEG
 * by DocUploadTab before this action runs — see lib/notes/heic-convert.ts
 * and Pitfall 1 in RESEARCH.md).
 */
export async function uploadNoteDoc(
  formData: FormData,
): Promise<{ ok: true; storageKey: string } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const file = formData.get("doc") as File | null;
  if (!file) return { ok: false, error: "No file provided." };

  // Trust the file extension (DocUploadTab has already validated + converted HEIC).
  // Default to "jpg" if missing — Storage requires a key with extension.
  const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
  const storageKey = `${user.id}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from("note-docs")
    .upload(storageKey, file, { contentType: file.type });

  if (error) return { ok: false, error: error.message };
  return { ok: true, storageKey };
}

const TriggerDocInput = z.object({
  noteId:     z.string().uuid(),
  storageKey: z.string().min(1),
});

const MIN_DOC_EXTRACT_CHARS = 20;

/**
 * Phase 11 orchestrator. Mirrors triggerAudioTranscription (Phase 10).
 *
 * Why a separate action from triggerAudioTranscription: keeps each pipeline
 * single-purpose. Storage bucket, Edge Function, and downstream state are
 * different enough that conflating them would obscure the flow.
 *
 * Why AWAIT extract-note-doc but not transcribe-note: extract-note-doc
 * INTERNALLY fires-and-forgets transcribe-note. We only need its text result
 * to (a) confirm body_text was written (the Edge Function handles the write) and
 * (b) return text for class routing in the client via scoreClassMatch.
 *
 * Pitfall 5 (RESEARCH.md): extract returns tooShort:true when text < 20 chars
 * (matches Phase 10 Pitfall 7 for Whisper). We surface bodyTooShort:true so
 * the UI shows a calm message.
 */
export async function triggerDocExtraction(
  input: z.infer<typeof TriggerDocInput>,
): Promise<
  | { ok: true; text: string; bodyTooShort?: false }
  | { ok: true; text: ""; bodyTooShort: true }
  | { ok: false; error: string }
> {
  const parsed = TriggerDocInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  // Belt-and-suspenders: confirm the note belongs to the caller.
  const { data: note, error: noteErr } = await supabase
    .from("notes")
    .select("id, owner_id")
    .eq("id", parsed.data.noteId)
    .single();
  if (noteErr || !note || note.owner_id !== user.id) {
    return { ok: false, error: "Note not found." };
  }

  // AWAITED: extract-note-doc runs Claude Vision/PDF synchronously.
  // It also writes body_text + doc_storage_key and fires-and-forgets
  // transcribe-note internally — we don't have to chain it here.
  const { data, error } = await supabase.functions.invoke("extract-note-doc", {
    body: {
      storageKey: parsed.data.storageKey,
      noteId:     parsed.data.noteId,
      bucket:     "note-docs",
    },
  });

  if (error || !data?.ok) {
    return { ok: false, error: "We couldn't process your file. Try a clearer photo or a smaller PDF." };
  }

  const text = typeof data.text === "string" ? data.text : "";

  // Pitfall 5 surface: tooShort comes back from extract-note-doc directly.
  if (data.tooShort === true || text.length < MIN_DOC_EXTRACT_CHARS) {
    revalidatePath("/notes");
    revalidatePath(`/notes/${parsed.data.noteId}`);
    return { ok: true, text: "", bodyTooShort: true };
  }

  revalidatePath("/notes");
  revalidatePath(`/notes/${parsed.data.noteId}`);

  return { ok: true, text };
}
