"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createCard } from "@/lib/fsrs/fsrs";
import { normalizeConceptNames } from "@/lib/mastery/concepts";
import { masteryLevelFromAiQuizResult } from "@/lib/mastery/concepts";
import { effectiveAiMode, type AiMode } from "@/lib/portal/teacher";
import { buildSourcePacket } from "@/lib/assignment-sources";
import { recordStudentStateSnapshot } from "@/lib/student-state/server";
import {
  buildFallbackStudyArtifact,
  completeStudyArtifact,
  isStudyArtifactSourceType,
  isStudyArtifactType,
  parseStudyArtifactResponse,
  withEditedCards,
  type StudyArtifact,
  type StudyArtifactCard,
  type StudyArtifactSourceType,
  type StudyArtifactType,
} from "@/lib/study-helper/artifacts";
import {
  mergePracticeProgress,
  normalizePracticeProgress,
  type PracticeProgress,
} from "@/lib/study-helper/practice-progress";
import {
  scorePracticeTest,
  type PracticeScoreSummary,
} from "@/lib/study-helper/practice-scoring";
import {
  normalizeStudyHelperMode,
  type StudyHelperMode,
} from "@/lib/study-helper/modes";
import { coverageWindowStart, looksLikeTest, previousTestDueAt } from "@/lib/test-prep/plan";
import type { Json } from "@/lib/supabase/types";

const StudyArtifactInput = z.object({
  sourceType: z.enum(["assignment", "note"]),
  sourceId: z.string().uuid(),
  artifactType: z.enum(["study_guide", "practice_test", "flashcard_set"]),
  studyMode: z.enum(["guided_steps", "visual_breakdown", "retrieval_quiz", "flashcard_builder"]),
});

const SaveArtifactCardsInput = z.object({
  artifactId: z.string().uuid(),
  cards: z.array(z.object({
    front: z.string().trim().min(1).max(240),
    back: z.string().trim().min(1).max(600),
    sourceAnchor: z.string().trim().max(120).default("Source material"),
    studentRequiredAction: z.string().trim().max(140).optional(),
  })).max(12).optional(),
});

