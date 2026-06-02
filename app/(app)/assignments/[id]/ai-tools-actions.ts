// app/(app)/assignments/[id]/ai-tools-actions.ts
// Server actions wrapping math-step, writing-aid, and citation-gen Edge Functions.
// All Anthropic and Supabase service-role calls stay server-side — never in the browser.
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
import { parseScienceScaffoldResponse, type ScienceScaffoldMode, type ScienceScaffoldResult } from "@/lib/science/scaffold";
import { parseWritingCoauthorResponse, type WritingCoauthorMode, type WritingCoauthorResult } from "@/lib/writing/coauthor";
import { createClient } from "@/lib/supabase/server";

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

async function getOwnerId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

// Map an Edge-Function error message to calm, student-facing copy.
// Used identically by all three actions — the underlying Edge Function returns
// plain English ("You've used your AI quota..."), supabase.functions.invoke wraps
// it in error.message, and we surface it verbatim where we recognize it.
function calmError(rawMessage: string | undefined): string {
  const m = rawMessage ?? "";
  if (m.includes("quota")) {
    return "You've used your AI quota for today — resets at midnight.";
  }
  if (m.includes("AI not available")) {
    return "AI is off for this class. You can change that in class settings.";
  }
  return "AI is unavailable right now. Try again in a moment.";
}

async function loadWritingEvidenceContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ownerId: string,
  assignmentId: string,
): Promise<string> {
  const { data: assignment } = await supabase
    .from("assignments")
    .select("id, title, description, class_id")
    .eq("id", assignmentId)
    .eq("owner_id", ownerId)
    .single();
  if (!assignment?.class_id) return "";

  const { data: notes } = await supabase
    .from("notes")
    .select("title, body_text, transcript_text")
    .eq("owner_id", ownerId)
    .eq("class_id", assignment.class_id)
    .order("updated_at", { ascending: false })
    .limit(8);

  return [
    `Assignment: ${assignment.title}`,
    assignment.description ? `Prompt: ${assignment.description}` : "",
    ...(notes ?? []).map((note) => [
      `Note: ${note.title}`,
      (note.body_text ?? "").slice(0, 600),
      (note.transcript_text ?? "").slice(0, 600),
    ].filter(Boolean).join("\n")),
  ].filter(Boolean).join("\n\n").slice(0, 5000);
}

async function loadScienceClassContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ownerId: string,
  assignmentId: string,
): Promise<string> {
  const { data: assignment } = await supabase
    .from("assignments")
    .select("id, title, description, class_id")
    .eq("id", assignmentId)
    .eq("owner_id", ownerId)
    .single();
  if (!assignment?.class_id) return "";

  const { data: notes } = await supabase
    .from("notes")
    .select("title, body_text, transcript_text")
    .eq("owner_id", ownerId)
    .eq("class_id", assignment.class_id)
    .order("updated_at", { ascending: false })
    .limit(5);

  return [
    `Assignment: ${assignment.title}`,
    assignment.description ?? "",
    ...(notes ?? []).map((note) => [
      `Note: ${note.title}`,
      (note.body_text ?? "").slice(0, 450),
      (note.transcript_text ?? "").slice(0, 450),
    ].filter(Boolean).join("\n")),
  ].filter(Boolean).join("\n\n").slice(0, 3000);
}

async function loadHistoryClassContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ownerId: string,
  assignmentId: string,
): Promise<string> {
  const { data: assignment } = await supabase
    .from("assignments")
    .select("id, title, description, class_id")
    .eq("id", assignmentId)
    .eq("owner_id", ownerId)
    .single();
  if (!assignment?.class_id) return "";

  const { data: notes } = await supabase
    .from("notes")
    .select("title, body_text, transcript_text")
    .eq("owner_id", ownerId)
    .eq("class_id", assignment.class_id)
    .order("updated_at", { ascending: false })
    .limit(6);

  return [
    `Assignment: ${assignment.title}`,
    assignment.description ?? "",
    ...(notes ?? []).map((note) => [
      `Note: ${note.title}`,
      (note.body_text ?? "").slice(0, 500),
      (note.transcript_text ?? "").slice(0, 500),
    ].filter(Boolean).join("\n")),
  ].filter(Boolean).join("\n\n").slice(0, 3500);
}

async function loadCsClassContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ownerId: string,
  assignmentId: string,
): Promise<string> {
  const { data: assignment } = await supabase
    .from("assignments")
    .select("id, title, description, class_id")
    .eq("id", assignmentId)
    .eq("owner_id", ownerId)
    .single();
  if (!assignment?.class_id) return "";

  const { data: notes } = await supabase
    .from("notes")
    .select("title, body_text, transcript_text")
    .eq("owner_id", ownerId)
    .eq("class_id", assignment.class_id)
    .order("updated_at", { ascending: false })
    .limit(5);

  return [
    `Assignment: ${assignment.title}`,
    assignment.description ?? "",
    ...(notes ?? []).map((note) => [
      `Note: ${note.title}`,
      (note.body_text ?? "").slice(0, 450),
      (note.transcript_text ?? "").slice(0, 450),
    ].filter(Boolean).join("\n")),
  ].filter(Boolean).join("\n\n").slice(0, 3000);
}

