// app/(app)/assignments/[id]/ai-tools-actions.ts
// Server actions wrapping math-step, writing-aid, and citation-gen Edge Functions.
// All Anthropic and Supabase service-role calls stay server-side - never in the browser.
"use server";

import { z } from "zod";
import {
  parseHistoryScaffoldResponse,
  parseMapAnnotationResponse,
  type HistoryScaffoldMode,
  type HistoryScaffoldResult,
  type MapAnnotationResult,
} from "@/lib/history/scaffold";
import {
  parseCsScaffoldResponse,
  type CsScaffoldMode,
  type CsScaffoldResult,
} from "@/lib/computer-science/scaffold";
import {
  parseLanguageScaffoldResponse,
  type LanguageScaffoldMode,
  type LanguageScaffoldResult,
} from "@/lib/language/scaffold";
import { parseArtsScaffold, type ArtsMode, type ArtsScaffoldResult } from "@/lib/arts/scaffold";
import { parseHealthScaffold, type HealthMode, type HealthScaffoldResult } from "@/lib/wellness/health";
import {
  AP_SUBJECTS,
  parseApScaffold,
  type ApScaffoldMode,
  type ApScaffoldResult,
  type ApSubjectId,
} from "@/lib/ap/command";
import { parseMathScaffoldResponse, type MathScaffoldResult, type MathSubject } from "@/lib/math/scaffold";
import { createLinearEquationReview } from "@/lib/math/linear-equation-tutor";
import { parseScienceScaffoldResponse, type ScienceScaffoldMode, type ScienceScaffoldResult } from "@/lib/science/scaffold";
import { parseWritingCoauthorResponse, type WritingCoauthorMode, type WritingCoauthorResult } from "@/lib/writing/coauthor";
import {
  parseAssignmentReviewResponse,
  type AssignmentReviewResult,
  type AssignmentReviewTemplate,
} from "@/lib/assignment-review";
import { resolveDianaHomeworkTrust, type DianaHomeworkAiMode } from "@/lib/ai/diana-trust-rules";
import { runOpenAIHomeworkJson, type OpenAIHomeworkMessage } from "@/lib/ai/openai-homework-adapter";
import {
  formatHomeworkKernelForTutor,
  homeworkModelRouting,
  loadAssignmentHomeworkKernel,
} from "@/lib/assignment-help/server-understanding";
import {
  formatCanonicalSpecialistContextsForPrompt,
  loadCanonicalSpecialistContextsForAssignment,
} from "@/lib/assignment-submission-server";
import { ownerStorageKey, validateFileUpload } from "@/lib/security/upload-validation";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";

const HistoryItem = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
});

const apSubjectIds = AP_SUBJECTS.map((subject) => subject.id) as [ApSubjectId, ...ApSubjectId[]];

const MathStepInput = z.object({
  assignmentId: z.string().uuid().nullable(),
  aiMode: z.enum(["red", "yellow", "green"]).default("green"),
  prompt: z.string().min(1).max(2000),
  history: z.array(HistoryItem).max(10).default([]),
});

const WritingAidInput = z.object({
  assignmentId: z.string().uuid().nullable(),
  aiMode: z.enum(["red", "yellow", "green"]).default("green"),
  prompt: z.string().min(1).max(2000),
});

const WritingCoauthorInput = z.object({
  assignmentId: z.string().uuid(),
  aiMode: z.enum(["red", "yellow", "green"]).default("green"),
  mode: z.enum(["essay_scaffold", "cowrite", "transition", "evidence", "argument", "readability", "tone"]),
  draft: z.string().max(8000).default(""),
  prompt: z.string().max(1500).default(""),
});

const AcceptWritingSuggestionInput = z.object({
  assignmentId: z.string().uuid(),
  currentDraft: z.string().max(8000),
  suggestionText: z.string().min(1).max(800),
});

const ScienceScaffoldInput = z.object({
  assignmentId: z.string().uuid(),
  aiMode: z.enum(["red", "yellow", "green"]).default("green"),
  mode: z.enum(["hypothesis", "lab_report", "method", "formula", "chemistry_balance", "diagram", "frq"]),
  prompt: z.string().min(1).max(6000),
});

const HistoryScaffoldInput = z.object({
  assignmentId: z.string().uuid(),
  aiMode: z.enum(["red", "yellow", "green"]).default("green"),
  mode: z.enum(["primary_source", "cause_effect", "happ", "dbq", "compare", "current_events"]),
  sourceText: z.string().min(1).max(10000),
});

const HistoryMapInput = z.object({
  assignmentId: z.string().uuid(),
  aiMode: z.enum(["red", "yellow", "green"]).default("green"),
  storageKey: z.string().min(1).max(500),
});

const CsScaffoldInput = z.object({
  assignmentId: z.string().uuid(),
  aiMode: z.enum(["red", "yellow", "green"]).default("green"),
  mode: z.enum(["error_hint", "pseudocode_bridge", "code_review", "debug_log", "project_scaffold"]),
  language: z.enum(["javascript", "python"]).default("javascript"),
  code: z.string().max(8000).default(""),
  runtimeError: z.string().max(1200).default(""),
  prompt: z.string().max(2000).default(""),
});

const LanguageScaffoldInput = z.object({
  assignmentId: z.string().uuid(),
  aiMode: z.enum(["red", "yellow", "green"]).default("green"),
  mode: z.enum(["vocabulary", "conjugation", "reading", "speaking", "writing", "culture"]),
  targetLanguage: z.string().min(2).max(80).default("Spanish"),
  sourceText: z.string().max(7000).default(""),
  spokenText: z.string().max(2500).default(""),
}).refine((value) => Boolean(value.sourceText.trim()) || Boolean(value.spokenText.trim()), {
  message: "Text or transcript required.",
});

