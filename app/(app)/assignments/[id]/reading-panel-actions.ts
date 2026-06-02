// app/(app)/assignments/[id]/reading-panel-actions.ts
// Server action wrapper for reading-scaffold Edge Function.
// Called from ReadingPanel (client component) — keeps Supabase service-role
// and Anthropic key on the server, never in the browser.
"use server";

import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const ScaffoldInput = z.object({
  assignmentId: z.string().uuid().nullable(),
  type: z.enum(["pre", "mid", "post"]),
  text: z.string().min(10).max(8000),
  aiMode: z.enum(["red", "yellow", "green"]).default("green"),
});

export async function fetchScaffold(input: {
  assignmentId: string;
  type: "pre" | "mid" | "post";
  text: string;
  aiMode: string;
}): Promise<{ content: string } | { error: string }> {
  const parsed = ScaffoldInput.safeParse(input);
  if (!parsed.success) return { error: "Invalid input." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data, error } = await supabase.functions.invoke("reading-scaffold", {
    body: { ownerId: user.id, ...parsed.data },
  });

  if (error) return { error: calmError(error.message) };
  return { content: (data as { content: string }).content ?? "" };
}

function calmError(rawMessage: string | undefined): string {
  const m = rawMessage ?? "";
  if (m.includes("quota")) {
    return "You've used your AI quota for today - resets at midnight.";
  }
  if (m.includes("AI not available")) {
    return "AI is off for this class. You can change that in class settings.";
  }
  return "AI is unavailable right now. Try again in a moment.";
}
