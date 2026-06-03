"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createCard } from "@/lib/fsrs/fsrs";
import { effectiveAiMode, type AiMode } from "@/lib/portal/teacher";
import {
  buildFallbackStudyArtifact,
  parseStudyArtifactResponse,
  type StudyArtifact,
  type StudyArtifactSourceType,
  type StudyArtifactType,
} from "@/lib/study-helper/artifacts";
import type { StudyHelperMode } from "@/lib/study-helper/modes";
import type { Json } from "@/lib/supabase/types";

const StudyArtifactInput = z.object({
  sourceType: z.enum(["assignment", "note"]),
  sourceId: z.string().uuid(),
  artifactType: z.enum(["study_guide", "practice_test", "flashcard_set"]),
  studyMode: z.enum(["guided_steps", "visual_breakdown", "retrieval_quiz", "flashcard_builder"]),
});

const SaveArtifactCardsInput = z.object({
  artifactId: z.string().uuid(),
});

type StudySource = {
  sourceType: StudyArtifactSourceType;
  sourceId: string;
  title: string;
  text: string;
  classId: string | null;
  aiMode: AiMode;
  assignmentId: string | null;
  revalidatePath: string;
};

export async function generateStudyArtifact(
  input: z.input<typeof StudyArtifactInput>,
): Promise<{ ok: true; id: string; artifact: StudyArtifact } | { ok: false; error: string }> {
  const parsed = StudyArtifactInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Choose a study tool first." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const source = parsed.data.sourceType === "assignment"
    ? await loadAssignmentSource(supabase, user.id, parsed.data.sourceId)
    : await loadNoteSource(supabase, user.id, parsed.data.sourceId);
  if (!source) return { ok: false, error: "Source material was not found." };
  if (source.text.trim().length < 20) return { ok: false, error: "Add a little more class material first." };
  if (source.aiMode === "red" || source.aiMode === "yellow") {
    return { ok: false, error: "AI study artifacts are off for this class. You can still make cards manually from your own highlights." };
  }

  const classContext = source.classId
    ? await loadClassContext(supabase, user.id, source.classId, source.sourceType, source.sourceId)
    : "";

  const { data, error } = await supabase.functions.invoke("study-artifacts", {
    body: {
      ownerId: user.id,
      assignmentId: source.assignmentId,
      aiMode: source.aiMode,
      artifactType: parsed.data.artifactType,
      studyMode: parsed.data.studyMode,
      sourceType: source.sourceType,
      sourceTitle: source.title,
      sourceText: source.text,
      classContext,
    },
  });

  if (data?.error) return { ok: false, error: calmArtifactError(String(data.error)) };
  if (error) return { ok: false, error: calmArtifactError(error.message) };

  const raw = String((data as { content?: unknown } | null)?.content ?? "");
  const artifact = raw
    ? parseStudyArtifactResponse(raw, {
        type: parsed.data.artifactType,
        sourceTitle: source.title,
        sourceType: source.sourceType,
        mode: parsed.data.studyMode,
        sourceText: source.text,
      })
    : buildFallbackStudyArtifact({
        type: parsed.data.artifactType,
        sourceTitle: source.title,
        sourceType: source.sourceType,
        mode: parsed.data.studyMode,
        sourceText: source.text,
      });

  const { data: row, error: insertErr } = await supabase
    .from("study_artifacts")
    .insert({
      owner_id: user.id,
      class_id: source.classId,
      source_type: source.sourceType,
      source_id: source.sourceId,
      artifact_type: parsed.data.artifactType,
      study_mode: parsed.data.studyMode,
      title: artifact.title,
      payload: artifact as unknown as Json,
      ai_policy: source.aiMode,
    })
    .select("id")
    .single();

  if (insertErr || !row) return { ok: false, error: insertErr?.message ?? "Could not save study artifact." };

  await recordStudyArtifactSignal({
    supabase,
    ownerId: user.id,
    assignmentId: source.assignmentId,
    source,
    artifactId: row.id,
    artifactType: parsed.data.artifactType,
    studyMode: parsed.data.studyMode,
    event: "artifact_generated",
  });

  revalidatePath(source.revalidatePath);
  revalidatePath("/flashcards");
  return { ok: true, id: row.id, artifact };
}