const ArtsScaffoldInput = z.object({
  assignmentId: z.string().uuid(),
  aiMode: z.enum(["red", "yellow", "green"]).default("green"),
  mode: z.enum(["art_reflection", "music_theory", "drama_speech", "art_history", "storyboard"]),
  prompt: z.string().min(1).max(7000),
});

const HealthScaffoldInput = z.object({
  assignmentId: z.string().uuid(),
  aiMode: z.enum(["red", "yellow", "green"]).default("green"),
  mode: z.enum(["health_question", "movement_goal", "cpr_first_aid", "sleep_recovery"]),
  prompt: z.string().min(1).max(7000),
});

const ApScaffoldInput = z.object({
  assignmentId: z.string().uuid(),
  aiMode: z.enum(["red", "yellow", "green"]).default("green"),
  subject: z.enum(apSubjectIds),
  mode: z.enum(["frq_outline", "mcq_practice", "study_plan"]),
  prompt: z.string().min(1).max(7000),
});

const CitationInput = z.object({
  assignmentId: z.string().uuid().nullable(),
  aiMode: z.enum(["red", "yellow", "green"]).default("green"),
  sourceType: z.enum(["url", "book", "paste"]),
  sourceText: z.string().min(1).max(8000),
  formats: z.array(z.enum(["mla", "apa", "chicago"])).min(1),
});
const AssignmentReviewInput = z.object({
  assignmentId: z.string().uuid(),
  template: z.enum(["writing", "math", "worksheet", "research", "history", "lab", "reading", "language", "coding", "art", "project", "handoff"]),
  focus: z.string().trim().min(1).max(800),
  question: z.string().max(1200).default(""),
  fields: z.array(z.object({
    label: z.string().trim().min(1).max(100),
    value: z.string().max(8000),
  })).min(1).max(8),
});

async function getOwnerId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

type HomeworkKernel = NonNullable<Awaited<ReturnType<typeof loadAssignmentHomeworkKernel>>>;

async function loadAssignmentAiMode(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ownerId: string,
  assignmentId: string,
): Promise<DianaHomeworkAiMode | null> {
  const kernel = await loadAssignmentHomeworkKernel({
    supabase,
    ownerId,
    assignmentId,
    eventSource: "ai_tools_mode",
  });
  return kernel?.trustDecision.aiMode ?? null;
}

async function loadHomeworkActionContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ownerId: string,
  assignmentId: string,
  options: { noteLimit?: number; noteChars?: number; maxChars?: number } = {},
): Promise<{ kernel: HomeworkKernel; classContext: string } | null> {
  const kernel = await loadAssignmentHomeworkKernel({
    supabase,
    ownerId,
    assignmentId,
    eventSource: "ai_tools_context",
  });
  if (!kernel) return null;

  const noteLimit = options.noteLimit ?? 5;
  const noteChars = options.noteChars ?? 450;
  let notesText = "";
  if (kernel.assignment.class_id) {
    const { data: notes } = await supabase
      .from("notes")
      .select("title, body_text, transcript_text")
      .eq("owner_id", ownerId)
      .eq("class_id", kernel.assignment.class_id)
      .order("updated_at", { ascending: false })
      .limit(noteLimit);

    notesText = (notes ?? []).map((note) => [
      `Note: ${note.title}`,
      (note.body_text ?? "").slice(0, noteChars),
      (note.transcript_text ?? "").slice(0, noteChars),
    ].filter(Boolean).join("\n")).join("\n\n");
  }

  const classContext = [
    formatHomeworkKernelForTutor(kernel, { maxChars: options.maxChars ?? 12_000 }),
    notesText ? `Recent class notes:\n${notesText}` : "",
  ].filter(Boolean).join("\n\n").slice(0, options.maxChars ?? 12_000);

  return { kernel, classContext };
}

// Map an Edge-Function error message to calm, student-facing copy.
// Used by these actions because Supabase wraps function errors in error.message.
function directHomeworkAiMode(): DianaHomeworkAiMode {
  return resolveDianaHomeworkTrust().aiMode;
}
function calmError(rawMessage: string | undefined): string {
  const m = rawMessage ?? "";
  if (m.includes("quota")) {
    return "You've used your AI quota for today: resets at midnight.";
  }
  if (m.includes("AI not available")) {
    return "Diana help is unavailable right now. Try again in a moment.";
  }
  return "AI is unavailable right now. Try again in a moment.";
}

async function loadWritingEvidenceContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ownerId: string,
  assignmentId: string,
): Promise<string> {
  return (await loadHomeworkActionContext(supabase, ownerId, assignmentId, {
    noteLimit: 8,
    noteChars: 600,
    maxChars: 14_000,
  }))?.classContext ?? "";
}

async function loadScienceClassContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ownerId: string,
  assignmentId: string,
): Promise<string> {
  return (await loadHomeworkActionContext(supabase, ownerId, assignmentId, { noteLimit: 5, noteChars: 450, maxChars: 12_000 }))?.classContext ?? "";
}

async function loadHistoryClassContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ownerId: string,
  assignmentId: string,
): Promise<string> {
  return (await loadHomeworkActionContext(supabase, ownerId, assignmentId, { noteLimit: 6, noteChars: 500, maxChars: 13_000 }))?.classContext ?? "";
}

