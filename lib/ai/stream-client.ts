"use client";

// Streaming client for Diana's conversational AI surfaces.
//
// supabase.functions.invoke buffers whole responses, so streaming calls the
// function URL directly with the session token. The Edge Function still does
// every check (aiMode, token budget, safety prompts) — this only changes how
// the answer travels. Falls back to buffered JSON when streaming isn't
// available, so the surface never breaks against an older deployment.

import { createClient } from "@/lib/supabase/client";

export type StreamResult = { ok: true; content: string } | { ok: false; error: string };

export async function streamMathStep(input: {
  assignmentId: string | null;
  aiMode: string;
  prompt: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  onText: (chunk: string) => void;
}): Promise<StreamResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !anonKey) return { ok: false, error: "AI is not configured." };

  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { ok: false, error: "Sign in to use AI help." };

  const res = await fetch(`${url}/functions/v1/math-step`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      apikey: anonKey,
    },
    body: JSON.stringify({
      ownerId: session.user.id,
      assignmentId: input.assignmentId,
      aiMode: input.aiMode,
      prompt: input.prompt,
      history: input.history,
      stream: true,
    }),
  });

  const contentType = res.headers.get("content-type") ?? "";

  // Buffered fallback (older deployment, or an error response).
  if (!contentType.includes("text/event-stream")) {
    const data = (await res.json().catch(() => null)) as { content?: string; error?: string } | null;
    if (!res.ok || !data || data.error) {
      return { ok: false, error: data?.error ?? "AI request failed." };
    }
    if (data.content) input.onText(data.content);
    return { ok: true, content: data.content ?? "" };
  }

  if (!res.body) return { ok: false, error: "AI request failed." };

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload) continue;
      try {
        const event = JSON.parse(payload) as { text?: string; done?: boolean; error?: string };
        if (event.error) return { ok: false, error: event.error };
        if (event.text) {
          full += event.text;
          input.onText(event.text);
        }
      } catch {
        // ignore malformed keep-alives
      }
    }
  }

  return { ok: true, content: full };
}
