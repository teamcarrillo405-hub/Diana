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
