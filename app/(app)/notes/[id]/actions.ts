"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createCard } from "@/lib/fsrs/fsrs";
import { normalizeNoteTags, suggestTagsFromText } from "@/lib/notes/tags";
import {
  parseDiagramAnnotationResponse,
  parseVisualToolResponse,
  type DiagramAnnotationResult,
  type VisualToolMode,
  type VisualToolResult,
} from "@/lib/visual-learning/tools";

const IdInput = z.object({ id: z.string().uuid() });

const UpdateClassInput = z.object({
  id: z.string().uuid(),
  classId: z.string().uuid().nullable(),
});

const UpdateTagsInput = z.object({
  id: z.string().uuid(),
  tags: z.array(z.string().max(64)).max(12),
});

const SelectionCardInput = z.object({
  noteId: z.string().uuid(),
  selectedText: z.string().min(3).max(1200),
});

const VisualToolInput = z.object({
  noteId: z.string().uuid(),
  mode: z.enum(["mind_map", "concept_graph", "timeline", "comparison_table"]),
});

const DiagramInput = z.object({
  noteId: z.string().uuid(),
  storageKey: z.string().min(1).max(500),
});

export async function updateNoteClass(
  input: z.infer<typeof UpdateClassInput>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = UpdateClassInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { error } = await supabase
    .from("notes")
    .update({ class_id: parsed.data.classId, updated_at: new Date().toISOString() })
    .eq("id", parsed.data.id)
    .eq("owner_id", user.id);

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/notes/${parsed.data.id}`);
  revalidatePath("/notes");
  return { ok: true };
}

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

export async function updateNoteTags(
  input: z.infer<typeof UpdateTagsInput>,
): Promise<{ ok: true; tags: string[] } | { ok: false; error: string }> {
  const parsed = UpdateTagsInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const tags = normalizeNoteTags(parsed.data.tags);
  const { error } = await supabase
    .from("notes")
    .update({ tags, updated_at: new Date().toISOString() })
    .eq("id", parsed.data.id)
    .eq("owner_id", user.id);

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/notes/${parsed.data.id}`);
  revalidatePath("/notes");
  return { ok: true, tags };
}

export async function suggestNoteTags(
  input: z.infer<typeof IdInput>,
): Promise<{ ok: true; tags: string[] } | { ok: false; error: string }> {
  const parsed = IdInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data: note, error: noteErr } = await supabase
    .from("notes")
    .select("id, owner_id, title, body_text, transcript_text, class_id, tags, ai_suggested_tags")
    .eq("id", parsed.data.id)
    .single();
  if (noteErr || !note || note.owner_id !== user.id) {
    return { ok: false, error: "Note not found." };
  }

  const fallback = suggestTagsFromText([note.title, note.body_text, note.transcript_text ?? ""].join("\n"));
  const { data, error } = await supabase.functions.invoke("note-tags", {
    body: { ownerId: user.id, noteId: parsed.data.id },
  });

  const tags = normalizeNoteTags(
    !error && Array.isArray(data?.tags) ? data.tags : fallback,
    6,
  );

  const { error: updateErr } = await supabase
    .from("notes")
    .update({ ai_suggested_tags: tags, updated_at: new Date().toISOString() })
    .eq("id", parsed.data.id)
    .eq("owner_id", user.id);

  if (updateErr) return { ok: false, error: updateErr.message };
  revalidatePath(`/notes/${parsed.data.id}`);
  revalidatePath("/notes");
  return { ok: true, tags };
}

export async function generateVisualTool(
  input: z.infer<typeof VisualToolInput>,
): Promise<{ ok: true; result: VisualToolResult } | { ok: false; error: string }> {
  const parsed = VisualToolInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data: note, error: noteErr } = await supabase
    .from("notes")
    .select("id, owner_id, title, body_text, transcript_text, classes(ai_mode)")
    .eq("id", parsed.data.noteId)
    .single();
  if (noteErr || !note || note.owner_id !== user.id) {
    return { ok: false, error: "Note not found." };
  }

  const aiMode = noteAiMode(note);
  if (aiMode === "red" || aiMode === "yellow") {
    return { ok: false, error: "AI is off for this class. You can change that in class settings." };
  }

  const text = [note.body_text, note.transcript_text ?? ""].join("\n").trim();
  if (text.length < 20) return { ok: false, error: "Add a little more note text first." };

  const { data, error } = await supabase.functions.invoke("visual-tools", {
    body: {
      ownerId: user.id,
      noteId: note.id,
      aiMode,
      mode: parsed.data.mode,
      noteTitle: note.title,
      text,
    },
  });

  if (error || data?.error) {
    return { ok: false, error: data?.error ?? "Visual tool is unavailable right now." };
  }

  return {
    ok: true,
    result: parseVisualToolResponse(
      String(data?.content ?? ""),
      parsed.data.mode as VisualToolMode,
      note.title,
      text,
    ),
  };
}

