// app/(app)/agent-fab-actions.ts
// Server action wrapping the agent-coach Edge Function for the global Agent
// Fab drawer (handoff_for_claude_code/designs/Agent Fab.dc.html, README §6).
"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const ChatInput = z.object({
  message: z.string().min(1).max(2000),
  pageLabel: z.string().max(80).optional(),
  history: z
    .array(z.object({ role: z.enum(["student", "coach"]), content: z.string().max(2000) }))
    .max(8)
    .default([]),
});

function calmError(rawMessage: string | undefined): string {
  const m = rawMessage ?? "";
  if (m.includes("quota")) {
    return "You've used your AI quota for today — resets at midnight.";
  }
  return "Diana's offline for a moment. Try again shortly.";
}

export async function requestAgentCoach(
  input: z.infer<typeof ChatInput>,
): Promise<{ ok: true; content: string } | { ok: false; error: string }> {
  const parsed = ChatInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("consent_ai, age_bracket")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profile?.age_bracket === "under_13") {
    return { ok: false, error: "AI features aren't available for under-13 accounts." };
  }
  if (!profile?.consent_ai) {
    return { ok: false, error: "Turn on AI features in Settings to chat with Diana." };
  }

  const { data, error } = await supabase.functions.invoke("agent-coach", {
    body: { ownerId: user.id, ...parsed.data },
  });
  if (error) return { ok: false, error: calmError(error.message) };
  if (data?.error) return { ok: false, error: calmError(String(data.error)) };

  return { ok: true, content: String(data?.content ?? "") };
}
