// app/(app)/assignments/[id]/reading-panel-actions.ts
// Server action wrapper for reading-scaffold Edge Function.
// Called from ReadingPanel (client component) — keeps Supabase service-role
// and Anthropic key on the server, never in the browser.
"use server";

import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const ScaffoldInput = z.object({
  type: z.enum(["pre", "mid", "post"]),
  text: z.string().min(10).max(8000),
  aiMode: z.enum(["red", "yellow", "green"]).default("green"),
});

export async function fetchScaffold(input: {
  type: "pre" | "mid" | "post";
  text: string;
  aiMode: string;
}): Promise<{ content: string } | { error: string }> {
  const parsed = ScaffoldInput.safeParse(input);
  if (!parsed.success) return { error: "Invalid input." };

  const supabase = await createClient();
  const { data, error } = await supabase.functions.invoke("reading-scaffold", {
    body: parsed.data,
  });

  if (error) return { error: error.message };
  return { content: (data as { content: string }).content ?? "" };
}