async function loadCsClassContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ownerId: string,
  assignmentId: string,
): Promise<string> {
  return (await loadHomeworkActionContext(supabase, ownerId, assignmentId, { noteLimit: 5, noteChars: 450, maxChars: 12_000 }))?.classContext ?? "";
}

async function loadHealthClassContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ownerId: string,
  assignmentId: string,
): Promise<string> {
  return (await loadHomeworkActionContext(supabase, ownerId, assignmentId, { noteLimit: 5, noteChars: 450, maxChars: 12_000 }))?.classContext ?? "";
}

async function loadApClassContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ownerId: string,
  assignmentId: string,
): Promise<string> {
  return (await loadHomeworkActionContext(supabase, ownerId, assignmentId, { noteLimit: 6, noteChars: 450, maxChars: 13_000 }))?.classContext ?? "";
}

async function loadLanguageClassContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ownerId: string,
  assignmentId: string,
): Promise<string> {
  return (await loadHomeworkActionContext(supabase, ownerId, assignmentId, { noteLimit: 5, noteChars: 450, maxChars: 12_000 }))?.classContext ?? "";
}
export async function requestMathStep(
  input: z.infer<typeof MathStepInput>,
): Promise<{ content: string } | { error: string }> {
  const parsed = MathStepInput.safeParse(input);
  if (!parsed.success) return { error: "Invalid input." };
  const ownerId = await getOwnerId();
  if (!ownerId) return { error: "Not signed in." };

  const supabase = await createClient();
  const aiMode = parsed.data.assignmentId
    ? await loadAssignmentAiMode(supabase, ownerId, parsed.data.assignmentId)
    : directHomeworkAiMode();
  if (!aiMode) return { error: "Assignment not found." };
  const { data, error } = await supabase.functions.invoke("math-step", {
    body: { ownerId, ...parsed.data, aiMode },
  });
  if (error) return { error: calmError(error.message) };
  return { content: (data as { content: string }).content ?? "" };
}

export async function requestWritingAid(
  input: z.infer<typeof WritingAidInput>,
): Promise<{ content: string } | { error: string }> {
  const parsed = WritingAidInput.safeParse(input);
  if (!parsed.success) return { error: "Invalid input." };
  const ownerId = await getOwnerId();
  if (!ownerId) return { error: "Not signed in." };

  const supabase = await createClient();
  const aiMode = parsed.data.assignmentId
    ? await loadAssignmentAiMode(supabase, ownerId, parsed.data.assignmentId)
    : directHomeworkAiMode();
  if (!aiMode) return { error: "Assignment not found." };
  const { data, error } = await supabase.functions.invoke("writing-aid", {
    body: { ownerId, ...parsed.data, aiMode },
  });
  if (error) return { error: calmError(error.message) };
  return { content: (data as { content: string }).content ?? "" };
}

export async function requestWritingCoauthor(
  input: z.infer<typeof WritingCoauthorInput>,
): Promise<{ ok: true; result: WritingCoauthorResult } | { ok: false; error: string }> {
  const parsed = WritingCoauthorInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };
  const ownerId = await getOwnerId();
  if (!ownerId) return { ok: false, error: "Not signed in." };

  const supabase = await createClient();
  const aiMode = await loadAssignmentAiMode(supabase, ownerId, parsed.data.assignmentId);
  if (!aiMode) return { ok: false, error: "Assignment not found." };
  const evidenceContext = parsed.data.mode === "evidence"
    ? await loadWritingEvidenceContext(supabase, ownerId, parsed.data.assignmentId)
    : "";

  const { data, error } = await supabase.functions.invoke("writing-cowrite", {
    body: { ownerId, ...parsed.data, aiMode, evidenceContext },
  });
  if (error) return { ok: false, error: calmError(error.message) };
  if (data?.error) return { ok: false, error: String(data.error) };

  return {
    ok: true,
    result: parseWritingCoauthorResponse(
      String(data?.content ?? ""),
      parsed.data.mode as WritingCoauthorMode,
    ),
  };
}

const LOCAL_ASSIGNMENT_REVIEW_PROMPT = `You are Diana's assignment review coach for a high-school student.

You receive the assignment directions, source packet, and the student's current visible work from Diana's workspace.
Never write a finished answer, solve a problem outright, fabricate evidence, or replace the student's voice.
Do not tell the student to paste work into another chat because you already have the relevant fields.

Return exactly one JSON object:
{
  "title": string,
  "strength": string,
  "improvement": string,
  "nextMove": string,
  "question": string,
  "evidenceAnchor": string,
  "visualAid": {
    "kind": "none" | "balance" | "equation_steps" | "number_line" | "coordinate_plane" | "fraction_bar" | "geometry" | "table" | "process",
    "title": string,
    "description": string,
    "steps": string[]
  }
}

Rules:
- Be specific to the assignment, focus request, and named student fields.
- Give one useful strength and one high-value improvement.
- nextMove must be a small action the student can do now in their own work.
- question should help the student think, not test or shame them.
- evidenceAnchor must name the most relevant assignment direction, rubric, source page, or Student work.
- For math, check the student's process and give the next operation or check, never the final answer.
- For one-variable equations, prefer a vertical equation_steps visual that lines up the same operation under both sides before the simplified line.
- Keep every value concise, calm, and student-led. No exclamation marks.`;

function isAssignmentVisualAid(value: unknown): value is AssignmentReviewResult["visualAid"] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.kind === "string" &&
    typeof candidate.title === "string" &&
    typeof candidate.description === "string" &&
    Array.isArray(candidate.steps) &&
    candidate.steps.every((step) => typeof step === "string");
}