async function loadHealthClassContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ownerId: string,
  assignmentId: string,
): Promise<string> {
  const { data: assignment } = await supabase
    .from("assignments")
    .select("id, title, description, class_id")
    .eq("id", assignmentId)
    .eq("owner_id", ownerId)
    .single();
  if (!assignment?.class_id) return "";

  const { data: notes } = await supabase
    .from("notes")
    .select("title, body_text, transcript_text")
    .eq("owner_id", ownerId)
    .eq("class_id", assignment.class_id)
    .order("updated_at", { ascending: false })
    .limit(5);

  return [
    `Assignment: ${assignment.title}`,
    assignment.description ?? "",
    ...(notes ?? []).map((note) => [
      `Note: ${note.title}`,
      (note.body_text ?? "").slice(0, 450),
      (note.transcript_text ?? "").slice(0, 450),
    ].filter(Boolean).join("\n")),
  ].filter(Boolean).join("\n\n").slice(0, 3000);
}

async function loadApClassContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ownerId: string,
  assignmentId: string,
): Promise<string> {
  const { data: assignment } = await supabase
    .from("assignments")
    .select("id, title, description, class_id")
    .eq("id", assignmentId)
    .eq("owner_id", ownerId)
    .single();
  if (!assignment?.class_id) return "";

  const { data: notes } = await supabase
    .from("notes")
    .select("title, body_text, transcript_text")
    .eq("owner_id", ownerId)
    .eq("class_id", assignment.class_id)
    .order("updated_at", { ascending: false })
    .limit(6);

  return [
    `Assignment: ${assignment.title}`,
    assignment.description ?? "",
    ...(notes ?? []).map((note) => [
      `Note: ${note.title}`,
      (note.body_text ?? "").slice(0, 450),
      (note.transcript_text ?? "").slice(0, 450),
    ].filter(Boolean).join("\n")),
  ].filter(Boolean).join("\n\n").slice(0, 3500);
}

async function loadLanguageClassContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ownerId: string,
  assignmentId: string,
): Promise<string> {
  const { data: assignment } = await supabase
    .from("assignments")
    .select("id, title, description, class_id")
    .eq("id", assignmentId)
    .eq("owner_id", ownerId)
    .single();
  if (!assignment?.class_id) return "";

  const { data: notes } = await supabase
    .from("notes")
    .select("title, body_text, transcript_text")
    .eq("owner_id", ownerId)
    .eq("class_id", assignment.class_id)
    .order("updated_at", { ascending: false })
    .limit(5);

  return [
    `Assignment: ${assignment.title}`,
    assignment.description ?? "",
    ...(notes ?? []).map((note) => [
      `Note: ${note.title}`,
      (note.body_text ?? "").slice(0, 450),
      (note.transcript_text ?? "").slice(0, 450),
    ].filter(Boolean).join("\n")),
  ].filter(Boolean).join("\n\n").slice(0, 3000);
}

