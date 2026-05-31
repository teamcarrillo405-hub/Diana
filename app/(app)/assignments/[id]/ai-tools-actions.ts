// app/(app)/assignments/[id]/ai-tools-actions.ts
// Server actions wrapping math-step, writing-aid, and citation-gen Edge Functions.
// All Anthropic and Supabase service-role calls stay server-side — never in the browser.
"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const HistoryItem = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
});

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