function isAssignmentReviewResult(value: unknown): value is AssignmentReviewResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.title === "string" &&
    typeof candidate.strength === "string" &&
    typeof candidate.improvement === "string" &&
    typeof candidate.nextMove === "string" &&
    typeof candidate.question === "string" &&
    typeof candidate.evidenceAnchor === "string" &&
    isAssignmentVisualAid(candidate.visualAid);
}

function fallbackAssignmentReviewValue(template: AssignmentReviewTemplate): AssignmentReviewResult {
  return parseAssignmentReviewResponse("", template);
}

function sourceAnchorsForKernel(kernel: Awaited<ReturnType<typeof loadAssignmentHomeworkKernel>>): string[] {
  if (!kernel) return [];
  return [
    ...kernel.sourcePacket.citations,
    ...kernel.sources.flatMap((source) => [source.title, source.source_location].filter((item): item is string => typeof item === "string" && item.trim().length > 0)),
  ].filter((anchor, index, anchors) => anchors.indexOf(anchor) === index).slice(0, 12);
}

async function runLocalAssignmentReview({
  ownerId,
  assignmentId,
  supabase,
  template,
  focus,
  question,
  fields,
  homeworkContext,
  specialistContext,
  sourceAnchors,
  kernel,
}: {
  ownerId: string;
  assignmentId: string;
  supabase: Awaited<ReturnType<typeof createClient>>;
  template: AssignmentReviewTemplate;
  focus: string;
  question: string;
  fields: Array<{ label: string; value: string }>;
  homeworkContext: string;
  specialistContext: string;
  sourceAnchors: string[];
  kernel: HomeworkKernel;
}): Promise<{ ok: true; result: AssignmentReviewResult; sourceAnchors: string[] } | { ok: false; error: string }> {
  const messages: OpenAIHomeworkMessage[] = [
    { role: "system", content: LOCAL_ASSIGNMENT_REVIEW_PROMPT },
    {
      role: "user",
      content: [
        `Template: ${template}`,
        `Review focus: ${focus}`,
        question ? `Student question: ${question}` : "",
        sourceAnchors.length > 0 ? `Known source anchors: ${sourceAnchors.join("; ")}` : "Known source anchors: Student work only",
        `Diana assignment understanding:\n${homeworkContext}`,
        `Canonical specialist artifact contexts:\n${specialistContext}`,
        `Current student work:\n${fields.map((field) => `${field.label}:\n${field.value}`).join("\n\n")}`,
      ].filter(Boolean).join("\n\n"),
    },
  ];

  try {
    const result = await runOpenAIHomeworkJson({
      ownerId,
      assignmentId,
      accounting: supabase,
      task: "assignment_review",
      messages,
      maxOutputTokens: 850,
      fallback: fallbackAssignmentReviewValue(template),
      validate: isAssignmentReviewResult,
      idempotencyKey: `assignment-review:${assignmentId}:${crypto.randomUUID()}`,
      routing: homeworkModelRouting(kernel, {
        visibleWork: fields.map((field) => field.value).join("\n"),
        signals: [focus, question].filter(Boolean).join("\n"),
      }),
    });
    if (!result.ok) return { ok: false, error: result.error };
    return { ok: true, result: result.value, sourceAnchors };
  } catch (error) {
    console.warn("local assignment review unavailable", error instanceof Error ? error.message : error);
    return { ok: false, error: "Diana help is unavailable right now. Try again in a moment." };
  }
}
export async function requestAssignmentReview(
  input: z.infer<typeof AssignmentReviewInput>,
): Promise<{ ok: true; result: ReturnType<typeof parseAssignmentReviewResponse>; sourceAnchors: string[] } | { ok: false; error: string }> {
  const parsed = AssignmentReviewInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Add a little of your work before asking Diana." };
  const ownerId = await getOwnerId();
  if (!ownerId) return { ok: false, error: "Not signed in." };

  const supabase = await createClient();
  const kernel = await loadAssignmentHomeworkKernel({
    supabase,
    ownerId,
    assignmentId: parsed.data.assignmentId,
    eventSource: "assignment_review",
  });
  if (!kernel) return { ok: false, error: "Assignment not found." };
  if (parsed.data.template === "math" && !process.env.OPENAI_API_KEY?.trim()) {
    const deterministicReview = createLinearEquationReview(parsed.data.fields, parsed.data.question);
    if (deterministicReview) {
      return { ok: true, result: deterministicReview, sourceAnchors: [] };
    }
  }

  const visibleWork = parsed.data.fields
    .map((field) => `${field.label}:\n${field.value}`)
    .join("\n\n");
  const homeworkContext = formatHomeworkKernelForTutor(kernel, {
    visibleWork,
    maxChars: 16_000,
  });
  const specialistContexts = await loadCanonicalSpecialistContextsForAssignment({
    supabase,
    ownerId,
    assignmentId: parsed.data.assignmentId,
    consumer: "review",
    profile: kernel.profile,
    kernel,
  });
  if (!specialistContexts) return { ok: false, error: "Assignment not found." };
  const specialistContext = formatCanonicalSpecialistContextsForPrompt(
    specialistContexts,
  );
  const template = parsed.data.template as AssignmentReviewTemplate;
  const sourceAnchors = [
    ...sourceAnchorsForKernel(kernel),
    ...specialistContexts.flatMap((context) => context.sourceAnchors.flatMap((anchor) => [
      anchor.label,
      anchor.location,
    ].filter((value): value is string => Boolean(value?.trim())))),
  ].filter((anchor, index, anchors) => anchors.indexOf(anchor) === index).slice(0, 12);
  const localReview = await runLocalAssignmentReview({
    ownerId,
    assignmentId: parsed.data.assignmentId,
    supabase,
    template,
    focus: parsed.data.focus,
    question: parsed.data.question,
    fields: parsed.data.fields,
    homeworkContext,
    specialistContext,
    sourceAnchors,
    kernel,
  });
  if (localReview.ok) return localReview;

  if (template === "math") {
    const deterministicReview = createLinearEquationReview(parsed.data.fields, parsed.data.question);
    if (deterministicReview) return { ok: true, result: deterministicReview, sourceAnchors: [] };
  }

  return { ok: false, error: localReview.error };
}
export async function acceptWritingSuggestion(
  input: z.infer<typeof AcceptWritingSuggestionInput>,
): Promise<{ ok: true; draft: string } | { ok: false; error: string }> {
  const parsed = AcceptWritingSuggestionInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid suggestion." };
  const ownerId = await getOwnerId();
  if (!ownerId) return { ok: false, error: "Not signed in." };

  const supabase = await createClient();
  const { data: assignment } = await supabase
    .from("assignments")
    .select("saved_work")
    .eq("id", parsed.data.assignmentId)
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (!assignment) return { ok: false, error: "Assignment not found." };

  const suggestionText = parsed.data.suggestionText.trim();
  const draft = [parsed.data.currentDraft.trimEnd(), suggestionText]
    .filter(Boolean)
    .join("\n\n");
  const savedWork = assignment.saved_work && typeof assignment.saved_work === "object"
    && !Array.isArray(assignment.saved_work)
    ? assignment.saved_work
    : {};
  const previousAcceptedChars = typeof savedWork.writingAcceptedAiChars === "number"
    ? savedWork.writingAcceptedAiChars
    : 0;
  const nextSavedWork: Json = {
    ...savedWork,
    draft,
    writingAcceptedAiChars: previousAcceptedChars + suggestionText.length,
  };

  const { error } = await supabase
    .from("assignments")
    .update({ saved_work: nextSavedWork })
    .eq("id", parsed.data.assignmentId)
    .eq("owner_id", ownerId);
  if (error) return { ok: false, error: "The draft could not be saved. Try again." };

  await supabase.from("authorship_log").insert({
    owner_id: ownerId,
    assignment_id: parsed.data.assignmentId,
    actor: "student",
    event_type: "writing_suggestion_accepted",
    payload: {
      acceptedAiChars: suggestionText.length,
      studentConfirmed: true,
    },
  });

  return { ok: true, draft };
}