export async function saveArtifactFlashcards(
  input: z.input<typeof SaveArtifactCardsInput>,
): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  const parsed = SaveArtifactCardsInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Choose a saved study set first." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data: artifact, error } = await supabase
    .from("study_artifacts")
    .select("id, owner_id, source_type, source_id, artifact_type, study_mode, title, payload, class_id")
    .eq("id", parsed.data.artifactId)
    .eq("owner_id", user.id)
    .single();
  if (error || !artifact) return { ok: false, error: "Study set was not found." };

  const payload = artifact.payload as unknown as StudyArtifact;
  const cards = Array.isArray(payload.cards) ? payload.cards.slice(0, 12) : [];
  if (cards.length === 0) return { ok: false, error: "This study set does not have card drafts yet." };

  const now = new Date();
  const rows = cards.map((card, index) => {
    const fresh = createCard(new Date(now.getTime() + index));
    return {
      owner_id: user.id,
      source_note_id: artifact.source_type === "note" ? artifact.source_id : null,
      concept_id: null,
      front: card.front,
      back: [card.back, card.sourceAnchor ? `Source: ${card.sourceAnchor}` : ""].filter(Boolean).join("\n\n"),
      image_storage_key: null,
      state: fresh.state,
      stability: fresh.stability,
      difficulty: fresh.difficulty,
      due_at: fresh.dueAt,
      reps: fresh.reps,
      lapses: fresh.lapses,
      last_review_at: fresh.lastReviewAt,
    };
  });

  const { error: insertErr } = await supabase.from("flashcards").insert(rows);
  if (insertErr) return { ok: false, error: insertErr.message };

  await recordStudyArtifactSignal({
    supabase,
    ownerId: user.id,
    assignmentId: artifact.source_type === "assignment" ? artifact.source_id : null,
    source: {
      sourceType: artifact.source_type,
      sourceId: artifact.source_id,
    },
    artifactId: artifact.id,
    artifactType: artifact.artifact_type,
    studyMode: artifact.study_mode,
    event: "cards_saved",
    count: cards.length,
  });

  revalidatePath("/flashcards");
  revalidatePath(artifact.source_type === "assignment" ? `/assignments/${artifact.source_id}` : `/notes/${artifact.source_id}`);
  return { ok: true, count: cards.length };
}

async function loadAssignmentSource(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ownerId: string,
  assignmentId: string,
): Promise<StudySource | null> {
  const { data } = await supabase
    .from("assignments")
    .select("id, owner_id, title, description, class_id, kind, rubric_text, ai_mode_override, classes(ai_mode)")
    .eq("id", assignmentId)
    .eq("owner_id", ownerId)
    .single();
  if (!data) return null;

  const classMode: AiMode = classAiMode(data.classes);
  const override: AiMode | null =
    data.ai_mode_override === "red" || data.ai_mode_override === "yellow" || data.ai_mode_override === "green"
      ? data.ai_mode_override
      : null;

  return {
    sourceType: "assignment",
    sourceId: data.id,
    title: data.title,
    text: [
      `Assignment: ${data.title}`,
      `Kind: ${data.kind}`,
      data.description ? `Prompt:\n${data.description}` : "",
      data.rubric_text ? `Rubric:\n${data.rubric_text}` : "",
    ].filter(Boolean).join("\n\n").slice(0, 10000),
    classId: data.class_id,
    aiMode: effectiveAiMode(classMode, override),
    assignmentId: data.id,
    revalidatePath: `/assignments/${data.id}`,
  };
}

async function loadNoteSource(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ownerId: string,
  noteId: string,
): Promise<StudySource | null> {
  const { data } = await supabase
    .from("notes")
    .select("id, owner_id, title, body_text, transcript_text, outline_json, class_id, assignment_id, classes(ai_mode)")
    .eq("id", noteId)
    .eq("owner_id", ownerId)
    .single();
  if (!data) return null;

  return {
    sourceType: "note",
    sourceId: data.id,
    title: data.title,
    text: [
      `Note: ${data.title}`,
      data.body_text,
      data.transcript_text ?? "",
      outlineToText(data.outline_json),
    ].filter(Boolean).join("\n\n").slice(0, 10000),
    classId: data.class_id,
    aiMode: classAiMode(data.classes),
    assignmentId: data.assignment_id ?? null,
    revalidatePath: `/notes/${data.id}`,
  };
}