export async function uploadDiagramImage(
  formData: FormData,
): Promise<{ ok: true; storageKey: string } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const file = formData.get("diagram") as File | null;
  if (!file) return { ok: false, error: "No image provided." };
  const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
  const allowed = new Set(["jpg", "jpeg", "png", "webp", "gif"]);
  if (!allowed.has(ext)) {
    return { ok: false, error: "Pick a .jpg, .png, .webp, or .gif image." };
  }
  if (file.size >= 10 * 1024 * 1024) {
    return { ok: false, error: "Images work best under 10 MB. Try a smaller crop." };
  }

  const storageKey = `${user.id}/diagram-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("note-docs")
    .upload(storageKey, file, { contentType: file.type });
  if (error) return { ok: false, error: error.message };
  return { ok: true, storageKey };
}

export async function annotateDiagram(
  input: z.infer<typeof DiagramInput>,
): Promise<{ ok: true; result: DiagramAnnotationResult } | { ok: false; error: string }> {
  const parsed = DiagramInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data: note, error: noteErr } = await supabase
    .from("notes")
    .select("id, owner_id, classes(ai_mode)")
    .eq("id", parsed.data.noteId)
    .single();
  if (noteErr || !note || note.owner_id !== user.id) {
    return { ok: false, error: "Note not found." };
  }

  const aiMode = noteAiMode(note);
  if (aiMode === "red" || aiMode === "yellow") {
    return { ok: false, error: "AI is off for this class. You can change that in class settings." };
  }

  const { data, error } = await supabase.functions.invoke("visual-tools", {
    body: {
      ownerId: user.id,
      noteId: note.id,
      aiMode,
      mode: "diagram_annotation",
      storageKey: parsed.data.storageKey,
      bucket: "note-docs",
    },
  });

  if (error || data?.error) {
    return { ok: false, error: data?.error ?? "Diagram annotation is unavailable right now." };
  }

  return { ok: true, result: parseDiagramAnnotationResponse(String(data?.content ?? "")) };
}

export async function createFlashcardFromSelection(
  input: z.infer<typeof SelectionCardInput>,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const parsed = SelectionCardInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Highlight a little more text." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data: note, error: noteErr } = await supabase
    .from("notes")
    .select("id, owner_id, title, body_text, transcript_text, class_id, tags, ai_suggested_tags")
    .eq("id", parsed.data.noteId)
    .single();
  if (noteErr || !note || note.owner_id !== user.id) {
    return { ok: false, error: "Note not found." };
  }

  const selected = parsed.data.selectedText.trim().replace(/\s+/g, " ");
  const searchable = [note.body_text, note.transcript_text ?? ""].join(" ").replace(/\s+/g, " ").toLowerCase();
  if (!searchable.includes(selected.toLowerCase())) {
    return { ok: false, error: "Highlight text from this note first." };
  }

  const fresh = createCard(new Date());
  const front = selected.length <= 180 ? `Explain: ${selected}` : `Review this from ${note.title}`;
  const conceptId = note.class_id
    ? await resolveConceptForNote({
        supabase,
        ownerId: user.id,
        classId: note.class_id,
        tags: [...(note.tags ?? []), ...(note.ai_suggested_tags ?? [])],
        fallbackName: note.title,
      })
    : null;

  const { data, error } = await supabase
    .from("flashcards")
    .insert({
      owner_id: user.id,
      front,
      back: selected,
      source_note_id: note.id,
      concept_id: conceptId,
      image_storage_key: null,
      state: fresh.state,
      stability: fresh.stability,
      difficulty: fresh.difficulty,
      due_at: fresh.dueAt,
      reps: fresh.reps,
      lapses: fresh.lapses,
      last_review_at: fresh.lastReviewAt,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  revalidatePath("/flashcards");
  revalidatePath(`/notes/${note.id}`);
  return { ok: true, id: data.id };
}

async function resolveConceptForNote({
  supabase,
  ownerId,
  classId,
  tags,
  fallbackName,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  ownerId: string;
  classId: string;
  tags: string[];
  fallbackName: string;
}): Promise<string | null> {
  const name = (tags[0] ?? fallbackName).toLowerCase().replace(/[^a-z0-9 -]/g, "").trim().slice(0, 48);
  if (name.length < 3) return null;
  const { data: existing } = await supabase
    .from("mastery_concepts")
    .select("id")
    .eq("owner_id", ownerId)
    .eq("class_id", classId)
    .eq("name", name)
    .maybeSingle();
  if (existing?.id) return existing.id;

  const { data } = await supabase
    .from("mastery_concepts")
    .insert({ owner_id: ownerId, class_id: classId, name, source: "flashcard" })
    .select("id")
    .single();
  return data?.id ?? null;
}

function noteAiMode(note: { classes?: unknown }): "red" | "yellow" | "green" {
  const joined = note.classes;
  const cls = Array.isArray(joined) ? joined[0] : joined;
  if (cls && typeof cls === "object" && "ai_mode" in cls) {
    const mode = (cls as { ai_mode?: unknown }).ai_mode;
    if (mode === "red" || mode === "yellow") return mode;
  }
  return "green";
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