export async function requestScienceScaffold(
  input: z.infer<typeof ScienceScaffoldInput>,
): Promise<{ ok: true; result: ScienceScaffoldResult } | { ok: false; error: string }> {
  const parsed = ScienceScaffoldInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };
  const ownerId = await getOwnerId();
  if (!ownerId) return { ok: false, error: "Not signed in." };

  const supabase = await createClient();
  const aiMode = await loadAssignmentAiMode(supabase, ownerId, parsed.data.assignmentId);
  if (!aiMode) return { ok: false, error: "Assignment not found." };
  const classContext = await loadScienceClassContext(supabase, ownerId, parsed.data.assignmentId);
  const { data, error } = await supabase.functions.invoke("science-scaffold", {
    body: { ownerId, ...parsed.data, aiMode, classContext },
  });
  if (error) return { ok: false, error: calmError(error.message) };
  if (data?.error) return { ok: false, error: String(data.error) };
  return {
    ok: true,
    result: parseScienceScaffoldResponse(
      String(data?.content ?? ""),
      parsed.data.mode as ScienceScaffoldMode,
    ),
  };
}

export async function requestHistoryScaffold(
  input: z.infer<typeof HistoryScaffoldInput>,
): Promise<{ ok: true; result: HistoryScaffoldResult } | { ok: false; error: string }> {
  const parsed = HistoryScaffoldInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };
  const ownerId = await getOwnerId();
  if (!ownerId) return { ok: false, error: "Not signed in." };

  const supabase = await createClient();
  const classContext = await loadHistoryClassContext(supabase, ownerId, parsed.data.assignmentId);
  const aiMode = await loadAssignmentAiMode(supabase, ownerId, parsed.data.assignmentId);
  if (!aiMode) return { ok: false, error: "Assignment not found." };
  const { data, error } = await supabase.functions.invoke("history-scaffold", {
    body: { ownerId, ...parsed.data, aiMode, classContext },
  });
  if (error) return { ok: false, error: calmError(error.message) };
  if (data?.error) return { ok: false, error: String(data.error) };
  return {
    ok: true,
    result: parseHistoryScaffoldResponse(
      String(data?.content ?? ""),
      parsed.data.mode as HistoryScaffoldMode,
    ),
  };
}

export async function uploadHistoryMapImage(
  formData: FormData,
): Promise<{ ok: true; storageKey: string } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const file = formData.get("historyMap") as File | null;
  if (!file) return { ok: false, error: "No image provided." };

  const validation = await validateFileUpload("aiToolImage", file);
  if (!validation.ok) return { ok: false, error: validation.error };

  const storageKey = ownerStorageKey(
    user.id,
    `history-map-${Date.now()}.${validation.value.extension}`,
  );
  const { error } = await supabase.storage
    .from("note-docs")
    .upload(storageKey, file, { contentType: validation.value.mimeType });

  if (error) return { ok: false, error: error.message };
  return { ok: true, storageKey };
}