async function loadClassContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ownerId: string,
  classId: string,
  sourceType: StudyArtifactSourceType,
  sourceId: string,
): Promise<string> {
  const [notesResult, assignmentsResult] = await Promise.all([
    supabase
      .from("notes")
      .select("id, title, body_text, transcript_text, tags, ai_suggested_tags")
      .eq("owner_id", ownerId)
      .eq("class_id", classId)
      .neq(sourceType === "note" ? "id" : "title", sourceType === "note" ? sourceId : "__none__")
      .order("updated_at", { ascending: false })
      .limit(5),
    supabase
      .from("assignments")
      .select("id, title, description, kind, rubric_text")
      .eq("owner_id", ownerId)
      .eq("class_id", classId)
      .neq(sourceType === "assignment" ? "id" : "title", sourceType === "assignment" ? sourceId : "__none__")
      .order("updated_at", { ascending: false })
      .limit(4),
  ]);

  return [
    ...(notesResult.data ?? []).map((note) => [
      `Class note: ${note.title}`,
      [...(note.tags ?? []), ...(note.ai_suggested_tags ?? [])].length > 0
        ? `Tags: ${[...(note.tags ?? []), ...(note.ai_suggested_tags ?? [])].join(", ")}`
        : "",
      (note.body_text ?? "").slice(0, 400),
      (note.transcript_text ?? "").slice(0, 400),
    ].filter(Boolean).join("\n")),
    ...(assignmentsResult.data ?? []).map((assignment) => [
      `Related assignment: ${assignment.title}`,
      `Kind: ${assignment.kind}`,
      (assignment.description ?? "").slice(0, 350),
      (assignment.rubric_text ?? "").slice(0, 350),
    ].filter(Boolean).join("\n")),
  ].join("\n\n---\n\n").slice(0, 5000);
}

async function recordStudyArtifactSignal({
  supabase,
  ownerId,
  assignmentId,
  source,
  artifactId,
  artifactType,
  studyMode,
  event,
  count,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  ownerId: string;
  assignmentId: string | null;
  source: Pick<StudySource, "sourceType" | "sourceId">;
  artifactId: string;
  artifactType: StudyArtifactType;
  studyMode: StudyHelperMode;
  event: "artifact_generated" | "cards_saved";
  count?: number;
}) {
  await supabase.from("task_signals").insert({
    owner_id: ownerId,
    assignment_id: assignmentId,
    kind: "study_helper_event",
    value: {
      event,
      artifactId,
      artifactType,
      mode: studyMode,
      sourceType: source.sourceType,
      sourceId: source.sourceId,
      count: count ?? null,
    } as Json,
  });
}

function classAiMode(classes: unknown): AiMode {
  const cls = Array.isArray(classes) ? classes[0] : classes;
  if (cls && typeof cls === "object" && "ai_mode" in cls) {
    const mode = (cls as { ai_mode?: unknown }).ai_mode;
    if (mode === "red" || mode === "yellow") return mode;
  }
  return "green";
}

function outlineToText(value: Json | null): string {
  if (!Array.isArray(value)) return "";
  return value
    .map((node) => {
      const item = node as { heading?: unknown; bullets?: unknown };
      return [
        typeof item.heading === "string" ? item.heading : "",
        ...(Array.isArray(item.bullets) ? item.bullets.filter((bullet): bullet is string => typeof bullet === "string") : []),
      ].filter(Boolean).join("\n");
    })
    .filter(Boolean)
    .join("\n\n");
}

function calmArtifactError(message: string): string {
  if (message.includes("quota")) return "You've used your AI quota for today. Manual cards still work.";
  if (message.includes("AI not available")) return "AI study artifacts are off for this class. Manual cards still work.";
  return "Study artifacts are unavailable right now. Manual cards still work.";
}