const SavePracticeProgressInput = z.object({
  artifactId: z.string().uuid(),
  currentQuestion: z.number().int().min(0).max(19),
  responses: z.array(z.object({
    questionIndex: z.number().int().min(0).max(19),
    response: z.string().trim().min(1).max(2_000),
  })).max(20),
  completed: z.boolean(),
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

type AssignmentSourceRow = {
  source_type: string;
  title: string;
  extracted_text: string | null;
  source_location: string | null;
};

type AssignmentSourceQuery = {
  eq(column: string, value: string): AssignmentSourceQuery;
  order(
    column: string,
    options: { ascending: boolean },
  ): Promise<{ data: AssignmentSourceRow[] | null }>;
};

type AssignmentSourceClient = {
  from(table: "assignment_sources"): {
    select(columns: string): AssignmentSourceQuery;
  };
};

type PracticeAttemptRpcClient = {
  rpc(
    name: "save_practice_attempt",
    args: {
      p_artifact_id: string;
      p_assignment_id: string | null;
      p_attempt_number: number;
      p_completed: boolean;
      p_result: Json;
      p_responses: Json;
    },
  ): Promise<{ data: string | null; error: { message: string } | null }>;
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

  // Test Prep Engine: when the source is a quiz/test/final, scope class
  // context to the coverage window (since the previous test) so practice
  // questions reflect the student's curriculum position, not the whole year.
  let coveredSince: string | null = null;
  if (source.sourceType === "assignment" && source.classId) {
    const { data: sourceAssignment } = await supabase
      .from("assignments")
      .select("title, kind, due_at")
      .eq("id", source.sourceId)
      .maybeSingle();
    if (sourceAssignment && looksLikeTest(sourceAssignment.title, sourceAssignment.kind) && sourceAssignment.due_at) {
      const { data: classAssignments } = await supabase
        .from("assignments")
        .select("title, kind, due_at")
        .eq("class_id", source.classId)
        .not("due_at", "is", null)
        .order("due_at", { ascending: false })
        .limit(40);
      coveredSince = coverageWindowStart(
        previousTestDueAt(classAssignments ?? [], sourceAssignment.due_at),
        new Date(),
      );
    }
  }

  const classContext = source.classId
    ? await loadClassContext(supabase, user.id, source.classId, source.sourceType, source.sourceId, coveredSince)
    : "";

  let raw = "";
  const deterministicQa =
    process.env.NODE_ENV !== "production" && process.env.QA_CREATE_USER === "true";
  if (!deterministicQa) {
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
    raw = String((data as { content?: unknown } | null)?.content ?? "");
  }

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
      source_anchor_count: countArtifactAnchors(artifact),
      artifact_edit_state: artifact.editState as unknown as Json,
      practice_settings: artifact.practiceSettings as unknown as Json,
      visual_breakdown: (artifact.visualBreakdown ?? {}) as unknown as Json,
      authorship_receipt: artifact.authorshipReceiptDetail as unknown as Json,
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
  await recordAuthorshipEvent({
    supabase,
    ownerId: user.id,
    assignmentId: source.assignmentId,
    artifactId: row.id,
    eventType: "study_artifact_generated",
    payload: artifact.authorshipReceiptDetail as unknown as Json,
  });
  await recordStudentStateSnapshot({
    supabase,
    ownerId: user.id,
    assignmentId: source.assignmentId,
    trigger: "study_artifact_generated",
  });

  revalidatePath(source.revalidatePath);
  revalidatePath("/study-artifacts");
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
  const sourceType = isStudyArtifactSourceType(artifact.source_type)
    ? artifact.source_type
    : null;
  const artifactType = isStudyArtifactType(artifact.artifact_type)
    ? artifact.artifact_type
    : null;
  const studyMode = normalizeStudyHelperMode(artifact.study_mode);
  if (!sourceType || !artifactType || !studyMode) {
    return { ok: false, error: "Study set metadata needs to be refreshed." };
  }

  const originalPayload = completeStudyArtifact(artifact.payload);
  const payload = parsed.data.cards
    ? withEditedCards(originalPayload, parsed.data.cards as StudyArtifactCard[], new Date().toISOString())
    : originalPayload;
  const cards = Array.isArray(payload.cards) ? payload.cards.slice(0, 12) : [];
  if (cards.length === 0) return { ok: false, error: "This study set does not have card drafts yet." };
  const sourceAssignmentId = sourceType === "assignment"
    ? artifact.source_id
    : await loadAssignmentIdForNote(supabase, user.id, artifact.source_id);

  const now = new Date();
  const rows = await Promise.all(cards.map(async (card, index) => {
    const fresh = createCard(new Date(now.getTime() + index));
    const conceptId = await resolveConceptForArtifactCard({
      supabase,
      ownerId: user.id,
      classId: artifact.class_id,
      front: card.front,
      back: card.back,
    });
    return {
      owner_id: user.id,
      source_note_id: sourceType === "note" ? artifact.source_id : null,
      source_assignment_id: sourceAssignmentId,
      source_artifact_id: artifact.id,
      source_anchor: card.sourceAnchor || null,
      student_required_action: card.studentRequiredAction || "Review and edit this card before treating it as learned.",
      ai_contribution_level: "practice" as const,
      concept_id: conceptId,
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
  }));

  const { error: insertErr } = await supabase.from("flashcards").insert(rows);
  if (insertErr) return { ok: false, error: insertErr.message };

  await supabase
    .from("study_artifacts")
    .update({
      loop_state: "cards_saved",
      cards_saved_count: cards.length,
      source_anchor_count: countArtifactAnchors(payload),
      payload: payload as unknown as Json,
      artifact_edit_state: payload.editState as unknown as Json,
      practice_settings: payload.practiceSettings as unknown as Json,
      visual_breakdown: (payload.visualBreakdown ?? {}) as unknown as Json,
      authorship_receipt: payload.authorshipReceiptDetail as unknown as Json,
      updated_at: new Date().toISOString(),
    })
    .eq("id", artifact.id)
    .eq("owner_id", user.id);

  await recordStudyArtifactSignal({
    supabase,
    ownerId: user.id,
    assignmentId: sourceType === "assignment" ? artifact.source_id : null,
    source: {
      sourceType,
      sourceId: artifact.source_id,
    },
    artifactId: artifact.id,
    artifactType,
    studyMode,
    event: "cards_saved",
    count: cards.length,
  });
  await recordAuthorshipEvent({
    supabase,
    ownerId: user.id,
    assignmentId: sourceAssignmentId,
    artifactId: artifact.id,
    eventType: "artifact_cards_saved",
    payload: payload.authorshipReceiptDetail as unknown as Json,
  });
  await recordStudentStateSnapshot({
    supabase,
    ownerId: user.id,
    assignmentId: sourceAssignmentId,
    trigger: "artifact_cards_saved",
  });

  revalidatePath("/flashcards");
  revalidatePath(artifact.source_type === "assignment" ? `/assignments/${artifact.source_id}` : `/notes/${artifact.source_id}`);
  return { ok: true, count: cards.length };
}

export async function savePracticeTestProgress(
  input: z.input<typeof SavePracticeProgressInput>,
): Promise<
  | { ok: true; progress: PracticeProgress; result: PracticeScoreSummary }
  | { ok: false; error: string }
> {
  const parsed = SavePracticeProgressInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Add a response before saving this practice step." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data: artifact, error } = await supabase
    .from("study_artifacts")
    .select("id, owner_id, source_type, source_id, artifact_type, study_mode, payload, class_id")
    .eq("id", parsed.data.artifactId)
    .eq("owner_id", user.id)
    .single();
  if (error || !artifact || artifact.artifact_type !== "practice_test") {
    return { ok: false, error: "Practice set was not found." };
  }
  const sourceType = isStudyArtifactSourceType(artifact.source_type)
    ? artifact.source_type
    : null;
  const studyMode = normalizeStudyHelperMode(artifact.study_mode);
  if (!sourceType || !studyMode) {
    return { ok: false, error: "Practice set metadata needs to be refreshed." };
  }

  const rawPayload =
    artifact.payload && typeof artifact.payload === "object" && !Array.isArray(artifact.payload)
      ? artifact.payload as Record<string, unknown>
      : {};
  const previous = normalizePracticeProgress(rawPayload.practiceProgress);
  const responses = { ...previous.responses };
  for (const response of parsed.data.responses) {
    responses[String(response.questionIndex)] = response.response;
  }
  const completed = previous.completed || parsed.data.completed;
  const nowIso = new Date().toISOString();
  const progress = normalizePracticeProgress({
    currentQuestion: parsed.data.currentQuestion,
    completed,
    completedAt: completed ? previous.completedAt ?? nowIso : null,
    responses,
  });
  const completedArtifact = completeStudyArtifact(rawPayload);
  const practiceResult = scorePracticeTest(completedArtifact.quiz, progress.responses);
  const nextPayload = {
    ...mergePracticeProgress(rawPayload, progress),
    practiceResult,
    score: completed ? practiceResult.percentage : rawPayload.score ?? null,
  };

  const { error: updateError } = await supabase
    .from("study_artifacts")
    .update({
      payload: nextPayload as unknown as Json,
      loop_state: "reviewing",
      last_reviewed_at: nowIso,
      updated_at: nowIso,
    })
    .eq("id", artifact.id)
    .eq("owner_id", user.id);
  if (updateError) {
    return { ok: false, error: "Your response is still here. Try saving again." };
  }

  const assignmentId = sourceType === "assignment"
    ? artifact.source_id
    : await loadAssignmentIdForNote(supabase, user.id, artifact.source_id);
  const attemptNumber =
    typeof rawPayload.practiceAttemptNumber === "number" &&
    Number.isInteger(rawPayload.practiceAttemptNumber) &&
    rawPayload.practiceAttemptNumber > 0
      ? rawPayload.practiceAttemptNumber
      : 1;
  const { error: attemptError } = await (supabase as unknown as PracticeAttemptRpcClient)
    .rpc("save_practice_attempt", {
      p_artifact_id: artifact.id,
      p_assignment_id: assignmentId,
      p_attempt_number: attemptNumber,
      p_completed: completed,
      p_result: practiceResult as unknown as Json,
      p_responses: practiceResult.results as unknown as Json,
    });
  if (attemptError) {
    console.error("Practice attempt persistence was unavailable.", attemptError.message);
  }
  if (completed) {
    await recordPracticeMasteryEvidence({
      supabase,
      ownerId: user.id,
      classId: artifact.class_id,
      results: practiceResult.results,
    });
  }
  await recordStudyArtifactSignal({
    supabase,
    ownerId: user.id,
    assignmentId,
    source: {
      sourceType,
      sourceId: artifact.source_id,
    },
    artifactId: artifact.id,
    artifactType: "practice_test",
    studyMode,
    event: completed ? "practice_completed" : "practice_response_saved",
    count: Object.keys(progress.responses).length,
  });
  await recordAuthorshipEvent({
    supabase,
    ownerId: user.id,
    assignmentId,
    artifactId: artifact.id,
    actor: "student",
    eventType: completed ? "practice_session_completed" : "practice_response_saved",
    payload: {
      currentQuestion: progress.currentQuestion,
      responseCount: Object.keys(progress.responses).length,
      completed: progress.completed,
      scoreRecorded: completed && practiceResult.percentage !== null,
      score: completed ? practiceResult.percentage : null,
      scoredCount: practiceResult.scoredCount,
      reviewCount: practiceResult.reviewTogetherCount,
    } as Json,
  });
  await recordStudentStateSnapshot({
    supabase,
    ownerId: user.id,
    assignmentId,
    trigger: completed ? "practice_session_completed" : "practice_response_saved",
  });

  revalidatePath(`/study-artifacts/${artifact.id}`);
  revalidatePath("/study-artifacts");
  revalidatePath("/dashboard");
  return { ok: true, progress, result: practiceResult };
}

export async function restartPracticeTest(
  artifactId: string,
): Promise<{ ok: true; progress: PracticeProgress } | { ok: false; error: string }> {
  const parsed = z.string().uuid().safeParse(artifactId);
  if (!parsed.success) return { ok: false, error: "Practice set was not found." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };
  const { data: artifact } = await supabase
    .from("study_artifacts")
    .select("id, payload")
    .eq("id", parsed.data)
    .eq("owner_id", user.id)
    .eq("artifact_type", "practice_test")
    .maybeSingle();
  if (!artifact) return { ok: false, error: "Practice set was not found." };

  const rawPayload =
    artifact.payload && typeof artifact.payload === "object" && !Array.isArray(artifact.payload)
      ? artifact.payload as Record<string, unknown>
      : {};
  const currentAttempt =
    typeof rawPayload.practiceAttemptNumber === "number" &&
    Number.isInteger(rawPayload.practiceAttemptNumber)
      ? rawPayload.practiceAttemptNumber
      : 1;
  const progress = normalizePracticeProgress({});
  const { error } = await supabase
    .from("study_artifacts")
    .update({
      payload: {
        ...mergePracticeProgress(rawPayload, progress),
        practiceAttemptNumber: currentAttempt + 1,
        practiceResult: null,
        score: null,
      } as unknown as Json,
      loop_state: "generated",
      updated_at: new Date().toISOString(),
    })
    .eq("id", artifact.id)
    .eq("owner_id", user.id);
  if (error) return { ok: false, error: "The next practice pass is not ready yet." };

  revalidatePath(`/study-artifacts/${artifact.id}`);
  return { ok: true, progress };
}

async function loadAssignmentIdForNote(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ownerId: string,
  noteId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("notes")
    .select("assignment_id")
    .eq("id", noteId)
    .eq("owner_id", ownerId)
    .maybeSingle();
  return data?.assignment_id ?? null;
}

async function resolveConceptForArtifactCard({
  supabase,
  ownerId,
  classId,
  front,
  back,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  ownerId: string;
  classId: string | null;
  front: string;
  back: string;
}): Promise<string | null> {
  if (!classId) return null;
  const name = normalizeConceptNames([front, back])[0];
  if (!name) return null;

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

async function recordPracticeMasteryEvidence({
  supabase,
  ownerId,
  classId,
  results,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  ownerId: string;
  classId: string | null;
  results: PracticeScoreSummary["results"];
}) {
  if (!classId) return;
  for (const result of results.filter((item) => item.scored).slice(0, 12)) {
    const name = normalizeConceptNames([result.question, result.expectedAnswer])[0];
    if (!name) continue;
    const { data: existing } = await supabase
      .from("mastery_concepts")
      .select("id, mastery_level")
      .eq("owner_id", ownerId)
      .eq("class_id", classId)
      .eq("name", name)
      .maybeSingle();
    let concept = existing;
    if (!concept) {
      const { data } = await supabase
        .from("mastery_concepts")
        .insert({
          owner_id: ownerId,
          class_id: classId,
          name,
          source: "ai_quiz",
        })
        .select("id, mastery_level")
        .single();
      concept = data;
    }
    if (!concept) continue;
    const currentLevel = Number(concept.mastery_level ?? 0);
    const rating = result.category === "matched" ? 4 : 1;
    const nextLevel = masteryLevelFromAiQuizResult(currentLevel, rating);
    await Promise.all([
      supabase.from("mastery_events").insert({
        owner_id: ownerId,
        concept_id: concept.id,
        source: "ai_quiz",
        rating,
        delta: nextLevel - currentLevel,
        evidence_text: `${result.question} | ${result.sourceAnchor}`.slice(0, 500),
      }),
      supabase.from("mastery_concepts").update({
        mastery_level: nextLevel,
        last_practiced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", concept.id).eq("owner_id", ownerId),
    ]);
  }
}

function countArtifactAnchors(artifact: StudyArtifact): number {
  const anchors = new Set<string>();
  const quiz = Array.isArray(artifact.quiz) ? artifact.quiz : [];
  const cards = Array.isArray(artifact.cards) ? artifact.cards : [];
  for (const item of quiz) if (item.sourceAnchor) anchors.add(item.sourceAnchor);
  for (const card of cards) if (card.sourceAnchor) anchors.add(card.sourceAnchor);
  return anchors.size;
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
  const { data: importedSources } = await (supabase as unknown as AssignmentSourceClient)
    .from("assignment_sources")
    .select("source_type, title, extracted_text, source_location")
    .eq("assignment_id", data.id)
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: true });
  const packet = buildSourcePacket({
    description: data.description,
    rubric_text: data.rubric_text,
  }, importedSources ?? []);

  return {
    sourceType: "assignment",
    sourceId: data.id,
    title: data.title,
    text: [
      `Assignment: ${data.title}`,
      `Kind: ${data.kind}`,
      packet.directions ? `Directions:\n${packet.directions}` : "",
      packet.rubric ? `Rubric:\n${packet.rubric}` : "",
      packet.materialText ? `Imported class material:\n${packet.materialText}` : "",
      packet.citations.length > 0 ? `Source locations:\n${packet.citations.join("\n")}` : "",
    ].filter(Boolean).join("\n\n").slice(0, 20_000),
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
  coveredSince: string | null = null,
): Promise<string> {
  // When a coverage window is set (test prep), include only material from
  // the student's current curriculum position — and more of it.
  let notesQuery = supabase
    .from("notes")
    .select("id, title, body_text, transcript_text, tags, ai_suggested_tags")
    .eq("owner_id", ownerId)
    .eq("class_id", classId)
    .neq(sourceType === "note" ? "id" : "title", sourceType === "note" ? sourceId : "__none__")
    .order("updated_at", { ascending: false })
    .limit(coveredSince ? 8 : 5);
  if (coveredSince) notesQuery = notesQuery.gte("updated_at", coveredSince);

  let assignmentsQuery = supabase
    .from("assignments")
    .select("id, title, description, kind, rubric_text")
    .eq("owner_id", ownerId)
    .eq("class_id", classId)
    .neq(sourceType === "assignment" ? "id" : "title", sourceType === "assignment" ? sourceId : "__none__")
    .order("updated_at", { ascending: false })
    .limit(coveredSince ? 6 : 4);
  if (coveredSince) assignmentsQuery = assignmentsQuery.gte("updated_at", coveredSince);

  const [notesResult, assignmentsResult] = await Promise.all([notesQuery, assignmentsQuery]);

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
  event: "artifact_generated" | "cards_saved" | "practice_response_saved" | "practice_completed";
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

async function recordAuthorshipEvent({
  supabase,
  ownerId,
  assignmentId,
  artifactId,
  eventType,
  actor = "diana",
  payload,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  ownerId: string;
  assignmentId: string | null;
  artifactId: string;
  eventType:
    | "study_artifact_generated"
    | "artifact_cards_saved"
    | "practice_response_saved"
    | "practice_session_completed";
  actor?: "diana" | "student";
  payload: Json;
}) {
  await supabase.from("authorship_log").insert({
    owner_id: ownerId,
    assignment_id: assignmentId,
    source_artifact_id: artifactId,
    actor,
    event_type: eventType,
    payload,
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