export async function requestHistoryMapAnnotation(
  input: z.infer<typeof HistoryMapInput>,
): Promise<{ ok: true; result: MapAnnotationResult } | { ok: false; error: string }> {
  const parsed = HistoryMapInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };
  const ownerId = await getOwnerId();
  if (!ownerId) return { ok: false, error: "Not signed in." };

  const supabase = await createClient();
  const aiMode = await loadAssignmentAiMode(supabase, ownerId, parsed.data.assignmentId);
  if (!aiMode) return { ok: false, error: "Assignment not found." };
  const { data, error } = await supabase.functions.invoke("history-scaffold", {
    body: { ownerId, assignmentId: parsed.data.assignmentId, aiMode, mode: "map_annotation", storageKey: parsed.data.storageKey },
  });
  if (error) return { ok: false, error: calmError(error.message) };
  if (data?.error) return { ok: false, error: String(data.error) };
  return { ok: true, result: parseMapAnnotationResponse(String(data?.content ?? "")) };
}

export async function requestCsScaffold(
  input: z.infer<typeof CsScaffoldInput>,
): Promise<{ ok: true; result: CsScaffoldResult } | { ok: false; error: string }> {
  const parsed = CsScaffoldInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };
  const ownerId = await getOwnerId();
  if (!ownerId) return { ok: false, error: "Not signed in." };

  const supabase = await createClient();
  const classContext = await loadCsClassContext(supabase, ownerId, parsed.data.assignmentId);
  const aiMode = await loadAssignmentAiMode(supabase, ownerId, parsed.data.assignmentId);
  if (!aiMode) return { ok: false, error: "Assignment not found." };
  const { data, error } = await supabase.functions.invoke("cs-scaffold", {
    body: { ownerId, ...parsed.data, aiMode, classContext },
  });
  if (error) return { ok: false, error: calmError(error.message) };
  if (data?.error) return { ok: false, error: String(data.error) };
  return {
    ok: true,
    result: parseCsScaffoldResponse(
      String(data?.content ?? ""),
      parsed.data.mode as CsScaffoldMode,
    ),
  };
}

export async function requestLanguageScaffold(
  input: z.infer<typeof LanguageScaffoldInput>,
): Promise<{ ok: true; result: LanguageScaffoldResult } | { ok: false; error: string }> {
  const parsed = LanguageScaffoldInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Add a word, sentence, reading, or transcript first." };
  const ownerId = await getOwnerId();
  if (!ownerId) return { ok: false, error: "Not signed in." };

  const supabase = await createClient();
  const classContext = await loadLanguageClassContext(supabase, ownerId, parsed.data.assignmentId);
  const aiMode = await loadAssignmentAiMode(supabase, ownerId, parsed.data.assignmentId);
  if (!aiMode) return { ok: false, error: "Assignment not found." };
  const { data, error } = await supabase.functions.invoke("language-scaffold", {
    body: { ownerId, ...parsed.data, aiMode, classContext },
  });
  if (error) return { ok: false, error: calmError(error.message) };
  if (data?.error) return { ok: false, error: String(data.error) };
  return {
    ok: true,
    result: parseLanguageScaffoldResponse(
      String(data?.content ?? ""),
      parsed.data.mode as LanguageScaffoldMode,
      parsed.data.targetLanguage,
    ),
  };
}

export async function requestArtsScaffold(
  input: z.infer<typeof ArtsScaffoldInput>,
): Promise<{ ok: true; result: ArtsScaffoldResult } | { ok: false; error: string }> {
  const parsed = ArtsScaffoldInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Add a prompt or draft first." };
  const ownerId = await getOwnerId();
  if (!ownerId) return { ok: false, error: "Not signed in." };

  const supabase = await createClient();
  const aiMode = await loadAssignmentAiMode(supabase, ownerId, parsed.data.assignmentId);
  if (!aiMode) return { ok: false, error: "Assignment not found." };
  const { data, error } = await supabase.functions.invoke("arts-scaffold", {
    body: { ownerId, ...parsed.data, aiMode },
  });
  if (error) return { ok: false, error: calmError(error.message) };
  if (data?.error) return { ok: false, error: String(data.error) };

  return {
    ok: true,
    result: parseArtsScaffold(
      String(data?.raw ?? "{}"),
      parsed.data.mode as ArtsMode,
    ),
  };
}

export async function requestHealthScaffold(
  input: z.infer<typeof HealthScaffoldInput>,
): Promise<{ ok: true; result: HealthScaffoldResult } | { ok: false; error: string }> {
  const parsed = HealthScaffoldInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Add a prompt or class question first." };
  const ownerId = await getOwnerId();
  if (!ownerId) return { ok: false, error: "Not signed in." };

  const supabase = await createClient();
  const classContext = await loadHealthClassContext(supabase, ownerId, parsed.data.assignmentId);
  const aiMode = await loadAssignmentAiMode(supabase, ownerId, parsed.data.assignmentId);
  if (!aiMode) return { ok: false, error: "Assignment not found." };
  const { data, error } = await supabase.functions.invoke("health-scaffold", {
    body: { ownerId, ...parsed.data, aiMode, classContext },
  });
  if (error) return { ok: false, error: calmError(error.message) };
  if (data?.error) return { ok: false, error: String(data.error) };

  return {
    ok: true,
    result: parseHealthScaffold(
      String(data?.raw ?? "{}"),
      parsed.data.mode as HealthMode,
    ),
  };
}