export async function requestMathStep(
  input: z.infer<typeof MathStepInput>,
): Promise<{ content: string } | { error: string }> {
  const parsed = MathStepInput.safeParse(input);
  if (!parsed.success) return { error: "Invalid input." };
  const ownerId = await getOwnerId();
  if (!ownerId) return { error: "Not signed in." };

  const supabase = await createClient();
  const { data, error } = await supabase.functions.invoke("math-step", {
    body: { ownerId, ...parsed.data },
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
  const { data, error } = await supabase.functions.invoke("writing-aid", {
    body: { ownerId, ...parsed.data },
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
  const evidenceContext = parsed.data.mode === "evidence"
    ? await loadWritingEvidenceContext(supabase, ownerId, parsed.data.assignmentId)
    : "";

  const { data, error } = await supabase.functions.invoke("writing-cowrite", {
    body: { ownerId, ...parsed.data, evidenceContext },
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

export async function requestScienceScaffold(
  input: z.infer<typeof ScienceScaffoldInput>,
): Promise<{ ok: true; result: ScienceScaffoldResult } | { ok: false; error: string }> {
  const parsed = ScienceScaffoldInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };
  const ownerId = await getOwnerId();
  if (!ownerId) return { ok: false, error: "Not signed in." };

  const supabase = await createClient();
  const classContext = await loadScienceClassContext(supabase, ownerId, parsed.data.assignmentId);
  const { data, error } = await supabase.functions.invoke("science-scaffold", {
    body: { ownerId, ...parsed.data, classContext },
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
  const { data, error } = await supabase.functions.invoke("history-scaffold", {
    body: { ownerId, ...parsed.data, classContext },
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

  const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
  const allowed = new Set(["jpg", "jpeg", "png", "webp", "gif"]);
  if (!allowed.has(ext)) {
    return { ok: false, error: "Pick a .jpg, .png, .webp, or .gif image." };
  }
  if (file.size >= 10 * 1024 * 1024) {
    return { ok: false, error: "Images work best under 10 MB. Try a smaller crop." };
  }

  const storageKey = `${user.id}/history-map-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("note-docs")
    .upload(storageKey, file, { contentType: file.type });

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
  const { data, error } = await supabase.functions.invoke("history-scaffold", {
    body: { ownerId, assignmentId: parsed.data.assignmentId, aiMode: parsed.data.aiMode, mode: "map_annotation", storageKey: parsed.data.storageKey },
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
  const { data, error } = await supabase.functions.invoke("cs-scaffold", {
    body: { ownerId, ...parsed.data, classContext },
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
  const { data, error } = await supabase.functions.invoke("language-scaffold", {
    body: { ownerId, ...parsed.data, classContext },
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
  const { data, error } = await supabase.functions.invoke("arts-scaffold", {
    body: { ownerId, ...parsed.data },
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
  const { data, error } = await supabase.functions.invoke("health-scaffold", {
    body: { ownerId, ...parsed.data, classContext },
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
  const { data, error } = await supabase.functions.invoke("ap-scaffold", {
    body: { ownerId, ...parsed.data, classContext },
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
  const { data, error } = await supabase.functions.invoke("citation-gen", {
    body: { ownerId, ...parsed.data },
  });
  if (error) return { error: calmError(error.message) };
  // citation-gen returns content as a JSON string per its system prompt;
  // we surface it verbatim and let the client JSON.parse — keeps this layer dumb.
  return { content: (data as { content: string }).content ?? "" };
}

// ─── F6: AI task breakdown ────────────────────────────────────────────────────

import { parseStepsFromContent, type BreakdownStep } from "@/lib/task-breakdown/parse";

const TaskBreakdownInput = z.object({
  assignmentId: z.string().uuid(),
  aiMode: z.enum(["red", "yellow", "green"]).default("green"),
  title: z.string().min(1).max(500),
  description: z.string().max(4000).optional(),
  kind: z.string().min(1).max(50),
  estimatedMinutes: z.number().int().min(1).max(600).optional(),
});

export async function requestTaskBreakdown(
  input: z.infer<typeof TaskBreakdownInput>,
): Promise<{ steps: BreakdownStep[] } | { error: string }> {
  const parsed = TaskBreakdownInput.safeParse(input);
  if (!parsed.success) return { error: "Invalid input." };
  const ownerId = await getOwnerId();
  if (!ownerId) return { error: "Not signed in." };

  const supabase = await createClient();
  const { data, error } = await supabase.functions.invoke("task-breakdown", {
    body: { ownerId, ...parsed.data },
  });
  if (error) return { error: calmError(error.message) };

  const content = (data as { content: string }).content ?? "";
  const steps = parseStepsFromContent(content);

  // Persist via upsert on assignment_id (unique index ensures one row per assignment)
  await supabase
    .from("assignment_steps")
    .upsert(
      {
        owner_id: ownerId,
        assignment_id: parsed.data.assignmentId,
        steps,
        generated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "assignment_id" },
    );

  return { steps };
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
  const { data, error } = await supabase.functions.invoke("math-example", {
    body: { ownerId, ...parsed.data },
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

  const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
  const allowed = new Set(["jpg", "jpeg", "png", "webp", "gif"]);
  if (!allowed.has(ext)) {
    return { ok: false, error: "Pick a .jpg, .png, .webp, or .gif photo." };
  }
  if (file.size >= 10 * 1024 * 1024) {
    return { ok: false, error: "Photos work best under 10 MB. Try a smaller crop." };
  }

  const storageKey = `${user.id}/math-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("note-docs")
    .upload(storageKey, file, { contentType: file.type });

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
  const { data, error } = await supabase.functions.invoke("math-scaffold", {
    body: { ownerId, ...parsed.data },
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
    .single();
  if (!row) return { error: "No breakdown to update." };

  const steps = (row.steps as BreakdownStep[]).map((s, i) =>
    i === parsed.data.stepIndex ? { ...s, done: parsed.data.done } : s,
  );
  await supabase
    .from("assignment_steps")
    .update({ steps, updated_at: new Date().toISOString() })
    .eq("assignment_id", parsed.data.assignmentId)
    .eq("owner_id", ownerId);

  return { ok: true };
}
