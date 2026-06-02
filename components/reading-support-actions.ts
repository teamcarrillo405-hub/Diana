"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createCard } from "@/lib/fsrs/fsrs";
import {
  adaptReadingLevelFallback,
  normalizeVocabularyWord,
  validVocabularyWord,
  type PhonicsBreakdown,
} from "@/lib/reading/vocabulary";

const AiModeInput = z.enum(["red", "yellow", "green"]);
const SourceInput = z.object({
  sourceType: z.enum(["note", "assignment"]),
  sourceId: z.string().uuid(),
});

const ReadingLevelInput = z.object({
  text: z.string().min(20).max(8000),
  target: z.enum(["simpler", "more_detail"]),
  aiMode: AiModeInput,
});

const AnnotationInput = SourceInput.extend({
  selectedText: z.string().min(1).max(1200),
  noteText: z.string().min(1).max(1000),
  color: z.enum(["amber", "sky", "violet", "emerald"]).default("amber"),
});

const VocabularyCardInput = SourceInput.extend({
  word: z.string().min(1).max(64),
  definition: z.string().min(1).max(600),
  contextText: z.string().max(700).optional(),
  phonics: z.object({
    syllables: z.array(z.string().min(1).max(32)).max(8),
    stress: z.string().max(120),
    pronunciation: z.string().max(120),
  }),
});

export async function adaptReadingLevel(
  input: z.infer<typeof ReadingLevelInput>,
): Promise<{ ok: true; text: string; fallback?: boolean } | { ok: false; error: string }> {
  const parsed = ReadingLevelInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid reading input." };
  if (parsed.data.aiMode === "red" || parsed.data.aiMode === "yellow") {
    return { ok: false, error: "AI reading support is off for this class." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data, error } = await supabase.functions.invoke("reading-level", {
    body: {
      ownerId: user.id,
      aiMode: parsed.data.aiMode,
      target: parsed.data.target,
      text: parsed.data.text,
    },
  });

  if (error || data?.error) {
    return {
      ok: true,
      text: adaptReadingLevelFallback(parsed.data.text, parsed.data.target),
      fallback: true,
    };
  }

  return {
    ok: true,
    text: typeof data?.text === "string" && data.text.trim()
      ? data.text.trim()
      : adaptReadingLevelFallback(parsed.data.text, parsed.data.target),
    fallback: Boolean(data?.fallback),
  };
}

export async function saveReadingAnnotation(
  input: z.infer<typeof AnnotationInput>,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const parsed = AnnotationInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Add a note for the highlight." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const source = await resolveSource(supabase, user.id, parsed.data.sourceType, parsed.data.sourceId);
  if (!source) return { ok: false, error: "Text source not found." };

  const { data, error } = await supabase
    .from("reading_annotations")
    .insert({
      owner_id: user.id,
      class_id: source.classId,
      note_id: source.noteId,
      assignment_id: source.assignmentId,
      selected_text: parsed.data.selectedText.trim().replace(/\s+/g, " "),
      note_text: parsed.data.noteText.trim(),
      color: parsed.data.color,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  revalidateSource(parsed.data.sourceType, parsed.data.sourceId);
  return { ok: true, id: data.id };
}

export async function saveVocabularyCard(
  input: z.infer<typeof VocabularyCardInput>,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const parsed = VocabularyCardInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Pick one vocabulary word first." };

  const word = normalizeVocabularyWord(parsed.data.word);
  if (!validVocabularyWord(word)) return { ok: false, error: "Pick one vocabulary word first." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const source = await resolveSource(supabase, user.id, parsed.data.sourceType, parsed.data.sourceId);
  if (!source) return { ok: false, error: "Text source not found." };

  const fresh = createCard(new Date());
  const back = vocabularyBack(parsed.data.definition, parsed.data.phonics, parsed.data.contextText);
  const { data: card, error: cardError } = await supabase
    .from("flashcards")
    .insert({
      owner_id: user.id,
      front: `Define: ${word}`,
      back,
      source_note_id: source.noteId,
      concept_id: null,
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

  if (cardError) return { ok: false, error: cardError.message };

  const { error: vocabError } = await supabase.from("vocabulary_terms").insert({
    owner_id: user.id,
    class_id: source.classId,
    note_id: source.noteId,
    assignment_id: source.assignmentId,
    flashcard_id: card.id,
    word,
    context_text: parsed.data.contextText?.trim() || null,
    definition: parsed.data.definition.trim(),
    phonics: parsed.data.phonics,
    source: "hover",
  });

  if (vocabError) return { ok: false, error: vocabError.message };
  revalidatePath("/flashcards");
  revalidateSource(parsed.data.sourceType, parsed.data.sourceId);
  return { ok: true, id: card.id };
}

async function resolveSource(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ownerId: string,
  sourceType: "note" | "assignment",
  sourceId: string,
): Promise<{ noteId: string | null; assignmentId: string | null; classId: string | null } | null> {
  if (sourceType === "note") {
    const { data } = await supabase
      .from("notes")
      .select("id, owner_id, class_id")
      .eq("id", sourceId)
      .single();
    if (!data || data.owner_id !== ownerId) return null;
    return { noteId: data.id, assignmentId: null, classId: data.class_id ?? null };
  }

  const { data } = await supabase
    .from("assignments")
    .select("id, owner_id, class_id")
    .eq("id", sourceId)
    .single();
  if (!data || data.owner_id !== ownerId) return null;
  return { noteId: null, assignmentId: data.id, classId: data.class_id ?? null };
}

function revalidateSource(sourceType: "note" | "assignment", sourceId: string) {
  revalidatePath(sourceType === "note" ? `/notes/${sourceId}` : `/assignments/${sourceId}`);
}

function vocabularyBack(definition: string, phonics: PhonicsBreakdown, contextText?: string): string {
  return [
    definition.trim(),
    phonics.pronunciation ? `Pronunciation: ${phonics.pronunciation}` : "",
    phonics.stress ? phonics.stress : "",
    contextText ? `Context: ${contextText.trim().slice(0, 220)}` : "",
  ].filter(Boolean).join("\n\n");
}