export async function requestApScaffold(
  input: z.infer<typeof ApScaffoldInput>,
): Promise<{ ok: true; result: ApScaffoldResult } | { ok: false; error: string }> {
  const parsed = ApScaffoldInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Add an AP prompt or practice goal first." };
  const ownerId = await getOwnerId();
  if (!ownerId) return { ok: false, error: "Not signed in." };

  const supabase = await createClient();
  const classContext = await loadApClassContext(supabase, ownerId, parsed.data.assignmentId);
  const aiMode = await loadAssignmentAiMode(supabase, ownerId, parsed.data.assignmentId);
  if (!aiMode) return { ok: false, error: "Assignment not found." };
  const { data, error } = await supabase.functions.invoke("ap-scaffold", {
    body: { ownerId, ...parsed.data, aiMode, classContext },
  });
  if (error) return { ok: false, error: calmError(error.message) };
  if (data?.error) return { ok: false, error: String(data.error) };

  return {
    ok: true,
    result: parseApScaffold(
      String(data?.raw ?? "{}"),
      parsed.data.subject as ApSubjectId,
      parsed.data.mode as ApScaffoldMode,
    ),
  };
}

export async function requestCitation(
  input: z.infer<typeof CitationInput>,
): Promise<{ content: string } | { error: string }> {
  const parsed = CitationInput.safeParse(input);
  if (!parsed.success) return { error: "Invalid input." };
  const ownerId = await getOwnerId();
  if (!ownerId) return { error: "Not signed in." };

  const supabase = await createClient();
  const aiMode = parsed.data.assignmentId
    ? await loadAssignmentAiMode(supabase, ownerId, parsed.data.assignmentId)
    : directHomeworkAiMode();
  if (!aiMode) return { error: "Assignment not found." };
  const { data, error } = await supabase.functions.invoke("citation-gen", {
    body: { ownerId, ...parsed.data, aiMode },
  });
  if (error) return { error: calmError(error.message) };
  // citation-gen returns content as a JSON string per its system prompt;
  // we surface it verbatim and let the client JSON.parse - keeps this layer dumb.
  return { content: (data as { content: string }).content ?? "" };
}

// F6: AI task breakdown

import { parseStepsFromContent, type BreakdownStep } from "@/lib/task-breakdown/parse";

const TaskBreakdownInput = z.object({
  assignmentId: z.string().uuid(),
  aiMode: z.enum(["red", "yellow", "green"]).default("green"),
  title: z.string().min(1).max(500),
  description: z.string().max(4000).optional(),
  kind: z.string().min(1).max(50),
  estimatedMinutes: z.number().int().min(1).max(600).optional(),
});

const AcceptedBreakdownInput = z.object({
  assignmentId: z.string().uuid(),
  steps: z.array(z.object({
    step: z.number().int().min(1).max(12),
    action: z.string().trim().min(1).max(500),
    minutes: z.number().int().min(1).max(5),
    done: z.boolean(),
  })).min(1).max(12),
});

export async function requestTaskBreakdown(
  input: z.infer<typeof TaskBreakdownInput>,
): Promise<{ steps: BreakdownStep[] } | { error: string }> {
  const parsed = TaskBreakdownInput.safeParse(input);
  if (!parsed.success) return { error: "Invalid input." };
  const ownerId = await getOwnerId();
  if (!ownerId) return { error: "Not signed in." };

  const supabase = await createClient();
  const aiMode = await loadAssignmentAiMode(supabase, ownerId, parsed.data.assignmentId);
  if (!aiMode) return { error: "Assignment not found." };

  const { data, error } = await supabase.functions.invoke("task-breakdown", {
    body: { ownerId, ...parsed.data, aiMode },
  });
  if (error) return { error: calmError(error.message) };

  const content = (data as { content: string }).content ?? "";
  const steps = parseStepsFromContent(content);
  return { steps };
}
export async function acceptTaskBreakdown(
  input: z.infer<typeof AcceptedBreakdownInput>,
): Promise<{ ok: true } | { error: string }> {
  const parsed = AcceptedBreakdownInput.safeParse(input);
  if (!parsed.success) return { error: "Choose at least one valid step." };
  const ownerId = await getOwnerId();
  if (!ownerId) return { error: "Not signed in." };

  const supabase = await createClient();
  const { data: assignment } = await supabase
    .from("assignments")
    .select("id")
    .eq("id", parsed.data.assignmentId)
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (!assignment) return { error: "Assignment not found." };

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("assignment_steps")
    .upsert(
      {
        owner_id: ownerId,
        assignment_id: parsed.data.assignmentId,
        steps: parsed.data.steps,
        generated_at: now,
        updated_at: now,
      },
      { onConflict: "assignment_id" },
    );
  if (error) return { error: "The steps could not be saved. Try again." };

  await supabase.from("authorship_log").insert({
    owner_id: ownerId,
    assignment_id: parsed.data.assignmentId,
    actor: "student",
    event_type: "task_breakdown_accepted",
    payload: { stepCount: parsed.data.steps.length },
  });

  return { ok: true };
}

const ToggleStepInput = z.object({
  assignmentId: z.string().uuid(),
  stepIndex: z.number().int().min(0).max(11),
  done: z.boolean(),
});

// ─── F6: AP Math worked example ──────────────────────────────────────────────

const MathExampleInput = z.object({
  assignmentId: z.string().uuid().nullable(),
  aiMode: z.enum(["red", "yellow", "green"]).default("green"),
  problem: z.string().min(1).max(2000),
  subject: z.enum(["calculus", "physics", "algebra"]),
});

const MathSubjectInput = z.enum([
  "algebra",
  "geometry",
  "precalculus",
  "calculus",
  "statistics",
  "physics",
  "chemistry",
]);

const MathScaffoldInput = z.object({
  assignmentId: z.string().uuid().nullable(),
  aiMode: z.enum(["red", "yellow", "green"]).default("green"),
  subject: MathSubjectInput.default("algebra"),
  problemText: z.string().max(2400).optional(),
  storageKey: z.string().min(1).max(500).optional(),
}).refine((value) => Boolean(value.problemText?.trim()) || Boolean(value.storageKey), {
  message: "Problem text or photo required.",
});

export async function requestMathExample(
  input: z.infer<typeof MathExampleInput>,
): Promise<{ content: string } | { error: string }> {
  const parsed = MathExampleInput.safeParse(input);
  if (!parsed.success) return { error: "Invalid input." };
  const ownerId = await getOwnerId();
  if (!ownerId) return { error: "Not signed in." };

  const supabase = await createClient();
  const aiMode = parsed.data.assignmentId
    ? await loadAssignmentAiMode(supabase, ownerId, parsed.data.assignmentId)
    : directHomeworkAiMode();
  if (!aiMode) return { error: "Assignment not found." };
  const { data, error } = await supabase.functions.invoke("math-example", {
    body: { ownerId, ...parsed.data, aiMode },
  });
  if (error) return { error: calmError(error.message) };
  return { content: (data as { content: string }).content ?? "" };
}

export async function uploadMathPhoto(
  formData: FormData,
): Promise<{ ok: true; storageKey: string } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const file = formData.get("mathPhoto") as File | null;
  if (!file) return { ok: false, error: "No photo provided." };

  const validation = await validateFileUpload("aiToolImage", file);
  if (!validation.ok) return { ok: false, error: validation.error };

  const storageKey = ownerStorageKey(
    user.id,
    `math-${Date.now()}.${validation.value.extension}`,
  );
  const { error } = await supabase.storage
    .from("note-docs")
    .upload(storageKey, file, { contentType: validation.value.mimeType });

  if (error) return { ok: false, error: error.message };
  return { ok: true, storageKey };
}

export async function requestMathScaffold(
  input: z.infer<typeof MathScaffoldInput>,
): Promise<{ ok: true; result: MathScaffoldResult } | { ok: false; error: string }> {
  const parsed = MathScaffoldInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Add a problem or photo first." };
  const ownerId = await getOwnerId();
  if (!ownerId) return { ok: false, error: "Not signed in." };

  const supabase = await createClient();
  const aiMode = parsed.data.assignmentId
    ? await loadAssignmentAiMode(supabase, ownerId, parsed.data.assignmentId)
    : directHomeworkAiMode();
  if (!aiMode) return { ok: false, error: "Assignment not found." };
  const { data, error } = await supabase.functions.invoke("math-scaffold", {
    body: { ownerId, ...parsed.data, aiMode },
  });
  if (error) return { ok: false, error: calmError(error.message) };
  if (data?.error) return { ok: false, error: String(data.error) };

  const fallbackProblem = String(data?.extractedProblem ?? parsed.data.problemText ?? "");
  const result = parseMathScaffoldResponse(
    String(data?.content ?? ""),
    fallbackProblem,
    parsed.data.subject as MathSubject,
  );

  return {
    ok: true,
    result: {
      ...result,
      extractedProblem: fallbackProblem || result.extractedProblem,
      latex: typeof data?.latex === "string" && data.latex.trim().length > 0 ? data.latex : result.latex,
    },
  };
}

export async function toggleStepDone(
  input: z.infer<typeof ToggleStepInput>,
): Promise<{ ok: true } | { error: string }> {
  const parsed = ToggleStepInput.safeParse(input);
  if (!parsed.success) return { error: "Invalid input." };
  const ownerId = await getOwnerId();
  if (!ownerId) return { error: "Not signed in." };

  const supabase = await createClient();
  const { data: row } = await supabase
    .from("assignment_steps")
    .select("steps")
    .eq("assignment_id", parsed.data.assignmentId)
    .eq("owner_id", ownerId)
    .single();
  if (!row) return { error: "No breakdown to update." };

  if (!Array.isArray(row.steps)) {
    return { error: "The saved breakdown needs to be regenerated." };
  }
  const storedSteps: BreakdownStep[] = [];
  for (const value of row.steps) {
    const storedStep = parseStoredBreakdownStep(value);
    if (!storedStep) {
      return { error: "The saved breakdown needs to be regenerated." };
    }
    storedSteps.push(storedStep);
  }
  const steps = storedSteps.map((storedStep, i) => {
    return i === parsed.data.stepIndex
      ? { ...storedStep, done: parsed.data.done }
      : storedStep;
  });
  await supabase
    .from("assignment_steps")
    .update({
      steps: JSON.parse(JSON.stringify(steps)) as Json,
      updated_at: new Date().toISOString(),
    })
    .eq("assignment_id", parsed.data.assignmentId)
    .eq("owner_id", ownerId);

  return { ok: true };
}

function parseStoredBreakdownStep(value: unknown): BreakdownStep | null {
  if (!value || typeof value !== "object") return null;
  const step = value as Record<string, unknown>;
  if (
    typeof step.step !== "number"
    || typeof step.action !== "string"
    || typeof step.minutes !== "number"
    || typeof step.done !== "boolean"
  ) {
    return null;
  }
  return {
    step: step.step,
    action: step.action,
    minutes: step.minutes,
    done: step.done,
  };
}
